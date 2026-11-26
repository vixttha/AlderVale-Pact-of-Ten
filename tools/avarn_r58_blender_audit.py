"""Independent Blender surface-intersection screen, not a continuous collision or acceptance proof."""
import hashlib
import json
import math
import struct
import sys
from pathlib import Path
import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SHA = "c4936438d21b0c545aedff98e7ef50047f6d2965eff080d5fe43f09dee8a277f"
SIZE = 85383096
TRIANGLES = 492643

def require(ok, reason):
    if not ok:
        raise RuntimeError(reason)

def tree(vertices, faces):
    return BVHTree.FromPolygons(vertices, faces, all_triangles=True, epsilon=0.0)

def fixture(path):
    # Positive control crosses the interior of the first triangle.
    a = tree([(0,0,0),(2,0,0),(0,2,0)], [(0,1,2)])
    b = tree([(.4,.4,-1),(.4,.4,1),(.8,.4,0)], [(0,1,2)])
    c = tree([(.4,.4,2),(.4,.4,3),(.8,.4,2)], [(0,1,2)])
    require(bool(a.overlap(b)), "known crossing not detected")
    require(not a.overlap(c), "separated triangles overlap")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    require(len(meshes)==1, "BART cube fixture import")
    meshes[0].data.calc_loop_triangles()
    require(len(meshes[0].data.loop_triangles)==12, "BART cube triangle count")
    print("BART cube import: 12 triangles; independent crossing and separation controls passed.")

def candidate(path):
    raw = path.read_bytes()
    require(len(raw)==SIZE and hashlib.sha256(raw).hexdigest()==SHA, "R5.8 candidate fingerprint mismatch")
    magic, version, length = struct.unpack_from("<4sII",raw)
    require((magic,version,length)==(b"glTF",2,len(raw)), "GLB framing")
    n, kind = struct.unpack_from("<I4s",raw,12)
    require(kind==b"JSON", "GLB JSON chunk")
    d=json.loads(raw[20:20+n])
    m, kind=struct.unpack_from("<I4s",raw,20+n)
    require(kind==b"BIN\x00" and 28+n+m==len(raw), "GLB BIN chunk")
    blob=memoryview(raw)[28+n:]
    def read(index):
        a=d["accessors"][index]; v=d["bufferViews"][a["bufferView"]]
        width={"SCALAR":1,"VEC3":3,"VEC4":4}[a["type"]]
        fmt={5126:"f",5125:"I",5123:"H"}[a["componentType"]]
        step=struct.calcsize("<"+fmt*width)
        offset=v.get("byteOffset",0)+a.get("byteOffset",0)
        end=offset+a["count"]*step
        require(v["buffer"]==0 and v.get("byteStride",step)==step and end<=len(blob), "accessor layout")
        return list(struct.iter_unpack("<"+fmt*width,blob[offset:end]))
    def mesh(mi,pi):
        p=d["meshes"][mi]["primitives"][pi]
        vertices=[Vector(x) for x in read(p["attributes"]["POSITION"])]
        indices=[x[0] for x in read(p["indices"])]
        require(len(indices)%3==0 and max(indices)<len(vertices), "indices")
        faces=list(zip(indices[::3],indices[1::3],indices[2::3]))
        return vertices,faces
    require(len(d["nodes"])==6 and len(d["animations"])==1, "scene contract")
    pivot=Vector(d["nodes"][4]["translation"])
    fixed={name:tree(*mesh(mi,pi)) for name,mi,pi in [
        ("upper_teeth",3,3),("upper_shell",0,0),("upper_cap",3,0),("upper_palate",3,1),("upper_gum",3,2)]}
    moving={name:mesh(4,pi) for name,pi in [
        ("lower_shell",0),("lower_cap",1),("lower_floor",2),("lower_tongue",3),("lower_gum",4),("lower_teeth",5)]}
    pairs=[("upper_teeth","lower_shell"),("upper_shell","lower_teeth"),
        ("upper_teeth","lower_cap"),("upper_cap","lower_teeth"),("upper_palate","lower_teeth"),
        ("upper_teeth","lower_teeth"),("upper_teeth","lower_gum"),("upper_gum","lower_teeth"),
        ("upper_teeth","lower_tongue"),("upper_teeth","lower_floor")]
    membranes=[]
    for p in d["meshes"][5]["primitives"]:
        v=[Vector(x) for x in read(p["attributes"]["POSITION"])]
        indices=[x[0] for x in read(p["indices"])]
        f=list(zip(indices[::3],indices[1::3],indices[2::3]))
        targets=[[Vector(x) for x in read(t["POSITION"])] for t in p["targets"]]
        require(len(targets)==2,"morph target contract")
        membranes.append((v,f,targets))
    hits=[]; degenerate=[]
    for step in range(61):
        angle=step*.5
        rot=Matrix.Rotation(math.radians(angle),3,"X")
        movable={name:tree([rot@v+pivot for v in vs],fs) for name,(vs,fs) in moving.items()}
        for x,y in pairs:
            if fixed[x].overlap(movable[y]):
                hits.append([angle,x,y])
        weights=(angle/15,0) if angle<=15 else ((30-angle)/15,(angle-15)/15)
        for v,f,t in membranes:
            p=[a+weights[0]*b+weights[1]*c for a,b,c in zip(v,*t)]
            if any((p[j]-p[i]).cross(p[k]-p[i]).length<1e-12 for i,j,k in f):
                degenerate.append(angle)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    for o in meshes: o.data.calc_loop_triangles()
    count=sum(len(o.data.loop_triangles) for o in meshes)
    print(json.dumps({"candidate_sha256":SHA,"samples":61,"surface_overlap_hits":hits,
        "membrane_degenerate_angles":degenerate,"blender_import_triangles":count,
        "blender_mesh_objects":len(meshes),"scope":"discrete surface checks only"},indent=2))
    require(count==TRIANGLES,"Blender triangle count mismatch")
    require(not hits and not degenerate,"sampled intersection or membrane degeneracy")
    require(hashlib.sha256(path.read_bytes()).hexdigest()==SHA,"source mutated")
    print("R5.8 independent sampled surface audit passed; no closed bite or runtime acceptance.")

if __name__=="__main__":
    mode, value=sys.argv[sys.argv.index("--")+1:]
    path=Path(value).resolve()
    if mode=="fixture": fixture(path)
    elif mode=="candidate": candidate(path)
    else: raise RuntimeError("unknown audit mode")
