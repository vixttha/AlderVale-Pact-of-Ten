# Bug Library v0.0.4 — Acceptance Plan

Version 0.0.4 is not accepted by documentation completion alone. Each gate requires inspectable evidence. The owner makes the final acceptance decision. No merge or release is authorized by this plan.

| Gate | Required result | Evidence |
| --- | --- | --- |
| A. Safe version foundation | Working branch starts from verified current main; v0.0.2, v0.0.3 and old v0.0.4 history preserved; no unrelated source deletions | Branch SHA and exact diff review |
| B. Shared agent entry | Provider-neutral entry point identifies pinned startup docs, issue/PR retrieval, handoff fields and capability limits | Fresh-session walkthrough with at least two available LLM hosts where actually connected; unavailable hosts marked |
| C. Bug intake and dedupe | Open and closed issue search reuses canonical bug records; tentative reports do not become confirmed | Dry-run on existing open, closed and duplicate examples; no duplicate issue created |
| D. Conflict intake and classification | Conflict types, authority hierarchy, evidence record and escalation rules work | Fixtures for PR overlap, client/server contract mismatch, requirement conflict, agent disagreement and conflicting test receipts |
| E. Level 2 eligibility and dispatch | Confirmed, in-scope bugs automatically become eligible for investigation/fix preparation; recorded actionable conflicts become eligible for investigation/resolution preparation; one worker per item | Queue dry-run with claimed, blocked, duplicate, out-of-scope and ready items |
| F. Safe worker execution | Worker pins base SHA, checks overlap, reproduces, prepares minimal fix/resolution and regression tests on isolated branch | One bug candidate and one conflict-resolution candidate; no main changes |
| G. Authority protection | Owner decision conflicts stop before disputed changes; no automatic issue creation, closure, merge, release, scope expansion or settings changes | Negative tests and audit of worker actions |
| H. Exact-SHA validation | Base/head/tested/merged SHAs separated; all jobs and attempts preserved; partial/flaky/skipped/wrong-SHA evidence cannot pass | Receipt fixtures and actual public-runner run for changed code |
| I. Knowledge reuse | Accepted fix/conflict notes preserve cause, source refs, chosen resolution, tests and limitations | A second fresh LLM session retrieves and correctly applies prior knowledge |
| J. Notion handoff | Private handoff reflects verified GitHub state, milestone fit and owner decisions; synced views are not treated as canonical | Readback of updated private handoff |
| K. Operational walkthrough | Fresh-session end-to-end exercise from queue pickup to owner decision | Recorded worker/host/model/actor/refs, exact evidence and owner review |

## Required fixtures

### Bug fixtures

- #13: First Spark coverage must not imply Arbor and Rare Trial paths pass.
- #35: preserve the merged fix receipt and distinguish emulator-backed auth from production Google sign-in.
- A tentative report must not be dispatched as a confirmed bug.
- A duplicate of an open or closed issue must link to the canonical issue.
- A wrong-SHA, skipped, canceled, flaky or missing test cannot satisfy a fix gate.

### Conflict fixtures

- Two PRs overlap on the same contract: detect overlap, prevent parallel edits, prepare an integration plan.
- Firestore rules and application/server behavior disagree: identify both sides and require emulator/security regression evidence.
- Two accepted requirements contradict: stop and prepare an owner decision brief.
- Two LLMs produce incompatible conclusions: compare sources and evidence; do not choose by provider identity or confidence tone.
- A branch has broad unrelated deletions relative to current main: reject it as an unsafe integration candidate.
- A mechanical merge conflict with a deterministic intended result: resolve only on an isolated branch and run regression tests.
- Conflicting CI attempts: preserve each run/attempt; do not erase a failure because a later retry passed.

## Cost, privacy and runner acceptance

- No additional spend, paid API, hosting, model, service, larger/GPU runner or automatic overage.
- Standard public GitHub-hosted runners only.
- No new always-on backend, scheduler, webhook, remote MCP server or autonomous fleet.
- No production secrets or live player data in CI.
- GitHub remains public; Notion remains private.
- No assumed CI-to-Notion synchronization.
- No local/self-hosted runner requirement.

## Completion and non-goals

The project is ready for owner acceptance only when all applicable gates have evidence and remaining gaps are explicit. A provider integration is not claimed unless connected and tested. An LLM's retrieval of repository docs is not persistent model training. Automated investigation and fix preparation do not authorize merge, closure or release.

**Current state:** architecture and acceptance candidate only; implementation acceptance pending.  
**Milestone fit:** unverified for work beyond the current private milestone.  
**Owner acceptance:** pending.
