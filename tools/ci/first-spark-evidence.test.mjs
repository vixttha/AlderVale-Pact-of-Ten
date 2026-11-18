import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { firstSparkSummary, runFirstSpark } from './first-spark-evidence.mjs';

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
  return { directory, receipt, report, put };
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

function adapterFixture(t) {
  const base = fixture(t);
  const guestSave = {
    wizards: [{
      name: 'Rowan Duelist',
      progression: { completedQuests: ['q_first_duel'] },
    }],
  };
  for (const stage of ['before-duel', 'after-victory', 'after-reload']) base.put(stage, guestSave);
  const env = {
    FIRST_SPARK_EVIDENCE_DIR: base.directory,
    TESTED_SHA: testedSha,
    GITHUB_RUN_ID: context.runId,
    GITHUB_RUN_ATTEMPT: context.attempt,
  };
  return { ...base, env };
}

test('blocks validators and fails the browser check when a checkpoint is missing', t => {
  const { directory, env, report } = adapterFixture(t);
  rmSync(join(directory, 'after-victory.json'));
  let launches = 0;
  runFirstSpark(env, 'Passed', { spawn: () => { launches++; return { status: 0 }; } });
  const result = report();
  assert.equal(launches, 0, 'no validator should run on incomplete browser evidence');
  assert.equal(result.pass, false);
  assert.match(result.markdown, /Playwright .* Fail/);
  assert.match(result.markdown, /C# .* Blocked/);
  assert.match(result.markdown, /F# .* Blocked/);
});

test('rejects malformed browser data before invoking independent validators', t => {
  const { directory, env, report } = adapterFixture(t);
  writeFileSync(join(directory, 'after-reload.json'), '{corrupt');
  let launches = 0;
  runFirstSpark(env, 'Passed', { spawn: () => { launches++; return { status: 0 }; } });
  assert.equal(launches, 0);
  assert.equal(report().pass, false);
  assert.match(report().markdown, /Playwright .* Fail/);
});

test('failing F# process makes the combined verdict fail, preserving the C# pass', t => {
  const { env, report } = adapterFixture(t);
  const invoked = [];
  runFirstSpark(env, 'Passed', { spawn: (command, args) => {
    invoked.push({ command, args });
    return args[0] === 'fsi'
      ? { status: 1, stderr: 'Quest payout mismatch' }
      : { status: 0, stdout: '' };
  } });
  const result = report();
  assert.equal(invoked.length, 2);
  assert.ok(invoked.every(call => call.command === 'dotnet'));
  assert.equal(result.pass, false);
  assert.match(result.markdown, /Playwright .* Pass/);
  assert.match(result.markdown, /C# .* Pass/);
  assert.match(result.markdown, /F# .* Fail/);
});

test('missing dotnet executable cannot produce a passing verdict', t => {
  const { env, report } = adapterFixture(t);
  runFirstSpark(env, 'Passed', {
    spawn: () => ({ status: null, error: new Error('spawn dotnet ENOENT') }),
  });
  const result = report();
  assert.equal(result.pass, false);
  assert.match(result.markdown, /C# .* Fail/);
  assert.match(result.markdown, /F# .* Fail/);
});
