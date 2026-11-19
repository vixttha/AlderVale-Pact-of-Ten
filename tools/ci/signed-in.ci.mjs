import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const emulatorHost = /^127\.0\.0\.1:\d+$/;
let user;
let cloudAuth;

test.beforeAll(async () => {
  expect(process.env.GOOGLE_CLOUD_PROJECT).toBe('demo-aldervale-ci');
  expect(process.env.FIRESTORE_DATABASE_ID).toBe('(default)');
  expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toMatch(emulatorHost);
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(emulatorHost);
  ({ cloudAuth } = await import('../../server/cloud.ts'));
  const uid = randomUUID();
  user = { uid, email: uid + '@aldervale-ci.example.test', password: randomUUID() };
  await cloudAuth.createUser({ ...user, emailVerified: true });
});

test.afterAll(async () => {
  if (user) await cloudAuth?.deleteUser(user.uid);
});

test('signed-in browser renders WebGL, corrects forged travel, reconnects and reloads enrolled wizard', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    // Deny all browser access to real Firebase, analytics, and third-party APIs.
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    window.__ciWorldReceipts = [];
    window.__ciWorldSocket = null;
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(...args) {
        super(...args);
        if (String(args[0]).endsWith('/ws')) {
          window.__ciWorldSocket = this;
          this.addEventListener('message', event => {
            try {
              const msg = JSON.parse(event.data);
              if (['welcome', 'world_joined', 'world_position_correction'].includes(msg.type)) {
                window.__ciWorldReceipts.push({
                  type: msg.type, zone: msg.zone ?? null,
                  position: msg.position ?? null, sessionId: msg.sessionId ?? null,
                });
              }
            } catch { /* Non-JSON message is irrelevant to the receipt. */ }
          });
        }
      }
    };
  });

  await page.goto('/');
  const login = await page.evaluate(async ({ email, password }) => {
    const fixture = await import('/tools/ci/browser-auth-fixture.ts');
    return fixture.signInDisposableUser(email, password);
  }, { email: user.email, password: user.password });
  expect(login.uid).toBe(user.uid);
  await expect(page.getByRole('button', { name: 'Begin Academy Journey' })).toBeEnabled();
  await page.getByRole('textbox').first().fill('Emulator Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();

  const mapReadout = page.locator('button[title="Open Waystone Campus Map"] + div');
  await expect(mapReadout).toContainText('1 Online', { timeout: 25_000 });
  await expect(page.locator('canvas[data-software-gl]')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toHaveCount(0);
  await expect(mapReadout).toContainText('(0, 8)');

  // Actual signed-in WebSocket, not mocked: reject an impossible resource jump.
  await page.evaluate(() => {
    if (!window.__ciWorldSocket || window.__ciWorldSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Signed-in world socket not open.');
    }
    window.__ciWorldSocket.send(JSON.stringify({
      type: 'move', zone: 'hub', x: -14, y: 0, z: 1, rotY: 0,
    }));
  });
  await expect.poll(() => page.evaluate(
    () => window.__ciWorldReceipts.filter(v => v.type === 'world_position_correction').length
  )).toBeGreaterThan(0);
  const correction = await page.evaluate(
    () => window.__ciWorldReceipts.find(v => v.type === 'world_position_correction')
  );
  expect(correction.zone).toBe('hub');
  expect(correction.position).toMatchObject({ x: 0, y: 0, z: 8, rotY: 0 });
  // React's minimap reflects the server correction through the actual app state.
  await expect(mapReadout).toContainText('(0, 8)');

  // Walk naturally in the WebGL scene and preserve the server-observed location.
  await page.keyboard.down('w');
  await page.waitForTimeout(1100);
  await page.keyboard.up('w');
  await expect.poll(async () => {
    const text = await mapReadout.textContent();
    return text?.includes('(0, 8)') === false;
  }, { timeout: 12_000 }).toBe(true);
  const movedReadout = await mapReadout.textContent();
  const originalJoins = await page.evaluate(
    () => window.__ciWorldReceipts.filter(v => v.type === 'world_joined').length
  );
  await page.evaluate(() => window.__ciWorldSocket.close());
  await expect.poll(() => page.evaluate(
    () => window.__ciWorldReceipts.filter(v => v.type === 'world_joined').length
  ), { timeout: 24_000 }).toBeGreaterThan(originalJoins);
  const lastJoin = await page.evaluate(() =>
    window.__ciWorldReceipts.filter(v => v.type === 'world_joined').at(-1)
  );
  expect(lastJoin.zone).toBe('hub');
  expect(lastJoin.position).toBeTruthy();
  expect(lastJoin.position.z).not.toBe(8);
  await expect(mapReadout).toContainText(
    '(' + Math.round(lastJoin.position.x) + ', ' + Math.round(lastJoin.position.z) + ')'
  );
  expect(movedReadout).not.toContain('(0, 8)');
  await expect(page.locator('canvas[data-software-gl]')).toBeVisible();

  // The same real Auth emulator user remains signed in after a page reload.
  const realm = await page.evaluate(async () => {
    const fixture = await import('/tools/ci/browser-auth-fixture.ts');
    return fixture.loadDisposableRealm();
  });
  expect(realm.status).toBe(200);
  expect(realm.data.wizardIds).toHaveLength(1);
  await page.reload();
  await expect(page.getByText('Emulator Rowan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter Aldervale/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
