# AlderVale agent operations

[GitHub `main`](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/main) is the starting point for every host. [AGENTS.md](../AGENTS.md) and [PROJECT_RULES.md](../PROJECT_RULES.md) govern work. GitHub owns engineering state and test receipts. The existing private Notion project holds decisions, open questions, a short handoff, and links to evidence. Keep private text out of the public repository.

## Worker identity and startup receipt

| Field | What to record |
| --- | --- |
| Worker | Stable identifier and current role, such as `muse` · game fixes or `codex` · validation. Use the identity assigned for the task. |
| Host and model | Actual harness, Web UI, or API host. Record the model as shown by the host, or `unverified`. |
| Run | Session or task identifier, or `unavailable` if the host does not expose one. |
| GitHub identity | Authenticated actor or app when verifiable. A worker name or commit author field alone does not prove who authenticated. |
| Baseline and work | Full source SHA resolved from `main`, current work branch, and the issue/PR or authorized scope. |
| Evidence | Result commit SHA and Actions run URL. For graph-based claims, include the graph source SHA. |

1. Resolve the current `main` SHA and read `AGENTS.md`, `PROJECT_RULES.md`, and this file at that SHA. For a checkout, `git fetch origin main` then `git rev-parse FETCH_HEAD` records the baseline. For a browser or connector, use a commit-pinned GitHub URL. If the host cannot read the repository, use an owner-provided SHA and the three pinned files before edits and mark the handoff as supplied context.
2. Review open work and use the assigned branch. Muse stays on its current game-fix scope. Before a new edit starts in AI Studio, verify the imported baseline against GitHub. For a CLI with no auto-discovery, load these same pinned files using the harness's supported project-instruction mechanism. A Web UI needs someone to open or provide the pinned files on each new task unless its integration can fetch them.
3. Use the game validation workflow or the Test Vault, whichever covers the change. Record the run for the actual result SHA. If `main` changes during work, compare and report the new baseline before integration.
4. Hand work back with worker, host, baseline SHA, work ref, result SHA, checks and known gaps. GitHub PRs carry code review and CI. Notion is the private handoff and version review surface. Preserve the solo-owner decision point.

## Graphs by commit and version

The Graphify workflow builds a code-only graph on public standard Ubuntu runners. Python dependencies are locked; AST extraction uses no model API. `$graphify` is not a shell alias in this repository. The runner installs the locked `graphifyy` package and calls its `graphify` console script. The build job starts Graphify MCP over stdio, queries its graph stats and a source symbol, and checks the exact checkout SHA. A second public Ubuntu runner then installs the same lockfile, unpacks the transferred snapshot, and queries that graph through `tools/graphify/read_snapshot.py` as the MCP stdio server. Its receipt includes the Graphify version and a SHA-256 for the graph.

After the workflow reaches `main`, successful snapshots publish to the dedicated `graphify-snapshots` Git branch. `main/graph.json` and `main/receipt.json` identify the latest graph from `main`. Use a tag such as `v1.2.3` on a commit that contains this workflow and is reachable from `main` to retain `versions/v1.2.3/graph.json` and its receipt. A version snapshot stays tied to its original commit. A rerun that is neither `main` nor a version tag can store `commits/<sha>/` for the commit it indexed. That path is the graph of that commit, not a new product version. A Git tag is enough for graph generation, so a graph run does not publish a game release. The build hands off a bounded compressed payload to the later jobs through ephemeral job outputs. Git holds the retained history.

## Read a runner-produced graph via MCP

Install the pinned environment once with `python3.12 -m pip install -r tools/graphify/requirements.txt` in an isolated Python 3.12 environment. From the repository checkout:

```bash
git fetch origin main graphify-snapshots
source_sha=$(git rev-parse refs/remotes/origin/main)
archive_sha=$(git rev-parse refs/remotes/origin/graphify-snapshots)
mkdir -p /tmp/aldervale-mcp
for filename in graph.json receipt.json; do
  git show "$archive_sha:main/$filename" > "/tmp/aldervale-mcp/$filename"
done
python tools/graphify/read_snapshot.py /tmp/aldervale-mcp/graph.json "$source_sha"
```

Register the final `python` invocation as the MCP client's stdio command and arguments, using absolute paths. To read a version, replace `main/` with `versions/<tag>/` and derive the expected source SHA with `git rev-parse '<tag>^{commit}'` after fetching that tag. For a commit snapshot, use `commits/<sha>/` and pass that same SHA. `graph_stats` confirms the version, `query_graph` finds relevant systems, and `get_node` gives source paths and lines. If the latest snapshot is behind `main`, wait for its run or inspect the exact source directly. When comparing versions, resolve and query each snapshot at its own SHA.

The runner-side MCP process ends with the job. A Web UI that supports remote MCP needs an independently reachable streamable HTTP endpoint for the same verified snapshots. A Web UI without that support can read the GitHub SHA, receipt, and source links. GitHub MCP's `repos` and `actions` toolsets can locate files and runs. Use the existing authenticated Notion connection for private handoffs. Public CI has no Notion or model-provider tokens.

- [GitHub-hosted runners](https://docs.github.com/actions/how-tos/manage-runners/github-hosted-runners/use-github-hosted-runners)
- [Graphify upstream and MCP setup](https://github.com/Graphify-Labs/graphify/tree/v0.9.109)
- [Official GitHub MCP server](https://github.com/github/github-mcp-server)
- [Notion's MCP connection guide](https://developers.notion.com/guides/mcp/get-started-with-mcp)
