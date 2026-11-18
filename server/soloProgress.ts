import { randomUUID } from 'node:crypto';
import { FieldValue, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { chooseAiAction, isDuelComplete, leadCreatureQualifiedForArborWin, resolveDuelRound, type DuelState } from '../shared/combat.ts';
import { ELEMENTS, ELEMENT_LIST, type ElementId } from '../shared/elements.ts';
import { SPELL_BY_ID } from '../shared/spells.ts';
import { applyTermReward, TERM_REWARD_TRACK, type WizardDocument } from '../shared/economy.ts';
import { applySagaEvent } from '../shared/quests.ts';
import type { RealmId } from '../shared/realms.ts';
import { createSoloDuel } from '../shared/soloDuel.ts';
import { soloVictoryRewards } from '../shared/soloRewards.ts';
import type { OwnedCreature, RealmAccountState } from '../src/lib/storage.ts';
import { cloudDb } from './cloud.ts';
import { isOwnedCreatureDocument } from './creatureSelection.ts';
import { duelView, readDuelAction } from './duelView.ts';
import { isDocumentId, ownedWizard, RequestError } from './market.ts';

type TermProgress = Pick<RealmAccountState, 'termXp' | 'claimedTermTiers'>;
interface StoredSoloDuel {
  uid: string;
  state: DuelState;
  revision: number;
  leadId: string;
  trialElement: ElementId | null;
  settled: boolean;
}

const trialElements = new Set<ElementId>(['umbra', 'sol', 'verdigris', 'chronos']);

function realmPath(realm: RealmId) {
  return cloudDb.collection('worldRealms').doc(realm);
}

function serverTermRef(uid: string, realm: RealmId) {
  return realmPath(realm).collection('termProgress').doc(uid);
}

function soloRef(wizardId: string, realm: RealmId) {
  return realmPath(realm).collection('soloDuels').doc(wizardId);
}

function accountRef(uid: string, realm: RealmId) {
  return cloudDb.collection('accounts').doc(uid).collection('realms').doc(realm);
}

function termProgress(value: DocumentData | undefined): TermProgress {
  return { termXp: value?.termXp ?? 0, claimedTermTiers: value?.claimedTermTiers ?? [] };
}

function view(room: StoredSoloDuel) {
  return { duel: duelView(room.state, room.state.playerTeam[0].id), revision: room.revision };
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureWizardId(id: unknown): asserts id is string {
  if (!isDocumentId(id)) throw new RequestError(400, 'Invalid wizard');
}

function matchingDuel(value: unknown, uid: string, duelId: unknown) {
  const room = value as StoredSoloDuel | undefined;
  if (!room || room.uid !== uid || room.state.duelId !== duelId) {
    throw new RequestError(409, 'Open the Duel Amphitheater to resume your duel.');
  }
  return room;
}

async function readPets(tx: Transaction, wizard: WizardDocument) {
  const snap = await tx.get(cloudDb.collection('wizards').doc(wizard.id).collection('creatures'));
  return snap.docs.flatMap((doc) => {
    const data = doc.data();
    return isOwnedCreatureDocument(data, wizard.ownerId, wizard.id, wizard.realmId)
      ? [{ ...data, id: doc.id } as OwnedCreature] : [];
  });
}

function writeWizardReward(tx: Transaction, wizard: WizardDocument, hasProjection: boolean) {
  const ref = cloudDb.collection('wizards').doc(wizard.id);
  const projection = cloudDb.collection('publicWizards').doc(wizard.id);
  const { level, xp, rank, currencies, wardrobe, progression } = wizard;
  tx.update(ref, { ...clean({ level, xp, rank, currencies, wardrobe, progression }), updatedAt: FieldValue.serverTimestamp() });
  tx.set(projection, {
    ownerId: wizard.ownerId, realmId: wizard.realmId, name: wizard.name, raceId: wizard.raceId,
    elementId: wizard.elementId, level, rank, titleBadge: progression.titleBadge,
    ...(hasProjection ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function readServerTerm(uid: string, realm: RealmId) {
  return termProgress((await serverTermRef(uid, realm).get()).data());
}

export async function startSolo(uid: string, realm: RealmId, wizardId: unknown, body: Record<string, unknown>) {
  ensureWizardId(wizardId);
  const mode = body.mode;
  if (mode !== 'solo' && mode !== 'trial' && mode !== 'spire') throw new RequestError(400, 'Invalid duel mode');
  const ref = soloRef(wizardId, realm);
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, prior] = await Promise.all([ownedWizard(uid, wizardId, realm, tx), tx.get(ref)]);
    const existing = prior.data() as StoredSoloDuel | undefined;
    if (existing?.uid === uid && !existing.settled) return view(existing);

    const floor = mode === 'spire' ? Math.min(10, wizard.progression.spireBestFloor + 1) : undefined;
    const supplied = body.element;
    if (typeof supplied !== 'string' || !Object.hasOwn(ELEMENTS, supplied)) throw new RequestError(400, 'Invalid element');
    const element = floor === undefined ? supplied as ElementId : ELEMENT_LIST[floor % 6].id;
    if (mode === 'trial' && (wizard.rank < 4 || !trialElements.has(element))) {
      throw new RequestError(409, 'This Rare Trial is unavailable.');
    }

    const pets = await readPets(tx, wizard);
    const room: StoredSoloDuel = {
      uid, leadId: wizard.activeCreatureId, trialElement: mode === 'trial' ? element : null,
      revision: 0, settled: false,
      state: createSoloDuel(wizard, pets, mode, element, wizard.elementId, randomUUID(), floor),
    };
    tx.set(ref, clean(room));
    return view(room);
  });
}

export async function advanceSolo(
  uid: string, realm: RealmId, wizardId: unknown, body: Record<string, unknown>, enchant: boolean,
) {
  ensureWizardId(wizardId);
  const ref = soloRef(wizardId, realm);
  return cloudDb.runTransaction(async (tx) => {
    const [, snapshot] = await Promise.all([ownedWizard(uid, wizardId, realm, tx), tx.get(ref)]);
    const room = matchingDuel(snapshot.data(), uid, body.duelId);
    if (room.settled || isDuelComplete(room.state.phase) || room.revision !== body.revision) return view(room);
    const actor = room.state.playerTeam[0];
    if (enchant) {
      const { source, target } = body;
      if (typeof source !== 'number' || typeof target !== 'number' || !Number.isInteger(source) ||
          !Number.isInteger(target) || source < 0 || target < 0 || source === target ||
          SPELL_BY_ID[actor.hand[source]]?.kind !== 'enchant' ||
          !['attack', 'drain', 'aoe'].includes(SPELL_BY_ID[actor.hand[target]]?.kind ?? '')) {
        throw new RequestError(400, 'Invalid enchant selection.');
      }
      actor.hand[target] += '+keen';
      actor.hand.splice(source, 1);
    } else {
      const action = readDuelAction(body.action, actor, room.state.enemyTeam);
      if (!action) throw new RequestError(400, 'Invalid duel action.');
      const enemyActions = room.state.enemyTeam.filter((foe) => foe.hp > 0)
        .map((foe) => chooseAiAction(foe, room.state.playerTeam));
      room.state = resolveDuelRound(room.state, [action, ...enemyActions]);
    }
    room.revision++;
    tx.set(ref, clean(room));
    return view(room);
  });
}

export async function finishSolo(uid: string, realm: RealmId, wizardId: unknown, duelId: unknown) {
  ensureWizardId(wizardId);
  if (!isDocumentId(duelId)) throw new RequestError(400, 'Invalid duel');
  const ref = soloRef(wizardId, realm);
  const receipt = ref.collection('settlements').doc(duelId);
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, saved, ledger, previous, account, projection] = await Promise.all([
      ownedWizard(uid, wizardId, realm, tx),
      tx.get(ref), tx.get(serverTermRef(uid, realm)), tx.get(receipt), tx.get(accountRef(uid, realm)),
      tx.get(cloudDb.collection('publicWizards').doc(wizardId)),
    ]);
    if (!account.exists) throw new RequestError(409, 'Reopen this realm before claiming rewards.');
    const accountState = { ...account.data(), ...termProgress(ledger.data()) } as RealmAccountState;
    const pets = await readPets(tx, wizard);
    if (previous.exists) {
      return { wizard, account: accountState, creatures: pets, notice: previous.get('notice') as string };
    }
    const room = matchingDuel(saved.data(), uid, duelId);
    const { state } = room;
    let result = { wizard, account: accountState, creatures: pets, notice: 'You left the duel.' };

    if (state.phase === 'victory' && (state.mode === 'solo' || state.mode === 'trial' || state.mode === 'spire')) {
      const reward = soloVictoryRewards(wizard, pets, accountState, {
        mode: state.mode, trialElement: room.trialElement ?? undefined, spireFloor: state.spireFloor,
        leadCreatureWinEligible: room.leadId === wizard.activeCreatureId &&
          leadCreatureQualifiedForArborWin(state.playerTeam[0], room.leadId),
      }, () => randomUUID());
      writeWizardReward(tx, reward.wizard, projection.exists);
      const petsRef = cloudDb.collection('wizards').doc(wizardId).collection('creatures');
      for (const { id, ...pet } of reward.hatchedPets) {
        tx.create(petsRef.doc(id), { ...pet, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
      if (reward.updatedLead) {
        tx.update(petsRef.doc(reward.updatedLead.id), { wins: reward.updatedLead.wins, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.update(accountRef(uid, realm), { unlockedRaces: reward.account.unlockedRaces, updatedAt: FieldValue.serverTimestamp() });
      tx.set(serverTermRef(uid, realm), { termXp: reward.account.termXp, claimedTermTiers: reward.account.claimedTermTiers });
      result = reward;
    } else if (state.phase === 'defeat' && state.mode === 'trial') {
      result.wizard = applySagaEvent(wizard, 'rare-trial-attempt');
      if (result.wizard !== wizard) writeWizardReward(tx, result.wizard, projection.exists);
      result.notice = 'Duel lost. You can try again.';
    } else if (state.phase === 'defeat' || state.phase === 'draw') {
      result.notice = state.phase === 'draw' ? 'The duel ended in a draw.' : 'Duel lost. You can try again.';
    }

    tx.update(ref, { settled: true });
    tx.create(receipt, { notice: result.notice, settledAt: FieldValue.serverTimestamp() });
    return { wizard: result.wizard, account: result.account, creatures: result.creatures, notice: result.notice };
  });
}

export async function claimServerTerm(uid: string, realm: RealmId, wizardId: unknown, tierId: unknown) {
  ensureWizardId(wizardId);
  const tier = TERM_REWARD_TRACK.find((entry) => entry.tier === tierId);
  if (!tier) throw new RequestError(400, 'This Term reward is unavailable.');
  const ref = serverTermRef(uid, realm);
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, account, term, projection] = await Promise.all([
      ownedWizard(uid, wizardId, realm, tx), tx.get(accountRef(uid, realm)), tx.get(ref),
      tx.get(cloudDb.collection('publicWizards').doc(wizardId)),
    ]);
    if (!account.exists) throw new RequestError(409, 'Reopen this realm before claiming a reward.');
    const progress = termProgress(term.data());
    const realmState = { ...account.data(), ...progress } as RealmAccountState;
    if (progress.claimedTermTiers.includes(tier.tier)) return { account: realmState, wizard, claimed: false };
    if (progress.termXp < tier.xpRequired) throw new RequestError(409, 'You have not earned this reward yet.');
    const updated = applyTermReward(wizard, tier);
    const claimedTermTiers = [...progress.claimedTermTiers, tier.tier];
    writeWizardReward(tx, updated, projection.exists);
    tx.set(ref, { termXp: progress.termXp, claimedTermTiers });
    return { account: { ...realmState, claimedTermTiers }, wizard: updated, claimed: true };
  });
}
