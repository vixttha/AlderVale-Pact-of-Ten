import * as THREE from 'three';

let cachedToonRamp: THREE.DataTexture | null = null;
let cachedContactShadowTex: THREE.CanvasTexture | null = null;
let cachedCobbleTex: THREE.CanvasTexture | null = null;
let cachedGrassTex: THREE.CanvasTexture | null = null;
let cachedWoodTex: THREE.CanvasTexture | null = null;
let cachedArenaTex: THREE.CanvasTexture | null = null;
let cachedWaterTex: THREE.CanvasTexture | null = null;

/**
 * Sharp 4-band cel-shading ramp for 2026 anime shadow crispness.
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (cachedToonRamp) return cachedToonRamp;
  const bands = new Uint8Array([84, 152, 224, 255]);
  const tex = new THREE.DataTexture(bands, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedToonRamp = tex;
  return tex;
}

/**
 * Creates a MeshToonMaterial enhanced with subtle anime Fresnel rim lighting.
 */
export function makeAnimeToonMaterial(params: {
  color: string | number;
  map?: THREE.Texture;
  emissive?: string | number;
  emissiveIntensity?: number;
  rimColor?: string | number;
  rimStrength?: number;
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: params.color,
    gradientMap: getToonGradientMap(),
    map: params.map ?? null,
    emissive: params.emissive !== undefined ? new THREE.Color(params.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: params.emissiveIntensity ?? 1.0,
    side: params.side ?? THREE.FrontSide,
    transparent: params.transparent ?? false,
    opacity: params.opacity ?? 1.0,
    depthWrite: params.depthWrite ?? true,
  });

  const rimStrength = params.rimStrength ?? 0.28;
  if (rimStrength > 0.01) {
    const rimCol = new THREE.Color(params.rimColor ?? '#fff1d0');
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimCol };
      shader.uniforms.uRimStrength = { value: rimStrength };
      shader.fragmentShader =
        `uniform vec3 uRimColor;\nuniform float uRimStrength;\n` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          vec3 animeViewDir = normalize(vViewPosition);
          float animeRim = 1.0 - max(0.0, dot(normalize(normal), animeViewDir));
          animeRim = smoothstep(0.55, 0.95, animeRim) * uRimStrength;
          gl_FragColor.rgb += uRimColor * animeRim;
          #include <dithering_fragment>
          `,
        );
    };
  }
  return mat;
}

const outlineMatCache = new Map<string, THREE.MeshBasicMaterial>();

function getInkOutlineMaterial(hex = '#241921'): THREE.MeshBasicMaterial {
  const existing = outlineMatCache.get(hex);
  if (existing) return existing;
  const mat = new THREE.MeshBasicMaterial({
    color: hex,
    side: THREE.BackSide,
  });
  outlineMatCache.set(hex, mat);
  return mat;
}

/**
 * Adds a subtle inverted-hull anime ink outline shell to non-FX solid meshes inside a group.
 */
export function addOutlineToGroup(group: THREE.Group, scale = 1.045, inkHex = '#241921') {
  const outlineMat = getInkOutlineMaterial(inkHex);
  const targets: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh &&
      !obj.userData.noOutline &&
      !(obj.material instanceof THREE.Material && obj.material.transparent)
    ) {
      targets.push(obj);
    }
  });

  for (const mesh of targets) {
    const shell = new THREE.Mesh(mesh.geometry, outlineMat);
    shell.name = `${mesh.name || 'mesh'}_inkOutline`;
    shell.userData.noOutline = true;
    shell.scale.setScalar(scale);
    shell.castShadow = false;
    shell.receiveShadow = false;
    shell.raycast = () => {};
    mesh.add(shell);
  }
}

/**
 * Soft radial ground contact shadow disc to anchor actors and props cleanly.
 */
export function createContactShadow(radius = 0.65, opacity = 0.42): THREE.Mesh {
  if (!cachedContactShadowTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(18, 22, 36, 0.85)');
    grad.addColorStop(0.55, 'rgba(18, 22, 36, 0.35)');
    grad.addColorStop(1, 'rgba(18, 22, 36, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    cachedContactShadowTex = new THREE.CanvasTexture(canvas);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: cachedContactShadowTex,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  mesh.userData.noOutline = true;
  mesh.raycast = () => {};
  return mesh;
}

export function getCobbleTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedCobbleTex) return cachedCobbleTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c8bca6';
  ctx.fillRect(0, 0, 512, 512);

  // Painted storybook stone paving blocks
  const rows = 8;
  const cols = 8;
  const w = 512 / cols;
  const h = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : w * 0.5;
    for (let col = -1; col <= cols; col++) {
      const shade = 212 + ((r * 17 + col * 31) % 24) - 12;
      ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 22})`;
      ctx.strokeStyle = '#9b8d77';
      ctx.lineWidth = 4;
      const x = col * w + offset + 3;
      const y = r * h + 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w - 6, h - 6, 9);
      ctx.fill();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = maxAnisotropy;
  cachedCobbleTex = tex;
  return tex;
}

