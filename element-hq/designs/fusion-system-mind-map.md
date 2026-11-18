# Fusion System Mind Map — Law, Discovery, Combat, Creatures

**Status:** planning graph; branch-only rule is owner confirmed, interaction branches are proposals.  
**Verified `main`:** `5a7d0438e46582e625fc101efb6aa0f9e637c55e` · **Design baseline:** `d3c3683cb335bea77952b711f4e95cc6b1030b92`

[Quality law](../FUSION_QUALITY_LAW.md) · [Full system choices](fusion-system-revamp-proposal.md) · [Live recipe decisions](fusion-roster-decisions-2026-11-18.md)

```mermaid
flowchart TD
    A["ALDERVALE · TEN BASE SCHOOLS"] --> B["Fusion Library · curated techniques"]
    B --> L["FQ-001: ALL FOUR QUALITY GATES REQUIRED"]
    L --> Q1["Two essential parent explanations"]
    L --> Q2["Distinct visual identity"]
    L --> Q3["Unique tactical job"]
    L --> Q4["Meaningful counters"]
    B --> C["OWNER-SELECTED RECIPES"]
    C --> RU["Rust · Water + Metal · LOCKED"]
    C --> SU["Sugar · Light + Plant · LOCKED"]
    C --> MG["Magnetism · Earth + Metal · LOCKED"]
    C --> GL["Glass · UNLOCKED"]
    C --> MA["Magma · PAUSED"]
    B --> P["PLAYER DISCOVERY LOOP · PROPOSED"]
    P --> P1["World clue / research"]
    P1 --> P2["Show both parents in quest or trial"]
    P2 --> P3["Claim recipe / sigil"]
    P3 --> P4["Equip resonance card or skill"]
    P4 --> P5["Spend normal action + pips"]
    P5 --> P6["Opponent has a counter"]
    P6 --> P7["Optional mastery goals"]
    B --> M["HOW TO CAST? · OWNER CHOICE"]
    M --> MC["Card-first · recommended"]
    M --> MS["Active skill · alternate"]
    M --> M1["One companion catalyst · later"]
    M --> M2["Two active creatures · NOT first prototype"]
    M --> MH["Fusion offspring · possible later"]
    B --> D["TECHNICAL BOUNDARIES"]
    D --> D1["No new elemental school rows"]
    D --> D2["Current combat: roster + one active creature"]
    D --> D3["Legacy hatchery ≠ accepted fusion library"]
    D --> D4["Save + PvP + unlock tests after authorization"]
```

## One-screen branch map

- **Locked law:** a fusion must pass the parent, visual, gameplay and counterplay gates before becoming playable.
- **Locked recipes:** Rust, Sugar and Magnetism. The recipe choices are not confirmations that combat and art specifications have passed every gate.
- **Live school boundary:** exactly ten base elemental schools; fusion tags/techniques do not add matchup matrix types.
- **Recommended gameplay:** discovery quest, one-time Fusion Library unlock, optional deck card, normal action and pip cost, readable enemy counter.
- **Creature questions:** ownership of two parent creatures may be part of discovery, but both creatures need not be active in combat; fused offspring is deferred.
- **Current gaps:** save model for recipe unlock, card/skill choice, trigger, target/cost/counter, progression rewards, and compatibility with existing Hatchery and in-hand enchant.

The graph records options and dependencies; it does not claim these mechanics already exist in the game.
