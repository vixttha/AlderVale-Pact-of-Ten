"""Render exact master masks and banner texture for the isolated 3D evaluation."""
from pathlib import Path
import hashlib, json, sys, subprocess, io
from PIL import Image, ImageDraw
import cairosvg
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
src=root/'art/open-hearth/hearth-gate-r3'
expected={'03-monochrome.svg':'4125608dd71bf947892310ec6ddbb1fc71f4037bef9c3e3a939dd866ba2b9f5b','04-dark-background.svg':'4362972da7b25142bce6d63bb2db59e2f87594e4f73f712d6bdff8e527a7c91c'}
for name,digest in expected.items():
    assert hashlib.sha256((src/name).read_bytes()).hexdigest()==digest
cairosvg.svg2png(url=str(src/'03-monochrome.svg'),write_to=str(out/'mask.png'),output_width=512,output_height=512)
banner=Image.new('RGB',(1024,1024),(65,25,19))
draw=ImageDraw.Draw(banner);draw.rectangle((24,24,999,999),outline=(190,145,74),width=6)
mark=Image.open(io.BytesIO(cairosvg.svg2png(url=str(src/'04-dark-background.svg'),output_width=800,output_height=800))).convert('RGBA')
banner.paste(mark,(112,78),mark);banner.save(out/'banner.png')
(out/'source-receipt.json').write_text(json.dumps({'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'masters':expected,'bart_commit':'392d8d7a1c262227cba3c08d5577af38c74b4e25','blender':'4.5.0'},indent=2))
