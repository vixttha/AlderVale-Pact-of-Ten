import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { REALMS, rankFromLevel, xpRequiredForLevel, type RealmId } from '../shared/realms.ts';
import { ELEMENTS, type ElementId } from '../shared/elements.ts';
import { CAMPUS_NPCS, CAMPUS_QUESTS, MOUNTS, ZONES, type CampusNpc, type ZoneId } from '../shared/world.ts';
import { computeWizardDerivedStats, type DuelState, type TurnActionInput } from '../shared/combat.ts';
import { SPECIES_BY_ID } from '../shared/creatures.ts';
import type { WizardDocument } from '../shared/economy.ts';
import { RACES } from '../shared/wardrobe.ts';
import { auth, signInWithGooglePopup } from './lib/firebase.ts';
import {
  ensureCloudAccountAndRealm,
  loadCloudCreatures,
  loadCloudSanctuary,
  loadCloudWizardsForRealm,
  loadGuestRealm,
  saveCloudCreature,
  saveCloudRealmAccount,
  saveCloudSanctuary,
  saveCloudWizard,
  saveGuestRealm,
  type OwnedCreature,
  type RealmAccountState,
  type SanctuaryState,
} from './lib/storage.ts';
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
import type { EmoteId, LivePlayerPresence } from '../server/wsHub.ts';

type ActiveOverlay =
  | { type: 'none' }
  | { type: 'duel' }
  | { type: 'tailor' }
  | { type: 'creatures' }
  | { type: 'deck' }
  | { type: 'sanctuary' }
  | { type: 'hub'; tab: HubModalTab };

