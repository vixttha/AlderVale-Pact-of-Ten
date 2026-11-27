# Branch completion roadmap

Ordered single lane. Foundation is not model qualification. Status initially pending until exact receipt exists.

| ID | Deliverable | Acceptance | State |
|---|---|---|---|
| P01 | Isolated agent/template, policies, prior failure register, intake contract | Exact source review + public runner foundation checks | candidate |
| P02 | Legal and reproducibility lock | Source, weights, dependency checksums, licenses, entitlement and license suitability recorded for SPAR3D/SF3D/BART/Blender | pending |
| P03 | Runner preflight and CPU model adapters | Actual CPU-only load + small textured fixture per model; measured memory, disk, runtime; no unapproved network/auth | pending |
| P04 | Benchmark suite | Same approved reference bytes, settings, TripoSR baseline, repeatable quality metrics; model recommendation with actual evidence | pending |
| P05 | Geometry repair and independent validation | Known-bad regressions for repeated indices, tiny/duplicate faces, unused vertices, invalid UVs, boundaries; raw/repaired preservation | pending |
| P06 | Reference engineering and master pipeline | Approved views, camera/axis and anatomy comparisons; owner accepts exact Hearthkip master | pending |
| P07 | Production retopology/bake | Master/runtime separation, correct PBR, UVs and budgets | pending |
| P08 | Rig, animations and LODs | Valid species-specific skeleton, clip and deformation tests and runtime levels | pending |
| P09 | Delivery and performance | BART conversion, independent validators, 7 actual renders and viewer/browser profile | pending |
| P10 | Second distinct asset trial and negative controls | Independent repeatability, reject known-bad and missing/incorrect input, no false pass | pending |
| P11 | Independent review + owner acceptance | Exact qualified branch and assets, documentation, reproducible usage, unresolved gaps explicitly accepted or repaired | pending |

Completion means P01–P11 pass with receipts and owner acceptance (or explicit owner-authorized scope amendment). No release implied. First next action: qualify P01, then P02. Do not start P03 on mutable upstream refs or gated credentials. The existing game milestone and issue #199 remain separate.
