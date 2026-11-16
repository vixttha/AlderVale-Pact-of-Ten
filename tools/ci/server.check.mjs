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

async function join(peer, wizardId, realmId, activeCreature = {}) {
  peer.socket.send(JSON.stringify({ type: 'join_world', presence: {
    wizardId, ownerId: `guest_${wizardId}`, name: wizardId, realmId, zone: 'hub',
    raceId: 'human', elementId: 'ember', level: 1, rank: 1, x: 0, y: 0, z: 0,
    ...activeCreature,
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
  assert.ok(fighter, 'Expected live fighter for ' + wizardId);
  const creature = fighter.creatures[fighter.activeCreatureIdx];
  assert.ok(creature, 'Expected active creature for ' + wizardId);
  return {
    speciesId: creature.speciesId,
    element: creature.element,
    stage: creature.stage,
    chromatic: creature.chromatic,
    branchChoice: creature.branchChoice,
    talents: creature.talents,
  };
}

const selectionA = {
  activeCreatureId: 'pet-rime-stag',
  activeCreatureSpeciesId: 'rime_stag',
  activeCreatureNickname: 'Winter Crown',
  activeCreatureStage: 3,
  activeCreatureChromatic: 'dawn',
  activeCreatureBranchChoice: 'B',
  activeCreatureTalents: ['tal_sturdy', 'tal_may_blade'],
};
const selectionB = {
  activeCreatureId: 'pet-zephyr-owl',
  activeCreatureSpeciesId: 'zephyr_owl',
  activeCreatureNickname: 'Storm Courier',
  activeCreatureStage: 2,
  activeCreatureChromatic: 'dusk',
  activeCreatureBranchChoice: 'A',
  activeCreatureTalents: ['tal_spellproof'],
};

test('live PvP builds each fighter from its validated selected creature', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'pvp-creature-a', 'breeze', selectionA);
  await join(b, 'pvp-creature-b', 'breeze', selectionB);
  a.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  b.socket.send(JSON.stringify({ type: 'queue_pvp' }));
  const [aDuel, bDuel] = await Promise.all([waitFor(a, 'duel_state'), waitFor(b, 'duel_state')]);
  assert.deepEqual(selectedCreature(aDuel.state, a.wizardId), {
    speciesId: 'rime_stag', element: 'frost', stage: 3, chromatic: 'dawn', branchChoice: 'B',
    talents: ['tal_sturdy', 'tal_may_blade'],
  });
  assert.deepEqual(selectedCreature(bDuel.state, b.wizardId), {
    speciesId: 'zephyr_owl', element: 'gale', stage: 2, chromatic: 'dusk', branchChoice: 'A',
    talents: ['tal_spellproof'],
  });
});

test('live co-op builds both player fighters from their selected creatures', async () => {
  const a = await connect();
  const b = await connect();
  await join(a, 'coop-creature-a', 'horizon', selectionA);
  await join(b, 'coop-creature-b', 'horizon', selectionB);
  a.socket.send(JSON.stringify({ type: 'queue_coop' }));
  b.socket.send(JSON.stringify({ type: 'queue_coop' }));
  const [aDuel, bDuel] = await Promise.all([waitFor(a, 'duel_state'), waitFor(b, 'duel_state')]);
  assert.deepEqual(selectedCreature(aDuel.state, a.wizardId), {
    speciesId: 'rime_stag', element: 'frost', stage: 3, chromatic: 'dawn', branchChoice: 'B',
    talents: ['tal_sturdy', 'tal_may_blade'],
  });
  assert.deepEqual(selectedCreature(bDuel.state, b.wizardId), {
    speciesId: 'zephyr_owl', element: 'gale', stage: 2, chromatic: 'dusk', branchChoice: 'A',
    talents: ['tal_spellproof'],
  });
});
