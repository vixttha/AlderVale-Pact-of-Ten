import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import { createStarterWizard } from '../../../shared/economy.ts';
import { applySagaEvent } from '../../../shared/quests.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Expected input and output paths for the quest sequences');

const storageUrl = new URL('../../../src/lib/storage.ts', import.meta.url).href;
const blockCloud = '() => { throw new Error("cloud access is unavailable in the quest fixture"); }';
const cloudStubs = new Map([
  ['firebase/firestore', [
    'collection', 'doc', 'deleteField', 'getDoc', 'getDocFromServer', 'getDocs',
    'query', 'serverTimestamp', 'setDoc', 'updateDoc', 'where', 'runTransaction', 'writeBatch',
  ].map((name) => `export const ${name} = ${blockCloud};`).join('\n')],
  ['./firebase.ts', `export const auth = null, db = null, OperationType = {};
    export const handleFirestoreError = ${blockCloud};`],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = context.parentURL === storageUrl && cloudStubs.get(specifier);
    return stub
      ? { url: `data:text/javascript,${encodeURIComponent(stub)}`, shortCircuit: true }
      : nextResolve(specifier, context);
  },
});
const { loadGuestRealm, saveGuestRealm } = await import(storageUrl).finally(() => hooks.deregister());

const bytes = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => bytes.get(key) ?? null,
    setItem: (key, value) => bytes.set(key, value),
  },
});

const sculpt = {
  height: 1, build: 'balanced', skinHex: '#d9a273', hairStyle: 'short', hairHex: '#332822',
  hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4', eyeRightHex: '#b9634e',
  browStyle: 'arched', marking: 'none', primaryDye: '#2f4569', trimDye: '#d4a13e',
  accentDye: '#d9532f', castPose: 'duelist',
};
const start = (realmId, id) => createStarterWizard({
  id, realmId, ownerId: 'guest_local', name: id, raceId: 'human', elementId: 'ember', sculpt,
});
const horizon = start('horizon', 'untouched-horizon');
const horizonKey = 'aldervale_guest_horizon_v1';
const breezeKey = 'aldervale_guest_breeze_v1';

function summarize(wizard) {
  return {
    level: wizard.level, xp: wizard.xp, rank: wizard.rank,
    florins: wizard.currencies.florins, spellShards: wizard.currencies.spellShards,
    honorMarks: wizard.currencies.honorMarks, bondingSeals: wizard.currencies.bondingSeals,
    completedQuests: wizard.progression.completedQuests,
    wins: wizard.progression.questWins ?? {},
  };
}

function replay({ label, startLevel, startXp, startRank, events, reloadAt }) {
  bytes.clear();
  const horizonBundle = loadGuestRealm('horizon');
  assert.equal(saveGuestRealm('horizon', {
    ...horizonBundle, account: { ...horizonBundle.account, wizardIds: [horizon.id] }, wizards: [horizon],
  }), true);
  const horizonBytes = bytes.get(horizonKey);
  assert.equal(typeof horizonBytes, 'string');
  const breezeBundle = loadGuestRealm('breeze');
  let wizard = { ...start('breeze', 'quest-fixture'), level: startLevel, xp: startXp, rank: startRank };
  const checkpoints = [];
  for (let step = 0; step <= events.length; step++) {
    if (step > 0) wizard = applySagaEvent(wizard, events[step - 1]);
    checkpoints.push(summarize(wizard));
    if (reloadAt.includes(step)) {
      assert.equal(saveGuestRealm('breeze', {
        ...breezeBundle, account: { ...breezeBundle.account, wizardIds: [wizard.id] }, wizards: [wizard],
      }), true);
      assert.equal(typeof bytes.get(breezeKey), 'string');
      const restored = loadGuestRealm('breeze');
      assert.deepEqual(restored.account.wizardIds, [wizard.id]);
      assert.equal(restored.wizards.length, 1);
      assert.equal(restored.wizards[0].id, wizard.id);
      wizard = restored.wizards[0];
      checkpoints.push(summarize(wizard));
    }
    assert.equal(bytes.get(horizonKey), horizonBytes, 'Breeze wrote over the Horizon save');
  }
  return { label, checkpoints };
}

const scenarios = JSON.parse(readFileSync(input, 'utf8'));
const result = scenarios.map(scenario => {
  try {
    return replay(scenario);
  } catch (error) {
    throw new Error(`Game observation failed for ${scenario.label}`, { cause: error });
  }
});
writeFileSync(output, JSON.stringify(result));
