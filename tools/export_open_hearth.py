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

# Separate review B export; keep A untouched.
import hashlib, os, subprocess
source_b=source/'review-b'
out_b=out/'review-b'
out_b.mkdir(parents=True,exist_ok=True)
expected={"01-open-circlet":"689fa782895288f89b5a23328b4c943862a16d23ccb893ef29bc5b4236a42332","02-hearth-gate":"3fcf41ff67f7a0885b02622b9e4c2be27770a11e570683dde00889573314bc79","03-oath-of-embers":"115a2f3af49ec3eb40b501d71e5da0bde067d8199334cdc55edcd0e39c7d3628","04-kilnback-seal":"0bbf60a0f613cd6c7c181d2d4ee22f8f3e42a79905a91230d3558d575672ec6c","05-keeper-of-warmth":"2f529636c009e549218d55c8801b03a174ac0b659e89e96cf7aa2657f74f6b30"}
assert {p.stem for p in source_b.glob('*.svg')}==set(expected)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==os.environ['GITHUB_SHA']
for name,digest in expected.items():
    raw=(source_b/(name+'.svg')).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==digest,name
    xml=ET.fromstring(raw)
    assert xml.attrib['viewBox']=='0 0 256 256'
    assert all(e.tag in {ns+'svg',ns+'g',ns+'path'} for e in xml.iter())
    assert all(not any(k.lower().startswith('on') or 'href' in k.lower() or 'url(' in v for k,v in e.attrib.items()) for e in xml.iter())
    (out_b/(name+'.svg')).write_bytes(raw)
    cairosvg.svg2png(bytestring=raw,write_to=str(out_b/(name+'.png')),output_width=1024,output_height=1024)
    with Image.open(out_b/(name+'.png')) as im:
        assert im.mode=='RGBA' and im.size==(1024,1024)
        alpha=im.getchannel('A')
        assert alpha.getextrema()==(0,255)
        x0,y0,x1,y1=alpha.getbbox()
        assert 30<x0<x1<994 and 30<y0<y1<994
        assert alpha.crop((500,760,524,1024)).getbbox() is None,name+' threshold closed'
        assert all(alpha.getpixel(xy)==0 for xy in [(0,0),(1023,0),(0,1023),(1023,1023)])
        proof=Image.new('RGBA',(112,64),(243,238,228,255))
        proof.paste((34,38,34,255),(56,0,112,64))
        tiny=im.resize((48,48),Image.Resampling.LANCZOS)
        proof.alpha_composite(tiny,(4,8))
        proof.alpha_composite(tiny,(60,8))
        proof.convert('RGB').save(out_b/(name+'-proof.png'))
    print('Review B:',name,digest,'1024 RGBA; open threshold; 48px light/dark proof')
shutil.copyfile(source_b/'README.md',out_b/'README.md')
print('Five review B SVG masters match chat source SHA-256; five transparent PNGs exported. Visual approval pending.')

# R1: four coordinated variants; older review sets remain independently checked.
r1=source/'hearth-gate-r1'
r1out=out/'hearth-gate-r1'
r1out.mkdir(parents=True,exist_ok=True)
r1names=['01-hero','02-simple-icon','03-monochrome','04-dark-background']
assert sorted(p.stem for p in r1.glob('*.svg'))==r1names
geometry={}
for name in r1names:
    raw=(r1/(name+'.svg')).read_bytes()
    svg=ET.fromstring(raw)
    assert svg.tag==ns+'svg' and svg.attrib['viewBox']=='0 0 256 256'
    assert all(el.tag in {ns+'svg',ns+'path'} for el in svg.iter())
    assert all(not any(k.lower().startswith('on') or 'href' in k.lower() or 'url(' in v for k,v in el.attrib.items()) for el in svg.iter())
    shapes=list(svg)
    geometry[name]=shapes[0].attrib['d']
    if name=='03-monochrome':
        assert {el.attrib['fill'] for el in shapes}=={'#27251F'}
        assert shapes[-1].attrib.get('fill-rule')=='evenodd'
    (r1out/(name+'.svg')).write_bytes(raw)
    for size in (32,96,1024):
        png=cairosvg.svg2png(bytestring=raw,output_width=size,output_height=size)
        from io import BytesIO
        with Image.open(BytesIO(png)) as im:
            assert im.mode=='RGBA' and im.size==(size,size)
            alpha=im.getchannel('A')
            assert alpha.getextrema()==(0,255)
            assert all(alpha.getpixel(xy)==0 for xy in [(0,0),(size-1,0),(0,size-1),(size-1,size-1)])
            assert alpha.crop((int(size*.47),int(size*.77),int(size*.53),size)).getbbox() is None,name+' closed threshold'
            if name=='03-monochrome':
                assert alpha.getpixel((int(size*129/256),int(size*165/256)))==0,'monochrome cutout filled'
            if size==1024:
                (r1out/(name+'.png')).write_bytes(png)
            else:
                proof=Image.new('RGBA',(size*2+24,size+16),(243,238,228,255))
                proof.paste((34,38,34,255),(size+12,0,size*2+24,size+16))
                proof.alpha_composite(im,(6,8));proof.alpha_composite(im,(size+18,8))
                proof.convert('RGB').save(r1out/(name+'-'+str(size)+'-proof.png'))
    print('Hearth Gate R1:',name,hashlib.sha256(raw).hexdigest(),'32/96/1024 render; transparent opening')
