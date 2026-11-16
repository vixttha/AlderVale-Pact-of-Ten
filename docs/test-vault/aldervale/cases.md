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
| G30-001 | Offline HUD | P0 | Playwright | Show `1 Online` with the fixture connection and `Offline` when it drops. Record failures or retries under issue #10. |
| G30-003 | Stale HUD peer on reconnect | P0 | Playwright | Show two players with one fixture peer, show Offline with no online count after a forced drop, and show only the local player on reconnect before a new peer snapshot arrives. |
| G34-001 | Narrow viewport | P1 | Playwright | Keep the title and creation controls reachable at the fixture's mobile viewport. Check other HUD controls and zoom separately. |
| G34-002 | WebGL recovery | P0 | Playwright | With WebGL unavailable, show a fallback during enrollment and world entry, keep settings usable, and preserve access after reload. |
| G36-001 | Owner desktop acceptance | P0 | Manual owner playthrough | On a pinned desktop build, complete title, guest creation, entry and movement in one realm, a solo duel, and persistence of the wizard and rewards after reload. |
| E15-001 | Game data integrity | P0 | Vitest | Check unique catalog IDs, valid starter decks, spell and creature references, quest givers and rewards, NPC and spawn data, and Term cosmetics. |
| E15-002 | Quest text and giver links | P1 | Ruby and Node.js | Read the shipped quest catalog as UTF-8 JSON, reject empty or damaged display text, and resolve each quest giver to exactly one campus NPC. |
| E24-001 | Browser compatibility | P0 | GitHub Actions and Playwright | Run the guest and Rowan suites in Chromium, Firefox, and WebKit and retain each attempt's results. |
| E24-002 | Core compatibility | P0 | GitHub Actions and Bun | Run the frozen install, lint, unit tests, build, and server integration on Ubuntu, Windows, and macOS. |
| E34-002 | Isolated test services | P0 | GitHub Actions, browser fixtures, and Firestore emulator | Run the guest suite with external hosts blocked and Firestore checks against the `demo-aldervale-ci` emulator. |
