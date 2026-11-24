import { describe, expect, it } from 'vitest';
import { validateNestedGuestSave } from '../../shared/nestedGuestSaveV1.ts';
import type { RealmId } from '../../shared/realms.ts';

// Frozen synthetic v1 fixture; deliberately no import of the mutable gameplay catalogs.
function fixture(realm: RealmId = 'breeze') {
  const id = 'fixture-wizard';
  const owner = { ownerId: 'guest_local', realmId: realm };
  const pet = { ...owner, wizardId: id, id: 'fixture-pet', speciesId: 'cinder_kitsune', elementId: 'ember', nickname: 'Ember Kit', stage: 1, chromatic: 'none', branchChoice: 'A', bondXp: 42, wins: 1, talents: ['tal_sturdy'] };
  const equipped = { headgear: 'hat_academy_cap', torso: 'torso_bomber', back: 'back_satchel', footwear: 'boots_sneakers', staff: 'staff_oak_wand' };
  const deck = Array(24).fill('ember_cinder_dart');
  return {
    account: { uid: 'guest_local', realmId: realm, wizardIds: [id], unlockedRaces: ['human'], sharedVault: ['hat_pointed_brim'], termXp: 60, claimedTermTiers: [1] },
    wizards: [{
      ...owner, id, name: 'Fixture Wizard', raceId: 'human', elementId: 'ember', level: 3, xp: 12, rank: 2,
      sculpt: { height: 1, build: 'balanced', skinHex: '#d9a273', hairStyle: 'Windblown Shag', hairHex: '#332822', hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4', eyeRightHex: '#3b82c4', browStyle: 'arched', marking: 'none', primaryDye: '#2f4569', trimDye: '#d4a13e', accentDye: '#d9532f', castPose: 'duelist' },
      wardrobe: { equipped, ownedGearIds: Object.values(equipped), socketedRunestones: ['rune_vital', 'rune_vital'] },
      stitching: { headgear: null, torso: null, back: null, footwear: null, staff: null },
      currencies: { florins: 493, honorMarks: 14, bondingSeals: 2, spellShards: 9 },
      resources: { sunleaf: 3, dewglass: 3, starstone: 1, copper_wire: 2, ember_ash: 2 },
      progression: { craftRank: 1, craftXp: 0, fishingRank: 1, flasks: 2, maxFlasks: 3, mana: 100, maxMana: 100,
        deck, sideboard: ['frost_tower_ward'], ownedSpellIds: ['ember_cinder_dart'], spellwrighting: {},
        unlockedElements: ['ember','frost','gale','bramble','tide','spark'], unlockedFusions: [], ownedMounts: ['mount_cloud_broom'], equippedMountId: null,
        rebirthSeals: 0, spireBestFloor: 0, almanacDay: 1, lastAlmanacClaim: '', completedQuests: ['q_first_duel'], questWins: { q_bond_arbor: 1 }, bestiarySeen: ['cinder_kitsune'], titleBadge: 'First-Year Initiate',
        loadouts: [{ name: 'Everyday Duelist', gearIds: { ...equipped }, deck: [...deck] }],
        eggs: [{ id: 'fixture-egg', parentA: 'Ember Kit', parentB: 'Forest Friend', resultSpeciesId: 'magma_salamander', winsNeeded: 2, winsDone: 1 }],
      }, activeCreatureId: pet.id,
    }],
    creatures: { [id]: [pet] },
    sanctuaries: { [id]: { ...owner, wizardId: id, themeId: 'sunlit_loft', weatherId: 'clear_breeze', isPublic: false,
      items: [{ uid: 'fixture-item', catalogId: 'dorm_rug', name: 'Rug', x: 0.3, y: 0, z: -1, rotY: 0, scale: 1, colorHex: '#9c4146' }],
      gardens: [{ plotId: 'plot_0', seedElement: 'ember', plantedAt: 100, readyAt: 20100 }] } },
    gallery: { [id]: ['data:image/png;base64,AAAA'] },
    unknownExtension: { untouched: ['alpha', 0.25] },
  };
}
describe('Historical nested guest save validation (#187)', () => {
  it('distinguishes missing from corrupt', () => {
    expect(validateNestedGuestSave(null, 'breeze')).toEqual({ kind: 'missing' });
    expect(validateNestedGuestSave('', 'breeze')).toMatchObject({ kind: 'recovery-required', raw: '' });
  });
  it.each(['breeze','horizon','everpeak'] as const)('preserves full %s v1 string, duplicate inventory quantities and unknown extension', realm => {
    const raw = JSON.stringify(fixture(realm), null, 2);
    expect(validateNestedGuestSave(raw, realm)).toEqual({ kind: 'validated', raw, legacyAffinityPresent: false });
  });
  it('allows the empty realm and historical optional omissions without defaults', () => {
    const bundle = fixture();
    delete (bundle.wizards[0].progression as Partial<typeof bundle.wizards[0]['progression']>).unlockedFusions;
    delete (bundle.wizards[0].progression as Partial<typeof bundle.wizards[0]['progression']>).questWins;
    const raw = JSON.stringify(bundle);
    expect(validateNestedGuestSave(raw, 'breeze')).toMatchObject({kind:'validated', raw});
    const empty = JSON.stringify({...bundle, account: {...bundle.account, wizardIds: []}, wizards: [], creatures: {}, sanctuaries: {}, gallery: {}});
    expect(validateNestedGuestSave(empty, 'breeze')).toMatchObject({kind:'validated',raw:empty});
  });
  it('keeps historical retired affinity data for byte-identical staging only', () => {
    const b = fixture();
    b.wizards[0].elementId = 'chronos';
    b.wizards[0].progression.unlockedFusions = ['aetheris'] as never[];
    const raw = JSON.stringify(b);
    expect(validateNestedGuestSave(raw,'breeze')).toEqual({kind:'validated',raw,legacyAffinityPresent:true});
  });
  it.each([
    ['account.termXp', -1], ['account.claimedTermTiers', [1,1]], ['account.unlockedRaces', ['future_race']],
    ['wizards.0.level', 51], ['wizards.0.rank', 0], ['wizards.0.name', ''], ['wizards.0.sculpt.height', 2],
    ['wizards.0.sculpt.skinHex', 'red'], ['wizards.0.sculpt.hairStyle', 'unrecognized historical style'],
    ['wizards.0.wardrobe.equipped.staff', 'hat_academy_cap'], ['wizards.0.wardrobe.socketedRunestones', ['not-a-rune']],
    ['wizards.0.stitching.back', 'staff_oak_wand'], ['wizards.0.currencies.florins', -1], ['wizards.0.resources.sunleaf', 0.5],
    ['wizards.0.progression.mana', 101], ['wizards.0.progression.flasks', 4], ['wizards.0.progression.almanacDay', 8],
    ['wizards.0.progression.deck', []], ['wizards.0.progression.deck.0', 'constructor'], ['wizards.0.progression.ownedSpellIds', []],
    ['wizards.0.progression.spellwrighting', {ember_cinder_dart:'C'}], ['wizards.0.progression.equippedMountId', 'missing_mount'],
    ['wizards.0.progression.completedQuests', ['q_first_duel','q_first_duel']], ['wizards.0.progression.questWins', {q_bond_arbor:-1}],
    ['wizards.0.progression.loadouts.0.gearIds.torso', 'back_satchel'], ['wizards.0.progression.eggs.0.resultSpeciesId', 'unknown-preserved'],
    ['wizards.0.progression.eggs.0.winsDone', 2], ['wizards.0.activeCreatureId', 'missing_pet'],
    ['creatures.fixture-wizard.0.speciesId', 'unknown-species'], ['creatures.fixture-wizard.0.elementId', 'frost'],
    ['creatures.fixture-wizard.0.stage', 4], ['creatures.fixture-wizard.0.wins', -1], ['creatures.fixture-wizard.0.talents', ['unknown']],
    ['sanctuaries.fixture-wizard.themeId', 'unknown'], ['sanctuaries.fixture-wizard.isPublic', 1],
    ['sanctuaries.fixture-wizard.items.0.scale', 0], ['sanctuaries.fixture-wizard.gardens.0.readyAt', 99],
    ['gallery.fixture-wizard.0', 'https://example.invalid/image'],
    ['wizards.0.serverProgressionVersion', 1], ['creatures.fixture-wizard.0.ownerId','other-owner'],
  ])('quarantines nested corruption at %s, preserving exact input', (path, replacement) => {
    const b = fixture();
    const parts = (path as string).split('.');
    let node: any = b;
    for (const key of parts.slice(0,-1)) node = node[key];
    node[parts[parts.length-1]] = replacement;
    const raw = JSON.stringify(b);
    expect(validateNestedGuestSave(raw,'breeze')).toMatchObject({kind:'recovery-required',raw});
  });
  it('rejects duplicate identity, missing pet and sanctuary records, and orphan gallery', () => {
    for (const corrupt of [
      (b: any) => b.creatures['fixture-wizard'].push({...b.creatures['fixture-wizard'][0]}),
      (b: any) => delete b.creatures['fixture-wizard'],
      (b: any) => delete b.sanctuaries['fixture-wizard'],
      (b: any) => b.gallery.orphan = [],
      (b: any) => b.wizards[0].progression.eggs.push({...b.wizards[0].progression.eggs[0]}),
      (b: any) => b.sanctuaries['fixture-wizard'].items.push({...b.sanctuaries['fixture-wizard'].items[0]}),
    ]) {
      const b = fixture(); corrupt(b); const raw = JSON.stringify(b);
      expect(validateNestedGuestSave(raw,'breeze')).toMatchObject({kind:'recovery-required',raw});
    }
  });
  it.each(['{"a":1,"a":2}','{"a":1,"\u0061":2}','{"x":[{"a":1,"a":2}]}','{"a":1,"\\u0061":2}'])('refuses duplicate JSON keys %s', raw => {
    expect(validateNestedGuestSave(raw,'breeze')).toEqual({kind:'recovery-required',raw,diagnostics:[{path:'$',code:'duplicate-key'}]});
  });
  it.each(['{"x":1e999}','{"x":9007199254740993}'])('refuses unsafe numeric tokens %s', raw => {
    expect(validateNestedGuestSave(raw,'breeze')).toMatchObject({kind:'recovery-required',raw,diagnostics:[{path:'$',code:'invalid-value'}]});
  });
  it('bounds nesting and raw length without discarding data', () => {
    for (const raw of ['['.repeat(129)+'0'+']'.repeat(129), ' '.repeat(10*1024*1024+1)]) {
      const outcome=validateNestedGuestSave(raw,'breeze');
      expect(outcome.kind).toBe('recovery-required');
      if(outcome.kind==='recovery-required') {
        expect(outcome.raw).toBe(raw);
        expect(outcome.diagnostics).toEqual([{path:'$',code:'inspection-limit'}]);
      }
    }
  });
  it('refuses tagged formats and cross-realm copies', () => {
    const raw=JSON.stringify({...fixture(),schemaVersion:2});
    expect(validateNestedGuestSave(raw,'breeze')).toMatchObject({kind:'recovery-required',raw});
    const wrong=JSON.stringify(fixture('horizon'));
    expect(validateNestedGuestSave(wrong,'breeze')).toMatchObject({kind:'recovery-required',raw:wrong});
  });
});
