import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveDuelRound } from '../../../shared/combat.ts';
import { SPELL_BY_ID } from '../../../shared/spells.ts';

function wizard(id, isPlayer, piles = [[], [], [], []]) {
  const [hand, deck, discard, sideboard] = piles;
  return {
    id, name: id, isPlayer, element: 'ember', raceId: 'human', archmasteryElement: 'ember',
    hp: 1000, maxHp: 1000, regularPips: 7, powerPips: 0, schoolPips: 0,
    accuracyBonus: 0, powerBonusPct: 0, piercePct: 0, critPct: 0, blockPct: 0,
    stunnedTurns: 0, stunBlocks: 0, blades: [], shields: [], traps: [], weaknesses: [],
    prisms: [], dots: [], statusEffects: [], hand, deck, discard, sideboard,
    spellwrighting: {}, creatures: [], activeCreatureIdx: 0,
  };
}

const pass = { actorId: 'player', targetId: 'opponent', cardIndex: null, creatureAction: 'none' };
const parseList = (value) => value === '' ? [] : value.split(',');
const parseIndex = (value) => value === '' ? null : Number(value);

function resolve(state, action, firstRoll, label) {
  const before = structuredClone(state);
  const result = resolveDuelRound(state, [action], () => {
    const usedRoll = firstRoll;
    firstRoll = 0.99;
    return usedRoll;
  });
  assert.deepEqual(state, before, label + ' mutated round input');
  assert.equal(result.phase, 'planning', label);
  assert.equal(result.round, state.round + 1, label);
  return result;
}

if (process.argv.length !== 3) throw new Error('Usage: observe-cards.mjs FIXTURES.tsv');
const fixtures = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
assert.ok(fixtures.length > 0, 'No spell-card fixtures');
for (const line of fixtures) {
  const fields = line.split('\t');
  assert.equal(fields.length, 12, 'Invalid fixture row: ' + line);
  const [caseId, name, hand, deck, discard, sideboard, selected, discarded, ink, target, side, roll] = fields;
  const label = caseId + ' ' + name;
  const piles = [hand, deck, discard, sideboard].map(parseList);
  for (const id of piles.flat()) assert.ok(SPELL_BY_ID[id], label + ': unknown fixture card ' + id);
  const action = {
    ...pass, cardIndex: parseIndex(selected), discardIndices: parseList(discarded).map(Number),
    ...(ink === '' ? {} : { enchantPair: { enchantCardIdx: Number(ink), targetCardIdx: Number(target) } }),
    ...(side === '' ? {} : { useSideboardIndex: Number(side) }),
  };
  const state = {
    duelId: 'haskell-card-contract', mode: 'solo', round: 1, turnTimerSeconds: null,
    arenaBubble: null, playerTeam: [wizard('player', true, piles)], enemyTeam: [wizard('opponent', false)],
    firstTeam: 'player', phase: 'planning', logs: [], telegraphedCheat: null,
  };
  const afterAction = resolve(state, action, Number(roll), label);
  const afterPass = resolve(afterAction, pass, 0.99, label + ' follow-up');
  for (const [checkpoint, result] of [afterAction, afterPass].entries()) {
    const player = result.playerTeam[0];
    const observed = [player.hand, player.deck, player.discard, player.sideboard].map(cards => cards.join(','));
    console.log([caseId, name, checkpoint + 1, ...observed].join('\t'));
  }
}
