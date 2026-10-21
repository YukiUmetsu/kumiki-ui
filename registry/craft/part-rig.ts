/** Separately animatable parts for any named Three.js hierarchy.
 *
 * `createPartRig(parts)` poses semantic parts (a `HeroAsset.parts` map or
 * any `Map<string, Object3D>`) without hidden state. Create it while the
 * asset is at rest; every `apply` first
 * restores each touched part to its rest transform and materials, optionally
 * runs a base pose (e.g. the asset's own action), then layers the requested
 * poses on top. The same inputs always produce the same scene, so frames can
 * be rendered in any order.
 *
 * Opacity clones a part's materials on first use (the shared originals are
 * never mutated) and restores them on reset; `dispose()` frees the clones.
 */
import { Euler, Quaternion, Vector3 } from "three";
import type { Material, Mesh, Object3D } from "three";

export type Vec3Tuple = readonly [number, number, number];

export interface PartPose3D {
  /** Offset in the part's parent space, after rotation. */
  translate?: Vec3Tuple;
  /** XYZ Euler degrees about `pivot`, composed onto the current orientation. */
  rotate?: Vec3Tuple;
  /** Pivot in parent space; defaults to the part's current origin. */
  pivot?: Vec3Tuple;
  /** Uniform or per-axis scale multiplier (about the part origin). */
  scale?: number | Vec3Tuple;
  /** 0–1 multiplier on material opacity (clones materials on demand). */
  opacity?: number;
  visible?: boolean;
}
export type PartPoses = Readonly<Record<string, PartPose3D | undefined>>;

interface Rest { position: Vector3; quaternion: Quaternion; scale: Vector3; visible: boolean }
interface MeshOriginal { material: Material | Material[]; base: Array<{ opacity: number; transparent: boolean; depthWrite: boolean }> }

export interface PartRig {
  readonly ids: readonly string[];
  /** Restore every part this rig has touched to rest (transform, visibility, materials). */
  reset(): void;
  /** Reset → optional `base()` → apply `poses` on top. Unknown part IDs throw. */
  apply(poses: PartPoses, base?: () => void): void;
  dispose(): void;
}

/** Snapshot transforms (not visibility) so pose functions stay pure. */
export function captureTransforms(objects: readonly Object3D[]) {
  const snaps = new Map(objects.map(o => [o, { position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone() }]));
  return {
    restore() { for (const [o, s] of snaps) { o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.scale.copy(s.scale); } },
    of(object: Object3D) {
      const s = snaps.get(object);
      if (!s) throw new Error(`Object "${object.name}" has no captured rest transform.`);
      return s;
    },
  };
}

export function createPartRig(parts: ReadonlyMap<string, Object3D>): PartRig {
  const rest = new Map<Object3D, Rest>();
  const originals = new Map<Mesh, MeshOriginal>();
  const clones = new Map<Mesh, Material[]>();
  const ids = [...parts.keys()];
  const euler = new Euler(), rotation = new Quaternion(), offset = new Vector3(), pivot = new Vector3();

  const remember = (o: Object3D) => {
    if (!rest.has(o)) rest.set(o, { position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone(), visible: o.visible });
  };
  // Capture every part at creation (the rest pose), never mid-action.
  for (const o of parts.values()) remember(o);
  const reset = () => {
    for (const [o, r] of rest) { o.position.copy(r.position); o.quaternion.copy(r.quaternion); o.scale.copy(r.scale); o.visible = r.visible; }
    for (const [mesh, original] of originals) mesh.material = original.material;
  };
  /** Nested faded parts multiply: a ghosted wall with a faded siding layer stays consistent. */
  const applyFades = (fades: Map<Mesh, number>) => {
    for (const [mesh, k] of fades) {
      let original = originals.get(mesh);
      if (!original) {
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        original = { material: mesh.material, base: list.map(m => ({ opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite })) };
        originals.set(mesh, original);
      }
      let list = clones.get(mesh);
      if (!list) { list = (Array.isArray(original.material) ? original.material : [original.material]).map(m => m.clone()); clones.set(mesh, list); }
      list.forEach((clone, i) => {
        const b = original!.base[i], opacity = b.opacity * k;
        clone.opacity = opacity;
        clone.transparent = b.transparent || opacity < .999;
        clone.depthWrite = opacity < .999 ? false : b.depthWrite;
      });
      mesh.material = Array.isArray(original.material) ? list : list[0];
    }
  };

  return {
    ids,
    reset,
    apply(poses, base) {
      reset();
      base?.();
      const fades = new Map<Mesh, number>();
      for (const [id, pose] of Object.entries(poses)) {
        if (!pose) continue;
        const o = parts.get(id);
        if (!o) throw new Error(`Unknown part "${id}". Available parts include: ${ids.slice(0, 12).join(", ")}${ids.length > 12 ? ", …" : ""}.`);
        remember(o);
        if (pose.rotate) {
          if (!pose.rotate.every(Number.isFinite)) throw new Error(`Part "${id}" rotate must be finite degrees.`);
          rotation.setFromEuler(euler.set(...pose.rotate.map(d => d * Math.PI / 180) as [number, number, number]));
          pivot.set(...(pose.pivot ?? o.position.toArray() as [number, number, number]));
          offset.copy(o.position).sub(pivot).applyQuaternion(rotation);
          o.position.copy(pivot).add(offset);
          o.quaternion.premultiply(rotation);
        }
        if (pose.translate) {
          if (!pose.translate.every(Number.isFinite)) throw new Error(`Part "${id}" translate must be finite.`);
          o.position.x += pose.translate[0]; o.position.y += pose.translate[1]; o.position.z += pose.translate[2];
        }
        if (pose.scale !== undefined) {
          const s = typeof pose.scale === "number" ? [pose.scale, pose.scale, pose.scale] : pose.scale;
          if (!s.every(v => Number.isFinite(v) && v > 0)) throw new Error(`Part "${id}" scale must be positive.`);
          o.scale.set(o.scale.x * s[0], o.scale.y * s[1], o.scale.z * s[2]);
        }
        if (pose.visible !== undefined) o.visible = pose.visible;
        if (pose.opacity !== undefined) {
          if (!Number.isFinite(pose.opacity) || pose.opacity < 0 || pose.opacity > 1) throw new Error(`Part "${id}" opacity must be 0–1.`);
          if (pose.opacity <= .001) o.visible = false;
          else o.traverse(child => { const mesh = child as Mesh; if (mesh.isMesh) fades.set(mesh, (fades.get(mesh) ?? 1) * pose.opacity!); });
        }
      }
      applyFades(fades);
    },
    dispose() {
      reset();
      for (const list of clones.values()) list.forEach(c => c.dispose());
      clones.clear(); originals.clear(); rest.clear();
    },
  };
}
