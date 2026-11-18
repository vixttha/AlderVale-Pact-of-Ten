# FUSION QUALITY LAW — FQ-001

**Authority:** owner-confirmed law, November 18, 2026.  
**Applies to:** every fusion proposed for playable AlderVale content, regardless of whether it is a technique, card, companion action, creature discovery, or future expansion.  
**Scope here:** binding **Element HQ design rule** on `element-hq-v1`; this branch does not independently authorize a gameplay change, merge, or release.

> **No fusion may become playable unless it has a strong explanation for both parent elements, a distinctive visual identity, a unique combat purpose, and meaningful counterplay.**

## Four mandatory gates — all must PASS

| Gate | Required evidence to pass | Not sufficient |
| --- | --- | --- |
| **Q1: Both parents make sense** | Explicitly describe what each parent contributes and why neither is merely decorative. Label real chemistry/physics separately from invented AlderVale magic. | A name that only mentions both parents; coincidence without causal roles |
| **Q2: Distinct visual identity** | A readable battle-scale silhouette, material behavior, motion/VFX and non-color cue that can be distinguished from every selected fusion and its base parents. | Recoloring an existing attack; duplicating the shape of another selected technique without distinguishing behavior |
| **Q3: Unique combat purpose** | One clear tactical verb and an interaction/setup/payoff that existing spells and accepted fusions do not already cover. Specify targets, action/pip cost, use limitations, and expected encounter purpose. | Two existing statuses glued together; a move that makes its base schools redundant; an unlimited free action |
| **Q4: Meaningful counterplay** | At least one reliable, readable response in normal play (e.g., avoid, interrupt, cleanse, expire, block, bait or exploit) that isn't gated behind a particular rare school or paid item. Specify duration, caps and PvP/co-op implications. | Undodgeable permanent effects, opaque triggers, unbounded stacking, or hidden exceptions |

## Admission procedure

1. **Explore freely:** every one of the ten base elements may pair with any other for research. Sharing a parent is allowed and is not automatic acceptance. There are 45 unordered base-base possibilities, **not** 45 promised playable techniques.
2. **File a candidate:** record recipe, primary fusion name, category (technique/material/ability), each parent's causal role, visual identity and overlap assessment, unique tactical verb, primary cost, counterplay and intended progression purpose. Reuse [the Atlas](fusions/README.md) and its scoring guide.
3. **Gate independently:** mark Q1–Q4 **PASS**, **FAIL**, or **UNVERIFIED**, with design evidence and a specific comparison against currently selected techniques. **Any FAIL or UNVERIFIED blocks promotion to playable.** Ratings and popularity alone are not evidence.
4. **Owner selection:** only an explicit owner decision can lock a recipe, approve its kit, authorize a gameplay implementation or authorize a merge/release. A locked **name/recipe** is not automatic evidence that its move, art or counterplay passes the four gameplay gates.
5. **Engineering acceptance:** after separately authorized implementation, validate the proposed rules, gameplay, persistence and multiplayer behavior on the actual checkout using **standard GitHub-hosted public runners** under [the public runner policy](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5a7d0438e46582e625fc101efb6aa0f9e637c55e/docs/PUBLIC_RUNNER_POLICY.md). Keep private planning in Notion.

## Roster and complexity rules

- **Ten permanent base elemental schools** remain. Fusion techniques are **not** additional damage/resistance schools unless a future separate owner decision explicitly changes the architecture.
- No mandatory five-technique or twenty-technique quota. A curated library is allowed to grow **only** when each entry passes Q1–Q4 and is approved.
- No exclusive-parent rule. Metal legitimately participates in **Rust** and **Magnetism**. This does not grant unlimited fusion chains, triple fusions or recursive recipes.
- A **creature fusion**, a **fusion technique card**, and an **in-hand card enchantment** are separate product concepts. Do not reuse the word *fusion* in a way that hides which system is invoked.
- The current owner-selected **Rust**, **Sugar**, and **Magnetism** recipes remain locked as **design selections**. They still require distinct mechanics, art readability and counterplay audits before playable acceptance.
- **Glass** is unlocked/exploratory and **Magma** stays paused. They are not silently reintroduced by legacy source or draft PRs.

## Audit worksheet for future proposals

| Record | Q1 Parents | Q2 Visual | Q3 Gameplay | Q4 Counterplay | Owner recipe decision | Implemented and tested? |
| --- | --- | --- | --- | --- | --- | --- |
| Rust — Water + Metal | Concept clear; details open | UNVERIFIED | UNVERIFIED | UNVERIFIED | Locked | Not under this ten-school design |
| Sugar — Light + Plant | Concept clear; details open | UNVERIFIED | UNVERIFIED | UNVERIFIED | Locked | Not under this ten-school design |
| Magnetism — Earth + Metal | Concept clear; details open | UNVERIFIED | UNVERIFIED | UNVERIFIED | Locked | Not under this ten-school design |

**No design gate is silently considered PASS just because a recipe was previously locked.** Maintain honest distinctions between *selected recipe*, *approved playable design*, *implemented code*, *exact-run validation*, and *owner gameplay acceptance*.

[Current decisions](designs/fusion-roster-decisions-2026-11-18.md) · [Fusion system revamp proposal](designs/fusion-system-revamp-proposal.md) · [Fusion mind map](designs/fusion-system-mind-map.md)
