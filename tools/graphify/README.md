# Template Graphify evidence

Every registered template version has graph.json, graph.html, GRAPH_REPORT.md,
a linked outline and receipt.json in Graphify HQ. Receipts name the pinned source
commit/path, complete inventory, hashes, tool version and retained extraction.
The actual instruction and identity templates are required source inputs.

The initial Graphify corpus is six documents and one JSON schema, about 1,037
words, with no skipped sensitive files. Graphify AST indexes the schema. A host
semantic worker read all six documents under the supplied extraction spec; its
result is validated and retained with source hashes and relative evidence paths.

Initial host semantic token usage is unavailable from this harness, not zero.
The receipt marks it null/unavailable. Public CI replays retained extraction with
zero model API calls; no model key, paid runtime or deployment is introduced.

## Verify

Use Python 3.12 and requirements.txt in an isolated environment:

```text
python -m unittest discover -s tests -v
python tools/graphify/version_maps.py <empty-output-directory> --check --baseline <trusted-previous-sha>
```

The generator checks complete pinned bytes and retained source hashes, validates
semantic endpoints/confidence/line evidence, runs Graphify AST/build/clustering,
cohesion/diagnostics/report/HTML, and queries actual MCP graph_stats and get_node
for every indexed file. Missing, changed or extra maps fail comparison. Approved
archives and their records/maps remain frozen against the trusted previous SHA.

Before upgrading the locked toolchain, retain historical-compatible rebuilds;
never silently rebaseline frozen archives. No approved archive exists yet.
Graphs aid navigation, not agent behavioral or public-game release acceptance.
