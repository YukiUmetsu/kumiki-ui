/**
 * PM1 adapter: apply analytic physical trajectories to existing Three.js nodes.
 * No physics world, frame history, reparenting, or renderer ownership. Works on
 * imported glTF clips, authored HeroAssets, and sibling meshes sharing a hinge.
 */
import { Box3, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import type { HeroAsset } from "./hero-asset";
import type { HeroActionSpec, HeroActionState } from "./hero-action";
import {
  impactEventsForPhysicalAction, samplePhysicalMotion, validatePhysicalActionSpecs, type PhysicalActionSpec,
  type PhysicalImpactEvent, type PhysicalMotion, type PhysicalPivot, type PhysicalVec3,
} from "../motion/physical-motion";

type Transform = { position: Vector3; quaternion: Quaternion; scale: Vector3 };
type ResolvedTrack = { motion: PhysicalMotion; nodes: readonly Object3D[]; pivotNode?: Object3D };
type PreparedAction = { spec: PhysicalActionSpec; tracks: ResolvedTrack[] };
export type PhysicalHeroAsset<T extends HeroAsset = HeroAsset> = T & Required<Pick<HeroAsset, "actions" | "pose">>;

function snapshot(node: Object3D): Transform {
  return { position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() };
}
function restore(node: Object3D, state: Transform) {
  node.position.copy(state.position); node.quaternion.copy(state.quaternion); node.scale.copy(state.scale);
  node.updateMatrix();
}
function worldDisplacement(node: Object3D, offset: PhysicalVec3) {
  if (!node.parent) { node.position.add(new Vector3(...offset)); return; }
  node.parent.updateWorldMatrix(true, false);
  const inv = node.parent.matrixWorld.clone().invert();
  const origin = new Vector3().applyMatrix4(inv);
  node.position.add(new Vector3(...offset).applyMatrix4(inv).sub(origin));
}
function anchorWorld(pivot: PhysicalPivot | undefined, node: Object3D | undefined): Vector3 | null {
  if (Array.isArray(pivot)) return new Vector3(...pivot);
  if (!node) return null;
  node.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(node, true);
  return bounds.isEmpty() ? node.getWorldPosition(new Vector3()) : bounds.getCenter(new Vector3());
}

/** Rotate sibling Blender parts as one rigid assembly around a shared world hinge. */
function rotateAboutWorldPivot(node: Object3D, axis: PhysicalVec3, angle: number, pivot: Vector3) {
  node.updateWorldMatrix(true, false);
  const rotate = new Quaternion().setFromAxisAngle(new Vector3(...axis), angle);
  const newPosition = node.getWorldPosition(new Vector3()).sub(pivot).applyQuaternion(rotate).add(pivot);
  const worldQuaternion = node.getWorldQuaternion(new Quaternion()).premultiply(rotate);
  if (node.parent) {
    node.position.copy(node.parent.worldToLocal(newPosition));
    node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(worldQuaternion));
  } else { node.position.copy(newPosition); node.quaternion.copy(worldQuaternion); }
  node.updateMatrixWorld(true);
}

/** No-slip roll around the world-space contact tangent, even under a rotated GLB parent. */
function rotateRollingBody(node: Object3D, direction: PhysicalVec3, angle: number) {
  node.updateWorldMatrix(true, false);
  // For a Y-up floor, omega is travel-direction × up. At the bottom contact
  // point omega × (-radius * up) then matches the requested travel velocity.
  const rollAxis = new Vector3(...direction).cross(new Vector3(0, 1, 0)).normalize();
  const world = new Quaternion().setFromAxisAngle(rollAxis, angle)
    .multiply(node.getWorldQuaternion(new Quaternion()));
  if (node.parent) node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
  else node.quaternion.copy(world);
  node.updateMatrixWorld(true);
}

/**
 * Add physically grounded, frame-addressed actions to a HeroAsset. Part names
 * and semantic roles are resolved once; pivot anchors are evaluated after the
 * imported clip on every frame to respect Blender-authored joint movement.
 */
