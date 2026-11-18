# Portable operations and version ledger

1. Start from exact target-main SHA and governing instructions.
2. Record source of authorization, work ref, owner-set criteria and overlaps.
3. Develop one scoped candidate. Avoid unrelated file and gameplay changes.
4. Use deterministic checks with success and failure paths and reproducible fixtures.
5. Bind all test and graph receipts to the actual checked-out SHA.
6. Confirm integration and release separately; never infer approval from green CI.
7. Archive only after explicit acceptance, including immutable source path, source commit, file blob hashes, and changelog.

Recommended layout (adapt, do not copy target-specific paths blindly): `template/<version>/`, `workspace/<version>/`, `versions/<version>/`, `validation/`, and `graphify/`.

Each version has distinct states: `draft`, `validated`, `owner-accepted`, `archived`. A template version does not imply a product release. Graphs must identify their extraction scope and SHA. Code-only dependency graphs cannot prove text documents, rigs, cloth fit, or visual quality.
