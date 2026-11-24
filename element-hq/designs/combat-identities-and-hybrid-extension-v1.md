# Combat identities and expandable hybrid architecture v1

Status: completed design candidate for owner review, not a gameplay or balance lock. Owner requested ten distinct identities before creature concepts, coherent affinity mechanics, and ability to add future hybrid elements. Existing EA-001 and FQ-001 remain binding. Main source: 914dee182df5dea37476b9b0eaf71d7a32190e06; design starting head: 19aeea612c8ff4acb4db00ce57e3fd1c11b6e515. No gameplay changes until authorized.

## Ten school identities

| School | Identity | Signature | Strength | Weakness | Basic | Defense/support | Signature ability | Advanced |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fire | Destruction | Burning | Sustained pressure and burst finish | Cleanse, wards and outlasting damage | Cinder Dart | Heat Veil | Ignite | Inferno |
| Water | Adaptation | Flow | Immediate cleansing and reactive defense | Burst before recovery, persistent pressure | Pressure Jet | Flow Ward | Purifying Current | Tidal Reversal |
| Lightning | Disruption | Charge | Concentrated burst and disruption | Grounding, mitigation, interrupted preparation | Arc Bolt | Static Screen | Charge | Thunderstrike |
| Frost | Suppression | Chill | Reduce enemy output and momentum | Low offense, cleanse and outlasting effects | Rime Shard | Ice Ward | Deep Chill | Flash Freeze |
| Wind | Precision | Momentum | Accuracy and evasion | Reliable hits and heavy protection | Wind Cutter | Slipstream | Tailwind | Cyclone |
| Earth | Fortification | Fortify | General absorption and heavy impact | Pierce and sustained erosion | Stone Lance | Stonewall | Fortify | Seismic Impact |
| Light | Empowerment | Radiance | Curse purification and allied buffs | Dispel and pressure before setup | Radiant Bolt | Gleaming Ward | Illuminate | Dawn Blessing |
| Dark | Corruption | Wither | Weakness, curses and life drain | Purification and denial of curse buildup | Shadow Bolt | Shadow Veil | Withering Curse | Essence Drain |
| Metal | Refinement | Temper | Precision piercing and specialized plating | Corrosion and low-armor opponents | Iron Shard | Forged Plate | Temper | Armorbreaker |
| Plant | Growth | Bloom | Regeneration and living wards | Burst and removal before maturation | Thorn Lash | Living Ward | Regrowth | Elder Bloom |

40 ability concepts are an initial design set, not an approved spell count. Interpret signature labels as effect vocabulary, not ten additional resource meters. All names and numeric tuning are proposals.

## Ability behavior in round-based card combat

Every school can deal direct damage, defend or sustain, set up its signature, and spend a normal action on a payoff. Proposed examples (all costs, accuracy, magnitude, durations and unlock levels to be tuned):

- Fire: Cinder Dart direct hit; Heat Veil short ward; Ignite apply finite burn; Inferno consume or exploit burn for a bounded burst. Cleanse or ward, do not multiply burn endlessly.
- Water: Pressure Jet direct hit; Flow Ward single reactive absorption; Purifying Current remove one eligible physical/elemental harmful effect; Tidal Reversal reward a prior defended hit with a bounded response. No automatic retaliatory turn.
- Lightning: Arc Bolt direct hit; Static Screen ward against a hit; Charge prepare a capped, expiring buff; Thunderstrike spend it for burst. Dispel, ward or outlast; no repeated action denial.
- Frost: Rime Shard direct hit; Ice Ward temporary barrier; Deep Chill suppress outgoing damage; Flash Freeze bounded payoff against chilled foe. Hard stun optional and separately tested, no infinite control chain.
- Wind: Wind Cutter direct hit; Slipstream temporary bounded enemy hit-chance penalty; Tailwind improve next attack accuracy; Cyclone multi-target pressure at normal action cost. Never guarantee immunity or extra turns.
- Earth: Stone Lance direct hit; Stonewall broad shield; Fortify temporary capped protection; Seismic Impact heavy paid hit. No grid/position system required; pierce and attrition respond.
- Light: Radiant Bolt direct hit; Gleaming Ward protective buff; Illuminate remove one eligible curse; Dawn Blessing limited allied buff (self eligible in solo). Dispel or pressure, no universal cleanse by default.
- Dark: Shadow Bolt direct hit; Shadow Veil short defensive modifier; Withering Curse reduce enemy output; Essence Drain bounded damage-linked heal. Heal only from actual eligible damage; no permanent drain loop.
- Metal: Iron Shard direct hit; Forged Plate limited specialized shield; Temper prepare next pierce; Armorbreaker paid hit exploiting protection. No automatic permanent armor destruction; weak payoff against unarmored targets.
- Plant: Thorn Lash direct hit; Living Ward finite protection; Regrowth finite regeneration; Elder Bloom bounded mature-growth payoff. Dispel, burst or wait. Restraint is a bounded modifier, not indefinite stun.

