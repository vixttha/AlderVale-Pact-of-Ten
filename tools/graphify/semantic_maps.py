"""Retained host extraction replay and full Graphify analysis; no model API."""

import hashlib
import json
import re
from pathlib import Path

from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report
from graphify.export import to_json, to_html
from graphify.extract import extract
from graphify.report import generate


def retained_extraction(root, record, sources):
    path = root / record["semantic_artifact"]
    if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink():
        raise ValueError("Semantic artifact escapes repository")
    data = json.loads(path.read_text(encoding="utf-8"))
    expected = {entry[0]: hashlib.sha256((root / entry[0]).read_bytes()).hexdigest()
                for entry in sources.values()}
    if data["source_commit"] != record["source_commit"] or data["source_files"] != expected:
        raise ValueError("Retained semantic extraction does not match pinned corpus")
    payload = data["extraction"]
    nodes, edges = payload.get("nodes"), payload.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise ValueError("Semantic nodes and edges must be arrays")
    ids = [n["id"] for n in nodes]
    if len(set(ids)) != len(ids) or not all(re.fullmatch(r"[a-z0-9_]+", n) for n in ids):
        raise ValueError("Invalid or duplicate semantic node IDs")
    allowed = {"code", "document", "paper", "image", "rationale", "concept"}
    for item in nodes + edges:
        source = item.get("source_file")
        if source not in expected:
            raise ValueError("Semantic evidence escapes indexed corpus")
        location = item.get("source_location")
        match = re.fullmatch(r"L(\d+)(?:-L?(\d+))?", location or "")
        if not match:
            raise ValueError("Semantic evidence needs exact line locations")
        end = int(match[2] or match[1])
        if not 1 <= int(match[1]) <= end <= len((root / source).read_text(encoding="utf-8").splitlines()):
            raise ValueError("Semantic evidence line is outside source")
    for n in nodes:
        if n.get("file_type") not in allowed:
            raise ValueError("Unsupported semantic node type")
        n["_origin"] = "semantic"
    for e in edges:
        if e["source"] not in ids or e["target"] not in ids:
            raise ValueError("Semantic edge has unknown endpoint")
        score = e.get("confidence_score")
        confidence = e.get("confidence")
        if (confidence == "EXTRACTED" and score != 1.0 or
            confidence == "INFERRED" and score not in {0.95, 0.85, 0.75, 0.65, 0.55} or
            confidence == "AMBIGUOUS" and not (isinstance(score, (int, float)) and 0.1 <= score <= 0.3) or
            confidence not in {"EXTRACTED", "INFERRED", "AMBIGUOUS"}):
            raise ValueError("Semantic confidence is invalid")
        e["_origin"] = "semantic"
    if payload.get("hyperedges"):
        raise ValueError("This initial replay contract does not support semantic hyperedges")
    return data, hashlib.sha256(path.read_bytes()).hexdigest()


def render(root, tag, record, sources, nodes, edges, output):
    retained, retained_hash = retained_extraction(root, record, sources)
    ast_files = [root / entry[0] for name, entry in sources.items() if name.endswith(".json")]
    structural = extract(ast_files, root=root, cache_root=root) if ast_files else {"nodes": [], "edges": []}
    semantic = retained["extraction"]
    payload = {"nodes": list(nodes.values()) + structural["nodes"] + semantic["nodes"],
               "edges": list(edges.values()) + structural["edges"] + semantic["edges"]}
    health = diagnose_extraction(payload, directed=True, root=root)
    graph = build_from_json(payload, directed=True, dedup=False, root=root)
    if not graph:
        raise ValueError("Refusing to export empty Graphify graph")
    graph.graph.update(template_version=tag, status=record["status"],
                       scope="launcher_agent_template", semantic_replay=True)
    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    labels = {}
    for cid, members in communities.items():
        words = " ".join(str(graph.nodes[n].get("label", "")).lower() for n in members)
        labels[cid] = ("Project Binding Contract" if "schema" in words else
                       "Owner Authority Boundaries" if "owner" in words else
                       "Pinned Template Adoption" if "adoption" in words else
                       "Version Evidence Replay" if "graphify" in words else
                       "Launcher Agent Instructions")
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    output.mkdir(parents=True)
    graph_path = output / "graph.json"
    if not to_json(graph, communities, str(graph_path), built_at_commit=record["source_commit"],
                   community_labels=labels):
        raise ValueError("Graphify refused graph write")
    to_html(graph, communities, str(output / "graph.html"), community_labels=labels)
    html_path = output / "graph.html"
    html = re.sub(r"<title>.*?</title>", f"<title>Launcher-Agent-Template {tag}</title>",
                  html_path.read_text(encoding="utf-8"), count=1)
    html_path.write_text(html, encoding="utf-8", newline="\n")
    # These zeros describe model-free CI replay, not unexposed host extraction usage.
    report = generate(graph, communities, cohesion, labels, gods, surprises,
                      {"total_files": len(sources), "total_words": sum(
                          len((root / entry[0]).read_text(encoding="utf-8").split())
                          for entry in sources.values())},
                      {"input": 0, "output": 0}, ".", suggested_questions=questions,
                      built_at_commit=record["source_commit"])
    report += ("\n\n## Extraction usage and integrity\n\n"
               "Token cost above is CI replay only: no model API calls. Initial host semantic\n"
               "extraction input/output token usage is unavailable from this harness; it is not zero.\n\n"
               + format_diagnostic_report(health) + "\n")
    report_path = output / "GRAPH_REPORT.md"
    report_path.write_text(report, encoding="utf-8", newline="\n")
    return graph, {"semantic_artifact": record["semantic_artifact"],
                   "semantic_artifact_sha256": retained_hash,
                   "semantic_model_input_tokens": None, "semantic_model_output_tokens": None,
                   "semantic_usage_status": "host_harness_unavailable",
                   "ci_model_api_calls": 0,
                   "report_sha256": hashlib.sha256(report_path.read_bytes()).hexdigest(),
                   "graph_health": {k: health.get(k, 0) for k in (
                       "dangling_endpoint_edges", "missing_endpoint_edges", "self_loop_edges",
                       "directed_same_endpoint_collapsed_edges")}}
