# Bug Library v0.0.4 — Conflict Management Standard

## Purpose

Treat conflicts as first-class engineering work items. The goal is to detect incompatible project state early, establish which sources govern, and prepare a safe resolution with evidence. Conflict management must not let an LLM invent or override owner intent.

## Conflict categories

| Category | Examples | Default handling |
| --- | --- | --- |
| Code / merge | Same files changed differently; merge cannot be applied cleanly | Isolated integration branch; resolve only when intended behavior is unambiguous |
| Issue / requirement | Two issues demand incompatible outcomes | Compare history and accepted decisions; owner decision if intent differs |
| PR / integration | Overlapping PRs change the same contract or feature | Compare diffs and test combined behavior; do not rewrite another branch |
| Architecture / contract | Client/server, API, event or module contracts disagree | Trace callers, producers, consumers and tests; propose compatible contract |
| Data / persistence | Firestore rules, schema, client and server assumptions differ | Emulator/fixture reproduction; security-sensitive changes require owner review |
| Dependency / toolchain | Lockfiles, package versions, runtime or API versions conflict | Reproduce clean install/build; no unapproved upgrades or spending |
| Test / evidence | Test results, receipts or source claims contradict | Pin SHAs, inspect run attempts and test scope; retain failed/flaky outcomes |
| Security / privacy | Permissions, identity, data exposure or policy boundaries disagree | Stop risky implementation; escalate for owner decision |
| Agent / instruction | LLM outputs or repository instructions disagree | Trace provenance and authority; newest confirmed owner decision governs |
| Product / design | Gameplay, UX, lore or feature requirements conflict | Prepare options and consequences; owner chooses |

## Authority order

Use the following order to determine which source governs, while checking recency and exact revision:

1. Newer explicit owner decision, verified from the actual owner-authored source.
2. Current owner-confirmed project law and accepted project decisions.
3. Current repository engineering rules at verified main.
4. Accepted specifications and milestone criteria.
5. Merged code and tests as evidence of current implementation (not proof of intended product behavior by themselves).
6. Open PRs, issues, agent proposals and generated documentation as claims to investigate, not authority.

This hierarchy does not allow an LLM to infer owner approval from a worker label, commit author, issue text, PR text or generated handoff. If two owner-confirmed decisions conflict and recency/intent cannot be established, escalate.

## Resolution classes

### Mechanical

Examples: clean textual merge, generated lockfile conflict where dependency intent is identical, duplicate documentation anchors. May be prepared by a worker only when the intended result is deterministic, no product/security policy changes, and tests cover the result.

### Technical

Examples: client/server type mismatch, Firestore rule vs server contract, incompatible PR changes, duplicated state ownership. Worker reproduces both sides, identifies authoritative contract, prepares the smallest safe change and regression tests. Security-sensitive or data-migration changes are always escalated for owner review before merge.

### Authority-bearing

Examples: contradictory product requirements, owner decisions, project laws, privacy/security policy, milestone scope, incompatible acceptance conditions, or unclear data ownership. Worker must not choose. Prepare a neutral conflict brief with sources, alternatives, trade-offs, risks and the exact owner decision required.

## Required resolution record

- Canonical conflict issue and linked affected issues/PRs.
- Category, severity, confidence and status.
- Both/all conflicting sides with source URLs and full SHAs/revisions.
- Which source is authoritative and why, or **authority unresolved**.
- Minimal reproduction or deterministic diff/test evidence.
- Resolution class: mechanical, technical or authority-bearing.
- Proposed resolution and alternatives considered.
- Files/contracts/branches affected.
- Regression and integration tests required.
- Worker identity/host/model/session and authenticated GitHub actor, with unknowns marked.
- Base/head/tested/merged SHAs and Actions run/attempts.
- Residual disagreement, owner decision and follow-up.

## Safety rules

- Never resolve a disagreement by silently deleting one side's work.
- Never force-push, rewrite another worker's branch, or merge a PR.
- Never change owner-approved requirements, security/privacy rules, permissions, project visibility, billing or milestone scope.
- Keep original evidence and prior failed attempts.
- If a conflict is only a duplicate report, link it to the canonical record rather than creating a second issue.
- A conflict resolution is not complete until its linked regression/integration evidence is recorded and the owner accepts the outcome.


## Conflict record contract

Each conflict record must include:
- stable ID and canonical GitHub tracking issue;
- conflict category and concise statement;
- at least two source types, exact references and revision identifiers;
- the observed incompatibility and impact;
- governing authority and why it applies;
- whether owner decision is required;
- proposed resolution and exact evidence;
- regression/validation evidence and unresolved gaps.

The executable \`conflicts.ts\` assessor rejects records without two revision-pinned sources. It permits only unambiguous documentation, mechanical, code-contract or test-evidence corrections when current main or an accepted requirement clearly governs. Product intent, project-law ambiguity, active milestone scope and security/privacy conflicts are escalated. An agent's own output or external page is never governing authority.

## Pilot record: AV-CONFLICT-001

The v0.0.4 candidate and tracking issue originally identified \`3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21\` as current main. Live GitHub main and PR #83's base resolved to \`a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd\`. The old SHA is valid historical evidence, but not the current engineering baseline.

**Authority:** live GitHub main at the verified full SHA.  
**Resolution:** reconcile the PR branch with current main; update the project baseline and preserve the older SHA as historical context.  
**Owner decision:** not required; this is a documentation/source-provenance correction, not a product or project-law choice.  
**Record:** \`records/conflicts/AV-CONFLICT-001.md\`.
