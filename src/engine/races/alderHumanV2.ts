import * as THREE from 'three';
import { ELEMENTS } from '../../../shared/elements.ts';
import { GEAR_BY_ID } from '../../../shared/wardrobe.ts';
import type { WizardMeshConfig } from '../avatarMesh.ts';
import { addOutlineToGroup, createContactShadow, makeAnimeToonMaterial } from '../animeShaders.ts';
import {
  buildAnimeFace,
  buildAnimeHair,
  buildModularBackGear,
  buildModularFootwear,
  buildModularHeadgear,
  buildModularStaff,
  createHeroMaterials,
} from './sharedHeroParts.ts';

/**
 * Alder Human v2 — Bespoke 2026 "Bridging Folk Skyfarer" Anime-Storybook Hero Model.
 * Upgrades v1 with:
 * - Sculpted LatheGeometry chest-to-waist-to-hip torso + inner Academy cravat/collar + utility belt & pouch
 * - Neck + contoured anime jawline + sculpted human ears
 * - Articulated 2-segment limbs (`legL/shinL`, `legR/shinR`, `armL/forearmL`, `armR/forearmR`)
 * - All 10 sculpted TubeGeometry hairstyles, eye shapes, brow styles, facial markings & 3 distinct staff meshes
 */
export function buildAlderHumanV2(cfg: WizardMeshConfig): THREE.Group {
  const root = new THREE.Group();
  const { sculpt } = cfg;
  const el = ELEMENTS[cfg.elementId];
  const mats = createHeroMaterials(cfg.elementId, sculpt, 0.34);

  const buildScaleX =
    sculpt.build === 'athletic' ? 1.09 : sculpt.build === 'slender' ? 0.91 : 1.0;
  const heightScale = Math.max(0.86, Math.min(1.14, sculpt.height));

  // Soft contact shadow pinned flush on floor
  root.add(createContactShadow(0.56, 0.42));

  const bodyRig = new THREE.Group();
  bodyRig.name = 'bodyRig';
  bodyRig.scale.set(buildScaleX, heightScale, buildScaleX * 0.96);
  root.add(bodyRig);

  // 1. Articulated 2-Segment Legs (`legL`/`shinL` & `legR`/`shinR`)
  const footId = cfg.stitching?.footwear || cfg.equipped.footwear;
  const thighGeo = new THREE.CylinderGeometry(0.104, 0.082, 0.3, 12);
  const calfGeo = new THREE.CylinderGeometry(0.08, 0.068, 0.25, 12);

  [-0.125, 0.125].forEach((xOff, i) => {
    const legPivot = new THREE.Group();
    legPivot.name = i === 0 ? 'legL' : 'legR';
    legPivot.position.set(xOff, 0.61, 0);

    const thigh = new THREE.Mesh(thighGeo, mats.darkClothMat);
    thigh.position.y = -0.14;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), mats.darkClothMat);
    knee.position.y = -0.28;
    legPivot.add(knee);

    const shinPivot = new THREE.Group();
    shinPivot.name = i === 0 ? 'shinL' : 'shinR';
    shinPivot.position.set(0, -0.28, 0);

    const calf = new THREE.Mesh(calfGeo, mats.darkClothMat);
    calf.position.y = -0.13;
    calf.castShadow = true;
    shinPivot.add(calf);

    buildModularFootwear(shinPivot, footId, mats, -0.255);
    legPivot.add(shinPivot);
    bodyRig.add(legPivot);
  });

  // 2. Sculpted LatheGeometry Torso + Tailored Academy Outerwear
  const torsoId = cfg.stitching?.torso || cfg.equipped.torso;
  const torsoStyle = GEAR_BY_ID[torsoId]?.silhouette ?? 'cropped_bomber';

  const torsoProfile = [
    new THREE.Vector2(0.0, 0.6),
    new THREE.Vector2(0.195, 0.61), // pelvis
    new THREE.Vector2(0.205, 0.69), // hip flare
    new THREE.Vector2(0.172, 0.81), // tailored waist taper
    new THREE.Vector2(0.215, 0.99), // ribcage
    new THREE.Vector2(0.238, 1.15), // chest & broad shoulder line
    new THREE.Vector2(0.185, 1.24), // trapezius/collar slope
    new THREE.Vector2(0.095, 1.26), // collar opening
    new THREE.Vector2(0.0, 1.26),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 18);
  const torsoMesh = new THREE.Mesh(torsoGeo, mats.primaryMat);
  torsoMesh.scale.set(1.06, 1.0, 0.84);
  torsoMesh.castShadow = true;
  bodyRig.add(torsoMesh);

  // Inner shirt V-placket + Academy cravat + Pact-Crest brooch
  const innerShirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.105, 0.24, 6),
    makeAnimeToonMaterial({ color: '#f4efe6', rimColor: '#ffffff', rimStrength: 0.22 }),
  );
  innerShirt.position.set(0, 1.13, 0.145);
  innerShirt.rotation.x = Math.PI;
  innerShirt.scale.set(1.0, 1.0, 0.4);
  bodyRig.add(innerShirt);

  const cravat = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.14, 5), mats.accentMat);
  cravat.position.set(0, 1.15, 0.18);
  cravat.rotation.x = Math.PI - 0.1;
  cravat.scale.set(1.1, 1.0, 0.45);
  bodyRig.add(cravat);

  const collarBand = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.032, 8, 20), mats.trimMat);
  collarBand.position.set(0, 1.245, 0.01);
  collarBand.rotation.x = Math.PI / 2;
  bodyRig.add(collarBand);

  const pactBrooch = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), mats.glowMat);
  pactBrooch.position.set(0.125, 1.08, 0.2);
  pactBrooch.userData.noOutline = true;
  bodyRig.add(pactBrooch);

  // Belt + Brass Buckle + Side Rune-Pouch
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.184, 0.194, 0.068, 16), mats.leatherMat);
  belt.position.y = 0.78;
  belt.scale.set(1.07, 1.0, 0.87);
  bodyRig.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.056, 0.034), mats.metalMat);
  buckle.position.set(0, 0.78, 0.175);
  buckle.userData.noOutline = true;
  bodyRig.add(buckle);

  const sidePouch = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.11, 0.075), mats.leatherMat);
  sidePouch.position.set(0.195, 0.72, 0.04);
  sidePouch.rotation.z = -0.14;
  bodyRig.add(sidePouch);

  // Outerwear Silhouette Layering
  if (torsoStyle === 'street_trench' || torsoStyle === 'grand_robe') {
    const skirtProfile = [
      new THREE.Vector2(0.188, 0.77),
      new THREE.Vector2(0.24, 0.56),
      new THREE.Vector2(torsoStyle === 'grand_robe' ? 0.36 : 0.3, 0.31),
    ];
    const coatSkirt = new THREE.Mesh(
      new THREE.LatheGeometry(skirtProfile, 18, Math.PI * 0.14, Math.PI * 1.72),
      makeAnimeToonMaterial({
        color: sculpt.primaryDye,
        side: THREE.DoubleSide,
        rimColor: el.glowHex,
        rimStrength: 0.3,
      }),
    );
    coatSkirt.rotation.y = Math.PI; // Open slit faces front (+Z) cleanly!
    coatSkirt.scale.set(1.06, 1.0, 0.9);
    coatSkirt.castShadow = true;
    coatSkirt.name = 'coatSkirt';
    bodyRig.add(coatSkirt);

    // Coat lapels & gold hem trim
    [-0.1, 0.1].forEach((lx, i) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.32, 0.03), mats.trimMat);
      lapel.position.set(lx, 1.04, 0.185);
      lapel.rotation.z = i === 0 ? 0.18 : -0.18;
      bodyRig.add(lapel);
    });
  } else if (torsoStyle === 'poncho') {
    const poncho = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.42, 0.44, 16, 1, true),
      makeAnimeToonMaterial({
        color: sculpt.trimDye,
        side: THREE.DoubleSide,
        rimColor: '#fff4d4',
        rimStrength: 0.35,
      }),
    );
    poncho.position.y = 1.04;
    poncho.scale.set(1.05, 1.0, 0.92);
    const ponchoTrim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 20), mats.accentMat);
    ponchoTrim.position.y = 0.83;
    ponchoTrim.rotation.x = Math.PI / 2;
    ponchoTrim.scale.set(1.05, 0.92, 1.0);
    bodyRig.add(poncho, ponchoTrim);
  } else {
    // Cropped Sigil Bomber: ribbed hem + front zip + shoulder patches
    const bomberHem = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.194, 0.085, 16), mats.trimMat);
    bomberHem.position.y = 0.72;
    bomberHem.scale.set(1.08, 1.0, 0.88);
    const zipLine = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.42, 0.022), mats.metalMat);
    zipLine.position.set(0, 0.96, 0.192);
    zipLine.userData.noOutline = true;
    bodyRig.add(bomberHem, zipLine);
  }

  // 3. Back Gear inside animated `cloakGroup`
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'cloakGroup';
  cloakGroup.position.set(0, 1.2, -0.16);
  bodyRig.add(cloakGroup);

  const backId = cfg.stitching?.back || cfg.equipped.back;
  buildModularBackGear(bodyRig, cloakGroup, backId, mats);

  // 4. Articulated 2-Segment Arms (`armL`/`forearmL` & `armR`/`forearmR`) + Distinct Staff
  const staffId = cfg.stitching?.staff || cfg.equipped.staff;
  const upperArmGeo = new THREE.CylinderGeometry(0.072, 0.064, 0.23, 10);
  const forearmGeo = new THREE.CylinderGeometry(0.062, 0.052, 0.21, 10);

  [-0.275, 0.275].forEach((xOff, i) => {
    const isRight = i === 1;
    const armPivot = new THREE.Group();
    armPivot.name = isRight ? 'armR' : 'armL';
    armPivot.position.set(xOff, 1.18, 0);

    // Subtle castPose resting posture
    if (sculpt.castPose === 'duelist') {
      armPivot.rotation.z = isRight ? -0.14 : 0.12;
      armPivot.rotation.x = isRight ? -0.18 : 0.08;
    } else if (sculpt.castPose === 'drifter') {
      armPivot.rotation.z = isRight ? -0.08 : 0.08;
    }

    // Shoulder cap / pauldron puff
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), mats.primaryMat);
    shoulder.scale.set(1.05, 0.95, 1.0);
    armPivot.add(shoulder);

    const upperArm = new THREE.Mesh(upperArmGeo, mats.primaryMat);
    upperArm.position.y = -0.11;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), mats.primaryMat);
    elbow.position.y = -0.22;
    armPivot.add(elbow);

    const forearmPivot = new THREE.Group();
    forearmPivot.name = isRight ? 'forearmR' : 'forearmL';
    forearmPivot.position.set(0, -0.22, 0);
    if (sculpt.castPose === 'duelist' && isRight) {
      forearmPivot.rotation.x = -0.35;
    } else {
      forearmPivot.rotation.x = -0.12;
    }

    const forearm = new THREE.Mesh(forearmGeo, mats.primaryMat);
    forearm.position.y = -0.1;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.048, 10), mats.trimMat);
    cuff.position.y = -0.185;
    forearmPivot.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.054, 10, 8), mats.skinMat);
    hand.position.y = -0.235;
    hand.scale.set(0.92, 1.1, 0.85);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), mats.skinMat);
    thumb.position.set(isRight ? -0.036 : 0.036, -0.225, 0.028);
    thumb.userData.noOutline = true;
    forearmPivot.add(hand, thumb);

    if (isRight) {
      buildModularStaff(forearmPivot, staffId, mats, -0.225);
    }

    armPivot.add(forearmPivot);
    bodyRig.add(armPivot);
  });

  // 5. Neck + Sculpted Anime Head (Cranium + Contoured Jawline + Human Ears)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.14, 10), mats.skinMat);
  neck.position.set(0, 1.31, 0);
  bodyRig.add(neck);

  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  headGroup.position.set(0, 1.51, 0.01);

  // Upper anime cranium
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.245, 22, 18), mats.skinMat);
  cranium.position.y = 0.02;
  cranium.scale.set(1.02, 0.98, 0.96);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Tapered anime chin & jawline
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 12), mats.skinMat);
  jaw.position.set(0, -0.08, 0.035);
  jaw.scale.set(0.92, 0.88, 0.88);
  jaw.castShadow = true;
  headGroup.add(jaw);

  // Sculpted Human Ears
  [-1, 1].forEach((dir) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), mats.skinMat);
    ear.position.set(dir * 0.242, -0.022, -0.015);
    ear.scale.set(0.45, 1.05, 0.72);
    ear.rotation.y = dir * -0.28;
    headGroup.add(ear);

    const earInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 6, 6),
      makeAnimeToonMaterial({ color: '#c48f74', rimStrength: 0.1 }),
    );
    earInner.position.set(dir * 0.248, -0.024, -0.008);
    earInner.scale.set(0.3, 0.7, 0.5);
    earInner.userData.noOutline = true;
    headGroup.add(earInner);
  });

  // Expressive anime eyes, brows, nose, smile, blush & markings
  buildAnimeFace(headGroup, sculpt, mats, 0.228);

  // 10 distinct sculpted anime hairstyles + angel-ring highlight
  buildAnimeHair(headGroup, sculpt.hairStyle, mats);

  // Modular Headgear
  const hatId = cfg.stitching?.headgear || cfg.equipped.headgear;
  buildModularHeadgear(headGroup, hatId, mats);

  bodyRig.add(headGroup);

  // Crisp anime ink silhouette outline
  addOutlineToGroup(bodyRig, 1.038, '#241921');

  return root;
}
