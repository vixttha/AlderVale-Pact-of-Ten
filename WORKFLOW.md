# Asset production pipeline

Every gate records source SHA, manifest digest, upstream pins, input/output hashes, commands, timings, failures and reviewer. Advance only when the previous gate passes; blocked and skipped are not passes. Separate model generation from asset engineering and acceptance.

| Gate | Work | Exit criteria |
|---|---|---|
| G0 | Intake locked original PNG and all approved views, exact hashes, provenance, species checklist, owner-defined scale/pose, budgets and licenses | Authentic bytes and authorization verified; no synthetic substitution; incomplete view coverage flagged |
| G1 | CPU qualification: pin SPAR3D source, weights, dependencies and license, verify CPU kernels, use bounded synthetic fixture; repeat SF3D separately | Both candidates evaluated or explicit blocker/fallback disposition; record wall time, peak RSS, disk high water, output hashes, failures |
| G2 | Generate on locked benchmark with matched inputs, settings and recorded seeds; begin low texture resolution then increase only within measured budget | Raw mesh and original textures retained separately, no out-of-memory or CUDA dependency; compare to prior TripoSR |
| G3 | Geometry inspection, controlled pre-bake repair when adapter permits, separate raw and repaired snapshots; if upstream already bakes, inspect before any rebake | No invalid indices, nonfinite/degenerate/duplicate faces, unused vertices; boundary and manifold checks with explicit intended-open exceptions; measured geometry change and independent readback |
| G4 | Fit orientation, scale and proportions; approved multi-view design for hidden anatomy; art-direct master with BART/Blender | Actual seven views, reference overlays and anatomy/material checklist; owner accepts exact master hash before runtime derivative |
| G5 | Retopology, UVs and PBR baking from accepted master; retain high-detail master | Valid UV islands, seam and texture checks, visual comparison, correct color-space/material channels, bounded triangle/texture budgets |
| G6 | Species-specific skeleton, weights, clips and LODs | Reimported rig, normalized weights, required clips, deformation/contact/collision and LOD silhouette checks; no generic humanoid skeleton for nonhuman assets |
| G7 | Export runtime GLB via pinned BART/Blender; independent Khronos and Blender reimport, browser viewer and runtime profiling | Exact GLB valid; no unintended external requests, verified rig/texture/animation, measured runtime budgets; render actual GLB front/rear/left/right/top/underside/three-quarter |
| G8 | Internal audit, owner decision and bounded handoff | All receipts tied to exact artifacts; owner acceptance; separately authorized destination and publication; no game merge |
 
If a generator emits an already baked mesh, never claim that the first bake happened after our repair: preserve upstream raw output and independently re-bake validated geometry as needed. If source view is ambiguous, proposed additional art is marked proposed until owner locks it. A 4K render is not a 4K texture or higher geometry detail. Compression does not replace retopology.

Use one active generation experiment at a time. Before increasing resolution, inspect measured resource use. Proposed per-job guardrails: 240 minutes max, 12 GiB process RSS planning ceiling, 2 GiB free-disk reserve; abort gracefully where enforceable, record actual system/child memory and disk. Standard runner nominal 4 vCPU /16 GB RAM/14 GB SSD allocation; measure actual available space. No unrestricted generation service. Never commit model weights, credentials or large duplicate packages.
