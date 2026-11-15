import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { WizardMeshConfig } from '../src/engine/avatarMesh.ts';

const load = vi.hoisted(() => vi.fn());
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class { loadAsync(url: string) { return load(url); } },
}));
vi.mock('../src/engine/races/alderHumanV2.ts', async () => {
  const { Group } = await import('three');
  return { buildAlderHumanV2: () => new Group() };
});
vi.mock('../src/engine/animeShaders.ts', async () => {
  const { Mesh, PlaneGeometry, MeshBasicMaterial } = await import('three');
  return { createContactShadow: () => new Mesh(new PlaneGeometry(), new MeshBasicMaterial()) };
});

function asset() {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
  return { scene, animations: [new THREE.AnimationClip('Idle_Subtle', 1, [])] };
}
const cfg = { sculpt: { height: 1, build: 'balanced' } } as WizardMeshConfig;
beforeEach(() => { vi.resetModules(); load.mockReset(); });

describe('asynchronous Rowan lifecycle', () => {
  it('does not install a completed request into a disposed avatar', async () => {
    let resolve!: (value: ReturnType<typeof asset>) => void;
    load.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { buildRowanHuman, disposeWizardAvatar } = await import('../src/engine/races/rowanHuman.ts');
    const root = buildRowanHuman(cfg);
    disposeWizardAvatar(root);
    resolve(asset());
    await Promise.resolve(); await Promise.resolve();
    expect(root.children).toHaveLength(0);
    expect(root.userData.humanModel).not.toBe('rowan');
  });
  it('shares one source request between simultaneously created avatars', async () => {
    load.mockResolvedValue(asset());
    const { buildRowanHuman, disposeWizardAvatar } = await import('../src/engine/races/rowanHuman.ts');
    const first = buildRowanHuman(cfg);
    const second = buildRowanHuman(cfg);
    await vi.waitFor(() => expect(first.userData.humanModel).toBe('rowan'));
    expect(second.userData.humanModel).toBe('rowan');
    expect(load).toHaveBeenCalledTimes(1);
    disposeWizardAvatar(first); disposeWizardAvatar(second);
  });
  it('keeps fallback after failure and allows a later user-driven retry', async () => {
    load.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(asset());
    const { buildRowanHuman, disposeWizardAvatar } = await import('../src/engine/races/rowanHuman.ts');
    const failed = buildRowanHuman(cfg);
    await vi.waitFor(() => expect(failed.userData.humanModel).toBe('fallback'));
    const next = buildRowanHuman(cfg);
    await vi.waitFor(() => expect(next.userData.humanModel).toBe('rowan'));
    expect(load).toHaveBeenCalledTimes(2);
    disposeWizardAvatar(failed); disposeWizardAvatar(next);
  });
});
