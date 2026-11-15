import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { clearSceneGroup, disposeScene } from './disposeScene.ts';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { WizardDocument } from '../../shared/economy.ts';
import { CAMPUS_NPCS, CAMPUS_QUESTS, ZONES, type ZoneId } from '../../shared/world.ts';
import { ELEMENTS } from '../../shared/elements.ts';
import type { WizardSculpt } from '../../shared/wardrobe.ts';
import type { OwnedCreature, PlacedDormItem } from '../lib/storage.ts';
import type { EmoteId, LivePlayerPresence } from '../../server/wsHub.ts';
import { buildWizardGroup } from './avatarMesh.ts';
import { clearWizardAvatarSlot, updateRowanHuman } from './races/rowanHuman.ts';
import { buildCreatureGroup, buildMountGroup } from './creatureMesh.ts';
import { buildDormItemsGroup, buildZoneScene, type InteractiveHitTarget } from './zoneBuilders.ts';
import { buildAnimeSkyAndClouds } from './animeShaders.ts';
import { createDormWeather } from './dormWeather.ts';
import { academyAudio } from './audioSynth.ts';

export interface WorldViewportProps {
  wizard: WizardDocument;
  activeCreature: OwnedCreature | null;
  zone: ZoneId;
  dormThemeId: string;
  dormWeatherId: string;
  dormItems: PlacedDormItem[];
  remotePlayers: LivePlayerPresence[];
  completedQuestIds?: string[];
  localSessionId?: string | null;
  localEmote?: { emote: EmoteId; until: number } | null;
  remoteEmoteEvent?: { sessionId: string; emote: EmoteId; until: number; seq: number } | null;
  chatBubbleEvent?: { sessionId: string; senderName: string; text: string; until: number; seq: number } | null;
  cameraSensitivity: number;
  cantripPulseKey: number;
  onMoveBroadcast: (x: number, y: number, z: number, rotY: number) => void;
  onPlayerMoveSample?: (sample: { x: number; z: number; rotY: number }) => void;
  onToggleMount: () => void;
  onInteractHit: (hit: InteractiveHitTarget) => void;
  onInspectRemotePlayer: (player: LivePlayerPresence) => void;
  onRegisterCaptureFn: (fn: () => string | null) => void;
}

// Pre-allocated zero-GC helpers for the per-frame render loop
const _targetPos = new THREE.Vector3();
const _petTarget = new THREE.Vector3();
const _remotePetTarget = new THREE.Vector3();
const _dummyPetal = new THREE.Object3D();
const _projVec = new THREE.Vector3();
const _tmpWorldPos = new THREE.Vector3();

const DEFAULT_REMOTE_SCULPT: WizardSculpt = {
  height: 1.0,
  build: 'balanced',
  skinHex: '#e6bda0',
  hairStyle: 'Windblown Shag',
  hairHex: '#3a2c24',
  hairTipHex: '#ffd166',
  eyeShape: 'bright',
  eyeLeftHex: '#3b82c4',
  eyeRightHex: '#3b82c4',
  browStyle: 'arched',
  marking: 'none',
  primaryDye: '#3b6a94',
  trimDye: '#d4a13e',
  accentDye: '#7de2d1',
  castPose: 'scholar',
};

const DEFAULT_REMOTE_EQUIPPED: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string> = {
  headgear: 'hat_academy_cap',
  torso: 'torso_bomber',
  back: 'back_satchel',
  footwear: 'boots_sneakers',
  staff: 'staff_oak_wand',
};

const QUEST_BY_NPC_NAME: Record<string, string> = {};
for (const q of CAMPUS_QUESTS) {
  QUEST_BY_NPC_NAME[q.giverNpc] = q.id;
}

const EMOTE_LABELS: Record<EmoteId, string> = {
  wave: 'Waving',
  cheer: 'Cheering!',
  meditate: 'Meditating',
  cast: 'Sky-Spark!',
};

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function getRemoteAppearanceKey(rp: LivePlayerPresence): string {
  return JSON.stringify([
    rp.raceId,
    rp.beastClan ?? 'ember_fox',
    rp.elementId,
    rp.sculpt ?? null,
    rp.equipped ?? null,
    rp.stitching ?? null,
  ]);
}

function getRemoteCreatureKey(rp: LivePlayerPresence): string {
  return `${rp.activeCreatureSpeciesId}:${rp.activeCreatureStage}:${rp.activeCreatureChromatic}`;
}

