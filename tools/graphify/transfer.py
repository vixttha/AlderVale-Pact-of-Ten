"""Pass a small verified graph between jobs without storing an Actions artifact."""

import base64
import gzip
import hashlib
import json
import os
import sys
from pathlib import Path

CHUNK_SIZE = 80_000
CHUNK_COUNT = 4
MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024


def pack(folder):
    graph = (folder / "graph.json").read_bytes()
    receipt = json.loads((folder / "receipt.json").read_bytes())
    payload = json.dumps({"graph": graph.decode("utf-8"), "receipt": receipt}).encode()
    encoded = base64.b64encode(gzip.compress(payload, mtime=0)).decode("ascii")
    if len(encoded) > CHUNK_SIZE * CHUNK_COUNT:
        sys.exit("Compressed graph exceeds the GitHub job-output budget")
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        for index in range(CHUNK_COUNT):
            start = index * CHUNK_SIZE
            print(f"snapshot_{index}={encoded[start:start + CHUNK_SIZE]}", file=output)


def unpack(folder):
    encoded = "".join(os.getenv(f"SNAPSHOT_{index}", "") for index in range(CHUNK_COUNT))
    if not encoded or len(encoded) > CHUNK_SIZE * CHUNK_COUNT:
        sys.exit("Verified graph payload is missing or too large")
    payload = json.loads(gzip.decompress(base64.b64decode(encoded, validate=True)))
    graph = payload["graph"].encode("utf-8")
    receipt = payload["receipt"]
    if len(graph) > MAX_SNAPSHOT_BYTES or hashlib.sha256(graph).hexdigest() != receipt.get("graph_sha256"):
        sys.exit("Transferred graph fails its integrity check")
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "graph.json").write_bytes(graph)
    (folder / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    operation, path = sys.argv[1:]
    {"pack": pack, "unpack": unpack}[operation](Path(path))
