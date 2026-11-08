/** Shots of places: a flight through a set lit by baked, path-traced light (`RealLightFlythrough`) and a slow move through a
 * captured place (`CapturedPlace`). Their specs and craft checks live here, free of three.js and Spark, so a film document can check
 * a shot before anything loads a renderer.
 */
import type { TextBeat, Vec3 } from "./studio-shots";

export interface FlythroughSpec {
  durationFrames: number;
  /** How far along the baked path the camera travels, from 0 to 1, over the shot. Forward only. @default [0.02, 0.62] */
  travel?: readonly [number, number];
  /** Degrees the camera looks up, easing from the first value to the second: lifting the eye toward the light reveals the set. @default [2, 14] */
  lookUp?: readonly [number, number];
  fov?: number;
  /** Brightness of the baked light, as a multiplier. @default 1 */
  exposure?: number;
  title?: TextBeat;
}
/** Close-up grain for a baked set: per mesh-name prefix, a tiling detail map centred on mid grey and how often it repeats over the
 * mesh's UVs. A bake holds the light at tens of pixels a metre; the detail map adds the rock's grain at close range without touching
 * the light, the way game and film sets layer a detail texture over a lightmap. `light-bake.py` writes both into `<name>.path.json`. */
export type FlythroughDetails = Readonly<Record<string, { src: string; repeat: readonly [number, number]; strength?: number }>>;
export interface FlythroughProblem { code: string; severity: "error" | "warning"; message: string }
export function inspectFlythrough(spec: FlythroughSpec, fps = 30): FlythroughProblem[] {
  const problems: FlythroughProblem[] = [], [a, b] = spec.travel ?? [.02, .62];
  if (b <= a) problems.push({ code: "flythrough-backwards", severity: "error", message: "The camera must travel forward along the path." });
  const rate = (b - a) / (spec.durationFrames / fps);
  if (rate > .2) problems.push({ code: "flythrough-fast", severity: "warning", message: `The camera covers ${(rate * 100).toFixed(0)}% of the set a second; above 20% the walls blur past before the light can be seen.` });
  if (spec.title && spec.title.enter < 40) problems.push({ code: "flythrough-title-early", severity: "warning", message: "Let the place register for a second or more before naming it." });
  return problems;
}

/** Recipe 12: a slow, forward-moving camera through a captured place. */
export interface CapturedPlaceSpec {
  durationFrames: number;
  /** Where the camera starts and ends, and what it looks at at each end, in the capture's coordinates. The move is forward:
   * the end is closer to the subject than the start. */
  from: { position: Vec3; target: Vec3 };
  to: { position: Vec3; target: Vec3 };
  fov?: number;
  /** The capture's orientation, as Euler angles in degrees, for captures whose up axis is not +Y. @default [0, 0, 0] */
  rotation?: Vec3;
  scale?: number;
  background?: string;
  title?: TextBeat;
  /** Credit line required by the capture's licence, shown small in a corner for the whole shot. */
  credit?: string;
}
export interface CapturedPlaceProblem { code: string; severity: "error" | "warning"; message: string }
export function inspectCapturedPlace(spec: CapturedPlaceSpec, fps = 30): CapturedPlaceProblem[] {
  const problems: CapturedPlaceProblem[] = [];
  const d = (p: { position: Vec3; target: Vec3 }) => Math.hypot(p.position[0] - p.target[0], p.position[1] - p.target[1], p.position[2] - p.target[2]);
  if (d(spec.to) >= d(spec.from)) problems.push({ code: "captured-not-forward", severity: "warning", message: "The camera ends no closer to the subject than it starts. A captured place reads best with a slow move toward it." });
  const travel = Math.hypot(spec.to.position[0] - spec.from.position[0], spec.to.position[1] - spec.from.position[1], spec.to.position[2] - spec.from.position[2]);
  if (travel / (spec.durationFrames / fps) > d(spec.from) * .25) problems.push({ code: "captured-fast", severity: "warning", message: "The camera covers more than a quarter of its distance to the subject each second; captures shimmer at the edges under fast moves." });
  if (!spec.credit) problems.push({ code: "captured-credit", severity: "error", message: "Captures under CC BY need the credit on screen or in the end credits. Set `credit`." });
  return problems;
}
