using System.Text.Json;
using System.Text.Json.Nodes;

if (args is ["--first-spark", var directory])
{
    FirstSparkSaveCheck.Run(directory);
    return 0;
}

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: GuestSaveContracts <directory of raw guest save fixtures>");
    return 2;
}

var fixtures = new SaveFixtures(args[0]);
var cases = new (string Name, Action<SaveFixtures> Check)[]
{
    ("G28-008 realm and wizard identity", CheckIdentity),
    ("G28-009 wallet and progression", CheckProgression),
    ("G28-010 creature ownership and active selection", CheckCreatures),
    ("G28-011 v1 optional fields", CheckLegacyShape),
    ("G28-012 invalid save diagnostics", CheckInvalidSaves),
};

var failed = 0;
foreach (var (name, check) in cases)
{
    try
    {
        check(fixtures);
        Console.WriteLine($"PASS {name}");
    }
    catch (Exception error)
    {
        failed++;
        Console.Error.WriteLine($"FAIL {name}: {error.Message}");
    }
}

Console.WriteLine($"C# guest save contracts: {cases.Length - failed}/{cases.Length} passed");
return failed == 0 ? 0 : 1;

static void CheckIdentity(SaveFixtures fixtures)
{
    foreach (var (fixture, realm, ids, termXp) in new[]
    {
        ("breeze-v1", "breeze", new[] { "rowan-breeze", "wren-breeze" }, 71L),
        ("horizon-v1", "horizon", new[] { "vale-horizon" }, 41L),
    })
    {
        fixtures.Check(fixture, save =>
        {
            save.ValidateIdentity(realm);
            Guard.Equal("guest_local", save.Account.Child("uid"));
            Guard.Sequence(ids, save.Account.Child("wizardIds"));
            Guard.Equal(termXp, save.Account.Child("termXp"));
            Guard.Sequence(ids, save.Wizards.Select(w => w.Child("id").Text()), "$.wizards");
        });
    }
    fixtures.Reject("breeze-v1", "$.account.wizardIds",
        json => json["account"]!["wizardIds"]![1] = "vale-horizon",
        save => save.ValidateIdentity("breeze"));
    fixtures.Reject("breeze-v1", "$.wizards[1].realmId",
        json => json["wizards"]![1]!["realmId"] = "horizon",
        save => save.ValidateIdentity("breeze"));
}

static void CheckProgression(SaveFixtures fixtures)
{
    fixtures.Check("breeze-v1", save =>
    {
        AssertProgressedWizard(save, save.Wizards[0]);
        var wizard = save.Wizards[0];
        Guard.Equal(1, wizard.Child("progression").Child("questWins").Child("q_bond_arbor"));
        var second = save.Wizards[1];
        Guard.Equal(220, save.ReadWallet(second)["florins"]);
        Guard.Equal(0, second.Child("xp"));
        Guard.Sequence([], second.Child("progression").Child("completedQuests"));
    });
    fixtures.Check("horizon-v1", save =>
    {
        var wizard = save.Wizards.Single();
        Guard.Equal(220, save.ReadWallet(wizard)["florins"]);
        Guard.Equal(4, save.ReadWallet(wizard)["spellShards"]);
        Guard.Equal(1, wizard.Child("level"));
        Guard.Equal(1, wizard.Child("rank"));
        Guard.Equal(0, wizard.Child("xp"));
        Guard.Sequence([], wizard.Child("progression").Child("completedQuests"));
    });

    fixtures.Reject("breeze-v1", "$.wizards[0].currencies.florins",
        json => json["wizards"]![0]!["currencies"]!["florins"] = 3_000_000_000L,
        save => AssertProgressedWizard(save, save.Wizards[0]));
    fixtures.Reject("breeze-v1", "$.wizards[0].progression.completedQuests",
        json => ((JsonArray)json["wizards"]![0]!["progression"]!["completedQuests"]!).Clear(),
        save => AssertProgressedWizard(save, save.Wizards[0]));
}

static void AssertProgressedWizard(GuestSave save, Field wizard)
{
    Guard.Equal("Rowan 雪 🦉", wizard.Child("name"));
    Guard.Equal(2, wizard.Child("level"));
    Guard.Equal(53, wizard.Child("xp"));
    Guard.Equal(1, wizard.Child("rank"));
    var wallet = save.ReadWallet(wizard);
    Guard.Equal(3_000_000_110L, wallet["florins"]);
    Guard.Equal(10, wallet["honorMarks"]);
    Guard.Equal(2, wallet["bondingSeals"]);
    Guard.Equal(7, wallet["spellShards"]);
    Guard.Sequence(["q_first_duel"], wizard.Child("progression").Child("completedQuests"));
}

