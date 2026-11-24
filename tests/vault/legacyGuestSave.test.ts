import { describe, expect, it } from 'vitest';
import { createStarterWizard } from '../../shared/economy.ts';
import { readLegacyGuestSave } from '../../shared/legacyGuestSave.ts';
import type { RealmId } from '../../shared/realms.ts';

function fixture(realmId: RealmId = 'breeze') {
  const id = 'synthetic-wizard';
  const ownerId = 'guest_local';
  const wizard = createStarterWizard({
    id, ownerId, realmId, name: 'Synthetic Wizard', raceId: 'human', elementId: 'ember',
    sculpt: {
      height: 1, build: 'balanced', skinHex: '#d9a273', hairStyle: 'short', hairHex: '#332822',
      hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4', eyeRightHex: '#3b82c4',
      browStyle: 'arched', marking: 'none', primaryDye: '#2f4569', trimDye: '#d4a13e',
      accentDye: '#d9532f', castPose: 'duelist',
    },
  });
  wizard.currencies.florins = 493;
  wizard.progression.completedQuests = ['q_bond_arbor'];
  wizard.progression.questWins = { q_bond_arbor: 2 };
  wizard.progression.eggs = [{ id: 'egg', parentA: 'a', parentB: 'b', resultSpeciesId: 'unknown-preserved-species', winsNeeded: 2, winsDone: 1 }];
  return {
    account: { uid: ownerId, realmId, wizardIds: [id], unlockedRaces: ['human'], sharedVault: ['hat_pointed_brim'], termXp: 60, claimedTermTiers: [1] },
    wizards: [wizard],
    creatures: { [id]: [{ id: wizard.activeCreatureId, ownerId, wizardId: id, realmId, speciesId: 'cinder_kitsune', elementId: 'ember', nickname: 'Synthetic', stage: 1, chromatic: 'none', branchChoice: 'A', bondXp: 42, wins: 1, talents: [] }] },
    sanctuaries: { [id]: { ownerId, wizardId: id, realmId, themeId: 'synthetic', weatherId: 'synthetic', isPublic: false, items: [], gardens: [{ plotId: 'p', seedElement: null, plantedAt: 0, readyAt: 0 }] } },
    gallery: { [id]: [] },
    unknownExtension: { retained: ['one', 'two'] },
  };
}
describe('Legacy guest save envelope inspection (#187)', () => {
  it('distinguishes a missing save', () => {
    expect(readLegacyGuestSave(null, 'breeze')).toEqual({ kind: 'missing' });
  });
  it.each(['', '{', 'null', '[]', '1', '"text"', '{}'])('preserves invalid input %j for recovery', raw => {
    expect(readLegacyGuestSave(raw, 'breeze')).toMatchObject({ kind: 'recovery-required', raw, diagnostics: [{ code: 'invalid-shape' }] });
  });
  it.each(['breeze', 'horizon', 'everpeak'] as const)('preserves the entire %s fixture and repeated reads', realm => {
    const raw = JSON.stringify(fixture(realm), null, 2);
    const result = readLegacyGuestSave(raw, realm);
    expect(result).toEqual({ kind: 'recognized', raw, envelope: JSON.parse(raw) });
    expect(readLegacyGuestSave(raw, realm)).toEqual(result);
  });
  it('recognizes a genuinely empty existing realm without defaulting it', () => {
    const value = fixture();
    const raw = JSON.stringify({ ...value, account: { ...value.account, wizardIds: [] }, wizards: [], creatures: {}, sanctuaries: {}, gallery: {} });
    expect(readLegacyGuestSave(raw, 'breeze')).toEqual({ kind: 'recognized', raw, envelope: JSON.parse(raw) });
  });
  it('recognizes older saves without fusion entitlements, without generating new ones', () => {
    const value = fixture();
    delete (value.wizards[0].progression as Partial<typeof value.wizards[0]['progression']>).unlockedFusions;
    const raw = JSON.stringify(value);
    expect(readLegacyGuestSave(raw, 'breeze')).toEqual({ kind: 'recognized', raw, envelope: JSON.parse(raw) });
  });
  it.each(['version', 'schemaVersion', 'saveVersion'])('does not guess an embedded %s format', field => {
    const raw = JSON.stringify({ ...fixture(), [field]: 2 });
    expect(readLegacyGuestSave(raw, 'breeze')).toMatchObject({ kind: 'recovery-required', raw, diagnostics: [{ path: field, code: 'unsupported-version' }] });
  });
  it.each(['chronos', 'magma', 'tempest', 'glacier', 'eclipse', 'aetheris'])('retains retired affinity %s without remapping', id => {
    const value = fixture();
    const raw = JSON.stringify({ ...value, wizards: [{ ...value.wizards[0], elementId: id }] });
    expect(readLegacyGuestSave(raw, 'breeze')).toMatchObject({ kind: 'recovery-required', raw, diagnostics: [{ path: 'wizards[0].elementId', code: 'retired-element' }] });
  });
  it.each(['earth', 'unrecognized', 'constructor', '__proto__'])('does not interpret unknown v1 affinity %s', id => {
    const value = fixture();
    const raw = JSON.stringify({ ...value, wizards: [{ ...value.wizards[0], elementId: id }] });
    expect(readLegacyGuestSave(raw, 'breeze')).toMatchObject({ kind: 'recovery-required', raw, diagnostics: [{ code: 'unknown-element' }] });
  });
  it('retains old unlocked fusion and creature affinity in the original bytes', () => {
    const value = fixture();
    value.wizards[0].progression.unlockedFusions = ['magma'];
    value.creatures['synthetic-wizard'][0].elementId = 'magma';
    const raw = JSON.stringify(value);
    const result = readLegacyGuestSave(raw, 'breeze');
    expect(result).toMatchObject({ kind: 'recovery-required', raw });
    if (result.kind === 'recovery-required') expect(result.diagnostics.map(d => d.code)).toEqual(['retired-element', 'retired-element']);
  });
  it('rejects a wrong realm without losing the data', () => {
    const raw = JSON.stringify(fixture('horizon'));
    expect(readLegacyGuestSave(raw, 'breeze')).toMatchObject({ kind: 'recovery-required', raw });
  });
  it.each([
    ['duplicate wizard', (v: ReturnType<typeof fixture>) => v.wizards.push(v.wizards[0])],
    ['missing membership', (v: ReturnType<typeof fixture>) => { v.account.wizardIds = []; }],
    ['wrong account', (v: ReturnType<typeof fixture>) => { v.account.uid = 'other'; }],
    ['wrong wizard owner', (v: ReturnType<typeof fixture>) => { v.wizards[0].ownerId = 'other'; }],
    ['wrong creature owner', (v: ReturnType<typeof fixture>) => { v.creatures['synthetic-wizard'][0].ownerId = 'other'; }],
    ['wrong sanctuary owner', (v: ReturnType<typeof fixture>) => { v.sanctuaries['synthetic-wizard'].ownerId = 'other'; }],
    ['orphan gallery', (v: ReturnType<typeof fixture>) => { Object.assign(v.gallery, { orphan: [] }); }],
    ['orphan creature group', (v: ReturnType<typeof fixture>) => { Object.assign(v.creatures, { orphan: [] }); }],
    ['duplicate creature', (v: ReturnType<typeof fixture>) => { v.creatures['synthetic-wizard'].push(v.creatures['synthetic-wizard'][0]); }],
  ] as const)('requires recovery for %s', (_name, corrupt) => {
    const value = fixture();
    corrupt(value);
    const raw = JSON.stringify(value);
    const result = readLegacyGuestSave(raw, 'breeze');
    expect(result).toMatchObject({ kind: 'recovery-required', raw });
    if (result.kind === 'recovery-required') expect(result.diagnostics.some(d => d.code === 'identity-mismatch')).toBe(true);
  });
});
