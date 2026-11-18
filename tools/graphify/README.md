# Launcher version maps

Adapted from the existing [Test Vault mapping implementation](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/b0092267fd64e3025cbfece18db6d4fb3b1c356c/tools/graphify/version_maps.py)
and [README HQ workflow](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/007617884c75b9f422fc0feda031042da62962eb/.github/workflows/readme-hq-graphify.yml).

The registry at `versions/manifest.json` defines one map per launcher version.
Each `Graphify HQ/<version>/` contains graph.json, graph.html, a linked source
outline and receipt.json. Receipts record status, pinned commit/path, complete
file inventory and Git blob hashes, Graphify version and output SHA-256 hashes.

## Generate and validate

Use Python 3.12 and the exact packages in requirements.txt in an isolated
environment. The Windows-specific pywin32 pin satisfies MCP's declared Windows
dependency; the public Linux runner skips it.

```text
python tools/graphify/version_maps.py <empty-output-directory> --baseline <trusted-previous-sha>
python -m unittest discover -s tests -v
python tools/graphify/version_maps.py <another-empty-output-directory> --check --baseline <trusted-previous-sha>
```

After generation, review and copy its output into Graphify HQ. Never use Graphify
HQ itself as the output directory. Regeneration is read-only toward the registry,
sources and committed maps. --check compares every committed map file with the
fresh output and fails on changed, missing or additional files.

The generator validates draft/archive state and complete file inventory, compares
the bytes with the pinned Git source, rebuilds the graph, then starts an actual
Graphify MCP process and queries graph_stats and every indexed file through
get_node. It verifies the pinned commit independently of MCP's current-HEAD
annotation. Archived records, source trees and maps are also checked against
the trusted prior checkout passed by CI; changing both a hash and its source
record cannot silently rewrite an approved archive.

## Map scope and limits

Deterministic extracted file, Markdown heading/link and Python top-level
definition relationships. Other file types appear as file nodes; this is not
a complete multilingual call graph or a semantic/behavioral audit. No model API
or semantic extraction runs: semantic token cost is 0 input and 0 output.

Open graph.html as a standalone interactive map, or read graph.json through
`python -m graphify.serve "Graphify HQ/<version>/graph.json"`.
Read source_file/source_location for evidence. Do not infer runtime readiness or
test acceptance from a connected graph.

## Public runner

The launcher version workflow runs on standard public Ubuntu runners with pinned
actions, exact dependencies, read-only token permissions, finite timeout and
superseded-run cancellation. It records checkout and baseline SHAs, executes
negative regressions, rebuilds maps and verifies them through Graphify MCP.
No self-hosted runner, paid model, schedule, signing key or game release is used.

## Future toolchain upgrades

Archived maps are immutable and currently rebuild with the one locked toolchain.
Changing Graphify or extraction behavior can change older output and correctly
fail both the rebuild and frozen-history gates. Before making such an upgrade,
retain a historical-compatible generator/environment or introduce a reviewed
version-specific verifier. Do not silently rebaseline approved maps. This is a
known future upgrade constraint; no approved launcher archive exists yet.
