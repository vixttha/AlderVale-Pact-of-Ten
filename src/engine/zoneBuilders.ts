import * as THREE from 'three';
import type { CampusCollider } from './campusCollision.ts';
import { CAMPUS_NPCS, DORM_THEMES, type ZoneId } from '../../shared/world.ts';
import { RESOURCES, type ResourceId } from '../../shared/economy.ts';
import { ELEMENTS } from '../../shared/elements.ts';
import { buildWizardGroup } from './avatarMesh.ts';
import type { PlacedDormItem } from '../lib/storage.ts';
import {
  addOutlineToGroup,
  createContactShadow,
  getCobbleTexture,
  getGrassTexture,
  getRuneArenaTexture,
  getWaterRippleTexture,
  getWoodPlankTexture,
  makeAnimeToonMaterial,
} from './animeShaders.ts';

export interface InteractiveHitTarget {
  kind: 'npc' | 'resource' | 'wisp' | 'fountain' | 'fishing' | 'portal' | 'duel_ring' | 'dorm_item';
  id: string;
  label: string;
  subLabel?: string;
  targetZone?: ZoneId;
  resourceId?: ResourceId;
}

export interface ZoneBuildResult {
  group: THREE.Group;
  dormSlot: THREE.Group;
  interactables: { object: THREE.Object3D; hit: InteractiveHitTarget }[];
  animatedObjects: { mesh: THREE.Object3D; speed: number; baseY: number; spin?: boolean }[];
  waterTextures: THREE.CanvasTexture[];
  colliders: CampusCollider[];
}

/**
 * Builds recognizable multi-part 3D meshes for placed Personal Sanctuary items
 * so dorm updates hot-swap seamlessly without rebuilding the WebGL scene.
 */
export function buildDormItemsGroup(
  dormItems: PlacedDormItem[],
  maxAnisotropy = 4,
): {
  group: THREE.Group;
  interactables: { object: THREE.Object3D; hit: InteractiveHitTarget }[];
} {
  const group = new THREE.Group();
  const interactables: { object: THREE.Object3D; hit: InteractiveHitTarget }[] = [];
  const woodTex = getWoodPlankTexture(maxAnisotropy);

  for (const item of dormItems) {
    const m = new THREE.Group();
    const baseMat = makeAnimeToonMaterial({ color: item.colorHex, rimColor: '#fff4d4', rimStrength: 0.3 });
    const trimMat = makeAnimeToonMaterial({ color: '#d4a13e', rimColor: '#ffffff', rimStrength: 0.35 });
    const woodMat = makeAnimeToonMaterial({ color: '#8a5d3b', map: woodTex, rimStrength: 0.2 });

    if (item.catalogId === 'dorm_rug') {
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.04, 24), baseMat);
      rug.position.y = 0.03;
      const border = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.04, 6, 24), trimMat);
      border.rotation.x = Math.PI / 2;
      border.position.y = 0.05;
      m.add(rug, border);
    } else if (item.catalogId === 'dorm_bookshelf') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.85, 0.45), woodMat);
      frame.position.y = 0.92;
      frame.castShadow = true;
      m.add(frame);
      const bookColors = ['#d9532f', '#38a3a5', '#d4a13e', '#6d597a', '#256fa8'];
      for (let s = 0; s < 3; s++) {
        for (let b = 0; b < 4; b++) {
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.32, 0.34),
            makeAnimeToonMaterial({ color: bookColors[(s + b) % bookColors.length], rimStrength: 0.2 }),
          );
          book.position.set(-0.42 + b * 0.28, 0.42 + s * 0.52, 0.09);
          m.add(book);
        }
      }
      addOutlineToGroup(m, 1.03);
    } else if (item.catalogId === 'dorm_musicbox') {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.65, 12), woodMat);
      plinth.position.y = 0.325;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 18, Math.PI), trimMat);
      arch.position.y = 0.92;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: '#ffdf85' }));
      gem.position.y = 0.92;
      gem.userData.noOutline = true;
      m.add(plinth, arch, gem);
      addOutlineToGroup(m, 1.035);
    } else if (item.catalogId === 'dorm_mannequin') {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.14, 14), trimMat);
      stand.position.y = 0.07;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 8), woodMat);
      pole.position.y = 0.62;
      const bust = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.58, 12), baseMat);
      bust.position.y = 1.08;
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 12), trimMat);
      hat.position.y = 1.62;
      m.add(stand, pole, bust, hat);
      addOutlineToGroup(m, 1.035);
    } else if (item.catalogId === 'dorm_workbench') {
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.85), woodMat);
      table.position.y = 0.39;
      table.castShadow = true;
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.34), baseMat);
      anvil.position.set(-0.22, 0.94, 0);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: '#6fffe9' }));
      crystal.position.set(0.35, 1.05, 0);
      crystal.userData.noOutline = true;
      m.add(table, anvil, crystal);
      addOutlineToGroup(m, 1.035);
    } else if (item.catalogId === 'dorm_garden_plot') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.4), woodMat);
      bed.position.y = 0.125;
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.28, 1.22), makeAnimeToonMaterial({ color: '#5c402c', rimStrength: 0.1 }));
      soil.position.y = 0.14;
      m.add(bed, soil);
      [
        [-0.32, -0.32],
        [0.32, -0.32],
        [-0.32, 0.32],
        [0.32, 0.32],
      ].forEach(([sx, sz]) => {
        const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 6), baseMat);
        sprout.position.set(sx, 0.42, sz);
        m.add(sprout);
      });
      addOutlineToGroup(m, 1.035);
    } else {
      // Sky-Lens Gilded Frame / Trophy
      const easel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 0.12), trimMat);
      easel.position.y = 1.0;
      const canvas = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.7),
        new THREE.MeshBasicMaterial({ color: '#8ad4ff' }),
      );
      canvas.position.set(0, 1.0, 0.07);
      canvas.userData.noOutline = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.85, 8), woodMat);
      leg.position.y = 0.42;
      m.add(easel, canvas, leg);
      addOutlineToGroup(m, 1.035);
    }

    m.add(createContactShadow(0.68, 0.32));
    m.position.set(item.x, item.y, item.z);
    m.rotation.y = item.rotY;
    m.scale.setScalar(item.scale);
    group.add(m);
    interactables.push({
      object: m,
      hit: {
        kind: 'dorm_item',
        id: item.uid,
        label: item.name,
        subLabel: item.triggerKind ? `Click to activate (${item.triggerKind.replace('_', ' ')})` : 'Placed Dorm Item',
      },
    });
  }

  return { group, interactables };
}

