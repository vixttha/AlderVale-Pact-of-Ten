"""Reference engineering only. No synthetic image, camera claim, or model."""
import hashlib, json, math, statistics, struct, sys, zlib
from pathlib import Path
SIG=b"\x89PNG\r\n\x1a\n"

def decode_png(data):
    if data[:8]!=SIG: raise ValueError("PNG signature")
    p=8; compressed=[]; header=None; end=False
    while p+12<=len(data):
        n,=struct.unpack_from(">I",data,p); tag=data[p+4:p+8]; stop=p+12+n
        if stop>len(data): raise ValueError("truncated PNG")
        payload=data[p+8:p+8+n]
        if zlib.crc32(tag+payload)&0xffffffff!=struct.unpack_from(">I",data,p+8+n)[0]: raise ValueError("PNG CRC")
        if tag==b"IHDR": header=struct.unpack(">IIBBBBB",payload)
        elif tag==b"IDAT": compressed.append(payload)
        elif tag==b"IEND": end=True; break
        p=stop
    if not header or not end: raise ValueError("missing PNG structure")
    w,h,depth,kind,comp,filt,interlace=header
    if (depth,comp,filt,interlace)!=(8,0,0,0) or kind not in (2,6) or not (0<w<=512 and 0<h<=512): raise ValueError("unsupported PNG layout")
    c=3 if kind==2 else 4; stride=w*c
    raw=zlib.decompress(b"".join(compressed))
    if len(raw)!=h*(stride+1): raise ValueError("PNG row length")
    rows=[]; prior=bytearray(stride)
    for y in range(h):
        mode=raw[y*(stride+1)]; row=bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        for x in range(stride):
            a=row[x-c] if x>=c else 0; b=prior[x]; cc=prior[x-c] if x>=c else 0
            if mode==0: pred=0
            elif mode==1: pred=a
            elif mode==2: pred=b
            elif mode==3: pred=(a+b)//2
            elif mode==4:
                v=a+b-cc; aa,bb,ccc=abs(v-a),abs(v-b),abs(v-cc)
                pred=a if aa<=bb and aa<=ccc else (b if bb<=ccc else cc)
            else: raise ValueError("PNG filter")
            row[x]=(row[x]+pred)&255
        rows.append([tuple(row[x:x+3]) for x in range(0,stride,c)]); prior=row
    return w,h,rows

def encode_png(rows):
    h=len(rows); w=len(rows[0])
    def chunk(tag,payload):
        return struct.pack(">I",len(payload))+tag+payload+struct.pack(">I",zlib.crc32(tag+payload)&0xffffffff)
    scan=b"".join(b"\0"+bytes(v for rgb in row for v in rgb) for row in rows)
    return SIG+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,2,0,0,0))+chunk(b"IDAT",zlib.compress(scan,9))+chunk(b"IEND",b"")

def foreground(rows,threshold):
    h,w=len(rows),len(rows[0]); corners=[rows[y][x] for y in (0,h-1) for x in (0,w-1)]
    bg=tuple(round(statistics.median(p[i] for p in corners)) for i in range(3))
    if max(max(abs(p[i]-bg[i]) for i in range(3)) for p in corners)>3: raise ValueError("nonuniform corner background")
    # Color-distance foreground proxy; neutral-colored subject pixels can be missed.
    return bg, [[max(abs(p[i]-bg[i]) for i in range(3))>threshold for p in row] for row in rows]

def bounds(mask):
    coords=[(x,y) for y,row in enumerate(mask) for x,v in enumerate(row) if v]
    if not coords: raise ValueError("empty foreground")
    return [min(x for x,y in coords),min(y for x,y in coords),max(x for x,y in coords),max(y for x,y in coords)],len(coords)