Water immediate response vs Plant gradual growth; Frost outgoing suppression vs Earth broad absorption; Metal specialized armor/pierce vs Earth broad protection; Fire attrition vs Lightning burst; Water physical/elemental cleanse vs Light curse/empowerment; Wind accuracy vs Lightning charge. Shared core mechanics and pips; no mandatory new positioning, movement or real-time combat systems. Proposed counterplay is available via general defensive cards, cleansing, dispelling, timing or outlasting; no required rare school. Define exact effect taxonomy, caps, refresh/stack policy, timing, target, cost, duration and PvP/co-op handling before implementation. Opposition pairs are reciprocal magical affinities (not literal physics, particularly Lightning/Frost and Metal/Plant); school weaknesses are tactical, not additional automatic type multipliers. 0.85/1.25/1.0 remains proposed.

## Coherent Open Mastery under EA-001

Knowledge (1–10 learned base schools), mastery (per-school proficiency and unlocked abilities), active attunement (1–2 distinct learned base schools), and fusion discovery (separate permanent recipe knowledge) are different state. A specialist is a valid build, dual affinity a valid later loadout, open mastery the overall system, unlimited only knowledge within ten schools. Lore: stable magical channels require concentration; learning does not equal channeling. All ten selectable at creation, one primary initially, additional access earned by exploration and trials; advanced power earned through mastery. Recommend primary initially remains the chosen identity, optional learned secondary can change outside duels at safe locations, never per-turn; primary re-attunement policy remains open. No mandatory secondary school. Preserve learned knowledge and earned unlocks when switching. Fixed combat loadout captured and validated at duel entry; normal spell deck limits and one action per turn; shared pip pool, no duplicate resources or free casts. Learned but unequipped school spells cannot be equipped or cast in this proposed model; neutral utilities are separately specified. Secondary grants access to its eligible kit, not a second defensive typing or automatic stat multiplier. Proposed: explicit damage school per attack vs primary defender, existing power-pip rules only for validated active affinities; no implicit double counting. Shared finite mastery investment budget and deck limits trade breadth for depth; exact costs and specialist benefit open. No automatic advantage from rarity or race. Existing source has element, archmasteryElement, pips, per-turn archmastery action input and school-gated rare/fusion cards; migration must replace unrestricted per-turn switching where applicable and validate server, guest and multiplayer entry/actions, not assume it is already enforced. No silent legacy progress loss.

## Expandable hybrid registry

Owner direction: always leave a path to add a new hybrid if good enough. Under FQ-001, keep ten base schools and an extensible curated Fusion Library; no fixed quota. Hybrid element is a player-facing name for a named resonance technique, not a third equipped affinity, new damage/resistance type, automatic species or independent school. 45 unordered base pairs are discovery gateways, not a hard-coded list of playable techniques. Use a stable recipe ID separate from name and canonical sorted distinct parent pair; permit future distinct recipes on one pair only with individual owner approval and overlap review (proposed registry policy). No exclusive parent restriction; no recursive/triple hybrids without separate architecture approval. A newly added entry must not rewrite old recipes, change the base matrix or invalidate saves.