export function buildZoneScene(params: {
  zone: ZoneId;
  dormThemeId?: string;
  dormItems?: PlacedDormItem[];
  maxAnisotropy?: number;
}): ZoneBuildResult {
  const maxAniso = params.maxAnisotropy ?? 4;
  const group = new THREE.Group();
  const interactables: { object: THREE.Object3D; hit: InteractiveHitTarget }[] = [];
  const animatedObjects: { mesh: THREE.Object3D; speed: number; baseY: number; spin?: boolean }[] = [];
  const waterTextures: THREE.CanvasTexture[] = [];
  const colliders: CampusCollider[] = [];

  const theme = DORM_THEMES.find((t) => t.id === params.dormThemeId) ?? DORM_THEMES[0];
  const grassTex = getGrassTexture(maxAniso);
  const cobbleTex = getCobbleTexture(maxAniso);
  const woodTex = getWoodPlankTexture(maxAniso);
  const arenaTex = getRuneArenaTexture(maxAniso);
  const waterTex = getWaterRippleTexture(maxAniso);
  waterTextures.push(waterTex);

  const stoneMat = makeAnimeToonMaterial({ color: '#e3d9c5', map: cobbleTex, rimColor: '#fff2d8', rimStrength: 0.22 });
  const trimStoneMat = makeAnimeToonMaterial({ color: '#cfc3ab', rimColor: '#fff2d8', rimStrength: 0.25 });
  const grassMat = makeAnimeToonMaterial({ color: '#8ac26b', map: grassTex, rimColor: '#d9ff9e', rimStrength: 0.18 });
  const woodMat = makeAnimeToonMaterial({ color: '#8d5f3c', map: woodTex, rimColor: '#ffdfb0', rimStrength: 0.2 });
  const goldMat = makeAnimeToonMaterial({ color: '#e6b44c', emissive: '#593d0c', emissiveIntensity: 0.25, rimColor: '#ffffff', rimStrength: 0.45 });
  const waterMat = new THREE.MeshBasicMaterial({ map: waterTex, color: '#80e5ff', transparent: true, opacity: 0.88 });

  // Main floating sky-island base
  const islandRadius = params.zone === 'sanctuary' ? 14 : 24;
  const topFloorMat =
    params.zone === 'sanctuary'
      ? makeAnimeToonMaterial({ color: theme.floorHex, map: woodTex, rimStrength: 0.18 })
      : params.zone === 'amphitheater'
        ? makeAnimeToonMaterial({ color: '#dfd3bd', map: arenaTex, rimStrength: 0.2 })
        : grassMat;

  const topFloor = new THREE.Mesh(new THREE.CylinderGeometry(islandRadius, islandRadius * 0.95, 1.4, 48), topFloorMat);
  topFloor.position.y = -0.7;
  topFloor.receiveShadow = true;
  group.add(topFloor);

  // Carved stone rim parapet around island edge
  const islandRim = new THREE.Mesh(
    new THREE.TorusGeometry(islandRadius - 0.18, 0.36, 8, 48),
    trimStoneMat,
  );
  islandRim.rotation.x = Math.PI / 2;
  islandRim.position.y = 0.02;
  group.add(islandRim);

  // Layered cliff underbelly + glowing embedded sky-crystals
  const cliffMat = makeAnimeToonMaterial({ color: '#6b5e57', rimColor: '#91b4ff', rimStrength: 0.2 });
  const rockUnder = new THREE.Mesh(new THREE.ConeGeometry(islandRadius * 0.94, islandRadius * 0.72, 14), cliffMat);
  rockUnder.position.y = -islandRadius * 0.36 - 1.35;
  rockUnder.rotation.x = Math.PI;
  group.add(rockUnder);

  const skyCrystalMat = new THREE.MeshBasicMaterial({ color: '#7de8ff' });
  for (let c = 0; c < 6; c++) {
    const a = (c / 6) * Math.PI * 2 + 0.4;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.6, 5), skyCrystalMat);
    shard.position.set(Math.cos(a) * (islandRadius * 0.56), -4.8 - (c % 2) * 1.4, Math.sin(a) * (islandRadius * 0.56));
    shard.rotation.set(Math.PI + 0.25, a, 0.15);
    shard.userData.noOutline = true;
    group.add(shard);
  }

  // Distant floating sky-isles crowned with anime blossom trees & undersides
  const distantIsles: [number, number, number, number][] = [
    [-40, 7, -34, 5.8],
    [42, 10, -28, 6.4],
    [-36, -2, 32, 4.6],
    [36, 5, 35, 5.2],
  ];
  distantIsles.forEach(([x, y, z, r], idx) => {
    const isle = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.82, 1.2, 12), grassMat);
    const belly = new THREE.Mesh(new THREE.ConeGeometry(r * 0.85, r * 1.15, 9), cliffMat);
    belly.position.y = -r * 0.58 - 0.55;
    belly.rotation.x = Math.PI;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 5), skyCrystalMat);
    crystal.position.y = -r * 1.1 - 0.8;
    crystal.rotation.x = Math.PI;
    const miniTree = buildAnimeTree(idx % 2 === 0 ? '#ffa3c8' : '#7ec968', 0.85);
    miniTree.position.set(0, 0.55, 0);
    isle.add(cap, belly, crystal, miniTree);
    isle.position.set(x, y, z);
    group.add(isle);
    animatedObjects.push({ mesh: isle, speed: 0.55 + idx * 0.15, baseY: y });
  });

  if (params.zone === 'hub') {
    // Central Cobble Plaza + 4 Stone Avenues radiating to Portals & Pavilions
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 11.6, 0.12, 36), stoneMat);
    plaza.position.y = 0.04;
    plaza.receiveShadow = true;
    group.add(plaza);

    const plazaRing = new THREE.Mesh(new THREE.TorusGeometry(11.3, 0.18, 8, 48), trimStoneMat);
    plazaRing.rotation.x = Math.PI / 2;
    plazaRing.position.y = 0.12;
    group.add(plazaRing);

    // Cobble walkways toward portals & shops
    [
      { x: -10, z: 0, rot: 0, len: 10 },
      { x: 10, z: 0, rot: 0, len: 10 },
      { x: -9, z: 9, rot: -Math.PI / 4, len: 12 },
      { x: 9, z: 9, rot: Math.PI / 4, len: 12 },
      { x: 0, z: -11, rot: Math.PI / 2, len: 12 },
    ].forEach((road) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(road.len, 0.08, 2.8), stoneMat);
      slab.position.set(road.x, 0.03, road.z);
      slab.rotation.y = road.rot;
      slab.receiveShadow = true;
      group.add(slab);
    });

    // Multi-tier Sanctuary Healing Fountain
    const fountain = new THREE.Group();
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.75, 0.72, 20), trimStoneMat);
    basin.position.y = 0.36;
    const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.9, 0.55, 16), trimStoneMat);
    upperBasin.position.y = 1.05;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.14, 20), waterMat);
    water.position.y = 0.72;
    water.userData.noOutline = true;
    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), new THREE.MeshBasicMaterial({ color: '#8ef0ff' }));
    spire.position.y = 1.92;
    spire.userData.noOutline = true;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 24), goldMat);
    halo.position.y = 1.92;
    halo.rotation.x = Math.PI / 2;
    fountain.add(basin, upperBasin, water, spire, halo, createContactShadow(2.8, 0.3));
    fountain.position.set(0, 0, 1);
    group.add(fountain);
    colliders.push({ x: fountain.position.x, z: fountain.position.z, radius: basin.geometry.parameters.radiusBottom + 0.3 });
    animatedObjects.push({ mesh: spire, speed: 2.0, baseY: 1.92, spin: true });
    interactables.push({
      object: fountain,
      hit: { kind: 'fountain', id: 'fountain_main', label: 'Sanctuary Healing Fountain', subLabel: 'Click to refill Mana & Flasks' },
    });

    // Cozy Stone Benches & Brass Academy Lanterns around Central Plaza
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const lantern = buildLanternPost(goldMat, '#ffdf85');
      lantern.position.set(Math.cos(a) * 10.6, 0, Math.sin(a) * 10.6);
      group.add(lantern);

      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.55), woodMat);
      seat.position.y = 0.42;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.48), trimStoneMat);
      legL.position.set(-0.65, 0.2, 0);
      const legR = legL.clone();
      legR.position.x = 0.65;
      bench.add(seat, legL, legR);
      bench.position.set(Math.cos(a + 0.32) * 8.2, 0, Math.sin(a + 0.32) * 8.2);
      bench.rotation.y = -(a + 0.32) + Math.PI / 2;
      addOutlineToGroup(bench, 1.03);
      group.add(bench);
    }

    // Two Detailed Storybook Guild Pavilions (Velvet Thimble & Quartermaster Forge)
    const tailorHouse = buildShopPavilion({
      roofHex: '#a8444a',
      awningHex: '#f4c98b',
      trimHex: '#d4a13e',
      windowHex: '#ffe69a',
      woodMat,
      stoneMat: trimStoneMat,
    });
    tailorHouse.position.set(-13.2, 0, -2.5);
    tailorHouse.rotation.y = Math.PI / 2;
    group.add(tailorHouse);

    const forgeHouse = buildShopPavilion({
      roofHex: '#356896',
      awningHex: '#7de2d1',
      trimHex: '#2f8a73',
      windowHex: '#8ef0ff',
      woodMat,
      stoneMat: trimStoneMat,
      withChimney: true,
    });
    forgeHouse.position.set(13.2, 0, -2.5);
    forgeHouse.rotation.y = -Math.PI / 2;
    group.add(forgeHouse);

    // Sakura & Alder Courtyard Trees
    const treeSpots: [number, number, string, number][] = [
      [-17, -11, '#ff9ec4', 1.15],
      [17, -11, '#79c964', 1.1],
      [-18, 6, '#79c964', 0.95],
      [18, 5, '#ff9ec4', 1.05],
      [-8, -17, '#ff9ec4', 0.98],
      [8, -17, '#79c964', 1.0],
    ];
    treeSpots.forEach(([tx, tz, leafHex, scale]) => {
      const tree = buildAnimeTree(leafHex, scale);
      tree.position.set(tx, 0, tz);
      group.add(tree);
    });

    // Instanced Meadow Grass Tufts
    group.add(buildInstancedGrassTufts(islandRadius - 1.5, 13.5, 140));

    // Cascading Sky-Waterfall spilling off NE Rim
    const waterfall = buildSkyWaterfall(waterMat);
    waterfall.position.set(16.5, 0, -16.5);
    waterfall.rotation.y = -Math.PI * 0.75;
    group.add(waterfall);

    // Carved 3-part Waystone Portals
    addPortal(group, interactables, animatedObjects, -13, 12, 'amphitheater', 'Duel Amphitheater Gate', '#ff6e42', goldMat, trimStoneMat);
    addPortal(group, interactables, animatedObjects, 13, 12, 'arbor', 'Hatchery & Arbor Gate', '#5cd66c', goldMat, trimStoneMat);
    addPortal(group, interactables, animatedObjects, 0, -17, 'sanctuary', 'Personal Sanctuary Loft', '#ffbe4d', goldMat, trimStoneMat);
  } else if (params.zone === 'amphitheater') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.34, 10, 48),
      new THREE.MeshBasicMaterial({ color: '#ffb554' }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.09;
    ring.userData.noOutline = true;
    group.add(ring);

    // Outer stepped spectator benches
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      if (Math.abs(Math.sin(ang) - 1) < 0.15) continue; // Keep portal clear
      const tierGroup = new THREE.Group();
      const tier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 1.4), trimStoneMat);
      tier.position.y = 0.38;
      tierGroup.add(tier);
      tierGroup.position.set(Math.cos(ang) * 16.5, 0, Math.sin(ang) * 16.5);
      tierGroup.rotation.y = -ang + Math.PI / 2;
      addOutlineToGroup(tierGroup, 1.025);
      group.add(tierGroup);
    }

    const duelPedestal = new THREE.Group();
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.85, 0.48, 16), goldMat);
    pedBase.position.y = 0.24;
    const sigilOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: '#ff8a4c' }));
    sigilOrb.position.y = 1.25;
    sigilOrb.userData.noOutline = true;
    duelPedestal.add(pedBase, sigilOrb, createContactShadow(1.9, 0.35));
    addOutlineToGroup(duelPedestal, 1.03);
    group.add(duelPedestal);
    animatedObjects.push({ mesh: sigilOrb, speed: 2.2, baseY: 1.25, spin: true });
    interactables.push({
      object: duelPedestal,
      hit: { kind: 'duel_ring', id: 'ring_main', label: 'Duel Sigil Arena', subLabel: 'Click to launch Skirmish, Rare Trial, PvP, or Spire' },
    });

    // 4 Sculpted Rare Trial Obelisks with hovering elemental crystals
    (['umbra', 'sol', 'verdigris', 'chronos'] as const).forEach((elId, i) => {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const obGroup = new THREE.Group();
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.78, 3.6, 6),
        makeAnimeToonMaterial({ color: ELEMENTS[elId].primaryHex, rimColor: ELEMENTS[elId].glowHex, rimStrength: 0.45 }),
      );
      pillar.position.y = 1.8;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: ELEMENTS[elId].glowHex }),
      );
      crystal.position.y = 4.2;
      crystal.userData.noOutline = true;
      obGroup.add(pillar, crystal, createContactShadow(0.95, 0.32));
      addOutlineToGroup(obGroup, 1.035);
      obGroup.position.set(Math.cos(ang) * 11.5, 0, Math.sin(ang) * 11.5);
      group.add(obGroup);
      animatedObjects.push({ mesh: crystal, speed: 1.8 + i * 0.25, baseY: 4.2, spin: true });
    });

    addPortal(group, interactables, animatedObjects, 0, 17.5, 'hub', 'Return to Commons', '#38a3a5', goldMat, trimStoneMat);
  } else if (params.zone === 'arbor') {
    // Botanical Glasshouse Conservatory + Brass Ribs + Cloud-Pier Fishing Deck
    const conservatory = new THREE.Group();
    const stoneWall = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 0.75, 20, 1, true), trimStoneMat);
    stoneWall.position.y = 0.38;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(5.55, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshToonMaterial({ color: '#b7f2e3', transparent: true, opacity: 0.42, depthWrite: false }),
    );
    dome.position.y = 0.7;
    dome.renderOrder = 2;
    dome.userData.noOutline = true;
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.08, 6, 24, Math.PI), goldMat);
      rib.position.y = 0.7;
      rib.rotation.y = (r / 4) * Math.PI;
      conservatory.add(rib);
    }
    const nestCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshBasicMaterial({ color: '#ffd98a' }));
    nestCrystal.position.y = 1.65;
    nestCrystal.userData.noOutline = true;
    conservatory.add(stoneWall, dome, nestCrystal);
    conservatory.position.set(0, 0, -4.5);
    group.add(conservatory);
    animatedObjects.push({ mesh: nestCrystal, speed: 1.7, baseY: 1.65, spin: true });

    // Lush Trees + Instanced Meadow Grass
    [
      [-14, -9, '#ff9ec4', 1.2],
      [14, -10, '#79c964', 1.15],
      [-15, 4, '#79c964', 1.0],
    ].forEach(([tx, tz, leafHex, scale]) => {
      const tree = buildAnimeTree(leafHex as string, scale as number);
      tree.position.set(tx as number, 0, tz as number);
      group.add(tree);
    });
    group.add(buildInstancedGrassTufts(islandRadius - 1.5, 8.5, 160));

    // Cascading Aether Stream & Waterfall
    const waterfall = buildSkyWaterfall(waterMat);
    waterfall.position.set(-16, 0, -14);
    waterfall.rotation.y = Math.PI * 0.72;
    group.add(waterfall);

    // Planked Cloud-Pier Fishing Deck
    const pierGroup = new THREE.Group();
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.36, 9.8), woodMat);
    pier.position.set(11, 0.16, 5.2);
    pierGroup.add(pier);
    [
      [9.0, 1.0],
      [13.0, 1.0],
      [9.0, 9.6],
      [13.0, 9.6],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.35, 8), woodMat);
      post.position.set(px, 0.68, pz);
      pierGroup.add(post);
    });
    const pierLantern = buildLanternPost(goldMat, '#7de2ff');
    pierLantern.position.set(9.0, 0, 9.6);
    pierGroup.add(pierLantern);
    group.add(pierGroup);

    const buoy = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), new THREE.MeshBasicMaterial({ color: '#6ee2ff' }));
    buoy.position.set(11, 1.25, 10.6);
    buoy.userData.noOutline = true;
    group.add(buoy);
    animatedObjects.push({ mesh: buoy, speed: 2.0, baseY: 1.25, spin: true });
    interactables.push({
      object: buoy,
      hit: { kind: 'fishing', id: 'cloud_pier', label: 'Cloud-Pier Fishing Spot', subLabel: 'Click to cast line for Sky-Fish & Florins' },
    });

    addPortal(group, interactables, animatedObjects, -11, 14.5, 'hub', 'Return to Commons', '#38a3a5', goldMat, trimStoneMat);
  } else if (params.zone === 'sanctuary') {
    // Cozy Sky Loft Pergola, Fireplace Hearth, Centerpiece Rug & Balcony
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.04, 28),
      makeAnimeToonMaterial({ color: '#a8444a', rimColor: '#ffd4a3', rimStrength: 0.25 }),
    );
    rug.position.y = 0.03;
    const rugTrim = new THREE.Mesh(new THREE.TorusGeometry(3.88, 0.06, 6, 28), goldMat);
    rugTrim.rotation.x = Math.PI / 2;
    rugTrim.position.y = 0.05;
    group.add(rug, rugTrim);

    // Timber Pergola & Warm Hanging Lanterns
    [-6.5, 6.5].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), woodMat);
      post.position.set(px, 2.1, -6.5);
      group.add(post);
    });
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.28, 0.34), woodMat);
    crossBeam.position.set(0, 4.2, -6.5);
    group.add(crossBeam);

    [-4, 0, 4].forEach((lx) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshBasicMaterial({ color: '#ffdf8e' }));
      bulb.position.set(lx, 3.8, -6.5);
      bulb.userData.noOutline = true;
      group.add(bulb);
    });

    // Cozy Stone Hearth at back edge
    const hearth = new THREE.Group();
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 1.1), trimStoneMat);
    mantel.position.y = 1.2;
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff7b3b' }));
    ember.position.set(0, 0.55, 0.35);
    ember.userData.noOutline = true;
    hearth.add(mantel, ember);
    hearth.position.set(0, 0, -9.8);
    addOutlineToGroup(hearth, 1.025);
    group.add(hearth);

    addPortal(group, interactables, animatedObjects, 0, 11.2, 'hub', 'Return to Commons', '#38a3a5', goldMat, trimStoneMat);
  }

  // Hot-swappable Dorm Furniture Slot (populated externally without rebuilding zone!)
  const dormSlot = new THREE.Group();
  dormSlot.name = 'dormSlot';
  if (params.zone === 'sanctuary' && params.dormItems && params.dormItems.length > 0) {
    const builtDorm = buildDormItemsGroup(params.dormItems, maxAniso);
    dormSlot.add(builtDorm.group);
    interactables.push(...builtDorm.interactables);
  }
  group.add(dormSlot);

  // Campus NPC Mentors matching the 13-Race Ecology
  for (const npc of CAMPUS_NPCS) {
    if (npc.zone !== params.zone) continue;
    const npcGroup = buildWizardGroup({
      raceId: npc.raceId,
      elementId: npc.elementId,
      sculpt: {
        height: 1.04,
        build: 'balanced',
        skinHex:
          npc.raceId === 'dark_elf'
            ? '#58526e'
            : npc.raceId === 'tide_siren'
              ? '#95cfd9'
              : npc.raceId === 'river_naiad'
                ? '#beeae2'
                : '#e6bda0',
        hairStyle: 'Windblown Shag',
        hairHex: npc.raceId === 'dark_elf' ? '#e8ecf7' : '#3a2c24',
        hairTipHex: ELEMENTS[npc.elementId].glowHex,
        eyeShape: 'bright',
        eyeLeftHex: ELEMENTS[npc.elementId].primaryHex,
        eyeRightHex: ELEMENTS[npc.elementId].primaryHex,
        browStyle: 'arched',
        marking: 'none',
        primaryDye: ELEMENTS[npc.elementId].primaryHex,
        trimDye: '#d4a13e',
        accentDye: ELEMENTS[npc.elementId].glowHex,
        castPose: 'scholar',
      },
      equipped: {
        headgear: npc.id === 'npc_headmaster_vance' ? 'hat_pointed_brim' : 'hat_circlet_sol',
        torso: 'torso_grand_robe',
        back: 'back_split_cloak',
        footwear: 'boots_combat',
        staff: 'staff_astrolabe',
      },
    });
    npcGroup.position.set(npc.position[0], npc.position[1], npc.position[2]);
    // Face center of plaza slightly
    npcGroup.lookAt(0, npc.position[1], 1);
    group.add(npcGroup);
    interactables.push({
      object: npcGroup,
      hit: { kind: 'npc', id: npc.id, label: npc.name, subLabel: npc.role },
    });
  }

  // Gatherable 3D Resource Nodes & Courtyard Wisps (Hub & Arbor)
  if (params.zone === 'hub' || params.zone === 'arbor') {
    const resKeys = Object.keys(RESOURCES) as ResourceId[];
    resKeys.forEach((rId, idx) => {
      const ang = idx * 1.25 + 0.6;
      const dist = 14.8;
      const nodeGroup = new THREE.Group();
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        makeAnimeToonMaterial({
          color: RESOURCES[rId].colorHex,
          emissive: RESOURCES[rId].colorHex,
          emissiveIntensity: 0.65,
          rimColor: '#ffffff',
          rimStrength: 0.45,
        }),
      );
      crystal.position.y = 0.55;
      nodeGroup.add(crystal, createContactShadow(0.5, 0.3));
      addOutlineToGroup(nodeGroup, 1.05);
      nodeGroup.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
      group.add(nodeGroup);
      animatedObjects.push({ mesh: crystal, speed: 1.5 + idx * 0.2, baseY: 0.55, spin: true });
      interactables.push({
        object: nodeGroup,
        hit: { kind: 'resource', id: `res_${rId}_${idx}`, resourceId: rId, label: RESOURCES[rId].name, subLabel: 'Click to harvest' },
      });
    });

    // Glowing Mana/Health Courtyard Wisps
    [
      [-6, 1.1, 9],
      [7, 1.1, -8],
    ].forEach(([wx, wy, wz], idx) => {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), new THREE.MeshBasicMaterial({ color: '#8ef5ff' }));
      wisp.position.set(wx, wy, wz);
      wisp.userData.noOutline = true;
      group.add(wisp);
      animatedObjects.push({ mesh: wisp, speed: 2.2 + idx * 0.3, baseY: wy, spin: true });
      interactables.push({
        object: wisp,
        hit: { kind: 'wisp', id: `wisp_${idx}`, label: 'Aether Courtyard Wisp', subLabel: 'Click to restore Mana & HP' },
      });
    });
  }

  return { group, dormSlot, interactables, animatedObjects, waterTextures, colliders };
}

