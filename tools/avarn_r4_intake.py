"""R4-only read-only topology screen; not limb or appearance acceptance."""
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path
from avarn_intake import geometry, require

SOURCE_SHA = "35d0e764ca72cb6044da2d9d3f7053772bcef8f037cdc159a2246e3a7aa16d3d"
SOURCE_SIZE = 59146536
SOURCE_PATH = "art/avarn/3d/source/avarn-r4.glb"
# Measured glTF X,Z centroids at Y=-0.22, labels provisional.
ANCHORS = {
    "front_left": (-.202, .349), "front_right": (.189, .361),
    "middle_left": (-.154, .071), "middle_right": (.159, -.005),
    "rear_left": (-.144, -.210), "rear_right": (.160, -.272),
    "tail_candidate": (-.217, -.348),
}

def verify_bytes(raw):
    require(len(raw) == SOURCE_SIZE, "R4 size mismatch")
    require(hashlib.sha256(raw).hexdigest() == SOURCE_SHA, "R4 SHA-256 mismatch")

def welded_graph(points, faces):
    keys = {}
    vertices = []
    mapping = []
    for point in points:
        key = tuple(round(v, 6) for v in point)
        if key not in keys:
            keys[key] = len(vertices)
            vertices.append(key)
        mapping.append(keys[key])
    triangles = [tuple(mapping[i] for i in face) for face in faces]
    return vertices, triangles

def components_at(points, faces, height, minimum):
    parent = list(range(len(points)))
    size = [1] * len(points)
    low = [p[1] <= height for p in points]
    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def union(a, b):
        if not (low[a] and low[b]):
            return
        a, b = root(a), root(b)
        if a == b:
            return
        if size[a] < size[b]:
            a, b = b, a
        parent[b] = a
        size[a] += size[b]
    for a, b, c in faces:
        union(a, b)
        union(b, c)
        union(c, a)
    labels = [root(i) if eligible else -1 for i, eligible in enumerate(low)]
    groups = defaultdict(list)
    for i, label in enumerate(labels):
        if label >= 0:
            groups[label].append(i)
    return labels, {k: v for k, v in groups.items() if len(v) >= minimum}

def screen(points, faces, anchors=ANCHORS, levels=(-.22, -.20, -.18, -.16, -.08),
           minimum=101, tolerance=.04):
    points, faces = welded_graph(points, faces)
    seeds = {}
    snapshots = []
    for index, level in enumerate(levels):
        labels, groups = components_at(points, faces, level, minimum)
        expected = 1 if index == len(levels)-1 else len(anchors)
        require(len(groups) == expected, f"Y={level}: significant component count {len(groups)}, expected {expected}")
        if index == 0:
            centers = {
                k: (sum(points[i][0] for i in ids)/len(ids),
                    sum(points[i][2] for i in ids)/len(ids))
                for k, ids in groups.items()
            }
            for name, (x, z) in anchors.items():
                distance, key = min(((cx-x)**2+(cz-z)**2, k) for k, (cx, cz) in centers.items())
                require(distance <= tolerance**2, f"missing region near {name}")
                seeds[name] = groups[key][0]
        region_ids = {name: labels[seed] for name, seed in seeds.items()}
        require(all(k in groups for k in region_ids.values()), "region disconnected or insignificant")
        require(len(set(region_ids.values())) == expected, f"Y={level}: unexpected region merger or missing connection")
        snapshots.append({"height": level, "significant_components": len(groups),
                          "region_vertex_counts": {name: len(groups[k]) for name, k in region_ids.items()}})
    return {"status": "GEOMETRY_SCREEN_PASS_REVIEW_REQUIRED",
            "measurement_welded_positions": len(points), "snapshots": snapshots,
            "limits": "Sublevel vertex-edge connectivity, not anatomical segmentation or rig qualification. Tail label provisional."}

def main(path):
    raw = Path(path).read_bytes()
    verify_bytes(raw)
    points, faces = geometry(raw)
    require((len(points), len(faces)) == (338469, 476403), "R4 geometry count mismatch")
    report = screen(points, faces)
    report.update(source_sha256=SOURCE_SHA, source_size=len(raw), vertices=len(points), triangles=len(faces))
    verify_bytes(Path(path).read_bytes())
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main(sys.argv[1])
