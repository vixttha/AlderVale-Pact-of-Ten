"""Start Graphify MCP only after verifying the requested graph's provenance."""

import hashlib
import json
import os
import sys
from pathlib import Path


def main():
    graph_path = Path(sys.argv[1]).resolve(strict=True)
    expected_sha = sys.argv[2]
    receipt = json.loads(graph_path.with_name("receipt.json").read_text(encoding="utf-8"))
    graph_bytes = graph_path.read_bytes()
    graph = json.loads(graph_bytes)
    if (
        receipt.get("repository") != "vixttha/AlderVale-Pact-of-Ten"
        or not receipt.get("mcp_verified")
        or receipt.get("source_commit") != expected_sha
        or graph.get("built_at_commit") != expected_sha
        or receipt.get("graph_sha256") != hashlib.sha256(graph_bytes).hexdigest()
    ):
        sys.exit("Graph did not pass provenance checks for the requested commit")
    os.execv(sys.executable, [sys.executable, "-m", "graphify.serve", str(graph_path)])


if __name__ == "__main__":
    main()
