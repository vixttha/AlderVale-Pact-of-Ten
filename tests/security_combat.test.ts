import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionalResourceStore, type AuthenticatorFn } from '../server/authzStore.ts';
import { resolveDuelRound, drawUpToSeven, applyStatusEffect, type DuelState, type CombatantState } from '../shared/combat.ts';
import { resolveFusionSpecies } from '../shared/creatures.ts';
import { getElementMatchupMultiplier } from '../shared/elements.ts';

const tokenAuth: AuthenticatorFn = (headers) => {
  const token = headers.authorization;
  if (token === 'Bearer alice-valid') return { userId: 'alice' };
  if (token === 'Bearer bob-valid') return { userId: 'bob' };
  return null;
};

describe('Orange Team — Transactional Authorization & 7-Case Regression Suite', () => {
  let store: TransactionalResourceStore;

  beforeEach(() => {
    store = new TransactionalResourceStore();
    store.seed({
      id: 'res_alice_1',
      ownerId: 'alice',
      realmId: 'breeze',
      titleBadge: 'First-Year',
      motto: 'Original Motto',
      isPublic: false,
      ratingSum: 10,
      ratingCount: 2,
      role: 'student',
      permissions: ['read', 'edit'],
      updatedAt: 1000,
    });
    store.seed({
      id: 'res_bob_1',
      ownerId: 'bob',
      realmId: 'breeze',
      titleBadge: 'Duelist',
      motto: 'Bob Motto',
      isPublic: false,
      ratingSum: 0,
      ratingCount: 0,
      role: 'student',
      permissions: ['read'],
      updatedAt: 1000,
    });
  });

  it('Case 1: Unauthenticated request with or without X-Internal-Override -> 401 and no write', async () => {
    const r1 = await store.updateResourceAuthorized({
      headers: {},
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Hacked' },
    });
    const r2 = await store.updateResourceAuthorized({
      headers: { 'x-internal-override': 'true' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Hacked' },
    });
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(store.getSnapshot('res_alice_1')?.motto).toBe('Original Motto');
  });

  it('Case 2: Authenticated non-owner with or without X-Internal-Override -> 404 and no write', async () => {
    const r1 = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer bob-valid' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Stolen' },
    });
    const r2 = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer bob-valid', 'x-internal-override': 'admin' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Stolen' },
    });
    expect(r1.status).toBe(404);
    expect(r2.status).toBe(404);
    expect(store.getSnapshot('res_alice_1')?.motto).toBe('Original Motto');
  });

  it('Case 3: Owner updates own resource with or without override header -> 204, only allowed fields change', async () => {
    const res = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer alice-valid', 'x-internal-override': 'true' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Canopy Scholar', isPublic: true },
    });
    expect(res.status).toBe(204);
    const snap = store.getSnapshot('res_alice_1');
    expect(snap?.motto).toBe('Canopy Scholar');
    expect(snap?.isPublic).toBe(true);
    expect(snap?.ownerId).toBe('alice');
  });

  it('Case 4: Caller owns one resource and requests update to a different resource -> 404, neither changes', async () => {
    const res = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer alice-valid' },
      authenticate: tokenAuth,
      resourceId: 'res_bob_1',
      changes: { motto: 'Cross Target' },
    });
    expect(res.status).toBe(404);
    expect(store.getSnapshot('res_alice_1')?.motto).toBe('Original Motto');
    expect(store.getSnapshot('res_bob_1')?.motto).toBe('Bob Motto');
  });

  it('Case 5: Owner submits ownership or permission fields -> protected fields cannot change', async () => {
    const res = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer alice-valid' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: {
        motto: 'Legit Edit',
        ownerId: 'mallory',
        role: 'superadmin',
        permissions: ['*'],
        realmId: 'everpeak',
      },
    });
    expect(res.status).toBe(204);
    const snap = store.getSnapshot('res_alice_1');
    expect(snap?.motto).toBe('Legit Edit');
    expect(snap?.ownerId).toBe('alice');
    expect(snap?.role).toBe('student');
    expect(snap?.permissions).toEqual(['read', 'edit']);
    expect(snap?.realmId).toBe('breeze');
  });

  it('Case 6: Ownership transfer commits before old owner update obtains lock -> 404, no effect', async () => {
    // Queue concurrent ownership transfer first, then Alice's update waits behind the lock
    const transferPromise = store.withResourceLock('res_alice_1', async (tx) => {
      await new Promise((r) => setTimeout(r, 15));
      tx.transferOwnershipForTest('res_alice_1', 'bob');
    });

    const staleUpdatePromise = store.updateResourceAuthorized({
      headers: { authorization: 'Bearer alice-valid' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Stale Owner Write' },
    });

    await transferPromise;
    const updateResult = await staleUpdatePromise;
    expect(updateResult.status).toBe(404);
    expect(store.getSnapshot('res_alice_1')?.ownerId).toBe('bob');
    expect(store.getSnapshot('res_alice_1')?.motto).toBe('Original Motto');
  });

  it('Case 7: Ownership lookup fails -> request fails and transaction leaves no protected changes', async () => {
    store.setSimulateLookupError(true);
    const res = await store.updateResourceAuthorized({
      headers: { authorization: 'Bearer alice-valid' },
      authenticate: tokenAuth,
      resourceId: 'res_alice_1',
      changes: { motto: 'Should Rollback' },
    });
    expect(res.status).toBe(500);
    expect(store.getSnapshot('res_alice_1')?.motto).toBe('Original Motto');
  });
});

