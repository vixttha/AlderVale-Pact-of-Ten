# README HQ Graphify map

The map covers the README HQ landing page, public and HQ workspaces, approved archives, archived image links, publication PR links, and the validator. Graphify extracts code symbols. The map also reads tracked Markdown links and the archive provenance manifest without calling a model.

## Read the map

Open the [Graphify snapshots branch](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/graphify-snapshots) and use the files under `readme-hq/`. Read `receipt.json` for the source commit, SHA-256, Graphify version, and runner evidence. Compare its source commit with the head of `readme-hq` before using the map as current evidence.

With the branch's pinned Graphify packages installed, start its MCP reader with the downloaded graph and receipt in the same directory:

```bash
python tools/graphify/read_snapshot.py /path/to/graph.json EXPECTED_README_HQ_COMMIT
```

Use `graph_stats` to confirm the source revision. Use `get_node` or `get_neighbors` with `hq:file:README.md` to start from the landing page.

## Refresh

Public GitHub-hosted Ubuntu builds and queries the map, then a second runner verifies the transferred copy. A push to `readme-hq` publishes the verified snapshot after both jobs pass. Pull requests map the approved base commit and verify publication against a disposable Git remote. A stale run exits before updating the snapshot.
