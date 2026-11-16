# README HQ v0.0.3 workspace record

**Status: Draft for owner review.** v0.0.2 remains the latest owner-approved and archived HQ version on \`readme-hq\`.

This workspace prepares the v0.0.3 folder-guide refresh and its regression guard. It is not an approved archive.

## Candidate files

- [Proposed landing page](DRAFT.md)
- [Proposed folder guide](GUIDE.md)
- [Proposed changelog](CHANGELOG.md)
- [Current approved v0.0.2 archive](../../versions/v0.0.2/README.md)
- [Current live folder guide](../../README.md)
- [Validator implementation](../../../tools/check_readme_hq.py)
- [Frozen-source manifest](../../../tools/readme_hq_baselines.json)
- [GitHub Issue #99](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/99)

## Scope and boundaries

- Keep v0.0.2 and v0.0.1 archives, changelogs, and manifest entries frozen.
- Keep the public game README and PR #62 separate from this HQ documentation task.
- The proposed GUIDE documents the current validator and is checked by the new guide-coverage regression gate.
- The live \`readme-hq/README.md\`, root HQ landing page, approved version index, archive directories, and frozen-source manifest remain unchanged until explicit owner acceptance.
- After acceptance, archive the exact approved landing page and guide, finalize the changelog, update the live documents and approved version index, add the v0.0.3 source commit/path/blob entries, and change this workspace row to an archived status.
- Validate the exact archive candidate SHA using the standard public GitHub-hosted README HQ workflow.
- No merge into \`main\`, public README promotion, or game release is included.

## Source and evidence

- Issue: #99
- Work branch: \`docs/readme-hq-99-v0.0.3-draft\`
- Starting README HQ SHA: \`e32fdf4a38ea2a5903b71d9df8f2de40ae04f99c\`
- Current main SHA at task start: \`295a25c7facabf7d350c951817ba0a1af7b1612a\`
- Current main is not merged into this intentionally sparse documentation branch.