Proposed recipe record: stable ID; version; two valid base parent IDs; canonical pair key; display name; each parent's causal role; category; status (exploratory/selected/kit-approved/implemented/playable/retired); separate owner recipe and kit decisions; Q1–Q4 evidence; visual identity; combat verb; target and explicit parent damage school for damaging effects (no new type; no bonus stacking); pip/action cost; limits and counterplay; discovery prerequisites and trial; asset/ability references; compatibility and migration. Unknown IDs rejected; retired IDs remain readable. Runtime activation requires all four gates, owner-approved kit, validated implementation and separately authorized enablement. No automatic unlock from owning parents. Proposed cast eligibility: both parents learned and currently attuned, recipe earned, ability equipped, mastery prerequisites met, normal shared pips and action. Reverse parent order resolves same pair; duplicate IDs rejected; pair overlap is not automatic admission. Removing a recipe or swapping affinities does not erase learned recipe knowledge; ineligible technique is unequipped or cannot cast.

| Selected recipe | Parents | Illustrative tactical purpose | Status |
| --- | --- | --- | --- |
| Rust | Water + Metal | Corrosion of protective plating over time | Recipe locked; kit/gates unverified |
| Sugar | Light + Plant | Store energy in a growth-derived material for a delayed payoff | Recipe locked; kit/gates unverified |
| Magnetism | Earth + Metal | Manipulate metallic defense or weapon modifiers | Recipe locked; kit/gates unverified |

These are distinct from Metal's immediate pierce, Plant's regeneration and Wind's accuracy. No kit promotion; Glass exploratory; Magma paused. Real corrosion involves more than water alone; Sugar and Magnetism use natural inspirations plus fictional magic, not universal scientific claims.

## Acceptance plan

Design check: exact ten identities and signatures; four nonempty distinct ability names per row; all 40 names unique; five existing EA-001 clauses; FQ-001; indexed design; three selected recipes unchanged; no gameplay files. Future runtime tests (not executed): ten starters and specialist viability; unlock idempotence and persistence; reject third or duplicate affinity and unlearned school; reject in-duel swaps and forged actions; preserve mastery and recipe knowledge after changing loadout; 100 base matchup cells unchanged by new recipe; both parent orders; new recipe add/disable without old save loss; unknown/duplicate IDs and invalid parents rejected; all FQ-001 gate failures block activation; separate discovery, equip and cast checks; no free action/pip duplication; bounded damage, cleanse, pierce, drain, status stacking and counterplay; guest/signed-in, solo/PvP/co-op. Paper-prototype Water/Metal/Rust first as prior feasibility study recommends. No creature anatomy or assets approved here; use school identity after owner review, not legacy 48 forms. No new gameplay feature milestone authorization; milestone fit unverified.

## Connected mastery, world and creature system — design candidate

This elaborates the owner-requested design exploration. EA-001 remains locked; the new mechanics, zone layout, taxonomy, ability names and acquisition routes below await owner review. No original species or asset is approved.

### Affinity journey and mechanical rules

- Start with one freely chosen primary of the ten. Introduce the optional secondary slot through an early quest; discover the first additional school in the world. Do not grant two fully developed schools immediately. A player may keep only their primary.
- A school can be unknown, discovered (clue), learned (trial completed), or mastered to earned prerequisites. Attunement is a separate loadout choice, not another permanent unlock or mastery rank. Up to ten learned; maximum two distinct equipped; no free extra deck, turns, companions or pip pool.
- Proposed primary anchors defensive typing; secondary may swap at safe locations outside encounters. Primary change policy open. Freeze validated affinities, deck and companion eligibility for each duel; attacking card supplies its explicit base school. Learned but unequipped schools are inactive except expressly defined neutral utilities. Preserve knowledge and points through switches; reject illegal queued actions and stale loadouts server-side and in guest validation.
- Shared finite mastery budget and normal deck/action economy preserve specialist value. A hybrid requires both learned and attuned parents, prerequisites, separate recipe discovery and eligible equipped card. It never occupies a third affinity. No guarantee that each pair has a hybrid.

