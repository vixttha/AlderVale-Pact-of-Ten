# AlderVale Bug Library v0.0.4 — Bug & Conflict Resolution

**Status:** Standalone implementation candidate · owner acceptance pending  
**Tracking issue:** [#65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65)  
**Working branch:** `bug-library-v0.0.4-standalone` (target: permanent `bug-library`)  
**Library starting tree:** `712bd55b015138a4d7ab2d64708140c46d40d117`  
**Implementation source:** `3fa20bc5ed4fecc228cc3733536a589bf75df6a0`

## Owner-confirmed direction

Level 2 coordinated LLM workers. Automatically investigate and prepare scoped fixes for all confirmed bugs, and investigate/prepare resolutions for recorded conflicts. This authorization does not permit merge, release, issue closure, unapproved issue creation, project-law changes, or silent product decisions.

## Purpose

Provide one provider-neutral, reusable operating system through which available LLMs can retrieve shared project knowledge, take a bounded work item, investigate it, prepare a repair or conflict resolution, validate the candidate, and return evidence for owner acceptance.

This is not a new bug database, an always-on agent fleet, or a new backend.

## System responsibilities

- **GitHub Issues:** canonical public record for bugs and recorded conflicts; issue state, labels, comments, links and history live here.
- **GitHub PRs:** proposed source changes and technical conflict resolutions.
- **GitHub Actions:** standard public hosted validation on exact candidate checkouts.
- **Repository agent docs:** provider-neutral entry point, task packet, operating contract and durable engineering knowledge.
- **Notion:** private milestones, decisions, coordination, dashboard and handoffs; not a second issue tracker.
- **ChatGPT / available LLMs:** coordinator, investigators, builders and validators according to verified capabilities. Providers are interchangeable; no provider is assumed connected.
- **Color Team OPS:** bounded, on-request audit only; record only an actual invocation and its evidence.
- **Owner:** sole authority for priorities, scope changes, product decisions, acceptance, issue closure, merge and release.

## Level 2 authorization

The owner authorizes automatic investigation and preparation of fixes for all confirmed bugs already recorded in GitHub, and preparation of resolutions for recorded conflicts, subject to these bounds:

1. Work must fit the active owner-approved milestone and repository laws.
2. A confirmed bug may proceed from triage to scoped investigation and fix preparation without asking for a separate per-bug implementation approval, provided its acceptance criteria are clear and the change stays within existing product decisions.
3. A conflict may be investigated automatically. A mechanical code/merge conflict may be resolved on an isolated worker branch when the intended result is unambiguous and within existing scope.
4. Conflicts involving owner decisions, product intent, security/privacy boundaries, project laws, incompatible acceptance criteria, or unclear data ownership must be escalated with options; an LLM must not choose the governing rule.
5. Newly discovered findings may be documented on an existing canonical issue or prepared as an issue draft. Creating a new GitHub issue remains a separately authorized action under the current no-unattended-issue-creation rule.
6. One active implementation worker per work item. No concurrent edits to the same paths without an explicit integration plan.
7. Workers may create scoped branches and PRs and run authorized checks. They may not merge, close issues, publish releases, change repository settings, widen permissions, or incur spending.

## Project boundaries

- Keep GitHub public and Notion private.
- Zero additional project spending. No paid model/API, hosting, larger/GPU runner, paid service or automatic overage.
- Standard GitHub-hosted public runners only; no local/self-hosted runner requirement.
- No new always-on backend, scheduler, webhook, remote MCP service, autonomous fleet, or assumed CI-to-Notion sync.
- No production secrets or player data in CI.
- Preserve v0.0.2, v0.0.3 and the original v0.0.4 branch/history. The older v0.0.4 branch is not to be merged as-is because it diverges from current main and its comparison includes broad application/CI deletions.
- The standalone branch owns the v0.0.4 implementation and validation. Game `main` supplies the engineering baseline for game assignments.

## Documents

- [Architecture](ARCHITECTURE.md)
- [Provider-neutral agent entry point](AGENT_ENTRYPOINT.md)
- [Operating workflow](WORKFLOW.md)
- [Bug triage standard](TRIAGE.md)
- [Conflict management standard](CONFLICTS.md)
- [Acceptance plan](ACCEPTANCE.md)

## Historical pilot baseline and planning fit

Verified game main baseline for the original pilot: `a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd`. Earlier `3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21` is historical only; see conflict record `AV-CONFLICT-001`.

**Milestone fit unverified.** The private active milestone could not be independently retrieved in the fresh-session test. This candidate therefore limits implementation to the owner-directed v0.0.4 queue/conflict workflow and the explicitly scoped Issue #75 pilot. Do not expand to unrelated backlog work until milestone fit is verified.

## Acceptance state

Architecture, queue implementation, conflict-recording implementation and pilot evidence are prepared for owner review. v0.0.4 is not accepted or released. No merge, release, issue closure, automatic dispatch service, or background execution is authorized by this document.