assert len(set(geometry.values()))==1,'inconsistent gate silhouette'
assert [el.attrib['d'] for el in ET.parse(r1/'01-hero.svg').getroot()]==[el.attrib['d'] for el in ET.parse(r1/'04-dark-background.svg').getroot()]
shutil.copyfile(r1/'README.md',r1out/'README.md')
print('Hearth Gate R1: four SVG and PNG pairs; shared gate geometry; monochrome cutout; dark hero geometry; visual acceptance pending.')

# R2 carved sanctuary: preserve and verify all previous sets, including R1.
r2=source/'hearth-gate-r2'
r2out=out/'hearth-gate-r2'
r2out.mkdir(parents=True,exist_ok=True)
assert sorted(p.stem for p in r2.glob('*.svg'))==r1names
shapes2={}
for name in r1names:
    raw=(r2/(name+'.svg')).read_bytes()
    svg=ET.fromstring(raw)
    assert svg.tag==ns+'svg' and svg.attrib['viewBox']=='0 0 256 256'
    assert all(el.tag in {ns+'svg',ns+'path'} for el in svg.iter())
    assert all(not any(k.lower().startswith('on') or 'href' in k.lower() or 'url(' in v for k,v in el.attrib.items()) for el in svg.iter())
    shapes2[name]=list(svg)
    (r2out/(name+'.svg')).write_bytes(raw)
    for size in (32,48,96,1024):
        png=cairosvg.svg2png(bytestring=raw,output_width=size,output_height=size)
        from io import BytesIO
        with Image.open(BytesIO(png)) as im:
            assert im.mode=='RGBA' and im.size==(size,size)
            alpha=im.getchannel('A')
            assert alpha.getextrema()==(0,255)
            assert all(alpha.getpixel(xy)==0 for xy in [(0,0),(size-1,0),(0,size-1),(size-1,size-1)])
            assert alpha.crop((int(size*.45),int(size*.78),int(size*.55),size)).getbbox() is None,name+' threshold blocked'
            assert alpha.getpixel((int(size*60/256),int(size*175/256)))==255
            assert alpha.getpixel((int(size*196/256),int(size*175/256)))==255
            if name=='03-monochrome':
                assert alpha.getpixel((int(size*128/256),int(size*165/256)))==0,'monochrome cutout filled'
            if size==1024:
                (r2out/(name+'.png')).write_bytes(png)
            if size in (32,96):
                proof=Image.new('RGBA',(size*2+24,size+16),(243,238,228,255))
                proof.paste((34,38,34,255),(size+12,0,size*2+24,size+16))
                proof.alpha_composite(im,(6,8));proof.alpha_composite(im,(size+18,8))
                proof.convert('RGB').save(r2out/(name+'-'+str(size)+'-proof.png'))
    print('Hearth Gate R2:',name,hashlib.sha256(raw).hexdigest(),'32/48/96/1024 render; transparent opening')
hero2,icon2,mono2,dark2=[shapes2[n] for n in r1names]
assert [el.attrib['d'] for el in hero2]==[el.attrib['d'] for el in dark2]
assert len({s[0].attrib['d'] for s in shapes2.values()})==1
assert [el.attrib['d'] for el in hero2[-2:]]==[el.attrib['d'] for el in icon2[-2:]]
assert mono2[-1].attrib['d']==' '.join(el.attrib['d'] for el in hero2[-2:])
assert mono2[-1].attrib['fill-rule']=='evenodd' and {el.attrib['fill'] for el in mono2}=={'#27251F'}
assert hero2[-2].attrib['d']!=ET.parse(r1/'01-hero.svg').getroot()[-2].attrib['d']
shutil.copyfile(r2/'README.md',r2out/'README.md')
print('Hearth Gate R2: four SVG/PNG pairs; shared arch/flame, true monochrome cutout, hero/dark geometry and prior sets verified; visual approval pending.')

# R3: validate unchanged source geometry across variants and context proofs.
from PIL import ImageFilter, ImageChops
from io import BytesIO
import math
r3=source/'hearth-gate-r3'
r3out=out/'hearth-gate-r3'
r3out.mkdir(parents=True,exist_ok=True)
names=r1names+['05-stone-relief','06-forged-metal','07-ceremonial-banner']
assert sorted(p.stem for p in r3.glob('*.svg'))==names
shapes3={}
def render_mask(paths):
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">'+''.join('<path d="'+d+'" fill="black"/>' for d in paths)+'</svg>'
    return Image.open(BytesIO(cairosvg.svg2png(bytestring=svg.encode(),output_width=256,output_height=256))).getchannel('A').point(lambda v:255 if v>0 else 0)
