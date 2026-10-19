/** Deterministic auto-rigging for sculpted meshes.
 *
 * Bones are authored as rest-pose segments (usually the same anatomical
 * chains used to sculpt the SDF). Skin weights come from a Gaussian falloff of
 * each vertex's distance to each bone segment, normalized relative to the
 * closest bone (log-space, so far vertices never underflow to zero), smoothed
 * across mesh edges and truncated to the 4 strongest influences.
 *
 * Rest rotations are identity, so pose rotations are expressed in world axes:
 * with +X forward and +Y up, rotating about +Z swings a downward limb forward.
 */
import { Bone, BufferAttribute, Skeleton, SkinnedMesh, Vector3 } from "three";
import type { BufferGeometry, Material, Object3D } from "three";
import type { Vec3 } from "./sdf-sculpt";

export interface RigBoneSpec {
  name: string;
  parent?: string;
  /** Joint (pivot) position in rest pose. */
  head: Vec3;
  /** End of the segment; used only for skin weights. */
  tail: Vec3;
  /** Influence radius: vertices within ~radius of the segment follow this bone. */
  radius: number;
}

export interface AutoRig {
  mesh: SkinnedMesh;
  bones: ReadonlyMap<string, Bone>;
  /** Reset every bone to rest. */
  reset(): void;
  /** Rotate a bone (XYZ Euler radians, world-aligned at rest) and optionally offset it. */
  set(name: string, rotation: Vec3, offset?: Vec3): void;
  /** Re-parent an object (eye, prop) to a bone, keeping its world transform. */
  attach(name: string, object: Object3D): void;
}

function segmentDistance(p: Vector3, a: Vector3, ab: Vector3, abLen2: number): number {
  const t = abLen2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y + (p.z - a.z) * ab.z) / abLen2)) : 0;
  const x = a.x + ab.x * t - p.x, y = a.y + ab.y * t - p.y, z = a.z + ab.z * t - p.z;
  return Math.sqrt(x * x + y * y + z * z);
}

/** Compute skin weights and wrap the geometry in a SkinnedMesh bound to a fresh skeleton. */
export function createAutoRig(geometry: BufferGeometry, material: Material, specs: readonly RigBoneSpec[],
  options: { smoothing?: number; sharpness?: number } = {}): AutoRig {
  if (!specs.length) throw new Error("Auto-rig needs at least one bone.");
  const names = new Set<string>();
  for (const spec of specs) {
    if (names.has(spec.name)) throw new Error(`Duplicate rig bone "${spec.name}".`);
    if (spec.parent && !names.has(spec.parent)) throw new Error(`Rig bone "${spec.name}" must come after its parent "${spec.parent}".`);
    if (!(spec.radius > 0)) throw new Error(`Rig bone "${spec.name}" needs a positive radius.`);
    names.add(spec.name);
  }
  const position = geometry.attributes.position as BufferAttribute;
  const count = position.count, n = specs.length;
  const heads = specs.map(s => new Vector3(...s.head)), tails = specs.map(s => new Vector3(...s.tail));
  const axes = specs.map((_, i) => tails[i].clone().sub(heads[i]));
  const len2 = axes.map(v => v.lengthSq());
  const sharp = options.sharpness ?? 2.2;
  // Dense weights (vertices × bones) before smoothing.
  let weights = new Float32Array(count * n);
  const p = new Vector3(), score = new Float64Array(n);
  for (let v = 0; v < count; v++) {
    p.fromBufferAttribute(position, v);
    let best = Infinity;
    for (let b = 0; b < n; b++) {
      const q = segmentDistance(p, heads[b], axes[b], len2[b]) / specs[b].radius;
      score[b] = q * q * sharp;
      best = Math.min(best, score[b]);
    }
    let sum = 0;
    for (let b = 0; b < n; b++) { const w = Math.exp(-(score[b] - best)); weights[v * n + b] = w; sum += w; }
    for (let b = 0; b < n; b++) weights[v * n + b] /= sum;
  }
  // Laplacian smoothing over mesh edges softens seams between influences.
  const index = geometry.index;
  const iterations = options.smoothing ?? 2;
  if (index && iterations > 0) {
    const neighbors: number[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      neighbors[a].push(b, c); neighbors[b].push(a, c); neighbors[c].push(a, b);
    }
    for (let it = 0; it < iterations; it++) {
      const next = new Float32Array(weights.length);
      for (let v = 0; v < count; v++) {
        const list = neighbors[v], k = 1 / (list.length + 1);
        for (let b = 0; b < n; b++) {
          let s = weights[v * n + b];
          for (const u of list) s += weights[u * n + b];
          next[v * n + b] = s * k;
        }
      }
      weights = next;
    }
  }
  // Keep the four strongest influences per vertex.
  const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let v = 0; v < count; v++) {
    order.sort((a, b) => weights[v * n + b] - weights[v * n + a]);
    let sum = 0;
    for (let k = 0; k < 4 && k < n; k++) sum += weights[v * n + order[k]];
    for (let k = 0; k < 4; k++) {
      const b = k < n ? order[k] : 0;
      skinIndex[v * 4 + k] = b;
      skinWeight[v * 4 + k] = k < n && sum > 0 ? weights[v * n + b] / sum : k === 0 ? 1 : 0;
    }
  }
  geometry.setAttribute("skinIndex", new BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new BufferAttribute(skinWeight, 4));

  // Skeleton: bone positions are relative to the parent's joint.
  const bones = new Map<string, Bone>();
  const rest = new Map<string, Vector3>();
  const roots: Bone[] = [];
  specs.forEach((spec, i) => {
    const bone = new Bone();
    bone.name = spec.name;
    const parent = spec.parent ? specs.find(s => s.name === spec.parent)! : undefined;
    const local = heads[i].clone().sub(parent ? new Vector3(...parent.head) : new Vector3());
    bone.position.copy(local);
    rest.set(spec.name, local.clone());
    if (spec.parent) bones.get(spec.parent)!.add(bone); else roots.push(bone);
    bones.set(spec.name, bone);
  });
  const mesh = new SkinnedMesh(geometry, material);
  for (const root of roots) mesh.add(root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new Skeleton([...bones.values()]));
  mesh.frustumCulled = false;
  return {
    mesh, bones,
    reset() {
      for (const [name, bone] of bones) { bone.quaternion.identity(); bone.position.copy(rest.get(name)!); }
    },
    set(name, rotation, offset) {
      const bone = bones.get(name);
      if (!bone) throw new Error(`Unknown rig bone "${name}".`);
      bone.rotation.set(rotation[0], rotation[1], rotation[2]);
      const base = rest.get(name)!;
      bone.position.set(base.x + (offset?.[0] ?? 0), base.y + (offset?.[1] ?? 0), base.z + (offset?.[2] ?? 0));
    },
    attach(name, object) {
      const bone = bones.get(name);
      if (!bone) throw new Error(`Unknown rig bone "${name}".`);
      mesh.updateMatrixWorld(true);
      bone.attach(object);
    },
  };
}
