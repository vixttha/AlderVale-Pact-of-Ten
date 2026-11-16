# Bug Library v0.0.4 — Architecture

## System shape

A cloud-first, chat-operated workflow over existing project systems. There is no new runtime service or separate source of truth.

```text
GitHub Issues (canonical defect)
          |
          v
ChatGPT investigation and triage
          |
          +----> Notion private coordination / milestone / handoff
          |
          +----> scoped Git branch + pull request
                          |
                          v
                GitHub Actions public runners
                          |
                          v
              exact-SHA test and regression receipt
                          |
                          v
              ChatGPT evidence review / audit
                          |
                          v
                  owner acceptance gate
                          |
                          v
            merged fix + verified issue closure
```

Color Team OPS can be invoked for a bounded audit at the review stage. It is not a required background process and its staging installation is not a released plugin.

## Responsibilities and authority

| Component | Owns | Must not be treated as |
| --- | --- | --- |
| GitHub Issues | Bug title, body, labels, state, links, canonical history | A Notion mirror |
| ChatGPT | Investigation, triage proposal, scoped implementation, validation analysis, receipt drafting | Final owner authority |
| GitHub PRs | Proposed source changes and review discussion | Proof of acceptance before merge |
| GitHub Actions | Reproducible checks on an identified checkout | Gameplay, production, or release acceptance |
| Notion | Private milestone, decisions, coordination, handoffs | Canonical bug state or automatic CI sync |
| Color Team OPS | On-request specialist audit evidence | An always-running agent fleet or automatic approval |
| Owner | Priority, scope, acceptance, issue closure, merge, release | A delegated automated action |

## Data flow

1. Discover: search open and closed issues for duplicates; inspect relevant PRs, branches, commits, and existing receipts.
2. Triage: capture evidence and uncertainties in the canonical issue. Do not create a duplicate just to improve organization.
3. Investigate: pin the current main SHA; read repository instructions; inspect overlapping work; reproduce using safe fixtures or a local emulator where possible.
4. Implement: use a scoped branch and minimal diff. Preserve unrelated work and do not edit the same paths concurrently.
5. Validate: use the checks specified by `docs/VALIDATION.md` and the public-runner policy. Capture base, head, merge checkout, and result SHA separately.
6. Audit: request a bounded Color Team OPS review when useful; record its actual execution and findings.
7. Accept: present evidence and gaps to the owner. Only the owner authorizes merge, closure, or release.
8. Handoff: update private Notion with links and concise status derived from GitHub. Do not claim an automatic sync.

## Evidence model

Every validation receipt must distinguish:

- PR base SHA
- PR head SHA
- actual tested checkout SHA (often GitHub's synthetic PR merge commit)
- merged result SHA, if any
- workflow run ID and attempt
- each job/check outcome, including skipped, canceled, flaky, failed, and missing
- regression name and exact behavior covered
- environment and fixture boundaries
- evidence gaps and next required check

A green job is not proof that every issue path is fixed. A missing or ambiguous regression result must remain explicitly missing; it must never be translated into a pass.

## Failure and recovery

- If a source cannot be read, mark its evidence unavailable and do not guess.
- If main moves, compare refs and recheck overlapping changes before continuing.
- If a check fails, inspect the cause; do not weaken the test to obtain green CI.
- If CI is unavailable, mark it pending.
- If a branch protection or settings action is unavailable to the connected tool, report the exact setting and leave it pending.
- Never start paid compute, external metered APIs, production-data tests, or new account connections without explicit authorization.

## Security and privacy

The public repository may contain only public project information. Keep private Notion details, credentials, tokens, account verification, and real-life identity out of public artifacts. Workflows use minimum permissions, pinned actions, locked dependencies, finite timeouts, bounded artifact retention, and standard hosted runners.