function buildAnimeTree(leafHex: string, scale = 1.0): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = makeAnimeToonMaterial({ color: '#6b472b', rimColor: '#ffd9b0', rimStrength: 0.18 });
  const leafMat = makeAnimeToonMaterial({ color: leafHex, rimColor: '#fff5da', rimStrength: 0.35 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 2.3, 9), trunkMat);
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyOffsets: [number, number, number, number][] = [
    [0, 2.9, 0, 1.35],
    [-0.85, 2.55, 0.45, 0.95],
    [0.82, 2.6, -0.38, 1.0],
    [0.15, 3.65, 0.1, 0.9],
  ];
  canopyOffsets.forEach(([cx, cy, cz, cr]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 10), leafMat);
    puff.position.set(cx, cy, cz);
    puff.scale.set(1.1, 0.85, 1.1);
    puff.castShadow = true;
    tree.add(puff);
  });

  tree.add(createContactShadow(1.3, 0.34));
  addOutlineToGroup(tree, 1.03, '#2b1e24');
  tree.scale.setScalar(scale);
  return tree;
}

function buildLanternPost(metalMat: THREE.Material, glowHex: string): THREE.Group {
  const post = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.4, 8), metalMat);
  pole.position.y = 1.2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), metalMat);
  arm.position.set(0.24, 2.35, 0);
  const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: glowHex }));
  bulb.position.set(0.46, 2.08, 0);
  bulb.userData.noOutline = true;
  post.add(pole, arm, bulb, createContactShadow(0.4, 0.28));
  return post;
}

