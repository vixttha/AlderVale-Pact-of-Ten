# Public game README v0.0.2 workspace

**Draft for review.** [Open the candidate](DRAFT.md) · [Compare with approved v0.0.1](../../versions/v0.0.1/README.md)

## This revision

- Opens with AlderVale’s game premise, current local guest build, and next actions.
- Keeps the complete clone-and-run commands, Breeze walkthrough, realm pacing labels, recovery notes, and public issue reporting.
- Adds an AI-assisted development example grounded in the First Spark browser test and its public runner evidence.

## Source and review

- Copy baseline for game behavior and setup: `main` at `3fa20bc5ed4fecc228cc3733536a589bf75df6a0`. The public v0.0.1 README reached `main` through [PR #62](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/62).
- Runtime requirements come from `package.json`. Realm pacing labels come from `shared/realms.ts`. The First Spark controls and reload assertions are exercised by `tools/ci/human.pw.mjs` at that baseline.
- [GitHub Actions run 43890556938](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43890556938) passed all seven jobs at that game SHA. The First Spark case passed in all three browser jobs. This evidence covers the tested guest journey.
- The draft uses section links and absolute public documentation links so the same Markdown works from this workspace and the repository root. Run the HQ validator on the draft and recheck links and GitHub rendering on the eventual integration candidate.
- [Gameplay capture](assets/breeze-first-spark-duel.webp) shows round one of the Frost solo duel in Breeze from game build `3fa20bc5ed4fecc228cc3733536a589bf75df6a0`. The [capture run](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43894849556) built that revision and replayed the existing First Spark Chromium scenario. The 1280 × 720 frame was converted to WebP. Keep the image alongside the draft for review and copy it with the same relative path when promoting the README.
- Image SHA-256: `589bc3fd12faeab96c8d5b80b47b9d520909d47f053632c3e25d227dee15e2ac`.
- Review the draft on desktop and narrow layouts in GitHub light and dark themes before publication.
