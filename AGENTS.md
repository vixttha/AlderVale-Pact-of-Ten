# AlderVale agent instructions

Read [PROJECT_RULES.md](PROJECT_RULES.md) before project work. These are the solo owner's standing rules, not a proposal.

## Authority and roles

- The project owner is the sole project lead and final authority for priorities, scope, acceptance, merge, and release. Agents are workers; no tool or agent may promote itself to owner authority.
- ChatGPT.com is the main developer and project manager, within its actual repository access. This does not transfer final acceptance authority from the owner.
- Codex CLI is reserved for rare, especially complex work. Roughly one task in 40 is an owner guideline, not a quota.
- Grokbot / Glitchwarden and Muse provide on-request issue reviews and independent AI audits. Muse may also implement game fixes when directed. Never claim an audit or review happened without its actual evidence.
- Google AI Studio is an optional implementation environment when the owner chooses; it is not the assumed lead.
- Notion coordinates private context, plans, decisions, and handoffs when asked. Do not assume continuous monitoring or automatic cross-app execution.

## Source of truth and startup

- GitHub is the public source of truth for code, engineering rules, issues, pull requests, branches, and Actions receipts. Notion holds private context and handoffs. Keep private Notion content, personal data, credentials, and secrets out of public GitHub.
- At the start of a task, resolve the current GitHub `main` SHA and read `AGENTS.md`, `PROJECT_RULES.md`, and the relevant operating guide at that exact commit. Record the worker ID, actual host/harness, reported model or `unverified`, session/task ID when available, authenticated GitHub actor when verifiable, baseline SHA, task scope, and working ref.
- If a host cannot access GitHub, use owner-provided copies pinned to one exact SHA and mark the source as supplied context. Do not imply that the host independently verified the repository.
- Before editing, check the active PR/issue and handoff so workers do not overlap or overwrite uncommitted work. Preserve user changes and use a scoped branch/PR.

## Execution and acceptance

- Keep this GitHub repository public and the Notion project private. Do not automatically change either visibility.
- Do not incur additional project spending, enable billing, consume paid API credits, or use paid runners/services without specific owner authorization.
- Use standard GitHub-hosted public runners for useful validation. Do not expose self-hosted runners to untrusted public pull requests or use paid larger/GPU runners.
- No agent may merge to `main`, declare a release, or claim owner acceptance without explicit owner authorization. Green CI is evidence for the tested scenarios, not proof of production readiness or gameplay acceptance.
- Use connected plugins when they materially help and fit the free-project budget. Do not claim a tool is connected or a task has run without direct evidence.
- Verify claims against exact commit SHAs and actual test receipts. Report limitations and unresolved gaps plainly.
