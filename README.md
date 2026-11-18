# AlderVale-Launcher

The permanent home for AlderVale's public pre-game launcher: download, install,
update, repair, and press **Play** to enter the game.

**Status: foundation and audit complete; public launcher NOT_READY.**
There is no player installer or executable on this branch yet. Do not download
source expecting a playable release. Windows, macOS and Linux are the requested
platforms; native support has not yet been established.

## Start here

- [Reusable launcher-agent template](https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/Launcher-Agent-Template)
- [AlderGate template binding](workspace/v0.0.1/agent/binding.json)
- [v0.0.1 draft workspace](workspace/v0.0.1/README.md)
- [Version history and lifecycle](versions/README.md)
- [Graphify HQ — one pinned map per version](Graphify%20HQ/README.md)
- [Version setup and runner evidence](docs/VERSION_SETUP.md)
- [AlderGate: housekeeper and launcher creator](agents/aldergate/IDENTITY.md)
- [Worker instructions](AGENTS.md) and [governing rules](PROJECT_RULES.md)
- [Audit and verified sources](docs/AUDIT-2026-11-18.md)
- [Product and release design](docs/PRODUCT_AND_RELEASE_DESIGN.md)
- [Game integration contract](docs/INTEGRATION.md)
- [Issues and acceptance gates](docs/ISSUES.md)
- [Bootstrap evidence](docs/WORK_RECEIPT.md)
- [Launcher tracking issue #143](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/143)

The original owner-play launcher remains on game main in
[AlderVale Play](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/5a7d0438e46582e625fc101efb6aa0f9e637c55e/AlderVale%20Play/README.md).
Its successful Windows source upgrade is useful evidence, not acceptance of a
public launcher. The new launcher will distribute tested packages rather than
build source on players' computers.

## Branch boundary

Created from empty root commit `1acc7dc83675aa8f8a977cb855defced0f4958e7`,
without copied game files, game history or CI workflows. These documents are the
initial home requested by the owner. Game main was audited at `5a7d0438e46582e625fc101efb6aa0f9e637c55e`.
This branch is not intended for a wholesale merge into main. Approved launcher
files will enter a normal main-based integration PR with exact source provenance.

GitHub Issues is the canonical tracker. Notion coordination remains private.
AlderGate is a documented agent role activated by a real worker, not a deployed
service or an additional teammate. No paid service or game release was created.
