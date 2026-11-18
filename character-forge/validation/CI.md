# Formwright v0.0.1 hosted validation

The dedicated [workflow](../../.github/workflows/formwright.yml) runs on `character-forge-hq` pushes and on applicable PRs, using **only** public standard `ubuntu-latest` runners. It records the exact checkout SHA and Graphify provenance, checks portable templates and doc links, enforces scoped paths and frozen archives, and executes negative-path validator unit tests.

The existing `validate.yml` game matrix already runs on PRs, but **not** automatically on `character-forge-hq` branch-only pushes. Do not claim it did. PR candidates touching game code must pass the full relevant main matrix. The HQ workflow is not a substitute for game CI.

No external model provider is called. No local/self-hosted or larger runner is required, no automatic publication, tag, merge or release is performed. Graphify is code-only, not a visual/rig validator.

**Evidence states:** Proposed → Implemented → CI run started → Verified (only once observed at an exact checkout). Do not archive v0.0.1 before owner acceptance.
