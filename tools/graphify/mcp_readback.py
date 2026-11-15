"""Query a transferred Graphify snapshot over MCP on this runner."""

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def query(graph_path, commit, node, node_count, edge_count):
    server = StdioServerParameters(
        command=sys.executable,
        args=[str(Path(__file__).with_name("read_snapshot.py")), str(graph_path), commit],
    )
    async with asyncio.timeout(30):
        async with stdio_client(server) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                tools = {tool.name for tool in (await session.list_tools()).tools}
                if not {"graph_stats", "get_node", "query_graph"} <= tools:
                    raise ValueError("Graphify MCP tools are missing on the readback runner")

                stats = await session.call_tool("graph_stats", {})
                stats_text = "\n".join(item.text for item in stats.content if item.type == "text")
                expected = {
                    f"Nodes: {node_count}",
                    f"Edges: {edge_count}",
                    f"Built at commit: {commit}",
                }
                if stats.is_error or not expected <= set(stats_text.splitlines()):
                    raise ValueError("MCP readback stats do not match the transferred graph")

                lookup = await session.call_tool("get_node", {"node_id": node["id"]})
                lookup_text = "\n".join(item.text for item in lookup.content if item.type == "text")
                if lookup.is_error or not any(
                    line.strip().startswith(f'Source: {node["source_file"]} ')
                    for line in lookup_text.splitlines()
                ):
                    raise ValueError("MCP readback could not resolve the indexed source node")


def main():
    graph_path = Path(sys.argv[1]).resolve(strict=True)
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if graph.get("built_at_commit") != commit:
        raise ValueError("Transferred graph does not match this runner checkout")
    nodes, links = graph["nodes"], graph["links"]
    candidates = [
        node for node in nodes
        if node.get("source_file", "").startswith("src/")
        and node.get("file_type") == "code"
        and re.fullmatch(r"L\d+(?::\d+)?(?:-L\d+(?::\d+)?)?", node.get("source_location") or "")
    ]
    if not candidates:
        raise ValueError("No source symbol available for the MCP readback")
    node = min(candidates, key=lambda item: item["id"])
    asyncio.run(query(graph_path, commit, node, len(nodes), len(links)))
    print(f"Graphify MCP readback verified {len(nodes)} nodes and {len(links)} edges at {commit}")


if __name__ == "__main__":
    main()
