import { evaluatePencilMark, inspectPencilDrawing } from "./colored-pencil";
import type { PencilRegion } from "./colored-pencil";

/** CP3: an authored, reusable paper-cutout-like pencil rig.
 * Regions remain CP1 pigment drawings; the host FilmStage frame owns time.
 * Every joint and facial feature is a separately shaded, identifiable region.
 */
export interface PencilPoseKey {
  frame: number;
  /** Change relative to the authored neutral drawing, in paper units. */
  translate: readonly [number, number];
  rotation: number;
  /** Independent axes allow blinks, squash, stretch and mouth visemes. */
  scale: readonly [number, number];
}
/** A separately poseable, named pigment path inside a parent anatomical part.
 *  Detail tracks do not create new opaque regions, page budget or actor bones.
 */
export interface PencilActorDetailTrack {
  id: string;
  pivot: readonly [number, number];
  keys: readonly PencilPoseKey[];
}
export interface PencilActorPart {
  id: string;
  /** Parents must precede children, making evaluation bounded and cycle-free. */
  parent?: string;
  /** Authored pivot, in actor-local paper coordinates. */
  pivot: readonly [number, number];
  /** At least one absolute-frame pose. Interpolation is independent of seeking order. */
  keys: readonly PencilPoseKey[];
  region: PencilRegion;
  /** Independent ear hairs, ruff, feather shafts and facial accents. */
  detailTracks?: readonly PencilActorDetailTrack[];
}
export interface PencilActorSpec {
  id: string;
  /** Actor's fixed placement on the page; animated placement belongs in root keys. */
  transform?: string;
  parts: readonly PencilActorPart[];
}
const safeTransform = (s: unknown): boolean => s === undefined ||
  (typeof s === "string" && s.length <= 400 && /^[\w .(),+-]+$/.test(s));
const valid2 = (a: unknown, max: number, min = -max): a is readonly [number, number] =>
  Array.isArray(a) && a.length === 2 &&
  a.every(v => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max);
const validKey = (key: PencilPoseKey): boolean => !!key && Number.isSafeInteger(key.frame) &&
  key.frame >= 0 && valid2(key.translate, 2048) &&
  Number.isFinite(key.rotation) && Math.abs(key.rotation) <= 180 &&
  valid2(key.scale, 3, .05);

/** The validator also guards portable JSON and must never infer anatomy or measurements. */
export function inspectPencilActors(actors: readonly PencilActorSpec[]): string[] {
  if (!Array.isArray(actors) || actors.length > 6)
    return ["actors: expected no more than six authored rigs."];
  const issues: string[] = [];
  const actorIds = new Set<string>();
  let totalParts = 0;
  let totalDetailTracks = 0;
  for (const [a, actor] of actors.entries()) {
    const at = "actors[" + a + "]";
    if (!actor || typeof actor !== "object") {issues.push(at + ": invalid rig."); continue;}
    if (typeof actor.id !== "string" || !/^[A-Za-z][\w-]{0,40}$/.test(actor.id) || actorIds.has(actor.id))
      issues.push(at + ".id: unique safe identifier required.");
    actorIds.add(actor.id);
    if (!safeTransform(actor.transform)) issues.push(at + ".transform: invalid placement.");
    if (!Array.isArray(actor.parts) || actor.parts.length < 1 || actor.parts.length > 20) {
      issues.push(at + ".parts: require 1–20 drawn anatomical parts."); continue;
    }
    totalParts += actor.parts.length;
    const seen = new Set<string>();
    for (const [i, part] of actor.parts.entries()) {
      const here = at + ".parts[" + i + "]";
      if (!part || typeof part !== "object") {issues.push(here + ": invalid part."); continue;}
      if (typeof part.id !== "string" || !/^[A-Za-z][\w-]{0,40}$/.test(part.id) || seen.has(part.id))
        issues.push(here + ".id: unique safe part ID required.");
      if (part.parent !== undefined && !seen.has(part.parent))
        issues.push(here + ".parent: must name a previously declared part.");
      seen.add(part.id);
      if (!valid2(part.pivot, 4096)) issues.push(here + ".pivot: invalid joint location.");
      if (!Array.isArray(part.keys) || part.keys.length < 1 || part.keys.length > 48 ||
          part.keys.some((key: PencilPoseKey, k: number) => !validKey(key) ||
            (k > 0 && key.frame <= part.keys[k - 1].frame)))
        issues.push(here + ".keys: require 1–48 ordered bounded absolute-frame poses.");
      const drawn = part.region;
      if (!drawn || !Array.isArray(drawn.bounds)) {issues.push(here + ".region: missing artwork."); continue;}
      if (part.detailTracks !== undefined) {
        if (!Array.isArray(part.detailTracks) || part.detailTracks.length > 12) {
          issues.push(here + ".detailTracks: maximum 12 authored detail groups."); 
        } else {
          totalDetailTracks += part.detailTracks.length;
          const detailNames = new Set<string>();
          const sourceIds = new Set(drawn.details?.map(trace => trace.id).filter(Boolean));
          for (const [index, track] of part.detailTracks.entries()) {
            const place = here + ".detailTracks[" + index + "]";
            if (!track || typeof track !== "object" ||
              typeof track.id !== "string" || !/^[A-Za-z][\w-]{0,40}$/.test(track.id) ||
              detailNames.has(track.id) || !sourceIds.has(track.id))
              issues.push(place + ".id: unique identifier must match an authored detail trace.");
            if (track?.id) detailNames.add(track.id);
            if (!valid2(track?.pivot, 4096))
              issues.push(place + ".pivot: invalid detail anchor.");
            if (!Array.isArray(track?.keys) || track.keys.length<1 || track.keys.length>24 ||
              track.keys.some((key: PencilPoseKey,k:number) => !validKey(key) ||
                (k>0 && key.frame<=track.keys[k-1].frame)))
              issues.push(place + ".keys: invalid finite sorted absolute-frame poses.");
          }
        }
      }
      issues.push(...inspectPencilDrawing({
        version: 1, width: 960, height: 960, seed: 0,
        paper: "#FFFDF9", paperTooth: 0, regions: [drawn],
      }).map(x => here + ".region." + x));
    }
  }
  if (totalParts > 23) issues.push("actors: at most 23 component regions per page.");
  if (totalDetailTracks > 48) issues.push("actors: at most 48 independently animated detail paths.");
  return issues;
}

