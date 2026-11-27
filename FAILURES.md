# Historical failure register — evidence, not new bug closure

Prior generation branch: [1bd25ae81874308d59f9e57ab89201febe0ff356](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/1bd25ae81874308d59f9e57ab89201febe0ff356), issue [#199](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/199). Previous output [ce089591db09e3372740f29dbd422a984f73c31a](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/ce089591db09e3372740f29dbd422a984f73c31a/hearthkip/r1/publication.json).

| ID | Observed failure / gap | Prevention and regression |
|---|---|---|
| F01 | Run 45899320955 input missing; generation intentionally skipped; binary transfer then resolved | Fail closed, hash bytes and verify actual source access |
| F02 | Run 45903956419 job 140196179677: 16981 vertices, 33832 triangles, CPU bake succeeded then OBJ repeated-index error; downstream skipped | Repair before our bake, positive/negative controls and independent index/area checks |
| F03 | Run 45907479598 job 140207654615: two repeated-index faces removed, 33830 triangles, zero remaining degenerate faces, watertight false; raw/clean readback and viewer pass | Explicit manifold/boundary gate and exceptions; preserve raw and clean |
| F04 | R1 rejected by owner visual review; recorded incorrect upright orientation, distorted face, washed-out palette, absent recognizable emission/fur | Orientation, silhouette, landmarks, species anatomy, palette/material and approved reference comparison before runtime |
| F05 | Failed original binary not retained | Bounded diagnostic preservation; if unavailable record missing bytes, never claim exact replay |
| F06 | R2 run 45914661217 job 140230891685 failed build assertion 34626 triangles; conversion, rendering and publication skipped | Pre-export triangle budget and independent count; controlled reduction, never relax gate silently |
| F07 | R3 9ed8dcee32b26698035c3ced3fa51c4aeeac87c5: run 45915489967 job 140233566561 reported 8 reference tests, no GLB; camera and hidden anatomy unresolved; original full-res bytes unavailable | Exact reference manifest, approved multi-view sheet, distinguish landmark proxies from 3D measurements |
| F08 | Avarn v1 seven apparent contacts instead of six limbs; historical issue search and branch 0aaed417447b285afbd28c4888273236c286f1cc indicate additional dental/seam audit | Count actual limbs and attachments; dental, seams, topology and anatomy tests species by species |
| F09 | Old publication jobs had repository-wide contents:write; path checks are not actual permissions boundaries | All compute jobs read-only; separate human-authorized publication and lease |
| F10 | Rigging, LOD, runtime performance and owner acceptance unqualified | Separate completion gates, exact GLB reimport and runtime tests |

R1 generation step measured 4,233,524 KiB maximum RSS and 1:51.21 elapsed in corrected run (not total job resource peak). R2 failure log returned AssertionError: 34626; exact budget should be read from original build source before reproducing. R3 exact pinned file read returned 404 in this session; commit diff and #199 receipts are available, not full source. Old branches unchanged. No current binary visual inspection in this session; visual findings are from recorded historical review.
