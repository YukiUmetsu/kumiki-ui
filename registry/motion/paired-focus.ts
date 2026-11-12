/** Paired focus choreography: two authored assets approach, establish a
 * visually explicit relationship, then optionally separate. Each absolute
 * integer frame is deterministic and independent of playback order.
 *
 * Designed from screen-space *inspiration*, not reconstructed source actions.
 * This pure module has no DOM, renderer, 3D, clock or runtime dependency.
 */
import { evaluateEasing } from "./easing";
import type { Diagnostic, Vec2 } from "./types";

export type PairedFocusMode = "converge" | "diverge" | "converge-then-diverge";
export interface PairedFocusSpec {
  schemaVersion: 1;
  id: string;
  mode: PairedFocusMode;
  stage: { width: number; height: number };
  subjectA: { id: string; radiusPx: number };
  subjectB: { id: string; radiusPx: number };
  /** Independent outward placement. B must be to the right of A. */
  outerA: Vec2;
  outerB: Vec2;
  /** Author-supplied focal point, not an inferred social interaction. */
  focus: Vec2;
  /** Distance between two focus centers, A on the left, B on the right. */
  focusSeparationPx: number;
  /** Optional distinct outward destination for the full round trip. */
  exitA?: Vec2;
  exitB?: Vec2;
  startFrame: number;
  durationFrames: number;
  /** Only for full round trip; at least one frame in a deliberate pause. */
  focusHoldFrames?: number;
  /** Delays B within each moving leg, without changing the leg endpoint. */
  staggerFrames?: number;
  /** Perpendicular upper/lower curved approach. */
  curvePx?: number;
  /** Brief reverse-direction anticipation at each leg's beginning. */
  anticipationPx?: number;
  /** Settling overshoot beyond the destination, returning to it exactly. */
  overshootPx?: number;
  /** Minimum allowed conservative bounding-circle clearance. */
  clearancePx?: number;
  /** Every subject's conservative circle stays this far from stage edges. */
  safeMarginPx?: number;
}
export type PairedFocusPhase =
  | "before" | "anticipate" | "travel" | "settle" | "focus-hold"
  | "hold" | "reduced-motion-final";
