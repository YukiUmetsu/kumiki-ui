/** Three.js adapter: inspect a `HeroAsset` (or any named Object3D hierarchy) through `InspectableAsset`.
 *
 * Bounds are measured from the real meshes at each absolute frame after the
 * caller's deterministic pose function runs; anchors authored in rest world
 * space follow their part's motion (rest → current world transform), so a
 * label on a sliding sash or a spinning fan stays attached. Nothing here owns
 * a renderer or clock.
 */
import { Box3, Matrix3, Matrix4, Vector3 } from "three";
import type { Object3D } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import { createInspectableAsset } from "./inspectable-asset";
import type { InspectableAnchor, InspectableAsset, InspectableCapabilities, InspectablePart } from "./inspectable-asset";

export interface ThreeAnchorSpec extends InspectableAnchor {
  /** Position in rest world space (asset group frame). */
  position: readonly [number, number, number];
  normal?: readonly [number, number, number];
}
export interface InspectHeroOptions {
  /** Semantic metadata; defaults to every named part with no parent. */
  parts?: readonly InspectablePart[];
  anchors?: readonly ThreeAnchorSpec[];
  states?: readonly string[];
  capabilities?: Partial<InspectableCapabilities>;
  /** Deterministic pose for an absolute frame (e.g. a part rig or `asset.pose`). Defaults to rest. */
  poseAt?: (frame: number) => void;
  revision?: string;
}

/** Inspect a HeroAsset through the uniform interface. Existing HeroAsset implementations need no changes. */
export function inspectHeroAsset(hero: Pick<HeroAsset, "id" | "group" | "parts" | "metersPerUnit" | "actions">, options: InspectHeroOptions = {}): InspectableAsset {
  const objects = hero.parts;
  const parts: InspectablePart[] = options.parts ? [...options.parts] : [...objects.keys()].map(id => ({ id, hideable: true, ghostable: true }));
  for (const p of parts) if (!objects.has(p.id)) throw new Error(`Inspectable part "${p.id}" has no object in HeroAsset "${hero.id}". Name the object with res.name() or remove the part.`);
  const anchors = new Map((options.anchors ?? []).map(a => [a.id, a]));
  const restInverse = new Map<Object3D, Matrix4>();
  hero.group.updateMatrixWorld(true);
  const toGroup = (o: Object3D) => new Matrix4().copy(hero.group.matrixWorld).invert().multiply(o.matrixWorld);
  for (const a of anchors.values()) {
    const o = objects.get(a.partId);
    if (o && !restInverse.has(o)) restInverse.set(o, toGroup(o).invert());
  }
  const pose = (frame: number) => { options.poseAt?.(frame); hero.group.updateMatrixWorld(true); };
  const box = new Box3(), tmp = new Box3();
  const inverseGroup = new Matrix4();
  const def = {
    id: hero.id, dimension: 3 as const, metersPerUnit: hero.metersPerUnit, parts, anchors: [...anchors.values()].map(({ id, partId, kind, medium }) => ({ id, partId, kind, medium })),
    states: options.states ?? (hero.actions ?? []).map(a => a.id),
    capabilities: { sectioning: "isolate-ghost" as const, explodable: false, canGhost: true, flowPorts: [...anchors.values()].some(a => a.kind === "port"), stateful: !!(options.states ?? hero.actions ?? []).length, ...options.capabilities },
    revision: options.revision ?? `${hero.id}:${objects.size}`,
  };
  return createInspectableAsset(def, {
    bounds(partId, frame) {
      pose(frame);
      inverseGroup.copy(hero.group.matrixWorld).invert();
      box.makeEmpty();
      objects.get(partId)!.traverseVisible(child => {
        const mesh = child as Object3D & { geometry?: { boundingBox: Box3 | null; computeBoundingBox(): void } };
        if (!mesh.geometry) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        tmp.copy(mesh.geometry.boundingBox!).applyMatrix4(new Matrix4().multiplyMatrices(inverseGroup, child.matrixWorld));
        box.union(tmp);
      });
      if (box.isEmpty()) {
        const p = new Vector3().setFromMatrixPosition(toGroup(objects.get(partId)!));
        box.set(p.clone(), p.clone());
      }
      return { min: box.min.toArray(), max: box.max.toArray() };
    },
    anchor(anchorId, frame) {
      pose(frame);
      const a = anchors.get(anchorId)!, o = objects.get(a.partId)!;
      const motion = toGroup(o).multiply(restInverse.get(o)!);
      const position = new Vector3(...a.position).applyMatrix4(motion).toArray();
      const normal = a.normal ? new Vector3(...a.normal).applyMatrix3(new Matrix3().getNormalMatrix(motion)).normalize().toArray() : undefined;
      return { position, normal };
    },
  });
}
