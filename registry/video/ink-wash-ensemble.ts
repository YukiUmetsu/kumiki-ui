/**
 * INK5 ensemble blocking. FilmStage owns time; existing CharacterPresenter owns pose,
 * speech and expression. This module coordinates multiple approved 2.5D instances
 * and material-native interaction beats without creating a second animation engine.
 */
import { assertInkActorTrack, inkActorAt } from "./ink-wash-character";
import type { InkActorTrack, InkActorTransform } from "./ink-wash-character";

export type InkInteractionKind = "regard" | "approach" | "exchange" | "follow";
export interface InkEnsembleTrack {
  track: InkActorTrack;
  /** Front-to-back drawing order, not a camera parallax assumption. */
  depth: number;
  /** Bounding footprint radius on the ground in authored paper units. */
  radius: number;
}
export interface InkInteractionBeat {
  id: string;
  sourceId: string;
  targetId: string;
  kind: InkInteractionKind;
  startFrame: number;
  endFrame: number;
  /** For an exchange, the authored hand-to-hand reach is reviewed, not faked. */
  contactDistance?: number;
  /** Must remain positive: actors may overlap ink silhouettes but not feet. */
  minimumSeparation?: number;
}
export interface InkEnsemblePlan {
  actors: readonly InkEnsembleTrack[];
  beats: readonly InkInteractionBeat[];
}
export interface InkEnsembleActorPose {
  id: string;
  instanceId: string;
  depth: number;
  pose: InkActorTransform;
  /** Identifies which actor this performer should attend to; host may map to rig gaze targets. */
  attentionTargetId?: string;
  /** Explicitly authored semantic beat rather than a randomly generated gesture. */
  activity?: InkInteractionKind;
}
export interface InkEnsembleContactAudit {
  beatId: string;
  actualGap: number;
  maximumGap: number;
  withinReach: boolean;
  /** Footprints overlap only if separation falls below the authored threshold. */
  intersectingFeet: boolean;
}
export interface InkEnsembleFrame {
  actors: readonly InkEnsembleActorPose[];
  contacts: readonly InkEnsembleContactAudit[];
}
const ID = /^[a-z][a-z0-9._-]{0,63}$/i;
const finite = (v: number) => Number.isFinite(v);
export function assertInkEnsemble(plan: InkEnsemblePlan): void {
  if (!plan || !Array.isArray(plan.actors) || plan.actors.length < 2 || plan.actors.length > 20 ||
      !Array.isArray(plan.beats) || plan.beats.length > 100)
    throw new RangeError("INK5 requires 2–20 approved actors and 0–100 interaction beats.");
  const ids = new Set<string>(), instances = new Set<string>(), beatIds = new Set<string>();
  for (const actor of plan.actors) {
    assertInkActorTrack(actor.track);
    if (ids.has(actor.track.id) || instances.has(actor.track.instanceId) ||
        !Number.isSafeInteger(actor.depth) || actor.depth < -1000 || actor.depth > 1000 ||
        !finite(actor.radius) || actor.radius <= 0 || actor.radius > 500)
      throw new RangeError("INK5 requires unique actor/instance IDs, finite depth and positive footprint.");
    ids.add(actor.track.id);
    instances.add(actor.track.instanceId);
  }
  for (const beat of plan.beats) {
    if (!beat || !ID.test(beat.id) || beatIds.has(beat.id) ||
        !ids.has(beat.sourceId) || !ids.has(beat.targetId) ||
        beat.sourceId === beat.targetId ||
        !["regard", "approach", "exchange", "follow"].includes(beat.kind) ||
        !Number.isSafeInteger(beat.startFrame) || beat.startFrame < 0 ||
        !Number.isSafeInteger(beat.endFrame) || beat.endFrame <= beat.startFrame ||
        beat.endFrame > 360000 ||
        (beat.contactDistance !== undefined && (!finite(beat.contactDistance) || beat.contactDistance <= 0 || beat.contactDistance > 4000)) ||
        (beat.minimumSeparation !== undefined && (!finite(beat.minimumSeparation) || beat.minimumSeparation < 0 || beat.minimumSeparation > 4000)))
      throw new RangeError("INK5 interaction needs unique IDs, known distinct actors and valid timing/distances.");
    beatIds.add(beat.id);
  }
}

