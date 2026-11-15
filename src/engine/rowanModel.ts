import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { WizardDocument } from '../../shared/economy.ts';

export type RowanModelKind = 'rigged' | 'prototype';
type RowanMotion = 'idle' | 'walk' | 'sprint' | 'airborne';

const files = {
  rigged: 'exported-model.glb',
  prototype: 'rowan-prototype.glb',
} satisfies Record<RowanModelKind, string>;

const clipNames = {
  idle: 'Idle_Subtle',
  walk: 'Walk',
  sprint: 'Sprint',
  airborne: 'Jump_air',
} satisfies Record<RowanMotion, string>;

const models = new Map<RowanModelKind, Promise<GLTF>>();

export function usesRowanModel(wizard: Pick<WizardDocument, 'raceId' | 'name'>): boolean {
  return wizard.raceId === 'human' && wizard.name.trim().toLowerCase() === 'rowan skyweaver';
}

export interface RowanModel {
  object: THREE.Group;
  update: (delta: number, motion?: RowanMotion) => void;
  dispose: () => void;
}

export async function loadRowanModel(kind: RowanModelKind): Promise<RowanModel> {
  let pending = models.get(kind);
  if (!pending) {
    const base = import.meta.env.BASE_URL;
    pending = import('three/addons/loaders/GLTFLoader.js')
      .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(`${base}models/${files[kind]}`))
      .catch((error: unknown) => {
        models.delete(kind);
        throw error;
      });
    models.set(kind, pending);
  }

  const { scene, animations } = await pending;
  const content = clone(scene);
  const bounds = new THREE.Box3().setFromObject(content);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Rowan model has invalid bounds');

  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.65 / height;
  const object = new THREE.Group();
  object.userData.sharedSceneAssets = true;
  object.scale.setScalar(scale);
  content.position.x -= center.x;
  content.position.y -= bounds.min.y;
  content.position.z -= center.z;
  object.add(content);

  const skeletons = new Set<THREE.Skeleton>();
  content.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
  });

  const mixer = animations.length ? new THREE.AnimationMixer(content) : null;
  const idle = THREE.AnimationClip.findByName(animations, clipNames.idle);
  let activeAction: THREE.AnimationAction | null = null;

  function update(delta: number, motion: RowanMotion = 'idle') {
    if (!mixer || !idle) return;
    const clip = THREE.AnimationClip.findByName(animations, clipNames[motion]) ?? idle;
    const action = mixer.clipAction(clip);
    if (action !== activeAction) {
      const previous = activeAction;
      action.reset().setEffectiveWeight(1).play();
      if (motion === 'airborne') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      if (previous) action.crossFadeFrom(previous, 0.16, false);
      activeAction = action;
    }
    mixer.update(delta);
  }

  update(0);
  return {
    object,
    update,
    dispose() {
      object.removeFromParent();
      mixer?.stopAllAction();
      mixer?.uncacheRoot(content);
      for (const skeleton of skeletons) skeleton.dispose();
    },
  };
}

export function mountRowanModel(
  slot: THREE.Group,
  fallback: THREE.Group,
  container: HTMLElement,
  kind: RowanModelKind,
  onChange: (model: RowanModel | null) => void,
): () => void {
  let cancelled = false;
  let model: RowanModel | null = null;

  void loadRowanModel(kind).then((loaded) => {
    if (cancelled) {
      loaded.dispose();
      return;
    }
    model = loaded;
    slot.add(loaded.object);
    fallback.visible = false;
    container.dataset.avatarModel = kind;
    onChange(loaded);
  }).catch((error: unknown) => {
    if (cancelled) return;
    container.dataset.avatarModel = 'procedural';
    console.warn('Could not load the Rowan model. Using the built-in avatar.', error);
  });

  return () => {
    cancelled = true;
    model?.dispose();
    fallback.visible = true;
    delete container.dataset.avatarModel;
    onChange(null);
  };
}
