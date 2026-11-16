# Issue #13 · First Spark coverage

[Canonical issue](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/13) · [PR #61](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/61) · [Hosted run, attempt 1](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions/runs/43793229419/attempts/1)

| Revision | SHA |
| --- | --- |
| PR base | `f44a00cda3a568f60ae27012488f6bf704088fcf` |
| PR head | `0334e6665fd9c7961d64736f32b4a59c12dc3b76` |
| Tested PR merge checkout | `1471aef6020007e4316db9504e13df5414503ed5` |

The `tools/ci/human.pw.mjs` scenario “a guest wins as Rowan and keeps First Spark and its rewards after reload” checks the First Spark completion badge, expected quest and duel payout, and persisted save after reload. All seven hosted jobs passed on this candidate. PR #61 changes the existing test to stabilize the duel and timing.

Disposition at review: PR #61 is open. This is partial coverage for #13. Verify the Arbor and Rare Trial reward paths before closing the issue.
