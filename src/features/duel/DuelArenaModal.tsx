import React, { useEffect, useRef, useState } from 'react';
import {
  FastForward,
  Flag,
  Flame,
  Shield,
  Sparkles,
  Swords,
  Users,
  Eye,
  RefreshCw,
  Wand2,
  Award,
  HeartPulse,
  Snowflake,
  Zap,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { ELEMENTS, ELEMENT_LIST, type ElementId } from '../../../shared/elements.ts';
import { SPELL_BY_ID, getStarterDeckForElement } from '../../../shared/spells.ts';
import {
  drawUpToSeven,
  resolveDuelRound,
  chooseAiAction,
  isDuelComplete,
  totalAvailablePipsForSchool,
  computeWizardDerivedStats,
  ownedCreatureToCombatSlot,
  pickDuelCreatureRoster,
  STATUS_EFFECT_META,
  type CombatantState,
  type DuelState,
  type StatusEffectInstance,
  type StatusEffectKind,
  type TurnActionInput,
} from '../../../shared/combat.ts';
import type { WizardDocument } from '../../../shared/economy.ts';
import type { OwnedCreature } from '../../lib/storage.ts';
import { ElementCrest } from '../../lib/elementIcons.tsx';
import { academyAudio } from '../../engine/audioSynth.ts';

function StatusEffectIcon({ kind, className = 'h-3.5 w-3.5' }: { kind: StatusEffectKind; className?: string }) {
  if (kind === 'burning') return <Flame className={className} />;
  if (kind === 'stunned') return <Ban className={className} />;
  if (kind === 'regen') return <HeartPulse className={className} />;
  if (kind === 'frostbite') return <Snowflake className={className} />;
  return <Zap className={className} />;
}

function getStatusBadgeTone(kind: StatusEffectKind): string {
  switch (kind) {
    case 'burning':
      return 'border-orange-400/55 bg-orange-950/85 text-orange-200';
    case 'stunned':
      return 'border-amber-400/75 bg-amber-950/90 text-amber-200';
    case 'regen':
      return 'border-emerald-400/55 bg-emerald-950/85 text-emerald-200';
    case 'frostbite':
      return 'border-cyan-400/55 bg-cyan-950/85 text-cyan-200';
    case 'shocked':
      return 'border-yellow-400/55 bg-yellow-950/85 text-yellow-200';
  }
}

function formatStatusMagnitude(effect: StatusEffectInstance): string {
  if (effect.kind === 'burning' || effect.kind === 'frostbite') return `-${effect.magnitude} HP/t`;
  if (effect.kind === 'regen') return `+${effect.magnitude} HP/t`;
  if (effect.kind === 'shocked') return `-${effect.magnitude}% Acc`;
  return 'Skip Turn';
}

const StatusEffectStrip: React.FC<{ combatant: CombatantState }> = ({ combatant }) => {
  const effects = combatant.statusEffects ?? [];
  const hasAny = effects.length > 0 || combatant.stunBlocks > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`${combatant.name} status effects`}>
      {effects.map((st) => {
        const meta = STATUS_EFFECT_META[st.kind];
        return (
          <span
            key={st.id}
            title={`${meta.name}: ${meta.description}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${getStatusBadgeTone(st.kind)}`}
          >
            <StatusEffectIcon kind={st.kind} className="h-3.5 w-3.5 shrink-0" />
            <span>{meta.name}</span>
            <span className="font-mono-num opacity-90">{formatStatusMagnitude(st)}</span>
            <span className="rounded bg-black/35 px-1 py-0.2 font-mono-num text-[10px]">{st.turnsLeft}t</span>
          </span>
        );
      })}
      {combatant.stunBlocks > 0 && (
        <span
          title="Blocks incoming Stun attempts."
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/55 bg-indigo-950/85 px-2 py-1 text-[11px] font-bold text-indigo-200"
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>Stun Ward</span>
          <span className="rounded bg-black/35 px-1 font-mono-num text-[10px]">{combatant.stunBlocks}×</span>
        </span>
      )}
    </div>
  );
};

