import type { DuelState, TurnActionInput } from '../../shared/combat.ts';
import type { WizardDocument } from '../../shared/economy.ts';
import type { ElementId } from '../../shared/elements.ts';
import type { GameplayAction, GameplayFeedback } from '../../shared/gameplayActions.ts';
import type { RealmId } from '../../shared/realms.ts';
import type { SoloDuelMode } from '../../shared/soloDuel.ts';
import { auth } from './firebase.ts';
import type { OwnedCreature, RealmAccountState, SanctuaryState } from './storage.ts';

export interface CloudSoloState {
  duel: DuelState;
  revision: number;
}

export interface CloudSoloSettlement {
  wizard: WizardDocument;
  account: RealmAccountState;
  creatures: OwnedCreature[];
  notice: string;
}

async function request<T>(uid: string, realm: RealmId, path: string, body?: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error('Your sign-in changed. Sign in again and retry.');
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== uid) throw new Error('Your sign-in changed. Sign in again and retry.');
  const response = await fetch(`/api/progression/${realm}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
  if (auth.currentUser?.uid !== uid) throw new Error('Your sign-in changed. Sign in again and retry.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Could not save your progress. Please retry.');
  return result as T;
}

export function loadProgressionRealm(uid: string, realm: RealmId) {
  return request<RealmAccountState>(uid, realm, 'realm');
}

export function submitGameplayAction(wizard: WizardDocument, action: GameplayAction) {
  const body = { wizardId: wizard.id, actionId: crypto.randomUUID(), action };
  type Result = { wizard: WizardDocument; account: RealmAccountState; creatures: OwnedCreature[];
    sanctuary: SanctuaryState; feedback: GameplayFeedback };
  const send = () => request<Result>(wizard.ownerId, wizard.realmId, 'action', body);
  return send().catch((error: unknown) => {
    if (error instanceof TypeError) return send();
    throw error;
  });
}

export function claimCloudTerm(wizard: WizardDocument, tier: number) {
  return request<{ account: RealmAccountState; wizard: WizardDocument; claimed: boolean }>(
    wizard.ownerId, wizard.realmId, 'term', { wizardId: wizard.id, tier },
  );
}

export function enrollCloudWizard(uid: string, wizard: WizardDocument) {
  const { id, name, raceId, beastClan, elementId, sculpt } = wizard;
  return request<{ account: RealmAccountState; wizard: WizardDocument }>(
    uid, wizard.realmId, 'enroll', { id, name, raceId, beastClan, elementId, sculpt },
  );
}

export function cloudSolo(wizard: WizardDocument, awaitSaves: () => Promise<unknown>) {
  const send = async <T>(action: string, body: Record<string, unknown>) => {
    await awaitSaves();
    return request<T>(wizard.ownerId, wizard.realmId, `solo/${action}`, { ...body, wizardId: wizard.id });
  };
  return {
    start: (mode: SoloDuelMode, element: ElementId) =>
      send<CloudSoloState>('start', { mode, element }),
    round: (duelId: string, revision: number, action: TurnActionInput) =>
      send<CloudSoloState>('round', { duelId, revision, action }),
    enchant: (duelId: string, revision: number, source: number, target: number) =>
      send<CloudSoloState>('enchant', { duelId, revision, source, target }),
    finish: (duelId: string) => send<CloudSoloSettlement>('finish', { duelId }),
  };
}
