"""Checkpoint 02 only: verify and load the official weights, never run inference."""
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import sys
import time

MODEL = "stabilityai/TripoSR"
MODEL_REV = "c1cf7716aed5aa6c1c5e174657791ef0e1327bde"
MODEL_SHA256 = "429e2c6b22a0923967459de24d67f05962b235f79cde6b032aa7ed2ffcd970ee"
DINO = "facebook/dino-vitb16"
DINO_REV = "f205d5d8e640a89a2b8ef0369670dfc37cc07fc2"
SOURCE_REV = "107cefdc244c39106fa830359024f6a2f1c78871"
MCUBES_REV = "3381600ddc3d2e4d74222f8495866be5fafbace4"


def sha256(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_digest(path, expected):
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"SHA-256 mismatch: {Path(path).name}: {actual}")
    return actual


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def model_directory():
    return Path(os.environ["RUNNER_TEMP"]) / "aagp-weights"


def download():
    from huggingface_hub import hf_hub_download

    dest = model_directory()
    dest.mkdir(exist_ok=False)
    for filename in ("config.yaml", "model.ckpt"):
        source = hf_hub_download(MODEL, filename, revision=MODEL_REV, token=False)
        # Link into the upstream loader's local directory without doubling disk use.
        (dest / filename).symlink_to(Path(source).resolve(strict=True))
    verify_digest(dest / "model.ckpt", MODEL_SHA256)
    hf_hub_download(DINO, "config.json", revision=DINO_REV, token=False)
    print("Official pinned weights verified:", MODEL_SHA256)
    print("Config SHA-256:", sha256(dest / "config.yaml"))
    print("Checkpoint bytes:", (dest / "model.ckpt").stat().st_size)


def load():
    import torch
    from functools import partial
    from tsr.system import TSR
    from tsr.models.tokenizers import image as image_tokenizer

    require(torch.version.cuda is None and not torch.cuda.is_available(),
            "Expected a CPU-only PyTorch build")
    require(os.environ.get("HF_HUB_OFFLINE") == "1", "Model load must be offline")
    require(os.environ.get("TORCH_FORCE_WEIGHTS_ONLY_LOAD") == "1",
            "Restricted checkpoint deserialization required")
    torch.set_num_threads(4)
    dest = model_directory()
    digest = verify_digest(dest / "model.ckpt", MODEL_SHA256)
    # Upstream fetches the DINO config without a revision. Bind that actual
    # download function to the verified cached revision; never substitute a model.
    image_tokenizer.hf_hub_download = partial(
        image_tokenizer.hf_hub_download, revision=DINO_REV,
        local_files_only=True, token=False)
    start = time.monotonic()
    with torch.no_grad():
        model = TSR.from_pretrained(str(dest), config_name="config.yaml",
                                    weight_name="model.ckpt").to("cpu").eval()
    tensors = list(model.parameters())
    count = sum(p.numel() for p in tensors)
    require(isinstance(model, TSR) and count > 300_000_000,
            "Unexpected or incomplete model")
    require(all(t.device.type == "cpu" for t in list(model.parameters()) + list(model.buffers())),
            "Non-CPU tensor present")
    require(not model.training, "Expected evaluation mode")
    require(all(torch.isfinite(p.detach().reshape(-1)[:16]).all().item()
                for p in tensors if p.numel()), "Non-finite sampled weight")
    require(any(torch.count_nonzero(p.detach().reshape(-1)[:16]).item()
                for p in tensors if p.numel()), "All sampled weights zero")
    dino_config = image_tokenizer.hf_hub_download(repo_id=DINO, filename="config.json")
    print(json.dumps({
        "status": "pass",
        "scope": "checkpoint-02-pretrained-load-only",
        "source_commit": os.environ["GITHUB_SHA"],
        "upstream_commit": SOURCE_REV,
        "torchmcubes_commit": MCUBES_REV,
        "model_revision": MODEL_REV,
        "checkpoint_sha256": digest,
        "checkpoint_bytes": (dest / "model.ckpt").stat().st_size,
        "config_sha256": sha256(dest / "config.yaml"),
        "dino_revision": DINO_REV,
        "dino_config_sha256": sha256(dino_config),
        "torch_version": torch.__version__,
        "device": "cpu",
        "parameter_count": count,
        "parameter_tensors": len(tensors),
        "load_seconds": round(time.monotonic() - start, 3),
        "process_peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "free_disk_bytes": shutil.disk_usage(dest).free,
        "inference_executed": False,
        "mesh_generated": False
    }, indent=2), flush=True)


if __name__ == "__main__":
    if sys.argv[1:] == ["download"]:
        download()
    elif sys.argv[1:] == ["load"]:
        load()
    else:
        raise SystemExit("Usage: cpu_load.py download|load")
