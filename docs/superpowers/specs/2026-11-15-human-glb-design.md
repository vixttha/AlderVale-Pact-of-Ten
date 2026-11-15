# Rowan human model integration

The owner authorized using the existing Rowan/exported GLBs and asked for a
pipeline followed by execution with private Notion and public GitHub runners.

Use the rigged exported-model.glb for the default human. Retain the static
rowan-prototype.glb and original source bytes. Normalize the rig after applying
Idle_Subtle; its unposed bounds produce the wrong scale. Clone skeletons per
avatar, share immutable geometry/textures, clone mutable materials, cache the
download, and dispose per-instance resources when replacing avatars.

Play idle, walk, running, jumping, and available emote clips in creation previews
and local/remote world avatars. Keep procedural fallback while loading/after
failure. Cancel installation into disposed roots. Preserve existing movement and
gameplay state.

The GLB has baked hair/face/clothes. Default human appearance becomes Rowan;
Classic remains selectable to preserve full procedural sculpt/wardrobe visuals.
Height/build affect Rowan. Clearly explain fixed styling in creation and Tailor.
Other races and inventory/stat calculations remain unchanged.

Alternatives: static Rowan would lose articulated movement; replacing the
procedural human without a Classic option would silently remove customization.
The rigged default plus Classic fallback preserves both needs.

No new dependencies, paid APIs, deployments, or sharing changes. Validate asset
hashes/structure, instance independence, normalized bounds, clip selection,
cleanup, loading failure, race/model switches, guest world entry, and rendering.
Use the existing seven hosted jobs. Record actual SHAs/results in Notion.

Limits: source is one high-density mesh; baked styling cannot be independently
recolored or changed with modular gear. No authored wave/cast clips exist; retain
honest animation mappings and document approximation. CI is not release acceptance.
