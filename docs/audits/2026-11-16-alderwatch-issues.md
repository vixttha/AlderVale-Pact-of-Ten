# Alderwatch issue audit — 2026-11-16

Follow-up: [connected merged repairs and remaining acceptance](2026-11-16-connected-repairs.md).
The 18 older issue records now link their merged work, current regressions and
exact-SHA runner receipts. This does not change their acceptance or closure state.

## Result and boundaries

**Inventory/evidence triage: complete for the 58 GitHub issues returned by the
repository-wide all-state listing. Runtime verification: partial.** There are
52 open and six closed issues. This includes design questions and operating
records; 52 is not a count of unresolved defects. All 16 open PRs were checked for
overlap and visible check status. No issue was closed or relabeled.

Audit baseline: `main` at `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`.
The existing owner checkout is `5403de5bc02759afbd19d9208e9ba4d38201c400`
with protected uncommitted changes. Current source was inspected from a
Git archive of the fetched baseline in a temporary directory. These documents
are local, uncommitted deliverables; no result commit or public PR exists for them.

Worker: `codex-alderwatch` (Alderwatch), engineering audit and verification.
Harness: Codex on Windows. Reported model family: GPT-6, exact variant unverified.
Session ID: unavailable. Authenticated GitHub actor: `vixttha` (`gh api user`).
Task scope: owner-requested issue audit, identity/README and public validation.
No implementation, merge, release, deployment or independent review occurred.

## Priority findings

1. **#82 (High as filed):** client-authorized progression and nested economy maps
   remain writable. This needs a trusted-write design, not a blanket rules denial
   that would break legitimate saves. Do not infer production exploitation.
2. **#77 and #76:** malformed later array elements and unrestricted world-message
   frequency remain visible in source. Prior reproduction branches exist; main
   validation does not contain their failing-before-fix assertions.
3. **#43/#75, #67/#68, #69/#70:** creature selection and combat/progression defects
   affect gameplay. #43 and #75 have distinct local/server causes. PR #84 addresses
   #67/#68 but is still unmerged; do not duplicate that implementation.
4. **#45, #47, #72 and #28:** reward identity, prestige sequencing, crafting XP and
   equipped-item ownership need focused regressions. Related bugs are not fixed
   merely because the underlying shared services now persist.
5. **#10–#22:** many historical reports predate merged repairs. Reconcile each
   acceptance scenario; do not automatically close the group or redo existing code.
6. **#66:** rulesets are empty and main reports unprotected. A passing policy
   workflow is not an independent protection mechanism.

These are audit recommendations, not a new implementation schedule. Design
questions #49–#56 need owner decisions. The immediate practical gameplay step
remains a recorded owner first-playable check and #13 reward-path acceptance.

## Runner evidence

Fresh owner-requested validation:
[run 43874521814](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43874521814)
on the exact baseline above. Final status is recorded below after completion.

Previously completed same-SHA baseline:
[run 43860977116](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43860977116)
passed seven jobs, individually inspected: Ubuntu/Windows/macOS core,
Chromium/Firefox/WebKit guest flows, and Firestore emulator permissions.

