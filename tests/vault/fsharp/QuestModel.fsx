module QuestModel

type Event = SoloWin | LeadWin | RuneCatch | TrialWin | TrialAttempt

let eventName = function
    | SoloWin -> "solo-win"
    | LeadWin -> "lead-creature-win"
    | RuneCatch -> "rune-catch"
    | TrialWin -> "rare-trial-win"
    | TrialAttempt -> "rare-trial-attempt"

let allEvents = [ SoloWin; LeadWin; RuneCatch; TrialWin; TrialAttempt ]
let rank level = min 20 ((level + 1) / 2)
let threshold level = 90 + 45 * level + 12 * level * level
let levelTotals = [|1..49|] |> Array.scan (fun total level -> total + threshold level) 0 |> Array.append [|0|]

let advance startLevel startXp gain =
    let totalXp = levelTotals[startLevel] + startXp + gain
    let level = [startLevel..50] |> List.findBack (fun candidate -> levelTotals[candidate] <= totalXp)
    level, min 10_000_000 (totalXp - levelTotals[level])

type Scenario =
    { Level: int
      Xp: int
      Events: Event list
      ReloadAt: int list }

type State =
    { Level: int
      Xp: int
      Rank: int
      Florins: int
      Shards: int
      Honor: int
      Seals: int
      Completed: string list
      Wins: Map<string, int> }

// Derive each state from the event prefix, with a ledger keyed by first completion.
let model (start: Scenario) (events: Event list) =
    let indexed = List.indexed events
    let first predicate = indexed |> List.tryPick (fun (i, event) -> if predicate event then Some i else None)
    let leadWins = indexed |> List.choose (fun (i, event) -> if event = LeadWin then Some i else None)
    let harmony = [ first ((=) RuneCatch); List.tryItem 1 leadWins ] |> List.choose id |> List.sort |> List.tryHead
    let ledger =
        [ first ((=) SoloWin), ("q_first_duel", 90, 110, 3)
          harmony, ("q_bond_arbor", 140, 160, 4)
          first (fun event -> event = TrialWin || event = TrialAttempt), ("q_rare_trial", 260, 320, 8) ]
        |> List.choose (fun (completion, reward) -> completion |> Option.map (fun step -> step, reward))
        |> List.sortBy fst
        |> List.map snd
    let wins =
        leadWins
        |> List.filter (fun step -> harmony |> Option.forall (fun completedAt -> step <= completedAt))
        |> List.length
    let level, xp = advance start.Level start.Xp (ledger |> List.sumBy (fun (_, xp, _, _) -> xp))
    { Level = level
      Xp = xp
      Rank = rank level
      Florins = 220 + (ledger |> List.sumBy (fun (_, _, florins, _) -> florins))
      Shards = 4 + (ledger |> List.sumBy (fun (_, _, _, shards) -> shards))
      Honor = 10
      Seals = 2
      Completed = ledger |> List.map (fun (quest, _, _, _) -> quest)
      Wins = if wins = 0 then Map.empty else Map.ofList ["q_bond_arbor", wins] }

let checkpoints (scenario: Scenario) =
    [ for step in 0..scenario.Events.Length do
          let state = List.take step scenario.Events |> model scenario
          yield state
          if List.contains step scenario.ReloadAt then yield state ]

let checkTrace context (expected: State list) (actual: State list) =
    if expected.Length <> actual.Length then
        failwithf "%s: expected %d checkpoints, got %d" context expected.Length actual.Length
    List.iteri2 (fun index wanted observed ->
        if wanted <> observed then
            failwithf "%s, checkpoint %d\nexpected %A\nobserved %A" context index wanted observed) expected actual

