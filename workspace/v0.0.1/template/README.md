# Instruction bundle

[AGENTS.template.md](AGENTS.template.md) and
[IDENTITY.template.md](IDENTITY.template.md) are rendered using the six required
parameters in [bindings.schema.json](bindings.schema.json). Preserve this complete
bundle and pin its exact original source commit and per-file SHA-256 hashes.
Do not replace unresolved placeholders with guessed access, credentials or
acceptance authority. The consumer can add project rules that tighten the owner
boundary; it cannot weaken it silently or treat this template as tool permission.
