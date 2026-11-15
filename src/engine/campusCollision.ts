export interface CampusCollider {
  x: number;
  z: number;
  radius: number;
}

export function moveOnCampus(
  x: number, z: number, dx: number, dz: number, maxRadius: number, colliders: readonly CampusCollider[],
): [number, number] {
  let nextX = x + dx;
  let nextZ = z + dz;
  if (Math.hypot(nextX, nextZ) > maxRadius) return [x, z];

  for (const collider of colliders) {
    const offsetX = nextX - collider.x;
    const offsetZ = nextZ - collider.z;
    const distance = Math.hypot(offsetX, offsetZ);
    if (distance >= collider.radius) continue;
    if (distance === 0) return [x, z];
    nextX = collider.x + offsetX * collider.radius / distance;
    nextZ = collider.z + offsetZ * collider.radius / distance;
  }
  return Math.hypot(nextX, nextZ) <= maxRadius ? [nextX, nextZ] : [x, z];
}