export function createPhysicalHeroMotion<T extends HeroAsset>(
  hero: T, plans: readonly PhysicalActionSpec[], resolve: (idOrRole: string) => readonly Object3D[],
): { asset: PhysicalHeroAsset<T>; events: (id: string, fps?: number) => readonly PhysicalImpactEvent[] } {
  const validated = validatePhysicalActionSpecs(plans);
  const previousActions = hero.actions ?? [];
  const ids = new Set(previousActions.map(a => a.id));
  const influenced = new Set<Object3D>();
  const prepared: PreparedAction[] = validated.map(spec => {
    if (ids.has(spec.id)) throw new Error(`Physical action "${spec.id}" conflicts with an existing glTF action.`);
    ids.add(spec.id);
    if (spec.sourceActionId && !previousActions.some(a => a.id === spec.sourceActionId))
      throw new Error(`Physical action "${spec.id}" refers to unknown glTF sourceActionId "${spec.sourceActionId}".`);
    const tracks = spec.motions.map(motion => {
      const refs = typeof motion.target === "string" ? [motion.target] : motion.target;
      const nodes = [...new Set(refs.flatMap(ref => {
        const found = resolve(ref);
        if (!found.length) throw new Error(`Physical action "${spec.id}" references unknown Blender part/role "${ref}".`);
        return found;
      }))];
      const selected = new Set(nodes);
      for (const node of nodes) {
        for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
          if (selected.has(ancestor)) throw new Error(`Physical track "${spec.id}" selects both an ancestor and descendant; bind the assembly root instead.`);
        }
      }
      for (const node of nodes) influenced.add(node);
      const pivot = (motion.kind === "pendulum" || motion.kind === "spin") ? motion.pivot : undefined;
      const pivotParts = typeof pivot === "string" ? resolve(pivot) : [];
      if (typeof pivot === "string" && pivotParts.length !== 1)
        throw new Error(`Physical hinge "${pivot}" must resolve to exactly one Blender node.`);
      return { motion, nodes, pivotNode: pivotParts[0] };
    });
    return { spec, tracks };
  });
  const authoredPose = hero.pose?.bind(hero);
  const authoredDispose = hero.dispose.bind(hero);
  let previousBaseline = new Map<Object3D, Transform>();
  const actionSpecs: HeroActionSpec[] = validated.map(plan => ({ id: plan.id, label: plan.label ?? plan.id,
    durationFrames: plan.durationFrames, loop: false,
    meaning: "Physically grounded, deterministic motion: gravity, mass, damping, inertia or hinge constraints.",
  }));

  const asset: PhysicalHeroAsset<T> = {
    ...hero, actions: [...previousActions, ...actionSpecs],
    pose(state: HeroActionState) {
      for (const [node, base] of previousBaseline) restore(node, base);
      const active = prepared.find(action => action.spec.id === state.id);
      const fps = state.fps ?? 30;
      if (active && (!Number.isFinite(state.frame) || !Number.isFinite(fps) || fps <= 0 || fps > 240))
        throw new Error("Physical hero action requires finite frame and fps in (0, 240].");
      const frame = active ? Math.min(active.spec.durationFrames * fps / 30, Math.max(0, state.frame)) : state.frame;
      const originalId = active ? active.spec.sourceActionId ?? null : state.id;
      authoredPose?.({ ...state, id: originalId, frame });
      previousBaseline = new Map([...influenced].map(node => [node, snapshot(node)]));
      if (!active) return;
      const time = frame / fps;
      // Capture all hinges before deforming any part. Sibling meshes can then
      // swing about one attachment without introducing parent/child drift.
      const pivots = active.tracks.map(track => anchorWorld(
        track.motion.kind === "pendulum" || track.motion.kind === "spin" ? track.motion.pivot : undefined, track.pivotNode));
      for (const [index, track] of active.tracks.entries()) {
        const sample = samplePhysicalMotion(track.motion, time), { motion, nodes } = track;
        for (const node of nodes) {
          if (sample.translation.some(v => v !== 0)) worldDisplacement(node, sample.translation);
          if (sample.angleRad !== 0 && motion.kind === "roll")
            rotateRollingBody(node, motion.direction, sample.angleRad);
          if (sample.angleRad !== 0 && (motion.kind === "pendulum" || motion.kind === "spin")) {
            if (pivots[index]) rotateAboutWorldPivot(node, motion.axis, sample.angleRad, pivots[index]);
            else node.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(...motion.axis), sample.angleRad));
          }
        }
      }
    },
    dispose() { previousBaseline.clear(); authoredDispose(); },
  };
  return { asset, events: (id, fps) => {
    const plan = prepared.find(item => item.spec.id === id);
    if (!plan) throw new Error(`Unknown physical action "${id}".`);
    return impactEventsForPhysicalAction(plan.spec, fps);
  } };
}
