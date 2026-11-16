# Connected repairs and acceptance — 2026-11-16

Worker: `codex-alderwatch`. Scope: connect completed work to its existing tickets.
Baseline: `main` at `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`.
This is an evidence index, not a second issue tracker or an acceptance record.

## Verified merged chain

- [#6](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/6), merge `85d81f24616183114ffa60895a023cc17299c710`.
- [#27](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/27), merge `f64f08b2ec66b8843bce56508ca854d8d363f131`.
- [#34](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/34), integration merge `8b2040011f7beeba5d9e1627eb6022e9d62cd72f`.
- [#60](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/60), specific #35 migration fix,
  merge `f44a00cda3a568f60ae27012488f6bf704088fcf`.
- [#61](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/61), First Spark browser stabilization,
  merge `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`.

All are merged and their merge commits are ancestors of the baseline.
The first three form the general gameplay-repair chain. #60 is the later
cross-account migration fix, and #61 changes First Spark test stability.

## Public runner receipts

[Run 43860977116](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43860977116) passed 7/7 at the baseline.
The newer [run 43874521814](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43874521814) passed six jobs;
WebKit passed 13/14 and timed out in the Rowan Tailor gear-reload scenario at
`tools/ci/human.pw.mjs:57`. It remains an overall failed run. It did not fail
the Offline HUD, fountain or First Spark scenarios.

Core: 54 passed / 12 skipped. Emulator: 14 rules checks plus the 12 integration
tests skipped by core. Chromium and Firefox: 14 each. No new CI run was needed
for this evidence-linking task. Existing run results were reverified directly.

## Ticket connections

Each linked GitHub issue now has a “Connected repair evidence” section with the
merged PR chain, exact-SHA source/test links, both CI receipts and its remaining
acceptance. Original report text, labels and issue states are preserved.

| Canonical issue | State at connection | Completed behavior | Remaining acceptance / disposition |
| --- | --- | --- | --- |
| [#4](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/4) | CLOSED | Title and world renderer creation have recovery UI rather than an uncaught blank-page failure. | Already closed. WebGL-unavailable browser regression passed in all three browsers in the latest run; no reopening or new acceptance is implied. |
| [#5](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/5) | CLOSED | The esbuild/Vite dependency conflict was repaired. Current Firestore CI performs a clean root npm install successfully. | Already closed. Keep mixed Bun/npm root-install policy separate under #79; do not remove the root npm lockfile as unused. |
| [#7](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/7) | CLOSED | Commons movement has a fountain collision boundary while refill interaction remains usable. | Already closed with its existing resolution. Collision/refill scenario passed in Chromium, Firefox and WebKit in the latest run. |
| [#10](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10) | OPEN | worldConnected drives Offline HUD text; socket close/error and cleanup clear stale presence. | Original report has a merged repair and matching three-browser regression. Owner closure decision remains; the latest unrelated WebKit gear-reload timeout does not negate this scenario's pass. |
| [#11](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/11) | OPEN | clearPresence clears peers, session and inspection state; wizard switching invokes it, and old socket messages are ignored. | The existing browser check verifies disconnect/cleanup, not a complete wizard-A -> wizard-B scene assertion. Direct switch/no-leftover-avatar acceptance still needs evidence. |
| [#12](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/12) | OPEN | Inspection requires a connected current peer; previous local session IDs are filtered. Server trade_propose rejects same verified account targets. | No direct stale-self click regression was located. Verify A -> B switching, click/nametag exclusion and rejection of self/same-account trades. Do not claim all same-owner presence filtering is established. |
| [#13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) | OPEN | applySagaEvent grants the catalog's quest rewards once. First Spark browser verification includes victory, exact receipt and reload; merged #61 stabilizes that scenario. | Owner guest-loop playthrough and remaining end-to-end Arbor/Rare Trial acceptance remain. PR #86 is OPEN at c97a8ff3e0b87104d0bb475d94632b35590cb91d and adds tests only. #44 governs lead participation, #50 trial defeat eligibility, #51 Rune-Catch eligibility and #56 reward scaling; none is silently resolved here. |
| [#14](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/14) | OPEN | Bazaar settlement transfers gear to the buyer, credits the seller, debits the buyer and serializes concurrent purchases in Firestore. | Emulator covers one successful concurrent buyer and both balances. Signed-in buyer/seller UI against the configured backend remains unverified. Equipped escrow ownership is separate #28; client progression forging is separate #82. |
| [#15](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/15) | OPEN | postListing uses isBazaarPrice to reject invalid/noninteger/out-of-range values before writes. | Emulator checks 0, -1, fractional, NaN, numeric-string and over-limit inputs and valid settlement. Direct authenticated HTTP/UI malformed-price acceptance is not established by that function-level test alone. |
| [#16](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/16) | OPEN | Bazaar and Houses use server-mediated Firestore realm paths; House founding/join/leave transactions and concurrent membership tests exist. | Emulator demonstrates transactions. Configured production persistence across process restart, credentials/database alignment and signed-in UI remain separate acceptance steps. |
| [#17](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/17) | OPEN | The combat resolver checks mutual knockout before victory and returns draw. | Shared mutual-burning draw regression passes in core. Explicit end-to-end no-win-reward/no-quest-credit acceptance is not fully established by this resolver test; inspect it before closure. |
| [#18](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/18) | OPEN | duelView presents each participant's side consistently, including opposite-side victory when the first fighter forfeits after reconnect timeout. | Real-socket regression passes using fixture/guest clients. Two signed-in browser result/wallet checks remain separate. #45 is the absent winning socket payout defect, not this perspective repair. |
| [#19](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/19) | OPEN | Client sends duel_leave and server forfeit handles PvP exit; co-op allows the remaining partner to continue. | Real-socket server regressions pass. Two-client browser Flee interaction, opponent continuation/result and signed-in settlement acceptance remain distinct. |
| [#20](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/20) | OPEN | settleTrade persists both realm market wallets transactionally and records replay receipts. Emulator checks retained balances, replay and insufficient funds. | Verify both signed-in clients reload/reconnect and display the settled MARKET wallet. Wizard Florins are a separate ledger. Consent #41 and settlement validation #58 are separate open work. |
| [#21](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/21) | OPEN | Guest import unions claimedTermTiers and sharedVault with cloud state in the migration transaction. | Emulator checks retention and migration skip/replay. Real Google authentication with existing guest claims/vault remains unverified. #35 is the later cross-account ownership repair; #55 is fresh-account starter policy. |
| [#22](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/22) | OPEN | Guest settings persist across reload; account settings are saved without overwriting unchanged fields. | Guest browser scenario passed in all three browsers; owning-account emulator assertion passed. Real signed-in reload and chosen cross-device behavior remain separate acceptance. |
| [#23](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/23) | CLOSED | Flee/defeat feedback no longer directs players to refill unspent flasks; accepted free-retry semantics are preserved. | Already closed. Flee/refill-feedback browser scenario passed in all three browsers. This is a copy/feedback repair, not a claim that flasks now decrement. |
| [#35](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/35) | CLOSED | Migration detects guest wizard IDs already linked to a different owner and allows the second account to enroll without corrupting either account. | Already closed. First import, second-account enrollment and concurrent imports have emulator evidence. Real Google provider sign-in is not claimed. |

## Handoff

Thirteen connected tickets remain open (#10–#22); five were already closed
(#4, #5, #7, #23, #35). Connecting their evidence does not close or reopen them.
Owner gameplay acceptance, signed-in production checks and design decisions are
separate gates, not one blanket acceptance.

PR #86 is still open and proposes additional #13 regression tests. It is linked
as proposed work, not merged implementation. Keep #28, #41, #44–#47, #50/#51/#56,
#58, #79 and #82 separate where they track distinct unresolved causes or decisions.

The public records contain only public-safe engineering evidence. Private
coordination is recorded in the existing project dashboard and handoff.
No source, workflow, dependency, release or sharing setting changed. Local docs
remain uncommitted; the evidence links were saved directly to GitHub issues.

