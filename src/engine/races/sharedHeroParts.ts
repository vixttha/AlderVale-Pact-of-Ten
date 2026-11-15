import * as THREE from 'three';
import { ELEMENTS, type ElementId } from '../../../shared/elements.ts';
import { GEAR_BY_ID, type WizardSculpt } from '../../../shared/wardrobe.ts';
import { makeAnimeToonMaterial } from '../animeShaders.ts';

export interface HeroMaterialPalette {
  skinMat: THREE.Material;
  primaryMat: THREE.Material;
  trimMat: THREE.Material;
  accentMat: THREE.Material;
  hairMat: THREE.Material;
  hairTipMat: THREE.Material;
  darkClothMat: THREE.Material;
  leatherMat: THREE.Material;
  metalMat: THREE.Material;
  glowMat: THREE.Material;
}

export function createHeroMaterials(
  elementId: ElementId,
  sculpt: WizardSculpt,
  rimSkinStrength = 0.34,
): HeroMaterialPalette {
  const el = ELEMENTS[elementId];
  return {
    skinMat: makeAnimeToonMaterial({
      color: sculpt.skinHex,
      rimColor: '#ffe7c4',
      rimStrength: rimSkinStrength,
    }),
    primaryMat: makeAnimeToonMaterial({
      color: sculpt.primaryDye,
      rimColor: el.glowHex,
      rimStrength: 0.26,
    }),
    trimMat: makeAnimeToonMaterial({
      color: sculpt.trimDye,
      rimColor: '#fff4d4',
      rimStrength: 0.38,
    }),
    accentMat: makeAnimeToonMaterial({
      color: sculpt.accentDye,
      emissive: el.glowHex,
      emissiveIntensity: 0.22,
      rimColor: el.glowHex,
      rimStrength: 0.36,
    }),
    hairMat: makeAnimeToonMaterial({
      color: sculpt.hairHex,
      rimColor: '#fff2d8',
      rimStrength: 0.34,
    }),
    hairTipMat: makeAnimeToonMaterial({
      color: sculpt.hairTipHex,
      rimColor: '#ffffff',
      rimStrength: 0.38,
    }),
    darkClothMat: makeAnimeToonMaterial({
      color: '#242a3a',
      rimColor: '#7a8cb8',
      rimStrength: 0.18,
    }),
    leatherMat: makeAnimeToonMaterial({
      color: '#573c2d',
      rimColor: '#d9b38c',
      rimStrength: 0.22,
    }),
    metalMat: makeAnimeToonMaterial({
      color: '#d9b45b',
      rimColor: '#ffffff',
      rimStrength: 0.45,
    }),
    glowMat: new THREE.MeshBasicMaterial({
      color: el.glowHex,
    }),
  };
}

/**
 * Builds sculpted anime-storybook eyes, brows, nose, mouth, blush & face markings
 * tailored to eyeShape ('bright' | 'sharp' | 'gentle'), browStyle, and marking.
 */
