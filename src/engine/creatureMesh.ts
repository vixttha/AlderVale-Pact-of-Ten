import * as THREE from 'three';
import { ELEMENTS, type ElementId } from '../../shared/elements.ts';
import { SPECIES_BY_ID, type ChromaticVariant } from '../../shared/creatures.ts';
import { addOutlineToGroup, createContactShadow, makeAnimeToonMaterial } from './animeShaders.ts';

export function buildCreatureGroup(params: {
  speciesId: string;
  stage: 1 | 2 | 3;
  chromatic: ChromaticVariant;
  elementOverride?: ElementId;
}): THREE.Group {
  const sp = SPECIES_BY_ID[params.speciesId] ?? SPECIES_BY_ID.cinder_kitsune;
  const el = ELEMENTS[params.elementOverride ?? sp.element];
  const group = new THREE.Group();

  const scale = params.stage === 3 ? 1.28 : params.stage === 2 ? 1.05 : 0.82;
  group.scale.setScalar(scale);

  // Contact shadow disc
  group.add(createContactShadow(0.45, 0.36));

  const primaryColor =
    params.chromatic === 'dawn'
      ? '#ffd79a'
      : params.chromatic === 'dusk'
        ? '#453b6e'
        : el.primaryHex;
  const glowColor =
    params.chromatic === 'dawn'
      ? '#fff0b3'
      : params.chromatic === 'dusk'
        ? '#c78dff'
        : el.glowHex;

  const bodyMat = makeAnimeToonMaterial({
    color: primaryColor,
    rimColor: glowColor,
    rimStrength: 0.34,
  });
  const glowMat = makeAnimeToonMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 0.72,
    rimColor: '#ffffff',
    rimStrength: 0.4,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1b1d28' });
  const sparkleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const bodyMeshGroup = new THREE.Group();
  bodyMeshGroup.name = 'creatureBody';
  group.add(bodyMeshGroup);

  // Torso
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.28, 6, 14), bodyMat);
  body.position.y = 0.38;
  body.rotation.z = sp.silhouette === 'owl' || sp.silhouette === 'golem' ? 0 : Math.PI / 2.2;
  body.castShadow = true;
  bodyMeshGroup.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 14), bodyMat);
  head.position.set(0, 0.59, 0.18);
  head.castShadow = true;
  bodyMeshGroup.add(head);

  // Expressive anime eyes + catchlights
  [-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeMat);
    eye.position.set(ex, 0.62, 0.36);
    eye.userData.noOutline = true;
    bodyMeshGroup.add(eye);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), sparkleMat);
    glint.position.set(ex + 0.012, 0.635, 0.39);
    glint.userData.noOutline = true;
    bodyMeshGroup.add(glint);
  });

  // Silhouette specific appendages (with named pivots for animation!)
  if (sp.silhouette === 'fox' || sp.silhouette === 'lynx') {
    [-0.1, 0.1].forEach((ex, i) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.17, 7), glowMat);
      ear.position.set(ex, 0.79, 0.16);
      ear.rotation.z = i === 0 ? 0.25 : -0.25;
      bodyMeshGroup.add(ear);
    });
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 4, 8), glowMat);
    tail.name = 'creatureTail';
    tail.position.set(0, 0.46, -0.34);
    tail.rotation.x = -0.8;
    bodyMeshGroup.add(tail);
  } else if (sp.silhouette === 'stag') {
    [-0.1, 0.1].forEach((ax, i) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.36, 7), glowMat);
      antler.position.set(ax, 0.87, 0.14);
      antler.rotation.z = i === 0 ? 0.38 : -0.38;
      bodyMeshGroup.add(antler);
    });
  } else if (sp.silhouette === 'owl' || sp.silhouette === 'gryphon' || sp.silhouette === 'drake' || sp.silhouette === 'moth') {
    [-0.28, 0.28].forEach((wx, i) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.04), glowMat);
      wing.name = i === 0 ? 'creatureWingL' : 'creatureWingR';
      wing.position.set(wx, 0.53, -0.02);
      wing.rotation.z = i === 0 ? 0.35 : -0.35;
      bodyMeshGroup.add(wing);
    });
  } else if (sp.silhouette === 'sprout') {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat);
    leaf.scale.set(1.4, 0.4, 0.8);
    leaf.position.set(0, 0.84, 0.18);
    bodyMeshGroup.add(leaf);
  } else if (sp.silhouette === 'clockwork') {
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 6, 14), glowMat);
    gear.name = 'creatureGear';
    gear.position.set(0, 0.56, -0.15);
    bodyMeshGroup.add(gear);
  }

  addOutlineToGroup(bodyMeshGroup, 1.05, '#241921');

  // Stage 3 Sovereign Halo Ring
  if (params.stage === 3) {
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.022, 6, 20),
      new THREE.MeshBasicMaterial({ color: glowColor }),
    );
    crown.name = 'creatureHalo';
    crown.position.set(0, 0.94, 0.14);
    crown.rotation.x = Math.PI / 2;
    crown.userData.noOutline = true;
    group.add(crown);
  }

  return group;
}

export function buildMountGroup(mountId: string): THREE.Group {
  const g = new THREE.Group();
  if (mountId === 'mount_clockwork_stag') {
    const stag = buildCreatureGroup({ speciesId: 'rime_stag', stage: 3, chromatic: 'dawn', elementOverride: 'verdigris' });
    stag.scale.setScalar(1.35);
    g.add(stag);
  } else if (mountId === 'mount_nimbus_hoverboard') {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.09, 1.85),
      makeAnimeToonMaterial({
        color: '#4f5fd1',
        emissive: '#98a6ff',
        emissiveIntensity: 0.45,
        rimColor: '#ffffff',
        rimStrength: 0.4,
      }),
    );
    board.position.y = 0.25;
    g.add(board);

    const trimStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.03, 1.72),
      new THREE.MeshBasicMaterial({ color: '#9cf6ff' }),
    );
    trimStrip.position.y = 0.25;
    trimStrip.userData.noOutline = true;
    g.add(trimStrip);
    addOutlineToGroup(g, 1.035, '#241921');
  } else {
    // Alder-Pine Cloud Broom
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.048, 1.9, 10),
      makeAnimeToonMaterial({ color: '#784c2c', rimColor: '#ffd99e', rimStrength: 0.25 }),
    );
    stick.rotation.x = Math.PI / 2;
    stick.position.y = 0.38;
    g.add(stick);
    const bristles = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 0.5, 10),
      makeAnimeToonMaterial({ color: '#d4901c', rimColor: '#fff2b8', rimStrength: 0.35 }),
    );
    bristles.rotation.x = -Math.PI / 2;
    bristles.position.set(0, 0.38, -0.98);
    g.add(bristles);
    const wrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.022, 6, 12),
      new THREE.MeshBasicMaterial({ color: '#7ee8ff' }),
    );
    wrap.position.set(0, 0.38, -0.72);
    wrap.userData.noOutline = true;
    g.add(wrap);
    addOutlineToGroup(g, 1.04, '#241921');
  }
  return g;
}