static void CheckCreatures(SaveFixtures fixtures)
{
    fixtures.Check("breeze-v1", save =>
    {
        save.ValidateCreatureOwnership();
        var wizard = save.Wizards[0];
        Guard.Equal("rowan-active", wizard.Child("activeCreatureId"));
        var creatures = save.Creatures(wizard);
        Guard.Equal(2, creatures.Length, "$.creatures.rowan-breeze");
        AssertCreature(creatures[0], "rowan-breeze_starter_pet", "cinder_kitsune", 1, ["tal_sturdy"]);
        AssertCreature(creatures[1], "rowan-active", "zephyr_owl", 3, ["tal_sturdy", "tal_spellproof"]);
        AssertCreature(save.Creatures(save.Wizards[1]).Single(),
            "wren-breeze_starter_pet", "rime_stag", 1, ["tal_sturdy"]);
    });
    fixtures.Check("horizon-v1", save =>
    {
        save.ValidateCreatureOwnership();
        AssertCreature(save.Creatures(save.Wizards.Single()).Single(),
            "vale-horizon_starter_pet", "cinder_kitsune", 2, ["tal_spellproof"]);
    });
    fixtures.Reject("breeze-v1", "$.creatures.rowan-breeze[1].wizardId",
        json => json["creatures"]!["rowan-breeze"]![1]!["wizardId"] = "wren-breeze",
        save => save.ValidateCreatureOwnership());
    fixtures.Reject("breeze-v1", "$.wizards[0].activeCreatureId",
        json => json["wizards"]![0]!["activeCreatureId"] = "wren-breeze_starter_pet",
        save => save.ValidateCreatureOwnership());
}

static void AssertCreature(Field creature, string id, string species, int stage, string[] talents)
{
    Guard.Equal(id, creature.Child("id"));
    Guard.Equal(species, creature.Child("speciesId"));
    Guard.Equal(stage, creature.Child("stage"));
    Guard.Sequence(talents, creature.Child("talents"));
}

static void CheckLegacyShape(SaveFixtures fixtures)
{
    fixtures.Check("legacy-shaped-breeze-v1", save =>
    {
        save.ValidateIdentity("breeze");
        save.ValidateCreatureOwnership();
        AssertProgressedWizard(save, save.Wizards[0]);
        Guard.Equal(71, save.Account.Child("termXp"));
        Guard.Absent(save.Gallery, "$.gallery");
        Guard.Absent(save.Wizards[0].Child("progression").Optional("questWins"),
            "$.wizards[0].progression.questWins");
    });
    fixtures.Check("breeze-v1", save =>
    {
        var gallery = save.Gallery ?? throw new ContractError("$.gallery", "fixture gallery is missing");
        Guard.Sequence(["fixture:owl"], gallery.Child("rowan-breeze"));
    });
    fixtures.Reject("legacy-shaped-breeze-v1", "$.wizards[0].progression.completedQuests",
        json => ((JsonObject)json["wizards"]![0]!["progression"]!).Remove("completedQuests"),
        save => AssertProgressedWizard(save, save.Wizards[0]));
}

static void CheckInvalidSaves(SaveFixtures fixtures)
{
    const string balancePath = "$.wizards[0].currencies.florins";
    fixtures.Reject("breeze-v1", balancePath,
        json => json["wizards"]![0]!["currencies"]!["florins"] = "3000000110",
        save => { save.ReadWallet(save.Wizards[0]); });
    fixtures.Reject("breeze-v1", balancePath,
        json => json["wizards"]![0]!["currencies"]!["florins"] = 0.5,
        save => { save.ReadWallet(save.Wizards[0]); });
    fixtures.Reject("breeze-v1", balancePath,
        json => json["wizards"]![0]!["currencies"]!["florins"] = 9_007_199_254_740_992L,
        save => { save.ReadWallet(save.Wizards[0]); });
    fixtures.Reject("breeze-v1", "$.account.wizardIds",
        json => json["account"]!["wizardIds"]![1] = "rowan-breeze",
        save => save.ValidateIdentity("breeze"));
    fixtures.Reject("breeze-v1", "$.account.wizardIds",
        json => json["account"]!["wizardIds"]![1] = "missing-wizard",
        save => save.ValidateIdentity("breeze"));
    fixtures.Reject("breeze-v1", "$.creatures.missing-wizard",
        json => json["creatures"]!["missing-wizard"] = new JsonArray(),
        save => save.ValidateCreatureOwnership());
    SaveFixtures.RejectPayload("""{"account":""", "$", save => save.ValidateIdentity("breeze"));
}

internal sealed class SaveFixtures(string directory)
{
    private string Read(string fixture) => File.ReadAllText(Path.Combine(directory, $"{fixture}.json"));

    public void Check(string fixture, Action<GuestSave> check)
    {
        try
        {
            CheckPayload(Read(fixture), check);
        }
        catch (Exception error) when (error is ContractError or IOException)
        {
            throw new InvalidOperationException($"{fixture}: {error.Message}", error);
        }
    }

    public void Reject(string fixture, string path, Action<JsonNode> alter, Action<GuestSave> check)
    {
        var changed = JsonNode.Parse(Read(fixture)) ?? throw new InvalidOperationException($"{fixture}: empty fixture");
        alter(changed);
        RejectPayload(changed.ToJsonString(), path, check);
    }

    public static void RejectPayload(string payload, string path, Action<GuestSave> check)
    {
        try
        {
            CheckPayload(payload, check);
        }
        catch (ContractError error) when (error.Path == path)
        {
            Console.WriteLine($"  Rejected at {error.Path}");
            return;
        }
        catch (ContractError error)
        {
            throw new InvalidOperationException($"Expected rejection at {path}, got {error.Message}", error);
        }
        throw new InvalidOperationException($"Expected rejection at {path}, but the changed fixture passed");
    }

    private static void CheckPayload(string payload, Action<GuestSave> check)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(payload);
        }
        catch (JsonException error)
        {
            throw new ContractError(error.Path ?? "$", $"invalid JSON at byte {error.BytePositionInLine}");
        }

        using (document)
            check(new GuestSave(new Field(document.RootElement, "$")));
    }
}
