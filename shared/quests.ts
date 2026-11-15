import type { WizardDocument } from './economy.ts';
import { xpRequiredForLevel, rankFromLevel } from './realms.ts';
import { CAMPUS_QUESTS } from './world.ts';

export type SagaEvent = 'solo-win' | 'lead-creature-win' | 'rune-catch' | 'rare-trial-win' | 'rare-trial-attempt';

export function applySagaEvent(wizard: WizardDocument, event: SagaEvent): WizardDocument {
  const questId = event === 'solo-win' ? 'q_first_duel'
    : event === 'rare-trial-win' || event === 'rare-trial-attempt' ? 'q_rare_trial' : 'q_bond_arbor';
  const quest = CAMPUS_QUESTS.find((entry) => entry.id === questId);
  if (!quest || wizard.progression.completedQuests.includes(questId)) return wizard;
  const counters = { ...wizard.progression.questWins };
  if (event === 'lead-creature-win') {
    counters[questId] = (counters[questId] ?? 0) + 1;
    if (counters[questId] < quest.targetWins) {
      return { ...wizard, progression: { ...wizard.progression, questWins: counters } };
    }
  }
  const level = applyWizardXp(wizard, quest.rewardXp);
  return {
    ...wizard, ...level,
    currencies: {
      ...wizard.currencies, florins: wizard.currencies.florins + quest.rewardFlorins,
      spellShards: wizard.currencies.spellShards + quest.rewardShards,
    },
    progression: {
      ...wizard.progression, questWins: counters,
      completedQuests: [...wizard.progression.completedQuests, questId],
    },
  };
}

export function applyWizardXp(wizard: Pick<WizardDocument, 'xp' | 'level'>, gainedXp: number) {
  let xp = wizard.xp + gainedXp;
  let level = wizard.level;
  while (level < 50 && xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
  }
  return { xp: Math.min(10_000_000, xp), level, rank: rankFromLevel(level) };
}
