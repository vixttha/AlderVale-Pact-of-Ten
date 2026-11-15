"""Verify a Graphify snapshot over MCP and create its provenance receipt."""

import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify_mcp(graph_path, commit, node, node_count, edge_count):
    server = StdioServerParameters(
        command=sys.executable,
        args=["-m", "graphify.serve", str(graph_path)],
    )
    async with asyncio.timeout(30):
        async with stdio_client(server) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                tools = {tool.name for tool in (await session.list_tools()).tools}
                if not {"graph_stats", "get_node", "query_graph"} <= tools:
                    raise ValueError("Graphify MCP tools are missing")

                stats = await session.call_tool("graph_stats", {})
                stats_text = "\n".join(item.text for item in stats.content if item.type == "text")
                expected = {
                    f"Nodes: {node_count}",
                    f"Edges: {edge_count}",
                    f"Built at commit: {commit}",
                }
                if stats.is_error or not expected <= set(stats_text.splitlines()):
                    raise ValueError("MCP stats do not match the generated graph")

                lookup = await session.call_tool("get_node", {"node_id": node["id"]})
                lookup_text = "\n".join(item.text for item in lookup.content if item.type == "text")
                if lookup.is_error or not any(
                    line.strip().startswith(f'Source: {node["source_file"]} ')
                    for line in lookup_text.splitlines()
                ):
                    raise ValueError("MCP could not resolve the indexed source node")


def main():
    graph_path = Path(sys.argv[1]).resolve(strict=True)
    data = graph_path.read_bytes()
    if len(data) > 5 * 1024 * 1024:
        raise ValueError("Graph exceeds the 5 MiB snapshot limit")
    graph = json.loads(data)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if graph.get("built_at_commit") != commit:
        raise ValueError("Graph provenance does not match checked-out commit")
    nodes, links = graph["nodes"], graph["links"]
    if not nodes or not links:
        raise ValueError("Graph is missing nodes or links")
    candidates = [
        node for node in nodes
        if node.get("source_file", "").startswith("src/")
        and node.get("file_type") == "code"
        and re.fullmatch(r"L\d+(?::\d+)?(?:-L\d+(?::\d+)?)?", node.get("source_location") or "")
    ]
    if not candidates:
        raise ValueError("No source symbol available for the MCP check")
    node = min(candidates, key=lambda item: item["id"])
    asyncio.run(verify_mcp(graph_path, commit, node, len(nodes), len(links)))

    repository = os.getenv("GITHUB_REPOSITORY")
    run_id = os.getenv("GITHUB_RUN_ID")
    receipt = {
        "schema_version": 1,
        "repository": repository,
        "source_ref": os.getenv("GITHUB_REF"),
        "source_commit": commit,
        "graphify_version": version("graphifyy"),
        "extraction": "code-only",
        "graph_sha256": hashlib.sha256(data).hexdigest(),
        "nodes": len(nodes),
        "edges": len(links),
        "mcp_verified": True,
        "mcp_source_lookup": node["source_file"],
        "workflow_run": f"https://github.com/{repository}/actions/runs/{run_id}" if run_id else None,
    }
    graph_path.with_name("receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"Graphify MCP verified {len(nodes)} nodes and {len(links)} edges at {commit}")


if __name__ == "__main__":
    main()
