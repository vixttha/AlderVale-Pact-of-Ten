#!/usr/bin/env node
/**
 * Public CI check for the three-day project law.
 * Window: 2026-11-15 through 2026-11-18 America/New_York.
 * Private Notion is the deadline authority; this script only enforces that
 * recorded window on public runners.
 */

const TIME_ZONE = 'America/New_York';
const START_LOCAL = { year: 2026, month: 11, day: 15, hour: 0, minute: 0, second: 0 };
const END_LOCAL = { year: 2026, month: 11, day: 18, hour: 23, minute: 59, second: 59 };

function zonedLocalToDate({ year, month, day, hour, minute, second }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const offsetAt = (instant) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    const hour24 = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour24,
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - instant;
  };

  let instant = utcGuess;
  for (let i = 0; i < 3; i += 1) {
    instant = utcGuess - offsetAt(instant);
  }
  return new Date(instant);
}

function formatInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(date);
}

function formatDuration(ms) {
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

const now = new Date();
const start = zonedLocalToDate(START_LOCAL, TIME_ZONE);
const deadline = zonedLocalToDate(END_LOCAL, TIME_ZONE);
const remainingMs = deadline.getTime() - now.getTime();
const overdue = remainingMs < 0;

const lines = [
  '# Three-day project law',
  '',
  'Owner confirmed 2026-11-15. Private Notion is the deadline authority.',
  'This public runner job documents and enforces the recorded window.',
  '',
  `| Field | Value |`,
  `| --- | --- |`,
  `| Time zone | ${TIME_ZONE} |`,
  `| Start | ${formatInZone(start, TIME_ZONE)} |`,
  `| Deadline | ${formatInZone(deadline, TIME_ZONE)} |`,
  `| Now | ${formatInZone(now, TIME_ZONE)} |`,
  `| Remaining | ${overdue ? `overdue by ${formatDuration(remainingMs)}` : formatDuration(remainingMs)} |`,
  `| Result | ${overdue ? 'fail — window closed' : 'pass — window open'} |`,
  '',
  overdue
    ? 'Default after the window: stop new feature work unless the owner extends the law in writing.'
    : 'Scope, CI, issues, Sentry, and AI work must fit this window. Prefer public GitHub-hosted runners. No paid Sentry plans, paid APIs, or paid runners.',
];

const report = `${lines.join('\n')}\n`;
process.stdout.write(report);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(summaryPath, report);
}

if (overdue) {
  process.exit(1);
}