const pretty = (v: number) => Number(v.toFixed(4)).toString();
const ease = (t: number) => t * t * (3 - 2 * t);

/** No player, clock or state; seeks 200→12→200 yield exactly equal geometry. */
export function evaluatePencilPose(keys: readonly PencilPoseKey[], frame: number): PencilPoseKey {
  evaluatePencilMark(frame, { startFrame: 0, durationFrames: 1 });
  if (!keys.length || keys.some((k, i) => !validKey(k) || (i > 0 && k.frame <= keys[i - 1].frame)))
    throw new RangeError("Invalid sorted pencil actor pose track.");
  if (frame <= keys[0].frame) return keys[0];
  if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1];
  const index = keys.findIndex(k => k.frame >= frame);
  const before = keys[index - 1], after = keys[index];
  const t = ease((frame - before.frame) / (after.frame - before.frame));
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    frame, translate: [mix(before.translate[0], after.translate[0]),
      mix(before.translate[1], after.translate[1])],
    rotation: mix(before.rotation, after.rotation),
    scale: [mix(before.scale[0], after.scale[0]), mix(before.scale[1], after.scale[1])],
  };
}

export function evaluatePencilActorRegions(actor: PencilActorSpec, frame: number,
  reducedMotion = false): PencilRegion[] {
  const errors = inspectPencilActors([actor]);
  if (errors.length) throw new RangeError("Invalid pencil actor: " + errors.join("; "));
  const full = new Map<string, string>();
  return actor.parts.map(part => {
    const key = evaluatePencilPose(part.keys, reducedMotion ?
      part.keys[part.keys.length - 1].frame : frame);
    const [dx, dy] = key.translate, [px, py] = part.pivot, [sx, sy] = key.scale;
    // Transform order: parent motion first, local joint then the preserved CP1 region.
    const local = "translate(" + pretty(dx) + " " + pretty(dy) + ") rotate(" +
      pretty(key.rotation) + " " + pretty(px) + " " + pretty(py) + ") translate(" +
      pretty(px) + " " + pretty(py) + ") scale(" + pretty(sx) + " " + pretty(sy) +
      ") translate(" + pretty(-px) + " " + pretty(-py) + ")";
    const parent = part.parent ? full.get(part.parent) + " " : (actor.transform ?? "") + " ";
    const transform = parent + local;
    full.set(part.id, transform);
    const tracks = new Map(part.detailTracks?.map(track => [track.id,track]) ?? []);
    const details = part.region.details?.map(detail => {
      const track = detail.id ? tracks.get(detail.id) : undefined;
      if (!track) return detail;
      const pose = evaluatePencilPose(track.keys, reducedMotion ?
        track.keys[track.keys.length-1].frame : frame);
      const [tx,ty]=pose.translate,[ax,ay]=track.pivot,[xs,ys]=pose.scale;
      // One local deformation per named trace, after the parent part's motion.
      // Rendering stays in the part's original clipping and pigment z-layer.
      const detailTransform = "translate(" + pretty(tx) + " " + pretty(ty) +
        ") rotate(" + pretty(pose.rotation) + " " + pretty(ax) + " " + pretty(ay) +
        ") translate(" + pretty(ax) + " " + pretty(ay) + ") scale(" +
        pretty(xs) + " " + pretty(ys) + ") translate(" +
        pretty(-ax) + " " + pretty(-ay) + ")";
      return {...detail, transform:(detail.transform?detail.transform+" ":"")+detailTransform};
    });
    return { ...part.region, id: actor.id + "-" + part.id, details,
      transform: transform + (part.region.transform ? " " + part.region.transform : "") };
  });
}
