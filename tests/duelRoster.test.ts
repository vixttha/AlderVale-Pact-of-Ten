import { describe, expect, it } from 'vitest';
import type { ElementId } from '../shared/elements.ts';
import { ownedCreatureToCombatSlot, pickDuelCreatureRoster } from '../shared/combat.ts';

type TestPet = {
  id: string;
  speciesId: string;
  nickname: string;
  elementId: ElementId;
  stage: 1 | 2 | 3;
  chromatic: 'none' | 'dawn' | 'dusk';
  branchChoice: 'A' | 'B';
  talents: string[];
};

const pets: TestPet[] = [
  { id: 'pet_a', speciesId: 'cinder_kitsune', nickname: 'A', elementId: 'ember', stage: 1, chromatic: 'none', branchChoice: 'A', talents: ['tal_may_blade'] },
  { id: 'pet_b', speciesId: 'bramble_sprout', nickname: 'B', elementId: 'bramble', stage: 2, chromatic: 'none', branchChoice: 'B', talents: ['tal_spellproof'] },
  { id: 'pet_c', speciesId: 'tide_pup', nickname: 'C', elementId: 'tide' as const, stage: 1 as const, chromatic: 'dawn' as const, branchChoice: 'A' as const, talents: [] },
  { id: 'pet_d', speciesId: 'spark_wisp', nickname: 'D', elementId: 'spark' as const, stage: 3 as const, chromatic: 'none' as const, branchChoice: 'A' as const, talents: ['tal_may_shield'] },
];

describe('pickDuelCreatureRoster', () => {
  it('activates the selected lead when it is not the first creature', () => {
    const { roster, activeCreatureIdx } = pickDuelCreatureRoster(pets, 'pet_b');
    expect(roster.map((pet) => pet.id)).toEqual(['pet_a', 'pet_b', 'pet_c']);
    expect(activeCreatureIdx).toBe(1);
  });

  it('includes a lead outside the first three slots', () => {
    const { roster, activeCreatureIdx } = pickDuelCreatureRoster(pets, 'pet_d');
    expect(roster.map((pet) => pet.id)).toEqual(['pet_a', 'pet_b', 'pet_d']);
    expect(activeCreatureIdx).toBe(2);
  });

  it('falls back to the first creature when no lead is selected', () => {
    const { roster, activeCreatureIdx } = pickDuelCreatureRoster(pets, undefined);
    expect(roster[0]?.id).toBe('pet_a');
    expect(activeCreatureIdx).toBe(0);
  });
});

describe('ownedCreatureToCombatSlot', () => {
  it('maps owned creature fields into combat slots', () => {
    const slot = ownedCreatureToCombatSlot(pets[2]);
    expect(slot).toMatchObject({
      id: 'pet_c',
      element: 'tide',
      hp: 235,
      maxHp: 235,
    });
  });
});