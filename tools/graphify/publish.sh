#!/usr/bin/env bash
set -euo pipefail

snapshot="$1"
source_sha=$(git rev-parse HEAD)
if [[ "$GITHUB_REF" != refs/heads/readme-hq ]]; then
  echo "Refusing to publish $GITHUB_REF." >&2
  exit 1
fi
destination=readme-hq
python3 - "$snapshot" "$source_sha" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

snapshot = Path(sys.argv[1])
data = (snapshot / "graph.json").read_bytes()
receipt = json.loads((snapshot / "receipt.json").read_bytes())
if (
    receipt.get("source_ref") != "refs/heads/readme-hq"
    or receipt.get("source_commit") != sys.argv[2]
    or receipt.get("mcp_verified") is not True
    or receipt.get("graph_sha256") != hashlib.sha256(data).hexdigest()
):
    sys.exit("Refusing to publish a graph without verified README HQ provenance")
PY

remote=$(git remote get-url origin)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

# Scope the short-lived token to the GitHub repository URL and this process.
if [[ -n ${GH_TOKEN:-} ]]; then
  export GIT_CONFIG_COUNT=1
  export GIT_CONFIG_KEY_0="http.${remote}.extraheader"
  export GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)"
  unset GH_TOKEN
fi

git -C "$workdir" init -q --initial-branch=graphify-snapshots
git -C "$workdir" config user.name 'github-actions[bot]'
git -C "$workdir" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git -C "$workdir" remote add origin "$remote"

for attempt in 1 2 3; do
  live_ref=$(git -C "$workdir" ls-remote --exit-code origin refs/heads/readme-hq)
  if [[ ${live_ref%%$'\t'*} != "$source_sha" ]]; then
    echo 'A newer README HQ commit superseded this snapshot.'
    exit 0
  fi

  remote_snapshot=$(git -C "$workdir" ls-remote origin refs/heads/graphify-snapshots)
  if [[ -n "$remote_snapshot" ]]; then
    git -C "$workdir" fetch -q --depth=1 origin refs/heads/graphify-snapshots
    git -C "$workdir" reset --hard -q FETCH_HEAD
  fi

  target="$workdir/$destination"
  mkdir -p "$target"
  cp "$snapshot/graph.json" "$snapshot/receipt.json" "$target/"
  git -C "$workdir" add -- "$destination/graph.json" "$destination/receipt.json"
  if git -C "$workdir" diff --cached --quiet; then
    exit 0
  fi
  git -C "$workdir" commit -qm "Graphify ${destination} at ${source_sha:0:12}"
  if git -C "$workdir" push origin HEAD:refs/heads/graphify-snapshots; then
    echo "Published $destination at $source_sha"
    exit 0
  fi
  sleep "$attempt"
done

echo 'Could not publish the graph after three attempts.' >&2
exit 1
