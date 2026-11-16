import {
  applyStatusEffect, computeWizardDerivedStats, grantRoundPips,
  resolveDuelRound, resolveSpellDamage,
} from '../../../shared/combat.ts';
import { SPELL_BY_ID } from '../../../shared/spells.ts';

const dart = 'ember_cinder_dart';
const bolt = 'gale_feather_bolt';

function wizard(id, element, isPlayer, overrides = {}) {
  return {
    id, name: id, element, isPlayer, raceId: 'human', archmasteryElement: element,
    hp: 200, maxHp: 200, regularPips: 2, powerPips: 0, schoolPips: 0,
    accuracyBonus: 0, powerBonusPct: 0, piercePct: 0, critPct: 0, blockPct: 0,
    stunnedTurns: 0, stunBlocks: 0, blades: [], shields: [], traps: [], weaknesses: [],
    prisms: [], dots: [], statusEffects: [], hand: [], deck: [], discard: [],
    sideboard: [], spellwrighting: {}, creatures: [], activeCreatureIdx: 0,
    ...overrides,
  };
}

function duel(playerTeam, enemyTeam, firstTeam = 'player') {
  return {
    duelId: 'cpp-contract', mode: playerTeam.length > 1 ? 'coop' : 'solo',
    round: 1, turnTimerSeconds: null, arenaBubble: null, playerTeam, enemyTeam,
    firstTeam, phase: 'planning', logs: [], telegraphedCheat: null,
  };
}

function action(actorId, targetId, cardIndex = 0) {
  return { actorId, targetId, cardIndex, creatureAction: 'none' };
}

function round(state, actions, rolls, scenario) {
  let next = 0;
  const before = JSON.stringify(state);
  const submitted = JSON.stringify(actions);
  const result = resolveDuelRound(state, actions, () => {
    if (next === rolls.length) throw new Error(`${scenario}: unexpected random draw #${next + 1}`);
    return rolls[next++];
  });
  if (next !== rolls.length) {
    throw new Error(`${scenario}: consumed ${next} of ${rolls.length} fixed random inputs`);
  }
  if (JSON.stringify(state) !== before || JSON.stringify(actions) !== submitted) {
    throw new Error(`${scenario}: the round mutated its input state or actions`);
  }
  return result;
}

function modifier(id, kind, element, pct, targetElement) {
  return { id, kind, element, pct, targetElement, label: id };
}

function status(kind, magnitude, turnsLeft) {
  return { id: kind, kind, label: kind, element: 'ember', magnitude, turnsLeft };
}

const ids = (list) => list.map(({ id }) => id);
const statuses = (actor) => actor.statusEffects.map(({ kind, magnitude, turnsLeft }) => [kind, magnitude, turnsLeft]);
const pips = (actor) => [actor.regularPips, actor.powerPips, actor.schoolPips];

