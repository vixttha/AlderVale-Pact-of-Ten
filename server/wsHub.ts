import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { RealmId } from '../shared/realms.ts';
import type { ZoneId } from '../shared/world.ts';
import type { ElementId } from '../shared/elements.ts';
import type { BeastClanId, RaceId, WizardSculpt } from '../shared/wardrobe.ts';
import { resolveDuelRound, chooseAiAction, drawUpToSeven, type DuelState, type TurnActionInput, type CombatantState } from '../shared/combat.ts';
import { getStarterDeckForElement } from '../shared/spells.ts';

export type EmoteId = 'wave' | 'cheer' | 'meditate' | 'cast';

export interface LivePlayerPresence {
  sessionId: string;
  wizardId: string;
  ownerId: string;
  name: string;
  realmId: RealmId;
  zone: ZoneId;
  raceId: RaceId;
  beastClan?: BeastClanId;
  elementId: ElementId;
  level: number;
  rank: number;
  titleBadge: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  mountId: string | null;
  activeCreatureSpeciesId: string;
  activeCreatureStage: 1 | 2 | 3;
  activeCreatureChromatic: 'none' | 'dawn' | 'dusk';
  sculpt?: WizardSculpt;
  equipped?: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string>;
  stitching?: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string | null>;
  inDuel?: boolean;
}

interface ClientConn {
  ws: WebSocket;
  sessionId: string;
  presence: LivePlayerPresence | null;
  duelId: string | null;
}

interface LiveDuelRoom {
  duelId: string;
  realmId: RealmId;
  state: DuelState;
  participants: Map<string, { sessionId: string; actorId: string; disconnectedAt: number | null }>;
  spectators: Set<string>;
  pendingActions: Map<string, TurnActionInput>;
  turnDeadline: number | null;
}

interface TradeSession {
  tradeId: string;
  realmId: RealmId;
  aSession: string;
  bSession: string;
  aOfferFlorins: number;
  bOfferFlorins: number;
  aLocked: boolean;
  bLocked: boolean;
  aConfirmed: boolean;
  bConfirmed: boolean;
}

