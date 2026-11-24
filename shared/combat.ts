import { ELEMENTS, getElementMatchupMultiplier, type ElementId } from './elements.ts';
import { SPELL_BY_ID, type SpellDefinition } from './spells.ts';
import { SPECIES_BY_ID, type ChromaticVariant } from './creatures.ts';
import { RACES, GEAR_BY_ID, RUNESTONES, type RaceId } from './wardrobe.ts';

export type StatusEffectKind = 'burning' | 'stunned' | 'regen' | 'frostbite' | 'shocked';

export interface StatusEffectInstance {
  id: string;
  kind: StatusEffectKind;
  label: string;
  element: ElementId;
  /** Per-turn damage/heal for burning/regen/frostbite, or accuracy % penalty for shocked */
  magnitude: number;
  turnsLeft: number;
}

export const STATUS_EFFECT_META: Record<
  StatusEffectKind,
  { name: string; polarity: 'buff' | 'debuff'; description: string }
> = {
  burning: {
    name: 'Burning',
    polarity: 'debuff',
    description: 'Deals fire damage at the start of each round.',
  },
  stunned: {
    name: 'Stunned',
    polarity: 'debuff',
    description: 'Skips the next turn until stun wears off.',
  },
  regen: {
    name: 'Regen',
    polarity: 'buff',
    description: 'Restores Wizard and Active Creature HP at the start of each round.',
  },
  frostbite: {
    name: 'Frostbite',
    polarity: 'debuff',
    description: 'Deals chill damage each round and lowers outgoing spell damage by 15%.',
  },
  shocked: {
    name: 'Shocked',
    polarity: 'debuff',
    description: 'Static interference lowers outgoing spell accuracy.',
  },
};

export interface ActiveModifier {
  id: string;
  label: string;
  kind: 'blade' | 'shield' | 'trap' | 'weakness' | 'prism';
  element: ElementId | 'universal';
  pct: number; // e.g. 35 for +35% blade or 50 for -50% shield
  targetElement?: ElementId; // for prism
}

export interface CombatCreatureSlot {
  id: string;
  speciesId: string;
  nickname: string;
  element: ElementId;
  stage: 1 | 2 | 3;
  chromatic: ChromaticVariant;
  branchChoice: 'A' | 'B';
  hp: number;
  maxHp: number;
  talents: string[];
}

export interface CombatantState {
  id: string;
  name: string;
  isPlayer: boolean;
  isNpc?: boolean;
  raceId: RaceId;
  element: ElementId;
  archmasteryElement: ElementId;
  hp: number;
  maxHp: number;
  powerPips: number; // Counts as 2 for primary or archmastery school
  regularPips: number;
  schoolPips: number; // Dynamic Archmastery pips
  accuracyBonus: number;
  powerBonusPct: number;
  piercePct: number;
  critPct: number;
  blockPct: number;
  stunnedTurns: number;
  stunBlocks: number;
  blades: ActiveModifier[];
  shields: ActiveModifier[];
  traps: ActiveModifier[];
  weaknesses: ActiveModifier[];
  prisms: ActiveModifier[];
  dots: { element: ElementId; perTurn: number; turnsLeft: number }[];
  statusEffects: StatusEffectInstance[];
  hand: string[]; // up to 7 cards (can carry '+keen' suffix for In-Hand Enchant Fusion)
  deck: string[];
  discard: string[];
  sideboard: string[];
  spellwrighting: Record<string, 'A' | 'B'>;
  creatures: CombatCreatureSlot[];
  activeCreatureIdx: number;
  bossCheatPattern?: 'shield_on_blade' | 'prism_shift' | 'chronos_steal_pip';
  lastHitElement?: ElementId;
}

export interface DuelState {
  duelId: string;
  mode: 'solo' | 'trial' | 'pvp' | 'coop' | 'spire';
  spireFloor?: number;
  round: number;
  turnTimerSeconds: number | null; // null = unlimited solo time; 30 for PvP/Co-op
  arenaBubble: { element: ElementId; bonusPct: number; accuracyPct: number } | null;
  playerTeam: CombatantState[];
  enemyTeam: CombatantState[];
  firstTeam: 'player' | 'enemy';
  phase: 'planning' | 'resolving' | 'victory' | 'defeat' | 'draw' | 'fled';
  logs: string[];
  /** Telegraphed Boss Cheat warning for next turn */
  telegraphedCheat: string | null;
}

export function isDuelComplete(phase: DuelState['phase']): boolean {
  return phase === 'victory' || phase === 'defeat' || phase === 'draw';
}

export interface WizardDerivedStats {
  maxHp: number;
  powerPct: number;
  accuracyBonus: number;
  piercePct: number;
  critPct: number;
  blockPct: number;
}

