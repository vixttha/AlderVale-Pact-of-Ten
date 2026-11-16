using System.Text.Json;

internal sealed class ContractError(string path, string detail) : Exception($"{path}: {detail}")
{
    public string Path { get; } = path;
}

// Read only the selected v1 contract. Unrelated game fields can evolve independently.
internal readonly record struct Field(JsonElement Element, string Path)
{
    public Field Child(string name) =>
        Optional(name) ?? throw new ContractError($"{Path}.{name}", "required field is missing");

    public Field? Optional(string name)
    {
        Require(JsonValueKind.Object);
        return Element.TryGetProperty(name, out var value) ? new Field(value, $"{Path}.{name}") : null;
    }

    public string Text()
    {
        Require(JsonValueKind.String);
        return Element.GetString()!;
    }

    public long Integer()
    {
        Require(JsonValueKind.Number);
        const long maxSafeInteger = 9_007_199_254_740_991;
        if (!Element.TryGetInt64(out var value) || value is < -maxSafeInteger or > maxSafeInteger)
            throw new ContractError(Path, "expected a JavaScript-safe integer");
        return value;
    }

    public Field[] Items()
    {
        Require(JsonValueKind.Array);
        return Element.EnumerateArray().Select((value, index) => new Field(value, $"{Path}[{index}]")).ToArray();
    }

    public Dictionary<string, Field> Members()
    {
        Require(JsonValueKind.Object);
        var result = new Dictionary<string, Field>(StringComparer.Ordinal);
        foreach (var member in Element.EnumerateObject())
        {
            if (!result.TryAdd(member.Name, new Field(member.Value, $"{Path}.{member.Name}")))
                throw new ContractError($"{Path}.{member.Name}", "duplicate member");
        }
        return result;
    }

    private void Require(JsonValueKind kind)
    {
        if (Element.ValueKind != kind)
            throw new ContractError(Path, $"expected {kind}, received {Element.ValueKind}");
    }
}

internal sealed class GuestSave(Field root)
{
    public Field Account => root.Child("account");
    public Field[] Wizards => root.Child("wizards").Items();
    public Field? Gallery => root.Optional("gallery");

    public void ValidateIdentity(string realm)
    {
        var owner = Account.Child("uid").Text();
        Guard.Equal(realm, Account.Child("realmId"));
        var listed = Account.Child("wizardIds").Items().Select(id => id.Text()).ToArray();
        var observed = Wizards.Select(wizard => wizard.Child("id").Text()).ToArray();
        Guard.Unique(listed, "$.account.wizardIds");
        Guard.Unique(observed, "$.wizards");
        Guard.Sequence(listed.Order(StringComparer.Ordinal), observed.Order(StringComparer.Ordinal), "$.account.wizardIds");
        foreach (var wizard in Wizards)
        {
            Guard.Equal(realm, wizard.Child("realmId"));
            Guard.Equal(owner, wizard.Child("ownerId"));
        }
    }

    public Dictionary<string, Field> ReadWallets(Field wizard)
    {
        var wallet = wizard.Child("currencies");
        var balances = new Dictionary<string, Field>(StringComparer.Ordinal);
        foreach (var currency in new[] { "florins", "honorMarks", "bondingSeals", "spellShards" })
        {
            var field = wallet.Child(currency);
            field.Integer();
            balances.Add(currency, field);
        }
        return balances;
    }

    public void ValidateCreatureOwnership()
    {
        var groups = root.Child("creatures").Members();
        var wizardIds = Wizards.Select(wizard => wizard.Child("id").Text()).ToHashSet(StringComparer.Ordinal);
        foreach (var (id, group) in groups)
        {
            if (!wizardIds.Contains(id)) throw new ContractError(group.Path, "creature group has no matching wizard");
        }

        var allIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var wizard in Wizards)
        {
            var wizardId = wizard.Child("id").Text();
            var pets = Creatures(wizard);
            var active = wizard.Child("activeCreatureId");
            var activeId = active.Text();
            foreach (var pet in pets)
            {
                var petId = pet.Child("id");
                if (!allIds.Add(petId.Text())) throw new ContractError(petId.Path, "duplicate creature ID");
                Guard.Equal(wizardId, pet.Child("wizardId"));
                Guard.Equal(wizard.Child("ownerId").Text(), pet.Child("ownerId"));
                Guard.Equal(wizard.Child("realmId").Text(), pet.Child("realmId"));
            }
            if (!pets.Any(pet => pet.Child("id").Text() == activeId))
                throw new ContractError(active.Path, "active creature does not belong to this wizard");
        }
    }

    public Field[] Creatures(Field wizard)
    {
        var groups = root.Child("creatures");
        var id = wizard.Child("id").Text();
        return groups.Optional(id)?.Items() ?? [];
    }
}

internal static class Guard
{
    public static void Equal(string expected, Field field) => Equal(expected, field.Text(), field.Path);
    public static void Equal(long expected, Field field) => Equal(expected, field.Integer(), field.Path);

    public static void Equal<T>(T expected, T actual, string path)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
            throw new ContractError(path, $"expected '{expected}', received '{actual}'");
    }

    public static void Sequence(IEnumerable<string> expected, IEnumerable<string> actual, string path)
    {
        if (!expected.SequenceEqual(actual, StringComparer.Ordinal))
            throw new ContractError(path, $"expected [{string.Join(", ", expected)}], received [{string.Join(", ", actual)}]");
    }

    public static void Sequence(string[] expected, Field field) =>
        Sequence(expected, field.Items().Select(item => item.Text()), field.Path);

    public static void Unique(string[] values, string path)
    {
        if (values.Distinct(StringComparer.Ordinal).Count() != values.Length)
            throw new ContractError(path, "duplicate ID");
    }

    public static void Absent(Field? field, string path)
    {
        if (field.HasValue) throw new ContractError(path, "expected an omitted field");
    }
}
