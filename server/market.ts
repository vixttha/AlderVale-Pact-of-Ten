import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { cloudDb } from './cloud.ts';
import type { RealmId } from '../shared/realms.ts';
import type { WizardDocument } from '../shared/economy.ts';
import type { AcademyHouse } from '../shared/houses.ts';
import { ELEMENTS, type ElementId } from '../shared/elements.ts';
import { GEAR_BY_ID } from '../shared/wardrobe.ts';
import { isBazaarPrice, STARTING_MARKET_FLORINS, type BazaarListing, type MarketAccount } from '../shared/market.ts';
import { dormTourRatingFromTotals } from '../shared/dormTours.ts';

export class RequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function realmRef(realm: RealmId) {
  return cloudDb.collection('worldRealms').doc(realm);
}

function marketRef(realm: RealmId, uid: string) {
  return realmRef(realm).collection('wallets').doc(uid);
}

const initialWallet = (): MarketAccount => ({ florins: STARTING_MARKET_FLORINS, revision: 0, honorMarks: 0, bondingSeals: 0, gear: {} });

async function readWallet(tx: Transaction, realm: RealmId, uid: string): Promise<MarketAccount> {
  const snap = await tx.get(marketRef(realm, uid));
  return (snap.data() as MarketAccount | undefined) ?? initialWallet();
}

export async function ownedWizard(uid: string, wizardId: unknown, realm: RealmId, tx?: Transaction): Promise<WizardDocument> {
  if (!isDocumentId(wizardId)) throw new RequestError(400, 'Invalid wizard');
  const ref = cloudDb.collection('wizards').doc(wizardId);
  const snapshot = tx ? await tx.get(ref) : await ref.get();
  const data = snapshot.data() as WizardDocument | undefined;
  if (!data || data.ownerId !== uid || data.realmId !== realm) throw new RequestError(404, 'Wizard unavailable');
  return { ...data, id: snapshot.id };
}

function writeWallet(tx: Transaction, realm: RealmId, uid: string, wallet: MarketAccount) {
  wallet.revision = (wallet.revision ?? 0) + 1;
  tx.set(marketRef(realm, uid), wallet);
}

const starterHat = { id: 'academy-hat', sellerName: 'Stitchmaster Selene', itemId: 'hat_pointed_brim', itemName: 'Starstitch Brim Hat', priceFlorins: 82 };
interface StoredListing extends BazaarListing { sellerUid: string; status: 'open' | 'sold' | 'cancelled'; buyerUid?: string }

function publicListing({ id, sellerName, itemId, itemName, priceFlorins }: BazaarListing): BazaarListing {
  return { id, sellerName, itemId, itemName, priceFlorins };
}

export async function listBazaar(realm: RealmId, uid?: string) {
  const records = realmRef(realm).collection('listings');
  const [list, wallet, starterPurchase] = await Promise.all([
    records.where('status', '==', 'open').limit(100).get(),
    uid ? marketRef(realm, uid).get() : undefined,
    uid ? realmRef(realm).collection('academyPurchases').doc(uid).get() : undefined,
  ]);
  return {
    listings: [...(starterPurchase?.exists ? [] : [starterHat]), ...list.docs.map((snap) => {
      const listing = snap.data() as StoredListing;
      return { ...publicListing(listing), canCancel: Boolean(uid && uid === listing.sellerUid) };
    })],
    wallet: uid ? (wallet?.data() as MarketAccount | undefined) ?? initialWallet() : null,
  };
}

export async function postListing(realm: RealmId, uid: string, body: Record<string, unknown>) {
  const { itemId, priceFlorins } = body;
  const item = typeof itemId === 'string' && Object.hasOwn(GEAR_BY_ID, itemId) ? GEAR_BY_ID[itemId] : null;
  if (!item || !isBazaarPrice(priceFlorins)) {
    throw new RequestError(400, 'Select owned Bazaar gear and a valid price');
  }
  const ref = realmRef(realm).collection('listings').doc();
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, wallet] = await Promise.all([ownedWizard(uid, body.wizardId, realm, tx), readWallet(tx, realm, uid)]);
    if (!(wallet.gear[item.id] > 0)) throw new RequestError(409, 'That gear is unavailable in your Bazaar inventory');
    wallet.gear[item.id] -= 1;
    const listing: StoredListing = { id: ref.id, sellerUid: uid, sellerName: wizard.name, itemId: item.id, itemName: item.name, priceFlorins, status: 'open' };
    writeWallet(tx, realm, uid, wallet);
    tx.create(ref, listing);
    return { listing: { ...publicListing(listing), canCancel: true }, wallet };
  });
}

