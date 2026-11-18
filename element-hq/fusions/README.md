# Fusion Name Atlas

[Element HQ](../../README.md) · [Original 45-pair chart](../designs/aldervale-fusion-pairing-chart.md)

Open any base element to compare its nine partners. Every pair page lists candidate names, score breakdowns, rationale, and earlier ideas. Alternate names carry the same concept label when they point to the same fusion.

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
| [Fire + Earth](pairs/fire-earth.md) | **Magma** | Locked. Fire and Earth are reserved in this pass. |
| [Water + Metal](pairs/water-metal.md) | **Rust** | Owner favorite. Compatible with Magma. |
| [Lightning + Wind](pairs/lightning-wind.md) | Ozone | Candidate. Compatible with Magma and Rust. |
| [Dark + Plant](pairs/dark-plant.md) | Ink | Exploratory. Compatible with Magma, Rust, and Ozone if selected. |
| [Fire + Water](pairs/fire-water.md) | Steam | Parked. Shares Fire with Magma. |
| [Lightning + Earth](pairs/lightning-earth.md) | Glass | Parked. Shares Earth with Magma. |
| [Metal + Plant](pairs/metal-plant.md) | Ironwood | Parked. Depends on a setting decision about metal and overlaps Rust. |

The current pass prefers one fusion per base element where possible. A score ranks a design for review. The owner decides the roster and its locks.

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
| Parked | Idea has a roster conflict or an unmet design dependency. |
| Reference | Retained as a move, effect, material, encounter, or earlier concept. |
| Rejected | Owner explicitly set this name aside for fusions. |

## Update a pair

Use [Water + Metal](pairs/water-metal.md) as the template. Edit the pair page to change the name, concept, status, scores, or rationale. Give aliases the same concept label and sort scores from highest to lowest. Record an owner decision in the rationale when it changes a favorite or lock, and update the roster review above.

Regenerate the element charts with `python3 element-hq/fusions/build_atlas.py`. Commit the edited pair page and the regenerated element charts together. The Element HQ GitHub Actions check verifies the roster, earlier ideas, scores, links, and generated content on a standard public Ubuntu runner.
