#!/usr/bin/env python3
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
svg=ROOT/"art/branding/aldervale-logo.svg"
seal=ROOT/"art/branding/aldervale-seal.svg"
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
