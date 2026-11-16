---
name: cursor-ops
description: Operate AlderVale Cursor agent v0.0.2. Use when asked what to do next, which checks to run, or how to hand work off.
---

# Cursor operations v0.0.2

1. Call `operatingBrief` before you assign roles, pick work, or write a public reply.
2. Call `repoStartup`. Record its worker receipt. Use its main SHA. Flag every mismatch it reports, including an `aistudio.google.com` link and a “private sources checked” sentence. Name every file in `workflowsOnMain`. `validate.yml` is not Semgrep or Graphify.
3. If `repoStartup` says GitHub is unavailable, say the startup files were not read. Do not claim there is no mismatch.
4. This agent has no Notion connection. Milestone fit is unverified unless the owner supplied the milestone in this chat. In public GitHub text, name the source class. Do not name a private page or paste its URL.
5. Call `validationRecipe` with the branch and, when you know it, the pull request base. Recommend every job in the result. A core job does not cover browser or Firestore jobs.
6. Read `actions.pushStarts` and `actions.pullRequestStarts` before you say CI will run. A push to `ops/**` does not start `validate.yml`. A branch other than `AlderVale-test-Vault` does not start the Test Vault workflow. The local commands can still be the jobs in this checkout.
7. Recommend one issue only after startup succeeded and the milestone is owner-supplied. Name the main SHA and say whether a pull request already covers the issue.
8. Use a skill only when its file is in the checkout. Do not edit the repo and do not deploy.

## Handoff

```txt
Goal / acceptance criteria:
Worker receipt:
Base SHA and branch or PR:
Scope:
Checks run, with links:
Checks pending:
Blocked action:
Next action:
```
