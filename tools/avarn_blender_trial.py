"""Headless Blender surgery regression fixture; never edits the actual Avarn."""
import bpy
import bmesh
import json
import sys
from collections import defaultdict, deque
from pathlib import Path

def require(ok, message):
    if not ok:
        raise ValueError(message)

def key(v):
    return tuple(round(c,6) for c in v.co)

def face_key(face):
    return tuple(sorted(key(v) for v in face.verts))

def signature(face, uv):
    return (face.material_index, tuple(sorted((key(loop.vert),tuple(loop[uv].uv)) for loop in face.loops)))

def cap_one_region(bm, selected):
    """Modify an isolated trial BMesh; discard it on any failure."""
    selected=set(selected)
    require(0<len(selected)<len(bm.verts)/4,"empty or excessive selection")
    uv=bm.loops.layers.uv.active
    require(uv is not None,"UV layer required")
    surviving_faces={face_key(f):signature(f,uv) for f in bm.faces if not any(v in selected for v in f.verts)}
    expected_vertices={key(v) for v in bm.verts if v not in selected}
    require(len(expected_vertices)==len(bm.verts)-len(selected),"ambiguous coincident retained vertices")
    old_edges={e:len(e.link_faces) for e in bm.edges if all(v not in selected for v in e.verts)}
    bmesh.ops.delete(bm,geom=list(selected),context="VERTS")
    require(all(e.is_valid for e in old_edges),"retained edge unexpectedly removed")
    changed=[e for e,n in old_edges.items() if len(e.link_faces)!=n]
    require(changed and all(old_edges[e]==2 and e.is_boundary for e in changed),"unexpected edge topology change")
    links=defaultdict(set)
    for e in changed:
        a,b=e.verts; links[a].add(b); links[b].add(a)
    require(all(len(s)==2 for s in links.values()),"cut boundary is not a simple loop")
    seen=set(); queue=deque([next(iter(links))])
    while queue:
        vert=queue.popleft()
        if vert in seen: continue
        seen.add(vert); queue.extend(links[vert]-seen)
    require(seen==set(links),"multiple cut boundary loops")
    require(all(old_edges[e]==2 for vert in links for e in vert.link_edges if e in old_edges),
            "cut touches existing topology defect")
    filled=bmesh.ops.holes_fill(bm,edges=changed,sides=0)["faces"]
    require(filled,"no cap faces created")
    # Provisional planar cap UVs, not a final texture repair.
    for face in filled:
        for loop in face.loops:
            loop[uv].uv=(loop.vert.co.x/20+.5,loop.vert.co.y/20+.5)
    bmesh.ops.recalc_face_normals(bm,faces=filled)
    require(all(e.is_manifold for e in changed),"cap did not close cut")
    require(all(len(e.link_faces)==2 for e in bm.edges if e not in old_edges),"new defective edge")
    require({key(v) for v in bm.verts}==expected_vertices,"unexpected retained geometry change")
    actual={face_key(f):signature(f,uv) for f in bm.faces}
    require(all(actual.get(k)==v for k,v in surviving_faces.items()),"untouched face or UV changed")
    return {"removed_vertices":len(selected),"cap_faces":len(filled),
            "closed_boundary_edges":len(changed),"preserved_faces":len(surviving_faces)}

