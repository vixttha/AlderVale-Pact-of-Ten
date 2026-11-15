import { test, expect } from '@playwright/test';

// Browser checks intentionally use local guest storage and never contact production Firebase.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      ? route.continue()
      : route.abort();
  });
});

test('wizard creation screen loads without an uncaught JavaScript error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aldervale: Pact of Ten', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin Academy Journey' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Everpeak/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('guest wizard survives reload in its own realm', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox').first().fill('Runner Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await page.reload();
  await expect(page.getByText('Runner Rowan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter Aldervale/ })).toBeVisible();
  await page.getByRole('button', { name: /Everpeak/ }).click();
  await expect(page.getByText('Runner Rowan', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Begin Academy Journey' })).toBeVisible();
});

const breezeSaveKey = 'aldervale_guest_breeze_v1';

async function installGuestSaveFailure(page) {
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key && window.blockGuestSave) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return setItem.call(this, name, value);
    };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
    };
  }, breezeSaveKey);
}

function readBreezeSave(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), breezeSaveKey);
}

test('guest enrollment waits for a successful save and retries without duplicate wizards', async ({ page }) => {
  await installGuestSaveFailure(page);
  await page.goto('/');
  await page.evaluate(() => { window.blockGuestSave = true; });
  const name = page.getByRole('textbox').first();
  const begin = page.getByRole('button', { name: 'Begin Academy Journey' });
  await name.fill('Retry Rowan');
  await begin.click();
  await expect(page.getByRole('alert')).toContainText('Could not save your new wizard');
  await expect(name).toHaveValue('Retry Rowan');
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toHaveCount(0);
  expect(await readBreezeSave(page)).toBeNull();

  await page.evaluate(() => { window.blockGuestSave = false; });
  await begin.click();
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toBeVisible();
  const save = await readBreezeSave(page);
  expect(save.wizards).toHaveLength(1);
  const [wizard] = save.wizards;
  expect(wizard.name).toBe('Retry Rowan');
  expect(save.account.wizardIds).toEqual([wizard.id]);
  expect(save.creatures[wizard.id]).toHaveLength(1);
  expect(save.sanctuaries[wizard.id].wizardId).toBe(wizard.id);
  await page.reload();
  await expect(page.getByText('Retry Rowan', { exact: true })).toBeVisible();
});

test('failed guest progress remains visible until retry saves both wizard and realm changes', async ({ page }) => {
  await installGuestSaveFailure(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toBeVisible();
  const originalSave = await readBreezeSave(page);
  await page.evaluate(() => { window.blockGuestSave = true; });
  await page.getByRole('button', { name: 'Tailor', exact: true }).click();
  await page.getByRole('button', { name: 'Realm Vault' }).click();
  await page.getByRole('button', { name: 'Claim to Wizard' }).click();
  const failure = page.getByRole('alert').filter({ hasText: 'Guest progress could not be saved' });
  await expect(failure).toBeVisible();
  expect(await readBreezeSave(page)).toEqual(originalSave);
  const retry = page.getByRole('button', { name: 'Retry save' });
  await retry.click();
  await expect(failure).toBeVisible();
  expect(await readBreezeSave(page)).toEqual(originalSave);

  await page.evaluate(() => { window.blockGuestSave = false; });
  await retry.click();
  await expect(failure).toHaveCount(0);
  const recovered = await readBreezeSave(page);
  expect(recovered.account.sharedVault).toEqual([]);
  expect(recovered.wizards[0].wardrobe.ownedGearIds).toContain('hat_pointed_brim');
  await page.reload();
  await page.getByRole('button', { name: /Enter Aldervale/ }).click();
  await page.getByRole('button', { name: 'Tailor', exact: true }).click();
  await page.getByRole('button', { name: 'Realm Vault' }).click();
  await expect(page.getByRole('button', { name: 'Claim to Wizard' })).toHaveCount(0);
});

test('mobile creation controls remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aldervale: Pact of Ten', exact: true })).toBeVisible();
  const begin = page.getByRole('button', { name: 'Begin Academy Journey' });
  await begin.scrollIntoViewIfNeeded();
  await expect(begin).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('title and world remain usable with WebGL unavailable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
    };
  });
  await page.goto('/');
  await expect(page.getByText('3D preview unavailable').first()).toBeVisible();
  await page.getByRole('textbox').first().fill('Fallback Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry 3D' }).click();
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true }).last()).toBeVisible();
  expect(errors).toEqual([]);
});

test('guest settings survive reload and the HUD shows offline after a lost connection', async ({ page }) => {
  test.setTimeout(90_000);
  let realmSocket;
  let refuseReconnect = false;
  await page.routeWebSocket('**/ws', (socket) => {
    if (refuseReconnect) {
      void socket.close();
      return;
    }
    realmSocket = socket;
    socket.connectToServer();
  });
  await page.goto('/');
  await page.getByRole('textbox').first().fill('Settings Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByText('1 Online', { exact: true })).toBeVisible();
  refuseReconnect = true;
  await realmSocket.close();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('slider', { name: /Acoustic Harp/ }).press('Home');
  await page.getByRole('slider', { name: /Spell & UI Chimes/ }).press('End');
  await page.getByRole('slider', { name: /Camera Orbit/ }).press('End');
  await page.getByRole('checkbox', { name: /Default 2× Speed/ }).check();
  await page.reload();
  await page.getByRole('button', { name: /Enter Aldervale/ }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: /Acoustic Harp/ })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: /Spell & UI Chimes/ })).toHaveValue('1');
  await expect(page.getByRole('slider', { name: /Camera Orbit/ })).toHaveValue('2');
  await expect(page.getByRole('checkbox', { name: /Default 2× Speed/ })).toBeChecked();

  refuseReconnect = false;
  await page.getByRole('button', { name: 'Switch Wizard or Realm' }).click();
  await page.getByRole('button', { name: 'Enroll New Wizard' }).click();
  await page.getByRole('textbox').first().fill('Second Slot Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByText('1 Online', { exact: true })).toBeVisible();
  await expect(page.getByText('Settings Rowan', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Propose Trade' })).toHaveCount(0);
});


test('the Commons fountain blocks walking, still refills, and fleeing gives accurate feedback', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('textbox').first().fill('Fountain Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  const world = page.locator('[data-world-avatar-model]');
  await expect(world).toHaveAttribute('data-world-avatar-model', 'rowan');
  const fountain = page.getByRole('button', { name: /Sanctuary Healing Fountain/ });
  const position = page.getByText(/^\(0, 4\)$/);
  await page.keyboard.down('w');
  await expect(fountain).toBeVisible();
  await expect(position).toBeVisible();
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  await expect(page.getByText('Sanctuary Fountain restored all Mana & Healing Flasks!')).toBeVisible();

  await page.getByRole('button', { name: 'Duel', exact: true }).click();
  await page.getByRole('button', { name: 'Frost', exact: true }).click();
  await page.getByRole('button', { name: 'Flee', exact: true }).click();
  await expect(page.getByText('You left the duel.', { exact: true })).toBeVisible();
  await expect(page.getByText(/top off your Flasks/)).toHaveCount(0);
});
