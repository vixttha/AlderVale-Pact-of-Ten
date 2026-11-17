# AlderVale Test Vault v0.0.2 — first-playable cases

These cases build on the [Vault case catalog](../public-template/case-catalog.md). Project-specific cases can add an ID within an existing topic. The [execution and evidence guide](README.md) links the implemented checks and records gaps.

| Case | Area | Priority | Suggested implementation | Expected outcome |
|---|---|---|---|---|
| G01-001 | Guest onboarding | P0 | Playwright | From the title, start the Academy Journey as a fresh guest, name a wizard, and enter the campus with Rowan visible. |
| G01-002 | Enrollment retry | P0 | Playwright | When the first guest save fails, retain wizard form input and show the failure. Retrying and reloading yields one wizard. |
| G02-001 | Realm and wizard persistence | P0 | Playwright | Create a guest wizard in one realm and reload. The wizard remains selectable there and does not appear in the other realm. |
| G04-001 | XP threshold | P0 | Vitest | Awards of 146, 147, and 148 XP from level 1 yield levels 1, 2, and 2 and leave 146, 0, and 1 XP respectively. |
| G04-002 | Progression limits | P0 | Vitest | Carry unused XP across multiple threshold crossings, update the rank, and cap level at 50, rank at 20, and banked XP at 10,000,000. |
| G04-003 | Independent progression reference | P0 | Python and Node.js | Compare 126 combinations of starting level, saved XP, and award size against an independent cumulative XP model. Verify rollover, rank bands, and caps. |
| G06-001 | Spell damage contract | P0 | C++ / CTest | Check neutral, mirror and opposing damage, modifier consumption, critical and block thresholds, rounding and the damage floor against the live rules. |
| G06-002 | Health and stat invariants | P0 | C++ / CTest | Check derived wizard stats, regen caps, knockout, stun and status refresh, and the round pip limit. |
| G06-003 | Turn coin and action order | P0 | C++ / CTest | Resolve the coin winner first, retain same-team order, and skip casts with an invalid selection, inadequate pips or a stunned actor. |
| G09-001 | Solo duel | P0 | Playwright | As Rowan in Breeze, start the First Spark solo duel, win it, claim victory, and return to the campus. |
| G09-002 | Deterministic duel replay | P0 | C++ / CTest | Replay three rounds from explicit random inputs and compare checkpoints, terminal victory and simultaneous knockout draw. |
| G13-001 | First Spark rewards | P0 | Vitest and Playwright | The controlled Breeze duel reports +388 XP, +273 Florins, and +5 Spell Shards in total. The quest completion and saved rewards survive reload. The Vitest storage regression checks that replay cannot pay the quest a second time. |
| G13-002 | Other campus quests | P0 | Vitest and Playwright | Verify Harmony of the Arbor and Rare Trial payouts for each completion path covered by the approved rules. Track pending behavior and acceptance in GitHub issue #13. |
| G13-003 | Independent First Spark reference | P0 | Python and Node.js | The saga reducer adds the listed 90 XP, 110 Florins, and 3 Spell Shards once. Preserve previous completion and other currencies. Replay after a JSON round trip leaves the result unchanged. |
| G13-004 | Published quest payout contract | P0 | Ruby and Node.js | Check the exact XP, Florins, and Spell Shards listed for First Spark, Harmony of the Arbor, and Trial of the Hidden Crown. Each quest giver resolves to exactly one campus NPC. |
| G13-005 | Harmony second win | P0 | Vitest | Persist the first lead-creature win. A second event grants 140 XP, 160 Florins, and 4 Spell Shards, preserves completion on reload, and leaves the other realm untouched. |
| G13-006 | Rune-Catch quest event replay | P0 | Vitest | Apply a Rune-Catch event. After reload, retain the Harmony payout and ignore a repeat of the same event. |
| G13-007 | Harmony route switch | P0 | Vitest | Save one lead-creature win. Completing via Rune-Catch preserves the partial counter and prevents a later lead-creature win from paying Harmony again. |
| G13-008 | Rare Trial victory persistence | P0 | Vitest | Apply a Rare Trial victory event at Rank 4. Retain the 260 XP, 320 Florins, and 8 Spell Shards after reload and ignore a repeated victory event. |
| G13-009 | Multiple quest payouts | P0 | Vitest | Persist First Spark and then Harmony on the same wizard. Keep both completion flags, both payouts, and the expected total XP and currencies. Ignore both replays. |
| G13-010 | Exact saga completion boundaries | P0 | F# and Node.js | Compare event prefixes to an independent payout and XP model near completion, rollover and cap boundaries. |
| G13-011 | Harmony route switching | P0 | F# and Node.js | Interleave lead-creature wins, Rune-Catch and save boundaries. Preserve the winning route and pay once. |
| G13-012 | Interleaved saga quests | P0 | F# and Node.js | Check every event sequence of up to four events against the independent model. Preserve other quests, progress and currencies. |
| G13-013 | Saga state at every save boundary | P0 | F# and Node.js | Reload once at each possible boundary and at all boundaries together over short event sequences. Compare state before and after each reload and preserve the other realm. |
| G13-014 | Saga completion replay | P0 | F# and Node.js | Repeat completion routes after a reload and intervening events. Preserve payout totals and completion flags. |
| G17-001 | Tailor persistence | P1 | Playwright | Claim the Starstitch Brim Hat from the Realm Vault, equip it at the Tailor, and confirm the +10 HP persists after reload. |
| G21-002 | Rowan fallback and retry | P1 | Vitest and Playwright | Failed Rowan model loading leaves the Classic enrollment path usable. The lifecycle suite checks that a user retry can load the model. |
| G21-003 | Embedded binary buffer bounds | P1 | Rust / Cargo | Buffer views fit inside the declared binary payload. Invalid lengths, truncated data, and overflowing spans are rejected. |
| G21-004 | Mesh accessor ranges | P1 | Rust / Cargo | Vertex and index accessors fit their views with the declared stride. Truncated or undersized interleaved data is rejected. |
| G21-005 | Skinned vertex joint indices | P1 | Rust / Cargo | Each encoded vertex joint index refers to a joint in the mesh node's assigned skin. An out-of-range value is rejected. |
| G21-006 | Inverse bind matrices | P1 | Rust / Cargo | Declared float MAT4 data covers the skin's joints and contains only finite numbers. Short and non-finite matrix data is rejected. |
| G21-007 | Animation sampler inputs and outputs | P1 | Rust / Cargo | Keyframe timestamps are finite, nonnegative, and strictly increasing. Sample dimensions and counts match the target and interpolation. |
| G28-001 | Guest progress retry | P0 | Playwright | Keep a failed progress save visible. After retry and reload, preserve wizard and realm changes and prevent a second claim. |
| G28-003 | Corrupt guest save | P0 | Vitest | Invalid Breeze save JSON gives first-run defaults. Saving a replacement restores Breeze and preserves an existing Horizon wizard and Term XP. |
| G28-004 | Browser guest-save recovery | P0 | Playwright | Start with a valid Horizon guest and corrupt Breeze JSON. Enroll in Breeze, reload, and verify both wizards remain in their realms and the Horizon save is byte-for-byte unchanged. |
| G28-005 | Failed save replacement | P0 | Vitest | When storage rejects an updated Breeze save, report failure and preserve the last valid save in both realms. A successful retry writes only Breeze. |
| G28-006 | Guest settings recovery | P1 | Vitest | Round-trip guest audio, camera, and solo speed settings. Recover defaults for corrupt values, retain valid fields, and preserve the last good save if a write fails. |
| G28-007 | Guest v1 save integrity | P0 | C++ / CTest | Preserve wizard data, quest rewards and realm isolation across JSON reload, corruption recovery, a write failure and a retry. |
| G28-008 | Guest account and wizard identity | P0 | C# / System.Text.Json | Read real Breeze and Horizon guest v1 writes and verify account, realm and wizard indexing. Reject foreign wizard and realm references. |
| G28-009 | Exact guest balances and progression | P0 | C# / System.Text.Json | Preserve exact currency integers, Unicode name, XP, level, rank, completed First Spark and a separate partial Arbor counter. |
| G28-010 | Guest creature ownership and active selection | P0 | C# / System.Text.Json | Read distinct creature rosters and verify realm, owner, wizard, species, stage, talents and the active creature ID. Reject cross-wizard references. |
| G28-011 | Guest v1 optional fields | P1 | C# / System.Text.Json | Read a legacy-shaped v1 save without gallery or quest counters and preserve its wallet, progression and ownership. |
| G28-012 | Invalid guest save diagnostics | P1 | C# / System.Text.Json | Reject truncated JSON, incorrect or imprecise numeric values, duplicate and missing wizard IDs, and orphan creature groups with precise diagnostic paths. |
| G30-001 | Offline HUD | P0 | Playwright | Show `1 Online` with the fixture connection and `Offline` when it drops. Record failures or retries under issue #10. |
| G30-003 | Stale HUD peer on reconnect | P0 | Playwright | Show two players with one fixture peer, show Offline with no online count after a forced drop, and show only the local player on reconnect before a new peer snapshot arrives. |
| G30-004 | Guest identity on reconnect | P0 | Go WebSocket | A disconnected guest who reconnects with their own saved ticket retains the wizard ID and receives a new connection ID. |
| G30-005 | Presence after disconnect | P0 | Go WebSocket | An observer receives the departing session's player-left event. A fresh snapshot keeps the remaining peer and excludes the old session. |
| G30-006 | Reconnect roster scope | P0 | Go WebSocket | A reconnected guest sees the correct same-zone peer. The snapshot excludes the old session and fixtures in another zone or realm. |
| G30-007 | Zone transition presence | P0 | Go WebSocket | Existing peers in the departing and arriving zones receive the corresponding events, and the moving guest gets the new roster. Test two zone pairs. |
| G30-008 | Fresh guest session | P1 | Go WebSocket | A new session without a saved ticket gets a distinct wizard ID despite reusing a display name. The old identity stays absent. |
| G34-001 | Narrow viewport | P1 | Playwright | Keep the title and creation controls reachable at the fixture's mobile viewport. Check other HUD controls and zoom separately. |
| G34-002 | WebGL recovery | P0 | Playwright | With WebGL unavailable, show a fallback during enrollment and world entry, keep settings usable, and preserve access after reload. |
| G36-001 | Owner desktop acceptance | P0 | Manual owner playthrough | On a pinned desktop build, complete title, guest creation, entry and movement in one realm, a solo duel, and persistence of the wizard and rewards after reload. |
| E15-001 | Game data integrity | P0 | Vitest | Check unique catalog IDs, valid starter decks, spell and creature references, quest givers and rewards, NPC and spawn data, and Term cosmetics. |
| E15-002 | Quest text and giver links | P1 | Ruby and Node.js | Read the shipped quest catalog as UTF-8 JSON, reject empty or damaged display text, and resolve each quest giver to exactly one campus NPC. |
| E24-001 | Browser compatibility | P0 | GitHub Actions and Playwright | Run the guest and Rowan suites in Chromium, Firefox, and WebKit and retain each attempt's results. |
| E24-002 | Core compatibility | P0 | GitHub Actions and Bun | Run the frozen install, lint, unit tests, build, and server integration on Ubuntu, Windows, and macOS. |
| E24-003 | Launcher paths with spaces | P0 | PowerShell | Install and start the Windows game from a checkout inside a parent folder with spaces. |
| E24-004 | Exact launcher revision | P0 | PowerShell | Match the startup receipt's full commit SHA to the actual checkout. |
| E24-005 | Launcher without Node | P1 | PowerShell | Show Node installation guidance, exit 1 and skip installation under a restricted PATH. |
| E24-006 | Failed launcher update recovery | P0 | PowerShell | Start the saved build after an unavailable fetch and keep its revision receipt. |
| E24-007 | Occupied launcher port | P1 | PowerShell | Explain the port collision, exit 1 and keep the previous working-build receipt. |
| E28-001 | HTTP asset revalidation | P1 | Java 21 HTTP client | Matching ETags produce a bodyless 304 and nonmatching ETags return the full current GLB. |
| E30-001 | Built JavaScript delivery | P0 | Java 21 HTTP client | Each entry-page module script resolves to a JavaScript response matching the built bytes. |
| E30-002 | Built CSS delivery | P0 | Java 21 HTTP client | Each entry-page local stylesheet returns CSS with the exact built bytes. |
| E30-003 | Full GLB HTTP delivery | P1 | Java 21 HTTP client | The server returns bytes equal to the built Rowan and prototype model files. |
| E30-004 | GLB HTTP byte ranges | P1 | Java 21 HTTP client | First and last ranges of each model return 206, the exact Content-Range and the matching bytes. |
| E32-001 | Stale Graphify main snapshot | P0 | Bash and Git | Skip an older source revision when remote main advances and preserve the archived snapshot branch. |
| E32-002 | Unsupported Graphify publication ref | P0 | Bash and Git | Refuse a feature-ref publication without explicit opt-in and preserve the archived snapshot. |
| E32-003 | Explicit Graphify commit snapshot | P1 | Bash and Git | Append a snapshot under the exact commit SHA and preserve the main graph and receipt. |
| E32-004 | Damaged Graphify version snapshot | P0 | Bash and Git | Detect a retained graph checksum mismatch and abort without rewriting the archive. |
| E32-005 | Concurrent Graphify publication | P0 | Bash and Git | Recover from a non-fast-forward push rejection and retain both publishers' snapshots. |
| E34-002 | Isolated test services | P0 | GitHub Actions, browser fixtures, and Firestore emulator | Run the guest suite with external hosts blocked and Firestore checks against the `demo-aldervale-ci` emulator. |
