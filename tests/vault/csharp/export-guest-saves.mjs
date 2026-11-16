import { mkdirSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { SPECIES_BY_ID } from '../../../shared/creatures.ts';
import { createStarterWizard } from '../../../shared/economy.ts';
import { applySagaEvent } from '../../../shared/quests.ts';

const [directory] = process.argv.slice(2);
if (!directory) throw new Error('Expected a directory for the generated guest saves');

const storageUrl = new URL('../../../src/lib/storage.ts', import.meta.url).href;
const blocked = '() => { throw new Error("cloud access is unavailable in the guest save fixture"); }';
const cloudStubs = new Map([
  ['firebase/firestore', [
    'collection', 'doc', 'deleteField', 'getDoc', 'getDocFromServer', 'getDocs',
    'query', 'serverTimestamp', 'setDoc', 'updateDoc', 'where', 'runTransaction', 'writeBatch',
  ].map((name) => `export const ${name} = ${blocked};`).join('\n')],
  ['./firebase.ts', `export const auth = null, db = null, OperationType = {};
    export const handleFirestoreError = ${blocked};`],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === storageUrl && cloudStubs.has(specifier)) {
      const url = `data:text/javascript,${encodeURIComponent(cloudStubs.get(specifier))}`;
      return { url, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { loadGuestRealm, saveGuestRealm } = await import(storageUrl).finally(() => hooks.deregister());

const stored = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  },
});

const sculpt = {
  height: 1, build: 'balanced', skinHex: '#d9a273', hairStyle: 'short', hairHex: '#332822',
  hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4', eyeRightHex: '#3b82c4',
  browStyle: 'arched', marking: 'none', primaryDye: '#2f4569', trimDye: '#d4a13e',
  accentDye: '#d9532f', castPose: 'duelist',
};
function wizard(realmId, id, name, raceId, elementId) {
  return createStarterWizard({ realmId, id, name, raceId, elementId, sculpt, ownerId: 'guest_local' });
}
function creature(owner, id, speciesId, stage, talents) {
  const species = SPECIES_BY_ID[speciesId];
  return {
    id, speciesId, stage, talents, nickname: species.stageNames[stage - 1],
    elementId: species.element, ownerId: owner.ownerId, wizardId: owner.id, realmId: owner.realmId,
    chromatic: stage === 1 ? 'none' : 'dusk', branchChoice: stage === 1 ? 'A' : 'B',
    bondXp: stage === 1 ? 0 : 240, wins: stage === 1 ? 0 : 4,
  };
}
function bundle(realmId, wizards, creatures) {
  const empty = loadGuestRealm(realmId);
  return { ...empty, account: { ...empty.account, wizardIds: wizards.map(({ id }) => id) }, wizards, creatures };
}
function exportSave(realmId, fixture, name) {
  // Isolate each write so a wrong or missing key cannot inherit bytes from an earlier fixture.
  stored.clear();
  const key = `aldervale_guest_${realmId}_v1`;
  if (!saveGuestRealm(realmId, fixture) || stored.size !== 1 || typeof stored.get(key) !== 'string') {
    throw new Error(`${name}: guest writer did not emit exactly one payload at ${key}`);
  }
  writeFileSync(join(directory, `${name}.json`), stored.get(key), 'utf8');
}

mkdirSync(directory, { recursive: true });
const rowan = wizard('breeze', 'rowan-breeze', 'Rowan 雪 🦉', 'human', 'ember');
rowan.xp = 110;
rowan.currencies.florins = 3_000_000_000;
const progressed = applySagaEvent(applySagaEvent(rowan, 'lead-creature-win'), 'solo-win');
const reserve = creature(progressed, progressed.activeCreatureId, 'cinder_kitsune', 1, ['tal_sturdy']);
const lead = creature(progressed, 'rowan-active', 'zephyr_owl', 3, ['tal_sturdy', 'tal_spellproof']);
progressed.activeCreatureId = lead.id;
const second = wizard('breeze', 'wren-breeze', 'Wren', 'human', 'frost');
const breeze = bundle('breeze', [progressed, second], {
  [progressed.id]: [reserve, lead],
  [second.id]: [creature(second, second.activeCreatureId, 'rime_stag', 1, ['tal_sturdy'])],
});
breeze.account.termXp = 71;
breeze.gallery = { [progressed.id]: ['fixture:owl'] };
exportSave('breeze', breeze, 'breeze-v1');

const horizonWizard = wizard('horizon', 'vale-horizon', 'Vale', 'human', 'ember');
const horizon = bundle('horizon', [horizonWizard], {
  [horizonWizard.id]: [creature(horizonWizard, horizonWizard.activeCreatureId, 'cinder_kitsune', 2, ['tal_spellproof'])],
});
horizon.account.termXp = 41;
exportSave('horizon', horizon, 'horizon-v1');

const legacy = structuredClone(breeze);
delete legacy.gallery;
delete legacy.wizards[0].progression.questWins;
exportSave('breeze', legacy, 'legacy-shaped-breeze-v1');

console.log('Exported three raw guest v1 saves using AlderVale saveGuestRealm');
