import { test, expect } from '@playwright/test';
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Exercise the real browser engine against the production source module, but do not
// load the game, migrate a save, or connect to production. Contexts isolate fixture data.
const bundle = buildSync({
  entryPoints: [fileURLToPath(new URL('../../src/lib/guestSaveTransactions.ts', import.meta.url))],
  bundle: true, write: false, format: 'iife', globalName: 'GuestSaveTestModule',
  platform: 'browser', target: 'es2022',
}).outputFiles[0].text;
const dbName = 'aldervale-transaction-fixture';
const legacyKey = 'aldervale_guest_breeze_v1';
const original = '{"elementId":"chronos","unlockedFusions":["aetheris"],"florins":220}';

async function openFixture(page) {
  await page.route('**/transaction-store-fixture', route => route.fulfill({
    status: 200, contentType: 'text/html', body: '<!doctype html><title>Guest transaction fixture</title>',
  }));
  await page.goto('/transaction-store-fixture');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(async name => {
    window.store = await window.GuestSaveTestModule.openGuestSaveTransactions(name);
  }, dbName);
}
const save = (page, realm, expected, raw) =>
  page.evaluate(({realm, expected, raw}) => window.store.compareAndSwap(realm, expected, raw), {realm, expected, raw});
const read = (page, realm) => page.evaluate(realm => window.store.read(realm), realm);

test('transaction foundation: two tabs allow one same-revision writer and preserve original and other realm', async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([openFixture(page), openFixture(other)]);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {key: legacyKey, raw: original});
  expect(await read(page, 'breeze')).toEqual({kind: 'missing'});
  const seeded = await Promise.all([save(page, 'breeze', null, original), save(other, 'breeze', null, original)]);
  expect(seeded.map(x => x.kind).sort()).toEqual(['committed', 'conflict']);
  expect(seeded.find(x => x.kind === 'conflict')).toEqual({kind: 'conflict', currentRevision: 1});
  const horizon = await save(other, 'horizon', null, '{"realm":"horizon"}');
  expect(horizon.kind).toBe('committed');
  const tabA = await read(page, 'breeze');
  const tabB = await read(other, 'breeze');
  expect(tabA).toEqual(tabB);
  expect(tabA.record.revision).toBe(1);
  const results = await Promise.all([
    save(page, 'breeze', tabA.record.revision, '{"florins":300,"elementId":"chronos"}'),
    save(other, 'breeze', tabB.record.revision, '{"florins":400,"elementId":"chronos"}'),
  ]);
  expect(results.map(x => x.kind).sort()).toEqual(['committed', 'conflict']);
  const winner = results.find(x => x.kind === 'committed').record;
  expect(winner.revision).toBe(2);
  expect(winner.originalRaw).toBe(original);
  expect(results.find(x => x.kind === 'conflict')).toEqual({kind: 'conflict', currentRevision: 2});
  expect(await save(other, 'breeze', 1, '{"stale":true}')).toEqual({kind: 'conflict', currentRevision: 2});
  expect(await read(page, 'breeze')).toEqual({kind: 'found', record: winner});
  expect(await read(other, 'horizon')).toEqual({kind: 'found', record: horizon.record});
  expect(await page.evaluate(key => localStorage.getItem(key), legacyKey)).toBe(original);
  await other.evaluate(() => window.store.close());
  await openFixture(other);
  expect(await read(other, 'breeze')).toEqual({kind: 'found', record: winner});
});

test('transaction foundation: aborted and quota-failed writes never report success or replace a record', async ({page}) => {
  await openFixture(page);
  const seeded = await save(page, 'breeze', null, original);
  expect(seeded.kind).toBe('committed');
  for (const mode of ['abort', 'quota']) {
    const rejected = await page.evaluate(async mode => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        if (mode === 'quota') throw new DOMException('Fixture quota exceeded', 'QuotaExceededError');
        const request = put.apply(this, args);
        this.transaction.abort();
        return request;
      };
      try {
        await window.store.compareAndSwap('breeze', 1, 'must not persist');
        return false;
      } catch { return true; }
      finally { IDBObjectStore.prototype.put = put; }
    }, mode);
    expect(rejected).toBe(true);
    expect(await read(page, 'breeze')).toEqual({kind: 'found', record: seeded.record});
  }
  // A request success is not a committed transaction. Observe both events
  // so a setup failure cannot accidentally satisfy the rejection assertion.
  const lateAbort = await page.evaluate(async () => {
    const put = IDBObjectStore.prototype.put;
    let requestSucceeded = false;
    let aborted = false;
    let outcome;
    let abortObserved;
    IDBObjectStore.prototype.put = function(...args) {
      const tx = this.transaction;
      const request = put.apply(this, args);
      abortObserved = new Promise(resolve => {
        tx.addEventListener('abort', () => { aborted = true; resolve(); }, {once: true});
        tx.addEventListener('complete', resolve, {once: true});
      });
      request.addEventListener('success', () => {
        requestSucceeded = true;
        tx.abort();
      }, {once: true});
      return request;
    };
    try {
      try {
        await window.store.compareAndSwap('breeze', 1, 'must not commit after request success');
        outcome = 'resolved';
      } catch {
        outcome = 'rejected';
      }
      if (abortObserved) await abortObserved;
      return {requestSucceeded, aborted, outcome};
    } finally {
      IDBObjectStore.prototype.put = put;
    }
  });
  expect(lateAbort).toEqual({requestSucceeded: true, aborted: true, outcome: 'rejected'});
  expect(await read(page, 'breeze')).toEqual({kind: 'found', record: seeded.record});
  const retry = await save(page, 'breeze', 1, '{"retry":true}');
  expect(retry.kind).toBe('committed');
  expect(retry.record.revision).toBe(2);
  expect(retry.record.originalRaw).toBe(original);
});

test('transaction foundation: unreadable revision records and unavailable storage fail closed', async ({page}) => {
  await openFixture(page);
  const malformed = {format: 1, realmId: 'breeze', revision: 0, raw: 'opaque', originalRaw: 'original'};
  await page.evaluate(async ({name, record}) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('realms', 'readwrite');
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
      tx.objectStore('realms').put(record);
    });
    db.close();
  }, {name: dbName, record: malformed});
  await expect(read(page, 'breeze')).rejects.toThrow('Unreadable revision record');
  await expect(save(page, 'breeze', null, 'new')).rejects.toThrow('Unreadable revision record');
  await expect(save(page, 'horizon', 0, 'new')).rejects.toThrow('Expected revision');
  await expect(save(page, 'unknown', null, 'new')).rejects.toThrow('Unknown guest realm');
  const persisted = await page.evaluate(async name => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction('realms', 'readonly');
      const request = tx.objectStore('realms').get('breeze');
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    return result;
  }, dbName);
  expect(persisted).toEqual(malformed);
  const unavailable = await page.evaluate(async name => {
    try {
      await window.GuestSaveTestModule.openGuestSaveTransactions(name, {
        open() { throw new DOMException('Fixture denied', 'SecurityError'); },
      });
      return false;
    } catch { return true; }
  }, dbName);
  expect(unavailable).toBe(true);
});
