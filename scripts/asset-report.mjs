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
