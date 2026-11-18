# Fusion Name Atlas

[Element HQ](../../README.md) · [Original 45-pair chart](../designs/aldervale-fusion-pairing-chart.md)

Open any base element to compare its nine partners. Every pair page lists candidate names, score breakdowns, rationale, and earlier ideas. Alternate names carry the same concept label when they point to the same fusion.

The atlas is a living catalog of reviewable names. The expanded pass adds plausible results, aliases, and useful move or material names with explicit review statuses. More names can be added to the same pair pages as the design develops.

## Element charts

| Element | Element |
| --- | --- |
| [Fire](elements/fire.md) | [Earth](elements/earth.md) |
| [Water](elements/water.md) | [Light](elements/light.md) |
| [Lightning](elements/lightning.md) | [Dark](elements/dark.md) |
| [Frost](elements/frost.md) | [Metal](elements/metal.md) |
| [Wind](elements/wind.md) | [Plant](elements/plant.md) |

## Roster review

| Pair | Name | Decision |
| --- | --- | --- |
| [Water + Metal](pairs/water-metal.md) | **Rust** | Locked. Water and Metal are reserved in this pass. |
| [Lightning + Earth](pairs/lightning-earth.md) | **Glass** | Locked. Lightning and Earth are reserved in this pass. |
| [Fire + Earth](pairs/fire-earth.md) | Magma | Paused by the owner. Shares Earth with Glass. |
| [Light + Plant](pairs/light-plant.md) | Sugar | Owner favorite. Photosynthesis supports the concept. Final selection is open. |
| [Lightning + Wind](pairs/lightning-wind.md) | Ozone | Parked. Shares Lightning with Glass. |
| [Dark + Plant](pairs/dark-plant.md) | Ink | Exploratory. Compatible with both locks. Shares Plant with Sugar, Ash, and Rubber. |
| [Fire + Water](pairs/fire-water.md) | Steam | Parked. Water is reserved for Rust. |
| [Water + Frost](pairs/water-frost.md) | Ice | Parked. Water is reserved for Rust. |
| [Metal + Plant](pairs/metal-plant.md) | Ironwood | Parked. Depends on a setting decision about Metal and shares Metal with Rust. |

The current pass prefers one fusion per base element where possible. A score ranks a design for review. The owner decides the roster and its locks.

## New fusion concepts

| Pair | Proposed fusion | Gameplay direction |
| --- | --- | --- |
| [Fire + Plant](pairs/fire-plant.md) | Ash | Deposit a powder that can smother burning terrain, mark tracks, or feed later regrowth. |
| [Frost + Wind](pairs/frost-wind.md) | Dry Ice | Condense a cold solid from air. Blocks shrink into gas, creating terrain with a visible expiry. |
| [Light + Plant](pairs/light-plant.md) | Sugar | Plants use light energy to make sugars. In the game, crystallizing them into restraints or releasing their stored energy would be magic. |
| [Lightning + Plant](pairs/lightning-plant.md) | Rubber | As a fantasy rule, Lightning cures Plant latex into a springy insulator for rebound and protection. Parked while Glass reserves Lightning. |
| [Earth + Light](pairs/earth-light.md) | Phosphor | Earth supplies a substance that stores Light and releases it later to reveal or mark targets. Parked while Glass reserves Earth. |

## Rating guide

| Criterion | Points | How to score it |
| --- | ---: | --- |
| Parents | 0–3 | 0 for no clear relationship, 1 for one main parent, 2 for both recognizable, 3 for an essential contribution from each. |
| Identity | 0–3 | 0 for no coherent outcome, 1 for a move, condition, event, or object, 2 for a plausible but narrow affinity, 3 for a distinct elemental identity. |
| Name | 0–2 | 0 for misleading, 1 for ambiguous or niche, 2 for clear and memorable. |
| Gameplay | 0–2 | 0 for no clear use, 1 for one credible mechanic, 2 for several related abilities or interactions. |

Use the four scores for a total out of ten. Record one short rationale and where the idea came from. Scores are provisional design judgments. Use the status column to record review decisions.

| Status | Meaning |
| --- | --- |
| Locked | Owner selected the current recipe and name. |
| Favorite | Owner likes the idea and its final selection remains open. |
| Candidate | Strong design proposal or alternate name under review. |
| Exploratory | Idea needs a stronger result, fantasy rule, name, or gameplay stance. |
| Parked | Idea is paused by the owner, has a roster conflict, or depends on a separate design decision. |
| Reference | Retained as a move, effect, material, encounter, or earlier concept. |
| Rejected | Owner explicitly set this name aside for fusions. |

## Update a pair

Use [Water + Metal](pairs/water-metal.md) as the template. Edit the pair page to change the name, concept, status, scores, or rationale. Give aliases the same concept label and sort scores from highest to lowest. Record an owner decision in the rationale when it changes a favorite or lock, and update the roster review above. For a locked recipe, also record a paragraph in Element HQ in the form `**First + Second → Name** is locked for the current fusion roster.` so the atlas check can compare the two records.

Regenerate the element charts with `python3 element-hq/fusions/build_atlas.py`. Commit the edited pair page and the regenerated element charts together. The Element HQ GitHub Actions check verifies the roster, earlier ideas, scores, links, and generated content on a standard public Ubuntu runner.
