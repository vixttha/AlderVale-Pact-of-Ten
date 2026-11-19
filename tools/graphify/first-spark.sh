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
python "$repo/tools/graphify/first-spark-kit/evidence_map.py" "$manifest" "$output" "$@"
