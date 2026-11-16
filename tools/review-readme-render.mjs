import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const commit = process.env.README_HEAD;
assert.match(commit, /^[0-9a-f]{40}$/);
const url = 'https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/' + commit + '/workspace/v0.0.2/DRAFT.md';
const out = process.env.RUNNER_TEMP + '/readme-render';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 970 }, colorScheme });
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      const article = page.locator('article.markdown-body').filter({ has: page.getByRole('heading', { name: 'AlderVale: Pact of Ten', exact: true }) });
      await article.waitFor({ timeout: 20000 });
      const title = article.getByRole('heading', { name: 'AlderVale: Pact of Ten', exact: true });
      await title.scrollIntoViewIfNeeded();
      const asset = article.getByRole('img', { name: /first spark|duel/i });
      await asset.scrollIntoViewIfNeeded();
      await asset.evaluate(img => img.decode());
      const metrics = await article.evaluate(node => {
        const img = node.querySelector('img');
        const style = getComputedStyle(node);
        const root = document.documentElement;
        const box = img.getBoundingClientRect();
        const articleBox = node.getBoundingClientRect();
        return {
          width: innerWidth,
          articleWidth: node.clientWidth,
          articleScrollWidth: node.scrollWidth,
          imageWidth: box.width,
          imageHeight: box.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          imageAspect: box.width / box.height,
          naturalAspect: img.naturalWidth / img.naturalHeight,
          imageFits: box.left >= articleBox.left - 1 && box.right <= articleBox.right + 1,
          colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          color: style.color,
          pageBackground: getComputedStyle(document.body).backgroundColor,
          themeMode: root.getAttribute('data-color-mode'),
          alt: img.alt,
          codeSample: node.querySelector('pre')?.textContent,
        };
      });
      assert.equal(metrics.width, width);
      assert.equal(metrics.colorScheme, colorScheme);
      assert.equal(metrics.themeMode, 'auto');
      const channels = metrics.pageBackground.match(/\d+/g).slice(0,3).map(Number);
      const brightness = channels.reduce((sum, n) => sum + n, 0) / 3;
      assert.ok(colorScheme === 'dark' ? brightness < 90 : brightness > 210, JSON.stringify(metrics));
      assert.ok(metrics.imageFits && metrics.imageWidth > 250 && metrics.naturalWidth > 900, JSON.stringify(metrics));
      assert.ok(Math.abs(metrics.imageAspect - metrics.naturalAspect) < 0.02);
      assert.ok(metrics.articleScrollWidth <= metrics.articleWidth + 2, JSON.stringify(metrics));
      assert.match(metrics.alt, /duel/i);
      assert.match(metrics.codeSample, /bun install --frozen-lockfile/);
      for (const target of ['run-locally', 'first-playthrough', 'how-ai-helps-build-aldervale', 'report-a-bug']) {
        assert.equal(await article.locator('a[href="#' + target + '"]').count() >= 1, true);
        assert.equal(await article.locator('[id="user-content-' + target + '"]').count() + await article.locator('[id="' + target + '"]').count() >= 1, true);
      }
      await title.evaluate(node => node.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: out + '/' + colorScheme + '-' + width + '.png', animations: 'disabled' });
      console.log(JSON.stringify({ commit, ...metrics }));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