function buildShopPavilion(cfg: {
  roofHex: string;
  awningHex: string;
  trimHex: string;
  windowHex: string;
  woodMat: THREE.Material;
  stoneMat: THREE.Material;
  withChimney?: boolean;
}): THREE.Group {
  const b = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 5.2), cfg.stoneMat);
  plinth.position.y = 0.175;
  const wallMat = makeAnimeToonMaterial({ color: '#f6ecda', rimColor: '#ffffff', rimStrength: 0.22 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.1, 4.5), wallMat);
  base.position.y = 1.8;
  base.castShadow = true;

  // Exposed anime timber corner beams
  [
    [-2.22, -2.22],
    [2.22, -2.22],
    [-2.22, 2.22],
    [2.22, 2.22],
  ].forEach(([bx, bz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.15, 0.22), cfg.woodMat);
    beam.position.set(bx, 1.8, bz);
    b.add(beam);
  });

  // Pitched anime storybook roof + golden finial
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.0, 2.6, 4),
    makeAnimeToonMaterial({ color: cfg.roofHex, rimColor: '#ffe3b8', rimStrength: 0.3 }),
  );
  roof.position.y = 4.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  const trim = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.2, 4.85), makeAnimeToonMaterial({ color: cfg.trimHex }));
  trim.position.y = 3.35;

  // Front arched timber door + shop awning + warm glowing windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.9, 0.2), cfg.woodMat);
  door.position.set(0, 1.25, 2.28);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.18, 1.15),
    makeAnimeToonMaterial({ color: cfg.awningHex, rimColor: '#ffffff', rimStrength: 0.3 }),
  );
  awning.position.set(0, 2.45, 2.65);
  awning.rotation.x = 0.28;

  const winMat = new THREE.MeshBasicMaterial({ color: cfg.windowHex });
  [-1.35, 1.35].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.12), winMat);
    win.position.set(wx, 2.0, 2.26);
    win.userData.noOutline = true;
    b.add(win);
  });

  if (cfg.withChimney) {
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.4, 0.75), cfg.stoneMat);
    chimney.position.set(-1.3, 4.3, -1.0);
    b.add(chimney);
  }

  b.add(plinth, base, roof, trim, door, awning, createContactShadow(3.6, 0.32));
  addOutlineToGroup(b, 1.02);
  return b;
}

