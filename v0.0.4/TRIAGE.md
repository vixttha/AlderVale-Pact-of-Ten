# Bug Library v0.0.4 — Triage Standard

## Purpose

Classify findings consistently without confusing impact, confidence, or implementation priority. GitHub Issues remains the canonical record. This guide supports triage; it does not authorize a fix, merge, or closure.

## Finding type

- **bug:** observed behavior contradicts the accepted product behavior or a documented contract.
- **question:** expected behavior, product intent, or conflicting requirements need an owner decision before implementation.
- **enhancement:** a maintenance or quality improvement that is not a current defect.
- **duplicate:** do not create a second issue; link the new evidence to the canonical open or closed issue.

## Severity

Severity describes the credible consequence if the finding is real. Record the rationale and affected scope.

| Level | Guidance |
| --- | --- |
| Critical | Credible path to account compromise, unauthorized access to other players' data, systemic save corruption/loss, or a security/economy exploit with severe broad impact. Escalate promptly; do not wait for a cosmetic or routine release cycle. |
| High | Repeatable loss/corruption of player progress, serious transaction/economy integrity failure, unauthorized state changes, or a blocker affecting a major progression path for many players. |
| Medium | A meaningful feature or progression path is broken, unfair, or unreliable, but impact is bounded or a reasonable workaround exists. |
| Low | Localized presentation, usability, or maintenance defect with no credible data-integrity, security, or major progression impact. |

Do not inflate severity to make a finding more visible. Do not lower severity solely because confidence is low; record impact and confidence separately.

## Confidence

| Level | Evidence standard |
| --- | --- |
| Confirmed | Reproduced on a pinned revision, or an automated regression demonstrates the behavior with an inspectable result. |
| Strong | A specific source path and deterministic test/code trace support the finding, but live reproduction is unavailable or incomplete. |
| Tentative | Evidence is plausible but depends on assumptions, incomplete steps, or an unverified environment. |
| Unverified | Report only, no reliable reproduction, or insufficient source/evidence to assess the claim. |

A severe but unverified report remains an important investigation candidate; it is not permission to implement a speculative fix.

## Minimum triage record

Record these fields in the canonical GitHub issue where known:

- Observable summary and finding type.
- Affected version, branch, and full source SHA.
- Environment: browser, OS, device, build, and relevant configuration.
- Smallest reproduction or an explicit statement that it was not reproduced.
- Expected behavior and observed behavior.
- Severity with impact rationale.
- Confidence with evidence rationale.
- Affected player, save, economy, security, accessibility, or operational surface.
- Evidence links: logs, screenshots, test names, Actions runs, and source paths.
- Related canonical issues, dependencies, and pull requests.
- Remaining unknowns and the next evidence needed.

Unknown fields stay unknown. Do not infer a device, revision, identity, or result from an incomplete report.

## Priority proposal

Recommend priority using, in order:

1. Credible security, privacy, data-loss, and transaction-integrity impact.
2. Breadth and reproducibility of the affected behavior.
3. Whether a core first-playable or progression path is blocked.
4. Dependencies that prevent other verified fixes.
5. Confidence and the cost of obtaining decisive evidence.

This is a recommendation, not an automatic priority assignment. The owner controls project priority and implementation scope.

## Disposition

- **Triage needed:** type, severity, confidence, or reproduction is incomplete.
- **Owner decision:** product intent or conflicting requirements are unresolved.
- **Ready for implementation:** evidence and acceptance criteria are clear and the owner has approved the scope.
- **In progress:** an authorized scoped fix is being prepared.
- **Candidate:** a fix PR exists but is not merged.
- **Partially verified:** some scenarios pass, but the full issue claim is not covered; keep the issue open.
- **Fixed:** only after the closure gate in the v0.0.4 workflow is met and the owner approves closure.
