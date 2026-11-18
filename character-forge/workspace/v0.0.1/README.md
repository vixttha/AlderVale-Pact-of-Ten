# Formwright v0.0.1 — AlderVale adoption workspace

**State:** DRAFT; not owner-accepted as an implemented version. **Base:** source `main` verified before branch creation. CI receipts must record the actual candidate checkout.

This workspace adapts the [portable template](../../template/v0.0.1/README.md) for this project and does not edit the game.

## Owner direction already approved

- Home identity: **Formwright**, ID `AV-CF-01`, HQ `character-forge-hq`.
- All 13 races retain distinct physical character bodies. Shared humanoid skeleton/animation conventions are allowed **only while preserving race anatomy**.
- Sky-Avian starting direction: two ordinary arms/hands and separate wings mounted on the back; preserve feather, head and leg/foot variety.
- Every wardrobe item is available to every race; mesh geometry may vary to preserve fit.
- Existing approved behavior: socks show with low shoes and tuck/hide under high boots; underwear is a permanent non-removable base.
- Character Compatibility Matrix belongs in Test Vault as a documented proposal, not a claim of implemented tests.

## Decisions still open

Exact wing rig roots and hierarchy; other species appendage rigs; Draconic Kin wing variability; morphological slider limits; clothing mesh variants and performance limits; facial shape catalogs; save schema changes; art and shading. Do not silently lock these.

## Acceptance gates before archiving

1. Root game README and current game logic unchanged.
2. Generic template contains no project-specific or private content.
3. Working role and authority verified; no autonomous or merge authority created.
4. Hosted validator verifies links, files, scope, archive immutability and negative paths.
5. Exact-source Graphify run and MCP readback recorded, with code-only scope disclosed.
6. Test Vault overlaps and proposed/implemented/verified status correctly recorded.
7. No source/gameplay change without separately scoped authorization and validation.
8. Explicit owner acceptance before freezing `versions/v0.0.1/`.

## Audit status

Previous audit findings were treated as **potential conflicts** unless backed by existing source. This candidate repairs HQ structure, provenance, workflow trigger and contract documentation; it does not claim to implement the future 13-race character runtime.

See [adoption steps](ADOPTION.md) and [changelog](CHANGELOG.md).
