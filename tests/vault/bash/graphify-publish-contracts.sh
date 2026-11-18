#!/usr/bin/env bash
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
publisher="$repo/tools/graphify/publish.sh"
git_bin=$(command -v git)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
printf 'Tested checkout: %s\n' "$(git rev-parse HEAD)"
printf 'Bash: %s\n' "$BASH_VERSION"
git --version

# Every fixture, including the competing push, uses only local Git transport.
unset GH_TOKEN GRAPHIFY_PUBLISH_COMMIT GIT_CONFIG_PARAMETERS
export GIT_ALLOW_PROTOCOL=file GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_COUNT=0
export LC_ALL=C

fail() {
  printf '%s: %s\n' "$case_id" "$*" >&2
  if [[ -s "$fixture/publish.log" ]]; then
    cat "$fixture/publish.log" >&2
  fi
  exit 1
}

assert_equal() {
  local expected=$1 actual=$2 context=$3
  [[ "$actual" == "$expected" ]] || fail "$context: expected [$expected], received [$actual]"
}

assert_message() {
  grep -Fq -- "$1" "$fixture/publish.log" || fail "Missing diagnostic: $1"
}

write_snapshot() {
  local directory=$1 source_sha=$2 marker=$3 hash
  mkdir -p "$directory"
  printf '{"fixture":"%s"}\n' "$marker" > "$directory/graph.json"
  hash=$(sha256sum "$directory/graph.json")
  printf '{"source_commit":"%s","graph_sha256":"%s"}\n' "$source_sha" "${hash%% *}" > "$directory/receipt.json"
}

snapshot_tip() {
  git -C "$remote" rev-parse refs/heads/graphify-snapshots
}

assert_snapshot() {
  local destination=$1 expected=$2 name
  for name in graph.json receipt.json; do
    git -C "$remote" show "refs/heads/graphify-snapshots:$destination/$name" > "$fixture/readback"
    cmp -s "$expected/$name" "$fixture/readback" || fail "$destination/$name differs from fixture"
  done
}

publish() {
  local ref=$1 snapshot=$2 expected_status=$3 status=0
  (cd "$source" && GITHUB_REF="$ref" bash "$publisher" "$snapshot") > "$fixture/publish.log" 2>&1 || status=$?
  assert_equal "$expected_status" "$status" "Publisher exit for $ref"
}

seed_fixture() {
  fixture="$workdir/$case_id with spaces"
  remote="$fixture/remote.git"
  source="$fixture/source"
  mkdir -p "$fixture"
  git init -q --bare --initial-branch=main "$remote"
  git -C "$remote" config receive.shallowUpdate true
  git init -q --initial-branch=main "$source"
  git -C "$source" config user.name 'Vault Fixture'
  git -C "$source" config user.email 'fixture@example.invalid'
  git -C "$source" remote add origin "$remote"
  git -C "$source" commit -qm base --allow-empty
  git -C "$source" push -q origin HEAD:refs/heads/main
  source_sha=$(git -C "$source" rev-parse HEAD)
  write_snapshot "$fixture/original" "$source_sha" original
  publish refs/heads/main "$fixture/original" 0
  original_tip=$(snapshot_tip)
  assert_snapshot main "$fixture/original"
}

stale_latest() {
  local ref destination advanced retained_tip
  case "$1" in
    main) ref=refs/heads/main; destination=main ;;
    vault)
      ref=refs/heads/AlderVale-Test-Vault
      destination=test-vault
      git -C "$source" push -q origin "HEAD:$ref"
      publish "$ref" "$fixture/original" 0
      assert_snapshot "$destination" "$fixture/original"
      ;;
  esac
  retained_tip=$(snapshot_tip)
  git -C "$source" commit -qm advanced --allow-empty
  git -C "$source" push -q origin "HEAD:$ref"
  advanced=$(git -C "$source" rev-parse HEAD)
  git -C "$source" checkout -q --detach "$source_sha"
  assert_equal "$advanced" "$(git -C "$remote" rev-parse "$ref")" "Fixture advanced $ref"
  write_snapshot "$fixture/stale" "$source_sha" stale
  publish "$ref" "$fixture/stale" 0
  assert_message "A newer ${ref#refs/heads/} commit superseded this snapshot."
  assert_equal "$retained_tip" "$(snapshot_tip)" 'Snapshot branch tip after stale publication'
  assert_snapshot "$destination" "$fixture/original"
  assert_snapshot main "$fixture/original"
}

stale_main() {
  stale_latest main
}

vault_latest() {
  stale_latest vault
  local latest
  latest=$(git -C "$remote" rev-parse refs/heads/AlderVale-Test-Vault)
  git -C "$source" checkout -q --detach "$latest"
  write_snapshot "$fixture/updated" "$latest" updated
  publish refs/heads/AlderVale-Test-Vault "$fixture/updated" 0
  assert_message "Published test-vault at $latest"
  assert_snapshot test-vault "$fixture/updated"
  assert_snapshot main "$fixture/original"
}

