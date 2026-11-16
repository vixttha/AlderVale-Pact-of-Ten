# Install and verify AlderVale ChatGPT Project Instructions

Use [CHATGPT_PROJECT_INSTRUCTIONS.md](CHATGPT_PROJECT_INSTRUCTIONS.md) as the pasteable text. The file on `main` is the canonical repository copy. For a draft, use the exact candidate commit link. Track the candidate SHA, the repository copy, and the installed version separately. Record the installed version and source SHA in the private coordinator handoff only after checking the saved settings.

1. Open the AlderVale project and choose **••• → Project settings → Instructions**. Save the current text privately for rollback, paste the entire pinned instruction file, save, and reopen settings to verify the text.
2. Open a fresh chat inside that project. Ask **What should I work on next?** Use the tool activity available in that chat to verify GitHub and Notion reads and that the run made no writes. Check the live `main` SHA and the reason for the selected action against the current milestone. If tool activity cannot establish a required check, mark that item unverified.
3. Record the candidate SHA, saved-text result, observed tool activity, decision, and evidence gaps in the private handoff. If the smoke fails, retain the result and restore the saved settings if needed.

## Acceptance cases

| Case | Expected result |
| --- | --- |
| Existing scoped authorization | Routine actions continue with the available permission. An expanded scope or merge waits for specific owner authorization. |
| Required GitHub or Notion source unavailable | Identify what is missing. Continue only scoped work that can proceed. Exact-SHA supplied files are labeled fallback context. |
| Stale issue or handoff | Check merged source and test evidence before recommending work. WebGL recovery already on `main` is not a new implementation task. The First Spark receipt alone leaves the other reward paths in issue #13 unverified. |
| Duplicate or partially verified bug | Search open and closed GitHub issues. Reuse the matching issue and leave unresolved coverage open. Use the existing Notion mirror for coordination. |
| Expired or unclear milestone | An unclear milestone is reported as unverified. An expired milestone follows the owner’s standing rule on new feature work. |
| Active PR overlaps outstanding work | Point to the relevant review or check on the existing PR. |
| Next step is owner acceptance | Recommend the outstanding owner check even if there is no issue for it. |
| Public reply | Name private source types and keep titles, links, and details private. |
| Base or PR head moves | Compare revisions. If coverage equivalence is unclear, keep the receipt tied to its original checkout. |
| Cross-tool handoff | From each participating host, verify the actual worker, environment, access, and SHA. Carry only documented authorization. Label unavailable identity or access evidence. |

Use separate fresh chats or available hosts for cases that need a different setup. Never widen connections or publish private data just to run a smoke case. Repository CI and document inspection are recorded independently from these live checks.
