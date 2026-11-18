import { FieldValue } from 'firebase-admin/firestore';
import { createStarterWizard, type WizardDocument } from '../shared/economy.ts';
import { ELEMENTS, type ElementId } from '../shared/elements.ts';
import type { RealmId } from '../shared/realms.ts';
import { BEAST_CLANS, HAIR_STYLES, RACES, type BeastClanId, type RaceId, type WizardSculpt } from '../shared/wardrobe.ts';
import { wizardStarter } from '../shared/wizardStarter.ts';
import type { RealmAccountState } from '../src/lib/storage.ts';
import { cloudDb } from './cloud.ts';
import { isDocumentId, RequestError } from './market.ts';
import { legacyRealmRef, newProgressionAccount, PROGRESSION_VERSION, trustedRealmRef } from './progressionState.ts';
import { readTermView } from './soloProgress.ts';

export function readSculpt(value: unknown): WizardSculpt {
  if (!value || typeof value !== 'object') throw new RequestError(400, 'Invalid wizard appearance');
  const {
    humanModel, height, build, skinHex, hairStyle, hairHex, hairTipHex,
    eyeShape, eyeLeftHex, eyeRightHex, browStyle, marking, primaryDye, trimDye,
    accentDye, castPose,
  } = value as WizardSculpt;
  const hexes = [skinHex, hairHex, hairTipHex, eyeLeftHex, eyeRightHex, primaryDye, trimDye, accentDye];
  if (typeof height !== 'number' || !(height >= 0.88 && height <= 1.12) ||
      !['slender', 'balanced', 'athletic'].includes(build) ||
      !hexes.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) ||
      !HAIR_STYLES.some((value) => value === hairStyle) ||
      !['bright', 'sharp', 'gentle'].includes(eyeShape) ||
      !['arched', 'bold', 'soft'].includes(browStyle) ||
      !['none', 'star_freckle', 'cheek_rune', 'brow_scar', 'crescent'].includes(marking) ||
      !['scholar', 'duelist', 'drifter'].includes(castPose) ||
      (humanModel != null && !['rowan', 'classic'].includes(humanModel))) {
    throw new RequestError(400, 'Invalid wizard appearance');
  }
  return {
    ...(humanModel ? { humanModel } : {}),
    height, build, skinHex, hairStyle, hairHex, hairTipHex, eyeShape, eyeLeftHex, eyeRightHex,
    browStyle, marking, primaryDye, trimDye, accentDye, castPose,
  };
}

export async function enrollWizard(uid: string, realm: RealmId, body: Record<string, unknown>) {
  const { id, raceId, elementId, beastClan } = body;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!isDocumentId(id) || id.length > 110 || name.length < 2 || name.length > 24 ||
      typeof raceId !== 'string' || !Object.hasOwn(RACES, raceId) ||
      typeof elementId !== 'string' || !Object.hasOwn(ELEMENTS, elementId) ||
      (raceId === 'beastfolk' && (typeof beastClan !== 'string' || !Object.hasOwn(BEAST_CLANS, beastClan)))) {
    throw new RequestError(400, 'Invalid wizard enrollment');
  }
  const race = RACES[raceId as RaceId];
  const element = ELEMENTS[elementId as ElementId];
  if (element.tier !== 'starter' && !race.affinityElements.includes(element.id)) {
    throw new RequestError(400, 'This element is unavailable at enrollment');
  }
  const sculpt = readSculpt(body.sculpt);
  const wizardRef = cloudDb.collection('wizards').doc(id);
  const accountRef = trustedRealmRef(uid, realm);
  const publicRef = cloudDb.collection('publicWizards').doc(id);
  const termRef = cloudDb.collection('worldRealms').doc(realm).collection('termProgress').doc(uid);
  return cloudDb.runTransaction(async (tx) => {
    const [account, existing, profile, term, legacy] = await Promise.all([
      tx.get(accountRef), tx.get(wizardRef), tx.get(publicRef), tx.get(termRef), tx.get(legacyRealmRef(uid, realm)),
    ]);
    const data = (account.data() as RealmAccountState | undefined) ?? newProgressionAccount(uid, realm);
    const wizardIds = data.wizardIds;
    const realmAccount = { ...data, ...readTermView(term.data(), legacy.get('claimedTermTiers')) };
    if (existing.get('serverProgressionVersion') === PROGRESSION_VERSION &&
        existing.get('ownerId') === uid && existing.get('realmId') === realm && wizardIds.includes(id)) {
      return { account: realmAccount, wizard: { ...existing.data(), id } as WizardDocument };
    }
    if (existing.exists || profile.exists || wizardIds.includes(id)) {
      throw new RequestError(409, 'That wizard slot could not be saved. Try enrolling again.');
    }
    if (wizardIds.length >= 3) throw new RequestError(409, 'All three wizard slots are in use.');
    if (!realmAccount.unlockedRaces.includes(race.id)) throw new RequestError(409, 'That lineage is still locked.');

    const wizard = createStarterWizard({
      id, ownerId: uid, realmId: realm, name, raceId: race.id, elementId: element.id, sculpt,
      ...(raceId === 'beastfolk' ? { beastClan: beastClan as BeastClanId } : {}),
    });
    wizard.serverProgressionVersion = PROGRESSION_VERSION;
    const { pet, dorm } = wizardStarter(wizard);
    const { id: _wizardId, beastClan: clan, ...saved } = wizard;
    const { id: petId, ...savedPet } = pet;
    const timestamps = { createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    tx.create(wizardRef, { ...saved, ...(clan ? { beastClan: clan } : {}), ...timestamps });
    tx.create(wizardRef.collection('creatures').doc(petId), { ...savedPet, serverProgressionVersion: PROGRESSION_VERSION, ...timestamps });
    tx.create(wizardRef.collection('sanctuary').doc('layout'), { ...dorm, ...timestamps });
    tx.create(publicRef, {
      ownerId: uid, realmId: realm, name, raceId: race.id, elementId: element.id,
      level: wizard.level, rank: wizard.rank, titleBadge: wizard.progression.titleBadge, ...timestamps,
    });
    const enrolled = [...wizardIds, id];
    tx.set(accountRef, { ...data, wizardIds: enrolled });
    return { wizard, account: { ...realmAccount, wizardIds: enrolled } };
  });
}
