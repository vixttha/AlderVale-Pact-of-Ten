import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStarterWizard } from '../../shared/economy.ts';
import { applySagaEvent } from '../../shared/quests.ts';
import { xpRequiredForLevel } from '../../shared/realms.ts';
import { CAMPUS_QUESTS } from '../../shared/world.ts';
import { loadGuestRealm, saveGuestRealm } from '../../src/lib/storage.ts';

vi.mock('../../src/lib/firebase.ts', () => ({
  auth: {},
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: {},
}));

function createGuestWizard() {
  return createStarterWizard({
    id: 'guest_first_spark',
    ownerId: 'guest_local',
    name: 'First Spark',
    realmId: 'breeze',
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

describe('Vault: guest First Spark payout and save', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

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
});
