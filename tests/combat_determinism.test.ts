import { describe, it, expect, vi } from 'vitest';
import {
  resolveDuelRound,
  type CombatantState,
  type DuelState,
  type TurnActionInput,
} from '../shared/combat.ts';

function makeCombatant(id: string, element: CombatantState['element'], isPlayer: boolean): CombatantState {
  return {
    id,
    name: id,
    isPlayer,
    isNpc: !isPlayer,
    raceId: 'human',
    element,
    archmasteryElement: element,
    hp: 500,
    maxHp: 500,
    powerPips: 2,
    regularPips: 2,
    schoolPips: 0,
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
    creatures: [],
    activeCreatureIdx: 0,
  };
}

function makeState(player: CombatantState, enemy: CombatantState): DuelState {
  return {
    duelId: 'effect-id-repro',
    mode: 'solo',
    round: 1,
    turnTimerSeconds: null,
    arenaBubble: null,
    playerTeam: [player],
    enemyTeam: [enemy],
    firstTeam: 'player',
    phase: 'planning',
    logs: [],
    telegraphedCheat: null,
  };
}

describe('deterministic combat effect IDs (#74)', () => {
  it('keeps the Spellwright blade ID when only the wall clock changes', () => {
    const player = makeCombatant('wizard', 'gale', true);
    const enemy = makeCombatant('enemy', 'frost', false);
    player.hand = ['gale_sky_falcon'];
    player.spellwrighting = { gale_sky_falcon: 'B' };
    const state = makeState(player, enemy);
    const action: TurnActionInput = {
      actorId: player.id,
      cardIndex: 0,
      targetId: enemy.id,
      creatureAction: 'none',
    };

    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(1000);
      const first = resolveDuelRound(state, [action], () => 0.1);
      clock.mockReturnValue(2000);
      const second = resolveDuelRound(state, [action], () => 0.1);

      expect(first.playerTeam[0].blades).toHaveLength(1);
      expect(first.playerTeam[0].blades.map((effect) => effect.id))
        .toEqual(second.playerTeam[0].blades.map((effect) => effect.id));
    } finally {
      clock.mockRestore();
    }
  });

  it('keeps the creature blade ID when only the wall clock changes', () => {
    const player = makeCombatant('wizard', 'ember', true);
    const enemy = makeCombatant('enemy', 'frost', false);
    player.creatures = [{
      id: 'pet-1',
      speciesId: 'cinder_kitsune',
      nickname: 'Hearth',
      element: 'ember',
      stage: 1,
      chromatic: 'none',
      branchChoice: 'B',
      hp: 100,
      maxHp: 100,
      talents: [],
    }];
    const state = makeState(player, enemy);
    const action: TurnActionInput = {
      actorId: player.id,
      cardIndex: null,
      targetId: enemy.id,
      creatureAction: 'skill',
    };

    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(1000);
      const first = resolveDuelRound(state, [action], () => 0.1);
      clock.mockReturnValue(2000);
      const second = resolveDuelRound(state, [action], () => 0.1);

      expect(first.playerTeam[0].blades).toHaveLength(1);
      expect(first.playerTeam[0].blades.map((effect) => effect.id))
        .toEqual(second.playerTeam[0].blades.map((effect) => effect.id));

      const nextRound = resolveDuelRound(first, [action], () => 0.1);
      const ids = nextRound.playerTeam[0].blades.map((effect) => effect.id);
      expect(ids).toHaveLength(2);
      expect(ids[0]).toBe(first.playerTeam[0].blades[0].id);
      expect(new Set(ids).size).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });
});
