#!/usr/bin/env bash
set -euo pipefail

snapshot=$(realpath "$1")
repo=$(git rev-parse --show-toplevel)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

GITHUB_OUTPUT="$workdir/output" python "$repo/tools/graphify/transfer.py" pack "$snapshot"
while IFS= read -r line; do
  key=${line%%=*}
  export "${key^^}=${line#*=}"
done < "$workdir/output"
python "$repo/tools/graphify/transfer.py" unpack "$workdir/restored"
cmp "$snapshot/graph.json" "$workdir/restored/graph.json"
cmp "$snapshot/receipt.json" "$workdir/restored/receipt.json"
snapshot="$workdir/restored"

git init -q --bare "$workdir/remote.git"
git -C "$workdir/remote.git" config receive.shallowUpdate true
git clone -q --no-hardlinks "$repo" "$workdir/source"
git -C "$workdir/source" remote set-url origin "$workdir/remote.git"
git -C "$workdir/source" push -q origin HEAD:refs/heads/main

cd "$workdir/source"
GITHUB_REF=refs/heads/main bash "$repo/tools/graphify/publish.sh" "$snapshot"
GITHUB_REF=refs/tags/v0.0.0-test bash "$repo/tools/graphify/publish.sh" "$snapshot"
GITHUB_REF=refs/tags/v0.0.0-test bash "$repo/tools/graphify/publish.sh" "$snapshot"

git fetch -q origin refs/heads/graphify-snapshots
for destination in main versions/v0.0.0-test; do
  git show "FETCH_HEAD:$destination/graph.json" > "$workdir/graph.json"
  git show "FETCH_HEAD:$destination/receipt.json" > "$workdir/receipt.json"
  cmp "$snapshot/graph.json" "$workdir/graph.json"
  cmp "$snapshot/receipt.json" "$workdir/receipt.json"
  python - "$repo" "$workdir/graph.json" <<'PYTHON'
import asyncio
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import subprocess

async def verify_readback():
    repo, graph = sys.argv[1:]
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    server = StdioServerParameters(command=sys.executable, args=[f"{repo}/tools/graphify/read_snapshot.py", graph, sha])
    async with asyncio.timeout(30), stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            stats = await session.call_tool("graph_stats", {})
            if stats.is_error or not any(sha in item.text for item in stats.content if item.type == "text"):
                raise ValueError("Archived graph did not serve the expected source commit over MCP")

asyncio.run(verify_readback())
PYTHON
done