export function computeWizardDerivedStats(params: {
  level: number;
  raceId: RaceId;
  element: ElementId;
  equippedGearIds: string[];
  socketedRunestoneIds: string[];
  creatureTalents: string[];
}): WizardDerivedStats {
  const race = RACES[params.raceId];
  const el = ELEMENTS[params.element];

  let hp = 420 + (params.level - 1) * 55;
  let powerPct = (params.level - 1) * 2;
  let accuracyBonus = 0;
  let piercePct = 0;

  for (const gid of params.equippedGearIds) {
    const item = GEAR_BY_ID[gid];
    if (item) {
      hp += item.stats.hp;
      powerPct += item.stats.powerPct;
      accuracyBonus += item.stats.accuracyPct;
      piercePct += item.stats.piercePct;
    }
  }

  for (const rid of params.socketedRunestoneIds) {
    const rune = RUNESTONES.find((r) => r.id === rid);
    if (rune) {
      hp += rune.bonusHp;
      powerPct += rune.bonusPowerPct;
      accuracyBonus += rune.bonusAccuracyPct;
      piercePct += rune.bonusPiercePct;
    }
  }

  if (params.creatureTalents.includes('tal_sturdy')) hp += 45;
  if (params.creatureTalents.includes('tal_spellproof')) powerPct += 5;

  if (race.passiveBonus.hpBonusPct) hp = Math.round(hp * (1 + race.passiveBonus.hpBonusPct / 100));
  if (race.passiveBonus.powerBonusPct) powerPct += race.passiveBonus.powerBonusPct;
  if (race.passiveBonus.accuracyBonus) accuracyBonus += race.passiveBonus.accuracyBonus;
  if (race.passiveBonus.pierceBonus) piercePct += race.passiveBonus.pierceBonus;

  return {
    maxHp: hp,
    powerPct,
    accuracyBonus,
    piercePct,
    critPct: el.baseCritPct + Math.floor(params.level * 0.8),
    blockPct: 6 + Math.floor(params.level * 0.6),
  };
}

export function applyStatusEffect(target: CombatantState, effect: StatusEffectInstance): boolean {
  if (effect.kind === 'stunned') {
    if (target.stunBlocks > 0) {
      target.stunBlocks -= 1;
      return false;
    }
    target.stunnedTurns = Math.max(target.stunnedTurns, effect.turnsLeft);
  }

  const existing = target.statusEffects.find((s) => s.kind === effect.kind);
  if (existing) {
    existing.turnsLeft = Math.max(existing.turnsLeft, effect.turnsLeft);
    existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
    existing.label = effect.label;
    existing.element = effect.element;
  } else {
    target.statusEffects.push({ ...effect });
  }
  return true;
}

export function totalAvailablePipsForSchool(c: CombatantState, school: ElementId): number {
  const countsDouble = school === c.element || school === c.archmasteryElement;
  return c.regularPips + (countsDouble ? (c.powerPips + c.schoolPips) * 2 : c.powerPips + c.schoolPips);
}

export function spendPipsForSpell(c: CombatantState, spellCost: number, school: ElementId): boolean {
  if (spellCost <= 0) return true;
  if (totalAvailablePipsForSchool(c, school) < spellCost) return false;
  let remaining = spellCost;
  const countsDouble = school === c.element || school === c.archmasteryElement;

  if (countsDouble) {
    while (remaining >= 2 && c.schoolPips > 0) {
      c.schoolPips -= 1;
      remaining -= 2;
    }
    while (remaining >= 2 && c.powerPips > 0) {
      c.powerPips -= 1;
      remaining -= 2;
    }
  }
  while (remaining >= 1 && c.regularPips > 0) {
    c.regularPips -= 1;
    remaining -= 1;
  }
  while (remaining >= 1 && c.powerPips > 0) {
    c.powerPips -= 1;
    remaining -= countsDouble ? 2 : 1;
  }
  while (remaining >= 1 && c.schoolPips > 0) {
    c.schoolPips -= 1;
    remaining -= countsDouble ? 2 : 1;
  }
  return true;
}

export function grantRoundPips(c: CombatantState, rngVal: number) {
  const totalCount = c.regularPips + c.powerPips + c.schoolPips;
  if (totalCount >= 7) return;
  if (rngVal < 0.42) {
    c.powerPips += 1;
  } else if (rngVal < 0.65) {
    c.schoolPips += 1;
  } else {
    c.regularPips += 1;
  }
}

export function drawUpToSeven(c: CombatantState) {
  while (c.hand.length < 7 && c.deck.length > 0) {
    const next = c.deck.shift();
    if (next) c.hand.push(next);
  }
}

export interface TurnActionInput {
  actorId: string;
  cardIndex: number | null; // null = pass
  useSideboardIndex?: number | null;
  targetId: string;
  creatureAction: 'skill' | 'swap' | 'none';
  swapCreatureIdx?: number;
  discardIndices?: number[];
  enchantPair?: { enchantCardIdx: number; targetCardIdx: number };
  archmasteryElement?: ElementId;
}

/** Only a real, unenchanted attack in the same hand may receive Keen Ink. */
export function isValidInHandEnchantPair(
  hand: readonly string[], value: unknown,
): value is NonNullable<TurnActionInput['enchantPair']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { enchantCardIdx, targetCardIdx } = value as Partial<NonNullable<TurnActionInput['enchantPair']>>;
  const inHand = (index: unknown): index is number =>
    typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < hand.length;
  return inHand(enchantCardIdx) && inHand(targetCardIdx) && enchantCardIdx !== targetCardIdx &&
    SPELL_BY_ID[hand[enchantCardIdx]]?.kind === 'enchant' &&
    ['attack', 'drain', 'aoe'].includes(SPELL_BY_ID[hand[targetCardIdx]]?.kind ?? '');
}

