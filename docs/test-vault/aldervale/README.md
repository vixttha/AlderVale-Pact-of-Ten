# AlderVale Test Vault v0.0.2

Use this as AlderVale's testing and acceptance record for the guest first-playable loop. Start with the [28 project cases](cases.md) for title, guest wizard creation, realm entry, one solo duel, and persistence after reload. The [game catalog](../game-catalog.md) and [engineering catalog](../engineering-catalog.md) cover the broader backlog. The [reusable starter](../public-template/README.md) is the template behind this project instance. The [language and test backlog](language-test-backlog.md) maps additional test ideas to AlderVale.

## What runs on AlderVale's public GitHub runners

The [AlderVale validation workflow](../../../.github/workflows/validate.yml) supplies the seven existing game jobs. The [Test Vault adoption workflow](../../../.github/workflows/test-vault-template.yml) checks the project case table and the broader case catalog, runs the independent Python reference against the real TypeScript rules, and checks the shipped quest catalog export with Ruby. For a pull request, link the run and record the actual tested checkout, base, head, and attempt. Keep automated results and owner observations separate.

| Cases | Check on the public runners | Coverage and gaps |
|---|---|---|
| G01-001, G09-001, G13-001 | [First Spark browser journey](../../../tools/ci/human.pw.mjs#L123) and [quest save Vitest](../../../tests/vault/guestQuestSave.test.ts) | Browser covers the controlled Breeze duel, victory receipt, and reload. Vitest covers quest reward idempotency and realm isolation. The owner desktop result is separate. |
| G01-002, G02-001, G28-001 | [Guest browser suite](../../../tools/ci/guest.pw.mjs) | Checks enrollment retry, realm separation, and failed progress saves. |
| G04-001, G04-002 | [Progression Vitest](../../../tests/vault/progression.test.ts) | Tests exact threshold boundaries, multi-level rollover, and progression caps. |
| G04-003, G13-003 | [Python reference suite](../../../tests/vault/first_playable_reference.py) | Compares 126 award inputs with a cumulative XP model and checks the exact First Spark reducer result and replay after JSON serialization. |
| G13-004 | [Ruby quest catalog contract](../../../tests/vault/quest_catalog.rb) and [issue #13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) | Checks all three published payouts and quest giver mappings. In-game Arbor and Rare Trial completion paths still need their own evidence. |
| G28-003 | [Guest save Vitest](../../../tests/vault/guestQuestSave.test.ts) | Tests malformed Breeze JSON, default recovery, successful replacement save, and an untouched Horizon save. |
| G28-004 | [Guest browser suite](../../../tools/ci/guest.pw.mjs) | Exercises recovery in the browser and compares the other realm's stored data before and after. |
| G28-005 | [Guest save Vitest](../../../tests/vault/guestQuestSave.test.ts) | Checks that a failed replacement leaves the prior saves intact and a retry writes only the intended realm. |
| G13-002 | [Issue #13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) and [PR #86](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/86) | The PR proposes more reward unit coverage. Completion paths and owner acceptance remain tracked in the issue. |
| G17-001, G21-002 | [Rowan browser suite](../../../tools/ci/human.pw.mjs#L57) and [Rowan lifecycle Vitest](../../../tests/rowanLifecycle.test.ts) | Checks equipped gear persistence, the Classic fallback, and model retry. |
| G28-006 | [Guest settings Vitest](../../../tests/vault/guestSettings.test.ts) and [issue #22](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/22) | Covers guest setting boundaries, corrupt saves, and write recovery. Signed-in settings need separate evidence. |
| G30-001 | [Offline HUD browser scenario](../../../tools/ci/guest.pw.mjs) and [issue #10](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10) | A passing offline assertion is evidence for that run. Keep the open issue and any intermittent failures visible. |
| G30-003 | [Guest browser suite](../../../tools/ci/guest.pw.mjs) and [issue #10](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10) | A scripted socket drives the real HUD through connected, offline, and peer-free reconnect states before any new snapshot. The existing real-server scenario provides additional coverage. |
| G34-001, G34-002 | [Mobile enrollment and WebGL fallback](../../../tools/ci/guest.pw.mjs#L117) and [issue #4](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/4) | Narrow creation controls and WebGL fallback have coverage. HUD zoom, reduced motion, and physical-device behavior need separate checks. |
| E15-001 | [Game data Vitest](../../../tests/vault/gameData.test.ts) | Covers the catalog contracts listed in the case table. |
| E15-002 | [Ruby quest catalog check](../../../tests/vault/quest_catalog.rb) | Reads the shipped English quest text through JSON and checks that each giver resolves to a single NPC. |
| E24-001, E24-002, E34-002 | [Game validation workflow](../../../.github/workflows/validate.yml) and [Firestore checks](../../../tools/ci/firestore.check.mjs) | Three browser jobs, three core OS jobs, and the isolated emulator job. |
| G36-001 | Owner desktop playthrough below | Pending owner result. |

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
| Project case table | `python3 docs/test-vault/public-template/starter/test-vault/validate_catalog.py --catalog docs/test-vault/aldervale/cases.md` |

## Evidence on verified main

The [main push validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43860977116/attempts/1) passed all seven jobs at `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`. The [First Spark stabilization](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/61) is included in that revision. Apply these results to that recorded build and retain a fresh receipt for subsequent changes.

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
