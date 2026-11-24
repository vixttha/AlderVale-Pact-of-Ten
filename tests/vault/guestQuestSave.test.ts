import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStarterWizard } from '../../shared/economy.ts';
import { applySagaEvent } from '../../shared/quests.ts';
import { xpRequiredForLevel, type RealmId } from '../../shared/realms.ts';
import { CAMPUS_QUESTS } from '../../shared/world.ts';
import { emptyGuestRealm, guestRecoveryExport, inspectGuestRealm, loadGuestRealm, saveGuestRealm } from '../../src/lib/storage.ts';

vi.mock('../../src/lib/firebase.ts', () => ({
  auth: {},
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: {},
}));

function createGuestWizard(realmId: RealmId = 'breeze') {
  return createStarterWizard({
    id: `guest_first_spark_${realmId}`,
    ownerId: 'guest_local',
    name: 'First Spark',
    realmId,
    raceId: 'human',
    elementId: 'ember',
    sculpt: {
      height: 1,
      build: 'balanced',
      skinHex: '#d9a273',
      hairStyle: 'short',
      hairHex: '#332822',
      hairTipHex: '#ff8a4c',
      eyeShape: 'bright',
      eyeLeftHex: '#3b82c4',
      eyeRightHex: '#3b82c4',
      browStyle: 'arched',
      marking: 'none',
      primaryDye: '#2f4569',
      trimDye: '#d4a13e',
      accentDye: '#d9532f',
      castPose: 'duelist',
    },
  });
}

