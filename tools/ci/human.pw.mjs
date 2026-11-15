import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('Rowan renders by default and Classic remains editable without repeated model downloads', async ({ page }) => {
  const errors = [];
  let downloads = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().endsWith('/models/exported-model.glb')) downloads++; });
  await page.goto('/');
  const preview = page.getByLabel('Wizard appearance preview');
  await expect(preview).toHaveAttribute('data-avatar-model', 'rowan');
  await expect(preview).toHaveAttribute('data-avatar-clip', 'Idle_Subtle');
  await expect(page.getByLabel('Human appearance')).toHaveValue('rowan');
  await page.getByRole('slider', { name: 'Wizard height' }).press('ArrowRight');
  await expect(preview).toHaveAttribute('data-avatar-model', 'rowan');
  await page.getByLabel('Human appearance').selectOption('classic');
  await expect(preview).toHaveAttribute('data-avatar-model', 'classic');
  await expect(page.getByText('Classic supports custom hair, face, dyes and wardrobe styles.')).toBeVisible();
  await page.getByLabel('Human appearance').selectOption('rowan');
  await expect(preview).toHaveAttribute('data-avatar-model', 'rowan');
  await page.getByRole('button', { name: 'Stoneborn', exact: true }).click();
  await expect(preview).toHaveAttribute('data-avatar-model', 'procedural');
  await expect(page.getByLabel('Human appearance')).toHaveCount(0);
  await page.getByRole('button', { name: 'Alder Human', exact: true }).click();
  await expect(preview).toHaveAttribute('data-avatar-model', 'rowan');
  expect(downloads).toBe(1);
  expect(errors).toEqual([]);
});

test('Rowan and Classic persist, gear stats apply, and Rowan animates in the world', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByLabel('Wizard appearance preview')).toHaveAttribute('data-avatar-model', 'rowan');
  await page.getByRole('textbox').first().fill('Rowan Adventurer');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  const world = page.locator('[data-world-avatar-model]');
  await expect(world).toHaveAttribute('data-world-avatar-model', 'rowan');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Idle_Subtle');
  const baseHp = Number((await page.getByText(/^\d+ HP$/).textContent()).split(' ')[0]);
  await page.getByRole('button', { name: 'Tailor', exact: true }).click();
  await page.getByRole('button', { name: 'Realm Vault' }).click();
  await page.getByRole('button', { name: 'Claim to Wizard' }).click();
  await page.getByRole('button', { name: 'Equip Gear', exact: true }).click();
  await page.getByRole('button', { name: 'headgear', exact: true }).click();
  const brimHat = page.getByText('Starstitch Brim Hat', { exact: true }).locator('../..');
  await brimHat.getByRole('button', { name: 'Equip', exact: true }).click();
  await expect(brimHat.getByRole('button', { name: 'Equipped', exact: true })).toBeVisible();
  await expect(page.getByText(String(baseHp + 10) + ' HP', { exact: true })).toBeVisible();
  await page.getByLabel('Human appearance').selectOption('classic');
  await expect(world).toHaveAttribute('data-world-avatar-model', 'classic');
  await expect(page.getByLabel('Wizard appearance preview')).toHaveAttribute('data-avatar-model', 'classic');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Enter Aldervale/ }).click();
  await expect(world).toHaveAttribute('data-world-avatar-model', 'classic');
  await expect(page.getByText(String(baseHp + 10) + ' HP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tailor', exact: true }).click();
  await page.getByLabel('Human appearance').selectOption('rowan');
  await expect(world).toHaveAttribute('data-world-avatar-model', 'rowan');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: /Meditate/ }).click();
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Sitting_Idle');
  await world.locator('canvas').click({ position: { x: 10, y: 10 } });
  await page.keyboard.down('w');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Walk');
  await page.keyboard.down('Shift');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Run_Anime');
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Idle_Subtle');
  await page.keyboard.press('Space');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Jump_air');
  await expect(world).toHaveAttribute('data-world-avatar-clip', 'Idle_Subtle');

  await page.reload();
  await page.getByRole('button', { name: /Enter Aldervale/ }).click();
  await expect(world).toHaveAttribute('data-world-avatar-model', 'rowan');
  expect(errors).toEqual([]);
});

test('failed model loading leaves the Classic fallback and enrollment usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/models/exported-model.glb', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByLabel('Wizard appearance preview')).toHaveAttribute('data-avatar-model', 'fallback');
  await expect(page.getByRole('status')).toHaveText('Rowan unavailable. Showing Classic human.');
  await expect(page.getByRole('button', { name: 'Begin Academy Journey' })).toBeEnabled();
  await page.getByLabel('Human appearance').selectOption('classic');
  await expect(page.getByLabel('Wizard appearance preview')).toHaveAttribute('data-avatar-model', 'classic');
  expect(errors).toEqual([]);
});
