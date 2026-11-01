/** Camera-space detail selector for authored Three.js variant hierarchies.
 * Selection is pure in the current camera/transform, so reverse-seeking video
 * frames never depends on previous frames. Reuses the existing renderer and
 * semantic variants; does not manufacture, alter or own asset geometry.
 */
import { Group, Mesh, Vector3 } from "three";
import type { Material, Object3D } from "three";

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
  /** Optional full-width screen-space transition band around each threshold.
   * Uses alpha-hashed opaque mesh materials, not temporal accumulation.
   * Requires opaque MeshStandard/Physical materials in both variants.
   */
  transitionPixels?: number;
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
  if (spec.transitionPixels !== undefined &&
    (!Number.isFinite(spec.transitionPixels) || spec.transitionPixels <= 0 ||
      spec.transitionPixels >= Math.min(spec.supportingMinPixels * 2,
        spec.heroMinPixels - spec.supportingMinPixels)))
    throw new Error("LOD transitionPixels must be positive, finite and fit between both pixel thresholds.");
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
 * attached to one group; one tier renders normally, or two within an optional
 * alpha-hash transition band. `updateCamera` is called from Kumiki's
 * absolute-frame scene updater, not a new clock.
 */
export function createCraftDetailLOD(spec: CraftDetailLODSpec,
  variants: Record<CraftDetailLODLevel, Object3D>) {
  validateCraftDetailLOD(spec);
  const parts = [variants.hero, variants.supporting, variants.background];
  if (parts.some(part => !part?.isObject3D || !!part.parent) || new Set(parts).size !== 3)
    throw new Error("LOD variants must be three distinct, unparented Three.js objects.");
  // Alpha-hashed coverage works for opaque meshes with standard/physical PBR
  // shaders. Clone materials per variant so many placement clones can safely
  // share the original geometry and materials without opacity leaking across
  // objects. Preserve onBeforeCompile: Three.js Material.clone() omits it.
  const replacements: Array<{ mesh: Mesh; original: Material | Material[]; replacement: Material | Material[] }> = [];
  const ownedMaterials: Material[] = [];
  if (spec.transitionPixels !== undefined) {
    const sourceMeshes = parts.map(part => {
      const meshes: Mesh[] = [];
      part.traverse(object => {
        if (object instanceof Mesh) meshes.push(object);
        else if ((object as Object3D & { isLine?: boolean; isPoints?: boolean; isSprite?: boolean }).isLine ||
          (object as Object3D & { isPoints?: boolean }).isPoints ||
          (object as Object3D & { isSprite?: boolean }).isSprite)
          throw new Error("LOD alpha-hash transitions only support opaque PBR meshes, not lines, points or sprites.");
      });
      return meshes;
    });
    for (const meshes of sourceMeshes)
      for (const mesh of meshes)
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          if (!material || !("isMeshStandardMaterial" in material) ||
            material.transparent || material.alphaTest !== 0 || material.opacity !== 1)
            throw new Error("LOD alpha-hash transitions require opaque MeshStandard/Physical materials with opacity 1.");
    for (const meshes of sourceMeshes) {
      const clones = new Map<Material, Material>();
      const clone = (original: Material) => {
        let material = clones.get(original);
        if (!material) {
          material = original.clone();
          material.onBeforeCompile = original.onBeforeCompile;
          material.customProgramCacheKey = () => original.customProgramCacheKey();
          material.alphaHash = true;
          material.transparent = false;
          material.depthWrite = true;
          material.needsUpdate = true;
          clones.set(original, material);
          ownedMaterials.push(material);
        }
        return material;
      };
      for (const mesh of meshes) {
        const original = mesh.material;
        const replacement = Array.isArray(original) ? original.map(clone) : clone(original);
        mesh.material = replacement;
        replacements.push({ mesh, original, replacement });
      }
    }
  }
  const group = new Group();
  group.name = spec.id;
  group.userData.partRole = "camera-detail-lod";
  group.userData.levels = ["hero", "supporting", "background"];
  for (const part of parts) group.add(part);
  let current: CraftDetailLODLevel = "hero";
  const opacity = (part: Object3D, value: number) => {
    part.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        material.opacity = value;
    });
  };
  const activate = (level: CraftDetailLODLevel, transition?: {
    from: CraftDetailLODLevel; to: CraftDetailLODLevel; progress: number;
  }) => {
    for (const tier of ["hero", "supporting", "background"] as const) {
      const weight = !transition ? Number(tier === level) :
        tier === transition.from ? 1 - transition.progress :
          tier === transition.to ? transition.progress : 0;
      variants[tier].visible = weight > 0;
      if (spec.transitionPixels !== undefined) opacity(variants[tier], weight);
    }
    current = level;
  };
  activate("hero");
  let disposed = false;
  return { group, variants, get currentLevel() { return current; },
    /** No hysteresis: random/reverse frame seeking returns identical coverage. */
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
      let transition: { from: CraftDetailLODLevel; to: CraftDetailLODLevel; progress: number } | undefined;
      if (spec.transitionPixels !== undefined) {
        const halfWidth = spec.transitionPixels / 2;
        if (Math.abs(pixels - spec.heroMinPixels) < halfWidth)
          transition = { from: "supporting", to: "hero",
            progress: (pixels - spec.heroMinPixels + halfWidth) / spec.transitionPixels };
        else if (Math.abs(pixels - spec.supportingMinPixels) < halfWidth)
          transition = { from: "background", to: "supporting",
            progress: (pixels - spec.supportingMinPixels + halfWidth) / spec.transitionPixels };
      }
      activate(level, transition);
      return { level, projectedDiameterPixels: pixels, distance, transition };
    },
    /** Caller still owns geometries, materials and textures of every variant. */
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh, original, replacement } of replacements)
        if (mesh.material === replacement) mesh.material = original;
      for (const material of ownedMaterials) material.dispose();
      group.clear();
      group.removeFromParent();
    },
  };
}
