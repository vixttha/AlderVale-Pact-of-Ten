import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const commit = process.env.README_HEAD;
assert.match(commit, /^[0-9a-f]{40}$/);
const url = 'https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/' + commit;
const out = process.env.RUNNER_TEMP + '/readme-render';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 970 }, colorScheme });
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      const scroll = locator => page.waitForFunction(selector => {
        const node = Array.from(document.querySelectorAll('article.markdown-body'))
          .find(article => article.querySelector('h1')?.textContent.trim() === 'AlderVale: Pact of Ten')
          ?.querySelector(selector);
        if (!node) return false;
        node.scrollIntoView({ block: 'center' });
        return true;
      }, locator);
      const article = page.locator('article.markdown-body').filter({ has: page.getByRole('heading', { name: 'AlderVale: Pact of Ten', exact: true }) });
      await article.waitFor({ timeout: 20000 });
      const campus = article.getByRole('img', { name: /Rowan stands before the fountain/i });
      const duel = article.getByRole('img', { name: /Round one of Rowan’s solo duel/i });
      await scroll('img[src$="breeze-campus.webp"]');
      await campus.evaluate(img => img.decode());
      const asset = duel;
      await scroll('img[src$="breeze-first-spark-duel.webp"]');
      await asset.evaluate(img => img.decode());
      const metrics = await article.evaluate(node => {
        const images = Array.from(node.querySelectorAll('img'));
        const img = images[0];
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
          images: images.map(image => { const bounds = image.getBoundingClientRect(); return {path: new URL(image.src).pathname, alt: image.alt, width: bounds.width, height: bounds.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, fits: bounds.left >= articleBox.left - 1 && bounds.right <= articleBox.right + 1}; }),
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
      assert.match(metrics.alt, /Central Academy Commons/i);
      assert.equal(metrics.images.length, 2);
      for (const [index, filename] of ['breeze-campus.webp','breeze-first-spark-duel.webp'].entries()) {
        const item = metrics.images[index];
        assert.ok(item.path.endsWith('/assets/' + filename), JSON.stringify(item));
        assert.ok(item.alt && item.fits && item.width > 250, JSON.stringify(item));
        assert.equal(item.naturalWidth,1280);
        assert.equal(item.naturalHeight,720);
        assert.ok(Math.abs(item.width / item.height - 16/9) < 0.02);
      }
      assert.ok(await article.evaluate(node => {
        const duel = node.querySelector('img[src$="breeze-first-spark-duel.webp"]');
        const walkthrough = Array.from(node.querySelectorAll('h2')).find(h => h.textContent.trim() === 'First playthrough');
        const realms = Array.from(node.querySelectorAll('h3')).find(h => h.textContent.trim() === 'Choose a realm');
        return walkthrough.compareDocumentPosition(duel) & Node.DOCUMENT_POSITION_FOLLOWING &&
            duel.compareDocumentPosition(realms) & Node.DOCUMENT_POSITION_FOLLOWING;
      }));
      assert.match(metrics.codeSample, /bun install --frozen-lockfile/);
      for (const target of ['run-locally', 'first-playthrough', 'how-ai-helps-build-aldervale', 'report-a-bug']) {
        assert.equal(await article.locator('a[href="#' + target + '"]').count() >= 1, true);
        assert.equal(await article.locator('[id="user-content-' + target + '"]').count() + await article.locator('[id="' + target + '"]').count() >= 1, true);
      }
      const bounds = await article.boundingBox();
      assert.ok(bounds && bounds.height > 900, JSON.stringify(bounds));
      await article.screenshot({ path: out + '/' + colorScheme + '-' + width + '.png', animations: 'disabled', timeout: 15000 });
      console.log(JSON.stringify({ commit, ...metrics }));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