/** Evaluate ensemble at any absolute frame, including backward seeks and reduced motion.
 * The chosen orientation is discrete and stable on the first frame of an interaction.
 * Actual hand contact is never inferred from a body root: an explicit reach audit
 * is provided and must be verified by the art director for every contact beat.
 */
export function inkEnsembleAt(plan: InkEnsemblePlan, frame: number, reducedMotion = false): InkEnsembleFrame {
  assertInkEnsemble(plan);
  if (!Number.isSafeInteger(frame) || frame < 0 || frame > 360000)
    throw new RangeError("INK5 needs an absolute nonnegative frame.");
  const sampled = plan.actors.map(actor => ({
    id: actor.track.id, instanceId: actor.track.instanceId,
    depth: actor.depth, radius: actor.radius,
    pose: inkActorAt(actor.track, frame, reducedMotion),
    attentionTargetId: undefined as string | undefined,
    activity: undefined as InkInteractionKind | undefined,
  }));
  const byId = new Map(sampled.map(actor => [actor.id, actor] as const));
  const contacts: InkEnsembleContactAudit[] = [];
  const activeFrame = reducedMotion ? Math.max(frame,
    ...plan.beats.map(beat => beat.endFrame - 1)) : frame;
  for (const beat of plan.beats) {
    if (activeFrame < beat.startFrame || activeFrame >= beat.endFrame) continue;
    const source = byId.get(beat.sourceId)!;
    const target = byId.get(beat.targetId)!;
    source.attentionTargetId = beat.targetId;
    source.activity = beat.kind;
    // Do not turn a character upside down at coincident X positions.
    if (Math.abs(target.pose.x - source.pose.x) > 1) {
      source.pose = { ...source.pose, facing: target.pose.x >= source.pose.x ? "right" : "left" };
    }
    if (beat.kind === "exchange") {
      const distance = Math.hypot(source.pose.x - target.pose.x, source.pose.y - target.pose.y);
      const gap = Math.max(0, distance - source.radius - target.radius);
      const allowed = beat.contactDistance ?? Math.max(source.radius, target.radius) * .7;
      contacts.push({
        beatId: beat.id, actualGap: gap, maximumGap: allowed,
        withinReach: gap <= allowed,
        intersectingFeet: distance < (beat.minimumSeparation ?? Math.min(source.radius, target.radius) * 1.2),
      });
    }
  }
  return {
    actors: sampled.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))
      .map(({ radius: _radius, ...actor }) => actor),
    contacts,
  };
}


/** Map the actual partner's head target into the source actor's own approved
 * design coordinates. CharacterPresenter applies its existing gaze easing and
 * eyelid/eye-part geometry; this does not invent an independent pupil solver.
 */
export function inkPartnerLookTarget(
  source: InkActorTransform, target: InkActorTransform,
  sourceDesign: { width: number; height: number },
  targetDesign: { width: number; height: number },
): Readonly<{ x: number; y: number }> {
  if (![source.x, source.y, source.scale, target.x, target.y, target.scale,
    sourceDesign.width, sourceDesign.height, targetDesign.width, targetDesign.height]
    .every(finite) || source.scale <= 0 || target.scale <= 0 ||
    sourceDesign.width <= 0 || sourceDesign.height <= 0 ||
    targetDesign.width <= 0 || targetDesign.height <= 0)
    throw new RangeError("INK5 look target requires finite positive character dimensions and poses.");
  // Visual estimate of another figure's eyes at 30% down from its head-top.
  // Consumers needing exact eye/hand contact should supply tracked part anchors.
  const faceWorldY = target.y - targetDesign.height * target.scale * .70;
  const mirrored = source.facing === "left" ? -1 : 1;
  return {
    x: sourceDesign.width / 2 + (target.x - source.x) * mirrored / source.scale,
    y: sourceDesign.height + (faceWorldY - source.y) / source.scale,
  };
}
