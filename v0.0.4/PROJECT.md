# Bug Library v0.0.4 — Project Charter

**Status:** In development · not released  
**Version branch:** `bug-library-v0.0.4`  
**Tracking issue:** [#65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65)  
**Baseline:** `46c504ffdbd343df825398c403d3a0417acb9e82` (v0.0.3 documentation branch; acceptance remains pending)  
**Repository baseline at project start:** `3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21` (`main`)

## Purpose

Make bug handling repeatable and agent-assisted from discovery through verified resolution, without surrendering owner authority or creating a new paid service.

The system coordinates existing tools rather than introducing a separate bug database:

- GitHub Issues is the canonical defect record.
- ChatGPT investigates, triages, prepares scoped changes, checks evidence, and drafts receipts.
- GitHub pull requests carry implementation review; standard public GitHub Actions runners validate candidate commits.
- Notion remains the private coordination, milestone, and handoff surface.
- Color Team OPS is an on-request audit capability using its existing staging-only installation. An audit is recorded only when actually run.
- The project owner controls priorities, scope, implementation acceptance, closure, merge, and release.

## Autonomy boundary

**Allowed within an authorized scope:** read and compare issues/PRs, detect duplicates, gather source evidence, propose severity and reproduction, prepare a scoped branch/PR, run authorized checks, analyze failures, and draft exact-SHA receipts.

**Owner decision required:** new or expanded implementation scope, acceptance of gameplay/security claims, marking a bug fixed/closing it, merging PRs, releases, new connections or permissions, public sharing changes, and any spending.

Routine edits and checks may reuse existing authorization only for the same scope and target. No unattended merge, release, or bug closure.

## Version 0.0.4 deliverables

1. Intake and duplicate-search procedure.
2. Evidence-based triage schema and severity/confidence guidance.
3. Single-lane investigation and implementation workflow.
4. Exact-checkout validation receipt standard.
5. Canonical issue lifecycle and closure gate.
6. Notion handoff protocol that explicitly records verified GitHub receipts without assuming CI-to-Notion sync.
7. Color Team OPS on-request audit handoff and evidence record.
8. Reproducible acceptance tests and a solo-owner operational walkthrough.

See [architecture](ARCHITECTURE.md), [workflow](WORKFLOW.md), [triage standard](TRIAGE.md), and [acceptance](ACCEPTANCE.md).

## Constraints

- Keep the GitHub repository public and Notion private.
- Additional project spending: zero.
- Use standard public GitHub-hosted runners only; no paid larger/GPU runners or self-hosted runners.
- CI must not require paid AI APIs, production secrets, or live production accounts.
- No new always-on backend, webhook service, scheduler, or CI-to-Notion integration in this version.
- Preserve v0.0.2/v0.0.3 branches and historical receipts.
- Keep creator and private details out of public issues, code, logs, and receipts.

## Current known bug evidence carried forward

- [#35](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/35): merged fix PR #60; two hosted attempts are documented in the v0.0.3 receipt. Production Google sign-in remains outside that evidence.
- [#13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13): partial First Spark coverage; Arbor and Rare Trial reward paths remain unverified. The issue stays open.
- [#64](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/64): merged verification-summary workflow. Seven hosted jobs passed on the PR merge checkout; the post-merge main run is tracked separately.

## Milestone fit

**Milestone fit unverified** for the broader v0.0.4 implementation. This branch establishes the owner-directed project plan and acceptance contract; implementation beyond the currently authorized scope needs a confirmed owner scope/extension. Private planning details remain in Notion and are not reproduced in this public charter.

## Release rule

This branch is a project candidate, not a released product. v0.0.4 is accepted only after every required acceptance item is evidenced, all material gaps are disclosed, and the owner explicitly accepts the result. The permanent `bug-library` branch remains the current published library line until a v0.0.4 candidate is accepted.
