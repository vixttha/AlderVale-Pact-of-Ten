import { describe, expect, it } from 'vitest';
import type { WizardDocument } from '../shared/economy.ts';
import { applySagaEvent, applyWizardXp } from '../shared/quests.ts';
import { REALMS, xpRequiredForLevel } from '../shared/realms.ts';
import { CAMPUS_QUESTS } from '../shared/world.ts';

function makeWizard(): WizardDocument {
  return {
    id: 'quest-reward-regression',
    ownerId: 'quest-reward-test',
    realmId: 'breeze',
    name: 'Quest Reward Tester',
    raceId: 'human',
    elementId: 'ember',
    level: 1,
    xp: 0,
    rank: 1,
    currencies: { florins: 100, honorMarks: 0, bondingSeals: 0, spellShards: 1 },
    progression: { completedQuests: [], questWins: {} },
  } as unknown as WizardDocument;
}

function questFor(id: string) {
  const quest = CAMPUS_QUESTS.find((entry) => entry.id === id);
  if (!quest) throw new Error(`Missing campus quest definition: ${id}`);
  return quest;
}

function lifetimeXp(wizard: Pick<WizardDocument, 'level' | 'xp'>): number {
  let total = wizard.xp;
  for (let level = 1; level < wizard.level; level += 1) {
    total += xpRequiredForLevel(level);
  }
  return total;
}

function expectQuestReward(before: WizardDocument, after: WizardDocument, questId: string) {
  const quest = questFor(questId);
  expect(after.progression.completedQuests.filter((id) => id === questId)).toHaveLength(1);
  expect(after.currencies.florins - before.currencies.florins).toBe(quest.rewardFlorins);
  expect(after.currencies.spellShards - before.currencies.spellShards).toBe(quest.rewardShards);
  expect(lifetimeXp(after) - lifetimeXp(before)).toBe(quest.rewardXp);
}

describe('Campus quest reward delivery (#13)', () => {
  it('adds First Spark rewards on top of the normal Breeze solo-duel payout', () => {
    const wizard = makeWizard();
    const realm = REALMS.breeze;
    const duelXp = Math.round(85 * realm.xpMultiplier);
    const duelFlorins = Math.round(65 * realm.dropMultiplier);
    const afterDuel = {
      ...wizard,
      ...applyWizardXp(wizard, duelXp),
      currencies: {
        ...wizard.currencies,
        florins: wizard.currencies.florins + duelFlorins,
        spellShards: wizard.currencies.spellShards + 2,
      },
    };

    const rewarded = applySagaEvent(afterDuel, 'solo-win');

    expectQuestReward(afterDuel, rewarded, 'q_first_duel');
    expect(lifetimeXp(rewarded) - lifetimeXp(wizard)).toBe(duelXp + questFor('q_first_duel').rewardXp);
    expect(rewarded.currencies.florins - wizard.currencies.florins)
      .toBe(duelFlorins + questFor('q_first_duel').rewardFlorins);
    expect(rewarded.currencies.spellShards - wizard.currencies.spellShards)
      .toBe(2 + questFor('q_first_duel').rewardShards);
    expect(applySagaEvent(rewarded, 'solo-win')).toBe(rewarded);
    expect(wizard.progression.completedQuests).toEqual([]);
  });

  it('grants Harmony only after the second lead-creature win and never twice', () => {
    const wizard = makeWizard();
    const firstWin = applySagaEvent(wizard, 'lead-creature-win');

    expect(firstWin.progression.questWins?.q_bond_arbor).toBe(1);
    expect(firstWin.progression.completedQuests).not.toContain('q_bond_arbor');
    expect(firstWin.currencies).toEqual(wizard.currencies);
    expect(lifetimeXp(firstWin)).toBe(lifetimeXp(wizard));

    const secondWin = applySagaEvent(firstWin, 'lead-creature-win');
    expectQuestReward(firstWin, secondWin, 'q_bond_arbor');
    expect(secondWin.progression.questWins?.q_bond_arbor).toBe(2);
    expect(applySagaEvent(secondWin, 'lead-creature-win')).toBe(secondWin);
  });

  it('grants the Rune-Catch alternative once', () => {
    const wizard = makeWizard();
    const rewarded = applySagaEvent(wizard, 'rune-catch');

    expectQuestReward(wizard, rewarded, 'q_bond_arbor');
    expect(applySagaEvent(rewarded, 'rune-catch')).toBe(rewarded);
    expect(applySagaEvent(rewarded, 'lead-creature-win')).toBe(rewarded);
  });

  it('grants the Rare Trial reward on victory exactly once', () => {
    const wizard = makeWizard();
    const rewarded = applySagaEvent(wizard, 'rare-trial-win');

    expectQuestReward(wizard, rewarded, 'q_rare_trial');
    expect(applySagaEvent(rewarded, 'rare-trial-win')).toBe(rewarded);
  });
});
