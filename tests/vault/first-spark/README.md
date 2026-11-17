# First Spark cross-language evidence

The existing Playwright First Spark scenario runs in the guest browser matrix. On public Chromium, the same run also supplies evidence to the C# save validator and F# quest model. The combined verdict appears on the GitHub Actions run page under **First Spark cross-language verdict**.

| File | Producer and meaning |
|---|---|
| [scenario.json](scenario.json) | Version 1 fixture identity, synthetic wizard and realm, action and checkpoint names, and required check IDs. |
| before-duel.json, after-victory.json, after-reload.json | The browser's raw guest save at each checkpoint. |
| after-replay.json | The Node adapter's observation after replaying the actual solo-win quest reducer on the reloaded wizard. This is a reducer replay. |
| observations.json | Schema version, scenario ID, tested checkout SHA, workflow run and attempt, and the SHA-256 of every checkpoint. |
| `check-id-result.json` | Each required check's status and diagnostic, bound to the observation digest and the same checkout, run and attempt. |

C# reuses the Vault's guest save reader. It checks identity, completion, progression and balances across reload and rejects a changed realm. F# reuses the independent quest model, accounts for the normal Breeze solo-duel payout, and checks the combined reward and replay. A duplicate-reward control exercises its comparison.

The Node summary checks for all three required receipts and detects missing files, stale identities and altered observations. Failed, skipped, blocked, missing and invalid results fail the combined verdict. The runner creates evidence files in its temporary directory. Use the public run summary and individual steps for review.

Coverage starts at guest enrollment and ends at browser reload plus the quest reducer replay. The repeated notification check applies the quest event to the reloaded wizard. A later duel would have its own normal duel payout.
