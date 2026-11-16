import { CREATURE_TALENTS, SPECIES_BY_ID, type ChromaticVariant } from "../shared/creatures.ts";
import type { CombatCreatureSlot } from "../shared/combat.ts";
import type { RealmId } from "../shared/realms.ts";

export interface StoredCreatureSelection {
  id: string;
  speciesId: unknown;
  nickname: unknown;
  stage: unknown;
  chromatic: unknown;
  branchChoice: unknown;
  talents: unknown;
}

export interface GuestCreatureSelection {
  activeCreatureId?: unknown;
  activeCreatureSpeciesId?: unknown;
  activeCreatureNickname?: unknown;
  activeCreatureStage?: unknown;
  activeCreatureChromatic?: unknown;
  activeCreatureBranchChoice?: unknown;
  activeCreatureTalents?: unknown;
}

export interface SanitizedGuestCreatureSelection {
  activeCreatureId: string;
  activeCreatureSpeciesId: string;
  activeCreatureNickname: string;
  activeCreatureStage: 1 | 2 | 3;
  activeCreatureChromatic: ChromaticVariant;
  activeCreatureBranchChoice: "A" | "B";
  activeCreatureTalents: string[];
}

export interface LiveCreatureContext {
  verifiedUid: string | null;
  wizardId: string;
  realmId: RealmId;
  guestSelection: GuestCreatureSelection;
}

export type ActiveCreatureLoader = (
  uid: string,
  wizardId: string,
  realmId: RealmId,
) => Promise<StoredCreatureSelection | null>;

const validTalentIds = new Set(CREATURE_TALENTS.map((talent) => talent.id));
const validDocumentId = /^[a-zA-Z0-9_-]{1,128}$/;

export function isOwnedCreatureDocument(
  data: Record<string, unknown>,
  uid: string,
  wizardId: string,
  realmId: RealmId,
): boolean {
  return data.ownerId === uid && data.wizardId === wizardId && data.realmId === realmId;
}

export function sanitizeGuestCreatureSelection(
  input: GuestCreatureSelection,
): SanitizedGuestCreatureSelection {
  const speciesId = typeof input.activeCreatureSpeciesId === "string" &&
      Object.hasOwn(SPECIES_BY_ID, input.activeCreatureSpeciesId)
    ? input.activeCreatureSpeciesId
    : "cinder_kitsune";
  const species = SPECIES_BY_ID[speciesId];
  const stage = input.activeCreatureStage === 2 || input.activeCreatureStage === 3
    ? input.activeCreatureStage
    : 1;
  const chromatic: ChromaticVariant = input.activeCreatureChromatic === "dawn" || input.activeCreatureChromatic === "dusk"
    ? input.activeCreatureChromatic
    : "none";
  const branchChoice = input.activeCreatureBranchChoice === "B" ? "B" : "A";
  const talents = Array.isArray(input.activeCreatureTalents)
    ? [...new Set(input.activeCreatureTalents.filter((value): value is string =>
        typeof value === "string" && validTalentIds.has(value)))].slice(0, 3)
    : [];
  const nickname = typeof input.activeCreatureNickname === "string"
    ? input.activeCreatureNickname.trim().slice(0, 24)
    : "";
  const activeCreatureId = typeof input.activeCreatureId === "string" && validDocumentId.test(input.activeCreatureId)
    ? input.activeCreatureId
    : "guest-active-creature";

  return {
    activeCreatureId,
    activeCreatureSpeciesId: speciesId,
    activeCreatureNickname: nickname || species.stageNames[stage - 1],
    activeCreatureStage: stage,
    activeCreatureChromatic: chromatic,
    activeCreatureBranchChoice: branchChoice,
    activeCreatureTalents: talents,
  };
}

export function toCombatCreatureSlot(selection: StoredCreatureSelection): CombatCreatureSlot {
  const speciesId = typeof selection.speciesId === "string" && Object.hasOwn(SPECIES_BY_ID, selection.speciesId)
    ? selection.speciesId
    : "cinder_kitsune";
  const species = SPECIES_BY_ID[speciesId];
  const stage = selection.stage === 2 || selection.stage === 3 ? selection.stage : 1;
  const chromatic: ChromaticVariant = selection.chromatic === "dawn" || selection.chromatic === "dusk"
    ? selection.chromatic
    : "none";
  const branchChoice = selection.branchChoice === "B" ? "B" : "A";
  const talents = Array.isArray(selection.talents)
    ? [...new Set(selection.talents.filter((value): value is string =>
        typeof value === "string" && validTalentIds.has(value)))].slice(0, 3)
    : [];
  const nickname = typeof selection.nickname === "string"
    ? selection.nickname.trim().slice(0, 24)
    : "";
  const hp = 190 + stage * 45;

  return {
    id: validDocumentId.test(selection.id) ? selection.id : "active-creature",
    speciesId,
    nickname: nickname || species.stageNames[stage - 1],
    element: species.element,
    stage,
    chromatic,
    branchChoice,
    hp,
    maxHp: hp,
    talents,
  };
}

export function buildGuestCombatCreatureSlot(input: GuestCreatureSelection): CombatCreatureSlot {
  const selection = sanitizeGuestCreatureSelection(input);
  return toCombatCreatureSlot({
    id: selection.activeCreatureId,
    speciesId: selection.activeCreatureSpeciesId,
    nickname: selection.activeCreatureNickname,
    stage: selection.activeCreatureStage,
    chromatic: selection.activeCreatureChromatic,
    branchChoice: selection.activeCreatureBranchChoice,
    talents: selection.activeCreatureTalents,
  });
}

export function buildFallbackCombatCreatureSlot(): CombatCreatureSlot {
  return toCombatCreatureSlot({
    id: "fallback-starter",
    speciesId: "cinder_kitsune",
    nickname: "Academy Partner",
    stage: 1,
    chromatic: "none",
    branchChoice: "A",
    talents: [],
  });
}

export async function resolveLiveCombatCreature(
  context: LiveCreatureContext,
  loadOwned: ActiveCreatureLoader,
): Promise<CombatCreatureSlot> {
  if (!context.verifiedUid) return buildGuestCombatCreatureSlot(context.guestSelection);
  const stored = await loadOwned(context.verifiedUid, context.wizardId, context.realmId);
  return stored ? toCombatCreatureSlot(stored) : buildFallbackCombatCreatureSlot();
}
