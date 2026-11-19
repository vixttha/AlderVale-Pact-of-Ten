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

  // Send an ordinary, physically reachable route through the real browser
  // WebSocket. This does not simulate a server or bypass the movement limiter.
  // It avoids relying on variable software-GPU keyboard frame rates in CI.
  const correctionsBefore = await page.evaluate(() =>
    window.__ciWorldReceipts.filter(v => v.type === 'world_position_correction').length
  );
  for (let step = 1; step <= 8; step++) {
    await page.waitForTimeout(180);
    await page.evaluate((fraction) => {
      window.__ciWorldSocket.send(JSON.stringify({
        type: 'move', zone: 'hub', x: -3 * fraction, y: 0,
        z: 8 - 3 * fraction, rotY: 0.25,
      }));
    }, step / 8);
  }
  await page.waitForTimeout(250);
  expect(await page.evaluate(() =>
    window.__ciWorldReceipts.filter(v => v.type === 'world_position_correction').length
  )).toBe(correctionsBefore);

  const glCanvas = await page.locator('canvas[data-software-gl]').elementHandle();
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
  expect(lastJoin.position.x).toBeCloseTo(-3, 1);
  expect(lastJoin.position.z).toBeCloseTo(5, 1);
  await expect(mapReadout).toContainText('(-3, 5)');
  // Direct observation from the existing Three.js player-container setter,
  // enabled in the disposable local CI development build only.
  await expect(page.locator('[data-ci-applied-position]')).toHaveAttribute(
    'data-ci-applied-position', '-3.00,5.00'
  );
  expect(await page.evaluate(el => document.contains(el), glCanvas)).toBe(true);
  await expect(page.locator('canvas[data-software-gl]')).toBeVisible();

  // The same real Auth emulator user remains signed in after a page reload.
  const realm = await page.evaluate(async () => {
    const fixture = await import('/tools/ci/browser-auth-fixture.ts');
    return fixture.loadDisposableRealm();
  });
  expect(realm.status).toBe(200);
  expect(realm.data.wizardIds).toHaveLength(1);
  await page.reload();
  await page.waitForTimeout(1200);
  const reloadStatus = await page.evaluate(async () => {
    const { auth } = await import('/src/lib/firebase.ts');
    await auth.authStateReady();
    let cloudWizards = null;
    let cloudError = null;
    if (auth.currentUser) {
      try {
        const { loadCloudWizardsForRealm } = await import('/src/lib/storage.ts');
        cloudWizards = (await loadCloudWizardsForRealm(auth.currentUser.uid, 'breeze')).length;
      } catch (error) {
        cloudError = String(error);
      }
    }
    return {
      restoredAuth: Boolean(auth.currentUser),
      cloudWizards,
      cloudError,
    };
  });
  expect(reloadStatus.restoredAuth).toBe(true);
  expect(reloadStatus.cloudWizards).toBe(1);
  await expect(page.getByText('Emulator Rowan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter Aldervale/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
