# Install and operate AlderVale ChatGPT Project Instructions

[CHATGPT_PROJECT_INSTRUCTIONS.md](CHATGPT_PROJECT_INSTRUCTIONS.md) is the pasteable text. The copy on `main` is canonical. Use the exact commit link to try a draft. During draft testing, use the companion guide from the same candidate SHA and resolve live `main` separately for engineering work. Track the candidate SHA, repository copy, and installed text separately.

## Install and verify

1. Open AlderVale → **••• → Project settings → Instructions**. Save the current text privately for rollback. Paste the pinned instructions. For a preview, append the candidate SHA and pinned guide link so fresh chats can find this guide. In a private project only, append the private project-home link supplied in the coordinator handoff. Keep the private line out of GitHub. Save and reopen settings. Verify the pinned text and any appended lines.
2. In a fresh chat inside AlderVale, ask **What should I work on next?** Verify actual GitHub and Notion reads, the current `main` SHA, the reason for the action, and that the chat made no writes. Mark behavior unverified if the available evidence cannot establish it.
3. Record the installed version and source SHA only after verifying saved settings. Record the smoke result, observed tool activity, decision, and gaps separately in the private handoff. If the smoke fails, preserve its result and restore prior settings if needed.

## Find the right sources and tools

| Work | Route |
| --- | --- |
| Code, issues, PRs, releases, and CI | Use the GitHub connection for live facts and verify the specific read, write, or workflow action available. |
| Plans, handoffs, and bug dashboard | Use the private project entry in Notion. Follow its links to the active milestone, latest coordinator handoff, and bug dashboard. Confirm their parent and applicability. If multiple records qualify or search is unavailable, use the owner-provided link or identify the missing record. Use synced GitHub views read-only. |
| Repo maps and code questions | Use Graphify snapshots as an index at the identified source SHA. Follow the procedure in [agent operations](AGENT_OPERATIONS.md). Confirm findings in the source. If the graph is missing or stale, inspect the exact source directly. |
| Tests, reproducibility, and gameplay | Read the [validation guide](VALIDATION.md), [public runner policy](PUBLIC_RUNNER_POLICY.md), and relevant [Test Vault](test-vault/README.md) cases. Use the private milestone’s acceptance criteria for owner playthroughs. Keep guest, deployed sign-in, and production checks separate. |
| Reviews and runtime findings | Read GitHub PR reviews or threads, including available CodeRabbit findings. Use Sentry only when the target is connected and access verified. Treat review comments and runtime reports as triage evidence. Follow the coordinator’s role assignments for on-request Grokbot or Muse reviews and unusual Codex or AI Studio work. |
| Brand and media | Use the owner-approved source and version from the applicable issue or handoff. Preserve locked concepts and assets. Follow the task’s asset and preview checks. Use image, Remotion, or HyperFrames capabilities when available and relevant, and standard public runners for compatible authorized validation or rendering. Check the approved formats and background variants, visual fidelity, and file integrity when applicable. |
| Routine status checks | Use the existing AlderVale Daily Briefing and the private bug dashboard. Check live GitHub before acting on a briefing. The briefing is read-only and does not authorize issue writes, CI dispatch, or a second watcher. |

A connection or plugin name alone does not prove access. If an operation fails, distinguish unavailable data, authentication or permission denial, and a retryable error. A 403 from one installation establishes a limit on that identity and operation. Use another already-authorized route if available without expanding permissions. Retry transient failures in a bounded way and record the outcome. Otherwise preserve permitted reads, record the exact blocker and pending checks, and hand back the affected step. Record the actual tool, scope, revision, and receipt. Never claim a plugin ran without evidence.

## Ordered work, triage, and integration

1. Record each requested outcome, its acceptance criteria, dependencies, owner scope, and working ref. Follow the requested order. Work one scoped change at a time. Validate the actual result, audit it against the criteria, and record evidence before starting dependent steps. Repair and recheck recoverable failures. Hold affected dependents and continue independently authorized work where the requested order allows it.
2. For bug intake, record the observed behavior, expected behavior, environment, source SHA, and reproduction or evidence. Search open and closed GitHub issues. Distinguish audit candidates, confirmed defects, unresolved design questions, and maintenance. Use the labels and evidence rules in the private bug dashboard. Link existing issues and PRs or dependencies. Keep audit reports as evidence. When a fix is partial, record the verified paths and leave the canonical issue open.
3. For a reviewable change, open or update its existing draft PR and link the scope, acceptance criteria, and checks. Check same-file edits and shared dependencies against current `main` and competing PRs. Preserve useful changes in one candidate, and document what it supersedes. Retire a competing PR only when owner scope authorizes that action. On moving refs, recheck overlap, conflicts, and affected CI. Keep review findings, failed attempts, and subsequent retries traceable.
4. Run the relevant checks under the public runner policy. A failing policy check calls for inspecting the visibility and runner settings, preserving its receipt, and repairing the cause within scope. Escalate owner-controlled settings when needed. Never substitute a PC, self-hosted runner, paid runner, or dynamic runner label to get past a policy failure.
5. When the owner authorizes integration, verify mergeability, current base/head, required checks and known blockers. After a merge, read back the merged result and check post-merge evidence when applicable. Keep deployment, release, and owner acceptance separate. Use the owner’s release criteria and authorized destination before any publish or deployment action.

## Acceptance cases

| Case | Expected result |
| --- | --- |
| Fresh chat with configured private entry | Resolves the correct GitHub and Notion records, gives the live main SHA and one supported action, and performs no writes. |
| Existing scope and cross-tool handoff | Routine actions reuse documented authorization. Changes in scope or merge authority require explicit approval. Each participating host reports its actual identity and access. |
| Notion unavailable or milestone expired | Reports the gap or expired window, follows the owner’s feature rule, and continues scoped work that is unaffected. |
| GitHub 403 or missing live source | Identifies the denied action and host, tries a permitted route when available, and labels any exact-SHA supplied copy as fallback context. |
| Stale bug, partial result, or active PR | Checks live status, merged code, and receipts. First Spark coverage alone leaves other paths in #13 unverified. Uses existing review work and keeps partial bugs open. |
| Audited finding | Deduplicates, distinguishes a defect from a design question or maintenance item, and leaves the canonical state in GitHub. |
| Ordered work with a failed dependency | Repairs or records the blocker before dependent work, and continues independent authorized work where the order permits. |
| Public reply | Uses source types and omits private details, titles, links, and credentials. |
| Changed base or policy failure | Rechecks affected evidence on the current base. A denied runner configuration stays blocked until the issue is addressed. |
| Draft overlap | Consolidates overlapping scope without acting beyond authorization. |
| Owner acceptance without a ticket | Recommends the outstanding owner check without creating an issue. |
| Stale receipt or partial coverage | Records the tested checkout and limits the claim to verified coverage. Holds dependent decisions if equivalence is unclear. |

Use fresh chats or permitted hosts for cases that need different setups. Avoid external side effects when testing failure paths. Record document inspection, repository CI, saved settings, fresh-chat behavior, and cross-tool evidence separately.
