import { test, expect } from '@playwright/test';

test('G09-003 guest starter Keen Ink is reachable and fuses in the actual duel UI', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
    };
  });
  await page.goto('/');
  await page.getByRole('textbox').first().fill('Keen Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByRole('heading', { name: '3D world unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Duel', exact: true }).click();
  await page.evaluate(() => { Math.random = () => 0.5; });
  await page.getByRole('button', { name: 'Frost', exact: true }).click();
  const ink = page.getByRole('button', { name: /Keen Ink Enchant/ });
  const attack = page.getByRole('button', { name: /Cinder Dart/ }).first();
  const cast = page.getByRole('button', { name: 'Cast Turn', exact: true });
  await expect(ink).toHaveCount(1);
  await expect(ink).toBeEnabled();
  await ink.click();
  await expect(cast).toBeDisabled();
  await expect(page.getByText('Click an Attack card to fuse Keen Ink (+65 Power)!')).toBeVisible();
  await attack.click();
  const fused = page.getByRole('button', { name: /Cinder Dart.*\+Keen/ });
  await expect(fused).toHaveCount(1);
  await expect(ink).toHaveCount(0);
  await fused.click();
  await expect(cast).toBeEnabled();
  await cast.click();
  await expect(page.getByText('Round 2', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
