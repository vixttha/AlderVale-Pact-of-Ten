"use strict";
// Validate the actual current-run GLB, never a substitute fixture.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const [out, prefix] = process.argv.slice(2);
const pkg = path.join(prefix, "node_modules", "gltf-validator");
const validator = require(pkg);
assert.equal(require(path.join(pkg, "package.json")).version, "2.0.0-dev.3.10");
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const bytes = fs.readFileSync(path.join(out, "candidate.glb"));
const source = JSON.parse(fs.readFileSync(path.join(out, "glb-receipt.json"), "utf8"));
assert.equal(source.source_commit, process.env.GITHUB_SHA);
assert.equal(source.status, "pass");
assert.equal(sha(bytes), source.glb_sha256);
assert.equal(bytes.length, source.glb_bytes);
function mutate(fn) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  const n = bytes.readUInt32LE(12);
  assert.equal(bytes.toString("ascii",16,20), "JSON");
  const doc = JSON.parse(bytes.toString("utf8",20,20+n));
  fn(doc);
  const json = Buffer.from(JSON.stringify(doc));
  const padding = Buffer.alloc((4-json.length%4)%4, 32);
  const payload = Buffer.concat([json,padding]);
  const rest = bytes.subarray(20+n);
  const head = Buffer.alloc(20);
  head.write("glTF");
  head.writeUInt32LE(2,4);
  head.writeUInt32LE(20+payload.length+rest.length,8);
  head.writeUInt32LE(payload.length,12);
  head.write("JSON",16);
  return Buffer.concat([head,payload,rest]);
}
async function check(b) {
  return validator.validateBytes(new Uint8Array(b), {
    uri: "candidate.glb", maxIssues: 0,
    externalResourceFunction: async () => { throw Error("External resource forbidden"); }
  });
}
async function main() {
  const report = await check(bytes);
  fs.writeFileSync(path.join(out,"khronos-report.json"),JSON.stringify(report,null,2)+"\n");
  assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
  const controls = [
    ["truncated_binary",bytes.subarray(0,bytes.length-4)],
    ["invalid_image_buffer_view",mutate(d=>{d.images[0].bufferView=d.bufferViews.length+10;})],
    ["invalid_indices_accessor",mutate(d=>{d.meshes[0].primitives[0].indices=d.accessors.length+10;})],
  ];
  const results=[];
  for (const [name, bad] of controls) {
    assert.notEqual(sha(bad),sha(bytes));
    // Khronos must return error diagnostics, not just crash or skip.
    const result=await check(bad);
    assert.ok(result.issues.numErrors>0,name+" was not rejected");
    results.push({name,errors:result.issues.numErrors,codes:result.issues.messages.filter(m=>m.severity===0).map(m=>m.code)});
  }
  assert.equal(sha(fs.readFileSync(path.join(out,"candidate.glb"))),source.glb_sha256);
  const receipt={status:"pass",scope:"checkpoint-06-khronos",source_commit:process.env.GITHUB_SHA,glb_sha256:source.glb_sha256,
    validator_version:report.validatorVersion,package_version:"2.0.0-dev.3.10",errors:report.issues.numErrors,warnings:report.issues.numWarnings,
    infos:report.issues.numInfos,hints:report.issues.numHints,messages:report.issues.messages,negative_controls:results,quality_accepted:false};
  fs.writeFileSync(path.join(out,"khronos-receipt.json"),JSON.stringify(receipt,null,2)+"\n");
  console.log(JSON.stringify(receipt,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
