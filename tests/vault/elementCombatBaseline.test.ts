import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ownedCreatureToCombatSlot,
  resolveDuelRound,
  resolveSpellDamage,
  type ActiveModifier,
  type CombatantState,
  type DuelState,
} from '../../shared/combat.ts';
import { resolveFusionSpecies, SPECIES_BY_ID } from '../../shared/creatures.ts';
import { ELEMENT_LIST, getElementMatchupMultiplier, type ElementId } from '../../shared/elements.ts';
import { SPELL_BY_ID } from '../../shared/spells.ts';

const baseline = readFileSync(
  new URL('../../docs/test-vault/aldervale/element-combat-baseline.md', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const matrix = baseline
  .split('## Directional matrix\n')[1]
  .split('## Spell and creature checkpoints\n')[0]
  .split(/\r?\n/)
  .filter((line) => line.startsWith('| '))
  .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
const roster = matrix[0].slice(1);
const rows = matrix.slice(2);
const elements = roster.map((name) => name.toLowerCase() as ElementId);
const cells = rows.flatMap(([name, ...values]) =>
  values.map((value, column) => ({
    attacker: name.toLowerCase() as ElementId,
    defender: elements[column],
    expected: Number(value),
  })),
);

describe('Element combat baseline — complete directional matrix', () => {
  it('covers exactly the current roster, 225 distinct cells and all four outcomes', () => {
    expect(ELEMENT_LIST.map(({ name }) => name)).toEqual(roster);
    expect(rows.map(([name]) => name)).toEqual(roster);
    expect(rows.map((row) => row.length)).toEqual(Array(15).fill(16));
    expect(new Set(cells.map(({ attacker, defender }) => attacker + '>' + defender)).size).toBe(225);
    expect(cells.filter(({ expected }) => expected === 0.85)).toHaveLength(15);
    expect(cells.filter(({ expected }) => expected === 1.25)).toHaveLength(10);
    expect(cells.filter(({ expected }) => expected === 1.15)).toHaveLength(10);
    expect(cells.filter(({ expected }) => expected === 1)).toHaveLength(190);
  });

  it.each(cells)('$attacker → $defender is $expected', ({ attacker, defender, expected }) => {
    expect(getElementMatchupMultiplier(attacker, defender)).toBe(expected);
  });

  it.each([
    ['ember', 'bramble', 'magma_salamander', 'magma'],
    ['tide', 'spark', 'tempest_serpent', 'tempest'],
    ['frost', 'tide', 'glacier_bear', 'glacier'],
    ['umbra', 'sol', 'eclipse_lynx', 'eclipse'],
    ['chronos', 'verdigris', 'aetheris_dragonet', 'aetheris'],
  ] as const)('reconciles the agreed %s + %s lineage with %s in both orders', (left, right, id, element) => {
    const match = expect.objectContaining({ id, element });
    expect(resolveFusionSpecies(left, right)).toEqual(match);
    expect(resolveFusionSpecies(right, left)).toEqual(match);
  });

  it('has no Gale fusion when paired with any roster element', () => {
    for (const element of elements) {
      expect(resolveFusionSpecies('gale', element), element).toBeNull();
      expect(resolveFusionSpecies(element, 'gale'), element).toBeNull();
    }
  });
});

function combatant(id: string, element: ElementId, options: Partial<CombatantState> = {}): CombatantState {
  return {
    id, name: id, isPlayer: id === 'Caster', raceId: 'human', element,
    archmasteryElement: element, hp: 1000, maxHp: 1000,
    powerPips: 0, regularPips: 7, schoolPips: 0,
    accuracyBonus: 0, powerBonusPct: 0, piercePct: 0, critPct: 0, blockPct: 0,
    stunnedTurns: 0, stunBlocks: 0, blades: [], shields: [], traps: [],
    weaknesses: [], prisms: [], dots: [], statusEffects: [], hand: [],
    deck: [], discard: [], sideboard: [], spellwrighting: {}, creatures: [],
    activeCreatureIdx: 0, ...options,
  };
}

function ward(id: string, element: ActiveModifier['element']): ActiveModifier {
  return { id, label: id, kind: 'shield', element, pct: 50 };
}

function prism(id: string, source: ElementId, targetElement: ElementId): ActiveModifier {
  return { id, label: id, kind: 'prism', element: source, pct: 0, targetElement };
}

function spellDamage(caster: CombatantState, target: CombatantState, id: string) {
  return resolveSpellDamage({
    caster, target, spell: SPELL_BY_ID[id], isEnchanted: false, bubble: null, critRoll: 0.5, blockRoll: 0.5,
  });
}

function creature(speciesId: string, stage: 1 | 2 | 3) {
  const species = SPECIES_BY_ID[speciesId];
  return ownedCreatureToCombatSlot({
    id: 'Creature', speciesId, nickname: species.name, elementId: species.element,
    stage, chromatic: 'none', branchChoice: 'A', talents: [],
  });
}

function duel(caster: CombatantState, ...defenders: CombatantState[]): DuelState {
  return {
    duelId: 'baseline-duel', mode: 'solo', round: 1, turnTimerSeconds: null,
    arenaBubble: null, playerTeam: [caster], enemyTeam: defenders,
    firstTeam: 'player', phase: 'planning', logs: [], telegraphedCheat: null,
  };
}

const fixedRoll = () => 0.5;

describe('Element combat baseline — spells and wards', () => {
  it.each([
    { name: 'unprotected opposition', shields: [], pierce: 0, damage: 119 },
    { name: '50% universal ward', shields: [ward('Ward', 'universal')], pierce: 0, damage: 59 },
    { name: '50% ward with 25% total pierce', shields: [ward('Ward', 'universal')], pierce: 10, damage: 89 },
  ])('Cinder Dart applies $name', ({ shields, pierce, damage }) => {
    const caster = combatant('Caster', 'ember', {
      piercePct: pierce,
      spellwrighting: pierce ? { ember_cinder_dart: 'B' } : {},
    });
    const target = combatant('Target', 'frost', { shields: [...shields] });
    expect(spellDamage(caster, target, 'ember_cinder_dart')).toEqual({
      damage, crit: false, finalElement: 'ember',
    });
    expect(target.shields).toEqual([]);
  });

  it('uses the newest matching prism and matching ward while preserving older and unmatched modifiers', () => {
    const caster = combatant('Caster', 'tide');
    const olderPrism = prism('Older Prism', 'tide', 'frost');
    const unmatchedPrism = prism('Unmatched Prism', 'ember', 'frost');
    const olderSparkWard = ward('Older Spark Ward', 'spark');
    const tideWard = ward('Tide Ward', 'tide');
    const newestSparkWard = { ...ward('Newest Spark Ward', 'spark'), pct: 40 };
    const target = combatant('Target', 'tide', {
      prisms: [olderPrism, prism('Coral Prism', 'tide', 'spark'), unmatchedPrism],
      shields: [olderSparkWard, newestSparkWard, tideWard],
    });
    expect(spellDamage(caster, target, 'tide_foam_jet')).toEqual({
      damage: 64, crit: false, finalElement: 'spark',
    });
    expect(target.prisms).toEqual([olderPrism, unmatchedPrism]);
    expect(target.shields).toEqual([olderSparkWard, tideWard]);
  });

  it('uses the Spark source scalar with the reverse prism and Tide ward', () => {
    const target = combatant('Target', 'spark', {
      prisms: [prism('Nimbus Prism', 'spark', 'tide')],
      shields: [ward('Tide Ward', 'tide')],
    });
    expect(spellDamage(combatant('Caster', 'spark'), target, 'spark_arc_jolt')).toEqual({
      damage: 83, crit: false, finalElement: 'tide',
    });
    expect(target.prisms).toEqual([]);
    expect(target.shields).toEqual([]);
  });

  it('casts Coral Prism and Bastion Ward before Foam Jet resolves the converted hit', () => {
    const caster = combatant('Caster', 'tide', { hand: ['tide_prism', 'tide_foam_jet'] });
    const target = combatant('Target', 'tide', { hand: ['frost_tower_ward'] });
    const setup = resolveDuelRound(duel(caster, target), [
      { actorId: 'Caster', targetId: 'Target', cardIndex: 0, creatureAction: 'none' },
      { actorId: 'Target', targetId: 'Target', cardIndex: 0, creatureAction: 'none' },
    ], fixedRoll);
    expect(setup.enemyTeam[0].prisms).toEqual([expect.objectContaining({ element: 'tide', targetElement: 'spark' })]);
    expect(setup.enemyTeam[0].shields).toEqual([expect.objectContaining({ element: 'universal', pct: 50 })]);
    const hit = resolveDuelRound(setup, [
      { actorId: 'Caster', targetId: 'Target', cardIndex: 0, creatureAction: 'none' },
    ], fixedRoll).enemyTeam[0];
    expect(hit.hp).toBe(947);
    expect(hit.lastHitElement).toBe('spark');
    expect(hit.prisms).toEqual([]);
    expect(hit.shields).toEqual([]);
  });

  it('resolves the Magma area spell separately against two defenders', () => {
    const caster = combatant('Caster', 'magma', { hand: ['magma_tectonic'] });
    const frost = combatant('Frost defender', 'frost', { shields: [ward('Ward', 'universal')] });
    const bramble = combatant('Bramble defender', 'bramble');
    const round = resolveDuelRound(duel(caster, frost, bramble), [
      { actorId: 'Caster', targetId: frost.id, cardIndex: 0, creatureAction: 'none' },
    ], fixedRoll);
    expect(round.enemyTeam.map(({ hp }) => 1000 - hp)).toEqual([344, 598]);
    expect(round.enemyTeam[0].shields).toEqual([]);
  });
});

describe('Element combat baseline — creature strikes and spell modifiers', () => {
  it.each([
    { speciesId: 'cinder_kitsune', element: 'ember', defender: 'frost', stage: 1, damage: 98 },
    { speciesId: 'cinder_kitsune', element: 'ember', defender: 'frost', stage: 2, damage: 112 },
    { speciesId: 'cinder_kitsune', element: 'ember', defender: 'frost', stage: 3, damage: 132 },
    { speciesId: 'tempest_serpent', element: 'tempest', defender: 'spark', stage: 3, damage: 158 },
  ] as const)('$speciesId stage $stage deals $damage to $defender and leaves spell modifiers intact',
    ({ speciesId, element, defender, stage, damage }) => {
      const caster = combatant('Caster', 'gale', { creatures: [creature(speciesId, stage)] });
      const target = combatant('Target', defender, {
        prisms: [prism('Creature-color prism', element, defender)],
        shields: [ward('Ward', 'universal')],
      });
      const actions = [{ actorId: 'Caster', targetId: 'Target', cardIndex: null, creatureAction: 'skill' }] as const;
      const protectedHit = resolveDuelRound(duel(caster, target), [...actions], fixedRoll).enemyTeam[0];
      const openHit = resolveDuelRound(
        duel(caster, { ...target, prisms: [], shields: [] }), [...actions], fixedRoll,
      ).enemyTeam[0];
      expect(protectedHit.hp).toBe(1000 - damage);
      expect(protectedHit.hp).toBe(openHit.hp);
      expect(protectedHit.prisms).toEqual(target.prisms);
      expect(protectedHit.shields).toEqual(target.shields);
    },
  );

  it('resolves a converted and shielded spell plus an unconverted creature strike in the same turn', () => {
    const caster = combatant('Caster', 'ember', {
      hand: ['ember_cinder_dart'], creatures: [creature('cinder_kitsune', 1)],
    });
    const target = combatant('Target', 'ember', {
      prisms: [prism('Thermal Prism', 'ember', 'frost')],
      shields: [ward('Frost Ward', 'frost')],
    });
    const round = resolveDuelRound(duel(caster, target), [
      { actorId: 'Caster', targetId: 'Target', cardIndex: 0, creatureAction: 'skill' },
    ], fixedRoll);
    expect(round.enemyTeam[0]).toMatchObject({ hp: 875, lastHitElement: 'frost', prisms: [], shields: [] });
    expect(round.logs).toContain('Caster cast Cinder Dart on Target for 59 dmg!');
    expect(round.logs).toContain('Hearth Kitsune used Tail-Flame Lash for 66 Ember damage!');
  });
});
