# AlderVale Test Vault

This is the dedicated Test Vault branch for AlderVale. Develop AlderVale’s game test catalog, fixtures, and automated suites here. Base new Vault pull requests on `AlderVale-Test-Vault`.

| What you need | Where to start |
|---|---|
| Add a Test Vault to another repository | [Reusable Test Vault on `Test-Vault`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/Test-Vault) |
| Find what AlderVale tests and how to run it | [AlderVale test and evidence guide](docs/test-vault/aldervale/README.md) |
| Look up a case ID, expected result, or manual check | [AlderVale case catalog](docs/test-vault/aldervale/cases.md) |
| Coordinate tests across languages | [Cross-language testing rules](docs/test-vault/aldervale/cross-language-rules.md) |
| Read or extend executable suites | [Test Vault source](tests/vault) and [test quality rules](PROJECT_RULES.md#test-vault-reliability-and-reuse) |

AlderVale keeps a game source snapshot here so CI can test real game code at a known commit. GitHub Actions runs the checks on standard public GitHub-hosted runners. Browser and server checks can launch an isolated test instance. Opening or playing the game does not start these suites.

For another repository, see the [v0.0.3 starter guide](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/557f640f2c5b847733d779fb6bd320481df58d0d/starter/test-vault/README.md). The reusable branch owns the template catalog, receipt verifier, copy-in instructions, and template version maps.
