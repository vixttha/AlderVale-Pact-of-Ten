"""Export and check the five candidate marks; no network or external asset input."""
from pathlib import Path
import shutil, xml.etree.ElementTree as ET
import cairosvg
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=root/'art/open-hearth'
out=root/'dist/open-hearth'
out.mkdir(parents=True, exist_ok=True)
names=["01-hearthstone","02-forged-ring","03-ember-gate","04-shared-flame","05-kilnback-seal"]
assert sorted(p.stem for p in source.glob('*.svg'))==names
for name in names:
    svg=source/(name+'.svg')
    xml=ET.parse(svg).getroot()
    ns='{http://www.w3.org/2000/svg}'
    assert xml.tag==ns+'svg' and xml.attrib['viewBox']=='0 0 256 256'
    assert all(e.tag in {ns+'svg',ns+'title',ns+'path'} for e in xml.iter())
    assert all(not any(k.lower().startswith('on') or 'href' in k.lower() or 'url(' in v for k,v in e.attrib.items()) for e in xml.iter())
    shutil.copyfile(svg,out/svg.name)
    for size in (32,96,1024):
        png=out/(name+'.png') if size==1024 else out/(name+'-'+str(size)+'.png')
        cairosvg.svg2png(url=str(svg),write_to=str(png),output_width=size,output_height=size)
        with Image.open(png) as im:
            assert im.mode=='RGBA' and im.size==(size,size)
            alpha=im.getchannel('A')
            assert alpha.getextrema()==(0,255) and alpha.getpixel((0,0))==0
            assert alpha.getpixel((size//2,int(size*0.86)))==0, name+' lower opening obscured'
            bounds=alpha.getbbox()
            assert bounds and all(0<n<size for n in bounds)
        if size!=1024: png.unlink()
    print(name+': vector structure, transparent 32/96/1024 render and lower opening passed')
shutil.copyfile(source/'README.md',out/'README.md')
print('Five SVG masters and five 1024x1024 transparent PNG exports; no art acceptance implied.')
