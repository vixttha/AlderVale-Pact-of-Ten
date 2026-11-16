# Fusion System v1 — design proposal

**Status:** Proposed · requires owner acceptance before gameplay implementation  
**Source baseline:** `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`  
**Working branch:** `element-hq-v1`  
**Scope:** Elemental lineage fusion and fusion creatures. This is not the same mechanic as in-hand spell/enchant fusion.

## 1. Executive decision proposal

Keep the five fusion elements already present in AlderVale. Treat each as a stable, independent elemental identity born from a rare resonance between two compatible parent elements.

Fusion is **natural in the world, rare in occurrence, and deterministic when the exact compatibility requirements are met**. A fusion creature is not a temporary two-element effect and is not a copy of either parent. It has its own species, element ID, appearance, personality, abilities, evolution path, and relationship with its own fusion-element consciousness.

Do not add a sixth fusion or change an existing parent pair in this proposal. Gale currently has no fusion recipe; that gap is recorded for owner decision rather than silently inventing a new recipe.

## 2. Existing five recipes

These five pairings already exist in `shared/elements.ts` and `resolveFusionSpecies` in `shared/creatures.ts`.

| Fusion element | Compatible parents | Fusion creature | Three existing stage names |
| --- | --- | --- | --- |
| Magma | Ember + Bramble | Caldera Newt | Cinder Tadpole → Basalt Salamander → Obsidian Caldera |
| Tempest | Tide + Spark | Maelstrom Eel | Spark Fin → Storm Serpent → Sovereign Maelstrom |
| Glacier | Frost + Tide | Permafrost Seal | Ice Pup → Rime Guardian → Glacier Monarch |
| Eclipse | Umbra + Sol | Corona Caracal | Twilight Kit → Corona Lynx → Eclipse Sovereign |
| Aetheris | Chronos + Verdigris | Astrolabe Dragonet | Starlight Wyrm → Gilded Astrolabe → Aetheris Sovereign |

Compatibility is unordered: Ember + Bramble and Bramble + Ember resolve to the same Magma species. Tide appears in two recipes and can therefore participate in either the Tempest or Glacier pairing. No other pair is a fusion recipe in v1.

## 3. The five fusion identities

### 3.1 Magma — Ember + Bramble

- **Core identity:** volcanic life; molten force carried through living roots and hardened crust.
- **Battle role:** area siege, sustained burn pressure, and protective crust defenses.
- **Existing signature spell:** Tectonic Eruption — a molten area attack with damage over time.
- **Existing creature:** Caldera Newt.
- **Personality direction:** protective, patient, territorial about its nest, and unexpectedly nurturing. It is not simply an angry fire creature.
- **Elemental consciousness:** the Magma Confluence is slow, deep, and protective. It communicates through heat, tremors, and growth patterns.
- **Use existing status vocabulary first:** Burning plus shield/crust modifiers. A new “molten” status is not required for v1.

### 3.2 Tempest — Tide + Spark

- **Core identity:** charged weather; ocean pressure and electrical motion acting as one living storm.
- **Battle role:** multi-target pressure, chain attacks, and accuracy disruption.
- **Existing signature spell:** Sky-Sea Maelstrom — a high-cost storm-tide area attack.
- **Existing creature:** Maelstrom Eel.
- **Personality direction:** curious, restless, playful, quick to react, and protective of smaller creatures.
- **Elemental consciousness:** the Tempest Confluence is energetic and changeable. It communicates through rhythm, current, and flashes of light.
- **Use existing status vocabulary first:** Shocked and chain-target mechanics. Do not add a second redundant shock status for v1.

### 3.3 Glacier — Frost + Tide

- **Core identity:** deep-water ice; pressure, stillness, and protection.
- **Battle role:** defensive control, durable barriers, and heavy freezing strikes.
- **Existing signature spell:** Permafrost Tide — a heavy strike described as freezing armor and shields.
- **Existing creature:** Permafrost Seal.
- **Personality direction:** calm, observant, dependable, and protective. It prefers to prevent danger rather than chase it.
- **Elemental consciousness:** the Glacier Confluence is quiet and deliberate. It communicates through still water, frost patterns, and slow pulses.
- **Use existing status vocabulary first:** Frostbite, shield modifiers, and existing control effects.

### 3.4 Eclipse — Umbra + Sol

- **Core identity:** balanced twilight; neither light nor shadow dominates.
- **Battle role:** life-drain, weakness, and precise radiant bursts.
- **Existing signature spell:** Corona Requiem — a high-cost drain attack.
- **Existing creature:** Corona Caracal.
- **Personality direction:** thoughtful, empathetic, private, and sensitive to imbalance. It understands opposing viewpoints without losing its own identity.
- **Elemental consciousness:** the Eclipse Confluence is reflective and balanced. It communicates through silhouettes, halos, and changes in ambient light.
- **Use existing status vocabulary first:** Drain and Weakness. Avoid adding a separate “darkness” status that duplicates those effects.

