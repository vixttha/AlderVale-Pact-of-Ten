"""Independent OBJ/MTL/PNG readback; no TSR imports."""
import hashlib
import json
import math
import os
from pathlib import Path
import sys


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def parse(path):
    v, uv, faces = [], [], []
    materials, libraries = [], []
    for line in path.read_text(encoding="ascii").splitlines():
        p = line.split()
        if not p or p[0].startswith("#"):
            continue
        if p[0] in ("v","vt"):
            n = 3 if p[0]=="v" else 2
            require(len(p)==n+1,"bad coordinate count")
            x = tuple(map(float,p[1:]))
            require(all(math.isfinite(z) for z in x),"nonfinite")
            if n==2:
                require(all(0<=z<=1 for z in x),"UV outside range")
            (v if n==3 else uv).append(x)
        elif p[0]=="f":
            require(len(p)==4,"triangle required")
            face = [tuple(map(int,x.split("/"))) for x in p[1:]]
            require(all(len(x)==2 for x in face),"vertex/UV required")
            require(len({x[0] for x in face})==3,"repeated vertex")
            faces.append(face)
        elif p[0]=="mtllib":
            libraries.append(p[1:])
        elif p[0]=="usemtl":
            materials.append(p[1:])
        else:
            raise ValueError("unexpected record")
    require(v and uv and faces,"empty mesh")
    require(all(1<=a<=len(v) and 1<=b<=len(uv) for f in faces for a,b in f),"bad face index")
    require(libraries==[["material.mtl"]] and materials==[["baked"]],"unexpected material linkage")
    return v,uv,faces


def main(out):
    import numpy as np
    from PIL import Image
    import trimesh
    receipt=json.loads((out/"texture-receipt.json").read_text())
    raw=json.loads((out/"generation.json").read_text())
    require(receipt["source_commit"]==raw["source_commit"]==os.environ["GITHUB_SHA"],"wrong SHA")
    require(receipt["scope"]=="checkpoint-04-texture-only" and receipt["glb_export"] is False,"scope")
    require(receipt["raw_obj_sha256"]==raw["obj_sha256"]==digest(out/"mesh.obj"),"raw mesh mismatch")
    require(receipt["reference_sha256"]==raw["reference_sha256"]==digest(out/"input.png"),"input mismatch")
    require(set(receipt["files"])=={"textured.obj","material.mtl","texture.png"},"file set")
    for n,r in receipt["files"].items():
        require(digest(out/n)==r["sha256"] and (out/n).stat().st_size==r["bytes"],"file digest mismatch")
    v,uv,f=parse(out/"textured.obj")
    source=trimesh.load(out/"mesh.obj",process=False,force="mesh")
    require(len(v)==raw["vertices"] and len(f)==raw["triangles"] and len(uv)==receipt["uv_count"],"count mismatch")
    require(np.allclose(v,source.vertices,rtol=0,atol=1e-8),"vertex positions changed")
    require(np.array_equal(np.array(f)[:,:,0]-1,source.faces),"face topology changed")
    require((out/"material.mtl").read_text()=="newmtl baked\nKd 1 1 1\nmap_Kd texture.png\n","material mismatch")
    with Image.open(out/"texture.png") as im:
        require(im.format=="PNG" and im.mode=="RGBA" and im.size==(512,512),"PNG format mismatch")
        px=np.array(im)
    covered=px[:,:,3]>0
    unique=len(np.unique(px[covered,:3],axis=0))
    require(int(covered.sum())==receipt["covered_pixels"] and covered.sum()>512*512//20
            and covered.sum()<512*512 and unique==receipt["unique_covered_rgb"] and unique>16,"texture content mismatch")
    loaded=trimesh.load(out/"textured.obj",process=False,force="mesh")
    require(len(loaded.faces)==len(f) and loaded.visual.kind=="texture","textured import failed")
    require(loaded.visual.material.image is not None,"missing image")
    require(np.array_equal(np.array(loaded.visual.material.image.convert("RGBA")),px),"image readback mismatch")
    print(json.dumps({"status":"pass","texture":receipt,"independent":{"source_vertices":len(v),
          "uv_count":len(uv),"faces":len(f),"covered_pixels":int(covered.sum()),"unique_rgb":unique,
          "textured_import":True,"raw_watertight":bool(source.is_watertight)}},indent=2),flush=True)


if __name__=="__main__":
    main(Path(sys.argv[1]))
