/** Local preparation cache. Only a verified receipt makes a stage reusable. */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';

export function stageKey(inputs) {
  function canonical(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(canonical);
    if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    throw new Error('Image scene cache inputs must be finite JSON values; record every revision explicitly.');
  }
  return createHash('sha256').update(JSON.stringify(canonical(inputs))).digest('hex');
}
export async function fileDigest(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size < 1 || info.size > 512 * 1024 * 1024) throw new Error(`Image scene file ${path}: expected a nonempty file at most 512 MiB.`);
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return { sha256: hash.digest('hex'), bytes: info.size };
}
function artifactPath(path) {
  if (typeof path !== 'string' || !path.split('/').every(part => /^[A-Za-z0-9._-]+$/.test(part) && part !== '.' && part !== '..')) throw new Error('Cache artifacts need contained relative paths.');
  return path;
}
async function inspectArtifact(directory, path) {
  artifactPath(path);
  let current = directory;
  for (const part of path.split('/')) { current = join(current, part); if ((await lstat(current)).isSymbolicLink()) throw new Error(`Cache artifact ${path}: symbolic links are not allowed.`); }
  return { path, ...await fileDigest(current) };
}
async function readReceipt(directory, key) {
  let receipt;
  try { receipt = JSON.parse(await readFile(join(directory, 'receipt.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new Error(`Image scene corrupt cache receipt ${directory}: ${error.message}`); }
  if (receipt.schemaVersion !== 1 || receipt.key !== key || !Array.isArray(receipt.artifacts) || receipt.artifacts.length === 0) throw new Error(`Image scene corrupt cache receipt ${directory}; use a new cache revision.`);
  for (const artifact of receipt.artifacts) {
    try {
      const actual = await inspectArtifact(directory, artifact.path);
      if (actual.sha256 !== artifact.sha256 || actual.bytes !== artifact.bytes) throw Error('digest mismatch');
    } catch (error) { throw new Error(`Image scene corrupt cache artifact ${artifact.path}: ${error.message}; use a new cache revision.`); }
  }
  return { directory, value: receipt.value, artifacts: receipt.artifacts, cacheHit: true };
}
export async function cachedStage(root, key, produce, { signal } = {}) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Cache key must be a SHA-256 digest.');
  signal?.throwIfAborted();
  await mkdir(root, { recursive: true });
  const directory = join(root, key), lock = join(root, `${key}.lock`);
  const cached = await readReceipt(directory, key);
  if (cached) return cached;
  try { await mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Image scene cache busy: ${lock}. Wait for its writer; after a crash, verify no writer remains before removing this lock.`);
    throw error;
  }
  let staging;
  try {
    const completed = await readReceipt(directory, key); if (completed) return completed;
    staging = await mkdtemp(join(root, `${key}.partial-`));
    const result = await produce(staging);
    signal?.throwIfAborted();
    if (!Array.isArray(result.artifacts) || result.artifacts.length === 0 || result.artifacts.includes('receipt.json')) throw new Error('A cache stage must declare its output artifacts, excluding receipt.json.');
    const artifacts = [];
    for (const path of result.artifacts) artifacts.push(await inspectArtifact(staging, path));
    await writeFile(join(staging, 'receipt.json'), JSON.stringify({ schemaVersion: 1, key, artifacts, value: result.value }, null, 2), { flag: 'wx' });
    signal?.throwIfAborted();
    await rename(staging, directory); staging = undefined;
    return { directory, value: result.value, artifacts, cacheHit: false };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
