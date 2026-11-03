/** Optional Node 24+ local preparation; browser imports never reach these tools. */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { release, version } from 'node:os';
import { validateCaptureSet } from '../../registry/craft/image-scene-manifest.ts';
import { cachedStage, fileDigest, stageKey } from './cache.mjs';
import { runLocalTool } from './process.mjs';
const backendDirectory = fileURLToPath(new URL('./backend/', import.meta.url));

export async function nativeTools(cacheDirectory, { signal } = {}) {
  if (process.platform !== 'darwin') throw new Error('Native image scene preparation requires macOS 15+ and supported RealityKit hardware. Browser playback is portable.');
  const compiler = await runLocalTool('swiftc', ['--version'], { signal });
  const sources = ['prepare_photo.swift', 'capture_samples.swift', 'object_capture.swift'];
  const hashes = [];
  for (const name of sources) hashes.push({ name, ...await fileDigest(join(backendDirectory, name)) });
  const revision = stageKey({ sources: hashes, compiler: compiler.stdout, os: { release: release(), version: version() }, architecture: process.arch });
  const stage = await cachedStage(join(cacheDirectory, 'tools'), revision, async directory => {
    await runLocalTool('swiftc', ['-O', join(backendDirectory, 'prepare_photo.swift'), '-o', join(directory, 'prepare-photo')], { signal });
    await runLocalTool('swiftc', ['-O', '-parse-as-library', join(backendDirectory, 'object_capture.swift'), join(backendDirectory, 'capture_samples.swift'), '-o', join(directory, 'object-capture')], { signal });
    return { artifacts: ['prepare-photo', 'object-capture'], value: { revision } };
  }, { signal });
  return { revision, preparePhoto: join(stage.directory, 'prepare-photo'), objectCapture: join(stage.directory, 'object-capture') };
}

/** Produces an isolated prepared capture, never a ready reconstructed scene. */
export async function prepareCapture(input, { cacheDirectory, baseDirectory = process.cwd(), signal, onProgress } = {}) {
  const request = validateCaptureSet(input);
  if (!cacheDirectory) throw new Error('Provide an explicit local cacheDirectory for image scene preparation.');
  if (request.segmentation === 'none') throw new Error('Native preparation does not support segmentation none; choose automatic/manual masks or a different backend.');
  for (const view of request.views) if (view.calibration) throw new Error(`Image scene view ${view.id}: native SDK cannot apply calibration overrides; use a calibrated backend.`);
  if (request.views.length < 3) throw new Error('Native reconstruction requires at least three overlapping views; two is only the generic capture syntax floor.');
  signal?.throwIfAborted();
  // Hash all actual files before compiling tools or writing prepared samples.
  const observations = [];
  const sourceHashes = new Set();
  for (const view of request.views) {
    const files = {};
    for (const [role, path] of Object.entries({ image: view.image, mask: view.mask, depth: view.depth?.path })) {
      if (path === undefined) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(path)) throw new Error(`Image scene view ${view.id} ${role}: supply a local file path.`);
      const absolute = resolve(baseDirectory, path);
      files[role] = { path: absolute, ...await fileDigest(absolute) };
    }
    if (sourceHashes.has(files.image.sha256)) throw new Error(`Image scene view ${view.id}: duplicate photograph bytes do not add coverage.`);
    sourceHashes.add(files.image.sha256); observations.push({ view, files });
  }
  const tools = await nativeTools(cacheDirectory, { signal });
  const prepared = [];
  for (const [index, observation] of observations.entries()) {
    const { view, files } = observation;
    const hashes = Object.fromEntries(Object.entries(files).map(([role, file]) => [role, { sha256: file.sha256, bytes: file.bytes }]));
    const key = stageKey({ stage: 'prepare-photo-v1', revision: tools.revision, files: hashes, imageExtension: extname(files.image.path).toLowerCase() });
    onProgress?.({ stage: 'prepare-photo', viewId: view.id, state: 'running', fraction: index / observations.length });
    const stage = await cachedStage(join(cacheDirectory, 'photos'), key, async directory => {
      const imageName = `source${extname(files.image.path).toLowerCase()}`;
      const artifacts = [imageName, 'mask.png', 'photo.json'];
      for (const [role, file] of Object.entries(files)) {
        const name = role === 'image' ? imageName : role === 'mask' ? 'override.png' : 'depth.exr';
        await copyFile(file.path, join(directory, name));
        if ((await fileDigest(join(directory, name))).sha256 !== file.sha256) throw new Error(`Image scene view ${view.id}: ${role} changed while preparing; retry with stable inputs.`);
        if (role !== 'image') artifacts.push(name);
      }
      await runLocalTool(tools.preparePhoto, ['--image', join(directory, imageName), '--mask', join(directory, 'mask.png'), '--metadata', join(directory, 'photo.json'), '--normalized', join(directory, 'canonical.png'), ...(files.mask ? ['--override', join(directory, 'override.png')] : [])], { signal });
      const report = JSON.parse(await readFile(join(directory, 'photo.json'), 'utf8'));
      const canonicalImage = report.sourceOrientation === 1 ? imageName : 'canonical.png';
      if (canonicalImage === 'canonical.png') artifacts.push(canonicalImage);
      // Keep receipt metadata relocatable after atomic publication.
      report.image = canonicalImage;
      await writeFile(join(directory, 'photo.json'), JSON.stringify(report, null, 2));
      return { artifacts, value: { canonicalImage, report, sourceHash: files.image.sha256 } };
    }, { signal });
    prepared.push({ id: view.id, image: join(stage.directory, stage.value.canonicalImage), mask: join(stage.directory, 'mask.png'), ...(files.depth ? { depth: { path: join(stage.directory, 'depth.exr'), encoding: view.depth.encoding } } : {}), preparation: { key, sourceHash: files.image.sha256, report: stage.value.report } });
    onProgress?.({ stage: 'prepare-photo', viewId: view.id, state: stage.cacheHit ? 'cached' : 'complete', fraction: (index + 1) / observations.length });
  }
  const views = prepared.map(view => ({ id: view.id, image: view.image, mask: view.mask, ...(view.depth ? { depth: view.depth } : {}) }));
  const inputsHash = stageKey({ mode: request.mode, revision: tools.revision, views: prepared.map(view => ({ id: view.id, key: view.preparation.key })) });
  const captureKey = stageKey({ inputsHash, rights: request.rights });
  const capture = await cachedStage(join(cacheDirectory, 'captures'), captureKey, async directory => {
    await writeFile(join(directory, 'views.json'), JSON.stringify({ schemaVersion: 1, mode: request.mode, views }, null, 2));
    const validation = await runLocalTool(tools.objectCapture, ['--validate-views', join(directory, 'views.json')], { signal, timeoutMs: 20 * 60 * 1000 });
    await writeFile(join(directory, 'validation.json'), validation.stdout);
    await writeFile(join(directory, 'preparation.json'), JSON.stringify({ schemaVersion: 1, inputsHash, rights: request.rights, views: prepared, modelIsReady: false }, null, 2));
    return { artifacts: ['views.json', 'validation.json', 'preparation.json'], value: { inputsHash } };
  }, { signal });
  return { viewsPath: join(capture.directory, 'views.json'), inputsHash, tools, prepared, cacheHit: capture.cacheHit, modelIsReady: false };
}
