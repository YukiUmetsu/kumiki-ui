/** Seeded, bounded 3D placement recipes. Reuses Three.js MeshSurfaceSampler;
 * no renderer, clock, media/network asset or duplicated geometry generator.
 * Positions are world-space, measured at authored frame zero and stable when
 * the video camera seeks arbitrarily. Materials and source meshes stay owned
 * by their callers.
 */
import {
  InstancedMesh, Matrix3, Matrix4, Mesh, Quaternion, Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

export type CraftScatterVec3 = readonly [number, number, number];

type ScatterBase = {
  schemaVersion: 1;
  id: string;
  seed: number;
  count: number;
  /** World-space minimum separation between origins; 0 allows overlaps. */
  minDistance?: number;
  /** Uniform scale variation, one value per instance. */
  scale?: readonly [number, number];
  /** Seeded rotation about the oriented instance's local +Y axis. */
  randomYaw?: boolean;
};

export type CraftScatterSpec = ScatterBase & (
  | { mode: "surface"; surfaceNormal?: boolean; normalOffset?: number;
    minUpDot?: number; weightAttribute?: string }
  | { mode: "volume"; min: CraftScatterVec3; max: CraftScatterVec3 }
  | { mode: "path"; points: readonly CraftScatterVec3[];
    /** Fractional in-segment variation, between 0 and 0.9. */
    jitter?: number; tangentFacing?: boolean }
);

export interface CraftPlacement {
  id: string;
  position: Vector3;
  normal: Vector3;
  rotation: Quaternion;
  scale: number;
  matrix: Matrix4;
}

const finiteVec = (v: unknown): v is CraftScatterVec3 =>
  Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) <= 1e5);
const validId = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 96;
const up = new Vector3(0, 1, 0);
const forward = new Vector3(0, 0, 1);

