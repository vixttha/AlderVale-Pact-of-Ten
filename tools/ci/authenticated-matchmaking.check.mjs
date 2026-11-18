import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import WebSocket from 'ws';

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const localEmulator = /^127\.0\.0\.1:\d+$/;
const rejectedSelection = 'Your selected creature could not be verified. Reconnect and try again.';

let httpServer;
let hub;
let cloudAuth;
let cloudDb;

before(async () => {
  assert.equal(process.env.GOOGLE_CLOUD_PROJECT, 'demo-aldervale-ci');
  assert.equal(process.env.FIRESTORE_DATABASE_ID, '(default)');
  assert.match(authHost ?? '', localEmulator, 'Set FIREBASE_AUTH_EMULATOR_HOST to the local Auth emulator');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', localEmulator, 'Set FIRESTORE_EMULATOR_HOST to the local Firestore emulator');

  ({ cloudAuth, cloudDb } = await import('../../server/cloud.ts'));
  const { attachAldervaleWebSocketServer } = await import('../../server/wsHub.ts');
  httpServer = createServer();
  hub = attachAldervaleWebSocketServer(httpServer);
  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
});

after(async () => {
  if (hub) {
    for (const socket of hub.clients) socket.terminate();
    await new Promise((resolve) => hub.close(resolve));
  }
  if (httpServer?.listening) await new Promise((resolve) => httpServer.close(resolve));
  await cloudDb?.terminate();
});

const storedSelections = [
  {
    speciesId: 'rime_stag',
    nickname: 'Winter Crown',
    stage: 3,
    chromatic: 'dawn',
    branchChoice: 'B',
    talents: ['tal_sturdy', 'tal_may_blade'],
  },
  {
    speciesId: 'zephyr_owl',
    nickname: 'Storm Courier',
    stage: 2,
    chromatic: 'dusk',
    branchChoice: 'A',
    talents: ['tal_spellproof'],
  },
];

async function createPlayer(realmId, selection, enrolled = true) {
  const uid = randomUUID();
  const wizardId = 'wizard-' + uid;
  const creatureId = 'creature-' + uid;
  const email = uid + '@matchmaking.example.test';
  const password = randomUUID();
  await cloudAuth.createUser({ uid, email, password, emailVerified: true });

  const url = 'http://' + authHost + '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(response.ok, 'Auth emulator sign-in returned HTTP ' + response.status);
  const { idToken } = await response.json();
  assert.ok(idToken);

  const proof = enrolled ? { serverProgressionVersion: 1 } : {};
  const wizard = { ...proof, ownerId: uid, realmId, name: selection.nickname, raceId: 'human',
    elementId: 'ember', activeCreatureId: creatureId, level: 1, rank: 1, progression: { titleBadge: 'Initiate' } };
  const wizardRef = cloudDb.collection('wizards').doc(wizardId);
  const creatureRef = wizardRef.collection('creatures').doc(creatureId);
  const batch = cloudDb.batch();
  batch.set(wizardRef, wizard);
  batch.set(creatureRef, { ...selection, ...proof, ownerId: uid, wizardId, realmId });
  await batch.commit();
  return { uid, wizardId, creatureRef, creatureId, realmId, idToken };
}

function exchange(socket, request, types) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Timed out waiting for ' + types.join(' or '))), 10000);
    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      if (types.includes(message.type)) finish(null, message);
    };
    const onClose = () => finish(new Error('Socket closed while waiting for ' + types.join(' or ')));
    function finish(error, message) {
      clearTimeout(timer);
      socket.off('message', onMessage);
      socket.off('close', onClose);
      if (error) reject(error);
      else resolve(message);
    }
    socket.on('message', onMessage);
    socket.once('close', onClose);
    socket.send(JSON.stringify(request), (error) => {
      if (error) finish(error);
    });
  });
}

