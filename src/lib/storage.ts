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
import { readLegacyGuestSave } from '../../shared/legacyGuestSave.ts';

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

export function emptyGuestRealm(realmId: RealmId): GuestRealmBundle {
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

export type GuestRecovery = { kind: 'recovery-required'; raw: string } | { kind: 'storage-unavailable' };
export type GuestRealmInspection =
  | { kind: 'missing' | 'readable'; raw: string | null; bundle: GuestRealmBundle }
  | GuestRecovery;

export function inspectGuestRealm(realmId: RealmId): GuestRealmInspection {
  let raw: string | null;
  try {
    raw = localStorage.getItem(guestStorageKey(realmId));
  } catch {
    return { kind: 'storage-unavailable' };
  }
  const inspection = readLegacyGuestSave(raw, realmId);
  if (inspection.kind === 'missing') return { kind: 'missing', raw: null, bundle: emptyGuestRealm(realmId) };
  // Retired in the proposed registry is not invalid in the currently shipped prototype.
  // This deliberately retains the existing legacy play path until migration is approved.
  if (inspection.kind === 'recovery-required' && inspection.diagnostics.some(d => d.code !== 'retired-element')) {
    return { kind: 'recovery-required', raw: inspection.raw };
  }
  const bundle = (inspection.kind === 'recognized' ? inspection.envelope : JSON.parse(inspection.raw)) as GuestRealmBundle;
  // Guard essential account fields used at the title screen. This is not full nested validation.
  if (!Array.isArray(bundle.account.unlockedRaces) || !Array.isArray(bundle.account.sharedVault)
    || !Array.isArray(bundle.account.claimedTermTiers) || !Number.isFinite(bundle.account.termXp)) {
    return { kind: 'recovery-required', raw: inspection.raw };
  }
  return { kind: 'readable', raw: inspection.raw, bundle };
}

export function loadGuestRealm(realmId: RealmId): GuestRealmBundle {
  const inspection = inspectGuestRealm(realmId);
  if (!('bundle' in inspection)) throw new Error('Guest save needs recovery; original data has not been replaced.');
  return inspection.bundle;
}

// An optional source comparison detects already-observed changes. localStorage is NOT
// an atomic cross-tab compare-and-swap; this is not a migration or concurrency solution.
export function saveGuestRealm(realmId: RealmId, bundle: GuestRealmBundle, expectedRaw?: string | null) {
  try {
    const current = inspectGuestRealm(realmId);
    if (!('bundle' in current) || (expectedRaw !== undefined && current.raw !== expectedRaw)) return false;
    localStorage.setItem(guestStorageKey(realmId), JSON.stringify(bundle));
    return true;
  } catch {
    return false;
  }
}

export function guestRecoveryExport(realmId: RealmId, raw: string): string {
  // JSON escaping preserves the complete original storage string, even empty or malformed text.
  return JSON.stringify({ format: 'aldervale-guest-recovery-v1', realmId, raw });
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