function buildSkyWaterfall(waterMat: THREE.Material): THREE.Group {
  const wf = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 16), waterMat);
  pool.position.set(0, 0.06, -1.6);
  pool.userData.noOutline = true;

  const chute = new THREE.Mesh(new THREE.BoxGeometry(2.8, 14.0, 0.35), waterMat);
  chute.position.set(0, -6.9, 0.3);
  chute.rotation.x = 0.08;
  chute.userData.noOutline = true;

  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#e6f9ff', transparent: true, opacity: 0.5 }),
  );
  mist.position.set(0, 0.2, 0.2);
  mist.scale.set(1.6, 0.45, 1.0);
  mist.userData.noOutline = true;

  wf.add(pool, chute, mist);
  return wf;
}

function buildInstancedGrassTufts(maxRadius: number, minRadius: number, count: number): THREE.InstancedMesh {
  const bladeGeo = new THREE.ConeGeometry(0.11, 0.45, 4);
  bladeGeo.translate(0, 0.225, 0);
  const bladeMat = makeAnimeToonMaterial({ color: '#8fd46c', rimColor: '#e6ffb0', rimStrength: 0.3 });
  const mesh = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
  mesh.userData.noOutline = true;
  mesh.raycast = () => {};

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.sin(i * 7.3) * 0.4;
    const r = minRadius + ((Math.sin(i * 19.1) * 0.5 + 0.5) * (maxRadius - minRadius));
    dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    dummy.rotation.set(0.12 * Math.sin(i), a, 0.12 * Math.cos(i));
    dummy.scale.setScalar(0.8 + (i % 5) * 0.14);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color(i % 3 === 0 ? '#a9e677' : i % 2 === 0 ? '#7ec45c' : '#65ab4d'));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function addPortal(
  parent: THREE.Group,
  interactables: { object: THREE.Object3D; hit: InteractiveHitTarget }[],
  animated: { mesh: THREE.Object3D; speed: number; baseY: number; spin?: boolean }[],
  x: number,
  z: number,
  targetZone: ZoneId,
  label: string,
  colorHex: string,
  goldMat: THREE.Material,
  stoneMat: THREE.Material,
) {
  const gate = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.28, 16), stoneMat);
  base.position.y = 0.14;

  [-1.45, 1.45].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.6, 8), stoneMat);
    pillar.position.set(px, 1.4, 0);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), goldMat);
    cap.position.set(px, 2.9, 0);
    gate.add(pillar, cap);
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 8, 24, Math.PI), goldMat);
  arch.position.y = 2.4;

  const swirl = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    new THREE.MeshBasicMaterial({ color: colorHex }),
  );
  swirl.position.y = 1.65;
  swirl.userData.noOutline = true;

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.06, 8, 28),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.72 }),
  );
  innerRing.position.y = 1.65;
  innerRing.userData.noOutline = true;

  gate.add(base, arch, swirl, innerRing, createContactShadow(2.3, 0.35));
  addOutlineToGroup(gate, 1.03);
  gate.position.set(x, 0, z);
  gate.lookAt(0, 0, 0);
  parent.add(gate);
  animated.push({ mesh: swirl, speed: 2.1, baseY: 1.65, spin: true });
  interactables.push({
    object: gate,
    hit: { kind: 'portal', id: `portal_${targetZone}`, targetZone, label, subLabel: 'Click to travel via Waystone' },
  });
}
