# Conflict record AV-CONFLICT-002 — claim ref namespace collision

- **Tracking issue:** #65 (existing v0.0.4 project issue; no new issue created)
- **Category:** mechanical / repository ref namespace
- **Status:** resolution prepared in PR #83; owner acceptance pending
- **Decision required:** no

## Conflict statement

The proposed nested claim ref \`bug-library/claims/issue-75\` could not be created because the repository already has a top-level branch named \`bug-library\`. Git refs cannot have both \`refs/heads/bug-library\` as a branch and a nested \`refs/heads/bug-library/claims/issue-75\` path.

## Sources

| Source | Revision | Evidence |
| --- | --- | --- |
| Existing \`bug-library\` branch | \`46c504ffdbd343df825398c403d3a0417acb9e82\` | Existing top-level ref |
| Successful flat claim branch | \`6570e8498b1ee5c99dc006cc3fb5317a7a9b0b32\` | \`bug-library-claim-issue-75\` contains the active claim record |

## Governing authority

Live GitHub repository refs and Git ref namespace constraints. No product behavior, project law or owner preference is in dispute.

## Resolution

Use \`bug-library-claim-issue-N\` as the stable flat per-issue claim ref. The Issue #75 claim was successfully created at \`bug-library-claim-issue-75\`. Initial ref creation remains the atomic claim operation; updates require expected-SHA compare-and-swap.

## Validation and limits

This resolves a mechanical naming collision only. The ref is a cooperative lock, not a security boundary or proof of actor identity. The claim remains active while the Issue #75 worker assignment is in progress.
