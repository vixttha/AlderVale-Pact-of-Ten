# Rowan human appearance

The default Alder Human uses the existing animated
`public/models/exported-model.glb`. Its geometry and textures match the supplied
Rowan source, with 66 joints and 16 authored clips. The unrigged
`rowan-prototype.glb` remains an unchanged reference; no STL conversion occurred.

Creation and Tailor offer **Human appearance: Rowan / Classic customizable**.
Rowan keeps its authored face, hair and outfit, with height/build scaling.
Equipped items still affect gameplay stats; choose Classic to see modular
outfits, dyes, hair and facial sculpt changes. The optional
`sculpt.humanModel` field persists the choice; older saves default to Rowan.
Other races keep their existing procedural meshes.

The GLB is fetched once per page session. Each avatar gets an independent
skeleton, animation mixer and mutable materials. Geometry/textures are shared.
Avatar replacement, race changes, remote disconnect and unmount release owned
resources and cancel stale installation; cached outline materials/maps and the
immutable GLB source stay available to other avatars.

The procedural human appears while downloading and remains usable on failure.
Preview status announces loading/fallback. No model-generation or paid API is
called. `scripts/validate-human-model.mjs` checks both original SHA-256 hashes,
self-contained GLB structure, skeleton and required animation clips in all three
core hosted jobs.

## Motion mapping

| State | Authored clip |
| --- | --- |
| Standing/preview | Idle_Subtle |
| Walking | Walk |
| Sprinting | Run_Anime |
| Airborne | Jump_air |
| Meditation while stationary | Sitting_Idle |
| Cheer or approximate wave while stationary | Victory |

Jumping/movement take priority over stationary emotes. The source has no
dedicated wave/cast clip; wave uses the celebration pose and casting keeps idle
with existing game effects.

## Validation limits

Unit regressions cover posed bounds, clone isolation, motion priority, source
ownership, load caching, failure retry and cancellation. Browser checks cover
Rowan/Classic/race switches, one-download caching, local world walk/sprint,
Tailor appearance persistence, and failure fallback. Desktop/mobile screenshots
were inspected. Hosted browser checks use software rendering, not real GPU
performance measurements.

The source contains about 169,475 vertices and is about 14.4 MB. Many concurrent
humans, GPU memory, all remote multiplayer interactions, cloud saves and
production gameplay acceptance have not been established by these checks.
