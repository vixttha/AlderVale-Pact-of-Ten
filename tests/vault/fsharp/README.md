# F# quest progression contracts

The F# model derives the expected state from each event prefix. It calculates the first completion of each quest, adds that quest's reward once, and derives level and banked XP from cumulative XP milestones. It compares those results with observations from the real TypeScript saga reducer. All inputs and bounds are deterministic.

| Case | Coverage |
| --- | --- |
| G13-010 | Check exact completion boundaries and XP rollover near levels 2, 8 and 50, plus the banked XP cap. |
| G13-011 | Switch between lead-creature wins and Rune-Catch before and after Harmony completes. |
| G13-012 | Enumerate every sequence of up to four events from the current five-event saga vocabulary. Compare partial progress and each quest payout at every step. |
| G13-013 | Insert a save and reload at every point, one point at a time, in each sequence of up to three events. Also run traces that reload at every point in the same run. Compare checkpoints before and after each reload, and verify that the other realm's save bytes stay intact. |
| G13-014 | Repeat each completion route with intervening events and a reload. Compare all balances, XP and completion flags. |

The model pins the current published payouts in `shared/world.ts` and the XP rules in `shared/realms.ts`. Update expectations when the governing gameplay rule changes. The harness runs each sequence against the current reducer, including its accepted Rare Trial attempt event. Gameplay eligibility to emit an event, browser localStorage, and signed-in saves have separate coverage. The adapter calls the real guest saver and loader against synthetic in-memory storage, with cloud dependencies stubbed. Each suite checks that a deliberately changed wallet value raises a contextual mismatch.

From the repository root, use Node 24 and the .NET SDK version in `global.json`:

```sh
cd tests/vault/fsharp
dotnet fsi --exec quest-contracts.fsx
```
