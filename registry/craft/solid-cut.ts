/** Real box-solid apertures using three-bvh-csg. This cuts the host volume,
 * rather than adding a fake dark opening to a decorative faceplate.
 *
 * Input is a compact, serializable construction recipe. Callers own any
 * supplied PBR material, animation rig, camera and renderer; this module owns
 * only generated geometry and its optional fallback material.
 */
import {
  BoxGeometry, CylinderGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from "three";
import type { Material } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

export type SolidCutFace = "front" | "back" | "top" | "bottom" | "left" | "right";
type Vec3 = readonly [number, number, number];

type AperturePlacement = {
  id: string;
  face: SolidCutFace;
  /** Center in face-relative normalized coordinates, -0.5 to +0.5. */
  at: readonly [number, number];
  /** Full thickness, or a blind recess of this depth in world units. */
  through?: boolean;
  depth?: number;
};

export type SolidCutAperture = AperturePlacement & (
  | { shape: "rectangle"; width: number; height: number }
  | { shape: "round"; radius: number }
);

export interface CraftSolidCutSpec {
  schemaVersion: 1;
  id: string;
  /** Dimensions of the centered, solid host box in world units. */
  body: { width: number; height: number; depth: number };
  apertures: readonly SolidCutAperture[];
  quality?: "hero" | "supporting";
}

export interface CraftSolidCutOptions {
  /** Caller-owned PBR/other Three.js material; never disposed or modified. */
  material?: Material;
}

type Axis = Vec3;
const basis: Record<SolidCutFace, { u: Axis; v: Axis; n: Axis }> = {
  front: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  back: { u: [-1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] },
  top: { u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
  bottom: { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] },
  left: { u: [0, 0, 1], v: [0, 1, 0], n: [-1, 0, 0] },
  right: { u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
};
const validId = (id: unknown): id is string => typeof id === "string" && !!id.trim() && id.length <= 96;
const finitePositive = (n: number) => Number.isFinite(n) && n > 0;
const validateUnit = (n: number) => Number.isFinite(n) && n >= -.5 && n <= .5;
const FACE_GAP = 0.0006;
const MAX_RESULT_VERTICES = 180_000;

function faceDimensions(spec: CraftSolidCutSpec, face: SolidCutFace): readonly [number, number, number] {
  const { width, height, depth } = spec.body;
  if (face === "front" || face === "back") return [width, height, depth];
  if (face === "top" || face === "bottom") return [width, depth, height];
  return [depth, height, width];
}

/** Reject impossible or unbounded cuts before allocating CSG geometries. */
export function validateCraftSolidCutSpec(spec: CraftSolidCutSpec): void {
  if (spec?.schemaVersion !== 1 || !validId(spec.id) || !spec.body ||
    ![spec.body.width, spec.body.height, spec.body.depth].every(n => finitePositive(n) && n <= 100))
    throw new Error("Solid cut requires schemaVersion 1, a safe ID and positive body dimensions <= 100.");
  if (!Array.isArray(spec.apertures) || spec.apertures.length === 0 || spec.apertures.length > 16)
    throw new Error("Solid cut needs 1–16 apertures; use distinct modules for larger structures.");
  if (spec.quality && !["hero", "supporting"].includes(spec.quality))
    throw new Error("Solid cut quality must be hero or supporting.");
  const ids = new Set<string>();
  for (const cut of spec.apertures) {
    if (!validId(cut?.id) || ids.has(cut.id))
      throw new Error("Solid cut aperture IDs must be nonempty and unique.");
    ids.add(cut.id);
    if (!Object.prototype.hasOwnProperty.call(basis, cut.face) || !Array.isArray(cut.at) || cut.at.length !== 2 || !cut.at.every(validateUnit))
      throw new Error(`Solid cut ${cut.id}: invalid face or normalized placement.`);
    const [faceW, faceH, thickness] = faceDimensions(spec, cut.face);
    if (cut.through !== undefined && typeof cut.through !== "boolean")
      throw new Error(`Solid cut ${cut.id}: through must be a boolean.`);
    if (cut.through) {
      if (cut.depth !== undefined) throw new Error(`Solid cut ${cut.id}: through cuts cannot also specify depth.`);
    } else if (!finitePositive(cut.depth!) || cut.depth! >= thickness - FACE_GAP * 2)
      throw new Error(`Solid cut ${cut.id}: a blind cut needs depth > 0 and less than the host thickness.`);
    let w: number, h: number;
    if (cut.shape === "rectangle") {
      if (!finitePositive(cut.width) || !finitePositive(cut.height))
        throw new Error(`Solid cut ${cut.id}: invalid rectangle dimensions.`);
      w = cut.width; h = cut.height;
    } else if (cut.shape === "round") {
      if (!finitePositive(cut.radius)) throw new Error(`Solid cut ${cut.id}: invalid radius.`);
      w = h = 2 * cut.radius;
    } else throw new Error(`Solid cut ${cut.id}: unsupported cut shape.`);
    if (Math.abs(cut.at[0] * faceW) + w / 2 >= faceW / 2 - FACE_GAP ||
      Math.abs(cut.at[1] * faceH) + h / 2 >= faceH / 2 - FACE_GAP)
      throw new Error(`Solid cut ${cut.id}: aperture must fit inside its ${cut.face} face with a solid border.`);
  }
}

/** One pose per aperture for optional glazing, gaskets, frames and callouts. */
export interface SolidCutAnchor {
  id: string;
  face: SolidCutFace;
  position: Vector3;
  normal: Vector3;
  rotation: Quaternion;
  extent: readonly [number, number];
}

export function createCraftSolidCuts(spec: CraftSolidCutSpec, options: CraftSolidCutOptions = {}) {
  validateCraftSolidCutSpec(spec);
  const ownMaterial = !options.material;
  const material = options.material ?? new MeshStandardMaterial({ color: "#687580", roughness: .7, metalness: .15 });
  const box = new BoxGeometry(spec.body.width, spec.body.height, spec.body.depth);
  let working: Brush = new Brush(box, material);
  working.updateMatrixWorld();
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  const anchors = new Map<string, SolidCutAnchor>();
  try {
    for (const aperture of spec.apertures) {
      const [faceW, faceH, thickness] = faceDimensions(spec, aperture.face);
      const { u, v, n } = basis[aperture.face];
      const tangent = new Vector3(...u), bitangent = new Vector3(...v), normal = new Vector3(...n);
      const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(tangent, bitangent, normal));
      const depth = aperture.through ? thickness + FACE_GAP * 2 : aperture.depth! + FACE_GAP;
      const faceCenter = normal.clone().multiplyScalar(thickness / 2)
        .addScaledVector(tangent, aperture.at[0] * faceW)
        .addScaledVector(bitangent, aperture.at[1] * faceH);
      const center = aperture.through
        ? faceCenter.clone().addScaledVector(normal, -thickness / 2)
        : faceCenter.clone().addScaledVector(normal, -(aperture.depth! - FACE_GAP) / 2);
      const geometry = aperture.shape === "rectangle"
        ? new BoxGeometry(aperture.width, aperture.height, depth)
        : new CylinderGeometry(aperture.radius, aperture.radius, depth,
          spec.quality === "supporting" ? 40 : 80, 1, false);
      if (aperture.shape === "round") geometry.rotateX(Math.PI / 2);
      const cutter = new Brush(geometry, material);
      cutter.position.copy(center); cutter.quaternion.copy(rotation); cutter.updateMatrixWorld();
      anchors.set(aperture.id, { id: aperture.id, face: aperture.face, position: faceCenter,
        normal, rotation, extent: aperture.shape === "rectangle"
          ? [aperture.width, aperture.height] : [aperture.radius * 2, aperture.radius * 2] });
      try {
        const next = evaluator.evaluate(working, cutter, SUBTRACTION);
        if (!next.geometry.getAttribute("position")?.count ||
          next.geometry.getAttribute("position").count > MAX_RESULT_VERTICES) {
          next.disposeCacheData(); next.geometry.dispose();
          throw new Error(`Solid cut ${aperture.id}: resulting geometry is empty or exceeds ${MAX_RESULT_VERTICES} vertices.`);
        }
        const old = working;
        working = next;
        old.disposeCacheData(); old.geometry.dispose();
      } finally {
        cutter.disposeCacheData(); cutter.geometry.dispose();
      }
    }
    const geometry = working.geometry;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++)
      if (![positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite))
        throw new Error("Solid cut produced nonfinite geometry; simplify the cuts or use another solid backend.");
    const mesh = new Mesh(geometry, material);
    mesh.name = spec.id;
    mesh.userData.partRole = "csg-cut-solid";
    mesh.userData.cutIds = [...anchors.keys()];
    mesh.castShadow = true; mesh.receiveShadow = true;
    working.disposeCacheData();
    let disposed = false;
    return { mesh, geometry, material, anchors, dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      if (ownMaterial) material.dispose();
    } };
  } catch (error) {
    working.disposeCacheData(); working.geometry.dispose();
    if (ownMaterial) material.dispose();
    throw error;
  }
}
