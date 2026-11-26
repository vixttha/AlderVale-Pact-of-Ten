"""Build exactly one bounded public Hearthkip delivery from verified runner files."""
import hashlib,json,os,sys,zipfile,shutil
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def require(ok,msg):
    if not ok: raise ValueError(msg)
out,original,dest=map(Path,sys.argv[1:])
dest.mkdir(exist_ok=False)
names=["front","rear","left","right","top","underside","three-quarter"]
rec=json.loads((out/"views-receipt.json").read_text());viewer=json.loads((out/"viewer-receipt.json").read_text())
glb=json.loads((out/"glb-receipt.json").read_text());gen=json.loads((out/"generation.json").read_text())
require(gen["reference_sha256"]=="230c3a5cda2bf06697a345fa4e3b142c53824cb47c76af8ee3ff72fa7e8d47eb","not approved Hearthkip input")
require(all(x["source_commit"]==os.environ["GITHUB_SHA"] for x in (gen,rec,viewer,glb)),"source SHA")
require(rec["status"]==viewer["status"]==glb["status"]=="pass","missing validation")
require(rec["glb_sha256"]==viewer["glb_sha256"]==glb["glb_sha256"]==sha(out/"candidate.glb"),"GLB mismatch")
require(viewer["viewer_sha256"]==sha(out/"viewer.html") and viewer["external_requests"]==0 and viewer["orbit_drag"],"viewer mismatch")
require(set(rec["views"])==set(names),"view set")
sheet=Image.new("RGB",(1056,864),(24,30,36));draw=ImageDraw.Draw(sheet)
draw.text((16,12),"AAGP — Hearthkip R1 reconstruction | seven camera views",fill="white")
for i,n in enumerate(names):
    p=out/(n+".png");require(sha(p)==rec["views"][n]["sha256"],"view hash mismatch")
    with Image.open(p) as im:
        require(im.format=="PNG" and im.size==(512,512),"view format")
        image=im.convert("RGB");require(len(image.getcolors(512*512))>64,"flat view")
        image.thumbnail((336,250));x=8+(i%3)*352;y=42+(i//3)*274
        sheet.paste(image,(x+(336-image.width)//2,y))
        draw.text((x+8,y+253),n.upper(),fill="white")
sheet.save(out/"all-angles.png")
public=["candidate.glb","viewer.html","viewer-LICENSE.txt","all-angles.png"]+[n+".png" for n in names]
extra=["views-receipt.json","viewer-receipt.json"]+[n for n in public if n!="candidate.glb"]
for n in public: shutil.copyfile(out/n,dest/n)
with zipfile.ZipFile(original) as src:
    old=json.loads(src.read("manifest.json"))
    require(old["source_commit"]==os.environ["GITHUB_SHA"] and old["input_kind"]=="hearthkip-r1-approved","old manifest")
    require(set(src.namelist())==set(old["files"])|{"manifest.json"} and src.testzip() is None,"old ZIP")
    payload={}
    for n,r in old["files"].items():
        b=src.read(n);require(hashlib.sha256(b).hexdigest()==r["sha256"] and len(b)==r["bytes"],"old ZIP hash")
        payload[n]=b
for n in extra: payload[n]=(out/n).read_bytes()
payload["manifest-original.json"]=json.dumps(old,indent=2).encode()
manifest={"source_commit":os.environ["GITHUB_SHA"],"run_id":os.environ["GITHUB_RUN_ID"],"run_attempt":os.environ["GITHUB_RUN_ATTEMPT"],"input_kind":"hearthkip-r1-approved","quality_accepted":False,"files":{n:{"sha256":hashlib.sha256(b).hexdigest(),"bytes":len(b)} for n,b in payload.items()}}
require(sum(map(len,payload.values()))<24*1024*1024,"ZIP uncompressed limit")
with zipfile.ZipFile(dest/"inspection.zip","x",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for n,b in payload.items(): z.writestr(n,b)
    z.writestr("manifest.json",json.dumps(manifest,indent=2))
with zipfile.ZipFile(dest/"inspection.zip") as z:
    require(z.testzip() is None and set(z.namelist())==set(payload)|{"manifest.json"} and len(z.namelist())==len(payload)+1,"ZIP integrity")
    for n,b in payload.items():require(z.read(n)==b,"ZIP byte mismatch")
public+=["inspection.zip"]
publication={"source_commit":os.environ["GITHUB_SHA"],"run_id":os.environ["GITHUB_RUN_ID"],"run_attempt":os.environ["GITHUB_RUN_ATTEMPT"],"input_kind":"hearthkip-r1-approved","quality_accepted":False,"files":{n:{"sha256":sha(dest/n),"bytes":(dest/n).stat().st_size} for n in public},"views":rec,"viewer":viewer,"cleanup":old["cleanup"]}
(dest/"publication.json").write_text(json.dumps(publication,indent=2)+"\n")
require(sum(p.stat().st_size for p in dest.iterdir())<=32*1024*1024,"public delivery limit")
print(json.dumps(publication,indent=2))
