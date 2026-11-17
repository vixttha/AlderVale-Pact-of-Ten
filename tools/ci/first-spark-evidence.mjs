import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySagaEvent } from '../../shared/quests.ts';

const source = new URL('../../tests/vault/first-spark/scenario.json', import.meta.url);
const scenario = JSON.parse(readFileSync(source, 'utf8'));
const resultPath = (directory, id) => join(directory, id + '-result.json');
const sha256 = data => createHash('sha256').update(data).digest('hex');

function identity(env) {
  const { TESTED_SHA: testedSha, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: attempt } = env;
  if (!/^[a-f0-9]{40}$/.test(testedSha ?? '') || !/^\d+$/.test(runId ?? '') || !/^\d+$/.test(attempt ?? '')) {
    throw new Error('Invalid First Spark checkout or workflow run identity');
  }
  return { schemaVersion: scenario.schemaVersion, scenarioId: scenario.scenarioId, testedSha, runId, attempt };
}

function observationDigest(directory, context) {
  const text = readFileSync(join(directory, 'observations.json'), 'utf8');
  const envelope = JSON.parse(text);
  if (Object.entries(context).some(([key, value]) => envelope[key] !== value)) {
    throw new Error('Observation identity does not match this run');
  }
  if (Object.keys(envelope.checkpoints ?? {}).length !== scenario.checkpoints.length ||
      scenario.checkpoints.some(stage => envelope.checkpoints[stage] !== sha256(readFileSync(join(directory, stage + '.json'))))) {
    throw new Error('Observation checkpoint hash mismatch');
  }
  return sha256(text);
}

function captureObservations(directory, context) {
  // The browser provides raw storage. Only the final step replays the real reducer.
  const reload = JSON.parse(readFileSync(join(directory, 'after-reload.json'), 'utf8'));
  const matches = reload.wizards.filter(wizard => wizard.name === scenario.wizardName);
  if (matches.length !== 1) throw new Error('Reload checkpoint did not contain exactly one fixture wizard');
  const wizard = matches[0];
  reload.wizards = reload.wizards.map(entry => entry === wizard ? applySagaEvent(wizard, 'solo-win') : entry);
  writeFileSync(join(directory, 'after-replay.json'), JSON.stringify(reload));
  const checkpoints = Object.fromEntries(scenario.checkpoints.map(stage =>
    [stage, sha256(readFileSync(join(directory, stage + '.json')))]));
  writeFileSync(join(directory, 'observations.json'), JSON.stringify({ ...context, checkpoints }, null, 2));
  return observationDigest(directory, context);
}

function verifyDotnet(id, directory) {
  const cwd = fileURLToPath(new URL('../../tests/vault/' + id + '/', import.meta.url));
  const args = id === 'csharp'
    ? ['run', '--project', 'GuestSaveContracts.csproj', '--configuration', 'Release', '--', '--first-spark', directory]
    : ['fsi', '--exec', 'first-spark-check.fsx', directory];
  const result = spawnSync('dotnet', args, { cwd, encoding: 'utf8', timeout: 60_000, killSignal: 'SIGKILL' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status === 0) return { status: 'pass', detail: id === 'csharp' ? 'Identity and save fields survived reload' : 'Correct payout and no second reward on reducer replay' };
  const diagnostic = (result.stderr || result.stdout || '').split(/\r?\n/).find(line => line.trim());
  return { status: 'fail', detail: result.error?.message ?? diagnostic ?? ('dotnet exited ' + (result.signal ?? result.status)) };
}

export function runFirstSpark(env, browserOutcome) {
  const directory = env.FIRST_SPARK_EVIDENCE_DIR;
  const context = identity(env);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'scenario.json'), readFileSync(source));
  let digest = null;
  let problem;
  try {
    digest = captureObservations(directory, context);
  } catch (error) {
    problem = error.code === 'ENOENT' ? 'A browser checkpoint is missing' : error.message;
  }
  const write = (checkId, fields) => writeFileSync(resultPath(directory, checkId), JSON.stringify({
    ...context, checkId, observationsSha256: digest, ...fields,
  }, null, 2));
  const browserStatus = { Passed: 'pass', Failed: 'fail', Flaky: 'fail', Skipped: 'skip', Canceled: 'skip' }[browserOutcome];
  if (browserStatus) {
    write('playwright', {
      status: browserStatus === 'pass' && !digest ? 'fail' : browserStatus,
      detail: browserStatus === 'pass' ? (problem ?? 'Guest won First Spark and re-entered campus after reload') : browserOutcome,
    });
  }
  for (const id of ['csharp', 'fsharp']) {
    write(id, digest ? verifyDotnet(id, directory) : { status: 'blocked', detail: problem });
  }
}

const statusLabels = { pass: 'Pass', fail: 'Fail', skip: 'Skipped', blocked: 'Blocked' };
const tableCell = input => String(input).replace(/[<>|&\r\n]/g, character =>
  ({ '<': '&lt;', '>': '&gt;', '|': '&#124;', '&': '&amp;', '\r': ' ', '\n': ' ' })[character]).slice(0, 280);

export function firstSparkSummary(env) {
  const directory = env.FIRST_SPARK_EVIDENCE_DIR;
  const context = identity(env);
  let digest = null;
  try { digest = observationDigest(directory, context); } catch { /* Incomplete evidence is reported below. */ }
  const rows = scenario.checks.map(({ id, label }) => {
    let receipt;
    try { receipt = JSON.parse(readFileSync(resultPath(directory, id), 'utf8')); }
    catch (error) {
      return { label, status: error.code === 'ENOENT' ? 'Missing' : 'Invalid', detail: 'No readable receipt for this check' };
    }
    if (!receipt || receipt.checkId !== id || Object.entries(context).some(([key, value]) => receipt[key] !== value) ||
        !Object.hasOwn(statusLabels, receipt.status) || typeof receipt.detail !== 'string' ||
        receipt.observationsSha256 !== digest || (receipt.status === 'pass' && !digest)) {
      return { label, status: 'Invalid', detail: 'Receipt or observations do not match this checkout and attempt' };
    }
    return { label, status: statusLabels[receipt.status], detail: receipt.detail };
  });
  const pass = rows.every(row => row.status === 'Pass');
  const markdown = [
    '## First Spark cross-language verdict', '',
    'Scenario `' + scenario.scenarioId + '` · checkout `' + context.testedSha + '` · run ' + context.runId + ', attempt ' + context.attempt, '',
    '| Check | Status | Detail |', '| --- | --- | --- |',
    ...rows.map(row => '| ' + row.label + ' | ' + row.status + ' | ' + tableCell(row.detail) + ' |'),
    '| **Overall** | **' + (pass ? 'PASS' : 'FAIL') + '** | ' + (pass ? 'All three required checks passed' : 'At least one required check lacks a valid pass') + ' |',
    '',
  ].join('\n') + '\n';
  return { pass, markdown };
}
