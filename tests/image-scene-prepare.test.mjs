import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cachedStage, stageKey } from '../scripts/image-scene/cache.mjs';
import { runLocalTool } from '../scripts/image-scene/process.mjs';

async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'image-scene-cache-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const key = stageKey({ stage: 'segment', tool: 'revision1' });
async function produce(directory) { await writeFile(join(directory, 'mask.png'), 'actual-artifact'); return { artifacts: ['mask.png'], value: { reviewed: false } }; }

test('stage keys ignore object property order, but include nested revisions and overrides', () => {
  assert.equal(stageKey({ b: 2, a: { x: 1 } }), stageKey({ a: { x: 1 }, b: 2 }));
  assert.notEqual(key, stageKey({ stage: 'segment', tool: 'revision2' }));
  assert.notEqual(stageKey({ mask: 'sha-a' }), stageKey({ mask: 'sha-b' }));
});
test('completed cache reuse verifies bytes without invoking producer', async t => {
  const root = await workspace(t);
  const first = await cachedStage(root, key, produce);
  const second = await cachedStage(root, key, () => { throw Error('must not rebuild'); });
  assert.equal(first.cacheHit, false); assert.equal(second.cacheHit, true);
  assert.equal(await readFile(join(second.directory, 'mask.png'), 'utf8'), 'actual-artifact');
  assert.deepEqual(second.value, { reviewed: false });
});
test('tampered artifacts reject reuse rather than yielding stale success', async t => {
  const root = await workspace(t); const first = await cachedStage(root, key, produce);
  await writeFile(join(first.directory, 'mask.png'), 'tampered');
  await assert.rejects(cachedStage(root, key, produce), /corrupt.*mask.png/i);
});
test('failed stages never publish a receipt and can be retried', async t => {
  const root = await workspace(t);
  await assert.rejects(cachedStage(root, key, async directory => { await produce(directory); throw Error('alignment incomplete'); }), /alignment incomplete/);
  assert.equal((await cachedStage(root, key, produce)).cacheHit, false);
});
test('concurrent writers cannot publish or remove each other staging data', async t => {
  const root = await workspace(t); let unblock;
  const barrier = new Promise(resolve => { unblock = resolve; }); let started;
  const ready = new Promise(resolve => { started = resolve; });
  const first = cachedStage(root, key, async directory => { started(); await barrier; return produce(directory); });
  await ready;
  try { await assert.rejects(cachedStage(root, key, produce), /busy/i); } finally { unblock(); }
  assert.equal((await first).cacheHit, false);
  assert.equal((await cachedStage(root, key, produce)).cacheHit, true);
});
test('unsafe output paths and cancelled stages cannot publish', async t => {
  const root = await workspace(t);
  await assert.rejects(cachedStage(root, key, async () => ({ artifacts: ['../escape'], value: {} })), /contained/i);
  const controller = new AbortController();
  await assert.rejects(cachedStage(root, key, async directory => { const result = await produce(directory); controller.abort(); return result; }, { signal: controller.signal }), /abort/i);
  assert.equal((await cachedStage(root, key, produce)).cacheHit, false);
});
test('subprocess boundary reports exit errors, limits output and supports cancellation', async () => {
  await assert.rejects(runLocalTool(process.execPath, ['-e', 'process.stderr.write("missing photographs");process.exit(3)']), /missing photographs/);
  await assert.rejects(runLocalTool(process.execPath, ['-e', 'process.stdout.write("x".repeat(2000))'], { maximumOutputBytes: 1024 }), /output.*limit/i);
  await assert.rejects(runLocalTool(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 50 }), /timed out/i);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runLocalTool(process.execPath, ['-e', 'process.exit(0)'], { signal: controller.signal }), /abort/i);
});