unsupported_ref() {
  publish refs/heads/feature-fixture "$fixture/original" 1
  assert_message 'Refusing to publish refs/heads/feature-fixture.'
  assert_equal "$original_tip" "$(snapshot_tip)" 'Snapshot branch tip without opt-in'
  assert_snapshot main "$fixture/original"
}

explicit_commit() {
  git -C "$source" commit -qm feature --allow-empty
  local feature_sha
  feature_sha=$(git -C "$source" rev-parse HEAD)
  write_snapshot "$fixture/feature" "$feature_sha" feature
  GRAPHIFY_PUBLISH_COMMIT=1 publish refs/heads/feature-fixture "$fixture/feature" 0
  assert_message "Published commits/$feature_sha at $feature_sha"
  assert_snapshot "commits/$feature_sha" "$fixture/feature"
  assert_snapshot main "$fixture/original"
  assert_equal "$original_tip" "$(git -C "$remote" rev-parse 'refs/heads/graphify-snapshots^')" 'Commit snapshot appended to history'
}

damaged_version() {
  local ref=refs/tags/v1.2.3 damaged archive="$fixture/archive"
  publish "$ref" "$fixture/original" 0
  assert_snapshot versions/v1.2.3 "$fixture/original"
  # Damage the already published graph while retaining its original receipt.
  git clone -q -b graphify-snapshots "$remote" "$archive"
  printf '{"fixture":"damaged"}\n' > "$archive/versions/v1.2.3/graph.json"
  git -C "$archive" -c user.name='Vault Fixture' -c user.email=fixture@example.invalid commit -qam 'Damage fixture graph'
  git -C "$archive" push -q origin HEAD:refs/heads/graphify-snapshots
  damaged=$(snapshot_tip)
  publish "$ref" "$fixture/original" 1
  assert_message 'Published version graph fails its integrity check'
  assert_equal "$damaged" "$(snapshot_tip)" 'Snapshot branch tip after integrity failure'
  assert_snapshot versions/v1.2.3 "$archive/versions/v1.2.3"
  assert_snapshot main "$fixture/original"
}

concurrent_publish() {
  local rival="$fixture/competing publisher" rival_sha rival_tip latest
  git clone -q -b graphify-snapshots "$remote" "$rival"
  git -C "$rival" config user.name 'Vault Fixture'
  git -C "$rival" config user.email 'fixture@example.invalid'
  rival_sha=$(git -C "$source" rev-parse HEAD)
  write_snapshot "$rival/versions/v2.0.0" "$rival_sha" rival
  git -C "$rival" add versions/v2.0.0
  git -C "$rival" commit -qm 'Competing snapshot'
  rival_tip=$(git -C "$rival" rev-parse HEAD)
  write_snapshot "$fixture/updated" "$source_sha" updated

  mkdir -p "$fixture/bin"
  # Insert the rival immediately before the publisher's first push. Real Git rejects the losing push.
  cat > "$fixture/bin/git" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
if [[ ${1:-} == -C && ${3:-} == push && ${4:-} == origin &&
      ${5:-} == HEAD:refs/heads/graphify-snapshots ]]; then
  remote=$("$VAULT_GIT" -C "$2" remote get-url origin)
  [[ "$remote" == "$VAULT_REMOTE" ]] || exit 90
  if [[ ! -e "$VAULT_PUSH_ATTEMPT" ]]; then
    "$VAULT_GIT" -C "$VAULT_RIVAL" push -q origin HEAD:refs/heads/graphify-snapshots
  fi
  printf 'attempt\n' >> "$VAULT_PUSH_ATTEMPT"
fi
exec "$VAULT_GIT" "$@"
WRAPPER
  chmod +x "$fixture/bin/git"

  PATH="$fixture/bin:$PATH" VAULT_GIT="$git_bin" VAULT_REMOTE="$remote" VAULT_RIVAL="$rival" \
    VAULT_PUSH_ATTEMPT="$fixture/attempts" publish refs/heads/main "$fixture/updated" 0
  assert_equal 2 "$(wc -l < "$fixture/attempts" | tr -d '[:space:]')" 'Number of real publisher pushes'
  assert_message '[rejected]'
  assert_message "Published main at $source_sha"
  latest=$(snapshot_tip)
  assert_equal "$rival_tip" "$(git -C "$remote" rev-parse "$latest^")" 'Recovered publish retains competing commit in history'
  assert_snapshot versions/v2.0.0 "$rival/versions/v2.0.0"
  assert_snapshot main "$fixture/updated"
}

run_case() (
  case_id=$1
  label=$2
  seed_fixture
  "$3"
  printf 'PASS %s %s\n' "$case_id" "$label"
)

run_case E32-001 'stale main leaves snapshots intact' stale_main
run_case E32-002 'feature ref requires explicit opt-in' unsupported_ref
run_case E32-003 'opt-in commit snapshot preserves main' explicit_commit
run_case E32-004 'damaged retained version is rejected' damaged_version
run_case E32-005 'concurrent push retry preserves both snapshots' concurrent_publish
run_case E32-006 'Vault latest advances independently and rejects stale builds' vault_latest
printf 'Bash Graphify publisher contracts: 6/6 passed\n'