export interface PairedFocusSubject {
  id: string;
  x: number;
  y: number;
  phase: PairedFocusPhase;
  progress: number;
  /** An authored emphasis pulse; 1 means no size modification. */
  scale: number;
}
export interface PairedFocusFrame {
  frame: number;
  a: PairedFocusSubject;
  b: PairedFocusSubject;
  focusStrength: number;
  /** Actual integer-frame center distance, less conservative authored radii. */
  circleClearancePx: number;
}
export interface PairedFocusPlan {
  spec: PairedFocusSpec;
  checkedFrameCount: number;
  minSampledClearancePx: number;
}
export type PairedFocusCompilation =
  | { ok: true; plan: PairedFocusPlan; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

const DEFAULTS = {
  focusHoldFrames: 16, staggerFrames: 5, curvePx: 45,
  anticipationPx: 8, overshootPx: 6, clearancePx: 18,
  safeMarginPx: 20,
};
const ANTICIPATION_FRACTION = .13;
const SETTLE_FRACTION = .15;
const SETTLE_START = 1 - SETTLE_FRACTION;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const inRange = (v: unknown, lo: number, hi: number): v is number =>
  finite(v) && v >= lo && v <= hi;
const intRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;
function point(p: unknown): p is Vec2 {
  if (!p || typeof p !== "object") return false;
  const value = p as Vec2;
  return finite(value.x) && finite(value.y);
}
function problem(code: string, message: string, frame?: number): Diagnostic {
  return {
    code: "paired-focus-" + code,
    severity: "error", message,
    ...(frame === undefined ? {} : { frame }),
  };
}
function normalized(input: PairedFocusSpec): PairedFocusSpec {
  return {
    schemaVersion: 1, id: input.id, mode: input.mode,
    stage: { ...input.stage },
    subjectA: { ...input.subjectA }, subjectB: { ...input.subjectB },
    outerA: { ...input.outerA }, outerB: { ...input.outerB },
    focus: { ...input.focus },
    focusSeparationPx: input.focusSeparationPx,
    ...(input.exitA ? { exitA: { ...input.exitA } } : {}),
    ...(input.exitB ? { exitB: { ...input.exitB } } : {}),
    startFrame: input.startFrame, durationFrames: input.durationFrames,
    focusHoldFrames: input.focusHoldFrames ?? DEFAULTS.focusHoldFrames,
    staggerFrames: input.staggerFrames ?? DEFAULTS.staggerFrames,
    curvePx: input.curvePx ?? DEFAULTS.curvePx,
    anticipationPx: input.anticipationPx ?? DEFAULTS.anticipationPx,
    overshootPx: input.overshootPx ?? DEFAULTS.overshootPx,
    clearancePx: input.clearancePx ?? DEFAULTS.clearancePx,
    safeMarginPx: input.safeMarginPx ?? DEFAULTS.safeMarginPx,
  };
}
export function validatePairedFocus(spec: PairedFocusSpec): Diagnostic[] {
  if (!spec || typeof spec !== "object" || spec.schemaVersion !== 1)
    return [problem("schema", "Expected paired focus schemaVersion 1.")];
  const issues: Diagnostic[] = [];
  const fail = (code: string, msg: string) => { issues.push(problem(code, msg)); };
  const id = (value: unknown): boolean =>
    typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
  if (!id(spec.id)) fail("id", "Use a stable lowercase recipe id.");
  if (!["converge", "diverge", "converge-then-diverge"].includes(spec.mode))
    fail("mode", "Unknown focus choreography mode.");
  if (!spec.stage || !inRange(spec.stage.width, 320, 7680) ||
      !inRange(spec.stage.height, 180, 7680))
    fail("stage", "Stage size must be finite and within design limits.");
  if (!spec.subjectA || !spec.subjectB || !id(spec.subjectA.id) ||
      !id(spec.subjectB.id) || spec.subjectA.id === spec.subjectB.id ||
      !inRange(spec.subjectA.radiusPx, 1, 2000) ||
      !inRange(spec.subjectB.radiusPx, 1, 2000))
    fail("subjects", "Distinct subjects need stable IDs and conservative bounding radii.");
  if (!point(spec.outerA) || !point(spec.outerB) ||
      !point(spec.focus) || (point(spec.outerA) && point(spec.outerB) &&
                            spec.outerA.x >= spec.outerB.x))
    fail("positions", "Use finite outward anchors, left-to-right, and a finite focus.");
  if ((spec.exitA !== undefined || spec.exitB !== undefined) &&
      (spec.mode !== "converge-then-diverge" ||
       !point(spec.exitA) || !point(spec.exitB) ||
       (point(spec.exitA) && point(spec.exitB) && spec.exitA.x >= spec.exitB.x)))
    fail("exit", "Exit points must be a left/right pair on a full round trip.");
  if (!intRange(spec.startFrame, 0, 1000000) ||
      !intRange(spec.durationFrames, 40, 600))
    fail("duration", "Integer startFrame >= 0 and durationFrames 40..600 required.");
  const hold = spec.focusHoldFrames ?? DEFAULTS.focusHoldFrames;
  if (spec.mode === "converge-then-diverge" &&
      (!intRange(hold, 1, 120) ||
       !intRange(spec.durationFrames, 40, 600) ||
       spec.durationFrames - hold < 40))
    fail("hold", "Full choreography needs 1..120 focus hold frames and >=40 moving frames.");
  if (spec.mode !== "converge-then-diverge" &&
      spec.focusHoldFrames !== undefined && spec.focusHoldFrames !== 0)
    fail("hold", "focusHoldFrames must be omitted or zero in a one-way animation.");
  const stagger = spec.staggerFrames ?? DEFAULTS.staggerFrames;
  const moving = spec.mode === "converge-then-diverge" &&
    intRange(hold, 1, 120) && intRange(spec.durationFrames, 40, 600)
    ? Math.floor((spec.durationFrames - hold) / 2)
    : intRange(spec.durationFrames, 40, 600) ? spec.durationFrames : 0;
  if (!intRange(stagger, 0, Math.max(0, Math.floor(moving / 4))))
    fail("stagger", "Stagger must be a bounded integer within the shortest movement leg.");
  for (const [name, v, lo, hi] of [
    ["focus-separation", spec.focusSeparationPx, 0, 3000],
    ["curve", spec.curvePx ?? DEFAULTS.curvePx, 0, 2000],
    ["anticipation", spec.anticipationPx ?? DEFAULTS.anticipationPx, 0, 200],
    ["overshoot", spec.overshootPx ?? DEFAULTS.overshootPx, 0, 200],
    ["clearance", spec.clearancePx ?? DEFAULTS.clearancePx, 0, 500],
    ["margin", spec.safeMarginPx ?? DEFAULTS.safeMarginPx, 0, 500],
  ] as const) if (!inRange(v, lo, hi))
    fail(name, name + " must be finite and within authored bounds.");
  if (spec.subjectA && spec.subjectB &&
      finite(spec.subjectA.radiusPx) && finite(spec.subjectB.radiusPx) &&
      finite(spec.focusSeparationPx) &&
      finite(spec.clearancePx ?? DEFAULTS.clearancePx) &&
      spec.focusSeparationPx <
        spec.subjectA.radiusPx + spec.subjectB.radiusPx +
        (spec.clearancePx ?? DEFAULTS.clearancePx))
    fail("focus-spacing", "Focus centers must preserve subject bounding-circle clearance.");
  return issues;
}
function inner(spec: PairedFocusSpec): { a: Vec2; b: Vec2 } {
  return {
    a: { x: spec.focus.x - spec.focusSeparationPx / 2, y: spec.focus.y },
    b: { x: spec.focus.x + spec.focusSeparationPx / 2, y: spec.focus.y },
  };
}
interface Leg { from: Vec2; to: Vec2; begin: number; length: number; }
function subjectLeg(
  spec: PairedFocusSpec, subject: "a" | "b", leg: Leg, frame: number,
): PairedFocusSubject {
  const isA = subject === "a";
  const delayedBegin = leg.begin + (isA ? 0 : spec.staggerFrames!);
  const last = leg.begin + leg.length - 1;
  const id = isA ? spec.subjectA.id : spec.subjectB.id;
  const directionX = leg.to.x - leg.from.x;
  const directionY = leg.to.y - leg.from.y;
  const length = Math.hypot(directionX, directionY);
  const unitX = length > 0 ? directionX / length : 0;
  const unitY = length > 0 ? directionY / length : 0;
  const from = leg.from, to = leg.to;
  const base = { id, scale: 1 };
  if (frame < delayedBegin)
    return { ...base, ...from, phase: "before", progress: 0 };
  if (frame >= last)
    return { ...base, ...to, phase: "hold", progress: 1 };
  const p = (frame - delayedBegin) / (last - delayedBegin);
  if (p < ANTICIPATION_FRACTION) {
    const wave = Math.sin(Math.PI * p / ANTICIPATION_FRACTION) ** 2;
    return {
      ...base,
      x: from.x - unitX * spec.anticipationPx! * wave,
      y: from.y - unitY * spec.anticipationPx! * wave,
      phase: "anticipate", progress: 0,
    };
  }
  if (p < SETTLE_START) {
    const t = (p - ANTICIPATION_FRACTION) /
      (SETTLE_START - ANTICIPATION_FRACTION);
    const v = evaluateEasing("ease-in-out-cubic", t);
    const height = Math.sin(Math.PI * v) * spec.curvePx! * (isA ? -1 : 1);
    return {
      ...base, x: from.x + directionX * v - unitY * height,
      y: from.y + directionY * v + unitX * height,
      scale: 1 + .035 * Math.sin(Math.PI * v),
      phase: "travel", progress: v,
    };
  }
  const t = (p - SETTLE_START) / (1 - SETTLE_START);
  const wave = Math.sin(Math.PI * t) ** 2;
  return {
    ...base, x: to.x + unitX * spec.overshootPx! * wave,
    y: to.y + unitY * spec.overshootPx! * wave,
    phase: "settle", progress: 1,
  };
}
function evaluate(spec: PairedFocusSpec, frame: number, reduced: boolean): PairedFocusFrame {
  const focal = inner(spec);
  const outbound = { a: spec.outerA, b: spec.outerB };
  const exit = { a: spec.exitA ?? spec.outerA, b: spec.exitB ?? spec.outerB };
  const isRound = spec.mode === "converge-then-diverge";
  const length = spec.durationFrames;
  const hold = isRound ? spec.focusHoldFrames! : 0;
  const first = isRound ? Math.floor((length - hold) / 2) : length;
  const secondStart = spec.startFrame + first + hold;
  const end = spec.startFrame + length - 1;
  const final = spec.mode === "converge" ? focal :
    spec.mode === "diverge" ? outbound : exit;
  const starting = spec.mode === "diverge" ? focal : outbound;
  const pointSample = (id: string, pt: Vec2, phase: PairedFocusPhase, p: number): PairedFocusSubject =>
    ({ id, ...pt, phase, progress: p, scale: 1 });
  let a: PairedFocusSubject, b: PairedFocusSubject, focusStrength: number;
  if (reduced || frame >= end) {
    const phase = reduced ? "reduced-motion-final" : "hold";
    a = pointSample(spec.subjectA.id, final.a, phase, 1);
    b = pointSample(spec.subjectB.id, final.b, phase, 1);
    focusStrength = spec.mode === "converge" ? 1 : 0;
  } else if (frame < spec.startFrame) {
    a = pointSample(spec.subjectA.id, starting.a, "before", 0);
    b = pointSample(spec.subjectB.id, starting.b, "before", 0);
    focusStrength = spec.mode === "diverge" ? 1 : 0;
  } else if (isRound && frame >= spec.startFrame + first && frame < secondStart) {
    a = pointSample(spec.subjectA.id, focal.a, "focus-hold", 1);
    b = pointSample(spec.subjectB.id, focal.b, "focus-hold", 1);
    focusStrength = 1;
  } else {
    const onExit = isRound && frame >= secondStart;
    const legBegin = onExit ? secondStart : spec.startFrame;
    const legLength = onExit ? length - first - hold : first;
    const from = onExit ? focal : starting;
    const to = onExit ? exit : spec.mode === "diverge" ? outbound : focal;
    a = subjectLeg(spec, "a", { from: from.a, to: to.a, begin: legBegin, length: legLength }, frame);
    b = subjectLeg(spec, "b", { from: from.b, to: to.b, begin: legBegin, length: legLength }, frame);
    const approachProgress = Math.min(a.progress, b.progress);
    focusStrength = onExit || spec.mode === "diverge" ?
      1 - Math.max(a.progress, b.progress) : approachProgress;
  }
  return {
    frame, a, b, focusStrength,
    circleClearancePx: Math.hypot(a.x - b.x, a.y - b.y) -
      spec.subjectA.radiusPx - spec.subjectB.radiusPx,
  };
}
/** Reject unsupported authoring rather than allowing an invalid render. */
export function compilePairedFocus(input: PairedFocusSpec): PairedFocusCompilation {
  const diagnostics = validatePairedFocus(input);
  if (diagnostics.length) return { ok: false, diagnostics };
  const spec = normalized(input);
  let clearance = Infinity;
  for (let step = 0; step < spec.durationFrames; step++) {
    const frame = spec.startFrame + step;
    const state = evaluate(spec, frame, false);
    if (!inRange(state.focusStrength, 0, 1) ||
        !finite(state.circleClearancePx))
      return { ok: false, diagnostics: [
        problem("numeric", "Nonfinite or out-of-range compiled motion.", frame)] };
    for (const [subject, radius] of [
      [state.a, spec.subjectA.radiusPx],
      [state.b, spec.subjectB.radiusPx],
    ] as const) {
      const edge = spec.safeMarginPx!;
      if (!finite(subject.x) || !finite(subject.y) ||
          subject.x - radius < edge - 1e-6 ||
          subject.y - radius < edge - 1e-6 ||
          subject.x + radius > spec.stage.width - edge + 1e-6 ||
          subject.y + radius > spec.stage.height - edge + 1e-6)
        return { ok: false, diagnostics: [
          problem("bounds", "A subject exceeds the safe viewport.", frame)] };
    }
    clearance = Math.min(clearance, state.circleClearancePx);
    if (state.circleClearancePx < spec.clearancePx! - 1e-6)
      return { ok: false, diagnostics: [
        problem("collision", "The authored subjects violate required separation.", frame)] };
  }
  return {
    ok: true, diagnostics: [],
    plan: { spec, checkedFrameCount: spec.durationFrames,
            minSampledClearancePx: clearance },
  };
}
/** Exact integer-frame evaluation; supports arbitrary seek order. */
export function evaluatePairedFocus(
  plan: PairedFocusPlan, frame: number, reducedMotion = false,
): PairedFocusFrame {
  if (!Number.isSafeInteger(frame))
    throw new Error("Paired focus requires an absolute integer frame.");
  return evaluate(plan.spec, frame, reducedMotion);
}
