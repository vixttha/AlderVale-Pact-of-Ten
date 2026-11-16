import { describe, expect, it } from "vitest";
import {
  buildFallbackCombatCreatureSlot,
  buildGuestCombatCreatureSlot,
  isOwnedCreatureDocument,
  resolveLiveCombatCreature,
  sanitizeGuestCreatureSelection,
  toCombatCreatureSlot,
} from "../server/creatureSelection";

const stored = {
  id: "pet-rime-stag",
  speciesId: "rime_stag",
  nickname: "Winter Crown",
  stage: 3,
  chromatic: "dawn",
  branchChoice: "B",
  talents: ["tal_sturdy", "tal_may_blade", "not-a-talent"],
};

describe("live creature selection", () => {
  it("derives element and stage HP from the species and persisted stage", () => {
    const result = toCombatCreatureSlot({ ...stored, elementId: "ember" });
    expect(result).toMatchObject({
      id: "pet-rime-stag",
      speciesId: "rime_stag",
      nickname: "Winter Crown",
      element: "frost",
      stage: 3,
      chromatic: "dawn",
      branchChoice: "B",
      hp: 325,
      maxHp: 325,
      talents: ["tal_sturdy", "tal_may_blade"],
    });
  });

  it("uses the authenticated owner's stored selection instead of client-supplied presence", async () => {
    const result = await resolveLiveCombatCreature({
      verifiedUid: "owner-a",
      wizardId: "wizard-a",
      realmId: "breeze",
      guestSelection: {
        activeCreatureSpeciesId: "zephyr_owl",
        activeCreatureStage: 1,
        activeCreatureChromatic: "none",
      },
    }, async (uid, wizardId, realmId) => {
      expect([uid, wizardId, realmId]).toEqual(["owner-a", "wizard-a", "breeze"]);
      return stored;
    });
    expect(result.speciesId).toBe("rime_stag");
    expect(result.stage).toBe(3);
    expect(result.chromatic).toBe("dawn");
    expect(result.branchChoice).toBe("B");
  });

  it("uses a safe starter only when an authenticated selection is missing", async () => {
    const result = await resolveLiveCombatCreature({
      verifiedUid: "owner-a", wizardId: "wizard-a", realmId: "breeze", guestSelection: {},
    }, async () => null);
    expect(result).toEqual(buildFallbackCombatCreatureSlot());
  });

  it("sanitizes guest selection against the catalogue and known talent IDs", () => {
    const selection = sanitizeGuestCreatureSelection({
      activeCreatureId: "pet-guest",
      activeCreatureSpeciesId: "rime_stag",
      activeCreatureNickname: "  Winter Crown  ",
      activeCreatureStage: 3,
      activeCreatureChromatic: "dawn",
      activeCreatureBranchChoice: "B",
      activeCreatureTalents: ["tal_sturdy", "bad-id", "tal_may_blade", "tal_spellproof", "tal_may_heal"],
    });
    expect(selection).toEqual({
      activeCreatureId: "pet-guest",
      activeCreatureSpeciesId: "rime_stag",
      activeCreatureNickname: "Winter Crown",
      activeCreatureStage: 3,
      activeCreatureChromatic: "dawn",
      activeCreatureBranchChoice: "B",
      activeCreatureTalents: ["tal_sturdy", "tal_may_blade", "tal_spellproof"],
    });
    expect(buildGuestCombatCreatureSlot(selection).element).toBe("frost");
  });

  it("falls back safely for an unknown guest species and ignores forged element data", () => {
    const result = buildGuestCombatCreatureSlot({
      activeCreatureSpeciesId: "not-in-the-catalogue",
      activeCreatureStage: 9,
      activeCreatureChromatic: "ultraviolet",
    });
    expect(result.speciesId).toBe("cinder_kitsune");
    expect(result.element).toBe("ember");
    expect(result.stage).toBe(1);
    expect(result.chromatic).toBe("none");
  });

  it("requires the persisted creature document to belong to the verified wizard", () => {
    expect(isOwnedCreatureDocument({ ownerId: "u", wizardId: "w", realmId: "breeze" }, "u", "w", "breeze")).toBe(true);
    expect(isOwnedCreatureDocument({ ownerId: "other", wizardId: "w", realmId: "breeze" }, "u", "w", "breeze")).toBe(false);
    expect(isOwnedCreatureDocument({ ownerId: "u", wizardId: "other", realmId: "breeze" }, "u", "w", "breeze")).toBe(false);
  });
});
