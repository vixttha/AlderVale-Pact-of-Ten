# AlderVale: Pact of Ten — Element Design v1

The five reciprocal pairs are the owner's design decision. This document rebuilds the eight design steps around them. The game observations are pinned to [`658fe21de482f66754d2bc45088bcc9668668f6d`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/658fe21de482f66754d2bc45088bcc9668668f6d). The proposed tuning, fusion changes, and migration rules are ready for design review.

## v1 elemental opposition decision

| Element | Opposes | Theme |
| --- | --- | --- |
| Fire | Water | heat and flow |
| Lightning | Frost | discharge and stillness |
| Wind | Earth | motion and grounding |
| Light | Dark | revelation and shelter |
| Metal | Forest | worked structure and living growth |

## 1. Element roster

These ten names are the v1 base roster and proposed player-facing labels. Nine existing IDs carry forward under the labels below. Earth receives its own ID. Existing Chronos content stays usable under the legacy compatibility rules in step 8.

| Element | Opposes | Game ID | Proposed tier | Combat identity | Creature anchor |
| --- | --- | --- | --- | --- | --- |
| Fire | Water | `ember` | Starter | Burst, burn, and heat pressure | Hearth Kitsune |
| Water | Fire | `tide` | Starter | Flow control and cleansing | Tidepool Otter |
| Lightning | Frost | `spark` | Starter | Volatile burst and accuracy pressure | Nimbus Lynx |
| Frost | Lightning | `frost` | Starter | Shields, chill, and attrition | Glacier Stag |
| Wind | Earth | `gale` | Starter | Speed, accuracy, and evasion | Gale Barn-Owl |
| Earth | Wind | `earth` | Starter proposal | Stable direct hits, grounding, and cover | Quarryback Tortoise |
| Light | Dark | `sol` | Rare | Radiant attacks and team support | Suncrest Gryphon |
| Dark | Light | `umbra` | Rare | Drain, weakening, and concealment | Nocturne Luna-Moth |
| Metal | Forest | `verdigris` | Rare | Precision, armor, and pierce | Anvil-Sprite Golem |
| Forest | Metal | `bramble` | Starter | Healing, thorn wards, and sustain | Mosscap Budling |

The proposed starter roster has seven elements and the rare roster has three. Keep current gates for existing elements and add Earth to starter selection once its entry kit is ready. A separate tier contains the five fusions.

## Identity and lore

Each pair describes a tension in the world and a reciprocal edge in combat. Affinity can shape a creature's needs and instincts. Its species, personality, and choices are its own.

## Current mechanics and sources

The existing game pairs Ember ↔ Frost, Gale ↔ Bramble, Tide ↔ Spark, Umbra ↔ Sol, and Verdigris ↔ Chronos. Its 225-cell matrix documents pre-redesign behavior. Direct and fusion bonuses use those old relationships. The current prism resolver uses the catalog's opposition as its destination. [Pinned element catalog](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/elements.ts#L24) · [Pinned combat rules](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/combat.ts#L280) · [Legacy baseline PR #120](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/120)

## 2. Combat and spells

### Proposed mechanics

Matchups use the final attack affinity against the defender. The owner's five pairs determine the ten directed opposition cells. Keep the existing multiplier values in the proposed tuning.

| Priority | Condition | Multiplier |
| --- | --- | --- |
| 1 | Same affinity | 0.85× |
| 2 | One of the five reciprocal oppositions | 1.25× |
| 3 | The attacking fusion has a parent whose opposite is the defender | 1.15× |
| 4 | Other matchups | 1.00× |

Chronos mirrors Chronos at 0.85× and resolves at 1.00× against all other affinities in either direction. The directional fusion bonus follows the new parent oppositions. Aetheris deals 1.15× against Wind and Forest using its proposed Earth and Metal parent affinities.

### Proposed directional matrix

Rows attack columns. The 225 cells contain 15 mirrors, 10 direct oppositions, 10 fusion bonuses, and 190 neutral cells.

