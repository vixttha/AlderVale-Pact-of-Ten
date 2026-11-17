#load "QuestModel.fsx"

open System
open System.Diagnostics
open System.IO
open System.Text.Json

open QuestModel

let readState (json: JsonElement) =
    let property (name: string) = json.GetProperty(name)
    let number name = (property name).GetInt32()
    { Level = number "level"
      Xp = number "xp"
      Rank = number "rank"
      Florins = number "florins"
      Shards = number "spellShards"
      Honor = number "honorMarks"
      Seals = number "bondingSeals"
      Completed = (property "completedQuests").EnumerateArray() |> Seq.map (fun item -> item.GetString()) |> Seq.toList
      Wins = (property "wins").EnumerateObject() |> Seq.map (fun item -> item.Name, item.Value.GetInt32()) |> Map.ofSeq }

let scenario level xp events reloads : Scenario = { Level = level; Xp = xp; Events = events; ReloadAt = reloads }
let rec sequences length =
    if length = 0 then [[]]
    else [ for tail in sequences (length - 1) do for event in allEvents do yield event :: tail ]

let tracesUpTo length = [0..length] |> List.collect sequences
let suiteDefinitions =
    [ "G13-010", "Exact completion boundaries",
        [ for level, xp in [1, 146; 7, 992; 49, 31106; 50, 9_999_950] do
              for events in [ []; [SoloWin]; [LeadWin]; [LeadWin; LeadWin]; [RuneCatch]; [TrialWin]; [TrialAttempt] ] do
                  yield scenario level xp events [] ]
      "G13-011", "Harmony route switching",
        [ for events in [ [LeadWin; RuneCatch; LeadWin]; [RuneCatch; LeadWin; LeadWin];
                           [LeadWin; LeadWin; RuneCatch]; [LeadWin; RuneCatch; RuneCatch] ] do
              for point in 0..events.Length do yield scenario 7 29 events [point] ]
      "G13-012", "Interleaved quests",
        [ for events in tracesUpTo 4 do yield scenario 7 992 events [] ]
      "G13-013", "Save and reload at every boundary",
        [ for events in tracesUpTo 3 do
              for point in 0..events.Length do yield scenario 7 992 events [point]
              if events.Length > 0 then yield scenario 7 992 events [0..events.Length] ]
      "G13-014", "Replay after completion",
        [ for finish in [ [SoloWin]; [LeadWin; LeadWin]; [RuneCatch]; [TrialWin]; [TrialAttempt] ] do
              for next in allEvents do
                  yield scenario 7 992 (finish @ [next; next] @ finish) [finish.Length] ] ]

let workdir = Directory.CreateTempSubdirectory("aldervale-fsharp-")
try
    let input = Path.Combine(workdir.FullName, "scenarios.json")
    let output = Path.Combine(workdir.FullName, "observations.json")
    let batches =
        suiteDefinitions
        |> List.map (fun (caseId, title, scenarios) ->
            caseId, title, (scenarios |> List.mapi (fun i value -> sprintf "%s/%d" caseId (i + 1), value)))
    let inputs =
        batches
        |> List.collect (fun (_, _, scenarios) -> scenarios)
        |> List.map (fun (label, value) ->
            {| label = label
               startLevel = value.Level
               startXp = value.Xp
               startRank = rank value.Level
               events = value.Events |> List.map eventName |> List.toArray
               reloadAt = value.ReloadAt |> List.toArray |})
        |> List.toArray
    File.WriteAllText(input, JsonSerializer.Serialize(inputs))
    let options = ProcessStartInfo("node", UseShellExecute = false)
    for argument in [ Path.Combine(__SOURCE_DIRECTORY__, "observe-quests.mjs"); input; output ] do
        options.ArgumentList.Add(argument)
    use observation = Process.Start(options)
    if not (observation.WaitForExit(60_000)) then
        observation.Kill(true)
        observation.WaitForExit()
        failwith "The game observation process exceeded 60 seconds"
    if observation.ExitCode <> 0 then failwithf "Game observation exited %d" observation.ExitCode
    use response = JsonDocument.Parse(File.ReadAllText(output))
    let results = response.RootElement.EnumerateArray() |> Seq.toArray
    if results.Length <> inputs.Length then failwith "Game observation returned the wrong number of traces"
    let mutable offset = 0
    let mutable compared = 0
    for caseId, title, scenarios in batches do
        for label, inputScenario in scenarios do
            let result = results[offset]
            offset <- offset + 1
            if result.GetProperty("label").GetString() <> label then failwithf "Expected trace %s" label
            let actual = result.GetProperty("checkpoints").EnumerateArray() |> Seq.map readState |> Seq.toList
            let expected = checkpoints inputScenario
            let context = sprintf "%s [level %d, XP %d, events %A, reloads %A]" label inputScenario.Level inputScenario.Xp (List.map eventName inputScenario.Events) inputScenario.ReloadAt
            checkTrace context expected actual
            compared <- compared + actual.Length
        let control = scenarios |> List.last |> snd |> checkpoints
        let final = List.last control
        let changed = (control |> List.take (control.Length - 1)) @ [{ final with Florins = final.Florins + 110 }]
        let rejected =
            try
                checkTrace caseId control changed
                false
            with error when error.Message.StartsWith(caseId + ", checkpoint ", StringComparison.Ordinal) -> true
        if not rejected then failwithf "%s failed to reject a changed wallet observation" caseId
        printfn "PASS %s %s (%d traces; wallet negative control rejected)" caseId title scenarios.Length
    printfn "F# quest contracts: %d/5 passed, %d traces, %d checkpoints" batches.Length inputs.Length compared
finally
    workdir.Delete(true)
