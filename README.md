# Element HQ v1

Element HQ is the design reference for the mechanics and lore behind AlderVale’s elements. It covers elemental identities, combat matchups, spells, creature lineages, fusions, and progression. The playable game and its implementation live on [`main`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main).

## Locked element and fusion decisions

**Plant replaces Forest** in the ten-base-element roster. The base elements are Fire, Water, Lightning, Frost, Wind, Earth, Light, Dark, Metal, and Plant. Time and Space remain outside the elemental system.

The five opposition pairs are **Fire ↔ Water**, **Lightning ↔ Frost**, **Wind ↔ Earth**, **Light ↔ Dark**, and **Metal ↔ Plant**.

**Fire + Earth → Magma** is locked for the current fusion roster. Fire and Earth are reserved for Magma for this pass. Prefer one fusion per base element across the current roster wherever possible.

**Water + Metal → Rust** remains a favored candidate with no parent overlap with Magma. **Fire + Water → Steam** and **Lightning + Earth → Glass** are liked ideas on hold for this pass. **Metal + Plant → Ironwood** remains conditional on designing a metal for AlderVale. It shares Metal with Rust.

## Start here

| Document | Use it for |
| --- | --- |
| [AlderVale element design v1](element-hq/designs/aldervale-element-system-v1.md) | Read the initial design snapshot. The [current base roster and fusion decisions](#locked-element-and-fusion-decisions) govern active design. |
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
