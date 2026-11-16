import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'http://127.0.0.1:3201';
let child;
let logs = '';
const sockets = [];

before(async () => {
  child = spawn(process.execPath, ['server.ts'], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3201', GEMINI_API_KEY: '', VITEST: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    await delay(100);
  }
  throw new Error(`Server did not become ready: ${logs}`);
});

after(async () => {
  for (const peer of sockets) peer.socket.close();
  if (child && child.exitCode === null) {
    const stopped = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await stopped;
  }
});

async function connect() {
  const socket = new WebSocket('ws://127.0.0.1:3201/ws');
  const messages = [];
  const peer = { socket, messages };
  sockets.push(peer);
  socket.addEventListener('message', (event) => messages.push(JSON.parse(event.data)));
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  await waitFor(peer, 'welcome');
  return peer;
}

async function waitFor(peer, type) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const index = peer.messages.findIndex((message) => message.type === type);
    if (index !== -1) return peer.messages.splice(index, 1)[0];
    await delay(25);
  }
  throw new Error(`Missing ${type}: ${JSON.stringify(peer.messages)}`);
}

async function join(peer, wizardId, realmId, activeCreature = null) {
  peer.socket.send(JSON.stringify({ type: 'join_world', presence: {
    wizardId, ownerId: `guest_${wizardId}`, name: wizardId, realmId, zone: 'hub',
    raceId: 'human', elementId: 'ember', level: 1, rank: 1, x: 0, y: 0, z: 0,
    activeCreatureId: activeCreature?.id,
    activeCreature,
  } }));
  await waitFor(peer, 'world_joined');
  const snapshot = await waitFor(peer, 'zone_snapshot');
  peer.wizardId = snapshot.players.find((player) => player.name === wizardId)?.wizardId;
  assert.ok(peer.wizardId);
  return snapshot;
}

test('production server serves its health endpoint and built HTML', async () => {
  assert.equal((await (await fetch(`${base}/api/health`)).json()).game, 'Aldervale: Pact of Ten');
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root"><\/div>/);
});

test('resource mutation rejects unauthenticated and malformed tokens including override headers', async () => {
  for (const authorization of [undefined, 'Bearer invalid']) {
    const response = await fetch(`${base}/api/resources/missing`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', 'x-internal-override': 'true', ...(authorization ? { authorization } : {}) },
      body: JSON.stringify({ motto: 'unauthorized' }),
    });
    assert.equal(response.status, 401);
  }
});

test('bazaar validates realms and requires authentication for mutations', async () => {
  assert.equal((await fetch(`${base}/api/bazaar/unknown`)).status, 400);
  const response = await fetch(`${base}/api/bazaar/breeze/list`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });
  assert.equal(response.status, 401);
});

test('three real sockets exchange same-realm chat without crossing realms', async () => {
  const alice = await connect();
  const bob = await connect();
  const outsider = await connect();
  await join(alice, 'alice', 'breeze');
  const snapshot = await join(bob, 'bob', 'breeze');
  assert.ok(snapshot.players.some((player) => player.wizardId === alice.wizardId));
  const otherSnapshot = await join(outsider, 'outsider', 'everpeak');
  assert.deepEqual(otherSnapshot.players.map((player) => player.wizardId), [outsider.wizardId]);
  alice.socket.send(JSON.stringify({ type: 'chat', text: 'Realm scoped hello' }));
  assert.equal((await waitFor(bob, 'chat_message')).text, 'Realm scoped hello');
  await delay(200);
  assert.equal(outsider.messages.some((message) => message.type === 'chat_message'), false);
  const left = waitFor(bob, 'player_left');
  alice.socket.close();
  assert.ok((await left).sessionId);
});

function selectedCreature(state, wizardId) {
  const fighter = [...state.playerTeam, ...state.enemyTeam].find((actor) => actor.id === wizardId);
  assert.ok(fighter, `Missing fighter for ${wizardId}`);
  assert.ok(fighter.creatures[0], `Missing creature for ${wizardId}`);
  const { speciesId, element, stage, chromatic, branchChoice, talents, hp, maxHp } = fighter.creatures[0];
  return { speciesId, element, stage, chromatic, branchChoice, talents, hp, maxHp };
}

