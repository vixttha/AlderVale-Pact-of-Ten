"""Verify pinned launcher versions and Graphify maps.
Adapted from Test-Vault b0092267fd64e3025cbfece18db6d4fb3b1c356c.
Deterministic structure only; zero model API tokens.
"""

import argparse
import ast
import asyncio
import hashlib
import json
import posixpath
import re
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

from graphify.build import build_from_json
from graphify.export import to_json, to_html
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "versions"
MAPS = ROOT / "Graphify HQ"
VERSION = re.compile(r"v[0-9]+\.[0-9]+\.[0-9]+")
HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$")
FENCE = re.compile(r"^ {0,3}(\x60{3,}|~{3,})")
LINK = re.compile(r"\[[^\]\n]+\]\(([^()\s]+)(?:\s+[^()]*)?\)")


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def read_archive(tag, record):
    commit, source = record["source_commit"], record["source_path"]
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or not source or source.startswith("/") or ".." in PurePosixPath(source).parts:
        raise ValueError(f"{tag}: expected a pinned commit and a relative source directory")
    tree = git("ls-tree", "-r", "-z", f"{commit}:{source}")
    expected = {}
    for entry in tree.split(b"\0"):
        if not entry:
            continue
        meta, name = entry.decode().split("\t", 1)
        mode, kind, blob = meta.split()
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise ValueError(f"{tag}: unsupported archived file {name}")
        expected[name] = blob
    directory = ROOT / record["snapshot_path"]
    archived = {p.relative_to(directory).as_posix(): p for p in directory.rglob("*") if p.is_file()}
    if not expected or archived.keys() != expected.keys():
        raise ValueError(f"{tag}: archived file inventory differs from {commit}:{source}")
    sources = {}
    for name, digest in sorted(expected.items()):
        path = archived[name]
        data = path.read_bytes()
        if path.is_symlink() or hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() != digest:
            raise ValueError(f"{tag}: archived bytes differ for {name}")
        sources[name] = (path.relative_to(ROOT).as_posix(), digest, data.decode("utf-8") if name.endswith((".md", ".py")) else "")
    return sources


def file_id(name):
    return f"file:{name}"


def markdown_sections(content):
    fence = None
    for number, line in enumerate(content.splitlines(), 1):
        delimiter = FENCE.match(line)
        if delimiter:
            token = delimiter[1]
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence) and not line[delimiter.end():].strip():
                fence = None
            continue
        if not fence and (heading := HEADING.match(line)):
            yield number, len(heading[1]), heading[2]


