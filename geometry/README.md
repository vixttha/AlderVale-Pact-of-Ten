# Checkpoint 03 — geometry only

Builds on exact checkpoint 02 commit 7ccd1e6690d42bd5c458479e3c07d7e11f409728
([passing run](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/45656305871)).
The checkpoint 02 files are unchanged.

A deterministic 512px RGB shaded sphere on neutral gray is generated on the runner.
The real pinned TSR model executes a CPU forward pass, then extracts a 128-cubed
density-grid mesh with chunk size 8192 and the upstream default threshold.
Only geometry is serialized to OBJ; no vertex colors, UVs, textures or GLB.
The independent second process parses the resulting OBJ, verifies hashes/counts/
bounds, and reopens with trimesh. It records area, zero-area faces and watertightness;
these are diagnostics, not production-quality acceptance. No synthetic mesh fallback.
Negative reader contracts run before expensive inference.

Stage RSS peaks are sampled at 50 ms, while Linux ru_maxrss records the lifetime
process high-water mark; neither is whole-runner memory. Time is elapsed wall time.
The workflow is branch/path-scoped, 35 minutes max, public standard CPU runner only,
no cache/artifact upload or storage allowance assumption. The generated OBJ is
ephemeral, with hash and readback receipt retained in the Actions logs/summary.
No private reference input or game integration. No checkpoint 04 changes.
