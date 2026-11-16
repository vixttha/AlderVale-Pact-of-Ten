# Bug Library v0.0.4 — Bug & Conflict Resolution Architecture

## 1. Design principles

- One canonical engineering record: GitHub Issues.
- One shared, provider-neutral knowledge base in versioned repository documentation and issue history.
- Notion coordinates privately; it does not duplicate bug/conflict state.
- Level 2 means coordinated workers that act when a supported host/session runs the queue workflow. It does not mean an always-on service or continuous polling.
- One active worker per item, one scoped branch per implementation, exact-SHA evidence.
- Owner authority remains intact.

## 2. System shape

```text
GitHub Issues: bugs + conflicts (canonical)
             |
             v
     Queue / coordinator
             |
       classify + dedupe
             |
     scope + authorization
             |
      one active worker
             |
   investigate / reproduce
       /             \
  confirmed bug     conflict
       |               |
  prepare fix      classify conflict
       |               |
  regression test  prepare safe resolution
       \               /
        scoped branch + PR
                |
      GitHub Actions public runners
                |
     exact-checkout validation receipt
                |
      review / optional OPS audit
                |
        owner acceptance decision
                |
     owner-authorized merge / closure
```

No component in this design is assumed to run continuously. The queue is read when ChatGPT or another connected LLM is explicitly asked to process it, or when the existing owner-authorized briefing runs. No new trigger infrastructure is introduced.

## 3. Record model

### Bugs

A bug issue records observable incorrect behavior, affected revision/environment, reproduction, expected/observed result, impact, severity, confidence, evidence, related work and remaining unknowns.

### Conflicts

A conflict is a separately identifiable disagreement or incompatibility between two or more project artifacts, decisions, implementations, contracts, branches, dependencies or evidence sources. Record it in a canonical GitHub issue with the `conflict` label and links to all affected artifacts. If a conflict is discovered but no issue creation is authorized, append evidence to an existing canonical issue when appropriate or prepare an issue draft for owner filing.

A conflict is not automatically a bug. A conflict may expose a bug, an obsolete document, an unresolved product choice, an integration defect, or a legitimate difference between environments. Keep linked bug and conflict records distinct when they have different acceptance conditions.

## 4. Queue and dispatch

The coordinator reads open GitHub issues and linked PRs, then:

1. Searches open and closed issues for duplicates and prior resolutions.
2. Separates bugs, conflicts, questions, enhancements and program/governance work.
3. Checks labels, evidence, severity, confidence, current main SHA, milestone fit, overlapping PRs and existing worker claims.
4. Selects only confirmed bugs or sufficiently evidenced conflicts with actionable scope.
5. Checks that the work is within owner authorization and the active milestone.
6. Assigns one worker and records the worker, host, model (or unverified), session/task ID (or unavailable), GitHub actor when verifiable, base SHA, work branch and acceptance criteria.
7. Leaves ambiguous, duplicate, blocked, out-of-scope or owner-decision items unclaimed and explains why.

Level 2 does not require every provider to be connected simultaneously. Any LLM with repository access can act as a worker after reading the same entry point. If a host cannot retrieve GitHub, provide pinned source copies and mark them as supplied context.

## 5. Worker roles and single-lane execution

- **Coordinator:** selects and scopes one work item, checks overlap and dispatches one worker.
- **Investigator:** reproduces the issue/conflict and identifies evidence and cause.
- **Builder:** prepares the minimal repair or resolution on the assigned branch.
- **Validator:** runs required tests on the exact candidate and inspects failures.
- **Internal auditor:** checks scope, regression coverage, authority boundaries and receipt accuracy.
- **Owner:** accepts or rejects the candidate and separately authorizes merge, closure and release.

Use the single-lane sequence Head → Worker → Validate → Internal Auditor → Head. Roles may be performed by the same available LLM in separate steps; do not invent independent review. A separate model's review is recorded only when it actually occurs.

## 6. Conflict classification and authority

Conflict classes and handling are defined in [CONFLICTS.md](CONFLICTS.md). The key boundary is:

- Mechanical and unambiguous implementation conflicts can be prepared for resolution on an isolated branch.
- Conflicting code paths, PRs, schemas or tests require reproduction and an evidence-backed technical proposal.
- Conflicting product requirements, owner decisions, security/privacy rules, project laws or acceptance criteria require owner decision. Workers may explain consequences and options, but must not choose or silently rewrite authority.

## 7. Shared LLM knowledge

Every worker reads [AGENT_ENTRYPOINT.md](AGENT_ENTRYPOINT.md), the current repository instructions at the verified main SHA, the issue/conflict record, relevant source, and relevant prior fix/conflict receipts.

After each accepted resolution, preserve a reusable knowledge note or receipt: symptom, cause, affected files/contracts, chosen resolution, rejected approaches where evidenced, regression test, exact fixed/merged SHA and known limits. Do not claim an LLM permanently learned anything; it retrieves this material on future tasks.

## 8. Validation and evidence

Every candidate records PR base SHA, PR head SHA, actual tested checkout SHA, merged result SHA if later merged, Actions run and attempt, individual job outcomes, regression scenarios, fixtures/environment, and gaps. Flaky, skipped, canceled, missing or wrong-SHA results never count as pass.

Use [docs/VALIDATION.md](../docs/VALIDATION.md) and [docs/PUBLIC_RUNNER_POLICY.md](../docs/PUBLIC_RUNNER_POLICY.md) at the verified baseline. Use standard public GitHub-hosted runners only. CI evidence does not prove production security, production login, multiplayer safety, gameplay acceptance or release readiness unless the exact scenario is covered.

## 9. Notion coordination

Notion holds private milestones, owner decisions, current coordinator handoff and dashboard navigation. Update it explicitly from verified GitHub evidence. Existing synced issue/PR views are mirrors, not canonical records or CI-to-Notion automation. Keep private milestones, identity data, secrets and private deliberations out of public GitHub.

## 10. Stop conditions

Stop or escalate if the baseline is unknown, repository access is missing, a work item is not confirmed, scope exceeds authorization, main moves and overlap is unresolved, a conflict depends on owner intent, required tests are unavailable, a branch contains unrelated deletions, cost cannot be established, or private information would be exposed.
