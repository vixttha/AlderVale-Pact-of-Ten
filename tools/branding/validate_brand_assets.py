#!/usr/bin/env python3
from base64 import b64decode
from hashlib import sha256
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
svg=ROOT/"art/branding/aldervale-logo.svg"
seal=ROOT/"art/branding/aldervale-seal.svg"
workmark = ROOT / "art/branding/logo-workmarkv1.svg"
assert sha256(workmark.read_bytes()).hexdigest() == (
    "50c048318847470bbfe6150016886a754655f5beb1f532624ec0d9b7dcfcf1ae"
), "approved Workmark v1 SVG changed"
image = ET.parse(workmark).find("{http://www.w3.org/2000/svg}image")
assert image is not None, "approved Workmark v1 is missing its embedded image"
data = image.attrib["{http://www.w3.org/1999/xlink}href"]
prefix = "data:image/png;base64,"
assert data.startswith(prefix), "approved Workmark v1 image is not an embedded PNG"
assert sha256(b64decode(data.removeprefix(prefix), validate=True)).hexdigest() == (
    "c5d038f64d7566721b3708a7a508ce390a2ef52d607867714f561a16c2ad60b3"
), "approved Workmark v1 embedded PNG changed"
for p in (svg,seal):
    ET.parse(p)
    raw=p.read_text()
    assert "<svg" in raw and "<script" not in raw.lower()
out=ROOT/"dist/branding"
expected={"aldervale-logo-transparent.png":(3072,1024),"aldervale-leaf-seal-1024.png":(1024,1024),"aldervale-leaf-seal-512.png":(512,512),"aldervale-logo-dark.png":(3072,1024)}
for name,size in expected.items():
    p=out/name
    assert p.is_file() and p.stat().st_size>1000, f"missing/empty {name}"
    im=Image.open(p)
    assert im.size==size, (name,im.size,size)
    if "transparent" in name or "seal-" in name:
        assert im.mode=="RGBA" and im.getchannel("A").getextrema()[0]==0, f"{name}: no transparent pixels"
    if "dark" in name: assert im.mode=="RGB"
print("PASS: SVG XML safety, output presence, exact dimensions, alpha and dark RGB checks")