export function buildAnimeFace(
  headGroup: THREE.Group,
  sculpt: WizardSculpt,
  mats: HeroMaterialPalette,
  faceZ = 0.232,
) {
  const lashMat = new THREE.MeshBasicMaterial({ color: '#1f1620' });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#14121d' });
  const browMat = makeAnimeToonMaterial({ color: sculpt.hairHex, rimStrength: 0 });
  const catchMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mouthMat = new THREE.MeshBasicMaterial({ color: '#9c4e57' });
  const blushMat = new THREE.MeshBasicMaterial({
    color: '#ff8da1',
    transparent: true,
    opacity: 0.32,
  });

  const eyeScaleY =
    sculpt.eyeShape === 'sharp' ? 0.88 : sculpt.eyeShape === 'gentle' ? 1.04 : 1.18;
  const eyeScaleX =
    sculpt.eyeShape === 'sharp' ? 1.08 : sculpt.eyeShape === 'gentle' ? 0.96 : 0.95;
  const outerTilt =
    sculpt.eyeShape === 'sharp' ? 0.16 : sculpt.eyeShape === 'gentle' ? -0.14 : 0.04;

  [-0.088, 0.088].forEach((ex, idx) => {
    const sign = idx === 0 ? -1 : 1;
    const eyeHex = idx === 0 ? sculpt.eyeLeftHex : sculpt.eyeRightHex;

    // Eye white sclera
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.056, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#fffef9' }),
    );
    sclera.position.set(ex, -0.008, faceZ - 0.012);
    sclera.scale.set(eyeScaleX, eyeScaleY, 0.36);
    sclera.userData.noOutline = true;
    headGroup.add(sclera);

    // Colored anime iris
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.039, 12, 10),
      new THREE.MeshBasicMaterial({ color: eyeHex }),
    );
    iris.position.set(ex, -0.01, faceZ + 0.005);
    iris.scale.set(0.92 * eyeScaleX, 1.08 * eyeScaleY, 0.3);
    iris.userData.noOutline = true;
    headGroup.add(iris);

    // Deep pupil center
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), pupilMat);
    pupil.position.set(ex, -0.012, faceZ + 0.014);
    pupil.scale.set(0.9, 1.05 * eyeScaleY, 0.25);
    pupil.userData.noOutline = true;
    headGroup.add(pupil);

    // Dual anime catchlight highlights
    const shineLg = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), catchMat);
    shineLg.position.set(ex + 0.015, 0.013, faceZ + 0.018);
    shineLg.userData.noOutline = true;
    headGroup.add(shineLg);

    const shineSm = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), catchMat);
    shineSm.position.set(ex - 0.012, -0.024, faceZ + 0.018);
    shineSm.userData.noOutline = true;
    headGroup.add(shineSm);

    // Sculpted upper eyelash curve
    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.018, 0.022), lashMat);
    lash.position.set(ex, 0.044, faceZ + 0.008);
    lash.rotation.z = sign * -outerTilt;
    lash.userData.noOutline = true;
    headGroup.add(lash);

    // Brow matching browStyle ('arched' | 'bold' | 'soft')
    const browHeight = sculpt.browStyle === 'bold' ? 0.021 : 0.014;
    const browRot =
      sculpt.browStyle === 'arched'
        ? sign * 0.14
        : sculpt.browStyle === 'bold'
          ? sign * -0.16
          : sign * 0.04;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.092, browHeight, 0.02), browMat);
    brow.position.set(ex, 0.094, faceZ + 0.008);
    brow.rotation.z = browRot;
    brow.userData.noOutline = true;
    headGroup.add(brow);

    // Subtle warm cheek blush
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.032, 10), blushMat);
    cheek.position.set(ex + sign * 0.018, -0.068, faceZ + 0.004);
    cheek.rotation.y = sign * 0.25;
    cheek.scale.set(1.25, 0.65, 1);
    cheek.userData.noOutline = true;
    headGroup.add(cheek);
  });

  // Delicate anime nose wedge
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.038, 4), mats.skinMat);
  nose.position.set(0, -0.056, faceZ + 0.022);
  nose.rotation.x = Math.PI * 0.36;
  nose.userData.noOutline = true;
  headGroup.add(nose);

  // Expressive warm anime smile line
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055, 6, 12, Math.PI * 0.65), mouthMat);
  mouth.position.set(0, -0.104, faceZ - 0.005);
  mouth.rotation.z = Math.PI + Math.PI * 0.18;
  mouth.userData.noOutline = true;
  headGroup.add(mouth);

  // Facial Markings ('star_freckle' | 'cheek_rune' | 'brow_scar' | 'crescent')
  if (sculpt.marking === 'star_freckle') {
    [-0.105, -0.082, 0.082, 0.105].forEach((fx, idx) => {
      const dot = new THREE.Mesh(new THREE.OctahedronGeometry(0.008, 0), mats.glowMat);
      dot.position.set(fx, -0.062 - (idx % 2) * 0.012, faceZ + 0.006);
      dot.userData.noOutline = true;
      headGroup.add(dot);
    });
  } else if (sculpt.marking === 'cheek_rune') {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, 0.01), mats.glowMat);
    rune.position.set(0.112, -0.062, faceZ - 0.006);
    rune.rotation.y = 0.42;
    rune.rotation.z = -0.15;
    rune.userData.noOutline = true;
    headGroup.add(rune);
  } else if (sculpt.marking === 'brow_scar') {
    const scar = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.075, 0.012),
      new THREE.MeshBasicMaterial({ color: '#94525a' }),
    );
    scar.position.set(-0.088, 0.068, faceZ + 0.01);
    scar.rotation.z = -0.35;
    scar.userData.noOutline = true;
    headGroup.add(scar);
  } else if (sculpt.marking === 'crescent') {
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.0055, 6, 12, Math.PI * 1.25),
      mats.glowMat,
    );
    crescent.position.set(0, 0.125, faceZ + 0.002);
    crescent.rotation.z = 0.5;
    crescent.userData.noOutline = true;
    headGroup.add(crescent);
  }
}

