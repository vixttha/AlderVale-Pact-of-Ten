import base64,hashlib,json,sys
from pathlib import Path
out,bundle=map(Path,sys.argv[1:])
data=(out/"candidate.glb").read_bytes()
rec=json.loads((out/"glb-receipt.json").read_text())
assert hashlib.sha256(data).hexdigest()==rec["glb_sha256"]
js=bundle.read_text(encoding="utf-8").replace("</script","<\\/script")
license=(out/"viewer-LICENSE.txt").read_text()
buttons="".join(f'<button data-view="{x}">{x.replace("-"," ").title()}</button>' for x in ("front","rear","left","right","top","underside","three-quarter"))
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AAGP synthetic GLB inspection</title><style>
*{box-sizing:border-box}body{margin:0;background:#12181e;color:#eaf0f4;font:15px system-ui,sans-serif}header{padding:16px 20px;border-bottom:1px solid #394550}h1{margin:0 0 6px;font-size:20px}p{margin:0;color:#aebdcc}nav{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px}button{background:#283541;color:#fff;border:1px solid #516272;border-radius:6px;padding:8px 12px;cursor:pointer}button:hover,button:focus{background:#42627b}#stage{height:calc(100vh - 160px);min-height:300px;width:100%;overflow:hidden}canvas{display:block;touch-action:none}footer{padding:10px 20px;color:#aebdcc;font-size:12px}
</style><header><h1>AlderVale · Synthetic reconstruction inspection</h1><p id="status">Loading embedded GLB…</p></header><nav>'''+buttons+'''</nav><main id="stage"></main><footer>Experimental geometry — not production-approved. Offline viewer; no external requests.</footer><script id="model-data" type="application/octet-stream">'''+base64.b64encode(data).decode()+'''</script><script>'''+js+'''</script><!-- Three.js license:\n'''+license.replace("--","—")+'''\n--></html>'''
(out/"viewer.html").write_text(html,encoding="utf-8")
