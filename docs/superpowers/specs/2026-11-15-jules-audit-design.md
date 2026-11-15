# Jules game audit design

Status: approved by the owner on 2026-11-15; implementation authorized.

## Intent

Automatically request a Jules audit when changes reach the game's main branch,
without requiring the owner to click a button and without putting
an API key in game code, repository files, terminal commands, or chat.

## Approaches

- Push to main (recommended revised setup): automatically audits uploaded
  changes and consumes Jules usage for each dispatched audit.
- Manual GitHub Actions dispatch: explicit control, but does not meet the owner's
  requirement to avoid clicking to start audits.
- Pull request trigger: convenient review of changes, but consumes Jules usage
  for each eligible event and needs additional handling for untrusted branches.
- Scheduled audit: recurring coverage, but consumes usage even without changes.

The owner requires automatic initiation. This revised proposal uses pushes to
`main`; scheduled and PR triggers are deferred. Local edits and AI Studio edits
that have not been pushed to GitHub do not trigger an audit.

## Proposed behavior

- Add one GitHub Actions workflow using a GitHub-hosted Linux runner.
- Trigger automatically on pushes to `main`. Serialize dispatch jobs and allow
  pending jobs to be coalesced by GitHub during bursts; do not claim every
  intermediate commit receives a completed audit. Do not cancel a running
  dispatch, since it may already have created a remote Jules session.
- Read the existing repository secret named `GOOGLE_JULES_API_KEY` only in
  the API request step. Do not expose it to the game, checkout code, or Jules prompt.
- Use Python's standard library to call the official Jules REST API; no
  package installation or third-party action is needed.
- Find the connected Jules source matching `vixttha/AlderVale-Pact-of-Ten`;
  stop with a short diagnostic if it is unavailable or authentication fails.
- Request an audit of `main`, covering correctness, multiplayer trust boundaries,
  authentication, Firebase rules, secret handling, and material performance risks.
- Ask Jules for evidence, file locations, severity, suggested fixes, and limits
  of verification. Ask it to report findings without changing files or opening PRs.
- Record the requested branch and GitHub commit SHA in the audit prompt; require
  Jules to report the SHA it actually inspected and disclose any mismatch.
- Show only a validated Jules session link and submission status in the Actions
  summary. Never print request headers, the key, or raw API errors/responses.
- Do not automatically retry session creation, approve plans, merge, deploy,
  publish findings, or launch follow-up work.

## Boundaries and verification

The no-edit instruction is a prompt constraint, not a separate read-only Jules
permission. Audit findings require review. A successful workflow means the session
was submitted; it does not mean the audit completed or the game passed.

Validate the request construction, secret handling, source selection, and error
paths with mocked responses before publication. A live end-to-end run requires
the Jules GitHub app to have access to this private repository. No live API call
or audit has been performed during design preparation.

## Implementation scope

One workflow, one small API helper with focused tests, and setup instructions.
No game code, dependencies, runner provisioning, or account settings changes.
Publication and the first live audit will be handled only within the owner's
approved scope.