/**
 * Helper to create a curved hair lock along a 3D spline for flowing 2026 anime hair.
 */
function makeCurvedHairLock(
  points: [number, number, number][],
  radius: number,
  mat: THREE.Material,
  radialSegments = 7,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, 12, radius, radialSegments, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Builds all 10 distinct HAIR_STYLES with layered two-tone strands and anime angel-ring sheen.
 */
export function buildAnimeHair(
  headGroup: THREE.Group,
  hairStyle: string,
  mats: HeroMaterialPalette,
) {
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hairGroup';

  // Sculpted crown cap covering top and back of cranium
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.268, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    mats.hairMat,
  );
  cap.position.set(0, 0.042, -0.012);
  cap.rotation.x = -0.22;
  cap.scale.set(1.02, 1.0, 1.04);
  cap.castShadow = true;
  hairGroup.add(cap);

  // Side face-framing tendrils (common base silhouette, varied per style)
  [-1, 1].forEach((dir) => {
    const tendril = makeCurvedHairLock(
      [
        [dir * 0.19, 0.14, 0.11],
        [dir * 0.23, 0.01, 0.14],
        [dir * 0.19, -0.14, 0.13],
      ],
      0.036,
      dir < 0 ? mats.hairMat : mats.hairTipMat,
    );
    hairGroup.add(tendril);
  });

  // Swept sculpted bangs
  [-0.11, -0.02, 0.08].forEach((bx, idx) => {
    const bang = makeCurvedHairLock(
      [
        [bx * 0.7, 0.23, 0.13],
        [bx, 0.15, 0.23],
        [bx + (idx === 1 ? 0.03 : -0.02), 0.04, 0.235],
      ],
      idx === 1 ? 0.038 : 0.032,
      idx === 1 ? mats.hairTipMat : mats.hairMat,
    );
    hairGroup.add(bang);
  });

  // Style-specific silhouettes across all 10 HAIR_STYLES
  if (hairStyle === 'Twin Braids') {
    [-1, 1].forEach((dir) => {
      for (let b = 0; b < 4; b++) {
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(0.048 - b * 0.006, 8, 8),
          b >= 2 ? mats.hairTipMat : mats.hairMat,
        );
        bead.position.set(dir * (0.21 + b * 0.018), -0.04 - b * 0.095, -0.04 + b * 0.02);
        hairGroup.add(bead);
      }
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.01, 6, 12), mats.trimMat);
      tie.position.set(dir * 0.25, -0.35, 0.02);
      tie.rotation.x = Math.PI / 2;
      tie.userData.noOutline = true;
      hairGroup.add(tie);
    });
  } else if (hairStyle === 'High Ponytail') {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 6, 14), mats.trimMat);
    tie.position.set(0, 0.24, -0.2);
    tie.rotation.x = 0.65;
    tie.userData.noOutline = true;
    hairGroup.add(tie);
    const tail = makeCurvedHairLock(
      [
        [0, 0.24, -0.21],
        [0.02, 0.18, -0.36],
        [0.04, -0.08, -0.4],
        [0.03, -0.3, -0.34],
      ],
      0.068,
      mats.hairTipMat,
    );
    hairGroup.add(tail);
  } else if (hairStyle === 'Curly Bob') {
    [-1, 0, 1].forEach((dir) => {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 12, 10),
        dir === 0 ? mats.hairMat : mats.hairTipMat,
      );
      puff.position.set(dir * 0.18, -0.04, -0.14);
      hairGroup.add(puff);
    });
  } else if (hairStyle === 'Spiked Crest') {
    [-0.14, -0.05, 0.04, 0.13].forEach((sx, i) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 6), i % 2 === 0 ? mats.hairMat : mats.hairTipMat);
      spike.position.set(sx, 0.27, 0.02 - i * 0.02);
      spike.rotation.z = -sx * 1.6;
      spike.rotation.x = -0.28;
      hairGroup.add(spike);
    });
  } else if (hairStyle === 'Half-Up Bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), mats.hairTipMat);
    bun.position.set(0, 0.31, -0.08);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.015, 6, 14), mats.trimMat);
    ring.position.set(0, 0.25, -0.08);
    ring.rotation.x = Math.PI / 2;
    ring.userData.noOutline = true;
    const drape = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 10), mats.hairMat);
    drape.position.set(0, -0.08, -0.19);
    drape.rotation.x = Math.PI + 0.18;
    hairGroup.add(bun, ring, drape);
  } else if (hairStyle === 'Long Flowing Locks') {
    [-0.12, 0, 0.12].forEach((lx, i) => {
      const lock = makeCurvedHairLock(
        [
          [lx, 0.12, -0.18],
          [lx * 1.15, -0.12, -0.26],
          [lx * 1.25, -0.44, -0.22],
        ],
        0.072,
        i === 1 ? mats.hairTipMat : mats.hairMat,
      );
      hairGroup.add(lock);
    });
  } else if (hairStyle === 'Undercut Crop') {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.32), mats.hairTipMat);
    crest.position.set(0.02, 0.23, 0.02);
    crest.rotation.z = -0.12;
    hairGroup.add(crest);
  } else if (hairStyle === 'Ribboned Curls') {
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 6, 18), mats.accentMat);
    ribbon.position.set(0, 0.21, 0);
    ribbon.rotation.x = Math.PI * 0.42;
    ribbon.userData.noOutline = true;
    hairGroup.add(ribbon);
    [-1, 1].forEach((dir) => {
      const curl = makeCurvedHairLock(
        [
          [dir * 0.18, 0.04, -0.14],
          [dir * 0.24, -0.14, -0.12],
          [dir * 0.18, -0.28, -0.06],
        ],
        0.058,
        mats.hairTipMat,
      );
      hairGroup.add(curl);
    });
  } else {
    // Windblown Shag & Messy Side-Sweep (layered swept back plumes)
    const sweepDir = hairStyle === 'Messy Side-Sweep' ? 1 : 0;
    [-0.14, 0, 0.14].forEach((bx, bi) => {
      const backLock = makeCurvedHairLock(
        [
          [bx, 0.12, -0.15],
          [bx + sweepDir * 0.06, -0.04, -0.26],
          [bx + sweepDir * 0.1, -0.22, -0.22],
        ],
        0.064,
        bi === 1 ? mats.hairTipMat : mats.hairMat,
      );
      hairGroup.add(backLock);
    });
  }

  // Signature 2026 Anime Angel-Ring Specular Hair Sheen
  const angelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.225, 0.011, 6, 20, Math.PI * 0.88),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }),
  );
  angelRing.position.set(0, 0.205, 0.04);
  angelRing.rotation.x = Math.PI * 0.44;
  angelRing.rotation.z = Math.PI * 0.06;
  angelRing.userData.noOutline = true;
  hairGroup.add(angelRing);

  headGroup.add(hairGroup);
}

