import { DEFAULT_PLAYER_SETTINGS, normalizePlayerSettings, type PlayerSettings } from '../../shared/settings.ts';
import {
  collection,
  doc,
  deleteField,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import type { RealmId } from '../../shared/realms.ts';
import type { RaceId } from '../../shared/wardrobe.ts';
import type { WizardDocument } from '../../shared/economy.ts';
import type { ChromaticVariant } from '../../shared/creatures.ts';
import type { ElementId } from '../../shared/elements.ts';

export interface OwnedCreature {
  id: string;
  ownerId: string;
  wizardId: string;
  realmId: RealmId;
  speciesId: string;
  nickname: string;
  elementId: ElementId;
  stage: 1 | 2 | 3;
  chromatic: ChromaticVariant;
  branchChoice: 'A' | 'B';
  bondXp: number;
  wins: number;
  talents: string[];
}

export interface PlacedDormItem {
  uid: string;
  catalogId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  colorHex: string;
  triggerKind?: string;
}

export interface DormGardenPlot {
  plotId: string;
  seedElement: ElementId | null;
  plantedAt: number;
  readyAt: number;
}

export interface SanctuaryState {
  ownerId: string;
  wizardId: string;
  realmId: RealmId;
  themeId: string;
  weatherId: string;
  isPublic: boolean;
  items: PlacedDormItem[];
  gardens: DormGardenPlot[];
}

export interface RealmAccountState {
  uid: string;
  realmId: RealmId;
  wizardIds: string[];
  unlockedRaces: RaceId[];
  sharedVault: string[];
  termXp: number;
  claimedTermTiers: number[];
}

const STARTER_UNLOCKED_RACES: RaceId[] = [
  'human',
  'stoneborn',
  'dryad',
  'beastfolk',
  'tide_siren',
  'river_naiad',
  'sky_avian',
];

function guestStorageKey(realmId: RealmId): string {
  return `aldervale_guest_${realmId}_v1`;
}

export interface GuestRealmBundle {
  account: RealmAccountState;
  wizards: WizardDocument[];
  creatures: Record<string, OwnedCreature[]>;
  sanctuaries: Record<string, SanctuaryState>;
  gallery?: Record<string, string[]>;
}

export function loadGuestRealm(realmId: RealmId): GuestRealmBundle {
  try {
    const raw = localStorage.getItem(guestStorageKey(realmId));
    if (raw) return JSON.parse(raw) as GuestRealmBundle;
  } catch {
    // ignore corrupted local storage
  }
  return {
    account: {
      uid: 'guest_local',
      realmId,
      wizardIds: [],
      unlockedRaces: [...STARTER_UNLOCKED_RACES],
      sharedVault: ['hat_pointed_brim'],
      termXp: 0,
      claimedTermTiers: [],
    },
    wizards: [],
    creatures: {},
    sanctuaries: {},
  };
}

export function saveGuestRealm(realmId: RealmId, bundle: GuestRealmBundle) {
  try {
    localStorage.setItem(guestStorageKey(realmId), JSON.stringify(bundle));
    return true;
  } catch {
    return false;
  }
}

const guestSettingsKey = 'aldervale_player_settings_v1';

export function loadGuestSettings(): PlayerSettings {
  try {
    return normalizePlayerSettings(JSON.parse(localStorage.getItem(guestSettingsKey) ?? 'null'));
  } catch {
    return { ...DEFAULT_PLAYER_SETTINGS };
  }
}

export function saveGuestSettings(settings: PlayerSettings): boolean {
  try {
    localStorage.setItem(guestSettingsKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function saveCloudSettings(uid: string, patch: Partial<PlayerSettings>, database = db) {
  return updateDoc(doc(database, 'accounts', uid), {
    ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [`settings.${key}`, value])),
    updatedAt: serverTimestamp(),
  });
}

export async function ensureCloudAccountAndRealm(uid: string, displayName: string, email: string | null, realmId: RealmId): Promise<{ realm: RealmAccountState; settings: PlayerSettings }> {
  const realmPath = `accounts/${uid}/realms/${realmId}`;
  try {
    const accRef = doc(db, 'accounts', uid);
    const realmRef = doc(db, 'accounts', uid, 'realms', realmId);
    return await runTransaction(db, async (tx) => {
      const [account, snap] = await Promise.all([tx.get(accRef), tx.get(realmRef)]);
      if (!account.exists()) {
        tx.set(accRef, {
          uid, displayName: (displayName || 'Alder Wizard').slice(0, 40),
          ...(email ? { email: email.slice(0, 160) } : {}),
          settings: DEFAULT_PLAYER_SETTINGS,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
      const settings = normalizePlayerSettings(account.data()?.settings);
      if (!snap.exists()) {
        const fresh: RealmAccountState = {
          uid, realmId, wizardIds: [], unlockedRaces: [...STARTER_UNLOCKED_RACES],
          sharedVault: [], termXp: 0, claimedTermTiers: [],
        };
        tx.set(realmRef, { ...fresh, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        return { realm: fresh, settings };
      }
      const d = snap.data();
      const realm: RealmAccountState = {
        uid,
        realmId,
        wizardIds: Array.isArray(d.wizardIds) ? d.wizardIds : [],
        unlockedRaces: Array.isArray(d.unlockedRaces) ? d.unlockedRaces : [...STARTER_UNLOCKED_RACES],
        sharedVault: Array.isArray(d.sharedVault) ? d.sharedVault : [],
        termXp: Number(d.termXp ?? 0),
        claimedTermTiers: Array.isArray(d.claimedTermTiers) ? d.claimedTermTiers : [],
      };
      return { realm, settings };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, realmPath);
  }
}

export async function saveCloudRealmAccount(uid: string, realmAccount: RealmAccountState) {
  const realmPath = `accounts/${uid}/realms/${realmAccount.realmId}`;
  try {
    const realmRef = doc(db, 'accounts', uid, 'realms', realmAccount.realmId);
    await setDoc(
      realmRef,
      {
        uid,
        realmId: realmAccount.realmId,
        unlockedRaces: realmAccount.unlockedRaces.slice(0, 20),
        sharedVault: realmAccount.sharedVault.slice(0, 60),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, realmPath);
  }
}

export async function loadCloudWizardsForRealm(uid: string, realmId: RealmId): Promise<WizardDocument[]> {
  const path = 'wizards';
  try {
    const q = query(collection(db, 'wizards'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const out: WizardDocument[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      if (data.realmId === realmId) {
        out.push({
          ...(data as unknown as WizardDocument),
          id: docSnap.id,
        });
      }
    });
    return out;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

function wizardPayload(wizard: WizardDocument) {
  const { ownerId, realmId, name, raceId, beastClan, elementId, level, xp, rank, sculpt,
    wardrobe, stitching, currencies, resources, progression, activeCreatureId } = wizard;
  return { ownerId, realmId, name: name.slice(0, 24), raceId, ...(beastClan ? { beastClan } : {}),
    elementId, level, xp, rank, sculpt, wardrobe, stitching, currencies, resources, progression,
    activeCreatureId, updatedAt: serverTimestamp() };
}

function publicWizardPayload(wizard: WizardDocument) {
  const { ownerId, realmId, raceId, elementId, level, rank } = wizard;
  return { ownerId, realmId, name: wizard.name.slice(0, 24), raceId, elementId, level, rank, titleBadge: wizard.progression.titleBadge.slice(0, 40), updatedAt: serverTimestamp() };
}

function creaturePayload(creature: OwnedCreature) {
  const { ownerId, wizardId, realmId, speciesId, nickname, elementId, stage, chromatic, branchChoice, bondXp, wins, talents } = creature;
  return { ownerId, wizardId, realmId, speciesId, nickname: nickname.slice(0, 24), elementId, stage, chromatic,
    branchChoice: branchChoice ?? 'A', bondXp, wins, talents: (talents ?? []).slice(0, 12), updatedAt: serverTimestamp() };
}

function sanctuaryPayload(sanctuary: SanctuaryState) {
  const { ownerId, wizardId, realmId, themeId, weatherId, items, gardens } = sanctuary;
  return { ownerId, wizardId, realmId, themeId, weatherId,
    items: items.slice(0, 120).map(({ triggerKind, ...item }) => ({ ...item, ...(triggerKind ? { triggerKind } : {}) })),
    gardens: gardens.slice(0, 12), updatedAt: serverTimestamp() };
}

function requireCloudOwner(uid: string) {
  if (auth.currentUser?.uid !== uid) throw new Error('Your sign-in changed. Sign in again and retry.');
}

function realmPayload(realmAccount: RealmAccountState) {
  return {
    ...realmAccount,
    unlockedRaces: realmAccount.unlockedRaces.slice(0, 20),
    sharedVault: realmAccount.sharedVault.slice(0, 60),
    termXp: Math.max(0, Math.floor(realmAccount.termXp)),
    claimedTermTiers: realmAccount.claimedTermTiers.slice(0, 50),
    updatedAt: serverTimestamp(),
  };
}

interface CloudWizardEntry {
  wizard: WizardDocument;
  pets: OwnedCreature[];
  sanctuary: SanctuaryState | null;
  gallery?: string[];
}

export async function createCloudWizards(account: RealmAccountState, entries: CloudWizardEntry[], database = db) {
  await writeCloudWizards(account, entries, database, false);
}

export async function migrateGuestWizards(account: RealmAccountState, guest: GuestRealmBundle, database = db) {
  const entries = guest.wizards.slice(0, 3).map((wizard) => {
    const { id } = wizard;
    const sanctuary = guest.sanctuaries[id];
    return {
      wizard: { ...wizard, ownerId: account.uid },
      pets: (guest.creatures[id] ?? []).map((pet) => ({ ...pet, ownerId: account.uid })),
      sanctuary: sanctuary ? { ...sanctuary, ownerId: account.uid } : null,
      gallery: guest.gallery?.[id],
    };
  });
  const mergedAccount = {
    ...account,
    unlockedRaces: [...new Set([...account.unlockedRaces, ...guest.account.unlockedRaces])],
    termXp: Math.max(account.termXp, guest.account.termXp),
    claimedTermTiers: [...new Set([...account.claimedTermTiers, ...(guest.account.claimedTermTiers ?? [])])],
    sharedVault: [...new Set([...account.sharedVault, ...guest.account.sharedVault])],
  };
  try {
    return await writeCloudWizards(mergedAccount, entries, database, true);
  } catch (error) {
    // A competing import can claim the IDs after our read. Firestore may reject
    // the writes by rule before it retries the transaction.
    if ((error as { code?: string } | null)?.code !== 'permission-denied' || !entries.length) throw error;
    if (database === db) requireCloudOwner(account.uid);
    const profiles = await Promise.all(entries.map(({ wizard }) =>
      getDocFromServer(doc(database, 'publicWizards', wizard.id))));
    if (profiles.some((profile) => profile.exists())) return 'already-linked';
    throw error;
  }
}

async function writeCloudWizards(account: RealmAccountState, entries: CloudWizardEntry[], database: typeof db, migrating: boolean) {
  if (database === db) requireCloudOwner(account.uid);
  const realmRef = doc(database, 'accounts', account.uid, 'realms', account.realmId);
  return runTransaction(database, async (tx) => {
    const existing = await tx.get(realmRef);
    const previousIds: string[] = existing.get('wizardIds') ?? [];
    if (migrating) {
      if (previousIds.length || !entries.length) return 'skipped';
      // The signed-in client can read public profiles, including those owned by another account.
      // Check inside the transaction so two accounts cannot import the same guest bundle at once.
      const profiles = await Promise.all(entries.map(({ wizard }) => tx.get(doc(database, 'publicWizards', wizard.id))));
      if (profiles.some((profile) => profile.exists())) return 'already-linked';
    }
    if (database === db) requireCloudOwner(account.uid);
    if (entries.some(({ wizard }) => previousIds.includes(wizard.id))) {
      throw new Error('This wizard is already saved. Reopen the realm to refresh your wizard list.');
    }
    const wizardIds = [...new Set([...previousIds, ...entries.map(({ wizard }) => wizard.id)])];
    const existingRaces: RaceId[] = existing.get('unlockedRaces') ?? [];
    const existingVault: string[] = existing.get('sharedVault') ?? [];
    const existingClaims: number[] = existing.get('claimedTermTiers') ?? [];
    if (wizardIds.length > 3) throw new Error('All three wizard slots are in use.');
    for (const { wizard, pets, sanctuary, gallery } of entries) {
      const wizardRef = doc(database, 'wizards', wizard.id);
      tx.set(wizardRef, { ...wizardPayload(wizard), createdAt: serverTimestamp() });
      tx.set(doc(database, 'publicWizards', wizard.id), { ...publicWizardPayload(wizard), createdAt: serverTimestamp() });
      for (const pet of pets) {
        tx.set(doc(wizardRef, 'creatures', pet.id), { ...creaturePayload(pet), createdAt: serverTimestamp() });
      }
      if (sanctuary) {
        tx.set(doc(wizardRef, 'sanctuary', 'layout'), { ...sanctuaryPayload(sanctuary), isPublic: false, createdAt: serverTimestamp() });
      }
      if (gallery?.length) tx.set(doc(wizardRef, 'private', 'gallery'), { images: gallery.slice(0, 9) });
    }
    tx.set(realmRef, realmPayload({
      ...account,
      wizardIds,
      termXp: Math.max(account.termXp, Number(existing.get('termXp') ?? 0)),
      unlockedRaces: [...new Set([...existingRaces, ...account.unlockedRaces])],
      sharedVault: [...new Set([...existingVault, ...account.sharedVault])],
      claimedTermTiers: [...new Set([...existingClaims, ...account.claimedTermTiers])],
    }), { merge: true });
    return 'saved';
  });
}

export async function ensureCloudWizardStarter(wizard: WizardDocument, starter: OwnedCreature | null, dorm: SanctuaryState | null) {
  requireCloudOwner(wizard.ownerId);
  if (!starter && !dorm) return;
  const ref = doc(db, 'wizards', wizard.id);
  await runTransaction(db, async (tx) => {
    const creatureRef = starter ? doc(ref, 'creatures', starter.id) : null;
    const dormRef = dorm ? doc(ref, 'sanctuary', 'layout') : null;
    const [creature, layout] = await Promise.all([
      creatureRef ? tx.get(creatureRef) : null,
      dormRef ? tx.get(dormRef) : null,
    ]);
    if (creatureRef && !creature?.exists() && starter) {
      tx.set(creatureRef, { ...creaturePayload(starter), createdAt: serverTimestamp() });
    }
    if (dormRef && !layout?.exists() && dorm) {
      tx.set(dormRef, { ...sanctuaryPayload(dorm), isPublic: false, createdAt: serverTimestamp() });
    }
  });
}

export async function saveCloudWizard(wizard: WizardDocument, pets: OwnedCreature[] = [], realmAccount?: RealmAccountState, updatedPets: OwnedCreature[] = []) {
  requireCloudOwner(wizard.ownerId);
  const wizardRef = doc(db, 'wizards', wizard.id);
  const profileRef = doc(db, 'publicWizards', wizard.id);
  await runTransaction(db, async (batch) => {
    const profile = await batch.get(profileRef);
    batch.update(wizardRef, { ...wizardPayload(wizard), ...(wizard.beastClan ? {} : { beastClan: deleteField() }) });
    batch.set(profileRef, { ...publicWizardPayload(wizard), ...(profile.exists() ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
    for (const pet of pets) {
      const payload = creaturePayload(pet);
      batch.set(doc(wizardRef, 'creatures', pet.id), { ...payload, createdAt: serverTimestamp() });
    }
    for (const pet of updatedPets) batch.update(doc(wizardRef, 'creatures', pet.id), creaturePayload(pet));
    if (realmAccount) {
      const accountRef = doc(db, 'accounts', realmAccount.uid, 'realms', realmAccount.realmId);
      const { wizardIds: _ids, claimedTermTiers: _claimed, termXp: _termXp, ...fields } = realmPayload(realmAccount);
      batch.update(accountRef, fields);
    }
  });
}

export async function saveCloudCreatures(creatures: OwnedCreature[], createdIds: ReadonlySet<string> = new Set()) {
  if (!creatures.length) return;
  requireCloudOwner(creatures[0].ownerId);
  const batch = writeBatch(db);
  for (const creature of creatures) {
    const ref = doc(db, 'wizards', creature.wizardId, 'creatures', creature.id);
    const payload = creaturePayload(creature);
    if (createdIds.has(creature.id)) batch.set(ref, { ...payload, createdAt: serverTimestamp() });
    else batch.update(ref, payload);
  }
  await batch.commit();
}

export async function loadCloudCreatures(wizardId: string): Promise<OwnedCreature[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const path = `wizards/${wizardId}/creatures`;
  try {
    const q = query(collection(db, 'wizards', wizardId, 'creatures'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const out: OwnedCreature[] = [];
    snap.forEach((d) => out.push({ ...(d.data() as OwnedCreature), id: d.id }));
    return out;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveCloudSanctuary(sanctuary: SanctuaryState, isNew = false) {
  requireCloudOwner(sanctuary.ownerId);
  await setDoc(
    doc(db, 'wizards', sanctuary.wizardId, 'sanctuary', 'layout'),
    { ...sanctuaryPayload(sanctuary), ...(isNew ? { isPublic: false, createdAt: serverTimestamp() } : {}) },
    { merge: !isNew },
  );
}

export async function loadCloudGallery(wizard: WizardDocument) {
  requireCloudOwner(wizard.ownerId);
  const snapshot = await getDoc(doc(db, 'wizards', wizard.id, 'private', 'gallery'));
  const images = snapshot.get('images') as string[] | undefined;
  return images ?? [];
}

export async function saveCloudPainting(wizard: WizardDocument, image: string) {
  requireCloudOwner(wizard.ownerId);
  const ref = doc(db, 'wizards', wizard.id, 'private', 'gallery');
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    const images = [image, ...((snapshot.get('images') as string[] | undefined) ?? [])].slice(0, 9);
    tx.set(ref, { images });
    return images;
  });
}

export async function loadCloudSanctuary(wizardId: string, realmId: RealmId): Promise<SanctuaryState | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const path = `wizards/${wizardId}/sanctuary/layout`;
  try {
    const snap = await getDoc(doc(db, 'wizards', wizardId, 'sanctuary', 'layout'));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      ownerId: uid,
      wizardId,
      realmId,
      themeId: String(d.themeId ?? 'sunlit_loft'),
      weatherId: String(d.weatherId ?? 'clear_breeze'),
      isPublic: Boolean(d.isPublic),
      items: Array.isArray(d.items) ? d.items : [],
      gardens: Array.isArray(d.gardens) ? d.gardens : [],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}