export function resolveSpellDamage(params: {
  caster: CombatantState;
  target: CombatantState;
  spell: SpellDefinition;
  isEnchanted: boolean;
  bubble: DuelState['arenaBubble'];
  critRoll: number;
  blockRoll: number;
  coopResonanceBonus?: boolean;
}): { damage: number; crit: boolean; finalElement: ElementId } {
  const { caster, target, spell, isEnchanted, bubble, critRoll, blockRoll, coopResonanceBonus } = params;
  const wright = caster.spellwrighting[spell.id];
  let dmg = spell.baseValue + (isEnchanted ? 65 : 0);
  if (wright === 'A' && spell.wrightA) dmg += spell.wrightA.deltaValue;

  dmg = dmg * (1 + caster.powerBonusPct / 100) * ELEMENTS[spell.element].powerScalar;
  if (coopResonanceBonus) dmg *= 1.15;

  // Frostbite reduces outgoing spell damage by 15%
  if (caster.statusEffects?.some((s) => s.kind === 'frostbite')) {
    dmg *= 0.85;
  }

  let activeEl: ElementId = spell.element;
  // Consume matching prism if present (LIFO)
  const prismIdx = findLastMatchingIndex(target.prisms, activeEl);
  if (prismIdx >= 0) {
    const prism = target.prisms.splice(prismIdx, 1)[0];
    if (prism.targetElement) activeEl = prism.targetElement;
  }

  // Arena bubble
  if (bubble && bubble.element === activeEl) {
    dmg *= 1 + bubble.bonusPct / 100;
  }

  // Caster blades (LIFO pop matching)
  const usedBlades = consumeMatchingLIFO(caster.blades, activeEl, 2);
  for (const b of usedBlades) dmg *= 1 + b.pct / 100;

  // Caster weaknesses
  const weak = consumeOneLIFO(caster.weaknesses, activeEl);
  if (weak) dmg *= Math.max(0.25, 1 - weak.pct / 100);

  // Target traps (LIFO)
  const usedTraps = consumeMatchingLIFO(target.traps, activeEl, 2);
  for (const t of usedTraps) dmg *= 1 + t.pct / 100;

  // Element opposing/mirror multiplier
  dmg *= getElementMatchupMultiplier(activeEl, target.element);

  // Target shields (LIFO), reduced by caster pierce + Spellwrighting B
  const pierceBonus = wright === 'B' && spell.wrightB?.bonusEffect === 'pierce_15' ? 15 : 0;
  const totalPierce = Math.min(80, caster.piercePct + pierceBonus);
  const shield = consumeOneLIFO(target.shields, activeEl);
  if (shield) {
    const effectiveBlock = Math.max(0, shield.pct - totalPierce);
    dmg *= 1 - effectiveBlock / 100;
  }

  // Crit vs Block
  const isCrit = critRoll < caster.critPct / 100 && blockRoll >= target.blockPct / 100;
  if (isCrit) dmg *= 1.5;

  return { damage: Math.max(1, Math.round(dmg)), crit: isCrit, finalElement: activeEl };
}

function findLastMatchingIndex(list: ActiveModifier[], el: ElementId): number {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].element === el || list[i].element === 'universal') return i;
  }
  return -1;
}

function consumeOneLIFO(list: ActiveModifier[], el: ElementId): ActiveModifier | null {
  const idx = findLastMatchingIndex(list, el);
  if (idx < 0) return null;
  return list.splice(idx, 1)[0];
}

function consumeMatchingLIFO(list: ActiveModifier[], el: ElementId, maxCount: number): ActiveModifier[] {
  const out: ActiveModifier[] = [];
  while (out.length < maxCount) {
    const item = consumeOneLIFO(list, el);
    if (!item) break;
    out.push(item);
  }
  return out;
}

