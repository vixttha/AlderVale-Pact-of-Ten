import { describe, expect, it } from 'vitest';
import type { ElementId } from '../shared/elements.ts';
import { leadCreatureQualifiedForArborWin, ownedCreatureToCombatSlot, pickDuelCreatureRoster, type CombatantState } from '../shared/combat.ts';

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

describe('leadCreatureQualifiedForArborWin', () => {
  const baseCombatant = {
    id: 'wiz',
    name: 'Rowan',
    isPlayer: true,
    raceId: 'human',
    element: 'ember',
    archmasteryElement: 'ember',
    hp: 400,
    maxHp: 400,
    powerPips: 1,
    regularPips: 1,
    schoolPips: 1,
    accuracyBonus: 0,
    powerBonusPct: 0,
    piercePct: 0,
    critPct: 0,
    blockPct: 0,
    stunnedTurns: 0,
    stunBlocks: 0,
    blades: [],
    shields: [],
    traps: [],
    weaknesses: [],
    prisms: [],
    dots: [],
    statusEffects: [],
    hand: [],
    deck: [],
    discard: [],
    sideboard: [],
    spellwrighting: {},
    creatures: [
      { id: 'pet_a', speciesId: 'x', nickname: 'A', element: 'ember', stage: 1, chromatic: 'none', branchChoice: 'A', hp: 100, maxHp: 100, talents: [] },
      { id: 'pet_b', speciesId: 'y', nickname: 'B', element: 'bramble', stage: 1, chromatic: 'none', branchChoice: 'A', hp: 100, maxHp: 100, talents: [] },
    ],
    activeCreatureIdx: 1,
  } satisfies CombatantState;

  it('credits Arbor progress only when the lead is active at victory', () => {
    expect(leadCreatureQualifiedForArborWin(baseCombatant, 'pet_b')).toBe(true);
    expect(leadCreatureQualifiedForArborWin(baseCombatant, 'pet_a')).toBe(false);
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