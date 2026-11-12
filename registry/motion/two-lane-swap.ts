/** Authored, deterministic two-subject lane-swap choreography.
 *
 * Turns the original reference-lab two-lane-swap research idea into an
 * executable renderer-neutral motion mechanic, not recovered source animation.
 * The compiler checks EVERY integer frame for circle clearance and safe bounds.
 * No clock, DOM, random motion, unsafe source interpretation or 3D dependence.
 */
import { evaluateEasing } from "./easing";
import type { Diagnostic } from "./types";

export interface LaneSwapPoint { x: number; y: number }
export interface TwoLaneSwapSpec {
  schemaVersion: 1;
  id: string;
  /** Coordinates are 2D design px; responsive scaling is render-only. */
  stage: { width: number; height: number };
  /** Stable IDs refer to original authored assets, not detected people. */
  subjectA: { id: string; radiusPx: number };
  subjectB: { id: string; radiusPx: number };
  left: LaneSwapPoint;
  right: LaneSwapPoint;
  startFrame: number;
  /** Motion covers exactly durationFrames integer frames, including the finish. */
  durationFrames: number;
  /** B starts later, and A finishes earlier; default 0. */
  staggerFrames?: number;
  arcHeightPx?: number;
  anticipationPx?: number;
  overshootPx?: number;
  maxTiltDeg?: number;
  depthScaleDip?: number;
  clearancePx?: number;
  safeMarginPx?: number;
  layerOrder?: "a-front" | "b-front";
}
export type LaneSwapPhase =
  | "before" | "anticipate" | "travel" | "settle" | "hold" | "reduced-motion-final";
