# Graph Report - Launcher-Agent-Template v0.0.1

## Corpus Check
- 7 files · ~1,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 82 nodes · 91 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1aea00da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Pinned Template Adoption
- Launcher Agent Instructions
- Project Binding Contract
- Launcher Agent Instructions
- Owner Authority Boundaries
- Launcher Agent Instructions
- Project Binding Contract
- Launcher Agent Instructions
- Launcher Agent Instructions
- Launcher Agent Instructions
- Launcher Agent Instructions
- Pinned Template Adoption

## God Nodes (most connected - your core abstractions)
1. `{{PRODUCT_NAME}} worker instructions` - 7 edges
2. `Worker instruction template` - 6 edges
3. `Adopt the launcher-agent template` - 5 edges
4. `Delegated housekeeper and creator/maintainer` - 5 edges
5. `Worker identity template` - 5 edges
6. `{{AGENT_NAME}}` - 4 edges
7. `AGENT_ID` - 4 edges
8. `AGENT_NAME` - 4 edges
9. `PRODUCT_NAME` - 4 edges
10. `HOME_BRANCH` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Launcher quality bar` --semantically_similar_to--> `Creator loop`  [INFERRED] [semantically similar]
  workspace/v0.0.1/template/IDENTITY.template.md → workspace/v0.0.1/template/AGENTS.template.md
- `Real host task activation` --conceptually_related_to--> `Delegated housekeeper and creator/maintainer`  [EXTRACTED]
  workspace/v0.0.1/template/IDENTITY.template.md → workspace/v0.0.1/template/AGENTS.template.md
- `Simple dependable recoverable game entry` --rationale_for--> `Delegated housekeeper and creator/maintainer`  [EXTRACTED]
  workspace/v0.0.1/template/IDENTITY.template.md → workspace/v0.0.1/template/AGENTS.template.md
- `Launcher-agent template v0.0.1` --references--> `v0.0.1 draft changelog`  [EXTRACTED]
  workspace/v0.0.1/README.md → workspace/v0.0.1/CHANGELOG.md
- `Launcher-agent template v0.0.1` --references--> `Template adoption guide`  [EXTRACTED]
  workspace/v0.0.1/README.md → workspace/v0.0.1/GUIDE.md

## Import Cycles
- None detected.

## Communities (12 total, 1 thin omitted)

### Community 0 - "Pinned Template Adoption"
Cohesion: 0.15
Nodes (15): Established AlderGate file-based role, v0.0.1 draft changelog, Template adoption guide, Adoption validation, Graphify evidence inventory, Launcher-agent template v0.0.1, Reviewed retained semantic extraction, Creator loop (+7 more)

### Community 1 - "Launcher Agent Instructions"
Cohesion: 0.15
Nodes (13): maxLength, minLength, type, maxLength, minLength, type, properties, AGENT_ID (+5 more)

### Community 2 - "Project Binding Contract"
Cohesion: 0.33
Nodes (3): v0.0.1 draft changelog, Launcher-agent template v0.0.1, Instruction bundle

### Community 3 - "Launcher Agent Instructions"
Cohesion: 0.29
Nodes (7): {{PRODUCT_NAME}} worker instructions, Source and startup, Creator loop, Housekeeper loop, Tools and privacy, Completion, Authority

### Community 4 - "Owner Authority Boundaries"
Cohesion: 0.33
Nodes (5): Delegated housekeeper and creator/maintainer, Housekeeper loop, Solo owner authority, Real host task activation, Consumer project rules

### Community 5 - "Launcher Agent Instructions"
Cohesion: 0.40
Nodes (5): Adopt the launcher-agent template, Bind and render, Verify, Pin source, Update safely

### Community 6 - "Project Binding Contract"
Cohesion: 0.40
Nodes (4): additionalProperties, required, $schema, type

### Community 7 - "Launcher Agent Instructions"
Cohesion: 0.50
Nodes (4): {{AGENT_NAME}}, Purpose, Activation, Quality bar

### Community 8 - "Launcher Agent Instructions"
Cohesion: 0.50
Nodes (4): maxLength, minLength, type, AGENT_NAME

### Community 9 - "Launcher Agent Instructions"
Cohesion: 0.50
Nodes (4): maxLength, minLength, type, HOME_BRANCH

### Community 10 - "Launcher Agent Instructions"
Cohesion: 0.50
Nodes (4): maxLength, minLength, type, ISSUE_TRACKER

## Knowledge Gaps
- **47 isolated node(s):** `v0.0.1 draft changelog`, `Pin source`, `Bind and render`, `Verify`, `Update safely` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 49 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `properties` connect `Launcher Agent Instructions` to `Launcher Agent Instructions`, `Launcher Agent Instructions`, `Launcher Agent Instructions`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `v0.0.1 draft changelog`, `Pin source`, `Bind and render` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._

## Extraction usage and integrity

Token cost above is CI replay only: no model API calls. Initial host semantic
extraction input/output token usage is unavailable from this harness; it is not zero.

[graphify] MultiDiGraph edge-collapse diagnostic
input: <in-memory>
input_stage: provided JSON (normal graph.json is post-build)
effective_directed: <direct-call>
nodes: 82
unverified_code_nodes: 0
raw_edges: 91
valid_candidate_edges: 91
missing_endpoint_edges: 0
dangling_endpoint_edges: 0
external_reference_edges: 0
self_loop_edges: 0
exact_duplicate_edges: 0
directed_unique_endpoint_pairs: 91
directed_same_endpoint_collapsed_edges: 0
undirected_unique_endpoint_pairs: 91
undirected_same_endpoint_collapsed_edges: 0
same_endpoint_group_count: 0
relation_variant_groups: 0
source_file_variant_groups: 0
source_location_variant_groups: 0
context_variant_groups: 0
post_build_graph_type: DiGraph
post_build_edges: 91
producer_suppression_sites: 12
producer_suppression_examples:
  - L1902 seen_ids arity=unknown
  - L2597 seen_ids arity=unknown
  - L2599 seen_doc_refs arity=unknown
  - L3266 seen_ids arity=unknown
  - L3413 seen_ids arity=unknown
  - L5148 seen_keys arity=unknown
  - L5334 seen_keys arity=unknown
  - L9853 seen_ids arity=unknown
note: normal graph.json is post-build; raw producer loss must be measured earlier.
