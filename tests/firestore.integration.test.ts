import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { PROGRESSION_VERSION } from '../shared/gameplayActions.ts';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'demo-aldervale-audit';

describe.skipIf(!emulator)('Firestore audit repairs', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, port] = emulator!.split(':');
    env = await initializeTestEnvironment({
      projectId, firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
    });
    await env.clearFirestore();
  }, 20_000);

  afterAll(async () => { await env?.cleanup(); });

  const player = (uid: string) => env.authenticatedContext(uid, { email_verified: true }).firestore() as unknown as Firestore;
  const wizard = (ownerId: string, name: string) => ({
    ownerId, name, realmId: 'breeze', raceId: 'human', elementId: 'ember', level: 1, rank: 1, xp: 0,
    sculpt: { skinHex: '#000000' }, wardrobe: { ownedGearIds: [] }, currencies: { florins: 220 },
    progression: { rebirthSeals: 1 }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  const pet = (ownerId: string) => ({
    ownerId, wizardId: 'rowan', realmId: 'breeze', speciesId: 'cinder_kitsune',
    nickname: 'Cinder', elementId: 'ember', stage: 1, chromatic: 'none', wins: 0,
    bondXp: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  const dorm = (ownerId: string) => ({
    ownerId, wizardId: 'rowan', realmId: 'breeze', themeId: 'sunlit_loft', weatherId: 'clear_breeze',
    isPublic: false, items: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  async function seed(path: string, value: Record<string, unknown>) {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore() as unknown as Firestore, path), value);
    });
  }

  it('preserves owner reads while reserving all gameplay writers for the server', async () => {
    const db = player('rowan-owner');
    await seed('wizards/rowan', { ...wizard('rowan-owner', 'Rowan'), serverProgressionVersion: PROGRESSION_VERSION });
    await seed('wizards/rowan/creatures/starter', { ...pet('rowan-owner'), serverProgressionVersion: PROGRESSION_VERSION });
    await seed('wizards/rowan/sanctuary/layout', dorm('rowan-owner'));
    await seed('publicWizards/rowan', { ownerId: 'rowan-owner', realmId: 'breeze', name: 'Rowan' });
    await seed('accounts/rowan-owner/realms/breeze', { uid: 'rowan-owner', realmId: 'breeze', termXp: 60, sharedVault: [] });
    await seed('worldRealms/breeze/progressionAccounts/rowan-owner', { wizardIds: ['rowan'] });
    const paths = [
      'wizards/rowan', 'wizards/rowan/creatures/starter', 'wizards/rowan/sanctuary/layout',
      'publicWizards/rowan', 'accounts/rowan-owner/realms/breeze',
    ];
    for (const path of paths) {
      const ref = doc(db, path);
      const before = (await assertSucceeds(getDoc(ref))).data();
      await assertFails(updateDoc(ref, { updatedAt: serverTimestamp() }));
      expect((await getDoc(ref)).data()).toEqual(before);
    }
    await assertFails(getDoc(doc(db, 'worldRealms/breeze/progressionAccounts/rowan-owner')));
  });

  it('preserves an earlier cloud wizard without making its identity writable', async () => {
    await seed('wizards/earlier', wizard('archive-owner', 'Earlier'));
    const owner = player('archive-owner');
    const old = doc(owner, 'wizards/earlier');
    const snapshot = await assertSucceeds(getDoc(old));
    expect(snapshot.get('name')).toBe('Earlier');
    expect(snapshot.get('serverProgressionVersion')).toBeUndefined();
    await assertFails(updateDoc(old, { updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(player('another-owner'), 'wizards/earlier')));
  });

  it('saves preference fields to the owning account without overwriting unchanged settings', async () => {
    const { saveCloudSettings } = await import('../src/lib/storage.ts');
    const { normalizePlayerSettings } = await import('../shared/settings.ts');
    const owner = player('settings-owner');
    const ref = doc(owner, 'accounts/settings-owner');
    await setDoc(ref, {
      uid: 'settings-owner', displayName: 'Settings Wizard',
      settings: { harpVolume: 0.4, sfxVolume: 0.65, solo2xDefault: false },
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await saveCloudSettings('settings-owner', { harpVolume: 0, cameraSensitivity: 1.6, solo2xDefault: true }, owner);
    expect(normalizePlayerSettings((await getDoc(ref)).get('settings'))).toEqual({
      harpVolume: 0, sfxVolume: 0.65, cameraSensitivity: 1.6, solo2xDefault: true,
    });
    await assertFails(saveCloudSettings('settings-owner', { harpVolume: 1 }, player('another-account')));
  });

  it('keeps wallets private and uses the same tour transaction for visibility and listing', async () => {
    const owner = player('rowan-owner');
    const visitor = player('visitor');
    const path = 'wizards/rowan/sanctuary/layout';
    await assertFails(getDoc(doc(visitor, path)));
    await assertFails(getDoc(doc(owner, 'worldRealms/breeze/wallets/rowan-owner')));
    const { publishTour, unpublishTour, listTours } = await import('../server/market.ts');
    await expect(publishTour('breeze', 'rowan-owner', 'rowan')).resolves.toEqual({ isPublic: true });
    expect(await listTours('breeze')).toMatchObject([{ wizardId: 'rowan', ratingAvg: null, ratingCount: 0 }]);
    expect((await assertSucceeds(getDoc(doc(visitor, path)))).get('isPublic')).toBe(true);
    await expect(unpublishTour('breeze', 'rowan-owner', 'rowan')).resolves.toMatchObject({ isPublic: false });
    expect(await listTours('breeze')).toEqual([]);
    await assertFails(getDoc(doc(visitor, path)));
    expect((await assertSucceeds(getDoc(doc(owner, path)))).get('isPublic')).toBe(false);
  });

  it('keeps Sky-Lens paintings private even when the Dorm is public', async () => {
    const owner = player('rowan-owner');
    const visitor = player('visitor');
    const path = 'wizards/rowan/private/gallery';
    const { publishTour } = await import('../server/market.ts');
    await expect(publishTour('breeze', 'rowan-owner', 'rowan')).resolves.toEqual({ isPublic: true });
    expect((await assertSucceeds(getDoc(doc(visitor, 'wizards/rowan/sanctuary/layout')))).get('isPublic')).toBe(true);
    await assertSucceeds(setDoc(doc(owner, path), { images: ['data:image/jpeg;base64,AAA'] }));
    expect((await assertSucceeds(getDoc(doc(owner, path)))).get('images')).toHaveLength(1);
    await assertFails(getDoc(doc(visitor, path)));
  });

  it('settles Bazaar purchases, prevents duplicate purchases and checks trade balances', async () => {
    const { buyListing, postListing, cancelListing, settleTrade, listBazaar, awardLiveVictory } = await import('../server/market.ts');
    await seed('wizards/buyer', wizard('buyer-owner', 'Buyer'));
    const starter = await buyListing('breeze', 'rowan-owner', 'rowan', 'academy-hat');
    expect(starter.wallet.florins).toBe(138);
    expect(starter.wallet.gear.hat_pointed_brim).toBe(1);
    for (const priceFlorins of [0, -1, 1.2, NaN, '100', 1_000_001]) {
      await expect(postListing('breeze', 'rowan-owner', {
        wizardId: 'rowan', itemId: 'hat_pointed_brim', priceFlorins,
      })).rejects.toMatchObject({ status: 400 });
    }
    const { listing, wallet } = await postListing('breeze', 'rowan-owner', { wizardId: 'rowan', itemId: 'hat_pointed_brim', priceFlorins: 100 });
    expect(wallet.gear.hat_pointed_brim).toBe(0);
    const purchases = await Promise.allSettled([
      buyListing('breeze', 'buyer-owner', 'buyer', listing.id), buyListing('breeze', 'buyer-owner', 'buyer', listing.id),
    ]);
    expect(purchases.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await listBazaar('breeze', 'rowan-owner')).wallet?.florins).toBe(238);
    expect((await listBazaar('breeze', 'buyer-owner')).wallet).toMatchObject({ florins: 120, gear: { hat_pointed_brim: 1 } });
    const wallets = await settleTrade('breeze', 'rowan-owner', 'buyer-owner', 10, 5, 'trade-1');
    expect(wallets.map(({ florins }) => florins)).toEqual([233, 125]);
    await expect(settleTrade('breeze', 'rowan-owner', 'buyer-owner', 10, 5, 'trade-1')).resolves.toEqual(wallets);
    await expect(settleTrade('breeze', 'rowan-owner', 'buyer-owner', 999999, 0, 'trade-2')).rejects.toThrow('insufficient');
    for (const invalidOffer of [-1, 1.5, NaN, 1_000_001]) {
      await expect(settleTrade('breeze', 'rowan-owner', 'buyer-owner', invalidOffer, 0, 'trade-3')).rejects.toMatchObject({ status: 400 });
      await expect(settleTrade('breeze', 'rowan-owner', 'buyer-owner', 0, invalidOffer, 'trade-3')).rejects.toMatchObject({ status: 400 });
    }
    expect((await listBazaar('breeze', 'rowan-owner')).wallet?.florins).toBe(233);
    expect((await listBazaar('breeze', 'buyer-owner')).wallet?.florins).toBe(125);
    const retriedTrade = wallets.map((wallet) => ({ ...wallet, revision: (wallet.revision ?? 0) + 1 }));
    await expect(settleTrade('breeze', 'rowan-owner', 'buyer-owner', 5, 5, 'trade-3')).resolves.toEqual(retriedTrade);
    const first = await awardLiveVictory('breeze', 'rowan-owner', 'duel-receipt', 'coop');
    const replay = await awardLiveVictory('breeze', 'rowan-owner', 'duel-receipt', 'coop');
    expect(first).toMatchObject({ florins: 353, honorMarks: 8, bondingSeals: 1 });
    expect(replay).toEqual(first);
    const escrow = await postListing('breeze', 'buyer-owner', { wizardId: 'buyer', itemId: 'hat_pointed_brim', priceFlorins: 105 });
    const cancelled = await cancelListing('breeze', 'buyer-owner', escrow.listing.id);
    expect(cancelled.wallet.gear.hat_pointed_brim).toBe(1);
    await expect(cancelListing('breeze', 'buyer-owner', escrow.listing.id)).resolves.toEqual(cancelled);
    expect((await listBazaar('breeze', 'buyer-owner')).wallet?.florins).toBe(125);
  }, 20_000);

  it('persists realm-scoped House memberships and serializes concurrent joins', async () => {
    const { createHouse, listHouses, changeHouseMembership } = await import('../server/market.ts');
    const first = await createHouse('breeze', 'house-founder', { name: 'Starlight', crestElement: 'ember' });
    const second = await createHouse('breeze', 'other-founder', { name: 'Moonstone', crestElement: 'sol' });
    expect(await listHouses('breeze', 'house-founder')).toMatchObject({ currentHouseId: first.id });
    expect((await listHouses('breeze')).houses).toContainEqual(first);
    expect((await listHouses('horizon')).houses).not.toContainEqual(first);
    await assertFails(getDoc(doc(player('house-founder'), `worldRealms/breeze/clubs/${first.id}`)));
    const results = await Promise.allSettled([first, second].map((house) =>
      changeHouseMembership('breeze', 'house-guest', house.id, 'join'),
    ));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const joined = results[0].status === 'fulfilled' ? first : second;
    expect(await listHouses('breeze', 'house-guest')).toMatchObject({ currentHouseId: joined.id });
    expect((await listHouses('breeze')).houses.find(({ id }) => id === joined.id)).toEqual({ ...joined, memberCount: 2 });
    await changeHouseMembership('breeze', 'house-guest', joined.id, 'leave');
    expect((await listHouses('breeze', 'house-guest')).currentHouseId).toBeNull();
    await changeHouseMembership('breeze', 'house-founder', first.id, 'leave');
    expect((await listHouses('breeze')).houses).not.toContainEqual(first);
  }, 20_000);

});
