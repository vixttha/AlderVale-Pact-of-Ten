"""Fresh Blender process: compare imported OBJ and GLB scene material/geometry."""
import bpy
import json
from mathutils import Vector
from pathlib import Path
import sys
import math
import hashlib

out=Path(sys.argv[sys.argv.index("--")+1])
source=json.loads((out/"texture-receipt.json").read_text())
receipt=json.loads((out/"glb-receipt.json").read_text())
assert hashlib.sha256((out/"candidate.glb").read_bytes()).hexdigest()==receipt["glb_sha256"]
def inspect(kind):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if kind=="obj":
        assert "FINISHED" in bpy.ops.wm.obj_import(filepath=str(out/"textured.obj"))
    else:
        assert "FINISHED" in bpy.ops.import_scene.gltf(filepath=str(out/"candidate.glb"))
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    assert meshes and not any(o.type=="ARMATURE" for o in bpy.context.scene.objects)
    coords=[]; triangles=0; materials=set(); uv_count=0
    for obj in meshes:
        mesh=obj.data
        mesh.calc_loop_triangles()
        triangles+=len(mesh.loop_triangles)
        assert len(mesh.uv_layers)>0
        uv_count+=len(mesh.uv_layers.active.data)
        assert all(math.isfinite(float(x)) for uv in mesh.uv_layers.active.data for x in uv.uv)
        coords.extend(tuple(obj.matrix_world @ v.co) for v in mesh.vertices)
        materials.update(m for m in mesh.materials if m is not None)
    assert all(math.isfinite(x) for v in coords for x in v)
    bounds=[[min(v[i] for v in coords) for i in range(3)],[max(v[i] for v in coords) for i in range(3)]]
    assert triangles==source["triangles"] and uv_count==triangles*3
    assert materials
    linked=[]
    for mat in materials:
        assert mat.use_nodes
        for node in mat.node_tree.nodes:
            if node.type=="BSDF_PRINCIPLED":
                for link in node.inputs["Base Color"].links:
                    tex=link.from_node
                    if tex.type=="TEX_IMAGE" and tex.image:
                        assert tuple(tex.image.size)==(512,512)
                        linked.append(tex.image.name)
    assert linked, "no linked base-color texture"
    return {"triangles":triangles,"mesh_objects":len(meshes),"bounds":bounds,"uv_loops":uv_count,"linked_images":linked}
a=inspect("obj");b=inspect("glb")
assert all(abs(x-y)<1e-5 for va,vb in zip(a["bounds"],b["bounds"]) for x,y in zip(va,vb)), "world bounds changed"
print(json.dumps({"status":"pass","source_commit":receipt["source_commit"],"glb_sha256":receipt["glb_sha256"],"blender":bpy.app.version_string,"source":a,"reimport":b,"quality_accepted":False},indent=2))
