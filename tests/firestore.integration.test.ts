import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore } from 'firebase/firestore';
import { createStarterWizard } from '../shared/economy.ts';
import type { GuestRealmBundle } from '../src/lib/storage.ts';

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

  function guestSave(id: string): GuestRealmBundle {
    const wizard = createStarterWizard({
      id, ownerId: 'guest_local', realmId: 'breeze', name: 'Guest Rowan', raceId: 'human',
      elementId: 'ember', sculpt: {} as Parameters<typeof createStarterWizard>[0]['sculpt'],
    });
    return {
      account: { uid: 'guest_local', realmId: 'breeze', wizardIds: [id], unlockedRaces: ['human', 'dwarf'],
        termXp: 120, claimedTermTiers: [2], sharedVault: ['guest-gear'] },
      wizards: [wizard],
      creatures: { [id]: [{
        id: wizard.activeCreatureId, ownerId: 'guest_local', wizardId: id, realmId: 'breeze',
        speciesId: 'cinder_kitsune', nickname: 'Cinder', elementId: 'ember',
        stage: 1, chromatic: 'none', branchChoice: 'A', bondXp: 0, wins: 0, talents: [],
      }] },
      sanctuaries: { [id]: { ...dorm('guest_local'), wizardId: id, realmId: 'breeze', gardens: [] } },
      gallery: { [id]: ['data:image/jpeg;base64,AAA'] },
    };
  }

  function cloudRealm(uid: string) {
    return { uid, realmId: 'breeze' as const, wizardIds: [], unlockedRaces: ['human' as const],
      termXp: 0, claimedTermTiers: [], sharedVault: [] };
  }

  function seedRealm(database: Firestore, account: ReturnType<typeof cloudRealm>) {
    return setDoc(doc(database, 'accounts', account.uid, 'realms', account.realmId), {
      ...account, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }

  it('commits owner, public projection, starter pet and dorm together', async () => {
    const db = player('rowan-owner');
    const batch = writeBatch(db);
    batch.set(doc(db, 'wizards/rowan'), wizard('rowan-owner', 'Rowan'));
    batch.set(doc(db, 'publicWizards/rowan'), {
      ownerId: 'rowan-owner', realmId: 'breeze', name: 'Rowan', raceId: 'human', elementId: 'ember',
      level: 1, rank: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'wizards/rowan/creatures/starter'), pet('rowan-owner'));
    batch.set(doc(db, 'wizards/rowan/sanctuary/layout'), dorm('rowan-owner'));
    await assertSucceeds(batch.commit());
    expect((await getDoc(doc(db, 'wizards/rowan/creatures/starter'))).exists()).toBe(true);
    expect((await getDoc(doc(db, 'wizards/rowan/sanctuary/layout'))).exists()).toBe(true);
  });

  it('permits lineage, sculpt and progression in the same owner update', async () => {
    const db = player('rowan-owner');
    await assertSucceeds(updateDoc(doc(db, 'wizards/rowan'), {
      raceId: 'dwarf', sculpt: { skinHex: '#ff2211' }, progression: { rebirthSeals: 0 }, updatedAt: serverTimestamp(),
    }));
  });

  it('commits multiple hatchlings and wizard egg changes with a fusion card and unlock', async () => {
    const db = player('rowan-owner');
    const batch = writeBatch(db);
    const wizardRef = doc(db, 'wizards/rowan');
    batch.update(wizardRef, {
      'progression.eggs': [], 'progression.unlockedFusions': ['magma'],
      'progression.ownedSpellIds': ['magma_tectonic'], updatedAt: serverTimestamp(),
    });
    batch.set(doc(wizardRef, 'creatures/hatch-one'), {
      ...pet('rowan-owner'), speciesId: 'magma_salamander', nickname: 'Caldera Newt', elementId: 'magma',
    });
    batch.set(doc(wizardRef, 'creatures/hatch-two'), pet('rowan-owner'));
    await assertSucceeds(batch.commit());
    expect((await getDoc(doc(wizardRef, 'creatures/hatch-one'))).data()).toMatchObject({ elementId: 'magma' });
    expect((await getDoc(doc(wizardRef, 'creatures/hatch-two'))).exists()).toBe(true);
    expect((await getDoc(wizardRef)).get('progression')).toMatchObject({
      eggs: [], unlockedFusions: ['magma'], ownedSpellIds: ['magma_tectonic'],
    });
  });

  it('applies a concurrent Term claim to the wizard exactly once', async () => {
    const { createStarterWizard } = await import('../shared/economy.ts');
    const { claimCloudTermTier } = await import('../src/lib/storage.ts');
    const owner = player('term-owner');
    const rowan = createStarterWizard({
      id: 'term-rowan', ownerId: 'term-owner', realmId: 'breeze',
      name: 'Term Rowan', raceId: 'human', elementId: 'ember',
      sculpt: {} as Parameters<typeof createStarterWizard>[0]['sculpt'],
    });
    const wizardRef = doc(owner, 'wizards', rowan.id);
    const accountRef = doc(owner, 'accounts', rowan.ownerId, 'realms', rowan.realmId);
    const { id: _id, beastClan: _clan, ...fields } = rowan;
    await assertSucceeds(setDoc(wizardRef, { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(accountRef, {
      uid: rowan.ownerId, realmId: rowan.realmId, wizardIds: [rowan.id], unlockedRaces: ['human'],
      termXp: 60, claimedTermTiers: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    const results = await Promise.all([claimCloudTermTier(rowan, 1, owner), claimCloudTermTier(rowan, 1, owner)]);
    expect(results.filter((result) => result.claimed)).toHaveLength(1);
    await expect(claimCloudTermTier(rowan, 2, owner)).rejects.toThrow('not earned');
    expect((await getDoc(accountRef)).get('claimedTermTiers')).toEqual([1]);
    expect((await getDoc(wizardRef)).get('currencies.florins')).toBe(rowan.currencies.florins + 120);
  }, 20_000);

  it('retains guest claims and merges vault items when migrating a wizard', async () => {
    const { migrateGuestWizards } = await import('../src/lib/storage.ts');
    const owner = player('migration-owner');
    const guest = guestSave('guest-wizard');
    const [wizard] = guest.wizards;
    const account = { ...cloudRealm('migration-owner'), termXp: 60, claimedTermTiers: [1], sharedVault: ['cloud-gear'] };
    const accountRef = doc(owner, 'accounts', account.uid, 'realms', account.realmId);
    await setDoc(accountRef, {
      ...account, unlockedRaces: ['human', 'high_elf'], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await expect(migrateGuestWizards(account, guest, owner)).resolves.toBe('saved');
    expect((await getDoc(accountRef)).data()).toMatchObject({
      wizardIds: [wizard.id], claimedTermTiers: [1, 2], sharedVault: ['cloud-gear', 'guest-gear'], termXp: 120,
      unlockedRaces: ['human', 'high_elf', 'dwarf'],
    });
    expect((await getDoc(doc(owner, 'wizards', wizard.id))).data()).toMatchObject({ ownerId: account.uid, activeCreatureId: wizard.activeCreatureId });
    expect((await getDoc(doc(owner, 'wizards', wizard.id, 'creatures', wizard.activeCreatureId))).get('ownerId')).toBe(account.uid);
    expect((await getDoc(doc(owner, 'wizards', wizard.id, 'sanctuary', 'layout'))).get('isPublic')).toBe(false);
    expect((await getDoc(doc(owner, 'wizards', wizard.id, 'private', 'gallery'))).get('images')).toEqual(guest.gallery?.[wizard.id]);
    expect(wizard.ownerId).toBe('guest_local');
    await expect(migrateGuestWizards(account, guest, owner)).resolves.toBe('skipped');
  });

  it('lets a second account enroll when a legacy guest save contains an already-imported wizard', async () => {
    const { createCloudWizards, migrateGuestWizards } = await import('../src/lib/storage.ts');
    const first = cloudRealm('guest-link-first');
    const second = cloudRealm('guest-link-second');
    const firstDb = player(first.uid);
    const secondDb = player(second.uid);
    const guest = guestSave('guest-link-original');
    const [original] = guest.wizards;
    await seedRealm(firstDb, first);
    await createCloudWizards(first, [{ wizard: { ...original, ownerId: first.uid }, pets: [], sanctuary: null }], firstDb);
    const firstRef = doc(firstDb, 'wizards', original.id);
    const firstSave = (await getDoc(firstRef)).data();
    const secondRealm = doc(secondDb, 'accounts', second.uid, 'realms', second.realmId);
    await seedRealm(secondDb, second);

    const freshGuestWizard = guestSave('guest-link-unclaimed').wizards[0];
    guest.wizards.push(freshGuestWizard);
    await expect(migrateGuestWizards(second, guest, secondDb)).resolves.toBe('already-linked');
    expect((await getDoc(secondRealm)).data()).toMatchObject(second);
    expect((await getDoc(doc(secondDb, 'publicWizards', freshGuestWizard.id))).exists()).toBe(false);

    const newWizard = { ...freshGuestWizard, ownerId: second.uid, name: 'Second Rowan' };
    await createCloudWizards(second, [{ wizard: newWizard, pets: [], sanctuary: null }], secondDb);
    expect((await getDoc(secondRealm)).get('wizardIds')).toEqual([newWizard.id]);
    const secondWizards = await getDocs(query(collection(secondDb, 'wizards'), where('ownerId', '==', second.uid)));
    expect(secondWizards.docs.map((saved) => saved.id)).toEqual([newWizard.id]);
    expect((await getDoc(firstRef)).data()).toEqual(firstSave);
    expect((await getDoc(doc(secondDb, 'publicWizards', original.id))).get('ownerId')).toBe(first.uid);
  });

  it('imports a guest bundle into exactly one account during concurrent sign-ins', async () => {
    const { migrateGuestWizards } = await import('../src/lib/storage.ts');
    const guest = guestSave('guest-link-race');
    const accounts = ['guest-race-first', 'guest-race-second'].map(cloudRealm);
    const databases = accounts.map(({ uid }) => player(uid));
    await Promise.all(accounts.map((account, index) => seedRealm(databases[index], account)));
    const results = await Promise.all(accounts.map((account, index) => migrateGuestWizards(account, guest, databases[index])));
    expect(results.sort()).toEqual(['already-linked', 'saved']);
    const lists = await Promise.all(accounts.map(({ uid }, index) =>
      getDocs(query(collection(databases[index], 'wizards'), where('ownerId', '==', uid)))));
    expect(lists.map((list) => list.size).sort()).toEqual([0, 1]);
  }, 20_000);

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
    const buyer = player('buyer-owner');
    await assertSucceeds(setDoc(doc(buyer, 'wizards/buyer'), wizard('buyer-owner', 'Buyer')));
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