export interface LaneSwapSubjectSample {
  id: string;
  x: number;
  y: number;
  rotationDeg: number;
  scale: number;
  progress: number;
  phase: LaneSwapPhase;
  layer: 1 | 2;
}
export interface TwoLaneSwapFrame {
  frame: number;
  a: LaneSwapSubjectSample;
  b: LaneSwapSubjectSample;
  /** Image-plane center distance minus authored conservative circle radii. */
  clearancePx: number;
}
export interface TwoLaneSwapPlan {
  spec: TwoLaneSwapSpec;
  minSampledClearancePx: number;
  checkedFrameCount: number;
}
export type TwoLaneSwapCompilation =
  | { ok: true; plan: TwoLaneSwapPlan; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

const DEFAULTS = {
  staggerFrames: 0,
  arcHeightPx: 120,
  anticipationPx: 12,
  overshootPx: 8,
  maxTiltDeg: 4,
  depthScaleDip: .04,
  clearancePx: 12,
  safeMarginPx: 20,
  layerOrder: "a-front" as const,
};
const ANTICIPATE = .12;
const SETTLE = .15;
const TRAVEL_END = 1 - SETTLE;

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function between(v: unknown, lo: number, hi: number): v is number {
  return finite(v) && v >= lo && v <= hi;
}
function integerBetween(v: unknown, lo: number, hi: number): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;
}
function diagnostic(code: string, message: string, frame?: number): Diagnostic {
  return {
    code: "two-lane-swap-" + code, severity: "error", message,
    ...(frame === undefined ? {} : { frame }),
  };
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
function snapshot(spec: TwoLaneSwapSpec): TwoLaneSwapSpec {
  return {
    schemaVersion: 1, id: spec.id,
    stage: { width: spec.stage.width, height: spec.stage.height },
    subjectA: { id: spec.subjectA.id, radiusPx: spec.subjectA.radiusPx },
    subjectB: { id: spec.subjectB.id, radiusPx: spec.subjectB.radiusPx },
    left: { x: spec.left.x, y: spec.left.y },
    right: { x: spec.right.x, y: spec.right.y },
    startFrame: spec.startFrame, durationFrames: spec.durationFrames,
    staggerFrames: spec.staggerFrames ?? DEFAULTS.staggerFrames,
    arcHeightPx: spec.arcHeightPx ?? DEFAULTS.arcHeightPx,
    anticipationPx: spec.anticipationPx ?? DEFAULTS.anticipationPx,
    overshootPx: spec.overshootPx ?? DEFAULTS.overshootPx,
    maxTiltDeg: spec.maxTiltDeg ?? DEFAULTS.maxTiltDeg,
    depthScaleDip: spec.depthScaleDip ?? DEFAULTS.depthScaleDip,
    clearancePx: spec.clearancePx ?? DEFAULTS.clearancePx,
    safeMarginPx: spec.safeMarginPx ?? DEFAULTS.safeMarginPx,
    layerOrder: spec.layerOrder ?? DEFAULTS.layerOrder,
  };
}

/** Validate authoring data before geometry or JSON cloning. */
export function validateTwoLaneSwap(spec: TwoLaneSwapSpec): Diagnostic[] {
  const out: Diagnostic[] = [];
  const fail = (code: string, msg: string) => out.push(diagnostic(code, msg));
  if (!spec || typeof spec !== "object" || spec.schemaVersion !== 1)
    return [diagnostic("schema", "Expected schemaVersion 1.")];
  if (typeof spec.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(spec.id))
    fail("id", "Provide a short, stable, lowercase recipe ID.");
  if (!spec.stage || !between(spec.stage.width, 320, 7680) ||
      !between(spec.stage.height, 180, 7680))
    fail("stage", "Stage dimensions must be finite within 320..7680 x 180..7680.");
  if (!spec.subjectA || !spec.subjectB ||
      typeof spec.subjectA.id !== "string" || typeof spec.subjectB.id !== "string" ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(spec.subjectA.id) ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(spec.subjectB.id) ||
      spec.subjectA.id === spec.subjectB.id ||
      !between(spec.subjectA.radiusPx, 1, 2000) ||
      !between(spec.subjectB.radiusPx, 1, 2000))
    fail("subjects", "Subjects need unique IDs and positive finite bounding radii.");
  if (!spec.left || !spec.right ||
      !finite(spec.left.x) || !finite(spec.left.y) ||
      !finite(spec.right.x) || !finite(spec.right.y) ||
      spec.left.x >= spec.right.x ||
      Math.abs(spec.left.y - spec.right.y) > .001)
    fail("lanes", "Left and right need finite increasing X centers at the same Y.");
  if (!integerBetween(spec.startFrame, 0, 1000000) ||
      !integerBetween(spec.durationFrames, 30, 600))
    fail("frames", "startFrame and durationFrames must be bounded integer frames.");
  if (!integerBetween(spec.staggerFrames ?? 0, 0,
      integerBetween(spec.durationFrames, 30, 600)
        ? Math.floor(spec.durationFrames / 3) : 0))
    fail("stagger", "B delay must be an integer <= durationFrames / 3.");
  const settings: Array<[string, unknown, number, number]> = [
    ["arc-height", spec.arcHeightPx ?? DEFAULTS.arcHeightPx, 0, 3000],
    ["anticipation", spec.anticipationPx ?? DEFAULTS.anticipationPx, 0, 400],
    ["overshoot", spec.overshootPx ?? DEFAULTS.overshootPx, 0, 400],
    ["tilt", spec.maxTiltDeg ?? DEFAULTS.maxTiltDeg, 0, 15],
    ["depth", spec.depthScaleDip ?? DEFAULTS.depthScaleDip, 0, .15],
    ["clearance", spec.clearancePx ?? DEFAULTS.clearancePx, 0, 500],
    ["margin", spec.safeMarginPx ?? DEFAULTS.safeMarginPx, 0, 500],
  ];
  for (const [name, value, lo, hi] of settings)
    if (!between(value, lo, hi)) fail(name, name + " must be finite within bounds.");
  if (spec.layerOrder !== undefined &&
      spec.layerOrder !== "a-front" && spec.layerOrder !== "b-front")
    fail("layer", "Layer order must be a-front or b-front.");
  return out;
}

function subjectAt(
  spec: TwoLaneSwapSpec, frame: number, which: "a" | "b", reduced: boolean,
): LaneSwapSubjectSample {
  const isA = which === "a";
  const from = isA ? spec.left : spec.right;
  const to = isA ? spec.right : spec.left;
  const sign = isA ? 1 : -1;
  const directionY = isA ? -1 : 1;
  const delay = spec.staggerFrames!;
  const start = spec.startFrame + (isA ? 0 : delay);
  const last = spec.startFrame + spec.durationFrames - 1 - (isA ? delay : 0);
  const isFront = spec.layerOrder === (isA ? "a-front" : "b-front");
  const base = {
    id: isA ? spec.subjectA.id : spec.subjectB.id,
    rotationDeg: 0, scale: 1, layer: (isFront ? 2 : 1) as 1 | 2,
  };
  if (reduced)
    return { ...base, x: to.x, y: to.y, phase: "reduced-motion-final", progress: 1 };
  if (frame < start)
    return { ...base, x: from.x, y: from.y, phase: "before", progress: 0 };
  if (frame >= last)
    return { ...base, x: to.x, y: to.y, phase: "hold", progress: 1 };
  const p = clamp01((frame - start) / (last - start));
  if (p < ANTICIPATE) {
    const t = p / ANTICIPATE;
    return {
      ...base, x: from.x - sign * spec.anticipationPx! *
        Math.sin(Math.PI * t) ** 2,
      y: from.y, progress: 0, phase: "anticipate",
    };
  }
  if (p < TRAVEL_END) {
    const t = (p - ANTICIPATE) / (TRAVEL_END - ANTICIPATE);
    const eased = evaluateEasing("ease-in-out-cubic", t);
    const wave = Math.sin(Math.PI * eased);
    return {
      ...base,
      x: from.x + (to.x - from.x) * eased,
      y: from.y + directionY * spec.arcHeightPx! * wave,
      rotationDeg: sign * spec.maxTiltDeg! * wave,
      scale: 1 - spec.depthScaleDip! * wave,
      progress: eased, phase: "travel",
    };
  }
  const t = (p - TRAVEL_END) / SETTLE;
  return {
    ...base, x: to.x + sign * spec.overshootPx! *
      Math.sin(Math.PI * t) ** 2,
    y: to.y, progress: 1, phase: "settle",
  };
}
function sample(spec: TwoLaneSwapSpec, frame: number, reduced: boolean): TwoLaneSwapFrame {
  const a = subjectAt(spec, frame, "a", reduced);
  const b = subjectAt(spec, frame, "b", reduced);
  return {
    frame, a, b,
    clearancePx: Math.hypot(a.x - b.x, a.y - b.y) -
      spec.subjectA.radiusPx - spec.subjectB.radiusPx,
  };
}

/** An invalid size, overrun or close approach is an error, not a clipped render. */
export function compileTwoLaneSwap(input: TwoLaneSwapSpec): TwoLaneSwapCompilation {
  const errors = validateTwoLaneSwap(input);
  if (errors.length) return { ok: false, diagnostics: errors };
  const spec = snapshot(input);
  let minimum = Infinity;
  for (let i = 0; i < spec.durationFrames; i++) {
    const frame = spec.startFrame + i;
    const state = sample(spec, frame, false);
    for (const [position, radius] of [
      [state.a, spec.subjectA.radiusPx],
      [state.b, spec.subjectB.radiusPx],
    ] as const) {
      const margin = spec.safeMarginPx!;
      if (position.x - radius < margin - 1e-6 ||
          position.y - radius < margin - 1e-6 ||
          position.x + radius > spec.stage.width - margin + 1e-6 ||
          position.y + radius > spec.stage.height - margin + 1e-6)
        return { ok: false, diagnostics: [diagnostic(
          "bounds", "A moving subject leaves the safe viewport.", frame)] };
    }
    minimum = Math.min(minimum, state.clearancePx);
    if (state.clearancePx < spec.clearancePx! - 1e-6)
      return { ok: false, diagnostics: [diagnostic(
        "collision", "Subjects violate configured bounding-circle clearance.", frame)] };
  }
  return {
    ok: true,
    plan: { spec, minSampledClearancePx: minimum, checkedFrameCount: spec.durationFrames },
    diagnostics: [],
  };
}
/** Frame order never matters; reduced-motion returns the finished composition. */
export function evaluateTwoLaneSwap(
  plan: TwoLaneSwapPlan, frame: number, reducedMotion = false,
): TwoLaneSwapFrame {
  if (!Number.isSafeInteger(frame))
    throw new Error("Two-lane swap requires an absolute integer frame.");
  return sample(plan.spec, frame, reducedMotion);
}
