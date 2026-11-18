# AlderVale Test Vault

Use this as AlderVale's testing and acceptance record for the guest first-playable loop. Start with the [project cases](cases.md) for title, guest wizard creation, realm entry, one solo duel, and persistence after reload. The [game catalog](../game-catalog.md) and [engineering catalog](../engineering-catalog.md) cover the broader backlog. The reusable starter is maintained on [`Test-Vault`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/Test-Vault). For v0.0.3 setup and execution receipts, use the [pinned starter guide](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/557f640f2c5b847733d779fb6bd320481df58d0d/starter/test-vault/README.md). The [in-branch historical starter](../public-template/README.md) supplies the existing adoption fixtures. The [language and test backlog](language-test-backlog.md) maps additional test ideas to AlderVale.

## Suite status and CI evidence

### In use

These suites are wired into the AlderVale workflows. Each linked run establishes results for its own checkout.

| Suite | Coverage | Evidence |
|---|---|---|
| Playwright, Vitest, Node.js, and Firestore emulator | Guest enrollment, First Spark, reload, game rules, HTTP/WebSocket behavior, and emulator access and save checks. | [Game validation on `main` at `fced403`](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43991718931) |
| Python, Ruby, Rust, C++, C#, and F# | Reference progression, quest catalog, binary assets, combat and save contracts, and independent quest checks. | [Vault catalog and adoption at `29105a5`](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43934451596) |
| Go and PowerShell | Guest presence on Linux and the Windows owner-play launcher. | [Vault game validation for the consolidation checkout](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43934451734) |
| Bash and Graphify MCP | Publisher contracts, graph construction, and source readback. The branch run publishes the live game-test graph. | [Graphify branch run at `60e15a1`](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/44249373662) · [Live graph and receipt](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/graphify-snapshots/test-vault) |

### Draft suites

These results come from review checkouts. Keep that scope when citing them.

