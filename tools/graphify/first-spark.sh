#!/usr/bin/env bash
set -euo pipefail

output="$1"
shift
repo=$(git rev-parse --show-toplevel)
commit=$(git rev-parse HEAD)
manifest=$(mktemp)
trap 'rm -f "$manifest"' EXIT
jq --arg source "$commit" '.source_commit = $source' "$repo/tools/graphify/first-spark.json" > "$manifest"

cd "$repo"
python "$repo/graphify-hq/versions/v0.0.7/evidence_map.py" "$manifest" "$output" "$@"