export function attachAldervaleWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, ClientConn>();
  const duels = new Map<string, LiveDuelRoom>();
  const pvpQueues: Record<RealmId, string[]> = { breeze: [], horizon: [], everpeak: [] };
  const coopQueues: Record<RealmId, string[]> = { breeze: [], horizon: [], everpeak: [] };
  const trades = new Map<string, TradeSession>();
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function send(conn: ClientConn, payload: unknown) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(payload));
    }
  }

  function broadcastRealmZone(realmId: RealmId, zone: ZoneId, payload: unknown, excludeSessionId?: string) {
    const raw = JSON.stringify(payload);
    for (const c of clients.values()) {
      if (c.presence && c.presence.realmId === realmId && c.presence.zone === zone && c.sessionId !== excludeSessionId) {
        if (c.ws.readyState === WebSocket.OPEN) c.ws.send(raw);
      }
    }
  }

  function broadcastRealm(realmId: RealmId, payload: unknown) {
    const raw = JSON.stringify(payload);
    for (const c of clients.values()) {
      if (c.presence && c.presence.realmId === realmId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(raw);
      }
    }
  }

  function getZoneSnapshot(realmId: RealmId, zone: ZoneId): LivePlayerPresence[] {
    const out: LivePlayerPresence[] = [];
    for (const c of clients.values()) {
      if (c.presence && c.presence.realmId === realmId && c.presence.zone === zone) {
        out.push(c.presence);
      }
    }
    return out;
  }

  function broadcastDuel(room: LiveDuelRoom) {
    const payload = { type: 'duel_state', state: room.state };
    for (const p of room.participants.values()) {
      const conn = clients.get(p.sessionId);
      if (conn) send(conn, payload);
    }
    for (const specId of room.spectators) {
      const conn = clients.get(specId);
      if (conn) send(conn, payload);
    }
  }

  function setParticipantsInDuel(room: LiveDuelRoom, active: boolean) {
    for (const p of room.participants.values()) {
      const conn = clients.get(p.sessionId);
      if (conn?.presence) {
        conn.presence.inDuel = active;
        broadcastRealmZone(conn.presence.realmId, conn.presence.zone, {
          type: 'player_updated',
          player: conn.presence,
        });
      }
      if (!active && conn) conn.duelId = null;
    }
  }

  function tryResolveRoom(room: LiveDuelRoom) {
    const humanActors = room.state.playerTeam.filter((p) => !p.isNpc);
    const allSubmitted = humanActors.every((p) => p.hp <= 0 || room.pendingActions.has(p.id));
    const pvpEnemyHuman = room.state.enemyTeam.filter((e) => !e.isNpc);
    const enemiesSubmitted = pvpEnemyHuman.every((e) => e.hp <= 0 || room.pendingActions.has(e.id));

    if (!allSubmitted || !enemiesSubmitted) return;

    const actions: TurnActionInput[] = [...room.pendingActions.values()];
    for (const enemy of room.state.enemyTeam) {
      if (enemy.isNpc && enemy.hp > 0) {
        actions.push(chooseAiAction(enemy, room.state.playerTeam));
      }
    }

    room.state = resolveDuelRound(room.state, actions);
    room.pendingActions.clear();
    room.turnDeadline =
      room.state.phase === 'planning' && room.state.turnTimerSeconds
        ? Date.now() + room.state.turnTimerSeconds * 1000
        : null;
    broadcastDuel(room);
    if (room.state.phase === 'victory' || room.state.phase === 'defeat') {
      setParticipantsInDuel(room, false);
    }
  }

  // Sweep 30s turn timers & reconnect grace
  setInterval(() => {
    const now = Date.now();
    for (const room of duels.values()) {
      if (room.state.phase === 'planning' && room.turnDeadline && now >= room.turnDeadline) {
        for (const actor of [...room.state.playerTeam, ...room.state.enemyTeam]) {
          if (!actor.isNpc && actor.hp > 0 && !room.pendingActions.has(actor.id)) {
            room.pendingActions.set(actor.id, {
              actorId: actor.id,
              cardIndex: null,
              targetId: room.state.enemyTeam[0]?.id ?? '',
              creatureAction: 'none',
            });
          }
        }
        tryResolveRoom(room);
      }
    }
  }, 1000);

  wss.on('connection', (ws) => {
    const sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`;
    const conn: ClientConn = { ws, sessionId, presence: null, duelId: null };
    clients.set(sessionId, conn);
    send(conn, { type: 'welcome', sessionId });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        const type = String(msg.type ?? '');

        if (type === 'join_world') {
          const p = msg.presence as LivePlayerPresence;
          if (!p || !['breeze', 'horizon', 'everpeak'].includes(p.realmId)) return;
          conn.presence = { ...p, sessionId };
          // Cancel any duel reconnect forfeiture timer for this wizard
          const timerKey = `${p.realmId}:${p.wizardId}`;
          const existingTimer = reconnectTimers.get(timerKey);
          if (existingTimer) {
            clearTimeout(existingTimer);
            reconnectTimers.delete(timerKey);
            for (const room of duels.values()) {
              const part = room.participants.get(p.wizardId);
              if (part && room.realmId === p.realmId && room.state.phase !== 'victory' && room.state.phase !== 'defeat') {
                part.sessionId = sessionId;
                part.disconnectedAt = null;
                conn.duelId = room.duelId;
                send(conn, { type: 'duel_state', state: room.state });
              }
            }
          }
          send(conn, {
            type: 'zone_snapshot',
            players: getZoneSnapshot(p.realmId, p.zone),
            activeDuels: Array.from(duels.values())
              .filter((d) => d.realmId === p.realmId && d.state.phase === 'planning')
              .map((d) => ({ duelId: d.duelId, mode: d.state.mode, round: d.state.round, title: `${d.state.playerTeam[0]?.name} vs ${d.state.enemyTeam[0]?.name}` })),
          });
          broadcastRealmZone(p.realmId, p.zone, { type: 'player_joined', player: conn.presence }, sessionId);
        } else if (type === 'move' && conn.presence) {
          const prevZone = conn.presence.zone;
          const nextZone = (msg.zone as ZoneId) ?? prevZone;
          conn.presence.x = Number(msg.x ?? conn.presence.x);
          conn.presence.y = Number(msg.y ?? conn.presence.y);
          conn.presence.z = Number(msg.z ?? conn.presence.z);
          conn.presence.rotY = Number(msg.rotY ?? conn.presence.rotY);
          conn.presence.mountId = (msg.mountId as string | null) ?? null;
          conn.presence.zone = nextZone;
          if (prevZone !== nextZone) {
            broadcastRealmZone(conn.presence.realmId, prevZone, { type: 'player_left', sessionId });
            send(conn, { type: 'zone_snapshot', players: getZoneSnapshot(conn.presence.realmId, nextZone), activeDuels: [] });
            broadcastRealmZone(conn.presence.realmId, nextZone, { type: 'player_joined', player: conn.presence }, sessionId);
          } else {
            broadcastRealmZone(conn.presence.realmId, nextZone, { type: 'player_moved', sessionId, x: conn.presence.x, y: conn.presence.y, z: conn.presence.z, rotY: conn.presence.rotY, mountId: conn.presence.mountId }, sessionId);
          }
        } else if (type === 'update_appearance' && conn.presence) {
          const patch = msg.patch as Partial<LivePlayerPresence>;
          if (patch) {
            conn.presence = {
              ...conn.presence,
              ...patch,
              sessionId,
              wizardId: conn.presence.wizardId,
              realmId: conn.presence.realmId,
            };
            broadcastRealmZone(
              conn.presence.realmId,
              conn.presence.zone,
              { type: 'player_updated', player: conn.presence },
              sessionId,
            );
          }
        } else if (type === 'emote' && conn.presence) {
          const emote = String(msg.emote ?? 'wave') as EmoteId;
          if (!['wave', 'cheer', 'meditate', 'cast'].includes(emote)) return;
          broadcastRealmZone(
            conn.presence.realmId,
            conn.presence.zone,
            { type: 'player_emote', sessionId, emote },
            sessionId,
          );
        } else if (type === 'chat' && conn.presence) {
          const text = String(msg.text ?? '').slice(0, 180).trim();
          if (!text) return;
          broadcastRealm(conn.presence.realmId, {
            type: 'chat_message',
            senderSessionId: sessionId,
            senderWizardId: conn.presence.wizardId,
            senderName: conn.presence.name,
            elementId: conn.presence.elementId,
            text,
            at: Date.now(),
          });
        } else if (type === 'cantrip_pulse' && conn.presence) {
          broadcastRealmZone(conn.presence.realmId, conn.presence.zone, {
            type: 'cantrip_fx',
            sessionId,
            cantrip: String(msg.cantrip ?? 'sense'),
            x: conn.presence.x,
            z: conn.presence.z,
          }, sessionId);
        } else if ((type === 'queue_pvp' || type === 'queue_coop') && conn.presence) {
          const realm = conn.presence.realmId;
          const isCoop = type === 'queue_coop';
          const q = isCoop ? coopQueues[realm] : pvpQueues[realm];
          if (!q.includes(sessionId)) q.push(sessionId);
          send(conn, { type: 'queue_status', queue: isCoop ? 'coop' : 'pvp', count: q.length });

          if (q.length >= 2) {
            const sA = q.shift()!;
            const sB = q.shift()!;
            const cA = clients.get(sA);
            const cB = clients.get(sB);
            if (cA?.presence && cB?.presence) {
              const makeFighter = (p: LivePlayerPresence): CombatantState => {
                const f: CombatantState = {
                  id: p.wizardId,
                  name: p.name,
                  isPlayer: true,
                  raceId: p.raceId,
                  element: p.elementId,
                  archmasteryElement: p.elementId,
                  hp: isCoop ? 720 : 650,
                  maxHp: isCoop ? 720 : 650,
                  powerPips: 1,
                  regularPips: 1,
                  schoolPips: 1,
                  accuracyBonus: 4,
                  powerBonusPct: 12,
                  piercePct: 4,
                  critPct: 12,
                  blockPct: 8,
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
                  deck: getStarterDeckForElement(p.elementId),
                  discard: [],
                  sideboard: ['uni_enchant_keen', 'frost_tower_ward'],
                  spellwrighting: {},
                  creatures: [{ id: 'p1', speciesId: p.activeCreatureSpeciesId, nickname: 'Partner', element: p.elementId, stage: p.activeCreatureStage, chromatic: p.activeCreatureChromatic, branchChoice: 'A', hp: 220, maxHp: 220, talents: [] }],
                  activeCreatureIdx: 0,
                };
                drawUpToSeven(f);
                return f;
              };

              if (isCoop) {
                const duelId = `coop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const boss: CombatantState = {
                  id: `boss_colossus_${Date.now()}`,
                  name: 'Sky-Tempest Colossus',
                  isPlayer: false,
                  isNpc: true,
                  raceId: 'astral_kin',
                  element: 'spark',
                  archmasteryElement: 'tide',
                  hp: 1350,
                  maxHp: 1350,
                  powerPips: 2,
                  regularPips: 2,
                  schoolPips: 1,
                  accuracyBonus: 6,
                  powerBonusPct: 18,
                  piercePct: 10,
                  critPct: 12,
                  blockPct: 8,
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
                  deck: getStarterDeckForElement('spark'),
                  discard: [],
                  sideboard: [],
                  spellwrighting: {},
                  creatures: [],
                  activeCreatureIdx: 0,
                  bossCheatPattern: 'shield_on_blade',
                };
                drawUpToSeven(boss);

                const room: LiveDuelRoom = {
                  duelId,
                  realmId: realm,
                  state: {
                    duelId,
                    mode: 'coop',
                    round: 1,
                    turnTimerSeconds: 30,
                    arenaBubble: null,
                    playerTeam: [makeFighter(cA.presence), makeFighter(cB.presence)],
                    enemyTeam: [boss],
                    firstTeam: 'player',
                    phase: 'planning',
                    logs: [`Co-op Boss Trial! ${cA.presence.name} & ${cB.presence.name} vs Sky-Tempest Colossus (Co-op Resonance +15% active!)`],
                    telegraphedCheat: 'Boss Cheat Active: Colossus raises Guardian Ward if either player stacks 2+ Blades.',
                  },
                  participants: new Map([
                    [cA.presence.wizardId, { sessionId: sA, actorId: cA.presence.wizardId, disconnectedAt: null }],
                    [cB.presence.wizardId, { sessionId: sB, actorId: cB.presence.wizardId, disconnectedAt: null }],
                  ]),
                  spectators: new Set(),
                  pendingActions: new Map(),
                  turnDeadline: Date.now() + 30_000,
                };
                duels.set(duelId, room);
                cA.duelId = duelId;
                cB.duelId = duelId;
                setParticipantsInDuel(room, true);
                broadcastDuel(room);
              } else {
                const duelId = `pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const room: LiveDuelRoom = {
                  duelId,
                  realmId: realm,
                  state: {
                    duelId,
                    mode: 'pvp',
                    round: 1,
                    turnTimerSeconds: 30,
                    arenaBubble: null,
                    playerTeam: [makeFighter(cA.presence)],
                    enemyTeam: [makeFighter(cB.presence)],
                    firstTeam: Math.random() < 0.5 ? 'player' : 'enemy',
                    phase: 'planning',
                    logs: [`Live 1v1 Duel started! ${cA.presence.name} vs ${cB.presence.name} (Fair PvP 650 HP scaling)`],
                    telegraphedCheat: null,
                  },
                  participants: new Map([
                    [cA.presence.wizardId, { sessionId: sA, actorId: cA.presence.wizardId, disconnectedAt: null }],
                    [cB.presence.wizardId, { sessionId: sB, actorId: cB.presence.wizardId, disconnectedAt: null }],
                  ]),
                  spectators: new Set(),
                  pendingActions: new Map(),
                  turnDeadline: Date.now() + 30_000,
                };
                duels.set(duelId, room);
                cA.duelId = duelId;
                cB.duelId = duelId;
                setParticipantsInDuel(room, true);
                broadcastDuel(room);
              }
            }
          }
        } else if (type === 'duel_action' && conn.duelId) {
          const room = duels.get(conn.duelId);
          if (!room) return;
          const act = msg.action as TurnActionInput;
          room.pendingActions.set(act.actorId, act);
          tryResolveRoom(room);
        } else if (type === 'spectate_duel' && conn.presence) {
          const room = duels.get(String(msg.duelId ?? ''));
          if (room && room.realmId === conn.presence.realmId) {
            room.spectators.add(sessionId);
            send(conn, { type: 'duel_state', state: room.state });
          }
        } else if (type === 'trade_propose' && conn.presence) {
          const targetSession = String(msg.targetSessionId ?? '');
          const partner = clients.get(targetSession);
          if (partner?.presence && partner.presence.realmId === conn.presence.realmId) {
            const tradeId = `tr_${Date.now()}`;
            trades.set(tradeId, {
              tradeId,
              realmId: conn.presence.realmId,
              aSession: sessionId,
              bSession: targetSession,
              aOfferFlorins: 0,
              bOfferFlorins: 0,
              aLocked: false,
              bLocked: false,
              aConfirmed: false,
              bConfirmed: false,
            });
            const t = trades.get(tradeId)!;
            send(conn, { type: 'trade_update', trade: t, partnerName: partner.presence.name });
            send(partner, { type: 'trade_update', trade: t, partnerName: conn.presence.name });
          }
        } else if (type === 'trade_step') {
          const t = trades.get(String(msg.tradeId ?? ''));
          if (!t) return;
          const isA = sessionId === t.aSession;
          const isB = sessionId === t.bSession;
          if (!isA && !isB) return;
          if (typeof msg.florins === 'number') {
            const clean = Math.max(0, Math.floor(msg.florins));
            if (isA) {
              t.aOfferFlorins = clean;
              t.aLocked = false;
              t.bLocked = false;
              t.aConfirmed = false;
              t.bConfirmed = false;
            } else {
              t.bOfferFlorins = clean;
              t.aLocked = false;
              t.bLocked = false;
              t.aConfirmed = false;
              t.bConfirmed = false;
            }
          }
          if (msg.lock === true) {
            if (isA) t.aLocked = true;
            else t.bLocked = true;
          }
          if (msg.confirm === true && t.aLocked && t.bLocked) {
            if (isA) t.aConfirmed = true;
            else t.bConfirmed = true;
          }
          const cA = clients.get(t.aSession);
          const cB = clients.get(t.bSession);
          if (cA) send(cA, { type: 'trade_update', trade: t });
          if (cB) send(cB, { type: 'trade_update', trade: t });
          if (t.aConfirmed && t.bConfirmed) {
            if (cA) send(cA, { type: 'trade_complete', tradeId: t.tradeId, deltaFlorins: t.bOfferFlorins - t.aOfferFlorins });
            if (cB) send(cB, { type: 'trade_complete', tradeId: t.tradeId, deltaFlorins: t.aOfferFlorins - t.bOfferFlorins });
            trades.delete(t.tradeId);
          }
        }
      } catch {
        // Ignore malformed frame safely
      }
    });

    ws.on('close', () => {
      for (const q of Object.values(pvpQueues)) {
        const idx = q.indexOf(sessionId);
        if (idx >= 0) q.splice(idx, 1);
      }
      for (const q of Object.values(coopQueues)) {
        const idx = q.indexOf(sessionId);
        if (idx >= 0) q.splice(idx, 1);
      }
      if (conn.presence) {
        const { realmId, zone, wizardId } = conn.presence;
        broadcastRealmZone(realmId, zone, { type: 'player_left', sessionId });
        if (conn.duelId) {
          const room = duels.get(conn.duelId);
          const part = room?.participants.get(wizardId);
          if (room && part) {
            part.disconnectedAt = Date.now();
            const timerKey = `${realmId}:${wizardId}`;
            const t = setTimeout(() => {
              const actor = [...room.state.playerTeam, ...room.state.enemyTeam].find((a) => a.id === part.actorId);
              if (actor && part.disconnectedAt) {
                actor.hp = 0;
                room.state.phase = room.state.playerTeam.some((p) => p.hp > 0) ? 'victory' : 'defeat';
                room.state.logs.push(`${actor.name} exceeded the 30s reconnect grace window and forfeited.`);
                broadcastDuel(room);
              }
              reconnectTimers.delete(timerKey);
            }, 30_000);
            reconnectTimers.set(timerKey, t);
          }
        }
      }
      clients.delete(sessionId);
    });
  });
}
