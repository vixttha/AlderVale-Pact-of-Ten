# Element registry and current combat snapshot

**Source baseline:** `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`  
**Status:** Source-derived reference. Values below describe the code at that SHA; they are not a new balance approval.

## 1. Element tiers

AlderVale currently defines ten foundational elements and five fusion elements (15 total).

### Starter elements

| ID | Name | Opposes | Combat identity | Primary / glow | Accuracy | Crit | Power scalar |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| `ember` | Ember | Frost | Aggressive burn bursts and damage over time | `#d9532f` / `#ff8a4c` | 80 | 12% | 1.00 |
| `frost` | Frost | Ember | Stalwart shields, freezes, and sturdy HP pools | `#3b82c4` / `#8bd3ff` | 85 | 8% | 0.94 |
| `gale` | Gale | Bramble | Swift tempo, accuracy blades, and agile dodges | `#3b9b8f` / `#7de2d1` | 88 | 11% | 0.98 |
| `bramble` | Bramble | Gale | Healing blooms, thorn wards, and steady sustain | `#4b8f44` / `#8cd46e` | 90 | 8% | 0.93 |
| `tide` | Tide | Spark | Flow control, cleanse, and balanced surge | `#256fa8` / `#5cc4ff` | 85 | 10% | 0.97 |
| `spark` | Spark | Tide | High-risk storm cannons and explosive critical hits | `#8a52c7` / `#c699ff` | 74 | 16% | 1.12 |

### Rare elements

| ID | Name | Opposes | Combat identity | Primary / glow | Accuracy | Crit | Power scalar |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| `umbra` | Umbra | Sol | HP-drain hexes, weaknesses, and shadow pacts | `#524175` / `#a389e0` | 82 | 13% | 1.18 |
| `sol` | Sol | Umbra | Radiant spears, group buffs, and purge wards | `#d4901c` / `#ffd166` | 86 | 12% | 1.18 |
| `verdigris` | Verdigris | Chronos | Runeforged armor-pierce and metallic relics | `#2f8a73` / `#7ef0cb` | 84 | 11% | 1.18 |
| `chronos` | Chronos | Verdigris | Pip acceleration, echo turns, and astral precision | `#9c6644` / `#f4c98b` | 85 | 14% | 1.18 |

### Fusion elements

| ID | Name | Parent elements | Combat identity | Primary / glow | Accuracy | Crit | Power scalar |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| `magma` | Magma | Ember + Bramble | Molten siege blasts and living-crust shields | `#b83b1d` / `#ff7033` | 84 | 13% | 1.22 |
| `tempest` | Tempest | Tide + Spark | Surging storm-tides and multi-target chain arcs | `#4f5fd1` / `#98a6ff` | 80 | 15% | 1.24 |
| `glacier` | Glacier | Frost + Tide | Rime barriers, chill locks, and crushing glacial waves | `#2f95b8` / `#aef2ff` | 87 | 10% | 1.18 |
| `eclipse` | Eclipse | Umbra + Sol | Twilight balance of drain and solar burst | `#7d3c68` / `#ff96c5` | 85 | 15% | 1.26 |
| `aetheris` | Aetheris | Chronos + Verdigris | Runic time-forged beams and universal pierce | `#5a8f99` / `#d1fff7` | 88 | 14% | 1.26 |

## 2. Foundational 10 × 10 matchup matrix

This matrix is derived from the ten non-fusion elements and the current `getElementMatchupMultiplier` implementation.

- `0.85×`: same-element mirror resistance (15% less damage).
- `1.25×`: the attacker's defined opposing element (25% advantage).
- `1.00×`: neutral.
- The five base opposing pairs are reciprocal, so the foundational matrix is symmetric.

| Attacker ↓ / Defender → | Ember | Frost | Gale | Bramble | Tide | Spark | Umbra | Sol | Verdigris | Chronos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Ember | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Frost | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Gale | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Bramble | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Tide | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 |
| Spark | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 |
| Umbra | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 |
| Sol | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 |
| Verdigris | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 |
| Chronos | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 |

## 3. Fusion matchup behavior — current implementation warning

The current function applies these checks in order:

1. Same element: `0.85×`.
2. Attacker's `opposingId` matches defender: `1.25×`.
3. Attacker is a fusion and at least one parent element's `opposingId` matches defender: `1.15×`.
4. Otherwise: `1.00×`.

This is **not yet a complete symmetric 15 × 15 design**. In particular, the fusion bonus is checked only when the fusion is attacking; the reverse base-element-versus-fusion matchup does not receive a corresponding rule. Some current parent pairs are themselves opposing pairs, so the resulting bonus can apply to a fusion's own parent elements. Do not treat this extension as a final balance decision. A separate explicit fusion matchup table and regression tests are required before balance acceptance.

## 4. Existing status-effect vocabulary

At this source snapshot, `shared/combat.ts` defines five status kinds:

| Status ID | Name | Polarity | Current meaning |
| --- | --- | --- | --- |
| `burning` | Burning | Debuff | Fire damage at the start of each round |
| `stunned` | Stunned | Debuff | Skips the next turn until stun wears off |
| `regen` | Regen | Buff | Restores Wizard and active Creature HP at the start of each round |
| `frostbite` | Frostbite | Debuff | Chill damage each round and lowers outgoing spell damage by 15% |
| `shocked` | Shocked | Debuff | Static interference lowers outgoing spell accuracy |

Current spell data associates Burning with Ember, Frostbite with Frost, and Shocked with Spark. Bramble has a healing/regen identity. Do not assume the five status kinds cover every element's complete future status design; no fusion-specific status kind exists in this snapshot.

## 5. Existing fusion spell data

| Fusion | Spell | Kind | Cost | Base value | Other data | Unlock rank |
| --- | --- | --- | ---: | ---: | --- | ---: |
| Magma | Tectonic Eruption | AoE | 5 pips | 490 | 140 damage over 2 turns | 3 |
| Tempest | Sky-Sea Maelstrom | AoE | 6 pips | 610 | — | 3 |
| Glacier | Permafrost Tide | Attack | 5 pips | 470 | — | 3 |
| Eclipse | Corona Requiem | Drain | 6 pips | 590 | — | 5 |
| Aetheris | Astrolabe Zenith | Attack | 7 pips | 690 | — | 6 |

These are the spell definitions on the baseline main snapshot. PR #84 proposes additional progression gating; its changes are not merged into this baseline.

## 6. Source references

- [Element definitions and matchup function](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/elements.ts)
- [Spell definitions and status associations](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/spells.ts)
- [Status-effect definitions](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/combat.ts)
