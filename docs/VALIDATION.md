# AlderVale validation

ChatGPT.com leads development and project management under the owner's direction.
GitHub Actions runs the checks against the commit shown on each run. The owner
decides whether to accept the result.

Follow the owner's [project rules](../PROJECT_RULES.md): the repository stays
public, Notion stays private, project work must add no unapproved spending, and
the three-day window is 2026-11-15 through 2026-11-18 America/New_York.

## Runner coverage

The validation workflow runs seven independent jobs:

- Linux, Windows, and macOS: frozen application install with Bun 1.4.4; type
  checking; Firestore rules lint; existing unit/structural tests; production build;
  real HTTP and three-client WebSocket integration.
- Chromium, Firefox, and WebKit on Linux: title/creation controls, guest wizard
  persistence and realm separation, First Spark rewards after reload, and
  narrow viewport controls. External web
  requests are blocked so tests cannot touch production Firebase or paid APIs.
  Linux browser jobs use a virtual display and software graphics; Firefox's
  native headless mode on the runner could not create the required WebGL2 context.
- Firestore emulator on Java 21: permitted operations plus ownership, identity,
  PII, realm, timestamp, ID-length, and Bazaar state/price rejection scenarios.
  The same emulator job also checks multi-hatch saves, Term rewards, private
  Sky-Lens galleries, and server-side Bazaar and trade settlement. It also runs
  the signed-in solo and Term claim HTTP flows against the Auth and Firestore
  emulators, including a repeat settlement, simultaneous claims, and fleeing.

The Linux core job writes built asset sizes, SHA-256 hashes, and GLB header checks
to the job summary. It also type-checks the standalone agent packages using their
own npm lockfiles and runs their available deterministic Node tests. These checks
use no model credentials or live model calls. The Windows core job also smoke-tests
the owner-play launcher in checkout mode. Browser failures retain reports/traces
for one day. The test tool dependencies live separately in tools/ci so AI Studio's
application manifest and Bun lockfile are unchanged.

The Test Vault adoption workflow runs its copy-in fixtures and AlderVale language
catalog checks. The legacy npm/audit-emulator workflow stays on the standalone
`AlderVale-test-Vault` branch. Brand asset PRs render and validate PNG exports
with pinned dependencies and one-day review artifacts.

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
Run `node scripts/horizon-check.mjs` for the November milestone status.

The weekly Semgrep Community Edition workflow runs on the public repository using
standard hosted runners. See [agent operations](AGENT_OPERATIONS.md) for Graphify
snapshots. The workflows require neither automatic deployment nor self-hosted
runners. Larger runners, excess storage, and external APIs are separate.

Use GitHub Issues and pull requests for engineering work and evidence. Use the
private Notion project for planning and handoffs. After a code change, push it,
inspect the Actions run for that exact commit, and bring accepted changes into the
active development tool before its next edit.

## Evidence limits

Structural rules tests do not execute Firebase rules; the emulator job does.
Guest browser tests do not prove Google sign-in, cloud saves, deployment behavior,
GPU performance, gameplay quality, production WebSocket identity, or security
of every multiplayer route. Firebase and multiplayer integration tests use local
fixtures and a demo project. No release acceptance is inferred.

Making a public repository private later does not recall copies already fetched.
