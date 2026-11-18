# Authoritative signed-in progression

Tracking issue [#82](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82).
The game server must establish how shared progression was earned. A verified
Firebase identity establishes ownership. Catalog validation checks that a value
exists. Neither proves that a reward was earned.

## Signed-in solo and Term rewards

The signed-in Amphitheater sends turn choices to the existing game server. The
server builds and advances the duel, chooses the opponent's actions, and keeps
a private save of the current duel per wizard. The server view sends the player
their hand without sending either draw pile or the opponent's hand. Reloading
and reopening the duel resumes its current server state. A turn revision
prevents a repeated round request from resolving a second turn.

Finishing the duel uses the stored outcome. One Firestore transaction updates
the wizard, applicable hatches and lead-creature wins, realm unlocks, the public
profile, Term XP, and the settlement receipt. A concurrent or repeated finish
returns the stored receipt without paying a second time. A draw and a flee
remain non-win outcomes. Rare Trial attempt rewards continue to use the
existing quest rule.

Term XP and claimed tiers used by the new claim path live under the
server-only world realm. A verified account claims a tier using an owned
wizard in that realm. The transaction reads server-earned XP, checks the
receipt for the tier, and records the claim alongside its reward. Earlier
realm-account Term fields stay in their original record for compatibility.
Local guest play still resolves and records its own rewards locally.

This change establishes authority over duel processing and Term claim
accounting. The server currently builds signed-in duels from the existing
cloud wizard and owned-creature documents. Other activities still write to
those documents. Treat their contents and the signed-in live roster as
legacy until the writers below have moved behind server verification.
This change alone does not complete #82.

## Signed-in enrollment

New signed-in enrollment submits name, lineage, element and appearance choices.
The server validates the catalog choices and builds the starter wizard, creature,
Dorm and public profile, then creates them in the realm enrollment transaction.
Retrying an enrolled wizard ID returns its existing save. Legacy imports and
starter recovery still need their own replacement path.

## Writer inventory and cutover

| Surface | Authority needed before enforcing the rules |
| --- | --- |
| Enrollment and recovery | Verify the signed-in user, realm and available slot. Build starter state from catalogs on the server. Save the wizard, roster, realm enrollment, Dorm shell and public profile together. |
| Wizard and public profile | Accept only specific edits or named game actions. Derive level, rank and title from authoritative state. Validate cosmetic fields and check the selected gear and creature against the owner's eligible inventory. |
| Academy, Deck and Tailor | Resolve catalog prices, eligibility, ownership, limits and costs on the server. Treat vault deposit and withdrawal as explicit commands and update wizard and realm together. Preserve existing vault behavior until its separate design issue is decided. |
| Arbor and fusion | Resolve adoption, egg choices, bond training, hatching, evolution and lineage unlocks from catalog rules and verified events. Validate the owning wizard, creature and realm every time. |
| World and Dorm | Give each reward source its own server-validated action. The server tracks harvest and garden eligibility, fishing outcomes, almanac dates and cooldowns. Keep layout and appearance edits independent of reward writes. |
| Live duels | Use only a roster with server-owned progression provenance for signed-in PvP and co-op. Keep guest matchmaking and the separate Bazaar ledger on their existing paths. |

Inventory both create and update rules, plus public projections, bulk writes,
migration and starter recovery. Switch to restrictive Firestore rules only
after the legitimate replacement callers pass emulator and browser checks.
A rules-only change would reject the current legitimate client saves. A
server endpoint that accepts the old snapshot would carry the same risk forward.

## Save and import policy

Keep existing guest saves on their original local path and preserve every
existing cloud save before migration. Preserve identity, supported cosmetic
choices, and personal content where they pass their existing ownership and
catalog checks. Keep a legacy save available for review or offline play.
A legacy/imported balance, unlock, rank, title, creature stage or talent does
not establish signed-in reward or live-combat eligibility. Start trusted
progression from server-generated defaults unless there is independent
server-owned evidence for the value. Give users an explicit choice before
creating a fresh online progression profile from an existing save.

The initial Term ledger starts at zero XP. It does not promote historical
XP into an earned balance. Historical claims count only as already
completed for display and to suppress duplicate payouts. At the first
server-earned reward, the server records those exclusions in its private
ledger. Earlier records and paid items remain intact. Before final rollout,
reconcile historical payouts against independent receipts where available.
Do not convert historical balances or claims into trusted entitlements.

## Verification

1. Review the diff for remaining direct writes, alternate write paths, replay
   behavior, and the guest and authenticated callers.
2. Use the existing public runner Auth and Firestore emulators to check a
   legitimate signed-in settlement, duplicate finish and claim, pending or
   abandoned duel, ownership and the legacy Term history. When each writer
   moves, add checks for its legitimate entry point and rules boundary.
3. Read the seven-game-job matrix and runner policy on the actual PR checkout.
   Check guest First Spark and reload, existing migration, authenticated roster
   selection and Bazaar settlement. Live credentials and production deployment
   are outside this verification.