### Skill web

Use the existing radial + constellation + interconnected design: overview shows ten school hubs; focused school view shows its three existing learning themes (see [ten exploratory charts](skill-tree-feasibility-2026-11-18.md)); Fusion Library is a separate view of canonical recipes with mirrored gateways. Do not draw every edge at once. Unknown schools show a clue, learned schools open foundation, allocated nodes show purchased state, equipped schools show an independent marker. Every node shows prerequisites, cost, effect, and available points; color is not the only cue.

Prototype structure per school: foundation (free on learning), three branches with core techniques, specializations and advanced capstones. Preserve existing theme names rather than create competing trees. Proposed shared pool: one point at each even wizard level, 25 total at current level-50 cap, not 25 per school. Example level 12: 6 earned, 4 spent, 2 available, rank 6 under current rank formula. Spend e.g. 4 Water / 2 Metal OR 6 Water for specialization (hypothetical costs, not a finished tree). One point cannot fund both. Rank/proficiency and exploration prerequisites are distinct from spending. No repeated trial points, passive mastery bonuses from inactive schools, or points purchased with real money. A prerequisite remains valid only while required allocations are active; respec at a safe location returns spent points and retains recipe discovery, but ineligible spells are removed/blocked until prerequisites restored. Whether respec has an in-game fee remains open. Mastery beyond level cap can provide knowledge/cosmetics/sidegrades, not unlimited points without separate balance approval.

Example Water: Flow Attunement -> Pressure / Purification / Reactive Flow -> advanced nodes; Metal: Forge Attunement -> Alloycraft / Surface Chemistry / Polarity. Rust gateway mirrors the same recipe in both trees; satisfying node requirements reveals a separate discovery trial, not an automatic unlock. Pilot Water/Metal/Rust paper design first. Keep all ten introductory kits viable before imposing advanced numerical gates.

### Ten elemental territories (working names)

Regions are geographical content, not new server realms or replacements for existing strata. Current main defines Breeze/Horizon/Everpeak realms (pacing), and waters/canopy/deeproot/bridging strata; preserve these independent axes and integrate the territory map later. One elemental stronghold per school is a world-building direction, not an obligation to build all ten at once or one school per entire biome. Border regions can mix schools. All characters may visit the same regions; no forced opposing-school gate. Each region provides habitat, NPC mentor, repeatable encounters, discovery trial, guardian and optional secrets. Challenge mechanics teach the school's strength and counterplay using general tools; combat is not the only means of discovery. No exact quest chain or release order approved.

| Territory | School | Habitat | Lesson and challenge | Creature motif (not species) |
| --- | --- | --- | --- | --- |
| Cinderreach | Fire | Volcanic slopes, warm valleys | Burn pressure, wards, timed cleanse | Heat-adapted wildlife, ember spirits |
| Silverwater Basin | Water | Rivers, springs and flooded ruins | Reactive defense, cleansing | Aquatic fauna, current spirits |
| Stormspire Heights | Lightning | Storm ridges and charged caverns | Telegraph, charge and grounding | Conductive fauna, storm entities |
| Rimewild | Frost | Tundra, glacial grottos | Suppression, timing and outlasting | Insulated fauna, ice spirits |
| Skyweft Cliffs | Wind | High canopies, cliffs and open skies | Accuracy, evasion and reliable attacks | Gliding fauna, air spirits |
| Stoneheart Range | Earth | Mountains, caves and mineral beds | Shields, pierce and attrition | Burrowers, stone beings |
| Dawnward Sanctum | Light | Sunlit meadows, temples and observatories | Empowerment, dispel and curse removal | Luminous fauna, radiant spirits |
| Gloamroot Hollow | Dark | Deep forests and subterranean ruins | Curses, drain and purification | Nocturnal fauna, shadow spirits |
| Ironvein Reach | Metal | Ore seams, foundries and old workshops | Armor and penetration | Metallic fauna, constructs |
| Elderwild Grove | Plant | Ancient forests, gardens and wetlands | Gradual growth and removal | Symbiotic fauna, living plant beings |