test('capture preparation rejects unsupported calibration and no-mask policies before writing', async t => {
  const { prepareCapture } = await import('../scripts/image-scene/prepare-capture.mjs');
  const root = await workspace(t);
  const request = { schemaVersion: 1, id: 'test', mode: 'camera-orbit', rights: { license: 'CC0-1.0' }, views: [1, 2, 3].map(i => ({ id: `v${i}`, image: `/missing-${i}.jpg` })) };
  await assert.rejects(prepareCapture({ ...request, segmentation: 'none' }, { cacheDirectory: root }), /does not support.*none/i);
  const calibration = { width: 10, height: 10, fx: 10, fy: 10, cx: 5, cy: 5, cameraToWorld: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  await assert.rejects(prepareCapture({ ...request, views: request.views.map(v => ({ ...v, calibration })) }, { cacheDirectory: root }), /v1.*calibration/i);
});

test('cache rejects non-JSON keys and symlink artifacts', async t => {
  assert.throws(() => stageKey({ toolRevision: undefined }), /finite JSON/);
  assert.throws(() => stageKey({ parameter: NaN }), /finite JSON/);
  const root = await workspace(t);
  const { symlink } = await import('node:fs/promises');
  await writeFile(join(root, 'outside'), 'outside-data');
  await assert.rejects(cachedStage(root, key, async directory => {
    await symlink(join(root, 'outside'), join(directory, 'mask.png'));
    return { artifacts: ['mask.png'], value: {} };
  }), /symbolic links/);
});

test('reconstruction cache requires every expected pose and preserves failure evidence', async t => {
  const { reconstructCapture } = await import('../scripts/image-scene/reconstruct.mjs');
  const { chmod, mkdir } = await import('node:fs/promises');
  const root = await workspace(t);
  const executable = join(root, 'native-test-tool');
  const viewsPath = join(root, 'views.json');
  await writeFile(viewsPath, JSON.stringify({ schemaVersion: 1, mode: 'object-rotation', views: [1, 2, 3].map(id => ({ id: `v${id}`, image: viewsPath, mask: viewsPath })) }));
  const fake = count => `#!/usr/bin/env node\nconst fs=require('node:fs');const args=process.argv.slice(2);const out=args[args.indexOf('--output')+1];fs.writeFileSync(out,'fake-native-model-for-orchestration-test');fs.writeFileSync(out+'.poses.json',JSON.stringify({schemaVersion:1,views:Array.from({length:${count}},(_,i)=>({id:'v'+(i+1),cameraToWorld:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}))}));fs.writeFileSync(out+'.report.json',JSON.stringify({schemaVersion:1,backend:'apple-object-capture',trainingViews:3,preparedMaskViews:3,detail:'preview',warnings:[]}));\n`;
  await writeFile(executable, fake(2)); await chmod(executable, 0o755);
  const capture = { viewsPath, inputsHash: key, tools: { objectCapture: executable, revision: key }, prepared: [1, 2, 3].map(i => ({ id: `v${i}` })) };
  const options = { cacheDirectory: join(root, 'cache'), detail: 'preview' };
  await mkdir(options.cacheDirectory);
  await assert.rejects(reconstructCapture(capture, options), /v3.*not.*ready/i);
  const { readdir } = await import('node:fs/promises');
  const attempts = await readdir(join(options.cacheDirectory, 'attempts'));
  const failure = JSON.parse(await readFile(join(options.cacheDirectory, 'attempts', attempts[0], 'failure.json'), 'utf8'));
  assert.equal(failure.modelIsReady, false); assert.match(failure.message, /v3/);
  await writeFile(executable, fake(3));
  const complete = await reconstructCapture(capture, options);
  assert.equal(complete.cacheHit, false);
  assert.equal((await reconstructCapture(capture, options)).cacheHit, true);
  assert.equal(complete.report.preparedMaskViews, 3);
  await writeFile(viewsPath, JSON.stringify({ schemaVersion: 1, mode: 'object-rotation', views: [1, 2, 3].map(id => ({ id: `v${id}`, image: join(root, 'missing.jpg'), mask: viewsPath })) }));
  await assert.rejects(reconstructCapture(capture, options), /missing.jpg/);
});