export function resolveDuelRound(state: DuelState, actions: TurnActionInput[], rng: () => number = Math.random): DuelState {
  const next: DuelState = structuredClone(state);
  next.phase = 'resolving';
  const roundLogs: string[] = [`— Round ${next.round} —`];
  let effectSequence = 0;
  const nextEffectId = (source: 'pet' | 'wright') => `${source}_${next.round}_${effectSequence++}`;

  const allCombatants = [...next.playerTeam, ...next.enemyTeam];
  for (const c of allCombatants) {
    if (!Array.isArray(c.statusEffects)) c.statusEffects = [];
  }
  const findActor = (id: string) => allCombatants.find((c) => c.id === id);

  const selectedHandIndices = new Map<TurnActionInput, number>();
  // 1. Pre-resolution hand cycling, archmastery shift, enchant fusion & creature swap
  for (const act of actions) {
    const actor = findActor(act.actorId);
    if (!actor || actor.hp <= 0) continue;
    if (act.archmasteryElement) actor.archmasteryElement = act.archmasteryElement;

    const originalIndices = actor.hand.map((_, index) => index);
    if (isValidInHandEnchantPair(actor.hand, act.enchantPair) &&
        act.useSideboardIndex == null &&
        !act.discardIndices?.some(index =>
          index === act.enchantPair!.enchantCardIdx || index === act.enchantPair!.targetCardIdx)) {
      const { enchantCardIdx, targetCardIdx } = act.enchantPair;
      const tgtId = actor.hand[targetCardIdx];
      actor.hand[targetCardIdx] = `${tgtId}+keen`;
      actor.hand.splice(enchantCardIdx, 1);
      originalIndices.splice(enchantCardIdx, 1);
      roundLogs.push(`${actor.name} fused Keen Ink onto ${SPELL_BY_ID[tgtId].name}!`);
    }

    const discard = new Set(act.discardIndices ?? []);
    for (let index = actor.hand.length - 1; index >= 0; index--) {
      if (discard.has(originalIndices[index])) {
        const [removed] = actor.hand.splice(index, 1);
        actor.discard.push(removed);
        originalIndices.splice(index, 1);
      }
    }
    if (act.cardIndex !== null) {
      const selected = originalIndices.indexOf(act.cardIndex);
      if (selected >= 0) selectedHandIndices.set(act, selected);
    }
    if (discard.size) drawUpToSeven(actor);

    if (act.creatureAction === 'swap' && typeof act.swapCreatureIdx === 'number') {
      const targetSlot = actor.creatures[act.swapCreatureIdx];
      if (targetSlot && targetSlot.hp > 0) {
        actor.activeCreatureIdx = act.swapCreatureIdx;
        roundLogs.push(`${actor.name} tagged in ${targetSlot.nickname}!`);
      }
    }
  }

  // 2. Tick Start-of-Round Status Effects (Burning, Frostbite, Regen, Shocked) & Legacy DoTs
  for (const actor of allCombatants) {
    if (actor.hp <= 0) continue;
    for (let i = actor.dots.length - 1; i >= 0; i--) {
      const dot = actor.dots[i];
      actor.hp = Math.max(0, actor.hp - dot.perTurn);
      dot.turnsLeft -= 1;
      roundLogs.push(`${actor.name} took ${dot.perTurn} ${ELEMENTS[dot.element].name} burn damage.`);
      if (dot.turnsLeft <= 0) actor.dots.splice(i, 1);
    }

    for (let i = actor.statusEffects.length - 1; i >= 0; i--) {
      const st = actor.statusEffects[i];
      if (st.kind === 'burning' || st.kind === 'frostbite') {
        actor.hp = Math.max(0, actor.hp - st.magnitude);
        st.turnsLeft -= 1;
        roundLogs.push(
          `${actor.name} suffered ${st.magnitude} ${STATUS_EFFECT_META[st.kind].name} damage (${st.turnsLeft}t left).`,
        );
        if (st.turnsLeft <= 0) actor.statusEffects.splice(i, 1);
      } else if (st.kind === 'regen') {
        const before = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + st.magnitude);
        const healed = actor.hp - before;
        const pet = actor.creatures[actor.activeCreatureIdx];
        if (pet && pet.hp > 0) {
          pet.hp = Math.min(pet.maxHp, pet.hp + Math.round(st.magnitude * 0.5));
        }
        st.turnsLeft -= 1;
        roundLogs.push(`${actor.name} regenerated +${healed} HP (${st.turnsLeft}t left).`);
        if (st.turnsLeft <= 0) actor.statusEffects.splice(i, 1);
      } else if (st.kind === 'shocked') {
        st.turnsLeft -= 1;
        if (st.turnsLeft <= 0) {
          actor.statusEffects.splice(i, 1);
          roundLogs.push(`${actor.name}'s Shocked static cleared.`);
        }
      }
    }
  }

  // Cross-Wizard Co-op Resonance check: two allied players casting matching or complementary spells
  const playerActions = actions.filter((a) => next.playerTeam.some((p) => p.id === a.actorId && p.hp > 0));
  const coopResonance = playerActions.length >= 2 && playerActions.every((a) => a.cardIndex !== null);

  // Order execution by turn coin
  const orderedActions = [...actions].sort((a, b) => {
    const aIsPlayer = next.playerTeam.some((p) => p.id === a.actorId);
    const bIsPlayer = next.playerTeam.some((p) => p.id === b.actorId);
    if (aIsPlayer === bIsPlayer) return 0;
    return next.firstTeam === 'player' ? (aIsPlayer ? -1 : 1) : (aIsPlayer ? 1 : -1);
  });

  // 3. Execute Wizard Card + Creature Skill
  for (const act of orderedActions) {
    const actor = findActor(act.actorId);
    if (!actor || actor.hp <= 0) continue;

    const stunnedEffectIdx = actor.statusEffects.findIndex((s) => s.kind === 'stunned');
    if (actor.stunnedTurns > 0 || stunnedEffectIdx >= 0) {
      actor.stunnedTurns = Math.max(0, actor.stunnedTurns - 1);
      if (stunnedEffectIdx >= 0) {
        actor.statusEffects[stunnedEffectIdx].turnsLeft -= 1;
        if (actor.statusEffects[stunnedEffectIdx].turnsLeft <= 0) {
          actor.statusEffects.splice(stunnedEffectIdx, 1);
        }
      }
      roundLogs.push(`${actor.name} is Stunned and skips this turn!`);
      continue;
    }

    // Wizard Spell
    const chosenHandIndex = selectedHandIndices.get(act);
    let rawCardId: string | null = null;
    let fromSideboard = false;
    if (typeof act.useSideboardIndex === 'number' && act.useSideboardIndex >= 0 && act.useSideboardIndex < actor.sideboard.length) {
      rawCardId = actor.sideboard[act.useSideboardIndex];
      fromSideboard = true;
    } else if (chosenHandIndex !== undefined) {
      rawCardId = actor.hand[chosenHandIndex];
    }

    if (rawCardId) {
      const isEnchanted = rawCardId.endsWith('+keen');
      const baseId = rawCardId.replace('+keen', '');
      const spell = SPELL_BY_ID[baseId];
      const target = findActor(act.targetId) ?? (next.playerTeam.includes(actor) ? next.enemyTeam[0] : next.playerTeam[0]);

      if (spell && target) {
        if (spell.kind === 'enchant') {
          roundLogs.push(`${actor.name} cannot cast ${spell.name} directly; it must fuse onto an attack.`);
        } else if (totalAvailablePipsForSchool(actor, spell.element) < spell.pipCost) {
          roundLogs.push(`${actor.name} lacked pips for ${spell.name} and passed.`);
        } else {
          // Accuracy Check (Classic Fizzle = full Pip refund!)
          const wrightAcc = actor.spellwrighting[spell.id] === 'A' ? (spell.wrightA?.deltaAccuracy ?? 0) : 0;
          const bubbleAcc = next.arenaBubble?.element === spell.element ? next.arenaBubble.accuracyPct : 0;
          const shockedPenalty = actor.statusEffects
            .filter((s) => s.kind === 'shocked')
            .reduce((sum, s) => sum + s.magnitude, 0);
          const finalAcc = Math.max(
            15,
            Math.min(100, spell.accuracy + actor.accuracyBonus + wrightAcc + bubbleAcc + (isEnchanted ? 8 : 0) - shockedPenalty),
          );
          const roll = rng() * 100;

          if (roll > finalAcc) {
            roundLogs.push(`${actor.name}'s ${spell.name} FIZZLED (${Math.round(finalAcc)}% acc) — Pips refunded!`);
          } else {
            spendPipsForSpell(actor, spell.pipCost, spell.element);
            if (fromSideboard && typeof act.useSideboardIndex === 'number') {
              actor.sideboard.splice(act.useSideboardIndex, 1);
            } else if (chosenHandIndex !== undefined) {
              actor.hand.splice(chosenHandIndex, 1);
              actor.discard.push(baseId);
            }

            executeSpellEffect(next, actor, target, spell, isEnchanted, coopResonance && next.playerTeam.includes(actor), rng, roundLogs, nextEffectId);
          }
        }
      }
    } else {
      roundLogs.push(`${actor.name} conserved Pips.`);
    }

    // Creature Simultaneous Skill
    const activePet = actor.creatures[actor.activeCreatureIdx];
    if (act.creatureAction === 'skill' && activePet && activePet.hp > 0) {
      const sp = SPECIES_BY_ID[activePet.speciesId];
      const target = findActor(act.targetId) ?? (next.playerTeam.includes(actor) ? next.enemyTeam[0] : next.playerTeam[0]);
      if (sp && target) {
        const skill = activePet.branchChoice === 'A' ? sp.branchA : sp.branchB;
        const stageScale = activePet.stage === 3 ? 1.35 : activePet.stage === 2 ? 1.15 : 1.0;
        if (skill.kind === 'strike') {
          const petDmg = Math.round(skill.value * stageScale * getElementMatchupMultiplier(activePet.element, target.element));
          target.hp = Math.max(0, target.hp - petDmg);
          roundLogs.push(`${activePet.nickname} used ${skill.name} for ${petDmg} ${ELEMENTS[activePet.element].name} damage!`);
        } else if (skill.kind === 'buff') {
          actor.blades.push({ id: nextEffectId('pet'), label: `${activePet.nickname} +${skill.value}%`, kind: 'blade', element: activePet.element, pct: skill.value });
          roundLogs.push(`${activePet.nickname} boosted ${actor.name} (+${skill.value}% Blade).`);
        } else if (skill.kind === 'shield') {
          actor.shields.push({ id: nextEffectId('pet'), label: `${activePet.nickname} -${skill.value}%`, kind: 'shield', element: 'universal', pct: skill.value });
          roundLogs.push(`${activePet.nickname} wrapped ${actor.name} in -${skill.value}% Ward.`);
        } else if (skill.kind === 'heal') {
          const healAmt = Math.round(skill.value * stageScale);
          actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
          roundLogs.push(`${activePet.nickname} mended ${actor.name} for +${healAmt} HP.`);
        } else if (skill.kind === 'debuff') {
          target.traps.push({ id: nextEffectId('pet'), label: `${activePet.nickname} Trap +${skill.value}%`, kind: 'trap', element: activePet.element, pct: skill.value });
          roundLogs.push(`${activePet.nickname} set a +${skill.value}% Trap on ${target.name}.`);
        }
      }
    }
  }

  // 4. Boss Cheats (Telegraphed)
  for (const boss of next.enemyTeam) {
    if (boss.hp <= 0 || !boss.bossCheatPattern) continue;
    if (boss.bossCheatPattern === 'shield_on_blade' && next.playerTeam.some((p) => p.blades.length >= 2)) {
      boss.shields.push({ id: `cheat_${next.round}`, label: 'Guardian Ward -40%', kind: 'shield', element: 'universal', pct: 40 });
      roundLogs.push(`BOSS CHEAT: ${boss.name} reacted to stacked Blades with a -40% Ward!`);
    } else if (boss.bossCheatPattern === 'chronos_steal_pip' && next.round % 3 === 0) {
      const victim = next.playerTeam.find((p) => p.hp > 0 && p.regularPips > 0);
      if (victim) {
        victim.regularPips -= 1;
        boss.powerPips += 1;
        roundLogs.push(`BOSS CHEAT: ${boss.name} siphoned 1 Pip into a Power Pip!`);
      }
    }
  }

  // 5. End-of-round Pip gain & Card draw & Victory check
  const playersAlive = next.playerTeam.some((p) => p.hp > 0);
  const enemiesAlive = next.enemyTeam.some((e) => e.hp > 0);

  if (!playersAlive && !enemiesAlive) {
    next.phase = 'draw';
    roundLogs.push('Draw. Both sides were knocked out.');
  } else if (!enemiesAlive) {
    next.phase = 'victory';
    roundLogs.push('Victory! All opponents defeated.');
  } else if (!playersAlive) {
    next.phase = 'defeat';
    roundLogs.push('Defeated in the ring. You can try again.');
  } else {
    next.round += 1;
    next.phase = 'planning';
    for (const c of allCombatants) {
      if (c.hp > 0) {
        grantRoundPips(c, rng());
        drawUpToSeven(c);
      }
    }
    const boss = next.enemyTeam.find((e) => e.hp > 0 && e.bossCheatPattern);
    next.telegraphedCheat = boss
      ? boss.bossCheatPattern === 'shield_on_blade'
        ? 'Warning: Stacking 2+ Blades triggers Guardian Ward (-40%).'
        : boss.bossCheatPattern === 'chronos_steal_pip' && next.round % 3 === 0
          ? 'Warning: Chronos Warden will siphon 1 Pip this round!'
          : null
      : null;
  }

  next.logs = [...next.logs.slice(-24), ...roundLogs];
  return next;
}

