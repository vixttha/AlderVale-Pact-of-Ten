import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { Box3, Bone, Group, SkinnedMesh } from 'three';
import type { AddressInfo } from 'node:net';

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
    const path = /^\/models\/([^/?]+)$/.exec(request.url ?? '')?.[1];
    if (path === 'rowan-prototype.glb' || path === 'exported-model.glb') {
      response.end(readFileSync('public/models/' + path));
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
it('loads the actual rig, animates independently and selects only Rowan', async () => {
  const { loadRowanModel, usesRowanModel } = await import('../src/engine/rowanModel.ts');
  expect(usesRowanModel({ name: ' Rowan Skyweaver ', raceId: 'human' })).toBe(true);
  expect(usesRowanModel({ name: 'Rowan Skyweaver', raceId: 'dwarf' })).toBe(false);
  expect(usesRowanModel({ name: 'Someone Else', raceId: 'human' })).toBe(false);
  const [a, b] = await Promise.all([loadRowanModel('rigged'), loadRowanModel('rigged')]);
  expect(requests).toBe(1);
  const pelvis = a.object.getObjectByName('pelvis') as Bone;
  const otherPelvis = b.object.getObjectByName('pelvis') as Bone;
  expect(pelvis).toBeInstanceOf(Bone);
  expect(pelvis).not.toBe(otherPelvis);
  const prior = pelvis.quaternion.clone();
  const otherPrior = otherPelvis.quaternion.clone();
  for (let i = 0; i < 12; i++) a.update(.05, 'walk');
  expect(prior.angleTo(pelvis.quaternion)).toBeGreaterThan(.01);
  expect(otherPrior.angleTo(otherPelvis.quaternion)).toBeLessThan(.00001);
  const bounds = new Box3().setFromObject(a.object);
  expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1.2);
  a.dispose();
  b.dispose();
});
it('centers the exact static prototype on the floor', async () => {
  const { loadRowanModel } = await import('../src/engine/rowanModel.ts');
  const model = await loadRowanModel('prototype');
  const bounds = new Box3().setFromObject(model.object);
  expect(bounds.min.y).toBeCloseTo(0);
  expect(bounds.max.y).toBeCloseTo(1.65);
  let skin = false;
  model.object.traverse(node => { if (node instanceof SkinnedMesh) skin = true; });
  expect(skin).toBe(false);
  model.dispose();
});
it('keeps the built-in avatar until the external model mounts and restores it on cleanup', async () => {
  const { mountRowanModel } = await import('../src/engine/rowanModel.ts');
  const slot = new Group();
  const fallback = new Group();
  slot.add(fallback);
  const container = { dataset: {} } as HTMLElement;
  let dispose = () => {};
  const mounted = new Promise<void>((resolve) => {
    dispose = mountRowanModel(slot, fallback, container, 'rigged', (model) => {
      if (model) resolve();
    });
  });
  expect(fallback.visible).toBe(true);
  await mounted;
  expect(fallback.visible).toBe(false);
  expect(container.dataset.avatarModel).toBe('rigged');
  expect(slot.children).toHaveLength(2);
  dispose();
  expect(fallback.visible).toBe(true);
  expect(slot.children).toEqual([fallback]);
});

it('keeps the procedural avatar after a fetch failure and can retry', async () => {
  vi.resetModules();
  const { mountRowanModel, loadRowanModel } = await import('../src/engine/rowanModel.ts');
  const slot = new Group();
  const fallback = new Group();
  slot.add(fallback);
  const container = { dataset: {} } as HTMLElement;
  vi.stubEnv('BASE_URL', url + 'missing/');
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dispose = mountRowanModel(slot, fallback, container, 'rigged', () => {});
  try {
    await vi.waitFor(() => expect(container.dataset.avatarModel).toBe('procedural'));
    expect(fallback.visible).toBe(true);
    expect(slot.children).toEqual([fallback]);
  } finally {
    dispose();
    warning.mockRestore();
    vi.stubEnv('BASE_URL', url);
  }
  const model = await loadRowanModel('rigged');
  expect(model.object.getObjectByName('pelvis')).toBeDefined();
  model.dispose();
});
