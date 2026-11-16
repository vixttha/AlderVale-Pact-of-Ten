# AlderVale Bug Library

**Library version 0.0.5 · standalone candidate · owner acceptance pending**

Start with [open bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aopen+label%3Abug), search [all issues](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue) for duplicates, or browse [closed bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aclosed+label%3Abug).

GitHub Issues remains the canonical bug record. This version develops a controlled, agent-assisted workflow for intake, triage, investigation, exact-checkout verification, audit, and owner acceptance. It does not introduce a separate bug database or an unattended agent service.

## Version 0.0.5

- Conflict assessment requires full commit SHAs for GitHub, repository files and Actions checkouts.
- The queue holds an open issue with a linked merge until a coordinator reviews coverage against the pinned game `main`. It assigns only an explicitly scoped remainder.
- v0.0.5 uses the existing library paths so agents can keep discovering the entry point from game `main`. [The v0.0.4 snapshot](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/1ea336d623483e1501736403d6ddc13759b8638b) preserves its exact contents.

## Operating guides and acceptance history

- [Project charter](v0.0.4/PROJECT.md)
- [Architecture](v0.0.4/ARCHITECTURE.md)
- [Agent entry point](v0.0.4/AGENT_ENTRYPOINT.md)
- [Conflict management](v0.0.4/CONFLICTS.md)
- [Operating workflow](v0.0.4/WORKFLOW.md)
- [Triage standard](v0.0.4/TRIAGE.md)
- [Acceptance plan](v0.0.4/ACCEPTANCE.md)
- [Tracking issue #65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65)

## Branch and validation

`bug-library` is the permanent home. Resolve its full SHA (or use the exact SHA of a candidate the owner assigned) before reading the library. Resolve game `main` separately for engineering work. Library candidates target `bug-library`, and proposals for game fixes use their own scoped PRs.

The standalone GitHub Actions workflow runs `node --test tests/bugLibrary.test.ts` on Node.js 24 with no application checkout or package installation. The same regressions cover queue eligibility, conflict assessment and the claim-store contract.

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

The project owner controls priorities, scope, acceptance, issue closure, merge, and release. No unattended merge/closure/release, paid API, production secret, self-hosted runner, or new always-on backend is part of the library. The repository remains public; Notion remains private.