/**
 * Builds sculpted modular footwear matching all 3 GEAR silhouettes
 * ('high_top_sneakers' | 'combat_boots' | 'greaves').
 */
export function buildModularFootwear(
  legPivot: THREE.Group,
  footGearId: string,
  mats: HeroMaterialPalette,
  offsetY = -0.535,
) {
  const footGear = GEAR_BY_ID[footGearId]?.silhouette ?? 'high_top_sneakers';
  const shoeGroup = new THREE.Group();
  shoeGroup.position.set(0, offsetY, 0.02);

  if (footGear === 'greaves') {
    const shinPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.078, 0.24, 10),
      makeAnimeToonMaterial({ color: '#2f8a73', rimColor: '#d4f7eb', rimStrength: 0.38 }),
    );
    shinPlate.position.set(0, 0.14, 0);
    const kneeGuard = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), mats.metalMat);
    kneeGuard.position.set(0, 0.27, 0.05);
    kneeGuard.scale.set(1.1, 0.9, 0.65);
    shoeGroup.add(shinPlate, kneeGuard);
  } else if (footGear === 'combat_boots') {
    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.082, 0.22, 10), mats.leatherMat);
    bootShaft.position.set(0, 0.12, -0.01);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.13), mats.metalMat);
    buckle.position.set(0, 0.16, 0.01);
    buckle.userData.noOutline = true;
    shoeGroup.add(bootShaft, buckle);
  } else {
    // High-top rune sneaker cuff & tongue
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.086, 0.12, 10), mats.trimMat);
    cuff.position.set(0, 0.09, -0.01);
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.04), mats.accentMat);
    tongue.position.set(0, 0.09, 0.068);
    tongue.rotation.x = -0.22;
    tongue.userData.noOutline = true;
    shoeGroup.add(cuff, tongue);
  }

  // Sculpted rounded shoe upper + rounded toe cap + glowing rune sole
  const shoeMat =
    footGear === 'greaves'
      ? makeAnimeToonMaterial({ color: '#266b59', rimColor: '#ffffff', rimStrength: 0.35 })
      : footGear === 'combat_boots'
        ? mats.leatherMat
        : makeAnimeToonMaterial({ color: '#eef2f9', rimColor: '#ffffff', rimStrength: 0.3 });

  const heelBlock = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.11, 0.18), shoeMat);
  heelBlock.position.set(0, 0.0, -0.01);
  heelBlock.castShadow = true;

  const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), shoeMat);
  toeCap.position.set(0, -0.005, 0.085);
  toeCap.scale.set(1.0, 0.72, 1.18);
  toeCap.castShadow = true;

  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.036, 0.27), mats.darkClothMat);
  sole.position.set(0, -0.056, 0.025);

  const glowStripe = new THREE.Mesh(new THREE.BoxGeometry(0.172, 0.018, 0.275), mats.glowMat);
  glowStripe.position.set(0, -0.042, 0.025);
  glowStripe.userData.noOutline = true;

  shoeGroup.add(heelBlock, toeCap, sole, glowStripe);
  legPivot.add(shoeGroup);
}

