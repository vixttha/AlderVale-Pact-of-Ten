# 3D Gen — standalone agent and reusable template

Status: foundation candidate (not a qualified generator). Permanent branch `3d-gen` in AlderVale. Purpose: produce reference-faithful, technically validated master meshes and separately optimized animated runtime GLBs using $0 standard GitHub-hosted CPU runners.

Start with [AGENTS.md](AGENTS.md), [WORKFLOW.md](WORKFLOW.md), [ROADMAP.md](ROADMAP.md), [QUALITY.md](QUALITY.md), [FAILURES.md](FAILURES.md), [MODELS.md](MODELS.md). The reusable input contract is in [templates/asset.json](templates/asset.json); blank templates intentionally cannot authorize generation. [STATE.json](STATE.json) records actual status. [RECEIPTS.md](RECEIPTS.md) defines evidence. [SECURITY.md](SECURITY.md) defines trust and publication boundaries.

Run the foundation checks on a standard public runner using the branch push workflow. CLI: `python3 -m unittest discover -s tests -v`; `python3 scripts/preflight.py templates/asset.json --template`. For an authorized populated manifest use `python3 scripts/preflight.py path/to/asset.json` from this checkout. This only validates intake; it never runs inference. No generator or BART adapter is claimed implemented yet. No scheduled compute, external paid API, game merge, release, or automatic binary publishing.

This branch has a clean standalone tree and intentionally does not contain the game source. It is not intended to be merged into main. Main governance is resolved separately at each session. Use a new asset work ref and versioned output directory for each approved candidate; never modify the locked source or a prior result. Template adoption does not confer authorization.