function applySpellStatusEffect(
  actor: CombatantState,
  target: CombatantState,
  spell: SpellDefinition,
  finalElement: ElementId,
  rng: () => number,
  logs: string[],
) {
  if (spell.dotDamage && spell.dotTurns) {
    applyStatusEffect(target, {
      id: `burn_${spell.id}_${rng()}`,
      kind: 'burning',
      label: `Burning (${spell.dotDamage}/t)`,
      element: finalElement,
      magnitude: spell.dotDamage,
      turnsLeft: spell.dotTurns,
    });
    logs.push(`${target.name} caught Burning (${spell.dotDamage} dmg/turn for ${spell.dotTurns}t)!`);
  }

  if (spell.appliesStatus) {
    const recipient = spell.appliesStatus.target === 'self' ? actor : target;
    const applied = applyStatusEffect(recipient, {
      id: `st_${spell.id}_${rng()}`,
      kind: spell.appliesStatus.kind,
      label: `${STATUS_EFFECT_META[spell.appliesStatus.kind].name}`,
      element: spell.element,
      magnitude: spell.appliesStatus.magnitude,
      turnsLeft: spell.appliesStatus.turns,
    });
    if (applied) {
      logs.push(
        `${recipient.name} gained ${STATUS_EFFECT_META[spell.appliesStatus.kind].name} (${spell.appliesStatus.turns}t)!`,
      );
    } else {
      logs.push(`${recipient.name}'s Anchor Conviction blocked ${STATUS_EFFECT_META[spell.appliesStatus.kind].name}!`);
    }
  }
}