describe('Aldervale Combat & Breeding Domain Rules', () => {
  function makeTestCombatant(id: string, element: CombatantState['element'], isPlayer: boolean): CombatantState {
    const c: CombatantState = {
      id,
      name: id,
      isPlayer,
      isNpc: !isPlayer,
      raceId: 'human',
      element,
      archmasteryElement: element,
      hp: 500,
      maxHp: 500,
      powerPips: 1,
      regularPips: 2,
      schoolPips: 0,
      accuracyBonus: 0,
      powerBonusPct: 0,
      piercePct: 0,
      critPct: 0,
      blockPct: 0,
      stunnedTurns: 0,
      stunBlocks: 0,
      blades: [],
      shields: [],
      traps: [],
      weaknesses: [],
      prisms: [],
      dots: [],
      statusEffects: [],
      hand: ['ember_cinder_dart', 'ember_hearth_blade'],
      deck: ['ember_cinder_dart', 'ember_cinder_dart'],
      discard: [],
      sideboard: [],
      spellwrighting: {},
      creatures: [],
      activeCreatureIdx: 0,
    };
    drawUpToSeven(c);
    return c;
  }

  it('keeps the selected spell when an earlier card is discarded and replaced', () => {
    const p = makeTestCombatant('wizard', 'ember', true);
    const e = makeTestCombatant('enemy', 'frost', false);
    p.hand = ['ember_hearth_blade', 'ember_cinder_dart'];
    p.deck = ['frost_tower_ward'];
    const state: DuelState = {
      duelId: 'cycle-check', mode: 'solo', round: 1, turnTimerSeconds: null, arenaBubble: null,
      playerTeam: [p], enemyTeam: [e], firstTeam: 'player', phase: 'planning', logs: [], telegraphedCheat: null,
    };
    const result = resolveDuelRound(state, [{
      actorId: p.id, targetId: e.id, creatureAction: 'none', cardIndex: 1, discardIndices: [0],
    }], () => 0.1);
    expect(result.enemyTeam[0].hp).toBeLessThan(e.hp);
    expect(result.playerTeam[0].hand).toEqual(['frost_tower_ward']);
    expect(result.playerTeam[0].discard).toEqual(['ember_hearth_blade', 'ember_cinder_dart']);
  });

  it('refunds full Pips when a spell fizzles', () => {
    const p = makeTestCombatant('wiz', 'ember', true);
    const e = makeTestCombatant('foe', 'frost', false);
    const state: DuelState = {
      duelId: 'd1',
      mode: 'solo',
      round: 1,
      turnTimerSeconds: null,
      arenaBubble: null,
      playerTeam: [p],
      enemyTeam: [e],
      firstTeam: 'player',
      phase: 'planning',
      logs: [],
      telegraphedCheat: null,
    };
    // High RNG (0.99 * 100 = 99 > 82% accuracy) triggers fizzle -> Pips not spent!
    const next = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: 0, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.99,
    );
    expect(next.enemyTeam[0].hp).toBe(500);
    // Plus 1 new pip granted at end of round -> total pip count >= initial 3 + 1 = 4
    const wizAfter = next.playerTeam[0];
    expect(wizAfter.regularPips + wizAfter.powerPips + wizAfter.schoolPips).toBe(4);
    expect(next.logs.some((l) => l.includes('FIZZLED'))).toBe(true);
  });

  it('resolves Secret Fusion creature recipes and opposing element bonus', () => {
    expect(resolveFusionSpecies('ember', 'bramble')?.id).toBe('magma_salamander');
    expect(resolveFusionSpecies('tide', 'spark')?.id).toBe('tempest_serpent');
    expect(resolveFusionSpecies('umbra', 'sol')?.id).toBe('eclipse_lynx');
    expect(getElementMatchupMultiplier('ember', 'frost')).toBe(1.25);
    expect(getElementMatchupMultiplier('ember', 'ember')).toBe(0.85);
  });

  it('applies Burning over turns, decrements turnsLeft, and expires cleanly', () => {
    const p = makeTestCombatant('wiz', 'ember', true);
    const e = makeTestCombatant('foe', 'gale', false);
    p.hand = ['ember_cinder_dart']; // applies burning (30 dmg/turn for 2 turns)
    let state: DuelState = {
      duelId: 'd_burn',
      mode: 'solo',
      round: 1,
      turnTimerSeconds: null,
      arenaBubble: null,
      playerTeam: [p],
      enemyTeam: [e],
      firstTeam: 'player',
      phase: 'planning',
      logs: [],
      telegraphedCheat: null,
    };

    // Round 1: cast Cinder Dart -> hits and applies Burning (2t)
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: 0, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    const foeAfterR1 = state.enemyTeam[0];
    expect(foeAfterR1.hp).toBe(500 - 95);
    expect(foeAfterR1.statusEffects.some((s) => s.kind === 'burning' && s.turnsLeft === 2)).toBe(true);

    // Round 2: Burning ticks 30 dmg at start of round -> 1t left
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: null, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.enemyTeam[0].hp).toBe(500 - 95 - 30);
    expect(state.enemyTeam[0].statusEffects.find((s) => s.kind === 'burning')?.turnsLeft).toBe(1);

    // Round 3: Burning ticks final 30 dmg and expires
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: null, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.enemyTeam[0].hp).toBe(500 - 95 - 60);
    expect(state.enemyTeam[0].statusEffects.some((s) => s.kind === 'burning')).toBe(false);
  });

  it('heals Wizard HP each turn with Regen capped at maxHp and expires', () => {
    const p = makeTestCombatant('wiz', 'bramble', true);
    const e = makeTestCombatant('foe', 'frost', false);
    p.hp = 350;
    p.hand = ['uni_mending_mist']; // kind: 'regen', +75 HP/t for 3t
    let state: DuelState = {
      duelId: 'd_regen',
      mode: 'solo',
      round: 1,
      turnTimerSeconds: null,
      arenaBubble: null,
      playerTeam: [p],
      enemyTeam: [e],
      firstTeam: 'player',
      phase: 'planning',
      logs: [],
      telegraphedCheat: null,
    };

    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: 0, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.playerTeam[0].statusEffects.find((s) => s.kind === 'regen')?.turnsLeft).toBe(3);

    // Round 2: +75 -> 425
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: null, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.playerTeam[0].hp).toBe(425);

    // Round 3: +75 -> 500 (capped)
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: null, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.playerTeam[0].hp).toBe(500);

    // Round 4: +75 capped at 500, Regen expires
    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: null, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    expect(state.playerTeam[0].hp).toBe(500);
    expect(state.playerTeam[0].statusEffects.some((s) => s.kind === 'regen')).toBe(false);
  });

  it('skips turn when Stunned and respects Anchor Conviction Stun Ward', () => {
    const p = makeTestCombatant('wiz', 'frost', true);
    const e = makeTestCombatant('foe', 'ember', false);
    p.hand = ['frost_stasis_chime']; // Stun 1t
    e.hand = ['ember_cinder_dart'];

    let state: DuelState = {
      duelId: 'd_stun',
      mode: 'solo',
      round: 1,
      turnTimerSeconds: null,
      arenaBubble: null,
      playerTeam: [p],
      enemyTeam: [e],
      firstTeam: 'player',
      phase: 'planning',
      logs: [],
      telegraphedCheat: null,
    };

    state = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: 0, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: 0, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    // Enemy was stunned before acting, so wiz took 0 dmg and stun wore off after skipping
    expect(state.playerTeam[0].hp).toBe(500);
    expect(state.logs.some((l) => l.includes('Stunned and skips this turn'))).toBe(true);
    expect(state.enemyTeam[0].statusEffects.some((s) => s.kind === 'stunned')).toBe(false);

    // Now verify stunBlocks intercepts Stunned
    const warded = makeTestCombatant('warded', 'frost', true);
    warded.stunBlocks = 1;
    const blocked = applyStatusEffect(warded, {
      id: 's1',
      kind: 'stunned',
      label: 'Stunned',
      element: 'frost',
      magnitude: 1,
      turnsLeft: 1,
    });
    expect(blocked).toBe(false);
    expect(warded.stunBlocks).toBe(0);
    expect(warded.stunnedTurns).toBe(0);
  });

  it('applies Frostbite -15% outgoing damage and Shocked accuracy penalty', () => {
    const p = makeTestCombatant('wiz', 'ember', true);
    const e = makeTestCombatant('foe', 'gale', false);
    p.hand = ['ember_cinder_dart']; // base 95 dmg, 82% acc
    applyStatusEffect(p, {
      id: 'fb_1',
      kind: 'frostbite',
      label: 'Frostbite',
      element: 'frost',
      magnitude: 10,
      turnsLeft: 2,
    });

    const state: DuelState = {
      duelId: 'd_fb',
      mode: 'solo',
      round: 1,
      turnTimerSeconds: null,
      arenaBubble: null,
      playerTeam: [p],
      enemyTeam: [e],
      firstTeam: 'player',
      phase: 'planning',
      logs: [],
      telegraphedCheat: null,
    };

    const next = resolveDuelRound(
      state,
      [
        { actorId: 'wiz', cardIndex: 0, targetId: 'foe', creatureAction: 'none' },
        { actorId: 'foe', cardIndex: null, targetId: 'wiz', creatureAction: 'none' },
      ],
      () => 0.5,
    );
    // 95 * 0.85 = 80.75 -> 81 dmg
    expect(next.enemyTeam[0].hp).toBe(500 - 81);

    // Verify Shocked lowers accuracy (82% - 10% = 72%, roll 0.75 * 100 = 75 -> FIZZLE)
    const p2 = makeTestCombatant('wiz2', 'ember', true);
    const e2 = makeTestCombatant('foe2', 'gale', false);
    p2.hand = ['ember_cinder_dart'];
    applyStatusEffect(p2, {
      id: 'sh_1',
      kind: 'shocked',
      label: 'Shocked',
      element: 'spark',
      magnitude: 10,
      turnsLeft: 2,
    });
    const next2 = resolveDuelRound(
      { ...state, duelId: 'd_sh', playerTeam: [p2], enemyTeam: [e2] },
      [
        { actorId: 'wiz2', cardIndex: 0, targetId: 'foe2', creatureAction: 'none' },
        { actorId: 'foe2', cardIndex: null, targetId: 'wiz2', creatureAction: 'none' },
      ],
      () => 0.75,
    );
    expect(next2.enemyTeam[0].hp).toBe(500);
    expect(next2.logs.some((l) => l.includes('FIZZLED'))).toBe(true);
  });
});
