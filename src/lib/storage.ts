import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
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
  } catch {
    // quota fallback
  }
}

export async function ensureCloudAccountAndRealm(uid: string, displayName: string, email: string | null, realmId: RealmId): Promise<RealmAccountState> {
  const accPath = `accounts/${uid}`;
  try {
    const accRef = doc(db, 'accounts', uid);
    const accSnap = await getDoc(accRef);
    if (!accSnap.exists()) {
      await setDoc(accRef, {
        uid,
        displayName: (displayName || 'Alder Wizard').slice(0, 40),
        ...(email ? { email: email.slice(0, 160) } : {}),
        settings: { harpVolume: 0.4, sfxVolume: 0.65, solo2xDefault: false },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, accPath);
  }

  const realmPath = `accounts/${uid}/realms/${realmId}`;
  try {
    const realmRef = doc(db, 'accounts', uid, 'realms', realmId);
    const snap = await getDoc(realmRef);
    if (!snap.exists()) {
      const fresh: RealmAccountState = {
        uid,
        realmId,
        wizardIds: [],
        unlockedRaces: [...STARTER_UNLOCKED_RACES],
        sharedVault: [],
        termXp: 0,
        claimedTermTiers: [],
      };
      await setDoc(realmRef, {
        ...fresh,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return fresh;
    }
    const d = snap.data();
    return {
      uid,
      realmId,
      wizardIds: Array.isArray(d.wizardIds) ? d.wizardIds : [],
      unlockedRaces: Array.isArray(d.unlockedRaces) ? d.unlockedRaces : [...STARTER_UNLOCKED_RACES],
      sharedVault: Array.isArray(d.sharedVault) ? d.sharedVault : [],
      termXp: Number(d.termXp ?? 0),
      claimedTermTiers: Array.isArray(d.claimedTermTiers) ? d.claimedTermTiers : [],
    };
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
        wizardIds: realmAccount.wizardIds.slice(0, 3),
        unlockedRaces: realmAccount.unlockedRaces.slice(0, 20),
        sharedVault: realmAccount.sharedVault.slice(0, 60),
        termXp: Math.max(0, Math.floor(realmAccount.termXp)),
        claimedTermTiers: realmAccount.claimedTermTiers.slice(0, 50),
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

export async function saveCloudWizard(wizard: WizardDocument, isNew = false) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const wizPath = `wizards/${wizard.id}`;
  try {
    const ref = doc(db, 'wizards', wizard.id);
    const payload = {
      ownerId: uid,
      realmId: wizard.realmId,
      name: wizard.name.slice(0, 24),
      raceId: wizard.raceId,
      ...(wizard.beastClan ? { beastClan: wizard.beastClan } : {}),
      elementId: wizard.elementId,
      level: wizard.level,
      xp: wizard.xp,
      rank: wizard.rank,
      sculpt: wizard.sculpt,
      wardrobe: wizard.wardrobe,
      stitching: wizard.stitching,
      currencies: wizard.currencies,
      resources: wizard.resources,
      progression: wizard.progression,
      activeCreatureId: wizard.activeCreatureId,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    };
    await setDoc(ref, payload, { merge: !isNew });

    await setDoc(
      doc(db, 'publicWizards', wizard.id),
      {
        ownerId: uid,
        realmId: wizard.realmId,
        name: wizard.name.slice(0, 24),
        raceId: wizard.raceId,
        elementId: wizard.elementId,
        level: wizard.level,
        rank: wizard.rank,
        titleBadge: wizard.progression.titleBadge.slice(0, 40),
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: !isNew },
    );
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, wizPath);
  }
}

export async function saveCloudCreature(creature: OwnedCreature, isNew = false) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const path = `wizards/${creature.wizardId}/creatures/${creature.id}`;
  try {
    await setDoc(
      doc(db, 'wizards', creature.wizardId, 'creatures', creature.id),
      {
        ownerId: uid,
        wizardId: creature.wizardId,
        realmId: creature.realmId,
        speciesId: creature.speciesId,
        nickname: creature.nickname.slice(0, 24),
        elementId: creature.elementId,
        stage: creature.stage,
        chromatic: creature.chromatic,
        branchChoice: creature.branchChoice,
        bondXp: creature.bondXp,
        wins: creature.wins,
        talents: creature.talents.slice(0, 12),
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: !isNew },
    );
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
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
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const path = `wizards/${sanctuary.wizardId}/sanctuary/layout`;
  try {
    await setDoc(
      doc(db, 'wizards', sanctuary.wizardId, 'sanctuary', 'layout'),
      {
        ownerId: uid,
        wizardId: sanctuary.wizardId,
        realmId: sanctuary.realmId,
        themeId: sanctuary.themeId,
        weatherId: sanctuary.weatherId,
        isPublic: sanctuary.isPublic,
        items: sanctuary.items.slice(0, 120),
        gardens: sanctuary.gardens.slice(0, 12),
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: !isNew },
    );
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
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
