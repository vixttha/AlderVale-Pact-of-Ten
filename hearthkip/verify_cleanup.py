"""Independent NumPy/Trimesh readback of conservative cleanup; no cleaner imports."""
import hashlib,json,os,sys
from pathlib import Path
def require(ok,msg):
    if not ok: raise ValueError(msg)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def parse_raw(path):
    import numpy as np
    v=[];f=[]
    for line in path.read_text(encoding="ascii").splitlines():
        s=line.split()
        if not s or s[0].startswith("#"):continue
        require(len(s)==4 and s[0] in ("v","f"),"raw OBJ record")
        if s[0]=="v":v.append(tuple(map(float,s[1:])))
        else:f.append(tuple(int(x)-1 for x in s[1:]))
    v=np.array(v,dtype=np.float64);f=np.array(f,dtype=np.int64)
    require(v.ndim==2 and v.shape[1]==3 and len(v)>0 and np.isfinite(v).all(),"raw vertices")
    require(f.ndim==2 and f.shape[1]==3 and len(f)>0 and f.min()>=0 and f.max()<len(v),"raw faces")
    return v,f
def main(out):
    import numpy as np
    import trimesh
    from validate_obj import read_obj
    raw=out/"pre-cleanup.obj";fixed=out/"mesh.obj"
    rec=json.loads((out/"cleanup-receipt.json").read_text())
    gen=json.loads((out/"generation.json").read_text())
    require(rec["source_commit"]==gen["source_commit"]==os.environ["GITHUB_SHA"],"source SHA")
    require(rec["reference_sha256"]==gen["reference_sha256"]==digest(out/"input.png"),"input SHA")
    require(rec["raw_sha256"]==digest(raw) and rec["clean_sha256"]==gen["obj_sha256"]==digest(fixed),"mesh SHA")
    v,f=parse_raw(raw)
    repeated=(f[:,0]==f[:,1])|(f[:,1]==f[:,2])|(f[:,0]==f[:,2])
    area=np.linalg.norm(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),axis=1)
    require(np.isfinite(area).all(),"area nonfinite")
    tiny=(area<=1e-12)&~repeated
    candidates=f[~(repeated|tiny)]
    _,first=np.unique(np.sort(candidates,axis=1),axis=0,return_index=True)
    expected=candidates[np.sort(first)]
    counts={"repeated_index":int(repeated.sum()),"zero_or_tiny_area":int(tiny.sum()),"duplicate_face":len(candidates)-len(expected)}
    used=np.unique(expected)
    remap=np.full(len(v),-1,dtype=np.int64);remap[used]=np.arange(len(used))
    cv,cf,bounds=read_obj(fixed);cv=np.array(cv);cf=np.array(cf)
    require(len(expected)>0 and sum(counts.values())/len(f)<=0.01,"cleanup budget")
    require(rec["removed_faces"]==counts and rec["removed_vertices"]==len(v)-len(used),"counts mismatch")
    require(rec["input_vertices"]==len(v) and rec["input_triangles"]==len(f) and rec["output_vertices"]==len(cv) and rec["output_triangles"]==len(cf),"receipt counts")
    require(np.array_equal(cv,v[used]) and np.array_equal(cf,remap[expected]),"retained surface altered")
    require(np.array_equal(np.unique(cf),np.arange(len(cv))),"unused vertices")
    mesh=trimesh.load(fixed,file_type="obj",process=False,force="mesh")
    require(len(mesh.vertices)==len(cv) and len(mesh.faces)==len(cf),"independent import counts")
    require(np.all(mesh.area_faces>0) and np.isfinite(mesh.area_faces).all(),"degenerate surface remains")
    require(rec["min_double_area"]==1e-12 and rec["max_removal_fraction"]==0.01,"policy")
    result={"status":"pass","source_commit":gen["source_commit"],"raw_sha256":digest(raw),"clean_sha256":digest(fixed),"cleanup_receipt_sha256":digest(out/"cleanup-receipt.json"),"removed_faces":counts,"removed_vertices":len(v)-len(used),"remaining_vertices":len(cv),"remaining_triangles":len(cf),"remaining_degenerate_faces":0,"retained_positions_and_face_order_exact":True,"watertight":bool(mesh.is_watertight),"quality_accepted":False}
    (out/"cleanup-validation.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2),flush=True)
if __name__=="__main__":main(Path(sys.argv[1]))
