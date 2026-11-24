import { ELEMENTS, type ElementId } from './elements.ts';
import { SPELL_BY_ID, getStarterDeckForElement, getTrialGuardianDeckForElement, getSpellUseLockReason } from './spells.ts';
import {
  drawUpToSeven, computeWizardDerivedStats, ownedCreatureToCombatSlot,
  pickDuelCreatureRoster, type CombatantState, type DuelState,
} from './combat.ts';
import type { WizardDocument } from './economy.ts';

export type SoloDuelMode = 'solo' | 'trial' | 'spire';
export type SoloDuelCreature = Parameters<typeof ownedCreatureToCombatSlot>[0];

export function createSoloDuel(
  wizard: WizardDocument,
  creatures: SoloDuelCreature[],
  mode: SoloDuelMode,
  el: ElementId,
  archmastery: ElementId,
  duelId: string,
  spireFloor?: number,
  random = Math.random,
): DuelState {
  function buildPlayerCombatant(gearlessSpire: boolean): CombatantState {
    const { roster: duelRoster, activeCreatureIdx } = pickDuelCreatureRoster(creatures, wizard.activeCreatureId);
    const activeTalents = duelRoster[activeCreatureIdx]?.talents ?? creatures[0]?.talents ?? [];
    const stats = gearlessSpire
      ? { maxHp: 460, powerPct: 5, accuracyBonus: 2, piercePct: 2, critPct: 10, blockPct: 8 }
      : computeWizardDerivedStats({
          level: wizard.level,
          raceId: wizard.raceId,
          element: wizard.elementId,
          equippedGearIds: Object.values(wizard.wardrobe.equipped),
          socketedRunestoneIds: wizard.wardrobe.socketedRunestones,
          creatureTalents: activeTalents,
        });

    const spellUnlockState = {
      rank: wizard.rank,
      unlockedElements: wizard.progression.unlockedElements,
      unlockedFusions: wizard.progression.unlockedFusions,
    };
    const isSpellUsable = (spellId: string) => {
      const spell = SPELL_BY_ID[spellId];
      return Boolean(spell && !getSpellUseLockReason(spell, spellUnlockState));
    };
    const starterDeck = getStarterDeckForElement(wizard.elementId).filter(isSpellUsable);
    const fallbackDeck = starterDeck.length > 0 ? starterDeck : getStarterDeckForElement('ember');
    const deckList = gearlessSpire ? [...starterDeck] : wizard.progression.deck.filter(isSpellUsable);
    while (deckList.length < 24) deckList.push(fallbackDeck[deckList.length % fallbackDeck.length] ?? 'ember_cinder_dart');
    const shuffled = [...deckList].sort(() => random() - 0.5);
    const sideboard = wizard.progression.sideboard.filter(isSpellUsable);
    // Enchants are in-hand only. Move the already-owned sideboard copies into
    // this duel's draw pile without changing the saved deck or granting cards.
    const enchants = sideboard.filter(id => SPELL_BY_ID[id]?.kind === 'enchant');
    const [openingEnchant, ...remainingEnchants] = enchants;

    const c: CombatantState = {
      id: wizard.id,
      name: wizard.name,
      isPlayer: true,
      raceId: wizard.raceId,
      element: wizard.elementId,
      archmasteryElement: archmastery,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      powerPips: 1,
      regularPips: 1,
      schoolPips: 1,
      accuracyBonus: stats.accuracyBonus,
      powerBonusPct: stats.powerPct,
      piercePct: stats.piercePct,
      critPct: stats.critPct,
      blockPct: stats.blockPct,
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
      deck: openingEnchant ? [openingEnchant, ...shuffled, ...remainingEnchants] : shuffled,
      discard: [],
      sideboard: sideboard.filter(id => SPELL_BY_ID[id]?.kind !== 'enchant'),
      spellwrighting: { ...wizard.progression.spellwrighting },
      creatures: duelRoster.map((pet) => ownedCreatureToCombatSlot(pet)),
      activeCreatureIdx,
    };
    drawUpToSeven(c);
    return c;
  }

  const gearless = mode === 'spire';
  const player = buildPlayerCombatant(gearless);
  const enemyHp =
    mode === 'trial'
      ? 920
      : mode === 'spire'
        ? 380 + (spireFloor ?? 1) * 95
        : 340 + wizard.level * 55;
  const enemyDeck = mode === 'trial' ? getTrialGuardianDeckForElement(el) : getStarterDeckForElement(el);
  const enemy: CombatantState = {
    id: `npc_foe_${duelId}`,
    name:
      mode === 'trial'
        ? `${ELEMENTS[el].name} Trial Guardian`
        : mode === 'spire'
          ? `Spire Sentinel Fl.${spireFloor ?? 1}`
          : `Sky-Duelist (${ELEMENTS[el].name})`,
    isPlayer: false,
    isNpc: true,
    raceId: mode === 'trial' ? 'astral_kin' : 'stoneborn',
    element: el,
    archmasteryElement: el,
    hp: enemyHp,
    maxHp: enemyHp,
    powerPips: mode === 'trial' ? 2 : 1,
    regularPips: 1,
    schoolPips: 0,
    accuracyBonus: mode === 'trial' ? 6 : 0,
    powerBonusPct: mode === 'trial' ? 16 : 4,
    piercePct: mode === 'trial' ? 8 : 0,
    critPct: 10,
    blockPct: 6,
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
    deck: enemyDeck,
    discard: [],
    sideboard: [],
    spellwrighting: {},
    creatures: [],
    activeCreatureIdx: 0,
    bossCheatPattern:
      mode === 'trial' ? (el === 'chronos' ? 'chronos_steal_pip' : 'shield_on_blade') : undefined,
  };
  drawUpToSeven(enemy);

  return {
    duelId,
    mode,
    spireFloor,
    round: 1,
    turnTimerSeconds: null, // Unlimited solo planning time
    arenaBubble: null,
    playerTeam: [player],
    enemyTeam: [enemy],
    firstTeam: 'player',
    phase: 'planning',
    logs: [`Battle engaged against ${enemy.name}! Solo timer: Unlimited.`],
    telegraphedCheat: enemy.bossCheatPattern
      ? 'Boss Cheat Active: Guardian reacts if you stack 2+ Blades or every 3rd Chronos round.'
      : null,
  };
}