The fresh run uses the existing unchanged workflow: standard public hosted
labels, finite timeouts, minimal token permissions, locked installs, pinned
actions and one-day failure artifacts. No larger/GPU/self-hosted runner, paid API
or new storage setting was introduced. Public standard compute is free under
[GitHub's current billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions);
artifact storage is separate. No new artifact retention or allowance is assumed.

Existing issue evidence was reconciled with comments for #74–#78, including exact
test commits and failed-before-fix outcomes. Those historical reproductions were
not freshly executed in this pass. Source persistence supports carrying the
findings forward, but does not turn them into fresh runtime reproductions.

## Complete issue disposition

“SOURCE CONFIRMED” means code review at this audit SHA, not a newly executed
reproduction. “Merged repair” means the historical implementation changed;
remaining acceptance is stated per row. GitHub state is a snapshot, not an
instruction to alter it.

| Issue | GitHub state | Classification | Assessment / next verification |
| --- | --- | --- | --- |
| [#2](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/2) docs: owner-directed agent roles and handoff | OPEN | Operating record | PARTIAL: PR #30 merged; issue still refers to draft #30. Reconcile its wording with current roles before disposition. |
| [#3](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/3) On-request AI review log | OPEN | Review log | Keep open as the on-request review log; not a defect or an unattended schedule. |
| [#4](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/4) Whole app goes blank when WebGL context can't be created (no try/catch, no error boundary) | CLOSED | Closed defect | Current title/world recovery regression exists in guest.pw.mjs:127. Closed state is consistent with recorded browser verification. |
| [#5](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/5) npm install fails with ERESOLVE: esbuild ^0.25 conflicts with vite 8's esbuild peer | CLOSED | Closed defect | Root npm CI is used successfully by the emulator job; old esbuild conflict is resolved. Mixed installer policy is separately #79. |
| [#7](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/7) Player walks through the plaza fountain (no prop collision, only a radius clamp) | CLOSED | Closed defect | Fountain collision/refill browser regression exists at guest.pw.mjs:192; closure links merged repair and hosted evidence. |
| [#10](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10) HUD shows "N Online" even when the realm websocket is down | OPEN | Merged repair / closure candidate | worldConnected and disconnect cleanup exist. Current browser regression covers Offline. Leave closure to owner; intermittent WebKit timeouts remain relevant. |
| [#11](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/11) Switching wizards leaves the previous avatar in the scene at spawn | OPEN | Merged repair / partial verification | clearPresence and switch cleanup exist in App.tsx. Add/inspect a direct A-to-B wizard switch assertion before closure. |
| [#12](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/12) Clicking your own leftover avatar offers Propose Trade and Mute | OPEN | Merged repair / partial verification | Inspect UI requires a current connected peer; server trade rejects same-account targets. Direct stale-self inspection regression still needs confirmation. |
| [#13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) Campus quest rewards are listed but never granted | OPEN | Merged repair / acceptance gap | applySagaEvent pays catalog rewards; PR #86 adds focused coverage. First Spark automation exists. Owner playthrough and #44/#50 eligibility decisions remain separate. |
| [#14](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/14) Courtyard Bazaar buy deducts florins but never grants the item or pays the seller | OPEN | Merged repair / partial verification | server/market.ts transfers gear and funds transactionally; emulator covers concurrent buyers. Verify signed-in buyer/seller UI and deployed service separately. |
| [#15](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/15) Bazaar list accepts NaN prices; zero and negative prices silently become 1F | OPEN | Merged repair / partial verification | postListing validates safe integer bounds; current emulator covers invalid inputs. Inspect complete invalid-price cases before closure. |
| [#16](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/16) Academy Houses and Courtyard Bazaar are in-memory and disagree with firestore.rules | OPEN | Merged repair / partial verification | Firestore realm services and House membership transactions replace the historical memory-only path. Restart/deployed persistence acceptance remains unverified. |
| [#17](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/17) Simultaneous KO is scored as victory and pays full duel rewards | OPEN | Merged repair / regression present | combat.ts handles mutual KO as draw; security_combat.test.ts:206 covers burning knockout. Inspect no-win reward path before closure. |
| [#18](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/18) PvP reconnect forfeit scores victory from playerTeam's side only, so the winner can be told they lost | OPEN | Merged repair / regression present | Per-participant duelView plus auditRepairs reconnect timeout regression cover opposite-side victory. Signed-in wallet acceptance is distinct. |
| [#19](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/19) Flee in a live PvP or co-op duel only closes your modal; the server duel keeps running | OPEN | Merged repair / regression present | duel_leave reaches server forfeit; auditRepairs covers PvP surrender and co-op continuation. Verify UI cancellation in a live signed-in scenario. |
| [#20](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/20) Player trade florin delta is not persisted; reload or switch wizard reverts it | OPEN | Merged repair / regression present | Server settlement persists realm wallets with replay receipts; emulator tests balances. Wizard Florins are a separate ledger; do not test the wrong balance. |
| [#21](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/21) Guest-to-Google migration drops claimed term tiers and the shared vault | OPEN | Merged repair / regression present | storage.ts unions vault and claim lists; emulator:127 checks migration. Real Google sign-in remains untested here. |
| [#22](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/22) Audio, camera, and solo-2x settings are never saved or loaded | OPEN | Merged repair / regression present | Guest reload/browser and owning-account settings/emulator checks exist. Real account reload remains outside this audit. |
| [#23](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/23) Defeat and flee tell you to refill flasks, but flasks are never spent | CLOSED | Closed defect | Current fountain/flee browser regression covers accurate feedback; preserve the accepted free-retry behavior. |
| [#25](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/25) Law: 3-day project (through 2026-11-18 America/New_York) | OPEN | Project law | Operating constraint, not a defect. Keep its authority separate from issue count. |
| [#28](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/28) Bazaar: listing equipped gear leaves it equipped, so seller keeps wearing escrowed/sold gear (PR #27) | OPEN | Ownership conflict / partial | Escrow decrements wallet gear, while Tailor persists equipped IDs. Reproduce wallet loss -> derived duel stats; do not infer that escrow fixes equipment ownership. |
| [#35](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/35) Second Google account on the same browser is locked out of a realm: guest migration re-uses wizard ids owned by the first account (PR #34) | CLOSED | Closed defect | Emulator covers second-account enrollment and concurrent guest imports. Closure is supported for simulated accounts; real Google acceptance is not claimed. |
| [#38](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/38) PR #36: agent's node:test file is collected by the game's `npm test` (vitest) and fails the run | OPEN | Branch-specific source concern | Current PR #36 head 5a52e77 still contains operating.test.ts importing node:test, with no Vitest exclusion in vite.config.ts. Target is AlderVale-test-Vault, not main. Fresh execution at that head remains unverified. |
| [#41](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/41) Require recipient consent before opening a live trade | OPEN | SOURCE CONFIRMED | trade_propose immediately reserves and sends trade_update to both parties. Need invite acceptance/decline/disconnect tests with two authenticated accounts. |
| [#42](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/42) Give Dorm owners an Unpublish control | OPEN | SOURCE CONFIRMED | Sanctuary UI offers Publish/Refresh; server has publish route only. Add owner unpublish lifecycle regression when implementation is authorized. |
| [#43](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/43) Local duels can start with a different creature than the selected lead | OPEN | SOURCE CONFIRMED | Local duel uses creatures.slice(0,3) and activeCreatureIdx:0 while talents use activeCreatureId. Cover a selected pet beyond the first three. |
| [#44](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/44) Harmony of the Arbor counts duel wins without checking lead-creature participation | OPEN | SOURCE CONFIRMED | App credits lead-creature-win whenever lead exists; outcome lacks contribution evidence. Define qualifying participation before changing eligibility. |
| [#45](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/45) Pay earned live-duel rewards if the winner reconnects within the grace window | OPEN | SOURCE CONFIRMED | finishRoom resolves UID through clients.get(participant.sessionId); missing socket skips payout. Reproduce winner disconnect around resolution with emulator wallet assertions. |
| [#46](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/46) Live duel Bonding Seals are unavailable for adoption at the Arbor | OPEN | Ledger/design conflict | Live rewards credit market wallet; Arbor uses wizard seals. Decide redemption or distinct currency wording before moving earned balances. |
| [#47](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/47) Prestige lineage checks can miss a rank reached by quest XP on the same win | OPEN | SOURCE CONFIRMED | Prestige predicates precede saga XP; Astral checks only newly hatched pets. Test both post-quest rank threshold and previously owned fusion pet. |
| [#48](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/48) Show Dorm tours with no ratings as unrated | OPEN | SOURCE CONFIRMED | listTours defaults to ratingAvg:5 at zero votes; UI renders it as a star score. Test explicit unrated presentation. |
| [#49](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/49) Define Shared Vault copy and transfer rules for gear | OPEN | Owner decision | Choose vault unlock sharing versus item transfer, including duplicate entry and legacy-save rules. |
| [#50](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/50) Decide whether the Rare Trial quest should pay out after a defeat | OPEN | Owner decision | Rare Trial attempt payout is intentionally expected by existing test; decide defeat eligibility before calling it a bug. |
| [#51](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/51) Decide whether Harmony of the Arbor requires a successful Rune-Catch | OPEN | Owner decision | Quest wording permits playing Rune-Catch. Decide success versus participation, then align miss/bullseye assertions. |
| [#52](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/52) Decide where catalog gear level requirements apply | OPEN | Owner decision | Catalog level requirement and equip path disagree. Decide enforcement policy before adding a gate. |
| [#53](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/53) Resolve the flat runestone limit and per-gear socket counts | OPEN | Owner decision | Choose global six-slot versus gear-based sockets, and stacking rules; test loadout transitions after decision. |
| [#54](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/54) Review rank-two spells granted by element starter decks | OPEN | Owner decision | Starter generator intentionally permits rank-two cards. PR #84 preserves that behavior; this is distinct from #68. |
| [#55](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/55) Decide whether guest and signed-in Shared Vaults should start with the same gear | OPEN | Owner decision | Guest and cloud starting vaults differ; decide whether parity is required. Migration retention is separately #21. |
| [#56](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/56) Clarify whether realm XP multipliers apply to saga quests | OPEN | Owner decision | Saga rewards are fixed while duel rewards scale by realm. Decide policy and align copy before implementation. |
| [#57](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/57) Resolve the unused resource update route in the game server | OPEN | Maintenance / partial | Resource route is registered; tests seed its store, with no identified gameplay caller. Decide retirement or supported use; no player-facing failure established. |
| [#58](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/58) Validate trade offers at the wallet settlement boundary | OPEN | SOURCE CONFIRMED hardening gap | settleTrade relies on caller amount validation; current WS caller checks safe integer bounds. Do not claim a reproduced remote exploit. |
| [#65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65) Bug Library v0.0.4 — coordinated bug & conflict resolution | OPEN | Project tracker | Bug Library v0.0.4 candidate is draft PR #83; not a game release or active autonomous service. |
| [#66](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/66) Configure repository rulesets for main and permanent bug-library | OPEN | Governance gap confirmed | Live rulesets list is empty; main reports protected:false. Policy workflow alone does not enforce branch settings. |
| [#67](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/67) Rare-element starter decks are broken: Sol/Chronos Trial Guardians can't deal damage, Umbra/Verdigris cast Ember, High Elf/Astral Kin wizards get no attack spells | OPEN | SOURCE CONFIRMED / proposed fix | Native rare decks remain deficient on main. PR #84 head ecb7e70 proposes repair with hosted evidence; unmerged. |
| [#68](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/68) Spell shop ignores unlockRank: rank-4 rare spells are buyable at rank 1 (trial element unlocks are never read) | OPEN | SOURCE CONFIRMED / proposed fix | Current shop/deck eligibility lacks the proposed progression gates; PR #84 addresses it. Do not conflate with starter design #54. |
| [#69](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/69) Co-op Resonance +15% is also applied to the boss's spells | OPEN | SOURCE CONFIRMED | Combat passes coopResonance to enemy effects too. Add equal-seed boss-damage comparison with and without player resonance. |
| [#70](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/70) Keen Ink can't be fused in live duels (server drops enchantPair) and casting it as a spell silently consumes it | OPEN | SOURCE CONFIRMED | readDuelAction omits enchantPair; live client excludes fusion flow. Cover pair validation and rejection of standalone enchant consumption. |
| [#71](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/71) Live spectate list is wiped on every zone change and never learns about new duels | OPEN | SOURCE CONFIRMED | Zone snapshot clears activeDuels; client replaces its list. Cover start/end and travel while a match remains active. |
| [#72](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/72) Crafting rank goes up on every transmute after 100 craft XP (craftXp never resets) | OPEN | SOURCE CONFIRMED | craftXp accumulates while fixed >=100 condition increments rank on every later click. Cover six sequential transmutes, then decide XP accounting. |
| [#73](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/73) README HQ: protect frozen snapshots and validate workspace drafts | CLOSED | Closed branch-scoped repair | Closed on readme-hq after merged #88 and hosted fixture validation; product README PR #62 is still separate and unmerged. |
| [#74](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/74) combat: remove wall-clock IDs from deterministic combat effects | OPEN | SOURCE CONFIRMED / prior reproduction | Combat effect IDs still use Date.now. Existing failing-before-fix reproduction is recorded in GitHub; not rerun by main suite. |
| [#75](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/75) multiplayer: live PvP and co-op fighters ignore the player's selected creature | OPEN | SOURCE CONFIRMED / prior reproduction | Live makeFighter still hardcodes Cinder Kitsune/Ember/stage 1/none. Existing PvP/co-op repro is recorded; distinct from local #43. |
| [#76](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/76) security(ws): rate-limit per-connection world messages and broadcasts | OPEN | SOURCE CONFIRMED / prior reproduction | World broadcast handlers lack per-connection throttles; payload cap limits size only. Prior bounded burst probe exists; no production load test here. |
| [#77](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/77) security(firestore): validate every element in bounded string arrays | OPEN | SOURCE CONFIRMED / prior reproduction | Rules validate index zero only for three arrays. Prior emulator rejection assertions exposed six accepted malformed writes. |
| [#78](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/78) world: key player mutes by stable identity instead of display name | OPEN | SOURCE CONFIRMED / prior reproduction | blockedNames filters bubble and log by sender name. Prior same-name browser reproduction exists; test reconnect identity policy too. |
| [#79](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/79) chore(deps): reconcile mixed Bun/npm root installs across CI jobs | OPEN | SOURCE CONFIRMED reproducibility conflict | Core/browser root install uses Bun; Firestore root install uses npm. Both lockfiles are used. Choose canonical installer; preserve isolated tools/ci npm. |
| [#80](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/80) Rowan fast-run animation has a discontinuity at the loop seam | OPEN | Proposed fix / partial | rowanAsset.ts still selects Run_Anime. PR #81 proposes Sprint at 27f16f3; PR matrix passed, branch run has separate WebKit failure. Do not report merged. |
| [#82](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82) security(firestore): prevent client-forged wizard economy and progression | OPEN | SOURCE CONFIRMED / High as filed | Owner writes permit progression/economy maps and term claims. Define trusted write boundary before changes; no new exploit or production writes performed. |

## Overlapping PRs

- #84 (`ecb7e7041835a36ea25048e480bb5c1c576dc373`): #67/#68 fix,
  open and not draft. Visible matrix checks pass; no merge assumed.
- #81 (`27f16f367f9a5ebf01a9780532a60e1aabd2a5d5`): #80 fix.
  PR validation passed while a separate branch validation has a WebKit failure.
- #86 (`c97a8ff3e0b87104d0bb475d94632b35590cb91d`): adds
  `tests/questRewards.test.ts`; does not implement a missing #13 payout or resolve
  #44/#50 eligibility. Visible seven-job checks pass.
- #36 and #33: separate agent branches with no visible check results in the
  inspected rollup. #38 must be reproduced at current #36 head before integration.
- #62 is the separate draft product README. This agent's README is scoped to
  `docs/agents/alderwatch/` to avoid collision.
- #37/#39 instructions, #40 assets, #63 privacy, #83 Bug Library, #85 earlier audit,
  #87/#89/#90 Test Vault and #91 Windows launcher are separate workstreams.
  Checks/mergeability vary and can change. They are not evidence that main
  contains those proposed changes.

## Coverage and limits

Inspected: live issue inventory/bodies and repository-wide issue/PR comments,
open PR metadata and visible checks, exact-SHA instructions and validation policy,
workflow, relevant `src/App.tsx`, combat, duel setup/view, WebSocket hub, market,
storage, Firestore rules, Tailor, Sanctuary and Academy paths, plus matching unit,
HTTP/WebSocket, guest-browser and emulator test definitions.

No new comprehensive security scan, dependency advisory scan, production requests,
real Google sign-in, two-account deployed trading, GPU assessment, load test or
owner playtest was performed. The matrix executes its existing scenarios, not
every acceptance criterion in this table. Skipped tests must remain reported.

The supplied local role guidance differs from live main. Both were read and the
mismatch is disclosed; this audit does not rewrite standing instructions.
Private planning stays in Notion. No private page contents or identifiers are
included in this public-safe report.

## Final runner receipt

**FAILURE: six jobs passed; WebKit failed one of 14 scenarios.** Run 43874521814
completed on `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`. All three core OS jobs,
Chromium, Firefox and Firestore passed. WebKit: 13 passed / 1 failed.

Failure: `tools/ci/human.pw.mjs:57`, “Rowan keeps gear stats from the Tailor and
saves them on reload,” exceeded its 90-second total test timeout. Logs, failure
context and the Playwright trace were inspected from the `guest-webkit-1`
artifact. The trace reaches the final post-reload `585 HP` visibility check at
about 89 seconds; the failure page snapshot also contains `585 HP`. Earlier
equip/HP assertions completed. This establishes a timing failure, not proven
loss of saved gear stats. Cumulative slow UI actions are a diagnostic lead;
the root cause is unverified. No retry, timeout increase or test weakening was
performed. Keep this as an intake candidate until focused reproduction and
deduplication establish its cause.

WebKit's Offline HUD, fountain, Rowan movement, model fallback and First Spark
scenarios passed in this attempt. Do not attribute this failure to the older
Offline HUD or First Spark timeout reports. The previous same-SHA green run does
not override this fresh failed attempt. No release or owner acceptance is implied.

Completed-job logs inspected during this run: core Vitest 54 passed / 12 skipped
(the emulator-dependent file is skipped in core); HTTP/WebSocket 4 passed;
Firestore rules 14 passed and emulator integration 12 passed; Chromium 14 passed;
Firefox 14 passed. These counts describe their respective suites and must not be
summed across the three identical core operating-system jobs as unique tests.

