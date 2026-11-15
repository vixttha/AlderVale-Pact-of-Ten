import { describe, it, expect } from 'vitest';
import { REALM_LIST, rankFromLevel, xpRequiredForLevel, type RealmId } from '../shared/realms.ts';
import { TERM_REWARD_TRACK } from '../shared/economy.ts';
import { getStarterDeckForElement } from '../shared/spells.ts';
import { ELEMENTS, type ElementId } from '../shared/elements.ts';

const BLUEPRINT_REALM_ENUM = ['breeze', 'horizon', 'everpeak'] as const;

describe('Shared game contracts — realms, progression, and starter decks', () => {
  it('exposes exactly three realms aligned with the Firestore blueprint enum', () => {
    expect(REALM_LIST).toHaveLength(3);
    const ids = REALM_LIST.map((r) => r.id).sort();
    expect(ids).toEqual([...BLUEPRINT_REALM_ENUM].sort());
    for (const realm of REALM_LIST) {
      expect(realm.xpMultiplier).toBeGreaterThan(0);
      expect(realm.accentHex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps XP requirements and rank bands monotonic and bounded', () => {
    const levels = [1, 5, 10, 20, 40];
    let prevXp = 0;
    for (const level of levels) {
      const xp = xpRequiredForLevel(level);
      expect(xp).toBeGreaterThan(prevXp);
      prevXp = xp;
      expect(rankFromLevel(level)).toBeGreaterThanOrEqual(1);
      expect(rankFromLevel(level)).toBeLessThanOrEqual(20);
    }
  });

  it('orders term reward tiers by non-decreasing XP thresholds', () => {
    let prev = 0;
    for (const tier of TERM_REWARD_TRACK) {
      expect(tier.xpRequired).toBeGreaterThanOrEqual(prev);
      prev = tier.xpRequired;
      expect(tier.tier).toBeGreaterThanOrEqual(1);
    }
  });

  it('provides full starter decks for every defined element', () => {
    const elementIds = Object.keys(ELEMENTS) as ElementId[];
    expect(elementIds.length).toBeGreaterThanOrEqual(8);
    for (const elementId of elementIds) {
      const deck = getStarterDeckForElement(elementId);
      expect(deck.length).toBeGreaterThanOrEqual(24);
      expect(deck.length).toBeLessThanOrEqual(26);
      expect(deck.every((card) => typeof card === 'string' && card.length > 0)).toBe(true);
    }
  });

  it('uses realm IDs that satisfy the RealmId type union', () => {
    const allowed = new Set<RealmId>(['breeze', 'horizon', 'everpeak']);
    for (const realm of REALM_LIST) {
      expect(allowed.has(realm.id)).toBe(true);
    }
  });
});