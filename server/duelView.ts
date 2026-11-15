import type { CombatantState, DuelState, TurnActionInput } from '../shared/combat.ts';
import { ELEMENTS } from '../shared/elements.ts';

export function duelView(state: DuelState, actorId?: string): DuelState {
  const onEnemySide = state.enemyTeam.some((actor) => actor.id === actorId);
  const allies = onEnemySide ? state.enemyTeam : state.playerTeam;
  const foes = onEnemySide ? state.playerTeam : state.enemyTeam;
  const visible = (actor: CombatantState) => actor.id === actorId
    ? { ...actor, deck: [] }
    : { ...actor, hand: [], deck: [], sideboard: [], discard: [], spellwrighting: {} };
  const phase = onEnemySide && state.phase === 'victory' ? 'defeat'
    : onEnemySide && state.phase === 'defeat' ? 'victory'
      : state.phase;
  return {
    ...state,
    phase,
    playerTeam: [...allies.filter((a) => a.id === actorId), ...allies.filter((a) => a.id !== actorId)].map(visible),
    enemyTeam: foes.map(visible),
  };
}

export function readDuelAction(value: unknown, actor: CombatantState, foes: CombatantState[]): TurnActionInput | null {
  if (!value || typeof value !== 'object' || actor.hp <= 0) return null;
  const action = value as Partial<TurnActionInput>;
  const index = (entry: unknown, size: number): entry is number =>
    typeof entry === 'number' && Number.isInteger(entry) && entry >= 0 && entry < size;
  if (action.cardIndex !== null && !index(action.cardIndex, actor.hand.length)) return null;
  if (action.useSideboardIndex != null && !index(action.useSideboardIndex, actor.sideboard.length)) return null;
  if (action.archmasteryElement != null && !Object.hasOwn(ELEMENTS, action.archmasteryElement)) return null;
  const discard = action.discardIndices;
  if (discard !== undefined && (!Array.isArray(discard) || discard.length > actor.hand.length || discard.some((entry) => !index(entry, actor.hand.length)))) return null;
  if (action.creatureAction !== undefined && !['none', 'skill', 'swap'].includes(action.creatureAction)) return null;
  if (action.creatureAction === 'swap' && !index(action.swapCreatureIdx, actor.creatures.length)) return null;
  const target = foes.find((foe) => foe.id === action.targetId && foe.hp > 0) ?? foes.find((foe) => foe.hp > 0);
  if (!target) return null;
  return {
    actorId: actor.id, targetId: target.id, cardIndex: action.cardIndex,
    useSideboardIndex: action.useSideboardIndex, archmasteryElement: action.archmasteryElement,
    discardIndices: discard ? [...new Set(discard)] : undefined,
    creatureAction: action.creatureAction ?? 'none', swapCreatureIdx: action.swapCreatureIdx,
  };
}
