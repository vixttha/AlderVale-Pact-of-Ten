# Bug Library v0.0.4 — Operating Workflow

## 1. Intake and duplicate search

Before creating a bug issue:

1. Search GitHub Issues in the AlderVale repository for matching symptoms, component names, error text, and affected behavior.
2. Search both open and closed issues.
3. Inspect linked PRs and existing receipts.
4. Reuse the matching issue when the defect is already recorded; add new reproduction/evidence rather than opening a duplicate.
5. Create a new issue only for a distinct defect. Link related issues without merging separate failure modes.

## 2. Triage record

Use this minimum record in the canonical GitHub issue:

| Field | Required evidence |
| --- | --- |
| Summary | Observable defect, not a proposed solution |
| Affected revision | Version, branch, and full SHA when known |
| Environment | Browser/OS/device/build and relevant configuration |
| Reproduction | Smallest reliable steps or explicit “not reproduced” |
| Expected / observed | Concrete contrast |
| Impact | Player, save, economy, security, accessibility, or operational effect |
| Severity | Critical / High / Medium / Low with rationale |
| Confidence | Confirmed / Strong / Tentative / Unverified |
| Evidence | Logs, screenshots, test names, run links, and source paths |
| Related work | Duplicate, dependency, issue, PR, or regression link |
| Remaining unknowns | What would change the disposition |

Severity describes consequence, not confidence. A severe allegation with weak evidence remains high impact but unconfirmed.

## 3. Investigation

1. Resolve latest `main`; read `AGENTS.md`, `PROJECT_RULES.md`, and `docs/AGENT_OPERATIONS.md` at that SHA.
2. Read `docs/VALIDATION.md` and `docs/PUBLIC_RUNNER_POLICY.md` before selecting checks.
3. Fetch the canonical issue, search overlapping open/closed issues, inspect open PRs, and inspect current working refs.
4. Check the active private Notion milestone and latest coordinator handoff. If the fit is unclear, report “Milestone fit unverified.”
5. Reproduce using safe fixtures, emulators, or offline behavior. Do not touch production user data.
6. Record findings and proposed scope before implementation. The owner controls priority and expanded scope.

## 4. Scoped implementation

1. Use the assigned branch or create a narrowly named branch from the verified base.
2. Preserve existing work and check for concurrent edits.
3. Make the smallest complete fix; add a regression test for the reported behavior.
4. Link the PR to the canonical issue using `Fixes #N` only when the PR is intended to close it after merge; otherwise use `Refs #N`.
5. Do not close the issue because a PR was opened or a test passed on an unmerged candidate.

## 5. Validation and receipt

1. Select checks that cover the changed behavior and relevant regressions.
2. Use standard GitHub-hosted public runners. No local runner is required for ordinary CI.
3. Record PR base, PR head, actual tested checkout, run/attempt, each job outcome, and relevant regression result.
4. Re-run only when justified; preserve prior attempts.
5. If the candidate differs from the merged tree, do not transfer the PASS without verifying equivalence.
6. Add one receipt entry per attempt using [the v0.0.3 receipt format](../receipts/FORMAT.md), extending it only through an approved v0.0.4 change.

## 6. Audit and owner acceptance

1. Request Color Team OPS review only for a defined scope and only when the staging tool is actually available.
2. Record which audit was run, by which available host/tool, its exact target SHA, findings, and limitations. Unknown identity fields stay unverified.
3. Present the candidate, test evidence, regression coverage, and open gaps to the owner.
4. Owner acceptance is required before merge, issue closure, or release.
5. If the owner does not accept the claimed fix, keep the issue open and preserve the evidence.

## 7. Notion handoff

- Keep Notion private.
- Update the existing project handoff with the current main SHA, relevant GitHub issue/PR links, verified run receipts, remaining blockers, and next owner decision.
- GitHub Issues remains canonical for bug state.
- The existing GitHub-synced Notion views are coordination views only; do not assume they are CI-connected.
- Never copy private milestone details or credentials into public GitHub.

## 8. Stop conditions

Stop or narrow the task when the base SHA is unknown, access is missing, the issue is ambiguous, a required regression is absent, main moved and overlap is unresolved, CI is unavailable, the change would exceed authorized scope, or cost/privacy policy cannot be satisfied. Record the blocked action and exact pending evidence.
