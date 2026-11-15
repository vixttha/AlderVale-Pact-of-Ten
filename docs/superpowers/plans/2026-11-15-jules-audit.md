# Automatic Jules Audit Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Submit a findings-only Jules audit automatically on pushes to main.

**Architecture:** A GitHub-hosted Actions job runs a standard-library Python
helper against the Jules API. Only that step receives the existing secret.

**Tech Stack:** GitHub Actions, Python 3, Jules REST v1alpha.

**Spec:** docs/superpowers/specs/2026-11-15-jules-audit-design.md

## Global Constraints

- Use `GOOGLE_JULES_API_KEY`; never print it or store it in source.
- No game changes, dependency installation, automatic PRs, or repairs.
- Trigger on pushes to main; serialize dispatches without canceling a running one.
- Report submission separately from completed audit results.

## Review Focus

- Missing/invalid credentials fail without raw responses or tracebacks.
- Source pagination selects only the intended repository.
- Redirects cannot forward the secret to another host.
- POST failures do not retry and accidentally consume extra sessions.
- Invalid session links cannot enter the job summary.

### Task 1: API helper and focused tests

- [x] Add `scripts/test_jules_audit.py` with mocked API tests for pagination,
  request scope, missing credentials/source, HTTP failures, redirects,
  invalid URLs, and summary reporting. Run and observe missing implementation.
- [x] Add `scripts/jules_audit.py`: `request_json`, `find_source`,
  `submit_audit`, and `main`; use fixed API base, explicit timeouts, no POST retry,
  sanitized diagnostics, validated resource names and session links.
- [x] Run `python -B -m unittest discover -s scripts -p test_jules_audit.py -v`.

### Task 2: Workflow, docs, and publication

- [x] Add `.github/workflows/jules-audit.yml`: push/main only, contents/read,
  checkout pinned to an official commit, no persistent checkout credentials,
  tests before secret-bearing dispatch step, bounded job timeout.
- [x] Add `docs/jules-audits.md` describing trigger, secret, Jules connection,
  usage, session link, failures, and evidence limits.
- [ ] Review diff and run focused tests and `git diff --check`.
- [ ] Commit only these files and publish to main as approved; inspect the
  automatic run and its session-submission result. Record any live blocker.

## Execution ledger

- Owner approved implementation and publication in this session.
- Ruling: execute inline in the existing clean checkout, using the owner's
  main-publication authorization; protect the existing approved design draft.
- Ruling: use the official GitHub checkout action pinned to a verified SHA;
  no third-party action receives the Jules key.
- Fresh review found the source-name validator rejected Google's documented
  slash-delimited source IDs. Added failing regression coverage, then expanded
  validation. Also support documented session responses containing a name without
  a URL, constructing a link only from a validated session resource name.
