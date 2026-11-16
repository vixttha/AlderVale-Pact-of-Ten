# AlderVale Bug Library

**Library version 0.0.4 · in development · not released**

Start with [open bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aopen+label%3Abug), search [all issues](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue) for duplicates, or browse [closed bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aclosed+label%3Abug).

GitHub Issues remains the canonical bug record. This version develops a controlled, agent-assisted workflow for intake, triage, investigation, exact-checkout verification, audit, and owner acceptance. It does not introduce a separate bug database or an unattended agent service.

## Version 0.0.4 project

- [Project charter](v0.0.4/PROJECT.md)
- [Architecture](v0.0.4/ARCHITECTURE.md)
- [Operating workflow](v0.0.4/WORKFLOW.md)
- [Acceptance plan](v0.0.4/ACCEPTANCE.md)
- [Tracking issue #65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65)

## Report and triage

1. Search open and closed issues before filing. Add new observations to the matching issue when the defect is already recorded.
2. Include the version or commit, environment, expected and observed behavior, and the smallest useful reproduction. Keep creator details, private material, and credentials out of public reports and logs.
3. Use `bug` for defects, `question` for unresolved design decisions, and `enhancement` for maintenance changes. Use the issue to track blockers and related PRs.

## Fix and verify

1. Start a scoped fix branch from current [main](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main), check for overlapping PRs, and link the fix PR to the issue.
2. Run the applicable [validation checks](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/main/docs/VALIDATION.md) on standard public GitHub-hosted runners. Record the actual tested checkout, including the base and head if GitHub tested a PR merge checkout.
3. Close the issue as fixed only after the linked fix is merged, required checks pass for the candidate, and the relevant regression or documented gameplay check covers the claim. Leave partly covered issues open and use a plain `Refs #N` link.

## Historical fix receipts

Use the [receipt format](receipts/FORMAT.md) to record exact test evidence and preserve each run attempt.

- [#35 · Guest migration and second-account enrollment](receipts/35-guest-migration.md)
- [#13 · First Spark partial coverage](receipts/13-first-spark.md)

Update the permanent library on `bug-library`. Use [Actions](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions) and live GitHub Issues for current engineering state. Keep Notion private for coordination and handoffs; do not assume CI automatically syncs to Notion.

## Authority and safety

The project owner controls priorities, scope, acceptance, issue closure, merge, and release. No unattended merge/closure/release, paid API, production secret, self-hosted runner, or new always-on backend is part of v0.0.4. The repository remains public; Notion remains private.