# README HQ

AlderVale’s home for the public README’s approved versions, changelogs, and drafts.

**Current approved HQ version:** `v0.0.2` (owner-approved and archived on `readme-hq`; not merged into `main`).
**Proposed next HQ version:** `v0.0.3` (draft for owner review; not archived).

| Start here | Use it for |
| --- | --- |
| [Public README version history](../../../versions/README.md) | Compare approved game README versions and their changelogs. |
| [Public README workspaces](../../../workspace/README.md) | Find the folder assigned to a game README version and review its draft. |
| [README HQ version history](../../versions/README.md) | Compare approved README HQ landing pages, guides, and changelogs. |
| [README HQ workspaces](../README.md) | Review the current HQ proposal and its separate workspace. |
| [Proposed v0.0.3 folder guide](GUIDE.md) | Review the updated validator documentation and its coverage guard. |

**Current archived public README baseline:** [v0.0.1](../../../versions/v0.0.1/README.md). The separate public README integration proposal, PR #62, remains Draft and unmerged; refresh and revalidate it against current `main` before any promotion.

**Current public README draft:** [v0.0.2 draft](../../../workspace/v0.0.2/DRAFT.md) · [Public README workspace record](../../../workspace/v0.0.2/README.md).

**Current approved HQ archive:** [v0.0.2 landing page](../../versions/v0.0.2/README.md) · [v0.0.2 folder guide](../../versions/v0.0.2/GUIDE.md) · [v0.0.2 changelog](../../versions/v0.0.2/CHANGELOG.md).

## From draft to approved HQ version

1. Draft the landing page, folder guide, and changelog in `readme-hq/workspace/<version>/`. Keep the workspace record and review notes beside them.
2. Validate the candidate with the README HQ workflow. The latest active workspace guide is checked against the validator's implemented coverage requirements.
3. Wait for explicit owner acceptance before archiving. A Draft workspace is not an approved version.
4. After acceptance, copy the approved landing page and guide byte for byte into `readme-hq/versions/<version>/`, add the changelog, update the approved version index and live documents, and pin each frozen file's source commit, source path, and Git blob SHA-1 in the baseline manifest.
5. Keep the public game README process separate. An approved HQ archive does not merge into `main`, publish the game README, or declare a game release.

The `readme-hq` branch is a sparse documentation branch. Do not merge it wholesale into the full game `main` branch. All merges, public README promotion, and releases remain owner-controlled.
