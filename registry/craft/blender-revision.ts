/** Validate the existing kumiki-blender schema-1 revision manifest, without bpy.
 * This is an interoperability check, not a visual or licensing certification.
 */

export interface BlenderRevisionManifest {
  schema_version: 1;
  asset_id: string;
  units: "meters";
  files: { model: string; source?: string; preview?: string; quality_views?: string[]; motion?: string };
  output_bytes: Record<string, number>;
  glb_audit: { bytes: number; meshes: number; nodes: number; materials: number; semantic_nodes: number; external_references: 0 };
  named_parts: Record<string, number>;
  bounds_m?: readonly [readonly [number, number, number], readonly [number, number, number]];
  provenance?: string | Record<string, unknown>;
  generator?: string;
  status?: string;
  native_axes?: string;
}

/** Match the companion producer's maximum source-model intake budget. */
export const MAX_BLENDER_MODEL_BYTES = 512 * 1024 * 1024;
/** Portable PM2 sidecars are bounded independently from mesh data. */
export const MAX_BLENDER_MOTION_BYTES = 32 * 1024 * 1024;

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const whole = (value: unknown) => Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
const pathSafeExtension = (path: unknown, extension: string): path is string =>
  typeof path === "string" && path.endsWith(extension) && path.length <= 256 &&
  path.split("/").every(segment => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment) && segment !== "." && segment !== "..");
const pathSafe = (path: unknown): path is string => pathSafeExtension(path, ".glb");
const motionPathSafe = (path: unknown): path is string => pathSafeExtension(path, ".json");

/** Accept only the producer's metric, embedded-GLB revision format. */
export function parseBlenderRevisionManifest(input: unknown): BlenderRevisionManifest {
  if (!record(input)) throw new Error("Blender revision manifest must be an object.");
  if (input.schema_version !== 1) throw new Error("Unsupported Blender revision schema_version; expected 1.");
  if (typeof input.asset_id !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.asset_id))
    throw new Error("Blender revision asset_id must be a lowercase slug.");
  if (input.units !== "meters") throw new Error("Blender revision units must be meters.");
  if (!record(input.files) || !pathSafe(input.files.model)) throw new Error("Invalid Blender revision files.model GLB path.");
  if (!record(input.output_bytes) || !Object.values(input.output_bytes).every(v => whole(v) && (v as number) > 0) ||
      !whole(input.output_bytes[input.files.model]) || (input.output_bytes[input.files.model] as number) === 0)
    throw new Error("Invalid Blender revision output_bytes for files.model.");
  if ((input.output_bytes[input.files.model] as number) > MAX_BLENDER_MODEL_BYTES)
    throw new Error("Blender model exceeds the 512 MiB import budget.");
  if (input.files.motion !== undefined &&
      (!motionPathSafe(input.files.motion) || !whole(input.output_bytes[input.files.motion]) ||
       (input.output_bytes[input.files.motion] as number) < 1 ||
       (input.output_bytes[input.files.motion] as number) > MAX_BLENDER_MOTION_BYTES))
    throw new Error("Blender motion sidecar requires a safe relative JSON path and an exact size at most 32 MiB.");
  const audit = input.glb_audit;
  if (!record(audit) || !["bytes", "meshes", "nodes", "materials", "semantic_nodes", "external_references"].every(k => whole(audit[k])) ||
      audit.bytes !== input.output_bytes[input.files.model] || audit.meshes === 0 || audit.semantic_nodes === 0 ||
      (audit.semantic_nodes as number) > (audit.nodes as number) || audit.external_references !== 0)
    throw new Error("Invalid Blender glb_audit bytes, semantic_nodes, or portability counts.");
  if (!record(input.named_parts) || Object.keys(input.named_parts).length === 0 ||
      Object.entries(input.named_parts).some(([key, count]) => !key || key.length > 128 || !whole(count)) ||
      !Object.values(input.named_parts).some(count => (count as number) > 0))
    throw new Error("Invalid Blender revision named_parts.");
  const bounds = input.bounds_m;
  if (bounds !== undefined && (!Array.isArray(bounds) || bounds.length !== 2 ||
      !bounds.every((v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n: unknown) => typeof n === "number" && Number.isFinite(n))) ||
      (bounds as number[][])[0].some((v, i) => v > (bounds as number[][])[1][i])))
    throw new Error("Invalid Blender revision bounds_m.");
  if (input.provenance !== undefined && typeof input.provenance !== "string" && !record(input.provenance))
    throw new Error("Invalid Blender revision provenance.");
  return input as unknown as BlenderRevisionManifest;
}

