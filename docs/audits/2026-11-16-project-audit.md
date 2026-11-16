# AlderVale project audit — 2026-11-16

> Public engineering record. Baseline: `main` at `3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21`. Inventory refreshed on 2026-11-16 at approximately 08:55 UTC; counts include concurrent project PRs and this documentation PR.
>
> This report is not a release declaration and does not authorize merges, issue closures, repository-setting changes, or scope expansion. Private coordination and personal information are intentionally excluded.

## Executive summary

- **Main CI:** seven of seven jobs passed on the exact baseline.
- **PR #61:** seven of seven hosted jobs passed on its current head; it remains open and unmerged.
- **PR #81:** local validation is reported in the PR description, but no hosted Actions run was found for its head.
- **Issues:** 58 total — 55 open, 3 closed.
- **Pull requests:** 27 total — 7 open non-draft, 5 draft, 12 merged, 3 closed without merging.
- **Branches:** 49 at the refreshed snapshot; GitHub reports none protected. The repository rulesets endpoint returned an empty list.
- **Published GitHub releases:** none found.

## Baseline and method

The audit resolved `main` directly and read the following files at the exact baseline SHA:

- `AGENTS.md`
- `PROJECT_RULES.md`
- `docs/AGENT_OPERATIONS.md`
- `docs/VALIDATION.md`
- `docs/PUBLIC_RUNNER_POLICY.md`
- `docs/CHATGPT_PROJECT_INSTRUCTIONS.md`

The requested `docs/CHATGPT_PROJECT_INSTRUCTIONS_SETUP.md` is absent from this baseline. The existing ChatGPT Project Instructions file is present.

The review also queried live GitHub Issues, Pull Requests, branches, rulesets, Actions runs, and selected source files. No application code was changed and no local test suite was run as part of this documentation audit.

## Exact-SHA validation receipts

### Current main

