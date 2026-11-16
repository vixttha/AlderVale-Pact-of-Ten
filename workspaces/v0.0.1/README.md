# Notion Agent v0.0.1 Workspace

**Status:** Draft workspace; owner acceptance not recorded.  
**Baseline:** `main` at `f44a00cda3a568f60ae27012488f6bf704088fcf`.  
**Scope:** Public-safe AlderVale coordination profile and memory architecture.

## Contents

- `agent/INSTRUCTIONS.md` — operational profile for the private Notion coordinator.
- `memory/README.md` — public/private memory boundary.
- `memory/SCHEMA.md` — versioned public-memory record format.
- `memory/public/PROJECT_CONTEXT.md` — minimal public project facts verified at the baseline.
- `templates/HANDOFF.md` — public-safe handoff template.
- `templates/DECISION.md` — public-safe decision record template.
- `audits/README.md` — rules for keeping audit evidence safe to publish.

## Acceptance criteria

- No private Notion page title, URL, ID, or content is copied into this workspace.
- No real-life identity, personal contact information, credential, token, or private memory is stored here.
- Every changing engineering fact is tied to a public source and exact SHA.
- Private milestone fit is checked in Notion at task time; it is never inferred from this snapshot.
- GitHub issue and PR state is checked live before recommending work.
- The owner retains priority, scope, acceptance, merge, and release authority.

This workspace is not proof that the live Notion agent has received these instructions or that its memory feature is enabled.
