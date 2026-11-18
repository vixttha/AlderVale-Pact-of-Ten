# Fusion techniques — confirmed roster decisions and open design tracks

**Status:** Owner-confirmed recipe choices; implementation not authorized by this record.  
**Repository source baseline:** `main` at `5a7d0438e46582e625fc101efb6aa0f9e637c55e`.  
**Design branch base:** `element-hq-v1` at `26a4691cb13b56a2737f0b9046b2af8d7be298d7`.

[Current Element HQ roster](../../README.md#locked-element-and-fusion-decisions) · [45-pair Atlas](../fusions/fusion-chart.md) · [Previous architecture audit](fusion-architecture-audit-2026-11-18.md)

**New owner law:** [Fusion Quality FQ-001](../FUSION_QUALITY_LAW.md) governs promotion from an interesting recipe to playable content. **New proposal:** [Fusion Library mechanics revamp](fusion-system-revamp-proposal.md) and [mind map](fusion-system-mind-map.md) explain discovery, cards, skills, creature roles and milestone goals; these mechanics are not yet locked.

## Explicit owner decisions — November 18, 2026

| Pair | Name | State | Mechanical implementation |
| --- | --- | --- | --- |
| Water + Metal | **Rust** | **Locked** | **Unspecified** beyond proposed corrosion identity |
| Light + Plant | **Sugar** | **Locked** | **Unspecified**; syrup, crystals, crystalline shards, and energy storage are visual/gameplay exploration |
| Earth + Metal | **Magnetism** | **Locked** | **Unspecified**; attraction, repulsion and redirection are proposals |
| Lightning + Earth | Glass | **Unlocked**; exploratory | No longer part of the selected recipe locks, retained as a candidate reference |
| Fire + Earth | Magma | Paused | Do not treat draft Magma implementation as current acceptance |

**Architecture confirmed:** exactly ten base elemental schools. The selected fusions are distinct named techniques/resonances, **not** five more fully typed damage/resistance schools. Unique collectible fusion creatures may be explored later but are not locked or approved for implementation. Fusions may reuse parents: Metal occurs in both Rust and Magnetism by owner choice. No automatic recursive fusion, additional elemental schools, consuming two creatures, or new combat matrix is implied.

## Correct accounting: five base elements without a selected fusion

**Selected parent union:** Water, Metal, Light, Plant, Earth (five distinct elements).  
**Not yet represented among selected parents:** **Fire, Lightning, Frost, Wind, Dark** (five distinct elements).  
The phrase "last four element fusions" is treated as a request to explore **four additional technique ideas**, not a mandate to select exactly four or force a perfect parent matching. Reusing parents is permitted. Seven total techniques, four more, or fewer remain **open owner choices**.

## Four candidate tracks for review — none locked

| Pair | Possible technique | Design fit /10 | Action identity and possible counterplay | Issue to solve |
| --- | --- | ---: | --- | --- |
| Lightning + Wind | **Ozone** | 9 | Reactive air: temporary volatile haze that punishes repeated actions; expire, ventilate, or remove field | Must differentiate from plain Lightning damage; toxicity is an effect, not healing |
| Fire + Dark | **Smoke** | 7 | Conceal and reveal: temporary line-of-sight or targeting disruption; cleanse or wait out veil | Fire already makes smoke; Dark must contribute a clear concealment rule |
| Frost + Wind | **Blizzard** | 7 | Pressure and limited visibility: a short timed conceal/accuracy window; windbreak or dispel | A phenomenon/technique, not a new elemental affinity; Wind overlaps Ozone |
| Fire + Frost | **Thermal Shock** | 7 | Setup/payoff: alternate heat and cold to crack one defense; avoid universal armor shred | A process, not an element; could overlap Rust degradation |

**Candidate scores are comparative design judgments**, not historical Atlas ratings or owner acceptance. Four tracks cover all five unused base elements, with Wind and Fire reused. A non-overlapping perfect matching cannot cover an odd number of five unused parents. A candidate can remain a **fusion technique** even when the word describes a phenomenon or process; that does not justify a new elemental school.

## Additional rivals worth comparing (no locks)

| Pair | Candidate | Strength | Weakness |
| --- | --- | --- | --- |
| Lightning + Frost | Thundersnow | Combines both parents in recognizable charged winter weather | Large overlap with Blizzard and ordinary weather spells |
| Wind + Dark | Shroud | Distinct stealth/redirection role | Dark contribution must not simply be recolored Wind |
| Frost + Dark | Black Ice | Ambush or concealed slip/trap identity | Better as a Frost spell/status than permanent element |
| Wind + Metal | Resonance | Sound/metal vibration with interruption or timed counters | Requires separate sonic mechanic and Metal repeats with current locks |
| Fire + Plant | Tar / Ash | Strong material changes and potential tactical roles | Sugar already covers stickiness; Plant is a locked parent but reuse allowed |
| Lightning + Metal | Electromagnetism | More direct physical explanation for magnetic fields | Magnetism recipe is already locked as Earth + Metal; avoid a duplicate named fusion |

## Distinct locked identities to test eventually

- **Rust** — surface decay and timed armor interaction, using eligible material targets; does not automatically beat all Metal units
- **Sugar** — *bind, store, crystallize/release*; may create angular translucent crystalline shards like Glass, as the owner prefers, without a competing locked Glass technique
- **Magnetism** — *attract, repel, redirect* metal-tagged attacks/effects; no claim of tile pulling on current non-grid combat
- **Glass** — unlocked; stays in archive/candidate atlas without new gameplay obligations

## Outstanding decisions and blockers

1. Is the long-term collection target truly **four additional techniques**, or does the owner want only the most convincing ones? Do not lock by quota.
2. How do techniques activate — two compatible spell cards, two allied companion affinities, a learned recipe, or another source?
3. Are fusion techniques owned by wizards, creatures, or both? Who pays the action/pip cost and what prevents an unlimited extra turn?
4. Are the initial game effects scoped to existing duel state (teams/turns, no grid), or does a new positional grid become a separately approved feature?
5. Does the Sugar kit lean primarily into crystal projectiles/shards, adhesive syrup, energy banking or a supported mix? The *name and recipe* are locked; the visual/combat specification is not.
6. New current gameplay code still contains legacy fusion IDs and recipes including Magma/Chronos/Aetheris, unrelated to accepted new techniques. [Draft PR #130](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/130) prototypes Magma even though the owner paused it. Do not merge or silently activate that prototype.

This document updates design decisions only. Actual gameplay implementation and validation need a separately authorized change and appropriate public-hosted GitHub checks.
