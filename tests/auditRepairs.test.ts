import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket, type WebSocketServer } from 'ws';
import { BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { applySagaEvent } from '../shared/quests.ts';
import type { WizardDocument } from '../shared/economy.ts';
import type { DuelState } from '../shared/combat.ts';
import { moveOnCampus } from '../src/engine/campusCollision.ts';
import { disposeScene } from '../src/engine/disposeScene.ts';

const { advice } = vi.hoisted(() => ({ advice: vi.fn() }));
vi.mock('../server/lecternAi.ts', () => ({ generateArchivistAdvice: advice }));

describe('Saga progress', () => {
  const wizard = {
    xp: 0, level: 1, rank: 1, currencies: { florins: 100, spellShards: 1 },
    progression: { completedQuests: [] },
  } as unknown as WizardDocument;

  it('awards Harmony after two wins, with the displayed rewards exactly once', () => {
    const first = applySagaEvent(wizard, 'lead-creature-win');
    expect(first.progression.completedQuests).toEqual([]);
    const second = applySagaEvent(first, 'lead-creature-win');
    expect(second.progression.completedQuests).toEqual(['q_bond_arbor']);
    expect(second.xp).toBe(140);
    expect(second.currencies).toEqual({ florins: 260, spellShards: 5 });
    expect(applySagaEvent(second, 'rune-catch')).toBe(second);
  });

  it('allows Rune-Catch as the alternative for a legacy save with no counters', () => {
    const next = applySagaEvent(wizard, 'rune-catch');
    expect(next.progression.completedQuests).toEqual(['q_bond_arbor']);
    expect(wizard.progression.completedQuests).toEqual([]);
  });
});

it('blocks a direct fountain approach while preserving movement around its edge', () => {
  const colliders = [{ x: 0, z: 1, radius: 3.05 }];
  expect(moveOnCampus(0, 4.3, 0, -0.8, 21.5, colliders)).toEqual([0, 4.05]);
  const [x, z] = moveOnCampus(0, 4.05, 0.6, -0.6, 21.5, colliders);
  expect(x).toBeGreaterThan(0.6);
  expect(Math.hypot(x, z - 1)).toBeCloseTo(3.05);
  expect(moveOnCampus(21, 0, 0.8, 0, 21.5, colliders)).toEqual([21, 0]);
});

it('disposes owned scene resources exactly once while retaining shared model resources', () => {
  const group = new Group();
  const geometry = new BufferGeometry();
  const shared = new MeshBasicMaterial();
  shared.userData.sharedSceneMaterial = true;
  const material = new MeshBasicMaterial();
  const cachedGroup = new Group();
  cachedGroup.userData.sharedSceneAssets = true;
  const cachedGeometry = new BufferGeometry();
  cachedGroup.add(new Mesh(cachedGeometry, material));
  group.add(new Mesh(geometry, [material, shared]), new Mesh(geometry, material), cachedGroup);
  const geometryDispose = vi.spyOn(geometry, 'dispose');
  const materialDispose = vi.spyOn(material, 'dispose');
  const sharedDispose = vi.spyOn(shared, 'dispose');
  const cachedDispose = vi.spyOn(cachedGeometry, 'dispose');
  disposeScene(group);
  expect(geometryDispose).toHaveBeenCalledTimes(1);
  expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(sharedDispose).not.toHaveBeenCalled();
  expect(cachedDispose).not.toHaveBeenCalled();
});

interface Frame {
  type: string;
  state?: DuelState;
  ticket?: string;
  spectator?: boolean;
}

function connect(url: string) {
  const socket = new WebSocket(url);
  const messages: Frame[] = [];
  socket.on('message', (bytes) => messages.push(JSON.parse(bytes.toString()) as Frame));
  return {
    socket, messages,
    send(data: Record<string, unknown>) { socket.send(JSON.stringify(data)); },
    async next(type: string, predicate: (frame: Frame) => boolean = () => true) {
      return vi.waitFor(() => {
        const index = messages.findIndex((message) => message.type === type && predicate(message));
        if (index < 0) throw new Error('Missing frame ' + type);
        return messages.splice(index, 1)[0];
      }, { timeout: 4000 });
    },
  };
}

describe('Application server', () => {
  let server: Server;
  let wss: WebSocketServer;
  let base: string;
  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { createAldervaleApp } = await import('../server.ts');
    const { attachAldervaleWebSocketServer } = await import('../server/wsHub.ts');
    server = createServer(await createAldervaleApp({ frontend: false }));
    wss = attachAldervaleWebSocketServer(server, 1000);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    if (!wss || !server) return;
    for (const socket of wss.clients) socket.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('answers unknown API requests with a JSON 404 and requires sign-in to publish a tour', async () => {
    const response = await fetch(base + '/api/missing');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found' });
    const publish = await fetch(base + '/api/tours/breeze/publish', { method: 'POST' });
    expect(publish.status).toBe(401);
  });

  it('rejects invalid strategy input and applies the application request budget', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    advice.mockResolvedValue({ advice: 'Test advice' });
    const request = (payload: unknown) => fetch(base + '/api/academy/strategize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    try {
      expect((await request({ goal: '' })).status).toBe(400);
      const valid = { wizardName: 'Rowan', raceName: 'Human', elementName: 'Ember', activeCreatureName: 'Partner', rank: 1, level: 1, goal: 'Pick a deck' };
      for (let i = 0; i < 5; i++) expect((await request(valid)).status).toBe(200);
      expect((await request(valid)).status).toBe(429);
      expect(advice).toHaveBeenCalledTimes(5);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  async function join(name: string, guestTicket?: string) {
    const player = connect(base.replace('http:', 'ws:') + '/ws');
    await player.next('welcome');
    player.send({
      type: 'join_world', guestTicket,
      presence: { name, raceId: 'human', elementId: 'ember', realmId: 'breeze', zone: 'hub' },
    });
    const { ticket } = await player.next('guest_ticket');
    await player.next('world_joined');
    return { ...player, ticket };
  }

  it('scores a reconnect timeout as a win for the player on the other side', async () => {
    const first = await join('Timed-Out Rowan');
    const second = await join('Remaining Ash');
    first.send({ type: 'queue_pvp' });
    await first.next('queue_status');
    second.send({ type: 'queue_pvp' });
    await first.next('duel_state');
    await second.next('duel_state');
    first.socket.close();
    const final = await second.next('duel_state', (frame) => frame.state?.phase === 'victory');
    expect(final.state?.playerTeam[0].name).toBe('Remaining Ash');
    expect(final.state?.enemyTeam[0].hp).toBe(0);
    second.socket.close();
  });

  it('lets a co-op partner keep fighting after the other player flees', async () => {
    const rowan = await join('Co-op Rowan');
    const ash = await join('Co-op Ash');
    rowan.send({ type: 'queue_coop' });
    await rowan.next('queue_status');
    ash.send({ type: 'queue_coop' });
    const first = (await rowan.next('duel_state')).state!;
    await ash.next('duel_state');
    rowan.send({ type: 'duel_leave' });
    const continued = (await ash.next('duel_state')).state!;
    expect(continued.phase).toBe('planning');
    expect(continued.playerTeam.find(({ id }) => id === first.playerTeam[0].id)?.hp).toBe(0);
    ash.send({ type: 'duel_leave' });
    expect((await ash.next('duel_state')).state?.phase).toBe('defeat');
    rowan.socket.close();
    ash.socket.close();
  });

  it('runs a two-player duel with private hands, reconnects a guest and reports each result correctly', async () => {
    const rowan = await join('Rowan');
    const ash = await join('Ash');
    rowan.send({ type: 'queue_pvp' });
    await rowan.next('queue_status');
    ash.send({ type: 'queue_pvp' });
    const first = (await rowan.next('duel_state')).state!;
    const second = (await ash.next('duel_state')).state!;
    expect(first.playerTeam[0].name).toBe('Rowan');
    expect(second.playerTeam[0].name).toBe('Ash');
    expect(first.enemyTeam[0].hand).toEqual([]);
    expect(second.enemyTeam[0].hand).toEqual([]);
    expect(second.playerTeam[0].hand.length).toBeGreaterThan(0);

    const spectator = await join('Willow');
    spectator.send({ type: 'spectate_duel', duelId: first.duelId });
    const visible = await spectator.next('duel_state');
    expect(visible.spectator).toBe(true);
    expect(visible.state?.playerTeam[0].hand).toEqual([]);

    const pass = (state: DuelState) => ({
      type: 'duel_action', duelId: state.duelId, round: state.round,
      action: { actorId: state.playerTeam[0].id, targetId: state.enemyTeam[0].id, cardIndex: null, creatureAction: 'none' },
    });
    rowan.send(pass(first));
    ash.send(pass(second));
    await rowan.next('duel_state', (frame) => frame.state?.round === 2);
    await ash.next('duel_state', (frame) => frame.state?.round === 2);
    const disconnected = new Promise<void>((resolve) => ash.socket.once('close', () => resolve()));
    ash.socket.close();
    await disconnected;
    const renewed = await join('Ash', ash.ticket);
    const resumed = (await renewed.next('duel_state')).state!;
    expect(resumed.playerTeam[0].id).toBe(second.playerTeam[0].id);
    renewed.send({ type: 'duel_leave' });
    expect((await rowan.next('duel_state', (frame) => frame.state?.phase === 'victory')).state?.phase).toBe('victory');
    expect((await renewed.next('duel_state', (frame) => frame.state?.phase === 'defeat')).state?.phase).toBe('defeat');
    rowan.socket.close();
    renewed.socket.close();
    spectator.socket.close();
  });
});