### 3.5 Aetheris — Chronos + Verdigris

- **Core identity:** time-forged runic matter; crafted structure animated by temporal awareness.
- **Battle role:** precision attacks, armor interaction, and controlled tempo.
- **Existing signature spell:** Astrolabe Zenith — a high-cost precision beam.
- **Existing creature:** Astrolabe Dragonet.
- **Personality direction:** curious, methodical, inventive, and capable of humor. Precision must not make it emotionless.
- **Elemental consciousness:** the Aetheris Confluence is pattern-aware and inventive. It communicates through ticking rhythms, shifting runes, and small changes in the order of events.
- **Use existing mechanics first:** precision, pierce, and pip/tempo rules. Do not introduce time rewinds or extra turns without a separate balance design.

## 4. Answers to the six design questions

### Which elements can fuse?

Only the five exact pairs in section 2. The recipe list is a curated compatibility table, not a rule that any two elements can combine.

- Pair order does not matter.
- The two parent creatures must be distinct individuals.
- Tide is intentionally compatible with both Spark and Frost in the current source.
- Gale has no fusion partner in the current source. Whether that is an intentional identity choice or a future design gap remains open.
- Fusion elements cannot be used as parents for another fusion in v1.
- Three-element fusion, recursive fusion, and arbitrary player-created recipes are out of scope.

### Are fusions born naturally?

**Proposed answer: yes.** In the world's lore, a fusion begins when two compatible elemental lineages resonate strongly enough to form a Confluence Egg. The Hatchery does not manufacture a creature or merge two existing minds; it provides a safe place for a naturally possible event to complete.

The parent creatures remain separate individuals. Neither parent is consumed, overwritten, or stripped of its element.

### Are they exceptionally rare?

**Proposed answer: yes — rarity should come from meaningful prerequisites, not an arbitrary random roll.**

Recommended future requirements for a fusion egg:

1. Two different owned creatures with distinct creature IDs.
2. Their elements match one of the five approved recipes.
3. Both parents have reached Stage 2 or higher (at least 100 Bond XP under the current stage thresholds).
4. Spend one Bonding Seal and the existing 80 Florin incubation fee.
5. Win two eligible duels to hatch the Confluence Egg.

Once all requirements are met, the matching fusion species should be guaranteed. Do not make the player spend scarce resources and then randomly receive an unrelated species. Cosmetic chromatic variation may remain a separate roll and must not change the fusion's element or identity.

**Current implementation difference:** the baseline Hatchery checks for two distinct creature IDs and 80 Florins, chooses the fusion species when `resolveFusionSpecies` finds a recipe, otherwise randomly chooses one parent's species, and sets `winsNeeded: 2`. It does not currently require Stage 2 parents or a Bonding Seal. The additional prerequisites above are a proposal, not implemented behavior.

### Do fusions have independent identities?

**Proposed answer: absolutely.** Each fusion has:

- One unique `ElementId` and one primary elemental identity in combat.
- Its own color, crest, archetype, spells, creature species, lore, and progression.
- A distinct personality and preferences.
- A recorded parent lineage for lore and collection purposes.

Parent ancestry explains where the fusion came from; it does not make the fusion a permanent dual-type creature. The parents retain their own identities.

### Can fusion creatures evolve?

**Proposed answer: yes.** All five existing fusion species already define three named stages. The current `getBondStage` thresholds are:

- Stage 1: below 100 Bond XP.
- Stage 2: 100–299 Bond XP.
- Stage 3: 300 or more Bond XP.

The Hatchery's training path updates the creature's stored stage from Bond XP. The five stage-name progressions are listed in section 2. Stage-specific models, animation changes, and visual acceptance still need separate asset/playtest evidence; stage names alone do not prove those visuals are complete.

### Can a fusion have its own elemental consciousness?

**Proposed answer: yes.** Each fusion element has one emergent **Confluence consciousness**: an elemental intelligence that exists because its two parent forces have become stable together. It is not either parent speaking through the child, and it is not the two parent minds merged.

The fusion creature is also an individual with its own personality. It can sense and communicate with its Confluence, but it is not a puppet or a duplicate of that elemental intelligence.

Suggested awareness arc:

- **Stage 1 — Instinct:** recognizes safety, danger, and familiar bonds; communicates through elemental behavior.
- **Stage 2 — Awakening:** expresses preferences, curiosity, and simple intentions; recognizes both parent lineages without being controlled by them.
- **Stage 3 — Sovereignty:** has a mature, independent point of view and can communicate clearly. It may disagree respectfully with its wizard while remaining bonded.

This is a lore proposal only. No consciousness field or fusion-specific dialogue/agency is represented in the inspected creature data.

## 5. Current implementation facts and gaps

