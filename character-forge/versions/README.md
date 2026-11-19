# Formwright approved version archive

**No approved versions yet.** v0.0.1 is currently in the [workspace](../workspace/v0.0.1/README.md), not this archive.

After explicit owner acceptance, an accepted version folder must contain `README.md`, `CHANGELOG.md`, and `MANIFEST.json` listing each frozen file's original `source_commit`, `source_path`, and `source_blob_sha`. The validator checks Git blob provenance and prevents changing or deleting an existing archive in later candidate commits.

Do not use the game's global `v*` tags to imply that a Formwright template version is an AlderVale game release. Approved archives are immutable; a correction goes in a new version.

Once an archive is committed, the validator also compares its tree to the **first commit that introduced its version directory**, so changes made later on the HQ branch are rejected even when that archive has never been merged into main.
