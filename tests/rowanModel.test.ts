import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { Box3, Bone, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AddressInfo } from 'node:net';

vi.mock('../src/engine/animeShaders.ts', async (importOriginal) => {
  const shaders = await importOriginal<typeof import('../src/engine/animeShaders.ts')>();
  const { Mesh, PlaneGeometry, MeshBasicMaterial } = await import('three');
  return {
    ...shaders,
    createContactShadow: () => new Mesh(new PlaneGeometry(), new MeshBasicMaterial()),
  };
});

let server: Server;
let url: string;
let requests = 0;
beforeAll(async () => {
  vi.stubGlobal('self', globalThis);
  vi.stubGlobal('ProgressEvent', class extends Event {});
  vi.stubGlobal('createImageBitmap', async (blob: Blob) => {
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    return { width: 1024, height: 1024 };
  });
  server = createServer((request, response) => {
    requests++;
    if (request.url === '/models/exported-model.glb') {
      response.end(readFileSync('public/models/exported-model.glb'));
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  vi.stubEnv('BASE_URL', url);
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('loads the real Rowan asset once and animates two independent player avatars', async () => {
  const { buildRowanHuman, disposeWizardAvatar, updateRowanHuman } = await import('../src/engine/races/rowanHuman.ts');
  const config = {
    raceId: 'human',
    elementId: 'ember',
    sculpt: {
      height: 1, build: 'balanced', skinHex: '#e6bda0', hairStyle: 'Windblown Shag',
      hairHex: '#332822', hairTipHex: '#ff8a4c', eyeShape: 'bright', eyeLeftHex: '#3b82c4',
      eyeRightHex: '#3b82c4', browStyle: 'arched', marking: 'none', primaryDye: '#2f4569',
      trimDye: '#d4a13e', accentDye: '#d9532f', castPose: 'duelist',
    },
    equipped: { headgear: 'hat_academy_cap', torso: 'torso_bomber', back: 'back_satchel', footwear: 'boots_sneakers', staff: 'staff_oak_wand' },
  } satisfies Parameters<typeof buildRowanHuman>[0];
  const first = buildRowanHuman(config);
  const second = buildRowanHuman(config);
  try {
    await vi.waitFor(() => expect(second.userData.humanModel).toBe('rowan'), { timeout: 4000 });
    expect(first.userData.humanModel).toBe('rowan');
    expect(requests).toBe(1);

    const pelvis = first.getObjectByName('pelvis') as Bone;
    const otherPelvis = second.getObjectByName('pelvis') as Bone;
    expect(pelvis).toBeInstanceOf(Bone);
    expect(pelvis).not.toBe(otherPelvis);
    const firstPose = pelvis.quaternion.clone();
    const secondPose = otherPelvis.quaternion.clone();
    for (let frame = 0; frame < 12; frame++) updateRowanHuman(first, 0.05, { moving: true });
    expect(first.userData.humanClip).toBe('Walk');
    expect(pelvis.quaternion.angleTo(firstPose)).toBeGreaterThan(0.01);
    expect(otherPelvis.quaternion.angleTo(secondPose)).toBeLessThan(0.00001);

    const bounds = new Box3().setFromObject(second.getObjectByName('bodyRig')!, true);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.y).toBeCloseTo(1.8);
    disposeWizardAvatar(first);
    expect(updateRowanHuman(second, 0.05, { moving: false, jumping: true })).toBe(true);
    expect(second.userData.humanClip).toBe('Jump_air');
  } finally {
    disposeWizardAvatar(first);
    disposeWizardAvatar(second);
  }
});

it('selects a fast Rowan clip whose end pose matches its start pose', async () => {
  const { selectRowanClip } = await import('../src/engine/races/rowanAsset.ts');
  const { animations } = await new GLTFLoader().loadAsync(`${url}models/exported-model.glb`);
  const name = selectRowanClip({ moving: true, speedScalar: 1.35 });
  const clip = animations.find((animation) => animation.name === name);
  expect(clip).toBeDefined();
  const rotations = clip!.tracks.filter((track) => track.name.endsWith('.quaternion'));
  expect(rotations.length).toBeGreaterThan(0);

  const start = new Quaternion();
  const end = new Quaternion();
  for (const track of rotations) {
    const finalKeyOffset = track.values.length - track.getValueSize();
    start.fromArray(track.values).normalize();
    end.fromArray(track.values, finalKeyOffset).normalize();
    expect(start.angleTo(end), track.name).toBeLessThan(Math.PI / 180);
  }
});

it('changes Dorm weather without rebuilding the particle geometry', async () => {
  const { createDormWeather } = await import('../src/engine/dormWeather.ts');
  const weather = createDormWeather();
  const geometry = weather.points.geometry;
  weather.update('gentle_snow', 0.1, 1);
  expect(weather.points.visible).toBe(true);
  const snow = weather.points.material.color.getHexString();
  weather.update('fireflies', 0.1, 2);
  expect(weather.points.material.color.getHexString()).not.toBe(snow);
  expect(weather.points.geometry).toBe(geometry);
  weather.update('clear_breeze', 0.1, 3);
  expect(weather.points.visible).toBe(false);
  weather.points.geometry.dispose();
  weather.points.material.dispose();
});
