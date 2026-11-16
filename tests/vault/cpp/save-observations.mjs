import { registerHooks } from 'node:module';
import { createStarterWizard } from '../../../shared/economy.ts';
import { applySagaEvent } from '../../../shared/quests.ts';

const storageModule = new URL('../../../src/lib/storage.ts', import.meta.url).href;
const forbidCloud = '() => { throw new Error("unexpected cloud call in guest save fixture"); }';
const cloudModules = new Map([
  ['firebase/firestore', [
    'collection', 'doc', 'deleteField', 'getDoc', 'getDocFromServer', 'getDocs',
    'query', 'serverTimestamp', 'setDoc', 'updateDoc', 'where', 'runTransaction', 'writeBatch',
  ].map((name) => `export const ${name} = ${forbidCloud};`).join('\n')],
  ['./firebase.ts', `export const auth = null, db = null, OperationType = {};
    export const handleFirestoreError = ${forbidCloud};`],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === storageModule && cloudModules.has(specifier)) {
      return { url: `data:text/javascript,${encodeURIComponent(cloudModules.get(specifier))}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const storage = await import(storageModule).finally(() => hooks.deregister());

function fixtureWizard(realmId, name) {
  return createStarterWizard({
    id: `wizard-${realmId}`, ownerId: 'guest_local', realmId, name, raceId: 'human', elementId: 'ember',
    sculpt: {
      height: 1, build: 'balanced', skinHex: '#d9a273', hairStyle: 'short', hairHex: '#332822',
      hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4', eyeRightHex: '#3b82c4',
      browStyle: 'arched', marking: 'none', primaryDye: '#2f4569', trimDye: '#d4a13e',
      accentDye: '#d9532f', castPose: 'duelist',
    },
  });
}

export function observeSave() {
  const { loadGuestRealm, saveGuestRealm } = storage;
  const bytes = new Map();
  const reads = [];
  let failWrites = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        reads.push(key);
        return bytes.get(key) ?? null;
      },
      setItem(key, value) {
        if (failWrites) throw new Error('synthetic storage quota failure');
        bytes.set(key, value);
      },
    },
  });

  const breezeKey = 'aldervale_guest_breeze_v1';
  const horizonKey = 'aldervale_guest_horizon_v1';
  try {
    const horizon = loadGuestRealm('horizon');
    const otherWizard = fixtureWizard('horizon', 'Horizon fixture');
    horizon.account.wizardIds = [otherWizard.id];
    horizon.account.termXp = 51;
    horizon.wizards = [otherWizard];
    const wroteHorizon = saveGuestRealm('horizon', horizon);
    const otherRealmBytes = bytes.get(horizonKey);

    bytes.set(breezeKey, '{"account":');
    const recovered = loadGuestRealm('breeze');
    const recoveredCounts = [recovered.account.wizardIds.length, recovered.wizards.length, recovered.account.termXp];

    const wizard = applySagaEvent(fixtureWizard('breeze', 'Rowan 雪 "🦉"'), 'solo-win');
    const bundle = { ...recovered, account: { ...recovered.account, wizardIds: [wizard.id] },
      wizards: [wizard], gallery: { [wizard.id]: ['fixture:portrait'] } };
    const wroteBreeze = saveGuestRealm('breeze', bundle);
    const lastGood = bytes.get(breezeKey);
    const first = loadGuestRealm('breeze');
    const replay = applySagaEvent(first.wizards[0], 'solo-win');

    failWrites = true;
    const rejected = saveGuestRealm('breeze', { ...bundle, account: { ...bundle.account, termXp: 100 } });
    failWrites = false;
    const retainedBytes = bytes.get(breezeKey) === lastGood;
    const retainedXp = loadGuestRealm('breeze').account.termXp;
    const retried = saveGuestRealm('breeze', { ...bundle, account: { ...bundle.account, termXp: 100 } });
    const reloaded = loadGuestRealm('breeze');
    const horizonReloaded = loadGuestRealm('horizon');
    return {
      'corrupt-v1-json': { realm: recovered.account.realmId, counts: recoveredCounts },
      'v1-round-trip': {
        wrote: wroteBreeze, realm: reloaded.account.realmId, wizardIds: reloaded.account.wizardIds,
        wizardRealm: reloaded.wizards[0].realmId, name: reloaded.wizards[0].name,
        gallery: reloaded.gallery, fullRoundTrip: JSON.stringify(reloaded.wizards[0]) === JSON.stringify(wizard),
        termXp: reloaded.account.termXp, keys: [...new Set(reads)].sort(),
      },
      'reward-after-reload': { completed: replay.progression.completedQuests, xp: replay.xp,
        florins: replay.currencies.florins, shards: replay.currencies.spellShards },
      'failed-write-and-retry': { rejected, retainedBytes, retainedXp, retried },
      'independent-v1-realm': { wrote: wroteHorizon, xp: horizonReloaded.account.termXp,
        name: horizonReloaded.wizards[0].name, missingOptionalGallery: !Object.hasOwn(horizonReloaded, 'gallery'),
        bytesUnchanged: bytes.get(horizonKey) === otherRealmBytes },
    };
  } finally {
    delete globalThis.localStorage;
  }
}
