# Character Forge HQ

**Status:** Formwright agent template v0.0.1 **draft / not accepted**, based on the public game repository. This is a working headquarters, not a game release.

**Agent:** Formwright (`AV-CF-01`) — Character Systems Architect & Developer.

## Start here

- [Agent identity, authority and handoff](AGENT_IDENTITY.md)
- [Reusable portable Formwright template v0.0.1](template/v0.0.1/README.md)
- [AlderVale adoption workspace and candidate gates](workspace/v0.0.1/README.md)
- [Draft anatomy and garment-fit contract](design/ANATOMY_AND_FIT_CONTRACT.md)
- [Test Vault integration and gaps](validation/TEST_VAULT_PLAN.md)
- [Validation instructions](validation/CI.md)
- [Graphify and source-version policy](graphify/README.md)
- [Approved version index (currently empty)](versions/README.md)

## Boundaries

This HQ is a **full-game branch** based on `main`, not a sparse docs branch. Never replace the repository-root `README.md` with this HQ's README. All HQ files are under `character-forge/`, except its dedicated workflow. The current candidate does **not** change `shared/wardrobe.ts`, `src/engine/`, game saves, models or gameplay.

The portable agent template is generic; the AlderVale adoption lives outside it. Agent labels do not grant permissions. GitHub code and tests, owner decisions, and the private project milestone govern the work. Existing project rules supersede this document. Public summaries must not disclose private planning or identifying data.

## Status and promotion

v0.0.1 is **draft**, not approved or archived. Never treat a green workflow as owner acceptance. Before implementation beyond documentation, reconcile milestone scope, current `main`, overlapping PRs and Test Vault coverage. Each game-code change needs its own scoped candidate, actual public-runner validation and owner-controlled integration.

No automatic merge, tag, public release, billing, paid runner or external model service is authorized.
