# Launcher-agent template v0.0.1

**Status: Draft; no approved archive or runnable service.**

This version supplies a reusable instruction/identity pair, typed project
bindings and an adoption guide. Its scope is a worker role executed by a real
host. It does not add a model runtime to a player's game launcher.

- [Instruction template](template/AGENTS.template.md)
- [Identity template](template/IDENTITY.template.md)
- [Parameter contract](template/bindings.schema.json)
- [Adoption guide](GUIDE.md)
- [Draft changelog](CHANGELOG.md)

Graphify must include the actual instruction/identity files in its pinned source
inventory. Host semantic extraction is retained with source hashes and an honest
usage-availability record; public CI replays that reviewed extraction without
calling a model API. Source structure and semantic relationships are labelled
separately. Neither is behavioral certification or owner acceptance.
