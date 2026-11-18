# AlderVale-Launcher worker instructions

This is the permanent launcher home, created at the owner's request. Read
[PROJECT_RULES.md](PROJECT_RULES.md), [AlderGate's identity](agents/aldergate/IDENTITY.md),
[the audit](docs/AUDIT-2026-11-18.md), and [the issue index](docs/ISSUES.md) before work.

## Authority and scope

- The solo owner retains priorities, spending, platform scope, merge, release and
  acceptance authority. AlderGate is a worker role, not an owner or new account.
- Build and maintain AlderVale's public pre-game launcher for Windows, macOS and
  Linux together. Work from a claimed GitHub issue; inspect overlapping PRs first.
- GitHub owns engineering state. Notion holds private decisions and handoffs.
  Never copy private Notion content, local paths, credentials or personal identity
  into this public branch.
- Keep the repository public. No new paid tools, certificates, enrollment,
  hosting, billing, wider access or scheduled workload without explicit owner
  authorization. Existing session authorization persists.
- Main integration and publication require their own owner authorization.
  Do not force-push, replace main, auto-merge, or merge unrelated histories.

## Startup and evidence

Resolve launcher HEAD and current game main to exact SHAs. Read current main's
AGENTS.md, PROJECT_RULES.md and docs/AGENT_OPERATIONS.md before game integration;
this branch's rule snapshot is historical context, not an override of newer
owner direction. Record worker ID, real host/harness, reported model or
unverified, task/session ID or unavailable, authenticated actor when verified,
issue, source SHA, work ref and actual results.

Use codex-read-agents-first for repo work; token-cheap-repo-audit for audits and
orientation; safe-editing-workflow for edits when available. Preserve user
changes, check git status before/after, make scoped edits and verify
proportionally. Keep research narrow and cite primary sources with dates.
Audit evidence must name the exact branch/SHA and distinguish source review,
synthetic tests, native installed behavior and owner acceptance.

## Housekeeping

Read [the version policy](versions/README.md) before changing a workspace.
The current working version is v0.0.1 (Draft); no archive is approved yet.
Keep each version in its own workspace, pin source commits and regenerate its
Graphify HQ map and receipt. Preserve approved archives and their records/maps
byte for byte. Verify version contracts on the public hosted runner workflow.
Development maps, source archives and public releases are different evidence.

Maintain the issue index, compatibility records, sources, release receipts,
documentation and dependency/security backlog. Reconcile stale claims.
Suggest cleanup with exact owned paths and retention rules; never delete user
saves, browser profiles, screenshots, mods or untracked work. Do not silently
close issues, remove old releases, rotate credentials or start background bots.

## Product boundary

The player installs a launcher and presses Play to enter AlderVale. Players
never run this agent, supply AI credentials, compile code or install Git/npm.
No autonomous agent or paid AI runtime is part of the product. Preserve the
game's trusted online authority; a local launcher is not an economy server.
No public-ready claim until the native installer/update acceptance matrix passes.

This branch began with unrelated empty history. Follow
[INTEGRATION.md](docs/INTEGRATION.md), not a wholesale merge into main.
