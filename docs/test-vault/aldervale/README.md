# AlderVale Test Vault v0.0.2

Use this as AlderVale's testing and acceptance record for the guest first-playable loop. Start with the [33 project cases](cases.md) for title, guest wizard creation, realm entry, one solo duel, and persistence after reload. The [game catalog](../game-catalog.md) and [engineering catalog](../engineering-catalog.md) cover the broader backlog. The [reusable starter](../public-template/README.md) is the template behind this project instance. The [language and test backlog](language-test-backlog.md) maps additional test ideas to AlderVale.

## What runs on AlderVale's public GitHub runners

The [AlderVale validation workflow](../../../.github/workflows/validate.yml) supplies the seven existing game jobs. The [Test Vault adoption workflow](../../../.github/workflows/test-vault-template.yml) checks the project case table and the broader case catalog, runs the independent Python reference against the real TypeScript rules, and checks the shipped quest catalog export with Ruby. For a pull request, link the run and record the actual tested checkout, base, head, and attempt. Keep automated results and owner observations separate.

| Case ID | Issue | What it verifies | Test or checklist | CI job | Remaining gap |
|---|---|---|---|---|---|
| G01-001, G09-001, G13-001 | [#13][issue13] | Guest enrollment, First Spark victory, and reward persistence | [Browser journey][human], [save tests][save] | Browser, Core | Owner desktop result |
| G01-002, G02-001, G28-001 | | Enrollment retry, realm separation, and failed saves | [Guest browser suite][guest] | Browser | |
| G04-001 to G04-003 | | XP thresholds, rollover, rank, and caps | [Vitest][xp], [Python reference][python] | Core, Vault catalog | |
| G13-002 | [#13][issue13] | Harmony and Rare Trial quest award logic | [Quest reducer tests][reducer] | Core | In-game Arbor and Rare Trial completion |
| G13-003, G13-004 | [#13][issue13] | First Spark replay and the three published payout schedules | [Python reference][python], [Ruby catalog][ruby] | Vault catalog | Arbor and Rare Trial in-game completion |
| G13-005 to G13-009 | [#13][issue13] | Harmony's two paths, mixed events, Rare Trial victory, and one-time payouts across saves | [Guest quest save tests][save] | Core | In-game event eligibility and delivery |
| G17-001, G21-002 | | Equipped gear persistence, Classic fallback, and Rowan model retry | [Rowan browser suite][human], [lifecycle Vitest][rowan] | Browser, Core | |
| G28-003 to G28-005 | | Corrupt save recovery and failed replacement without affecting another realm | [Save tests][save], [guest browser suite][guest] | Core, Browser | |
| G28-006 | [#22][issue22] | Settings boundaries, corruption and write recovery | [Guest settings Vitest][settings] | Core | Signed-in settings reload |
| G30-001, G30-003 | [#10][issue10] | Offline HUD and stale-peer removal across reconnect | [Guest browser suite][guest] | Browser | |
| G34-001, G34-002 | [#4][issue4] | Narrow enrollment and WebGL fallback | [Guest browser suite][guest] | Browser | HUD zoom, reduced motion, and physical-device behavior |
| E15-001, E15-002 | | Data integrity and quest giver references | [Catalog Vitest][data], [Ruby catalog][ruby] | Core, Vault catalog | |
| E24-001, E24-002, E34-002 | | Browser and OS compatibility plus isolated backend checks | [Game workflow][game], [Firestore checks][firestore] | Browser, Core, Firestore emulator | Live sign-in |
| G36-001 | | First-playable guest loop | [Owner desktop playthrough](#owner-desktop-playthrough--g36-001) | Manual | Pending owner result |

[issue4]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/4
[issue10]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/10
[issue13]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13
[issue22]: https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/22
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
[firestore]: ../../../tools/ci/firestore.check.mjs

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
