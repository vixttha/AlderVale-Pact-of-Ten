# Bug-fixing pilot — Issue #75 live creature selection

- **Canonical bug:** [Issue #75](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/75)
- **Claim ref:** \`bug-library-claim-issue-75\`
- **Claim commit:** \`6570e8498b1ee5c99dc006cc3fb5317a7a9b0b32\`
- **Work PR:** [Draft PR #92](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/92)
- **Base:** \`a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd\`
- **Candidate head at record time:** \`48a615062064c699c88fdc96c9663269394c758d\`
- **Status:** fix prepared; exact-candidate public CI pending; owner acceptance pending

## Confirmed evidence

Issue #75 has a live WebSocket reproduction showing that PvP and co-op fighters were built with the hardcoded Cinder Kitsune Stage 1 creature instead of each player's selection. The original reproduction matrix is linked from the issue's evidence comments. Current main was re-read before implementation.

## Implementation

- Adds a pure creature-selection normalizer and a shared live-fighter resolver.
- Authenticated sessions load the selected creature from the Firestore subcollection referenced by the server-read wizard document. The document must match verified owner, wizard and realm.
- Element is derived from the species catalogue, not the client-supplied element. Persisted stage, chromatic state, branch choice and known talents are carried into the combat slot.
- Uses the existing local-duel HP formula \`190 + 45 × stage\`; no new balance curve is invented.
- Guest sessions use client-supplied local-save selection data after catalogue and enum validation. This does not prove server-side ownership or progression; the limitation is explicit.
- Missing/invalid selection uses the safe Cinder starter. A persisted document that belongs to another owner/wizard/realm fails closed.
- Adds unit tests and live WebSocket PvP/co-op regressions.

## Acceptance gates

- [ ] Exact PR #92 candidate passes all seven public GitHub-hosted validation jobs.
- [ ] The two new live WebSocket regressions pass on the exact tested checkout.
- [ ] Authenticated stored-selection path and ownership checks pass.
- [ ] No overlapping PR or source conflict remains.
- [ ] Owner accepts the fix.
- [ ] Issue #75 remains open until the linked fix is merged and the required regression evidence is recorded.

No merge, issue closure or release is performed by this record.
