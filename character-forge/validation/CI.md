# Formwright v0.0.1 hosted validation

The dedicated [workflow](../../.github/workflows/formwright.yml) runs on `character-forge-hq` pushes and on applicable PRs, using **only** public standard `ubuntu-latest` runners. It records the exact checkout SHA and Graphify provenance, checks portable templates and doc links, enforces scoped paths and frozen archives, and executes negative-path validator unit tests.

The existing `validate.yml` game matrix already runs on PRs, but **not** automatically on `character-forge-hq` branch-only pushes. Do not claim it did. PR candidates touching game code must pass the full relevant main matrix. The HQ workflow is not a substitute for game CI.

No external model provider is called. No local/self-hosted or larger runner is required, no automatic publication, tag, merge or release is performed. Graphify is code-only, not a visual/rig validator.

**Evidence states:** Proposed → Implemented → CI run started → Verified (only once observed at an exact checkout). Do not archive v0.0.1 before owner acceptance.

The separate version-document Graphify stage must also pass: it checks v0.0.1 draft template/adoption headings and references through a verified MCP document readback, with per-file hashes. No `versions/v0.0.1/` archive exists until owner approval.

## WebKit setup regression guard

The standard public-runner `policy` check now invokes `tools/ci/check_webkit_container.py` on pull requests and main pushes. The associated Test Vault Python negative fixtures run in its existing test phase. This checks that WebKit remains a separate real browser test using the official preconfigured `mcr.microsoft.com/playwright:v<locked-version>-noble` image on standard hosted Ubuntu, with no `playwright install --with-deps`, `apt-get`, or silent fallback to the non-container matrix. The image's version must match the locked Playwright package.

This prevents the known workflow misconfiguration from passing CI, but it cannot guarantee internet availability, runner uptime or eliminate every possible timeout. Owner-controlled branch protection requiring the `policy` status is an additional independent control. No paid or self-hosted runners, new services, or release operations are introduced.
