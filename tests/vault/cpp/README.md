# AlderVale C++ combat and guest-save contracts

The observation exporter calls the same shared TypeScript combat and guest save code as the game. The C++20 executable checks its observations against the independently calculated values in [expected-v1.tsv](expected-v1.tsv). Guest save observations use synthetic local storage. Cloud calls throw if invoked.

| CTest case | Contract and fixture basis | Known-bad control |
| --- | --- | --- |
| G06-001 | Cinder Dart is 95 at neutral affinity, 81 against Ember, and 119 against Frost after rounding. A prism switches the hit to Frost before matching buffs, traps, and wards. For the stacked Frost hit, 95 × 1.20 × 1.20 × 1.10 × 0.80 × 1.10 × 1.25 × 1.25 × 0.75 × 1.50 = 232.77375, which rounds to 233. The fixture checks which modifiers remain. | A full ward produces zero instead of the documented damage floor of one. |
| G06-002 | A level 1 Human starts with 420 max HP. The level 2 Stoneborn fixture applies the brim hat's +30 HP, a +45 HP talent, and 6% lineage bonus, in that order. Regen caps wizard and active creature HP, the knocked-out reserve stays at zero, and status refresh, stun wards and the seven-pip cap have boundary fixtures. | An eighth pip is added after reaching the cap. |
| G06-003 | Given two lethal actions, the team that won the coin acts first regardless of submission order. Within one team, the last hit reflects the submitted order. Invalid card selection, insufficient pips, a missing actor, and a stun leave spell effects unapplied. | The same-team result reflects the wrong last spell element. |
| G28-007 | The guest save v1 key, wallet, Unicode wizard name, optional gallery and quest flags survive serialization. A fresh wizard with 220 Florins and 4 Spell Shards receives 110 and 3 from First Spark once, plus 90 XP. Truncated JSON, a write failure, its retry, and a second realm exercise recovery. | The reloaded result pays First Spark twice. |
| G09-002 | In round 1 Cinder Dart hits for 95 and Pinion Bolt fizzles. In round 2 Burning ticks for 30 and Pinion Bolt lands for 88. In round 3 the last tick and a second Dart finish the duel. The oracle also covers a simultaneous knockout draw. | A mutual knockout is reported as victory. |

Each CTest case checks its expected scenario set and rejects changed, absent and extra observations. The replay exporter uses explicit rolls and verifies the resolver consumes exactly that stream. Each checkpoint captures phase, round, HP, pips, executed casts and remaining enemy statuses. The repeat check compares the full deterministic result. Expected outcomes are committed separately from the exporter and should change only with a reviewed game rule or fixture change.

The versioned handoff uses a header followed by tab-separated case ID, scenario name and canonical JSON observation. JSON keys are sorted. C++ compares these stable records one scenario at a time and reports the first differing byte with both values. Update the format header and reader together if the framing changes.

These checks cover the current supported game inputs and guest v1 save behavior. Browser persistence, signed-in sync, other save-version migrations and live multiplayer recovery have separate acceptance. The guest loader currently falls back on invalid JSON syntax and assumes structure when JSON parses. Schema validation for arbitrary parsed payloads requires an explicit game contract before adding it to the expected results.

Run from the repository root on standard public Ubuntu with Node 24, CMake 3.20 or newer, and a C++20 compiler. The workflow records actual versions and checkout. The C++ suite has no third-party dependencies.

```sh
cmake -S tests/vault/cpp -B /tmp/aldervale-cpp-vault
cmake --build /tmp/aldervale-cpp-vault --parallel 2
node tests/vault/cpp/export-observations.mjs > /tmp/aldervale-cpp-vault/observed-v1.tsv
ctest --test-dir /tmp/aldervale-cpp-vault --output-on-failure --verbose
```
