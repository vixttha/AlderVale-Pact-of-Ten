"""Seven camera views of the actual validated GLB; no geometry changes."""
import bpy
from mathutils import Vector
from pathlib import Path
import hashlib,json,sys,time,math

out=Path(sys.argv[sys.argv.index("--")+1])
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
src=json.loads((out/"glb-receipt.json").read_text())
assert sha(out/"candidate.glb")==src["glb_sha256"]
bpy.ops.wm.read_factory_settings(use_empty=True)
assert "FINISHED" in bpy.ops.import_scene.gltf(filepath=str(out/"candidate.glb"))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=="MESH"]
assert len(meshes)==1
coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
center=Vector([(min(v[i] for v in coords)+max(v[i] for v in coords))/2 for i in range(3)])
radius=max((v-center).length for v in coords)
assert math.isfinite(radius) and radius>0
for o in meshes:
    o.data.calc_loop_triangles()
assert sum(len(o.data.loop_triangles) for o in meshes)==src["triangles"]
cam=bpy.data.cameras.new("inspection-camera")
obj=bpy.data.objects.new("inspection-camera",cam);scene.collection.objects.link(obj)
obj.location=center+Vector((2.8,-4.0,2.0)).normalized()*radius*4.5
obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
cam.type="ORTHO";cam.ortho_scale=radius*2.8;scene.camera=obj
world=bpy.data.worlds.new("inspection-world");scene.world=world;world.use_nodes=True
world.node_tree.nodes.get("Background").inputs[0].default_value=(0.16,0.19,0.24,1)
world.node_tree.nodes.get("Background").inputs[1].default_value=0.6
def area(name,direction,power):
    light=bpy.data.lights.new(name,"AREA");light.energy=power*radius*radius;light.shape="DISK";light.size=radius*2.5
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o)
    o.location=center+Vector(direction)*radius
    o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
area("key",(2,-3,4),1000);area("fill",(-3,-2,1),500);area("rim",(1,3,3),700)
scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGB"
views={"front":(0,-1,0),"rear":(0,1,0),"left":(-1,0,0),"right":(1,0,0),"top":(0,0,1),"underside":(0,0,-1),"three-quarter":(2.8,-4,2)}
results={}
for name,direction in views.items():
    obj.location=center+Vector(direction).normalized()*radius*4.5
    obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
    cam.type="PERSP" if name=="three-quarter" else "ORTHO"
    cam.lens=45
    path=out/(name+".png")
    scene.render.filepath=str(path)
    t=time.monotonic()
    bpy.ops.render.render(write_still=True)
    results[name]={"sha256":sha(path),"seconds":round(time.monotonic()-t,3),"direction":list(direction),"projection":cam.type}
assert sha(out/"candidate.glb")==src["glb_sha256"]
assert len({x["sha256"] for x in results.values()})==7
(out/"views-receipt.json").write_text(json.dumps({"status":"pass","source_commit":src["source_commit"],"glb_sha256":src["glb_sha256"],"device":"CPU","engine":"CYCLES","views":results},indent=2)+"\n")
print(json.dumps(results,indent=2))
