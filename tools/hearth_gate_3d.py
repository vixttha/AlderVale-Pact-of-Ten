"""Project-owned bounded Blender scene procedure. Never passed as code to BART."""
import bpy, bmesh, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector

args=sys.argv[sys.argv.index("--")+1:]
mode,role,workspace=args
root=Path(workspace).resolve()
assert role in ('stone','bronze','banner') and mode in ('build','render')
assert bpy.app.version[:2]==(4,5)
def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.8):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    m.diffuse_color=(*color,1)
    return m
def box(name,loc,dims,m,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('soft carved edges','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def mesh(name,verts,faces,m):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(m)
    return o
def grid_faces(n,m):
    return [(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(m-1) for i in range(n-1)]
def relief():
    # Actual closed depth mesh sampled from the unmodified monochrome master.
    im=bpy.data.images.load(str(root/'mask.png'),check_existing=False)
    n=257; w,h=im.size; pix=list(im.pixels[:])
    assert w==h==512
    def sample(u,v):
        if not (0<=u<=1 and 0<=v<=1): return 0.
        x=min(w-1,round(u*(w-1))); y=min(h-1,round(v*(h-1)))
        return pix[4*(y*w+x)+3]
    stone=role=='stone';width=2.35;height=2.35;mark=1.93
    depth=.075 if stone else -.048
    main=mat('Basalt relief' if stone else 'Cast bronze',(.23,.21,.18) if stone else (.41,.23,.085),0 if stone else .78,.8 if stone else .43)
    verts=[];mask=[]
    for j in range(n):
        for i in range(n):
            x=(i/(n-1)-.5)*width;z=(j/(n-1)-.5)*height
            a=sample(x/mark+.5,z/mark+.5);mask.append(a)
            verts.append((x,-.18+depth*a,z+1.57))
    faces=grid_faces(n,n)
    boundary=list(range(n))+[j*n+n-1 for j in range(1,n)]+[(n-1)*n+i for i in range(n-2,-1,-1)]+[j*n for j in range(n-2,0,-1)]
    k=len(verts)
    verts.extend((verts[i][0],.13,verts[i][2]) for i in boundary)
    for j,i in enumerate(boundary):
        nxt=(j+1)%len(boundary);faces.append((i,boundary[nxt],k+nxt,k+j))
    faces.append(tuple(range(k,k+len(boundary))))
    o=mesh('R3 recessed stone' if stone else 'R3 raised bronze',verts,faces,main)
    assert max(mask)>.99 and min(mask)==0
    assert abs(max(v[1] for v in verts[:n*n])-min(v[1] for v in verts[:n*n])-abs(depth))<1e-5
    assert all(mask[j*n+n//2]==0 for j in range(0,round(n*.20))), 'lower threshold obstructed'
    bm=bmesh.new();bm.from_mesh(o.data);assert all(e.is_manifold for e in bm.edges);bm.free()
    if stone:
        dark=mat('Dark basalt foundation',(.095,.083,.07),0,.92)
        box('Lower plinth',(0,.02,.15),(2.7,.80,.30),dark,.07)
        box('Upper plinth',(0,.02,.34),(2.52,.62,.15),main,.035)
        box('Capstone',(0,.02,2.84),(2.56,.58,.19),main,.05)
    else:
        dark=mat('Patinated frame',(.16,.095,.034),.8,.47)
        box('Plaque backing',(0,.17,1.57),(2.52,.16,2.52),dark,.08)
        for x in (-1.12,1.12):
            for z in (.45,2.69):
                bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.048,location=(x,-.215,z))
                o2=bpy.context.object;o2.name='Bronze rivet';o2.data.materials.append(dark)
    print('RELIEF',role,'vertices',len(verts),'faces',len(faces),'depth',depth,'closed manifold')
def banner():
    m=mat('Woven ceremonial cloth',(.22,.045,.028),0,.9)
    im=bpy.data.images.load(str(root/'banner.png'),check_existing=False);im.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    n=81;k=101;verts=[]
    for j in range(k):
        v=j/(k-1)
        for i in range(n):
            u=i/(n-1);x=(u-.5)*2.15;z=.50+v*2.45
            # Static draped shape, not a cloth simulation.
            y=.07*math.sin(u*math.tau*2.5)*(.55+.45*(1-v))+.025*math.sin(v*math.tau+u*3)
            z-=.10*(1-v)*(1-abs(2*u-1))
            verts.append((x,y,z))
    o=mesh('Draped cloth R3',verts,grid_faces(n,k),m)
    uv=o.data.uv_layers.new(name='R3 UV')
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            i=o.data.loops[li].vertex_index;uv.data[li].uv=(i%n/(n-1),i//n/(k-1))
        poly.use_smooth=True
    assert max(v[1] for v in verts)-min(v[1] for v in verts)>.1
    brass=mat('Aged brass rod',(.31,.17,.06),.73,.42)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.055,depth=2.55,location=(0,0,3.03),rotation=(0,math.pi/2,0))
    bpy.context.object.name='Banner hanging rod';bpy.context.object.data.materials.append(brass)
    for x in (-1.29,1.29):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.09,location=(x,0,3.03))
        bpy.context.object.data.materials.append(brass)
    print('BANNER UV',n*k,'vertices, static drape')
def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,color,size):
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1.5))
clear()
if mode=='build':
    if role=='banner': banner()
    else: relief()
    bpy.ops.wm.save_as_mainfile(filepath=str(root/(role+'.blend')))
else:
    assert 'FINISHED' in bpy.ops.import_scene.gltf(filepath=str(root/(role+'.glb')))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert meshes and all(len(o.data.vertices)>=3 and len(o.data.polygons)>0 and len(o.data.materials)>0 for o in meshes)
    if role=='banner':
        assert any(o.data.uv_layers for o in meshes)
        assert any(n.type=='TEX_IMAGE' and n.image for o in meshes for m in o.data.materials if m and m.use_nodes for n in m.node_tree.nodes)
    receipt={'role':role,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'faces':sum(len(o.data.polygons) for o in meshes),'glb_sha256':hashlib.sha256((root/(role+'.glb')).read_bytes()).hexdigest(),'blender':bpy.app.version_string}
    print('REIMPORT',json.dumps(receipt))
    (root/(role+'-reimport.json')).write_text(json.dumps(receipt,indent=2))
    floor=mat('Neutral gallery floor',(.07,.075,.065),0,.95)
    box('Presentation ground',(0,0,-.08),(200,200,.12),floor,0)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.world.color=(.23,.23,.23)
    light('Warm raking key',(-3,-4,4.8),850,(1,.83,.63),2.0)
    light('Cool fill',(3,-2,3),320,(.67,.80,1),3)
    light('Rim',(1,2,5),650,(1,.88,.75),2)
    bpy.ops.object.camera_add(location=(0,-7,1.72));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.7;scene.camera=cam
    for view,loc in [('front',(0,-7,1.7)),('angle',(3,-7,3.1))]:
        cam.location=loc;aim(cam,(0,0,1.60));scene.render.filepath=str(root/(role+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
