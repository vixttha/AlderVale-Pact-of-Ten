# AlderVale Test Vault

The Vault is the test library for AlderVale: Pact of Ten. Executable tests live under `tests/`; new Vault suites start under `tests/vault/` until a dedicated harness warrants its own directory. These catalogs track ideas for the live game's code and future systems.

- [Game and player journeys](game-catalog.md) covers combat, creatures, economy, persistence, world, UI, and multiplayer.
- [Engineering and release](engineering-catalog.md) covers test methods, platforms, security properties, delivery, production readiness, and recovery.
- [Languages and tools](languages.md) maps test surfaces to programming, query, configuration, and specification languages.

## Evidence and status

| Status | Evidence required |
|---|---|
| Idea | A player risk or invariant and an observable expected result |
| Implemented | A runnable test path and sanitized inputs |
| Verified | Exact commit, environment or runner, and observed result |
| Manual | A reproducible checklist with environment and recorded result |
| Conditional | A named feature, runtime, provider, or API must exist before the case is runnable |

Catalog rows are ideas unless the coverage list below identifies an existing suite. One passing case covers its named assertion. It does not close the whole category.

## First checks

| Suite | Execution | Coverage |
|---|---|---|
| Core | Standard Linux and Windows GitHub-hosted runners | Locked npm install, TypeScript check, Firestore rule lint, Vite build, Vitest |
| Firestore | Standard Linux runner with Java 21 | Demo-project Firestore Rules and transactional tests |
| `tests/vault/gameData.test.ts` | Core on both operating systems | Catalog identifiers, starter decks, spell and creature references, quest givers and rewards, NPCs and zones, Term reward sequence |
| `tests/security_combat.test.ts` | Core | Resource authorization, selected-card stability, combat status, fizzle, and breeding rules |
| `tests/auditRepairs.test.ts` | Core | Saga progress, renderer disposal, API behavior, mocked Lectern quota, two-client duel and reconnect |
| `tests/rowanModel.test.ts` | Core | The two GLBs, skeleton independence, grounding, fallback, and retry |
| `tests/firestore.integration.test.ts` | Firestore emulator | Owner writes, lineage, multi-hatch, private wallets, Dorm tours, Bazaar, trades, rewards, and houses |

The workflow starts on pushes to `AlderVale-test-Vault` and uses read-only GitHub permissions. GitHub exposes manual dispatch through the UI after the workflow exists on the default branch. This branch currently uses its push trigger. Jobs are skipped if the repository is private. Neither job needs live Firebase or Gemini credentials. The core test command skips emulator-only cases by design. The dedicated emulator job exercises those cases against a demo project.

## Running the suites

```sh
npm ci
npm run lint
npm run lint:rules
npm run build
npm test
```

With Java 21 available, run the Firestore lane:

```sh
GOOGLE_CLOUD_PROJECT=demo-aldervale-audit FIRESTORE_DATABASE_ID='(default)' \
  npm exec --yes --package=firebase-tools@15.36.0 -- firebase emulators:exec \
  --only firestore --project demo-aldervale-audit "npm test -- tests/firestore.integration.test.ts"
```

## How a test enters the Vault

1. Pick a category ID and give the case a stable suffix, such as `G07-001` for an out-of-order duel result.
2. Record the feature, fixture, steps, expected result, runtime, and scope. Use generated data, emulator accounts, and fixed random seeds or clocks where they affect the result.
3. Use the lowest layer that can prove the behavior. Add a higher-level case when the bug crosses a browser, network, or storage boundary.
4. Run the targeted case and the relevant workflow job. Record skips, platform limits, and flaky behavior with the result.
5. Keep the test runnable from a clean checkout. Capture expected failures as a tracked issue with an owner-visible reason, and revisit the case when it is repaired.

## Implementation order

- **P0 · State integrity** — save and migration recovery, concurrent market settlement, authenticated multiplayer reconnect, reward idempotency, reference integrity.
- **P1 · Player journeys** — browser enrollment to Rowan and solo duel, keyboard and touch, co-op and spectator, trading through the UI, Dorm visibility, WebGL recovery.
- **P2 · Depth** — deterministic simulations, property testing, accessibility and visual baselines, multi-hour soak, deployment and restore rehearsal.
- **Conditional** — real-service staging and additional client languages only when an isolated environment or actual integration exists.

[GitHub standard runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) · [Firebase rule unit tests](https://firebase.google.com/docs/rules/unit-tests)
