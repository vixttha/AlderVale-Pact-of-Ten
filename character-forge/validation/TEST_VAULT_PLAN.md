# Character Compatibility Matrix — Test Vault adoption plan

**Status:** PROPOSED, not implemented or verified. Keep the canonical Test Vault on its own existing paths and do not duplicate suites or assert that a proposed test passed.

Verified existing Test Vault responsibilities include: `tests/rowanModel.test.ts`, `tests/rowanHuman.test.ts`, `tests/rowanLifecycle.test.ts`, `tests/rowanResourceOwnership.test.ts`, GLB joint/index/inverse-bind/animation contracts from Rust, Tailor persistence in browser, and existing guest save tests.

| Test ID (proposed) | Observable contract | Test layer | Negative fixture |
| --- | --- | --- | --- |
| CF-01 | every race selects its intended species body | model catalog + browser preview | missing race mesh routes to defined safe fallback |
| CF-02 | wing/tail/horn/ear rigs retain permitted motion | rig/asset contract + captured animation | missing joint or invalid attach node rejected |
| CF-03 | one logical item equips across 13 races | cross-race garment matrix | absent fit variant reported without disappearing item |
| CF-04 | extreme supported body morphs retain fit | visual snapshots + asset-bound validation | out-of-range morph yields safe constrained result |
| CF-05 | foot anatomies handle socks and footwear | browser snapshots | tall boots with sock mesh protrusion fails visual review |
| CF-06 | underwear base cannot be unequipped | catalog/UI/integration | attempted remove is denied |
| CF-07 | existing player appearance survives reload/migration | guest save + Firestore where applicable | old save / unknown field / partial migration |
| CF-08 | repeated mount/unmount retains valid resources | unit + browser lifecycle | aborted GLB load / invalid skinned mesh |
| CF-09 | avatar cosmetic change does not alter combat collision | game contract | extreme scaling changes server reach or reward |
| CF-10 | dense scene meets a documented future budget | performance profiling, manual + limited runner baseline | slow / software WebGL reports gap, not pass |

When these cases are implemented, add their tests to existing Test Vault catalogs; label each Idea, Implemented, Verified, Manual or Conditional. Preserve known-bad fixtures where practical, exact checkout, failure diagnostics, software-GL coverage, and owner visual acceptance separately.

**v0.0.1 itself:** only template structural validation and negative-path tests are implemented. No 13-race compatibility, clipping, FPS or production acceptance claim may be made from that.