export async function buyListing(realm: RealmId, uid: string, wizardId: unknown, listingId: string) {
  if (!isDocumentId(listingId)) throw new RequestError(400, 'Invalid listing');
  const isStarter = listingId === starterHat.id;
  const ref = isStarter
    ? realmRef(realm).collection('academyPurchases').doc(uid)
    : realmRef(realm).collection('listings').doc(listingId);
  return cloudDb.runTransaction(async (tx) => {
    const [, snap, buyer] = await Promise.all([ownedWizard(uid, wizardId, realm, tx), tx.get(ref), readWallet(tx, realm, uid)]);
    const listing = isStarter ? { ...starterHat, sellerUid: null, status: 'open' } : snap.data() as StoredListing | undefined;
    if (isStarter && snap.exists || !listing || listing.status !== 'open') throw new RequestError(404, 'Listing unavailable');
    if (listing.sellerUid === uid) throw new RequestError(409, 'You cannot buy your own listing');
    if (buyer.florins < listing.priceFlorins) throw new RequestError(409, 'Insufficient Bazaar Florins');
    const seller = listing.sellerUid ? await readWallet(tx, realm, listing.sellerUid) : null;
    buyer.florins -= listing.priceFlorins;
    buyer.gear[listing.itemId] = (buyer.gear[listing.itemId] ?? 0) + 1;
    writeWallet(tx, realm, uid, buyer);
    if (seller && listing.sellerUid) {
      seller.florins += listing.priceFlorins;
      writeWallet(tx, realm, listing.sellerUid, seller);
    }
    if (isStarter) tx.create(ref, { purchasedAt: FieldValue.serverTimestamp() });
    else tx.update(ref, { status: 'sold', buyerUid: uid });
    return { wallet: buyer };
  });
}

export async function cancelListing(realm: RealmId, uid: string, listingId: string) {
  if (!isDocumentId(listingId)) throw new RequestError(400, 'Invalid listing');
  const ref = realmRef(realm).collection('listings').doc(listingId);
  return cloudDb.runTransaction(async (tx) => {
    const [snapshot, wallet] = await Promise.all([tx.get(ref), readWallet(tx, realm, uid)]);
    const listing = snapshot.data() as StoredListing | undefined;
    if (!listing || listing.sellerUid !== uid || listing.status === 'sold') throw new RequestError(404, 'Listing unavailable');
    if (listing.status === 'open') {
      wallet.gear[listing.itemId] = (wallet.gear[listing.itemId] ?? 0) + 1;
      writeWallet(tx, realm, uid, wallet);
      tx.update(ref, { status: 'cancelled' });
    }
    return { wallet };
  });
}

export async function settleTrade(realm: RealmId, a: string, b: string, aOffer: number, bOffer: number, tradeId: string) {
  if (a === b) throw new RequestError(409, 'Choose another account to trade with');
  return cloudDb.runTransaction(async (tx) => {
    const receipt = realmRef(realm).collection('tradeReceipts').doc(tradeId);
    const [first, second, settled] = await Promise.all([readWallet(tx, realm, a), readWallet(tx, realm, b), tx.get(receipt)]);
    if (settled.exists) return [first, second];
    if (first.florins < aOffer || second.florins < bOffer) throw new RequestError(409, 'A trader has insufficient Bazaar Florins');
    first.florins += bOffer - aOffer;
    second.florins += aOffer - bOffer;
    writeWallet(tx, realm, a, first);
    writeWallet(tx, realm, b, second);
    tx.create(receipt, { at: FieldValue.serverTimestamp() });
    return [first, second];
  });
}

export async function awardLiveVictory(realm: RealmId, uid: string, duelId: string, mode: 'pvp' | 'coop') {
  return cloudDb.runTransaction(async (tx) => {
    const marker = marketRef(realm, uid).collection('duels').doc(duelId);
    const [seen, wallet] = await Promise.all([tx.get(marker), readWallet(tx, realm, uid)]);
    if (!seen.exists) {
      wallet.florins += mode === 'coop' ? 120 : 65;
      wallet.honorMarks += mode === 'coop' ? 8 : 15;
      if (mode === 'coop') wallet.bondingSeals += 1;
      tx.create(marker, { mode, at: FieldValue.serverTimestamp() });
      writeWallet(tx, realm, uid, wallet);
    }
    return wallet;
  });
}

interface StoredHouse {
  name: string;
  crestElement: ElementId;
  motto: string;
  members: string[];
}

function publicHouse(id: string, { name, crestElement, motto, members }: StoredHouse): AcademyHouse {
  return { id, name, crestElement, motto, memberCount: members.length };
}

function houseCollections(realm: RealmId) {
  const ref = realmRef(realm);
  return { houses: ref.collection('clubs'), memberships: ref.collection('houseMemberships') };
}

export async function listHouses(realm: RealmId, uid?: string) {
  const { houses } = houseCollections(realm);
  const [listed, membership] = await Promise.all([
    houses.limit(100).get(),
    uid ? houses.where('members', 'array-contains', uid).limit(1).get() : undefined,
  ]);
  const current = membership?.docs[0];
  const listedHouses = listed.docs.map((doc) => publicHouse(doc.id, doc.data() as StoredHouse));
  if (current && !listedHouses.some((house) => house.id === current.id)) {
    listedHouses.push(publicHouse(current.id, current.data() as StoredHouse));
  }
  const academy: AcademyHouse = {
    id: `house_alder_${realm}`, name: 'Order of the Star-Oak', crestElement: 'sol',
    motto: 'Ten Elements, One Canopy.', memberCount: 1, academy: true,
  };
  return { houses: [academy, ...listedHouses], currentHouseId: current?.id ?? null };
}

