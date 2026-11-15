import { describe, expect, it } from 'vitest';
import { CREATURE_SPECIES, SPECIES_BY_ID } from '../../shared/creatures.ts';
import { ELEMENTS, ELEMENT_LIST, STARTER_ELEMENTS } from '../../shared/elements.ts';
import { TERM_REWARD_TRACK } from '../../shared/economy.ts';
import { REALM_LIST } from '../../shared/realms.ts';
import { SPELLS, SPELL_BY_ID, getStarterDeckForElement } from '../../shared/spells.ts';
import { GEAR_BY_ID, MODULAR_GEAR, RACES, RUNESTONES } from '../../shared/wardrobe.ts';
import { CAMPUS_NPCS, CAMPUS_QUESTS, DORM_CATALOG, MOUNTS, ZONES } from '../../shared/world.ts';

function expectUnique(label: string, entries: readonly { id: string }[]) {
  const ids = entries.map(({ id }) => id);
  expect(new Set(ids).size, label).toBe(ids.length);
  for (const id of ids) expect(id, label).toMatch(/^[a-z][a-z0-9_]*$/);
}

describe('Vault: catalog integrity', () => {
  it('keeps identifiers unique within each catalog', () => {
    const catalogs = {
      realms: REALM_LIST, elements: ELEMENT_LIST, spells: SPELLS, creatures: CREATURE_SPECIES,
      lineages: Object.values(RACES), gear: MODULAR_GEAR, runestones: RUNESTONES, zones: Object.values(ZONES),
      campusNpcs: CAMPUS_NPCS, quests: CAMPUS_QUESTS, mounts: MOUNTS, dormItems: DORM_CATALOG,
    };
    for (const [label, entries] of Object.entries(catalogs)) expectUnique(label, entries);
  });

  it('builds an in-bounds starter deck with real spell IDs for every starting element', () => {
    for (const { id } of STARTER_ELEMENTS) {
      const deck = getStarterDeckForElement(id);
      expect(deck.length, id).toBeGreaterThanOrEqual(24);
      expect(deck.length, id).toBeLessThanOrEqual(40);
      for (const spell of deck) expect(Object.hasOwn(SPELL_BY_ID, spell), spell).toBe(true);
      expect(deck.some((spell) => SPELL_BY_ID[spell]?.element === id), id).toBe(true);
    }
  });

  it('indexes each spell and keeps its combat inputs in their declared ranges', () => {
    for (const spell of SPELLS) {
      expect(SPELL_BY_ID[spell.id], spell.id).toBe(spell);
      expect(Object.hasOwn(ELEMENTS, spell.element), spell.id).toBe(true);
      expect(spell.accuracy, spell.id).toBeGreaterThan(0);
      expect(spell.accuracy, spell.id).toBeLessThanOrEqual(100);
      expect(Number.isInteger(spell.pipCost), spell.id).toBe(true);
      expect(spell.pipCost, spell.id).toBeGreaterThanOrEqual(0);
      expect(spell.pipCost, spell.id).toBeLessThanOrEqual(7);
    }
  });

  it('indexes each creature and resolves its affinity and innate spell', () => {
    for (const creature of CREATURE_SPECIES) {
      expect(SPECIES_BY_ID[creature.id], creature.id).toBe(creature);
      expect(Object.hasOwn(ELEMENTS, creature.element), creature.id).toBe(true);
      expect(Object.hasOwn(SPELL_BY_ID, creature.innatePactCardId), creature.id).toBe(true);
      expect(creature.stageNames.every((name) => name.trim().length > 0), creature.id).toBe(true);
      expect(creature.baseHp, creature.id).toBeGreaterThan(0);
    }
  });

  it('gives every quest a campus giver, a positive target and nonnegative integer rewards', () => {
    for (const quest of CAMPUS_QUESTS) {
      expect(CAMPUS_NPCS.some(({ name }) => name === quest.giverNpc), quest.id).toBe(true);
      expect(Number.isInteger(quest.targetWins), quest.id).toBe(true);
      expect(quest.targetWins, quest.id).toBeGreaterThan(0);
      for (const value of [quest.rewardFlorins, quest.rewardXp, quest.rewardShards]) {
        expect(Number.isSafeInteger(value) && value >= 0, quest.id).toBe(true);
      }
    }
  });

  it('gives each NPC a known zone, lineage, element and finite coordinates', () => {
    for (const npc of CAMPUS_NPCS) {
      expect(Object.hasOwn(ZONES, npc.zone), npc.id).toBe(true);
      expect(Object.hasOwn(RACES, npc.raceId), npc.id).toBe(true);
      expect(Object.hasOwn(ELEMENTS, npc.elementId), npc.id).toBe(true);
      expect(npc.position.every(Number.isFinite), npc.id).toBe(true);
    }
    for (const zone of Object.values(ZONES)) expect(zone.spawnPos.every(Number.isFinite), zone.id).toBe(true);
  });

  it('orders Term rewards by increasing XP and references existing cosmetics', () => {
    let previousXp = 0;
    TERM_REWARD_TRACK.forEach(({ tier, xpRequired, reward }, index) => {
      expect(tier).toBe(index + 1);
      expect(xpRequired, 'tier ' + tier).toBeGreaterThan(previousXp);
      previousXp = xpRequired;
      if (reward.cosmeticId) expect(Object.hasOwn(GEAR_BY_ID, reward.cosmeticId), reward.cosmeticId).toBe(true);
    });
  });
});