export function getGrassTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedGrassTex) return cachedGrassTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6da158';
  ctx.fillRect(0, 0, 512, 512);

  // Soft sunlit meadow patches + stylized brush flecks
  for (let i = 0; i < 160; i++) {
    const x = (Math.sin(i * 12.98) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 78.23) * 0.5 + 0.5) * 512;
    const r = 14 + (i % 24);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(136, 188, 92, 0.38)' : 'rgba(84, 134, 68, 0.32)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 220; i++) {
    const x = (Math.sin(i * 45.1) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 91.7) * 0.5 + 0.5) * 512;
    ctx.strokeStyle = i % 3 === 0 ? '#a7d678' : '#588c4b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y - 9);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = maxAnisotropy;
  cachedGrassTex = tex;
  return tex;
}

export function getWoodPlankTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedWoodTex) return cachedWoodTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9c6e46';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    const y = i * 32;
    ctx.fillStyle = i % 2 === 0 ? '#a4744b' : '#92643e';
    ctx.fillRect(0, y + 1, 256, 30);
    ctx.fillStyle = '#5c3c24';
    ctx.fillRect(0, y + 30, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  cachedWoodTex = tex;
  return tex;
}

export function getRuneArenaTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedArenaTex) return cachedArenaTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d3c7b0';
  ctx.fillRect(0, 0, 512, 512);

  // Outer & inner magic rings
  ctx.strokeStyle = '#9e7d43';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 256, 225, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#38a3a5';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 160, 0, Math.PI * 2);
  ctx.stroke();

  // 8 compass lines
  ctx.strokeStyle = 'rgba(158, 125, 67, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 65, 256 + Math.sin(a) * 65);
    ctx.lineTo(256 + Math.cos(a) * 225, 256 + Math.sin(a) * 225);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  cachedArenaTex = tex;
  return tex;
}

export function getWaterRippleTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedWaterTex) return cachedWaterTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4bc4ff');
  grad.addColorStop(0.5, '#7de2ff');
  grad.addColorStop(1, '#3aa5e8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  for (let y = 16; y < 256; y += 32) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const wy = y + Math.sin((x / 256) * Math.PI * 4 + y) * 5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  cachedWaterTex = tex;
  return tex;
}

export interface SkyCloudHandles {
  root: THREE.Group;
  skyMat: THREE.ShaderMaterial;
  astrolabeRings: THREE.Mesh[];
  cloudClusters: { group: THREE.Group; speed: number; radius: number; angle: number; baseY: number }[];
  petals: THREE.InstancedMesh;
  petalData: { x: number; y: number; z: number; phase: number; speed: number }[];
}

/**
 * Builds the 2026 Anime Sky-Dome Shader, Celestial Astrolabe Rings,
 * Sea of Clouds below the floating islands, and drifting blossom petals/aether motes.
 */
