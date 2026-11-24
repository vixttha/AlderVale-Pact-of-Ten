import { describe, it, expect } from 'vitest';
import { readDuelAction } from '../../server/duelView.ts';
import { resolveDuelRound, chooseAiAction, isValidInHandEnchantPair, type CombatantState, type DuelState, type TurnActionInput } from '../../shared/combat.ts';

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


const INK = 'uni_enchant_keen';
const ATTACK = 'ember_cinder_dart';
function scenario(hand: string[], sideboard: string[] = []) {
  const player = makeCombatant('wizard', 'ember', true);
  const enemy = makeCombatant('enemy', 'frost', false);
  player.hand = hand;
  player.sideboard = sideboard;
  return makeState(player, enemy);
}
function action(cardIndex: number | null, extra: Partial<TurnActionInput> = {}): TurnActionInput {
  return { actorId: 'wizard', cardIndex, targetId: 'enemy', creatureAction: 'none', ...extra };
}
function parse(state: DuelState, input: unknown) {
  return readDuelAction(input, state.playerTeam[0], state.enemyTeam);
}

describe('G09-003 Keen Ink fusion and cast safety (#70)', () => {
  it.each(['pvp', 'coop', 'solo'] as const)('keeps authoritative fusion and original hand indices in %s', mode => {
    for (const hand of [[INK, ATTACK], [ATTACK, INK]]) {
      const state = scenario(hand);
      state.mode = mode;
      const enchantCardIdx = hand.indexOf(INK);
      const targetCardIdx = hand.indexOf(ATTACK);
      const pair = { enchantCardIdx, targetCardIdx };
      const parsed = parse(state, action(targetCardIdx, { enchantPair: pair }));
      expect(parsed?.enchantPair).toEqual(pair);
      const plain = resolveDuelRound(state, [action(targetCardIdx)], () => 0.1);
      const fused = resolveDuelRound(state, [parsed!], () => 0.1);
      expect(fused.enemyTeam[0].hp).toBeLessThan(plain.enemyTeam[0].hp);
      expect(fused.playerTeam[0].hand).not.toContain(INK);
      expect(fused.playerTeam[0].discard).toContain(ATTACK);
      expect(fused.logs.some(log => log.includes('fused Keen Ink'))).toBe(true);
      expect(state.playerTeam[0].hand).toEqual(hand);
    }
  });
  it('rejects malformed, conflicting, already enchanted and non-attack pairs', () => {
    const state = scenario([INK, ATTACK, 'ember_hearth_blade', ATTACK + '+keen'], [ATTACK]);
    const pair = { enchantCardIdx: 0, targetCardIdx: 1 };
    const before = structuredClone(state);
    for (const invalid of [null, {}, [], { enchantCardIdx: -1, targetCardIdx: 1 },
      { enchantCardIdx: 0.5, targetCardIdx: 1 }, { enchantCardIdx: '0', targetCardIdx: 1 },
      { enchantCardIdx: 0, targetCardIdx: 0 }, { enchantCardIdx: 0, targetCardIdx: 2 },
      { enchantCardIdx: 0, targetCardIdx: 3 }, { enchantCardIdx: 0, targetCardIdx: 99 },
      { enchantCardIdx: 1, targetCardIdx: 0 }]) {
      expect(isValidInHandEnchantPair(state.playerTeam[0].hand, invalid)).toBe(false);
      expect(parse(state, { ...action(1), enchantPair: invalid })).toBeNull();
    }
    expect(parse(state, action(2, { enchantPair: pair }))).toBeNull();
    expect(parse(state, action(1, { enchantPair: pair, useSideboardIndex: 0 }))).toBeNull();
    expect(parse(state, action(1, { enchantPair: pair, discardIndices: [0] }))).toBeNull();
    expect(parse(state, action(1, { enchantPair: pair, discardIndices: [1] }))).toBeNull();
    expect(state).toEqual(before);
  });
  it.each([false, true])('refuses standalone Keen Ink from hand/sideboard (sideboard=%s)', sideboard => {
    const state = scenario(sideboard ? [ATTACK] : [INK], sideboard ? [INK] : []);
    const cast = sideboard ? action(null, { useSideboardIndex: 0 }) : action(0);
    expect(parse(state, cast)).toBeNull();
    const resolved = resolveDuelRound(state, [cast], () => 0.1);
    expect(resolved.playerTeam[0].hand).toEqual(state.playerTeam[0].hand);
    expect(resolved.playerTeam[0].sideboard).toEqual(state.playerTeam[0].sideboard);
    expect(resolved.playerTeam[0].discard).not.toContain(INK);
    expect(resolved.enemyTeam[0].hp).toBe(state.enemyTeam[0].hp);
    expect(resolved.logs.some(log => log.includes('cannot cast'))).toBe(true);
  });
  it('does not fuse an attack other than the selected card in the resolver', () => {
    const state = scenario([INK, ATTACK, 'ember_hearth_blade']);
    const result = resolveDuelRound(state, [action(2, { enchantPair: { enchantCardIdx: 0, targetCardIdx: 1 } })], () => 0.1);
    expect(result.playerTeam[0].hand).toContain(INK);
    expect(result.playerTeam[0].hand).toContain(ATTACK);
    expect(result.logs.some(log => log.includes('fused Keen Ink'))).toBe(false);
  });
  it('does not select an enchant as an AI spell', () => {
    const state = scenario([INK]);
    expect(chooseAiAction(state.playerTeam[0], state.enemyTeam).cardIndex).toBeNull();
  });
  it('preserves an existing locally fused card and rejects a second enchant', () => {
    const state = scenario([INK, ATTACK + '+keen']);
    expect(isValidInHandEnchantPair(state.playerTeam[0].hand, { enchantCardIdx: 0, targetCardIdx: 1 })).toBe(false);
    const cast = parse(state, action(1));
    expect(cast).not.toBeNull();
    const resolved = resolveDuelRound(state, [cast!], () => 0.1);
    expect(resolved.playerTeam[0].hand).toContain(INK);
    expect(resolved.playerTeam[0].discard).toContain(ATTACK);
  });
});
