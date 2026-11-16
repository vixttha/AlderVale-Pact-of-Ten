import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const commit = process.env.README_HEAD;
assert.match(commit, /^[0-9a-f]{40}$/);
const repo = 'https://github.com/vixttha/AlderVale-Pact-of-Ten';
const out = process.env.RUNNER_TEMP + '/readme-render';
const images = [
  ['aldervale-workmark-v1.webp', 1200, 400],
  ['breeze-campus.webp', 1280, 720],
  ['breeze-first-spark-duel.webp', 1280, 720],
];
const sections = ['play-on-windows', 'run-from-source', 'first-playthrough', 'report-a-bug'];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 970 }, colorScheme });
      try {
        const response = await page.goto(repo + '/tree/' + commit, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        const article = page.locator('article.markdown-body').filter({
          has: page.getByRole('heading', { name: 'AlderVale: Pact of Ten', exact: true }),
        });
        await article.waitFor({ timeout: 20000 });
        await page.waitForFunction(() => document.documentElement.getAttribute('data-color-mode') === 'auto');
        const background = await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
        const rgb = background.match(/\d+/g).slice(0, 3).map(Number);
        const brightness = rgb.reduce((sum, value) => sum + value, 0) / 3;
        assert.ok(colorScheme === 'dark' ? brightness < 90 : brightness > 210, background);

        for (const [filename] of images) {
          await page.waitForFunction(name => {
            const article = Array.from(document.querySelectorAll('article.markdown-body'))
              .find(node => node.querySelector('h1')?.textContent.trim() === 'AlderVale: Pact of Ten');
            const image = article?.querySelector('img[src$="/assets/' + name + '"]');
            if (!image) return false;
            image.scrollIntoView({ block: 'center' });
            return true;
          }, filename);
          await article.locator('img[src$="/assets/' + filename + '"]').evaluate(node => node.decode());
        }
        const metrics = await article.evaluate(node => {
          const outer = node.getBoundingClientRect();
          return {
            width: innerWidth,
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
            assets: Array.from(node.querySelectorAll('img'), image => {
              const box = image.getBoundingClientRect();
              return {
                path: new URL(image.src).pathname,
                alt: image.alt,
                size: [image.naturalWidth, image.naturalHeight],
                ratio: box.width / box.height,
                shownWidth: box.width,
                fits: box.left >= outer.left - 1 && box.right <= outer.right + 1,
              };
            }),
          };
        });
        assert.equal(metrics.width, width);
        assert.ok(metrics.scrollWidth <= metrics.clientWidth + 2, JSON.stringify(metrics));
        assert.equal(metrics.assets.length, images.length);
        for (const [index, [filename, naturalWidth, naturalHeight]] of images.entries()) {
          const actual = metrics.assets[index];
          assert.equal(actual.path, '/vixttha/AlderVale-Pact-of-Ten/raw/' + commit + '/assets/' + filename);
          assert.deepEqual(actual.size, [naturalWidth, naturalHeight]);
          assert.ok(actual.alt && actual.fits && actual.shownWidth > 250, JSON.stringify(actual));
          assert.ok(Math.abs(actual.ratio - naturalWidth / naturalHeight) < 0.02);
        }

        const nav = await article.evaluate((node, ids) => ids.map(id => ({
          link: !!node.querySelector('a[href="#' + id + '"]'),
          target: !!node.querySelector('[id="user-content-' + id + '"], [id="' + id + '"]'),
        })), sections);
        assert.ok(nav.every(item => item.link && item.target), JSON.stringify(nav));
        const launcher = article.getByRole('link', { name: 'Windows launcher guide', exact: true });
        assert.equal(await launcher.getAttribute('href'), repo + '/blob/main/AlderVale%20Play/README.md');
        assert.match(await article.locator('pre').first().textContent(), /bun install --frozen-lockfile/);
        assert.match(await article.innerText(), /what you expected, and what actually happened/);

        await page.evaluate(() => window.scrollTo(0, 0));
        await article.screenshot({ path: out + '/' + colorScheme + '-' + width + '.png', animations: 'disabled', timeout: 15000 });
        console.log(JSON.stringify({ commit, colorScheme, background, ...metrics }));
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