async function join(context, player) {
  const socket = new WebSocket('ws://127.0.0.1:' + httpServer.address().port + '/ws', { handshakeTimeout: 10000 });
  context.after(() => socket.terminate());
  await once(socket, 'open');
  socket.on('error', () => socket.terminate());
  const result = await exchange(socket, {
    type: 'join_world',
    idToken: player.idToken,
    presence: { wizardId: player.wizardId, realmId: player.realmId, zone: 'hub', name: 'Emulator Player', raceId: 'human', elementId: 'ember' },
  }, ['world_joined', 'world_notice']);
  assert.equal(result.type, 'world_joined', result.text);
  return socket;
}

function match(a, b, mode) {
  const request = { type: 'queue_' + mode };
  const outcomes = ['duel_state', 'world_notice'];
  return Promise.all([exchange(a, request, outcomes), exchange(b, request, outcomes)]);
}

function checkSelection(state, player, expected, element, hp) {
  const fighter = [...state.playerTeam, ...state.enemyTeam].find((actor) => actor.id === player.wizardId);
  assert.ok(fighter, 'Expected fighter for ' + player.wizardId);
  const creature = fighter.creatures[fighter.activeCreatureIdx];
  assert.ok(creature, 'Expected active creature for ' + player.wizardId);
  const { id, speciesId, nickname, stage, chromatic, branchChoice, talents } = creature;
  assert.equal(id, player.creatureId);
  assert.equal(creature.element, element);
  assert.equal(creature.hp, hp);
  assert.equal(creature.maxHp, hp);
  assert.deepEqual({ speciesId, nickname, stage, chromatic, branchChoice, talents }, expected);
}

for (const [mode, realm] of [['pvp', 'breeze'], ['coop', 'horizon']]) {
  test('authenticated ' + mode + ' uses both stored active creatures', { timeout: 45000 }, async (context) => {
    const players = await Promise.all(storedSelections.map((selection) => createPlayer(realm, selection)));
    const [a, b] = await Promise.all(players.map((player) => join(context, player)));

    for (const result of await match(a, b, mode)) {
      assert.equal(result.type, 'duel_state', result.text);
      assert.equal(result.state.mode, mode);
      checkSelection(result.state, players[0], storedSelections[0], 'frost', 325);
      checkSelection(result.state, players[1], storedSelections[1], 'gale', 280);
    }
  });
}

const mismatchedOwnership = [
  ['owner', (second) => ({ ownerId: second.uid })],
  ['wizard', (second) => ({ wizardId: second.wizardId })],
  ['realm', () => ({ realmId: 'breeze' })],
  ['server enrollment', () => ({ serverProgressionVersion: 0 })],
];

for (const [field, mismatch] of mismatchedOwnership) {
  test('authenticated matchmaking rejects a stored selection with a mismatched ' + field, { timeout: 45000 }, async (context) => {
    const players = await Promise.all(storedSelections.map((selection) => createPlayer('everpeak', selection)));
    const [first, second] = players;
    await first.creatureRef.update(mismatch(second));
    const [a, b] = await Promise.all(players.map((player) => join(context, player)));

    for (const result of await match(a, b, 'pvp')) {
      assert.equal(result.type, 'world_notice', 'A duel must not start with an unverified stored selection');
      assert.equal(result.text, rejectedSelection);
    }
  });
}

test('an archived signed-in wizard is ineligible to join the live realm', { timeout: 45000 }, async (context) => {
  const player = await createPlayer('breeze', storedSelections[0], false);
  const socket = new WebSocket('ws://127.0.0.1:' + httpServer.address().port + '/ws');
  context.after(() => socket.terminate());
  await once(socket, 'open');
  const result = await exchange(socket, {
    type: 'join_world', idToken: player.idToken,
    presence: { wizardId: player.wizardId, realmId: player.realmId, zone: 'hub',
      name: 'Archived Wizard', raceId: 'human', elementId: 'ember' },
  }, ['world_joined', 'world_notice']);
  assert.equal(result.type, 'world_notice');
  assert.match(result.text, /earlier save is preserved/);
});
