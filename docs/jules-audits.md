# Automatic Jules audits

Pushes to `main` automatically start the **Automatic Jules Audit** GitHub Actions
workflow. No manual button is needed. Changes in AI Studio or on a local PC must
be pushed to this repository before they can trigger it.

## Setup

1. Connect `vixttha/AlderVale-Pact-of-Ten` through the Jules web app and grant the
   Jules GitHub app access to this private repository.
2. Save a current Jules API key as the repository Actions secret
   `GOOGLE_JULES_API_KEY`. Do not paste keys into chat, source, or terminal commands.
3. Ensure GitHub Actions and GitHub-hosted Linux runners are available for this repo.

The workflow passes the key only to the dispatch step. It never gives the key
to game code, the audit prompt, or tests. Repository users who can change workflows
can change how secrets are used; keep write access limited to trusted people.

## What happens

The dispatcher finds the exact connected repository through the official Jules
Sources API, then creates one findings-only session against `main`. It asks for
bugs, security risks, and material performance problems, with evidence and suggested
fixes. It does not request repairs or automatic pull requests. This is an instruction
to Jules, not a separate read-only permission enforced by the API.

The Actions run summary contains the Jules session link. A green job confirms
**submission only**, not audit completion, absence of findings, or game acceptance.
Review the Jules session for the report and its verification limits. Follow-up
messages in Jules are not handled by this workflow.

Sessions start from a branch; the API does not pin this request to a commit.
The prompt records the triggering SHA and asks Jules to report the actual inspected
SHA and any mismatch. Changes arriving during dispatch can move `main`.

Each dispatched audit consumes the account's Jules allowance; Actions usage may
also apply. There is no scheduled audit while the repo is unchanged. Dispatch jobs
are serialized without canceling the running job. GitHub can replace pending jobs
during bursts, and remotely running Jules sessions may overlap after dispatch ends.

## Failures and stopping

- Missing secret: add or update `GOOGLE_JULES_API_KEY` in repo Actions settings.
- Repository not found: connect the repo in Jules; a GitHub secret alone does not
  grant Jules repository access.
- Authentication, quota, or network error: the job fails with a sanitized diagnostic.
  Check Jules before retrying an interrupted request; it might already have created
  a session. Session creation is never automatically retried.
- Disable **Automatic Jules Audit** in GitHub Actions to stop future dispatches.
  Disabling the workflow does not stop sessions already running in Jules.

## Local verification (no API calls)

```powershell
python -B -m unittest discover -s scripts -p test_jules_audit.py -v
```

References: [Jules sessions](https://jules.google/docs/api/reference/sessions/),
[Jules sources](https://jules.google/docs/api/reference/sources/),
[Jules API authentication](https://jules.google/docs/api/reference/authentication/).
