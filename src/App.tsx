import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Compass,
  Swords,
  Scissors,
  Heart,
  BookOpen,
  Home,
  ShoppingBag,
  MessageSquare,
  Sliders,
  Sparkles,
  Camera,
  ChevronDown,
  ChevronUp,
  ScrollText,
  Hand,
  Trophy,
  Flame,
} from 'lucide-react';
import { applySagaEvent } from '../shared/quests.ts';
import { soloVictoryRewards } from '../shared/soloRewards.ts';
import { PROGRESSION_VERSION, type RunGameplayAction } from '../shared/gameplayActions.ts';
import { REALMS, type RealmId } from '../shared/realms.ts';
import { ELEMENTS, type ElementId } from '../shared/elements.ts';
import { CAMPUS_NPCS, CAMPUS_QUESTS, MOUNTS, ZONES, type CampusNpc, type ZoneId } from '../shared/world.ts';
import { computeWizardDerivedStats, type DuelState, type TurnActionInput } from '../shared/combat.ts';
import { wizardStarter } from '../shared/wizardStarter.ts';
import { applyTermReward, grantFusionSpells, TERM_REWARD_TRACK, wearableEquipment, type WizardDocument } from '../shared/economy.ts';
import { isWizardMuted } from '../shared/playerSocial.ts';
import { RACES } from '../shared/wardrobe.ts';
import { auth, signInWithGooglePopup, signOutFirebase } from './lib/firebase.ts';
import {
  ensureCloudAccount,
  loadCloudCreatures,
  loadCloudGallery,
  saveCloudPainting,
  loadCloudSanctuary,
  loadCloudWizardsForRealm,
  loadGuestRealm,
  loadGuestSettings,
  saveGuestSettings,
  saveCloudSettings,
  saveGuestRealm,
  type GuestRealmBundle,
  type OwnedCreature,
  type RealmAccountState,
  type SanctuaryState,
} from './lib/storage.ts';
import { claimCloudTerm, cloudSolo, enrollCloudWizard, loadProgressionRealm, submitGameplayAction, type CloudSoloSettlement } from './lib/cloudProgression.ts';
import { ElementCrest } from './lib/elementIcons.tsx';
import { TitleWizardStudio } from './features/auth/TitleWizardStudio.tsx';
import { WorldViewport } from './engine/worldViewport.tsx';
import type { InteractiveHitTarget } from './engine/zoneBuilders.ts';
import { DuelArenaModal } from './features/duel/DuelArenaModal.tsx';
import { TailorStudioPanel } from './features/tailor/TailorStudioPanel.tsx';
import { CreaturesArborPanel } from './features/creatures/CreaturesArborPanel.tsx';
import { DeckLecternPanel } from './features/deck/DeckLecternPanel.tsx';
import { SanctuaryPanel } from './features/sanctuary/SanctuaryPanel.tsx';
import { AcademyModalHub, type HubModalTab } from './features/shops/AcademyModalHub.tsx';
import { academyAudio } from './engine/audioSynth.ts';
import { MmoMinimap } from './features/world/MmoMinimap.tsx';
import { normalizePlayerSettings, type PlayerSettings } from '../shared/settings.ts';
import type { MarketAccount } from '../shared/market.ts';
import type { EmoteId, LivePlayerPresence } from '../server/wsHub.ts';

type ActiveOverlay =
  | { type: 'none' }
  | { type: 'duel' }
  | { type: 'tailor' }
  | { type: 'creatures' }
  | { type: 'deck' }
  | { type: 'sanctuary' }
  | { type: 'hub'; tab: HubModalTab };

type GuestProgressUpdate = (bundle: GuestRealmBundle) => void;

