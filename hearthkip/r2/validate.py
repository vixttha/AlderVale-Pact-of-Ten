"""Reimport the actual BART export, inspect rig/materials and render review views."""
import bpy, math, sys, json, hashlib, struct
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index("--")+1]); p=out/"Hearthkip-R2.glb"; data=p.read_bytes()
assert len(data)<=8*1024*1024
magic,ver,total,n,kind=struct.unpack_from("<4sIIII",data); assert magic==b"glTF" and ver==2 and total==len(data) and kind==0x4e4f534a
doc=json.loads(data[20:20+n]); assert doc.get("skins") and len(doc["skins"][0]["joints"])>=13
anims={a.get("name") for a in doc.get("animations",[])}; assert {"Idle","Walk","Attack"}<=anims,anims
assert any(max(m.get("emissiveFactor",[0]))>0 for m in doc.get("materials",[]))
bpy.ops.wm.read_factory_settings(use_empty=True)
assert "FINISHED" in bpy.ops.import_scene.gltf(filepath=str(p))
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]; rigs=[o for o in bpy.context.scene.objects if o.type=="ARMATURE"]
assert len(meshes)==1 and len(rigs)==1
mesh=meshes[0]; mesh.data.calc_loop_triangles(); tri=len(mesh.data.loop_triangles)
assert 1000<tri<=25000 and tri==json.loads((out/"modeling.json").read_text())["triangles"]
assert all(abs(sum(g.weight for g in v.groups)-1)<1e-3 for v in mesh.data.vertices)
coords=[mesh.matrix_world@v.co for v in mesh.data.vertices]
assert min(v.z for v in coords)>-.05 and max(v.z for v in coords)>1.8
assert max(v.z for v in coords)-min(v.z for v in coords)>max(v.x for v in coords)-min(v.x for v in coords)
rig=rigs[0]; assert rig.animation_data
# Verify at least one actual animation deforms evaluated vertices.
actions=[a for a in bpy.data.actions if "Walk" in a.name]
assert actions
rig.animation_data.action=actions[0]
for t in rig.animation_data.nla_tracks:t.mute=True
def evaluated(f):
    bpy.context.scene.frame_set(f); g=bpy.context.evaluated_depsgraph_get(); ob=mesh.evaluated_get(g); m=ob.to_mesh()
    try: return [tuple(ob.matrix_world@v.co) for v in m.vertices]
    finally: ob.to_mesh_clear()
a=evaluated(1); b=evaluated(7)
assert len(a)==len(b) and max(math.dist(x,y) for x,y in zip(a,b))>.01
rig.animation_data.action=None
for bone in rig.pose.bones: bone.rotation_euler=(0,0,0); bone.rotation_quaternion=(1,0,0,0); bone.location=(0,0,0)
scene=bpy.context.scene; scene.frame_set(1)
center=Vector((0,0,1.06))
cam=bpy.data.cameras.new("camera"); o=bpy.data.objects.new("camera",cam); scene.collection.objects.link(o); scene.camera=o
cam.type="ORTHO"; cam.ortho_scale=3.1
world=bpy.data.worlds.new("studio"); world.use_nodes=True; scene.world=world; world.node_tree.nodes["Background"].inputs[0].default_value=(.18,.18,.18,1); world.node_tree.nodes["Background"].inputs[1].default_value=.55
def light(name,loc,energy,size):
    d=bpy.data.lights.new(name,"AREA"); d.energy=energy; d.shape="DISK"; d.size=size
    o=bpy.data.objects.new(name,d); scene.collection.objects.link(o); o.location=loc; o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
light("key",(3,-4,5),500,4); light("fill",(-3,-2,3),260,3); light("rim",(1,3,4),500,3)
scene.render.engine="CYCLES"; scene.cycles.device="CPU"; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.threads_mode="FIXED"; scene.render.threads=4; scene.render.resolution_x=768; scene.render.resolution_y=768; scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"; scene.view_settings.view_transform="AgX"
views={"three-quarter":(3,-5,1.4),"front":(0,-5,0),"rear":(0,5,0),"left":(-5,0,0),"right":(5,0,0),"top":(0,0,5),"underside":(0,0,-5)}
for name,d in views.items():
    o.location=center+Vector(d).normalized()*5
    o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(out/(name+".png")); bpy.ops.render.render(write_still=True)
receipt={"source_commit":__import__("os").environ["GITHUB_SHA"],"glb_sha256":hashlib.sha256(data).hexdigest(),"triangles":tri,"bytes":len(data),"skins":len(doc["skins"]),"animations":sorted(anims),"emission_present":True,"reimport":True,"walk_deformation":True,"views":list(views),"quality_accepted":False,"gameplay_verified":False}
(out/"validation.json").write_text(json.dumps(receipt,indent=2)+"\n"); print(receipt)
