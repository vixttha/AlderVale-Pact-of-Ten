import { describe, expect, it } from 'vitest';
import { ELEMENTS, ELEMENT_LIST, RARE_ELEMENTS, type ElementId } from '../shared/elements.ts';
import {
  SPELLS,
  SPELL_BY_ID,
  getStarterDeckForElement,
  getTrialGuardianDeckForElement,
  getSpellShopLockReason,
  getSpellUseLockReason,
  type SpellUnlockState,
} from '../shared/spells.ts';
import {
  chooseAiAction,
  resolveDuelRound,
  type CombatantState,
  type DuelState,
} from '../shared/combat.ts';

const damageKinds = new Set(['attack', 'aoe', 'drain']);
const starterUnlockState: SpellUnlockState = {
  rank: 1,
  unlockedElements: ['ember', 'frost', 'gale', 'bramble', 'tide', 'spark'],
  unlockedFusions: [],
};

function makeCombatant(id: string, element: ElementId, isPlayer: boolean, hand: string[]): CombatantState {
  return {
    id,
    name: id,
    isPlayer,
    isNpc: !isPlayer,
    raceId: 'human',
    element,
    archmasteryElement: element,
    hp: 1000,
    maxHp: 1000,
    powerPips: 10,
    regularPips: 0,
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
    hand,
    deck: [],
    discard: [],
    sideboard: [],
    spellwrighting: {},
    creatures: [],
    activeCreatureIdx: 0,
  };
}

describe('rare-element starter decks', () => {
  it('includes a native rank-one damage spell for every rare element', () => {
    for (const { id: element } of RARE_ELEMENTS) {
      const deck = getStarterDeckForElement(element);
      expect(
        deck.some((id) => {
          const spell = SPELL_BY_ID[id];
          return spell?.element === element && spell.unlockRank === 1 && damageKinds.has(spell.kind);
        }),
        element,
      ).toBe(true);
    }
  });

  it('does not fill rare starter decks with enchant or reshuffle cards', () => {
    for (const { id: element } of RARE_ELEMENTS) {
      const deck = getStarterDeckForElement(element);
      expect(
        deck.some((id) => ['enchant', 'reshuffle'].includes(SPELL_BY_ID[id]?.kind ?? '')),
        element,
      ).toBe(false);
    }
  });

  it('builds same-element damage-only guardian decks for every element', () => {
    for (const { id: element } of ELEMENT_LIST) {
      const deck = getTrialGuardianDeckForElement(element);
      expect(deck).toHaveLength(26);
      expect(deck.every((id) => SPELL_BY_ID[id]?.element === element), element).toBe(true);
      expect(
        deck.every((id) => damageKinds.has(SPELL_BY_ID[id]?.kind ?? '')),
        element,
      ).toBe(true);
    }
  });

  it('lets each rare trial guardian damage a player with its rank-four native spell', () => {
    for (const { id: element } of RARE_ELEMENTS) {
      const spell = SPELLS.find(
        (entry) => entry.element === element && entry.unlockRank === 4 && damageKinds.has(entry.kind),
      );
      expect(spell, element).toBeDefined();
      const guardianDeck = getTrialGuardianDeckForElement(element);
      expect(guardianDeck, element).toContain(spell!.id);

      const player = makeCombatant('player', 'ember', true, []);
      const guardian = makeCombatant(`guardian-${element}`, element, false, [spell!.id]);
      const state: DuelState = {
        duelId: `trial-${element}`,
        mode: 'trial',
        round: 1,
        turnTimerSeconds: null,
        arenaBubble: null,
        playerTeam: [player],
        enemyTeam: [guardian],
        firstTeam: 'enemy',
        phase: 'planning',
        logs: [],
        telegraphedCheat: null,
      };
      const action = chooseAiAction(guardian, [player]);
      expect(action.cardIndex, element).toBe(0);
      const result = resolveDuelRound(state, [action], () => 0.5);
      expect(result.playerTeam[0].hp, element).toBeLessThan(player.hp);
    }
  });
});

describe('spell progression gates', () => {
  it('requires both rank four and the matching Rare Trial before rare spells can be bought or used', () => {
    const rareSpells = SPELLS.filter(
      (spell) => spell.requiresElementUnlock && ELEMENTS[spell.element].tier === 'rare',
    );
    expect(rareSpells.length).toBeGreaterThan(0);

    for (const spell of rareSpells) {
      expect(getSpellShopLockReason(spell, starterUnlockState), spell.id).toBe('Rank 4 required');
      expect(getSpellUseLockReason(spell, starterUnlockState), spell.id).toBe('Rank 4 required');

      const rankFour = { ...starterUnlockState, rank: 4 };
      const trialReason = `Complete the ${ELEMENTS[spell.element].name} Rare Trial`;
      expect(getSpellShopLockReason(spell, rankFour), spell.id).toBe(trialReason);
      expect(getSpellUseLockReason(spell, rankFour), spell.id).toBe(trialReason);

      const trialCleared = {
        ...rankFour,
        unlockedElements: [...rankFour.unlockedElements, spell.element],
      };
      expect(getSpellShopLockReason(spell, trialCleared), spell.id).toBeNull();
      expect(getSpellUseLockReason(spell, trialCleared), spell.id).toBeNull();
    }
  });

  it('requires rank and the fusion unlock before a fusion spell can be used', () => {
    const magma = SPELL_BY_ID.magma_tectonic;
    expect(getSpellShopLockReason(magma, starterUnlockState)).toBe('Rank 3 required');
    const rankThree = { ...starterUnlockState, rank: 3 };
    expect(getSpellShopLockReason(magma, rankThree)).toBe('Unlock Magma Fusion');
    expect(
      getSpellShopLockReason(magma, { ...rankThree, unlockedFusions: ['magma'] }),
    ).toBeNull();
  });

  it('preserves rank-two starter cards while blocking higher-rank cards below their threshold', () => {
    expect(getSpellUseLockReason(SPELL_BY_ID.frost_stasis_chime, starterUnlockState)).toBeNull();
    expect(getSpellUseLockReason(SPELL_BY_ID.ember_meteor_roar, starterUnlockState)).toBe('Rank 3 required');
    expect(getSpellUseLockReason(SPELL_BY_ID.sol_sunbeam, starterUnlockState)).toBeNull();
  });
});
