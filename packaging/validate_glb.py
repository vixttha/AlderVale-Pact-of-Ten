"""Independent GLB framing, embedded base-color image, source integrity check."""
import hashlib
import io
import json
import os
from pathlib import Path
import struct
import sys


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_glb(data):
    require(len(data)>=28 and len(data)<=64*1024*1024,"GLB size")
    magic,version,length=struct.unpack_from("<4sII",data)
    require(magic==b"glTF" and version==2 and length==len(data),"GLB header")
    off=12; chunks=[]
    while off<len(data):
        require(off+8<=len(data),"chunk header")
        n,kind=struct.unpack_from("<I4s",data,off);off+=8
        require(n%4==0 and off+n<=len(data),"chunk bounds")
        chunks.append((kind,data[off:off+n]));off+=n
    require([k for k,_ in chunks]==[b"JSON",b"BIN\x00"],"expected JSON + BIN")
    doc=json.loads(chunks[0][1])
    require(doc["asset"]["version"]=="2.0","asset version")
    return doc,chunks[1][1]


def main(out):
    import numpy as np
    from PIL import Image
    source=json.loads((out/"texture-receipt.json").read_text())
    require(source["source_commit"]==os.environ["GITHUB_SHA"],"source SHA")
    for n,r in source["files"].items():
        require(digest(out/n)==r["sha256"],"source changed during packaging")
    p=out/"candidate.glb"
    doc,blob=parse_glb(p.read_bytes())
    require(len(doc["buffers"])==1 and "uri" not in doc["buffers"][0],"external buffer")
    require(0<=len(blob)-doc["buffers"][0]["byteLength"]<=3,"buffer size")
    images=doc["images"]; used=set(); triangles=0
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            require(prim.get("mode",4)==4 and "TEXCOORD_0" in prim["attributes"],"triangle UV required")
            accessor=doc["accessors"][prim["indices"]]
            require(accessor["type"]=="SCALAR" and accessor["count"]%3==0,"triangle index count")
            triangles+=accessor["count"]//3
            material=doc["materials"][prim["material"]]
            tex=material["pbrMetallicRoughness"]["baseColorTexture"]
            require(tex.get("texCoord",0)==0,"unexpected texture coordinate set")
            used.add(doc["textures"][tex["index"]]["source"])
    require(triangles==source["triangles"] and len(used)==1,"triangle/image count")
    require(all("uri" not in im and "bufferView" in im for im in images),"external image")
    im=images[next(iter(used))]
    view=doc["bufferViews"][im["bufferView"]]
    offset=view.get("byteOffset",0);n=view["byteLength"]
    require(view["buffer"]==0 and 0<=offset<offset+n<=len(blob),"embedded image bounds")
    require(im["mimeType"]=="image/png","expected embedded PNG")
    with Image.open(io.BytesIO(blob[offset:offset+n])) as embedded, Image.open(out/"texture.png") as original:
        require(embedded.format=="PNG" and embedded.size==original.size==(512,512),"texture dimensions")
        e=np.asarray(embedded.convert("RGBA"));o=np.asarray(original.convert("RGBA"))
        # RGB must remain exact; alpha outside the UV islands may be discarded by
        # the material exporter, so report alpha separately without claiming it.
        covered=o[:,:,3]>0
        require(np.array_equal(e[covered,:3],o[covered,:3]),"covered texture RGB changed")
        alpha_equal=bool(np.array_equal(e[:,:,3],o[:,:,3]))
    receipt={"status":"pass","scope":"checkpoint-05-packaging","source_commit":os.environ["GITHUB_SHA"],
             "glb_sha256":digest(p),"glb_bytes":p.stat().st_size,"triangles":triangles,
             "embedded_png_bytes":n,"embedded_image_sha256":hashlib.sha256(blob[offset:offset+n]).hexdigest(),
             "covered_rgb_exact":True,"alpha_exact":alpha_equal,"source_files_preserved":True,
             "source_watertight":source["raw_watertight"],"quality_accepted":False}
    (out/"glb-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt,indent=2),flush=True)


if __name__=="__main__":
    main(Path(sys.argv[1]))