function executeSpellEffect(
  state: DuelState,
  actor: CombatantState,
  target: CombatantState,
  spell: SpellDefinition,
  isEnchanted: boolean,
  coopResonance: boolean,
  rng: () => number,
  logs: string[],
  nextEffectId: (source: 'wright') => string,
) {
  const actorInPlayerTeam = state.playerTeam.some((p) => p.id === actor.id);
  const foes = actorInPlayerTeam ? state.enemyTeam : state.playerTeam;
  const allies = actorInPlayerTeam ? state.playerTeam : state.enemyTeam;

  if (spell.kind === 'attack' || spell.kind === 'drain') {
    const res = resolveSpellDamage({ caster: actor, target, spell, isEnchanted, bubble: state.arenaBubble, critRoll: rng(), blockRoll: rng(), coopResonanceBonus: coopResonance });
    target.hp = Math.max(0, target.hp - res.damage);
    target.lastHitElement = res.finalElement;
    if (spell.kind === 'drain') {
      const healed = Math.round(res.damage * 0.5);
      actor.hp = Math.min(actor.maxHp, actor.hp + healed);
      logs.push(`${actor.name} cast ${spell.name}${res.crit ? ' (CRIT!)' : ''} -> ${res.damage} dmg & drained +${healed} HP!`);
    } else {
      logs.push(`${actor.name} cast ${spell.name}${res.crit ? ' (CRIT!)' : ''} on ${target.name} for ${res.damage} dmg!`);
    }
    applySpellStatusEffect(actor, target, spell, res.finalElement, rng, logs);
    applyWrightingSecondary(actor, spell, logs, nextEffectId);
  } else if (spell.kind === 'aoe') {
    for (const f of foes) {
      if (f.hp <= 0) continue;
      const res = resolveSpellDamage({ caster: actor, target: f, spell, isEnchanted, bubble: state.arenaBubble, critRoll: rng(), blockRoll: rng(), coopResonanceBonus: coopResonance });
      f.hp = Math.max(0, f.hp - res.damage);
      logs.push(`${actor.name}'s ${spell.name} hit ${f.name} for ${res.damage}${res.crit ? ' (CRIT!)' : ''}!`);
      applySpellStatusEffect(actor, f, spell, res.finalElement, rng, logs);
    }
  } else if (spell.kind === 'blade') {
    const bladeEl = spell.id === 'sol_auric_banner' ? 'universal' : spell.element;
    const recipients = spell.id === 'sol_auric_banner' ? allies : [actor];
    for (const r of recipients) {
      r.blades.push({ id: `${spell.id}_${rng()}`, label: `${spell.name} +${spell.baseValue}%`, kind: 'blade', element: bladeEl, pct: spell.baseValue });
    }
    logs.push(`${actor.name} placed ${spell.name} (+${spell.baseValue}%).`);
  } else if (spell.kind === 'shield') {
    actor.shields.push({ id: `${spell.id}_${rng()}`, label: `${spell.name} -${spell.baseValue}%`, kind: 'shield', element: 'universal', pct: spell.baseValue });
    logs.push(`${actor.name} raised ${spell.name} (-${spell.baseValue}%).`);
  } else if (spell.kind === 'trap') {
    target.traps.push({ id: `${spell.id}_${rng()}`, label: `${spell.name} +${spell.baseValue}%`, kind: 'trap', element: spell.element, pct: spell.baseValue });
    logs.push(`${actor.name} laid ${spell.name} on ${target.name}.`);
  } else if (spell.kind === 'weakness') {
    target.weaknesses.push({ id: `${spell.id}_${rng()}`, label: `${spell.name} -${spell.baseValue}%`, kind: 'weakness', element: 'universal', pct: spell.baseValue });
    logs.push(`${actor.name} afflicted ${target.name} with ${spell.name}.`);
  } else if (spell.kind === 'heal') {
    const healBonus = actor.spellwrighting[spell.id] === 'A' ? (spell.wrightA?.deltaValue ?? 0) : 0;
    const amt = Math.round((spell.baseValue + healBonus) * (1 + actor.powerBonusPct / 150));
    actor.hp = Math.min(actor.maxHp, actor.hp + amt);
    const pet = actor.creatures[actor.activeCreatureIdx];
    if (pet) pet.hp = Math.min(pet.maxHp, pet.hp + Math.round(amt * 0.6));
    logs.push(`${actor.name} cast ${spell.name}, healing +${amt} HP!`);
    applySpellStatusEffect(actor, target, spell, spell.element, rng, logs);
    applyWrightingSecondary(actor, spell, logs, nextEffectId);
  } else if (spell.kind === 'regen') {
    const regenVal = spell.baseValue;
    const regenTurns = spell.dotTurns ?? 3;
    applyStatusEffect(actor, {
      id: `regen_${spell.id}_${rng()}`,
      kind: 'regen',
      label: `Regen (+${regenVal}/t)`,
      element: spell.element,
      magnitude: regenVal,
      turnsLeft: regenTurns,
    });
    logs.push(`${actor.name} cast ${spell.name}, gaining Regen (+${regenVal} HP/turn for ${regenTurns}t)!`);
  } else if (spell.kind === 'prism') {
    const opp = ELEMENTS[spell.element].opposingId ?? 'sol';
    target.prisms.push({ id: `${spell.id}_${rng()}`, label: `${ELEMENTS[spell.element].name} -> ${ELEMENTS[opp].name}`, kind: 'prism', element: spell.element, pct: 0, targetElement: opp });
    logs.push(`${actor.name} placed ${spell.name} on ${target.name}!`);
  } else if (spell.kind === 'bubble') {
    state.arenaBubble = { element: spell.element, bonusPct: spell.baseValue, accuracyPct: 10 };
    logs.push(`${actor.name} reshaped the Arena Bubble to ${ELEMENTS[spell.element].name} (+${spell.baseValue}%).`);
  } else if (spell.kind === 'stun') {
    const stunned = applyStatusEffect(target, {
      id: `stun_${spell.id}_${rng()}`,
      kind: 'stunned',
      label: 'Stunned',
      element: spell.element,
      magnitude: 1,
      turnsLeft: Math.max(1, spell.baseValue),
    });
    if (!stunned) {
      logs.push(`${target.name}'s Anchor Conviction blocked ${spell.name}!`);
    } else {
      logs.push(`${target.name} is STUNNED by ${spell.name}!`);
    }
  } else if (spell.kind === 'stun_block') {
    actor.stunBlocks += spell.baseValue;
    logs.push(`${actor.name} gained ${spell.baseValue} Stun Wards.`);
  } else if (spell.kind === 'reshuffle') {
    actor.deck.push(...actor.discard);
    actor.discard = [];
    drawUpToSeven(actor);
    logs.push(`${actor.name} reshuffled all discarded spells back into the deck!`);
  }
}

