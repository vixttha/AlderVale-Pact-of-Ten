import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { prepareRowanInstance, selectRowanClip } from '../src/engine/races/rowanAsset.ts';
import type { WizardSculpt } from '../shared/wardrobe.ts';

const sculpt = { height: 1, build: 'balanced' } as WizardSculpt;
function source() {
  const scene = new THREE.Group();
  const bone = new THREE.Bone();
  bone.name = 'pelvis';
  const geometry = new THREE.BoxGeometry(1, 2, 0.5);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]));
  scene.add(mesh);
  const animations = ['Idle_Subtle', 'Walk', 'Sprint', 'Jump_air', 'Victory', 'Sitting_Idle'].map(
    (name) => new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('pelvis.position[y]', [0, 1], [0, 0.1])]),
  );
  return { scene, animations, mesh };
}

describe('Rowan imported human', () => {
  it('grounds the idle pose at the existing 1.8-unit human scale and respects sculpt size', () => {
    const instance = prepareRowanInstance(source(), sculpt);
    const box = new THREE.Box3().setFromObject(instance.group, true);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.getSize(new THREE.Vector3()).y).toBeCloseTo(1.8);
    instance.dispose();
    const tall = prepareRowanInstance(source(), { ...sculpt, height: 1.1, build: 'athletic' });
    expect(new THREE.Box3().setFromObject(tall.group, true).getSize(new THREE.Vector3()).y).toBeCloseTo(1.98);
    expect(tall.group.scale.x).toBeCloseTo(1.09);
    tall.dispose();
  });
  it('gives each avatar its own skeleton and material while sharing immutable geometry', () => {
    const asset = source();
    const first = prepareRowanInstance(asset, sculpt);
    const second = prepareRowanInstance(asset, sculpt);
    const getMesh = (group: THREE.Object3D) => {
      let mesh: THREE.SkinnedMesh;
      group.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) mesh = object as THREE.SkinnedMesh; });
      return mesh!;
    };
    const a = getMesh(first.group);
    const b = getMesh(second.group);
    expect(a.skeleton).not.toBe(b.skeleton);
    expect(a.skeleton.bones[0]).not.toBe(b.skeleton.bones[0]);
    expect(a.material).not.toBe(b.material);
    expect(a.geometry).toBe(asset.mesh.geometry);
    const originalY = b.skeleton.bones[0].position.y;
    first.update(0.4, { moving: true });
    expect(first.currentClip).toBe('Walk');
    expect(b.skeleton.bones[0].position.y).toBe(originalY);
    first.dispose(); second.dispose();
  });
  it('changes authored clips and releases instance resources without destroying the source', () => {
    const asset = source();
    const destroyGeometry = vi.spyOn(asset.mesh.geometry, 'dispose');
    const destroyMaterial = vi.spyOn(asset.mesh.material as THREE.Material, 'dispose');
    const instance = prepareRowanInstance(asset, sculpt);
    instance.update(0.1, { moving: true, speedScalar: 1.35 });
    expect(instance.currentClip).toBe('Sprint');
    instance.update(0.1, { moving: false, jumping: true });
    expect(instance.currentClip).toBe('Jump_air');
    instance.update(0.1, { moving: false, emote: 'cheer' });
    expect(instance.currentClip).toBe('Victory');
    instance.dispose(); instance.dispose();
    expect(destroyGeometry).not.toHaveBeenCalled();
    expect(destroyMaterial).not.toHaveBeenCalled();
  });
  it('rejects missing idle animation and degenerate geometry instead of installing a broken rig', () => {
    const asset = source();
    expect(() => prepareRowanInstance({ ...asset, animations: [] }, sculpt)).toThrow(/Idle_Subtle/);
    asset.mesh.scale.y = 0;
    expect(() => prepareRowanInstance(asset, sculpt)).toThrow(/bounds/);
  });
  it('uses known source clips for idle walking sprint jumping and meditation', () => {
    expect(selectRowanClip({ moving: false })).toBe('Idle_Subtle');
    expect(selectRowanClip({ moving: true })).toBe('Walk');
    expect(selectRowanClip({ moving: true, speedScalar: 1.35 })).toBe('Sprint');
    expect(selectRowanClip({ moving: false, emote: 'meditate' })).toBe('Sitting_Idle');
  });
  it('interrupts stationary emotes when the player starts walking or sprinting', () => {
    expect(selectRowanClip({ moving: true, emote: 'meditate' })).toBe('Walk');
    expect(selectRowanClip({ moving: true, speedScalar: 1.35, emote: 'wave' })).toBe('Sprint');
  });
});