| Attacker | Fire | Water | Lightning | Frost | Wind | Earth | Light | Dark | Metal | Forest | Magma | Tempest | Glacier | Eclipse | Aetheris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fire | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Water | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Lightning | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Frost | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Wind | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Earth | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Light | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Dark | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Metal | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Forest | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Magma | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 0.85 | 1.00 | 1.00 | 1.00 | 1.00 |
| Tempest | 1.15 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 | 1.00 | 1.00 |
| Glacier | 1.15 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 | 1.00 |
| Eclipse | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 | 1.00 |
| Aetheris | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 0.85 |

### Spells, shields, and prisms

Give each prism card an explicit destination so its effect and text stay aligned when opposition changes. Spell power uses the source affinity. Matchups and shield selection use the converted affinity. Consume the latest matching prism and shield once. Pierce reduces the matching shield. Creature strikes apply the creature's affinity and stage scale and leave these spell modifiers in place. Keep card IDs, costs, and unlock ranks for existing cards. [Catalog cards](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/spells.ts#L75) · [Spell resolution](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/combat.ts#L280) · [Creature strikes](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/combat.ts#L551)

| Prism card | Source | Explicit destination |
| --- | --- | --- |
| Thermal Prism | Fire | Frost |
| Coral Prism | Water | Lightning |
| Nimbus Prism | Lightning | Water |

#### Earth starter kit

Earth's proposed starter kit uses the existing attack and shield mechanics. Initial Earth source power is 1.00. Final deck composition and new card IDs belong to implementation.

| Card | Unlock | Effect |
| --- | --- | --- |
| Stonebeat | Rank 1 | 1 pip, 100 Earth damage, 84% accuracy |
| Cairn Ward | Rank 1 | 0 pips, 45% universal shield, 100% accuracy |
| Fault Line | Rank 2 | 3 pips, 260 Earth damage, 82% accuracy |

### Numerical acceptance fixtures

These are calculated targets for a future implementation. Use deterministic hits without criticals or later status ticks.

| Fixture | Expected result |
| --- | --- |
| Cinder Dart → Water | 119 open, 59 through a 50% shield, 89 through that shield with 25 total pierce. |
| Foam Jet → Frost after Coral Prism | 53 through a 50% Lightning shield. Uses Water source power and Lightning's matchup. |
| Arc Jolt → Fire after Nimbus Prism | 83 through a 50% Water shield. Uses Lightning source power and Water's matchup. |
| Tectonic Eruption → Water and Forest | 344 against Water behind a 50% universal shield. 598 unshielded against Forest. |
| Hearth Kitsune → Water | 98, 112, and 132 at stages 1, 2, and 3. Preloaded wards and prisms survive. |
| Stage 3 Maelstrom Eel → Frost and Lightning | 158 against Frost and 138 against Lightning in separate rounds. Preloaded wards and prisms survive. |
| Thermal Prism, Cinder Dart, and Stage 1 Hearth Kitsune → Fire | 114 total. Converted Frost spell deals 48 behind a 50% Frost shield. The Fire creature deals 66. The spell uses the prism and shield. |
| Stonebeat → Wind | 125 before wards at the proposed Earth source power of 1.00. |

## 3. Fusion recipes

### Creatures and fusion lineage

Use exact unordered recipes. Retain both parent creatures. Four recipes carry the same parent identities forward. Earth + Metal is the proposal for new Aetheris eggs. Legacy Chronos + Metal egg outcomes remain valid.

