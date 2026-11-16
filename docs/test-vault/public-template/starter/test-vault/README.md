# Test Vault v0.0.2

The Test Vault tracks what a project intends to test and the evidence for cases it has run. It works alongside your project's test commands.

## Install in an existing repository

Copy this directory's contents into your repository root, including the hidden `.github` directory. Review any filename collisions before copying. This kit contains these files:

- `test-vault/README.md`
- `test-vault/cases.md`
- `test-vault/validate_catalog.py`
- `test-vault/case-and-receipt.md`
- `.github/workflows/test-vault.yml`

Run this from the repository root with Python 3.12:

```sh
python3 test-vault/validate_catalog.py
```

The command runs with Python's standard library. It should find one starter case. To exercise the failing path locally, change its priority from `P0` to `P9`, rerun the command, then restore the valid priority. Open a pull request in a repository with Actions enabled to see the same check and the exact checkout in the job summary.

## Add your cases

Copy the five-column table in [cases.md](cases.md). Use an uppercase topic followed by a hyphen and at least three digits. Examples include `CLI-001`, `HTTP-GET-001`, and `G13-001`. IDs are unique across all case tables. Keep all five cells populated and use `P0`, `P1`, or `P2` for priority. Escape literal table pipes as `\|`. Format code blocks outside the tables.

For a project with a topic registry, supply a JSON array of unique topic IDs, for example `["CLI", "HTTP-GET"]`. Check that each registered topic has a case and every case uses a registered topic:

```sh
python3 test-vault/validate_catalog.py --topics test-vault/topics.json
```

Use [case and receipt](case-and-receipt.md) to link a case to the actual test command and result. Catalog validation checks documentation structure and optional topic coverage. A test case earns execution evidence when the relevant test runs and its result is recorded.

## Configure GitHub Actions

The included workflow runs on pull requests and merge queues on standard hosted Ubuntu. It also runs after pushes to the repository's default branch and supports manual dispatch. Enable Actions in the target repository and allow its pinned checkout and Python setup actions. Fork runs may require maintainer approval.

Public repositories use standard hosted compute. Private repositories skip by default. A maintainer can set repository Actions variable `TEST_VAULT_ENABLE_PRIVATE=true` after verifying the runner allowance and budget. For a required check, first enable the job for your repository visibility. Then select **Test Vault catalog** after a successful validation run. If the repo uses a merge queue, verify the check also reports on `merge_group`. Keep the required workflow free of path restrictions. Teams using a different runner policy can use the local command or adapt the runner configuration in their own repository.

For a new repository, initialize it and copy this kit. A maintainer of a dedicated GitHub template repository can keep these files on its default branch for GitHub's **Use this template** flow.