const rimeSelection = {
  id: 'rime-pet',
  speciesId: 'rime_stag',
  nickname: 'Rime',
  elementId: 'frost',
  stage: 3,
  chromatic: 'dawn',
  branchChoice: 'B',
  bondXp: 300,
  talents: ['tal_sturdy', 'tal_may_blade'],
};
const zephyrSelection = {
  id: 'zephyr-pet',
  speciesId: 'zephyr_owl',
  nickname: 'Zephyr',
  elementId: 'gale',
  stage: 2,
  chromatic: 'dusk',
  branchChoice: 'A',
  bondXp: 120,
  talents: ['tal_spellproof'],
};
const expectedLiveCreatures = [
  { speciesId: 'rime_stag', element: 'frost', stage: 3, chromatic: 'dawn', branchChoice: 'B', talents: ['tal_sturdy', 'tal_may_blade'], hp: 325, maxHp: 325 },
  { speciesId: 'zephyr_owl', element: 'gale', stage: 2, chromatic: 'dusk', branchChoice: 'A', talents: ['tal_spellproof'], hp: 280, maxHp: 280 },
];

test('live PvP uses each player selected creature profile (issue #75)', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'pvp-rime-player', 'breeze', rimeSelection);
  await join(b, 'pvp-zephyr-player', 'breeze', zephyrSelection);

  a.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  b.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  const [aDuel, bDuel] = await Promise.all([waitFor(a, 'duel_state'), waitFor(b, 'duel_state')]);

  assert.equal(aDuel.state.mode, 'pvp');
  assert.deepEqual([
    selectedCreature(aDuel.state, a.wizardId),
    selectedCreature(aDuel.state, b.wizardId),
  ], expectedLiveCreatures);
  assert.equal(bDuel.state.mode, 'pvp');
  assert.deepEqual([
    selectedCreature(bDuel.state, a.wizardId),
    selectedCreature(bDuel.state, b.wizardId),
  ], expectedLiveCreatures);
});

test('live co-op uses each player selected creature profile (issue #75)', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'coop-rime-player', 'horizon', rimeSelection);
  await join(b, 'coop-zephyr-player', 'horizon', zephyrSelection);

  a.socket.send(JSON.stringify({ type: 'queue_coop' }));
  b.socket.send(JSON.stringify({ type: 'queue_coop' }));
  const [aDuel, bDuel] = await Promise.all([waitFor(a, 'duel_state'), waitFor(b, 'duel_state')]);

  assert.equal(aDuel.state.mode, 'coop');
  assert.deepEqual([
    selectedCreature(aDuel.state, a.wizardId),
    selectedCreature(aDuel.state, b.wizardId),
  ], expectedLiveCreatures);
  assert.equal(bDuel.state.mode, 'coop');
  assert.deepEqual([
    selectedCreature(bDuel.state, a.wizardId),
    selectedCreature(bDuel.state, b.wizardId),
  ], expectedLiveCreatures);
});

test('live realm falls back to the starter creature only when selection is missing or invalid', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'fallback-invalid-player', 'everpeak', { ...rimeSelection, speciesId: 'not-a-creature' });
  await join(b, 'fallback-empty-player', 'everpeak');

  a.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  b.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  const duel = await waitFor(a, 'duel_state');
  assert.deepEqual(selectedCreature(duel.state, a.wizardId), {
    speciesId: 'cinder_kitsune', element: 'ember', stage: 1, chromatic: 'none',
    branchChoice: 'A', talents: [], hp: 235, maxHp: 235,
  });
  assert.deepEqual(selectedCreature(duel.state, b.wizardId), {
    speciesId: 'cinder_kitsune', element: 'ember', stage: 1, chromatic: 'none',
    branchChoice: 'A', talents: [], hp: 235, maxHp: 235,
  });
});

test('live realm updates a guest creature selection before matchmaking', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'appearance-rime-player', 'breeze', rimeSelection);
  await join(b, 'appearance-zephyr-player', 'breeze', zephyrSelection);

  a.socket.send(JSON.stringify({ type: 'update_appearance', patch: {
    activeCreatureId: zephyrSelection.id,
    activeCreature: zephyrSelection,
  } }));
  await waitFor(b, 'player_updated');
  a.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  b.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  const duel = await waitFor(a, 'duel_state');
  assert.deepEqual(selectedCreature(duel.state, a.wizardId), expectedLiveCreatures[1]);
  assert.deepEqual(selectedCreature(duel.state, b.wizardId), expectedLiveCreatures[1]);
});
