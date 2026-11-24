# Elemental foundation — confirmed design, 2026-11-24

Status: owner-reaffirmed design foundation; gameplay migration not authorized by this record. Source game main: `914dee182df5dea37476b9b0eaf71d7a32190e06`; Element HQ baseline: `6fd35f2076b75830d10d7131fb15a9eda4483745`.

## Confirmed foundation

Exactly ten permanent schools, with these five reciprocal opposition pairs:

| School | Opposing school | Legacy ID (migration review only) |
| --- | --- | --- |
| Fire | Water | ember |
| Water | Fire | tide |
| Lightning | Frost | spark |
| Frost | Lightning | frost |
| Wind | Earth | gale |
| Earth | Wind | New school; no semantic conversion from chronos |
| Light | Dark | sol |
| Dark | Light | umbra |
| Metal | Plant | verdigris |
| Plant | Metal | bramble |

Plant replaces Forest. Time and Space are excluded. Chronos is not a new-design school. Legacy IDs and saved content must not be deleted or silently reinterpreted. The legacy main implementation is not the design authority.

## Selected fusion recipes

Water + Metal = Rust; Light + Plant = Sugar; Earth + Metal = Magnetism. These are selected named resonance techniques, not additional elemental schools. Parent reuse is allowed. Glass is exploratory; Magma is paused, and Fire + Forest = Magma is rejected. See [current decisions](fusion-roster-decisions-2026-11-18.md), [Atlas](../fusions/fusion-chart.md), and [FQ-001](../FUSION_QUALITY_LAW.md). All four quality gates must pass before playable promotion. Recipe approval is not approval of a combat kit, creature species, acquisition method, or stats.

## Creature design boundary — owner reaffirmed

- Base original monsters on the ten approved elements, not the outdated creature roster.
- Acorn Sprout is an exploratory Plant creature concept; not locked or approved for model production.
- Rust, Sugar and Magnetism recipe locks do not establish approved monster species.
- Consult Element HQ and newer confirmed owner decisions before elemental, creature, spell, fusion or progression design recommendations.
- Preserve legacy records and eventually reconcile game implementation to the approved design through separately scoped work.

## Proposals awaiting decisions

The existing matchup helper uses 0.85x mirror, 1.25x opposition, and 1.0x neutral. Retaining those values for the new ten-school matrix is a proposal, not a balance lock. All 100 directed cells would be covered. Suggested tactical identities: Fire sustained damage/burst; Water adaptation/cleanse; Lightning burst/disruption; Frost control/mitigation; Wind speed/accuracy; Earth stability/heavy impacts; Light purification/empowerment; Dark weakening/drain; Metal penetration/reinforcement; Plant recovery/restraint. Not final spell kits or balance.

Open: detailed school switching, point economy, exact spell and status mechanics, creature counts/growth stages, detailed affinity rules, fusion acquisition and combat costs, data migration for Chronos and legacy fusion IDs, final visual crests/palettes. The access foundation is locked below. No fixed creature or fusion quota.

## Proposed migration sequence (no game writes)

1. Finish existing first-playable acceptance and establish a separately approved milestone/scope.
2. Inventory every legacy reference and persistence contract: elements, wizard/race unlocks, creatures, spells/decks, UI, quests, server combat and matchmaking, Firestore, guest saves, fixtures. Pin live main and graph evidence; verify references in source.
3. Decide stable IDs and explicit legacy handling, including Chronos and all five old fusion IDs. Do not automatically convert Chronos characters to Earth or old fusions to unrelated new recipes; preserve progress and require owner-approved remapping/recovery.
4. Implement an isolated compatible registry, migration and tests; keep new fusions non-playable until FQ-001 and owner approval. Validate all 100 base matchups, saves/reload, migration idempotence, stale clients, invalid IDs, decks, unlocks, browser and multiplayer.
5. Review and obtain explicit merge/acceptance. Only then promote validated game content; independently review creature art and GLB production.

Existing milestone expired; milestone fit unverified for new gameplay changes. Use standard public GitHub-hosted runners only; no spending, deployment, release or merge authorized by this design record.

## Element access — hybrid B/C/D (owner locked 2026-11-24)

**Owner-approved — LOCKED (EA-001).** This supersedes the earlier preference-only record. The owner explicitly approved the combined summary and requested the lock.

- All ten elements selectable at character creation.
- Additional elements discovered through exploration and trials.
- Advanced power earned through mastery.
- Potentially all ten schools learnable, with two equipped affinities at a time.
- Fusion techniques earned separately.

The architecture supports potentially learning all ten, not a guarantee of specific unlocks; maximum two equipped affinities at a time. Detailed unlock requirements, balance and implementation are not locked. Only explicit owner approval may change this foundation.

Design elaboration (details remain proposed): all ten schools are selectable as a single primary affinity at character creation (C). Every school offers a viable introductory kit without a rarity-based power premium. The remaining nine schools may be discovered and learned through optional world quests, trials and mentors (B + D); this is not a six/four restriction on initial choice. Distinguish discovery (knowledge), school access (permission), mastery (earned progression), and equipped abilities (active build). Preserve learned knowledge on respec; exact respec and equip rules remain open. A player can remain a primary-school specialist without mandatory multi-school grind.

| Stage | Proposed result |
| --- | --- |
| Creation | Choose one of all ten primary schools; receive a viable basic kit |
| Early journey | Learn core spells and school mechanics; encounter other schools |
| Discovery | Optional school-specific trial or mentor unlocks secondary study |
| Mastery | Earn advanced abilities through existing-style mastery web and meaningful challenges |
| Resonance | Discover eligible curated techniques separately; FQ-001 and owner kit approval remain required |

Illustrative Water path: choose Water, learn basic spells, optionally discover Metal in a forge trial, study Metal, qualify for a separately earned Rust recipe. No auto-unlock from school ownership, no mandatory dual-active creatures, no automatic fusion species. A second affinity does not automatically change the primary damage/resistance type. This does not establish an actual Metal quest, Rust kit or spell costs.

Related existing proposals: [mastery feasibility](skill-tree-feasibility-2026-11-18.md) and [Fusion Library](fusion-system-revamp-proposal.md). Keep point allocations separate from permanent discovery; no race-exclusive mandatory access, duplicate point grants, or permanent rarity power advantage in the recommended model. Existing legacy rare tiers and unlocks require migration rather than direct promotion.

Open owner choices: exact attainable school unlocks within the potentially ten-school architecture; whether primary can switch; timing and rules of equipping a secondary within the two-affinity cap; exact unlock trials, point schedule and respec cost; how race flavor and cross-school spells interact with universal initial selection. Worked examples and suggested guarantees outside the five locked clauses remain proposals. No mandatory two-affinity loadout.

Future acceptance tests: all ten selectable with viable decks; no invalid ID or unauthorized secondary access; unlock/retry idempotence and save/reload; primary-only completion; legal loadout and unchanged primary matchup; separate resonance discovery and equip checks; no legacy save loss. No gameplay changes until authorized.

## Owner-approved foundational/derived architecture — 2026-11-24

See [derived disciplines and Sovereigns](derived-schools-and-sovereigns.md). AV-ARCH-001 and AV-COVMODEL-001 accepted as design direction; ten base affinities, voluntary independent covenants, expandable teaching traditions. No new playable fusion or affinity. Individual Fire biography is a Universe HQ candidate.
