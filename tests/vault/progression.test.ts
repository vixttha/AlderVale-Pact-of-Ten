import { describe, expect, it } from 'vitest';
import { applyWizardXp } from '../../shared/quests.ts';

describe('Vault: XP and rank boundaries', () => {
  it.each([
    { gained: 146, xp: 146, level: 1, rank: 1 },
    { gained: 147, xp: 0, level: 2, rank: 1 },
    { gained: 148, xp: 1, level: 2, rank: 1 },
  ])('G04-001 applies the first 147 XP threshold for a gain of $gained', ({ gained, ...expected }) => {
    expect(applyWizardXp({ level: 1, xp: 0 }, gained)).toEqual(expected);
  });

  it('G04-002 carries unspent XP across multiple levels and updates rank', () => {
    expect(applyWizardXp({ level: 1, xp: 146 }, 230)).toEqual({
      xp: 1, level: 3, rank: 2,
    });
  });

  it('G04-002 caps level, rank, and banked XP on a large award', () => {
    expect(applyWizardXp({ level: 49, xp: 31_106 }, 10_000_002)).toEqual({
      xp: 10_000_000, level: 50, rank: 20,
    });
  });
});
