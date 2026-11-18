import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { verifyFirebaseBearerToken } from './authVerify.ts';
import { ownedActiveCreature, settleTrade, awardLiveVictory, RequestError } from './market.ts';
import { resolveLiveCombatCreature, sanitizeGuestCreatureSelection } from './creatureSelection.ts';
import { ownedProgressionWizard } from './progressionState.ts';
import { setGameplayPresence, refreshGameplayPresence, clearGameplayPresence } from './gameplayPresence.ts';
import { duelView, readDuelAction } from './duelView.ts';
import { ELEMENTS } from '../shared/elements.ts';
import { RACES } from '../shared/wardrobe.ts';
import { ZONES } from '../shared/world.ts';
import type { Server } from 'node:http';
import type { RealmId } from '../shared/realms.ts';
import type { ZoneId } from '../shared/world.ts';
import type { ElementId } from '../shared/elements.ts';
import type { BeastClanId, RaceId, WizardSculpt } from '../shared/wardrobe.ts';
import { resolveDuelRound, isDuelComplete, chooseAiAction, drawUpToSeven, type DuelState, type TurnActionInput, type CombatantState, type CombatCreatureSlot } from '../shared/combat.ts';
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
  activeCreatureId: string;
  activeCreatureSpeciesId: string;
  activeCreatureNickname: string;
  activeCreatureStage: 1 | 2 | 3;
  activeCreatureChromatic: 'none' | 'dawn' | 'dusk';
  activeCreatureBranchChoice: 'A' | 'B';
  activeCreatureTalents: string[];
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
  verifiedUid: string | null;
  heartbeatChallenge: string | null;
  joining: boolean;
  duelElement: ElementId;
  duelRace: RaceId;
}