export function observeDamage() {
  function hit(caster, target, options = {}) {
    return resolveSpellDamage({
      caster, target, spell: SPELL_BY_ID[dart], isEnchanted: false,
      bubble: null, critRoll: 0.99, blockRoll: 0.99, ...options,
    });
  }

  const caster = wizard('caster', 'ember', true, {
    piercePct: 10, critPct: 25, spellwrighting: { [dart]: 'B' },
    blades: [
      modifier('older', 'blade', 'frost', 50),
      modifier('matching', 'blade', 'frost', 10),
      modifier('universal', 'blade', 'universal', 20),
      modifier('unrelated', 'blade', 'ember', 40),
    ],
    weaknesses: [modifier('weakness', 'weakness', 'frost', 20)],
  });
  const target = wizard('target', 'ember', false, {
    blockPct: 50,
    prisms: [modifier('convert', 'prism', 'ember', 0, 'frost')],
    traps: [
      modifier('older', 'trap', 'frost', 50),
      modifier('matching', 'trap', 'frost', 25),
      modifier('universal', 'trap', 'universal', 10),
    ],
    shields: [modifier('plain', 'shield', 'frost', 50), modifier('unrelated', 'shield', 'ember', 90)],
  });
  const stacked = hit(caster, target, {
    bubble: { element: 'frost', bonusPct: 20, accuracyPct: 0 },
    critRoll: 0.249, blockRoll: 0.5,
  });
  const criticalCaster = wizard('crit', 'ember', true, { critPct: 25 });
  const blocker = wizard('block', 'gale', false, { blockPct: 50 });
  return {
    neutral: hit(wizard('caster', 'ember', true), wizard('target', 'gale', false)),
    mirror: hit(wizard('caster', 'ember', true), wizard('target', 'ember', false)),
    opposing: hit(wizard('caster', 'ember', true), wizard('target', 'frost', false)),
    'frost-scalar': hit(wizard('caster', 'frost', true), wizard('target', 'ember', false), {
      spell: SPELL_BY_ID.frost_rime_shard,
    }),
    stacked: {
      ...stacked, blades: ids(caster.blades), weaknesses: ids(caster.weaknesses),
      prisms: ids(target.prisms), shields: ids(target.shields), traps: ids(target.traps),
    },
    'crit-at-threshold': hit(criticalCaster, blocker, { critRoll: 0.25, blockRoll: 0.5 }),
    'block-below-threshold': hit(criticalCaster, blocker, { critRoll: 0.249, blockRoll: 0.499 }),
    'unblocked-critical': hit(criticalCaster, blocker, { critRoll: 0.249, blockRoll: 0.5 }),
    'damage-floor': hit(wizard('caster', 'ember', true), wizard('target', 'gale', false, {
      shields: [modifier('full', 'shield', 'universal', 100)],
    })),
  };
}

export function observeHealth() {
  const stats = (level, raceId, element, overrides = {}) => computeWizardDerivedStats({
    level, raceId, element, equippedGearIds: [], socketedRunestoneIds: [],
    creatureTalents: [], ...overrides,
  });
  const activePet = { id: 'pet', speciesId: 'cinder_kitsune', nickname: 'Pet', element: 'ember',
    stage: 1, chromatic: 'none', branchChoice: 'A', hp: 48, maxHp: 50, talents: [] };
  const healed = round(duel([
    wizard('p', 'ember', true, { hp: 90, maxHp: 100, statusEffects: [status('regen', 25, 1)],
      creatures: [activePet, { ...activePet, id: 'reserve', hp: 0 }] }),
  ], [
    wizard('e', 'gale', false, { hp: 10, hand: [bolt], statusEffects: [status('burning', 20, 1)] }),
  ]), [action('e', 'p')], [], 'health caps and knockout');
  const effectTarget = wizard('p', 'ember', true, { stunBlocks: 1 });
  const warded = applyStatusEffect(effectTarget, status('stunned', 1, 1));
  const stunned = applyStatusEffect(effectTarget, status('stunned', 1, 2));
  applyStatusEffect(effectTarget, status('shocked', 10, 3));
  applyStatusEffect(effectTarget, status('shocked', 15, 1));
  const resources = wizard('p', 'ember', true, { regularPips: 4, powerPips: 0, schoolPips: 0 });
  for (const pick of [0.419, 0.42, 0.65, 0]) grantRoundPips(resources, pick);
  return {
    'entry-stats': stats(1, 'human', 'ember'),
    'gear-and-lineage': stats(2, 'stoneborn', 'frost', {
      equippedGearIds: ['hat_pointed_brim', 'missing-fixture-gear'],
      creatureTalents: ['tal_sturdy', 'tal_spellproof'],
    }),
    'level-50-stats': stats(50, 'human', 'ember'),
    'regen-and-knockout': {
      phase: healed.phase, wizardHp: healed.playerTeam[0].hp,
      petHp: healed.playerTeam[0].creatures.map(({ hp }) => hp),
      enemyHp: healed.enemyTeam[0].hp, enemyHand: healed.enemyTeam[0].hand,
      playerStatus: statuses(healed.playerTeam[0]), enemyStatus: statuses(healed.enemyTeam[0]),
    },
    'ward-and-status-refresh': {
      warded, stunned, wards: effectTarget.stunBlocks, stunTurns: effectTarget.stunnedTurns,
      effects: statuses(effectTarget),
    },
    'pip-boundaries': { counts: pips(resources) },
  };
}

