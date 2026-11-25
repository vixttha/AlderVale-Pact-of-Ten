"""Adapt pinned upstream baker to verified headless software EGL; retain raw mesh."""
import json
import os
import resource
from pathlib import Path

RES = 512


def bake(out, mesh, model, scene, measure, metrics, source):
    import numpy as np
    import moderngl
    from PIL import Image
    from tsr import bake_texture as upstream
    from cpu_load import sha256, require
    require(os.environ.get("LIBGL_ALWAYS_SOFTWARE") == "1", "software GL required")
    original = moderngl.create_context
    renderers = []
    def software_context(*args, **kwargs):
        ctx = original(*args, **kwargs, backend="egl")
        renderer = ctx.info["GL_RENDERER"]
        require("llvmpipe" in renderer.lower() or "softpipe" in renderer.lower(),
                "not a software renderer: " + renderer)
        renderers.append(renderer)
        return ctx
    # Upstream defaults to X11. Override only context selection, not bake logic.
    moderngl.create_context = software_context
    try:
        data = measure("texture_bake", lambda: upstream.bake_texture(mesh, model, scene[0], RES), metrics)
    finally:
        moderngl.create_context = original
    mapping, faces, uv, colors = (np.asarray(data[k]) for k in ("vmapping","indices","uvs","colors"))
    v = np.asarray(mesh.vertices)
    original_faces = np.asarray(mesh.faces)
    require(mapping.ndim == 1 and np.issubdtype(mapping.dtype, np.integer)
            and mapping.min() >= 0 and mapping.max() < len(v), "invalid atlas mapping")
    require(faces.shape == original_faces.shape and np.issubdtype(faces.dtype, np.integer)
            and faces.min() >= 0 and faces.max() < len(mapping), "invalid atlas indices")
    require(np.array_equal(mapping[faces], original_faces), "atlas changed face mapping")
    require(uv.shape == (len(mapping), 2) and np.isfinite(uv).all()
            and uv.min() >= 0 and uv.max() <= 1, "invalid UVs")
    require(colors.shape == (RES, RES, 4) and np.isfinite(colors).all()
            and colors.min() >= 0 and colors.max() <= 1, "invalid baked colors")
    rgba = np.round(colors[::-1] * 255).astype(np.uint8)
    covered = rgba[:,:,3] > 0
    require(covered.sum() > RES*RES//20 and covered.sum() < RES*RES, "invalid atlas coverage")
    require(np.unique(rgba[covered,:3], axis=0).shape[0] > 16, "constant texture")
    Image.fromarray(rgba, mode="RGBA").save(out / "texture.png")
    with (out / "textured.obj").open("x", encoding="ascii") as stream:
        stream.write("# AAGP checkpoint 04\nmtllib material.mtl\n")
        # Keep original vertex indices; UV indices can split at seams.
        for x,y,z in v:
            stream.write(f"v {x:.12g} {y:.12g} {z:.12g}\n")
        for u,w in uv:
            stream.write(f"vt {u:.12g} {w:.12g}\n")
        stream.write("usemtl baked\n")
        for face, mapped in zip(original_faces, faces):
            stream.write("f " + " ".join(f"{a+1}/{b+1}" for a,b in zip(face,mapped)) + "\n")
    (out / "material.mtl").write_text("newmtl baked\nKd 1 1 1\nmap_Kd texture.png\n", encoding="ascii")
    receipt = {"scope":"checkpoint-04-texture-only", "source_commit":os.environ["GITHUB_SHA"],
               "reference_sha256":source["reference_sha256"], "raw_obj_sha256":source["obj_sha256"],
               "files":{n:{"sha256":sha256(out/n),"bytes":(out/n).stat().st_size}
                        for n in ("textured.obj","material.mtl","texture.png")},
               "resolution":RES,"uv_count":len(uv),"triangles":len(faces),
               "covered_pixels":int(covered.sum()),"unique_covered_rgb":int(np.unique(rgba[covered,:3],axis=0).shape[0]),
               "renderer":renderers,"stage_metrics":metrics,"raw_watertight":bool(mesh.is_watertight),
               "peak_rss_kib":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,"glb_export":False}
    (out/"texture-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt,indent=2),flush=True)