export const WorldViewport: React.FC<WorldViewportProps> = ({
  wizard,
  activeCreature,
  zone,
  dormThemeId,
  dormWeatherId,
  dormItems,
  remotePlayers,
  completedQuestIds = [],
  localSessionId = null,
  localEmote = null,
  remoteEmoteEvent = null,
  chatBubbleEvent = null,
  cameraSensitivity,
  cantripPulseKey,
  onMoveBroadcast,
  onPlayerMoveSample,
  onToggleMount,
  onInteractHit,
  onInspectRemotePlayer,
  onRegisterCaptureFn,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nameplatesLayerRef = useRef<HTMLDivElement | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [graphicsAttempt, setGraphicsAttempt] = useState(0);
  const weatherRef = useRef(dormWeatherId);
  weatherRef.current = dormWeatherId;
  const captureRegistration = useRef(onRegisterCaptureFn);
  captureRegistration.current = onRegisterCaptureFn;
  const [contextLost, setContextLost] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<{ label: string; sub?: string } | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<InteractiveHitTarget | null>(null);

  const propsRef = useRef({
    onMoveBroadcast,
    onPlayerMoveSample,
    onToggleMount,
    onInteractHit,
    onInspectRemotePlayer,
    cameraSensitivity,
  });
  propsRef.current = {
    onMoveBroadcast,
    onPlayerMoveSample,
    onToggleMount,
    onInteractHit,
    onInspectRemotePlayer,
    cameraSensitivity,
  };

  const remotePlayersRef = useRef<LivePlayerPresence[]>(remotePlayers);
  remotePlayersRef.current = remotePlayers;

  const completedQuestsRef = useRef<string[]>(completedQuestIds);
  completedQuestsRef.current = completedQuestIds;

  const localSessionIdRef = useRef<string | null>(localSessionId);
  localSessionIdRef.current = localSessionId;

  const localEmoteRef = useRef<{ emote: EmoteId; until: number } | null>(localEmote);
  localEmoteRef.current = localEmote;

  const remoteEmotesRef = useRef<Map<string, { emote: EmoteId; until: number }>>(new Map());
  useEffect(() => {
    if (remoteEmoteEvent) {
      remoteEmotesRef.current.set(remoteEmoteEvent.sessionId, {
        emote: remoteEmoteEvent.emote,
        until: remoteEmoteEvent.until,
      });
    }
  }, [remoteEmoteEvent]);

  const chatBubblesRef = useRef<Map<string, { text: string; until: number }>>(new Map());
  useEffect(() => {
    if (chatBubbleEvent) {
      chatBubblesRef.current.set(chatBubbleEvent.sessionId, {
        text: chatBubbleEvent.text,
        until: chatBubbleEvent.until,
      });
    }
  }, [chatBubbleEvent]);

  const equippedMountRef = useRef<string | null>(wizard.progression.equippedMountId);
  equippedMountRef.current = wizard.progression.equippedMountId;

  const nearbyHitRef = useRef<InteractiveHitTarget | null>(null);

  // Persistent Scene Slot Refs for seamless zero-rebuild hot-swapping
  const avatarSlotRef = useRef<THREE.Group | null>(null);
  const mountSlotRef = useRef<THREE.Group | null>(null);
  const creatureSlotRef = useRef<THREE.Group | null>(null);
  const playerContainerRef = useRef<THREE.Group | null>(null);
  const dormSlotRef = useRef<THREE.Group | null>(null);
  const dormInteractablesRef = useRef<{ object: THREE.Object3D; hit: InteractiveHitTarget }[]>([]);
  const maxAnisoRef = useRef<number>(4);

  const cantripEffectRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => {
    if (cantripPulseKey > 0 && cantripEffectRef.current) {
      cantripEffectRef.current.visible = true;
      cantripEffectRef.current.scale.setScalar(0.4);
    }
  }, [cantripPulseKey]);

  // Main WebGL Scene Lifecycle — ONLY rebuilds when changing physical Zone or Dorm Sky Theme!
  useEffect(() => {
    const container = containerRef.current;
    const nameplatesLayer = nameplatesLayerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      captureRegistration.current(() => null);
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    setContextLost(false);
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Paravirtual/i.test(rendererStr);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    maxAnisoRef.current = maxAniso;

    const isNight = zone === 'sanctuary' && dormThemeId === 'nocturne_observatory';
    const fogColor = isNight ? '#1b223d' : '#cde4f7';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(fogColor, 0.0085);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = environmentTarget.texture;
    roomEnv.dispose();

    // Anime Warm Key + Cool Hemisphere Sky/Ground Rig
    const sun = new THREE.DirectionalLight(isNight ? '#b5c8ff' : '#fff3db', isNight ? 1.45 : 2.05);
    sun.position.set(18, 30, 14);
    sun.castShadow = !isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(isNight ? '#5974b8' : '#b7e2ff', isNight ? '#242942' : '#7b6855', 0.78));

    const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.2, 260);

    // Anime Sky-Dome, Astrolabe Rings, Cloud Sea & Drifting Petals
    const skyHandles = buildAnimeSkyAndClouds(isNight);
    scene.add(skyHandles.root);
    const dormWeather = zone === 'sanctuary' ? createDormWeather() : null;
    if (dormWeather) scene.add(dormWeather.points);

    // Build Zone Diorama
    const builtZone = buildZoneScene({ zone, dormThemeId, dormItems, maxAnisotropy: maxAniso });
    scene.add(builtZone.group);
    dormSlotRef.current = builtZone.dormSlot;

    // Player Wizard Container + Hot-Swappable Slots
    const playerContainer = new THREE.Group();
    const spawn = ZONES[zone].spawnPos;
    playerContainer.position.set(spawn[0], spawn[1], spawn[2]);
    scene.add(playerContainer);
    playerContainerRef.current = playerContainer;

    const avatarSlot = new THREE.Group();
    playerContainer.add(avatarSlot);
    avatarSlotRef.current = avatarSlot;

    const mountSlot = new THREE.Group();
    playerContainer.add(mountSlot);
    mountSlotRef.current = mountSlot;

    const cantripRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.38, 36),
      new THREE.MeshBasicMaterial({ color: '#ffd166', side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
    );
    cantripRing.rotation.x = -Math.PI / 2;
    cantripRing.position.y = 0.08;
    cantripRing.visible = false;
    cantripRing.userData.noOutline = true;
    playerContainer.add(cantripRing);
    cantripEffectRef.current = cantripRing;

    const creatureSlot = new THREE.Group();
    creatureSlot.position.set(spawn[0] - 1.35, 0, spawn[2] + 1.25);
    scene.add(creatureSlot);
    creatureSlotRef.current = creatureSlot;

    if (wizard.progression.equippedMountId) {
      mountSlot.add(buildMountGroup(wizard.progression.equippedMountId));
      avatarSlot.position.y = 0.36;
    }
    if (activeCreature) {
      creatureSlot.add(
        buildCreatureGroup({
          speciesId: activeCreature.speciesId,
          stage: activeCreature.stage,
          chromatic: activeCreature.chromatic,
        }),
      );
    }

    // Post-Processing (Anime Bloom on Hardware GPU only)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.3,
        0.45,
        0.92,
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      renderer.compile(scene, camera);
    }

    captureRegistration.current(() => {
      try {
        if (composer) composer.render();
        else renderer.render(scene, camera);
        const source = renderer.domElement;
        const picture = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(source.width, source.height));
        picture.width = Math.max(1, Math.round(source.width * scale));
        picture.height = Math.max(1, Math.round(source.height * scale));
        const context = picture.getContext('2d');
        if (!context) return null;
        context.drawImage(source, 0, 0, picture.width, picture.height);
        const image = picture.toDataURL('image/jpeg', 0.62);
        return image.startsWith('data:image/jpeg;base64,') && image.length <= 90_000 ? image : null;
      } catch {
        return null;
      }
    });

    const handleLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleRestored);

    // Remote Players Map (with real Wardrobe, Mount & Companion Creature sync)
    const remoteMeshes = new Map<
      string,
      {
        root: THREE.Group;
        avatarSlot: THREE.Group;
        mountSlot: THREE.Group;
        creatureSlot: THREE.Group;
        player: LivePlayerPresence;
        prevX: number;
        prevZ: number;
        appearanceKey: string;
        mountKey: string;
        creatureKey: string;
      }
    >();

    // Pooled 60fps Overhead DOM Nameplates
    const nameplateNodes = new Map<string, HTMLDivElement>();
    const zoneNpcs = CAMPUS_NPCS.filter((n) => n.zone === zone);

    function getOrCreatePlate(key: string): HTMLDivElement | null {
      if (!nameplatesLayer) return null;
      let el = nameplateNodes.get(key);
      if (!el) {
        el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.willChange = 'transform';
        el.style.pointerEvents = 'none';
        nameplatesLayer.appendChild(el);
        nameplateNodes.set(key, el);
      }
      return el;
    }

    function removePlate(key: string) {
      const el = nameplateNodes.get(key);
      if (el) {
        el.remove();
        nameplateNodes.delete(key);
      }
    }

    function projectPlate(el: HTMLDivElement, wx: number, wy: number, wz: number, width: number, height: number, maxDist = 36) {
      const dist = Math.hypot(wx - camera.position.x, wy - camera.position.y, wz - camera.position.z);
      _projVec.set(wx, wy, wz).project(camera);
      if (_projVec.z >= 1 || _projVec.z < -1 || dist > maxDist) {
        el.style.display = 'none';
        return;
      }
      const sx = (_projVec.x * 0.5 + 0.5) * width;
      const sy = (-_projVec.y * 0.5 + 0.5) * height;
      if (sx < -100 || sx > width + 100 || sy < -60 || sy > height + 60) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'flex';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }

    // Controls & Physics State
    const keys = new Set<string>();
    let yaw = 0;
    let pitch = 0.42;
    let zoomDist = 8.6;
    let targetZoomDist = 8.6;
    let camPosX = spawn[0];
    let camPosY = spawn[1] + 5;
    let camPosZ = spawn[2] + 8;
    let desiredFacing = 0;
    let jumpVelY = 0;
    let playerY = 0;
    let dragging = false;
    let movedDuringDrag = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastNetEmit = 0;
    let lastMapSample = 0;
    let lastProximityCheck = 0;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const getAllInteractables = () => [...builtZone.interactables, ...dormInteractablesRef.current];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === 'm') {
        propsRef.current.onToggleMount();
      } else if (k === 'e' && nearbyHitRef.current) {
        propsRef.current.onInteractHit(nearbyHitRef.current);
      } else if (k === ' ' && playerY <= 0.01) {
        jumpVelY = 6.6;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };
    const onPointerDown = (e: PointerEvent) => {
      academyAudio.unlock();
      dragging = true;
      movedDuringDrag = false;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (dragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedDuringDrag = true;
        const sens = 0.0055 * propsRef.current.cameraSensitivity;
        yaw -= dx * sens;
        pitch = Math.max(0.14, Math.min(1.15, pitch + dy * sens));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const all = getAllInteractables();
      const hits = raycaster.intersectObjects(
        all.map((i) => i.object),
        true,
      );
      if (hits.length > 0) {
        const top = all.find((i) => isDescendant(hits[0].object, i.object));
        setHoverLabel(top ? { label: top.hit.label, sub: top.hit.subLabel } : null);
      } else {
        setHoverLabel(null);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (dragging && !movedDuringDrag) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        // Check remote players first for Click-to-Inspect
        const remoteObjs = Array.from(remoteMeshes.values()).map((r) => r.root);
        const rHits = raycaster.intersectObjects(remoteObjs, true);
        if (rHits.length > 0) {
          for (const entry of remoteMeshes.values()) {
            if (isDescendant(rHits[0].object, entry.root)) {
              propsRef.current.onInspectRemotePlayer(entry.player);
              dragging = false;
              return;
            }
          }
        }

        const all = getAllInteractables();
        const hits = raycaster.intersectObjects(
          all.map((i) => i.object),
          true,
        );
        if (hits.length > 0) {
          const top = all.find((i) => isDescendant(hits[0].object, i.object));
          if (top) propsRef.current.onInteractHit(top.hit);
        }
      }
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      targetZoomDist = Math.max(4.5, Math.min(19, targetZoomDist + e.deltaY * 0.008));
    };

    const releaseKeys = () => keys.clear();
    window.addEventListener('blur', releaseKeys);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
      if (bloomPass) bloomPass.resolution.set(w, h);
    });
    resizeObserver.observe(container);

    let disposed = false;
    let rafId = 0;
    let timeoutId = 0;
    let pendingFence: WebGLSync | null = null;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      pendingFence = sync;
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          pendingFence = null;
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          pendingFence = null;
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    function step() {
      if (disposed || !container) return;
      const now = performance.now();
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = now * 0.001;
      dormWeather?.update(weatherRef.current, dt, elapsed);
      const t = now * 0.004;

      // Sync remote player meshes cleanly (full Wardrobe, Mount & Companion Creature sync)
      const activeIds = new Set(remotePlayersRef.current.map((p) => p.sessionId));
      for (const [sid, entry] of remoteMeshes.entries()) {
        if (!activeIds.has(sid)) {
          clearWizardAvatarSlot(entry.avatarSlot);
          disposeScene(entry.root);
          disposeScene(entry.creatureSlot);
          scene.remove(entry.root);
          scene.remove(entry.creatureSlot);
          remoteMeshes.delete(sid);
          removePlate(`remote:${sid}`);
        }
      }
      for (const rp of remotePlayersRef.current) {
        let entry = remoteMeshes.get(rp.sessionId);
        const appKey = getRemoteAppearanceKey(rp);
        const mKey = rp.mountId ?? '';
        const cKey = getRemoteCreatureKey(rp);

        if (!entry) {
          const root = new THREE.Group();
          const rAvatarSlot = new THREE.Group();
          const rMountSlot = new THREE.Group();
          root.add(rAvatarSlot, rMountSlot);
          root.position.set(rp.x, rp.y, rp.z);
          scene.add(root);

          const rCreatureSlot = new THREE.Group();
          rCreatureSlot.position.set(rp.x - 1.25, 0.08, rp.z + 1.25);
          scene.add(rCreatureSlot);

          entry = {
            root,
            avatarSlot: rAvatarSlot,
            mountSlot: rMountSlot,
            creatureSlot: rCreatureSlot,
            player: rp,
            prevX: rp.x,
            prevZ: rp.z,
            appearanceKey: '',
            mountKey: '__init__',
            creatureKey: '',
          };
          remoteMeshes.set(rp.sessionId, entry);
        }

        if (entry.appearanceKey !== appKey) {
          clearWizardAvatarSlot(entry.avatarSlot);
          entry.avatarSlot.add(
            buildWizardGroup({
              raceId: rp.raceId,
              beastClan: rp.beastClan,
              elementId: rp.elementId,
              sculpt: rp.sculpt ?? DEFAULT_REMOTE_SCULPT,
              equipped: rp.equipped ?? DEFAULT_REMOTE_EQUIPPED,
              stitching: rp.stitching,
            }),
          );
          entry.appearanceKey = appKey;
        }

        if (entry.mountKey !== mKey) {
          clearSceneGroup(entry.mountSlot);
          if (rp.mountId) {
            entry.mountSlot.add(buildMountGroup(rp.mountId));
            entry.avatarSlot.position.y = 0.36;
          } else {
            entry.avatarSlot.position.y = 0;
          }
          entry.mountKey = mKey;
        }

        if (entry.creatureKey !== cKey) {
          clearSceneGroup(entry.creatureSlot);
          entry.creatureSlot.add(
            buildCreatureGroup({
              speciesId: rp.activeCreatureSpeciesId,
              stage: rp.activeCreatureStage,
              chromatic: rp.activeCreatureChromatic,
            }),
          );
          entry.creatureKey = cKey;
        }

        entry.player = rp;
        _targetPos.set(rp.x, rp.y, rp.z);
        entry.root.position.lerp(_targetPos, 1 - Math.exp(-10 * dt));
        entry.root.rotation.y = dampAngle(entry.root.rotation.y, rp.rotY, 12, dt);

        const distMoved = Math.hypot(entry.root.position.x - entry.prevX, entry.root.position.z - entry.prevZ);
        entry.prevX = entry.root.position.x;
        entry.prevZ = entry.root.position.z;

        const rEmoteInfo = remoteEmotesRef.current.get(rp.sessionId);
        const rEmote = rEmoteInfo && now < rEmoteInfo.until ? rEmoteInfo.emote : null;
        if (entry.avatarSlot.children[0]) {
          animateWizardRig(entry.avatarSlot.children[0], distMoved > 0.015, t, 1.0, rEmote, dt, rp.y > 0.02, Boolean(rp.mountId));
        }

        // Remote companion follow + animation
        _remotePetTarget.set(
          entry.root.position.x - Math.sin(entry.root.rotation.y) * 1.55 + 0.55,
          0.08 + Math.abs(Math.sin(t * 1.4)) * 0.12,
          entry.root.position.z - Math.cos(entry.root.rotation.y) * 1.55,
        );
        entry.creatureSlot.position.lerp(_remotePetTarget, 1 - Math.exp(-6.5 * dt));
        entry.creatureSlot.lookAt(entry.root.position.x, entry.creatureSlot.position.y, entry.root.position.z);
        if (entry.creatureSlot.children[0]) {
          animateCreatureRig(entry.creatureSlot.children[0], t, dt);
        }
      }

      // Local WASD + Arrow Movement + Shift Sprint + Space Jump
      let moveForward = 0;
      let moveRight = 0;
      if (keys.has('w') || keys.has('arrowup')) moveForward += 1;
      if (keys.has('s') || keys.has('arrowdown')) moveForward -= 1;
      if (keys.has('a') || keys.has('arrowleft')) moveRight -= 1;
      if (keys.has('d') || keys.has('arrowright')) moveRight += 1;

      const isMounted = Boolean(equippedMountRef.current);
      const sprinting = keys.has('shift');
      const speedMult = (isMounted ? 1.48 : 1.0) * (sprinting ? 1.32 : 1.0);
      const moving = moveForward !== 0 || moveRight !== 0;

      if (moving) {
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        const rgtX = Math.cos(yaw);
        const rgtZ = -Math.sin(yaw);
        const len = Math.hypot(moveForward, moveRight) || 1;
        const dx = ((fwdX * moveForward + rgtX * moveRight) / len) * 6.8 * speedMult * dt;
        const dz = ((fwdZ * moveForward + rgtZ * moveRight) / len) * 6.8 * speedMult * dt;

        const maxRadius = zone === 'sanctuary' ? 12.2 : 21.5;
        const nx = playerContainer.position.x + dx;
        const nz = playerContainer.position.z + dz;
        if (Math.hypot(nx, nz) <= maxRadius) {
          playerContainer.position.x = nx;
          playerContainer.position.z = nz;
        }
        desiredFacing = Math.atan2(dx, dz);

        if (now - lastNetEmit > 110) {
          lastNetEmit = now;
          propsRef.current.onMoveBroadcast(
            playerContainer.position.x,
            playerContainer.position.y,
            playerContainer.position.z,
            playerContainer.rotation.y,
          );
        }
      }

      // Smooth Jump & Turning
      if (playerY > 0 || jumpVelY > 0) {
        playerY += jumpVelY * dt;
        jumpVelY -= 19.5 * dt;
        if (playerY <= 0) {
          playerY = 0;
          jumpVelY = 0;
        }
      }
      playerContainer.position.y = playerY;
      playerContainer.rotation.y = dampAngle(playerContainer.rotation.y, desiredFacing, 14, dt);

      // Animate Wizard Stride / Breathing / Cloak / Wings / Emote
      const activeLocalEmote =
        localEmoteRef.current && now < localEmoteRef.current.until ? localEmoteRef.current.emote : null;
      const localAvatar = avatarSlot.children[0];
      if (localAvatar) {
        animateWizardRig(localAvatar, moving && playerY <= 0.02, t, sprinting ? 1.35 : 1.0, activeLocalEmote, dt, playerY > 0.02, isMounted);
        container.dataset.worldAvatarModel = String(localAvatar.userData.humanModel ?? 'procedural');
        container.dataset.worldAvatarClip = String(localAvatar.userData.humanClip ?? '');
      }

      // Animate Lead Creature Follow + Wings / Tail / Gear / Halo
      if (creatureSlot.children.length > 0) {
        _petTarget.set(
          playerContainer.position.x - Math.sin(playerContainer.rotation.y) * 1.65 + 0.65,
          0.08 + Math.abs(Math.sin(t * 1.4)) * 0.12,
          playerContainer.position.z - Math.cos(playerContainer.rotation.y) * 1.65,
        );
        creatureSlot.position.lerp(_petTarget, 1 - Math.exp(-6.5 * dt));
        creatureSlot.lookAt(playerContainer.position.x, creatureSlot.position.y, playerContainer.position.z);
        animateCreatureRig(creatureSlot.children[0], t, dt);
      }

      // Animate Sky Dome, Astrolabe, Cloud Sea & Drifting Petals
      skyHandles.skyMat.uniforms.uTime.value = elapsed;
      skyHandles.astrolabeRings.forEach((r, idx) => {
        r.rotation.y += dt * (idx === 0 ? 0.04 : -0.028);
      });
      for (const cloud of skyHandles.cloudClusters) {
        cloud.angle += cloud.speed * dt;
        cloud.group.position.x = Math.cos(cloud.angle) * cloud.radius;
        cloud.group.position.z = Math.sin(cloud.angle) * cloud.radius;
        cloud.group.position.y = cloud.baseY + Math.sin(elapsed * 0.45 + cloud.angle) * 0.6;
      }
      for (let i = 0; i < skyHandles.petalData.length; i++) {
        const pd = skyHandles.petalData[i];
        const py = ((pd.y - elapsed * pd.speed * 0.7) % 8.5 + 8.5) % 8.5 + 0.2;
        const px = pd.x + Math.sin(elapsed * 0.8 + pd.phase) * 0.9;
        const pz = pd.z + Math.cos(elapsed * 0.65 + pd.phase) * 0.9;
        _dummyPetal.position.set(px, py, pz);
        _dummyPetal.rotation.set(elapsed + pd.phase, elapsed * 1.3, pd.phase);
        _dummyPetal.updateMatrix();
        skyHandles.petals.setMatrixAt(i, _dummyPetal.matrix);
      }
      skyHandles.petals.instanceMatrix.needsUpdate = true;

      // Animate Portals, Floating Crystals, Wisps & Water Textures
      for (const item of builtZone.animatedObjects) {
        item.mesh.position.y = item.baseY + Math.sin(t * item.speed) * 0.2;
        item.mesh.rotation.y += dt * (item.spin ? 1.15 : 0.45);
      }
      for (const wtex of builtZone.waterTextures) {
        wtex.offset.y -= dt * 0.42;
      }

      if (cantripRing.visible) {
        const s = cantripRing.scale.x + dt * 6.5;
        cantripRing.scale.setScalar(s);
        if (s > 5.5) cantripRing.visible = false;
      }

      // Exponentially Damped Camera Follow + Subtle Mount FOV Rush
      zoomDist = THREE.MathUtils.damp(zoomDist, targetZoomDist, 10, dt);
      const targetFov = isMounted && moving ? 57 : 52;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
        camera.updateProjectionMatrix();
      }
      const desiredCamX = playerContainer.position.x + Math.sin(yaw) * Math.cos(pitch) * zoomDist;
      const desiredCamY = playerContainer.position.y + 1.45 + Math.sin(pitch) * zoomDist;
      const desiredCamZ = playerContainer.position.z + Math.cos(yaw) * Math.cos(pitch) * zoomDist;

      camPosX = THREE.MathUtils.damp(camPosX, desiredCamX, 14, dt);
      camPosY = THREE.MathUtils.damp(camPosY, desiredCamY, 14, dt);
      camPosZ = THREE.MathUtils.damp(camPosZ, desiredCamZ, 14, dt);
      camera.position.set(camPosX, camPosY, camPosZ);
      camera.lookAt(playerContainer.position.x, playerContainer.position.y + 1.15, playerContainer.position.z);

      // Minimap sample (~12Hz)
      if (now - lastMapSample > 85) {
        lastMapSample = now;
        propsRef.current.onPlayerMoveSample?.({
          x: playerContainer.position.x,
          z: playerContainer.position.z,
          rotY: playerContainer.rotation.y,
        });
      }

      // Proximity [E] Interactable Check (~8Hz)
      if (now - lastProximityCheck > 120) {
        lastProximityCheck = now;
        const all = getAllInteractables();
        let bestHit: InteractiveHitTarget | null = null;
        let bestDist = 3.75;
        for (const item of all) {
          item.object.getWorldPosition(_tmpWorldPos);
          const d = Math.hypot(
            _tmpWorldPos.x - playerContainer.position.x,
            _tmpWorldPos.z - playerContainer.position.z,
          );
          if (d < bestDist) {
            bestDist = d;
            bestHit = item.hit;
          }
        }
        if (bestHit?.id !== nearbyHitRef.current?.id) {
          nearbyHitRef.current = bestHit;
          setNearbyPrompt(bestHit);
        }
      }

      // 60fps Direct-DOM Projected Overhead Nameplates & Speech Bubbles
      const vpW = container?.clientWidth ?? 0;
      const vpH = container?.clientHeight ?? 0;
      if (nameplatesLayer && vpW > 0 && vpH > 0) {
        // 1. NPC Nameplates + Gold Quest `!` Marker
        for (const npc of zoneNpcs) {
          const el = getOrCreatePlate(`npc:${npc.id}`);
          if (!el) continue;
          const qId = QUEST_BY_NPC_NAME[npc.name];
          const hasQuest = Boolean(qId && !completedQuestsRef.current.includes(qId));
          const elHex = ELEMENTS[npc.elementId].glowHex;
          const nextSig = `npc:${npc.name}:${hasQuest ? '1' : '0'}`;
          if (el.dataset.sig !== nextSig) {
            el.dataset.sig = nextSig;
            el.className = 'flex flex-col items-center gap-0.5';
            el.innerHTML = '';
            if (hasQuest) {
              const qBadge = document.createElement('span');
              qBadge.className =
                'rounded-full bg-[#ffd166] px-2 py-0.5 text-[11px] font-black text-[#241b16] shadow-md border border-[#8a5d11]';
              qBadge.textContent = '! Quest';
              el.appendChild(qBadge);
            }
            const pill = document.createElement('div');
            pill.className =
              'rounded-lg bg-[#182033]/92 px-2 py-0.5 text-center border border-[#d7c7a9]/45 shadow-md';
            const nameSpan = document.createElement('div');
            nameSpan.className = 'text-[11px] font-bold text-[#fbf6ec] leading-tight whitespace-nowrap';
            nameSpan.textContent = npc.name;
            const roleSpan = document.createElement('div');
            roleSpan.className = 'text-[9px] font-semibold leading-tight whitespace-nowrap';
            roleSpan.style.color = elHex;
            roleSpan.textContent = npc.role;
            pill.appendChild(nameSpan);
            pill.appendChild(roleSpan);
            el.appendChild(pill);
          }
          projectPlate(el, npc.position[0], 2.55, npc.position[2], vpW, vpH, 34);
        }

        // 2. Remote Player Nameplates + Speech Bubbles + Emotes + In-Duel Pill
        for (const [sid, entry] of remoteMeshes.entries()) {
          const el = getOrCreatePlate(`remote:${sid}`);
          if (!el) continue;
          const rp = entry.player;
          const bubble = chatBubblesRef.current.get(sid);
          const bubbleText = bubble && now < bubble.until ? bubble.text : '';
          const emoteEntry = remoteEmotesRef.current.get(sid);
          const emoteText = emoteEntry && now < emoteEntry.until ? EMOTE_LABELS[emoteEntry.emote] : '';

          const nextSig = `${rp.name}|${rp.level}|${rp.titleBadge}|${rp.inDuel ? 1 : 0}|${bubbleText}|${emoteText}`;
          if (el.dataset.sig !== nextSig) {
            el.dataset.sig = nextSig;
            el.className = 'flex flex-col items-center gap-1';
            el.innerHTML = '';

            if (bubbleText) {
              const bDiv = document.createElement('div');
              bDiv.className =
                'max-w-[180px] rounded-xl bg-[#fbf6ec] px-2.5 py-1 text-[11px] font-semibold text-[#241b16] border border-[#d7c7a9] shadow-lg text-center break-words';
              bDiv.textContent = bubbleText;
              el.appendChild(bDiv);
            }
            if (emoteText) {
              const eDiv = document.createElement('div');
              eDiv.className =
                'rounded-full bg-[#38a3a5] px-2 py-0.5 text-[10px] font-bold text-white shadow';
              eDiv.textContent = emoteText;
              el.appendChild(eDiv);
            }

            const tag = document.createElement('button');
            tag.type = 'button';
            tag.style.pointerEvents = 'auto';
            tag.className =
              'flex items-center gap-1.5 rounded-lg bg-[#121829]/90 px-2 py-0.5 text-[11px] font-bold text-[#f7f0e2] border border-[#7de2d1]/45 shadow-md hover:border-[#ffd166]';
            tag.onclick = () => propsRef.current.onInspectRemotePlayer(entry.player);

            const nSpan = document.createElement('span');
            nSpan.textContent = rp.name;
            const lvSpan = document.createElement('span');
            lvSpan.className = 'text-[10px] font-mono-num text-[#ffd166]';
            lvSpan.textContent = `Lv.${rp.level}`;
            tag.appendChild(nSpan);
            tag.appendChild(lvSpan);

            if (rp.inDuel) {
              const dSpan = document.createElement('span');
              dSpan.className = 'rounded bg-[#d9532f] px-1 text-[9px] font-bold text-white';
              dSpan.textContent = 'Duel';
              tag.appendChild(dSpan);
            }
            el.appendChild(tag);
          }

          projectPlate(
            el,
            entry.root.position.x,
            entry.root.position.y + (rp.mountId ? 2.75 : 2.38),
            entry.root.position.z,
            vpW,
            vpH,
            38,
          );
        }

        // 3. Local Player Speech / Emote Bubble (shown only while chatting or emoting)
        const mySid = localSessionIdRef.current;
        const myBubble = mySid ? chatBubblesRef.current.get(mySid) : undefined;
        const myBubbleText = myBubble && now < myBubble.until ? myBubble.text : '';
        const myEmoteText = activeLocalEmote ? EMOTE_LABELS[activeLocalEmote] : '';

        if (myBubbleText || myEmoteText) {
          const el = getOrCreatePlate('local:self');
          if (el) {
            const nextSig = `${myBubbleText}|${myEmoteText}`;
            if (el.dataset.sig !== nextSig) {
              el.dataset.sig = nextSig;
              el.className = 'flex flex-col items-center gap-1';
              el.innerHTML = '';
              if (myBubbleText) {
                const bDiv = document.createElement('div');
                bDiv.className =
                  'max-w-[190px] rounded-xl bg-[#fbf6ec] px-2.5 py-1 text-[11px] font-semibold text-[#241b16] border border-[#d7c7a9] shadow-lg text-center break-words';
                bDiv.textContent = myBubbleText;
                el.appendChild(bDiv);
              }
              if (myEmoteText) {
                const eDiv = document.createElement('div');
                eDiv.className =
                  'rounded-full bg-[#d9532f] px-2.5 py-0.5 text-[10px] font-bold text-white shadow';
                eDiv.textContent = myEmoteText;
                el.appendChild(eDiv);
              }
            }
            projectPlate(
              el,
              playerContainer.position.x,
              playerContainer.position.y + (isMounted ? 2.8 : 2.42),
              playerContainer.position.z,
              vpW,
              vpH,
              30,
            );
          }
        } else {
          const selfEl = nameplateNodes.get('local:self');
          if (selfEl) selfEl.style.display = 'none';
        }
      }

      if (composer) composer.render();
      else renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(step);
      } else {
        rafId = requestAnimationFrame(step);
      }
    }

    if (isSoftwareGl) {
      afterDraw(step);
    } else {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      disposed = true;
      captureRegistration.current(() => null);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      if (pendingFence) gl.deleteSync(pendingFence);
      pendingFence = null;
      resizeObserver.disconnect();
      window.removeEventListener('blur', releaseKeys);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleRestored);
      avatarSlotRef.current = null;
      mountSlotRef.current = null;
      creatureSlotRef.current = null;
      dormSlotRef.current = null;
      playerContainerRef.current = null;
      nearbyHitRef.current = null;
      setNearbyPrompt(null);
      clearWizardAvatarSlot(avatarSlot);
      for (const entry of remoteMeshes.values()) clearWizardAvatarSlot(entry.avatarSlot);
      if (nameplatesLayer) nameplatesLayer.innerHTML = '';
      bloomPass?.dispose();
      composer?.dispose();
      sun.shadow.dispose();
      disposeScene(scene);
      environmentTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [zone, dormThemeId, graphicsAttempt]);

  // Seamless Hot-Swap 1: Wizard Avatar Wardrobe / Tailor / Race updates (ZERO scene teardown!)
  useEffect(() => {
    const slot = avatarSlotRef.current;
    if (!slot) return;
    clearWizardAvatarSlot(slot);
    slot.add(
      buildWizardGroup({
        raceId: wizard.raceId,
        beastClan: wizard.beastClan,
        elementId: wizard.elementId,
        sculpt: wizard.sculpt,
        equipped: wizard.wardrobe.equipped,
        stitching: wizard.stitching,
      }),
    );
  }, [wizard.raceId, wizard.beastClan, wizard.elementId, wizard.sculpt, wizard.wardrobe, wizard.stitching, zone, dormThemeId, graphicsAttempt]);

  // Seamless Hot-Swap 2: Mount toggle (`M`) without moving player or reloading canvas!
  useEffect(() => {
    const mSlot = mountSlotRef.current;
    const aSlot = avatarSlotRef.current;
    if (!mSlot || !aSlot) return;
    clearSceneGroup(mSlot);
    if (wizard.progression.equippedMountId) {
      mSlot.add(buildMountGroup(wizard.progression.equippedMountId));
      aSlot.position.y = 0.36;
    } else {
      aSlot.position.y = 0;
    }
  }, [wizard.progression.equippedMountId, zone, dormThemeId, graphicsAttempt]);

  // Seamless Hot-Swap 3: Active Lead Creature swap/evolution without canvas reset!
  useEffect(() => {
    const cSlot = creatureSlotRef.current;
    if (!cSlot) return;
    clearSceneGroup(cSlot);
    if (activeCreature) {
      cSlot.add(
        buildCreatureGroup({
          speciesId: activeCreature.speciesId,
          stage: activeCreature.stage,
          chromatic: activeCreature.chromatic,
        }),
      );
    }
  }, [activeCreature?.speciesId, activeCreature?.stage, activeCreature?.chromatic, zone, dormThemeId, graphicsAttempt]);

  // Seamless Hot-Swap 4: Placed Dorm Furniture updates without resetting position!
  useEffect(() => {
    const dSlot = dormSlotRef.current;
    if (!dSlot) return;
    clearSceneGroup(dSlot);
    if (zone === 'sanctuary' && dormItems.length > 0) {
      const built = buildDormItemsGroup(dormItems, maxAnisoRef.current);
      dSlot.add(built.group);
      dormInteractablesRef.current = built.interactables;
    } else {
      dormInteractablesRef.current = [];
    }
  }, [zone, dormItems, dormThemeId, graphicsAttempt]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
      <div ref={nameplatesLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

      {hoverLabel && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 storybook-panel rounded-xl px-4 py-2 text-center shadow-lg">
          <div className="font-display text-sm font-bold text-[#241b16]">{hoverLabel.label}</div>
          {hoverLabel.sub && <div className="text-xs text-[#615346]">{hoverLabel.sub}</div>}
        </div>
      )}

      {nearbyPrompt && (
        <button
          type="button"
          onClick={() => propsRef.current.onInteractHit(nearbyPrompt)}
          className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 storybook-dark-panel rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-2xl border border-[#ffd166]/65 hover:border-[#ffd166]"
        >
          <span className="rounded-md bg-[#ffd166] px-2 py-0.5 font-mono-num text-xs font-black text-[#241b16]">
            E
          </span>
          <div className="text-left">
            <div className="text-xs font-bold text-[#fbf6ec] leading-tight">{nearbyPrompt.label}</div>
            {nearbyPrompt.subLabel && (
              <div className="text-[10px] text-[#cfc5b4] leading-tight">{nearbyPrompt.subLabel}</div>
            )}
          </div>
        </button>
      )}

      {unavailable && (
        <div role="status" className="absolute inset-0 grid place-content-center px-6 text-center text-[#f7f0e2]">
          <h3 className="font-display text-lg font-bold">3D world unavailable</h3>
          <p className="mt-2 text-sm">Your wizard and menus are still available.</p>
          <button type="button" className="mx-auto mt-4 rounded-lg bg-[#f4c98b] px-4 py-2 text-[#241b16]"
            onClick={() => setGraphicsAttempt((attempt) => attempt + 1)}>Retry 3D</button>
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1c2233]/90 text-[#f7f0e2]">
          <div className="storybook-dark-panel rounded-2xl p-6 text-center max-w-sm">
            <h3 className="font-display text-lg font-bold">Restoring 3D Sky-Canvas…</h3>
            <p className="mt-2 text-sm text-[#cfc5b4]">Your WebGL graphics context paused briefly and will resume automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
};

function animateCreatureRig(petMesh: THREE.Object3D, t: number, dt: number) {
  const wingL = petMesh.getObjectByName('creatureWingL');
  const wingR = petMesh.getObjectByName('creatureWingR');
  const tail = petMesh.getObjectByName('creatureTail');
  const gear = petMesh.getObjectByName('creatureGear');
  const halo = petMesh.getObjectByName('creatureHalo');
  if (wingL && wingR) {
    const flap = Math.sin(t * 3.1) * 0.35;
    wingL.rotation.z = 0.35 + flap;
    wingR.rotation.z = -0.35 - flap;
  }
  if (tail) tail.rotation.z = Math.sin(t * 2.5) * 0.28;
  if (gear) gear.rotation.z += dt * 1.8;
  if (halo) halo.rotation.z += dt * 1.1;
}

function animateWizardRig(
  avatar: THREE.Object3D,
  moving: boolean,
  t: number,
  speedScalar: number,
  emote?: EmoteId | null,
  dt = 0,
  jumping = false,
  mounted = false,
) {
  if (updateRowanHuman(avatar, dt, { moving: moving && !mounted, speedScalar, emote: moving && mounted ? null : emote, jumping })) return;
  const bodyRig = avatar.getObjectByName('bodyRig');
  if (!bodyRig) return;

  const legL = bodyRig.getObjectByName('legL');
  const legR = bodyRig.getObjectByName('legR');
  const shinL = bodyRig.getObjectByName('shinL');
  const shinR = bodyRig.getObjectByName('shinR');
  const armL = bodyRig.getObjectByName('armL');
  const armR = bodyRig.getObjectByName('armR');
  const forearmL = bodyRig.getObjectByName('forearmL');
  const forearmR = bodyRig.getObjectByName('forearmR');
  const head = bodyRig.getObjectByName('head');
  const cloak = bodyRig.getObjectByName('cloakGroup');
  const tail = bodyRig.getObjectByName('tail');
  const wingL = bodyRig.getObjectByName('wingL');
  const wingR = bodyRig.getObjectByName('wingR');

  // Reset emote axes cleanly each frame
  if (armL && armR) {
    armL.rotation.z = 0;
    armR.rotation.z = 0;
  }
  if (shinL && shinR) {
    shinL.rotation.x = 0;
    shinR.rotation.x = 0;
  }
  if (forearmL && forearmR) {
    forearmL.rotation.x = -0.14;
    forearmR.rotation.x = -0.22;
  }
  if (head) {
    head.rotation.x = Math.sin(t * 0.9) * 0.025;
    head.rotation.z = 0;
  }
  bodyRig.rotation.x = 0;

  if (emote && !moving) {
    if (emote === 'wave') {
      if (legL && legR) {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
      }
      if (armL && armR) {
        armL.rotation.x = 0;
        armR.rotation.x = -0.35;
        armR.rotation.z = -2.4 + Math.sin(t * 3.8) * 0.35;
      }
      if (forearmR) forearmR.rotation.x = -0.35 + Math.sin(t * 3.8) * 0.15;
      if (head) head.rotation.z = -0.08;
      bodyRig.position.y = Math.sin(t * 1.2) * 0.025;
    } else if (emote === 'cheer') {
      if (legL && legR) {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
      }
      if (armL && armR) {
        armL.rotation.x = -0.25;
        armR.rotation.x = -0.25;
        armL.rotation.z = 2.15 + Math.sin(t * 4.2) * 0.25;
        armR.rotation.z = -2.15 - Math.sin(t * 4.2) * 0.25;
      }
      if (shinL && shinR) {
        const hopKnee = Math.max(0, Math.sin(t * 3.2)) * 0.25;
        shinL.rotation.x = hopKnee;
        shinR.rotation.x = hopKnee;
      }
      bodyRig.position.y = Math.abs(Math.sin(t * 3.2)) * 0.16;
    } else if (emote === 'meditate') {
      if (legL && legR) {
        legL.rotation.x = -0.95;
        legR.rotation.x = -0.95;
      }
      if (shinL && shinR) {
        shinL.rotation.x = 1.45;
        shinR.rotation.x = 1.45;
      }
      if (armL && armR) {
        armL.rotation.x = -0.55;
        armR.rotation.x = -0.55;
        armL.rotation.z = -0.25;
        armR.rotation.z = 0.25;
      }
      if (forearmL && forearmR) {
        forearmL.rotation.x = -0.65;
        forearmR.rotation.x = -0.65;
      }
      if (head) head.rotation.x = 0.08;
      bodyRig.position.y = 0.28 + Math.sin(t * 1.4) * 0.07;
    } else if (emote === 'cast') {
      if (legL && legR) {
        legL.rotation.x = -0.15;
        legR.rotation.x = 0.18;
      }
      if (armL && armR) {
        armL.rotation.x = -0.55;
        armR.rotation.x = -1.65;
      }
      if (forearmR) forearmR.rotation.x = -0.25;
      bodyRig.rotation.x = -0.08;
      bodyRig.position.y = 0.04 + Math.sin(t * 3.0) * 0.03;
    }
  } else {
    const phase = t * 2.6 * speedScalar;
    const swing = moving ? Math.sin(phase) * 0.58 : 0;
    if (legL && legR) {
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
    }
    if (shinL && shinR && moving) {
      // Natural knee flexion during swing stride
      shinL.rotation.x = Math.max(0, -Math.cos(phase)) * 0.62;
      shinR.rotation.x = Math.max(0, Math.cos(phase)) * 0.62;
    }
    if (armL && armR) {
      armL.rotation.x = -swing * 0.72;
      armR.rotation.x = swing * 0.52;
    }
    if (forearmL && forearmR && moving) {
      forearmL.rotation.x = -0.28 - Math.max(0, swing) * 0.35;
      forearmR.rotation.x = -0.32 - Math.max(0, -swing) * 0.25;
    }
    bodyRig.position.y = moving ? Math.abs(Math.sin(phase)) * 0.042 : Math.sin(t * 0.9) * 0.018;
  }

  if (cloak) {
    cloak.rotation.x = moving ? 0.32 + Math.sin(t * 3.1) * 0.1 : 0.06 + Math.sin(t * 1.1) * 0.05;
  }
  if (tail) {
    tail.rotation.z = Math.sin(t * (moving ? 3.0 : 1.3)) * 0.22;
  }
  if (wingL && wingR) {
    const wFlap = Math.sin(t * (moving ? 2.8 : 1.0)) * 0.14;
    wingL.rotation.z = 0.32 + wFlap;
    wingR.rotation.z = -0.32 - wFlap;
  }
}

function isDescendant(child: THREE.Object3D, parent: THREE.Object3D): boolean {
  let curr: THREE.Object3D | null = child;
  while (curr) {
    if (curr === parent) return true;
    curr = curr.parent;
  }
  return false;
}

