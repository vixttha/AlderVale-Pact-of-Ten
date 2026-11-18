import { DEFAULT_PLAYER_SETTINGS, normalizePlayerSettings, type PlayerSettings } from '../../shared/settings.ts';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  runTransaction,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import type { RealmId } from '../../shared/realms.ts';
import type { RaceId } from '../../shared/wardrobe.ts';
import type { WizardDocument } from '../../shared/economy.ts';
import type { ChromaticVariant } from '../../shared/creatures.ts';
import { PROGRESSION_VERSION } from '../../shared/gameplayActions.ts';
import type { ElementId } from '../../shared/elements.ts';

export interface OwnedCreature {
  serverProgressionVersion?: number;
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

export async function ensureCloudAccount(uid: string, displayName: string, email: string | null) {
  const ref = doc(db, 'accounts', uid);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) {
      tx.set(ref, {
        uid, displayName: (displayName || 'Alder Wizard').slice(0, 40),
        ...(email ? { email: email.slice(0, 160) } : {}),
        settings: DEFAULT_PLAYER_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
    return normalizePlayerSettings(snapshot.get('settings'));
  });
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

function requireCloudOwner(uid: string) {
  if (auth.currentUser?.uid !== uid) throw new Error('Your sign-in changed. Sign in again and retry.');
}

export async function loadCloudCreatures(wizardId: string, includeLegacy = false): Promise<OwnedCreature[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const path = `wizards/${wizardId}/creatures`;
  try {
    const q = query(collection(db, 'wizards', wizardId, 'creatures'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const out: OwnedCreature[] = [];
    snap.forEach((d) => {
      const data = d.data() as OwnedCreature;
      if (includeLegacy || data.serverProgressionVersion === PROGRESSION_VERSION) out.push({ ...data, id: d.id });
    });
    return out;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
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
