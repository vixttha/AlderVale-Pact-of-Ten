# Element HQ v1

**Status:** Design workspace · proposed material · not owner-accepted as a gameplay specification  
**Working branch:** `element-hq-v1`  
**Baseline:** `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd` (`main`)  
**Scope:** Documentation and design reconciliation only. No gameplay code, merge, or release is authorized by this workspace.

## Purpose

Element HQ is the versioned home for AlderVale's elemental identities, matchup rules, fusion recipes, creature lineages, spell identities, progression rules, and future design decisions.

GitHub is the public, versioned source for these design documents and engineering evidence. Private owner decisions and coordination remain in Notion. Do not copy private planning details, credentials, personal information, or private links into this repository.

## Documents

- [Element registry and current combat snapshot](element-registry.md)
- [Fusion System v1 — design proposal](fusion-system-v1.md)

## Current system inventory

The current source defines 15 element IDs:

- **6 starter:** Ember, Frost, Gale, Bramble, Tide, Spark.
- **4 rare:** Umbra, Sol, Verdigris, Chronos.
- **5 fusion:** Magma, Tempest, Glacier, Eclipse, Aetheris.

The five fusion parent pairs and five fusion creature species already exist in the source. Element HQ records what is present separately from what is proposed, missing, or awaiting owner acceptance.

## Source snapshot and overlap

This workspace was created from `main` at `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`.

Primary source files at that snapshot:

- [`shared/elements.ts`](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/elements.ts)
- [`shared/creatures.ts`](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/creatures.ts)
- [`shared/spells.ts`](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/spells.ts)
- [`shared/combat.ts`](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/combat.ts)
- [Hatchery & Training Arbor](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/src/features/creatures/CreaturesArborPanel.tsx)
- [Duel reward and egg progression](../blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/src/App.tsx)

Related engineering work that must remain separate from this design branch:

- [Issue #67 — rare-element starter decks](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/67)
- [Issue #68 — spell rank and rare-element unlocks](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/68)
- [Issue #70 — in-hand Keen Ink spell fusion](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70). This is card/enchant fusion, not elemental lineage fusion.
- [Issue #47 — fusion-only creature and prestige-lineage requirement](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/47)
- [PR #84 — rare-element decks and spell progression](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84) is open and not merged. Its head is `ecb7e7041835a36ea25048e480bb5c1c576dc373`; compared with the current main baseline above, it is 2 commits ahead and 3 behind, with changes to spell progression and deck/shop/duel code. Do not treat its changes as part of main or duplicate its implementation work.

## Working rules

1. Preserve the distinction between **implemented source facts**, **design proposals**, and **owner-accepted decisions**.
2. Keep fusion recipes explicit and deterministic. Do not infer that every pair of elements can fuse.
3. Do not change element IDs, parent pairs, balance values, or progression gates in game code from this documentation branch.
4. Record unresolved design gaps rather than silently inventing implementation behavior.
5. Before gameplay implementation, obtain owner acceptance of the relevant design and create a separately scoped engineering task.
6. Do not merge this long-lived design branch into `main` without a separately reviewed integration plan.

## Acceptance state

This is a working design proposal. In particular, the fusion combat matchup extension, Gale's lack of a fusion recipe, fusion-birth prerequisites, and the progression write for `unlockedFusions` need explicit resolution. **Milestone fit is unverified for gameplay implementation.** This branch does not expand the playable milestone or authorize code changes.

## Version record

| Version | State | Contents |
| --- | --- | --- |
| Element HQ v1 | Draft | Initial registry snapshot and fusion-system proposal, pinned to the baseline above. |
