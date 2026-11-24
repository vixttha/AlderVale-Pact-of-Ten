import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import type { WizardDocument } from '../shared/economy.ts';
import type { RealmId } from '../shared/realms.ts';
import type { OwnedCreature, RealmAccountState } from '../src/lib/storage.ts';
import { cloudDb } from './cloud.ts';
import { isOwnedCreatureDocument } from './creatureSelection.ts';
import { ownedWizard, RequestError } from './market.ts';

import { PROGRESSION_VERSION } from '../shared/gameplayActions.ts';
export { PROGRESSION_VERSION };

export function progressionRealm(realm: RealmId) {
  return cloudDb.collection('worldRealms').doc(realm);
}

export function trustedRealmRef(uid: string, realm: RealmId) {
  return progressionRealm(realm).collection('progressionAccounts').doc(uid);
}

export function legacyRealmRef(uid: string, realm: RealmId) {
  return cloudDb.collection('accounts').doc(uid).collection('realms').doc(realm);
}

export function newProgressionAccount(uid: string, realmId: RealmId): RealmAccountState {
  return {
    uid, realmId, wizardIds: [], sharedVault: [], termXp: 0, claimedTermTiers: [],
    unlockedRaces: ['human', 'stoneborn', 'dryad', 'beastfolk', 'tide_siren', 'river_naiad', 'sky_avian'],
  };
}

export async function ownedProgressionWizard(uid: string, id: unknown, realm: RealmId, tx?: Transaction) {
  const wizard = await ownedWizard(uid, id, realm, tx);
  if (wizard.serverProgressionVersion !== PROGRESSION_VERSION) {
    throw new RequestError(409, 'Enroll a signed-in wizard to use online progression. Your earlier save is preserved.');
  }
  return wizard;
}

export async function readProgressionCreatures(tx: Transaction, wizard: WizardDocument) {
  const snapshot = await tx.get(cloudDb.collection('wizards').doc(wizard.id).collection('creatures'));
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    return data.serverProgressionVersion === PROGRESSION_VERSION &&
      isOwnedCreatureDocument(data, wizard.ownerId, wizard.id, wizard.realmId)
      ? [{ ...data, id: doc.id } as OwnedCreature] : [];
  });
}

export function writeProgressionWizard(tx: Transaction, wizard: WizardDocument) {
  const { id, ownerId, realmId, name, raceId, elementId, level, rank, sculpt, activeCreatureId,
    currencies, wardrobe, resources, stitching, progression } = wizard;
  const updatedAt = FieldValue.serverTimestamp();
  tx.update(cloudDb.collection('wizards').doc(id), {
    raceId, level, xp: wizard.xp, rank, sculpt, activeCreatureId, currencies, wardrobe, resources, stitching, progression,
    ...(raceId === 'beastfolk' ? {} : { beastClan: FieldValue.delete() }),
    updatedAt,
  });
  tx.update(cloudDb.collection('publicWizards').doc(id), {
    ownerId, realmId, name, raceId, elementId, level, rank, titleBadge: progression.titleBadge, updatedAt,
  });
}
