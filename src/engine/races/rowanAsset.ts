import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { WizardSculpt } from '../../../shared/wardrobe.ts';

export const ROWAN_MODEL_URL = `${import.meta.env.BASE_URL}models/exported-model.glb`;
export interface RowanAsset {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}
export interface RowanMotion {
  moving: boolean;
  speedScalar?: number;
  jumping?: boolean;
  emote?: string | null;
}

export function selectRowanClip(motion: RowanMotion): string {
  if (motion.jumping) return 'Jump_air';
  if (motion.moving) return (motion.speedScalar ?? 1) > 1.1 ? 'Run_Anime' : 'Walk';
  if (motion.emote === 'meditate') return 'Sitting_Idle';
  // The supplied asset has no separate wave or spell-cast clip.
  if (motion.emote === 'cheer' || motion.emote === 'wave') return 'Victory';
  return 'Idle_Subtle';
}

/** Clone mutable state; source geometry and textures remain cached and immutable. */
export function prepareRowanInstance(asset: RowanAsset, sculpt: WizardSculpt) {
  const idle = asset.animations.find((clip) => clip.name === 'Idle_Subtle');
  if (!idle) throw new Error('Rowan model is missing Idle_Subtle');
  const model = clone(asset.scene);
  const materials = new Set<THREE.Material>();
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((mesh as THREE.SkinnedMesh).skeleton);
  });
  const mixer = new THREE.AnimationMixer(model);
  let action = mixer.clipAction(idle).play();
  mixer.update(0);
  model.updateMatrixWorld(true);

  // The rig's bind-pose bounds differ from its actual standing pose.
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  const release = () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    skeletons.forEach((skeleton) => skeleton.dispose());
    materials.forEach((material) => material.dispose());
  };
  if (!Number.isFinite(size.y) || size.y < 0.001 || !Number.isFinite(size.x + size.z)) {
    release();
    throw new Error('Rowan model has invalid posed bounds');
  }
  const scale = 1.8 / size.y;
  const normalized = new THREE.Group();
  normalized.name = 'rowanVisual';
  normalized.scale.setScalar(scale);
  normalized.position.set(
    -(bounds.min.x + bounds.max.x) * 0.5 * scale,
    -bounds.min.y * scale,
    -(bounds.min.z + bounds.max.z) * 0.5 * scale,
  );
  normalized.add(model);
  const group = new THREE.Group();
  group.name = 'bodyRig';
  const width = sculpt.build === 'athletic' ? 1.09 : sculpt.build === 'slender' ? 0.91 : 1;
  const height = Number.isFinite(sculpt.height) ? Math.max(0.86, Math.min(1.14, sculpt.height)) : 1;
  group.scale.set(width, height, width * 0.96);
  group.add(normalized);
  let currentClip = idle.name;
  let disposed = false;
  return {
    group,
    get currentClip() { return currentClip; },
    update(dt: number, motion: RowanMotion) {
      if (disposed) return;
      const desired = selectRowanClip(motion);
      const clip = asset.animations.find((entry) => entry.name === desired) ?? idle;
      if (clip.name !== currentClip) {
        action.fadeOut(0.16);
        action = mixer.clipAction(clip).reset().fadeIn(0.16).play();
        currentClip = clip.name;
      }
      mixer.update(Math.min(0.1, Math.max(0, Number.isFinite(dt) ? dt : 0)));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
      group.removeFromParent();
    },
  };
}