def separation(gate, flame):
    return ImageChops.multiply(gate,flame.filter(ImageFilter.MaxFilter(33))).getbbox() is None
for name in r1names:
    raw=(r3/(name+'.svg')).read_bytes()
    svg=ET.fromstring(raw)
    assert svg.tag==ns+'svg' and svg.attrib['viewBox']=='0 0 256 256'
    assert all(el.tag in {ns+'svg',ns+'path'} for el in svg.iter())
    assert all(not any(k.lower().startswith('on') or 'href' in k.lower() or 'url(' in v for k,v in el.attrib.items()) for el in svg.iter())
    shapes3[name]=list(svg)
    (r3out/(name+'.svg')).write_bytes(raw)
    for size in (32,48,96,1024):
        png=cairosvg.svg2png(bytestring=raw,output_width=size,output_height=size)
        with Image.open(BytesIO(png)) as im:
            assert im.mode=='RGBA' and im.size==(size,size)
            alpha=im.getchannel('A')
            assert alpha.getextrema()==(0,255)
            assert alpha.crop((int(size*.45),int(size*.78),int(size*.55),size)).getbbox() is None
            if name=='03-monochrome':
                assert alpha.getpixel((int(size*128/256),int(size*166/256)))==0
            if size==1024:
                (r3out/(name+'.png')).write_bytes(png)
            else:
                proof=Image.new('RGBA',(size*2+24,size+16),(243,238,228,255))
                proof.paste((34,38,34,255),(size+12,0,size*2+24,size+16))
                proof.alpha_composite(im,(6,8));proof.alpha_composite(im,(size+18,8))
                proof.convert('RGB').save(r3out/(name+'-'+str(size)+'-proof.png'))
    print('Hearth Gate R3:',name,hashlib.sha256(raw).hexdigest(),'32/48/96/1024 RGBA; open threshold')
h,i,m,dark=[shapes3[n] for n in r1names]
assert [e.attrib['d'] for e in h]==[e.attrib['d'] for e in dark]
assert len({s[0].attrib['d'] for s in shapes3.values()})==1
assert [e.attrib['d'] for e in h[-2:]]==[e.attrib['d'] for e in i[-2:]]
assert m[-1].attrib['d']==' '.join(e.attrib['d'] for e in h[-2:])
assert m[-1].attrib['fill-rule']=='evenodd' and len({e.attrib['fill'] for e in m})==1
gate=render_mask([e.attrib['d'] for e in h[:-2]])
fire=render_mask([h[-2].attrib['d']])
assert separation(gate,fire),'R3 flame clearance below conservative 16-unit square radius'
assert not separation(render_mask([e.attrib['d'] for e in hero2[:-2]]),render_mask([hero2[-2].attrib['d']])),'R2 known-close negative fixture unexpectedly passed'
print('R3 clearance: 16-unit conservative mask separation PASS; R2 negative fixture rejected')
def luminance(color):
    v=[int(color[j:j+2],16)/255 for j in (1,3,5)]
    return sum(w*(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4) for w,x in zip((.2126,.7152,.0722),v))
def contrast(a,b):
    x,y=sorted((luminance(a),luminance(b)))
    return (y+.05)/(x+.05)
for shape,bg in ((h,'#F3EEE4'),(dark,'#222622')):
    for e in (shape[0],shape[-2]):
        ratio=contrast(e.attrib['fill'],bg)
        assert ratio>=3
        print('R3 flat silhouette contrast',e.attrib['fill'],bg,round(ratio,2))
for name in names[4:]:
    raw=(r3/(name+'.svg')).read_bytes()
    svg=ET.fromstring(raw)
    ds=[e.attrib.get('d') for e in svg.iter(ns+'path')]
    expected=[e.attrib['d'] for e in (dark if name=='07-ceremonial-banner' else m)]
    assert all(v in ds for v in expected),name+' emblem geometry drift'
    assert svg.attrib['viewBox']=='0 0 600 600'
    png=cairosvg.svg2png(bytestring=raw,output_width=600,output_height=600)
    with Image.open(BytesIO(png)) as im:
        assert im.size==(600,600)
        assert len(im.convert('RGB').getcolors(360001))>64,name+' blank surface'
    (r3out/(name+'.svg')).write_bytes(raw)
    (r3out/(name+'.png')).write_bytes(png)
    print('R3 surface:',name,'600x600 rendered; exact geometry')
shutil.copyfile(r3/'README.md',r3out/'README.md')
print('R3: four coordinated masters, three digital surface proofs; owner visual acceptance pending.')
