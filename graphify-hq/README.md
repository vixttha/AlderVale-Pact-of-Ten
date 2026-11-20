# Graphify HQ

Graphify HQ builds source-linked evidence maps for humans and MCP clients.
Start with the [v0.0.7 standalone template](versions/v0.0.7/README.md)
for PR provenance, feature links, and hash-locked setup.

## Branch and merge approval

The permanent destination for AlderVale Graphify HQ template pull requests is
`graphify-hq`. A change that integrates the template into AlderVale gameplay
or the game workflow uses a separate pull request with its own approval.

Before requesting approval to merge, record the repository, pull request number,
destination branch, and full reviewed head SHA. State those details together.
Use the named destination when opening a pull request.

Immediately before merging, read the live pull request and compare those four
details with the approved record. Recheck applicable CI and mergeability.
Pause for a fresh approval if the pull request, destination, or head changes.
If the destination branch advances, check the resulting diff and CI against it.
After merging, verify the resulting commit on the named destination.

## Version history

| Version | Contents | Status |
| --- | --- | --- |
| [v0.0.7](versions/v0.0.7/README.md) | Standalone Graphify HQ toolkit with AlderVale and Blender-Agent examples | Verified baseline · [archived evidence][archive] |
| [v0.0.1–v0.0.6][legacy] | Archived maps of the matching README HQ template versions | Archived |

The standalone toolkit continues the visible HQ numbering. The most recent
prior HQ map is [v0.0.6][prior], which indexes README HQ v0.0.6. The engine
version used in both lines is Graphify 0.9.109.

For a code-wide view, open the [AlderVale game graph][game] or the
[Test Vault graph][vault].

[legacy]: https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/007617884c75b9f422fc0feda031042da62962eb/Graphify%20HQ/README.md
[prior]: https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/007617884c75b9f422fc0feda031042da62962eb/Graphify%20HQ/v0.0.6/receipt.json
[game]: https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/graphify-snapshots/main
[vault]: https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/graphify-snapshots/test-vault

[archive]: https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/85820f11a595e0e6ee2179f9a29ccb65f609965a/graphify-hq/v0.0.7

## Veraphify v0.0.9 adoption

Use [Veraphify v0.0.9 at `ed56500`](https://github.com/vixttha/Veraphify/commit/ed5650085e33cf142a37de695757a4df999a7cf3) to import, verify, and look up source-linked archives. This Git SHA is the merged mechanical revision. The [adopter walkthrough](https://github.com/vixttha/Veraphify/blob/ed5650085e33cf142a37de695757a4df999a7cf3/docs/adopter-walkthrough.md) documents the archive commands and limits. The Graphify producer and the Veraphify archive reader have separate version pins.

The public adoption check archives pinned game source and verifies the saga event implementation citation. Game CI, First Spark drafts, and the existing snapshot publisher keep their own approval and evidence paths.

The [public workflow](../.github/workflows/veraphify-adoption.yml) checks the source pin, runs the Graphify MCP check, compares the archive SHA-256, and verifies the citation against the exact Git blob. The disposable archive version `v0.0.0.1` identifies the probe. Each public run retains a small receipt with the adopter SHA, Veraphify SHA, and citation.
