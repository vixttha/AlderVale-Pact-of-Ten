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
