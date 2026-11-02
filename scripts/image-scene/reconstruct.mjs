/** Native depth/fusion/texturing boundary. Complete alignment is necessary, never visual approval. */
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { cachedStage, fileDigest, stageKey } from './cache.mjs';
import { runLocalTool } from './process.mjs';

export async function reconstructCapture(capture, { cacheDirectory, detail = 'full', signal, onProgress } = {}) {
  if (!cacheDirectory) throw new Error('Provide cacheDirectory for reconstructed capture artifacts.');
  if (!['preview', 'medium', 'full'].includes(detail)) throw new Error('Reconstruction detail must be preview, medium or full.');
  signal?.throwIfAborted();
  const document = JSON.parse(await readFile(capture.viewsPath, 'utf8'));
  if (document.schemaVersion !== 1 || !Array.isArray(document.views) || document.views.length !== capture.prepared.length) throw new Error('Prepared capture document changed; prepare the capture again before reconstruction.');
  async function hashObservations() {
    const observations = [];
    for (const view of document.views) {
      const files = {};
      for (const [role, path] of Object.entries({ image: view.image, mask: view.mask, depth: view.depth?.path })) {
        if (path === undefined && role === 'depth') continue;
        if (typeof path !== 'string') throw new Error(`View ${view.id} needs a prepared ${role} path.`);
        files[role] = await fileDigest(resolve(dirname(capture.viewsPath), path));
      }
      observations.push({ id: view.id, files });
    }
    return observations;
  }
  const observations = await hashObservations();
  const executable = await fileDigest(capture.tools.objectCapture);
  const key = stageKey({ stage: 'native-reconstruct-v1', inputsHash: capture.inputsHash, toolRevision: capture.tools.revision, executable, detail, observations, views: await fileDigest(capture.viewsPath) });
  onProgress?.({ stage: 'reconstruct', state: 'running' });
  const result = await cachedStage(join(cacheDirectory, 'reconstructions'), key, async directory => {
    const attempts = join(cacheDirectory, 'attempts'); await mkdir(attempts, { recursive: true });
    const attempt = await mkdtemp(join(attempts, `${key}-`));
    const output = join(attempt, 'subject.usdz');
    await writeFile(join(attempt, 'run.json'), JSON.stringify({ key, inputsHash: capture.inputsHash, executable, toolRevision: capture.tools.revision, detail, viewsPath: capture.viewsPath, modelIsReady: false }, null, 2));
    try {
      const process = await runLocalTool(capture.tools.objectCapture, ['--views', capture.viewsPath, '--output', output, '--detail', detail, '--checkpoint', join(attempt, 'checkpoint')], { signal, timeoutMs: 2 * 60 * 60 * 1000, maximumOutputBytes: 32 * 1024 * 1024 });
      await writeFile(join(attempt, 'process.log'), `${process.stdout}\n${process.stderr}`);
      const report = JSON.parse(await readFile(`${output}.report.json`, 'utf8'));
      const poses = JSON.parse(await readFile(`${output}.poses.json`, 'utf8'));
      const expected = new Set(capture.prepared.map(view => view.id));
      const actual = new Set(poses.views?.map(view => view.id));
      const missing = [...expected].filter(id => !actual.has(id));
      if (missing.length || actual.size !== expected.size || poses.views?.length !== expected.size || [...actual].some(id => !expected.has(id))) throw new Error(`Missing/contradictory aligned views: ${missing.join(', ') || 'duplicate or unknown IDs'}; model is not ready.`);
      if (report.schemaVersion !== 1 || poses.schemaVersion !== 1 || report.backend !== 'apple-object-capture' || report.trainingViews !== expected.size || report.preparedMaskViews !== expected.size || report.detail !== detail || !Array.isArray(report.warnings)) throw new Error('Native reconstruction report contradicts this prepared capture; model is not ready.');
      for (const view of poses.views) if (!Array.isArray(view.cameraToWorld) || view.cameraToWorld.length !== 16 || !view.cameraToWorld.every(Number.isFinite)) throw new Error(`View ${view.id} has invalid pose geometry; model is not ready.`);
      if (stageKey(await hashObservations()) !== stageKey(observations)) throw new Error('Prepared input bytes changed during reconstruction; model is not ready.');
      // The staging cache receives only fully validated backend results. Attempts/checkpoints stay available for diagnosis.
      for (const name of ['subject.usdz', 'subject.usdz.report.json', 'subject.usdz.poses.json']) await copyFile(join(attempt, name), join(directory, name));
      return { artifacts: ['subject.usdz', 'subject.usdz.report.json', 'subject.usdz.poses.json'], value: { attempt, report, visualApproval: 'pending' } };
    } catch (error) {
      await writeFile(join(attempt, 'failure.json'), JSON.stringify({ key, message: error.message, modelIsReady: false, visualApproval: 'pending' }, null, 2));
      throw new Error(`Image scene reconstruction failed: ${error.message} Evidence: ${attempt}. Do not publish partial artifacts.`, { cause: error });
    }
  }, { signal });
  onProgress?.({ stage: 'reconstruct', state: result.cacheHit ? 'cached' : 'complete' });
  return { modelPath: join(result.directory, 'subject.usdz'), posesPath: join(result.directory, 'subject.usdz.poses.json'), report: result.value.report, cacheHit: result.cacheHit, reconstructionKey: key, visualApproval: 'pending' };
}
