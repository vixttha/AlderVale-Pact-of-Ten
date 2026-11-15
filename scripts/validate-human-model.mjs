import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const sources = [
  ['exported-model.glb', 'd304dd6a7b239a3596f6d054ca16efe39fc76dade4f6e2faa500d6e2b4b0feb2'],
  ['rowan-prototype.glb', '9c7adcf2dc5d034ae65cd364686a9c12cca0dcefd2b87a4197a5fa3b95115600'],
];
for (const [name, hash] of sources) {
  const bytes = readFileSync(new URL('../public/models/' + name, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, name + ': source bytes changed');
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'glTF 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'declared length');
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'JSON chunk');
  const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const resource of [...(data.buffers ?? []), ...(data.images ?? [])]) {
    assert.ok(!resource.uri, name + ': asset must remain self-contained');
  }
  if (name === 'exported-model.glb') {
    assert.equal(data.meshes.length, 1);
    assert.equal(data.skins.length, 1);
    assert.equal(data.skins[0].joints.length, 66);
    for (const joint of data.skins[0].joints) assert.ok(data.nodes[joint]);
    const clips = new Set(data.animations.map((clip) => clip.name));
    for (const clip of ['Idle_Subtle', 'Walk', 'Run_Anime', 'Jump_air', 'Victory', 'Sitting_Idle']) assert.ok(clips.has(clip), 'missing ' + clip);
    for (const primitive of data.meshes[0].primitives) {
      for (const key of ['POSITION', 'JOINTS_0', 'WEIGHTS_0']) assert.ok(data.accessors[primitive.attributes[key]], 'missing ' + key);
      const position = data.accessors[primitive.attributes.POSITION];
      assert.ok(position.count > 0 && position.count <= 200000, 'bounded source vertex count');
    }
    console.log('Rigged Rowan: 66 joints, ' + data.animations.length + ' clips; source hash verified.');
  } else {
    console.log('Static Rowan reference: source hash verified.');
  }
}
