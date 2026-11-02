/**
 * Deterministic playback of offline-simulated local transforms on HeroAssets.
 * This transports Blender collision/constraint motion without shipping a solver
 * or touching mesh topology, hierarchy, lighting, or render ownership.
 */
import type { Object3D } from "three";
import { Quaternion, Vector3 } from "three";
import type { HeroAsset } from "./hero-asset";
import type { HeroActionSpec, HeroActionState } from "./hero-action";
import {
  contactEventsForBakedAction, sampleBakedPhysicalTrack, validateBakedPhysicalActions,
} from "../motion/baked-physical-motion";
import type { BakedContactEvent, BakedPhysicalActionSpec, BakedPhysicalTrack } from "../motion/baked-physical-motion";

type Transform = { position: Vector3; rotation: Quaternion; scale: Vector3 };
type Track = { source: BakedPhysicalTrack; node: Object3D };
type PreparedAction = { spec: BakedPhysicalActionSpec; tracks: readonly Track[] };
type PosedHero<T extends HeroAsset> = T & Required<Pick<HeroAsset, "actions" | "pose">>;

function capture(node: Object3D): Transform {
  return { position: node.position.clone(), rotation: node.quaternion.clone(), scale: node.scale.clone() };
}
function restore(node: Object3D, state: Transform) {
  node.position.copy(state.position); node.quaternion.copy(state.rotation); node.scale.copy(state.scale);
  node.updateMatrix();
}

/** Attach offline rigid-body motion to an existing glTF/Blender hero instance. */
export function createBakedPhysicalHeroMotion<T extends HeroAsset>(
  hero: T, plans: readonly BakedPhysicalActionSpec[], resolve: (idOrRole: string) => readonly Object3D[],
): { asset: PosedHero<T>; events: (id: string, fps?: number) => readonly BakedContactEvent[] } {
  const validated = validateBakedPhysicalActions(plans);
  const inheritedActions = hero.actions ?? [];
  const ids = new Set(inheritedActions.map(a => a.id));
  const influenced = new Set<Object3D>();
  const prepared: PreparedAction[] = validated.map(spec => {
    if (ids.has(spec.id)) throw new Error(`Baked action "${spec.id}" conflicts with an existing action.`);
    ids.add(spec.id);
    if (spec.sourceActionId && !inheritedActions.some(a => a.id === spec.sourceActionId))
      throw new Error(`Baked action "${spec.id}" refers to unknown glTF sourceActionId "${spec.sourceActionId}".`);
    const selected = new Set<Object3D>();
    const tracks = spec.tracks.map(source => {
      const nodes = resolve(source.target);
      if (nodes.length !== 1) throw new Error(`Baked target "${source.target}" must resolve to exactly one Blender node, found ${nodes.length}. Use canonical kumiki:role:N IDs for repeated parts.`);
      const node = nodes[0];
      if (selected.has(node)) throw new Error(`Baked action "${spec.id}" maps multiple tracks to one node.`);
      selected.add(node); influenced.add(node);
      return { source, node };
    });
    for (const cue of spec.contacts ?? []) {
      if (!resolve(cue.target).length) throw new Error(`Baked contact target "${cue.target}" does not exist.`);
    }
    return { spec, tracks };
  });
  const authoredPose = hero.pose?.bind(hero);
  const authoredDispose = hero.dispose.bind(hero);
  let previousBaseline = new Map<Object3D, Transform>();
  const actions: HeroActionSpec[] = validated.map(spec => ({ id: spec.id, label: spec.label ?? spec.id,
    durationFrames: spec.durationFrames, loop: false,
    meaning: "Offline physically simulated motion with deterministic contact and constraint playback.",
  }));
  const asset: PosedHero<T> = {
    ...hero, actions: [...inheritedActions, ...actions],
    pose(state: HeroActionState) {
      for (const [node, transform] of previousBaseline) restore(node, transform);
      const active = prepared.find(p => p.spec.id === state.id);
      const fps = state.fps ?? 30;
      if (active && (!Number.isFinite(state.frame) || !Number.isFinite(fps) || fps <= 0 || fps > 240))
        throw new Error("Baked hero action requires a finite frame and fps in (0, 240].");
      const frame = active ? Math.max(0, Math.min(state.frame, active.spec.durationFrames * fps / 30)) : state.frame;
      authoredPose?.({ ...state, id: active ? active.spec.sourceActionId ?? null : state.id, frame });
      previousBaseline = new Map([...influenced].map(node => [node, capture(node)]));
      if (!active) return;
      const referenceFrame = frame * 30 / fps;
      for (const track of active.tracks) {
        const sample = sampleBakedPhysicalTrack(track.source, referenceFrame);
        const { node } = track;
        node.position.set(...sample.position);
        node.quaternion.set(...sample.rotation);
        node.scale.set(...sample.scale);
        node.updateMatrix();
      }
    },
    dispose() { previousBaseline.clear(); authoredDispose(); },
  };
  return { asset, events: (actionId, fps) => {
    const item = prepared.find(p => p.spec.id === actionId);
    if (!item) throw new Error(`Unknown baked physical action "${actionId}".`);
    return contactEventsForBakedAction(item.spec, fps);
  } };
}
