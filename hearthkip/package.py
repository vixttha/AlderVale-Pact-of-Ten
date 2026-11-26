"""Create a bounded Hearthkip inspection ZIP; independently verify every byte."""
import hashlib,json,os,sys,zipfile
from pathlib import Path
MAX=16*1024*1024
NAMES=("input.png","mesh.obj","textured.obj","material.mtl","texture.png","candidate.glb","preview.png",
       "generation.json","texture-receipt.json","glb-receipt.json","khronos-report.json","khronos-receipt.json",
       "topology-receipt.json","preview-receipt.json","blender-reimport.txt")
def require(ok,msg):
    if not ok: raise ValueError(msg)
def sha(b): return hashlib.sha256(b).hexdigest()
def verify(path,manifest):
    expected=set(manifest["files"])|{"manifest.json"}
    with zipfile.ZipFile(path) as z:
        items=z.infolist()
        require(len(items)==len(expected) and {i.filename for i in items}==expected,"unexpected or duplicate ZIP member")
        require(sum(i.file_size for i in items)<=MAX,"uncompressed package limit")
        require(z.testzip() is None,"ZIP CRC error")
        require(json.loads(z.read("manifest.json"))==manifest,"manifest mismatch")
        for n,rec in manifest["files"].items():
            b=z.read(n)
            require(len(b)==rec["bytes"] and sha(b)==rec["sha256"],"member digest mismatch: "+n)
def main(out,path):
    import numpy as np
    from PIL import Image
    payload={}
    for n in NAMES:
        p=out/n
        require(p.is_file() and not p.is_symlink() and 0<p.stat().st_size<=MAX,"invalid file: "+n)
        payload[n]=p.read_bytes()
    require(sum(map(len,payload.values()))<MAX-65536,"package size limit")
    load=lambda n:json.loads(payload[n])
    gen,tex,glb,khr,top,pre=(load(n) for n in ("generation.json","texture-receipt.json","glb-receipt.json","khronos-receipt.json","topology-receipt.json","preview-receipt.json"))
    require(all(x["source_commit"]==os.environ["GITHUB_SHA"] for x in (gen,tex,glb,khr,top,pre)),"receipt SHA mismatch")
    require(gen["reference_sha256"]==sha(payload["input.png"]) and gen["obj_sha256"]==sha(payload["mesh.obj"]),"input/mesh digest")
    require(gen["reference_sha256"]=="230c3a5cda2bf06697a345fa4e3b142c53824cb47c76af8ee3ff72fa7e8d47eb","approved Hearthkip reference only")
    for n,rec in tex["files"].items(): require(sha(payload[n])==rec["sha256"],"texture receipt mismatch")
    require(glb["status"]==khr["status"]==top["status"]==pre["status"]=="pass" and khr["errors"]==0,"validation receipt failed")
    require(sha(payload["candidate.glb"])==glb["glb_sha256"]==khr["glb_sha256"]==pre["glb_sha256"],"GLB digest mismatch")
    require(sha(payload["preview.png"])==pre["preview_sha256"],"preview digest")
    with Image.open(out/"preview.png") as im:
        require(im.format=="PNG" and im.size==(512,512),"preview dimensions")
        px=np.asarray(im.convert("RGB"))
        require(np.unique(px.reshape(-1,3),axis=0).shape[0]>64,"empty or flat preview")
    manifest={"schema":1,"source_commit":os.environ["GITHUB_SHA"],"run_id":os.environ["GITHUB_RUN_ID"],"run_attempt":os.environ["GITHUB_RUN_ATTEMPT"],"input_kind":"hearthkip-r1-approved","device":"cpu","quality_accepted":False,"game_ready":False,"topology":top,"performance":tex["stage_metrics"],"files":{n:{"bytes":len(b),"sha256":sha(b)} for n,b in payload.items()}}
    with zipfile.ZipFile(path,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for n,b in payload.items(): z.writestr(n,b)
        z.writestr("manifest.json",json.dumps(manifest,indent=2)+"\n")
    require(path.stat().st_size<=MAX,"compressed size limit")
    verify(path,manifest)
    print(json.dumps({"status":"pass","scope":"checkpoint-08-runner-local-package","source_commit":manifest["source_commit"],"zip_sha256":sha(path.read_bytes()),"zip_bytes":path.stat().st_size,"members":len(manifest["files"])+1,"glb_sha256":glb["glb_sha256"],"glb_bytes":len(payload["candidate.glb"]),"preview_sha256":pre["preview_sha256"],"preview_render_seconds":pre["render_seconds"],"generation_performance":tex["stage_metrics"],"topology":top,"delivery":"approved ordinary Git delivery; verify downloaded bytes before acceptance","quality_accepted":False},indent=2))
if __name__=="__main__": main(Path(sys.argv[1]),Path(sys.argv[2]))
