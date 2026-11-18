# AlderVale cross-language testing rules

These rules apply when several test suites verify the same AlderVale behavior. A green verdict establishes that the declared checks passed for the named scenario, environments, and exact checkout. Untested inputs, environments, and player journeys remain open coverage. Keep game evidence, emulator evidence, and owner playtest evidence individually identifiable.

## First Spark in plain language

**First Spark in the Ring** is an early campus quest. Win a solo duel at the Duel Amphitheater and the quest awards a one-time bonus of **90 XP, 110 Florins, and 3 Spell Shards** in addition to the normal victory payout. [Issue #13](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) records the original reward bug.

This quest is the first example of coordinated tests because a single guest playthrough creates three testable facts. The player can complete the quest, the game grants the right reward once, and the save survives a reload. The [pilot in draft PR #134](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/134) records the raw guest save before the duel, after victory, and after reload. Playwright drives the browser, C# checks saved identity and state, and F# checks the reward against an independent model. The replay check submits the quest event again to the real quest reducer using the reloaded save. The pilot's combined verdict covers the Chromium synthetic guest scenario.

## Rules

1. **Start with a game behavior.** Give the case a stable Vault ID, describe what a player or external client should observe, and list the exact entry point, success and failure cases, required suites, and covered environments. Link the canonical GitHub issue when a regression exists. Plan coverage by player impact and risk before choosing tools.
2. **Give each suite a distinct job.** Use a test of the real game path as the producer when the claim is about game behavior. Assign each consumer a question such as what persisted, what the correct amount was, or what another client received. A new language earns a place by covering a distinct risk, testing an independent runtime, or checking rules independently. Preserve the existing standalone suites and label their fixture-only scope.
3. **Share the scenario and observations.** Use a versioned, UTF-8 JSON case definition and a small evidence manifest. Record the scenario and schema versions, checkout SHA, run and attempt, relevant environment and synthetic fixture identity, and a digest for each observation. Declare required checkpoints and types up front. Define currency as integer amounts, use stable IDs, pin seeds when randomness matters, and compare coordinates with a documented tolerance when needed.
4. **Keep expected behavior independent.** The application and browser produce actual observations. Expected values come from published design rules, independently calculated models, or reviewed fixtures. For replay, concurrency, and boundary cases, include inputs that expose the intended regression. Show a known-bad revision or controlled bad fixture fails when practical. Record what that demonstration exercised.
5. **Bind each receipt to the evidence it checked.** Return a stable check ID, status, and diagnostic with the same scenario, checkout, run, attempt, and evidence digest. A different browser, job, seed, or run can provide its own evidence with its own identity. Cross-job evidence, if a case needs it, has a named producer and intact digest passed through a declared dependency. Keep synthetic saves and sensitive fields out of published logs and summaries.
6. **Require a valid pass from every required suite.** Build one case verdict with a row per required check. A failure, missing result, bad hash, stale result, unexpected duplicate, skip, blocked test, or unavailable required environment prevents a passing verdict. Explain each condition by name. A case outside the selected CI scope is reported as not run. A retry gets its own attempt and leaves earlier failure evidence visible.
7. **Report the coverage on GitHub Actions.** Publish one combined scenario result on the run's Summary page. Show tested checkout, covered environments, required checks with results, exact case or issue link, and remaining gaps. Record PR base and head when GitHub tested a merge checkout. Use standard public GitHub-hosted runners and existing jobs where they fit. Add runner work only when the scenario and its scope justify it.
8. **Keep the owner decision separate from automated evidence.** Prioritize guest onboarding, saved progress, quest/reward delivery, combat, and other accepted milestone blockers using the [case catalog](cases.md). For any unresolved path, record the missing evidence and what would close it. Keep deployment behavior, physical-device performance, live sign-in and cloud saves, and the owner's playthrough explicit whenever an acceptance claim depends on them.

## Languages with concrete work for AlderVale

These are the game-specific assignments at the recorded Vault baseline. Each draft retains its own review and validation evidence.

| Language or technology | Job in coordinated testing | Status |
|---|---|---|
| TypeScript and TSX | Test the real combat, quests, save logic, React components, and server handlers. Emit deterministic observations when a checker needs direct access to a rules function. | In use. TSX is the TypeScript syntax used in React components. |
| JavaScript | Use Playwright to operate the browser as a guest and collect actual observations. Use Node.js for HTTP/WebSocket integration, adapters, and the Actions reporter. | In use. |
| Python | Validate the catalog and compare progression and reward results with a small independent model. | In use. |
| Ruby | Check quest text, quest-giver references, and published reward tables. | In use. |
| Go | Exercise multiplayer presence, reconnect, and realm/zone behavior with an independent WebSocket client. | In use. |
| Rust | Check GLB geometry, animation, and binary boundaries against real assets and controlled fixtures. | In use. |
| C++ | Independently check damage, combat replay, team ordering, and guest save contract cases. | In use. |
| C# | Read raw save JSON and check wizard/realm identity, currencies, progression, quest flags, and creature ownership. | In use. The shared browser observation is in PR #134. |
| F# | Model quest event sequences and check one-time rewards, completion boundaries, and reload. | In use. The shared browser observation is in PR #134. |
| Bash | Check Unix automation and Graphify publishing with temporary Git repositories. | In use. |
| PowerShell | Verify the Windows launcher, paths, build identity, and failure handling. | In use. |
| Java | Verify built frontend asset delivery, including full, partial, and conditional HTTP responses. Java also hosts the current Firestore emulator. | Asset test in [draft PR #128](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/128). |
| Haskell | Independently model spell-card movement, piles, and reshuffles against the real duel resolver's output. | [Draft PR #131](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/131). |
| Lua | Independently check campus movement geometry and collision handling against the real movement helper. | [Draft PR #132](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/132). |
| Firestore Security Rules | Run emulator tests for allowed and denied access and document invariants. | In use. |
| HTML and CSS | Browser assertions for accessibility, input, layout, and narrow viewports. | Browser coverage exists. Some zoom and device cases are open. |
| JSON, JSON Schema, and YAML | Portable fixtures and receipts, machine-validated schemas where needed, and Actions configuration/policy. | JSON and YAML are in use. Schema validation is a design option for broader adoption. |

### Conditional additions with a clear use

| Language or format | Use when there is a test to own |
|---|---|
| R, Julia, or Octave | Seeded balance and distribution checks with a defined sample size and target threshold. Pick one if the balance question warrants a separate model. |
| TLA+/PlusCal, Alloy, SMT-LIB, Prolog, Lean, or Dafny | Explore a narrowly specified property such as paying a quest once or conserving a trade ledger. Turn any counterexample into a test input for the real game. |
| Kotlin, Swift, Objective-C, Objective-C++, Dart, Elm, GDScript, or Haxe | Verify a supported native client, port, wrapper, or external consumer when it exists. |
| SQL | Verify migrations, transactions, and data invariants if a relational store becomes part of the game. |
| GLSL, WGSL, HLSL, or Metal shading language | Verify compilation and rendering contracts for shaders the game actually ships. |
| C, Zig, or WebAssembly text | Verify a native asset reader or WASM routine if it ships. |
| Lua variants such as Luau, or supported JVM or .NET languages | Verify an actual external scripting, client, or plug-in contract when one exists. |
| Gherkin, OpenAPI, AsyncAPI | Optional formats for readable scenarios or versioned HTTP and WebSocket interface contracts. |

For the complete candidate lists, see the [66-entry language and format guide](../public-template/language-matrix.md) and the [pinned 573-entry programming-language inventory](language-test-backlog.md#all-programming-entries-in-the-pinned-registry). The inventory includes dialects and domain-specific languages. The [AlderVale test and evidence guide](README.md) records executable cases and runner coverage.

## Applying the pattern beyond First Spark

| Player-facing behavior | What the suites can exchange | Evidence owners |
|---|---|---|
| Guest save and recovery | Save before and after a write failure, restore, or realm switch. | Playwright drives the guest path, TypeScript verifies the storage failure behavior, and C# checks both saved realms. |
| Duel replay | Seed, selected moves, and ordered round checkpoints from the real resolver. | TypeScript produces the replay, C++ checks combat outcomes, and the draft Haskell suite can check card piles when its cases are applicable. |
| Multiplayer reconnect | A controlled connect, disconnect, and reconnect sequence with scoped peer observations. | Go checks server/client events and Playwright verifies what the player sees in the HUD. Emulator checks cover authenticated persistence where appropriate. |
| Rowan asset loading | Built asset path and hash, served response details, and browser load or fallback result. | Rust checks GLB bytes, the draft Java suite can check delivery, and Playwright checks the player-visible result. |

Each example is a proposed connection between coverage areas. The PR #134 pilot is the recorded shared-evidence implementation.