| Area | Verified on baseline main | Gap / caution |
| --- | --- | --- |
| Five fusion element IDs | Present in `shared/elements.ts` | Gale has no recipe; owner decision needed |
| Five parent recipes | Present in `fusionParents` and `resolveFusionSpecies` | Only those exact pairs resolve |
| Five fusion creature species | Present in `shared/creatures.ts` | Individual lore/consciousness depth is not implemented |
| Three stage names per fusion | Present | Visual stage-specific models/animations not verified here |
| Bond-stage thresholds | `getBondStage` uses 100 / 300 XP | Training path updates stored stage |
| Hybrid egg | 80F, two distinct creature IDs, two wins | No Stage 2 or Bonding Seal prerequisite |
| Incompatible pair | Randomly inherits one parent's species | This is ordinary hybrid behavior, not a fusion |
| Egg win progress | Incremented in the non-live duel reward path | Live PvP/co-op returns before egg progress; whether live wins count is unresolved |
| Fusion unlock state | `WizardDocument.progression.unlockedFusions` exists | Baseline `src/App.tsx` does not write a fusion unlock when an egg hatches |
| Fusion spell gating | PR #84 proposes rank and matching fusion-unlock checks | PR #84 is open, unmerged, and diverged from current main; unlock persistence must be checked before accepting its gate |
| Fusion matchups | Current helper gives a fusion attacker a conditional 1.15× bonus | No symmetric, accepted 15 × 15 fusion matchup design yet |
| Fusion consciousness | Not represented in source data | Lore proposal only |

### Important distinction: two different kinds of “fusion”

- **Elemental fusion:** a lineage/creature born from one of the five approved parent-element pairs. This document covers it.
- **In-hand spell fusion:** Keen Ink Enchant modifying an attack card. That separate mechanic is tracked by [issue #70](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70). It must not be confused with creating a fusion element or fusion creature.

### Progression dependency

PR #84 adds checks that can require the matching entry in `unlockedFusions`, but the baseline reward/hatching path does not write that field. Before accepting any rank-and-fusion unlock gate, the implementation must add and test the authoritative unlock update when a valid fusion hatches. Otherwise the gate risks becoming impossible to satisfy.

## 6. Combat and balance guardrails

1. A fusion should express both parent themes, but it must have one readable primary role.
2. Do not simply add both parents' full bonuses together.
3. Keep fusion power above ordinary starter identity only where its higher unlock cost justifies it; measure damage, survivability, pip cost, and matchup impact.
4. Reuse the existing Burning, Frostbite, Shocked, Drain, Weakness, Shield, and Pierce vocabulary where possible. New status types require their own duration, stacking, cleansing, counterplay, and regression rules.
5. Create an explicit 15 × 15 matchup table before declaring fusion combat balance complete. The current helper's one-way fusion bonus is not sufficient evidence of balanced matchups.
6. Preserve parent creatures and their saves when a fusion egg is created or hatched.
7. A fusion's consciousness must never bypass player consent or grant uncontrolled access to the player's account, inventory, or progression.

## 7. Acceptance checklist before gameplay implementation

- [ ] Owner accepts the five recipes and confirms whether Gale intentionally remains unpaired.
- [ ] Owner accepts the rarity gate (Stage 2 parents, one Bonding Seal, 80F, two eligible wins) or replaces it with a different explicit rule.
- [ ] Decide whether PvP/co-op wins count toward egg incubation.
- [ ] Define and test exactly when `unlockedFusions` is granted and persisted.
- [ ] Add pair-order, valid-pair, invalid-pair, same-creature, and parent-preservation tests.
- [ ] Add egg persistence, two-win completion, reload, and no-duplicate-hatch regressions.
- [ ] Verify all five fusion creatures progress through all three stages and retain their own identity.
- [ ] Approve a symmetric 15 × 15 matchup matrix and test every cell.
- [ ] Review spell rank, pip cost, damage, status effects, and counterplay for all five fusion schools.
- [ ] Keep consciousness as lore until a separately accepted dialogue/agency design exists.

## 8. Authority and implementation boundary

This document records a proposed design based on existing source. It does not authorize gameplay code changes, issue closure, PR merge, or release. This is a design proposal only; the owner must accept it and separately authorize any implementation scope.

## 9. Source references

- [Element definitions and parent pairs](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/elements.ts)
- [Fusion creature definitions and resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/creatures.ts)
- [Fusion spell definitions](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/shared/spells.ts)
- [Hatchery egg creation](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/src/features/creatures/CreaturesArborPanel.tsx)
- [Egg incubation on duel wins](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd/src/App.tsx)
- [PR #84 — proposed rare/fusion spell progression gates](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84)
- [Issue #47 — fusion-only creature lineage requirement](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/47)
- [Issue #67 — rare-element starter decks](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/67)
- [Issue #68 — spell rank and element unlocks](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/68)
- [Issue #70 — in-hand spell fusion, a separate mechanic](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70)
