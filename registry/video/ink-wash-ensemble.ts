/**
 * INK5 ensemble blocking. FilmStage owns time; existing CharacterPresenter owns pose,
 * speech and expression. This module coordinates multiple approved 2.5D instances
 * and material-native interaction beats without creating a second animation engine.
 */
import { assertInkActorTrack, inkActorAt } from "./ink-wash-character";
import type { InkActorTrack, InkActorTransform } from "./ink-wash-character";
import { evaluateCharacter } from "../character/evaluate";
import type { CharacterCue, CharacterDefinition, CharacterInstance, CharacterVec2 } from "../character/definition";

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


/**
 * Shared conversions for animated character anchors.
 * The character is CSS-positioned by its bottom-centre foot root; its authored
 * design is mirrored before rotation (rotate(...) scaleX(...)), then scaled.
 * Reuse for gaze, props and contact rather than estimating from actor centres.
 */
function assertAnchorGeometry(
  pose: InkActorTransform, design: { width: number; height: number }, point: CharacterVec2,
): void {
  if (![pose.x, pose.y, pose.scale, pose.rotation, design.width, design.height, point.x, point.y]
    .every(finite) || pose.scale <= 0 || design.width <= 0 || design.height <= 0 ||
    (pose.facing !== "left" && pose.facing !== "right"))
    throw new RangeError("INK5 anchor conversion needs finite geometry, positive dimensions and valid facing.");
}
export function inkDesignToPaper(
  pose: InkActorTransform, design: { width: number; height: number }, point: CharacterVec2,
): CharacterVec2 {
  assertAnchorGeometry(pose, design, point);
  const direction = pose.facing === "left" ? -1 : 1;
  const x = direction * (point.x - design.width / 2) * pose.scale;
  const y = (point.y - design.height) * pose.scale;
  const a = pose.rotation * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return { x: pose.x + cos*x - sin*y, y: pose.y + sin*x + cos*y };
}
export function inkPaperToDesign(
  pose: InkActorTransform, design: { width: number; height: number }, point: CharacterVec2,
): CharacterVec2 {
  assertAnchorGeometry(pose, design, point);
  const dx = point.x - pose.x, dy = point.y - pose.y;
  const a = pose.rotation * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const direction = pose.facing === "left" ? -1 : 1;
  return {
    x: design.width / 2 + direction * (cos*dx + sin*dy) / pose.scale,
    y: design.height + (-sin*dx + cos*dy) / pose.scale,
  };
}

/** Convert a partner's actual animated eye anchor into this actor's design space.
 * The optional point is in the partner's own design coordinates, after rigging.
 * Only when no anchor exists do we fall back to the original rough face estimate.
 */
export function inkPartnerLookTarget(
  source: InkActorTransform, target: InkActorTransform,
  sourceDesign: { width: number; height: number },
  targetDesign: { width: number; height: number },
  targetEye?: CharacterVec2,
): Readonly<CharacterVec2> {
  const approximateEye = targetEye ?? {
    x: targetDesign.width / 2, y: targetDesign.height * .30,
  };
  return inkPaperToDesign(source, sourceDesign,
    inkDesignToPaper(target, targetDesign, approximateEye));
}

/** Cast contract shared with the approved CharacterPresenter. No shadow rig or clock. */
export interface InkAnchorCastMember {
  trackId: string;
  definition: CharacterDefinition;
  instance: CharacterInstance;
  cues: readonly CharacterCue[];
}
export interface InkEnsembleHandAudit {
  beatId: string;
  /** Actual animated hand-anchor distance in stage pixels; null if unavailable. */
  handGap: number | null;
  maxHandGap: number;
  /** Never reports success for missing anchors or intersecting feet. */
  handContact: boolean;
  missingAnchor: boolean;
  intersectingFeet: boolean;
}
/** Exact posed hand-to-hand audit for all active exchanges.
 * This does NOT animate a handoff: actual contact requires authored/IK posing.
 * Zero inferred success from actor roots, missing anchors or screenshot appearance.
 */
export function auditInkEnsembleHands(
  plan: InkEnsemblePlan, cast: readonly InkAnchorCastMember[],
  frame: number, reducedMotion = false, maxHandGap = 12,
): readonly InkEnsembleHandAudit[] {
  if (!finite(maxHandGap) || maxHandGap < 0 || maxHandGap > 256)
    throw new RangeError("INK5 hand-contact tolerance must be 0..256 paper pixels.");
  const at = inkEnsembleAt(plan, frame, reducedMotion);
  const members = new Map(cast.map(member => [member.trackId, member] as const));
  if (cast.length !== plan.actors.length || members.size !== cast.length ||
      at.actors.some(actor => members.get(actor.id)?.instance.instanceId !== actor.instanceId))
    throw new RangeError("INK5 hand audits require one matching approved instance per track.");
  const actors = new Map(at.actors.map(actor => [actor.id, actor] as const));
  const cachedHands = new Map<string, CharacterVec2 | null>();
  const handWorld = (id: string): CharacterVec2 | null => {
    if (cachedHands.has(id)) return cachedHands.get(id)!;
    const actor = actors.get(id)!, member = members.get(id)!;
    const instance = reducedMotion
      ? { ...member.instance, reducedMotion: true } : member.instance;
    const hand = evaluateCharacter(member.definition, instance, member.cues, frame).anchors.hand;
    const result = hand ? inkDesignToPaper(actor.pose, member.definition.design, hand) : null;
    cachedHands.set(id, result);
    return result;
  };
  return at.contacts.map(contact => {
    const beat = plan.beats.find(candidate => candidate.id === contact.beatId)!;
    const source = handWorld(beat.sourceId), target = handWorld(beat.targetId);
    const handGap = source && target ? Math.hypot(source.x-target.x, source.y-target.y) : null;
    return { beatId: contact.beatId, handGap, maxHandGap,
      missingAnchor: handGap === null,
      intersectingFeet: contact.intersectingFeet,
      handContact: handGap !== null && handGap <= maxHandGap && !contact.intersectingFeet };
  });
}
