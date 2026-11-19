"""Build a Formwright template VERSION document graph with exact-source evidence.

Draft graphs are produced on public runners and are NOT published as approved archives.
This complements, not replaces, the existing code-only Graphify index.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import subprocess
import sys
from importlib.metadata import version as pkg_version
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
HQ = ROOT / "character-forge"
VERSION = re.compile(r"^v\d+\.\d+\.\d+$")
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()


def headings(markdown: str) -> list[tuple[int, str]]:
    result = []
    fenced = False
    for i, line in enumerate(markdown.splitlines(), start=1):
        if line.lstrip().startswith(("~~~", "```")):
            fenced = not fenced
            continue
        match = HEADING.match(line) if not fenced else None
        if match:
            result.append((i, match.group(2)))
    return result


def document_paths(tag: str, state: str) -> list[Path]:
    if not VERSION.fullmatch(tag):
        raise ValueError("expected a namespaced Formwright semantic version")
    if state == "draft":
        roots = [HQ / "template" / tag, HQ / "workspace" / tag]
    else:
        roots = [HQ / "versions" / tag]
    if not all(p.is_dir() for p in roots):
        raise ValueError(f"missing {state} source directory for {tag}")
    paths = sorted(p for folder in roots for p in folder.rglob("*.md"))
    if not paths:
        raise ValueError(f"no {state} documents available for {tag}")
    return paths


def build_graph(tag: str, state: str, source_paths: list[Path]):
    # Imported only in the Graphify job; unit/negative tests remain dependency-free.
    from graphify.build import build_from_json
    nodes, edges = {}, {}
    version_id = f"formwright:{tag}"
    nodes[version_id] = {"id": version_id, "label": f"Formwright {tag} ({state})",
                         "file_type": "concept"}
    for path in source_paths:
        rel = path.relative_to(ROOT).as_posix()
        doc_id = f"document:{rel}"
        nodes[doc_id] = {"id": doc_id, "label": path.name, "file_type": "document",
                         "source_file": rel, "source_location": "L1"}
        edges[(version_id, doc_id, "contains_document")] = {
            "source": version_id, "target": doc_id, "relation": "contains_document",
            "source_file": rel, "source_location": "L1", "weight": 1.0,
            "confidence": "EXTRACTED", "confidence_score": 1.0,
        }
        text = path.read_text(encoding="utf-8")
        parent = doc_id
        for line_number, title in headings(text):
            section_id = f"section:{rel}:L{line_number}"
            nodes[section_id] = {"id": section_id, "label": title,
                                 "file_type": "concept", "source_file": rel,
                                 "source_location": f"L{line_number}"}
            edges[(parent, section_id, "contains_section")] = {
                "source": parent, "target": section_id, "relation": "contains_section",
                "source_file": rel, "source_location": f"L{line_number}",
                "weight": 1.0, "confidence": "EXTRACTED", "confidence_score": 1.0,
            }
        for match in LINK.finditer(text):
            href = unquote(match.group(1).split("#", 1)[0].strip())
            if not href or href.startswith(("https:", "http:", "mailto:", "/")):
                continue
            target = (path.parent / href).resolve()
            if target not in source_paths:
                continue
            to_id = f"document:{target.relative_to(ROOT).as_posix()}"
            edges[(doc_id, to_id, "links_to")] = {
                "source": doc_id, "target": to_id, "relation": "links_to",
                "source_file": rel, "weight": 1.0,
                "confidence": "EXTRACTED", "confidence_score": 1.0,
            }
    graph = build_from_json({"nodes": list(nodes.values()), "edges": list(edges.values())},
                            directed=True, dedup=False)
    graph.graph.update(template_version=tag, scope="formwright_version_documents",
                       state=state)
    return graph


async def verify_mcp(graph_path: Path, first_doc: str, expected_nodes: int, expected_edges: int):
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    server = StdioServerParameters(command=sys.executable,
                                   args=["-m", "graphify.serve", str(graph_path)])
    async with asyncio.timeout(30):
        async with stdio_client(server) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                available = {x.name for x in (await session.list_tools()).tools}
                if not {"graph_stats", "get_node", "query_graph"} <= available:
                    raise ValueError("Graphify MCP tools unavailable")
                result = await session.call_tool("graph_stats", {})
                text = "\n".join(x.text for x in result.content if x.type == "text")
                if result.is_error or not {
                    f"Nodes: {expected_nodes}", f"Edges: {expected_edges}"
                } <= set(text.splitlines()):
                    raise ValueError("Formwright version graph MCP statistics mismatch")
                found = await session.call_tool("get_node", {"node_id": first_doc})
                output = "\n".join(x.text for x in found.content if x.type == "text")
                if found.is_error or "Source: character-forge/" not in output:
                    raise ValueError("Formwright document node MCP readback failed")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default="v0.0.1")
    parser.add_argument("--state", choices=["draft", "archive"], default="draft")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error("output directory must be absent or empty")
    source_paths = document_paths(args.version, args.state)
    graph = build_graph(args.version, args.state, source_paths)
    from graphify.export import to_json
    output.mkdir(parents=True, exist_ok=True)
    graph_path = output / "graph.json"
    commit = git("rev-parse", "HEAD")
    to_json(graph, {0: list(graph)}, str(graph_path), built_at_commit=commit)
    first = f"document:{source_paths[0].relative_to(ROOT).as_posix()}"
    asyncio.run(verify_mcp(graph_path, first, graph.number_of_nodes(), graph.number_of_edges()))
    source_hashes = {}
    for p in source_paths:
        rel = p.relative_to(ROOT).as_posix()
        source_hashes[rel] = {
            "git_blob": git("hash-object", "--", str(p.relative_to(ROOT))),
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest()
        }
    receipt = {
        "schema_version": 1, "template": "formwright", "version": args.version,
        "state": args.state, "source_commit": commit, "graph_scope": "version_documents",
        "graphify_version": pkg_version("graphifyy"),
        "graph_sha256": hashlib.sha256(graph_path.read_bytes()).hexdigest(),
        "nodes": graph.number_of_nodes(), "edges": graph.number_of_edges(),
        "sources": source_hashes, "mcp_verified": True
    }
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"Formwright document Graphify {args.version} ({args.state}): "
          f"{receipt['nodes']} nodes, {receipt['edges']} edges; "
          f"MCP verified at {commit}; SHA-256 {receipt['graph_sha256']}")
    print("DRAFT document map, not an approved archive or visual clothing-fit test.")


if __name__ == "__main__":
    main()
