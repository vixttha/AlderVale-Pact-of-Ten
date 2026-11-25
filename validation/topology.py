"""Quantify raw mesh topology; do not repair or assert watertightness."""
import collections
import hashlib
import json
import os
from pathlib import Path
import sys

def main(out):
    raw=out/"mesh.obj"
    before=hashlib.sha256(raw.read_bytes()).hexdigest()
    source=json.loads((out/"generation.json").read_text())
    assert source["source_commit"]==os.environ["GITHUB_SHA"]
    assert source["obj_sha256"]==before
    vertices=0
    faces=[]
    for line in raw.read_text(encoding="ascii").splitlines():
        p=line.split()
        if not p: continue
        if p[0]=="v": vertices+=1
        elif p[0]=="f":
            assert len(p)==4
            f=tuple(int(x) for x in p[1:])
            assert len(set(f))==3 and all(0<x<=vertices for x in f)
            faces.append(f)
    assert len(faces)==source["triangles"] and vertices==source["vertices"]
    edges=collections.Counter(tuple(sorted((f[i],f[(i+1)%3]))) for f in faces for i in range(3))
    boundary=sum(n==1 for n in edges.values())
    overfull=sum(n>2 for n in edges.values())
    duplicates=len(faces)-len(set(tuple(sorted(f)) for f in faces))
    receipt={"status":"pass","scope":"checkpoint-06-topology-diagnostics","source_commit":os.environ["GITHUB_SHA"],
             "obj_sha256":before,"vertices":vertices,"triangles":len(faces),"unique_edges":len(edges),
             "boundary_edges":boundary,"overfull_edges":overfull,"duplicate_faces":duplicates,
             "edge_incidence_closed":boundary==0 and overfull==0,"source_unchanged":True,"quality_accepted":False}
    assert hashlib.sha256(raw.read_bytes()).hexdigest()==before
    (out/"topology-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt,indent=2))
if __name__=="__main__":
    main(Path(sys.argv[1]))