[Actions run #70, attempt 2](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43807720659) passed all seven jobs on `3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21`:

- Core — Ubuntu
- Core — Windows
- Core — macOS
- Guest browser — Chromium
- Guest browser — Firefox
- Guest browser — WebKit
- Firestore emulator permissions

Attempt 1 on the same SHA had a WebKit timeout; attempt 2 passed without an application or test-code change. This supports an intermittent timeout observation, not a proven root cause.

### PR #61 — First Spark browser stabilization

[PR #61](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/61) is based on current main `3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21`, with head `8345e2f446b2ccbfed56d6be6d041ab798f36511`. It is open, mergeable, and reported by GitHub as clean.

[Actions run #71](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43808737184) passed all seven jobs on that exact PR head: three OS core jobs, three browser jobs, and Firestore emulator permissions. The PR remains unmerged. A green run is not merge authorization or gameplay acceptance.

### PR #81 — Rowan sprint animation

[PR #81](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/81) addresses [issue #80](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/80). Its description reports 55 local Vitest tests passing, 12 Firestore emulator tests skipped locally, and successful typecheck, production build, model-hash, diff, and Blender endpoint checks. These are PR-author-reported local receipts, not independently executed by this audit.

No hosted Actions run was found for head `27f16f3`. Hosted validation on the exact PR head remains pending.



### PR #84 — rare-element decks and spell progression

[PR #84](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/84) addresses [#67](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/67) and [#68](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/68). It is open, targets current main, and has hosted validation on its exact head `ecb7e7041835a36ea25048e480bb5c1c576dc373`.

[Actions run #81](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43831816272) passed all seven jobs: three OS core jobs, three browser jobs, and Firestore emulator permissions. The PR body reports 61 core unit tests passing and 12 skipped, with typecheck, rules lint, build, HTTP/WebSocket integration, browser flows, and emulator checks. The PR explicitly leaves #13 open. Milestone fit is unverified; no merge is authorized by this audit.

### PR #83 — Bug Library v0.0.4 Level 2 draft

[PR #83](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/83) is a draft documentation/instructions candidate based on current main. It changes eight documentation/instruction files and no application or CI files. Its exact-head validation run [#43833426029](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43833426029) passed all seven jobs; the public-runner policy and Semgrep runs also passed ([policy](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43833426014), [Semgrep](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43833426426)). The PR itself states that implementation milestone fit remains unverified. Keep it draft; no merge or release.

### PR #85 — this audit document

[PR #85](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/85) adds only this audit file. Its public-runner policy check and Semgrep CE run passed ([policy](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43834769096), [Semgrep](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43834769035)). The seven-job validation run [#43834769013](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43834769013) was still in progress at the refreshed snapshot. PR #85 remains draft.

### README HQ branch evidence

Issue [#73](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/73) records a branch-local repair validated on `f8e7fa590b35afffa3dbaa08003a410ba888661c` by [run #73](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43809544065).

The current `readme-hq` branch has since moved to `8e39f166acf69f4461ed3908fbc1c796de25768f`. Compared with current main, it is diverged (15 commits ahead, 1 behind) and the comparison includes removal of many application, policy, and CI files. Do not merge that workspace branch into main as-is. PR #62 is a separate draft whose current diff adds only `README.md`; it is based on an older main revision and still needs exact-base review.

## Canonical issue inventory

GitHub is the canonical bug record. At the snapshot there were 58 issues: 55 open and 3 closed (#4, #5, #35).

Recent issues added to the canonical tracker:

| Issue | Finding | Current note |
| --- | --- | --- |
| [#74](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/74) | Wall-clock IDs in deterministic combat effects | Open |
| [#75](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/75) | Live PvP/co-op ignores selected creature | Open |
| [#76](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/76) | WebSocket per-connection rate limits | Open |
| [#77](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/77) | Validate every element in bounded Firestore string arrays | Open |
| [#78](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/78) | Key player mutes by stable identity | Open |
| [#79](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/79) | Redundant root npm lockfile | Open |
| [#80](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/80) | Rowan fast-run animation loop seam | Open |
| [#82](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82) | Client-forged wizard economy and progression | Open; High |

Issue #82 is distinct from #77: #82 concerns client-writable progression/economy state, while #77 concerns invalid later elements in bounded arrays. Both have source references and separate acceptance criteria.

### Quest reward reconciliation

Issue [#13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) remains open. Current main calls `applySagaEvent` for solo wins, Rare Trial wins, and lead-creature wins. `tests/auditRepairs.test.ts` covers the reward values and once-only behavior for those event functions.

That is evidence that the original reward-delivery path has been implemented. It does not settle the related behavior questions:

- [#44](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/44) asks whether Harmony of the Arbor credit requires actual lead-creature participation. Current code checks for a lead creature, not its participation in the duel.
- [#50](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/50) asks whether a Rare Trial defeat should qualify. Current code sends `rare-trial-attempt` on a completed loss, and the existing unit test expects that event to pay.

Keep #13 open until the original end-to-end acceptance is reconciled with #44 and #50. Do not treat the three issues as duplicates.

### Older issue reconciliation

A prior source audit classified #7, #10–#22, and #38 as candidates for closure after code-level repair, with #23 only partially fixed and #28 still valid. That prior classification is not itself closure evidence. Reconcile each issue against its original acceptance, a linked merged fix, exact-SHA CI, and a relevant regression before changing its state.

The same prior audit identified #41–#58 as valid at its then-current source baseline. Those findings should be rechecked against current main before implementation or reprioritization. This document does not claim that all 58 issues were individually reproduced during this audit.

## Pull request inventory

At the refreshed snapshot, including this documentation PR:

- **Open, non-draft:** #84, #81, #63, #61, #39, #36, #33.
- **Draft:** #85, #83, #62, #40, #37.
- **Merged:** #64, #60, #59, #34, #31, #30, #29, #27, #26, #24, #8, #6.
- **Closed without merge:** #32, #9, #1.

PRs #84, #83, #85, #81, and #61 are based on current main. #84 is a gameplay repair with seven hosted jobs passing; #83 is a Bug Library documentation draft; #85 is this audit-documentation draft; #81 still needs hosted validation; and #61 has seven hosted jobs passing. The other open PRs use older base revisions and need overlap/base reconciliation before they can be treated as current candidates. In particular, #37 and #39 overlap in the Project Instructions area; #62 is a README-only draft; #63 changes project-rule documentation; #36 and #33 use older integration bases; and #40 is a separate logo-assets draft.

## Repository governance and hygiene

- GitHub reported 47 branches and `protected: false` for every branch in the branch listing. The repository rulesets endpoint returned no rulesets. The direct branch-protection details endpoint was not accessible to this audit connection; branch metadata and the rulesets list are the available evidence.
- [Issue #66](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/66) tracks the missing protection for `main` and the permanent `bug-library` branch.
- The public runner policy workflow runs on standard hosted Ubuntu, but `.github/workflows/public-runner-policy.yml` uses `actions/checkout@v4` without a full commit pin. The main validation workflow and Semgrep workflow use pinned action SHAs.
- Semgrep CE runs in audit mode without `--error`; findings do not currently fail that job.
- `package.json` still names the package `react-example`.
- No root `LICENSE` file was found. Do not add a license without an explicit licensing decision.
- Issue #79 tracks the redundant root npm lockfile.
- No published GitHub release was found. This audit did not establish a production deployment.

## Security and integrity findings

The following canonical issues are the current public security/integrity work:

1. [#82 — client-forged wizard economy and progression](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82), High.
2. [#76 — WebSocket rate limiting](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/76).
3. [#77 — Firestore array element validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/77).
4. [#75 — live selected-creature mismatch](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/75).
5. [#78 — stable player-mute identity](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/78).

[Issue #66](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/66) remains the repository-governance blocker. Additional source-audit candidates must be deduplicated against all open and closed issues before filing; audit notes are not a second issue tracker.

## Validation boundaries

This audit did **not** run a new local test suite, a live ChatGPT fresh-session smoke test, a production Firebase test, a production exploit, a load/stress test, or a personal gameplay acceptance test. The PR #81 local checks are reported by its PR description. The main and PR #61 Actions receipts above are the hosted evidence actually inspected.

Green CI establishes only the tested scenarios on the exact recorded checkouts. It does not prove production deployment, complete security, multiplayer load behavior, or owner acceptance.

## Recommended review order

1. Review PR #61 against its exact head and base; keep merge authority separate.
2. Require hosted exact-head CI for PR #81 before considering it merge-ready.
3. Reconcile #13 with #44 and #50 without silently closing any issue.
4. Prioritize the High integrity issue #82 and the existing #75–#78 findings according to owner-approved scope.
5. Resolve #66 through the repository settings process without adding a second human approver, paid service, or unrelated restriction.
6. Refresh stale-base PRs and the README HQ branch before any integration decision.

---

*This document is a point-in-time public audit summary. The private project coordination record is maintained separately; no private Notion links, personal details, credentials, or secrets are included here.*
