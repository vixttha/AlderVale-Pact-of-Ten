import { describe, expect, it } from 'vitest';
import { CRAFT_XP_PER_RANK, CRAFT_XP_PER_TRANSMUTE, craftProgressionAfterGain } from '../shared/economy.ts';

describe('craft progression', () => {
  it('keeps rank 1 until 100 craft XP', () => {
    let xp = 0;
    let rank = 1;
    for (let i = 0; i < 3; i += 1) {
      const next = craftProgressionAfterGain(xp, CRAFT_XP_PER_TRANSMUTE);
      xp = next.craftXp;
      rank = next.craftRank;
      expect(rank).toBe(1);
    }
    const fourth = craftProgressionAfterGain(xp, CRAFT_XP_PER_TRANSMUTE);
    expect(fourth).toEqual({ craftXp: CRAFT_XP_PER_RANK, craftRank: 2 });
  });

  it('does not gain another rank on every transmute after the first rank-up', () => {
    let { craftXp, craftRank } = craftProgressionAfterGain(0, CRAFT_XP_PER_RANK);
    expect(craftRank).toBe(2);
    const fifth = craftProgressionAfterGain(craftXp, CRAFT_XP_PER_TRANSMUTE);
    expect(fifth.craftRank).toBe(2);
    expect(fifth.craftXp).toBe(CRAFT_XP_PER_RANK + CRAFT_XP_PER_TRANSMUTE);
  });
});