function applyWrightingSecondary(actor: CombatantState, spell: SpellDefinition, logs: string[], nextEffectId: (source: 'wright') => string) {
  if (actor.spellwrighting[spell.id] !== 'B' || !spell.wrightB) return;
  const eff = spell.wrightB.bonusEffect;
  if (eff === 'extra_blade') {
    actor.blades.push({ id: nextEffectId('wright'), label: 'Spellwright +20%', kind: 'blade', element: spell.element, pct: 20 });
    logs.push(`${actor.name}'s Spellwrighting left a +20% Blade.`);
  } else if (eff === 'extra_shield') {
    actor.shields.push({ id: nextEffectId('wright'), label: 'Spellwright -35%', kind: 'shield', element: 'universal', pct: 35 });
    logs.push(`${actor.name}'s Spellwrighting raised a -35% Shield.`);
  } else if (eff === 'heal_120') {
    actor.hp = Math.min(actor.maxHp, actor.hp + 120);
    logs.push(`${actor.name}'s Spellwrighting healed +120 HP.`);
  }
}

export function chooseAiAction(ai: CombatantState, foes: CombatantState[]): TurnActionInput {
  const livingTarget = foes.find((f) => f.hp > 0) ?? foes[0];
  let chosenIdx: number | null = null;
  let bestScore = -1;

  ai.hand.forEach((rawId, idx) => {
    const sp = SPELL_BY_ID[rawId.replace('+keen', '')];
    if (!sp || sp.kind === 'enchant') return;
    if (totalAvailablePipsForSchool(ai, sp.element) < sp.pipCost) return;
    let score = sp.baseValue + sp.pipCost * 25;
    if ((sp.kind === 'heal' || sp.kind === 'regen') && ai.hp > ai.maxHp * 0.65) score = 5;
    if (score > bestScore) {
      bestScore = score;
      chosenIdx = idx;
    }
  });

  return {
    actorId: ai.id,
    cardIndex: chosenIdx,
    targetId: livingTarget?.id ?? '',
    creatureAction: ai.creatures[ai.activeCreatureIdx]?.hp > 0 ? 'skill' : 'none',
  };
}

