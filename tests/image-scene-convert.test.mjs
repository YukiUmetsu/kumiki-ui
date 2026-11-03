import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertReconstructedMesh } from '../scripts/image-scene/convert.mjs';

test('conversion caches verified artifacts and rejects audit mismatch or corruption', async t => {
  const root = await mkdtemp(join(tmpdir(), 'image-convert-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'mesh.usdz'), executable = join(root, 'blender');
  await writeFile(source, 'reconstructed-bytes');
  const fake = mismatch => `#!/usr/bin/env node
const fs=require('node:fs'),crypto=require('node:crypto');
if(process.argv.includes('--version')){console.log('test-adapter');process.exit(0)}
const input=process.argv[process.argv.indexOf('--input')+1],output=process.argv[process.argv.indexOf('--output')+1];
const bytes=Buffer.from('fake-unit-output');fs.writeFileSync(output,bytes);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync(output.replace('.glb','.audit.json'),JSON.stringify({schemaVersion:1,sourceSha256:hash(fs.readFileSync(input)),modelSha256:${mismatch ? "'incorrect'" : 'hash(bytes)'},bytes:bytes.length,lighting:'baked',geometryModified:false}));`;
  await writeFile(executable, fake(true), { mode: 0o755 });
  const options = { cacheDirectory: join(root, 'cache'), blenderPath: executable };
  await assert.rejects(convertReconstructedMesh(source, options), /audit contradicts/);
  await writeFile(executable, fake(false));
  const first = await convertReconstructedMesh(source, options);
  assert.equal(first.cacheHit, false);
  assert.equal((await convertReconstructedMesh(source, options)).cacheHit, true);
  await writeFile(first.modelPath, 'corrupt');
  await assert.rejects(convertReconstructedMesh(source, options), /corrupt cache artifact/);
  await writeFile(source, 'changed geometry');
  const changed = await convertReconstructedMesh(source, options);
  assert.notEqual(changed.conversionKey, first.conversionKey);
  assert.equal((await readFile(changed.modelPath)).toString(), 'fake-unit-output');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(convertReconstructedMesh(source, { ...options, signal: controller.signal }), /abort/i);
});
