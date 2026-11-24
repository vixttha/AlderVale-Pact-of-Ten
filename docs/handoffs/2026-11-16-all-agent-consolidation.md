# All-agent consolidation handoff

## Current status: initial consolidation merged

Live verification on 2026-11-16 confirmed [PR #101](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/101)
merged as `3fa20bc5ed4fecc228cc3733536a589bf75df6a0`. All fourteen
initial source heads below are ancestors of current game main
`219a6bda1f9b2e01f06fd97350a66ed8f470f0d1`, including #33 and #36.
Those two unchanged proposals targeted the old Test Vault branch; this
follow-up closed them as included through #101 after checking every changed
path remains present on main. Their source branches remain available.
The candidate `3671386156177a7238d928eb66dbf228b401e46b` and merge share
tree `ad530aa6fd76e4844a4bf57c555f7a1cd5e1ee06`.
[Post-merge validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43890556938)
passed all seven jobs on the merge SHA.
[Current-main validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43917481646)
also passed all seven jobs on `219a6bda1f9b2e01f06fd97350a66ed8f470f0d1`.

The checkpoint sections below are historical, not a request to replay merges.
Later accepted main changes govern: notably #109 moved Bug Library v0.0.4
to its standalone branch; #110 published README v0.0.2; #107 and #113
integrated subsequent gameplay fixes. Preserve these decisions.

### Local resource-store follow-up

Worker `codex-resource-consolidation`, Codex on Windows, model unverified,
task `/root/finish_consolidation`, authenticated GitHub actor `vixttha`.
Baseline: `219a6bda1f9b2e01f06fd97350a66ed8f470f0d1`.
Working branch: `codex/resource-isolation-consolidation-2026-11-16`.
Scope: retain the unpublished resource-store isolation patch and four tests
from the original working copy under the owner's consolidation authorization.
The original dirty checkout remains untouched.

Contrary to the earlier unavailable-patch note below, those files were
accessible on this machine. On the baseline, the four-test suite failed
two cases: concurrent writes lost another resource's committed update, and
a newly inserted resource was erased. Per-resource locks staged and replaced
the entire map. The retained patch stages and commits only the locked record.
All four tests then passed, along with the sixteen existing authorization and
combat tests. The other cases cover rollback and same-resource ownership
serialization.

The follow-up is [PR #121](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/121).
Its original head `03bb429a66967c5ce9642428302dfa0891ef5f91` passed
[all seven hosted jobs](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43923981764).
Runner policy and Semgrep also passed. Before merging, the final guard found
main had advanced to `65e90e59eaf69a1551828a7358a0e65587643992` through #116.
That disjoint combat-only change has its own
[seven-job hosted receipt](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43922664193).
The combined tree then passed local typecheck, 117 tests (12 emulator tests
skipped locally), build and six HTTP/WebSocket checks. This does not imply
completed hosted validation of the combined SHA. The PR's merge receipt and
post-merge run links record the final exact-SHA state without replaying work.

This does not resolve [#57](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/57)'s
decision about the unused endpoint's future, or production authorization
issue #82. It changes no authentication, editable-field or ownership policy.
The unpublished local duel-selection helper overlaps the merged duel roster
implementation and its tests; it is retained in the original working copy.
Generated installation and Graphify output are excluded.

At this refresh, #103, #104, #112, #115, #116, #118 and #120 are subsequent
open work, outside the original consolidation snapshot. #102's latest delta
is a test-only correction already covered by #101's stronger settlement
regression. No source branch is deleted or replayed by this follow-up.

## Owner authorization and outcome

The owner explicitly asked to combine all open work from all agents in the
existing public repository, validate the combined result, and then merge it.
They subsequently asked for a durable handoff so another LLM can finish if this
session runs out of capacity. Do not re-ask for ordinary integration or merge
permission. This does not authorize spending, deployment or release claims.

Repository: `vixttha/AlderVale-Pact-of-Ten`.
Integration branch: `codex/all-agent-consolidation-2026-11-16`.
Starting main: `295a25c7facabf7d350c951817ba0a1af7b1612a`.
Worker: `codex-alderwatch`; Codex on Windows; exact model variant unverified.
The integration uses an isolated managed worktree. Preserve the original dirty
owner checkout. At this historical checkpoint, main had not received the consolidation.

## Completed in this checkpoint

All fourteen PR heads from the initial open-work snapshot were merged into the
integration history: #94, #96, #87, #89, #90, #91, #85, #62, #37, #39, #83, #40,
#33 and #36. Verify with merge-base against their pinned heads below and refresh
live PR heads before finalizing; agents may still be adding commits.

| PR | Pinned head |
| --- | --- |
| #94 | `3bf9520756a474edd1d0c54f32b24648b54784e9` |
| #96 | `24a69e61831c12928a14a385fb9a5ce827caa7a2` |
| #87 | `3894f6a2d5d9e72a1d8d207a5667a66caed4bb8b` |
| #89 | `9e030719ebfbe9c261e68aa7941f9438e363d6e3` |
| #90 | `73c8fc762deb7f593276f22a556dc99503c9c0c3` |
| #91 | `8d9bfc0964b9204b2517714a2472019a9c5f52ef` |
| #85 | `3ad84e47f9dcb67c8fece483aaec284994a551ac` |
| #62 | `1666731a4771ec3ccf7f878467107dfcc20ec18d` |
| #37 | `ce4d76db15856a8b620c0736155359692bf283b0` |
| #39 | `8fb7af5a35507a6d911b1a9fefe46091a30bae62` |
| #83 | `7121f42010b97e4e2d9037132cb55417f0867b40` |
| #40 | `09ac1c6b16ecaf1578a80707a72f63d54318438d` |
| #33 | `6f4dbe16b6a46d5d5d308c70e23e55999b9bf001` |
| #36 | `5a52e77c46461e8cfde014a224a1d920143d0079` |

Resolutions: retain main's already-combined creature/Arbor fixes when older #94
overlapped; keep #96's stronger Dorm assertions; use #90's newer Test Vault
starter over #89's earlier version; retain v0.0.3 ChatGPT instructions and add
the #83 Bug Library section; retain newer Test Vault tests/docs when #33's old
base overlapped. Source histories are preserved. No force push or reset occurred.

#96 proposed 120-second browser budgets; #90 proposed WebKit-specific 150-second
budgets. The combined settings and gear tests use 150 seconds on WebKit and
120 elsewhere, preserving their assertions. #90 also brings its existing
180-second First Spark test budget. Record this explicitly; do not claim timing
root causes are solved. Root Vitest now excludes standalone agents/** tests
so Node test files do not get miscollected (the #38 integration conflict).

## Work identified at the initial checkpoint

1. Read current AGENTS.md, PROJECT_RULES.md, docs/AGENT_OPERATIONS.md and nested
   agents/*/AGENTS.md before editing those packages. Root now references the
   v0.0.4 entry point/workflow. Owner consolidation authorization still governs.
2. Inspect all workflows. Imported brand-assets.yml has floating action tags,
   floating Python dependencies and 30-day artifacts. Pin actions/dependencies,
   use standard public runners and one-day artifacts. Do not enable a paid SDK
   or live model call. Agent packages are optional local tools, not game runtime
   dependencies. Preserve their isolated lockfiles.
3. Decide how to retain standalone HQ work without applying destructive orphan
   branch trees. element-hq-v1 has three useful new documents. notion-agent has
   public-safe profiles/templates. readme-hq contains approved immutable README
   archives/workspaces and validator. bug-library/v0.0.3 has historical receipts.
   Import useful additive artifacts with explicit namespaces/links, not obsolete
   application deletions or replacement HQ root READMEs. chatgpt-voice is an
   empty tree. Graphify snapshots are a generated archive branch and must stay
   there. Older repro branches demonstrate unresolved bugs; do not merge failing
   reproductions as completed fixes. Older Rowan/Graphify candidates already have
   accepted successors; compare rather than overwrite current runtime.
4. Reconcile original local unfinished work: resource-store isolation patch and
   tests/resourceConcurrency.test.ts appear useful and are not yet copied here.
   shared/duelCreatures.ts, tests/duelCreatures.test.ts and tools/ci/lead.pw.mjs
   overlap the selected-lead implementation now in main; inspect and retain
   unique regression coverage without duplicating competing implementations.
   AlderVale Play source duplicates merged #91; do NOT copy its .installation.
   graphify-out is generated. Original local audit/agent docs are already in main.
5. Consolidate duplicate workflows where they repeat the same core/emulator
   checks. Preserve useful independent Python/Ruby/Go/Vault/brand checks with
   bounded jobs and concise output. Do not grow idle or paid work.
6. Verify application: typecheck, rules lint, Vitest, build, real HTTP/WebSocket,
   Rowan asset checks. Run standalone agent deterministic tests separately under
   Node with no model credentials. Install isolated dependencies only if needed.
   Test Vault catalog/adoption/Python/Ruby scripts should run on public runners;
   run those available locally too. Brand rendering may require Linux Cairo.
7. Refresh main and all open PR heads. Include new actual work or document why
   superseded/archival content is retained separately. Run one consolidated PR
   matrix against the final head; inspect every required result and failure.
8. Push branch and create/update a consolidated PR. User has authorized its
   eventual main merge after validation; no further routine approval is needed.
   Preserve first-failure evidence and never loosen assertions for green CI.
9. Merge with an expected-head guard only after combined checks pass. Verify
   merged tree and actual main SHA. Record the final receipts and remaining
   owner playtest/production limitations in the existing private Notion handoff.
   Do not claim gameplay acceptance or release. Preserve source branches.

## Earlier evidence and cautions

PR #95 merged as 25d2c18, followed 23 seconds later by #98 as 295a25c. The latter
already includes the completed live/local creature fixes, trade consent, Dorm
unpublish and co-op resonance correction. #98's tested candidate passed seven
jobs, 80 unit tests, six HTTP/WebSocket checks and 14 browser scenarios each.
Current-main validation must be refreshed. Existing root issue #82 remains an
unresolved client-write authority problem; this consolidation is not a release.

Source review found a possible async matchmaking reservation race, pending
trade invitations reserving recipients, and an Arbor participation definition
based on the active creature at duel end. These were not freshly reproduced.
Do not mix speculative fixes into consolidation without first establishing
expected behavior and adding proportionate regression evidence.

At this checkpoint the fourteen histories are present, but combined validation,
the remaining additive/local reconciliation and the final main merge are NOT
complete. Continue from the branch, not by replaying the initial merges.

## Integration follow-up

- The refreshed #83 head `05fdc3fe2536b623ff42896506fbe68a128ec251` brings in the same main baseline. Its Bug Library files and `AGENTS.md` match the pinned source. The integration keeps the v0.0.3 ChatGPT instructions and their Bug Library section. The Bug Library's product acceptance remains pending.
- The public game README brought in through #62 is byte-identical to the v0.0.1 archive (blob `317cd107088d823c7677f0afd9a51b496fa1bd54`). [README HQ](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/e32fdf4a38ea2a5903b71d9df8f2de40ae04f99c) keeps the frozen v0.0.2 archives and validator. [PR #100](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/100) remains a v0.0.3 proposal targeting that workspace.
- [Element HQ](../element-hq/README.md) imports the public design documents and template from `a5f7d733a6a4f9b79c378203536aca5c84f1b412`. [Notion Agent](../notion-agent/README.md) imports its public profile and templates from `1e9bdd538f71cd39d98c2255550c152e445ef211`. The [Bug Library v0.0.3 archive](../bug-library/v0.0.3/README.md) preserves the published records from `46c504ffdbd343df825398c403d3a0417acb9e82`.
- The voice branch contains an empty tree. Published Graphify snapshots stay on their archive branch. Earlier reproduction and superseded game branches remain in Git history.
- The public-runner workflow keeps the seven game jobs, adds standalone agent checks to the existing Linux job, and keeps the Windows launcher smoke. The legacy game-running Test Vault workflow remains available on `AlderVale-test-Vault`; the integration keeps the distinct adoption fixtures and language checks. Brand jobs use pinned dependencies and one-day artifacts.
- The approved Workmark v1 concept and integrity record are preserved from `ff7da44a2c344deb2d0c7f322c17dfe0ad1ef3c4`. Brand rendering checks cover the earlier reconstruction as a review artifact. The approved concept remains the design reference.
- The handoff described uncommitted resource-store and creature-test files from another machine. Their contents were unavailable in the repository and attached transcript. They require that original patch or a published branch for reconciliation.

### Source refresh before final validation

- [#90](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/90) at `1914f2197cf42e0dfb50bbdb364bd41903e4406c` adds five Rust GLB contract tests and the runner-verified Cargo lock. The reliability language applies to Vault tests and receipts.
- [#83](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/83) at `870f81f55f70ae6367943aeb48c6e8678fb42ca7` adds queue and claim validation, owner-law escalation, and acceptance fixtures.
- [#102](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/102) at `a4adca7b623fcbb72e40bc263044f8963849470b` adds bounded trade settlement, craft rank calculation, realm spectate availability, and muting by wizard identity. The integration keeps the existing browser budgets and stale-peer regression, and verifies trade rejection leaves wallet balances and receipt reuse intact. The spectate regression tracks the specific duel through zone travel and removal after it ends.
- [PR #101's first brand workflow run](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43887049750) failed before jobs started. The YAML command now uses a folded scalar, and the [corrected brand workflow](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43887495504) ran successfully before this source refresh.