def verify_spec(s,w,h):
    if (w,h)!=(s["reference"]["width"],s["reference"]["height"]): raise ValueError("dimensions")
    if len({p["id"] for p in s["landmarks"]})!=len(s["landmarks"]): raise ValueError("duplicate landmark")
    for p in s["landmarks"]:
        if type(p["x"]) is not int or type(p["y"]) is not int or not (0<=p["x"]<w and 0<=p["y"]<h): raise ValueError("landmark range")
        if p["visibility"] not in ("visible","estimated_visible","partially_occluded"): raise ValueError("visibility")
    for r in s["regions"]:
        x,y,X,Y=r["box"]
        if not (0<=x<X<=w and 0<=y<Y<=h): raise ValueError("region range")
    if s["approval"]!={"reference_sheet":False,"master":False,"game":False}: raise ValueError("unapproved gate")

def analyze(data,s):
    if len(data)!=s["reference"]["bytes"] or hashlib.sha256(data).hexdigest()!=s["reference"]["sha256"]: raise ValueError("reference mismatch")
    w,h,rows=decode_png(data); verify_spec(s,w,h)
    bg,mask=foreground(rows,12); b,area=bounds(mask)
    sensitivity={}
    for t in (6,12,24):
        _,m=foreground(rows,t); bb,n=bounds(m); sensitivity[str(t)]={"bbox_inclusive":bb,"pixels":n}
    # Pixel samples from lit artwork, not intrinsic material albedo.
    samples={}
    for r in s["regions"]:
        x,y,X,Y=r["box"]; pix=[rows[j][i] for j in range(y,Y) for i in range(x,X) if mask[j][i]]
        if not pix: raise ValueError("empty region: "+r["name"])
        samples[r["name"]]={"sample_pixels":len(pix),"median_srgb":[round(statistics.median(p[k] for p in pix)) for k in range(3)]}
    pts={p["id"]:(p["x"],p["y"]) for p in s["landmarks"]}
    height=b[3]-b[1]+1; width=b[2]-b[0]+1
    distances={key:round(math.dist(pts[a],pts[c]),2) for key,a,c in [("ear_tip_separation","near_ear_tip","far_ear_tip"),("eye_to_nose","near_eye","nose"),("nose_to_chin","nose","chin"),("forepaw_separation","near_fore_paw","far_fore_paw"),("crescent_width","chest_crescent_left","chest_crescent_right")]}
    # An actual locked-image overlay with numbered points in the accompanying JSON.
    overlay=[row[:] for row in rows]
    for p in s["landmarks"]:
        x,y=p["x"],p["y"]; color=(30,235,255) if p["visibility"]=="visible" else (255,200,35)
        for dy in range(-4,5):
            for dx in range(-4,5):
                if 0<=x+dx<w and 0<=y+dy<h and (dx*dx+dy*dy in range(9,21) or dx==dy==0): overlay[y+dy][x+dx]=color
    mask_rgb=[[(255,255,255) if v else (0,0,0) for v in row] for row in mask]
    return {"reference_sha256":s["reference"]["sha256"],"dimensions":[w,h],"background_srgb":bg,"silhouette_proxy":{"threshold":12,"bbox_inclusive":b,"width":width,"height":height,"pixels":area,"sensitivity":sensitivity,"not_ground_truth":True},"projected_distances_px":distances,"sampled_lit_colors":samples,"landmarks":[dict(p,foreground_at_point=mask[p["y"]][p["x"]]) for p in s["landmarks"]],"camera":{"status":"unresolved","visible_view":"three-quarter, elevated head","intrinsics_and_extrinsics":"not recoverable uniquely from one image; fit proxy in Phase 3"},"hidden_anatomy":s["hidden_anatomy"],"approval":s["approval"]},encode_png(overlay),encode_png(mask_rgb)

def main():
    root=Path(__file__).resolve().parents[2]; s=json.loads((Path(__file__).parent/"reference.json").read_text())
    report,overlay,mask=analyze((root/s["reference"]["path"]).read_bytes(),s)
    out=Path(sys.argv[1]); out.mkdir(parents=True,exist_ok=False)
    (out/"measurements.json").write_text(json.dumps(report,indent=2)+"\n")
    (out/"landmarks.png").write_bytes(overlay); (out/"silhouette-proxy.png").write_bytes(mask)
    print(json.dumps(report,indent=2))
if __name__=="__main__": main()
