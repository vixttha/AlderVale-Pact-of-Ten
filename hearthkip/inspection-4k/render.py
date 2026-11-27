"""Native UHD inspection renders of the unchanged published R1 GLB."""
import bpy, hashlib, json, math, struct, sys, time, os
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index("--")+1])
out=Path(sys.argv[sys.argv.index("--")+2]); out.mkdir(parents=True,exist_ok=False)
digest="bbaf6b04baad6400dad4ecafabe7f975d6f156f7e828e23b0ecbe39b824987af"
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(src)==digest
bpy.ops.wm.read_factory_settings(use_empty=True)
assert "FINISHED" in bpy.ops.import_scene.gltf(filepath=str(src))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=="MESH"]
assert len(meshes)==1
coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
center=Vector([(min(v[i] for v in coords)+max(v[i] for v in coords))/2 for i in range(3)])
radius=max((v-center).length for v in coords); assert radius>0 and math.isfinite(radius)
for o in meshes:o.data.calc_loop_triangles()
assert sum(len(o.data.loop_triangles) for o in meshes)==33830
cam=bpy.data.cameras.new("camera"); obj=bpy.data.objects.new("camera",cam); scene.collection.objects.link(obj); scene.camera=obj
world=bpy.data.worlds.new("inspection-world");scene.world=world;world.use_nodes=True
world.node_tree.nodes.get("Background").inputs[0].default_value=(.16,.19,.24,1)
world.node_tree.nodes.get("Background").inputs[1].default_value=.6
def area(name,direction,power):
    light=bpy.data.lights.new(name,"AREA");light.energy=power*radius*radius;light.shape="DISK";light.size=radius*2.5
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=center+Vector(direction)*radius
    o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
area("key",(2,-3,4),1000);area("fill",(-3,-2,1),500);area("rim",(1,3,3),700)
scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=8;scene.cycles.use_denoising=True
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=3840;scene.render.resolution_y=2160;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGB"
scene.render.image_settings.compression=70
views={"front":(0,-1,0),"rear":(0,1,0),"left":(-1,0,0),"right":(1,0,0),"top":(0,0,1),"underside":(0,0,-1),"three-quarter":(2.8,-4,2)}
results={}
for name,direction in views.items():
    obj.location=center+Vector(direction).normalized()*radius*4.5
    obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
    cam.type="ORTHO"
    # Fit both projected dimensions; horizontal scale for wide landscape frame.
    inv=obj.rotation_euler.to_matrix().transposed()
    points=[inv@(v-center) for v in coords]
    cam.ortho_scale=2.4*max(max(abs(p.x) for p in points),max(abs(p.y) for p in points)*3840/2160)
    path=out/(name+".png");scene.render.filepath=str(path)
    t=time.monotonic();bpy.ops.render.render(write_still=True)
    with path.open("rb") as f: header=f.read(24)
    assert header[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",header[16:24])==(3840,2160)
    results[name]={"sha256":sha(path),"bytes":path.stat().st_size,"dimensions":[3840,2160],"seconds":round(time.monotonic()-t,3),"direction":list(direction),"projection":"ORTHO"}
assert sha(src)==digest
assert len({x["sha256"] for x in results.values()})==7
(out/"receipt.json").write_text(json.dumps({"source_commit":os.environ["GITHUB_SHA"],"model_commit":"ce089591db09e3372740f29dbd422a984f73c31a","glb_sha256":digest,"triangles":33830,"native_render":True,"device":"CPU","engine":"CYCLES","orientation":"original GLB axes, not anatomical correction","quality_accepted":False,"views":results},indent=2)+"\n")
print(json.dumps(results,indent=2))
