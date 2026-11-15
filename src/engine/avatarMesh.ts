import * as THREE from 'three';
import { ELEMENTS, type ElementId } from '../../shared/elements.ts';
import {
  BEAST_CLANS,
  GEAR_BY_ID,
  type BeastClanId,
  type RaceId,
  type WizardSculpt,
} from '../../shared/wardrobe.ts';
import { addOutlineToGroup, createContactShadow, makeAnimeToonMaterial } from './animeShaders.ts';
import { buildAlderHumanV2 } from './races/alderHumanV2.ts';

export interface WizardMeshConfig {
  raceId: RaceId;
  beastClan?: BeastClanId;
  elementId: ElementId;
  sculpt: WizardSculpt;
  equipped: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string>;
  stitching?: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string | null>;
}

/**
 * Builds an articulated 2026 cel-shaded anime-storybook (~1:5.5 proportions) 3D Wizard Group
 * with ink outlines, Fresnel rim light, anime eye catchlights, angel-ring hair highlights,
 * anatomical race features, modular arcane streetwear, and contact shadow grounding.
 */
export function buildWizardGroup(cfg: WizardMeshConfig): THREE.Group {
  if (cfg.raceId === 'human') {
    return buildAlderHumanV2(cfg);
  }
  const root = new THREE.Group();
  const el = ELEMENTS[cfg.elementId];
  const { sculpt } = cfg;

  const isDwarf = cfg.raceId === 'dwarf';
  const buildScaleX =
    isDwarf ? 1.18 : sculpt.build === 'athletic' ? 1.09 : sculpt.build === 'slender' ? 0.91 : 1.0;
  const heightScale = (isDwarf ? 0.84 : 1.0) * Math.max(0.86, Math.min(1.14, sculpt.height));

  // Contact shadow disc pinned flush to ground
  root.add(createContactShadow(0.55, 0.42));

  const skinMat = makeAnimeToonMaterial({
    color: sculpt.skinHex,
    rimColor: '#ffe7c4',
    rimStrength: cfg.raceId === 'stoneborn' ? 0.22 : 0.32,
  });
  const primaryMat = makeAnimeToonMaterial({
    color: sculpt.primaryDye,
    rimColor: el.glowHex,
    rimStrength: 0.25,
  });
  const trimMat = makeAnimeToonMaterial({
    color: sculpt.trimDye,
    rimColor: '#fff4d4',
    rimStrength: 0.35,
  });
  const accentMat = makeAnimeToonMaterial({
    color: sculpt.accentDye,
    emissive: el.glowHex,
    emissiveIntensity: 0.22,
    rimColor: el.glowHex,
    rimStrength: 0.35,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: el.glowHex,
  });

  const bodyRig = new THREE.Group();
  bodyRig.name = 'bodyRig';
  bodyRig.scale.set(buildScaleX, heightScale, buildScaleX * 0.96);
  root.add(bodyRig);

  // Legs + Modular Footwear
  const footId = cfg.stitching?.footwear || cfg.equipped.footwear;
  const footGear = GEAR_BY_ID[footId]?.silhouette ?? 'high_top_sneakers';
  const legGeo = new THREE.CylinderGeometry(0.11, 0.088, 0.56, 12);
  const pantMat = makeAnimeToonMaterial({ color: '#262b3b', rimStrength: 0.18 });
  const bootMat = makeAnimeToonMaterial({
    color: footGear === 'greaves' ? '#2f8a73' : footGear === 'combat_boots' ? '#3d2d28' : '#e8edf5',
    rimColor: '#ffffff',
    rimStrength: 0.3,
  });

  [-0.14, 0.14].forEach((xOff, i) => {
    const legPivot = new THREE.Group();
    legPivot.name = i === 0 ? 'legL' : 'legR';
    legPivot.position.set(xOff, 0.62, 0);

    const leg = new THREE.Mesh(legGeo, pantMat);
    leg.position.y = -0.25;
    leg.castShadow = true;
    legPivot.add(leg);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 10), trimMat);
    cuff.position.y = -0.43;
    legPivot.add(cuff);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.16, 0.27), bootMat);
    shoe.position.set(0, -0.53, 0.045);
    shoe.castShadow = true;
    legPivot.add(shoe);

    // Glowing sneaker sole stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.042, 0.28), glowMat);
    stripe.position.set(0, -0.59, 0.045);
    stripe.userData.noOutline = true;
    legPivot.add(stripe);

    bodyRig.add(legPivot);
  });

  // Torso + Modular Streetwear Jacket / Trench / Poncho / Grand Robe
  const torsoId = cfg.stitching?.torso || cfg.equipped.torso;
  const torsoStyle = GEAR_BY_ID[torsoId]?.silhouette ?? 'cropped_bomber';

  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.21, 0.58, 14), primaryMat);
  torsoMesh.position.y = 0.95;
  torsoMesh.castShadow = true;
  bodyRig.add(torsoMesh);

  // Stylish inner tunic collar & belt buckle
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.036, 8, 18), trimMat);
  collar.position.y = 1.24;
  collar.rotation.x = Math.PI / 2;
  bodyRig.add(collar);

  const crestPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), glowMat);
  crestPin.position.set(0.13, 1.08, 0.24);
  crestPin.userData.noOutline = true;
  bodyRig.add(crestPin);

  if (torsoStyle === 'street_trench' || torsoStyle === 'grand_robe') {
    const coatSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, torsoStyle === 'grand_robe' ? 0.38 : 0.32, 0.48, 14, 1, true),
      makeAnimeToonMaterial({ color: sculpt.primaryDye, side: THREE.DoubleSide, rimColor: el.glowHex, rimStrength: 0.3 }),
    );
    coatSkirt.position.y = 0.56;
    coatSkirt.name = 'coatSkirt';
    bodyRig.add(coatSkirt);
  } else if (torsoStyle === 'poncho') {
    const poncho = new THREE.Mesh(new THREE.ConeGeometry(0.43, 0.42, 14, 1, true), trimMat);
    poncho.position.y = 1.05;
    bodyRig.add(poncho);
  } else {
    const waistBand = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 14), trimMat);
    waistBand.position.y = 0.72;
    bodyRig.add(waistBand);
  }

  // Stoneborn Signature: Solid carved stone body with glowing molten chest cracks
  if (cfg.raceId === 'stoneborn') {
    const chestCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.125, 0), glowMat);
    chestCore.position.set(0, 0.98, 0.18);
    chestCore.scale.set(1.1, 1.2, 0.5);
    chestCore.userData.noOutline = true;
    bodyRig.add(chestCore);

    const crackL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.036, 0.045), glowMat);
    crackL.position.set(-0.09, 1.05, 0.22);
    crackL.rotation.z = 0.48;
    crackL.userData.noOutline = true;
    bodyRig.add(crackL);

    const crackR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.036, 0.045), glowMat);
    crackR.position.set(0.09, 0.92, 0.22);
    crackR.rotation.z = -0.52;
    crackR.userData.noOutline = true;
    bodyRig.add(crackR);
  }

  // Back Gear (Satchel, Floating Scarf, Split Cape) inside animated cloakGroup
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'cloakGroup';
  cloakGroup.position.set(0, 1.18, -0.18);
  bodyRig.add(cloakGroup);

  const backId = cfg.stitching?.back || cfg.equipped.back;
  const backStyle = GEAR_BY_ID[backId]?.silhouette ?? 'satchel';
  if (backStyle === 'satchel') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 16), trimMat);
    strap.position.set(0, 0.96, 0);
    strap.rotation.set(0.4, 0.2, 0.8);
    bodyRig.add(strap);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.12), accentMat);
    bag.position.set(-0.22, -0.42, 0.03);
    cloakGroup.add(bag);
  } else if (backStyle === 'floating_scarf') {
    const neckWrap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 18), accentMat);
    neckWrap.position.y = 1.23;
    neckWrap.rotation.x = Math.PI / 2;
    bodyRig.add(neckWrap);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.52, 0.045), accentMat);
    tail.position.set(0.1, -0.18, -0.09);
    tail.rotation.x = 0.35;
    cloakGroup.add(tail);
  } else if (backStyle === 'split_cloak') {
    [-0.14, 0.14].forEach((x, idx) => {
      const wingCloak = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.7, 0.04), trimMat);
      wingCloak.position.set(x, -0.34, -0.06);
      wingCloak.rotation.z = idx === 0 ? -0.16 : 0.16;
      wingCloak.rotation.x = 0.22;
      cloakGroup.add(wingCloak);
    });
  }

  // Arms + Staff/Wand
  [-0.31, 0.31].forEach((xOff, i) => {
    const armPivot = new THREE.Group();
    armPivot.name = i === 0 ? 'armL' : 'armR';
    armPivot.position.set(xOff, 1.15, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.09, 0.44, 10), primaryMat);
    sleeve.position.y = -0.18;
    sleeve.castShadow = true;
    armPivot.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 10), trimMat);
    cuff.position.y = -0.38;
    armPivot.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.position.y = -0.44;
    armPivot.add(hand);

    if (i === 1) {
      const staffGroup = new THREE.Group();
      staffGroup.position.set(0, -0.42, 0.12);
      staffGroup.rotation.x = Math.PI * 0.42;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.022, 1.18, 8),
        makeAnimeToonMaterial({ color: '#6b472b', rimStrength: 0.2 }),
      );
      shaft.position.y = 0.25;
      staffGroup.add(shaft);
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.098, 0), glowMat);
      orb.position.y = 0.89;
      orb.userData.noOutline = true;
      staffGroup.add(orb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 6, 18), trimMat);
      ring.position.y = 0.89;
      staffGroup.add(ring);
      armPivot.add(staffGroup);
    }
    bodyRig.add(armPivot);
  });

  // Expressive Anime-Storybook Head
  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  headGroup.position.set(0, 1.49, 0);
  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 18), skinMat);
  headSphere.scale.set(1.0, 1.03, 0.95);
  headSphere.castShadow = true;
  headGroup.add(headSphere);

  // Expressive Anime Eyes (with lashes, colored iris, dual specular catchlights, and heterochromia)
  const lashMat = new THREE.MeshBasicMaterial({ color: '#241921' });
  const browMat = makeAnimeToonMaterial({ color: sculpt.hairHex, rimStrength: 0 });
  const catchMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  [-0.095, 0.095].forEach((ex, idx) => {
    const eyeHex = idx === 0 ? sculpt.eyeLeftHex : sculpt.eyeRightHex;
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      new THREE.MeshBasicMaterial({ color: '#fffef9' }),
    );
    sclera.position.set(ex, -0.015, 0.22);
    sclera.scale.set(0.95, 1.2, 0.42);
    sclera.userData.noOutline = true;
    headGroup.add(sclera);

    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 10),
      new THREE.MeshBasicMaterial({ color: eyeHex }),
    );
    iris.position.set(ex, -0.015, 0.242);
    iris.scale.set(0.92, 1.15, 0.34);
    iris.userData.noOutline = true;
    headGroup.add(iris);

    // Dual anime catchlight sparkles
    const shineLg = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), catchMat);
    shineLg.position.set(ex + 0.016, 0.01, 0.256);
    shineLg.userData.noOutline = true;
    headGroup.add(shineLg);

    const shineSm = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), catchMat);
    shineSm.position.set(ex - 0.014, -0.025, 0.256);
    shineSm.userData.noOutline = true;
    headGroup.add(shineSm);

    // Upper anime eyelash & brow
    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.02), lashMat);
    lash.position.set(ex, 0.052, 0.24);
    lash.rotation.z = idx === 0 ? 0.08 : -0.08;
    lash.userData.noOutline = true;
    headGroup.add(lash);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.016, 0.02), browMat);
    brow.position.set(ex, 0.098, 0.242);
    brow.rotation.z = idx === 0 ? -0.1 : 0.1;
    brow.userData.noOutline = true;
    headGroup.add(brow);
  });

  // Layered Two-Tone Anime Hair + Angel-Ring Sheen
  const hairMat = makeAnimeToonMaterial({ color: sculpt.hairHex, rimColor: '#fff2d8', rimStrength: 0.32 });
  const hairTipMat = makeAnimeToonMaterial({ color: sculpt.hairTipHex, rimColor: '#ffffff', rimStrength: 0.35 });

  const hairBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.288, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.63),
    hairMat,
  );
  hairBase.position.y = 0.035;
  hairBase.rotation.x = -0.18;
  headGroup.add(hairBase);

  // Back flowing hair volume for richer anime silhouette
  const hairBack = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 10), hairTipMat);
  hairBack.position.set(0, -0.05, -0.2);
  hairBack.rotation.x = Math.PI + 0.24;
  headGroup.add(hairBack);

  // Side locks framing face
  [-0.22, 0.22].forEach((sx, si) => {
    const sideLock = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 7), si === 0 ? hairMat : hairTipMat);
    sideLock.position.set(sx, -0.04, 0.1);
    sideLock.rotation.x = Math.PI - 0.12;
    sideLock.rotation.z = si === 0 ? -0.18 : 0.18;
    headGroup.add(sideLock);
  });

  // Sweeping bangs
  [-0.14, 0, 0.14].forEach((bx, bi) => {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.21, 7), bi === 1 ? hairTipMat : hairMat);
    bang.position.set(bx, 0.13, 0.215);
    bang.rotation.x = Math.PI * 0.78;
    bang.rotation.z = bx * -1.2;
    headGroup.add(bang);
  });

  // Signature Anime Hair Specular Halo Arc
  const angelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.012, 6, 20, Math.PI * 0.9),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }),
  );
  angelRing.position.set(0, 0.21, 0.04);
  angelRing.rotation.x = Math.PI * 0.45;
  angelRing.rotation.z = Math.PI * 0.05;
  angelRing.userData.noOutline = true;
  headGroup.add(angelRing);

  // Race-Specific Anatomical Traits
  if (cfg.raceId === 'high_elf' || cfg.raceId === 'dark_elf') {
    [-1, 1].forEach((dir) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 7), skinMat);
      ear.position.set(dir * 0.29, 0.02, -0.02);
      ear.rotation.z = dir * -1.22;
      headGroup.add(ear);
    });
  } else if (cfg.raceId === 'tide_siren' || cfg.raceId === 'river_naiad') {
    [-1, 1].forEach((dir) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.025), accentMat);
      fin.position.set(dir * 0.28, 0.01, -0.03);
      fin.rotation.y = dir * 0.35;
      headGroup.add(fin);
    });
  } else if (cfg.raceId === 'sky_avian') {
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.05), trimMat);
      wing.name = dir < 0 ? 'wingL' : 'wingR';
      wing.position.set(dir * 0.36, 1.05, -0.2);
      wing.rotation.z = dir * 0.32;
      wing.rotation.y = dir * -0.4;
      bodyRig.add(wing);
    });
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), accentMat);
    crest.position.set(0, 0.3, 0.02);
    crest.rotation.x = -0.35;
    headGroup.add(crest);
  } else if (cfg.raceId === 'cloud_sylph') {
    [-0.25, 0.25].forEach((cx) => {
      const nimbus = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), glowMat);
      nimbus.position.set(cx, 1.32, -0.15);
      nimbus.userData.noOutline = true;
      bodyRig.add(nimbus);
    });
  } else if (cfg.raceId === 'dryad') {
    const leafCrown = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 6, 14),
      makeAnimeToonMaterial({ color: '#4b8f44', rimColor: '#b7f598', rimStrength: 0.35 }),
    );
    leafCrown.position.y = 0.2;
    leafCrown.rotation.x = Math.PI / 2;
    headGroup.add(leafCrown);
  } else if (cfg.raceId === 'beastfolk') {
    const clan = BEAST_CLANS[cfg.beastClan ?? 'ember_fox'];
    const furMat = makeAnimeToonMaterial({ color: clan.furHex, rimColor: '#fff2d0', rimStrength: 0.3 });
    [-0.16, 0.16].forEach((ex, i) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.21, 7), furMat);
      ear.position.set(ex, 0.27, 0.02);
      ear.rotation.z = i === 0 ? 0.28 : -0.28;
      headGroup.add(ear);
    });
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.44, 4, 8), furMat);
    tail.name = 'tail';
    tail.position.set(0, 0.68, -0.32);
    tail.rotation.x = -0.85;
    bodyRig.add(tail);
  } else if (cfg.raceId === 'dwarf') {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 8), hairMat);
    beard.position.set(0, -0.22, 0.16);
    beard.rotation.x = Math.PI;
    headGroup.add(beard);
  } else if (cfg.raceId === 'draconic_kin') {
    [-0.15, 0.15].forEach((hx, i) => {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.27, 8),
        makeAnimeToonMaterial({ color: '#2b2530', rimColor: el.glowHex, rimStrength: 0.4 }),
      );
      horn.position.set(hx, 0.25, -0.04);
      horn.rotation.x = -0.45;
      horn.rotation.z = i === 0 ? 0.3 : -0.3;
      headGroup.add(horn);
    });
    const drakeTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.68, 8), skinMat);
    drakeTail.name = 'tail';
    drakeTail.position.set(0, 0.62, -0.35);
    drakeTail.rotation.x = -1.1;
    bodyRig.add(drakeTail);
  } else if (cfg.raceId === 'astral_kin') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 6, 24), glowMat);
    halo.position.set(0, 0.24, -0.12);
    halo.rotation.x = 0.55;
    halo.userData.noOutline = true;
    headGroup.add(halo);
  }

  // Modular Headgear
  const hatId = cfg.stitching?.headgear || cfg.equipped.headgear;
  const hatStyle = GEAR_BY_ID[hatId]?.silhouette ?? 'beanie_goggles';
  if (hatStyle === 'brim_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.03, 20), primaryMat);
    brim.position.y = 0.22;
    headGroup.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 16), primaryMat);
    cone.position.y = 0.43;
    cone.rotation.z = -0.12;
    headGroup.add(cone);
  } else if (hatStyle === 'beanie_goggles') {
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), accentMat);
    beanie.position.y = 0.08;
    headGroup.add(beanie);
    const goggleBand = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.07, 16), trimMat);
    goggleBand.position.y = 0.16;
    headGroup.add(goggleBand);
  } else if (hatStyle === 'visor_phones') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.03, 6, 18, Math.PI), trimMat);
    arc.position.y = 0.08;
    headGroup.add(arc);
    [-0.28, 0.28].forEach((px) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), glowMat);
      cup.position.set(px, 0.02, 0);
      cup.rotation.z = Math.PI / 2;
      cup.userData.noOutline = true;
      headGroup.add(cup);
    });
  } else if (hatStyle === 'circlet') {
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.02, 6, 20), glowMat);
    circlet.position.y = 0.18;
    circlet.rotation.x = Math.PI / 2;
    circlet.userData.noOutline = true;
    headGroup.add(circlet);
  }

  bodyRig.add(headGroup);

  // Subtle dark-ink anime outline around character silhouette
  addOutlineToGroup(bodyRig, 1.045, '#241921');

  return root;
}