DIRECTIONS=[
    ((-1,0,0),[(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
    ((1,0,0),[(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
    ((0,-1,0),[(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
    ((0,1,0),[(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),
    ((0,0,-1),[(0,0,0),(0,1,0),(1,1,0),(1,0,0)]),
    ((0,0,1),[(0,0,1),(1,0,1),(1,1,1),(0,1,1)])]
PAIRS=[(-2,-4),(2,-4),(-2,0),(2,0),(-2,4),(2,4)]
EXTRA=(0,5)

def make_fixture():
    cells={(x,y,z) for x in range(-3,4) for y in range(-5,6) for z in (2,3)}
    cells.update((x,y,z) for x,y in PAIRS+[EXTRA] for z in (0,1))
    cells.update((0,y,2) for y in (-6,-7))
    verts=[]; faces=[]; idx={}
    for x,y,z in sorted(cells):
        for (dx,dy,dz),corners in DIRECTIONS:
            if (x+dx,y+dy,z+dz) in cells: continue
            face=[]
            for a,b,c in corners:
                p=(x+a,y+b,z+c-2)
                if p not in idx: idx[p]=len(verts);verts.append(p)
                face.append(idx[p])
            faces.append(face)
    me=bpy.data.meshes.new("synthetic_seven_leg_fixture")
    me.from_pydata(verts,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    uv=bm.loops.layers.uv.new("fixture_uv")
    for face in bm.faces:
        for loop in face.loops:
            loop[uv].uv=(loop.vert.co.x/20+.5,loop.vert.co.y/20+.5)
    require(all(e.is_manifold for e in bm.edges),"fixture not closed")
    return me,bm

def pad_centers(bm):
    floor=min(v.co.z for v in bm.verts)
    return sorted((round(f.calc_center_median().x,4),round(f.calc_center_median().y,4))
                  for f in bm.faces if all(abs(v.co.z-floor)<1e-6 for v in f.verts))

def choose_leg(bm,x,y):
    return {v for v in bm.verts if x<=v.co.x<=x+1 and y<=v.co.y<=y+1 and v.co.z<0}

def fixture(out):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    me,bm=make_fixture()
    before=pad_centers(bm)
    expected=sorted((x+.5,y+.5) for x,y in PAIRS)
    require(before==sorted(expected+[(.5,5.5)]),"seven-pad fixture incorrect")
    negative=bm.copy()
    try:
        cap_one_region(negative,choose_leg(negative,*EXTRA)|choose_leg(negative,*PAIRS[0]))
    except ValueError as exc:
        require("multiple cut boundary loops" in str(exc),"unexpected negative fixture failure: "+str(exc))
    else:
        raise AssertionError("two-leg deletion was accepted")
    finally:
        negative.free()
    report=cap_one_region(bm,choose_leg(bm,*EXTRA))
    require(pad_centers(bm)==expected,"six intended pads not preserved")
    require(all(e.is_manifold for e in bm.edges),"fixture topology is not closed")
    floor=min(v.co.z for v in bm.verts)
    for vert in bm.verts: vert.co.z-=floor
    require(abs(min(v.co.z for v in bm.verts))<1e-6,"ground alignment failed")
    require(pad_centers(bm)==expected,"pivot changed contact pairs")
    bm.to_mesh(me);bm.free();me.update()
    obj=bpy.data.objects.new("SYNTHETIC_fixture_only",me)
    bpy.context.collection.objects.link(obj)
    mat=bpy.data.materials.new("fixture_material")
    mat.use_nodes=True;me.materials.append(mat)
    out.mkdir(parents=True,exist_ok=True)
    require("FINISHED" in bpy.ops.export_scene.gltf(filepath=str(out/"fixture.glb"),export_format="GLB"),"GLB export failed")
    report.update({"before_pads":before,"after_pads":expected,"negative_two_leg_cut":"rejected",
                   "ground_aligned":True,"source":"SYNTHETIC_ONLY","blender":bpy.app.version_string})
    print("FIXTURE_RECEIPT",json.dumps(report,sort_keys=True))

def reimport(out):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    require("FINISHED" in bpy.ops.import_scene.gltf(filepath=str(out/"fixture.glb")),"reimport failed")
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    require(len(meshes)==1,"reimport mesh count")
    obj=meshes[0]
    require(abs(min((obj.matrix_world@v.co).z for v in obj.data.vertices))<1e-5,"reimport floor drift")
    require(any(obj.data.uv_layers),"reimport UV missing")
    print("FIXTURE_REIMPORT_OK: one static mesh, ground-aligned, UV layer retained; not actual Avarn.")

if __name__=="__main__":
    mode,path=sys.argv[sys.argv.index("--")+1:]
    require(mode in ("fixture","reimport"),"unsupported mode; actual model surgery is not enabled")
    (fixture if mode=="fixture" else reimport)(Path(path))
