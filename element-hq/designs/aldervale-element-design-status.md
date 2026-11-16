# AlderVale Element Design v1 status

The owner confirmed exactly ten base elements in five opposing pairs. Time and Space are outside the elemental system. Chronos and the Chronos-derived Aetheris recipe belong to the development prototype. [Rebuilt design](aldervale-element-system-v1.md).

| Step | Rebuilt result |
| --- | --- |
| [1. Element roster](aldervale-element-system-v1.md#1-element-roster) | Ten named affinities, fresh Earth ID, nine reused base IDs, and a ten-element roster that excludes Time and Space. |
| [2. Combat and spells](aldervale-element-system-v1.md#2-combat-and-spells) | 196-cell working matrix for ten base affinities and four candidate fusions, three explicit prism destinations, shield and creature fixtures, and an Earth kit. |
| [3. Fusion recipes](aldervale-element-system-v1.md#3-fusion-recipes) | Four carry-forward candidates, a permanent third hatchling, and historical evidence for the Chronos-derived Aetheris recipe. |
| [4. Creature biology](aldervale-element-system-v1.md#4-creature-biology) | Single permanent affinity, pairing and eligibility rules, incubation, and an Earth creature concept. |
| [5. Elemental mythology](aldervale-element-system-v1.md#5-elemental-mythology) | Five reconciled pact accounts, independent creature agency, manifestations, and a confirmed boundary placing Time and Space outside elemental lore and rules. |
| [6. Elemental visual identity](aldervale-element-system-v1.md#6-elemental-visual-identity) | Palette, emblem, UI silhouette, movement, creatures, and environmental direction for ten base elements and four fusion candidates. |
| [7. Elemental world map](aldervale-element-system-v1.md#7-elemental-world-map) | Ten primary and alternate habitats, four candidate fusion contact zones, and the Earth environmental anchor. |
| [8. Existing game compatibility](aldervale-element-system-v1.md#8-existing-game-compatibility) | Pinned source audit, development-save fixtures, and implementation acceptance cases. There are no live player accounts to migrate. |

## Decision and evidence

- [Development build at this clarification](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/19a9a85b039ad63e8df4d4a104ad9e98f68ae31c) has five Hatchery recipes, including the Chronos + Metal prototype. [Current resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/19a9a85b039ad63e8df4d4a104ad9e98f68ae31c/shared/creatures.ts#L297).
- [Previous draft](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/bc7a8d1ea53662f8e681675d8683679362095480/element-hq/designs/aldervale-element-system-v1.md) preserves the earlier 225-cell design proposal and Earth + Metal idea. The working matrix covers 196 cells for ten base elements and four derived fusion candidates.

- Owner-confirmed opposition pairs in order are **Fire ↔ Water, Lightning ↔ Frost, Wind ↔ Earth, Light ↔ Dark, and Metal ↔ Forest**. [Canonical pair table](aldervale-element-system-v1.md#v1-elemental-opposition-decision).
- Time and Space are outside the element system. Chronos is excluded from v1, and the Chronos + Metal Aetheris recipe is historical. Earth + Metal has no selected recipe. The Earth kit, entry tier, four carry-forward fusion candidates, and multiplier values remain proposals. The Hatchery design uses two parents to produce one permanent third creature.
- The previous document remains available at [the earlier design revision](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/723927b7ad6f45079c51a9fd4d96c9381a6e9093/element-hq/designs/aldervale-element-system-v1.md). Its archived source behavior is also documented in the [legacy registry](../element-registry.md) and [legacy fusion proposal](../fusion-system-v1.md).
- [Game source at the audit](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/658fe21de482f66754d2bc45088bcc9668668f6d) · [Legacy combat baseline PR #120](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/120) · [Existing signature entitlements PR #107](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/107).
- The Element HQ workflow checks specification structure and the complete proposed matrix. The rebuilt gameplay still needs implementation, visual assets, game tests, and owner review.
