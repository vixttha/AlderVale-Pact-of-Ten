# AlderVale Test Vault

The Test Vault is the project's catalog of executable regression tests and the player or system risks they protect. Keep tests close to the lowest layer that can prove the behavior; add a browser or emulator test when the defect crosses a real UI, storage, network, or authorization boundary.

This README describes the test surface integrated into the PR #27 candidate. A test being listed or implemented does not by itself mean it has passed. Record verification against the exact commit and GitHub Actions run that executed it.

## Evidence labels

| Status | Meaning |
|---|---|
| Idea | A risk, invariant, and observable expected result have been described. |
| Implemented | A runnable test exists and is included in the relevant test command. |
| Verified | The exact commit, workflow run, job, and observed result are recorded. |
| Manual | A reproducible human checklist exists; record the environment and result separately. |
| Conditional | The test needs a named runtime, provider, emulator, or integration before it can run. |

A passing test proves only the assertions it executes. It does not close an entire feature area or replace the owner's manual and production acceptance.

## First Spark — G13-001

| Test | Layer | Assertions |
|---|---|---|
| tests/vault/guestQuestSave.test.ts | TypeScript / Vitest | First Spark catalog entry exists; a solo win completes the quest once; catalog XP, Florins, and Spell Shards are awarded; XP rollover is correct; completion and rewards survive a guest-storage reload; replay does not pay twice; another realm remains isolated. |
| tools/ci/human.pw.mjs — “a guest wins as Rowan and keeps First Spark and its rewards after reload” | Browser / Playwright | A guest completes the Rowan duel journey, sees the First Spark completion and exact reward result, reloads the page, and retains the completed quest and rewards. |

The Vault test exercises the gameplay and guest-storage boundary with isolated localStorage. It is not a browser reload or a production Firebase test. The Playwright scenario is the separate end-to-end browser check. Both layers are intentional and complementary.

## Implemented TypeScript suites

| Test file | Primary coverage | Run lane |
|---|---|---|
| tests/auditRepairs.test.ts | Saga payout/idempotency, legacy quest behavior, fountain collision, scene-resource disposal, API validation/budgets, duel reconnect and flee behavior. | Core Vitest |
| tests/security_combat.test.ts | Seven resource-authorization regressions plus combat and breeding rules, including draws, spell selection, fizzle refunds, status effects, and turn behavior. | Core Vitest |
| tests/shared_contract.test.ts | Realm identifiers, XP progression, Term reward ordering, and starter-deck contracts. | Core Vitest |
| tests/rowanModel.test.ts | Rowan model loading, independent avatars, and Dorm weather updates. | Core Vitest |
| tests/rowanHuman.test.ts | Human scale/grounding, skeleton and material ownership, authored animation clips, and safe resource release. | Core Vitest |
| tests/rowanLifecycle.test.ts | Asynchronous model loading, disposed-avatar protection, shared source requests, fallback, and user-driven retry. | Core Vitest |
| tests/rowanResourceOwnership.test.ts | Shared versus instance-owned rendering resource cleanup. | Core Vitest |
| tests/vault/guestQuestSave.test.ts | First Spark guest quest payout, level rollover, persistence, idempotency, and realm isolation (G13-001). | Core Vitest |
| tests/firestore.integration.test.ts | Owner transactions, lineage, multi-hatch saves, Term claims, guest migration, settings, private wallets/galleries, Bazaar/trades, and House membership. | Firestore emulator |

Vitest discovers TypeScript suites under tests/**/*.test.ts. The Firestore integration suite is skipped when FIRESTORE_EMULATOR_HOST is absent and is explicitly run by the emulator job.

## Browser, server, and rules suites

| Test file | Primary coverage | Run lane |
|---|---|---|
| tools/ci/guest.pw.mjs | Guest enrollment and reload, failed-save visibility and retry, realm isolation, mobile controls, WebGL fallback, settings persistence, fountain behavior, and flee feedback. | Chromium, Firefox, WebKit |
| tools/ci/human.pw.mjs | Rowan and Classic appearance, guest reloads, Tailor gear/stat persistence, animation clips, model fallback, and First Spark victory/reward persistence after reload. | Chromium, Firefox, WebKit |
| tools/ci/server.check.mjs | Built-server HTTP health and HTML, protected API behavior, Bazaar authentication, and realm-isolated WebSocket chat. | Core on Linux, Windows, macOS |
| tools/ci/firestore.check.mjs | Firestore Rules and transaction checks against the isolated demo emulator. | Firestore emulator |

Playwright blocks external hosts; these browser suites use the local test server and do not call production Firebase or paid APIs. The Firestore job uses the demo-aldervale-ci project and a local emulator, not a production project.

## GitHub Actions validation

The candidate workflow is .github/workflows/validate.yml. It runs seven jobs:

- Core on Ubuntu, Windows, and macOS: frozen Bun install, TypeScript check, Firestore rules lint, Vitest, Rowan model provenance/rig checks, production build, and HTTP/WebSocket integration.
- Guest browser on Chromium, Firefox, and WebKit: Playwright journeys using software rendering and a virtual display.
- Firestore emulator: Java 21, demo project, rules checks, and tests/firestore.integration.test.ts.

The workflow runs for pull requests and pushes to main, codex/**, and ci/** while the repository is public. It uses standard hosted runners; it does not require a local or self-hosted runner. The workflow does not deploy the game.

For a verified result, retain the exact candidate SHA and the Actions run URL, then inspect all seven job conclusions. A previous green run on a different SHA is not evidence for a later candidate.

## Run locally

Use Node 24 and Bun 1.4.4. From the repository root:

~~~sh
bun install --frozen-lockfile
bun run lint
bun run lint:rules
bun run test
bun run build
node --test tools/ci/server.check.mjs
~~~

For the browser suite, install the isolated test dependencies and run a selected browser:

~~~sh
npm ci --prefix tools/ci --ignore-scripts --no-audit --no-fund
cd tools/ci
npx playwright install chromium
npm run test:browser -- --project=chromium
~~~

The Playwright configuration starts the built application server for the test and uses the local base URL. To run the Firestore lane, use Java 21 and follow the emulator command in .github/workflows/validate.yml. Keep the project ID on the demo emulator; never substitute production credentials for a local regression test.

## Adding a Vault case

1. Identify the player risk or invariant and give it a stable case ID, such as G13-001.
2. Record the relevant gameplay feature, fixture, setup, action, expected result, and boundary being tested.
3. Use the lowest layer that can prove the behavior. Add a browser, server, or emulator test only when it covers a distinct boundary.
4. Run the targeted test and the relevant workflow. Record the exact SHA, run URL, job, platform, skips, and any limitations.
5. Keep the test deterministic and runnable from a clean checkout. Do not weaken an assertion merely to obtain a passing run.

## Acceptance boundaries

Automated checks do not by themselves prove Google sign-in, production Firebase behavior, deployment correctness, GPU performance on player hardware, full multiplayer security, gameplay quality, or release readiness. The owner's Rowan playthrough and signed-in production smoke remain separate acceptance requirements for PR #27.
