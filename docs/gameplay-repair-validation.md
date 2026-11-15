# Gameplay repair validation

The repair candidate combines the audited gameplay changes and the playable Rowan
build with the current main branch. Use the existing AlderVale validation workflow
on standard public runners. Run core checks across Linux, Windows and macOS.
Run guest scenarios across Chromium, Firefox and WebKit. Use the demo Firestore
emulator for persistence and transactions.

For each ticket, inspect the entry point and its caller, check the corresponding
test or playthrough, then review the hosted result at the candidate SHA. Verify
the previous browser and emulator receipts again after integration.

| Rank | Issue | Expected behavior and verification |
| ---: | --- | --- |
| 1 | #16 | Firestore persists listings and Houses. Members can join and leave. Check concurrent joins, realm separation, and server-only storage in the emulator. |
| 2 | #14 | Buyer receives gear, seller receives funds, and one concurrent buyer succeeds. Check escrow and both wallets in the emulator. |
| 3 | #20 | Reopening the wallet retains the settled transfer, and replay keeps the same balances. Check both accounts in the emulator. |
| 4 | #19 | PvP surrender ends the duel. In co-op, the remaining player can continue. Check real WebSocket clients. |
| 5 | #18 | The other side wins when the first fighter times out. Check the real reconnect timer and participant result. |
| 6 | #17 | Mutual knockout draws and skips win rewards. Check the shared combat resolver and duel completion dispatch. |
| 7 | #22 | Guest settings survive reload, and signed-in settings persist on their account. Check browser reload and the Firestore patch. |
| 8 | #11 | Switching wizards clears the old scene peers and ignores messages from the old connection. Check the guest presence lifecycle. |
| 9 | #13 | New quest completions pay and display the listed rewards once. Check the shared reward rules and duel return. |
| 10 | #7 | Movement stops at the fountain boundary and can slide along it. Check the movement helper and world interaction. |
| 11 | #4 | The title and world display recovery controls with WebGL unavailable. Check the guest browser matrix. |
| 12 | #21 | A new cloud migration retains both vault items and previously claimed tiers. Check the transaction in the emulator. |
| 13 | #12 | Previous local sessions and other wizards on the same signed-in account are excluded from peer inspection. Check the presence filters and server trade guard. |
| 14 | #10 | The minimap shows Offline after a WebSocket loss. Check the live browser connection and forced disconnect. |
| 15 | #15 | Bazaar accepts integer prices between 1 and 1,000,000 only. Check invalid inputs and valid purchase settlement in the emulator. |
| 16 | #5 | The npm lockfile installs cleanly with the compatible esbuild. Check the Firestore job's clean npm install. |
| 17 | #23 | Flee and defeat no longer direct players to refill flasks. Check duel exit and leave the free retry rule in place. |

Quest IDs in legacy saves record completion without a separate payout receipt.
Those saves retain their progression. A historical payout would need a separate
migration decision. For live acceptance, use two signed-in players against the
configured Firestore database and complete an owner Rowan playthrough.
