# Avarn v2 — six-legged master development

Refs #191. Work isolated from game main and Universe HQ canon. Source is an unaccepted, static reconstruction; do not overwrite or publish any accepted version. Preserve R3 appearance, tail, crown, face, armor and both 4K textures. No gameplay changes or canon promotion.

## Exact intake
Expected path: `art/avarn/3d/source/avarn-v1.glb`.
Expected size: 60252316 bytes; SHA-256:
`0595f7991c0f1ce63c9e83f33d06581e452d7d06f61f2c78b51403151f8d2779`.
The source is not yet in Git. An authorized binary transfer must preserve this exact digest. A normal Git push of the file, on this branch only, is the intended intake; The strict inventory accepts that one optional path only with the exact size and digest; all other tracked paths remain fixed. Do not put personal paths or credentials in the repository. This workflow fails the source job when the binary is absent. No paid storage or GPU.
 
## Ordered gates
1. Intake: validate exact source, inspect seven contact areas, record original BART and Blender evidence. Evaluate the candidate extra-limb region in GLTF Y-up coordinates (X lateral, +Z head). Candidate cut preview uses Y < -0.14; seed near (0.0956,-0.2824,-0.3897). The selection is not an accepted cut plane: at Y=-0.138 a read-only probe reached other geometry. Inspect the boundary and render a proposed mask before any deletion. Preserve the other six attachments and tail.
2. Anatomy trial: localized surgery on a copy, with explicit reviewed mask, cap only newly exposed boundary loops, restore surface shape and UV continuity. No global remesh. Reimport/render multiple views, verify three independent pairs and no residual stub; compare unaffected areas.
3. Topology: compare duplicate/degenerate faces, boundary/nonmanifold edges and UV overlap against original; repair without welding away texture seams or scutes. Ground pivot, preserve +Z forward and scale; compare silhouette and texture maps.
4. Material: manually verify basalt, copper, patina, tissue and vent masks; adjust roughness/metallic selectively and add thermal emission independent of baked color. Maintain 4K master; no blanket orange mask.
5. Triple-check repaired master: independent geometry/topology measurement, visual review in Blender, Khronos validation + Three.js import; hash candidate and record exact checkout and test receipts. Owner appearance acceptance is a separate gate.
6. After accepted master: compression and LOD candidates measured against master; six independent rig chains, neck/jaw/tail and thermal controls; idle/walk/turn/settle/warning/vent/recoil/interaction clips. Test foot contact, joint limits, clipping, weight normalization, animation export and runtime compatibility. No game integration or release without separate authorization.

Current implementation: exact-source preflight and guarded region analysis with negative fixtures; BART/Blender import inspection workflow; a synthetic connected seven-leg Blender fixture exercises one-region removal, newly exposed boundary cap, preservation of untouched faces and UVs, ground alignment, export and reimport. It rejects a two-leg removal. Actual source surgery is not enabled until its mask is visually inspected. No large artifact uploads are enabled. No cut, surface reconstruction, repaired master, material changes, rig, LOD or clips yet. Source transfer is the blocker. Existing Graphify code-only graph is not geometry validation.


## R4 separate intake (not V1 surgery)

Owner-authorized R4 source path: `art/avarn/3d/source/avarn-r4.glb`. Exact bytes 59146536, SHA-256 `35d0e764ca72cb6044da2d9d3f7053772bcef8f037cdc159a2246e3a7aa16d3d`, 338469 vertices and 476403 triangles. Keep V1 and its guard unchanged. R4 is a new candidate, not an accepted repair. The binary is not included in the intake-preparation commit.

The R4 workflow checks exact checkout, inventory, positive/negative synthetic connectivity fixtures, source checksum, significant sublevel regions, BART and independent Blender import. A source absence fails explicitly. No mutation, artifact upload, paid runner, or release. Passing the connectivity screen identifies six candidate lower-limb regions and one tail candidate; it does not establish individual proximal attachment anatomy, watertightness, or rig readiness. Multi-view anatomy review and owner appearance acceptance remain separate. No V1 limb removal permitted on R4.


## R5.8 dental clearance candidate

Owner-directed oral refinement only; R5.7 parent SHA-256 fcb897c36d3a0c0086b1c74f9f4174da8f57e18d5b683aabd659a3fb58d340d3. Exact local candidate SHA-256 c4936438d21b0c545aedff98e7ef50047f6d2965eff080d5fe43f09dee8a277f, 85383096 bytes, 492643 triangles. Candidate path: art/avarn/3d/candidates/avarn-r5.8.glb. The commit contains the validation tooling, not the GLB. Local custom GLB editing and BART metadata inspection found zero detected intersections across ten dental surface pair categories at 61 sampled angles. 125 internal cap edge flips, no reopened measured cut edges; underlying nonmanifold defects remain. Lower jaw rest translated down by 0.0045 model units and crowns shortened 15%; this is a slightly open clearance prototype, not closed occlusion. Rear seam still visible. Independent Blender BVH and import audit requires the exact binary. Separate BART cube and collision-control fixture does not qualify the actual asset. No appearance lock, main integration, release or paid runner.
