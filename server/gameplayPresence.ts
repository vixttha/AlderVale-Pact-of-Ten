import type { RealmId } from '../shared/realms.ts';

interface ProgressionPresence {
  uid: string;
  wizardId: string;
  realmId: RealmId;
  zone: string;
  x: number;
  z: number;
  updatedAt: number;
}

const sessions = new Map<string, ProgressionPresence>();

export function setGameplayPresence(session: string, presence: Omit<ProgressionPresence, 'updatedAt'>) {
  if (![presence.x, presence.z].every(Number.isFinite)) return;
  sessions.set(session, { ...presence, updatedAt: Date.now() });
}

export function clearGameplayPresence(session: string) {
  sessions.delete(session);
}

export function gameplayPresence(uid: string, wizardId: string, realm: RealmId) {
  for (const value of sessions.values()) {
    if (value.uid === uid && value.wizardId === wizardId && value.realmId === realm &&
        Date.now() - value.updatedAt < 90_000) return value;
  }
}
