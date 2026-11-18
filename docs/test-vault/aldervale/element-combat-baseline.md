# Element combat baseline

Observed game behavior on [`219a6bda1f9b2e01f06fd97350a66ed8f470f0d1`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1). The [v1 decision record](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/2df250f0fe01bf0e8b21b6f14eb599c9f114481c/element-hq/designs/aldervale-element-system-v1.md#v1-creature-and-fusion-rules) supplies the agreed roster and fusion rules. This baseline supplies expected results for regression comparison before a balance change.

## Roster reconciliation

| Tier | Current combat elements |
| --- | --- |
| Starter | Ember, Frost, Gale, Bramble, Tide, Spark |
| Rare | Umbra, Sol, Verdigris, Chronos |
| Fusion | Magma (Ember + Bramble), Tempest (Tide + Spark), Glacier (Frost + Tide), Eclipse (Umbra + Sol), Aetheris (Chronos + Verdigris) |

The design uses Fire, Forest, Metal, and Time as earlier wording for Ember, Bramble, Verdigris, and Chronos. Space is a world principle. The roster contains the ten base elements and five fusion elements; creature evolution retains one affinity. The v1 breeding decision also preserves paid eggs, allows Stage 1 parents without a Bonding Seal, and counts claimed Solo, Rare Trial, and Spire wins at the Hatchery. Those Hatchery decisions are separate from the combat multipliers.

The registry's earlier 10 × 10 table covered the ten base elements. The table below extends that baseline to all five fusions. The five reciprocal base oppositions are Ember ↔ Frost, Gale ↔ Bramble, Tide ↔ Spark, Umbra ↔ Sol, and Verdigris ↔ Chronos. Fusion bonuses apply when the fusion attacks an element opposed by at least one parent. Tempest → Spark is 1.15× and Spark → Tempest is 1.00×. Tempest, Eclipse, and Aetheris each receive the bonus against their own two parent elements because those parents directly oppose one another.

## Directional matrix

**Rows attack columns.** The 225 cells contain 15 mirrors at 0.85×, 10 direct-opposition cells at 1.25×, 10 fusion bonuses at 1.15×, and 190 neutral cells at 1.00×.

| Attacker ↓ / Defender → | Ember | Frost | Gale | Bramble | Tide | Spark | Umbra | Sol | Verdigris | Chronos | Magma | Tempest | Glacier | Eclipse | Aetheris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ember | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Frost | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Gale | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Bramble | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Tide | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Spark | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Umbra | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Sol | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Verdigris | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Chronos | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Magma | 1.00 | 1.15 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 |
| Tempest | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 | 1.00 | 1.00 |
| Glacier | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 | 1.00 |
| Eclipse | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 |
| Aetheris | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 |

## Spell and creature checkpoints

The spell resolver scales base damage by the source spell element. A matching prism changes the element used by the matchup and by shield selection. The spell uses the newest matching shield, with pierce reducing the shield's percentage. A creature strike instead uses its own affinity and stage factor and leaves both spell modifiers in place. The numbers below exclude crits and later status ticks.

| Fixture | Expected damage and modifier behavior |
| --- | --- |
| Cinder Dart → Frost | **119** without a ward. **59** through a 50% universal ward. **89** with Spellwrighting B and 10% caster pierce through the ward. |
| Foam Jet → Tide after Coral Prism, with matching Spark ward | **64** through the newest 40% Spark ward. Tide's source power and Spark's matchup apply. The older Spark ward, unmatched Tide ward, and older matching prism survive. A separate round casts Coral Prism and Bastion Ward and deals **53** through its 50% universal protection. |
| Arc Jolt → Spark after Nimbus Prism, with a 50% Tide ward | **83**. The reverse conversion uses Spark's source power and applies Tide's matchup and ward. |
| Tectonic Eruption → Frost and Bramble | **344** through a 50% ward on Frost, and **598** unshielded on Bramble. Each target resolves its own matchup. |
| Hearth Kitsune → Frost with an Ember prism and 50% universal ward | **98**, **112**, **132** at Stages 1, 2, and 3. The prism and ward survive each strike. |
| Stage 3 Maelstrom Eel → Spark with a Tempest prism and ward | **158**. The directional fusion bonus applies. The prism and ward survive. |
| Cinder Dart and Stage 1 Hearth Kitsune in the same turn → Ember | **125** total. The converted spell deals 59 and consumes the prism and ward. The creature then deals 66 using its Ember mirror multiplier. |

[Element matchup helper](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1/shared/elements.ts#L242) · [Spell damage pipeline](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1/shared/combat.ts#L280) · [Creature strike pipeline](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/219a6bda1f9b2e01f06fd97350a66ed8f470f0d1/shared/combat.ts#L548)

Run the focused Vitest suite from the repository root with `bun run test -- tests/vault/elementCombatBaseline.test.ts`. The standard public core jobs also run it as part of the unit suite. The table is a fixed expected result, and the test compares each cell independently against the live matchup helper. The spell and creature fixtures use catalog cards and species with deterministic inputs. They cover direct damage and modifier state. Gameplay balance, status damage over later rounds, and Hatchery behavior require their own evidence.