/**
 * Builds sculpted back accessories ('satchel' | 'floating_scarf' | 'split_cloak').
 */
export function buildModularBackGear(
  bodyRig: THREE.Group,
  cloakGroup: THREE.Group,
  backGearId: string,
  mats: HeroMaterialPalette,
) {
  const backStyle = GEAR_BY_ID[backGearId]?.silhouette ?? 'satchel';
  if (backStyle === 'satchel') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.022, 6, 18), mats.leatherMat);
    strap.position.set(0, 0.96, 0);
    strap.rotation.set(0.42, 0.22, 0.8);
    strap.userData.noOutline = true;
    bodyRig.add(strap);

    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.19, 0.11), mats.leatherMat);
    bag.position.set(-0.22, -0.42, 0.04);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.09, 0.12), mats.accentMat);
    flap.position.set(-0.22, -0.36, 0.045);
    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), mats.metalMat);
    clasp.position.set(-0.22, -0.39, 0.11);
    clasp.userData.noOutline = true;
    cloakGroup.add(bag, flap, clasp);
  } else if (backStyle === 'floating_scarf') {
    const neckWrap = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.052, 8, 18), mats.accentMat);
    neckWrap.position.set(0, 1.24, 0.01);
    neckWrap.rotation.x = Math.PI / 2;
    bodyRig.add(neckWrap);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.02, -0.02),
      new THREE.Vector3(0.14, -0.18, -0.14),
      new THREE.Vector3(0.1, -0.44, -0.22),
      new THREE.Vector3(0.16, -0.58, -0.16),
    ]);
    const scarfTail = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.055, 6, false), mats.accentMat);
    scarfTail.scale.set(1.5, 1.0, 0.5);
    cloakGroup.add(scarfTail);
  } else if (backStyle === 'split_cloak') {
    const shoulderYoke = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.036, 6, 16, Math.PI), mats.trimMat);
    shoulderYoke.position.set(0, 0.03, 0.06);
    shoulderYoke.rotation.x = Math.PI * 0.45;
    cloakGroup.add(shoulderYoke);

    [-1, 1].forEach((dir) => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(dir * 0.24, -0.08);
      wingShape.lineTo(dir * 0.29, -0.72);
      wingShape.lineTo(dir * 0.04, -0.62);
      wingShape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        bevelSegments: 2,
      });
      const wing = new THREE.Mesh(wingGeo, mats.primaryMat);
      wing.position.set(dir * 0.04, 0.02, -0.05);
      wing.rotation.x = 0.2;
      wing.castShadow = true;
      cloakGroup.add(wing);
    });
  }
}

