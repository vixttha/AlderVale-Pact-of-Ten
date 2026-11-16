# Notion Agent HQ

**Display name:** Notion Agent\
**Branch:** `notion-agent`\
**Initial workspace:** `v0.0.1`\
**Status:** Working home; not an agent release or project release.

This branch is the version-controlled home for the AlderVale Notion coordination profile and its **public-safe** project memory rules. The live custom-agent configuration and private memory remain in the private Notion workspace.

## Authority

- **GitHub** is authoritative for public source code, engineering rules, issues, pull requests, branches, and CI receipts.
- **Private Notion** is authoritative for private project plans, active milestones, owner decisions, and coordination handoffs.
- **The project owner** sets priorities and scope, accepts results, and authorizes merges and releases.
- This branch does not create an automatic Notion ↔ GitHub sync or continuous monitoring.

## Privacy boundary

This repository is public. Never commit private Notion page contents, private page titles or links, page IDs, private milestone details, personal information, credentials, tokens, or private agent-memory exports. Public memory may contain only information already public in GitHub or an owner-approved public summary. The private Notion workspace remains the home for private memory.

## Layout

- `workspaces/v0.0.1/` — editable v0.0.1 agent profile, memory policy, public project context, and templates.
- `versions/` — approved, immutable snapshots are archived here only after owner acceptance.
- `audits/` — public-safe audit methodology and reports only; private configuration findings stay private.

The root README is the HQ index, not a scratchpad. Each future version receives its own isolated workspace. Do not edit another version's workspace while working on one version.

## Version workflow

1. Work only inside the selected `workspaces/vX.Y.Z/` folder.
2. Validate links, source SHAs, privacy boundaries, and consistency with the current repository rules.
3. Record the exact candidate commit and actual checks.
4. Archive a byte-matched snapshot under `versions/vX.Y.Z/` only after the owner accepts that version.
5. The owner separately authorizes merges, publication, and any change to the live Notion agent.

No merge, release, permission expansion, or public sharing is authorized by this branch alone.
