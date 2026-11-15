import * as THREE from 'three';

const weather = {
  fireflies: { color: '#dfff8d', size: 0.16, fall: 0.12 },
  gentle_snow: { color: '#edfaff', size: 0.13, fall: 0.75 },
  petal_drift: { color: '#ffb5cb', size: 0.22, fall: 0.42 },
};

export function createDormWeather() {
  const positions = new Float32Array(72 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = Math.random() * 22 - 11;
    positions[i + 1] = Math.random() * 7 + 0.5;
    positions[i + 2] = Math.random() * 22 - 11;
  }
  const geometry = new THREE.BufferGeometry();
  const coordinates = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', coordinates);
  const material = new THREE.PointsMaterial({ opacity: 0.8, transparent: true, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;
  let activeId = '';

  function update(id: string, delta: number, elapsed: number) {
    const style = Object.hasOwn(weather, id) ? weather[id as keyof typeof weather] : undefined;
    if (id !== activeId) {
      activeId = id;
      points.visible = Boolean(style);
      if (style) {
        material.color.set(style.color);
        material.size = style.size;
      }
    }
    if (!style) return;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= style.fall * delta;
      positions[i] += Math.sin(elapsed + i) * delta * 0.35;
      if (positions[i + 1] < 0.4) positions[i + 1] = 7.4;
    }
    coordinates.needsUpdate = true;
  }

  return { points, update };
}