/**
 * Builds sculpted modular headgear ('beanie_goggles' | 'brim_hat' | 'visor_phones' | 'circlet').
 */
export function buildModularHeadgear(
  headGroup: THREE.Group,
  hatGearId: string,
  mats: HeroMaterialPalette,
) {
  const hatStyle = GEAR_BY_ID[hatGearId]?.silhouette ?? 'beanie_goggles';
  if (hatStyle === 'brim_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.028, 22), mats.primaryMat);
    brim.position.y = 0.21;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.06, 18), mats.trimMat);
    band.position.y = 0.25;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.065, 0.04), mats.metalMat);
    buckle.position.set(0, 0.255, 0.245);
    buckle.userData.noOutline = true;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.44, 16), mats.primaryMat);
    cone.position.set(0.02, 0.45, -0.02);
    cone.rotation.z = -0.14;
    cone.rotation.x = -0.08;
    headGroup.add(brim, band, buckle, cone);
  } else if (hatStyle === 'beanie_goggles') {
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.278, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
      mats.accentMat,
    );
    beanie.position.set(0, 0.075, -0.01);
    beanie.rotation.x = -0.15;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.028, 8, 20), mats.trimMat);
    cuff.position.set(0, 0.145, -0.01);
    cuff.rotation.x = Math.PI * 0.45;
    headGroup.add(beanie, cuff);

    // Dual aviator sky-goggles resting on forehead
    [-0.085, 0.085].forEach((gx) => {
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.036, 12), mats.metalMat);
      frame.rotation.x = Math.PI / 2;
      frame.position.set(gx, 0.165, 0.235);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.042, 12), mats.glowMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, 0.165, 0.238);
      lens.userData.noOutline = true;
      headGroup.add(frame, lens);
    });
  } else if (hatStyle === 'visor_phones') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.288, 0.024, 6, 18, Math.PI), mats.trimMat);
    arc.position.y = 0.08;
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.268, 0.268, 0.085, 16, 1, true, -Math.PI * 0.3, Math.PI * 0.6),
      new THREE.MeshBasicMaterial({ color: '#6fffe9', transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    visor.position.set(0, 0.015, 0.01);
    visor.userData.noOutline = true;
    headGroup.add(arc, visor);
    [-0.275, 0.275].forEach((px) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.052, 12), mats.darkClothMat);
      cup.position.set(px, 0.015, 0);
      cup.rotation.z = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 6, 14), mats.glowMat);
      ring.position.set(px + (px < 0 ? -0.028 : 0.028), 0.015, 0);
      ring.rotation.y = Math.PI / 2;
      ring.userData.noOutline = true;
      headGroup.add(cup, ring);
    });
  } else if (hatStyle === 'circlet') {
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.258, 0.018, 6, 22), mats.metalMat);
    circlet.position.y = 0.175;
    circlet.rotation.x = Math.PI * 0.47;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), mats.glowMat);
    gem.position.set(0, 0.185, 0.258);
    gem.userData.noOutline = true;
    headGroup.add(circlet, gem);
  }
}

