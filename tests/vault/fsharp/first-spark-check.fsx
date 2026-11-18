#load "QuestModel.fsx"

open System
open System.IO
open System.Text.Json
open QuestModel

let directory =
    match Array.toList fsi.CommandLineArgs with
    | [_; path] -> path
    | _ -> failwith "Usage: dotnet fsi --exec first-spark-check.fsx EVIDENCE_DIRECTORY"

let read name = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory, name + ".json")))
let scenario = read "scenario"
let wizardName = scenario.RootElement.GetProperty("wizardName").GetString()
if scenario.RootElement.GetProperty("realm").GetString() <> "breeze" then
    failwith "This reward contract expects the Breeze solo fixture"

let observed checkpoint : State =
    use snapshot = read checkpoint
    let wizard =
        snapshot.RootElement.GetProperty("wizards").EnumerateArray()
        |> Seq.exactlyOne
    if wizard.GetProperty("name").GetString() <> wizardName then
        failwithf "%s contains the wrong fixture wizard" checkpoint
    let wallet = wizard.GetProperty("currencies")
    let completed =
        wizard.GetProperty("progression").GetProperty("completedQuests").EnumerateArray()
        |> Seq.map (fun quest -> quest.GetString())
        |> Seq.toList
    { Level = wizard.GetProperty("level").GetInt32()
      Rank = wizard.GetProperty("rank").GetInt32()
      Xp = wizard.GetProperty("xp").GetInt32()
      Florins = wallet.GetProperty("florins").GetInt32()
      Shards = wallet.GetProperty("spellShards").GetInt32()
      Honor = wallet.GetProperty("honorMarks").GetInt32()
      Seals = wallet.GetProperty("bondingSeals").GetInt32()
      Completed = completed
      Wins = Map.empty }

let before = observed "before-duel"
if before.Completed <> [] || before.Level <> 1 || before.Rank <> 1 || before.Xp <> 0 then
    failwith "First Spark requires a fresh level-one guest"

// Independent baseline for an ordinary Breeze solo victory. The quest model supplies the bonus.
let baseLevel, baseXp = advance before.Level before.Xp 298
let start = { Level = baseLevel; Xp = baseXp; Events = []; ReloadAt = [] }
let baseState = model start []
let expected events =
    let questState = model start events
    { questState with
        Florins = before.Florins + 163 + questState.Florins - baseState.Florins
        Shards = before.Shards + 2 + questState.Shards - baseState.Shards
        Honor = before.Honor + 4
        Seals = before.Seals }

let afterWin = expected [SoloWin]
let afterReplay = expected [SoloWin; SoloWin]
let checkpoints = ["after-victory"; "after-reload"; "after-replay"]
let actual = List.map observed checkpoints
let wanted = [afterWin; afterWin; afterReplay]
checkTrace "First Spark victory, reload and reducer replay" wanted actual

let changed = { actual[0] with Florins = actual[0].Florins + 110 } :: List.tail actual
let rejected =
    try
        checkTrace "Duplicate reward control" wanted changed
        false
    with error when error.Message.StartsWith("Duplicate reward control, checkpoint ", StringComparison.Ordinal) -> true
if not rejected then failwith "Duplicate reward control passed"
printfn "F# matched First Spark rewards across victory and reload and rejected a second payout on replay."