describe('Vault: guest quest rewards and realm saves', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  function reloadWizard(wizard: ReturnType<typeof createGuestWizard>) {
    const bundle = loadGuestRealm(wizard.realmId);
    const result = saveGuestRealm(wizard.realmId, {
      ...bundle,
      account: { ...bundle.account, wizardIds: [wizard.id] },
      wizards: [wizard],
    });
    expect(result).toBe(true);
    const saved = loadGuestRealm(wizard.realmId);
    expect(saved.account.wizardIds).toEqual([wizard.id]);
    expect(saved.wizards).toHaveLength(1);
    return saved.wizards[0];
  }

  it('G13-005 counts a saved lead-creature win toward the second-win Harmony reward', () => {
    const guest = createGuestWizard('horizon');
    const first = applySagaEvent(guest, 'lead-creature-win');
    expect(first.progression.questWins?.q_bond_arbor).toBe(1);
    expect(first.progression.completedQuests).toEqual([]);
    expect(first.currencies).toEqual(guest.currencies);
    expect(first.xp).toBe(guest.xp);

    const reloaded = reloadWizard(first);
    expect(reloaded.progression.questWins?.q_bond_arbor).toBe(1);
    const completed = applySagaEvent(reloaded, 'lead-creature-win');

    expect(completed.progression.completedQuests).toEqual(['q_bond_arbor']);
    expect(completed.progression.questWins?.q_bond_arbor).toBe(2);
    expect(completed.currencies).toEqual({
      ...guest.currencies,
      florins: guest.currencies.florins + 160,
      spellShards: guest.currencies.spellShards + 4,
    });
    expect(completed).toMatchObject({ level: 1, xp: 140 });
    expect(reloadWizard(completed)).toEqual(completed);
    expect(loadGuestRealm('breeze').wizards).toEqual([]);
  });

  it('G13-006 persists a Rune-Catch event reward and ignores a replay after reload', () => {
    const guest = createGuestWizard();
    const completed = applySagaEvent(guest, 'rune-catch');

    expect(completed.progression.completedQuests).toEqual(['q_bond_arbor']);
    expect(completed.progression.questWins).toEqual({});
    expect(completed.currencies.florins - guest.currencies.florins).toBe(160);
    expect(completed.currencies.spellShards - guest.currencies.spellShards).toBe(4);
    expect(completed).toMatchObject({ level: 1, xp: 140 });

    const saved = reloadWizard(completed);
    expect(saved).toEqual(completed);
    expect(applySagaEvent(saved, 'rune-catch')).toBe(saved);
  });

  it('G13-007 preserves partial Harmony progress across a route switch and pays once', () => {
    const guest = createGuestWizard();
    const partial = reloadWizard(applySagaEvent(guest, 'lead-creature-win'));
    expect(partial.progression.questWins?.q_bond_arbor).toBe(1);

    const completed = applySagaEvent(partial, 'rune-catch');
    const saved = reloadWizard(completed);
    expect(saved.progression.completedQuests).toEqual(['q_bond_arbor']);
    expect(saved.progression.questWins?.q_bond_arbor).toBe(1);
    expect(saved.currencies.florins - guest.currencies.florins).toBe(160);
    expect(saved.currencies.spellShards - guest.currencies.spellShards).toBe(4);
    expect(applySagaEvent(saved, 'lead-creature-win')).toBe(saved);
  });

  it('G13-008 persists the Rare Trial victory reward and ignores a replay after reload', () => {
    const guest = { ...createGuestWizard('everpeak'), level: 7, rank: 4 };
    const completed = applySagaEvent(guest, 'rare-trial-win');

    expect(completed.progression.completedQuests).toEqual(['q_rare_trial']);
    expect(completed.currencies).toEqual({
      ...guest.currencies,
      florins: guest.currencies.florins + 320,
      spellShards: guest.currencies.spellShards + 8,
    });
    expect(completed).toMatchObject({ level: 7, rank: 4, xp: 260 });

    const saved = reloadWizard(completed);
    expect(saved).toEqual(completed);
    expect(applySagaEvent(saved, 'rare-trial-win')).toBe(saved);
  });

  it('G13-009 keeps a saved quest reward when a different quest completes', () => {
    const guest = createGuestWizard();
    const first = reloadWizard(applySagaEvent(guest, 'solo-win'));
    const both = reloadWizard(applySagaEvent(first, 'rune-catch'));

    expect(both.progression.completedQuests).toEqual(['q_first_duel', 'q_bond_arbor']);
    expect(both.currencies).toEqual({
      ...guest.currencies,
      florins: guest.currencies.florins + 270,
      spellShards: guest.currencies.spellShards + 7,
    });
    expect(both).toMatchObject({ level: 2, rank: 1, xp: 83 });
    expect(applySagaEvent(both, 'solo-win')).toBe(both);
    expect(applySagaEvent(both, 'rune-catch')).toBe(both);
    expect(loadGuestRealm('breeze').account.termXp).toBe(0);
  });

  it('G13-001 grants the quest rewards once and retains them with the guest wizard after reload', () => {
    const quest = CAMPUS_QUESTS.find(({ id }) => id === 'q_first_duel');
    if (!quest) throw new Error('First Spark quest is missing from the campus catalog');

    const starter = createGuestWizard();
    const threshold = xpRequiredForLevel(starter.level);
    const wizard = { ...starter, xp: threshold - 1 };
    const completed = applySagaEvent(wizard, 'solo-win');

    expect(completed.progression.completedQuests).toEqual([quest.id]);
    expect(completed.currencies).toEqual({
      ...wizard.currencies,
      florins: wizard.currencies.florins + quest.rewardFlorins,
      spellShards: wizard.currencies.spellShards + quest.rewardShards,
    });
    expect(completed.level).toBe(2);
    expect(completed.xp).toBe(quest.rewardXp - 1);
    expect(wizard.progression.completedQuests).toEqual([]);

    const guest = loadGuestRealm('breeze');
    expect(saveGuestRealm('breeze', {
      ...guest,
      account: { ...guest.account, wizardIds: [completed.id] },
      wizards: [completed],
    })).toBe(true);

    const saved = loadGuestRealm('breeze');
    expect(saved.account.wizardIds).toEqual([wizard.id]);
    expect(saved.wizards).toHaveLength(1);
    const reloaded = saved.wizards[0];
    expect(reloaded.id).toBe(wizard.id);
    expect(reloaded.progression.completedQuests).toEqual([quest.id]);
    expect(reloaded.currencies).toEqual(completed.currencies);
    expect(reloaded.level).toBe(completed.level);
    expect(reloaded.xp).toBe(completed.xp);
    expect(applySagaEvent(reloaded, 'solo-win')).toBe(reloaded);
    expect(loadGuestRealm('horizon').wizards).toEqual([]);
  });
  it.each(['{"account":', '', 'null', '[]', '{}', '{"version":2}'])('G28-003 protects unreadable guest data %j and preserves another realm', raw => {
    const horizon = loadGuestRealm('horizon');
    expect(saveGuestRealm('horizon', horizon)).toBe(true);
    const horizonRaw = localStorage.getItem('aldervale_guest_horizon_v1');
    localStorage.setItem('aldervale_guest_breeze_v1', raw);
    expect(inspectGuestRealm('breeze')).toEqual({ kind: 'recovery-required', raw });
    expect(() => loadGuestRealm('breeze')).toThrow('Guest save needs recovery');
    expect(saveGuestRealm('breeze', emptyGuestRealm('breeze'))).toBe(false);
    expect(localStorage.getItem('aldervale_guest_breeze_v1')).toBe(raw);
    expect(localStorage.getItem('aldervale_guest_horizon_v1')).toBe(horizonRaw);
    expect(JSON.parse(guestRecoveryExport('breeze', raw))).toEqual({ format: 'aldervale-guest-recovery-v1', realmId: 'breeze', raw });
  });

  it('preserves an unpaired code unit in the recovery export', () => {
    const raw = '\uD800';
    expect(JSON.parse(guestRecoveryExport('breeze', raw)).raw).toBe(raw);
  });

  it('distinguishes storage denial from absence and refuses writes', () => {
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const write = vi.spyOn(localStorage, 'setItem');
    try {
      expect(inspectGuestRealm('breeze')).toEqual({ kind: 'storage-unavailable' });
      expect(saveGuestRealm('breeze', emptyGuestRealm('breeze'))).toBe(false);
      expect(write).not.toHaveBeenCalled();
    } finally { read.mockRestore(); write.mockRestore(); }
  });

  it('rejects a changed source observed before a save', () => {
    const original = emptyGuestRealm('breeze');
    expect(saveGuestRealm('breeze', original)).toBe(true);
    const old = localStorage.getItem('aldervale_guest_breeze_v1');
    const newer = { ...original, account: { ...original.account, termXp: 60 } };
    expect(saveGuestRealm('breeze', newer)).toBe(true);
    const newRaw = localStorage.getItem('aldervale_guest_breeze_v1');
    expect(saveGuestRealm('breeze', original, old)).toBe(false);
    expect(localStorage.getItem('aldervale_guest_breeze_v1')).toBe(newRaw);
  });

  it('G28-005 preserves the last good save when replacing it fails', () => {
    const breezeKey = 'aldervale_guest_breeze_v1';
    const horizonKey = 'aldervale_guest_horizon_v1';
    const breeze = loadGuestRealm('breeze');
    const horizon = loadGuestRealm('horizon');

    expect(saveGuestRealm('breeze', breeze)).toBe(true);
    expect(saveGuestRealm('horizon', horizon)).toBe(true);
    const breezeBefore = localStorage.getItem(breezeKey);
    const horizonBefore = localStorage.getItem(horizonKey);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    const updated = { ...breeze, account: { ...breeze.account, termXp: 42 } };

    try {
      expect(saveGuestRealm('breeze', updated)).toBe(false);
      expect(localStorage.getItem(breezeKey)).toBe(breezeBefore);
      expect(localStorage.getItem(horizonKey)).toBe(horizonBefore);

      expect(saveGuestRealm('breeze', updated)).toBe(true);
      expect(loadGuestRealm('breeze')).toEqual(updated);
      expect(localStorage.getItem(horizonKey)).toBe(horizonBefore);
    } finally {
      write.mockRestore();
    }
  });
});
