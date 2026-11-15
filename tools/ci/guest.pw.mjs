import { test, expect } from '@playwright/test';

// Browser checks intentionally use local guest storage and never contact production Firebase.
test.beforeEach(async ({ page }) => {
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

test('mobile creation controls remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aldervale: Pact of Ten', exact: true })).toBeVisible();
  const begin = page.getByRole('button', { name: 'Begin Academy Journey' });
  await begin.scrollIntoViewIfNeeded();
  await expect(begin).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
