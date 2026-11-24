"""Read-only GLB intake and guarded anatomical selection proposal (never edits mesh)."""
import hashlib
import json
import math
import struct
import sys
from collections import defaultdict, deque
from pathlib import Path

SOURCE_SHA = "0595f7991c0f1ce63c9e83f33d06581e452d7d06f61f2c78b51403151f8d2779"
SOURCE_SIZE = 60252316
SEED = (0.0956, -0.2824, -0.3897)
# Measured seven contact centers; order: rear L/R, middle L/R, front L/R, extra.
PADS = [(-.235,-.215),(.235,-.215),(-.266,.11),(.266,.11),
        (-.203,.333),(.202,.333),(.093,-.391)]
REGION = ((.015,.18),(-.29,-.14),(-.47,-.245))

def require(ok, message):
    if not ok:
        raise ValueError(message)

def load_glb(raw):
    require(len(raw)>=28, "truncated GLB")
    magic, version, size = struct.unpack_from("<4sII",raw)
    require((magic,version,size)==(b"glTF",2,len(raw)), "invalid GLB header/length")
    n, kind = struct.unpack_from("<I4s",raw,12)
    require(kind==b"JSON" and n%4==0 and 20+n+8<=len(raw), "invalid JSON chunk")
    data=json.loads(raw[20:20+n])
    m,kind=struct.unpack_from("<I4s",raw,20+n)
    require(kind==b"BIN\x00" and m%4==0 and 28+n+m==len(raw),"invalid BIN chunk")
    return data,memoryview(raw)[28+n:]

def accessor(data,blob,index,kind,ctype,fmt,dim):
    a=data["accessors"][index]; v=data["bufferViews"][a["bufferView"]]
    width=struct.calcsize(fmt)
    require(a["type"]==kind and a["componentType"]==ctype and "sparse" not in a,
            "unexpected accessor")
    require(v["buffer"]==0 and v.get("byteStride",width*dim)==width*dim,"unsupported buffer layout")
    rel=a.get("byteOffset",0); off=v.get("byteOffset",0)+rel
    end=off+a["count"]*width*dim
    require(0<=rel and 0<=off<=end<=len(blob) and end<=v.get("byteOffset",0)+v["byteLength"],
            "accessor out of range")
    return list(struct.iter_unpack("<"+fmt*dim,blob[off:end]))

def geometry(raw):
    d,b=load_glb(raw)
    require(len(d["meshes"])==len(d["nodes"])==1 and len(d["meshes"][0]["primitives"])==1,
            "expected exact single-mesh source")
    node=d["nodes"][0]
    require(node.get("mesh")==0 and not any(k in node for k in ("matrix","translation","rotation","scale","skin")),
            "unexpected source node transform")
    require(not d.get("skins") and not d.get("animations"),"expected static source")
    require(len(d["buffers"])==1 and "uri" not in d["buffers"][0],"external buffer")
    require(len(d["images"])==2 and all("uri" not in i and "bufferView" in i for i in d["images"]),
            "expected embedded textures")
    p=d["meshes"][0]["primitives"][0]
    require(p.get("mode",4)==4,"expected triangles")
    pos=accessor(d,b,p["attributes"]["POSITION"],"VEC3",5126,"f",3)
    ix=accessor(d,b,p["indices"],"SCALAR",5125,"I",1)
    require(len(ix)%3==0 and pos and all(math.isfinite(x) for v in pos for x in v),"bad geometry")
    require(all(i[0]<len(pos) for i in ix),"index out of range")
    faces=[(ix[i][0],ix[i+1][0],ix[i+2][0]) for i in range(0,len(ix),3)]
    return pos,faces

def inside(p,box):
    return all(lo<=v<=hi for v,(lo,hi) in zip(p,box))

def contact_counts(pos,pads=PADS,band=.025,radius=.09):
    floor=min(p[1] for p in pos)
    counts=[0]*len(pads); other=0
    for x,y,z in set(pos):
        if y>floor+band: continue
        dist=[(x-a)**2+(z-b)**2 for a,b in pads]
        i=min(range(len(dist)),key=dist.__getitem__)
        if dist[i]<=radius**2: counts[i]+=1
        else: other+=1
    return counts,other

def guarded_region(pos,faces,seed=SEED,cut=-.14,box=REGION,seed_radius=.012):
    # Positional welding is for measurement only; never changes UVs or vertex data.
    keys=[tuple(round(v,6) for v in p) for p in pos]
    low={p for p in keys if p[1]<cut}
    starts={p for p in low if sum((a-b)**2 for a,b in zip(p,seed))<=seed_radius**2}
    require(starts,"missing cut seed")
    adjacency=defaultdict(set)
    for a,b,c in faces:
        tri=(keys[a],keys[b],keys[c])
        for u,v in ((tri[0],tri[1]),(tri[1],tri[2]),(tri[2],tri[0])):
            if u in low and v in low:
                adjacency[u].add(v); adjacency[v].add(u)
    selected=set(starts); q=deque(starts)
    while q:
        for p in adjacency[q.popleft()]:
            if p not in selected:
                selected.add(p);q.append(p)
    require(all(inside(p,box) for p in selected),"selection escaped approved preview envelope")
    # Count all triangles touching selection and those spanning the boundary.
    touched=crossing=0
    for face in faces:
        n=sum(keys[i] in selected for i in face)
        touched+=n>0; crossing+=0<n<3
    require(touched>0 and crossing>0,"no connected surface boundary")
    return {"selected_positions":len(selected),"touched_triangles":touched,
            "boundary_crossing_triangles":crossing,
            "min":[min(p[i] for p in selected) for i in range(3)],
            "max":[max(p[i] for p in selected) for i in range(3)],
            "cut_y":cut,"selection_sha256":hashlib.sha256(json.dumps(sorted(selected),separators=(",",":")).encode()).hexdigest(),
            "status":"PREVIEW_ONLY"}

def verify_source(raw):
    require(len(raw)==SOURCE_SIZE and hashlib.sha256(raw).hexdigest()==SOURCE_SHA,
            "source byte count or SHA-256 mismatch")
    return geometry(raw)

def main(path):
    raw=Path(path).read_bytes()
    pos,faces=verify_source(raw)
    require((len(pos),len(faces))==(349847,492321),"source geometry count mismatch")
    counts,other=contact_counts(pos)
    require(all(n>100 for n in counts),"one or more expected v1 contact regions missing")
    report={"source_sha256":SOURCE_SHA,"vertices":len(pos),"triangles":len(faces),
            "contact_region_counts":counts,"other_near_floor_positions":other,
            "contact_note":"anchored occupancy only, not proof of independent limbs",
            "candidate_region":guarded_region(pos,faces)}
    try:
        guarded_region(pos,faces,cut=-.138)
    except ValueError as error:
        require("escaped" in str(error),"unexpected negative-control failure")
        report["unsafe_higher_cut"]="rejected"
    else:
        raise ValueError("unsafe higher cut did not fail")
    print(json.dumps(report,indent=2))
    print("No geometry modified; actual cut, cap, visual and owner acceptance remain pending.")

if __name__=="__main__":
    main(sys.argv[1])
