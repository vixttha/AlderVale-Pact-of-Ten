"""Independent strict OBJ parser plus separate trimesh import; never invokes TSR."""
import hashlib
import json
import math
import os
from pathlib import Path
import sys


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def read_obj(path):
    require(0 < path.stat().st_size <= 64 * 1024 * 1024, "OBJ size outside bound")
    vertices, faces = [], []
    with path.open(encoding="ascii") as stream:
        for line in stream:
            parts = line.split()
            if not parts or parts[0].startswith("#"):
                continue
            require(len(parts) == 4, "expected three coordinates or indices")
            if parts[0] == "v":
                point = tuple(float(x) for x in parts[1:])
                require(all(math.isfinite(x) for x in point), "non-finite vertex")
                vertices.append(point)
            elif parts[0] == "f":
                face = tuple(int(x) - 1 for x in parts[1:])
                require(len(set(face)) == 3, "repeated triangle index")
                faces.append(face)
            else:
                raise ValueError("unexpected OBJ record: " + parts[0])
    require(len(vertices) >= 3 and len(faces) >= 1, "empty geometry")
    require(all(0 <= i < len(vertices) for face in faces for i in face), "index outside vertices")
    lo = [min(v[i] for v in vertices) for i in range(3)]
    hi = [max(v[i] for v in vertices) for i in range(3)]
    return vertices, faces, [lo, hi]


def validate(folder):
    import numpy as np
    import trimesh
    obj = folder / "mesh.obj"
    receipt = json.loads((folder / "generation.json").read_text())
    require(receipt["source_commit"] == os.environ["GITHUB_SHA"], "wrong checkout receipt")
    require(receipt["scope"] == "checkpoint-03-geometry-only" and receipt["device"] == "cpu"
            and receipt["resolution"] == 128 and receipt["texture_baking"] is False
            and receipt["glb_export"] is False, "scope mismatch")
    require(digest(obj) == receipt["obj_sha256"] and obj.stat().st_size == receipt["obj_bytes"],
            "OBJ digest or size mismatch")
    require(digest(folder / "input.png") == receipt["reference_sha256"], "input digest mismatch")
    v, f, bounds = read_obj(obj)
    require(len(v) == receipt["vertices"] and len(f) == receipt["triangles"]
            and len(v) >= 100 and len(f) >= 100, "geometry count mismatch")
    require(np.allclose(bounds, receipt["bounds"], rtol=0, atol=1e-8), "bounds mismatch")
    require(all(b-a > 1e-4 for a,b in zip(*bounds)), "collapsed 3D bounds")
    imported = trimesh.load(obj, file_type="obj", process=False, force="mesh")
    require(isinstance(imported, trimesh.Trimesh), "not a mesh")
    require(len(imported.vertices) == len(v) and len(imported.faces) == len(f), "reader count mismatch")
    require(np.allclose(imported.bounds, bounds, rtol=0, atol=1e-8), "reader bounds mismatch")
    require(np.isfinite(imported.vertices).all() and np.isfinite(imported.area_faces).all()
            and imported.area > 0, "invalid surface area")
    result = {
        "status": "pass", "generation": receipt,
        "independent_readback": {"vertices": len(v), "triangles": len(f),
            "bounds": bounds, "surface_area": float(imported.area),
            "zero_area_triangles": int(np.count_nonzero(imported.area_faces == 0)),
            "watertight": bool(imported.is_watertight),
            "trimesh_version": trimesh.__version__,
            "strict_geometry_only": True},
        "retention": "runner-local OBJ; no artifact upload",
        "quality_accepted": False,
    }
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    validate(Path(sys.argv[1]))
