# Element HQ v1

Element HQ is the design reference for the mechanics and lore behind AlderVale’s elements. It covers elemental identities, combat matchups, spells, creature lineages, fusions, and progression. The playable game and its implementation live on [`main`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main).

## Locked element and fusion decisions

**Plant replaces Forest** in the ten-base-element roster. The base elements are Fire, Water, Lightning, Frost, Wind, Earth, Light, Dark, Metal, and Plant. Time and Space remain outside the elemental system.

The five opposition pairs are **Fire ↔ Water**, **Lightning ↔ Frost**, **Wind ↔ Earth**, **Light ↔ Dark**, and **Metal ↔ Plant**.

**Water + Metal → Rust** is locked for the current fusion roster. Rust is the selected corrosion technique; Metal may also participate in another locked recipe.

**Light + Plant → Sugar** is locked for the current fusion roster. Sugar may use syrup, energy storage and crystalline shards in its design; its exact gameplay kit is not locked.

**Earth + Metal → Magnetism** is locked for the current fusion roster. The recipe intentionally shares Metal with Rust; Earth supplies the lodestone/mineral identity while Metal supports magnetic interaction.

[Lightning + Earth → Glass](element-hq/fusions/pairs/lightning-earth.md) was previously locked but is now **unlocked and exploratory** by the owner because its crystal visuals overlap Sugar. [Fire + Earth → Magma](element-hq/fusions/pairs/fire-earth.md) remains paused. No parent is exclusively reserved, and a recipe can share parents with another recipe.

**Fusion architecture decision:** retain exactly ten elemental schools. Fusion results are **named resonance techniques, not additional elemental damage/resistance schools**. Collectible fusion creatures are a possible later feature; no new creature pipeline, combat behavior or implementation is approved by these recipe locks.

## Confirmed creature design boundary

[Elemental foundation reaffirmed 2026-11-24](element-hq/designs/element-foundation-confirmation-2026-11-24.md) records the ten-school roster, creature design boundary and migration questions. Consult Element HQ before new elemental, creature, spell, fusion or progression recommendations. Acorn Sprout is exploratory; selected fusion recipes do not approve creature species.

## Start here

**Owner law:** [Fusion Quality Law FQ-001](element-hq/FUSION_QUALITY_LAW.md) requires strong two-parent logic, a distinct visual identity, a unique combat purpose and meaningful counterplay before any fusion becomes playable. Recipes are curated, not a fixed quota.

| Document | Use it for |
| --- | --- |
| [AlderVale element design v1](element-hq/designs/aldervale-element-system-v1.md) | Read the initial design snapshot. The [current base roster and fusion decisions](#locked-element-and-fusion-decisions) govern active design. |
| [Fusion chart](element-hq/fusions/fusion-chart.md) | See locked recipes, open choices, and all 45 pairings at a glance. |
| [Current fusion decisions and open candidate tracks](element-hq/designs/fusion-roster-decisions-2026-11-18.md) | See the three approved fusion techniques, reopened Glass, the five remaining base elements, and four candidate tracks. |
| [Fusion Quality Law FQ-001](element-hq/FUSION_QUALITY_LAW.md) | **Owner law:** all four quality gates must pass before playability. |
| [Fusion system revamp](element-hq/designs/fusion-system-revamp-proposal.md) | Proposed unlock, card/skill, creature and progression mechanics; not yet accepted. |
| [Fusion system mind map](element-hq/designs/fusion-system-mind-map.md) | See the law, selected recipes, discovery and casting options in one dependency map. |
| [Ten elemental skill-tree feasibility charts](element-hq/designs/skill-tree-feasibility-2026-11-18.md) | Exploratory study of ten charts, 45 shared gateways, points, levels, racial perks and development costs. |
| [Hybrid Skill Web screenshot audit](element-hq/designs/ui-audits/skill-web-visual-audit-2026-11-18.md) | Reviewed the generated radial/web/constellation UI against progression, FQ-001, and accessibility; design-only findings. |
| [Focused Water second-iteration audit](element-hq/designs/ui-audits/focused-water-v2-visual-audit-2026-11-18.md) | Compares the improved screen to first-pass findings; documents point/node discrepancies and Rust gateway refinements. |
| [Earlier fusion architecture audit](element-hq/designs/fusion-architecture-audit-2026-11-18.md) | Historical comparison written before the latest owner decisions; consult the current decision record first. |
| [Fusion Name Atlas](element-hq/fusions/README.md) | Browse ten element charts and compare rated names for every pairing. |
| [Fusion pairing chart](element-hq/designs/aldervale-fusion-pairing-chart.md) | Compare all 45 cross-element pairings and their proposed outcomes. |
| [Fusion HQ](element-hq/designs/aldervale-fusion-guide-v1.md) | Read the earlier encounter concepts, existing recipes, and conflict audit. |
| [Element design template](element-hq/templates/element-design.md) | Draft an element, fusion, or change to an existing rule. |
| [Workspace notes](element-hq/README.md) | Read the original scope and design questions. |
| [Element registry](element-hq/element-registry.md) | Look up the historical element catalog, matchup matrix, statuses, and spell snapshot. |
| [Historical fusion proposal](element-hq/fusion-system-v1.md) | Review the five-recipe development prototype and the earlier Hatchery rules. |

## Record a design

1. Copy the template to `element-hq/designs/<design-id>.md` and set its status to **Proposed**.
2. Pin the main commit for any observed behavior and link the relevant source. Put new mechanics and lore in the proposal sections.
3. Record the owner's decision when it is available. Link a separately scoped game issue or PR when implementation starts, and attach exact-commit evidence when it is verified.

The original workspace notes, registry, and fusion proposal are preserved as snapshots from `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`. For example, their open-PR note about [#84](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84) describes that snapshot. GitHub records that PR as merged in [the main baseline used for this cleanup](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/295a25c7facabf7d350c951817ba0a1af7b1612a). The fusion proposal retains its proposed status.

This branch lives alongside `main`. Bring selected design documents into the game branch through a separately scoped change when needed. The **Element HQ documents** Actions check verifies the documentation checkout on a standard GitHub-hosted Ubuntu runner.
