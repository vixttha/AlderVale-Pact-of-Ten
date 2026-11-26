"""Conservative pre-bake face cleanup; no welding, remeshing or smoothing."""
import math
import operator

MIN_DOUBLE_AREA = 1e-12
MAX_REMOVAL_FRACTION = 0.01

def clean_mesh(vertices, faces):
    v=[tuple(map(float,p)) for p in vertices]
    f=[tuple(map(operator.index,t)) for t in faces]
    if not v or not f or any(len(p)!=3 or not all(map(math.isfinite,p)) for p in v):
        raise ValueError("invalid source vertices")
    if any(len(t)!=3 or any(i<0 or i>=len(v) for i in t) for t in f):
        raise ValueError("invalid source face indices")
    counts={"repeated_index":0,"zero_or_tiny_area":0,"duplicate_face":0}
    kept=[];seen=set()
    for t in f:
        if len(set(t))!=3:
            counts["repeated_index"]+=1
            continue
        a,b,c=(v[i] for i in t)
        u=[b[i]-a[i] for i in range(3)];w=[c[i]-a[i] for i in range(3)]
        cross=(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0])
        double_area=math.hypot(*cross)
        if not math.isfinite(double_area):
            raise ValueError("nonfinite triangle area")
        if double_area<=MIN_DOUBLE_AREA:
            counts["zero_or_tiny_area"]+=1
            continue
        key=tuple(sorted(t))
        if key in seen:
            counts["duplicate_face"]+=1
            continue
        seen.add(key);kept.append(t)
    removed=sum(counts.values())
    if not kept or removed/len(f)>MAX_REMOVAL_FRACTION:
        raise ValueError(f"cleanup exceeds conservative 1% face budget: {counts} of {len(f)}")
    used=sorted({i for t in kept for i in t})
    remap={old:new for new,old in enumerate(used)}
    newv=[v[i] for i in used]
    newf=[tuple(remap[i] for i in t) for t in kept]
    return newv,newf,{"input_vertices":len(v),"input_triangles":len(f),"output_vertices":len(newv),"output_triangles":len(newf),"removed_faces":counts,"removed_vertices":len(v)-len(newv),"min_double_area":MIN_DOUBLE_AREA,"max_removal_fraction":MAX_REMOVAL_FRACTION}
