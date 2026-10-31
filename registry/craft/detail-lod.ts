/** Camera-space detail selector for authored Three.js variant hierarchies.
 * Selection is pure in the current camera/transform, so reverse-seeking video
 * frames never depends on previous frames. Reuses the existing renderer and
 * semantic variants; does not manufacture, alter or own asset geometry.
 */
import { Group, Vector3 } from "three";
import type { Object3D } from "three";

export type CraftDetailLODLevel = "hero" | "supporting" | "background";
type Vec3 = readonly [number, number, number];

export interface CraftDetailLODSpec {
  schemaVersion: 1;
  id: string;
  /** Local-space radius enclosing all three variants; physically measured. */
  radius: number;
  center?: Vec3;
  /** Pixel diameter above which the hero variant becomes visible. */
  heroMinPixels: number;
  /** Pixel diameter above which the supporting variant becomes visible. */
  supportingMinPixels: number;
}

export type CraftLODProjection =
  | { kind: "perspective"; fov: number }
  | { kind: "orthographic"; verticalSpan: number };

export interface CraftLODView {
  cameraPosition: Vec3;
  viewportHeight: number;
  projection: CraftLODProjection;
}

const vec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 &&
  v.every(value => Number.isFinite(value) && Math.abs(value) <= 100_000);

export function validateCraftDetailLOD(spec: CraftDetailLODSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() || spec.id.length > 96 ||
    !Number.isFinite(spec.radius) || spec.radius <= 0 || spec.radius > 10000 ||
    (spec.center !== undefined && !vec3(spec.center)))
    throw new Error("Camera detail LOD needs schemaVersion 1, id, finite radius and optional local center.");
  if (![spec.heroMinPixels, spec.supportingMinPixels].every(Number.isFinite) ||
    spec.supportingMinPixels < 1 || spec.heroMinPixels <= spec.supportingMinPixels || spec.heroMinPixels > 10000)
    throw new Error("LOD pixel thresholds need heroMinPixels > supportingMinPixels >= 1.");
}

export function validateCraftLODView(view: CraftLODView): void {
  if (!vec3(view?.cameraPosition) || !Number.isFinite(view.viewportHeight) ||
    view.viewportHeight < 1 || view.viewportHeight > 16384 ||
    (view.projection?.kind === "perspective"
      ? !Number.isFinite(view.projection.fov) || view.projection.fov < 1 || view.projection.fov > 140
      : view.projection?.kind === "orthographic"
        ? !Number.isFinite(view.projection.verticalSpan) || view.projection.verticalSpan <= 0
        : true))
    throw new Error("LOD view needs a finite camera pose, viewport height and valid projection.");
}

/** Pixel diameter of a bounding sphere's projected size. This is an estimate
 * of potential visual detail, not an occlusion/culling or mesh error metric.
 */
export function estimateCraftProjectedDiameter(radius: number, distance: number, view: CraftLODView): number {
  validateCraftLODView(view);
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(distance) || distance < 0)
    throw new Error("LOD projection requires positive radius and nonnegative camera distance.");
  if (view.projection.kind === "orthographic")
    return 2 * radius / view.projection.verticalSpan * view.viewportHeight;
  const focal = view.viewportHeight / (2 * Math.tan(view.projection.fov * Math.PI / 360));
  return 2 * radius / Math.max(distance, .0001) * focal;
}

/** Caller supplies three reviewable geometric/asset variants. All remain
 * attached to one group; only the selected tier is rendered. `updateCamera`
 * is called from Kumiki's absolute-frame scene updater, not a new clock.
 */
export function createCraftDetailLOD(spec: CraftDetailLODSpec,
  variants: Record<CraftDetailLODLevel, Object3D>) {
  validateCraftDetailLOD(spec);
  const parts = [variants.hero, variants.supporting, variants.background];
  if (parts.some(part => !part?.isObject3D || !!part.parent) || new Set(parts).size !== 3)
    throw new Error("LOD variants must be three distinct, unparented Three.js objects.");
  const group = new Group();
  group.name = spec.id;
  group.userData.partRole = "camera-detail-lod";
  group.userData.levels = ["hero", "supporting", "background"];
  for (const part of parts) group.add(part);
  let current: CraftDetailLODLevel = "hero";
  const activate = (level: CraftDetailLODLevel) => {
    variants.hero.visible = level === "hero";
    variants.supporting.visible = level === "supporting";
    variants.background.visible = level === "background";
    current = level;
  };
  activate("hero");
  let disposed = false;
  return { group, variants, get currentLevel() { return current; },
    /** No hysteresis by design: same view always chooses the same geometry. */
    updateCamera(view: CraftLODView) {
      if (disposed) throw new Error("Cannot update disposed camera detail LOD.");
      validateCraftLODView(view);
      group.updateWorldMatrix(true, false);
      const center = new Vector3(...(spec.center ?? [0, 0, 0])).applyMatrix4(group.matrixWorld);
      const scale = group.getWorldScale(new Vector3());
      const worldRadius = spec.radius * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
      const distance = center.distanceTo(new Vector3(...view.cameraPosition));
      const pixels = estimateCraftProjectedDiameter(worldRadius, distance, view);
      const level = pixels >= spec.heroMinPixels ? "hero"
        : pixels >= spec.supportingMinPixels ? "supporting" : "background";
      activate(level);
      return { level, projectedDiameterPixels: pixels, distance };
    },
    /** Caller still owns geometries, materials and textures of every variant. */
    dispose() {
      if (disposed) return;
      disposed = true;
      group.clear();
      group.removeFromParent();
    },
  };
}
