# Read-only audit 2 — 2026-11-15

| | |
| --- | --- |
| Repo | [vixttha/AlderVale-Pact-of-Ten](https://github.com/vixttha/AlderVale-Pact-of-Ten) |
| Branch read | `main` |
| Commit | `5403de5bc02759afbd19d9208e9ba4d38201c400` |
| Prior note | [audits/2026-11-15-grok-readonly.md](2026-11-15-grok-readonly.md) |
| Scope | Same SHA as audit 1. Delta against that note, plus a combat-determinism pass. Not a playtest. CI not re-run. |

`main` has not moved. No file on the game tree changed between the two notes. What changed is the issue list, and a closer read of combat randomness that the first note only named.

## Delta

Open issues went from 4 to 19. Several of audit 1's high findings are now tickets. The code is the same.

| Already ticketed from audit 1 | Issue |
| --- | --- |
| Bazaar buy does not grant the item or pay the seller | #14 |
| HTTP bazaar/houses are in-memory and disagree with `firestore.rules` | #16 |
| Trade florin delta is applied in React state and not saved | #20 |
| Blank app when WebGL fails | #4 |
| `npm install` ERESOLVE | #5 |

Still open from audit 1, not filed as its own issue: unauthenticated `/ws` (presence spoof, reconnect rebind, `duel_action` accepts any `actorId`), client-writable cloud progression, unauthenticated `/api/academy/strategize`, HTTP routes ignoring `emailVerified`, sanctuary `ratingSum` settable on create, `npm start` running `node server.ts`.

## Newly confirmed on this SHA

These are already open. Listed so the note matches the tracker.

### Simultaneous KO is a win (#17)

`shared/combat.ts` lines 586–591. If the enemy team is empty of living fighters, phase is `victory` even when the player team is also empty. A mutual kill pays full rewards through `handleDuelFinished`.

### Forfeit is scored from `playerTeam` only (#18)

`server/wsHub.ts` lines 538–541. On reconnect timeout the missing actor's HP is set to 0, then `phase = playerTeam.some(hp > 0) ? 'victory' : 'defeat'`. PvP puts the second human on `enemyTeam`. If that human drops, `playerTeam` is still alive, so both clients receive `victory`. `handleClaimExit` treats `phase === 'victory'` as a win. The forfeiter can be paid. The mirror case (playerTeam drops) broadcasts `defeat` to the survivor.

### Flee does not leave the server duel (#19)

`DuelArenaModal.tsx` line 560 calls `handleClaimExit(false)`. That reports a loss to the parent, nulls local state, and closes the modal. No `flee` frame is sent. `wsHub` has no flee handler. The room keeps resolving.

### Guest migration drops the vault and claimed tiers (#21)

`src/App.tsx` lines 169–174. The merge copies `wizardIds`, `unlockedRaces`, and `termXp`. It does not copy `guest.account.sharedVault` or `guest.account.claimedTermTiers`. Cloud save of that object then persists the omission.

### Settings never leave React state (#22)

`settings` is `useState` in `App.tsx` (line 128). `onUpdateSettings` only spreads into that state (line 1152). Nothing writes harp, sfx, camera, or solo-2x into guest storage or the account doc. A reload restores the defaults.

### Flasks are never spent (#23)

`flasks` is initialized in `shared/economy.ts` and refilled at the fountain (`App.tsx` line 566). No other write decrements it. Defeat copy in `resolveDuelRound` and `handleDuelFinished` still tells the player to refill them.

### Quest cards list rewards that are never paid (#13)

`AcademyModalHub.tsx` lines 419–439 render `rewardFlorins`, `rewardXp`, and `rewardShards`. There is no claim handler. Marking a quest complete (duel win, `App.tsx` line 619) does not add those amounts.

## Combat determinism (not ticketed)

Examined after audit 1. Still true on this SHA.

- `resolveDuelRound` defaults `rng` to `Math.random` (`shared/combat.ts` line 366). Live and solo both omit a seed. Tests pass a constant function; nothing checks two seeded streams match.
- Solo shuffles with `sort(() => Math.random() - 0.5)` (`DuelArenaModal.tsx` line 184). That comparator is not uniform. On a 24-card deck the original first card landed in the opening 7 about 43% of the time against a fair 29%.
- Live PvP and co-op do not shuffle. `makeFighter` uses `getStarterDeckForElement` as-is. An Ember starter is 24 cards with three Cinder Darts at the front. `drawUpToSeven` only `shift`s.
- `DuelState` has no seed or cursor field. A replay cannot be reconstructed from the snapshot.
- `rng()` is also used to build modifier ids. An extra id roll moves every later accuracy and pip roll. Creature and Spellwright ids use `Date.now()`, so two runs are not deep-equal even with a fixed stream.
- Same-side action order is arrival order. The sort in `resolveDuelRound` (lines 460–465) returns 0 when both actors are on the same team. Co-op packet order changes which spell consumes the next roll.
- Archivist Reshuffle appends the discard and draws. It does not shuffle. The log still says it did.
- PvP `firstTeam` is one `Math.random()` at room create (`wsHub.ts` line 420), not part of a stored stream.

A Fisher-Yates of `n - 1` swaps from a server-drawn 32-bit seed, stored on `DuelState` and advanced by `resolveDuelRound`, is the missing piece. Mulberry32's first output already mixes seed vs seed+1. The seed still must not be `Date.now()`, the public `duelId`, or the wizard id, and the cursor must be the uint32 state, not the float.

## What this pass did not do

No playtest, no CI run, no new game commit. Issues #7, #10, #11, and #12 (fountain collision, online count, leftover avatar, self-trade) were not re-traced here; they are on the tracker from the QA seat.