export async function createHouse(realm: RealmId, uid: string, body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 32) : '';
  const crestElement = body.crestElement ?? 'sol';
  if (name.length < 2 || typeof crestElement !== 'string' || !Object.hasOwn(ELEMENTS, crestElement)) {
    throw new RequestError(400, 'Provide a house name and a valid crest');
  }
  const { houses, memberships } = houseCollections(realm);
  const ref = houses.doc();
  const membership = memberships.doc(uid);
  const house: StoredHouse = {
    name, crestElement: crestElement as ElementId,
    motto: typeof body.motto === 'string' ? body.motto.slice(0, 120) : 'United by Canopy & Pact',
    members: [uid],
  };
  return cloudDb.runTransaction(async (tx) => {
    await tx.get(membership);
    const existing = await tx.get(houses.where('members', 'array-contains', uid).limit(1));
    if (!existing.empty) throw new RequestError(409, 'Leave your current House first.');
    tx.create(ref, house);
    tx.set(membership, { houseId: ref.id });
    return publicHouse(ref.id, house);
  });
}

export async function changeHouseMembership(realm: RealmId, uid: string, id: string, action: 'join' | 'leave') {
  if (!isDocumentId(id)) throw new RequestError(400, 'Invalid House');
  const { houses, memberships } = houseCollections(realm);
  const ref = houses.doc(id);
  const membership = memberships.doc(uid);
  return cloudDb.runTransaction(async (tx) => {
    const [snap] = await Promise.all([tx.get(ref), tx.get(membership)]);
    const house = snap.data() as StoredHouse | undefined;
    if (action === 'leave') {
      if (!house?.members.includes(uid)) return;
      const members = house.members.filter((member) => member !== uid);
      if (members.length) tx.update(ref, { members });
      else tx.delete(ref);
      tx.delete(membership);
      return;
    }
    if (!house) throw new RequestError(404, 'House unavailable');
    if (house.members.includes(uid)) return;
    const existing = await tx.get(houses.where('members', 'array-contains', uid).limit(1));
    if (!existing.empty) throw new RequestError(409, 'Leave your current House first.');
    if (house.members.length >= 100) throw new RequestError(409, 'This House is full.');
    tx.update(ref, { members: [...house.members, uid] });
    tx.set(membership, { houseId: id });
  });
}

export async function listTours(realm: RealmId) {
  const snapshot = await realmRef(realm).collection('dormTours').limit(100).get();
  return snapshot.docs.map((snap) => {
    const { wizardName, themeId, ratingSum, ratingCount } = snap.data();
    const rating = dormTourRatingFromTotals(ratingSum, ratingCount);
    return { wizardId: snap.id, wizardName, themeId, ...rating };
  });
}

export async function publishTour(realm: RealmId, uid: string, wizardId: unknown) {
  if (!isDocumentId(wizardId)) throw new RequestError(400, 'Invalid wizard');
  const layout = cloudDb.collection('wizards').doc(wizardId).collection('sanctuary').doc('layout');
  const listing = realmRef(realm).collection('dormTours').doc(wizardId);
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, snapshot, old] = await Promise.all([ownedWizard(uid, wizardId, realm, tx), tx.get(layout), tx.get(listing)]);
    const dorm = snapshot.data();
    if (!dorm || dorm.ownerId !== uid || dorm.realmId !== realm) throw new RequestError(404, 'Dorm layout unavailable');
    tx.update(layout, { isPublic: true, updatedAt: FieldValue.serverTimestamp() });
    tx.set(listing, { wizardName: wizard.name + '’s Loft', themeId: dorm.themeId, ratingSum: old.get('ratingSum') ?? 0, ratingCount: old.get('ratingCount') ?? 0 });
    return { isPublic: true };
  });
}

export async function unpublishTour(realm: RealmId, uid: string, wizardId: unknown) {
  if (!isDocumentId(wizardId)) throw new RequestError(400, 'Invalid wizard');
  const layout = cloudDb.collection('wizards').doc(wizardId).collection('sanctuary').doc('layout');
  const listing = realmRef(realm).collection('dormTours').doc(wizardId);
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, snapshot] = await Promise.all([ownedWizard(uid, wizardId, realm, tx), tx.get(layout)]);
    const dorm = snapshot.data();
    if (!dorm || dorm.ownerId !== uid || dorm.realmId !== realm) throw new RequestError(404, 'Dorm layout unavailable');
    tx.update(layout, { isPublic: false, updatedAt: FieldValue.serverTimestamp() });
    tx.delete(listing);
    return { isPublic: false, wizardName: wizard.name };
  });
}