### Creature ontology and bond system

Use **creatures** as the broad player-facing term (working codex name: Bestiary); monster means a hostile encounter, not a biological species or an automatic collectable. Classify by independent axes: origin/type, affinity, behavior, encounter role, bond eligibility, and rarity. A divine title is not a rarity tier or a promise of superior stats. No requirement that every school has one of each type.

| Type | Meaning | Bond policy proposal |
| --- | --- | --- |
| Wildlife | Natural animals, including ordinary nonmagical fauna | Some bondable; many environmental only |
| Magical beast | Living animal-like fantasy organism with elemental adaptations | Core bondable candidates, some hostile only |
| Elemental | Living magic or animate natural matter | Selective bonding after appropriate trials |
| Spirit | Supernatural being tied to place, memory or nature | Selective voluntary pact, not forced capture |
| Construct | Crafted or animated artifact | Selective awakening or crafted bond |
| Divine being | Rare mythic intelligence, deity or primordial power | World/story entity; no ordinary capture, optional blessing/avatar pact only after separate approval |

Guardian/boss, companion, mount, NPC, hostile and ambient are roles/behaviors, not species types. One species can have peaceful and hostile encounters without changing its biology. Rarity is independent of combat power; legendary encounters may be non-bondable. A dual-affinity creature or divine avatar is optional later design, not a third player affinity or an automatic fusion. Natural biology and invented magical mechanisms are distinguished. Deities need not be literal gods; lore choice remains open.

Proposed creature loop: encounter -> observe/learn -> satisfy species-specific bond conditions (rescue, trust, trial, combat victory if appropriate, awakening or egg where biologically sensible) -> voluntary pact -> train and earn bond XP -> optional growth/maturity or form change -> equip eligible companion outside combat. Defeating an animal does not automatically award ownership. No universal egg, forced capture, evolution count, sacrificial fusion or creature requirement for wizard school discovery. Use an independent codex discovery record and creature instance, with stable ownership/realm IDs and species-specific acquisition policy. Preserve current one-active-creature constraint as an initial prototype recommendation; companion actions have existing-style bounded costs/turn economy, never an unbounded extra action or independent affinity slot. Secondary wizard affinity does not automatically summon another creature. A different-affinity companion may coexist under an explicit legal action policy, not bypass wizard affinity/fusion eligibility. No paid acquisition requirement.

Creature Forge spec per species: stable species ID, name, type, habitat/territory, primary elemental identity, biology/origin, behavior, silhouette, scale, materials, anatomy/locomotion, bond eligibility and method, encounter role, finite ability kit/counterplay, optional growth stages, rig/animation requirements and asset provenance. Separate species concept approval, art approval, model acceptance, gameplay implementation and balance. Existing Acorn Sprout remains exploratory Plant artwork; no legacy 48-form production and no fusion species automatically inferred. Creature creation may mean the player bond system or the developer asset pipeline: keep both separate.

### Prototype and audit order

1. Owner accepts school identities and chooses affinity/mastery approach. Test Water + Metal + Rust paper build against pure Water and a general-purpose opponent; compare shared point economy and action cost.
2. Map one existing area or small territory encounter to a school and one discovery trial; no ten-zone build commitment. Verify that all starting schools could complete discovery without owning target school or matching creature.
3. Design one original bondable creature and one non-bondable encounter from approved identity; then approve concept, turnaround, model and GLB separately. No artwork lock today.
4. Before authorized implementation: test valid/invalid affinity, points earned/spent/refund, inactive bonuses, respec dependencies, all ten region-school references, one-time trials, persistence, guest/realm ownership, no creature double-grant, companion and boss eligibility, recipe expansion/retirement, stable base matchups, and all FQ-001 gates. Need actual playtests for balance; document validation cannot prove it.

Open decisions: primary re-attunement, exact node costs and rewards, quest difficulty and geographic names/links, creature terminology and divine cosmology, party/companion capacity, growth and acquisition specifics. No gameplay change, merge, release, new species or cost authorization.