interface DuelArenaModalProps {
  wizard: WizardDocument;
  creatures: OwnedCreature[];
  liveDuelState: DuelState | null;
  spectating: boolean;
  turnDeadline: number | null;
  worldConnected: boolean;
  activeLiveDuels: { duelId: string; mode: string; round: number; title: string }[];
  solo2xDefault: boolean;
  onStartLocalDuel: (state: DuelState) => void;
  onUpdateLocalDuel: (state: DuelState | null) => void;
  onSubmitLiveAction: (action: TurnActionInput) => boolean;
  onQueuePvp: () => void;
  onQueueCoop: () => void;
  onSpectateDuel: (duelId: string) => void;
  onDuelFinished: (result: {
    won: boolean;
    mode: DuelState['mode'];
    spireFloor?: number;
    trialElement?: ElementId;
    completed?: boolean;
    draw?: boolean;
  }) => void;
  onClose: () => void;
}

export const DuelArenaModal: React.FC<DuelArenaModalProps> = ({
  wizard,
  creatures,
  liveDuelState,
  spectating,
  turnDeadline,
  worldConnected,
  activeLiveDuels,
  solo2xDefault,
  onStartLocalDuel,
  onUpdateLocalDuel,
  onSubmitLiveAction,
  onQueuePvp,
  onQueueCoop,
  onSpectateDuel,
  onDuelFinished,
  onClose,
}) => {
  const [localDuel, setLocalDuel] = useState<DuelState | null>(null);
  const [speed2x, setSpeed2x] = useState(solo2xDefault);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [selectedSideIdx, setSelectedSideIdx] = useState<number | null>(null);
  const [creatureMode, setCreatureMode] = useState<'skill' | 'swap' | 'none'>('skill');
  const [swapIdx, setSwapIdx] = useState<number>(0);
  const [discardMode, setDiscardMode] = useState(false);
  const [discardSet, setDiscardSet] = useState<number[]>([]);
  const [enchantModeIdx, setEnchantModeIdx] = useState<number | null>(null);
  const [archmastery, setArchmastery] = useState<ElementId>(wizard.elementId);
  const [trialTargetElement, setTrialTargetElement] = useState<ElementId | undefined>(undefined);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [pvpSecondsLeft, setPvpSecondsLeft] = useState<number | null>(null);

  const duel = liveDuelState ?? localDuel;
  const turnInFlight = useRef(false);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [turnPending, setTurnPending] = useState(false);
  useEffect(() => {
    turnInFlight.current = false;
    setTurnPending(false);
  }, [duel?.duelId, duel?.round, duel?.phase, worldConnected]);

  useEffect(() => () => {
    if (localTimer.current) clearTimeout(localTimer.current);
  }, []);

  useEffect(() => {
    if (!duel || !duel.turnTimerSeconds || duel.phase !== 'planning') {
      setPvpSecondsLeft(null);
      return;
    }
    const deadline = turnDeadline ?? Date.now() + duel.turnTimerSeconds * 1000;
    const update = () => setPvpSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [duel?.duelId, duel?.round, duel?.phase, turnDeadline]);

  function buildPlayerCombatant(gearlessSpire = false): CombatantState {
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

    const deckList = gearlessSpire ? getStarterDeckForElement(wizard.elementId) : [...wizard.progression.deck];
    const shuffled = [...deckList].sort(() => Math.random() - 0.5);

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
      deck: shuffled,
      discard: [],
      sideboard: [...wizard.progression.sideboard],
      spellwrighting: { ...wizard.progression.spellwrighting },
      creatures: duelRoster.map((pet) => ownedCreatureToCombatSlot(pet)),
      activeCreatureIdx,
    };
    drawUpToSeven(c);
    return c;
  }

  function launchSolo(mode: 'solo' | 'trial' | 'spire', el: ElementId, spireFloor?: number) {
    setRewardClaimed(false);
    setTrialTargetElement(mode === 'trial' ? el : undefined);
    const gearless = mode === 'spire';
    const player = buildPlayerCombatant(gearless);
    const enemyHp =
      mode === 'trial'
        ? 920
        : mode === 'spire'
          ? 380 + (spireFloor ?? 1) * 95
          : 340 + wizard.level * 55;
    const enemyDeck = getStarterDeckForElement(el);
    const enemy: CombatantState = {
      id: `npc_foe_${Date.now()}`,
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

    const fresh: DuelState = {
      duelId: `solo_${Date.now()}`,
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
    setLocalDuel(fresh);
    onStartLocalDuel(fresh);
  }

  const handleCastOrPass = (pass = false) => {
    if (!duel || duel.phase !== 'planning' || spectating || turnInFlight.current) return;
    const me = duel.playerTeam[0];
    if (!me) return;

    const action: TurnActionInput = {
      actorId: me.id,
      cardIndex: pass ? null : selectedCardIdx,
      useSideboardIndex: pass ? null : selectedSideIdx,
      targetId: duel.enemyTeam.find((e) => e.hp > 0)?.id ?? duel.enemyTeam[0].id,
      creatureAction: me.creatures[me.activeCreatureIdx]?.hp > 0 ? creatureMode : 'none',
      swapCreatureIdx: creatureMode === 'swap' ? swapIdx : undefined,
      discardIndices: discardSet.length > 0 ? discardSet : undefined,
      archmasteryElement: archmastery,
    };

    if (liveDuelState && !onSubmitLiveAction(action)) return;
    turnInFlight.current = true;
    setTurnPending(true);
    academyAudio.playChime('cast');
    setSelectedCardIdx(null);
    setSelectedSideIdx(null);
    setDiscardSet([]);
    setDiscardMode(false);
    setCreatureMode('skill');

    if (liveDuelState) return;

    const actions: TurnActionInput[] = [action];
    for (const foe of duel.enemyTeam) {
      if (foe.isNpc && foe.hp > 0) actions.push(chooseAiAction(foe, duel.playerTeam));
    }

    const delayMs = speed2x ? 160 : 380;
    localTimer.current = setTimeout(() => {
      localTimer.current = null;
      const next = resolveDuelRound(duel, actions);
      setLocalDuel(next);
      onUpdateLocalDuel(next);
      if (next.phase === 'victory') {
        academyAudio.playChime('victory');
      }
    }, delayMs);
  };

  const handleInHandEnchant = (targetIdx: number) => {
    if (enchantModeIdx === null || !duel || liveDuelState) return;
    const me = duel.playerTeam[0];
    const enchId = me.hand[enchantModeIdx];
    const tgtId = me.hand[targetIdx];
    if (!enchId || !tgtId || targetIdx === enchantModeIdx || !['attack', 'drain', 'aoe'].includes(SPELL_BY_ID[tgtId]?.kind)) {
      setEnchantModeIdx(null);
      return;
    }
    const copy = structuredClone(duel);
    copy.playerTeam[0].hand[targetIdx] = `${tgtId}+keen`;
    copy.playerTeam[0].hand.splice(enchantModeIdx, 1);
    copy.logs.push(`In-Hand Fusion: Keen Ink boosted ${SPELL_BY_ID[tgtId]?.name ?? tgtId} (+65 Power, +8% Acc)!`);
    setLocalDuel(copy);
    setEnchantModeIdx(null);
  };

  const handleClaimExit = (won: boolean) => {
    if (!rewardClaimed && duel && !spectating) {
      setRewardClaimed(true);
      onDuelFinished({
        won,
        mode: duel.mode,
        spireFloor: duel.spireFloor,
        trialElement: trialTargetElement,
        completed: isDuelComplete(duel.phase),
        draw: duel.phase === 'draw',
      });
    }
    setLocalDuel(null);
    onUpdateLocalDuel(null);
    onClose();
  };

  // Matchmaking / Arena Lobby when no duel active
  if (!duel) {
    const nextSpire = Math.min(10, wizard.progression.spireBestFloor + 1);
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
        <div className="storybook-panel w-full max-w-4xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#d7c7a9] pb-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#241b16]">Duel Amphitheater &amp; Spire</h2>
              <p className="text-xs text-[#615346]">
                Solo battles feature Unlimited Planning Time + 2× Speed Toggle. Live PvP &amp; Co-op run on a fair 30s turn clock.
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1.5 text-xs font-bold hover:bg-[#efe4ce]">
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {/* Solo Skirmish */}
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/75 p-4 space-y-3">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <Swords className="h-5 w-5 text-[#d9532f]" /> Solo Academy Skirmishes
              </div>
              <p className="text-xs text-[#615346]">Pick any opposing element duel ring to earn XP, Florins, Spell Shards, and charge Hybrid Eggs.</p>
              <div className="flex flex-wrap gap-2">
                {(['ember', 'frost', 'gale', 'bramble', 'tide', 'spark'] as ElementId[]).map((el) => (
                  <button
                    key={el}
                    onClick={() => launchSolo('solo', el)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-[#fbf6ec] px-3 py-1.5 text-xs font-bold hover:border-[#241b16]"
                  >
                    <ElementCrest elementId={el} size={15} showLabel />
                  </button>
                ))}
              </div>
            </div>

            {/* Rare Element Trials (Rank 4+) */}
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/75 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-display text-lg font-bold">
                  <Sparkles className="h-5 w-5 text-[#8a52c7]" /> Rare Trial Guardians
                </span>
                <span className="rounded-lg bg-[#241b16] px-2 py-0.5 text-[11px] font-bold text-[#f4c98b]">
                  Rank {wizard.rank}/4
                </span>
              </div>
              <p className="text-xs text-[#615346]">
                Unlock Umbra, Sol, Verdigris &amp; Chronos spells plus prestige Lineages (Dwarf, High Elf, Dark Elf, Sylph) at Rank 4!
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['umbra', 'sol', 'verdigris', 'chronos'] as ElementId[]).map((el) => {
                  const locked = wizard.rank < 4;
                  return (
                    <button
                      key={el}
                      disabled={locked}
                      onClick={() => launchSolo('trial', el)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${
                        locked ? 'bg-[#ebe3d3] text-[#8a7d6b] cursor-not-allowed' : 'bg-[#fbf6ec] border-[#d7c7a9] hover:border-[#241b16]'
                      }`}
                    >
                      <ElementCrest elementId={el} size={15} showLabel />
                      <span>{locked ? 'Rank 4' : 'Challenge'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10-Floor Gearless Spire Ascent */}
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/75 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-display text-lg font-bold">
                  <Award className="h-5 w-5 text-[#2f8a73]" /> Spire Ascent (Gearless)
                </span>
                <span className="font-mono-num text-xs font-bold text-[#2f8a73]">Best Fl.{wizard.progression.spireBestFloor}/10</span>
              </div>
              <p className="text-xs text-[#615346]">Equalized 10-floor solo puzzle-duel climb where pure deck skill rules.</p>
              <button
                onClick={() => launchSolo('spire', ELEMENT_LIST[nextSpire % 6].id, nextSpire)}
                className="w-full rounded-xl bg-[#2f8a73] py-2 text-xs font-bold text-white hover:bg-[#389e85]"
              >
                Enter Spire Floor {nextSpire}
              </button>
            </div>

            {/* Live PvP, Co-op & Spectating */}
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/75 p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <Users className="h-5 w-5 text-[#256fa8]" /> Live Realm PvP &amp; Co-op
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onQueuePvp}
                  disabled={!worldConnected}
                  className="flex-1 rounded-xl bg-[#256fa8] py-2 text-xs font-bold text-white hover:bg-[#2f80bd]"
                >
                  Queue 1v1 PvP
                </button>
                <button
                  onClick={onQueueCoop}
                  disabled={!worldConnected}
                  className="flex-1 rounded-xl bg-[#6d597a] py-2 text-xs font-bold text-white hover:bg-[#7d668c]"
                >
                  Queue Co-op Trial
                </button>
              </div>
              {activeLiveDuels.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="text-[11px] font-bold text-[#615346]">Live 3D Spectate:</div>
                  {activeLiveDuels.map((ad) => (
                    <button
                      key={ad.duelId}
                      onClick={() => onSpectateDuel(ad.duelId)}
                      className="flex w-full items-center justify-between rounded-lg bg-[#efe4ce] px-2.5 py-1 text-xs font-semibold"
                    >
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {ad.title}</span>
                      <span>Rd {ad.round}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const me = duel.playerTeam[0];
  const foe = duel.enemyTeam[0];
  const myPet = me?.creatures[me.activeCreatureIdx];

  const isStunned = (c?: CombatantState) =>
    Boolean(c && (c.stunnedTurns > 0 || c.statusEffects?.some((s) => s.kind === 'stunned')));
  const hasStatus = (c: CombatantState | undefined, kind: StatusEffectKind) =>
    Boolean(c?.statusEffects?.some((s) => s.kind === kind));

  const getCombatantCardRing = (c?: CombatantState) => {
    if (isStunned(c)) return 'border-amber-400/75 ring-2 ring-amber-400/40';
    if (hasStatus(c, 'burning')) return 'border-orange-400/60 ring-1 ring-orange-400/35';
    if (hasStatus(c, 'regen')) return 'border-emerald-400/60 ring-1 ring-emerald-400/35';
    if (hasStatus(c, 'frostbite')) return 'border-cyan-400/60 ring-1 ring-cyan-400/30';
    if (hasStatus(c, 'shocked')) return 'border-yellow-400/60 ring-1 ring-yellow-400/30';
    return 'border-[#d7c7a9]/25';
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between bg-[#121829]/88 p-3 md:p-5 text-[#f7f0e2]">
      {/* Top Arena Status Bar */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7c7a9]/30 bg-[#1e263d]/95 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold">Round {duel.round}</span>
          <span className="rounded-lg bg-[#2a3554] px-2.5 py-0.5 text-xs font-semibold">
            {pvpSecondsLeft !== null ? `${pvpSecondsLeft}s Turn Clock` : 'Solo Time: Unlimited'}
          </span>
          {duel.arenaBubble && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#354369] px-2.5 py-0.5 text-xs font-semibold">
              Bubble: <ElementCrest elementId={duel.arenaBubble.element} size={13} showLabel /> +{duel.arenaBubble.bonusPct}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeed2x((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border ${
              speed2x ? 'border-[#f4c98b] bg-[#f4c98b] text-[#241b16]' : 'border-white/20 bg-[#27314d]'
            }`}
          >
            <FastForward className="h-3.5 w-3.5" /> 2× Speed {speed2x ? 'ON' : 'OFF'}
          </button>
          {!isDuelComplete(duel.phase) && (
            <button
              onClick={() => handleClaimExit(false)}
              className="inline-flex items-center gap-1 rounded-xl border border-red-400/40 bg-red-950/50 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-900/60"
            >
              <Flag className="h-3.5 w-3.5" /> {spectating ? 'Leave Spectator View' : 'Flee'}
            </button>
          )}
        </div>
      </div>

      {/* Telegraphed Boss Cheat Banner */}
      {duel.telegraphedCheat && (
        <div className="mx-auto mt-2 max-w-2xl rounded-xl border border-amber-400/60 bg-amber-950/85 px-4 py-1.5 text-center text-xs font-bold text-amber-200">
          {duel.telegraphedCheat}
        </div>
      )}

      {/* Middle Arena Combatants + Logs */}
      <div className="mx-auto my-2 grid w-full max-w-6xl flex-1 gap-3 md:grid-cols-[1fr_1.1fr_1fr] overflow-hidden">
        {/* Player Side */}
        {me && (
          <div className={`rounded-2xl border bg-[#1b2338]/95 p-4 flex flex-col justify-between transition-colors ${getCombatantCardRing(me)}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold">{me.name}</span>
                <ElementCrest elementId={me.element} showLabel />
              </div>

              {isStunned(me) && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-400/70 bg-amber-950/85 px-3 py-1.5 text-xs font-bold text-amber-200">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>STUNNED — Next Turn Skipped</span>
                </div>
              )}

              <div className="mt-2">
                <div className="flex justify-between text-xs font-mono-num">
                  <span>Wizard HP</span>
                  <span>{me.hp} / {me.maxHp}</span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-[#4caf70] transition-all" style={{ width: `${Math.max(0, (me.hp / me.maxHp) * 100)}%` }} />
                </div>
              </div>

              <StatusEffectStrip combatant={me} />

              {myPet && (
                <div className="mt-3 rounded-xl bg-[#13192b] p-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Lead: {myPet.nickname} (Stg.{myPet.stage})</span>
                    <span className="font-mono-num">{myPet.hp}/{myPet.maxHp} HP</span>
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {me.creatures.map((pet, idx) => (
                      <button
                        key={pet.id}
                        onClick={() => {
                          setCreatureMode('swap');
                          setSwapIdx(idx);
                        }}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                          me.activeCreatureIdx === idx ? 'border-[#7de2d1] bg-[#244047]' : 'border-white/15 bg-[#1a2238]'
                        }`}
                      >
                        {pet.nickname}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Pips & Archmastery Selector */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-[#2a3554] px-2.5 py-1 font-mono-num font-bold text-[#f4c98b]">
                  Pips: {me.regularPips} Reg · {me.powerPips} Pwr · {me.schoolPips} School
                </span>
                <select
                  value={archmastery}
                  onChange={(e) => setArchmastery(e.target.value as ElementId)}
                  className="rounded-lg border border-white/20 bg-[#121829] px-2 py-1 text-xs"
                  title="Archmastery: Choose which school gets double School Pip value"
                >
                  {ELEMENT_LIST.slice(0, 10).map((e) => (
                    <option key={e.id} value={e.id}>Archmastery: {e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Blades & Shields */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {me.blades.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1 rounded-md bg-amber-900/70 px-2 py-0.5 text-[11px]">
                  <Flame className="h-3 w-3" /> {b.label}
                </span>
              ))}
              {me.shields.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-sky-900/70 px-2 py-0.5 text-[11px]">
                  <Shield className="h-3 w-3" /> {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Combat Chronicle & Victory Banner */}
        <div className="rounded-2xl border border-[#d7c7a9]/25 bg-[#141a2b]/95 p-4 flex flex-col justify-between overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-wider text-[#f4c98b] mb-2">Duel Chronicle</div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs text-[#dce3f0]">
            {duel.logs.map((line, i) => (
              <div key={i} className="rounded-lg bg-white/5 px-2.5 py-1">{line}</div>
            ))}
          </div>
          {isDuelComplete(duel.phase) && (
            <div className="mt-3 rounded-xl border border-[#f4c98b] bg-[#2a3454] p-3 text-center">
              <div className="font-display text-lg font-bold text-[#f4c98b]">
                {duel.phase === 'victory' ? 'Victory Achieved!' : duel.phase === 'draw' ? 'Draw in the Ring' : 'Defeated in the Ring'}
              </div>
              <button
                onClick={() => handleClaimExit(duel.phase === 'victory')}
                className="mt-2 rounded-xl bg-[#f4c98b] px-5 py-2 text-xs font-bold text-[#241b16]"
              >
                {duel.phase === 'victory' && !liveDuelState ? 'Claim Rewards & Return' : 'Return to Campus'}
              </button>
            </div>
          )}
        </div>

        {/* Enemy Side */}
        {foe && (
          <div className={`rounded-2xl border bg-[#1b2338]/95 p-4 flex flex-col justify-between transition-colors ${getCombatantCardRing(foe)}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold">{foe.name}</span>
                <ElementCrest elementId={foe.element} showLabel />
              </div>

              {isStunned(foe) && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-400/70 bg-amber-950/85 px-3 py-1.5 text-xs font-bold text-amber-200">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>STUNNED — Next Turn Skipped</span>
                </div>
              )}

              <div className="mt-2">
                <div className="flex justify-between text-xs font-mono-num">
                  <span>Opponent HP</span>
                  <span>{foe.hp} / {foe.maxHp}</span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-[#d9532f] transition-all" style={{ width: `${Math.max(0, (foe.hp / foe.maxHp) * 100)}%` }} />
                </div>
              </div>
              <div className="mt-3 text-xs font-mono-num text-[#c7d0e0]">
                Opponent Pips: {foe.regularPips} Reg · {foe.powerPips} Pwr
              </div>

              <StatusEffectStrip combatant={foe} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {foe.traps.map((t) => (
                <span key={t.id} className="rounded-md bg-rose-900/70 px-2 py-0.5 text-[11px]">{t.label}</span>
              ))}
              {foe.prisms.map((p) => (
                <span key={p.id} className="rounded-md bg-teal-900/70 px-2 py-0.5 text-[11px]">{p.label}</span>
              ))}
              {foe.shields.map((s) => (
                <span key={s.id} className="rounded-md bg-sky-900/70 px-2 py-0.5 text-[11px]">{s.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hand, Sideboard, Discard Cycling & Actions */}
      {me && !spectating && duel.phase === 'planning' && (
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[#d7c7a9]/30 bg-[#1e263d]/95 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDiscardMode((v) => !v);
                  setEnchantModeIdx(null);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold border ${
                  discardMode ? 'border-rose-400 bg-rose-900/60' : 'border-white/20 bg-[#27314d]'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" /> {discardMode ? `Cycle (${discardSet.length})` : 'Discard Cycle'}
              </button>
              {enchantModeIdx !== null && (
                <span className="rounded-lg bg-amber-500/20 border border-amber-400 px-2.5 py-1 text-amber-200 font-bold">
                  Click an Attack card to fuse Keen Ink (+65 Power)!
                </span>
              )}
            </div>

            {/* 8-Card Sideboard */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[#9fb3c8] font-semibold">Sideboard:</span>
              {me.sideboard.map((sid, idx) => {
                const sp = SPELL_BY_ID[sid];
                if (!sp) return null;
                return (
                  <button
                    key={`${sid}_${idx}`}
                    onClick={() => {
                      setSelectedSideIdx(selectedSideIdx === idx ? null : idx);
                      setSelectedCardIdx(null);
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                      selectedSideIdx === idx ? 'border-[#f4c98b] bg-[#3b4b75]' : 'border-white/15 bg-[#141a2b]'
                    }`}
                  >
                    {sp.name} ({sp.pipCost})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* 7-Card Hand */}
            <div className="flex flex-1 gap-2 overflow-x-auto py-1">
              {me.hand.map((rawId, idx) => {
                const enchanted = rawId.endsWith('+keen');
                const sp = SPELL_BY_ID[rawId.replace('+keen', '')];
                if (!sp) return null;
                const affordable = totalAvailablePipsForSchool(me, sp.element) >= sp.pipCost;
                const isSelected = selectedCardIdx === idx;
                const isDiscarded = discardSet.includes(idx);

                return (
                  <button
                    key={`${rawId}_${idx}`}
                    onClick={() => {
                      if (discardMode) {
                        setDiscardSet((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]));
                        return;
                      }
                      if (enchantModeIdx !== null) {
                        handleInHandEnchant(idx);
                        return;
                      }
                      if (sp.kind === 'enchant' && !liveDuelState) {
                        setEnchantModeIdx(idx);
                        return;
                      }
                      if (!affordable) return;
                      setSelectedCardIdx(isSelected ? null : idx);
                      setSelectedSideIdx(null);
                    }}
                    className={`min-w-[132px] max-w-[144px] rounded-xl border p-2.5 text-left transition ${
                      isDiscarded
                        ? 'border-rose-400 bg-rose-950/70'
                        : isSelected
                          ? 'border-[#f4c98b] bg-[#34436b] -translate-y-1 shadow-lg'
                          : affordable || sp.kind === 'enchant'
                            ? 'border-[#d7c7a9]/35 bg-[#151c2e] hover:border-[#f4c98b]/70'
                            : 'border-white/10 bg-[#101522] opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <ElementCrest elementId={sp.element} size={13} />
                      <span className="font-mono-num text-[11px] font-bold text-[#f4c98b]">{sp.pipCost} Pip</span>
                    </div>
                    <div className="mt-1.5 text-xs font-bold leading-tight text-[#fffaf0]">
                      {sp.name} {enchanted && <span className="text-amber-300">+Keen</span>}
                    </div>
                    <div className="mt-1 text-[10px] text-[#b8c2d6]">
                      {sp.kind === 'enchant' ? 'Fuse onto Attack' : `${sp.accuracy + (enchanted ? 8 : 0)}% Acc · ${sp.baseValue + (enchanted ? 65 : 0)}`}
                    </div>
                    {(sp.appliesStatus || sp.dotDamage || sp.kind === 'stun' || sp.kind === 'regen' || sp.kind === 'stun_block') && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {sp.dotDamage && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-orange-950/90 border border-orange-400/40 px-1.5 py-0.5 text-[9px] font-bold text-orange-200">
                            <Flame className="h-2.5 w-2.5" /> Burning
                          </span>
                        )}
                        {sp.appliesStatus && (
                          <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadgeTone(sp.appliesStatus.kind)}`}>
                            <StatusEffectIcon kind={sp.appliesStatus.kind} className="h-2.5 w-2.5" />
                            {STATUS_EFFECT_META[sp.appliesStatus.kind].name}
                          </span>
                        )}
                        {sp.kind === 'stun' && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-950/90 border border-amber-400/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                            <Ban className="h-2.5 w-2.5" /> Stun {sp.baseValue}t
                          </span>
                        )}
                        {sp.kind === 'regen' && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-950/90 border border-emerald-400/45 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                            <HeartPulse className="h-2.5 w-2.5" /> Regen {sp.dotTurns ?? 3}t
                          </span>
                        )}
                        {sp.kind === 'stun_block' && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-indigo-950/90 border border-indigo-400/45 px-1.5 py-0.5 text-[9px] font-bold text-indigo-200">
                            <ShieldAlert className="h-2.5 w-2.5" /> Stun Ward
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cast / Pass Controls */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => handleCastOrPass(false)}
                disabled={turnPending || Boolean(liveDuelState && !worldConnected) || (selectedCardIdx === null && selectedSideIdx === null && discardSet.length === 0)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f4c98b] px-5 py-2.5 text-xs font-bold text-[#241b16] disabled:opacity-45"
              >
                <Wand2 className="h-4 w-4" /> Cast Turn
              </button>
              <button
                onClick={() => handleCastOrPass(true)}
                disabled={turnPending || Boolean(liveDuelState && !worldConnected)}
                className="rounded-xl border border-white/25 bg-[#27314d] px-4 py-1.5 text-xs font-semibold hover:bg-[#334063]"
              >
                {turnPending ? 'Waiting for turn…' : 'Pass (+Gain Pip)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
