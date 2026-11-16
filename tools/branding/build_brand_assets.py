#!/usr/bin/env python3
from pathlib import Path
import cairosvg
from PIL import Image
from io import BytesIO
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/"art/branding"
OUT=ROOT/"dist/branding"
OUT.mkdir(parents=True,exist_ok=True)
logo=(SRC/"aldervale-logo.svg").read_bytes()
seal=(SRC/"aldervale-seal.svg").read_bytes()
def render(data,path,width,height=None):
    cairosvg.svg2png(bytestring=data,write_to=str(path),output_width=width,output_height=height)
render(logo,OUT/"aldervale-logo-transparent.png",3072,1024)
render(seal,OUT/"aldervale-leaf-seal-1024.png",1024,1024)
render(seal,OUT/"aldervale-leaf-seal-512.png",512,512)
base=Image.open(OUT/"aldervale-logo-transparent.png").convert("RGBA")
dark=Image.new("RGBA",base.size,(13,27,21,255)); dark.alpha_composite(base)
dark.convert("RGB").save(OUT/"aldervale-logo-dark.png",optimize=True)
print("Built 4 PNG deliverables from source SVGs")
