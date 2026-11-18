# Test Vault

This branch develops the reusable Test Vault template. The current archived version is **v0.0.3**, a copy-in starter for existing repositories. Adopt it using your project's own language, test commands, and acceptance criteria.

| Start here | Purpose |
|---|---|
| [Install the starter](starter/test-vault/README.md) | Copy in the starter and run the catalog check. |
| [Execution receipts](starter/test-vault/evidence.md) | Verify one combined verdict from your test suites. |
| [Upgrade from v0.0.2](starter/test-vault/UPGRADE.md) | Add receipts to an existing installation. |
| [Template versions](versions/README.md) | Find the historical source and the exact source commit for each version. |
| [Graphify HQ](Graphify%20HQ/README.md) | Browse a map, outline, and receipt for each archived version. |
| [Template development](CONTRIBUTING.md) | Change the starter, validate adoption, and archive a future version. |
| [Vaultwright agent role](AGENTS.md) | Template stewardship, audit workflow, and owner authority boundaries. |

The starter's catalog validator uses Python 3.12 and the standard library. Its optional GitHub Actions workflow checks catalog structure and coverage declarations. Your project's own test commands execute its tests. The branch CI rehearses adoption in Python CLI, Go API, and documentation-only projects.

The [AlderVale game-specific Test Vault](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/AlderVale-Test-Vault) holds that game's fixtures and tests. Standalone redistribution terms for the reusable starter await a license decision.
