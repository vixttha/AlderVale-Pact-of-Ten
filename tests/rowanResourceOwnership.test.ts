import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { addOutlineToGroup } from '../src/engine/animeShaders.ts';
import { disposeWizardAvatar } from '../src/engine/races/rowanHuman.ts';

it('releases owned procedural materials without tearing down ink shared by another avatar', () => {
  const groups = [new THREE.Group(), new THREE.Group()];
  const owned = new THREE.MeshBasicMaterial();
  groups[0].add(new THREE.Mesh(new THREE.BoxGeometry(), owned));
  groups[1].add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  for (const group of groups) addOutlineToGroup(group, 1.038, '#123456');
  const firstMesh = groups[0].children[0] as THREE.Mesh;
  const secondMesh = groups[1].children[0] as THREE.Mesh;
  const ink = (firstMesh.children[0] as THREE.Mesh).material as THREE.Material;
  expect((secondMesh.children[0] as THREE.Mesh).material).toBe(ink);
  const destroyShared = vi.spyOn(ink, 'dispose');
  const destroyOwned = vi.spyOn(owned, 'dispose');
  disposeWizardAvatar(groups[0]);
  expect(destroyOwned).toHaveBeenCalledTimes(1);
  expect(destroyShared).not.toHaveBeenCalled();
  disposeWizardAvatar(groups[1]);
  expect(destroyShared).not.toHaveBeenCalled();
});
