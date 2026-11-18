using System.Text.Json;

internal static class FirstSparkSaveCheck
{
    public static void Run(string directory)
    {
        using var manifest = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory, "scenario.json")));
        var scenario = new Field(manifest.RootElement, "$");
        var realm = scenario.Child("realm").Text();
        var name = scenario.Child("wizardName").Text();
        var saves = new SaveFixtures(directory);

        var before = Read("before-duel");
        var victory = Read("after-victory");
        var reload = Read("after-reload");
        Guard.Equal(before.Id, victory.Id, "after-victory.wizard.id");
        Guard.Equal(victory.Id, reload.Id, "after-reload.wizard.id");
        Guard.Equal(victory.Level, reload.Level, "after-reload.wizard.level");
        Guard.Equal(victory.Rank, reload.Rank, "after-reload.wizard.rank");
        Guard.Equal(victory.Xp, reload.Xp, "after-reload.wizard.xp");
        Guard.Sequence(victory.Completed, reload.Completed, "after-reload.wizard.completedQuests");
        foreach (var (currency, balance) in victory.Wallet)
            Guard.Equal(balance, reload.Wallet[currency], $"after-reload.wizard.currencies.{currency}");

        saves.Reject("after-reload", "$.wizards[0].realmId",
            changed => changed["wizards"]![0]!["realmId"] = "horizon",
            save => save.ValidateIdentity(realm));
        Console.WriteLine("C# preserved guest identity, wallet, progress and quest completion across reload.");

        Snapshot Read(string checkpoint)
        {
            Snapshot? result = null;
            saves.Check(checkpoint, save =>
            {
                Guard.Equal("guest_local", save.Account.Child("uid"));
                save.ValidateIdentity(realm);
                var wizard = save.Wizards.Single();
                Guard.Equal(name, wizard.Child("name"));
                var completed = wizard.Child("progression").Child("completedQuests").Items()
                    .Select(quest => quest.Text()).ToArray();
                Guard.Unique(completed, wizard.Path + ".progression.completedQuests");
                result = new Snapshot(wizard.Child("id").Text(), wizard.Child("level").Integer(),
                    wizard.Child("rank").Integer(), wizard.Child("xp").Integer(), completed,
                    save.ReadWallet(wizard).ToDictionary(entry => entry.Key, entry => entry.Value.Integer()));
            });
            return result ?? throw new InvalidOperationException("Missing checkpoint " + checkpoint);
        }
    }

    private sealed record Snapshot(string Id, long Level, long Rank, long Xp, string[] Completed,
        Dictionary<string, long> Wallet);
}