| Draft | Coverage | Evidence |
|---|---|---|
| [Java asset delivery #128](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/128) | Built frontend assets and full, partial, and conditional model responses. | [Linux Core job](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43992240187/job/133735492406) |
| [Haskell spell cards #131](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/131) | Draw, discard, targeting, sideboard, and reshuffle behavior. | [Vault catalog job](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/44005225831/job/133778818768) |
| [Lua campus movement #132](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/132) | Campus movement, boundaries, and obstacle collision. | [Vault catalog job](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/44013506140/job/133805823710) |
| [First Spark shared evidence #134](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/134) | Chromium captures a guest duel and save reload. C# checks persistence and F# checks rewards and replay against that evidence. | [Chromium verdict](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/44075871650/job/134013607982) |

Use the [validation workflow](../../../.github/workflows/validate.yml), [Vault adoption workflow](../../../.github/workflows/test-vault-template.yml), and [Graphify workflow](../../../.github/workflows/graphify.yml) for new runs. Record the actual tested checkout, PR base and head, and run attempt. Keep automated results and [owner playthroughs](#owner-desktop-playthrough--g36-001) separate. For graph-based findings, match the graph receipt to the current branch SHA and confirm the pinned source.

## Game case coverage

| Case ID | Issue | What it verifies | Test or checklist | CI job | Remaining gap |
|---|---|---|---|---|---|
| G01-001, G09-001, G13-001 | [#13][issue13] | Guest enrollment, First Spark victory, and reward persistence | [Browser journey][human], [save tests][save] | Browser, Core | Owner desktop result |
| G01-002, G02-001, G28-001 | | Enrollment retry, realm separation, and failed saves | [Guest browser suite][guest] | Browser | |
| G04-001 to G04-003 | | XP thresholds, rollover, rank, and caps | [Vitest][xp], [Python reference][python] | Core, Vault catalog | |
| G13-002 | [#13][issue13] | Harmony and Rare Trial quest award logic | [Quest reducer tests][reducer] | Core | In-game Arbor and Rare Trial completion |
| G13-003, G13-004 | [#13][issue13] | First Spark replay and the three published payout schedules | [Python reference][python], [Ruby catalog][ruby] | Vault catalog | Arbor and Rare Trial in-game completion |
| G13-005 to G13-009 | [#13][issue13] | Harmony's two paths, mixed events, Rare Trial victory, and one-time payouts across saves | [Guest quest save tests][save] | Core | In-game event eligibility and delivery |
| G17-001, G21-002 | | Equipped gear persistence, Classic fallback, and Rowan model retry | [Rowan browser suite][human], [lifecycle Vitest][rowan] | Browser, Core | |
| G21-003 to G21-007 | | Embedded GLB bounds, mesh strides, skin indices and matrices, and animation sampler shape | [Rust asset contract][rust-assets] | Vault catalog | Embedded, non-sparse glTF 2.0 geometry and animation. Rendering and animation feel have separate checks. |
| G28-003 to G28-005 | | Corrupt save recovery and failed replacement without affecting another realm | [Save tests][save], [guest browser suite][guest] | Core, Browser | |
| G28-006 | [#22][issue22] | Settings boundaries, corruption and write recovery | [Guest settings Vitest][settings] | Core | Signed-in settings reload |
| G30-001, G30-003 | [#10][issue10] | Offline HUD and stale-peer removal across reconnect | [Guest browser suite][guest] | Browser | |
| G34-001, G34-002 | [#4][issue4] | Narrow enrollment and WebGL fallback | [Guest browser suite][guest] | Browser | HUD zoom, reduced motion, and physical-device behavior |
| E15-001, E15-002 | | Data integrity and quest giver references | [Catalog Vitest][data], [Ruby catalog][ruby] | Core, Vault catalog | |
| E24-001, E24-002, E34-002 | | Browser and OS compatibility plus isolated backend checks | [Game workflow][game], [Firestore checks][firestore] | Browser, Core, Firestore emulator | Live sign-in |
| G30-004 to G30-008 | [#10][issue10] | Guest identity, disconnect cleanup, scoped rosters, and zone changes against the real server | [Go presence suite][go-presence] | Linux Core | Browser HUD, signed-in sessions, and duel recovery have separate coverage. |
| G06-001 to G06-003, G09-002 | | Damage, combat state, team order and replay checkpoints | [C++ contracts][cpp] | Vault catalog | Browser and live duel behavior have separate coverage. |
| G28-007 | [#13][issue13] | Guest v1 serialization, recovery, reward idempotence and realm isolation | [C++ contracts][cpp] | Vault catalog | Browser storage and signed-in saves have separate coverage. |
| G28-008 to G28-012 | [#13][issue13] for reward fields | Guest v1 cross-runtime save checks for identity, balances, progression, creature ownership, optional fields and invalid payload diagnostics | [C# guest save suite][csharp-save] | Vault catalog | This suite checks specific guest v1 fields. Browser storage, signed-in sync and future migrations have separate evidence. |
| G13-010 to G13-014 | [#13][issue13] | Quest completion boundaries, mixed sequences, save/reload and one-time rewards | [F# saga model][fsharp-quests] | Ubuntu Vault catalog | Event eligibility in the UI and live services have separate evidence. |
| G36-001 | | First-playable guest loop | [Owner desktop playthrough](#owner-desktop-playthrough--g36-001) | Manual | Pending owner result |

[issue4]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/4
[issue10]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10
[issue13]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13
[issue22]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/22
[rust-assets]: ../../../tests/vault/rust/tests/glb_contract.rs
[reducer]: ../../../tests/questRewards.test.ts
[human]: ../../../tools/ci/human.pw.mjs
[guest]: ../../../tools/ci/guest.pw.mjs
[save]: ../../../tests/vault/guestQuestSave.test.ts
[xp]: ../../../tests/vault/progression.test.ts
[python]: ../../../tests/vault/first_playable_reference.py
[ruby]: ../../../tests/vault/quest_catalog.rb
[rowan]: ../../../tests/rowanLifecycle.test.ts
[settings]: ../../../tests/vault/guestSettings.test.ts
[data]: ../../../tests/vault/gameData.test.ts
[game]: ../../../.github/workflows/validate.yml
[go-presence]: ../../../tests/vault/go/guest_presence_test.go
[cpp]: ../../../tests/vault/cpp/README.md
[csharp-save]: ../../../tests/vault/csharp/README.md
[windows-launcher]: ../../../tests/vault/powershell/README.md
[bash-graphify]: ../../../tests/vault/bash/README.md
[fsharp-quests]: ../../../tests/vault/fsharp/README.md
[firestore]: ../../../tools/ci/firestore.check.mjs

### Test quality

Follow the [Test Vault law](../../../PROJECT_RULES.md#test-vault-reliability-and-reuse). For the Rust batch, the same checks read Rowan and controlled valid and malformed GLBs. The reference model also exercises geometry checks on a second asset. The Rust checks cover embedded GLB data and explicitly reject unsupported sparse accessors or extensions that change the geometry or animation data layout. If future assets use those features, update the profile and fixtures before including them.

### Adding a language in batches of five

Choose one language and five distinct checks tied to real behaviors or GitHub issues. Add case IDs to the catalog and link the executable tests here. Keep existing runtime and runner discovery where it works. If a suite moves, update its discovery, commands, and workflow path filters together. Record the exact public-runner checkout and results before starting the next batch. List tools and techniques without implemented tests in the language backlog.

### Commands used by CI

Run these from the repository root unless the command specifies a prefix. Use Node 24 and Bun 1.4.4 for the game suites. Build the app before running browser or built-server checks. For the browser and rules lanes, install the locked tools with `npm ci --prefix tools/ci --ignore-scripts --no-audit --no-fund`. Install the chosen browser with `npx playwright install <browser>` from `tools/ci`.

| Lane | Command |
|---|---|
| Core | `bun install --frozen-lockfile`, then `bun run validate:core` |
| Focused Vault unit tests | `bun run test tests/vault/gameData.test.ts tests/vault/guestQuestSave.test.ts tests/vault/guestSettings.test.ts tests/vault/progression.test.ts` |
| Browser | `npm --prefix tools/ci run test:browser -- --project=chromium`. The Linux CI lane uses `xvfb-run` with the headed browser and repeats on Firefox and WebKit. |
| Firestore rules | `npm --prefix tools/ci run test:rules` with Java 21. The full CI lane also runs the Firestore integration tests in the same demo emulator. |
| Independent rule reference | `python3 tests/vault/first_playable_reference.py -v` with Python 3.12 and Node 24. |
| Ruby quest catalog | `ruby tests/vault/quest_catalog.rb` with Node 24 and the Ruby bundled on the public Ubuntu runner. |
| Rust binary asset contract | `cargo +1.95.0 test --locked --manifest-path tests/vault/rust/Cargo.toml` |
| Go realm presence | From `tests/vault/go`, run `go test -mod=readonly -count=1 -timeout=2m -v ./...` with Go 1.27.4, Node 24, and the repository’s installed dependencies. |
| C++ gameplay contracts | Follow the [C++20, Node 24 and CTest commands][cpp]. |
| C# guest save contracts | Follow the [pinned .NET SDK and Node commands][csharp-save]. |
| Windows launcher contracts | Run the [PowerShell suite][windows-launcher] on public Windows Core. |
| Graphify publisher contracts | Run the [Bash suite][bash-graphify] in the existing public Ubuntu Graphify job. |
| F# saga sequence contracts | Run the [F# suite][fsharp-quests] in the public Ubuntu Vault catalog job. |
| Project case table | `python3 docs/test-vault/public-template/starter/test-vault/validate_catalog.py --catalog docs/test-vault/aldervale/cases.md` |

## Evidence on verified main

The [main push validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43991718931) passed all seven jobs at `fced4038c1dfa655c223d1bcbbdf3c18593b1e1f`. The [First Spark stabilization](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/61) is included in that revision. Apply these results to that recorded build and retain a fresh receipt for subsequent changes.

## Owner desktop playthrough — G36-001

Record the build SHA, date, operating system, browser, and a pass or fail for each step. Start as a fresh guest in Breeze and use one named wizard.

| Step | Record |
|---|---|
| Title | The title loads and the guest entry action is usable. |
| Wizard | The new Rowan wizard can be selected and enters the world once. |
| Realm | Breeze loads and the wizard can move in the campus. |
| Duel | Start and win one solo First Spark duel. Record the victory and the reward values displayed. |
| Reload | Return to the wizard and verify the same realm, quest completion, Florins, and Spell Shards. |

Use the [case and receipt form](../public-template/case-and-receipt.md) for the result. Link any failures to the existing GitHub issue or create a report through normal issue triage. Automated guest and emulator evidence has its own record. Live sign-in and owner acceptance require their own observations.
