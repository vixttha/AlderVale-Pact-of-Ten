# AlderVale validation

Google AI Studio remains the main builder. Codex maintains focused tooling and
tests. GitHub Actions runs the checks against the commit shown on each run.

Follow the owner's [project rules](../PROJECT_RULES.md): the repository stays
public, Notion stays private, and project work must add no unapproved spending.

## Runner coverage

The validation workflow runs seven independent jobs:

- Linux, Windows, and macOS: frozen application install with Bun 1.4.4; type
  checking; Firestore rules lint; existing unit/structural tests; production build;
  real HTTP and three-client WebSocket integration.
- Chromium, Firefox, and WebKit on Linux: title/creation controls, guest wizard
  persistence and realm separation, and narrow viewport controls. External web
  requests are blocked so tests cannot touch production Firebase or paid APIs.
  Linux browser jobs use a virtual display and software graphics; Firefox's
  native headless mode on the runner could not create the required WebGL2 context.
- Firestore emulator on Java 21: permitted operations plus ownership, identity,
  PII, realm, timestamp, ID-length, and Bazaar state/price rejection scenarios.
  The same emulator job also checks multi-hatch saves, Term rewards, private
  Sky-Lens galleries, and server-side Bazaar and trade settlement.

The Linux core job writes built asset sizes, SHA-256 hashes, and GLB header checks
to the job summary. Browser failures retain reports/traces for one day. The test
tool dependencies live separately in tools/ci so AI Studio's application manifest
and Bun lockfile are unchanged.

## Run locally

Use Node 24 and Bun 1.4.4 (older Bun cannot read this lockfile). From the repo root:

```powershell
bun install --frozen-lockfile
bun run validate:core
node scripts/asset-report.mjs
npm ci --prefix tools/ci --ignore-scripts --no-audit --no-fund
```

`validate:core` matches the Linux/Windows/macOS **core** job in
`.github/workflows/validate.yml` (typecheck, rules lint, Vitest, build, HTTP/WS
integration). Browser and Firestore emulator jobs still use `tools/ci` as below.

From tools/ci, run `npx playwright install chromium`, then
`npm run test:browser -- --project=chromium`. For rules, install Java 21 and run
`npm run test:rules`. This uses only the demo-aldervale-ci project and local
Firestore emulator; no Firebase login, production account, or secret is needed.

## Public and private operation

Pushes to `main`, `codex/**`, and `ci/**` branches and pull requests run
automatically while public. The hosted validation workflow skips private repositories.
There is no schedule, background agent, automatic deployment, or self-hosted
runner requirement. Standard hosted public runner compute is free under GitHub's
current terms; larger runners, excess storage, and external APIs are separate.

GitHub Issues and pull requests own engineering work. The private Notion project
home holds the brief, proposals, and AI Studio/Codex handoff. After a code change,
push it, inspect the exact-SHA Actions run, then pull accepted changes into AI Studio.

## Evidence limits

Structural rules tests do not execute Firebase rules; the emulator job does.
Guest browser tests do not prove Google sign-in, cloud saves, deployment behavior,
GPU performance, gameplay quality, production WebSocket identity, or security
of every multiplayer route. Firebase and multiplayer integration tests use local
fixtures and a demo project. No release acceptance is inferred.

Making a public repository private later does not recall copies already fetched.
