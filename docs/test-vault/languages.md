# Languages, formats and test tools

AlderVale currently runs in TypeScript, React, Vite, Node, WebSocket, Three.js, and Firestore. The test library can use additional languages wherever they provide a distinct observation or cover an integration. GitHub Actions can run a language when its toolchain is available or can be installed on a standard hosted runner. The table distinguishes existing checks from optional tools and future runtimes.

| Language or format | Useful AlderVale test ideas | Tool or approach | Status |
|---|---|---|---|
| TypeScript | Combat, archetypes, rewards, Firestore rules, typed API contracts, Rowan rig, multi-client WebSocket tests | Vitest, fast-check, Playwright | Primary |
| TSX / JSX | Enrollment, Tailor, duel buttons, modal focus, error and loading states | Testing Library + Playwright | Planned |
| JavaScript / ESM | Production bundle startup, browser smoke, pure Node scripts, shared JSON fixtures | Node test runner, Playwright, k6 scripts | Useful now |
| Firestore Rules DSL | Access per owner/guest/visitor, query behavior, transaction invariants | `@firebase/rules-unit-testing` + emulator | Primary |
| YAML | Workflow triggers, job matrix, permissions, absent release jobs, action pins | actionlint and workflow review | Primary configuration |
| JSON / JSON Schema | API/WS fixtures, saves, content manifests, GLTF schema, report interchange | Ajv or equivalent validator | Useful now |
| HTML / CSS | Visual reflow, viewport, native input modes, semantics, design tokens | Browser snapshots, axe-core, computed styles | Planned |
| GLSL | Compile representative shaders, memory/lifecycle, transparency, clip/color-space behavior | Three.js and Chromium GPU/software contexts | Planned |
| Bash / POSIX shell | Linux build, process teardown, permission-neutral local smoke, byte checks | ShellCheck, Bats, curl | Useful now |
| PowerShell | Windows install and startup, quoting/path/case parity, stop and cleanup | Pester, PowerShell | Useful now |
| Python | Public-runner policy regressions, with asset metadata and replay analysis available as future cases | Standard-library `unittest` | Hosted policy job |
| SQL | Future relational ledger conservation, constraints, transaction rollbacks, migration equivalence | SQL fixtures, pgTAP for a future PostgreSQL adapter | Conditional |
| Gherkin | Player-readable acceptance scenarios for onboarding, duels, trading, and Dorm tours | Cucumber bindings to TypeScript or another runner | Optional |
| OpenAPI / AsyncAPI | Document JSON HTTP routes and live frame contracts and verify examples | Schema validators and TypeScript contract tests | Optional |
| TLA+ / PlusCal, Alloy, or SMT-LIB | Model escrow state transitions, exact-once rewards and concurrent match decisions | TLC, Alloy Analyzer or SMT solver | Optional formal modeling |
| CUE, Dhall, Rego or Jsonnet | CI policy and environment/schema consistency when configuration expands | CUE, Dhall, Conftest, Jsonnet | Conditional |
| Go | Independent HTTP/WebSocket client and long-lived load drivers, future Go service contract parity | Go test and a WS library | Optional |
| Rust | Byte-exact asset parser validation, efficient independent simulation, future WASM parity | cargo test, proptest | Optional |
| Java / JVM | Emulator runtime; independent Java client; regression tests for a future JVM service | JUnit, Testcontainers; Java 21 for the emulator | Java used for emulator |
| Kotlin / Scala / Clojure / Groovy | JVM client interoperability and timing; Android or JVM feature acceptance when applicable | Kotest, ScalaTest, clojure.test, Spock | Conditional |
| C# / F# / Visual Basic .NET | Independent .NET API client; native launcher or Unity scene acceptance if developed | xUnit, FsCheck, Unity Test Framework | Conditional |
| C / C++ / Zig / Nim / D | Native asset layer, renderer bindings, or binary performance checks if introduced | Existing native unit framework and sanitizers | Conditional |
| Swift / Objective-C / Objective-C++ | Native iOS integration, notification or accessibility acceptance if shipped | XCTest, XCUITest | Conditional |
| Dart | Flutter wrapper lifecycle, touch, and persistence if shipped | Flutter test and integration_test | Conditional |
| Ruby / PHP / Perl / Raku | Consumer API back-compat checks or tooling integration if such a consumer exists | RSpec, PHPUnit, Test::More | Conditional |
| Elixir / Erlang / Gleam | Distributed presence or actor-system semantics if a BEAM service ships | ExUnit, Common Test, Gleam test | Conditional |
| Haskell / OCaml / Standard ML / Elm | Independent rules model, property comparisons, or feature parity for that client | QuickCheck, QCheck, elm-test | Optional modeling |
| Lua / Luau / GDScript / Haxe | Mod scripts or a game-engine port, save and event parity | busted, TestEZ, GUT, Haxe unit tooling | Conditional |
| R / Julia / MATLAB / Octave | Economy balance, seeded combat distributions, sensitivity analysis and charts | testthat, Julia Test, numeric baselines | Optional |
| Assembly / WebAssembly text | Inspect behavior only for an actual shipped native or WASM hot path | Runtime-specific assembler and WASM tests | Conditional |
| COBOL / Fortran / Ada / Pascal / Delphi | External integrations, numeric reference comparisons, or legacy file import if a concrete need arises | Compiler/language-native tests and shared JSON fixtures | Conditional |
| Racket / Common Lisp / Scheme / Prolog | Independent rule oracle or constraint solver for small combat and reward models | Language-native testing and fixture comparisons | Optional modeling |

## Run Python Vault tests

From the repository root:

```sh
python3 -m unittest discover -s tests/vault -p 'test_*.py' -v
```

The existing [Public hosted runner policy workflow](../../.github/workflows/public-runner-policy.yml) runs these tests alongside the [policy checker](../../tools/ci/check_runner_policy.py). The tests use temporary workflow fixtures to check that the policy accepts standard hosted runners and rejects self-hosted and nonstandard labels. They use Python's standard library.

For a new language, add a case that provides independent evidence, exercises an external client, or tests a runtime the game ships. Record the toolchain, fixture, command, and GitHub Actions job in the Vault. Reuse an existing job when it already provides the required runtime.

[Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/) · [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
