import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moveOnCampus } from '../../../src/engine/campusCollision.ts';

function vectors(text, dimensions) {
  if (text === '') return [];
  return text.split(';').map(vector => {
    const parts = vector.split(',');
    assert.equal(parts.length, dimensions, 'Unexpected vector: ' + vector);
    assert.ok(parts.every(part => part !== '' && Number.isFinite(Number(part))), 'Nonfinite vector: ' + vector);
    return parts.map(Number);
  });
}

assert.equal(process.argv.length, 3, 'Usage: observe-movement.mjs FIXTURES.tsv');
const rows = readFileSync(process.argv[2], 'utf8').trimEnd().split('\n');
for (const row of rows) {
  const fields = row.split('\t');
  assert.equal(fields.length, 6, 'Invalid fixture: ' + row);
  const [caseId, key, limitText, startText, circlesText, movesText] = fields;
  const label = caseId + ' ' + key;
  const limit = Number(limitText);
  assert.ok(Number.isFinite(limit) && limit > 0, label + ' has invalid island radius');
  const starts = vectors(startText, 2);
  assert.equal(starts.length, 1, label + ' requires one starting position');
  const circles = vectors(circlesText, 3).map(([x, z, radius]) => ({ x, z, radius }));
  const moves = vectors(movesText, 2);
  assert.ok(moves.length > 0, label + ' requires at least one movement step');
  let [x, z] = starts[0];
  for (const [index, [dx, dz]] of moves.entries()) {
    [x, z] = moveOnCampus(x, z, dx, dz, limit, circles);
    assert.ok(Number.isFinite(x) && Number.isFinite(z), label + ' returned nonfinite coordinates at step ' + (index + 1));
    console.log([caseId, key, index + 1, x, z].join('\t'));
  }
}
