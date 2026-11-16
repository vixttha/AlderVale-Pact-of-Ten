# AlderVale integration — batch 1

Owner request: create a branch from main and start combining the completed work.

Branch: `codex/aldervale-integration-2026-11-16`.
Base: `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd` (current main at creation).
Worker: `codex-alderwatch`, Codex on Windows, GPT-6 family (exact variant
unverified), session ID unavailable. Authenticated GitHub actor: `vixttha`.

## Included candidates

| Source PR | Pinned source head | Purpose |
| --- | --- | --- |
| [#81](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/81) | `27f16f367f9a5ebf01a9780532a60e1aabd2a5d5` | Use the seamless Sprint clip; verify its endpoints and browser movement selection |
| [#84](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84) | `ecb7e7041835a36ea25048e480bb5c1c576dc373` | Native rare-element attacks and consistent spell progression gates |
| [#86](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/86) | `c97a8ff3e0b87104d0bb475d94632b35590cb91d` | Catalog-derived quest reward and repeat-payout regression coverage |
| [#63](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/63) | `50a4416a465b7453258c6247a45437c433ab993a` | Existing creator-privacy rules |
| [#93](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/93) | `dcf469a25cfe46bb388ae89727b125f0bbc348aa` | Display zero-vote Dorm tours as Unrated, with unit/emulator assertions |

These heads were merged into this candidate with their history retained.
All five integrations completed without conflicts. They are not merged into main.
The source PRs retain their existing states and owner acceptance boundaries.

Also includes the owner-requested Alderwatch identity/README and the two audit
reports plus connected-repair index prepared in this session. Historical reports
describe their original baseline and publication state; this candidate now
versions their public-safe text.

## Already present in the base

The older repair chain #6 -> #27 -> #34, migration #60 and First Spark test
stabilization #61 are already ancestors of main. They were not reapplied.
See [connected repairs](2026-11-16-connected-repairs.md) for their evidence and
remaining acceptance. An issue that remains open does not imply its historical
implementation is absent.

## Deferred work and conflicts to examine next

- #92 live-creature selection is an active draft at the inspected head; preserve
  its separate work and validation rather than copying the owner's local edits.
- #90 supersedes much of #89's Test Vault template. Select one combined version;
  avoid importing both copies or weakening browser timing assertions.
- #87 runner-policy tests, #91 Windows launcher, #83 Bug Library, #62 product
  README, #37/#39 instructions, #40 branding and #85 historical audit remain
  separate candidates. Their draft/overlap status requires individual review.
- #33/#36 target AlderVale-test-Vault, not main. #38's test-runner collision is
  unresolved in that branch; do not import the agents directory blindly.
- Failing-before-fix reproduction branches #74–#78 demonstrate defects. They
  are not passing fixes to include in a green candidate.
- Design choices #49–#56 and the trusted-write design for #82 are not decided
  by combining this branch. #43/#44/#45/#47 and other unresolved issues remain.

## Validation and acceptance

Baseline local Vitest: 54 passed / 12 emulator-dependent skipped.
Combined local Vitest: 68 passed / 12 emulator-dependent skipped.
Typecheck, Firestore rules lint, production build, four real HTTP/WebSocket
checks and Rowan source-hash/rig validation passed on this combined tree.
Dependencies were installed with the existing root npm lockfile; the local
preinstalled Bun is older than CI's pinned Bun 1.4.4. No lockfile changed.

Public validation uses the unchanged seven-job workflow: three core OS jobs,
three guest browser jobs and the Firestore emulator. Inspect the Actions run's
actual tested checkout before claiming hosted success. At preparation time,
combined hosted validation is pending.

Known baseline: run 43874521814 failed the WebKit Tailor gear-reload scenario
after its 90-second total budget; six jobs passed. This integration does not
increase that timeout or change its gear/save assertions. A previous same-base
run passed seven jobs. Neither result guarantees this combination will pass.

Main remains unchanged. Owner gameplay acceptance, Google sign-in, configured
backend behavior, real GPU performance, merge and release are separate gates.
The original dirty owner checkout is preserved; this work uses an isolated
managed worktree. No private Notion content or links are published here.
