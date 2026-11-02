/** Use a kumiki-blender revision in existing Three.js viewers and V01 inspectors.
 * No bpy, Blender runtime, reparenting, or per-model renderer code is needed.
 */
import type { Object3D } from "three";
import { loadGltfHero } from "./hero-gltf";
import type { GltfHeroOptions } from "./hero-gltf";
import type { HeroAsset } from "./hero-asset";
import type { HeroActionSpec } from "./hero-action";
import { inspectHeroAsset } from "../visual/inspectable-asset-three";
import type { InspectableAsset, InspectablePart } from "../visual/inspectable-asset";
import { parseBlenderRevisionManifest, resolveBlenderModelUrl, verifyBlenderGlbContents, verifyBlenderModelBytes } from "./blender-revision";
import type { BlenderRevisionManifest } from "./blender-revision";

export interface BlenderHeroAsset extends HeroAsset {
  /** Original Blender kumiki_part extras → separately addressable node instances. */
  readonly semanticParts: ReadonlyMap<string, readonly Object3D[]>;
  /** Original glTF node names; use `parts`' canonical kumiki:* IDs for section/inspection. */
  readonly namedNodes: ReadonlyMap<string, Object3D>;
}

export interface BlenderRevisionFactory {
  (): BlenderHeroAsset;
  readonly manifest: BlenderRevisionManifest;
  readonly actions: readonly HeroActionSpec[];
  /** Evaluate bounds in the asset's group frame. Supply actionId to pose on each requested frame. */
  createInspectable(hero: BlenderHeroAsset, options?: { actionId?: string; fps?: number }): InspectableAsset;
  /** Call after every created HeroAsset has been disposed. */
  release(): void;
}

function indexSemanticParts(hero: HeroAsset): { groups: Map<string, Object3D[]>; parts: InspectablePart[]; named: Map<string, Object3D>; count: number } {
  const groups = new Map<string, Object3D[]>(), parts: InspectablePart[] = [];
  // These IDs must be canonical. If original glTF node names also live in
  // HeroAsset.parts, SectionReveal assigns them as mesh owners before seeing
  // the inspector's kumiki:* aliases, making isolation a silent no-op.
  const named = new Map<string, Object3D>();
  let count = 0;
  hero.group.traverse(node => {
    const role = node.userData.kumiki_part;
    if (role === undefined) return;
    // A valid role becomes a stable, addressable inspector ID. Never silently
    // strip Unicode/punctuation and collide two physically distinct parts.
    if (typeof role !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,100}$/.test(role))
      throw new Error(`Invalid Blender kumiki_part tag on node "${node.name}".`);
    const members = groups.get(role) ?? [];
    members.push(node);
    groups.set(role, members);
    const id = `kumiki:${role}:${members.length}`;
    if (named.has(id)) throw new Error(`Blender semantic part ID "${id}" conflicts with a glTF node name.`);
    named.set(id, node);
    parts.push({ id, role, label: node.name || `${role} ${members.length}`, hideable: true, ghostable: true,
      clippable: !!(node as Object3D & { isMesh?: boolean }).isMesh });
    count++;
  });
  return { groups, parts, named, count };
}

/** Stream resource bytes into a bounded buffer, cancelling as soon as the
 * declared limit is exceeded. Avoid response.text()/arrayBuffer() here: both
 * buffer arbitrary remote content before the caller can validate size.
 */
