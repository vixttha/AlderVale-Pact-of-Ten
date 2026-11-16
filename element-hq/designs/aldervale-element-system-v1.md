# AlderVale: Pact of Ten — Element Design v1

| Field | Value |
| --- | --- |
| Design ID | `aldervale-element-system-v1` |
| Type | Cross-element rule |
| Status | Proposed |
| Source baseline | [`295a25c7facabf7d350c951817ba0a1af7b1612a`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/295a25c7facabf7d350c951817ba0a1af7b1612a) |
| Related design or issue | [Element registry](../element-registry.md), [Fusion System v1 proposal](../fusion-system-v1.md), [prestige lineages #47](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/47), [spell progression #68](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/68) |

## Identity and lore

AlderVale has six starter elements, four rare elements, and five fusion elements. Each has a named crest and color pair. The combat roles below are design identities from the catalog. The setting details come from creature lore and describe those creatures' place in the world.

| Element | Combat identity | Creature lore anchor | Crest |
| --- | --- | --- | --- |
| Ember | Burst damage and burning | Hearth Kitsune warm kettle-ovens in the Hearth Valleys. | Flame Diamond |
| Frost | Defense, shields, and chill | Glacier Stags drink at Naiad cascade springs. | Six-Point Crystal |
| Gale | Speed, accuracy, and evasion | Sky-Avians train Gale Barn-Owls to carry sealed letters between cloud strata. | Twin Pinion Spiral |
| Bramble | Healing, thorn wards, and sustain | Mosscap Budlings chime when rain gathers in the Canopy greenhouse. | Thorn Tri-Leaf |
| Tide | Flow control and cleansing | Tidepool Otters collect sea-glass around Tideborn dock lanterns. | Cresting Wave Ring |
| Spark | Volatile attacks and critical hits | Nimbus Lynx fur crackles during dusk cloud-storms. | Jagged Bolt |
| Umbra | Drain and weakening | Dark Elf archivists guide Nocturne Luna-Moths under lantern-lit root arches. | Crescent Nocturne |
| Sol | Radiant attacks and team support | Suncrest Gryphons guard High Elf scholarly battlements. | Solar Starburst |
| Verdigris | Rune-forged armor pierce | Dwarf smiths bring Anvil-Sprite Golems to life. | Forged Anvil Hex |
| Chronos | Pip tempo and precision | Pendulum Automatons are attuned to Astral Observatory spires. | Twin Hourglass |
| Magma | Area pressure and crust defense | Caldera Newt hatches from Ember and Bramble. | Cracked Caldera |
| Tempest | Charged multi-target pressure | Maelstrom Eel hatches from Tide and Spark. | Maelstrom Eye |
| Glacier | Barriers and freezing strikes | Permafrost Seal hatches from Frost and Tide. | Faceted Iceberg |
| Eclipse | Drain and radiant bursts | Corona Caracal hatches from Umbra and Sol. | Corona Ring |
| Aetheris | Precise, piercing attacks | Astrolabe Dragonet hatches from Chronos and Verdigris. | Celestial Astrolabe |

The [element catalog](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/elements.ts#L24) defines the named crests and palettes. The [creature catalog](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/creatures.ts#L24) supplies the lore anchors. Dedicated sounds for each element remain open. The fusion proposal describes a separate elemental consciousness for each fusion and an individual personality for its creature. Both are draft lore.

## Current mechanics and sources

| Game behavior | Observed rule | Source or evidence |
| --- | --- | --- |
| Matchup order | A mirror hit uses **0.85×**. The attacker's direct opposing element uses **1.25×**. If a fusion attacks an element opposed by one of its parents, it uses **1.15×**. Other matchups use **1.00×**. The separate fusion bonus is directional. | [Matchup function](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/elements.ts#L242) |
| Foundational opposing pairs | Ember ↔ Frost, Gale ↔ Bramble, Tide ↔ Spark, Umbra ↔ Sol, Verdigris ↔ Chronos. The spell damage path applies matchup before the target shield. Creature strikes also use the matchup helper. | [Element definitions](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/elements.ts#L24), [spell damage](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/combat.ts#L328), [creature strikes](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/combat.ts#L554) |
| Status vocabulary | Burning, Stunned, Regen, Frostbite, and Shocked are status kinds. Spell-specific magnitudes and durations live in the spell records. | [Status types](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/combat.ts#L6), [spell catalog](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/spells.ts) |
| Rare-element spells | Umbra, Sol, Verdigris, and Chronos each have a rank-1 native attack. Advanced rare spells marked with an element requirement need rank 4 and that element's Rare Trial unlock. | [Rare spell definitions](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/spells.ts#L90), [purchase and use gates](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/spells.ts#L123) |
| Fusion spell progression | Each listed fusion spell requires its catalog rank and the matching entry in `unlockedFusions`. New wizard data initializes that list empty. The inspected hatch reward updates eggs and bestiary but leaves the list unchanged. Acquisition and persistence of a matching unlock remain unverified end to end. | [Spell gates](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/spells.ts#L123), [wizard initialization](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/economy.ts#L195), [hatch reward save](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/src/App.tsx#L980) |
| Hatchery | The player selects two distinct owned creatures and pays **80 Florins**. A compatible pair determines the fusion species in either order. An incompatible pair picks a parent species. An egg hatches after **two eligible wins**. The inspected reward handler returns before egg progression for live PvP and co-op. | [Egg creation](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/src/features/creatures/CreaturesArborPanel.tsx#L127), [duel reward handler](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/src/App.tsx#L898), [fusion resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/creatures.ts#L297) |

### Fusion spell reference

These are catalog inputs. The base value is the input to combat resolution. Each row also requires its matching fusion unlock. [Spell definitions](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/spells.ts#L106)

| Element | Signature spell | Kind | Pips | Base value | Minimum rank |
| --- | --- | --- | ---: | ---: | ---: |
| Magma | Tectonic Eruption | Area attack | 5 | 490 | 3 |
| Tempest | Sky-Sea Maelstrom | Area attack | 6 | 610 | 3 |
| Glacier | Permafrost Tide | Attack | 5 | 470 | 3 |
| Eclipse | Corona Requiem | Drain | 6 | 590 | 5 |
| Aetheris | Astrolabe Zenith | Attack | 7 | 690 | 6 |

## Proposed mechanics

- **Birth and requirements.** A compatible pair naturally forms a Confluence Egg. The Hatchery gives the egg a place to develop. The existing proposal calls for two distinct Stage 2 or higher parents, one Bonding Seal, 80 Florins, and two eligible wins. Once those conditions are met, the matching species is guaranteed and both parents remain in the roster.
- **Identity and lore.** Each fusion has one combat identity and a distinct Confluence consciousness. Its creature has an individual personality and can sense that consciousness. The [fusion proposal](../fusion-system-v1.md) carries the five lore profiles and describes how the creature's awareness changes by stage.
- **Matchups and counterplay.** Review attacker and defender directions in a full 15 × 15 table before changing the current helper. For each proposed modifier, record which stage of damage calculation it affects, which shield or status rules apply, and what the player can do in response.
- **Spells and statuses.** Review the five existing spells against their cost, effect, targeting, and counterplay before adding any fusion-exclusive status.
- **Progression and persistence.** Proposed behavior is to grant the matching fusion unlock when the eligible egg hatches, retain it after reload, and avoid duplicate grants on retry. Which duel modes qualify is open.

## Creatures and fusion lineage

The five parent pairs, species, and stage names below are defined in the [creature catalog and resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/creatures.ts#L24). Tide appears in two recipes. Gale has none in the current catalog.

| Fusion | Parents | Species | Stage 1 → Stage 2 → Stage 3 |
| --- | --- | --- | --- |
| Magma | Ember + Bramble | Caldera Newt | Cinder Tadpole → Basalt Salamander → Obsidian Caldera |
| Tempest | Tide + Spark | Maelstrom Eel | Spark Fin → Storm Serpent → Sovereign Maelstrom |
| Glacier | Frost + Tide | Permafrost Seal | Ice Pup → Rime Guardian → Glacier Monarch |
| Eclipse | Umbra + Sol | Corona Caracal | Twilight Kit → Corona Lynx → Eclipse Sovereign |
| Aetheris | Chronos + Verdigris | Astrolabe Dragonet | Starlight Wyrm → Gilded Astrolabe → Aetheris Sovereign |

Bond stage is **1 below 100 XP**, **2 at 100–299 XP**, and **3 at 300 XP or more**. Stage names and thresholds are source-backed. Stage-specific visuals and dialogue remain open for review. [Bond stage helper](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/shared/creatures.ts#L307)

## 4. Creature biology

**Status** · Proposed v1 lore and inheritance rules. Each creature hatches with one elemental affinity. Parentage, evolution stage, and learned behavior describe different parts of its identity.

### Can two different elements produce offspring?

Yes. Same-element non-fusion parents pass on their shared affinity. For two different non-fusion elements, an exact match in the five-pair lineage table produces its named fusion species through a Confluence Egg, with the same result in either parent order. Other pairings that produce an ordinary egg pass on one parent's species and its affinity. The parents remain separate creatures, and the offspring has its own identity.

Fusion-only species originate from their named recipes. In the proposed v1 Hatchery, a fusion creature paired with a non-fusion creature can pass on the non-fusion parent's species through an ordinary egg. Two fusion parents have no v1 Hatchery outcome. This keeps recursive and three-element fusions outside v1.

### Can creatures have two elemental affinities?

No. Each creature has one innate affinity and one element for combat matchups. Both parents can leave visible or behavioral traces in an offspring. A Caldera Newt can have a root-like pattern in its shell and seek out heat, while **Magma** governs its combat matchups. Its Ember and Bramble ancestry describes where it came from.

### Can an element change during evolution?

No. Evolution develops the creature's body, abilities, and relationship with its element while keeping the affinity it hatched with. A Caldera Newt is Magma at all three stages, from Cinder Tadpole to Obsidian Caldera. A Frost or Tide creature stays in its own lineage when it evolves. Glacier begins at the hatch of a qualifying Frost–Tide Confluence Egg.

### Are some elements genetically rare?

Yes. In the lore, Umbra, Sol, Verdigris, and Chronos occur in fewer established creature lineages. A rare affinity stays with the offspring when the corresponding parent's species is inherited. Ordinary offspring inherit an existing parental element. Fusion rarity comes from the specific compatible pairs and the conditions that make a Confluence Egg possible. The matching fusion species is guaranteed once its conditions are met. Rates in the wild and the final Hatchery costs and prerequisites remain open.

### Can creatures resist their natural elemental instincts?

Yes. Elemental instincts are tendencies a creature can learn to manage through experience, temperament, and the trust it builds with its wizard. An Ember creature might instinctively flare when startled and learn to hold its flame around hatchlings. A Glacier creature that prefers stillness might cross a rushing river to rescue a companion. In a fusion, the Confluence can influence what the creature senses. The creature decides how to act. These are rules for characterization and lore scenes. Any combat obedience or refusal mechanic would need its own design.

### Design checks

| Case | Proposed v1 outcome |
| --- | --- |
| Ember + Bramble, in either order | Magma Caldera Newt with one affinity. Both parents remain. |
| Gale + Tide | If the pairing produces an ordinary egg, its species and affinity come from one parent. |
| Magma + Ember, or Magma + Tempest | Magma + Ember can produce an ordinary Ember offspring. Magma + Tempest has no eligible Hatchery outcome. |
| Caldera Newt evolves or suppresses an impulse | Stage or behavior may change. Its Magma affinity stays the same. |

### Current game implementation

The inspected game at [`93abf6e`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d) assigns one affinity from the resulting species on hatch. The five exact unordered pairs are implemented. Any other eligible Hatchery pair currently picks one parent's species at random, so a pairing with a fusion parent can copy that fusion species today. Rune-Catch updates Bond XP, stage, and talents while retaining the existing affinity. The creature record stores one element. The inheritance restrictions, in-world rarity, and portrayal of instinct above are proposed design rules. [Fusion resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d/shared/creatures.ts#L297) · [Hatchery fallback](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d/src/features/creatures/CreaturesArborPanel.tsx#L127) · [Hatch reward](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d/src/App.tsx#L936) · [Bond training](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d/src/features/creatures/CreaturesArborPanel.tsx#L71) · [Creature record](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/93abf6eb09e6ac06d44f22e0d1a23cee85fc713d/src/lib/storage.ts#L24)

## Balance and verification

| Scenario | Expected result | Evidence to collect |
| --- | --- | --- |
| Foundational matchup and fusion bonus | Mirror 0.85×, each defined opposition 1.25×, qualifying attacking fusion 1.15×, neutral 1.00× under the current rule. | Compare each matrix cell to the helper, then confirm representative spell and creature attacks. |
| Compatible and incompatible pairs | Both orders of each exact recipe resolve to the same species. Incompatible pairs receive ordinary hybrid behavior. Selecting the same creature twice creates no egg. | Table-driven tests for pairing and a Hatchery flow check for the same-creature case and payment. |
| Hatching, saving, and repeated actions | One eligible win leaves the egg pending. Two complete the hatch. Verify offspring and both parents after reload. Under the proposed grant, a completed fusion hatch unlocks its exact element once. | Capture hatch, save, reload, and repeat-action evidence. Confirm eligible duel modes after owner review. |
| Spell unlock | Rank and matching unlock are required. Another element's unlock leaves the card gated. | [Main progression tests](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/295a25c7facabf7d350c951817ba0a1af7b1612a/tests/spellProgression.test.ts#L132) cover the gate helpers. Add hatch-to-spell coverage if implementation is authorized. |
| Stage thresholds | 99, 100, 299, and 300 XP return stages 1, 2, 2, and 3 respectively. | Run stage boundary checks, then review visual changes in a playtest when assets exist. |

The [game CI run for the source baseline](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43882668187) passed. The hatch-to-spell and balance rows above are proposed verification scenarios.

## Open questions and decisions

| Question | Decision or next step | Owner decision reference |
| --- | --- | --- |
| Should the existing five fusion recipes stay fixed, including Gale's absence? | Review the recipe roster before adding or changing a pair. | Pending |
| Should rare fusion births require Stage 2 parents and a Bonding Seal? | Review the proposed prerequisites and 80 Florin cost. | Pending |
| Which duel modes should advance eggs, and when should the fusion spell unlock be written? | Decide the qualifying wins and the save behavior together. | Pending |
| Should fusion matchups stay directional? | Compare both attack directions in the 15 × 15 balance review. | Pending |
| How much fusion consciousness should appear in gameplay? | Review the lore first, then decide whether any dialogue or agency belongs in a later design. | Pending |

Here, elemental fusion means creature lineage. In-hand Keen Ink card fusion is tracked in [issue #70](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70). The source-backed mechanics above describe the pinned main commit. Proposed mechanics and lore await owner review.
