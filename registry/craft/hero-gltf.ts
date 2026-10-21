/** glTF 2.0 bridge for hero assets.
 *
 * Export: any HeroAsset → binary .glb (meshes, skins, instancing, PBR materials,
 * vertex colors and painted textures) for Blender, other engines or review.
 * Shader-only micro-detail (`applySurfaceDetail`) is not representable in glTF and
 * is dropped; everything else round-trips.
 *
 * Import: a licensed .glb/.gltf → a HeroAsset factory. glTF animation clips become
 * frame-addressed actions (pure functions of the frame, like every other asset), so
 * imported models work in the viewer, stage sets, finance stage and video export.
 */
import { AnimationClip, AnimationMixer, Box3, Group, Mesh, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from "three";
import type { AnimationAction, KeyframeTrack, Material, Object3D, Texture } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { HeroAsset } from "./hero-asset";
import type { HeroActionSpec, HeroActionState } from "./hero-action";
import { actionTime, findAction } from "./hero-action";
import type { HeroStudioOptions } from "./hero-studio";

/**
 * Bake a code-driven action into a glTF-compatible AnimationClip by sampling every
 * frame: nodes (objects and bones) that move get position/quaternion/scale tracks;
 * visibility toggles become zero-scale keys. Material/color-only effects (LED
 * colors, emissive fades) cannot be represented and are not baked.
 */
export function bakeHeroActionClip(asset: HeroAsset, actionId: string, fps = 30): AnimationClip {
  const spec = findAction(asset.actions ?? [], actionId);
  const frames = Math.max(1, Math.round(spec.durationFrames * fps / 30));
  const nodes: Object3D[] = [];
  asset.group.traverse(node => { if (node !== asset.group) nodes.push(node); });
  const pos = nodes.map(() => [] as number[]), rot = nodes.map(() => [] as number[]), scl = nodes.map(() => [] as number[]);
  const times: number[] = [];
  for (let f = 0; f <= frames; f++) {
    asset.pose?.({ id: actionId, frame: spec.loop ? f % frames : f, fps });
    times.push(f / fps);
    nodes.forEach((node, i) => {
      pos[i].push(node.position.x, node.position.y, node.position.z);
      rot[i].push(node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w);
      const k = node.visible ? 1 : 0;
      scl[i].push(node.scale.x * k, node.scale.y * k, node.scale.z * k);
    });
  }
  asset.pose?.({ id: null, frame: 0 });
  const varies = (values: number[], stride: number) => {
    for (let j = stride; j < values.length; j++) if (Math.abs(values[j] - values[j % stride]) > 1e-6) return true;
    return false;
  };
  const tracks: KeyframeTrack[] = [];
  nodes.forEach((node, i) => {
    if (varies(pos[i], 3)) tracks.push(new VectorKeyframeTrack(`${node.uuid}.position`, times, pos[i]));
    if (varies(rot[i], 4)) tracks.push(new QuaternionKeyframeTrack(`${node.uuid}.quaternion`, times, rot[i]));
    if (varies(scl[i], 3)) tracks.push(new VectorKeyframeTrack(`${node.uuid}.scale`, times, scl[i]));
  });
  return new AnimationClip(spec.id, frames / fps, tracks);
}

export interface HeroGlbExportOptions {
  /** Bake these actions (or "all") as glTF animation clips. */
  actions?: readonly string[] | "all";
  fps?: number;
}

/** Export an asset as binary glTF, optionally with its actions baked as animation clips. */
export async function exportHeroGlb(asset: HeroAsset, options: HeroGlbExportOptions = {}): Promise<ArrayBuffer> {
  const ids = options.actions === "all" ? (asset.actions ?? []).map(a => a.id) : options.actions ?? [];
  const animations = ids.map(id => bakeHeroActionClip(asset, id, options.fps ?? 30)).filter(clip => clip.tracks.length > 0);
  // glTF has no visibility flag: export hidden-at-rest nodes at zero scale so they exist
  // (baked clips scale them in) without cluttering the rest pose.
  asset.pose?.({ id: null, frame: 0 });
  const hidden: Array<{ node: Object3D; scale: Vector3 }> = [];
  asset.group.traverse(node => { if (!node.visible) { hidden.push({ node, scale: node.scale.clone() }); node.visible = true; node.scale.setScalar(0); } });
  const exporter = new GLTFExporter();
  let result: ArrayBuffer | object;
  try { result = await exporter.parseAsync(asset.group, { binary: true, animations, onlyVisible: false }); }
  finally { for (const { node, scale } of hidden) { node.visible = false; node.scale.copy(scale); } }
  if (!(result instanceof ArrayBuffer)) throw new Error("GLTFExporter did not return binary output.");
  return result;
}

export interface GltfHeroOptions {
  id?: string;
  /** glTF is meters by specification; override only for non-conforming files. */
  metersPerUnit?: number;
  studio?: Partial<Omit<HeroStudioOptions, "bounds">>;
  exposure?: number;
  /** Per-clip action metadata (keyed by clip name); clips without an entry loop with a generic meaning. */
  actions?: Record<string, { label?: string; meaning?: string; loop?: boolean }>;
  /** Provenance for the craft notes, e.g. "CC-BY 4.0, Author, source URL". Required for third-party models. */
  license?: string;
  /**
   * Rest on a clip frame instead of the bind pose (rigged characters are usually
   * bound in a T/A-pose). Also used to measure bounds, so cameras frame the rest silhouette.
   */
  restPose?: { action: string; frame?: number };
}

export interface GltfHeroFactory {
  /** Create an independent instance (shares geometry/materials with the loaded source). */
  (): HeroAsset;
  /** Signature actions derived from the file's animation clips. */
  readonly actions: readonly HeroActionSpec[];
  /** Free the GPU resources shared by every instance. Call once, after all instances are gone. */
  release(): void;
}

/** Load a .glb/.gltf (URL or ArrayBuffer) into a reusable HeroAsset factory. */
export async function loadGltfHero(source: string | ArrayBuffer, options: GltfHeroOptions = {}): Promise<GltfHeroFactory> {
  const loader = new GLTFLoader();
  const gltf = typeof source === "string" ? await loader.loadAsync(source) : await loader.parseAsync(source, "");
  const template = gltf.scene;
  const clips: AnimationClip[] = gltf.animations ?? [];
  const actions: HeroActionSpec[] = clips.map((clip, i) => {
    const id = clip.name || `clip-${i + 1}`, meta = options.actions?.[id];
    return { id, label: meta?.label ?? id, durationFrames: Math.max(1, Math.round(clip.duration * 30)),
      loop: meta?.loop ?? true, meaning: meta?.meaning ?? "Imported glTF animation." };
  });
  template.traverse(node => { if ((node as Mesh).isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  const rest = options.restPose;
  const restIndex = rest ? actions.findIndex(a => a.id === rest.action) : -1;
  if (rest && restIndex < 0) throw new Error(`restPose action "${rest.action}" is not a clip in this glTF.`);
  /** Show `restPose` (or the bind pose) on a mixer bound to one instance's scene. */
  const applyRest = (mixer: AnimationMixer | null, clip: AnimationAction | undefined) => {
    if (!mixer) return;
    mixer.stopAllAction();
    if (clip && rest) { clip.play(); clip.time = actionTime(actions[restIndex], rest.frame ?? 0, 30) * clip.getClip().duration; }
    mixer.update(0);
  };
  const measure = rest ? new AnimationMixer(template) : null;
  applyRest(measure, measure?.clipAction(clips[restIndex]));
  template.updateMatrixWorld(true);
  // Precise: skinned meshes are measured in the posed silhouette, not the bind-pose geometry.
  const box = new Box3().setFromObject(template, true);
  if (measure) { measure.stopAllAction(); measure.uncacheRoot(template); template.updateMatrixWorld(true); }
  const size = box.getSize(new Vector3());
  if (!Number.isFinite(size.x) || size.lengthSq() === 0) throw new Error("glTF scene has no renderable geometry.");
  // Rest the model on y = 0, centered in X/Z, so it composes like built-in assets.
  const offset = new Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const bounds = { min: [box.min.x + offset.x, 0, box.min.z + offset.z] as const, max: [box.max.x + offset.x, size.y, box.max.z + offset.z] as const };
  const factory = (() => {
    const group = new Group();
    group.name = options.id ?? "gltf-asset";
    const scene = cloneSkinned(template) as Object3D;
    scene.position.copy(offset);
    group.add(scene);
    const parts = new Map<string, Object3D>();
    scene.traverse(node => { if (node.name && !parts.has(node.name)) parts.set(node.name, node); });
    const mixer = clips.length ? new AnimationMixer(scene) : null;
    const clipActions = new Map<string, AnimationAction>();
    clips.forEach((clip, i) => clipActions.set(actions[i].id, mixer!.clipAction(clip)));
    return {
      id: group.name, group, parts, tier: "hero", bounds, metersPerUnit: options.metersPerUnit ?? 1,
      exposure: options.exposure, studio: options.studio ?? { palette: "graphite" },
      craft: { materials: ["imported glTF PBR materials"], details: [`${parts.size} named nodes`, `${clips.length} animation clips`],
        stylization: options.license ? `Imported model. ${options.license}` : "Imported model (record its license in GltfHeroOptions.license)." },
      actions,
      pose(state: HeroActionState) {
        if (!mixer) return;
        if (!state.id) { applyRest(mixer, rest && clipActions.get(rest.action)); return; }
        mixer.stopAllAction(); // restores the bind pose of every animated property
        const spec = findAction(actions, state.id), clip = clipActions.get(spec.id)!;
        clip.play();
        clip.time = actionTime(spec, state.frame, state.fps) * clip.getClip().duration;
        mixer.update(0);
      },
      dispose() { mixer?.stopAllAction(); mixer?.uncacheRoot(scene); group.clear(); },
    } satisfies HeroAsset;
  }) as unknown as GltfHeroFactory;
  Object.defineProperty(factory, "actions", { value: actions });
  factory.release = () => {
    const geometries = new Set<{ dispose(): void }>(), materials = new Set<Material>(), textures = new Set<Texture>();
    template.traverse(node => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      geometries.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if ((value as Texture)?.isTexture) textures.add(value as Texture);
      }
    });
    for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
  };
  return factory;
}
