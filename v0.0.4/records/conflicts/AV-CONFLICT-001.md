# Conflict record AV-CONFLICT-001 — stale v0.0.4 baseline

- **Tracking issue:** #65 (existing v0.0.4 project issue; no new issue created)
- **Category:** documentation / source-provenance
- **Status:** resolution prepared in PR #83; owner acceptance pending
- **Decision required:** no

## Conflict statement

The candidate project document and tracking issue described an older commit as current \`main\`, while the live repository's \`main\` and PR #83 base had advanced.

## Sources

| Source | Revision | Evidence |
| --- | --- | --- |
| Candidate \`v0.0.4/PROJECT.md\` | \`a6466bfbe8ca9998eeea451b85120cbde115c4a3\` | Baseline field named \`3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21\` |
| GitHub \`main\` | \`a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd\` | Live branch readback |
| PR #83 base | \`a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd\` | PR metadata readback |
| Tracking issue #65 | comment/body snapshot on 2026-11-16 | Historical baseline field still referenced the older SHA |

## Governing authority

GitHub's live \`main\` branch governs current engineering state. The older commit remains valid as historical context, not as the current baseline. No product decision, owner preference or project law is disputed.

## Resolution

- Reconcile the PR branch with live main using a two-parent reconciliation commit.
- Update the candidate's baseline field to the exact verified main SHA.
- Preserve the old SHA as historical context.
- Record the correction on existing issue #65 and keep issue state unchanged.

## Validation and limits

The reconciliation compare showed the candidate based on the current main with no behind commits. This record documents a documentation/provenance conflict, not a game behavior defect. Owner acceptance of the overall v0.0.4 architecture remains pending.
