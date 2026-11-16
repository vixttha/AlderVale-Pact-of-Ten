# Issue #35 · Guest migration and second-account enrollment

[Canonical issue](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/35) · [Merged fix, PR #60](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/60) · [Public hosted validation](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43787884088)

## Revisions

| Revision | SHA |
| --- | --- |
| PR base | `ffdf746cf1a9aaca4f16447c6328f835e0d0fb64` |
| PR head | `0c942c2ce75ab325a76c56f6ca6e5caeb11a2762` |
| Tested PR merge checkout | `cadc6116f53f4519b8175aa597b752f15ad8d4c7` |
| Merged to `main` | [`f44a00cda3a568f60ae27012488f6bf704088fcf`](https://github.com/vixttha/AlderVale-Pact-of-Ten/commit/f44a00cda3a568f60ae27012488f6bf704088fcf) |

The tested and merged revisions have identical blobs for the three changed files (`src/App.tsx`, `src/lib/storage.ts`, and `tests/firestore.integration.test.ts`) and `.github/workflows/validate.yml`. The run above belongs to the tested PR merge checkout.

## Verification

- The linked Actions run records a pass for all seven jobs across Linux, Windows, macOS, Chromium, Firefox, WebKit, and the Firestore emulator. The first WebKit attempt lost the First Spark duel. Its [same-checkout rerun](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43787884088/job/133042183378) passed.
- PR #60 records a Chromium regression with Firebase Auth and Firestore emulators. After the first account imported the guest wizard, the second account enrolled and reloaded its own wizard in the same realm. The first account retained its wizard and the local guest save was preserved. The PR also records a concurrent-import check.
- Scope of sign-in verification was emulator-backed. See the [canonical issue](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/35) for the current disposition.
