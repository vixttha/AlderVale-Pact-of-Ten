import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Fail closed: never silently use a real Firebase project or database.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') {
  throw new Error('Run through npm run test:rules; the local emulator must be 127.0.0.1:8088');
}
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-aldervale-ci',
    firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { if (env) await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });
const db = (uid, verified = true) => env.authenticatedContext(uid, { email_verified: verified }).firestore();
const wizard = (ownerId = 'alice') => ({
  ownerId, realmId: 'breeze', name: 'Runner Rowan', raceId: 'human', elementId: 'ember',
  level: 1, xp: 0, rank: 1, sculpt: {}, wardrobe: {}, currencies: {},
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
const seed = async (path, value) => env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), path), value));
const storedWizard = () => ({ ...wizard(), createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) });

test('verified owner can read a server wizard and enrollment uses the server route', async () => {
  const ref = doc(db('alice'), 'wizards/w_alice');
  await assertFails(setDoc(ref, wizard()));
  await seed('wizards/w_alice', storedWizard());
  await assertSucceeds(getDoc(ref));
});
test('unauthenticated wizard creation is rejected', async () => {
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'wizards/w1'), wizard()));
});
test('owner spoofing is rejected', async () => {
  await assertFails(setDoc(doc(db('alice'), 'wizards/w1'), wizard('bob')));
});
test('unverified email cannot create a wizard', async () => {
  await assertFails(setDoc(doc(db('alice', false), 'wizards/w1'), wizard()));
});
test('forged creation timestamps are rejected', async () => {
  await assertFails(setDoc(doc(db('alice'), 'wizards/w1'), { ...wizard(), createdAt: Timestamp.fromMillis(0) }));
});
test('overlength wizard IDs are rejected', async () => {
  await assertFails(setDoc(doc(db('alice'), `wizards/${'A'.repeat(300)}`), wizard()));
});
test('unknown privilege fields cannot be injected', async () => {
  await seed('wizards/w_alice', storedWizard());
  await assertFails(updateDoc(doc(db('alice'), 'wizards/w_alice'), { isAdmin: true, updatedAt: serverTimestamp() }));
});
test('realm identity cannot change', async () => {
  await seed('wizards/w_alice', storedWizard());
  await assertFails(updateDoc(doc(db('alice'), 'wizards/w_alice'), { realmId: 'everpeak', updatedAt: serverTimestamp() }));
});
test('another user cannot read private account metadata', async () => {
  await seed('accounts/alice', { uid: 'alice', email: 'alice@example.invalid' });
  await assertFails(getDoc(doc(db('bob'), 'accounts/alice')));
  await assertSucceeds(getDoc(doc(db('alice'), 'accounts/alice')));
});
test('unfiltered wizard scraping is rejected', async () => {
  await seed('wizards/w_alice', storedWizard());
  await assertFails(getDocs(collection(db('bob'), 'wizards')));
});
test('a creature cannot be attached to another users wizard', async () => {
  await seed('wizards/w_alice', storedWizard());
  await assertFails(setDoc(doc(db('bob'), 'wizards/w_alice/creatures/c1'), {
    ownerId: 'bob', wizardId: 'w_alice', realmId: 'breeze', speciesId: 'cinder_kitsune',
    nickname: 'Kit', elementId: 'ember', stage: 1, chromatic: 'none', bondXp: 0, wins: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
});
const listing = (status = 'open') => ({
  sellerId: 'alice', sellerWizardId: 'w_alice', sellerName: 'Alice', realmId: 'breeze',
  itemType: 'gear', itemId: 'staff_oak_wand', itemName: 'Oak Wand', priceFlorins: 100, status,
  createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000),
});
test('sold listings cannot reopen', async () => {
  await seed('bazaar/breeze/listings/l1', { ...listing('sold'), buyerId: 'bob' });
  await assertFails(updateDoc(doc(db('alice'), 'bazaar/breeze/listings/l1'), { status: 'open', updatedAt: serverTimestamp() }));
});
test('buyers cannot alter the price when buying', async () => {
  await seed('bazaar/breeze/listings/l1', listing());
  await assertFails(updateDoc(doc(db('bob'), 'bazaar/breeze/listings/l1'), {
    status: 'sold', buyerId: 'bob', priceFlorins: 1, updatedAt: serverTimestamp(),
  }));
});
test('buyers must use the server transaction to settle a legacy listing', async () => {
  await seed('bazaar/breeze/listings/l1', listing());
  await assertFails(updateDoc(doc(db('bob'), 'bazaar/breeze/listings/l1'), {
    status: 'sold', buyerId: 'bob', updatedAt: serverTimestamp(),
  }));
});
