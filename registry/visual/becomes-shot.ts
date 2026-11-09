/** "Becomes": one object turns into another, a visual simile in time ("a bear becomes a bull"). Object A stands in studio light; from
 * the top down it dissolves into glowing particles, each released from the point of A's surface where the dissolve passes; they fly on
 * arcs to the matching points of B's surface (paired by height, so A's top flows to B's top); and B builds in where they land, also
 * from the top down. Then B turns a little and holds.
 *
 * Research (doc 32, §13, grade A): visual rhetoric (rhyme, antithesis, metaphor) led to more elaboration and a warmer attitude to an ad
 * without being harder to understand; Phillips and McQuarrie class a simile as two things shown side by side, and the hybrid as two
 * fused. A "becomes" shot is the simile told in time: the viewer sees that A is like B because A turns into B. The benefit of metaphor
 * depends on the viewer being able to decode it, so the pairing should be one the audience already knows.
 *
 * Pure functions of the frame.
 */
import type { OrbitView, TextBeat } from "./studio-shots";

export interface BecomesSpec {
  durationFrames: number;
  view: OrbitView;
  /** The frame A starts to dissolve, and the frame B is whole. */
  dissolveFrame: number;
  formFrame: number;
  /** Surface points that carry A into B. @default 9000 */
  count?: number;
  /** The particles' colour. @default warm white */
  color?: string;
  /** Degrees B turns once it is whole. @default 16 */
  orbitAfter?: number;
  title?: TextBeat;
}
export interface BecomesProblem { code: string; severity: "error" | "warning"; message: string }

/** The morph's clock: when A's top starts to go, how long each particle flies, and how far the dissolve and the build have come. The
 * span between `dissolveFrame` and `formFrame` is shared: the dissolve sweeps down A over 45% of it, and each particle flies for 55%. */
export function becomesState(spec: BecomesSpec, frame: number) {
  const span = Math.max(1, spec.formFrame - spec.dissolveFrame), sweep = span * .45, travel = span * .55;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const dissolve = clamp((frame - spec.dissolveFrame) / sweep), build = clamp((frame - spec.dissolveFrame - travel) / sweep);
  const after = clamp((frame - spec.formFrame) / Math.max(1, spec.durationFrames - spec.formFrame));
  return { sweep, travel, dissolve, build, turn: (spec.view.yaw ?? 0) + after * after * (3 - 2 * after) * (spec.orbitAfter ?? 16) };
}

export function inspectBecomes(spec: BecomesSpec, from: string, to: string, fps = 30): BecomesProblem[] {
  const problems: BecomesProblem[] = [], span = spec.formFrame - spec.dissolveFrame;
  if (from === to) problems.push({ code: "becomes-same", severity: "error", message: "An object cannot become itself: name two different subjects." });
  if (!(spec.dissolveFrame >= 0 && span > 0 && spec.formFrame <= spec.durationFrames)) problems.push({ code: "becomes-timing", severity: "error", message: "The dissolve must start, and the new object form, inside the shot, in that order." });
  if (spec.dissolveFrame < fps * .8) problems.push({ code: "becomes-no-first", severity: "warning", message: "The first object dissolves within 0.8 s: let it register before it changes, or there is no simile." });
  if (span < fps) problems.push({ code: "becomes-rushed", severity: "warning", message: "The change takes under a second; the eye cannot follow what turns into what." });
  if (span > fps * 3.5) problems.push({ code: "becomes-slow", severity: "warning", message: "The change takes over 3.5 s; it stops reading as one becoming the other." });
  if (spec.durationFrames - spec.formFrame < fps) problems.push({ code: "becomes-no-hold", severity: "warning", message: "The new object is whole for under a second: hold it so the comparison lands." });
  if (spec.title && spec.title.enter < spec.formFrame) problems.push({ code: "becomes-title-early", severity: "warning", message: "The title enters before the new object is whole; it competes with the change." });
  return problems;
}
