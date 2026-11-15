import * as THREE from 'three';

export function disposeScene(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  function visit(object: THREE.Object3D) {
    if (object.userData.sharedSceneAssets) return;
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material.userData.sharedSceneMaterial) materials.add(material);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
    for (const child of object.children) visit(child);
  }
  visit(root);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

export function clearSceneGroup(group: THREE.Group) {
  disposeScene(group);
  group.clear();
}
