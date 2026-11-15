import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
console.log('# AlderVale asset report\n');
console.log('Sizes are transfer inputs, not GPU performance or gameplay acceptance.\n');
console.log('| File | Bytes | SHA-256 |\n| --- | ---: | --- |');
for (const file of (await files('dist')).sort()) {
  const data = await readFile(file);
  if (file.endsWith('.glb')) {
    if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
      throw new Error(`Invalid GLB header or declared size: ${file}`);
    }
  }
  console.log(`| ${relative('.', file).replaceAll('\\', '/')} | ${(await stat(file)).size} | ${createHash('sha256').update(data).digest('hex')} |`);
}

/** Advisory only — never fail CI; threshold leaves headroom above the ~1.6 MB baseline. */
const JS_BUNDLE_WARN_BYTES = 2_200_000;
const distFiles = (await files('dist')).sort();
let jsTotal = 0;
let largestJs = { path: '', size: 0 };
for (const file of distFiles) {
  if (!file.endsWith('.js')) continue;
  const size = (await stat(file)).size;
  jsTotal += size;
  if (size > largestJs.size) largestJs = { path: relative('.', file).replaceAll('\\', '/'), size };
}
console.log('\n## JavaScript bundle summary (advisory)\n');
console.log(`- Total \`.js\` in \`dist/\`: **${jsTotal}** bytes`);
if (largestJs.path) {
  console.log(`- Largest chunk: \`${largestJs.path}\` (${largestJs.size} bytes)`);
}
if (jsTotal > JS_BUNDLE_WARN_BYTES) {
  console.log(
    `\n> **Advisory:** total JS (${jsTotal}) exceeds the ${JS_BUNDLE_WARN_BYTES}-byte soft reference used in CI. This does not fail the job; tighten bundles or raise the reference after owner review.`,
  );
}