async function fetchBounded(url: string, maxBytes: number, label: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot fetch Blender ${label} (${response.status}).`);
  const declared = response.headers.get("content-length");
  if (declared !== null && Number.isFinite(Number(declared)) && Number(declared) > maxBytes)
    throw new Error(`Blender ${label} exceeds the ${maxBytes}-byte limit.`);
  if (!response.body) throw new Error(`Blender ${label} requires a streaming HTTP response to enforce the byte limit.`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error(`Blender ${label} exceeds the ${maxBytes}-byte limit.`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer;
}

/** Non-cryptographic geometry revision discriminator for inspection caches. */
function inspectionRevision(assetId: string, model: ArrayBuffer): string {
  let hash = 0x811c9dc5;
  const bytes = new Uint8Array(model);
  for (let i = 0; i < bytes.length; i++) hash = Math.imul(hash ^ bytes[i], 0x01000193);
  return `${assetId}:${bytes.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Load a model plus its audited revision metadata. A GLB URL is also accepted. */
export async function loadBlenderRevision(
  source: { manifest: unknown; model: ArrayBuffer | string },
  options: Omit<GltfHeroOptions, "metersPerUnit"> = {},
): Promise<BlenderRevisionFactory> {
  const manifest = parseBlenderRevisionManifest(source.manifest);
  let model: ArrayBuffer;
  if (typeof source.model === "string") {
    model = await fetchBounded(source.model, manifest.output_bytes[manifest.files.model], "GLB");
  } else model = source.model;
  verifyBlenderModelBytes(model, manifest);
  verifyBlenderGlbContents(model, manifest);
  const revision = inspectionRevision(manifest.asset_id, model);

  const gltfFactory = await loadGltfHero(model, { ...options, id: options.id ?? manifest.asset_id, metersPerUnit: 1 });
  // Refuse a stale/tampered manifest before returning an apparently usable
  // factory; the producer counts tagged glTF nodes during its GLB audit.
  const probe = gltfFactory();
  try {
    const index = indexSemanticParts(probe);
    if (index.count !== manifest.glb_audit.semantic_nodes)
      throw new Error(`Blender kumiki_part semantic node mismatch: expected ${manifest.glb_audit.semantic_nodes}, found ${index.count}.`);
  } catch (error) {
    gltfFactory.release();
    throw error;
  } finally { probe.dispose(); }
  const owned = new WeakMap<BlenderHeroAsset, readonly InspectablePart[]>();
  let released = false;
  const create = (() => {
    if (released) throw new Error("This Blender revision factory was released.");
    const hero = gltfFactory();
    const index = indexSemanticParts(hero);
    if (index.count !== manifest.glb_audit.semantic_nodes) {
      hero.dispose();
      throw new Error(`Blender kumiki_part semantic node mismatch: expected ${manifest.glb_audit.semantic_nodes}, found ${index.count}.`);
    }
    const asset: BlenderHeroAsset = {
      ...hero, parts: index.named, semanticParts: index.groups, namedNodes: hero.parts,
      craft: { ...hero.craft,
        details: [...hero.craft.details, `${index.groups.size} Blender semantic roles across ${index.count} instances`,
          `Revision generator: ${manifest.generator ?? "unspecified"}`] },
    };
    owned.set(asset, index.parts);
    return asset;
  }) as BlenderRevisionFactory;
  Object.defineProperty(create, "manifest", { value: manifest });
  Object.defineProperty(create, "actions", { value: gltfFactory.actions });
  create.createInspectable = (hero, inspectOptions = {}) => {
    const parts = owned.get(hero);
    if (!parts) throw new Error("This Blender hero belongs to a different revision factory.");
    const { actionId, fps = 30 } = inspectOptions;
    if (actionId && !gltfFactory.actions.some(action => action.id === actionId))
      throw new Error(`Unknown Blender action "${actionId}".`);
    return inspectHeroAsset(hero, { parts, revision,
      poseAt: actionId ? frame => hero.pose?.({ id: actionId, frame, fps }) : undefined });
  };
  create.release = () => { if (!released) { released = true; gltfFactory.release(); } };
  return create;
}

/** Import a complete published revision directory using its manifest URL. */
export async function loadBlenderRevisionFromUrl(
  manifestUrl: string, options: Omit<GltfHeroOptions, "metersPerUnit"> = {},
): Promise<BlenderRevisionFactory> {
  let url: URL;
  try { url = new URL(manifestUrl); }
  catch { throw new Error("Blender manifest URL must be absolute HTTP(S)."); }
  if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith("/manifest.json") || url.username || url.password)
    throw new Error("Blender manifest URL must be a credential-free HTTP(S) manifest.json URL.");
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(await fetchBounded(manifestUrl, 1024 * 1024, "revision manifest"));
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("Blender revision manifest is not valid JSON."); }
  const manifest = parseBlenderRevisionManifest(parsed);
  const model = resolveBlenderModelUrl(manifestUrl, manifest);
  return loadBlenderRevision({ manifest, model }, options);
}
