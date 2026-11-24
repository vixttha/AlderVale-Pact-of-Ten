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