interface LiveDuelRoom {
  duelId: string;
  realmId: RealmId;
  state: DuelState;
  participants: Map<string, { sessionId: string; actorId: string; disconnectedAt: number | null }>;
  spectators: Set<string>;
  pendingActions: Map<string, TurnActionInput>;
  turnDeadline: number | null;
  finishedAt?: number;
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

interface TradeInvite {
  inviteId: string;
  realmId: RealmId;
  fromSession: string;
  toSession: string;
}

export function attachAldervaleWebSocketServer(httpServer: Server, reconnectGraceMs = 30_000) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 16 * 1024 });
  const clients = new Map<string, ClientConn>();
  const duels = new Map<string, LiveDuelRoom>();
  const pvpQueues: Record<RealmId, string[]> = { breeze: [], horizon: [], everpeak: [] };
  const coopQueues: Record<RealmId, string[]> = { breeze: [], horizon: [], everpeak: [] };
  const trades = new Map<string, TradeSession>();
  const tradeInvites = new Map<string, TradeInvite>();
  const guestTickets = new Map<string, { wizardId: string; realm: RealmId; expiresAt: number }>();
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function send(conn: ClientConn, payload: unknown) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(payload));
    }
  }

  function cancelTrade(trade: TradeSession, message: string) {
    trades.delete(trade.tradeId);
    for (const id of [trade.aSession, trade.bSession]) {
      const client = clients.get(id);
      if (client) send(client, { type: 'trade_cancelled', message });
    }
  }

  function cancelInvitesForSession(sessionId: string, message: string) {
    for (const [inviteId, invite] of [...tradeInvites.entries()]) {
      if (invite.fromSession !== sessionId && invite.toSession !== sessionId) continue;
      tradeInvites.delete(inviteId);
      for (const id of [invite.fromSession, invite.toSession]) {
        const client = clients.get(id);
        if (client) send(client, { type: 'trade_invite_closed', inviteId, message });
      }
    }
  }

  function openTradeSession(realmId: RealmId, proposerSession: string, recipientSession: string) {
    const tradeId = randomUUID();
    const trade: TradeSession = {
      tradeId,
      realmId,
      aSession: proposerSession,
      bSession: recipientSession,
      aOfferFlorins: 0,
      bOfferFlorins: 0,
      aLocked: false,
      bLocked: false,
      aConfirmed: false,
      bConfirmed: false,
    };
    trades.set(tradeId, trade);
    const proposer = clients.get(proposerSession);
    const recipient = clients.get(recipientSession);
    if (proposer?.presence) {
      send(proposer, { type: 'trade_update', trade, partnerName: recipient?.presence?.name ?? 'Wizard', isA: true });
    }
    if (recipient?.presence) {
      send(recipient, { type: 'trade_update', trade, partnerName: proposer?.presence?.name ?? 'Wizard', isA: false });
    }
  }

  function broadcastRealmZone(realmId: RealmId, zone: ZoneId, payload: { type: string; player?: LivePlayerPresence; [key: string]: unknown }, excludeSessionId?: string) {
    const raw = JSON.stringify(payload);
    const source = payload.player && clients.get(payload.player.sessionId);
    for (const c of clients.values()) {
      if (source && source !== c && source.verifiedUid && c.verifiedUid === source.verifiedUid) continue;
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

  function getZoneSnapshot(realmId: RealmId, zone: ZoneId, viewer: ClientConn): LivePlayerPresence[] {
    const out: LivePlayerPresence[] = [];
    for (const c of clients.values()) {
      if (c.ws.readyState !== WebSocket.OPEN || (c !== viewer && viewer.verifiedUid && viewer.verifiedUid === c.verifiedUid)) continue;
      if (c.presence && c.presence.realmId === realmId && c.presence.zone === zone) {
        out.push(c.presence);
      }
    }
    return out;
  }

  function spectateDuelsForRealm(realmId: RealmId) {
    return Array.from(duels.values())
      .filter((d) => d.realmId === realmId && !isDuelComplete(d.state.phase))
      .map((d) => ({
        duelId: d.duelId,
        mode: d.state.mode,
        round: d.state.round,
        title: `${d.state.playerTeam[0]?.name ?? 'Wizard'} vs ${d.state.enemyTeam[0]?.name ?? 'Opponent'}`,
      }));
  }

  function broadcastRealmSpectateDuels(realmId: RealmId) {
    broadcastRealm(realmId, { type: 'duels_updated', activeDuels: spectateDuelsForRealm(realmId) });
  }

  function sendDuel(conn: ClientConn, room: LiveDuelRoom, actorId?: string) {
    send(conn, { type: 'duel_state', state: duelView(room.state, actorId), spectator: !actorId, turnDeadline: room.turnDeadline });
  }

  function broadcastDuel(room: LiveDuelRoom) {
    for (const p of room.participants.values()) {
      const conn = clients.get(p.sessionId);
      if (conn) sendDuel(conn, room, p.actorId);
    }
    for (const specId of room.spectators) {
      const conn = clients.get(specId);
      if (conn) sendDuel(conn, room);
    }
  }

  function finishRoom(room: LiveDuelRoom) {
    if (room.finishedAt) return;
    room.finishedAt = Date.now();
    room.turnDeadline = null;
    setParticipantsInDuel(room, false);
    const mode = room.state.mode;
    if (mode === 'pvp' || mode === 'coop') {
      const winners = room.state.phase === 'victory' ? room.state.playerTeam
        : mode === 'pvp' && room.state.phase === 'defeat' ? room.state.enemyTeam : [];
      const awarded = new Set<string>();
      for (const actor of winners.filter((winner) => winner.hp > 0)) {
        const participant = room.participants.get(actor.id);
        const winner = participant ? clients.get(participant.sessionId) : undefined;
        const uid = winner?.verifiedUid;
        if (!uid || awarded.has(uid)) continue;
        awarded.add(uid);
        void awardLiveVictory(room.realmId, uid, room.duelId, mode)
          .then((wallet) => send(winner, { type: 'market_wallet', wallet }))
          .catch(() => send(winner, { type: 'world_notice', text: 'Your shared duel reward could not be saved.' }));
      }
    }
    broadcastRealmSpectateDuels(room.realmId);
  }

  function forfeit(room: LiveDuelRoom, actorId: string) {
    if (room.state.phase !== 'planning') return;
    const actor = [...room.state.playerTeam, ...room.state.enemyTeam].find((entry) => entry.id === actorId);
    if (!actor || actor.hp <= 0) return;
    actor.hp = 0;
    room.pendingActions.delete(actorId);
    room.state.logs.push(`${actor.name} forfeited the duel.`);
    if (!room.state.playerTeam.some((entry) => entry.hp > 0)) room.state.phase = 'defeat';
    else if (!room.state.enemyTeam.some((entry) => entry.hp > 0)) room.state.phase = 'victory';
    else {
      const departed = room.participants.get(actorId);
      const conn = departed ? clients.get(departed.sessionId) : undefined;
      room.participants.delete(actorId);
      if (conn?.presence) {
        conn.duelId = null;
        conn.presence.inDuel = false;
        broadcastRealmZone(conn.presence.realmId, conn.presence.zone, { type: 'player_updated', player: conn.presence });
      }
      broadcastDuel(room);
      tryResolveRoom(room);
      return;
    }
    finishRoom(room);
    broadcastDuel(room);
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
    if (isDuelComplete(room.state.phase)) finishRoom(room);
    broadcastDuel(room);
  }

  // Sweep 30s turn timers & reconnect grace
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ticket, guest] of guestTickets) if (guest.expiresAt <= now) guestTickets.delete(ticket);
    for (const room of duels.values()) {
      if (room.finishedAt && now - room.finishedAt > 60_000) duels.delete(room.duelId);
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
  sweep.unref();

  // WebSocket clients answer protocol pings even while the player is idle.
  const heartbeat = setInterval(() => {
    for (const conn of clients.values()) {
      if (!conn.verifiedUid || !conn.presence || conn.ws.readyState !== WebSocket.OPEN) continue;
      if (conn.heartbeatChallenge !== null) {
        clearGameplayPresence(conn.sessionId);
        conn.ws.terminate();
        continue;
      }
      conn.heartbeatChallenge = randomUUID();
      conn.ws.ping(conn.heartbeatChallenge);
    }
  }, 25_000);
  heartbeat.unref();

  wss.on('close', () => {
    clearInterval(sweep);
    clearInterval(heartbeat);
    for (const timer of reconnectTimers.values()) clearTimeout(timer);
  });

  wss.on('connection', (ws) => {
    const sessionId = randomUUID();
    const conn: ClientConn = {
      ws, sessionId, presence: null, duelId: null, verifiedUid: null, heartbeatChallenge: null,
      joining: false, duelElement: 'ember', duelRace: 'human',
    };
    clients.set(sessionId, conn);
    send(conn, { type: 'welcome', sessionId });

    ws.on('error', () => ws.terminate());
    ws.on('pong', (data) => {
      if (ws.readyState !== WebSocket.OPEN || data.toString() !== conn.heartbeatChallenge) return;
      conn.heartbeatChallenge = null;
      refreshGameplayPresence(sessionId);
    });
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        const type = String(msg.type ?? '');

        if (type === 'join_world') {
          if (conn.presence || conn.joining) return;
          const p = msg.presence as Partial<LivePlayerPresence>;
          if (!p || !p.realmId || !['breeze', 'horizon', 'everpeak'].includes(p.realmId) ||
              !p.zone || !Object.hasOwn(ZONES, p.zone) || typeof p.name !== 'string' ||
              !p.raceId || !Object.hasOwn(RACES, p.raceId) || !p.elementId || !Object.hasOwn(ELEMENTS, p.elementId)) return;
          conn.joining = true;
          try {
            let identity: string;
            let activeCreatureId = typeof p.activeCreatureId === 'string' ? p.activeCreatureId : '';
            let name = p.name.trim().slice(0, 24) || 'Alder Initiate';
            const realm = p.realmId;
            if (typeof msg.idToken === 'string') {
              const principal = await verifyFirebaseBearerToken(`Bearer ${msg.idToken}`);
              if (!principal?.emailVerified) throw new RequestError(401, 'Sign in again to connect to AlderVale.');
              const wizard = await ownedProgressionWizard(principal.uid, p.wizardId, realm);
              activeCreatureId = wizard.activeCreatureId;
              conn.verifiedUid = principal.uid;
              identity = wizard.id;
              name = wizard.name;
              p.level = wizard.level;
              p.rank = wizard.rank;
              p.titleBadge = wizard.progression.titleBadge;
              p.raceId = Object.hasOwn(RACES, wizard.raceId) ? wizard.raceId : 'human';
              p.elementId = Object.hasOwn(ELEMENTS, wizard.elementId) ? wizard.elementId : 'ember';
            } else {
              const previous = typeof msg.guestTicket === 'string' ? guestTickets.get(msg.guestTicket) : undefined;
              const key = typeof msg.guestTicket === 'string' && previous?.realm === realm && previous.expiresAt > Date.now() ? msg.guestTicket : randomUUID();
              identity = guestTickets.get(key)?.wizardId ?? `guest_${randomUUID()}`;
              guestTickets.set(key, { realm, wizardId: identity, expiresAt: Date.now() + 86_400_000 });
              send(conn, { type: 'guest_ticket', ticket: key });
            }
            if (ws.readyState !== WebSocket.OPEN) return;
            if ([...clients.values()].some((entry) => entry !== conn && entry.presence?.wizardId === identity && entry.presence.realmId === realm)) {
              throw new RequestError(409, 'This wizard already has a live session.');
            }
            const spawn = ZONES[p.zone].spawnPos;
            const selectedCreature = sanitizeGuestCreatureSelection({ ...p, activeCreatureId });
            conn.presence = {
              ...p, ...selectedCreature, sessionId, wizardId: identity, ownerId: '', name, realmId: realm, zone: p.zone,
              raceId: p.raceId, elementId: p.elementId,
              level: Number.isFinite(p.level) ? Math.min(50, Math.max(1, Number(p.level))) : 1,
              rank: Number.isFinite(p.rank) ? Math.min(20, Math.max(1, Number(p.rank))) : 1,
              titleBadge: typeof p.titleBadge === 'string' ? p.titleBadge.slice(0, 40) : '',
              x: spawn[0], y: spawn[1], z: spawn[2], rotY: 0, mountId: null, inDuel: false,
            };
            conn.duelElement = p.elementId;
            conn.duelRace = p.raceId;
            if (conn.verifiedUid && conn.presence) setGameplayPresence(sessionId, { ...conn.presence, uid: conn.verifiedUid });
            send(conn, { type: 'world_joined' });
          } catch (error) {
            send(conn, { type: 'world_notice', text: error instanceof RequestError ? error.message : 'Multiplayer is temporarily unavailable.' });
            ws.close(1013, 'Unable to join');
            return;
          } finally {
            conn.joining = false;
          }
          const pBound = conn.presence;
          if (!pBound) return;
          // Cancel any duel reconnect forfeiture timer for this wizard
          const timerKey = `${pBound.realmId}:${pBound.wizardId}`;
          const existingTimer = reconnectTimers.get(timerKey);
          if (existingTimer) {
            clearTimeout(existingTimer);
            reconnectTimers.delete(timerKey);
            for (const room of duels.values()) {
              const part = room.participants.get(pBound.wizardId);
              if (part && room.realmId === pBound.realmId && !isDuelComplete(room.state.phase)) {
                part.sessionId = sessionId;
                part.disconnectedAt = null;
                conn.duelId = room.duelId;
                pBound.inDuel = true;
                sendDuel(conn, room, part.actorId);
              }
            }
          }
          send(conn, {
            type: 'zone_snapshot',
            players: getZoneSnapshot(pBound.realmId, pBound.zone, conn),
            activeDuels: spectateDuelsForRealm(pBound.realmId),
          });
          broadcastRealmZone(pBound.realmId, pBound.zone, { type: 'player_joined', player: conn.presence }, sessionId);
        } else if (type === 'move' && conn.presence) {
          const prevZone = conn.presence.zone;
          const nextZone = typeof msg.zone === 'string' && Object.hasOwn(ZONES, msg.zone) ? msg.zone as ZoneId : prevZone;
          if (![msg.x, msg.y, msg.z, msg.rotY].every((v) => v === undefined || typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000)) return;
          conn.presence.x = Number(msg.x ?? conn.presence.x);
          conn.presence.y = Number(msg.y ?? conn.presence.y);
          conn.presence.z = Number(msg.z ?? conn.presence.z);
          conn.presence.rotY = Number(msg.rotY ?? conn.presence.rotY);
          conn.presence.mountId = (msg.mountId as string | null) ?? null;
          conn.presence.zone = nextZone;
          if (conn.verifiedUid) setGameplayPresence(sessionId, { ...conn.presence, uid: conn.verifiedUid });
          if (prevZone !== nextZone) {
            broadcastRealmZone(conn.presence.realmId, prevZone, { type: 'player_left', sessionId });
            send(conn, { type: 'zone_snapshot', players: getZoneSnapshot(conn.presence.realmId, nextZone, conn), activeDuels: spectateDuelsForRealm(conn.presence.realmId) });
            broadcastRealmZone(conn.presence.realmId, nextZone, { type: 'player_joined', player: conn.presence }, sessionId);
          } else {
            broadcastRealmZone(conn.presence.realmId, nextZone, { type: 'player_moved', sessionId, x: conn.presence.x, y: conn.presence.y, z: conn.presence.z, rotY: conn.presence.rotY, mountId: conn.presence.mountId }, sessionId);
          }
        } else if (type === 'update_appearance' && conn.presence) {
          const patch = msg.patch as Partial<LivePlayerPresence>;
          if (patch) {
            if (patch.raceId && Object.hasOwn(RACES, patch.raceId)) conn.presence.raceId = patch.raceId;
            if (patch.elementId && Object.hasOwn(ELEMENTS, patch.elementId)) conn.presence.elementId = patch.elementId;
            Object.assign(conn.presence, sanitizeGuestCreatureSelection({ ...conn.presence, ...patch }));
            if (typeof patch.titleBadge === 'string') conn.presence.titleBadge = patch.titleBadge.slice(0, 40);
            if (typeof patch.level === 'number' && Number.isInteger(patch.level) && patch.level >= 1 && patch.level <= 50) conn.presence.level = patch.level;
            if (typeof patch.rank === 'number' && Number.isInteger(patch.rank) && patch.rank >= 1 && patch.rank <= 20) conn.presence.rank = patch.rank;
            for (const key of ['sculpt', 'equipped', 'stitching', 'mountId'] as const) {
              if (patch[key] !== undefined) Object.assign(conn.presence, { [key]: patch[key] });
            }
            broadcastRealmZone(conn.presence.realmId, conn.presence.zone, { type: 'player_updated', player: conn.presence }, sessionId);
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
        } else if ((type === 'queue_pvp' || type === 'queue_coop') && conn.presence && !conn.duelId) {
          const realm = conn.presence.realmId;
          const isCoop = type === 'queue_coop';
          const q = isCoop ? coopQueues[realm] : pvpQueues[realm];
          for (const other of [coopQueues[realm], pvpQueues[realm]]) {
            const index = other.indexOf(sessionId);
            if (index >= 0) other.splice(index, 1);
          }
          q.push(sessionId);
          send(conn, { type: 'queue_status', queue: isCoop ? 'coop' : 'pvp', count: q.length });

          const compatible = q.findIndex((id) => id !== sessionId &&
            (conn.verifiedUid ? Boolean(clients.get(id)?.verifiedUid && clients.get(id)?.verifiedUid !== conn.verifiedUid) : !clients.get(id)?.verifiedUid));
          if (compatible >= 0) {
            const [sA] = q.splice(compatible, 1);
            const sB = sessionId;
            q.splice(q.indexOf(sB), 1);
            const cA = clients.get(sA);
            const cB = clients.get(sB);
            if (cA?.presence && cB?.presence && !cA.duelId && !cB.duelId) {
              for (const room of duels.values()) {
                room.spectators.delete(sA);
                room.spectators.delete(sB);
              }
              const presenceA = cA.presence;
              const presenceB = cB.presence;
              let creatureA: CombatCreatureSlot;
              let creatureB: CombatCreatureSlot;
              try {
                [creatureA, creatureB] = await Promise.all([
                  resolveLiveCombatCreature({ verifiedUid: cA.verifiedUid, wizardId: presenceA.wizardId, realmId: presenceA.realmId, guestSelection: presenceA }, ownedActiveCreature),
                  resolveLiveCombatCreature({ verifiedUid: cB.verifiedUid, wizardId: presenceB.wizardId, realmId: presenceB.realmId, guestSelection: presenceB }, ownedActiveCreature),
                ]);
              } catch {
                send(cA, { type: 'world_notice', text: 'Your selected creature could not be verified. Reconnect and try again.' });
                send(cB, { type: 'world_notice', text: 'Your selected creature could not be verified. Reconnect and try again.' });
                return;
              }
              const makeFighter = (p: LivePlayerPresence, { duelElement, duelRace }: ClientConn, creature: CombatCreatureSlot): CombatantState => {
                const f: CombatantState = {
                  id: p.wizardId,
                  name: p.name,
                  isPlayer: true,
                  raceId: duelRace,
                  element: duelElement,
                  archmasteryElement: duelElement,
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
                  deck: getStarterDeckForElement(duelElement),
                  discard: [],
                  sideboard: ['uni_enchant_keen', 'frost_tower_ward'],
                  spellwrighting: {},
                  creatures: [creature],
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
                    playerTeam: [makeFighter(presenceA, cA, creatureA), makeFighter(presenceB, cB, creatureB)],
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
                broadcastRealmSpectateDuels(realm);
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
                    playerTeam: [makeFighter(presenceA, cA, creatureA)],
                    enemyTeam: [makeFighter(presenceB, cB, creatureB)],
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
                broadcastRealmSpectateDuels(realm);
              }
            }
          }
        } else if (type === 'duel_action' && conn.duelId) {
          const room = duels.get(conn.duelId);
          if (!room || room.state.phase !== 'planning' || !room.turnDeadline || Date.now() >= room.turnDeadline ||
              msg.round !== room.state.round || msg.duelId !== room.duelId) return;
          const participant = conn.presence ? room.participants.get(conn.presence.wizardId) : undefined;
          if (participant?.sessionId !== sessionId || room.pendingActions.has(participant.actorId)) return;
          const inPlayerTeam = room.state.playerTeam.some((actor) => actor.id === participant.actorId);
          const team = inPlayerTeam ? room.state.playerTeam : room.state.enemyTeam;
          const actor = team.find((member) => member.id === participant.actorId);
          if (!actor) return;
          const act = readDuelAction(msg.action, actor, inPlayerTeam ? room.state.enemyTeam : room.state.playerTeam);
          if (!act) return;
          room.pendingActions.set(actor.id, act);
          tryResolveRoom(room);
        } else if (type === 'duel_leave') {
          for (const room of duels.values()) room.spectators.delete(sessionId);
          const room = conn.duelId ? duels.get(conn.duelId) : undefined;
          if (room && conn.presence && room.participants.get(conn.presence.wizardId)?.sessionId === sessionId) {
            forfeit(room, conn.presence.wizardId);
          }
        } else if (type === 'spectate_duel' && conn.presence) {
          const room = duels.get(String(msg.duelId ?? ''));
          if (room && !conn.duelId && room.realmId === conn.presence.realmId) {
            room.spectators.add(sessionId);
            sendDuel(conn, room);
          }
        } else if (type === 'trade_propose' && conn.presence) {
          const targetSession = String(msg.targetSessionId ?? '');
          const partner = clients.get(targetSession);
          if (!conn.verifiedUid || !partner?.verifiedUid) {
            send(conn, { type: 'world_notice', text: 'Both traders must sign in with Google.' });
            return;
          }
          if (conn.verifiedUid === partner.verifiedUid || partner.presence?.realmId !== conn.presence.realmId) return;
          const busyPair = [...trades.values()].some((trade) => [trade.aSession, trade.bSession].some((id) => id === sessionId || id === targetSession));
          const pendingPair = [...tradeInvites.values()].some((invite) =>
            [invite.fromSession, invite.toSession].some((id) => id === sessionId || id === targetSession),
          );
          if (busyPair || pendingPair) {
            send(conn, { type: 'world_notice', text: 'That player already has a pending or active trade.' });
            return;
          }
          const inviteId = randomUUID();
          tradeInvites.set(inviteId, {
            inviteId,
            realmId: conn.presence.realmId,
            fromSession: sessionId,
            toSession: targetSession,
          });
          send(partner, { type: 'trade_invite', inviteId, proposerName: conn.presence.name });
          send(conn, { type: 'trade_invite_sent', inviteId, targetName: partner.presence.name });
        } else if (type === 'trade_respond' && conn.presence) {
          const inviteId = String(msg.inviteId ?? '');
          const invite = tradeInvites.get(inviteId);
          if (!invite || invite.toSession !== sessionId) return;
          tradeInvites.delete(inviteId);
          const proposer = clients.get(invite.fromSession);
          if (msg.accept === true) {
            if (proposer?.presence?.realmId === conn.presence.realmId) {
              openTradeSession(invite.realmId, invite.fromSession, invite.toSession);
            }
          } else {
            const declined = 'Trade invitation declined.';
            send(conn, { type: 'trade_invite_closed', inviteId, message: declined });
            if (proposer) send(proposer, { type: 'trade_invite_closed', inviteId, message: declined });
          }
        } else if (type === 'trade_step') {
          const t = trades.get(String(msg.tradeId ?? ''));
          if (!t) return;
          const isA = sessionId === t.aSession;
          const isB = sessionId === t.bSession;
          if (!isA && !isB) return;
          if (typeof msg.florins === 'number') {
            if (!Number.isSafeInteger(msg.florins) || msg.florins < 0 || msg.florins > 1_000_000) return;
            const clean = msg.florins;
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
          if (cA) send(cA, { type: 'trade_update', trade: t, partnerName: cB?.presence?.name, isA: true });
          if (cB) send(cB, { type: 'trade_update', trade: t, partnerName: cA?.presence?.name, isA: false });
          if (t.aConfirmed && t.bConfirmed && cA?.verifiedUid && cB?.verifiedUid) {
            trades.delete(t.tradeId);
            try {
              const [walletA, walletB] = await settleTrade(t.realmId, cA.verifiedUid, cB.verifiedUid, t.aOfferFlorins, t.bOfferFlorins, t.tradeId);
              send(cA, { type: 'trade_complete', wallet: walletA });
              send(cB, { type: 'trade_complete', wallet: walletB });
            } catch (error) {
              const message = error instanceof RequestError ? error.message : 'Trade could not be saved.';
              send(cA, { type: 'trade_cancelled', message });
              send(cB, { type: 'trade_cancelled', message });
            }
          }
        } else if (type === 'trade_cancel') {
          const trade = trades.get(String(msg.tradeId ?? ''));
          if (!trade || (trade.aSession !== sessionId && trade.bSession !== sessionId)) return;
          cancelTrade(trade, 'Trade cancelled.');

        }
      } catch {
        // Ignore malformed frame safely
      }
    });

    ws.on('close', () => {
      clearGameplayPresence(sessionId);
      cancelInvitesForSession(sessionId, 'Trade invitation ended because a player disconnected.');
      for (const trade of trades.values()) if (trade.aSession === sessionId || trade.bSession === sessionId) cancelTrade(trade, 'A trader disconnected.');
      for (const room of duels.values()) room.spectators.delete(sessionId);
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
              if (part.disconnectedAt) forfeit(room, part.actorId);
              reconnectTimers.delete(timerKey);
            }, reconnectGraceMs);
            reconnectTimers.set(timerKey, t);
          }
        }
      }
      clients.delete(sessionId);
    });
  });
  return wss;
}