export function buildAnimeSkyAndClouds(nightMode = false): SkyCloudHandles {
  const root = new THREE.Group();

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(nightMode ? '#141b36' : '#3a86d8') },
      uMidColor: { value: new THREE.Color(nightMode ? '#293566' : '#8ed0f7') },
      uHorizonColor: { value: new THREE.Color(nightMode ? '#4b4778' : '#ffe5c4') },
      uBottomColor: { value: new THREE.Color(nightMode ? '#181c30' : '#a8d3f2') },
      uSunDir: { value: new THREE.Vector3(0.55, 0.42, -0.72).normalize() },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunDir;
      uniform float uTime;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = dir.y;
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.35, max(0.0, h)));
        col = mix(col, uTopColor, smoothstep(0.28, 0.85, max(0.0, h)));
        if (h < 0.0) {
          col = mix(uHorizonColor, uBottomColor, smoothstep(0.0, -0.35, h));
        }

        // Anime sun / moon bloom halo
        float sunAmt = max(0.0, dot(dir, normalize(uSunDir)));
        col += vec3(1.0, 0.92, 0.74) * pow(sunAmt, 14.0) * 0.42;
        col += vec3(1.0, 0.97, 0.88) * smoothstep(0.996, 0.9995, sunAmt) * 0.85;

        // Subtle stylized painted sky ribbons near horizon
        float band = sin(dir.x * 6.0 + uTime * 0.06) * cos(dir.z * 5.0 - uTime * 0.04);
        float horizonBand = smoothstep(0.02, 0.16, h) * (1.0 - smoothstep(0.16, 0.38, h));
        col += vec3(1.0, 0.95, 0.88) * max(0.0, band) * horizonBand * 0.14;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(165, 32, 20), skyMat);
  skyDome.userData.noOutline = true;
  skyDome.raycast = () => {};
  root.add(skyDome);

  // Giant celestial golden astrolabe rings framing the upper sky
  const astrolabeRings: THREE.Mesh[] = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: nightMode ? '#8da9ff' : '#ffd88a',
    transparent: true,
    opacity: 0.24,
  });
  [68, 76].forEach((radius, idx) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 8, 96), ringMat);
    r.position.set(0, 26, -32);
    r.rotation.x = idx === 0 ? 1.15 : 0.72;
    r.rotation.z = idx === 0 ? 0.25 : -0.35;
    r.userData.noOutline = true;
    r.raycast = () => {};
    root.add(r);
    astrolabeRings.push(r);
  });

  // Billowing Cloud Sea beneath the islands
  const cloudClusters: SkyCloudHandles['cloudClusters'] = [];
  const cloudMat = new THREE.MeshToonMaterial({
    color: nightMode ? '#6574a8' : '#fffaf2',
    gradientMap: getToonGradientMap(),
    emissive: new THREE.Color(nightMode ? '#29335c' : '#ffdcb8'),
    emissiveIntensity: 0.22,
  });

  for (let i = 0; i < 18; i++) {
    const cluster = new THREE.Group();
    const puffs = 3 + (i % 3);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(3.2 + (p % 2) * 1.4, 12, 10), cloudMat);
      puff.position.set((p - 1) * 3.1, (p % 2) * 0.65, (p % 3 - 1) * 1.3);
      puff.scale.set(1.45, 0.62, 1.1);
      puff.userData.noOutline = true;
      puff.raycast = () => {};
      cluster.add(puff);
    }
    const angle = (i / 18) * Math.PI * 2;
    const radius = 34 + (i % 4) * 15;
    const baseY = -12 - (i % 3) * 3.5;
    cluster.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
    root.add(cluster);
    cloudClusters.push({ group: cluster, speed: 0.014 + (i % 3) * 0.005, radius, angle, baseY });
  }

  // Drifting Sakura / Aether Petals (InstancedMesh)
  const petalCount = 72;
  const petalGeo = new THREE.PlaneGeometry(0.18, 0.12);
  const petalMat = new THREE.MeshBasicMaterial({
    color: nightMode ? '#8ce8ff' : '#ffd2e4',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
  });
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petals.frustumCulled = false;
  petals.userData.noOutline = true;
  petals.raycast = () => {};

  const dummy = new THREE.Object3D();
  const petalData: SkyCloudHandles['petalData'] = [];
  for (let i = 0; i < petalCount; i++) {
    const px = (Math.sin(i * 19.3) * 0.5 + 0.5) * 44 - 22;
    const py = 0.8 + (i % 7) * 1.1;
    const pz = (Math.cos(i * 31.7) * 0.5 + 0.5) * 44 - 22;
    petalData.push({ x: px, y: py, z: pz, phase: i * 0.7, speed: 0.5 + (i % 5) * 0.18 });
    dummy.position.set(px, py, pz);
    dummy.updateMatrix();
    petals.setMatrixAt(i, dummy.matrix);
    petals.setColorAt(i, new THREE.Color(i % 3 === 0 ? '#9ef5ff' : i % 2 === 0 ? '#ffd6e7' : '#fff3b8'));
  }
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  root.add(petals);

  return { root, skyMat, astrolabeRings, cloudClusters, petals, petalData };
}
