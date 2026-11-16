# AlderVale Element Design v1 status

Recorded November 16, 2026. The v1 creature and fusion rules are **decided**. The other design areas remain **proposed**. This index records the written design, the game behavior observed on the pinned baseline, and the decisions still open for review.

## Design coverage

| Area | Documented outcome | Next evidence |
| --- | --- | --- |
| [Identity and roster](aldervale-element-system-v1.md#identity-and-lore) | Six starter elements, four rare elements, and five fusion elements. All fifteen have combat roles, creature lore anchors, and crests. | Review role boundaries and decide how much fusion consciousness appears in gameplay. |
| [Combat and spells](aldervale-element-system-v1.md#current-mechanics-and-sources) | Current precedence is 0.85× mirror, 1.25× direct opposition, 1.15× qualifying fusion attack, then 1.00× neutral. Five fusion signature spells have catalog costs and rank gates. | Verify all 225 directed cells and representative spell, shield, prism, and creature-strike calculations before retuning. |
| [Creature lineages and fusion](aldervale-element-system-v1.md#creatures-and-fusion-lineage) | Five current recipes and their three bond stages are documented. The current Hatchery uses two distinct creatures, 80 Florins, and two eligible wins. | Implement and verify the [v1 creature and fusion rules](aldervale-element-system-v1.md#v1-creature-and-fusion-rules). |
| [4. Creature biology](aldervale-element-system-v1.md#4-creature-biology) | The v1 inheritance rule gives each creature one lifelong affinity. A named fusion recipe produces its own species. The v1 rule allows ordinary offspring from the non-fusion parent of a mixed pair and specifies no offspring for two fusion parents. Instincts can be managed through experience and trust. | Verify that mixed-parent rules apply on new purchases and that paid eggs keep their recorded outcomes. The current fallback can copy a fusion parent's species. |
| [5. Elemental mythology](aldervale-element-system-v1.md#5-elemental-mythology) | Proposed lore describes the founding pact, five reciprocal oppositions, conscious elements, and temporary tangible manifestations. Space is a world principle. Chronos represents time, Verdigris gives structures lasting form, and Aetheris connects sequence to form. | Review the lore as a whole, including the limits on manifestation and creature agency. |
| [6. Elemental visual identity](aldervale-element-system-v1.md#6-elemental-visual-identity) | Written palettes, emblems, icons, spell effects, creature shapes, and environments cover all fifteen entries. The Sol contrast correction is specified. | Produce and inspect assets at the intended UI sizes, in grayscale, and under reduced-motion conditions. |
| [7. Elemental world map](aldervale-element-system-v1.md#7-elemental-world-map) | Written regional geography gives each of the Ten primary and alternate habitats and identifies five fusion contact zones. Verdigris creatures can live around worked stone and mineral seams. Bramble creatures can use planted or green spaces. Ember creatures can live in frozen mountains near reliable heat and shelter. | Choose an area to prototype and verify its traversal and creature placement. |
| [8. Existing game compatibility](aldervale-element-system-v1.md#8-existing-game-compatibility) | The audit covers spells, creatures, combat, recipes, saves, and progression. All 15 element IDs, 16 species IDs, and 41 earlier spell IDs persist in the audited catalogs, which now contain 45 spells. The proposed label-first rollout preserves saved references, existing progress, and recorded egg outcomes. | On an implementation candidate, prove guest and signed-in save compatibility, equivalence of combat and unlocks, and recovery on retry or rollback. |

## v1 creature and fusion decisions

Selected November 16, 2026, on the owner's instruction to decide these rules. [Full rule and acceptance details](aldervale-element-system-v1.md#v1-creature-and-fusion-rules).

| Decision | v1 rule |
| --- | --- |
| Recipes | Keep Magma (Ember + Bramble), Tempest (Tide + Spark), Glacier (Frost + Tide), Eclipse (Umbra + Sol), and Aetheris (Chronos + Verdigris). Parent order is immaterial. Gale has no v1 fusion recipe. |
| Inheritance | One lifelong affinity per creature. An unmatched pair of non-fusion parents passes on one parent's species. A fusion and a non-fusion parent pass on the non-fusion species. Two fusion parents are ineligible. |
| Purchase | Two distinct owned creatures, 80 Florins, and both parents retained. Stage 1 parents qualify and the Hatchery requires no Bonding Seal. |
| Incubation | Two distinct claimed local Solo, Rare Trial, or Spire wins for a new egg. Neither a lead creature's participation nor a live match result is needed. Each qualifying claim advances each pending egg for the wizard once. |
| Existing eggs | Honor the stored species, required wins, and progress, including old fallback results. Each paid egg yields its recorded offspring once, at no extra cost. |
| Fusion rewards | [PR #107](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/107) merged at [`219a6bd`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1). It grants the matching unlock and signature card on hatch and provides recovery for existing owners. |

Creature lineage fusion, [Keen Ink card fusion #70](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70), and [prestige lineages #47](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/47) have separate scopes.

## Verification

The following receipts belong to the recorded checkouts. The Element HQ workflow checks the documentation structure. The game workflow checks the game source at its own checkout.

| Evidence | Checkout | Public GitHub Actions |
| --- | --- | --- |
| Element HQ proposal and template | [`92b4c8e5b2a1759e8193109bfec2792ca3712ca4`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/92b4c8e5b2a1759e8193109bfec2792ca3712ca4) | [Run 43887363159](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43887363159) — passed |
| Creature biology | [`679f687227924270b85e9ce1cd7e88626d059ca8`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/679f687227924270b85e9ce1cd7e88626d059ca8) | [Run 43906745154](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43906745154) — passed |
| Elemental mythology | [`7dd3bad960276a57bc2d2ae4ef59f8510694de69`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/7dd3bad960276a57bc2d2ae4ef59f8510694de69) | [Run 43907339673](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43907339673) — passed |
| Elemental visual identity | [`1fd271bec3d610e292286c45d2ebe25da1196079`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/1fd271bec3d610e292286c45d2ebe25da1196079) | [Run 43908179042](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43908179042) — passed |
| Elemental world map | [`242f5f61b06b4a42d03136f14de50cdd0d240e3f`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/242f5f61b06b4a42d03136f14de50cdd0d240e3f) | [Run 43908852048](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43908852048) — passed |
| Existing game compatibility document | [`9052070279188b93eb452b5ec51974f34db2dac1`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/9052070279188b93eb452b5ec51974f34db2dac1) | [Run 43910149371](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43910149371) — passed |
| Game baseline on `main`, seven game jobs | [`93abf6eb09e6ac06d44f22e0d1a23cee85fc713d`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d) | [Run 43906243211](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43906243211) — passed |
| PR #107 earlier merge checkout, seven game jobs | [`6276bf07eb21d99b3a030a7e4bdd0cb4a561554e`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/6276bf07eb21d99b3a030a7e4bdd0cb4a561554e) | [Run 43892899797](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43892899797) — passed |

PR #107's earlier successful merge checkout has base `3fa20bc5ed4fecc228cc3733536a589bf75df6a0` and head `07b93506e7c8aef1c0a9188d0f37cf0f0c567a34`. The PR later merged at [`219a6bda1f9b2e01f06fd97350a66ed8f470f0d1`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1). [Post-merge public validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43917481646) tracks that commit. The earlier compatibility audit run had a WebKit failure. The later seven-job main evidence above applies to its own checkout. [Earlier audit run](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43889415096)

The live `main` checked when recording this status was [`ed8c7b30c9bbc0497fd27eb6ce7c34757ed3b0c1`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/ed8c7b30c9bbc0497fd27eb6ce7c34757ed3b0c1). The [comparison from the audited revision](https://github.com/vixttha/AlderVale-Pact-of-Ten/compare/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d...ed8c7b30c9bbc0497fd27eb6ce7c34757ed3b0c1) contains the public README and two screenshots. The compatibility findings refer to the audited game source above. The later checkout has its [own validation run](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43913165446).

The creature and fusion rules are selected. The complete breeding behavior, migration tests, asset review, broader design approval, and playtest acceptance are pending.

## Next options

1. **Implement the v1 Hatchery rules when scoped.** Update new-egg eligibility, preserve saved eggs, and verify each duel and retry case on public GitHub-hosted runners.
2. **Build the combat baseline.** Capture all 225 directional matchup cells and compare representative spell and creature damage at the current game commit.
3. **Review post-merge fusion reward evidence.** Read the exact-checkout CI for merged PR #107 and verify which hatch, reload, and recovery cases it covers.
4. **Prototype a visual and habitat pair.** Use Ember and Frost to check icons, spell effects, creature silhouettes, and the transition from geothermal shelter to snow. Keep the deliverable scoped to a concept and readability review.
5. **Prepare the label-only rollout.** Inventory text and UI lookups and select save fixtures that prove existing references still resolve. Schedule the separate breeding and combat changes after the owner's relevant decisions are recorded.
