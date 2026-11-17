import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { firstSparkSummary } from './first-spark-evidence.mjs';

const sha256 = data => createHash('sha256').update(data).digest('hex');
const testedSha = 'a'.repeat(40);
const context = { schemaVersion: 1, scenarioId: 'first-spark-guest-v1', testedSha, runId: '313', attempt: '2' };

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'first-spark-summary-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const put = (stem, data) => writeFileSync(join(directory, stem + '.json'), JSON.stringify(data));
  const checkpoints = Object.fromEntries(['before-duel', 'after-victory', 'after-reload', 'after-replay'].map(stage => {
    put(stage, { checkpoint: stage });
    return [stage, sha256(JSON.stringify({ checkpoint: stage }))];
  }));
  const observations = { ...context, checkpoints };
  put('observations', observations);
  const receipt = (checkId, overrides = {}) => put(checkId + '-result', {
    ...context, checkId, status: 'pass', observationsSha256: sha256(JSON.stringify(observations)), detail: 'Verified', ...overrides,
  });
  const report = () => firstSparkSummary({
    FIRST_SPARK_EVIDENCE_DIR: directory, TESTED_SHA: testedSha, GITHUB_RUN_ID: '313', GITHUB_RUN_ATTEMPT: '2',
  });
  return { receipt, report, put };
}

test('passes with all three receipts bound to the same observations', t => {
  const { receipt, report } = fixture(t);
  for (const id of ['playwright', 'csharp', 'fsharp']) receipt(id);
  assert.equal(report().pass, true);
  assert.match(report().markdown, /Overall.*PASS/);
});

test('prints failed and missing checks and escapes a diagnostic', t => {
  const { receipt, report } = fixture(t);
  receipt('playwright');
  receipt('fsharp', { status: 'fail', detail: 'expected 110 | observed <220>' });
  assert.equal(report().pass, false);
  assert.match(report().markdown, /C# .* Missing/);
  assert.match(report().markdown, /F# .* Fail .*expected 110 &#124; observed &lt;220&gt;/);
});

test('rejects skipped checks and receipts from another checkout or attempt', t => {
  const { receipt, report } = fixture(t);
  receipt('playwright', { status: 'skip' });
  receipt('csharp', { testedSha: 'b'.repeat(40) });
  receipt('fsharp', { attempt: '1' });
  assert.equal(report().pass, false);
  assert.match(report().markdown, /Playwright .* Skipped/);
  assert.equal(report().markdown.match(/\| Invalid \|/g)?.length, 2);
});

test('rejects receipt passes after a checkpoint changes', t => {
  const { receipt, report, put } = fixture(t);
  for (const id of ['playwright', 'csharp', 'fsharp']) receipt(id);
  put('after-victory', { checkpoint: 'altered' });
  assert.equal(report().pass, false);
  assert.equal(report().markdown.match(/\| Invalid \|/g)?.length, 3);
});