/**
 * Builds distinct 3D staff/wand geometry for all 3 staff silhouettes
 * ('wand' | 'astrolabe_staff' | 'lantern_staff').
 */
export function buildModularStaff(
  armPivot: THREE.Group,
  staffGearId: string,
  mats: HeroMaterialPalette,
  offsetY = -0.41,
) {
  const staffStyle = GEAR_BY_ID[staffGearId]?.silhouette ?? 'wand';
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0, offsetY, 0.09);
  staffGroup.rotation.x = Math.PI * 0.43;

  const woodMat = makeAnimeToonMaterial({ color: '#6b472b', rimColor: '#ffd9b0', rimStrength: 0.22 });

  if (staffStyle === 'astrolabe_staff') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.021, 1.32, 8), woodMat);
    shaft.position.y = 0.26;
    const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.018, 6, 20), mats.metalMat);
    ringOuter.position.y = 0.96;
    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.013, 6, 16), mats.trimMat);
    ringInner.position.y = 0.96;
    ringInner.rotation.y = Math.PI / 3;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), mats.glowMat);
    core.position.y = 0.96;
    core.userData.noOutline = true;
    staffGroup.add(shaft, ringOuter, ringInner, core);
  } else if (staffStyle === 'lantern_staff') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 1.35, 8), mats.darkClothMat);
    shaft.position.y = 0.28;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.34, 4), mats.glowMat);
    blade.position.set(0, 1.08, 0);
    blade.scale.set(0.55, 1.0, 1.0);
    blade.userData.noOutline = true;
    const lanternCage = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), mats.metalMat);
    lanternCage.position.set(0, 0.9, 0.07);
    const lanternCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), mats.glowMat);
    lanternCore.position.set(0, 0.9, 0.07);
    lanternCore.userData.noOutline = true;
    staffGroup.add(shaft, blade, lanternCage, lanternCore);
  } else {
    // Alderwood Apprentice Wand
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.019, 1.08, 8), woodMat);
    shaft.position.y = 0.2;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.18, 8), mats.leatherMat);
    grip.position.y = -0.05;
    const prongL = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.14, 5), mats.metalMat);
    prongL.position.set(-0.045, 0.77, 0);
    prongL.rotation.z = 0.32;
    const prongR = prongL.clone();
    prongR.position.x = 0.045;
    prongR.rotation.z = -0.32;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.078, 0), mats.glowMat);
    orb.position.y = 0.81;
    orb.userData.noOutline = true;
    staffGroup.add(shaft, grip, prongL, prongR, orb);
  }

  armPivot.add(staffGroup);
}
