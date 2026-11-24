from pathlib import Path
import hashlib,json,shutil,subprocess,xml.etree.ElementTree as ET
import cairosvg
from PIL import Image
root=Path(__file__).resolve().parents[1]
src=root/'art/avarn/concepts-a'
out=root/'dist/avarn-concepts';out.mkdir(parents=True,exist_ok=True)
expected=["01-kilnback-colossus","02-cinder-crowned","03-ember-vault","04-caldera-warden","05-ashveil-pilgrim"]
assert sorted(p.stem for p in src.glob('*.svg'))==sorted(expected)
receipt={'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'studies':{}}
for name in expected:
    f=src/(name+'.svg');raw=f.read_bytes();tree=ET.fromstring(raw)
    assert tree.attrib['viewBox']=='0 0 1024 768'
    ids=[e.attrib.get('id','') for e in tree.iter()]
    assert all(f'{side}-leg-{n}' in ids for side in ('far','near') for n in range(1,4))
    assert not any(e.tag.split('}')[-1] in ('script','image','foreignObject') for e in tree.iter())
    assert not any('href' in k for e in tree.iter() for k in e.attrib)
    target=out/(name+'.png');cairosvg.svg2png(bytestring=raw,write_to=str(target),output_width=1024,output_height=768)
    with Image.open(target) as im:
        assert im.mode=='RGBA' and im.size==(1024,768)
        assert im.getchannel('A').getextrema()==(0,255)
        assert len(im.getcolors(1024*768+1))>500
    shutil.copyfile(f,out/f.name)
    receipt['studies'][name]={'svg_sha256':hashlib.sha256(raw).hexdigest(),'png_sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(name,'six declared limbs, 1024x768 RGBA export PASS (not visual or 3D acceptance)')
assert len({x['png_sha256'] for x in receipt['studies'].values()})==5
shutil.copyfile(src/'README.md',out/'README.md')
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
