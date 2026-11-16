# Install and verify AlderVale ChatGPT Project Instructions

Use [CHATGPT_PROJECT_INSTRUCTIONS.md](CHATGPT_PROJECT_INSTRUCTIONS.md) as the pasteable text. The file on `main` is the canonical repository copy. For a draft, use its exact commit link and record the candidate SHA. Record the installed version and source SHA in the private coordinator handoff after checking the saved settings.

1. Open the AlderVale project and choose **••• → Project settings → Instructions**. Save the current text privately for rollback, paste the entire pinned instruction file, save, and reopen settings to verify the text.
2. Open a fresh chat inside that project. Ask **What should I work on next?** Check the actual GitHub and Notion reads, the live `main` SHA, the explanation for the selected action, and that the reply performs no writes. Assess the choice against live evidence, since the milestone and repository can move.
3. Record the candidate SHA, observed reads, result, and gaps in the private handoff. If the smoke fails, retain the result and restore the saved settings if needed.

## Acceptance cases

| Case | Expected result |
| --- | --- |
| Existing scoped authorization | Routine actions continue with the available permission. An expanded scope or merge waits for specific owner authorization. |
| Required GitHub or Notion source unavailable | Identify what is missing. Continue only scoped work that can proceed. Exact-SHA supplied files are labeled fallback context. |
| Stale issue or handoff | Check merged source and relevant test evidence. A closed WebGL blocker or a stale recommendation does not restart implementation. A First Spark receipt covers the tested reward path. |
| Active PR overlaps outstanding work | Point to the relevant review or check on the existing PR. |
| Next step is owner acceptance | Recommend the outstanding owner check even if there is no issue for it. |
| Public reply | Name private source types and keep titles, links, and details private. |
| Base or PR head moves | Compare revisions and confirm coverage before transferring any test result. |
| Cross-tool handoff | From each participating host, verify the actual worker, environment, access, and SHA. Carry only documented authorization. Label unavailable identity or access evidence. |

Use separate fresh chats or available hosts for cases that need a different setup. Never widen connections or publish private data just to run a smoke case. Repository CI and document inspection are recorded independently from these live checks.
