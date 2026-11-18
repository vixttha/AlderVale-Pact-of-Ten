import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const localEmulator = /^127\.0\.0\.1:\d+$/;
let httpServer;
let hub;
let cloudAuth;
let cloudDb;

before(async () => {
  assert.equal(process.env.GOOGLE_CLOUD_PROJECT, 'demo-aldervale-ci');
  assert.equal(process.env.FIRESTORE_DATABASE_ID, '(default)');
  assert.match(authHost ?? '', localEmulator);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', localEmulator);
  process.env.VITEST = 'true';
  ({ cloudAuth, cloudDb } = await import('../../server/cloud.ts'));
  const { createAldervaleApp } = await import('../../server.ts');
  httpServer = createServer(await createAldervaleApp({ frontend: false }));
  const { attachAldervaleWebSocketServer } = await import('../../server/wsHub.ts');
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

async function createPlayer() {
  const uid = randomUUID();
  const wizardId = 'wizard-' + uid;
  const email = uid + '@progression.example.test';
  const password = randomUUID();
  await cloudAuth.createUser({ uid, email, password, emailVerified: true });
  const signIn = await fetch('http://' + authHost + '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(signIn.status, 200);
  const { idToken } = await signIn.json();

  const wizardRef = cloudDb.collection('wizards').doc(wizardId);
  const realmRef = cloudDb.collection('accounts').doc(uid).collection('realms').doc('breeze');
  // Simulates a pre-existing realm with Term history. The claim path reads its
  // own server ledger, and enrollment creates the new wizard from profile choices.
  await realmRef.set({
    uid, realmId: 'breeze', wizardIds: [], unlockedRaces: ['human'],
    sharedVault: [], termXp: 480, claimedTermTiers: [2],
  });
  const player = { uid, wizardId, wizardRef, realmRef, idToken };
  const appearance = {
    height: 1, build: 'balanced', skinHex: '#b58368', hairStyle: 'Windblown Shag',
    hairHex: '#453128', hairTipHex: '#453128', eyeShape: 'bright', eyeLeftHex: '#5b4d33',
    eyeRightHex: '#5b4d33', browStyle: 'soft', marking: 'none', primaryDye: '#534679',
    trimDye: '#ffffff', accentDye: '#b58e4b', castPose: 'scholar',
  };
  const choices = {
    id: wizardId, name: 'Progress Rowan', raceId: 'human', elementId: 'ember', sculpt: appearance,
  };
  const enrollments = await Promise.all([call(player, 'enroll', choices), call(player, 'enroll', choices)]);
  for (const { account, wizard } of enrollments) {
    assert.deepEqual(account.wizardIds, [wizardId]);
    assert.equal(wizard.level, 1);
    assert.equal(wizard.serverProgressionVersion, 1);
    assert.equal(wizard.currencies.florins, 220);
    assert.equal(wizard.activeCreatureId, wizardId + '_starter_pet');
  }
  return player;
}

async function call(player, path, body, status = 200) {
  const response = await fetch('http://127.0.0.1:' + httpServer.address().port + '/api/progression/breeze/' + path, {
    headers: {
      ...(player ? { Authorization: 'Bearer ' + player.idToken } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.equal(response.status, status, path + ' ' + JSON.stringify(result));
  return result;
}

test('a signed-in solo win settles once and earns one Term claim', { timeout: 55000 }, async () => {
  const player = await createPlayer();
  const { wizardId } = player;
  await call(null, 'term', undefined, 401);
  assert.deepEqual(await call(player, 'term'), { termXp: 0, claimedTermTiers: [2] });
  await call(player, 'term', { wizardId, tier: 1 }, 409);

  const start = await call(player, 'solo/start', { wizardId, mode: 'solo', element: 'ember' });
  const { duelId } = start.duel;
  assert.equal(start.duel.phase, 'planning');
  assert.deepEqual(start.duel.enemyTeam[0].hand, []);
  assert.deepEqual(start.duel.playerTeam[0].deck, []);
  assert.equal((await call(player, 'solo/start', { wizardId, mode: 'solo', element: 'ember' })).duel.duelId, duelId);
  const roomRef = cloudDb.collection('worldRealms').doc('breeze').collection('soloDuels').doc(wizardId);
  const fixture = (await roomRef.get()).get('state');
  // Seed the final round through the emulator's Admin SDK. The HTTP route
  // still runs a real combat turn and computes the terminal result.
  fixture.enemyTeam[0].hp = 1;
  await roomRef.update({ state: fixture });
  const action = { cardIndex: null, creatureAction: 'skill' };
  const turn = await call(player, 'solo/round', { wizardId, duelId, revision: start.revision, action });
  assert.equal(turn.duel.phase, 'victory');
  const replay = await call(player, 'solo/round', { wizardId, duelId, revision: start.revision, action });
  assert.equal(replay.revision, turn.revision);

  const finishes = await Promise.all(Array.from({ length: 2 }, () => call(player, 'solo/finish', { wizardId, duelId })));
  for (const result of finishes) {
    assert.equal(result.account.termXp, 228);
    assert.equal(result.wizard.currencies.florins, 493);
    assert.deepEqual(result.wizard.progression.completedQuests, ['q_first_duel']);
    assert.equal(result.creatures[0].wins, 1);
  }
  const claims = await Promise.all(Array.from({ length: 2 }, () => call(player, 'term', { wizardId, tier: 1 })));
  assert.equal(claims.filter((result) => result.claimed).length, 1);
  assert.equal((await call(player, 'term', { wizardId, tier: 2 })).claimed, false);
  await player.realmRef.update({ claimedTermTiers: [] });
  assert.equal((await call(player, 'term', { wizardId, tier: 2 })).claimed, false);
  await player.realmRef.update({ claimedTermTiers: [2] });
  assert.deepEqual(await call(player, 'term'), { termXp: 228, claimedTermTiers: [1, 2] });
  assert.equal((await player.wizardRef.get()).get('currencies.florins'), 613);
  const profile = await cloudDb.collection('publicWizards').doc(wizardId).get();
  assert.equal(profile.get('ownerId'), player.uid);
  assert.equal(profile.get('rank'), (await player.wizardRef.get()).get('rank'));
  const preserved = await player.realmRef.get();
  assert.equal(preserved.get('termXp'), 480);
  assert.deepEqual(preserved.get('claimedTermTiers'), [2]);
});

test('leaving an unfinished signed-in duel creates no earned rewards', { timeout: 45000 }, async () => {
  const player = await createPlayer();
  const { wizardId } = player;
  const { duel: { duelId } } = await call(player, 'solo/start', { wizardId, mode: 'solo', element: 'ember' });
  const finish = await call(player, 'solo/finish', { wizardId, duelId });
  assert.equal(finish.notice, 'You left the duel.');
  assert.equal(finish.wizard.currencies.florins, 220);
  assert.deepEqual(await call(player, 'term'), { termXp: 0, claimedTermTiers: [2] });
});

function gameplay(player, action, actionId = randomUUID(), status = 200) {
  return call(player, 'action', { wizardId: player.wizardId, actionId, action }, status);
}

test('signed-in gameplay commands handle shop, crafting, roster and Dorm changes', { timeout: 55000 }, async () => {
  const player = await createPlayer();
  const sameReceipt = randomUUID();
  const purchases = await Promise.all([
    gameplay(player, { type: 'buyGear', id: 'hat_pointed_brim' }, sameReceipt),
    gameplay(player, { type: 'buyGear', id: 'hat_pointed_brim' }, sameReceipt),
  ]);
  for (const purchase of purchases) {
    assert.equal(purchase.wizard.currencies.florins, 130);
    assert.equal(purchase.wizard.wardrobe.ownedGearIds.filter((id) => id === 'hat_pointed_brim').length, 1);
  }
  const equipped = await gameplay(player, { type: 'equip', id: 'hat_pointed_brim' });
  assert.equal(equipped.wizard.wardrobe.equipped.headgear, 'hat_pointed_brim');
  const craft = await gameplay(player, { type: 'transmute' });
  assert.equal(craft.wizard.progression.craftXp, 25);
  assert.equal(craft.wizard.resources.starstone, 2);
  const adoption = await gameplay(player, { type: 'adopt', id: 'bramble_sprig' });
  const adopted = adoption.creatures.find((pet) => pet.speciesId === 'bramble_sprig');
  assert.ok(adopted);
  assert.equal(adopted.serverProgressionVersion, 1);
  const lead = await gameplay(player, { type: 'lead', id: adopted.id });
  assert.equal(lead.wizard.activeCreatureId, adopted.id);
  await gameplay(player, { type: 'gardenHarvest', index: 0 }, randomUUID(), 409);
  const plant = await gameplay(player, { type: 'gardenPlant', index: 0, element: 'ember' });
  assert.equal(plant.sanctuary.gardens[0].seedElement, 'ember');
  await gameplay(player, { type: 'gardenHarvest', index: 0 }, randomUUID(), 409);
  const gardenRef = player.wizardRef.collection('sanctuary').doc('layout');
  // Advance the trusted fixture's crop clock so the test needs no real wait.
  await gardenRef.update({ gardens: [{ ...plant.sanctuary.gardens[0], readyAt: Date.now() - 1000 }] });
  const harvest = await gameplay(player, { type: 'gardenHarvest', index: 0 });
  assert.equal(harvest.wizard.resources.sunleaf, 3);
  assert.equal(harvest.wizard.currencies.florins, 175);
  assert.equal(harvest.sanctuary.gardens[0].seedElement, null);
  await gameplay(player, { type: 'gardenHarvest', index: 0 }, randomUUID(), 409);
  const dorm = await gameplay(player, { type: 'dormWeather', id: 'fireflies' });
  assert.equal(dorm.sanctuary.weatherId, 'fireflies');
  assert.equal((await player.wizardRef.get()).get('activeCreatureId'), adopted.id);
});

test('archived cloud records stay outside signed-in gameplay', { timeout: 45000 }, async () => {
  const player = await createPlayer();
  await cloudDb.collection('wizards').doc('archive-' + player.uid).set({
    ownerId: player.uid, realmId: 'breeze', name: 'Earlier Save', level: 10,
  });
  const realm = await call(player, 'realm');
  assert.deepEqual(realm.wizardIds, [player.wizardId]);
  await call(player, 'solo/start', { wizardId: 'archive-' + player.uid, mode: 'solo', element: 'ember' }, 409);
  assert.equal((await cloudDb.collection('wizards').doc('archive-' + player.uid).get()).get('level'), 10);
});

async function joinCampus(player, context) {
  const serverConnection = once(hub, 'connection', { signal: AbortSignal.timeout(10000) });
  const socket = new WebSocket('ws://127.0.0.1:' + httpServer.address().port + '/ws', { handshakeTimeout: 10000 });
  context.after(() => socket.terminate());
  const [[serverSocket]] = await Promise.all([serverConnection, once(socket, 'open')]);
  const joined = once(socket, 'message', { signal: AbortSignal.timeout(10000) });
  socket.send(JSON.stringify({
    type: 'join_world',
    idToken: player.idToken,
    presence: { wizardId: player.wizardId, realmId: 'breeze', zone: 'hub',
      name: 'Progress Rowan', raceId: 'human', elementId: 'ember' },
  }));
  const [message] = await joined;
  assert.equal(JSON.parse(message).type, 'world_joined');
  return { socket, serverSocket };
}

test('signed-in campus presence survives idle, clears on disconnect, and returns on reconnect', { timeout: 150000 }, async (context) => {
  const player = await createPlayer();
  const activity = { type: 'world', id: 'fountain_main' };
  const missing = await gameplay(player, activity, randomUUID(), 409);
  assert.equal(missing.error, 'Move closer to that activity.');
  const { socket, serverSocket } = await joinCampus(player, context);

  // Stay still past the original 90-second position expiry. The socket only answers protocol pings.
  await delay(92_000, undefined, { signal: context.signal });
  const result = await gameplay(player, activity);
  assert.equal(result.wizard.progression.mana, result.wizard.progression.maxMana);
  assert.equal(result.wizard.progression.flasks, result.wizard.progression.maxFlasks);

  const disconnected = once(serverSocket, 'close', { signal: AbortSignal.timeout(10000) });
  socket.close();
  await disconnected;
  const afterDisconnect = await gameplay(player, activity, randomUUID(), 409);
  assert.equal(afterDisconnect.error, missing.error);

  // Use the same account and wizard on a fresh socket. The fountain cooldown still applies.
  await delay(600, undefined, { signal: context.signal });
  await joinCampus(player, context);
  const reconnected = await gameplay(player, activity);
  assert.equal(reconnected.wizard.progression.mana, reconnected.wizard.progression.maxMana);
});
