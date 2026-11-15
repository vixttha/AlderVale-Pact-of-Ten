#!/usr/bin/env bash
set -euo pipefail

snapshot="$1"
source_sha=$(git rev-parse HEAD)
case "$GITHUB_REF" in
  refs/heads/main) destination=main ;;
  refs/tags/*)
    tag=${GITHUB_REF#refs/tags/}
    if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
      echo 'Skipping a tag outside the vMAJOR.MINOR.PATCH naming convention.'
      exit 0
    fi
    git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
    git merge-base --is-ancestor "$source_sha" refs/remotes/origin/main
    destination="versions/$tag"
    ;;
  *)
    if [[ "${GRAPHIFY_PUBLISH_COMMIT:-}" == 1 ]]; then
      destination="commits/$source_sha"
    else
      echo "Refusing to publish $GITHUB_REF." >&2
      exit 1
    fi
    ;;
esac

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
  if [[ "$destination" == main ]]; then
    main_ref=$(git -C "$workdir" ls-remote --exit-code origin refs/heads/main)
    if [[ ${main_ref%%$'\t'*} != "$source_sha" ]]; then
      echo 'A newer main commit superseded this snapshot.'
      exit 0
    fi
  fi

  remote_snapshot=$(git -C "$workdir" ls-remote origin refs/heads/graphify-snapshots)
  if [[ -n "$remote_snapshot" ]]; then
    git -C "$workdir" fetch -q --depth=1 origin refs/heads/graphify-snapshots
    git -C "$workdir" reset --hard -q FETCH_HEAD
  fi

  target="$workdir/$destination"
  if [[ "$destination" != main && "$destination" != commits/* && -f "$target/receipt.json" ]]; then
    python - "$target/receipt.json" "$source_sha" "$target/graph.json" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

receipt_path, source_commit, graph_path = sys.argv[1:]
receipt = json.loads(Path(receipt_path).read_text(encoding="utf-8"))
if receipt["source_commit"] != source_commit:
    sys.exit("Version tag points to a different commit than its published graph")
if receipt["graph_sha256"] != hashlib.sha256(Path(graph_path).read_bytes()).hexdigest():
    sys.exit("Published version graph fails its integrity check")
print("Using existing version snapshot for this commit")
PY
    exit 0
  fi

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
