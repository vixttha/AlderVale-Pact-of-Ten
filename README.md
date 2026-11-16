# AlderVale Bug Library

**Library version 0.0.2**

Start with [open bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aopen+label%3Abug), search [all issues](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue) for duplicates, or browse [closed bugs](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues?q=is%3Aissue+is%3Aclosed+label%3Abug).

This branch holds the public bug-handling guide and historical verification receipts. Each GitHub issue is the authoritative record for its title, labels, assignee, and current status. Receipts point to the issue and preserve evidence for a specific fix.

## Report and triage

1. Search open and closed issues before filing. Add new observations to the matching issue when the defect is already recorded.
2. Include the version or commit, environment, expected and observed behavior, and the smallest useful reproduction. Keep account details and credentials out of public reports and logs.
3. Use `bug` for defects, `question` for unresolved design decisions, and `enhancement` for maintenance changes. Use the issue to track blockers and related PRs.

## Fix and verify

1. Start a scoped fix branch from current [main](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main), check for overlapping PRs, and link the fix PR to the issue.
2. Run the applicable [validation checks](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/main/docs/VALIDATION.md) on standard public GitHub-hosted runners. Record the actual tested checkout, including the base and head if GitHub tested a PR merge checkout.
3. Close the issue as fixed after the linked fix is merged, required checks pass for the candidate, and the relevant regression or documented gameplay check covers the claim. Leave partly covered issues open and record what remains.

## Fix receipts

- [#35 · Guest migration and second-account enrollment](receipts/35-guest-migration.md)
- [#13 · Campus quest rewards](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) illustrates partial coverage. First Spark checks cover one quest. Use the issue for current status and the remaining reward paths.

Update this library on `bug-library`. Use [Actions](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions) and the live issues for current engineering state.