/** True when the wizard's lead was the active fighter at duel end (local Arbor win credit). */
export function leadCreatureQualifiedForArborWin(me: CombatantState, leadCreatureId: string): boolean {
  const leadIdx = me.creatures.findIndex((pet) => pet.id === leadCreatureId);
  if (leadIdx < 0) return false;
  return me.creatures[me.activeCreatureIdx]?.id === leadCreatureId;
}

/** Up to three duel slots, keeping the wizard's selected lead active in combat. */
export function pickDuelCreatureRoster<T extends { id: string }>(
  creatures: T[],
  activeCreatureId: string | undefined | null,
  maxSlots = 3,
): { roster: T[]; activeCreatureIdx: number } {
  if (creatures.length === 0) return { roster: [], activeCreatureIdx: 0 };

  const lead = creatures.find((pet) => pet.id === activeCreatureId) ?? creatures[0];
  const roster: T[] = [];
  const seen = new Set<string>();
  for (const pet of creatures) {
    if (roster.length >= maxSlots) break;
    if (seen.has(pet.id)) continue;
    roster.push(pet);
    seen.add(pet.id);
  }

  if (!seen.has(lead.id)) {
    if (roster.length >= maxSlots) roster[roster.length - 1] = lead;
    else roster.push(lead);
  }

  const activeCreatureIdx = Math.max(0, roster.findIndex((pet) => pet.id === lead.id));
  return { roster, activeCreatureIdx };
}

export function ownedCreatureToCombatSlot(pet: {
  id: string;
  speciesId: string;
  nickname: string;
  elementId: ElementId;
  stage: 1 | 2 | 3;
  chromatic: ChromaticVariant;
  branchChoice: 'A' | 'B';
  talents: string[];
}): CombatCreatureSlot {
  return {
    id: pet.id,
    speciesId: pet.speciesId,
    nickname: pet.nickname,
    element: pet.elementId,
    stage: pet.stage,
    chromatic: pet.chromatic,
    branchChoice: pet.branchChoice,
    hp: 190 + pet.stage * 45,
    maxHp: 190 + pet.stage * 45,
    talents: pet.talents,
  };
}
