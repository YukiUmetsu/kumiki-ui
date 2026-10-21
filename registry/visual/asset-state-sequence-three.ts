/** Three.js adapter for `AssetStateSequence`: one composite HeroAsset over supplied variant builds.
 *
 * Every variant (a separately built HeroAsset, e.g. a house in `new`, `aged`
 * and `damaged` condition) is added to one group. The composite's single
 * action, `sequence`, evaluates the plan at the action frame and shows each
 * build with its opacity, wipe clip and pose. Crossfades pick a method per
 * pair: `overlay` for builds of the same shape (same part set and bounds, e.g.
 * condition variants): the leaving build stays opaque and the arriving one
 * blends over it on the same surfaces. `dissolve` for different shapes: both
 * use hashed (dithered) alpha, so depth stays correct. Wipes clip both builds
 * with one moving plane so neither turns transparent. Materials are cloned lazily
 * per build only while a build is faded or clipped, and restored afterwards.
 * Semantic part ids come from the initial build; the variants keep their own
 * maps in `variantParts`. Builds with a different `metersPerUnit` are wrapped in
 * a scale group so every state keeps its true real-world size.
 */
import { Group, Plane, Vector3 } from "three";
import type { Material, Mesh, Object3D } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import type { HeroActionState } from "../craft/hero-action";
import { evaluateAssetStateSequence } from "./asset-state-sequence";
import type { AssetStateFrame, AssetStatePlan } from "./asset-state-sequence";

export interface AssetStateAsset extends HeroAsset {
  plan: AssetStatePlan;
  /** Builds by variant id (owned: disposed with the composite). */
  variants: ReadonlyMap<string, HeroAsset>;
  variantParts: ReadonlyMap<string, ReadonlyMap<string, Object3D>>;
  /** Evaluated state at a frame (same as the pose uses). */
  frameAt(frame: number): AssetStateFrame;
}

interface Look { clones: Map<Material, Material>; meshes: { mesh: Mesh; original: Material | Material[] }[]; active: boolean }

