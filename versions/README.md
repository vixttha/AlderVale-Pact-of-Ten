# Launcher versions

**Current working version: v0.0.1 (Draft). Current approved archive: none.**

| Version | State | Workspace | Graphify map | Approved archive |
| --- | --- | --- | --- | --- |
| v0.0.1 | Draft | [Working source](../workspace/v0.0.1/README.md) | [Pinned development map](../Graphify%20HQ/v0.0.1/README.md) | Not approved; not created |

The [manifest](manifest.json) is the machine-readable registry. Product version
numbers are independent of game, README HQ and Test Vault versions.

## Draft development

Work in `workspace/vX.Y.Z/`. Every registered version gets a Graphify HQ folder.
For drafts, the map is a reproducible snapshot of the workspace at an earlier
exact source commit. It must match the current workspace bytes; it is not a
claim that unfinished software is archived or released.

When changing draft source, make a source commit first, then update its full
source SHA in the manifest, regenerate its map and verify both in the next
commit. Submit both commits together. Never put a fake/self-referencing SHA in
the source record. Root navigation, tools and runner configuration are not
implicitly part of the mapped product corpus.

## Approve and archive a version

1. Complete product work and its actual platform evidence. Obtain explicit owner
   acceptance for the source snapshot. A setup request is not release acceptance.
2. Copy the complete approved workspace bytes to `versions/vX.Y.Z/`.
3. Keep its original source commit/path. Change status to `archived` and
   snapshot_path to the archive; update current_archived. Retain the workspace.
4. Regenerate the version map against those archived bytes and update the
   indexes. Review and verify the normal branch change on public runners.
5. Preserve that archive, record and map byte for byte thereafter. CI compares
   archived entries and files against the trusted prior push/PR-base commit.
6. For the next version add a new workspace, manifest entry and map. Keep all
   previous archives. Only one active draft is allowed.

Archiving is a source-history operation. A launcher download, public release,
main-game merge or channel promotion requires separate owner authorization.
See [Graphify generation](../tools/graphify/README.md) and
[the integration boundary](../docs/INTEGRATION.md).
