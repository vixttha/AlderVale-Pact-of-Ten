# Memory Boundary

This folder is **not** a mirror or export of the private Notion memory database or the live custom agent's internal memory.

## Where information belongs

| Information | Home |
| --- | --- |
| Public source facts, issue/PR links, public CI receipts, approved public decisions | This branch, when useful and kept current |
| Private plans, milestone details, owner decisions not approved for publication, handoffs, private agent memories | Private Notion |
| Credentials, tokens, secrets, personal contact details, real-life identity | Never commit; use the provider's approved private secret mechanism only when explicitly authorized |

## Publication rules

A record may be committed only when all of the following are true:

1. It is already public in GitHub or is an owner-approved public summary.
2. It contains no private Notion title, URL, page ID, body text, or copied conversation.
3. It contains no personal information, credential, token, or secret.
4. Its source and exact revision are recorded when applicable.
5. Its freshness and supersession status are clear.

Do not assume Notion and GitHub synchronize automatically. Do not copy private memory into public GitHub to make it “available” to agents. A public-safe summary is not a substitute for the private source.

## Updating memory

Search for an existing topic before adding a record. Update or supersede the existing record rather than creating duplicates. Keep facts separate from decisions and proposals. Mark unknowns as unknown. Recheck changing facts against live GitHub before relying on them.

The live Notion agent's memory toggle and its private memory contents are managed in Notion. This repository cannot prove that the toggle is enabled or that a fresh agent session retained a memory.
