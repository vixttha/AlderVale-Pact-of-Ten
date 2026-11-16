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

function resolveAt(state: DuelState, action: TurnActionInput, time: number) {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(time);
  // Restart the same RNG sequence for each replay.
  let seed = 1;
  const rng = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    return resolveDuelRound(state, [action], rng);
  } finally {
    clock.mockRestore();
  }
}

describe('deterministic combat effect IDs (#74)', () => {
  it.each([
    { spell: 'gale_sky_falcon', element: 'gale', collection: 'blades' },
    { spell: 'frost_glacial_stag', element: 'frost', collection: 'shields' },
  ] as const)('replays the full round with the Spellwright $collection effect', ({ spell, element, collection }) => {
    const player = makeCombatant('wizard', element, true);
    const enemy = makeCombatant('enemy', 'frost', false);
    player.hand = [spell];
    player.spellwrighting = { [spell]: 'B' };
    const state = makeState(player, enemy);
    const action: TurnActionInput = {
      actorId: player.id,
      cardIndex: 0,
      targetId: enemy.id,
      creatureAction: 'none',
    };

    const first = resolveAt(state, action, 1000);
    expect(first.playerTeam[0][collection]).toHaveLength(1);
    expect(resolveAt(state, action, 2000)).toEqual(first);
  });

  it.each([
    { speciesId: 'cinder_kitsune', element: 'ember', side: 'playerTeam', collection: 'blades' },
    { speciesId: 'rime_stag', element: 'frost', side: 'playerTeam', collection: 'shields' },
    { speciesId: 'harbor_kelpie', element: 'tide', side: 'enemyTeam', collection: 'traps' },
  ] as const)('replays the full round with $speciesId and keeps distinct IDs across rounds', ({
    speciesId, element, side, collection,
  }) => {
    const player = makeCombatant('wizard', element, true);
    const enemy = makeCombatant('enemy', 'frost', false);
    player.creatures = [{
      id: 'pet-1',
      speciesId,
      nickname: 'Companion',
      element,
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

    const first = resolveAt(state, action, 1000);
    const effects = first[side][0][collection];
    expect(effects).toHaveLength(1);
    expect(resolveAt(state, action, 2000)).toEqual(first);

    const nextRound = resolveAt(first, action, 2000);
    const nextEffects = nextRound[side][0][collection];
    expect(nextEffects).toHaveLength(2);
    expect(nextEffects[0]).toEqual(effects[0]);
    expect(nextEffects[1].id).not.toBe(effects[0].id);
  });
});
