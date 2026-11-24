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

async function call(player, path, body, status = 200, route = 'progression') {
  const response = await fetch('http://127.0.0.1:' + httpServer.address().port + '/api/' + route + '/breeze/' + path, {
    headers: {
      ...(player ? { Authorization: 'Bearer ' + player.idToken } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const result = response.status === 204 ? null : await response.json();
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


test('Campus quest rewards (#13): two eligible lead wins and Rare Trial settle once in authenticated progression', { timeout: 90000 }, async () => {
  const player = await createPlayer();
  const { wizardId, wizardRef } = player;
  const { xpRequiredForLevel } = await import('../../shared/realms.ts');
  const totalXp = (wizard) => {
    let xp = wizard.xp;
    for (let level = 1; level < wizard.level; level++) xp += xpRequiredForLevel(level);
    return xp;
  };
  const roomRef = cloudDb.collection('worldRealms').doc('breeze').collection('soloDuels').doc(wizardId);
  async function win(mode, element, expected, completed, arborWins) {
    const before = (await wizardRef.get()).data();
    const start = await call(player, 'solo/start', { wizardId, mode, element });
    const { duelId } = start.duel;
    // Seed only the final-round fixture in the demo emulator. The real round
    // and settlement endpoints must compute victory and all reward changes.
    const state = (await roomRef.get()).get('state');
    assert.equal(state.playerTeam[0].creatures[state.playerTeam[0].activeCreatureIdx].id, before.activeCreatureId);
    state.enemyTeam[0].hp = 1;
    await roomRef.update({ state });
    const turn = await call(player, 'solo/round', {
      wizardId, duelId, revision: start.revision,
      action: { cardIndex: null, creatureAction: 'skill' },
    });
    assert.equal(turn.duel.phase, 'victory');
    const results = await Promise.all([call(player, 'solo/finish', { wizardId, duelId }), call(player, 'solo/finish', { wizardId, duelId })]);
    for (const result of results) {
      assert.deepEqual(result.wizard.progression.completedQuests, completed);
      assert.equal(result.wizard.progression.questWins.q_bond_arbor, arborWins);
      assert.equal(totalXp(result.wizard) - totalXp(before), expected.xp);
      assert.equal(result.wizard.currencies.florins - before.currencies.florins, expected.florins);
      assert.equal(result.wizard.currencies.spellShards - before.currencies.spellShards, expected.shards);
    }
    const persisted = (await wizardRef.get()).data();
    assert.deepEqual(persisted.progression.completedQuests, completed);
    assert.equal(persisted.progression.questWins.q_bond_arbor, arborWins);
    assert.equal(totalXp(persisted) - totalXp(before), expected.xp);
    assert.equal(persisted.currencies.florins - before.currencies.florins, expected.florins);
    assert.equal(persisted.currencies.spellShards - before.currencies.spellShards, expected.shards);
    return duelId;
  }
  const first = await win('solo', 'ember', { xp: 388, florins: 273, shards: 5 }, ['q_first_duel'], 1);
  await win('solo', 'ember', { xp: 438, florins: 323, shards: 6 }, ['q_first_duel', 'q_bond_arbor'], 2);
  // A new win earns ordinary rewards only; an old receipt also cannot pay again.
  await win('solo', 'ember', { xp: 298, florins: 163, shards: 2 }, ['q_first_duel', 'q_bond_arbor'], 2);
  const afterWins = (await wizardRef.get()).data();
  const old = await call(player, 'solo/finish', { wizardId, duelId: first });
  assert.deepEqual(old.wizard.currencies, afterWins.currencies);
  assert.equal(totalXp(old.wizard), totalXp(afterWins));
  assert.deepEqual(old.wizard.progression.completedQuests, afterWins.progression.completedQuests);
  // Synthetic late-game rank allows a Rare Trial without bypassing its route.
  await wizardRef.update({ level: 39, rank: 20, xp: 0 });
  await win('trial', 'verdigris', { xp: 890, florins: 670, shards: 10 }, ['q_first_duel', 'q_bond_arbor', 'q_rare_trial'], 2);
  await win('trial', 'verdigris', { xp: 630, florins: 350, shards: 2 }, ['q_first_duel', 'q_bond_arbor', 'q_rare_trial'], 2);
});

test('G09-003 signed-in solo moves existing Keen Ink into hand and fuses through the authenticated endpoint', { timeout: 55000 }, async () => {
  const player = await createPlayer();
  const { wizardId } = player;
  const ink = 'uni_enchant_keen';
  const attack = 'ember_cinder_dart';
  const start = await call(player, 'solo/start', { wizardId, mode: 'solo', element: 'ember' });
  const { duelId } = start.duel;
  const actor = start.duel.playerTeam[0];
  assert.equal(actor.hand.filter(id => id === ink).length, 1);
  assert.equal(actor.sideboard.includes(ink), false);
  const source = actor.hand.indexOf(ink);
  const roomRef = cloudDb.collection('worldRealms').doc('breeze').collection('soloDuels').doc(wizardId);
  const initial = (await roomRef.get()).data();
  // Reject a real standalone cast without consuming the card or advancing revision.
  await call(player, 'solo/round', { wizardId, duelId, revision: start.revision, action: { cardIndex: source, creatureAction: 'none' } }, 400);
  assert.deepEqual((await roomRef.get()).data(), initial);
  // Controlled hand after real start avoids random draw assumptions.
  const state = initial.state;
  state.playerTeam[0].hand = [ink, attack];
  await roomRef.update({ state });
  await call(player, 'solo/enchant', { wizardId, duelId, revision: start.revision, source: 0, target: 0 }, 400);
  const fused = await call(player, 'solo/enchant', { wizardId, duelId, revision: start.revision, source: 0, target: 1 });
  assert.equal(fused.revision, start.revision + 1);
  assert.deepEqual(fused.duel.playerTeam[0].hand, [attack + '+keen']);
  const replay = await call(player, 'solo/enchant', { wizardId, duelId, revision: start.revision, source: 0, target: 1 });
  assert.equal(replay.revision, fused.revision);
  assert.deepEqual(replay.duel.playerTeam[0].hand, [attack + '+keen']);
  const round = await call(player, 'solo/round', { wizardId, duelId, revision: fused.revision, action: { cardIndex: 0, creatureAction: 'none' } });
  assert.equal(round.revision, fused.revision + 1);
  assert.ok(round.duel.playerTeam[0].discard.includes(attack) || round.duel.playerTeam[0].hand.includes(attack + '+keen'));
  await call(player, 'solo/finish', { wizardId, duelId });
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

test('Bazaar escrow uses owned fallback gear in a signed-in solo duel before reconciliation', { timeout: 55000 }, async () => {
  const player = await createPlayer();
  const { wizardId, wizardRef } = player;
  const start = { wizardId, mode: 'solo', element: 'ember' };
  const baseline = await call(player, 'solo/start', start);
  await call(player, 'solo/finish', { wizardId, duelId: baseline.duel.duelId });

  const hat = 'hat_pointed_brim';
  const purchase = await call(player, 'buy/academy-hat', { wizardId }, 200, 'bazaar');
  assert.equal(purchase.wallet.gear[hat], 1);
  const equipped = await gameplay(player, { type: 'equip', id: hat });
  assert.equal(equipped.wizard.wardrobe.equipped.headgear, hat);
  assert.ok(!equipped.wizard.wardrobe.ownedGearIds.includes(hat));
  const craft = await gameplay(player, { type: 'transmute' });
  assert.equal(craft.wizard.progression.craftXp, 25);
  const listing = await call(player, 'list', { wizardId, itemId: hat, priceFlorins: 90 }, 201, 'bazaar');
  assert.equal(listing.wallet.gear[hat], 0);
  assert.equal((await wizardRef.get()).get('wardrobe.equipped.headgear'), hat);

  const escrowed = await call(player, 'solo/start', start);
  assert.equal(escrowed.duel.playerTeam[0].maxHp, baseline.duel.playerTeam[0].maxHp);
  await call(player, 'reconcile-equipment', { wizardId }, 204, 'bazaar');
  const saved = await wizardRef.get();
  assert.equal(saved.get('wardrobe.equipped.headgear'), 'hat_academy_cap');
  assert.equal(saved.get('progression.craftXp'), craft.wizard.progression.craftXp);
  assert.deepEqual(saved.get('currencies'), craft.wizard.currencies);
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

async function joinCampus(player, context, zone = 'hub', socketOptions = {}) {
  const serverConnection = once(hub, 'connection', { signal: AbortSignal.timeout(10000) });
  const socket = new WebSocket('ws://127.0.0.1:' + httpServer.address().port + '/ws', { handshakeTimeout: 10000, ...socketOptions });
  context.after(() => socket.terminate());
  const [[serverSocket]] = await Promise.all([serverConnection, once(socket, 'open')]);
  const joined = once(socket, 'message', { signal: AbortSignal.timeout(10000) });
  socket.send(JSON.stringify({
    type: 'join_world',
    idToken: player.idToken,
    presence: { wizardId: player.wizardId, realmId: 'breeze', zone,
      name: 'Progress Rowan', raceId: 'human', elementId: 'ember' },
  }));
  const [message] = await joined;
  const acknowledgment = JSON.parse(message);
  assert.equal(acknowledgment.type, 'world_joined');
  return { socket, serverSocket, acknowledgment };
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


test('silent socket revokes authenticated presence after a missed heartbeat and can reconnect', { timeout: 85000 }, async (context) => {
  const player = await createPlayer();
  const activity = { type: 'world', id: 'fountain_main' };
  const beforeJoin = await gameplay(player, activity, randomUUID(), 409);
  assert.equal(beforeJoin.error, 'Move closer to that activity.');

  // The ws library normally replies automatically to protocol pings. Turn that
  // off to exercise the real missed-pong termination path, not a forced close.
  const joined = await joinCampus(player, context, 'hub', { autoPong: false });
  let receivedPings = 0;
  joined.socket.on('ping', () => { receivedPings++; });
  const started = Date.now();
  await once(joined.serverSocket, 'close', { signal: AbortSignal.timeout(70000) });
  assert.ok(receivedPings >= 1, 'server should challenge the idle socket');
  assert.ok(Date.now() - started >= 10000, 'connection must survive long enough for a heartbeat');

  const revoked = await gameplay(player, activity, randomUUID(), 409);
  assert.equal(revoked.error, beforeJoin.error, 'missed pong must immediately revoke activity proximity');
  const restored = await joinCampus(player, context);
  assert.deepEqual(restored.acknowledgment.position, { x: 0, y: 0, z: 8, rotY: 0 });
  const healed = await gameplay(player, activity);
  assert.equal(healed.wizard.progression.mana, healed.wizard.progression.maxMana);
});

test('authenticated reconnect restores an off-spawn resource position without movement or stale presence', { timeout: 45000 }, async (context) => {
  const player = await createPlayer();
  const resource = { type: 'world', id: 'res_starstone_2' };
  // The hub spawn (0,8) is more than 12 units from this resource near (-14.8,0.6).
  const missing = await gameplay(player, resource, randomUUID(), 409);
  assert.equal(missing.error, 'Move closer to that activity.');
  const first = await joinCampus(player, context);
  assert.deepEqual(first.acknowledgment.position, { x: 0, y: 0, z: 8, rotY: 0 });

  // Legitimate movement must advance within the server's per-session travel budget.
  await walkCampus(first, { x: -14, z: 1, rotY: 0.75 });
  const closed = once(first.serverSocket, 'close', { signal: AbortSignal.timeout(10000) });
  first.socket.close();
  await closed;

  const offline = await gameplay(player, resource, randomUUID(), 409);
  assert.equal(offline.error, missing.error, 'disconnect must immediately revoke campus access');

  const restored = await joinCampus(player, context);
  assert.deepEqual(restored.acknowledgment.position, { x: -14, y: 0, z: 1, rotY: 0.75 });
  assert.equal(restored.acknowledgment.zone, 'hub');
  const collected = await gameplay(player, resource);
  assert.match(collected.feedback.notice, /Harvested/);
  assert.ok(collected.wizard.resources.starstone > 0);

  const closedAgain = once(restored.serverSocket, 'close', { signal: AbortSignal.timeout(10000) });
  restored.socket.close();
  await closedAgain;
  assert.equal((await gameplay(player, resource, randomUUID(), 409)).error, missing.error);
});

async function socketMessageOfType(socket, type, emit) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Timed out waiting for ' + type)), 10000);
    function onMessage(raw) {
      const message = JSON.parse(raw.toString());
      if (message.type === type) finish(null, message);
    }
    function onClose() { finish(new Error('Connection closed before ' + type)); }
    function finish(error, message) {
      clearTimeout(timer);
      socket.off('message', onMessage);
      socket.off('close', onClose);
      if (error) reject(error);
      else resolve(message);
    }
    socket.on('message', onMessage);
    socket.once('close', onClose);
    emit();
  });
}

async function walkCampus({ socket, serverSocket }, destination) {
  const steps = 12;
  for (let step = 1; step <= steps; step++) {
    await delay(130);
    const processed = once(serverSocket, 'message', { signal: AbortSignal.timeout(10000) });
    socket.send(JSON.stringify({
      type: 'move', zone: 'hub',
      x: 0 + (destination.x * step / steps), y: 0,
      z: 8 + ((destination.z - 8) * step / steps),
      rotY: destination.rotY ?? 0,
    }));
    await processed;
  }
}

test('signed-in appearance updates ignore forged identity, progression, roster and cosmetic fields', { timeout: 45000 }, async (context) => {
  const [viewer, actor] = await Promise.all([createPlayer(), createPlayer()]);
  const observer = await joinCampus(viewer, context);
  const target = await joinCampus(actor, context);
  const actual = (await actor.wizardRef.get()).data();
  const message = await socketMessageOfType(observer.socket, 'player_updated', () => {
    target.socket.send(JSON.stringify({
      type: 'update_appearance',
      patch: {
        level: 50, rank: 20, titleBadge: 'Forged Archmaster', raceId: 'dark_elf',
        elementId: 'umbra', activeCreatureId: 'fake-creature',
        activeCreatureSpeciesId: 'zephyr_owl', activeCreatureStage: 3,
        sculpt: { height: 999 }, equipped: { headgear: 'admin-only' },
      },
    }));
  });
  assert.equal(message.player.wizardId, actor.wizardId);
  assert.equal(message.player.level, actual.level);
  assert.equal(message.player.rank, actual.rank);
  assert.equal(message.player.titleBadge, actual.progression.titleBadge);
  assert.equal(message.player.raceId, actual.raceId);
  assert.equal(message.player.elementId, actual.elementId);
  assert.equal(message.player.activeCreatureId, actual.activeCreatureId);
  assert.equal(message.player.activeCreatureStage, 1);
  assert.deepEqual(message.player.sculpt, actual.sculpt);
  assert.deepEqual(message.player.equipped, actual.wardrobe.equipped);

  // The projection still refreshes after a legitimate *server* progression change.
  await actor.wizardRef.update({ level: 4, rank: 2, 'progression.titleBadge': 'Warden' });
  const refreshed = await socketMessageOfType(observer.socket, 'player_updated', () => {
    target.socket.send(JSON.stringify({ type: 'update_appearance', patch: { rank: 99 } }));
  });
  assert.equal(refreshed.player.level, 4);
  assert.equal(refreshed.player.rank, 2);
  assert.equal(refreshed.player.titleBadge, 'Warden');
});

test('signed-in movement rejects instant resource teleport and cross-zone reward jumps', { timeout: 45000 }, async (context) => {
  const player = await createPlayer();
  const joined = await joinCampus(player, context);
  const spawn = { x: 0, y: 0, z: 8, rotY: 0 };
  const resource = { type: 'world', id: 'res_starstone_2' };
  const fishing = { type: 'world', id: 'cloud_pier' };

  const instant = await socketMessageOfType(joined.socket, 'world_position_correction', () => {
    joined.socket.send(JSON.stringify({
      type: 'move', zone: 'hub', x: -14, y: 0, z: 1, rotY: 0,
    }));
  });
  assert.deepEqual(instant.position, spawn);
  assert.equal((await gameplay(player, resource, randomUUID(), 409)).error, 'Move closer to that activity.');

  const crossZone = await socketMessageOfType(joined.socket, 'world_position_correction', () => {
    joined.socket.send(JSON.stringify({
      type: 'move', zone: 'arbor', x: 11, y: 0, z: 10.6, rotY: 0,
    }));
  });
  assert.equal(crossZone.zone, 'hub');
  assert.deepEqual(crossZone.position, spawn);
  assert.equal((await gameplay(player, fishing, randomUUID(), 409)).error, 'Move closer to that activity.');

  // A real zone transition is an intentional fast travel to that zone's spawn,
  // never straight onto a remote resource node.
  const arrived = socketMessageOfType(joined.socket, 'zone_snapshot', () => {
    joined.socket.send(JSON.stringify({
      type: 'move', zone: 'arbor', x: 0, y: 0, z: 10, rotY: 0,
    }));
  });
  await arrived;
  const afterTravel = await gameplay(player, resource, randomUUID(), 409);
  assert.equal(afterTravel.error, 'Move closer to that activity.');
});
