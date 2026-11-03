/** Actual system Vision/sample-loading integration. Never reconstructs held-out fixtures. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { prepareCapture } from '../scripts/image-scene/prepare-capture.mjs';

test('real native preparation is relocatable, validated and reusable without rebuilding photo masks', { skip: process.platform !== 'darwin', timeout: 240000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'image-scene-native-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const request = { schemaVersion: 1, id: 'fixture-segmentation-only', rights: { license: 'CC-BY-4.0', author: 'MNHNL' }, mode: 'object-rotation', views: ['front', 'side', 'back'].map(id => ({ id, image: resolve(`src/craft/fixtures/image-scene/source-views/${id}.jpg`) })) };
  const options = { cacheDirectory: root };
  const first = await prepareCapture(request, options);
  assert.equal(first.cacheHit, false); assert.equal(first.modelIsReady, false);
  const views = JSON.parse(await readFile(first.viewsPath, 'utf8')).views;
  for (const view of views) { assert.equal((await readFile(view.mask)).subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.ok(!view.image.includes('.partial-')); }
  const events = [];
  const second = await prepareCapture({ ...request, shot: { preset: 'orbit', durationFrames: 180, fps: { num: 30, den: 1 }, width: 1920, height: 1080 } }, { ...options, onProgress: event => events.push(event) });
  assert.equal(second.cacheHit, true); assert.equal(first.inputsHash, second.inputsHash);
  assert.equal(events.filter(event => event.state === 'cached').length, 3);
  const changedRights = await prepareCapture({ ...request, rights: { ...request.rights, source: 'https://example.org/credit' } }, options);
  assert.equal(changedRights.inputsHash, first.inputsHash); assert.notEqual(changedRights.viewsPath, first.viewsPath);
  const metadata = JSON.parse(await readFile(join(changedRights.viewsPath, '..', 'preparation.json'), 'utf8'));
  assert.equal(metadata.rights.source, 'https://example.org/credit');
});