export function App() {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [selectedRealm, setSelectedRealm] = useState<RealmId>('breeze');
  const [realmAccount, setRealmAccount] = useState<RealmAccountState>(() => loadGuestRealm('breeze').account);
  const [wizards, setWizards] = useState<WizardDocument[]>(() => loadGuestRealm('breeze').wizards);
  const [activeWizard, setActiveWizard] = useState<WizardDocument | null>(null);
  const [creatures, setCreatures] = useState<OwnedCreature[]>([]);
  const [sanctuary, setSanctuary] = useState<SanctuaryState | null>(null);
  const [zone, setZone] = useState<ZoneId>('hub');
  const [overlay, setOverlay] = useState<ActiveOverlay>({ type: 'none' });
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [npcDialog, setNpcDialog] = useState<CampusNpc | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<LivePlayerPresence | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [cantripPulseKey, setCantripPulseKey] = useState(0);

  // Realtime WebSocket State
  const wsRef = useRef<WebSocket | null>(null);
  const captureFnRef = useRef<() => string | null>(() => null);
  const [remotePlayers, setRemotePlayers] = useState<LivePlayerPresence[]>([]);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ senderName: string; text: string; elementId: ElementId }[]>([]);
  const [blockedNames, setBlockedNames] = useState<string[]>([]);
  const blockedNamesRef = useRef<string[]>(blockedNames);
  blockedNamesRef.current = blockedNames;
  const [tradeSession, setTradeSession] = useState<{
    tradeId: string;
    partnerName: string;
    aOfferFlorins: number;
    bOfferFlorins: number;
    aLocked: boolean;
    bLocked: boolean;
  } | null>(null);

  const [settings, setSettings] = useState({
    harpVolume: 0.25,
    sfxVolume: 0.55,
    cameraSensitivity: 1.0,
    solo2xDefault: false,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 4000);
  }, []);

  useEffect(() => {
    academyAudio.setVolumes(settings.harpVolume, settings.sfxVolume);
  }, [settings.harpVolume, settings.sfxVolume]);

  // Load realm state (Cloud if signed in, else Guest localStorage)
  const loadRealmData = useCallback(async (user: User | null, realm: RealmId) => {
    if (!user) {
      const guest = loadGuestRealm(realm);
      setRealmAccount(guest.account);
      setWizards(guest.wizards);
      return;
    }
    const cloudAcc = await ensureCloudAccountAndRealm(user.uid, user.displayName ?? 'Wizard', user.email, realm);
    const cloudWizards = await loadCloudWizardsForRealm(user.uid, realm);

    // Guest-to-Google automatic migration if cloud realm has 0 wizards
    const guest = loadGuestRealm(realm);
    if (cloudWizards.length === 0 && guest.wizards.length > 0) {
      const migrated: WizardDocument[] = [];
      for (const gw of guest.wizards) {
        const ownedWiz: WizardDocument = { ...gw, ownerId: user.uid };
        await saveCloudWizard(ownedWiz, true);
        migrated.push(ownedWiz);
        for (const pet of guest.creatures[gw.id] ?? []) {
          await saveCloudCreature({ ...pet, ownerId: user.uid }, true);
        }
        const gSanc = guest.sanctuaries[gw.id];
        if (gSanc) await saveCloudSanctuary({ ...gSanc, ownerId: user.uid }, true);
      }
      const mergedAcc: RealmAccountState = {
        ...cloudAcc,
        wizardIds: migrated.map((w) => w.id),
        unlockedRaces: Array.from(new Set([...cloudAcc.unlockedRaces, ...guest.account.unlockedRaces])),
        termXp: Math.max(cloudAcc.termXp, guest.account.termXp),
      };
      await saveCloudRealmAccount(user.uid, mergedAcc);
      setRealmAccount(mergedAcc);
      setWizards(migrated);
      showToast('Guest progress migrated to your Google Cloud account!');
      return;
    }

    setRealmAccount(cloudAcc);
    setWizards(cloudWizards);
  }, [showToast]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      void loadRealmData(user, selectedRealm);
    });
    return () => unsub();
  }, [selectedRealm, loadRealmData]);

  const persistWizard = useCallback(
    (next: WizardDocument, isNew = false) => {
      setActiveWizard(next);
      setWizards((prev) => {
        const idx = prev.findIndex((w) => w.id === next.id);
        const list = idx >= 0 ? prev.map((w) => (w.id === next.id ? next : w)) : [...prev, next];
        if (!fbUser) {
          const guest = loadGuestRealm(next.realmId);
          guest.wizards = list;
          saveGuestRealm(next.realmId, guest);
        }
        return list;
      });
      if (fbUser) {
        void saveCloudWizard(next, isNew);
      }
    },
    [fbUser],
  );

  const persistRealmAccount = useCallback(
    (next: RealmAccountState) => {
      setRealmAccount(next);
      if (fbUser) {
        void saveCloudRealmAccount(fbUser.uid, next);
      } else {
        const guest = loadGuestRealm(next.realmId);
        guest.account = next;
        saveGuestRealm(next.realmId, guest);
      }
    },
    [fbUser],
  );

  const persistCreatures = useCallback(
    (nextList: OwnedCreature[], newCreature?: OwnedCreature) => {
      setCreatures(nextList);
      if (!activeWizard) return;
      if (fbUser) {
        if (newCreature) void saveCloudCreature(newCreature, true);
        else nextList.forEach((c) => void saveCloudCreature(c, false));
      } else {
        const guest = loadGuestRealm(activeWizard.realmId);
        guest.creatures[activeWizard.id] = nextList;
        saveGuestRealm(activeWizard.realmId, guest);
      }
    },
    [fbUser, activeWizard],
  );

  const persistSanctuary = useCallback(
    (nextSanc: SanctuaryState, isNew = false) => {
      setSanctuary(nextSanc);
      if (fbUser) {
        void saveCloudSanctuary(nextSanc, isNew);
      } else {
        const guest = loadGuestRealm(nextSanc.realmId);
        guest.sanctuaries[nextSanc.wizardId] = nextSanc;
        saveGuestRealm(nextSanc.realmId, guest);
      }
    },
    [fbUser],
  );

  const enterWorld = async (wiz: WizardDocument) => {
    academyAudio.unlock();
    setActiveWizard(wiz);
    setZone('hub');

    let loadedPets: OwnedCreature[] = [];
    let loadedSanc: SanctuaryState | null = null;
    if (fbUser) {
      loadedPets = await loadCloudCreatures(wiz.id);
      loadedSanc = await loadCloudSanctuary(wiz.id, wiz.realmId);
    } else {
      const guest = loadGuestRealm(wiz.realmId);
      loadedPets = guest.creatures[wiz.id] ?? [];
      loadedSanc = guest.sanctuaries[wiz.id] ?? null;
    }

    if (loadedPets.length === 0) {
      const starterMap: Record<string, string> = {
        ember: 'cinder_kitsune',
        frost: 'rime_stag',
        gale: 'zephyr_owl',
        bramble: 'bramble_sprig',
        tide: 'harbor_kelpie',
        spark: 'spark_lynx_cub',
      };
      const spId = starterMap[wiz.elementId] ?? 'cinder_kitsune';
      const sp = SPECIES_BY_ID[spId];
      const pet: OwnedCreature = {
        id: wiz.activeCreatureId,
        ownerId: wiz.ownerId,
        wizardId: wiz.id,
        realmId: wiz.realmId,
        speciesId: spId,
        nickname: sp.stageNames[0],
        elementId: sp.element,
        stage: 1,
        chromatic: 'none',
        branchChoice: 'A',
        bondXp: 0,
        wins: 0,
        talents: ['tal_sturdy'],
      };
      loadedPets = [pet];
      if (fbUser) void saveCloudCreature(pet, true);
      else {
        const guest = loadGuestRealm(wiz.realmId);
        guest.creatures[wiz.id] = loadedPets;
        saveGuestRealm(wiz.realmId, guest);
      }
    }

    if (!loadedSanc) {
      loadedSanc = {
        ownerId: wiz.ownerId,
        wizardId: wiz.id,
        realmId: wiz.realmId,
        themeId: 'sunlit_loft',
        weatherId: 'clear_breeze',
        isPublic: false,
        items: [],
        gardens: [],
      };
      if (fbUser) void saveCloudSanctuary(loadedSanc, true);
      else {
        const guest = loadGuestRealm(wiz.realmId);
        guest.sanctuaries[wiz.id] = loadedSanc;
        saveGuestRealm(wiz.realmId, guest);
      }
    }

    setCreatures(loadedPets);
    setSanctuary(loadedSanc);
  };

  const handleCreateWizard = async (wiz: WizardDocument) => {
    persistWizard(wiz, true);
    const nextAcc = { ...realmAccount, wizardIds: [...realmAccount.wizardIds, wiz.id].slice(0, 3) };
    persistRealmAccount(nextAcc);
    await enterWorld(wiz);
  };

  // WebSocket Live Realm Sync
  useEffect(() => {
    if (!activeWizard) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;
    const activePet = creatures.find((c) => c.id === activeWizard.activeCreatureId) ?? creatures[0];

    ws.onopen = () => {
      const spawn = ZONES[zone].spawnPos;
      ws.send(
        JSON.stringify({
          type: 'join_world',
          presence: {
            wizardId: activeWizard.id,
            ownerId: activeWizard.ownerId,
            name: activeWizard.name,
            realmId: activeWizard.realmId,
            zone,
            raceId: activeWizard.raceId,
            beastClan: activeWizard.beastClan,
            elementId: activeWizard.elementId,
            level: activeWizard.level,
            rank: activeWizard.rank,
            titleBadge: activeWizard.progression.titleBadge,
            x: spawn[0],
            y: spawn[1],
            z: spawn[2],
            rotY: 0,
            mountId: activeWizard.progression.equippedMountId,
            activeCreatureSpeciesId: activePet?.speciesId ?? 'cinder_kitsune',
            activeCreatureStage: activePet?.stage ?? 1,
            activeCreatureChromatic: activePet?.chromatic ?? 'none',
            sculpt: activeWizard.sculpt,
            equipped: activeWizard.wardrobe.equipped,
            stitching: activeWizard.stitching,
          },
        }),
      );
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as Record<string, unknown>;
        if (data.type === 'welcome') {
          setLocalSessionId(String(data.sessionId ?? ''));
        } else if (data.type === 'zone_snapshot') {
          setRemotePlayers((data.players as LivePlayerPresence[]).filter((p) => p.wizardId !== activeWizard.id));
          setActiveLiveDuels((data.activeDuels as typeof activeLiveDuels) ?? []);
        } else if (data.type === 'player_joined') {
          const p = data.player as LivePlayerPresence;
          if (p.wizardId !== activeWizard.id) {
            setRemotePlayers((prev) => [...prev.filter((x) => x.sessionId !== p.sessionId), p]);
          }
        } else if (data.type === 'player_updated') {
          const p = data.player as LivePlayerPresence;
          if (p.wizardId !== activeWizard.id) {
            setRemotePlayers((prev) => prev.map((x) => (x.sessionId === p.sessionId ? p : x)));
          }
        } else if (data.type === 'player_left') {
          setRemotePlayers((prev) => prev.filter((x) => x.sessionId !== data.sessionId));
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
                    mountId: (data.mountId as string | null) ?? x.mountId,
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
          setChatMessages((prev) => [...prev.slice(-30), { senderName: sender, text, elementId: (data.elementId as ElementId) ?? 'ember' }]);
          if (sid && !blockedNamesRef.current.includes(sender)) {
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
          setLiveDuelState(data.state as DuelState);
          setOverlay({ type: 'duel' });
        } else if (data.type === 'queue_status') {
          showToast(`Joined ${String(data.queue).toUpperCase()} queue (${String(data.count)} waiting in ${activeWizard.realmId})…`);
        } else if (data.type === 'trade_update') {
          const tr = data.trade as { tradeId: string; aOfferFlorins: number; bOfferFlorins: number; aLocked: boolean; bLocked: boolean };
          setTradeSession({ ...tr, partnerName: String(data.partnerName ?? 'Wizard') });
        } else if (data.type === 'trade_complete') {
          const delta = Number(data.deltaFlorins ?? 0);
          setTradeSession(null);
          setActiveWizard((curr) =>
            curr ? { ...curr, currencies: { ...curr.currencies, florins: Math.max(0, curr.currencies.florins + delta) } } : curr,
          );
          showToast(`Trade finalized! (${delta >= 0 ? `+${delta}` : delta} Florins)`);
        }
      } catch {
        // ignore bad frames
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setLocalSessionId(null);
    };
  }, [activeWizard?.id, activeWizard?.realmId]);

  // Broadcast live appearance, mount, race, or companion updates to zone peers
  const activePetForSync = activeWizard
    ? creatures.find((c) => c.id === activeWizard.activeCreatureId) ?? creatures[0]
    : undefined;
  useEffect(() => {
    if (!activeWizard || wsRef.current?.readyState !== WebSocket.OPEN) return;
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
          activeCreatureSpeciesId: activePetForSync?.speciesId ?? 'cinder_kitsune',
          activeCreatureStage: activePetForSync?.stage ?? 1,
          activeCreatureChromatic: activePetForSync?.chromatic ?? 'none',
          sculpt: activeWizard.sculpt,
          equipped: activeWizard.wardrobe.equipped,
          stitching: activeWizard.stitching,
        },
      }),
    );
  }, [
    activeWizard?.raceId,
    activeWizard?.beastClan,
    activeWizard?.level,
    activeWizard?.rank,
    activeWizard?.progression.titleBadge,
    activeWizard?.progression.equippedMountId,
    activeWizard?.sculpt,
    activeWizard?.wardrobe.equipped,
    activeWizard?.stitching,
    activePetForSync?.speciesId,
    activePetForSync?.stage,
    activePetForSync?.chromatic,
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

  const handleDuelFinished = (res: { won: boolean; mode: DuelState['mode']; spireFloor?: number; trialElement?: ElementId }) => {
    setLiveDuelState(null);
    if (!activeWizard) return;
    if (!res.won) {
      showToast('Visit the Commons Fountain to top off your Flasks and try again!');
      return;
    }

    const rCfg = REALMS[activeWizard.realmId];
    const baseXp =
      res.mode === 'trial' ? 180 : res.mode === 'coop' ? 160 : res.mode === 'pvp' ? 140 : 85;
    const gainedXp = Math.round(baseXp * rCfg.xpMultiplier);
    let nextXp = activeWizard.xp + gainedXp;
    let nextLevel = activeWizard.level;
    while (nextXp >= xpRequiredForLevel(nextLevel) && nextLevel < 50) {
      nextXp -= xpRequiredForLevel(nextLevel);
      nextLevel += 1;
    }
    const nextRank = rankFromLevel(nextLevel);

    // Progress Campus Saga Quests cleanly on wins
    const nextCompletedQuests = new Set(activeWizard.progression.completedQuests);
    if (!nextCompletedQuests.has('q_first_duel')) nextCompletedQuests.add('q_first_duel');
    if (res.mode === 'trial' && !nextCompletedQuests.has('q_rare_trial')) nextCompletedQuests.add('q_rare_trial');
    if (res.mode === 'coop' && !nextCompletedQuests.has('q_bond_arbor')) nextCompletedQuests.add('q_bond_arbor');

    // Charge 2-win Hybrid Eggs
    const hatchedPets: OwnedCreature[] = [];
    const nextEggs: typeof activeWizard.progression.eggs = [];
    for (const egg of activeWizard.progression.eggs) {
      const done = egg.winsDone + 1;
      if (done >= egg.winsNeeded) {
        const sp = SPECIES_BY_ID[egg.resultSpeciesId];
        if (sp) {
          hatchedPets.push({
            id: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            ownerId: activeWizard.ownerId,
            wizardId: activeWizard.id,
            realmId: activeWizard.realmId,
            speciesId: sp.id,
            nickname: sp.stageNames[0],
            elementId: sp.element,
            stage: 1,
            chromatic: Math.random() < 0.25 ? 'dawn' : 'none',
            branchChoice: 'A',
            bondXp: 25,
            wins: 0,
            talents: ['tal_spellproof', 'tal_may_blade'],
          });
        }
      } else {
        nextEggs.push({ ...egg, winsDone: done });
      }
    }

    const nextUnlockedElements = [...activeWizard.progression.unlockedElements];
    if (res.trialElement && !nextUnlockedElements.includes(res.trialElement)) {
      nextUnlockedElements.push(res.trialElement);
    }

    // Unlock Prestige Races on Account at Rank 4 / 5 / 7
    const nextUnlockedRaces = new Set(realmAccount.unlockedRaces);
    if (nextRank >= 4 && res.mode === 'trial') {
      nextUnlockedRaces.add('cloud_sylph');
      nextUnlockedRaces.add('dwarf');
      nextUnlockedRaces.add('high_elf');
      nextUnlockedRaces.add('dark_elf');
    }
    if (nextRank >= 5 && creatures.some((c) => SPECIES_BY_ID[c.speciesId]?.isDrake && c.stage === 3)) {
      nextUnlockedRaces.add('draconic_kin');
    }
    if (nextRank >= 7 && hatchedPets.some((p) => SPECIES_BY_ID[p.speciesId]?.isFusionOnly)) {
      nextUnlockedRaces.add('astral_kin');
    }

    persistRealmAccount({
      ...realmAccount,
      unlockedRaces: Array.from(nextUnlockedRaces),
      termXp: realmAccount.termXp + Math.round(65 * rCfg.xpMultiplier),
    });

    const florinWin = Math.round(
      (res.mode === 'trial' ? 140 : res.mode === 'coop' ? 120 : 65) * rCfg.dropMultiplier,
    );
    const updatedWiz: WizardDocument = {
      ...activeWizard,
      level: nextLevel,
      xp: nextXp,
      rank: nextRank,
      currencies: {
        florins: activeWizard.currencies.florins + florinWin,
        honorMarks: activeWizard.currencies.honorMarks + (res.mode === 'pvp' ? 15 : res.mode === 'coop' ? 8 : 4),
        bondingSeals: activeWizard.currencies.bondingSeals + (res.mode === 'trial' || res.mode === 'coop' ? 1 : 0),
        spellShards: activeWizard.currencies.spellShards + 2,
      },
      progression: {
        ...activeWizard.progression,
        completedQuests: Array.from(nextCompletedQuests),
        unlockedElements: nextUnlockedElements,
        spireBestFloor: res.spireFloor ? Math.max(activeWizard.progression.spireBestFloor, res.spireFloor) : activeWizard.progression.spireBestFloor,
        eggs: nextEggs,
        bestiarySeen: Array.from(new Set([...activeWizard.progression.bestiarySeen, ...hatchedPets.map((p) => p.speciesId)])),
      },
    };

    persistWizard(updatedWiz);
    if (hatchedPets.length > 0) {
      persistCreatures([...creatures, ...hatchedPets], hatchedPets[0]);
      showToast(`Victory! +${gainedXp} XP, +${florinWin}F & Hatched ${hatchedPets[0].nickname}!`);
    } else {
      showToast(`Victory! +${gainedXp} XP, +${florinWin} Florins, +2 Spell Shards!`);
    }
  };

  if (!activeWizard) {
    return (
      <TitleWizardStudio
        userEmail={fbUser?.email ?? null}
        isSignedIn={Boolean(fbUser)}
        selectedRealm={selectedRealm}
        realmAccount={realmAccount}
        wizards={wizards}
        onSignInGoogle={() => void signInWithGooglePopup()}
        onSelectRealm={setSelectedRealm}
        onEnterWorld={(w) => void enterWorld(w)}
        onCreateWizard={(w) => void handleCreateWizard(w)}
      />
    );
  }

  const activePet = creatures.find((c) => c.id === activeWizard.activeCreatureId) ?? creatures[0] ?? null;
  const stats = computeWizardDerivedStats({
    level: activeWizard.level,
    raceId: activeWizard.raceId,
    element: activeWizard.elementId,
    equippedGearIds: Object.values(activeWizard.wardrobe.equipped),
    socketedRunestoneIds: activeWizard.wardrobe.socketedRunestones,
    creatureTalents: activePet?.talents ?? [],
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#182033]">
      {/* Full-Viewport 3D Sky-Island World (>=85% unobstructed) */}
      <WorldViewport
        wizard={activeWizard}
        activeCreature={activePet}
        zone={zone}
        dormThemeId={sanctuary?.themeId ?? 'sunlit_loft'}
        dormItems={sanctuary?.items ?? []}
        remotePlayers={remotePlayers}
        completedQuestIds={activeWizard.progression.completedQuests}
        localSessionId={localSessionId}
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
          const owned = activeWizard.progression.ownedMounts;
          const nextMount = activeWizard.progression.equippedMountId ? null : (owned[0] ?? 'mount_cloud_broom');
          persistWizard({
            ...activeWizard,
            progression: { ...activeWizard.progression, equippedMountId: nextMount },
          });
          showToast(nextMount ? `Mounted ${MOUNTS.find((m) => m.id === nextMount)?.name ?? 'Mount'}!` : 'Dismounted.');
        }}
        onInteractHit={handleInteractHit}
        onInspectRemotePlayer={(p) => setInspectedPlayer(p)}
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
            onClick={() => {
              const img = captureFnRef.current();
              if (img) {
                setGalleryImages((prev) => [img, ...prev].slice(0, 9));
                showToast('Sky-Lens 3D Painting saved to your Sanctuary Gallery!');
              }
            }}
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
      {inspectedPlayer && (
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
                wsRef.current?.send(JSON.stringify({ type: 'trade_propose', targetSessionId: inspectedPlayer.sessionId }));
                setInspectedPlayer(null);
              }}
              className="flex-1 rounded-lg bg-[#38a3a5] py-1.5 font-bold text-white"
            >
              Propose Trade
            </button>
            <button
              onClick={() => {
                setBlockedNames((b) => [...b, inspectedPlayer.name]);
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

      {/* Live Dual-Confirm P2P Trade Modal */}
      {tradeSession && (
        <div className="absolute top-20 left-4 w-80 storybook-panel rounded-2xl p-4 text-xs shadow-2xl space-y-2">
          <div className="font-display text-base font-bold">Live Trade: {tradeSession.partnerName}</div>
          <div className="flex items-center justify-between">
            <span>Offer Florins:</span>
            <input
              type="number"
              min={0}
              max={activeWizard.currencies.florins}
              defaultValue={tradeSession.aOfferFlorins}
              onChange={(e) => wsRef.current?.send(JSON.stringify({ type: 'trade_step', tradeId: tradeSession.tradeId, florins: Number(e.target.value) }))}
              className="w-24 rounded border px-2 py-1"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => wsRef.current?.send(JSON.stringify({ type: 'trade_step', tradeId: tradeSession.tradeId, lock: true }))}
              className="flex-1 rounded-lg bg-[#241b16] py-1.5 font-bold text-[#f4c98b]"
            >
              1. Lock Offer
            </button>
            <button
              disabled={!tradeSession.aLocked || !tradeSession.bLocked}
              onClick={() => wsRef.current?.send(JSON.stringify({ type: 'trade_step', tradeId: tradeSession.tradeId, confirm: true }))}
              className="flex-1 rounded-lg bg-[#2f8a73] py-1.5 font-bold text-white disabled:opacity-45"
            >
              2. Final Confirm
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Realm Chat Drawer */}
      {chatOpen && (
        <div className="absolute bottom-20 left-3 w-80 storybook-dark-panel rounded-2xl p-3 text-xs space-y-2">
          <div className="max-h-36 overflow-y-auto space-y-1">
            {chatMessages
              .filter((m) => !blockedNames.includes(m.senderName))
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
          wizard={activeWizard}
          creatures={creatures}
          liveDuelState={liveDuelState}
          activeLiveDuels={activeLiveDuels}
          solo2xDefault={settings.solo2xDefault}
          onStartLocalDuel={() => {}}
          onUpdateLocalDuel={() => {}}
          onSubmitLiveAction={(action: TurnActionInput) => {
            wsRef.current?.send(JSON.stringify({ type: 'duel_action', action }));
          }}
          onQueuePvp={() => wsRef.current?.send(JSON.stringify({ type: 'queue_pvp' }))}
          onQueueCoop={() => wsRef.current?.send(JSON.stringify({ type: 'queue_coop' }))}
          onSpectateDuel={(duelId) => wsRef.current?.send(JSON.stringify({ type: 'spectate_duel', duelId }))}
          onDuelFinished={handleDuelFinished}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'tailor' && (
        <TailorStudioPanel
          wizard={activeWizard}
          realmAccount={realmAccount}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateRealmAccount={(acc) => persistRealmAccount(acc)}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'creatures' && (
        <CreaturesArborPanel
          wizard={activeWizard}
          creatures={creatures}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateCreatures={(list, created) => persistCreatures(list, created)}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'deck' && (
        <DeckLecternPanel
          wizard={activeWizard}
          activeCreature={activePet}
          onUpdateWizard={(w) => persistWizard(w)}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'sanctuary' && sanctuary && (
        <SanctuaryPanel
          wizard={activeWizard}
          sanctuary={sanctuary}
          galleryImages={galleryImages}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateSanctuary={(s) => persistSanctuary(s)}
          onCaptureSkyLens={() => {
            const img = captureFnRef.current();
            if (img) {
              setGalleryImages((prev) => [img, ...prev].slice(0, 9));
              showToast('Captured Sky-Lens 3D Painting!');
            }
          }}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}

      {overlay.type === 'hub' && (
        <AcademyModalHub
          initialTab={overlay.tab}
          wizard={activeWizard}
          realmAccount={realmAccount}
          isSignedIn={Boolean(fbUser)}
          settings={settings}
          onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          onUpdateWizard={(w) => persistWizard(w)}
          onUpdateRealmAccount={(acc) => persistRealmAccount(acc)}
          onTravelZone={handleZoneChange}
          onSwitchWizardOrRealm={() => setActiveWizard(null)}
          onLinkGoogle={() => void signInWithGooglePopup()}
          onClose={() => setOverlay({ type: 'none' })}
        />
      )}
    </div>
  );
}

export default App;