/** Validate user recipes before costly surface traversal or mesh allocation. */
export function validateCraftScatterSpec(spec: CraftScatterSpec): void {
  if (spec?.schemaVersion !== 1 || !validId(spec.id) || !Number.isSafeInteger(spec.seed) ||
    !Number.isInteger(spec.count) || spec.count < 1 || spec.count > 2500)
    throw new Error("Scatter requires schemaVersion 1, id, integer seed and count 1–2500.");
  if (spec.minDistance !== undefined && (!Number.isFinite(spec.minDistance) || spec.minDistance < 0 || spec.minDistance > 1e4))
    throw new Error("Scatter minDistance must be finite within 0–10000.");
  if (spec.scale && (!Array.isArray(spec.scale) || spec.scale.length !== 2 ||
    !spec.scale.every(n => Number.isFinite(n) && n > 0 && n <= 100) || spec.scale[0] > spec.scale[1]))
    throw new Error("Scatter scale must be [min,max] with 0 < min <= max <= 100.");
  if (spec.randomYaw !== undefined && typeof spec.randomYaw !== "boolean")
    throw new Error("Scatter randomYaw must be boolean.");
  if (spec.mode === "surface") {
    if (spec.normalOffset !== undefined && (!Number.isFinite(spec.normalOffset) || Math.abs(spec.normalOffset) > 100))
      throw new Error("Surface normalOffset must be within ±100 world units.");
    if (spec.minUpDot !== undefined && (!Number.isFinite(spec.minUpDot) || spec.minUpDot < -1 || spec.minUpDot > 1))
      throw new Error("Surface minUpDot must be between -1 and +1.");
    if (spec.weightAttribute !== undefined && (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(spec.weightAttribute)))
      throw new Error("Surface weightAttribute needs an existing safe vertex-attribute name.");
  } else if (spec.mode === "volume") {
    if (!finiteVec(spec.min) || !finiteVec(spec.max) || spec.min.some((v, i) => v >= spec.max[i]))
      throw new Error("Volume requires finite min/max bounds with positive size in all axes.");
  } else if (spec.mode === "path") {
    if (!Array.isArray(spec.points) || spec.points.length < 2 || spec.points.length > 1000 || !spec.points.every(finiteVec))
      throw new Error("Path requires 2–1000 finite 3D control points.");
    if (spec.jitter !== undefined && (!Number.isFinite(spec.jitter) || spec.jitter < 0 || spec.jitter > .9))
      throw new Error("Path jitter must be 0–0.9.");
    let length = 0;
    for (let i = 1; i < spec.points.length; i++)
      length += new Vector3(...spec.points[i]).distanceTo(new Vector3(...spec.points[i - 1]));
    if (length <= 1e-8) throw new Error("Path needs a nonzero total length.");
  } else throw new Error("Scatter mode must be surface, volume or path.");
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Candidate { position: Vector3; normal: Vector3; tangent: Vector3 }

/** `surface` requires a source Mesh; all other modes must omit it. */
export function createCraftScatter(spec: CraftScatterSpec, surface?: Mesh): CraftPlacement[] {
  validateCraftScatterSpec(spec);
  if (spec.mode === "surface" ? !surface : !!surface)
    throw new Error("A source mesh is required only for surface scattering.");
  const random = seeded(spec.seed);
  let sampler: MeshSurfaceSampler | undefined;
  let surfaceNormalMatrix: Matrix3 | undefined;
  if (spec.mode === "surface") {
    const geometry = surface!.geometry;
    const position = geometry.getAttribute("position");
    const count = position?.count ?? 0;
    if (count < 3 || count > 1_500_000 || (geometry.index && geometry.index.count % 3 !== 0) || (!geometry.index && count % 3 !== 0))
      throw new Error("Scatter source must be a bounded triangle geometry with position data.");
    for (let index = 0; index < count; index++) {
      if (![position.getX(index), position.getY(index), position.getZ(index)].every(Number.isFinite))
        throw new Error("Scatter source contains nonfinite vertex coordinates.");
    }
    if (spec.weightAttribute && !geometry.getAttribute(spec.weightAttribute))
      throw new Error(`Scatter weightAttribute ${spec.weightAttribute} is not present on source geometry.`);
    if (spec.weightAttribute) {
      const weights = geometry.getAttribute(spec.weightAttribute);
      if (weights.count !== count) throw new Error("Scatter weight attribute must cover every surface vertex.");
      for (let index = 0; index < count; index++)
        if (!Number.isFinite(weights.getX(index)) || weights.getX(index) < 0)
          throw new Error("Scatter weights must be finite and nonnegative.");
    }
    surface!.updateWorldMatrix(true, false);
    surfaceNormalMatrix = new Matrix3().getNormalMatrix(surface!.matrixWorld);
    // The installed Three.js runtime exposes setRandomGenerator, but its
    // corresponding @types/three declaration omitted that one fluent setter.
    const seededSampler = new MeshSurfaceSampler(surface!) as MeshSurfaceSampler & {
      setRandomGenerator(fn: () => number): MeshSurfaceSampler;
    };
    seededSampler.setRandomGenerator(random);
    if (spec.weightAttribute) seededSampler.setWeightAttribute(spec.weightAttribute);
    sampler = seededSampler.build();
    const distribution = sampler.distribution;
    if (!distribution?.length || !Number.isFinite(distribution[distribution.length - 1]) || distribution[distribution.length - 1] <= 0)
      throw new Error("Scatter source has no positive weighted surface area.");
  }
  const path = spec.mode === "path" ? spec.points.map(point => new Vector3(...point))
    .filter((point, index, all) => index === 0 || point.distanceTo(all[index - 1]) > 1e-8) : undefined;
  const pathLengths = path?.map((_, index) => index === 0 ? 0 : path[index].distanceTo(path[index - 1]));
  const totalPath = pathLengths?.reduce((sum, n) => sum + n, 0) ?? 0;
  const minDistance = spec.minDistance ?? 0;
  const cells = new Map<string, Vector3[]>();
  const cellFor = (p: Vector3) => [Math.floor(p.x / minDistance), Math.floor(p.y / minDistance), Math.floor(p.z / minDistance)] as const;
  function free(p: Vector3): boolean {
    if (minDistance <= 0) return true;
    const [x, y, z] = cellFor(p);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
      for (const prior of cells.get(`${x + dx}/${y + dy}/${z + dz}`) ?? [])
        if (prior.distanceToSquared(p) < minDistance * minDistance) return false;
    return true;
  }
  function occupy(p: Vector3) {
    if (minDistance <= 0) return;
    const key = cellFor(p).join("/");
    const bucket = cells.get(key) ?? [];
    bucket.push(p); cells.set(key, bucket);
  }
  const result: CraftPlacement[] = [];
  let attempts = 0;
  const limit = spec.mode === "path" ? spec.count : spec.count * 48;
  while (result.length < spec.count && attempts < limit) {
    const candidateIndex = attempts++;
    let candidate: Candidate;
    if (spec.mode === "surface") {
      const position = new Vector3(), normal = new Vector3();
      sampler!.sample(position, normal);
      position.applyMatrix4(surface!.matrixWorld);
      normal.applyMatrix3(surfaceNormalMatrix!).normalize();
      if (normal.y < (spec.minUpDot ?? -1)) continue;
      position.addScaledVector(normal, spec.normalOffset ?? 0);
      candidate = { position, normal, tangent: forward };
    } else if (spec.mode === "volume") {
      candidate = { position: new Vector3(
        spec.min[0] + random() * (spec.max[0] - spec.min[0]),
        spec.min[1] + random() * (spec.max[1] - spec.min[1]),
        spec.min[2] + random() * (spec.max[2] - spec.min[2])),
      normal: up, tangent: forward };
    } else {
      const normalized = Math.max(0, Math.min(1, (candidateIndex + .5 + (random() - .5) * (spec.jitter ?? 0)) / spec.count));
      const distance = totalPath * normalized;
      let covered = 0, segment = 1;
      while (segment < path!.length - 1 && covered + pathLengths![segment] < distance) covered += pathLengths![segment++];
      const delta = new Vector3().subVectors(path![segment], path![segment - 1]);
      const factor = Math.max(0, Math.min(1, (distance - covered) / Math.max(1e-9, pathLengths![segment])));
      candidate = { position: path![segment - 1].clone().addScaledVector(delta, factor), normal: up, tangent: delta.normalize() };
    }
    if (!free(candidate.position)) continue;
    occupy(candidate.position);
    const yaw = spec.randomYaw ? random() * Math.PI * 2 : 0;
    const base = (spec.mode === "surface" && spec.surfaceNormal)
      ? new Quaternion().setFromUnitVectors(up, candidate.normal)
      : (spec.mode === "path" && spec.tangentFacing)
        ? new Quaternion().setFromUnitVectors(forward, candidate.tangent) : new Quaternion();
    const rotation = base.multiply(new Quaternion().setFromAxisAngle(up, yaw));
    const scale = spec.scale ? spec.scale[0] + random() * (spec.scale[1] - spec.scale[0]) : 1;
    const matrix = new Matrix4().compose(candidate.position, rotation, new Vector3(scale, scale, scale));
    result.push({ id: `${spec.id}-${String(result.length).padStart(4, "0")}`,
      position: candidate.position, normal: candidate.normal.clone(), rotation, scale, matrix });
  }
  if (result.length !== spec.count)
    throw new Error(`Scatter placed only ${result.length}/${spec.count} objects under minDistance/normal constraints after ${attempts} attempts. Reduce density or relax the constraints.`);
  return result;
}

/** One draw call for repeated objects. The supplied geometry/material stay caller-owned. */
export function createCraftScatterInstances(placements: readonly CraftPlacement[], geometry: BufferGeometry, material: Material) {
  if (!placements.length || placements.length > 2500) throw new Error("Instances need 1–2500 placements.");
  const mesh = new InstancedMesh(geometry, material, placements.length);
  for (let index = 0; index < placements.length; index++) mesh.setMatrixAt(index, placements[index].matrix);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = `scatter-${placements[0].id}`;
  mesh.userData.partRole = "seeded-scatter";
  mesh.userData.placementIds = placements.map(placement => placement.id);
  mesh.computeBoundingSphere();
  let disposed = false;
  return { mesh, dispose() { if (disposed) return; disposed = true; mesh.dispose(); } };
}
