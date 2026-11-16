# Bug Library v0.0.4 — Coordinated Bug & Conflict Workflow

## 1. Queue intake

- Read open GitHub issues and relevant linked PRs; search both open and closed records before treating a finding as new.
- Classify each item as bug, conflict, question, enhancement, duplicate or program/governance.
- Keep one canonical GitHub issue per distinct bug or conflict. Link related issues; do not merge distinct acceptance conditions.
- For newly discovered findings, add evidence to the best existing canonical issue or prepare a draft. Do not create issues unattended.
- Read the active private Notion milestone and latest handoff. If fit is unclear, state **Milestone fit unverified** and stop implementation beyond clearly in-scope work.

## 2. Eligibility and automatic investigation

A confirmed bug already recorded in GitHub is eligible for automatic investigation and fix preparation under the owner's Level 2 authorization when expected behavior is established, evidence is sufficient, the scope is bounded, and the work fits the active milestone.

A recorded conflict is eligible for automatic investigation and resolution preparation when the conflicting artifacts and governing authority can be identified. Mechanical resolution is permitted only when unambiguous and within existing scope.

Do not treat "confirmed" as permission to change product requirements, widen scope, create new issues, merge, close, release, change settings, or spend money.

## 3. Claim and task packet

Before edits, the coordinator checks active branches, overlapping PRs, prior worker claims, current main and handoff. It assigns one worker and records:

- canonical issue/conflict URL and type;
- baseline main SHA and current work ref;
- reproduction or conflict statement;
- expected behavior / governing source;
- affected files, APIs, schemas, tests and related work;
- severity, confidence and scope boundary;
- acceptance criteria and required checks;
- worker, host, model/session and GitHub actor (unknown fields explicitly unavailable/unverified).

If the same item is already claimed, do not start a second implementation. Add investigation evidence or wait for the active worker.

## 4. Investigation

- Read all required repo instructions at the pinned baseline.
- Inspect issue history, comments, linked PRs, commit diffs, tests, current source and relevant docs.
- Reproduce using safe fixtures, emulators or offline behavior. Do not touch production player data.
- For conflicts, identify both sides, their provenance/SHAs, affected contracts, which source has authority, and the observable consequence.
- Separate facts, inference, unknowns and owner decisions.
- If a conflict is authority-bearing or ambiguous, return options and stop before changing the disputed behavior.

## 5. Prepare the fix or resolution

- Use an isolated scoped branch based on verified main or the authorized integration target.
- Preserve unrelated work; never overwrite another worker's branch.
- Make the smallest complete repair/resolution and add regression tests for the reported behavior or conflict.
- For multi-PR conflicts, coordinate through a new integration branch/PR; do not rewrite unrelated PR branches.
- For documentation conflicts, update only after resolving which source governs; preserve a decision record.
- Link the PR to canonical records with `Fixes #N` only where appropriate; otherwise use `Refs #N`.
- No merge or issue closure is performed by a worker.

## 6. Validate

- Read `docs/VALIDATION.md` and `docs/PUBLIC_RUNNER_POLICY.md` at the relevant baseline.
- Use standard public GitHub-hosted runners; no paid, larger, GPU or self-hosted runners.
- Run the smallest relevant tests plus required project CI. Preserve all attempts.
- Record PR base, PR head, actual tested checkout SHA, workflow run/attempt, each job outcome, regression name, fixtures/environment and gaps.
- A retry does not erase a prior failure. A pass applies only to the exact tested tree.
- If the candidate changes after validation, rerun affected checks.

## 7. Internal audit and owner handback

The internal auditor checks scope, evidence, regression coverage, conflicts, security/privacy implications, changed files, receipt accuracy and whether the resolution respects governing owner decisions. It is not an independent reviewer unless a separate actual worker performed it.

Return a concise evidence packet to the owner. The owner decides acceptance, merge, issue closure and release. Partial coverage stays open.

## 8. Knowledge capture and Notion

Record accepted fix/conflict knowledge in repository docs or receipts: original symptom/conflict, cause, relevant SHAs/files/contracts, resolution, regression, failed approaches where evidenced, and limitations. Notion handoff is updated explicitly from verified GitHub state; no automatic CI-to-Notion sync is assumed.

## 9. Stop and escalation rules

Stop implementation when the item is tentative, duplicates unresolved, expected behavior is unknown, work exceeds milestone or authorized scope, another worker owns overlapping paths, source refs moved without reconciliation, a required check is unavailable, cost is unknown, or the resolution requires an owner decision. Record the blocker and next decision rather than guessing.