/** Compose variant builds into one sequenced HeroAsset. Throws when the plan names a build that was not supplied. */
export function createAssetStateAsset(options: { id: string; plan: AssetStatePlan; variants: Record<string, HeroAsset>; crossfade?: "auto" | "overlay" | "dissolve" }): AssetStateAsset {
  const { plan } = options;
  const variants = new Map(Object.entries(options.variants));
  const needed = new Set([...plan.states.values()].map((s) => s.variant));
  const missing = [...needed].filter((v) => !variants.has(v));
  if (missing.length) throw new Error(`createAssetStateAsset "${options.id}": no build supplied for variant(s) ${missing.join(", ")}.`);
  const initialVariant = plan.states.get(plan.initial)!.variant;
  const first = variants.get(initialVariant)!;
  // Builds authored in different units are rescaled to the initial build's unit, so true size is kept.
  const unit = first.metersPerUnit;
  const root = new Group();
  root.name = options.id;
  const scaleOf = new Map<string, number>();
  for (const [id, v] of variants) {
    const k = v.metersPerUnit / unit;
    scaleOf.set(id, k);
    v.group.userData.stateVariant = id;
    if (Math.abs(k - 1) < 1e-9) { root.add(v.group); continue; }
    const holder = new Group();
    holder.name = `${id}.unit-scale`;
    holder.scale.setScalar(k);
    holder.add(v.group);
    root.add(holder);
  }
  const all = [...variants];
  const min = [0, 1, 2].map((k) => Math.min(...all.map(([id, v]) => v.bounds.min[k] * scaleOf.get(id)!))) as [number, number, number];
  const max = [0, 1, 2].map((k) => Math.max(...all.map(([id, v]) => v.bounds.max[k] * scaleOf.get(id)!))) as [number, number, number];
  const extent = { x: [min[0], max[0]] as [number, number], y: [min[1], max[1]] as [number, number], z: [min[2], max[2]] as [number, number] };

  const looks = new Map<string, Look>();
  const lookOf = (id: string) => {
    let look = looks.get(id);
    if (!look) {
      look = { clones: new Map(), meshes: [], active: false };
      variants.get(id)!.group.traverse((o) => { const m = o as Mesh; if (m.isMesh) look!.meshes.push({ mesh: m, original: m.material }); });
      looks.set(id, look);
    }
    return look;
  };
  const clipPlane = new Map<string, Plane>();
  const sameShape = (a: string, b: string) => {
    const va = variants.get(a)!, vb = variants.get(b)!;
    const size = Math.max(...[0, 1, 2].map((k) => va.bounds.max[k] - va.bounds.min[k]), 1e-6);
    const close = [0, 1, 2].every((k) => Math.abs(va.bounds.min[k] * scaleOf.get(a)! - vb.bounds.min[k] * scaleOf.get(b)!) < size * 0.01 && Math.abs(va.bounds.max[k] * scaleOf.get(a)! - vb.bounds.max[k] * scaleOf.get(b)!) < size * 0.01);
    return close && va.parts.size === vb.parts.size && [...va.parts.keys()].every((k) => vb.parts.has(k));
  };
  const style = (id: string, opacity: number, clip?: AssetStateFrame["variants"][number]["clip"], mode: "overlay" | "dissolve" = "dissolve") => {
    const look = lookOf(id);
    const plain = opacity >= 0.999 && !clip;
    if (plain) {
      if (look.active) { for (const r of look.meshes) r.mesh.material = r.original; look.active = false; }
      return;
    }
    let plane = clipPlane.get(id);
    if (clip) {
      const n = new Vector3(clip.axis === "x" ? 1 : 0, clip.axis === "y" ? 1 : 0, clip.axis === "z" ? 1 : 0);
      // Three.js discards fragments on the plane's negative side.
      if (clip.keep === "below") n.negate();
      plane = plane ?? new Plane();
      plane.set(n, clip.keep === "below" ? clip.at : -clip.at);
      clipPlane.set(id, plane);
    }
    const tweak = (src: Material) => {
      let c = look.clones.get(src);
      if (!c) { c = src.clone(); c.userData.stateBase = { opacity: src.opacity }; look.clones.set(src, c); }
      const b = c.userData.stateBase as { opacity: number };
      c.opacity = b.opacity * opacity;
      const faded = opacity < 0.999;
      c.alphaHash = faded && mode === "dissolve" && !src.transparent;
      c.transparent = src.transparent || (faded && mode === "overlay");
      c.depthWrite = faded && mode === "overlay" ? false : src.depthWrite;
      c.clippingPlanes = clip && plane ? [plane] : null;
      c.needsUpdate = true;
      return c;
    };
    for (const r of look.meshes) r.mesh.material = Array.isArray(r.original) ? r.original.map(tweak) : tweak(r.original);
    look.active = true;
  };

  const apply = (frame: number) => {
    const f = evaluateAssetStateSequence(plan, frame, extent);
    const shown = new Map(f.variants.map((v) => [v.id, v]));
    const pair = f.method === "crossfade" && f.variants.length === 2 ? f.variants : null;
    const mode = !pair ? "dissolve" : options.crossfade && options.crossfade !== "auto" ? options.crossfade : sameShape(pair[0].id, pair[1].id) ? "overlay" : "dissolve";
    for (const [id, v] of variants) {
      const s = shown.get(id);
      if (!s) { v.group.visible = false; style(id, 1); continue; }
      // Overlay: the leaving build stays opaque under the arriving one.
      const opacity = pair && mode === "overlay" && id === pair[0].id ? 1 : s.opacity;
      v.group.visible = opacity > 0.001;
      style(id, opacity, s.clip, mode);
      v.group.renderOrder = pair && mode === "overlay" && id === pair[1].id ? 1 : 0;
      v.pose?.({ id: s.pose.action, frame: s.pose.frame });
    }
    return f;
  };
  apply(0);

  return {
    id: options.id, group: root, bounds: { min, max }, parts: first.parts, tier: first.tier, metersPerUnit: first.metersPerUnit,
    exposure: first.exposure, studio: first.studio, craft: { materials: first.craft.materials, details: [...first.craft.details, `${variants.size} supplied state builds`] },
    actions: [{ id: "sequence", label: "State sequence", durationFrames: Math.max(1, plan.durationFrames), loop: false, meaning: "Step through the supplied states with their declared transitions." }],
    plan, variants, variantParts: new Map([...variants].map(([id, v]) => [id, v.parts])),
    frameAt: (frame: number) => evaluateAssetStateSequence(plan, frame, extent),
    pose(state: HeroActionState) { apply(state.id === "sequence" ? state.frame : 0); },
    dispose() {
      for (const look of looks.values()) { for (const r of look.meshes) r.mesh.material = r.original; for (const c of look.clones.values()) c.dispose(); }
      for (const v of variants.values()) v.dispose();
    },
  };
}