export function observeTurns() {
  function lethal(firstTeam, actions) {
    const state = duel([wizard('p', 'gale', true, { hp: 50, hand: [bolt] })],
      [wizard('e', 'gale', false, { hp: 50, hand: [bolt] })], firstTeam);
    const result = round(state, actions, [0.1, 0.8, 0.8], `lethal ${firstTeam} first`);
    return {
      phase: result.phase, hp: [...result.playerTeam, ...result.enemyTeam].map(({ hp }) => hp),
      hands: [result.playerTeam[0].hand, result.enemyTeam[0].hand],
    };
  }
  function allies(actions) {
    const state = duel([wizard('p1', 'ember', true, { hand: [dart] }),
      wizard('p2', 'gale', true, { hand: [bolt] })],
    [wizard('e', 'tide', false, { hp: 500, maxHp: 500 })]);
    const cast = { p1: [0.1, 0.8, 0.8, 0.2], p2: [0.1, 0.8, 0.8] };
    const result = round(state, actions.map((id) => action(id, 'e')),
      [...actions.flatMap((id) => cast[id]), 0.8, 0.8, 0.8], 'same-team order');
    return { lastHit: result.enemyTeam[0].lastHitElement, hp: result.enemyTeam[0].hp };
  }
  const skipped = round(duel([
    wizard('p1', 'ember', true, { hand: [dart], regularPips: 0 }),
    wizard('p2', 'gale', true, { hand: [bolt], stunnedTurns: 1, statusEffects: [status('stunned', 1, 1)] }),
  ], [wizard('e', 'tide', false, { hand: [bolt] })]), [
    action('p1', 'e'), action('p2', 'e'), action('missing', 'e'), action('e', 'p1', 99),
  ], [0.8, 0.8, 0.8], 'skip illegal or unavailable actions');
  return {
    'player-first': lethal('player', [action('e', 'p'), action('p', 'e')]),
    'enemy-first': lethal('enemy', [action('p', 'e'), action('e', 'p')]),
    'allies-forward': allies(['p1', 'p2']),
    'allies-reversed': allies(['p2', 'p1']),
    'unavailable-actions': {
      phase: skipped.phase, hp: skipped.enemyTeam[0].hp,
      hands: [...skipped.playerTeam, ...skipped.enemyTeam].map(({ hand }) => hand),
      pips: skipped.playerTeam.map((actor) => actor.regularPips),
      stunTurns: skipped.playerTeam[1].stunnedTurns, statuses: statuses(skipped.playerTeam[1]),
    },
  };
}

function checkpoint(state) {
  const [p] = state.playerTeam;
  const [e] = state.enemyTeam;
  return { phase: state.phase, round: state.round, hp: [p.hp, e.hp],
    regularPips: [p.regularPips, e.regularPips], cardsCast: [p.discard.length, e.discard.length],
    enemyStatuses: statuses(e) };
}

export function observeReplay() {
  const start = duel([wizard('p', 'ember', true, { hand: [dart, dart] })],
    [wizard('e', 'gale', false, { hp: 220, maxHp: 220, hand: [bolt] })]);
  function run() {
    const one = round(start, [action('p', 'e'), action('e', 'p')],
      [0.1, 0.8, 0.8, 0.22, 0.99, 0.8, 0.8], 'replay round 1');
    const two = round(one, [action('p', 'e', null), action('e', 'p')],
      [0.1, 0.8, 0.8, 0.8, 0.8], 'replay round 2');
    const three = round(two, [action('p', 'e'), action('e', 'p')],
      [0.1, 0.8, 0.8, 0.33], 'replay round 3');
    return [one, two, three];
  }
  const [one, two, three] = run();
  const doubleKo = round(duel([
    wizard('p', 'ember', true, { hp: 10, hand: [dart], statusEffects: [status('burning', 10, 1)] }),
  ], [
    wizard('e', 'gale', false, { hp: 10, hand: [bolt], statusEffects: [status('burning', 10, 1)] }),
  ]), [action('p', 'e'), action('e', 'p')], [], 'mutual status knockout');
  return {
    'round-1': checkpoint(one),
    'round-2': checkpoint(two),
    'round-3': checkpoint(three),
    'repeat-with-same-stream': { identical: JSON.stringify([one, two, three]) === JSON.stringify(run()) },
    'mutual-knockout': checkpoint(doubleKo),
  };
}
