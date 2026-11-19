# Copy and specialize: v0.0.1

1. Take a copy of `character-forge/template/v0.0.1/` at a named exact commit SHA.
2. Place a project-local adoption outside the portable template directory; use its authoritative rules and actual approved scope.
3. In that adoption, identify the project, role ID, target branch, owner decision, working ref, feature contracts and validation plan.
4. Adapt the generic instructions; do **not** overwrite root readmes or repo-wide rules.
5. Validate source and file isolation using `character-forge/tools/verify_formwright.py`.
6. Record Code Graphify's exact checkout and receipt, and separately identify document/version lineage. Graphify AST does not parse this template's Markdown into semantic code dependencies.
7. After public-runner validation and owner review, copy the accepted version into an immutable archive and include SHA-bound manifests and changelog.

For this adoption, game changes to `shared/wardrobe.ts`, `src/engine`, player saves or external assets are deferred to separately reviewed work. The new branch is a long-lived HQ; integration should use focused PRs to avoid merging unrelated future HQ history.
