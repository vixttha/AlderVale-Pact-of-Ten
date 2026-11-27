"""Art-directed Hearthkip R2 candidate, based on the locked single-view reference.
No new image generation or synthetic reference. Geometry is authored, not inferred
from unseen image pixels. Production acceptance is deliberately separate.
"""
import bpy, bmesh, math, sys, random, hashlib, json
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
out=Path(sys.argv[sys.argv.index("--")+1]); out.mkdir(parents=True,exist_ok=True)
ref=Path(__file__).resolve().parents[1]/"Hearthkip-R1-TripoSR-input.png"
assert hashlib.sha256(ref.read_bytes()).hexdigest()=="230c3a5cda2bf06697a345fa4e3b142c53824cb47c76af8ee3ff72fa7e8d47eb"
bpy.ops.wm.read_factory_settings(use_empty=True)
rng=random.Random(177)
def mat(name,c,rough=.65,em=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF"); p.inputs["Base Color"].default_value=(*c,1)
    p.inputs["Roughness"].default_value=rough
    if em: p.inputs["Emission Color"].default_value=(*c,1); p.inputs["Emission Strength"].default_value=em
    return m
copper=mat("01_Copper fur",(.31,.085,.022)); dark=mat("02_Charcoal saddle",(.065,.027,.017))
rust=mat("03_Russet guard hairs",(.17,.041,.013)); cream=mat("04_Warm cream",(.53,.30,.135))
tan=mat("05_Paw and muzzle",(.32,.15,.063)); inner=mat("06_Ear ember bed",(.36,.048,.006))
glow=mat("07_Ember veins",(.98,.20,.012),.42,2.0)
gold=mat("08_Golden fire", (1,.55,.055),.32,2.8)
eye=mat("09_Amber iris",(.65,.22,.016),.22,.12); black=mat("10_Nose and pupil",(.027,.012,.008),.3)
shine=mat("11_Eye highlight",(.9,.8,.58),.22,.25)
pieces=[]; owner={}
def finish(o,m,bone=None):
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth=True
    if bone: pieces.append(o); owner[o.name]=bone
    return o
def ball(name,loc,scale,m,bone=None,segments=24,rings=16,axis=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    if axis is not None: o.rotation_euler=Vector(axis).to_track_quat("Z","Y").to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return finish(o,m,bone)
def capsule(name,a,b,rad,m,bone=None,segments=20):
    a,b=Vector(a),Vector(b); d=b-a
    return ball(name,(a+b)/2,(rad[0],rad[1],d.length*.5+rad[2]),m,bone,segments,12,d)
def select(items):
    bpy.ops.object.select_all(action="DESELECT")
    for o in items: o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
def apply(o,mod):
    select([o]); bpy.ops.object.modifier_apply(modifier=mod.name)
# A single fused base skin; distinct sculpted appendages share a rig.
body=[ball("torso",(0,.10,.83),(.43,.65,.43),copper),
      ball("chest",(0,-.37,.94),(.43,.36,.51),copper),
      ball("neck",(0,-.45,1.24),(.32,.32,.40),copper),
      ball("head",(0,-.58,1.45),(.39,.36,.32),copper),
      ball("jaw",(0,-.79,1.30),(.29,.26,.18),copper)]
legs={}
for side in (-1,1):
    for name,y in (("front",-.38),("rear",.51)):
        k=f"{name}.{'L' if side>0 else 'R'}"; x=.28*side
        hip=(x,y,.79); knee=(x*1.08,y+(.035 if name=="front" else -.055),.40)
        ankle=(x*1.10,y-.025,.16); foot=(x*1.10,y-.10,.12)
        legs[k]=(hip,knee,ankle,foot)
        body += [capsule(k+" upper",hip,knee,(.17,.16,.07),copper),
                 capsule(k+" lower",knee,ankle,(.125,.13,.055),copper),
                 ball(k+" paw",foot,(.18,.215,.12),tan)]
select(body); bpy.ops.object.join(); base=bpy.context.object; base.name="Hearthkip continuous skin"
mod=base.modifiers.new("Fuse sculpt volumes","REMESH"); mod.mode="VOXEL"; mod.voxel_size=.027; mod.use_smooth_shade=True
apply(base,mod)
mod=base.modifiers.new("Smooth sculpt","SMOOTH"); mod.factor=.75; mod.iterations=3; apply(base,mod)
mod=base.modifiers.new("Runtime triangle budget","DECIMATE"); mod.ratio=.48; apply(base,mod)
# Explicit palette mapped to anatomy; the dark saddle is not an overexposed bake.
base.data.materials.clear()
for m in (copper,dark,rust,cream,tan): base.data.materials.append(m)
for p in base.data.polygons:
    v=base.matrix_world@p.center
    if v.z<.22: idx=4
    elif v.y<-.58 and v.z<1.21 and abs(v.x)<.28: idx=3
    elif v.y>-.28 and v.z>1.03: idx=1
    elif v.z>1.38 and v.y>-.62: idx=1
    elif v.z>.9 and rng.random()<.13: idx=2
    else: idx=0
    p.material_index=idx; p.use_smooth=True
pieces.append(base)
# Closed tapered swept mesh, used for layered fur, glowing veins, and crescent.
def sweep(name,points,radii,m,bone,sides=8):
    pts=[Vector(p) for p in points]; vs=[]; fs=[]
    for i,p in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        helper=Vector((0,0,1)) if abs(t.z)<.90 else Vector((0,1,0))
        u=t.cross(helper).normalized(); w=t.cross(u).normalized()
        for j in range(sides):
            ang=2*pi*j/sides; vs.append(p+radii[i]*(cos(ang)*u+sin(ang)*w))
    for i in range(len(pts)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            fs.append((a,b,b+sides,a+sides))
    fs.append(tuple(reversed(range(sides))))
    fs.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vs,[],fs); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    return finish(o,m,bone)
# Ear forms: large, tapered, outward tilted, with inset lava surfaces and branching veins.
ears={}
for s in (-1,1):
    lr="L" if s>0 else "R"; k="ear."+lr
    a=Vector((s*.22,-.46,1.60)); b=Vector((s*.58,-.40,2.16)); d=(b-a).normalized()
    ears[k]=(tuple(a),tuple(b))
    ball(k+" outer",a+(b-a)*.50,(.225,.12,.40),dark,k,28,18,d)
    ball(k+" inner",a+(b-a)*.57+Vector((0,-.097,0)),(.164,.056,.30),inner,k,24,16,d)
    for j in range(5):
        start=a+(b-a)*(.24+j*.115)+Vector((0,-.149,0))
        end=start+Vector((s*(.09 if j%2==0 else -.075),.008,.10))
        sweep(k+" vein"+str(j),[start,(start+end)*.5+Vector((.025*s,-.008,.015)),end],[.009,.007,.0025],glow,k,6)
    sweep(k+" core",[a+(b-a)*t+Vector((0,-.155,0)) for t in (.27,.43,.59,.75)],[.009,.014,.012,.003],gold,k,6)
# Face: separate almond eye sockets, amber irises, dark pupils, cheek, paired muzzle.
for s in (-1,1):
    lr="L" if s>0 else "R"; direction=Vector((s*.62,-.78,.10)).normalized()
    c=Vector((s*.258,-.799,1.48))
    ball("eye socket "+lr,c,(.121,.087,.045),dark,"head",24,16,direction)
    ball("iris "+lr,c+direction*.035,(.079,.068,.032),eye,"head",24,16,direction)
    ball("pupil "+lr,c+direction*.063,(.033,.051,.016),black,"head",20,12,direction)
    ball("catchlight "+lr,c+direction*.078+Vector((-.014,.006,.025)),(.017,.017,.012),shine,"head",12,8,direction)
    ball("muzzle "+lr,(s*.116,-.934,1.30),(.15,.15,.105),cream,"head",24,16)
    ball("cheek "+lr,(s*.27,-.75,1.30),(.15,.16,.14),rust,"head",20,12)
    for j in range(3):
        p=(s*(.21+j*.035),-.785+j*.026,1.30-j*.04)
        sweep("cheek tuft "+lr+str(j),[p,(s*(.32+j*.018),-.77,1.26-j*.06),(s*(.39+j*.016),-.67,1.20-j*.07)],[.055,.045,.003],cream if j==0 else rust,"head",8)
    for i in range(3):
        ball("nostril freckle "+lr+str(i),(s*(.09+i*.04),-1.057,1.31+.017*(i%2)),(.009,.006,.008),dark,"head",8,6)
ball("nose",(0,-1.063,1.345),(.104,.047,.063),black,"head",24,16)
ball("lower lip",(0,-.993,1.235),(.12,.044,.022),dark,"head",20,12)
# Tail: broad tapered leaf silhouette, charred edge with ember seams.
tail_a=Vector((0,.58,.99)); tail_b=Vector((.10,1.01,1.47))
ball("tail",(tail_a+tail_b)/2,(.205,.155,.365),dark,"tail",28,18,tail_b-tail_a)
for j in range(5):
    p=tail_a+(tail_b-tail_a)*(.30+j*.12)+Vector((.11,-.025,0))
    q=p+Vector((.046,.048,.057))
    sweep("tail ember "+str(j),[p,(p+q)*.5+Vector((.022,0,.01)),q],[.007,.009,.002],glow,"tail",6)
# Layered flame-like guard hairs around breast, brow, and saddle. Closed mesh strips.
for row in range(4):
    z=1.25-row*.115
    for j in range(-3,4):
        x=j*(.062+row*.007); y=-.70+.20*(abs(x)/.25)**2
        p=(x,y,z); tip=(x*1.15,y-.018,z-.18-.022*(1-abs(j)/3))
        sweep("bib tuft", [p,((p[0]+tip[0])/2,y-.036,z-.075),tip],[.047,.044,.003], cream if abs(j)<2 else copper,"chest",7)
for j in range(15):
    t=j/14; y=-.36+.92*t
    for s in (-1,1):
        x=s*(.14+.18*sin(pi*t)); z=1.17-.12*t
        sweep("saddle tuft",[(x,y,z),(x+s*.066,y+.035,z-.03),(x+s*.10,y+.12,z-.13)],[.041,.045,.003],dark if j%3 else rust,"spine",7)
for s in (-1,1):
    for j in range(5):
        p=(s*(.09+.035*j),-.57+j*.032,1.69-j*.007)
        sweep("crown tuft",[p,(p[0]*1.05,p[1]+.055,p[2]+.035),(p[0]*1.2,p[1]+.15,p[2]+.04)],[.044,.04,.003],dark if j%2 else rust,"head",7)
# Anatomically positioned crescent: glowing upper arch with tapered ends.
points=[]; radii=[]
for i in range(25):
    a=.04+ (pi-.08)*i/24
    x=.207*cos(a); z=.94+.205*sin(a)
    points.append((x,-.78+.20*(abs(x)/.22)**2,z))
    radii.append(.012+.028*sin(pi*i/24)**.6)
sweep("Hearth crescent",points,radii,gold,"chest",10)
# Fire seams along flanks, restrained, with actual emissive material.
for s in (-1,1):
    for j in range(7):
        y=-.21+j*.12; x=s*.416; z=.87+.09*sin(j*.8)
        sweep("flank ember",[(x,y,z),(x+s*.004,y+.045,z+.054),(x-s*.025,y+.095,z+.026)],[.006,.010,.002],glow,"spine",6)
# Paw toes, separable silhouettes rather than block-shaped feet.
for k,(hip,knee,ankle,foot) in legs.items():
    for j in (-1,0,1):
        ball(k+" toe "+str(j),(foot[0]+j*.084,foot[1]-.128,.102),(.053,.075,.086),tan,"lower."+k,16,10)
# Rig and authored weight assignments.
arm=bpy.data.armatures.new("Hearthkip skeleton"); rig=bpy.data.objects.new("Hearthkip rig",arm)
bpy.context.collection.objects.link(rig); select([rig]); bpy.ops.object.mode_set(mode="EDIT")
def bone(n,h,t,parent=None):
    b=arm.edit_bones.new(n); b.head=h; b.tail=t
    if parent: b.parent=arm.edit_bones[parent]
    return b
bone("root",(0,0,.05),(0,0,.34))
bone("spine",(0,.38,.80),(0,-.25,.94),"root")
bone("chest",(0,-.25,.94),(0,-.48,1.29),"spine")
bone("head",(0,-.48,1.29),(0,-.65,1.56),"chest")
for k,(h,n,a,f) in legs.items():
    bone("upper."+k,h,n,"chest" if k.startswith("front") else "spine")
    bone("lower."+k,n,a,"upper."+k)
for k,(a,b) in ears.items(): bone(k,a,b,"head")
bone("tail",tail_a,tail_b,"spine")
bpy.ops.object.mode_set(mode="OBJECT")
def weights(o):
    if o is base:
        gs={n:o.vertex_groups.new(name=n) for n in ("spine","chest","head",*("upper."+k for k in legs),*("lower."+k for k in legs))}
        for vert in o.data.vertices:
            x,y,z=o.matrix_world@vert.co
            if z<.65:
                k=min(legs,key=lambda k:(x-legs[k][0][0])**2+(y-legs[k][0][1])**2)
                leg=min(1,max(0,(.70-z)/.26)); lower=min(1,max(0,(.47-z)/.22))
                vals={"upper."+k:leg*(1-lower),"lower."+k:leg*lower,"chest" if k.startswith("front") else "spine":1-leg}
            else:
                h=min(1,max(0,(z-1.19)/.24)); c=min(1,max(0,(-y+.07)/.40))
                vals={"head":h,"chest":(1-h)*c,"spine":(1-h)*(1-c)}
            for n,v in vals.items():
                if v>1e-6: gs[n].add([vert.index],v,"REPLACE")
    else:
        g=o.vertex_groups.new(name=owner[o.name]); g.add(list(range(len(o.data.vertices))),1,"REPLACE")
for o in pieces: weights(o)
select(pieces); bpy.context.view_layer.objects.active=base; bpy.ops.object.join()
base.name="Hearthkip_R2_skinned"; mod=base.modifiers.new("Hearthkip armature","ARMATURE"); mod.object=rig; base.parent=rig
select([base]); bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
base.data.calc_loop_triangles()
assert 1000<len(base.data.loop_triangles)<=25000, len(base.data.loop_triangles)
bm=bmesh.new(); bm.from_mesh(base.data)
boundary=sum(e.is_boundary for e in bm.edges); nonmanifold=sum(not e.is_manifold for e in bm.edges)
assert boundary==0 and nonmanifold==0,(boundary,nonmanifold)
bm.free()
assert all(abs(sum(g.weight for g in v.groups)-1)<1e-4 for v in base.data.vertices)
# Idle, walk, attack: deliberately basic candidate clips, not owner-approved gameplay animations.
scene=bpy.context.scene; scene.render.fps=24
rig.animation_data_create()
for name,length,mode in (("Idle",48,"idle"),("Walk",24,"walk"),("Attack",24,"attack")):
    for p in rig.pose.bones: p.rotation_mode="XYZ"; p.rotation_euler=(0,0,0); p.location=(0,0,0)
    action=bpy.data.actions.new(name); rig.animation_data.action=action
    for f in (1,1+length//4,1+length//2,1+3*length//4,1+length):
        ph=2*pi*(f-1)/length
        for p in rig.pose.bones:
            p.rotation_euler=(0,0,0)
            if p.name=="head": p.rotation_euler.x=.04*sin(ph) if mode=="idle" else (.08*sin(ph) if mode=="walk" else -.30*max(0,sin(ph)))
            if p.name=="tail": p.rotation_euler.z=(.12 if mode=="idle" else .23)*sin(ph)
            if p.name.startswith("ear."): p.rotation_euler.x=.045*sin(ph)
            if mode=="walk" and p.name.startswith(("upper.","lower.")):
                sign=1 if ("front.L" in p.name or "rear.R" in p.name) else -1
                p.rotation_euler.x=(.25 if p.name.startswith("upper.") else .11)*sin(ph)*sign
            if mode=="attack" and p.name=="chest": p.rotation_euler.x=.15*max(0,sin(ph))
            p.keyframe_insert(data_path="rotation_euler",frame=f,group=p.name)
    track=rig.animation_data.nla_tracks.new(); track.name=name
    strip=track.strips.new(name,1,action); track.mute=True
    rig.animation_data.action=None
for p in rig.pose.bones: p.rotation_euler=(0,0,0); p.location=(0,0,0)
scene.frame_set(1)
# No camera/lights in deliverable BLEND. Independent reimport renders set them up.
bpy.ops.wm.save_as_mainfile(filepath=str(out/"Hearthkip-R2.blend"))
receipt={"reference_sha256":hashlib.sha256(ref.read_bytes()).hexdigest(),"triangles":len(base.data.loop_triangles),"vertices":len(base.data.vertices),"boundary_edges":boundary,"nonmanifold_edges":nonmanifold,"bones":len(arm.bones),"animation_candidates":["Idle","Walk","Attack"],"quality_accepted":False,"limitations":["art-directed procedural interpretation, not photoreal reconstruction","closed overlapping detail shells","no runtime gameplay or owner validation"]}
(out/"modeling.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(receipt)
