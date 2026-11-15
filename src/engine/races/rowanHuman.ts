import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { WizardMeshConfig } from '../avatarMesh.ts';
import { createContactShadow } from '../animeShaders.ts';
import { disposeScene } from '../disposeScene.ts';
import { buildAlderHumanV2 } from './alderHumanV2.ts';
import { prepareRowanInstance, ROWAN_MODEL_URL, type RowanAsset, type RowanMotion } from './rowanAsset.ts';

let assetPromise: Promise<RowanAsset> | null = null;
function loadAsset(): Promise<RowanAsset> {
  if (!assetPromise) {
    assetPromise = new GLTFLoader().loadAsync(ROWAN_MODEL_URL).catch((error) => {
      assetPromise = null;
      throw error;
    });
  }
  return assetPromise;
}
interface HumanState {
  disposed: boolean;
  instance?: ReturnType<typeof prepareRowanInstance>;
}
const humans = new WeakMap<THREE.Object3D, HumanState>();

export function buildRowanHuman(cfg: WizardMeshConfig): THREE.Group {
  const root = buildAlderHumanV2(cfg);
  root.userData.humanModel = 'loading';
  const state: HumanState = { disposed: false };
  humans.set(root, state);
  void loadAsset().then((asset) => {
    if (state.disposed) return;
    const instance = prepareRowanInstance(asset, cfg.sculpt);
    disposeScene(root);
    root.clear();
    state.instance = instance;
    root.add(createContactShadow(0.56, 0.42), instance.group);
    root.userData.humanModel = 'rowan';
    root.userData.humanClip = instance.currentClip;
  }).catch(() => {
    if (state.disposed) return;
    root.userData.humanModel = 'fallback';
    console.warn('Rowan model could not load; using the Classic human.');
  });
  return root;
}

export function updateRowanHuman(root: THREE.Object3D, dt: number, motion: RowanMotion): boolean {
  const state = humans.get(root);
  if (!state?.instance || state.disposed) return false;
  state.instance.update(dt, motion);
  root.userData.humanClip = state.instance.currentClip;
  return true;
}

/** Call before clearing an avatar slot, including while a model request is pending. */
export function disposeWizardAvatar(root: THREE.Object3D) {
  const state = humans.get(root);
  if (state?.disposed) return;
  if (state) {
    state.disposed = true;
    state.instance?.dispose();
  }
  disposeScene(root);
  root.clear();
}

export function clearWizardAvatarSlot(slot: THREE.Object3D) {
  for (const avatar of [...slot.children]) disposeWizardAvatar(avatar);
  slot.clear();
}
