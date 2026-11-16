# Element HQ v1

Element HQ is the design reference for the mechanics and lore behind AlderVale’s elements. It covers elemental identities, combat matchups, spells, creature lineages, fusions, and progression. The playable game and its implementation live on [`main`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main).

## Start here

| Document | Use it for |
| --- | --- |
| [Element design template](element-hq/templates/element-design.md) | Draft an element, fusion, or change to an existing rule. |
| [Workspace notes](element-hq/README.md) | Read the original scope and design questions. |
| [Element registry](element-hq/element-registry.md) | Look up the elements, matchup matrix, status effects, and spell snapshot. |
| [Fusion System v1](element-hq/fusion-system-v1.md) | Read the proposed fusion rules, creature lineages, and open decisions. |

## Record a design

1. Copy the template to `element-hq/designs/<design-id>.md` and set its status to **Proposed**.
2. Pin the main commit for any observed behavior and link the relevant source. Put new mechanics and lore in the proposal sections.
3. Record the owner's decision when it is available. Link a separately scoped game issue or PR when implementation starts, and attach exact-commit evidence when it is verified.

The original workspace notes, registry, and fusion proposal are preserved as snapshots from `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`. For example, their open-PR note about [#84](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84) describes that snapshot. GitHub records that PR as merged in [the main baseline used for this cleanup](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/295a25c7facabf7d350c951817ba0a1af7b1612a). The fusion proposal retains its proposed status.

This branch lives alongside `main`. Bring selected design documents into the game branch through a separately scoped change when needed. The **Element HQ documents** Actions check verifies the documentation checkout on a standard GitHub-hosted Ubuntu runner.
