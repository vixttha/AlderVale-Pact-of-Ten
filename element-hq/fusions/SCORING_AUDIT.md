# Fusion Name Atlas — Role and Rating Audit

[Atlas overview](README.md) · [All 45 pairs](fusion-chart.md) · [Water + Metal worked example](pairs/water-metal.md)

## Scope and authority

This is a **design-catalog normalization**, not a gameplay change or a new owner lock. All 45 pair pages and all 320 previously cataloged name records remain. Owner-selected **Water + Metal → Rust** and **Lightning + Earth → Glass** stay locked. **Light + Plant → Sugar** stays a favorite. **Fire + Earth → Magma** stays paused. Neither status nor the locked parent pairs are changed by subjective rescoring.

## Three corrected defects

1. **Inflated scores.** An independent Fusion concept can receive 10/10 only when both parents are essential, the outcome has a distinguishable identity and name, and it supports multiple cohesive mechanics. A label or supporting material cannot inherit the independent identity/gameplay score. Alias rows have Identity 0 / Gameplay 0. Non-Fusion roles have Identity at most 1 / Gameplay at most 1 and total at most 7.
2. **Mixed roles.** The `Role` column identifies Fusion, Alias, Variant, Material, Ability, Process, Phenomenon, or Habitat. Only `Fusion` rows qualify for top-level roster candidates. `Status` tracks the owner decision separately. Existing rejected names and parked owner decisions remain visible in the 45 pair pages; they do not become new fusions.
3. **Parent reuse as a soft preference.** The chart exposes overlaps with already selected parents as a **review note**, not an eligibility failure. Review all 45 possible pairs and compare possible rosters. A no-repeat lineup remains preferable *where possible*, but two concepts using a parent can still be proposed; only owner acceptance can change the selected roster.

## Examples and audit gates

| Pair | Primary proposal | Supporting name | What changed |
| --- | --- | --- | --- |
| [Water + Metal](pairs/water-metal.md) | Rust, Fusion, 10/10 locked | Iron Oxide, Variant; Rust Scale, Ability | Secondary names no longer compete at 10/10 with Rust |
| [Lightning + Earth](pairs/lightning-earth.md) | Glass, Fusion, 10/10 locked | Lightning Glass, Alias; Fulgurite, Material | Original Glass lock untouched |
| [Light + Plant](pairs/light-plant.md) | Sugar, Fusion, 9/10 favorite | Starch, Variant; Syrup, Variant | Existing favorite preserved |
| [Fire + Plant](pairs/fire-plant.md) | Ash and Tar, separate Fusion concepts, 9/10 each | Pitch, Variant | Distinct viable concepts can compete without being confused with aliases |
| [Frost + Wind](pairs/frost-wind.md) | Liquid Air, exploratory 7/10 | Dry Ice, Variant | Unsupported magic and underlying substance distinguished |

The GitHub [Atlas validation](build_atlas.py) checks 45 unique pair pages, mirror parity in all 10 generated element charts, valid internal links, score sums/bounds, alias score caps, non-fusion role caps, independent Fusion concept uniqueness within a pair, and agreement with the main owner-lock record. Its `--check` mode does not edit files. Pair-level science or fantasy rules still require individual design review; passing structural validation is not a claim of gameplay balance or scientific proof.

