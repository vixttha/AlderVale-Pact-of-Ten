"""Add README HQ navigation and archive provenance to its Graphify code graph."""

import asyncio
import base64
import hashlib
import json
import os
import re
import runpy
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


SOURCE_REF = "refs/heads/readme-hq"
VALIDATOR = "tools/check_readme_hq.py"
MANIFEST = "tools/readme_hq_baselines.json"
WORKFLOW = ".github/workflows/readme-hq.yml"
HQ_INDEX = "readme-hq/versions/README.md"
REPO_URL = "https://github.com/vixttha/AlderVale-Pact-of-Ten"


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def file_id(path):
    return f"hq:file:{path}"


def build(graph_path):
    checkout = Path.cwd().resolve()
    revision = git("rev-parse", "HEAD")
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    if graph.get("built_at_commit") != revision:
        raise ValueError("Graphify code graph does not match the README HQ checkout")

    tracked = set(git("ls-files", "-z").split("\0"))
    symbols = [
        node for node in graph["nodes"]
        if node.get("source_file") == VALIDATOR and node.get("file_type") == "code"
    ]
    if not symbols:
        raise ValueError("Graphify did not index the HQ validator")
    markdown = sorted(path for path in tracked if path.endswith(".md"))
    checker = runpy.run_path(VALIDATOR)
    mapping = {}
    links = {}

    def add_file(path):
        if path not in tracked:
            raise ValueError(f"Missing tracked map source: {path}")
        node = file_id(path)
        kind = "document" if Path(path).suffix in {".md", ".json"} else "code"
        if Path(path).suffix == ".webp":
            kind = "image"
        mapping[node] = {
            "id": node, "label": path, "file_type": kind,
            "source_file": path, "source_location": "L1", "community": 0,
        }
        return node

    def connect(source, target, relation, evidence, location=None):
        if source != target:
            links[source, target, relation] = {
                "source": source, "target": target, "relation": relation,
                "source_file": evidence, "source_location": location,
                "confidence": "EXTRACTED", "confidence_score": 1, "weight": 1,
            }

    for path in markdown:
        source = add_file(path)
        file = checkout / path
        for href in checker["markdown_links"](file.read_text(encoding="utf-8")):
            url = checker["parse_link_url"](href, path)
            github = checker["github_target"](url)
            candidate = checker["workspace_target"](checkout, file, url, github)
            external = None
            if candidate is not None:
                resolved = candidate.resolve()
                if resolved.is_relative_to(checkout):
                    target_path = resolved.relative_to(checkout).as_posix()
                    if target_path in tracked:
                        connect(source, add_file(target_path), "links_to", path)
            elif github and github[1] == "main":
                external = f"main:{github[2]}"
            elif url.netloc == "github.com" and re.fullmatch(
                r"/vixttha/AlderVale-Pact-of-Ten/pull/\d+", url.path
            ):
                external = f"PR #{url.path.rsplit('/', 1)[1]}"
            if external:
                target = f"hq:reference:{external}"
                mapping[target] = {
                    "id": target, "label": external, "file_type": "concept",
                    "source_file": "", "source_location": None, "community": 0,
                    "attributes": {"url": url._replace(query="", fragment="").geturl()},
                }
                connect(source, target, "links_to", path)

    manifest = json.loads(Path(MANIFEST).read_text(encoding="utf-8"))
    for namespace, folder in (("public_readme", "versions"), ("readme_hq", "readme-hq/versions")):
        for tag, record in sorted(manifest[namespace].items()):
            for name, path in sorted(record["source_paths"].items()):
                archived = f"{folder}/{tag}/{name}"
                target = f"hq:source:{record['source_commits'][name]}:{path}"
                mapping[target] = {
                    "id": target, "label": f"Frozen source of {archived}", "file_type": "concept",
                    "source_file": "", "source_location": None, "community": 0,
                    "attributes": {
                        "commit": record["source_commits"][name],
                        "blob_sha1": record["snapshots"][name],
                        "url": f"{REPO_URL}/blob/{record['source_commits'][name]}/{path}",
                    },
                }
                connect(add_file(archived), target, "archived_from", MANIFEST)
                connect(add_file(MANIFEST), add_file(archived), "pins_snapshot", MANIFEST)

    workflow = Path(WORKFLOW).read_text(encoding="utf-8").splitlines()
    invocation = next(i for i, line in enumerate(workflow, 1) if f"run: python3 {VALIDATOR}" in line)
    connect(add_file(WORKFLOW), add_file(VALIDATOR), "runs_validator", WORKFLOW, f"L{invocation}")
    for node in symbols:
        connect(file_id(VALIDATOR), node["id"], "defines", VALIDATOR, node.get("source_location"))

    graph["nodes"].extend(mapping[key] for key in sorted(mapping))
    graph["links"].extend(links[key] for key in sorted(links))
    if len({node["id"] for node in graph["nodes"]}) != len(graph["nodes"]):
        raise ValueError("Duplicate Graphify node IDs")
    graph["source_ref"] = SOURCE_REF
    data = (json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    if len(data) > 512 * 1024:
        raise ValueError("README HQ map exceeds the publication size bound")
    graph_path.write_bytes(data)
    receipt = {
        "schema_version": 1,
        "repository": os.environ["GITHUB_REPOSITORY"],
        "source_ref": SOURCE_REF,
        "source_commit": revision,
        "graphify_version": version("graphifyy"),
        "extraction": "code-only plus tracked Markdown links and archive provenance",
        "graph_sha256": hashlib.sha256(data).hexdigest(),
        "nodes": len(graph["nodes"]),
        "edges": len(graph["links"]),
        "markdown_files": len(markdown),
        "mcp_verified": False,
        "mcp_source_lookup": "README.md",
        "workflow_run": f"{REPO_URL}/actions/runs/{os.environ['GITHUB_RUN_ID']}",
    }
    asyncio.run(verify(graph_path, receipt, use_verified_reader=False))
    receipt["mcp_verified"] = True
    graph_path.with_name("receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


async def verify(graph_path, receipt, use_verified_reader):
    expected = git("rev-parse", "HEAD")
    if receipt["source_commit"] != expected or receipt["source_ref"] != SOURCE_REF:
        raise ValueError("Map receipt does not match the README HQ checkout")
    args = ["-m", "graphify.serve", str(graph_path)]
    if use_verified_reader:
        args = [str(Path(__file__).with_name("read_snapshot.py")), str(graph_path), expected]
    server = StdioServerParameters(command=sys.executable, args=args)
    async with asyncio.timeout(30), stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()

            async def result(name, arguments):
                response = await session.call_tool(name, arguments)
                if response.is_error:
                    raise ValueError(f"Graphify MCP tool failed: {name}")
                return "\n".join(item.text for item in response.content if item.type == "text")

            stats = await result("graph_stats", {})
            if not {
                f"Nodes: {receipt['nodes']}", f"Edges: {receipt['edges']}", f"Built at commit: {expected}",
            } <= set(stats.splitlines()):
                raise ValueError("Graphify MCP statistics do not match the receipt")
            landing = await result("get_node", {"node_id": file_id("README.md")})
            if "Source: README.md L1" not in landing:
                raise ValueError("Graphify MCP could not read the HQ landing page node")
            neighbors = await result("get_neighbors", {"node_id": file_id("README.md")})
            if HQ_INDEX not in neighbors:
                raise ValueError("Graphify MCP could not follow the link to HQ version history")
    print(f"Graphify MCP verified the HQ landing page and its version-history link at {expected}")


def export(graph_path):
    """Return the verified first snapshot to the GitHub publisher for this draft PR."""
    for path in (graph_path, graph_path.with_name("receipt.json")):
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        blob = git("hash-object", str(path))
        print(f"HQ_SNAPSHOT_BLOB {path.name} {blob}")
        for index in range(0, len(encoded), 4000):
            print(f"HQ_SNAPSHOT_DATA {path.name} {index // 4000} {encoded[index:index + 4000]}")


if __name__ == "__main__":
    operation, filename = sys.argv[1:]
    graph_path = Path(filename).resolve(strict=True)
    if operation == "build":
        build(graph_path)
    elif operation == "readback":
        receipt = json.loads(graph_path.with_name("receipt.json").read_bytes())
        asyncio.run(verify(graph_path, receipt, use_verified_reader=True))
    elif operation == "export":
        export(graph_path)
    else:
        sys.exit(f"Unknown operation: {operation}")
