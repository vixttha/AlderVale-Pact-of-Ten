# Version infrastructure setup — 2026-11-18

Owner request: use the existing Test Vault and README HQ organization for each
launcher version, then work on v0.0.1. Use Notion, Graphify and public runners.

## Inspected source homes

- Launcher foundation: 16cdfb365bf48e5397585c2bc02c8413695642f2.
- Reusable Test-Vault: b0092267fd64e3025cbfece18db6d4fb3b1c356c.
- README HQ: 007617884c75b9f422fc0feda031042da62962eb.
- Game main: 5a7d0438e46582e625fc101efb6aa0f9e637c55e.

Only the launcher home changes. The Test Vault pattern supplies complete pinned
source/byte verification and Graphify MCP readback. README HQ supplies separate
draft workspaces and immutable approved archives. The launcher adds an explicitly
draft development map so v0.0.1 is mapped before product implementation, without
pretending it has an approved release.

## Layout

- workspace/v0.0.1: first mutable source, scope, changelog and evidence register.
- versions/README.md: working/approved history and lifecycle.
- versions/manifest.json: state, original source SHA/path and current snapshot path.
- versions/vX.Y.Z: created only after source approval; none exist at setup.
- Graphify HQ/v0.0.1: graph, interactive HTML, linked outline and source receipt.
- tools/graphify: deterministic generator and exact dependency pins.
- tests: behavioral negative fixtures for provenance and frozen-history enforcement.
- .github/workflows/launcher-versions.yml: standard public Ubuntu/Windows CI.

The source pin is a separate actual workspace commit, not a self-referencing SHA.
Each graph records its corpus and zero semantic model input/output tokens.
These maps index files/headings/links and Python top-level definitions, not
runtime behavior or a complete language call graph.

## Verification and owner boundary

Local checks run in an isolated clone/environment, leaving the original dirty
checkout untouched. Two portability problems were exposed and corrected:
Windows newline conversion in synthetic Git fixtures, and Graphify's generated
HTML title containing the temporary output path. Output metadata/HTML is now
canonicalized to stable titles and LF bytes.

CI must independently run regressions and rebuild/query/compare committed maps
on both standard public Ubuntu and Windows runners. The result SHA and run URL
belong in issue #151 and the private Notion handoff, not an invented receipt.

The first hosted Ubuntu job passed. Windows exposed a repository-wide Git ref
case collision during full-history checkout, before any tests ran. The workflow
now checks out one commit and explicitly fetches only its ancestry, retaining
source/baseline verification without fetching unrelated branch refs. The failed
run remains evidence; no conflicting branch was renamed or deleted.

v0.0.1 is Draft. Source archive approval, public release acceptance, main-game
integration and signing/billing remain separate owner decisions. No installer
or executable launcher is supplied by this version infrastructure change.

Worker: codex using the Codex tool harness. Exact reported model and session ID:
unverified/unavailable. Authenticated GitHub actor verified earlier: vixttha.
AlderGate remains the documented role, not a separate authenticated service.
