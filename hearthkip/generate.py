"""Checkpoint 08: actual approved Hearthkip CPU reconstruction and texture bake."""
import json
import os
from pathlib import Path
import resource
import sys
import threading
import time
from functools import partial

from cpu_load import (MODEL_REV, MODEL_SHA256, DINO_REV, DINO, SOURCE_REV,
                      MCUBES_REV, model_directory, require, sha256, verify_digest)

RESOLUTION = 128
CHUNK = 8192
CONFIG_SHA = "74ca708ce086bf68e97709ea6b3d91f14717921c04691e84043f0eb8fcc68e62"
DINO_SHA = "b87c0270b97db085fd82cf114a761fd0f62ae7914fbd407c752a2260646b689c"


def rss_kib():
    with open("/proc/self/status", encoding="utf-8") as stream:
        for line in stream:
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    raise RuntimeError("VmRSS missing")


def measure(name, fn, metrics):
    # RSS sampling estimates stage-specific peaks; ru_maxrss is exact lifetime HWM.
    peak = [rss_kib()]
    stop = threading.Event()
    def sample():
        while not stop.wait(0.05):
            peak[0] = max(peak[0], rss_kib())
    thread = threading.Thread(target=sample, daemon=True)
    thread.start()
    start = time.monotonic()
    try:
        result = fn()
    finally:
        stop.set()
        thread.join()
        peak[0] = max(peak[0], rss_kib())
        metrics[name] = {
            "seconds": round(time.monotonic() - start, 3),
            "sampled_peak_rss_kib": peak[0],
            "lifetime_peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        }
        print(name, json.dumps(metrics[name]), flush=True)
    return result


from reference import INPUT, verify_reference
import shutil

def approved_reference(path):
    verify_reference(INPUT)
    shutil.copyfile(INPUT, path)
    verify_reference(path)


def main(out):
    import numpy as np
    import torch
    from PIL import Image
    from tsr.system import TSR
    from tsr.models.tokenizers import image as tokenizer
    require(not torch.cuda.is_available() and torch.version.cuda is None, "CPU required")
    require(os.environ.get("HF_HUB_OFFLINE") == "1", "offline required")
    require(os.environ.get("TORCH_FORCE_WEIGHTS_ONLY_LOAD") == "1", "restricted load required")
    torch.set_num_threads(4)
    torch.manual_seed(0)
    out.mkdir(exist_ok=False)
    reference = out / "input.png"
    approved_reference(reference)
    dest = model_directory()
    verify_digest(dest / "model.ckpt", MODEL_SHA256)
    verify_digest(dest / "config.yaml", CONFIG_SHA)
    tokenizer.hf_hub_download = partial(tokenizer.hf_hub_download,
                                        revision=DINO_REV, local_files_only=True, token=False)
    verify_digest(tokenizer.hf_hub_download(repo_id=DINO, filename="config.json"), DINO_SHA)
    metrics = {}
    with torch.no_grad():
        model = measure("load", lambda: TSR.from_pretrained(
            str(dest), config_name="config.yaml", weight_name="model.ckpt").to("cpu").eval(), metrics)
        require(sum(p.numel() for p in model.parameters()) == 419275628, "unexpected parameter count")
        require(all(t.device.type == "cpu" for t in list(model.parameters()) + list(model.buffers())),
                "non-CPU model tensor")
        model.renderer.set_chunk_size(CHUNK)
        with Image.open(reference) as im:
            image = im.convert("RGB")
        scene = measure("inference", lambda: model([image], device="cpu"), metrics)
        require(scene.device.type == "cpu" and scene.ndim == 5 and scene.shape[0] == 1,
                "unexpected scene code")
        require(torch.isfinite(scene).all().item() and torch.count_nonzero(scene).item() > 0,
                "invalid scene code")
        meshes = measure("extraction", lambda: model.extract_mesh(
            scene, has_vertex_color=False, resolution=RESOLUTION), metrics)
    require(len(meshes) == 1, "one mesh required")
    mesh = meshes[0]
    v, f = np.asarray(mesh.vertices), np.asarray(mesh.faces)
    require(v.ndim == 2 and v.shape[1] == 3 and len(v) >= 100 and np.isfinite(v).all(),
            "invalid or tiny vertex array")
    require(f.ndim == 2 and f.shape[1] == 3 and len(f) >= 100 and f.min() >= 0 and f.max() < len(v),
            "invalid or tiny triangle array")
    # Serialize only the actual reconstructed geometry, no colors, UVs or materials.
    obj = out / "mesh.obj"
    with obj.open("x", encoding="ascii") as stream:
        stream.write("# AAGP Hearthkip R1: actual CPU TripoSR reconstruction\n")
        for x, y, z in v:
            stream.write(f"v {x:.12g} {y:.12g} {z:.12g}\n")
        for a, b, c in f:
            stream.write(f"f {a+1} {b+1} {c+1}\n")
    receipt = {
        "scope": "checkpoint-03-geometry-only",
        "asset_id": "hearthkip-r1", "input_kind": "hearthkip-r1-approved",
        "source_commit": os.environ["GITHUB_SHA"],
        "upstream_commit": SOURCE_REV, "torchmcubes_commit": MCUBES_REV,
        "model_revision": MODEL_REV, "checkpoint_sha256": MODEL_SHA256,
        "reference_sha256": sha256(reference), "obj_sha256": sha256(obj),
        "obj_bytes": obj.stat().st_size, "device": "cpu",
        "torch_version": torch.__version__, "scene_shape": list(scene.shape),
        "resolution": RESOLUTION, "chunk_size": CHUNK, "vertices": len(v),
        "triangles": len(f), "bounds": [v.min(axis=0).tolist(), v.max(axis=0).tolist()],
        "stage_metrics": metrics, "process_peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "texture_baking": False, "glb_export": False,
    }
    (out / "generation.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2), flush=True)
    from bake import bake
    bake(out, mesh, model, scene, measure, metrics, receipt)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
