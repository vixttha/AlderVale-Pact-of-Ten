# Graphify HQ v0.0.7

**Standalone template candidate.** Build a small evidence map that answers
which docs, changes, and test definitions belong to a feature at one Git commit.

## First Spark example

The [manifest](examples/first-spark.json) pins the head of
[PR #134](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/134).
The GitHub Actions summary records live PR provenance and includes the
deterministic graph and receipt after an MCP readback and a second rebuild.

| Relationship | Source at the pinned commit |
| --- | --- |
| Documented in | [Test Vault case G13-001](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5364cd19c862dbf071faeea58d9245e110d3b377/docs/test-vault/aldervale/cases.md#L18) |
| Changed in | [First Spark evidence added by the PR](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5364cd19c862dbf071faeea58d9245e110d3b377/docs/test-vault/README.md#L31) |
| Tested by | [Vitest save and replay case](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5364cd19c862dbf071faeea58d9245e110d3b377/tests/vault/guestQuestSave.test.ts#L155) and [Playwright duel and reload case](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5364cd19c862dbf071faeea58d9245e110d3b377/tools/ci/human.pw.mjs#L156) |

Graphify validates the links to test definitions. See PR #134 and its
application CI for game test outcomes.

## Adopt it in another public repository

1. Copy this version folder and adapt the [public-runner workflow](../../../.github/workflows/graphify-hq-template.yml).
   Use CPython 3.12 on Linux x86-64 and keep `pip --require-hashes`.
   The lock pins the Graphify 0.9.109 wheels used by this environment.
2. Replace the example manifest with your project title, GitHub
   `owner/repository`, and full source commit SHA. Fetch that Git object before
   building. For a candidate PR, set its number and source branch and pass
   `--verify-pr` with read-only `contents` and `pull-requests` permissions.
3. Add feature IDs and links as needed, or use an empty `features` list for
   source-only evidence. Each link has a repository-relative path and one
   exact line from the source with indentation removed. Use an existing
   release note, changelog, or change document for `changed_in`.
4. From the repository root, run the versioned `evidence_map.py` with the
   manifest and output directory. Add `--check` to rebuild and compare
   the graph and receipt byte for byte. To inspect a saved graph, run
   `python -m graphify.serve path/to/graph.json` and query `graph_stats`
   or `get_neighbors` through an MCP client.

The graph receipt hashes the graph and each cited source file. Live review
and merge state appear separately in the run summary. GitHub review counts
describe the exact archived SHA. Use your own release approval process for
promotion. The PR check supports same-repository PRs with a GitHub-visible
head and commit history.

See [Graphify HQ version history](../../README.md).
