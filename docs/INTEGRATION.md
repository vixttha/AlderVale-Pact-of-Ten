# Launcher to game integration

## Permanent source homes

- `AlderVale-Launcher`: launcher role, documentation and future implementation.
- Game `main`: accepted game and integrated launcher changes.
- `AlderVale-Test-Vault`: separate test coordination home; preserve its rules.

This launcher branch starts from unrelated empty history by owner request.
It is not a main replacement. Do not merge it wholesale or use
--allow-unrelated-histories. Do not change the default branch.

Future accepted code should live in an exportable `launcher/` directory, with
launcher-specific tests and packaging files identified in a manifest. That is a
proposed layout, not a scaffold already created. To integrate: start a normal
worker branch from current game main, read current instructions, check overlaps,
materialize only reviewed launcher paths from a pinned launcher commit, adapt
minimal tests/workflows and create a conventional main-based PR. Record both SHAs.
A later synchronization must preserve game edits and explicitly resolve conflicts.
Do not cherry-pick a root instruction snapshot over the game.

## Handoff contract to implement

1. The launcher selects an approved compatible game artifact and verifies it.
   The game is an allowlisted packaged entry, not an arbitrary shell command.
2. Pass only a versioned, validated argument/config contract: component version,
   protocol version, installation/data paths, chosen profile/channel and mode.
   Do not put secrets in URLs, argv, public files or logs.
3. Start one managed game process. For a Node/Express package, start its loopback
   backend with per-launch authentication and bounded ready/exit timeouts.
   Avoid fixed-port assumptions and stop only processes this session owns.
4. The game reports source SHA, version, schema/protocol compatibility and health.
   A health JSON response is only startup evidence; follow with a rendered
   playable check in acceptance tests.
5. UI transitions to Game running only after the actual readiness contract.
   Track crash/exit explicitly; await save flush before applying an update.
6. Both components use stable data profiles outside installs. Beta is isolated.
   Validate browser import and migrations before replacing working saves.
7. Remote multiplayer, economy and account authority remains in approved game
   services, never delegated to a client-controlled local server.
8. Update errors return actionable status without corrupting the installed game;
   launcher self-update waits for safe termination using supported OS tooling.

Exact IPC schema, runtime packaging and OS support are deliverables in #145/#147,
not claims of implementation here. No new network listeners, game modifications
or production backend were deployed by creating this branch.
