import { appendFileSync, readFileSync } from 'node:fs';

const checks = [
  ['UNIT_OUTCOME', 'Unit and structural tests'],
  ['SERVER_OUTCOME', 'HTTP and WebSocket integration'],
  ['BROWSER_OUTCOME', 'Guest browser suite'],
  ['FIRESTORE_OUTCOME', 'Firestore rules and integration suite'],
];
const outcomes = new Map([
  ['success', 'Passed'],
  ['failure', 'Failed'],
  ['cancelled', 'Canceled'],
  ['skipped', 'Skipped'],
]);
const browserResults = new Map([
  ['expected', 'Passed'],
  ['unexpected', 'Failed'],
  ['flaky', 'Flaky'],
  ['skipped', 'Skipped'],
]);
const firstSparkTitle = 'a guest wins as Rowan and keeps First Spark and its rewards after reload';

function firstSparkResult(suites) {
  const matches = [];
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      if (spec.title === firstSparkTitle) matches.push(...(spec.tests ?? []));
    }
    const nested = firstSparkResult(suite.suites);
    matches.push(...nested);
  }
  return matches;
}

function browserEvidence(path, stepOutcome) {
  if (stepOutcome === 'skipped' || stepOutcome === 'cancelled') {
    return outcomes.get(stepOutcome);
  }

  try {
    const report = JSON.parse(readFileSync(path, 'utf8'));
    const matches = firstSparkResult(report.suites);
    if (matches.length !== 1) return 'Evidence missing or ambiguous';
    return browserResults.get(matches[0].status) ?? 'Evidence missing';
  } catch {
    return 'Evidence missing or unreadable';
  }
}

function sha(value) {
  return /^[a-f0-9]{40}$/.test(value ?? '') ? value : 'Unavailable';
}

export function renderVerificationSummary(env) {
  const rows = checks
    .filter(([key]) => Object.hasOwn(env, key))
    .map(([key, label]) => `| ${label} | ${outcomes.get(env[key]) ?? 'Evidence missing'} |`);

  if (env.PLAYWRIGHT_EVIDENCE) {
    const result = browserEvidence(env.PLAYWRIGHT_EVIDENCE, env.BROWSER_OUTCOME);
    rows.push(`| First Spark completion and rewards after reload | ${result} |`);
  }

  const run = /^[0-9]+$/.test(env.GITHUB_RUN_ID ?? '') ? env.GITHUB_RUN_ID : 'Unavailable';
  const attempt = /^[0-9]+$/.test(env.GITHUB_RUN_ATTEMPT ?? '') ? env.GITHUB_RUN_ATTEMPT : 'Unavailable';
  const pr = env.GITHUB_EVENT_NAME === 'pull_request';
  const revisions = pr ? [`- PR base SHA: ${sha(env.PR_BASE_SHA)}`, `- PR head SHA: ${sha(env.PR_HEAD_SHA)}`] : [];

  return [
    '## Bug verification',
    '',
    `- Tested checkout SHA: ${sha(env.TESTED_SHA)}`,
    ...revisions,
    `- Actions run: ${run}, attempt ${attempt}`,
    '',
    '| Check | Outcome |',
    '| --- | --- |',
    ...rows,
    '',
  ].join('\n') + '\n';
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderVerificationSummary(process.env));
}