/** Resolve only a relative contained model path beside the manifest (never a foreign URL). */
export function resolveBlenderModelUrl(manifestUrl: string, manifest: BlenderRevisionManifest): string {
  let url: URL;
  try { url = new URL(manifestUrl); }
  catch { throw new Error("Blender manifest URL must be absolute."); }
  if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith("/manifest.json"))
    throw new Error("Blender manifest URL must end in manifest.json over HTTP(S).");
  // Validate again even if a caller bypassed the parser with a type assertion.
  if (!pathSafe(manifest.files.model)) throw new Error("Unsafe Blender revision files.model path.");
  return new URL(manifest.files.model, url).href;
}

/** Same-folder, size-verified PM2 sidecar declared by a Blender physics revision. */
export function resolveBlenderMotionUrl(manifestUrl: string, manifest: BlenderRevisionManifest): string {
  const motion = manifest.files.motion;
  if (!motionPathSafe(motion)) throw new Error("Blender revision does not declare a safe files.motion JSON sidecar.");
  const url = new URL(manifestUrl);
  if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith("/manifest.json") || url.username || url.password)
    throw new Error("Blender manifest URL must end in manifest.json over HTTP(S).");
  return new URL(motion, url).href;
}

/** Check the exact verified-revision byte count before handing the buffer to GLTFLoader. */
export function verifyBlenderModelBytes(model: ArrayBuffer, manifest: BlenderRevisionManifest): void {
  const expected = manifest.output_bytes[manifest.files.model];
  if (model.byteLength !== expected) throw new Error(`Blender model size mismatch: expected ${expected} bytes, received ${model.byteLength}.`);
}

/** Inspect the actual GLB envelope before the general Three.js loader gets it.
 * Blender's glb_audit is producer evidence, never authority to fetch foreign
 * buffers or textures. Accept embedded bufferViews and data URIs only.
 */
export function verifyBlenderGlbContents(model: ArrayBuffer, manifest: BlenderRevisionManifest): void {
  if (model.byteLength < 20) throw new Error("Blender model is not a GLB 2.0 envelope.");
  const view = new DataView(model);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== model.byteLength)
    throw new Error("Blender model has an invalid GLB 2.0 header or length.");
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || !jsonLength || jsonLength > 16 * 1024 * 1024 || jsonLength > model.byteLength - 20)
    throw new Error("Blender model has an invalid GLB JSON chunk.");
  let json: unknown;
  try { json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(model, 20, jsonLength))); }
  catch { throw new Error("Blender model contains malformed GLB JSON."); }
  if (!record(json) || !record(json.asset) || json.asset.version !== "2.0")
    throw new Error("Blender GLB must declare glTF asset version 2.0.");
  const arrays = [json.meshes, json.nodes, json.materials, json.buffers, json.images];
  if (!arrays.every((item, i) => Array.isArray(item) || (i >= 3 && item === undefined)))
    throw new Error("Blender GLB contains malformed mesh/node/material/resource arrays.");
  const meshes = json.meshes as unknown[], nodes = json.nodes as unknown[], materials = json.materials as unknown[];
  const semanticNodes = nodes.filter(node => record(node) && record(node.extras) && typeof node.extras.kumiki_part === "string").length;
  if (meshes.length !== manifest.glb_audit.meshes || nodes.length !== manifest.glb_audit.nodes ||
      materials.length !== manifest.glb_audit.materials || semanticNodes !== manifest.glb_audit.semantic_nodes)
    throw new Error("Blender GLB mesh, node, material or semantic node counts differ from glb_audit.");
  for (const resource of [...(json.buffers as unknown[] ?? []), ...(json.images as unknown[] ?? [])]) {
    if (!record(resource) || ("uri" in resource && (typeof resource.uri !== "string" || !resource.uri.startsWith("data:"))))
      throw new Error("Blender GLB must use embedded buffers/images; external resource URIs are forbidden.");
  }
}