def build_map(tag, record, sources, output):
    nodes, edges = {}, {}

    def node(key, label, kind, path="", line=None):
        nodes[key] = {"id": key, "label": label, "file_type": kind, "source_file": path,
                      "source_location": f"L{line}" if line else None}

    def edge(start, end, relation, path, line=None):
        edges[start, end, relation] = {
            "source": start, "target": end, "relation": relation, "source_file": path,
            "source_location": f"L{line}" if line else None, "confidence": "EXTRACTED",
            "confidence_score": 1.0, "weight": 1.0,
        }

    node(tag, f"AlderVale-Launcher {tag} ({record['status']})", "concept")
    for name, (path, _, content) in sources.items():
        key = file_id(name)
        kind = "document" if name.endswith(".md") else "code"
        node(key, name, kind, path, 1)
        edge(tag, key, "contains_file", path, 1)
        if name.endswith(".md"):
            stack = []
            for number, level, title in markdown_sections(content):
                while stack and stack[-1][0] >= level:
                    stack.pop()
                child = f"{key}:L{number}"
                node(child, title, "concept", path, number)
                edge(stack[-1][1] if stack else key, child, "contains_section", path, number)
                stack.append((level, child))
            for link in LINK.findall(content):
                parsed = urlsplit(link)
                if parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith("/"):
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(parsed.path)))
                if target in sources and target != name:
                    edge(key, file_id(target), "links_to", path)
        elif name.endswith(".py"):
            for item in ast.parse(content, filename=path).body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    child = f"{key}:L{item.lineno}"
                    node(child, item.name, "code", path, item.lineno)
                    edge(key, child, "defines", path, item.lineno)

    graph = build_from_json({"nodes": list(nodes.values()), "edges": list(edges.values())},
                            directed=True, dedup=False)
    graph.graph.update(product_version=tag, status=record["status"], scope="aldervale_launcher")
    output.mkdir(parents=True)
    graph_path = output / "graph.json"
    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    labels = {cid: "AlderGate Agent Contracts" for cid in communities}
    questions = suggest_questions(graph, communities, labels)
    to_json(graph, communities, str(graph_path), built_at_commit=record["source_commit"],
            community_labels=labels)
    report = generate(graph, communities, cohesion, labels, god_nodes(graph),
                      surprising_connections(graph, communities),
                      {"total_files": len(sources), "total_words": sum(len(e[2].split()) for e in sources.values())},
                      {"input": 0, "output": 0}, ".", suggested_questions=questions,
                      built_at_commit=record["source_commit"])
    report = re.sub(r"\A[^\n]*", f"# Graph Report - AlderVale-Launcher {tag}", report, count=1)
    report += "\n\nThis is deterministic structural file/heading/link evidence, not a semantic or behavior audit.\n"
    (output / "GRAPH_REPORT.md").write_text(report, encoding="utf-8", newline="\n")
    to_html(graph, communities, str(output / "graph.html"), community_labels=labels)
    # Graphify puts the temporary output path in the title; remove that
    # nondeterministic build-location detail from the committed artifact.
    html_path = output / "graph.html"
    html = re.sub(r"<title>.*?</title>", f"<title>AlderVale-Launcher {tag}</title>",
                  html_path.read_text(encoding="utf-8"), count=1)
    html_path.write_text(html, encoding="utf-8", newline="\n")
    receipt = {
        "schema_version": 1,
        "product_version": tag,
        "status": record["status"],
        "snapshot_path": record["snapshot_path"],
        "semantic_model_input_tokens": 0,
        "semantic_model_output_tokens": 0,
        "source_commit": record["source_commit"],
        "source_path": record["source_path"],
        "graphify_version": version("graphifyy"),
        "graph_sha256": hashlib.sha256(graph_path.read_bytes()).hexdigest(),
        "html_sha256": hashlib.sha256((output / "graph.html").read_bytes()).hexdigest(),
        "report_sha256": hashlib.sha256((output / "GRAPH_REPORT.md").read_bytes()).hexdigest(),
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "sources": {name: {"archive_path": path, "blob_sha1": blob} for name, (path, blob, _) in sources.items()},
    }
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
    lines = [f"# AlderVale-Launcher {tag}", "",
             "[Graphify map](graph.json) · [Source receipt](receipt.json) · [All versions](../README.md)", "",
             f"**Status: {record['status']}. Source structure, not release acceptance.**", "",
             "[Interactive graph](graph.html) · [Graph report](GRAPH_REPORT.md)", "", "## Indexed files", ""]
    lines.extend(f"- [{name}](../../{entry['archive_path']})" for name, entry in receipt["sources"].items())
    (output / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    return receipt


async def verify(output, receipt):
    server = StdioServerParameters(command=sys.executable, args=["-m", "graphify.serve", str(output / "graph.json")])
    async with asyncio.timeout(30), stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            result = await session.call_tool("graph_stats", {})
            stats = {line.split(" (", 1)[0] for item in result.content if item.type == "text"
                     for line in item.text.splitlines()}
            expected = {f"Nodes: {receipt['nodes']}", f"Edges: {receipt['edges']}",
                        f"Built at commit: {receipt['source_commit']}"}
            if result.is_error or not expected <= stats:
                raise ValueError(f"{output.name}: Graphify MCP statistics differ from the export: {sorted(stats)}; expected {sorted(expected)}")
            for name, entry in receipt["sources"].items():
                result = await session.call_tool("get_node", {"node_id": file_id(name)})
                reply = "\n".join(item.text for item in result.content if item.type == "text")
                if result.is_error or f"Source: {entry['archive_path']} L1" not in reply:
                    raise ValueError(f"{output.name}: Graphify MCP could not resolve {name}: {reply[:400]}")


def relative_path(value):
    if not isinstance(value, str) or not value or value.startswith("/") or "\\" in value:
        raise ValueError("Expected a POSIX relative path")
    path = PurePosixPath(value)
    if ".." in path.parts or ":" in value or str(path) != value:
        raise ValueError("Unsafe or noncanonical source path")
    return value


def load_manifest():
    manifest = json.loads((ARCHIVE / "manifest.json").read_text(encoding="utf-8"))
    entries = manifest.get("versions", {})
    if manifest.get("schema_version") != 1 or not entries:
        raise ValueError("Expected a nonempty schema-version-1 registry")
    draft, archived = set(), set()
    for tag, record in entries.items():
        if not VERSION.fullmatch(tag) or record.get("status") not in {"draft", "archived"}:
            raise ValueError("Invalid version or status")
        expected = f"{'workspace' if record['status'] == 'draft' else 'versions'}/{tag}"
        if relative_path(record.get("snapshot_path")) != expected:
            raise ValueError(f"{tag}: snapshot path/status mismatch")
        relative_path(record.get("source_path"))
        if not re.fullmatch(r"[0-9a-f]{40}", record.get("source_commit", "")):
            raise ValueError(f"{tag}: full pinned source commit required")
        (draft if record["status"] == "draft" else archived).add(tag)
    current, approved = manifest.get("current_working"), manifest.get("current_archived")
    if (current is None and draft) or (current is not None and draft != {current}):
        raise ValueError("Current workspace must identify the only draft")
    if (approved is None and archived) or (approved is not None and approved not in archived):
        raise ValueError("Current approved archive must identify an archived version")
    for directory, expected in ((ROOT / "workspace", draft | archived), (ARCHIVE, archived)):
        actual = {p.name for p in directory.iterdir() if p.is_dir()}
        if actual != expected:
            raise ValueError(f"{directory.name}: version folders differ from registry")
    return manifest


def check_frozen(baseline):
    if not baseline or baseline == "0" * 40:
        print("Frozen-history baseline: initial setup / not supplied")
        return
    if not re.fullmatch(r"[0-9a-f]{40}", baseline):
        raise ValueError("Baseline must be a full commit SHA")
    exists = subprocess.run(["git", "-C", str(ROOT), "cat-file", "-e",
                             f"{baseline}:versions/manifest.json"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if exists.returncode:
        git("cat-file", "-e", f"{baseline}^{{commit}}")
        return
    previous = json.loads(git("show", f"{baseline}:versions/manifest.json"))
    current = json.loads((ARCHIVE / "manifest.json").read_text(encoding="utf-8"))
    for tag, record in previous["versions"].items():
        if record["status"] != "archived":
            continue
        if current["versions"].get(tag) != record:
            raise ValueError(f"{tag}: frozen archive record changed")
        for directory in (record["snapshot_path"], f"Graphify HQ/{tag}"):
            inventory = git("ls-tree", "-r", "-z", f"{baseline}:{directory}")
            expected = {}
            for entry in inventory.split(b"\0"):
                if entry:
                    meta, name = entry.decode().split("\t", 1)
                    mode, kind, blob = meta.split()
                    if mode not in {"100644", "100755"} or kind != "blob":
                        raise ValueError("Unsupported frozen tree entry")
                    expected[name] = blob
            if not expected:
                raise ValueError(f"{tag}: empty trusted frozen directory")
            folder = ROOT / directory
            actual = {p.relative_to(folder).as_posix(): p for p in folder.rglob("*") if p.is_file()}
            if actual.keys() != expected.keys():
                raise ValueError(f"{tag}: frozen directory inventory changed")
            for name, blob in expected.items():
                data = actual[name].read_bytes()
                if actual[name].is_symlink() or hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() != blob:
                    raise ValueError(f"{tag}: frozen bytes changed: {name}")


def compare(output):
    expected = {p.relative_to(output).as_posix(): p for p in output.rglob("*") if p.is_file()}
    current = {p.relative_to(MAPS).as_posix(): p for p in MAPS.rglob("*") if p.is_file()}
    changed = sorted(k for k in expected.keys() & current.keys()
                     if current[k].is_symlink() or current[k].read_bytes() != expected[k].read_bytes())
    missing, extra = sorted(expected.keys() - current.keys()), sorted(current.keys() - expected.keys())
    if changed or missing or extra:
        raise ValueError(f"Committed maps differ: changed={changed}, missing={missing}, extra={extra}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--baseline", help="Trusted previous push or PR-base commit")
    args = parser.parse_args()
    output = args.output.resolve()
    if output == MAPS or output.is_relative_to(MAPS) or (output.exists() and
            (not output.is_dir() or any(output.iterdir()))):
        parser.error("output must be absent/empty and outside Graphify HQ")
    manifest = load_manifest()
    check_frozen(args.baseline)
    versions = manifest["versions"]
    ordered = sorted(versions, key=lambda tag: tuple(map(int, tag[1:].split("."))), reverse=True)
    for tag in ordered:
        record = versions[tag]
        sources = read_archive(tag, record)
        receipt = build_map(tag, record, sources, output / tag)
        asyncio.run(verify(output / tag, receipt))
        print(f"{tag} ({record['status']}): Graphify MCP verified {len(sources)} pinned files, "
              f"{receipt['nodes']} nodes, {receipt['edges']} edges, SHA-256 {receipt['graph_sha256']}")
    lines = ["# Graphify HQ", "",
             "Pinned maps for [launcher versions](../versions/README.md).",
             "Draft development snapshots are not approved archives or public releases.", ""]
    lines.extend(f"- [{tag}]({tag}/README.md) — {versions[tag]['status']}" for tag in ordered)
    (output / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    if args.check:
        compare(output)
        print(f"All {len(versions)} committed launcher version maps match verified rebuilds.")


if __name__ == "__main__":
    main()
