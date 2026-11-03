/** Convert the native mesh without geometry cleanup or invented physical materials. */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cachedStage, fileDigest, stageKey } from './cache.mjs';
import { runLocalTool } from './process.mjs';

const converter = fileURLToPath(new URL('./backend/convert_mesh.py', import.meta.url));
export async function convertReconstructedMesh(modelPath, { cacheDirectory, blenderPath, signal, onProgress } = {}) {
  if (!cacheDirectory || !blenderPath) throw new Error('Provide cacheDirectory and the absolute local Blender executable path for photographic conversion.');
  const source = await fileDigest(modelPath);
  const executable = await fileDigest(blenderPath);
  const script = await fileDigest(converter);
  const version = await runLocalTool(blenderPath, ['--version'], { signal });
  const key = stageKey({ stage: 'photographic-glb-v1', source, executable, script, version: version.stdout });
  onProgress?.({ stage: 'convert', state: 'running' });
  const result = await cachedStage(join(resolve(cacheDirectory), 'conversions'), key, async directory => {
    const input = join(directory, 'source.usdz');
    await copyFile(modelPath, input);
    if ((await fileDigest(input)).sha256 !== source.sha256) throw new Error('Reconstruction changed during conversion; retry with immutable input.');
    const process = await runLocalTool(blenderPath, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', converter, '--', '--input', input, '--output', join(directory, 'subject.glb')], { signal, timeoutMs: 10 * 60 * 1000 });
    await writeFile(join(directory, 'conversion.log'), process.stdout + '\n' + process.stderr);
    const audit = JSON.parse(await readFile(join(directory, 'subject.audit.json'), 'utf8'));
    const model = await fileDigest(join(directory, 'subject.glb'));
    if (audit.schemaVersion !== 1 || audit.sourceSha256 !== source.sha256 || audit.modelSha256 !== model.sha256 || audit.bytes !== model.bytes || audit.lighting !== 'baked' || audit.geometryModified !== false) throw new Error('Conversion audit contradicts the actual artifact; do not publish this model.');
    return { artifacts: ['source.usdz', 'subject.glb', 'subject.audit.json', 'conversion.log'], value: { audit } };
  }, { signal });
  onProgress?.({ stage: 'convert', state: result.cacheHit ? 'cached' : 'complete' });
  return { modelPath: join(result.directory, 'subject.glb'), audit: result.value.audit, conversionKey: key, cacheHit: result.cacheHit, visualApproval: 'pending' };
}
