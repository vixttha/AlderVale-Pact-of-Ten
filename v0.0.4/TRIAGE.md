# Bug Library v0.0.4 — Bug Triage Standard

## Finding type

- **bug:** observed behavior contradicts an accepted product behavior or documented contract.
- **conflict:** two or more project artifacts, decisions, implementations, interfaces, dependencies or evidence sources are incompatible or contradictory.
- **question:** expected behavior or authority is unclear.
- **enhancement:** desired improvement that is not a current defect.
- **duplicate:** an existing canonical issue already tracks the same failure mode.

## Severity

| Level | Guidance |
| --- | --- |
| Critical | Credible account compromise, unauthorized access to other players' data, systemic save loss/corruption, or severe broad security/economy exploit. Escalate promptly. |
| High | Serious transaction/economy integrity failure, unauthorized state change, substantial progress loss, or a major progression blocker. |
| Medium | Meaningful feature or progression path is broken or unreliable with bounded impact or a workaround. |
| Low | Localized presentation, usability or maintenance defect without credible data-integrity, security or major progression impact. |

Severity describes consequence, not confidence. Record rationale.

## Confidence

| Level | Evidence standard |
| --- | --- |
| Confirmed | Reproduced on a pinned revision, or deterministic automated regression/source trace demonstrates the behavior. |
| Strong | Specific source path and test/code trace support the claim, but live reproduction is unavailable or incomplete. |
| Tentative | Plausible but depends on assumptions, incomplete steps or an unverified environment. |
| Unverified | Report only or insufficient evidence to assess. |

A confirmed conflict requires both sides to be identified and the incompatibility demonstrated on pinned sources. A reported disagreement alone is not a confirmed conflict.

## Required bug record

- Observable summary; type.
- Affected version, branch and full SHA.
- Environment and configuration.
- Smallest reproduction or explicit not-reproduced status.
- Expected versus observed behavior.
- Impact surface and severity rationale.
- Confidence rationale.
- Evidence links: logs, screenshots, test names, Actions runs and source paths.
- Related issues, PRs, dependencies and remaining unknowns.

## Required conflict record

- Conflict statement in neutral language.
- Conflict category from `CONFLICTS.md`.
- Both/all sides, with exact source links, versions and SHAs.
- Authority/provenance of each side (owner decision, project law, repo rule, accepted spec, code, test, external dependency or agent proposal).
- Observable incompatibility and affected behavior.
- Reproduction or deterministic comparison.
- Impact, severity and confidence.
- Whether resolution is mechanical, technical or requires owner decision.
- Safe resolution options, trade-offs, regression tests and dependencies.
- Linked canonical bug issues and PRs; unresolved questions.

## Priority proposal

Recommend priority using credible security/privacy/data-loss/transaction impact first, then breadth and reproducibility, core progression impact, dependencies, and cost of decisive evidence. The owner controls final priority.

## Disposition

- **Triage needed:** required evidence incomplete.
- **Owner decision:** expected behavior or governing authority unresolved.
- **Ready for investigation:** confirmed or strong evidence, bounded question.
- **Ready for implementation:** acceptance criteria and authority clear; eligible under Level 2.
- **Claimed / in progress:** one active worker.
- **Candidate:** PR exists, not merged.
- **Partially verified:** some scenarios pass; remains open.
- **Verified candidate:** exact-SHA required checks and regression evidence pass; awaiting owner.
- **Fixed / resolved:** only after merged change, required checks, claimed regression coverage and owner-approved closure.

Never convert a conflict to a bug or vice versa merely to fit a workflow label. Keep linked records when both exist.