export function App() {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [selectedRealm, setSelectedRealm] = useState<RealmId>('breeze');
  const [realmAccount, setRealmAccount] = useState<RealmAccountState>(() => loadGuestRealm('breeze').account);
  const [legacyWizards, setLegacyWizards] = useState<WizardDocument[]>([]);
  const [wizards, setWizards] = useState<WizardDocument[]>(() => loadGuestRealm('breeze').wizards);
  const [activeWizard, setActiveWizard] = useState<WizardDocument | null>(null);
  const [creatures, setCreatures] = useState<OwnedCreature[]>([]);
  const [sanctuary, setSanctuary] = useState<SanctuaryState | null>(null);
  const [zone, setZone] = useState<ZoneId>('hub');
  const [overlay, setOverlay] = useState<ActiveOverlay>({ type: 'none' });
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [failedGuestRealms, setFailedGuestRealms] = useState<RealmId[]>([]);
  const pendingGuestProgress = useRef(new Map<RealmId, GuestProgressUpdate[]>());
  const scheduledGuestSaves = useRef(new Set<RealmId>());
  const [npcDialog, setNpcDialog] = useState<CampusNpc | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<LivePlayerPresence | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [cantripPulseKey, setCantripPulseKey] = useState(0);

  // Realtime WebSocket State
  const wsRef = useRef<WebSocket | null>(null);
  const captureFnRef = useRef<() => string | null>(() => null);
  const [remotePlayers, setRemotePlayers] = useState<LivePlayerPresence[]>([]);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [worldPositionSync, setWorldPositionSync] = useState<{
    sessionId: string; zone: ZoneId; x: number; y: number; z: number; rotY: number;
  } | null>(null);
  const [playerMinimapPos, setPlayerMinimapPos] = useState<{ x: number; z: number; rotY: number }>({
    x: ZONES.hub.spawnPos[0],
    z: ZONES.hub.spawnPos[2],
    rotY: 0,
  });
  const [localEmote, setLocalEmote] = useState<{ emote: EmoteId; until: number } | null>(null);
  const [remoteEmoteEvent, setRemoteEmoteEvent] = useState<{
    sessionId: string;
    emote: EmoteId;
    until: number;
    seq: number;
  } | null>(null);
  const [chatBubbleEvent, setChatBubbleEvent] = useState<{
    sessionId: string;
    senderName: string;
    text: string;
    until: number;
    seq: number;
  } | null>(null);
  const seqRef = useRef(0);
  const [activeLiveDuels, setActiveLiveDuels] = useState<{ duelId: string; mode: string; round: number; title: string }[]>([]);
  const [liveDuelState, setLiveDuelState] = useState<DuelState | null>(null);
  const [spectating, setSpectating] = useState(false);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [worldConnected, setWorldConnected] = useState(false);
  const [walletState, setWalletState] = useState<{ scope: string; wallet: MarketAccount } | null>(null);
  const walletScope = fbUser && activeWizard?.ownerId === fbUser.uid ? `${fbUser.uid}:${activeWizard.realmId}` : null;
  const wallet = walletState && walletState.scope === walletScope ? walletState.wallet : null;
  const wardrobe = activeWizard?.wardrobe;
  const bazaarGear = wallet?.gear;
  const equippedGear = useMemo(() => wardrobe && (walletScope
    ? wearableEquipment(wardrobe, bazaarGear)
    : wardrobe.equipped), [wardrobe, walletScope, bazaarGear]);
  const currentPresence = useRef({ activeWizard, creatures, zone, equippedGear, walletScope });
  currentPresence.current = { activeWizard, creatures, zone, equippedGear, walletScope };
  const updateWallet = useCallback((next: MarketAccount) => {
    if (!walletScope || currentPresence.current.walletScope !== walletScope) return;
    setWalletState((current) => {
      if (current?.scope === walletScope && (next.revision ?? 0) < (current.wallet.revision ?? 0)) return current;
      return { scope: walletScope, wallet: next };
    });
  }, [walletScope]);
  const realmLoad = useRef(0);
  const [realmReady, setRealmReady] = useState(true);
  const wizardSaves = useRef(Promise.resolve());
  const wizardCreation = useRef(false);
  const previousUser = useRef<string | null>(null);
  const joined = useRef(false);
  const previousPresenceIds = useRef<string[]>([]);
  const ignoredDuel = useRef<string | null>(null);
  const worldEntry = useRef(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ senderName: string; senderWizardId?: string; text: string; elementId: ElementId }[]>([]);
  const [blockedWizardIds, setBlockedWizardIds] = useState<string[]>([]);
  const blockedWizardIdsRef = useRef<string[]>(blockedWizardIds);
  blockedWizardIdsRef.current = blockedWizardIds;
  const [tradeSession, setTradeSession] = useState<{
    tradeId: string;
    partnerName: string;
    isA: boolean;
    aOfferFlorins: number;
    bOfferFlorins: number;
    aLocked: boolean;
    bLocked: boolean;
  } | null>(null);
  const [incomingTradeInvite, setIncomingTradeInvite] = useState<{ inviteId: string; proposerName: string } | null>(null);

  const [settings, setSettings] = useState(loadGuestSettings);
  const settingsRef = useRef(settings);
  const setPlayerSettings = useCallback((value: PlayerSettings) => {
    settingsRef.current = value;
    setSettings(value);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 4000);
  }, []);

  const readGuestProgress = useCallback((realm: RealmId) => {
    const bundle = loadGuestRealm(realm);
    pendingGuestProgress.current.get(realm)?.forEach((update) => update(bundle));
    return bundle;
  }, []);

  const commitGuestProgress = useCallback((realm: RealmId, bundle: GuestRealmBundle) => {
    if (!saveGuestRealm(realm, bundle)) return false;
    pendingGuestProgress.current.delete(realm);
    setFailedGuestRealms((current) => current.includes(realm) ? current.filter((id) => id !== realm) : current);
    return true;
  }, []);

  const retryGuestProgress = useCallback((realm: RealmId) => {
    if (pendingGuestProgress.current.has(realm) && !commitGuestProgress(realm, readGuestProgress(realm))) {
      setFailedGuestRealms((current) => current.includes(realm) ? current : [...current, realm]);
    }
  }, [commitGuestProgress, readGuestProgress]);

  const updateGuestProgress = useCallback((realm: RealmId, update: GuestProgressUpdate) => {
    const pending = pendingGuestProgress.current.get(realm);
    if (pending) pending.push(update);
    else pendingGuestProgress.current.set(realm, [update]);
    // One action can update several parts of the same realm save, such as a vault withdrawal.
    if (scheduledGuestSaves.current.has(realm)) return;
    scheduledGuestSaves.current.add(realm);
    queueMicrotask(() => {
      scheduledGuestSaves.current.delete(realm);
      retryGuestProgress(realm);
    });
  }, [retryGuestProgress]);

  useEffect(() => {
    academyAudio.setVolumes(settings.harpVolume, settings.sfxVolume);
  }, [settings.harpVolume, settings.sfxVolume]);

  const updateSettings = (patch: Partial<PlayerSettings>) => {
    const next = normalizePlayerSettings({ ...settingsRef.current, ...patch });
    setPlayerSettings(next);
    if (fbUser) {
      const changes = Object.fromEntries(Object.keys(patch).map((key) => [key, next[key as keyof PlayerSettings]]));
      void saveCloudSettings(fbUser.uid, changes)
        .catch(() => showToast('Settings could not be saved to your account.'));
    } else if (!saveGuestSettings(next)) {
      showToast('Settings could not be saved on this device.');
    }
  };

  // Load realm state (Cloud if signed in, else Guest localStorage)
  const loadRealmData = useCallback(async (user: User | null, realm: RealmId, version: number) => {
    if (!user) {
      const guest = readGuestProgress(realm);
      setPlayerSettings(loadGuestSettings());
      setRealmAccount(guest.account);
      setWizards(guest.wizards);
      setLegacyWizards([]);
      return;
    }
    const [settings, account, allWizards] = await Promise.all([
      ensureCloudAccount(user.uid, user.displayName ?? 'Wizard', user.email),
      loadProgressionRealm(user.uid, realm),
      loadCloudWizardsForRealm(user.uid, realm),
    ]);
    if (version !== realmLoad.current) return;
    const online = allWizards.filter((wizard) =>
      wizard.serverProgressionVersion === PROGRESSION_VERSION && account.wizardIds.includes(wizard.id));
    setPlayerSettings(settings);
    setRealmAccount(account);
    setWizards(online);
    setLegacyWizards(allWizards.filter((wizard) => !online.includes(wizard)));
    if (allWizards.length > online.length || readGuestProgress(realm).wizards.length > 0) {
      showToast('Earlier saves are preserved. Enroll an online wizard for verified progression. Sign out to play your local guest saves.');
    }
  }, [readGuestProgress, setPlayerSettings, showToast]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const version = ++realmLoad.current;
      const uid = user?.uid ?? null;
      if (uid !== previousUser.current) {
        previousUser.current = uid;
        ++worldEntry.current;
        setActiveWizard(null);
        setLiveDuelState(null);
        setOverlay({ type: 'none' });
      }
      setFbUser(user);
      setRealmReady(!user);
      if (user) {
        setWizards([]);
        setLegacyWizards([]);
        setRealmAccount({ ...loadGuestRealm(selectedRealm).account, uid: user.uid, wizardIds: [] });
      }
      void loadRealmData(user, selectedRealm, version).then(() => {
        if (version === realmLoad.current) setRealmReady(true);
      }).catch(() => {
        if (version === realmLoad.current) showToast('Cloud saves could not be loaded. Check your connection or sign out to play as a guest.');
      });
    });
    return () => {
      ++realmLoad.current;
      unsub();
    };
  }, [selectedRealm, loadRealmData, showToast]);

  const persistWizard = useCallback(
    (next: WizardDocument, pets: OwnedCreature[] = [], account?: RealmAccountState, updatedPets: OwnedCreature[] = []) => {
      if (fbUser) return;
      const updateWizardList = (list: WizardDocument[]) => list.some((w) => w.id === next.id)
        ? list.map((w) => w.id === next.id ? next : w)
        : [...list, next];
      setActiveWizard(next);
      setWizards(updateWizardList);
      updateGuestProgress(next.realmId, (guest) => {
        guest.wizards = updateWizardList(guest.wizards);
        if (account) guest.account = account;
        if (pets.length || updatedPets.length) {
          const byId = new Map((guest.creatures[next.id] ?? []).map((pet) => [pet.id, pet]));
          for (const pet of [...pets, ...updatedPets]) byId.set(pet.id, pet);
          guest.creatures[next.id] = [...byId.values()];
        }
      });
    },
    [fbUser, updateGuestProgress],
  );

  const copyLegacyToGuest = async (wizard: WizardDocument) => {
    if (!fbUser || auth.currentUser?.uid !== wizard.ownerId) return;
    const version = realmLoad.current;
    try {
      const [pets, dorm, images] = await Promise.all([
        loadCloudCreatures(wizard.id, true), loadCloudSanctuary(wizard.id, wizard.realmId), loadCloudGallery(wizard),
      ]);
      if (version !== realmLoad.current || auth.currentUser?.uid !== wizard.ownerId) return;
      const guest = readGuestProgress(wizard.realmId);
      const id = `legacy_${wizard.id}`;
      if (guest.wizards.some((saved) => saved.id === id)) {
        showToast('This archive already has a local copy.');
        return;
      }
      if (guest.wizards.length >= 3) {
        showToast('There are no free guest slots. The original archive is still available.');
        return;
      }
      const { serverProgressionVersion: _version, ...saved } = wizard;
      const ownerId = 'guest_local';
      const wizards = [...guest.wizards, { ...saved, id, ownerId }];
      const creatures = { ...guest.creatures, [id]: pets.map(({ serverProgressionVersion: _petVersion, ...pet }) =>
        ({ ...pet, wizardId: id, ownerId })) };
      const sanctuaries = { ...guest.sanctuaries, ...(dorm ? { [id]: { ...dorm, wizardId: id, ownerId, isPublic: false } } : {}) };
      const gallery = { ...guest.gallery, [id]: images };
      if (!commitGuestProgress(wizard.realmId, {
        ...guest, wizards, creatures, sanctuaries, gallery,
        account: { ...guest.account, wizardIds: wizards.map((entry) => entry.id) },
      })) throw new Error('Your device could not save the archive.');
      showToast('Copied to this device. Sign out to play your guest copy.');
    } catch (error) {
      if (version === realmLoad.current) showToast(error instanceof Error ? error.message : 'Could not copy that archive.');
    }
  };

  useEffect(() => {
    if (!fbUser || !wallet || !activeWizard || !equippedGear || equippedGear === activeWizard.wardrobe.equipped) return;
    const { id, realmId, ownerId, wardrobe } = activeWizard;
    const slots = (Object.keys(equippedGear) as (keyof typeof equippedGear)[])
      .filter((slot) => equippedGear[slot] !== wardrobe.equipped[slot]);
    const applyEquipment = (wizard: WizardDocument) => {
      if (wizard.id !== id || wizard.ownerId !== ownerId || wizard.realmId !== realmId) return wizard;
      const equipped = { ...wizard.wardrobe.equipped };
      for (const slot of slots) {
        if (equipped[slot] === wardrobe.equipped[slot]) equipped[slot] = equippedGear[slot];
      }
      return { ...wizard, wardrobe: { ...wizard.wardrobe, equipped } };
    };
    setActiveWizard((current) => current && applyEquipment(current));
    setWizards((current) => current.map(applyEquipment));

    void fbUser.getIdToken().then((token) => fetch(`/api/bazaar/${realmId}/reconcile-equipment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizardId: id }),
    })).then((response) => {
      if (!response.ok) throw new Error('Equipment reconciliation failed');
    }).catch(() => {
      if (currentPresence.current.activeWizard?.id === id && currentPresence.current.walletScope === walletScope) {
        showToast('Your Bazaar equipment could not be saved. Reload the page to retry.');
      }
    });
  }, [activeWizard, equippedGear, fbUser, showToast, wallet, walletScope]);

  const claimTermTier = async (tier: number) => {
    if (!activeWizard) throw new Error('Open a wizard first.');
    const wizard = activeWizard;
    const entry = worldEntry.current;
    if (fbUser) {
      const pending = wizardSaves.current.then(() => claimCloudTerm(wizard, tier));
      wizardSaves.current = pending.then(() => undefined, () => undefined);
      const result = await pending;
      if (entry === worldEntry.current) {
        setWizards((list) => list.map((saved) => saved.id === wizard.id ? result.wizard : saved));
        setRealmAccount(result.account);
        setActiveWizard(result.wizard);
      }
      return result.claimed;
    }
    const guest = readGuestProgress(wizard.realmId);
    if (guest.account.claimedTermTiers.includes(tier)) return false;
    const reward = TERM_REWARD_TRACK.find((item) => item.tier === tier);
    const saved = guest.wizards.find((item) => item.id === wizard.id);
    if (!reward || !saved || guest.account.termXp < reward.xpRequired) throw new Error('Reward unavailable.');
    const next = applyTermReward(saved, reward);
    const account = { ...guest.account, claimedTermTiers: [...guest.account.claimedTermTiers, tier] };
    const list = guest.wizards.map((item) => item.id === wizard.id ? next : item);
    if (!commitGuestProgress(wizard.realmId, { ...guest, account, wizards: list })) throw new Error('The guest save could not be written.');
    setWizards(list);
    setRealmAccount(account);
    setActiveWizard(next);
    return true;
  };

  const persistRealmAccount = useCallback((next: RealmAccountState) => {
    if (fbUser) return;
    setRealmAccount(next);
    updateGuestProgress(next.realmId, (guest) => { guest.account = next; });
  }, [fbUser, updateGuestProgress]);

  const persistCreatures = useCallback((nextList: OwnedCreature[]) => {
    if (fbUser || !activeWizard) return;
    setCreatures(nextList);
    updateGuestProgress(activeWizard.realmId, (guest) => {
      guest.creatures[activeWizard.id] = nextList;
    });
  }, [fbUser, activeWizard, updateGuestProgress]);

  const persistSanctuary = useCallback((next: SanctuaryState) => {
    setSanctuary(next);
    if (!fbUser) updateGuestProgress(next.realmId, (guest) => {
      guest.sanctuaries[next.wizardId] = next;
    });
  }, [fbUser, updateGuestProgress]);

  const runGameplayAction: RunGameplayAction = async (action) => {
    if (!fbUser || !activeWizard) return;
    const wizard = activeWizard;
    const entry = worldEntry.current;
    const pending = wizardSaves.current.then(() => {
      if (entry !== worldEntry.current) throw new Error('Reopen this activity and try again.');
      return submitGameplayAction(wizard, action);
    });
    wizardSaves.current = pending.then(() => undefined, () => undefined);
    try {
      const result = await pending;
      if (entry !== worldEntry.current || auth.currentUser?.uid !== result.wizard.ownerId) return;
      setActiveWizard(result.wizard);
      setWizards((list) => list.map((saved) => saved.id === wizard.id ? result.wizard : saved));
      setCreatures(result.creatures);
      setRealmAccount(result.account);
      setSanctuary(result.sanctuary);
      if (result.feedback.notice) showToast(result.feedback.notice);
      return result.feedback;
    } catch (error) {
      if (entry === worldEntry.current) showToast(error instanceof Error ? error.message : 'Could not save this activity.');
    }
  };

  const enterWorld = async (wiz: WizardDocument, prepared?: { pet: OwnedCreature; dorm: SanctuaryState }) => {
    const entry = ++worldEntry.current;
    academyAudio.unlock();
    try {
      let loadedPets: OwnedCreature[];
      let loadedSanc: SanctuaryState;
      if (prepared) {
        loadedPets = [prepared.pet];
        loadedSanc = prepared.dorm;
      } else {
        const defaults = wizardStarter(wiz);
        if (fbUser) {
          const [pets, dorm] = await Promise.all([
            loadCloudCreatures(wiz.id), loadCloudSanctuary(wiz.id, wiz.realmId),
          ]);
          if (!dorm || !pets.some((pet) => pet.id === wiz.activeCreatureId)) throw new Error('Your online save is incomplete.');
          loadedPets = pets;
          loadedSanc = dorm;
        } else {
          const guest = readGuestProgress(wiz.realmId);
          const savedPets = guest.creatures[wiz.id];
          const savedDorm = guest.sanctuaries[wiz.id];
          loadedPets = savedPets?.length ? savedPets : [defaults.pet];
          loadedSanc = savedDorm ?? defaults.dorm;
          if (!savedPets?.length || !savedDorm) {
            updateGuestProgress(wiz.realmId, (bundle) => {
              bundle.creatures[wiz.id] = loadedPets;
              bundle.sanctuaries[wiz.id] = loadedSanc;
            });
          }
        }
      }
      if (worldEntry.current !== entry || (fbUser?.uid ?? null) !== (auth.currentUser?.uid ?? null)) return;
      setCreatures(loadedPets);
      setSanctuary(loadedSanc);
      setGalleryImages(fbUser ? [] : readGuestProgress(wiz.realmId).gallery?.[wiz.id] ?? []);
      if (fbUser) {
        void loadCloudGallery(wiz).then((images) => {
          if (worldEntry.current === entry) setGalleryImages(images);
        }).catch(() => {
          if (worldEntry.current === entry) showToast('Your Sky-Lens gallery could not be loaded.');
        });
      }
      setZone('hub');
      setOverlay({ type: 'none' });
      const recoveredWizard = fbUser ? wiz : grantFusionSpells(wiz, loadedPets);
      if (recoveredWizard !== wiz) persistWizard(recoveredWizard);
      else setActiveWizard(wiz);
    } catch {
      showToast('Could not load this wizard’s save. Please try again.');
    }
  };

  const captureSkyLens = async () => {
    if (!activeWizard) return;
    const wizard = activeWizard;
    const entry = worldEntry.current;
    const image = captureFnRef.current();
    if (!image) {
      showToast('Sky-Lens needs a working 3D view.');
      return;
    }
    try {
      let images: string[];
      if (fbUser) {
        const pending = wizardSaves.current.then(() => saveCloudPainting(wizard, image));
        wizardSaves.current = pending.then(() => undefined, () => undefined);
        images = await pending;
      } else {
        const guest = readGuestProgress(wizard.realmId);
        images = [image, ...(guest.gallery?.[wizard.id] ?? [])].slice(0, 9);
        const gallery = { ...guest.gallery, [wizard.id]: images };
        if (!commitGuestProgress(wizard.realmId, { ...guest, gallery })) throw new Error('Guest storage is full.');
      }
      if (entry === worldEntry.current) {
        setGalleryImages(images);
        showToast('Sky-Lens painting saved to your Sanctuary Gallery!');
      }
    } catch {
      if (entry === worldEntry.current) showToast('Sky-Lens painting could not be saved.');
    }
  };

  const handleCreateWizard = async (wiz: WizardDocument): Promise<boolean> => {
    if (wizardCreation.current || !realmReady || wizards.length >= 3) return false;
    const version = realmLoad.current;
    wizardCreation.current = true;
    setEnrollmentError(null);
    try {
      if (fbUser) {
        const result = await enrollCloudWizard(fbUser.uid, wiz);
        if (version !== realmLoad.current || auth.currentUser?.uid !== fbUser.uid) return false;
        setRealmAccount(result.account);
        setWizards((current) => current.some((wizard) => wizard.id === result.wizard.id)
          ? current.map((wizard) => wizard.id === result.wizard.id ? result.wizard : wizard)
          : [...current, result.wizard]);
        await enterWorld(result.wizard);
      } else {
        const prepared = wizardStarter(wiz);
        const guest = readGuestProgress(wiz.realmId);
        if (guest.wizards.length >= 3) throw new Error('All three wizard slots are in use.');
        const list = [...guest.wizards, wiz];
        const account = { ...guest.account, wizardIds: list.map((wizard) => wizard.id) };
        if (!commitGuestProgress(wiz.realmId, {
          ...guest, account, wizards: list,
          creatures: { ...guest.creatures, [wiz.id]: [prepared.pet] },
          sanctuaries: { ...guest.sanctuaries, [wiz.id]: prepared.dorm },
        })) throw new Error('Could not save your new wizard on this device. Check browser storage and try enrolling again.');
        setRealmAccount(account);
        setWizards(list);
        await enterWorld(wiz, prepared);
      }
      return true;
    } catch (error) {
      if (version === realmLoad.current) {
        setEnrollmentError(error instanceof Error ? error.message : 'Could not save the new wizard.');
      }
      return false;
    } finally {
      wizardCreation.current = false;
    }
  };

  const clearPresence = useCallback(() => {
    setWorldConnected(false);
    setLocalSessionId(null);
    setWorldPositionSync(null);
    setRemotePlayers([]);
    setInspectedPlayer(null);
    setTradeSession(null);
    setActiveLiveDuels([]);
  }, []);

  function sendWorld(message: Record<string, unknown>): boolean {
    const socket = wsRef.current;
    if (!joined.current || socket?.readyState !== WebSocket.OPEN) {
      showToast('The live realm is reconnecting. Try again shortly.');
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  }

  useEffect(() => {
    if (!activeWizard) return;
    const initialWizard = activeWizard;
    if (fbUser && activeWizard.ownerId !== fbUser.uid) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let stopped = false;
    let delay = 500;
    ignoredDuel.current = null;
    const ticketKey = `aldervale-live:${initialWizard.realmId}:${initialWizard.id}`;
    let guestTicket: string | null = null;
    let serverSession: string | null = null;

    const connect = () => {
      if (stopped) return;
      serverSession = null;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      socket = ws;
      wsRef.current = ws;
      ws.onopen = async () => {
        try {
          const user = fbUser ? auth.currentUser : null;
          if (fbUser && user?.uid !== fbUser.uid) throw new Error('Sign-in changed');
          const idToken = await user?.getIdToken();
          if (stopped || ws.readyState !== WebSocket.OPEN) return;
          const current = currentPresence.current;
          const wizard = current.activeWizard;
          if (!wizard || wizard.id !== initialWizard.id) return;
          const pet = current.creatures.find((creature) => creature.id === wizard.activeCreatureId) ?? current.creatures[0];
          if (!idToken && !guestTicket) {
            try { guestTicket = sessionStorage.getItem(ticketKey); } catch { /* optional reconnect storage */ }
          }
          ws.send(JSON.stringify({
            type: 'join_world', idToken, guestTicket,
            presence: {
              wizardId: wizard.id, name: wizard.name, realmId: wizard.realmId, zone: current.zone,
              raceId: wizard.raceId, beastClan: wizard.beastClan, elementId: wizard.elementId,
              level: wizard.level, rank: wizard.rank, titleBadge: wizard.progression.titleBadge,
              mountId: wizard.progression.equippedMountId, activeCreatureId: pet?.id ?? wizard.activeCreatureId,
              activeCreatureSpeciesId: pet?.speciesId, activeCreatureNickname: pet?.nickname,
              activeCreatureStage: pet?.stage, activeCreatureChromatic: pet?.chromatic,
              activeCreatureBranchChoice: pet?.branchChoice, activeCreatureTalents: pet?.talents ?? [],
              sculpt: wizard.sculpt, equipped: current.equippedGear ?? wizard.wardrobe.equipped, stitching: wizard.stitching,
            },
          }));
        } catch {
          showToast('Could not connect to the live realm. Check your sign-in.');
          ws.close();
        }
      };

      const isPeer = (presence: LivePlayerPresence) =>
        presence.sessionId !== serverSession && !previousPresenceIds.current.includes(presence.sessionId);

      ws.onmessage = (ev) => {
        if (stopped || socket !== ws) return;
        try {
          const data = JSON.parse(String(ev.data)) as Record<string, unknown>;
          if (data.type === 'world_joined') {
            delay = 500;
            joined.current = true;
            // A new authenticated socket may resume away from spawn. Apply the server-observed
            // location to the still-mounted 3D scene, including when the avatar was moved offline.
            const location = data.position as Partial<{ x: number; y: number; z: number; rotY: number }> | undefined;
            if (fbUser && serverSession && typeof data.zone === 'string' && Object.hasOwn(ZONES, data.zone) && location &&
                [location.x, location.y, location.z, location.rotY].every((value) => typeof value === 'number' && Number.isFinite(value))) {
              const nextZone = data.zone as ZoneId;
              const position = location as { x: number; y: number; z: number; rotY: number };
              setZone(nextZone);
              setWorldPositionSync({ sessionId: serverSession, zone: nextZone, ...position });
              setPlayerMinimapPos({ x: position.x, z: position.z, rotY: position.rotY });
            }
            setWorldConnected(true);
          } else if (data.type === 'guest_ticket' && typeof data.ticket === 'string') {
            guestTicket = data.ticket;
            try { sessionStorage.setItem(ticketKey, data.ticket); } catch { /* optional reconnect storage */ }
          } else if (data.type === 'world_notice') {
            showToast(String(data.text ?? 'Live realm unavailable'));
          } else if (data.type === 'welcome') {
            serverSession = String(data.sessionId ?? '');
            setLocalSessionId(serverSession);
            previousPresenceIds.current = [...previousPresenceIds.current.slice(-15), serverSession];
          } else if (data.type === 'zone_snapshot') {
            setRemotePlayers((data.players as LivePlayerPresence[]).filter(isPeer));
            setActiveLiveDuels((data.activeDuels as typeof activeLiveDuels) ?? []);
          } else if (data.type === 'duels_updated') {
            setActiveLiveDuels((data.activeDuels as typeof activeLiveDuels) ?? []);
          } else if (data.type === 'player_joined') {
            const p = data.player as LivePlayerPresence;
            if (isPeer(p)) {
              setRemotePlayers((prev) => [...prev.filter((x) => x.sessionId !== p.sessionId), p]);
            }
          } else if (data.type === 'player_updated') {
            const p = data.player as LivePlayerPresence;
            if (isPeer(p)) {
              setRemotePlayers((prev) => prev.map((x) => (x.sessionId === p.sessionId ? p : x)));
            }
          } else if (data.type === 'player_left') {
            setRemotePlayers((prev) => prev.filter((x) => x.sessionId !== data.sessionId));
            setInspectedPlayer((current) => current?.sessionId === data.sessionId ? null : current);
          } else if (data.type === 'player_moved') {
            setRemotePlayers((prev) =>
              prev.map((x) =>
                x.sessionId === data.sessionId
                  ? {
                      ...x,
                      x: Number(data.x),
                      y: Number(data.y),
                      z: Number(data.z),
                      rotY: Number(data.rotY),
                      mountId: data.mountId === null || typeof data.mountId === 'string' ? data.mountId : x.mountId,
                    }
                  : x,
              ),
            );
          } else if (data.type === 'player_emote') {
            const emote = String(data.emote ?? 'wave') as EmoteId;
            const sid = String(data.sessionId ?? '');
            if (sid) {
              seqRef.current += 1;
              setRemoteEmoteEvent({
                sessionId: sid,
                emote,
                until: performance.now() + (emote === 'meditate' ? 4000 : 2800),
                seq: seqRef.current,
              });
            }
          } else if (data.type === 'chat_message') {
            const sender = String(data.senderName ?? 'Wizard');
            const text = String(data.text ?? '');
            const sid = String(data.senderSessionId ?? '');
            const senderWizardId = typeof data.senderWizardId === 'string' ? data.senderWizardId : undefined;
            setChatMessages((prev) => [...prev.slice(-30), { senderName: sender, senderWizardId, text, elementId: (data.elementId as ElementId) ?? 'ember' }]);
            if (sid && !isWizardMuted(blockedWizardIdsRef.current, senderWizardId)) {
              seqRef.current += 1;
              setChatBubbleEvent({
                sessionId: sid,
                senderName: sender,
                text,
                until: performance.now() + 5000,
                seq: seqRef.current,
              });
            }
          } else if (data.type === 'duel_state') {
            const next = data.state as DuelState;
            if (ignoredDuel.current === next.duelId) return;
            setLiveDuelState(next);
            setSpectating(data.spectator === true);
            setTurnDeadline(typeof data.turnDeadline === 'number' ? data.turnDeadline : null);
            setOverlay({ type: 'duel' });
          } else if (data.type === 'queue_status') {
            showToast(`Joined ${String(data.queue).toUpperCase()} queue (${String(data.count)} waiting in ${activeWizard.realmId})…`);
          } else if (data.type === 'trade_invite') {
            setIncomingTradeInvite({
              inviteId: String(data.inviteId ?? ''),
              proposerName: String(data.proposerName ?? 'Wizard'),
            });
          } else if (data.type === 'trade_invite_sent') {
            showToast(`Trade invite sent to ${String(data.targetName ?? 'that wizard')}.`);
          } else if (data.type === 'trade_invite_closed') {
            setIncomingTradeInvite(null);
            showToast(String(data.message ?? 'Trade invitation closed.'));
          } else if (data.type === 'trade_update') {
            setIncomingTradeInvite(null);
            const tr = data.trade as { tradeId: string; aOfferFlorins: number; bOfferFlorins: number; aLocked: boolean; bLocked: boolean };
            setTradeSession({ ...tr, partnerName: String(data.partnerName ?? 'Wizard'), isA: data.isA === true });
          } else if (data.type === 'trade_complete' || data.type === 'market_wallet') {
            updateWallet(data.wallet as MarketAccount);
            if (data.type === 'trade_complete') {
              setTradeSession(null);
              showToast('Trade completed. Your Bazaar wallet was updated.');
            }
          } else if (data.type === 'trade_cancelled') {
            setTradeSession(null);
            showToast(String(data.message ?? 'Trade cancelled.'));
          }
        } catch {
          // ignore bad frames
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        joined.current = false;
        clearPresence();
        retry = setTimeout(connect, delay);
        delay = Math.min(4000, delay * 2);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      stopped = true;
      joined.current = false;
      clearTimeout(retry);
      socket?.close();
      wsRef.current = null;
      clearPresence();
      setWalletState(null);
    };
  }, [activeWizard?.id, activeWizard?.realmId, fbUser?.uid, clearPresence, updateWallet]);

  useEffect(() => {
    if (!activeWizard || !fbUser || !worldConnected || activeWizard.ownerId !== fbUser.uid) return;
    let cancelled = false;
    void fbUser.getIdToken().then((token) => fetch(`/api/bazaar/${activeWizard.realmId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).then(async (response) => {
      if (response.ok && !cancelled) {
        const data = await response.json() as { wallet: MarketAccount };
        if (!cancelled) updateWallet(data.wallet);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeWizard?.id, fbUser?.uid, worldConnected, updateWallet]);

  // Broadcast live appearance, mount, race, or companion updates to zone peers
  const activePetForSync = activeWizard
    ? creatures.find((c) => c.id === activeWizard.activeCreatureId) ?? creatures[0]
    : undefined;
  useEffect(() => {
    if (!activeWizard || !worldConnected || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'update_appearance',
        patch: {
          raceId: activeWizard.raceId,
          beastClan: activeWizard.beastClan,
          elementId: activeWizard.elementId,
          level: activeWizard.level,
          rank: activeWizard.rank,
          titleBadge: activeWizard.progression.titleBadge,
          mountId: activeWizard.progression.equippedMountId,
          activeCreatureId: activePetForSync?.id ?? activeWizard.activeCreatureId,
          activeCreatureSpeciesId: activePetForSync?.speciesId ?? 'cinder_kitsune',
          activeCreatureNickname: activePetForSync?.nickname ?? 'Academy Partner',
          activeCreatureStage: activePetForSync?.stage ?? 1,
          activeCreatureChromatic: activePetForSync?.chromatic ?? 'none',
          activeCreatureBranchChoice: activePetForSync?.branchChoice ?? 'A',
          activeCreatureTalents: activePetForSync?.talents ?? [],
          sculpt: activeWizard.sculpt,
          equipped: equippedGear ?? activeWizard.wardrobe.equipped,
          stitching: activeWizard.stitching,
        },
      }),
    );
  }, [
    worldConnected,
    activeWizard?.raceId,
    activeWizard?.beastClan,
    activeWizard?.level,
    activeWizard?.rank,
    activeWizard?.progression.titleBadge,
    activeWizard?.progression.equippedMountId,
    activeWizard?.sculpt,
    equippedGear,
    activeWizard?.stitching,
    activePetForSync?.id,
    activePetForSync?.speciesId,
    activePetForSync?.nickname,
    activePetForSync?.stage,
    activePetForSync?.chromatic,
    activePetForSync?.branchChoice,
    activePetForSync?.talents,
  ]);

  const triggerEmote = useCallback(
    (emote: EmoteId) => {
      if (!activeWizard) return;
      const duration = emote === 'meditate' ? 4000 : 2800;
      setLocalEmote({ emote, until: performance.now() + duration });
      if (emote === 'cast') {
        setCantripPulseKey((k) => k + 1);
        academyAudio.playChime('cast');
      } else {
        academyAudio.playChime('ui');
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'emote', emote }));
      }
    },
    [activeWizard],
  );

  useEffect(() => {
    if (!activeWizard || overlay.type !== 'none') return;
    const onHotkey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') triggerEmote('wave');
      else if (e.key === '2') triggerEmote('cheer');
      else if (e.key === '3') triggerEmote('meditate');
      else if (e.key === '4') triggerEmote('cast');
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, [activeWizard, overlay.type, triggerEmote]);

  const handleZoneChange = (nextZone: ZoneId) => {
    setZone(nextZone);
    const spawn = ZONES[nextZone].spawnPos;
    setPlayerMinimapPos({ x: spawn[0], z: spawn[2], rotY: 0 });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'move', zone: nextZone, x: spawn[0], y: spawn[1], z: spawn[2], rotY: 0 }));
    }
  };

  const handleInteractHit = (hit: InteractiveHitTarget) => {
    if (!activeWizard) return;
    academyAudio.playChime('ui');
    if (fbUser && (hit.kind === 'fountain' || hit.kind === 'wisp' || hit.kind === 'resource' || hit.kind === 'fishing')) {
      void runGameplayAction({ type: 'world', id: hit.id });
      return;
    }

    if (hit.kind === 'npc') {
      const npc = CAMPUS_NPCS.find((n) => n.id === hit.id);
      if (npc) setNpcDialog(npc);
    } else if (hit.kind === 'portal' && hit.targetZone) {
      handleZoneChange(hit.targetZone);
      showToast(`Arrived at ${ZONES[hit.targetZone].name}`);
    } else if (hit.kind === 'duel_ring') {
      setOverlay({ type: 'duel' });
    } else if (hit.kind === 'fountain') {
      persistWizard({
        ...activeWizard,
        progression: { ...activeWizard.progression, flasks: activeWizard.progression.maxFlasks, mana: activeWizard.progression.maxMana },
      });
      showToast('Sanctuary Fountain restored all Mana & Healing Flasks!');
    } else if (hit.kind === 'wisp') {
      persistWizard({
        ...activeWizard,
        progression: { ...activeWizard.progression, mana: Math.min(activeWizard.progression.maxMana, activeWizard.progression.mana + 30) },
      });
      showToast('Aether Wisp restored +30 Mana!');
    } else if (hit.kind === 'resource' && hit.resourceId) {
      const mult = REALMS[activeWizard.realmId].dropMultiplier >= 2 ? 2 : 1;
      persistWizard({
        ...activeWizard,
        resources: { ...activeWizard.resources, [hit.resourceId]: (activeWizard.resources[hit.resourceId] ?? 0) + mult },
      });
      showToast(`Harvested +${mult} ${hit.label}!`);
    } else if (hit.kind === 'fishing') {
      const catchRoll = Math.random();
      const florinGain = catchRoll > 0.75 ? 48 : 22;
      const catchName = catchRoll > 0.75 ? 'Golden Cloud-Koi' : 'Silver Sky-Minnow';
      academyAudio.playChime('fish');
      persistWizard({
        ...activeWizard,
        currencies: { ...activeWizard.currencies, florins: activeWizard.currencies.florins + florinGain },
        progression: { ...activeWizard.progression, fishingRank: activeWizard.progression.fishingRank + (catchRoll > 0.8 ? 1 : 0) },
      });
      showToast(`Caught a ${catchName} at Cloud-Pier! (+${florinGain} Florins)`);
    } else if (hit.kind === 'dorm_item') {
      showToast(`Activated ${hit.label}!`);
    }
  };

  const handleDuelFinished = (res: {
    won: boolean;
    mode: DuelState['mode'];
    spireFloor?: number;
    trialElement?: ElementId;
    completed?: boolean;
    draw?: boolean;
    leadCreatureWinEligible?: boolean;
  }) => {
    setLiveDuelState(null);
    if (!activeWizard || spectating) return;
    const live = res.mode === 'pvp' || res.mode === 'coop';
    if (live) {
      if (res.won) showToast(fbUser ? 'Victory! Shared rewards go to your Bazaar account.' : 'Victory in guest practice!');
      return;
    }
    if (fbUser) return;
    if (!res.won) {
      if (!res.draw && res.mode === 'trial' && res.completed) persistWizard(applySagaEvent(activeWizard, 'rare-trial-attempt'));
      showToast(res.draw ? 'The duel ended in a draw.' : res.completed ? 'Duel lost. You can try again.' : 'You left the duel.');
      return;
    }

    if (res.mode !== 'solo' && res.mode !== 'trial' && res.mode !== 'spire') return;
    const reward = soloVictoryRewards(
      activeWizard, creatures, realmAccount,
      { ...res, mode: res.mode, leadCreatureWinEligible: res.leadCreatureWinEligible === true },
      () => `pet_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    );
    setRealmAccount(reward.account);
    setCreatures(reward.creatures);
    persistWizard(reward.wizard, reward.hatchedPets, reward.account, reward.updatedLead ? [reward.updatedLead] : []);
    showToast(reward.notice);
  };

  const applyCloudSoloSettlement = (result: CloudSoloSettlement) => {
    if (auth.currentUser?.uid !== result.wizard.ownerId || activeWizard?.id !== result.wizard.id) return;
    setRealmAccount(result.account);
    setCreatures(result.creatures);
    setWizards((list) => list.map((wizard) => wizard.id === result.wizard.id ? result.wizard : wizard));
    setActiveWizard(result.wizard);
    showToast(result.notice);
  };

  const guestSaveWarning = failedGuestRealms.length > 0 && (
    <div className="fixed top-3 left-1/2 z-50 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl storybook-dark-panel px-4 py-2 text-sm shadow-xl">
      <p role="alert">
        Guest progress could not be saved. Check browser storage and retry before closing or reloading.
      </p>
      <button
        type="button"
        onClick={() => failedGuestRealms.forEach(retryGuestProgress)}
        className="rounded-lg bg-[#f4c98b] px-3 py-1.5 font-bold text-[#241b16]"
      >
        Retry save
      </button>
    </div>
  );

  if (!activeWizard) {
    return (
      <>
        {guestSaveWarning}
        <TitleWizardStudio
          userEmail={fbUser?.email ?? null}
          isSignedIn={Boolean(fbUser)}
          selectedRealm={selectedRealm}
          realmAccount={realmAccount}
          wizards={wizards}
          onSignInGoogle={() => void signInWithGooglePopup().catch(() => showToast('Google sign-in could not complete. Try again.'))}
          onSignOut={() => void signOutFirebase().catch(() => showToast('Could not sign out. Try again.'))}
          onSelectRealm={(realm) => {
            setEnrollmentError(null);
            setSelectedRealm(realm);
          }}
          onEnterWorld={(w) => void enterWorld(w)}
          legacyWizards={legacyWizards}
          onCopyLegacy={(w) => void copyLegacyToGuest(w)}
          onCreateWizard={handleCreateWizard}
          notice={toast}
          enrollmentError={enrollmentError}
          realmReady={realmReady}
        />
      </>
    );
  }

  const activePet = creatures.find((c) => c.id === activeWizard.activeCreatureId) ?? creatures[0] ?? null;
  const equippedWizard = equippedGear && equippedGear !== activeWizard.wardrobe.equipped
    ? { ...activeWizard, wardrobe: { ...activeWizard.wardrobe, equipped: equippedGear } }
    : activeWizard;
  const stats = computeWizardDerivedStats({
    level: activeWizard.level,
    raceId: activeWizard.raceId,
    element: activeWizard.elementId,
    equippedGearIds: Object.values(equippedWizard.wardrobe.equipped),
    socketedRunestoneIds: activeWizard.wardrobe.socketedRunestones,
    creatureTalents: activePet?.talents ?? [],
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#182033]">
      {guestSaveWarning}
      {/* Full-Viewport 3D Sky-Island World (>=85% unobstructed) */}
      <WorldViewport
        wizard={equippedWizard}
        activeCreature={activePet}
        zone={zone}
        dormThemeId={sanctuary?.themeId ?? 'sunlit_loft'}
        dormWeatherId={sanctuary?.weatherId ?? 'clear_breeze'}
        dormItems={sanctuary?.items ?? []}
        remotePlayers={remotePlayers}
        completedQuestIds={activeWizard.progression.completedQuests}
        localSessionId={localSessionId}
        worldPositionSync={worldPositionSync}
        localEmote={localEmote}
        remoteEmoteEvent={remoteEmoteEvent}
        chatBubbleEvent={chatBubbleEvent}
        cameraSensitivity={settings.cameraSensitivity}
        cantripPulseKey={cantripPulseKey}
        onMoveBroadcast={(x, y, z, rotY) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'move', zone, x, y, z, rotY, mountId: activeWizard.progression.equippedMountId }));
          }
        }}
        onPlayerMoveSample={setPlayerMinimapPos}
        onToggleMount={() => {
          if (fbUser) {
            void runGameplayAction({ type: 'mountToggle' });
            return;
          }
          const owned = activeWizard.progression.ownedMounts;
          const nextMount = activeWizard.progression.equippedMountId ? null : (owned[0] ?? 'mount_cloud_broom');
          persistWizard({
            ...activeWizard,
            progression: { ...activeWizard.progression, equippedMountId: nextMount },
          });
          showToast(nextMount ? `Mounted ${MOUNTS.find((m) => m.id === nextMount)?.name ?? 'Mount'}!` : 'Dismounted.');
        }}
        onInteractHit={handleInteractHit}
        onInspectRemotePlayer={(p) => {
          if (worldConnected && !previousPresenceIds.current.includes(p.sessionId)) setInspectedPlayer(p);
        }}
        onRegisterCaptureFn={(fn) => {
          captureFnRef.current = fn;
        }}
      />

      {/* Top-Left Compact Identity & Stats Ribbon + Active Quest Tracker */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="pointer-events-auto storybook-panel rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <ElementCrest elementId={activeWizard.elementId} size={22} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#241b16]">{activeWizard.name}</span>
              <span className="rounded-md bg-[#241b16] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#f4c98b]">
                Lv.{activeWizard.level} · Rk.{activeWizard.rank}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono-num text-[#615346]">
              <span>{stats.maxHp} HP</span>
              <span>{activeWizard.currencies.florins}F</span>
              <span>{activeWizard.currencies.spellShards} Shards</span>
              <span>{REALMS[activeWizard.realmId].name}</span>
            </div>
          </div>
        </div>

        {/* Pinned Active Saga Quest Tracker */}
        {(() => {
          const nextQuest = CAMPUS_QUESTS.find((q) => !activeWizard.progression.completedQuests.includes(q.id));
          return (
            <button
              type="button"
              onClick={() => setOverlay({ type: 'hub', tab: 'quests' })}
              className="pointer-events-auto storybook-dark-panel max-w-[260px] rounded-xl px-3 py-2 text-left hover:border-[#ffd166]/65"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd166]">
                <ScrollText className="h-3 w-3" />
                <span>{nextQuest ? 'Active Saga Quest' : 'All Saga Quests Complete'}</span>
              </div>
              {nextQuest ? (
                <>
                  <div className="mt-0.5 text-xs font-bold text-[#fbf6ec]">{nextQuest.title}</div>
                  <div className="text-[10px] text-[#cfc5b4] leading-snug">{nextQuest.description}</div>
                </>
              ) : (
                <div className="mt-0.5 text-[10px] text-[#cfc5b4]">Open Ledger for Term Track &amp; Almanac</div>
              )}
            </button>
          );
        })()}
      </div>

      {/* Top-Right Zone Pill, Quick Tools & MMORPG Sky-Radar Minimap */}
      <div className="pointer-events-none absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="storybook-panel rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#38a3a5]" />
            <span>{ZONES[zone].name}</span>
          </div>
          <button
            onClick={() => {
              setCantripPulseKey((k) => k + 1);
              academyAudio.playChime('cast');
              wsRef.current?.send(JSON.stringify({ type: 'cantrip_pulse', cantrip: 'arcane_sense' }));
              showToast('Arcane Sense pulse revealed nearby resources & wisps!');
            }}
            className="storybook-panel rounded-2xl px-3 py-2 text-xs font-bold hover:bg-[#efe4ce]"
            title="Cast Overworld Cantrip"
          >
            <Sparkles className="h-4 w-4 text-[#d97706]" />
          </button>
          <button
            onClick={() => void captureSkyLens()}
            className="storybook-panel rounded-2xl px-3 py-2 text-xs font-bold hover:bg-[#efe4ce]"
            title="Snap Sky-Lens 3D Painting"
          >
            <Camera className="h-4 w-4 text-[#256fa8]" />
          </button>
          <button
            onClick={() => setOverlay({ type: 'hub', tab: 'settings' })}
            className="storybook-panel rounded-2xl px-3 py-2 text-xs font-bold hover:bg-[#efe4ce]"
            title="Settings"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>

        <MmoMinimap
          zone={zone}
          playerPos={playerMinimapPos}
          remotePlayers={remotePlayers}
          worldConnected={worldConnected}
          completedQuestIds={activeWizard.progression.completedQuests}
          onOpenWorldMap={() => setOverlay({ type: 'hub', tab: 'map' })}
        />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 storybook-dark-panel rounded-xl px-4 py-2 text-xs font-semibold shadow-xl">
          {toast}
        </div>
      )}

      {/* NPC Dialogue Card */}
      {npcDialog && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[92%] max-w-md storybook-panel rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-base font-bold">{npcDialog.name}</div>
              <div className="text-[11px] text-[#615346]">{npcDialog.role} · {RACES[npcDialog.raceId].name}</div>
            </div>
            <ElementCrest elementId={npcDialog.elementId} size={16} />
          </div>
          <p className="mt-2 text-xs text-[#241b16] leading-relaxed">{npcDialog.greeting}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setNpcDialog(null)} className="rounded-lg border border-[#d7c7a9] px-3 py-1 text-xs font-bold">
              Dismiss
            </button>
            <button
              onClick={() => {
                const p = npcDialog.opensPanel;
                setNpcDialog(null);
                if (p === 'duel') setOverlay({ type: 'duel' });
                else if (p === 'tailor') setOverlay({ type: 'tailor' });
                else if (p === 'creatures') setOverlay({ type: 'creatures' });
                else if (p === 'deck' || p === 'lectern') setOverlay({ type: 'deck' });
                else if (p === 'bazaar') setOverlay({ type: 'hub', tab: 'bazaar' });
                else if (p === 'quests') setOverlay({ type: 'hub', tab: 'quests' });
                else setOverlay({ type: 'hub', tab: 'shops' });
              }}
              className="rounded-lg bg-[#241b16] px-4 py-1 text-xs font-bold text-[#f4c98b]"
            >
              Open {npcDialog.opensPanel}
            </button>
          </div>
        </div>
      )}

      {/* Click-to-Inspect Remote Wizard Card */}
      {worldConnected && inspectedPlayer && remotePlayers.some((peer) => peer.sessionId === inspectedPlayer.sessionId) && (
        <div className="absolute top-60 right-3 w-72 storybook-panel rounded-2xl p-4 text-xs shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold">{inspectedPlayer.name}</span>
            <ElementCrest elementId={inspectedPlayer.elementId} showLabel />
          </div>
          <div className="text-[#615346] mt-0.5">
            {RACES[inspectedPlayer.raceId].name} · Lv.{inspectedPlayer.level} · {inspectedPlayer.titleBadge}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (sendWorld({ type: 'trade_propose', targetSessionId: inspectedPlayer.sessionId })) {
                  setInspectedPlayer(null);
                }
              }}
              className="flex-1 rounded-lg bg-[#38a3a5] py-1.5 font-bold text-white"
            >
              Propose Trade
            </button>
            <button
              onClick={() => {
                setBlockedWizardIds((blocked) =>
                  blocked.includes(inspectedPlayer.wizardId) ? blocked : [...blocked, inspectedPlayer.wizardId],
                );
                setInspectedPlayer(null);
                showToast(`Muted ${inspectedPlayer.name}`);
              }}
              className="rounded-lg border border-[#d7c7a9] px-2.5 py-1.5 font-bold"
            >
              Mute
            </button>
            <button onClick={() => setInspectedPlayer(null)} className="rounded-lg border border-[#d7c7a9] px-2 py-1.5 font-bold">✕</button>
          </div>
        </div>
      )}

      {incomingTradeInvite && (
        <div className="absolute top-20 right-4 w-72 storybook-panel rounded-2xl p-4 text-xs shadow-2xl space-y-3">
          <div className="font-display text-base font-bold">Trade invitation</div>
          <p>{incomingTradeInvite.proposerName} wants to trade Bazaar Florins with you.</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                sendWorld({ type: 'trade_respond', inviteId: incomingTradeInvite.inviteId, accept: true });
                setIncomingTradeInvite(null);
              }}
              className="flex-1 rounded-lg bg-[#2f8a73] py-1.5 font-bold text-white"
            >
              Accept
            </button>
            <button
              onClick={() => {
                sendWorld({ type: 'trade_respond', inviteId: incomingTradeInvite.inviteId, accept: false });
                setIncomingTradeInvite(null);
              }}
              className="rounded-lg border border-[#d7c7a9] px-3 py-1.5 font-bold"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Live Dual-Confirm P2P Trade Modal */}
      {tradeSession && (
        <div className="absolute top-20 left-4 w-80 storybook-panel rounded-2xl p-4 text-xs shadow-2xl space-y-2">
          <div className="font-display text-base font-bold">Live Trade: {tradeSession.partnerName}</div>
          <div className="flex items-center justify-between">
            <span>Offer Bazaar Florins ({wallet?.florins ?? 0} available):</span>
            <input
              type="number"
              min={0}
              max={wallet?.florins ?? 0}
              value={tradeSession.isA ? tradeSession.aOfferFlorins : tradeSession.bOfferFlorins}
              onChange={(e) => sendWorld({ type: 'trade_step', tradeId: tradeSession.tradeId, florins: Number(e.target.value) })}
              className="w-24 rounded border px-2 py-1"
            />
          </div>
          <p>Partner offer: {tradeSession.isA ? tradeSession.bOfferFlorins : tradeSession.aOfferFlorins} Bazaar Florins</p>
          <div className="flex gap-2">
            <button
              onClick={() => sendWorld({ type: 'trade_step', tradeId: tradeSession.tradeId, lock: true })}
              className="flex-1 rounded-lg bg-[#241b16] py-1.5 font-bold text-[#f4c98b]"
            >
              1. Lock Offer
            </button>
            <button
              disabled={!tradeSession.aLocked || !tradeSession.bLocked}
              onClick={() => sendWorld({ type: 'trade_step', tradeId: tradeSession.tradeId, confirm: true })}
              className="flex-1 rounded-lg bg-[#2f8a73] py-1.5 font-bold text-white disabled:opacity-45"
            >
              2. Final Confirm
            </button>
            <button onClick={() => sendWorld({ type: 'trade_cancel', tradeId: tradeSession.tradeId })}>Cancel</button>
          </div>
        </div>
      )}

      {/* Collapsible Realm Chat Drawer */}
      {chatOpen && (
        <div className="absolute bottom-20 left-3 w-80 storybook-dark-panel rounded-2xl p-3 text-xs space-y-2">
          <div className="max-h-36 overflow-y-auto space-y-1">
            {chatMessages
              .filter((m) => !isWizardMuted(blockedWizardIds, m.senderWizardId))
              .map((m, i) => (
                <div key={i}>
                  <strong className="text-[#f4c98b]">{m.senderName}:</strong> {m.text}
                </div>
              ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              wsRef.current?.send(JSON.stringify({ type: 'chat', text: chatInput }));
              setChatInput('');
            }}
            className="flex gap-1.5"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Say something to Realm..."
              className="flex-1 rounded-lg bg-[#111624] px-2.5 py-1 text-white border border-white/15"
            />
            <button type="submit" className="rounded-lg bg-[#f4c98b] px-3 py-1 font-bold text-[#241b16]">Send</button>
          </form>
        </div>
      )}

      {/* Collapsible Bottom Storybook Dock + Quick 3D Emote Strip */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          {!dockCollapsed && (
            <div className="storybook-dark-panel rounded-full px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold">
              {(
                [
                  { id: 'wave', label: '1 Wave', icon: Hand },
                  { id: 'cheer', label: '2 Cheer', icon: Trophy },
                  { id: 'meditate', label: '3 Meditate', icon: Sparkles },
                  { id: 'cast', label: '4 Spark', icon: Flame },
                ] as const
              ).map((em) => (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => triggerEmote(em.id)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/15 text-[#f7f0e2]"
                  title={`Play ${em.label} 3D Emote`}
                >
                  <em.icon className="h-3 w-3 text-[#ffd166]" />
                  <span>{em.label}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setDockCollapsed((c) => !c)}
            className="storybook-panel rounded-full px-3 py-1 text-[10px] font-bold flex items-center gap-1"
          >
            {dockCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {dockCollapsed ? 'Show Dock' : 'Hide Dock'}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="storybook-panel rounded-2xl px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 shadow-2xl">
            <button onClick={() => setOverlay({ type: 'duel' })} className="inline-flex items-center gap-1.5 rounded-xl bg-[#d9532f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e3623e]">
              <Swords className="h-3.5 w-3.5" /> Duel
            </button>
            <button onClick={() => setOverlay({ type: 'deck' })} className="inline-flex items-center gap-1.5 rounded-xl bg-[#241b16] px-3 py-2 text-xs font-bold text-[#f4c98b]">
              <BookOpen className="h-3.5 w-3.5" /> Deck &amp; Lectern
            </button>
            <button onClick={() => setOverlay({ type: 'tailor' })} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 text-xs font-bold">
              <Scissors className="h-3.5 w-3.5" /> Tailor
            </button>
            <button onClick={() => setOverlay({ type: 'creatures' })} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 text-xs font-bold">
              <Heart className="h-3.5 w-3.5 text-rose-600" /> Creatures
            </button>
            <button onClick={() => setOverlay({ type: 'sanctuary' })} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 text-xs font-bold">
              <Home className="h-3.5 w-3.5 text-amber-700" /> Dorm
            </button>
            <button onClick={() => setOverlay({ type: 'hub', tab: 'shops' })} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 text-xs font-bold">
              <ShoppingBag className="h-3.5 w-3.5 text-teal-700" /> Campus
            </button>
            <button onClick={() => setChatOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 text-xs font-bold">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </button>
          </div>
        )}
      </div>

      {/* Feature Overlays */}
      {overlay.type === 'duel' && (
        <DuelArenaModal
          wizard={equippedWizard}
          creatures={creatures}
          liveDuelState={liveDuelState}
          spectating={spectating}
          turnDeadline={turnDeadline}
          worldConnected={worldConnected}
          activeLiveDuels={activeLiveDuels}
          solo2xDefault={settings.solo2xDefault}
          signedInSolo={fbUser ? cloudSolo(activeWizard, () => wizardSaves.current) : undefined}
          onCloudSoloSettled={applyCloudSoloSettlement}
          onStartLocalDuel={() => {}}
          onUpdateLocalDuel={() => {}}
          onSubmitLiveAction={(action: TurnActionInput) => {
            return sendWorld({ type: 'duel_action', action, duelId: liveDuelState?.duelId, round: liveDuelState?.round });
          }}
          onQueuePvp={() => sendWorld({ type: 'queue_pvp' })}
          onQueueCoop={() => sendWorld({ type: 'queue_coop' })}
          onSpectateDuel={(duelId) => sendWorld({ type: 'spectate_duel', duelId })}
          onDuelFinished={handleDuelFinished}
          onClose={() => {
            ignoredDuel.current = liveDuelState?.duelId ?? null;
            if (spectating || liveDuelState?.phase === 'planning') sendWorld({ type: 'duel_leave' });
            setSpectating(false);
            setLiveDuelState(null);
            setOverlay({ type: 'none' });
          }}
        />
      )}

      {overlay.type === 'tailor' && (
        <TailorStudioPanel
          onCloudAction={fbUser ? runGameplayAction : undefined}
          wizard={equippedWizard}
          bazaarGear={wallet?.gear}
          realmAccount={realmAccount}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateRealmAccount={(acc) => persistRealmAccount(acc)}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'creatures' && (
        <CreaturesArborPanel
          onCloudAction={fbUser ? runGameplayAction : undefined}
          wizard={activeWizard}
          creatures={creatures}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateCreatures={persistCreatures}
          onRuneCatch={(pet) => {
            if (fbUser) return;
            const updated = applySagaEvent(activeWizard, 'rune-catch');
            setCreatures((list) => list.map((entry) => entry.id === pet.id ? pet : entry));
            persistWizard(updated, [], undefined, [pet]);
          }}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'deck' && (
        <DeckLecternPanel
          onCloudAction={fbUser ? runGameplayAction : undefined}
          wizard={activeWizard}
          activeCreature={activePet}
          onUpdateWizard={(w) => persistWizard(w)}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'sanctuary' && sanctuary && (
        <SanctuaryPanel
          onCloudAction={fbUser ? runGameplayAction : undefined}
          wizard={activeWizard}
          sanctuary={sanctuary}
          galleryImages={galleryImages}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateSanctuary={(s) => persistSanctuary(s)}
          onTourPublished={() => setSanctuary((value) => value ? { ...value, isPublic: true } : value)}
          onCaptureSkyLens={() => void captureSkyLens()}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'hub' && (
        <AcademyModalHub
          onCloudAction={fbUser ? runGameplayAction : undefined}
          initialTab={overlay.tab}
          wizard={activeWizard}
          realmAccount={realmAccount}
          isSignedIn={Boolean(fbUser)}
          wallet={wallet}
          onWallet={updateWallet}
          settings={settings}
          onUpdateSettings={updateSettings}
          onUpdateWizard={(w) => persistWizard(w)}
          onClaimTermTier={claimTermTier}
          onTravelZone={handleZoneChange}
          onSwitchWizardOrRealm={() => { ++worldEntry.current; clearPresence(); setActiveWizard(null); setLiveDuelState(null); }}
          onLinkGoogle={() => void signInWithGooglePopup().catch(() => showToast('Google sign-in could not complete. Try again.'))}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}
    </div>
  );
}

export default App;
