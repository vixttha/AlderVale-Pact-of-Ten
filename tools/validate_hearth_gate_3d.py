"""Verify BART outputs, import evidence and render completeness; no visual approval claim."""
import hashlib,json,struct,sys
from pathlib import Path
from PIL import Image,ImageStat
out=Path(sys.argv[1])
receipt=json.loads((out/'source-receipt.json').read_text())
for role in ('stone','bronze','banner'):
    p=out/(role+'.glb');raw=p.read_bytes()
    magic,version,size=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and size==len(raw)
    n,chunk=struct.unpack_from('<I4s',raw,12);assert chunk==b'JSON'
    gltf=json.loads(raw[20:20+n])
    assert gltf['meshes'] and gltf['materials']
    assert all('uri' not in b for b in gltf.get('buffers',[]))
    if role=='banner': assert gltf.get('textures') and all('bufferView' in i for i in gltf['images'])
    imported=json.loads((out/(role+'-reimport.json')).read_text())
    assert imported['glb_sha256']==hashlib.sha256(raw).hexdigest() and imported['vertices']>1000
    assert imported['faces']>1000 and imported['meshes']>0
    assert json.loads((out/(role+'-inspect.json')).read_text())['sha256']==imported['glb_sha256']
    for view in ('front','angle'):
        with Image.open(out/(role+'-'+view+'.png')) as im:
            assert im.size==(600,600) and max(ImageStat.Stat(im.convert('RGB')).stddev)>12
    receipt[role]=imported
    print(role,imported,'GLB reimport and two 600px renders PASS')
assert sum(p.stat().st_size for p in out.iterdir() if p.is_file())<120*1024*1024
(out/'evaluation-receipt.json').write_text(json.dumps(receipt,indent=2))
print('BART surface evaluation: three converted GLBs, six rendered views; owner visual review still required.')
