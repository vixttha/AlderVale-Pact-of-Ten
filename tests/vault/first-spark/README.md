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

The Node summary checks for all three required receipts and detects missing files, stale identities and altered observations. Failed, skipped, blocked, missing and invalid results fail the combined verdict. The Chromium job retains the **synthetic** First Spark checkpoint snapshots, scenario, observation hashes, and three per-check receipts as a GitHub Actions artifact named `first-spark-<run>-<attempt>` for **one day**, on successful runs and on failures when snapshots exist. The exact checkout SHA, run, and attempt are recorded within the evidence. Compare each retained checkpoint to `observations.json`, then compare that document's SHA-256 with the per-check receipts. The run summary also shows the combined verdict. Only synthetic guest fixtures are permitted here: do not capture real user accounts, credentials, tokens, or production data. An early setup failure may have no artifact; that absence is not a pass.

Coverage starts at guest enrollment and ends at browser reload plus the quest reducer replay. The repeated notification check applies the quest event to the reloaded wizard. A later duel would have its own normal duel payout.