| Fusion | Parent pair | Creature | Species ID | Growth stages | Signature spell |
| --- | --- | --- | --- | --- | --- |
| Magma | Fire + Forest | Caldera Newt | `magma_salamander` | Cinder Tadpole → Basalt Salamander → Obsidian Caldera | Tectonic Eruption |
| Tempest | Water + Lightning | Maelstrom Eel | `tempest_serpent` | Spark Fin → Storm Serpent → Sovereign Maelstrom | Sky-Sea Maelstrom |
| Glacier | Frost + Water | Permafrost Seal | `glacier_bear` | Ice Pup → Rime Guardian → Glacier Monarch | Permafrost Tide |
| Eclipse | Dark + Light | Corona Caracal | `eclipse_lynx` | Twilight Kit → Corona Lynx → Eclipse Sovereign | Corona Requiem |
| Aetheris | Earth + Metal | Astrolabe Dragonet | `aetheris_dragonet` | Starlight Wyrm → Gilded Astrolabe → Aetheris Sovereign | Astrolabe Zenith |

### Fusion spell reference

Keep the signature card IDs and minimum ranks of 3 for Magma, Tempest, and Glacier, 5 for Eclipse, and 6 for Aetheris. Keep the matching fusion unlock. Previously earned Aetheris rewards and eligible paid eggs retain the existing entitlement. [Spell catalog](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/spells.ts#L106) · [Merged entitlement PR #107](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/107)

### v1 creature and fusion rules

New eggs cost 80 Florins. The active wizard must own two distinct valid parent instances in the active realm. Stage 1 parents qualify and the Hatchery requires no Bonding Seal. Every distinct claimed local Solo, Rare Trial, or Spire win advances each pending egg once. Two qualifying wins hatch a new egg. Losses, draws, abandoned matches, spectators, live PvP, live co-op, and repeat claims add no progress. Lead creature participation is optional. Persist one offspring per hatch and grant its fusion card and unlock once, including for paid legacy fusion eggs. Keep rank restrictions and existing deck choices.

## 4. Creature biology

### Can two different elements produce offspring?

Yes. An exact recipe guarantees its fusion. Other pairs of two base creatures choose either parent's species with equal probability at purchase and save the result. A fusion and a base creature produce the base parent's species. Two fusion creatures are ineligible and incur no charge. The proposal retains existing Chronos creatures and excludes them from new v1 breeding.

### Can creatures have two elemental affinities?

Each creature has one affinity. A Quarryback Tortoise has Earth. An Astrolabe Dragonet has Aetheris. A fusion's ancestry can shape its appearance and lore.

### Can an element change during evolution?

Evolution changes stage, form, and abilities. The creature retains its stored affinity.

### Are some elements genetically rare?

Light, Dark, and Metal remain rare in this proposal. A fusion draws its rarity from its specific parent recipe. The result of a valid fusion egg is guaranteed.

### Can creatures resist their natural elemental instincts?

Yes. Bonds, experience, and temperament shape how a creature responds to an elemental tendency.

### Design checks

Earth and Metal yield Aetheris in either parent order under the proposal. A paid Aetheris egg from the earlier Chronos + Metal recipe keeps its stored species, required wins, and wins earned. Hatching uses that saved result directly.

### Current game implementation

The existing Hatchery's fallback can select either parent's species when a pair fails to match a fusion recipe. The new breeding rules revise that behavior for new purchases. [Current resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/creatures.ts#L297) · [Saved egg fields](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/economy.ts#L114)

## 5. Elemental mythology

### Where did the elements originate?

Early settlements survived where two powers could each check the other's excess. The Ten are the powers named in the pact that grew from those observations. Fusion affinities arose later where specific powers found a stable form together.

### Why are there five opposing pairs?

| Pair | Role in the pact |
| --- | --- |
| Fire ↔ Water | Water cools a spreading fire. Fire warms rivers and sends their water into the air as mist. |
| Lightning ↔ Frost | Lightning breaks frozen stillness. Frost can bind loose material back into a stable form after a discharge. |
| Wind ↔ Earth | Wind carries and wears down stone. Earth anchors settlements and redirects the wind. |
| Light ↔ Dark | Light exposes and guides. Dark shelters life and protects what needs to stay hidden. |
| Metal ↔ Forest | Metal gives tools and structures a lasting shape. Forest reaches around their edges and reclaims worked ground. |

### Are the elements conscious?

Each of the Ten has selective awareness in the proposed lore. A creature can sense its affinity or fusion consciousness and act independently. Local stories can disagree about what a manifestation intended.

### Can they manifest physically?

An affinity can briefly take a shape where its conditions sustain it. Earth might rise as a walking cairn. Lightning might hold a branching arc between two mineral spires. Such manifestations are encounter subjects. Creature lineages drive Hatchery inheritance.

### What is the relationship between Space and Time?

Space and time structure the world. Earth gives places stable ground. Metal shapes tools, channels, and boundaries. Aetheris takes its design language from observatories, tuned mechanisms, and stone foundations. Legacy Chronos creatures and spells retain their time association outside the Ten.

## 6. Elemental visual identity

### Palette, emblem, and UI icon

| Element | Primary | Highlight | Emblem | UI silhouette | Readability cue |
| --- | --- | --- | --- | --- | --- |
| Fire | #B23A1D | #FF9A60 | Flame Diamond | Forked diamond | Pointed upper edge |
| Water | #17618C | #79D7F7 | Cresting Wave | Curved wave and flat baseline | Open negative space inside curl |
| Lightning | #5446A1 | #D8B3FF | Broken Bolt | Broken diagonal | One heavy central stroke |
| Frost | #285C91 | #BCE8FF | Six-Point Crystal | Six-point outline | Open center |
| Wind | #1D6D66 | #96EBDE | Twin Pinion | Twin tapered strokes | Separate outer curves |
| Earth | #72543B | #EBC194 | Stepped Cairn | Three stepped blocks | Filled square base |
| Light | #7A4B0B | #F9D77A | Solar Starburst | Radial star | Long central rays |
| Dark | #51416A | #C3A7EE | Crescent Hollow | Hollow crescent | Open side toward the label |
| Metal | #245E54 | #92E6CB | Forged Anvil | Flat anvil and crossbar | Wide cap and single short leg |
| Forest | #365F2B | #B2E583 | Thorn Tri-Leaf | Three separated leaves | Three clear tips |
| Magma | #8E3020 | #FFAC70 | Cracked Caldera | Split caldera rim | Wide central crack |
| Tempest | #394A9C | #BCC9FF | Maelstrom Eye | Offset spiral eye | Open off-center eye |
| Glacier | #22627D | #C4F4FF | Faceted Iceberg | Faceted block over a wave | Hard outline and open base |
| Eclipse | #71395D | #FFC6DB | Corona Ring | Bright rim around a dark disk | Offset circle edges |
| Aetheris | #345F69 | #BDF4E7 | Celestial Astrolabe | Concentric rings with a center pin | Strong center and two open gaps |

### Magic, creatures, and environments

| Element | Magic motion | Creature shape | Environment |
| --- | --- | --- | --- |
| Fire | Forked flame and outward sparks | Tall ears, singed edges, ember-lit throat | Hearth Valleys and geothermal vents |
| Water | Horizontal bands and trailing droplets | Streamlined body, webbed paws, smooth fins | Tideborn docks and upland lakes |
| Lightning | Branching arcs and short crackles | Tufted ears, zigzag markings, raised fur | Storm ridges and sheltered conduit ruins |
| Frost | Facets that settle and spread from contact | Angular antlers, thick ruff, faceted hooves | High snowfields and cold cavern mouths |
| Wind | Two tapered ribbons with drifting motes | Long wing edges, split tail, spare silhouette | Cliff thermals and open grassland |
| Earth | One ground ripple and settling chips | Low quadruped, three stepped shell plates | Terraced quarries and weathered badlands |
| Light | Radial lines with a brief hold | Open wings, crest halo, bright breast | Sunward battlements and open plateaus |
| Dark | Contracting loops that leave a dark rim | Folded wings, pale eyespots, soft outline | Root archives and deep twilight ravines |
| Metal | Snapped straight lines and short metallic trails | Riveted joints, forged plates, worked surfaces | Smithing wards and exposed ore seams |
| Forest | Root curves and slow unfurling | Leaf fans, branch joints, raised growth rings | Canopy greenhouse and irrigated meadows |
| Magma | Lava seams radiate under a dark crust | Low salamander with bark pattern and cracked stone skin | Rooted caldera margin |
| Tempest | Rolling arcs curl along a water ring | Long eel with lightning fins and a hollow storm-eye marking | Storm-surge coast |
| Glacier | A heavy tidal front breaks into flat ice plates | Rounded seal body under a faceted dorsal shield | Glacial outlet |
| Eclipse | A dim disk leaves a bright expanding rim | Dark cat silhouette with a crown rim and bright ear tips | Twilight escarpment |
| Aetheris | Machined rings settle around a stone core | Stone keel, metal pinions, concentric crest | Ore-bearing observatory ruins |

### Readability and art review

Check icons at 16 and 24 px, in grayscale, and in both theme contexts. Earth uses a filled stepped silhouette. Forest has three distinct leaves. Metal has a wide anvil cap. Use labels on stable high-contrast surfaces and keep color secondary. Reduced-motion versions keep the hit outline and contrast. The directions above are asset specifications for later production.

## 7. Elemental world map

### Regional geography

Use the five tensions to place boundaries, travel paths, and sites where two elemental environments meet. The following locations are design references for level work.

### Habitats of the Ten

| Affinity | Primary habitat | Alternate habitat | Creature anchor |
| --- | --- | --- | --- |
| Fire | Hearth Valleys and geothermal vents | Heated caves beneath snow | Hearth Kitsune |
| Water | Tideborn docks and upland lakes | Estuary ponds | Tidepool Otter |
| Lightning | Storm ridges and sheltered conduit ruins | Mineral towers after storms | Nimbus Lynx |
| Frost | High snowfields and cold cavern mouths | Shaded glacier faces | Glacier Stag |
| Wind | Cliff thermals and open grassland | Windward terraces | Gale Barn-Owl |
| Earth | Terraced quarries and weathered badlands | Dry cave shelves and stone ruins | Quarryback Tortoise |
| Light | Sunward battlements and open plateaus | Sunlit cloisters | Suncrest Gryphon |
| Dark | Root archives and deep twilight ravines | Overgrown arcades at dusk | Nocturne Luna-Moth |
| Metal | Smithing wards and exposed ore seams | River-cut mineral bluffs | Anvil-Sprite Golem |
| Forest | Canopy greenhouse and irrigated meadows | Greenhouse corridors and meadow edges | Mosscap Budling |

### Where habitats overlap

Fire creatures can shelter in geothermal pockets under snowy mountains. Forest can live in managed greenhouses and watered meadows with soil and cover. Earth favors stable ground and exposed rock. Metal follows ore and forge work. Where Wind crosses an Earth escarpment, gust direction and sheltered shelves give each affinity a visible home.

### Fusion contact zones

| Fusion | Parents | Contact zone |
| --- | --- | --- |
| Magma | Fire + Forest | Rooted caldera margin |
| Tempest | Water + Lightning | Storm-surge coast |
| Glacier | Frost + Water | Glacial outlet |
| Eclipse | Dark + Light | Twilight escarpment |
| Aetheris | Earth + Metal | Ore-bearing observatory ruins |

The proposed Aetheris habitat is a ruined observatory built into ore-bearing stone. A storm-surge coast supports Tempest breeding through Water and Lightning. Their combat oppositions follow the pact.

## 8. Existing game compatibility

### Stable IDs and display names

Keep nine existing base IDs and all five fusion IDs. Add `earth` and allocate fresh Earth spell and species IDs. Existing `chronos` wizards, creatures, spells, decks, and unlocks stay usable. Preserve the existing time-themed IDs and behavior except for the explicit v1 matchup rule. Keep Chronos visible to owners of that content. Earth receives a new entry without reassigning existing creatures or spells.

### Compatibility audit

| Area | Observed dependency | Migration rule |
| --- | --- | --- |
| **Spells** | Cards use affinity IDs and prism destinations come from the opposition helper. [Cards](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/spells.ts#L75) | Keep card IDs, costs, ranks, and existing cards. Add explicit prism destinations before replacing opposition. Give Earth new cards. |
| **Creatures** | Creature saves store elemental and species identity. The Firestore owner update allowlist omits creature affinity. [Save shape](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/src/lib/storage.ts#L24) · [Rules](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/firestore.rules#L218) | Keep existing affinities and species. Add an Earth species. Keep Chronos creatures usable and honor previously earned Aetheris. |
| **Combat calculations** | Direct and fusion rules share the catalog. Spells and creature strikes apply distinct modifiers. [Element helper](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/elements.ts#L242) · [Damage](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/combat.ts#L280) | Use the same versioned rules in client and server. Run v1 matchup, prism, shield, and legacy Chronos checks. |
| **Fusion recipes** | The existing resolver uses Chronos and Verdigris for Aetheris. [Resolver](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/creatures.ts#L297) | Use Earth and Metal for new Aetheris eggs. Honor paid eggs with their saved identity, result, threshold, and progress. Apply no second fee. |
| **Saves** | Guest and cloud saves store element IDs, egg outcomes, decks, and creature references. [Save code](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/src/lib/storage.ts#L24) · [Egg shape](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/economy.ts#L114) | Deploy compatible readers before emitting Earth records. Keep unresolved IDs recoverable. Test any write version for repeated claims, retries, and rollback. |
| **Progression** | Existing fusion owners and hatch rewards use a shared entitlement helper. [Grant helper](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/658fe21de482f66754d2bc45088bcc9668668f6d/shared/economy.ts#L136) | Reuse the grant and deduplication rules. Preserve earned spells, rank, quests, unlock lists, currencies, and realm boundaries. |

### Rollout and rollback

1. Add compatible readers and exercise guest and cloud fixture round-trips for existing IDs, Chronos decks, and paid Aetheris eggs. Hold Earth writes until relevant readers support Earth.
2. Bind explicit prism targets. Validate old and new combat behavior against their respective matrices. Give active encounters their starting ruleset or migrate them under an explicit versioned policy.
3. Add Earth entry assets, cards, species, labels, and the new-egg resolver. Stage entry and egg readiness together. Verify Aetheris grants and rank gates for existing and new owners.
4. Run public GitHub-hosted checks on the exact gameplay candidate, including guest and cloud fixture reload. Roll back new Earth entries with a compatible reader in place for already-created Earth saves. Record a reviewed release decision separately.

### Acceptance checks

- Verify all 225 v1 cells, all five reciprocal pairs, both input orders of every recipe, and the legacy Chronos cases outside the matrix.
- Verify all three prism destinations, matching shield selection, pierce, and the spell and creature fixtures from step 2.
- Cover a paid legacy Aetheris egg before and after one win, a new Earth–Metal egg, evolution, repeated claims, reload, and one-time entitlements. Verify rejected purchases keep the player's Florins.
- Round-trip legacy Chronos and new Earth saves through guest and cloud fixtures. Check deck contents, creature identity, progression, and realm boundaries. Verify the compatible rollback reader.

## Balance and verification

The v1 matrix and fixtures are design expectations. The legacy PR measures the existing game. Future gameplay checks belong on an implementation candidate with exact source, design, and test revisions in the receipt. [Legacy baseline](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/120)

## Open questions and decisions

The five pairs come directly from the owner. The Earth starter kit, Quarryback Tortoise, legacy-only Chronos breeding policy, Earth + Metal recipe for new Aetheris eggs, and unchanged multiplier values are proposed design choices made in this rebuild. Review them before proceeding with gameplay changes.
