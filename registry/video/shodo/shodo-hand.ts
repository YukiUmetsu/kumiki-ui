/**
 * SHO1 hand: turns glyph centrelines and a style into timed brush motion.
 *
 * Every stroke is written as 始筆 (start) → 送筆 (move, with 転折 turns) → 終筆 (end),
 * the "トン・スー・トン" rhythm. The start is 打ち込み, 蔵鋒 or 露鋒; the end is 止め,
 * 撥ね, 払い or 懸針. Each technique is a generated move with its own pressure and
 * timing, so the mark's head, shoulders and tail come from motion, not from drawn shapes.
 *
 * Pure: the plan depends only on its input. Sample `shodoBrushPose(plan, seconds)` in any
 * order. Units: design pixels and seconds.
 */
import { resolveEnd, resolveStart, shodoJoinStrokes } from "./shodo-glyphs";
import type { ShodoEnd, ShodoGlyph, ShodoPoint, ShodoStart, ShodoStrokeKind, ShodoStrokeSpec } from "./shodo-glyphs";
import { assertShodoStyle, shodoNoise } from "./shodo-style";
import type { ShodoInk, ShodoStyle } from "./shodo-style";

export type ShodoPhase = "kihitsu" | "sohitsu" | "tensetsu" | "shuhitsu" | "renmen";
export type ShodoTechnique = ShodoStart | ShodoEnd | "ten" | "okuri" | "orehi" | "magari" | "itohiki";

export interface ShodoLayoutItem {
  glyph: ShodoGlyph;
  /** Top-left of the 1000-unit em box, design px. */
  x: number;
  y: number;
  /** Side of the em box, design px. */
  size: number;
  /**
   * Ink for chosen strokes (by stroke index), for example a teacher's vermilion (朱墨)
   * stroke. The brush visits the inkstone to change ink, and this ink has its own load.
   */
  strokeInk?: Readonly<Record<number, Partial<ShodoInk>>>;
}

export interface ShodoWritingInput {
  items: readonly ShodoLayoutItem[];
  style: ShodoStyle;
  /** Seconds the brush hovers before it moves in. */
  lead?: number;
  /** Seconds held after the last lift. */
  tail?: number;
  /** Where the brush rests in the air before and after writing, design px. */
  rest?: ShodoPoint;
  /** Inkstone well for 墨継ぎ, design px; may lie outside the frame. */
  inkstone?: ShodoPoint;
  /** After the last stroke: return to `rest`, or hover just past the last stroke's end. */
  exit?: "rest" | "hover";
}

/** One contact sample, design px. */
export interface ShodoContact {
  t: number;
  x: number;
  y: number;
  /** Tuft press, 0..1 (0 = the tip only, 1 = pressed to the ferrule). */
  p: number;
  /** Unit vector from the patch centre toward the gathered tip (穂先). */
  tx: number;
  ty: number;
  /** Unit motion direction and speed in px/s. */
  vx: number;
  vy: number;
  speed: number;
  /** Ink left in the brush, 0..1. */
  ink: number;
  /** Arc length since the stroke began, px. */
  arc: number;
  /** Contact width across the tip axis and contact length along it, px. */
  width: number;
  length: number;
  phase: ShodoPhase;
  technique: ShodoTechnique;
  /** Step within the technique; see `SHODO_TECHNIQUE_STEPS`. */
  step: number;
  /**
   * Handle lean as a vector in degrees: its length is the lean from vertical, its direction
   * is where the handle top points on the paper. See `shodoHandLean`.
   */
  lx: number;
  ly: number;
}

export interface ShodoPlannedStroke {
  /** Order of writing across the whole text. */
  order: number;
  item: number;
  stroke: number;
  kind: ShodoStrokeKind | "link";
  start: ShodoStart;
  end: ShodoEnd;
  t0: number;
  t1: number;
  samples: readonly ShodoContact[];
  /** Tight bounds of every contact patch, design px: [minX, minY, maxX, maxY]. */
  bounds: readonly [number, number, number, number];
  /** The ink this stroke was written with. */
  ink: ShodoInk;
}

export interface ShodoAirMove {
  t0: number;
  t1: number;
  /** Cubic Bézier in xy, design px, with a lift profile in z. */
  from: ShodoPoint;
  c1: ShodoPoint;
  c2: ShodoPoint;
  to: ShodoPoint;
  height: number;
  /** Tip height at the start and end of the move (non-zero only at the rest pose). */
  z0: number;
  z1: number;
  /** Tip direction and spring-back amount when the brush left the paper. */
  leaveTip: ShodoPoint;
  leavePress: number;
  /** Handle lean vector (degrees) when the brush left the paper. */
  leaveLean: ShodoPoint;
  ink: number;
  dip: boolean;
  /** Ink colour on the tuft before and after the move (they differ when a dip changes ink). */
  color: string;
  nextColor: string;
}

export interface ShodoPlan {
  duration: number;
  strokes: readonly ShodoPlannedStroke[];
  air: readonly ShodoAirMove[];
  /** Brush tuft dimensions for the renderer, design px at the first item's size. */
  brush: { diameter: number; tuftLength: number };
  style: ShodoStyle;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const norm = (x: number, y: number): [number, number] => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const DT = 1 / 240;

/** Share of the contact patch that lies on the tip side of the contact centre. */
export const SHODO_TIP_SHARE = .44;

/** Contact width as a function of press, in units of the tuft diameter. */
export function shodoContactWidth(p: number, stiffness: number): number {
  const spread = 1 + .28 * (1 - stiffness);
  return (.07 + 1.1 * (1 - Math.pow(1 - clamp(p, 0, 1), 1.8))) * spread;
}
/** Contact length along the tip axis, in units of the tuft length. */
export function shodoContactLength(p: number): number {
  // A pressed tuft lies on the paper as a seed about 1.6 times as long as it is wide
  // (measured on slow-motion dot and stroke frames), not as a round dab.
  return .04 + .8 * clamp(p, 0, 1);
}

// ── Centreline helpers ─────────────────────────────────────────────────────────────

type V = [number, number];
/** Centripetal Catmull-Rom through points, sampled densely. */
function spline(points: readonly V[], step: number): V[] {
  if (points.length === 2) {
    const [a, b] = points, n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    return Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)] as V);
  }
  const out: V[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([
        .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}
function arcTable(path: readonly V[]): number[] {
  const a = [0];
  for (let i = 1; i < path.length; i++) a.push(a[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return a;
}
function at(path: readonly V[], arcs: readonly number[], s: number): V {
  const total = arcs[arcs.length - 1];
  const target = clamp(s, 0, total);
  let lo = 0, hi = arcs.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (arcs[mid] < target) lo = mid; else hi = mid; }
  const span = arcs[hi] - arcs[lo] || 1, t = (target - arcs[lo]) / span;
  return [lerp(path[lo][0], path[hi][0], t), lerp(path[lo][1], path[hi][1], t)];
}

// ── Segment program ────────────────────────────────────────────────────────────────

interface Segment {
  /** Seconds at speed 1, before the hand's speed is applied. */
  duration: number;
  /** Position at fraction u of the segment. */
  pos: (u: number) => V;
  /** Press at fraction u. */
  press: (u: number) => number;
  /** Time warp: fraction of path covered at time fraction t. */
  warp?: (t: number) => number;
  phase: ShodoPhase;
  technique: ShodoTechnique;
  /** Step of the technique (see `SHODO_TECHNIQUE_STEPS`). */
  step?: number;
  /** Lets the hair trail freely behind fast motion. */
  follow?: number;
  /** Pause-type segments are scaled by `hand.pause`. */
  pause?: boolean;
}

interface StrokeContext {
  style: ShodoStyle;
  /** Travel press for this stroke. */
  pt: number;
  /** Visual stroke width at travel press, em units (used for move distances). */
  w: number;
  seed: number;
}

const line = (a: V, b: V) => (u: number): V => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const hold = (p: V) => (): V => p;
const ramp = (a: number, b: number, ease = smooth) => (u: number) => lerp(a, b, ease(u));
/** Script factor: kaisho makes every technique in full; cursive scripts abbreviate them. */
const scriptK = (style: ShodoStyle, gyosho: number, sosho: number) =>
  style.hand.script === "kaisho" ? 1 : style.hand.script === "gyosho" ? gyosho : sosho;

/**
 * Split a segment at path fraction `u` so each part can carry its own phase and step,
 * without changing the motion: both halves read the parent's warped position and press.
 */
function split(seg: Segment, u: number, a: Partial<Segment>, b: Partial<Segment>): [Segment, Segment] {
  const warp = seg.warp ?? (t => t);
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (warp(m) < u) lo = m; else hi = m; }
  const tf = clamp((lo + hi) / 2, .02, .98);
  const map = (x: number, from: number, to: number) => warp(from + (to - from) * x);
  const base = { phase: seg.phase, technique: seg.technique, step: seg.step, follow: seg.follow, pause: seg.pause };
  return [
    { ...base, ...a, duration: seg.duration * tf, warp: undefined, pos: x => seg.pos(map(x, 0, tf)), press: x => seg.press(map(x, 0, tf)) },
    { ...base, ...b, duration: seg.duration * (1 - tf), warp: undefined, pos: x => seg.pos(map(x, tf, 1)), press: x => seg.press(map(x, tf, 1)) },
  ];
}

/** 45° entry/stop press direction, measured clockwise from +x (screen space, y down). */
function pressDirection(style: ShodoStyle, toward?: V): V {
  const a = style.hand.entryAngle * Math.PI / 180;
  const fixed: V = [Math.cos(a), Math.sin(a)];
  if (!toward) return fixed;
  return norm(fixed[0] * .65 + toward[0] * .35, fixed[1] * .65 + toward[1] * .35);
}

/** 始筆 / 起筆: put the brush to the paper. */
function startSegments(start: ShodoStart, p0: V, dir: V, runLength: number, ctx: StrokeContext, joined = false): { segs: Segment[]; land: V } {
  const { pt, w, style } = ctx, T = style.technique;
  if (start === "roho") {
    // 露鋒: land with the tip while already travelling; the press builds along the run.
    return { segs: [], land: p0 };
  }
  if (start === "zoho") {
    // 蔵鋒 (逆入平出): touch slightly inside, push back against the direction, fold the tip in.
    const r = T.zohoReverse;
    const touch: V = [p0[0] + dir[0] * .58 * r * w, p0[1] + dir[1] * .58 * r * w];
    const back: V = [p0[0] - dir[0] * .42 * r * w - dir[1] * .06 * w, p0[1] - dir[1] * .42 * r * w + dir[0] * .06 * w];
    const fold = clamp(pt * 1.18, 0, .97);
    return {
      land: touch,
      segs: [
        { duration: .13, pos: line(touch, back), press: ramp(.05, fold), phase: "kihitsu", technique: "zoho", step: 0, follow: .9 },
        { duration: .06, pos: hold(back), press: ramp(fold, pt * 1.12), phase: "kihitsu", technique: "zoho", step: 1, pause: true },
      ],
    };
  }
  // 打ち込み: the tip lands upper-left, presses toward the lower right, holds, eases back.
  // A short stroke gets a smaller press, or the head would swallow it.
  // A head that starts on another stroke (接筆) is small: it disappears into that line.
  const k = scriptK(style, .7, .45) * clamp(runLength / (2.4 * w), .45, 1) * (joined ? .4 : 1);
  const pd = pressDirection(style);
  const reach = T.uchikomiReach;
  // The tip lands up-left of the line and the press ends ON the line: the head rises above
  // the top edge as a pointed corner instead of hanging below the stroke.
  const touch: V = [p0[0] - pd[0] * reach * w * k, p0[1] - pd[1] * reach * w * k];
  const pressed: V = [p0[0] + dir[0] * .06 * w * k, p0[1] + dir[1] * .06 * w * k];
  const peak = clamp(pt * (1 + T.uchikomiDepth * k), 0, .97);
  return {
    land: touch,
    segs: [
      // The tip touches first and the hand keeps coming down as it presses (no jump).
      { duration: .13 + .03 * k, pos: line(touch, pressed), press: ramp(.03, peak, t => 1 - Math.pow(1 - smooth(t), 1.6)), phase: "kihitsu", technique: "uchikomi", step: 0 },
      { duration: T.uchikomiHold * k, pos: hold(pressed), press: ramp(peak, peak * .96), phase: "kihitsu", technique: "uchikomi", step: 1, pause: true },
    ],
  };
}

/** Base travel speed per kind, em units (1000 = one em) per second at hand.speed 1. */
const TRAVEL: Record<ShodoStrokeKind, number> = {
  dot: 420, horizontal: 720, vertical: 640, "left-sweep": 780, "right-sweep": 600, rise: 900, turn: 680, curve: 640,
};

/** 送筆: one run of the centreline, with the start's ease-back and the end's lift built in. */
function runSegments(
  path: V[], ctx: StrokeContext, kind: ShodoStrokeKind, opts: {
    pressFrom: number; pressTo: number; pressMid?: number; lastRun: boolean; firstRun: boolean;
    end: ShodoEnd; start: ShodoStart; pressedStart: boolean; strokeArc0: number; strokeArcTotal: number;
  },
): Segment[] {
  const arcs = arcTable(path), total = arcs[arcs.length - 1];
  const { style, seed } = ctx, T = style.technique;
  const sweepOut = opts.lastRun && (opts.end === "harai" || opts.end === "nuki") && kind !== "right-sweep";
  const liftFrom = opts.end === "nuki" ? T.kenshinLift : T.haraiLift;
  const roho = opts.firstRun && !opts.pressedStart;
  const ease = opts.firstRun ? T.easeBack : .2;
  const speed = TRAVEL[kind] * (sweepOut ? 1.15 : 1);
  const tremor = style.hand.tremor, decay = style.hand.widthDecay;
  const press = (u: number) => {
    let p: number;
    if (roho) {
      // 露鋒: the press builds from the bare tip.
      p = u < T.rohoBuild ? lerp(.03, opts.pressTo, smooth(u / T.rohoBuild)) : opts.pressTo;
    } else {
      // The ease back after a press: the hand lifts gradually as it starts to travel.
      p = u < ease ? lerp(opts.pressFrom, opts.pressTo, smooth(u / ease)) : opts.pressTo;
    }
    if (opts.pressMid !== undefined) p *= lerp(1, opts.pressMid, Math.sin(Math.PI * clamp(u, 0, 1)));
    if (sweepOut) {
      // 払い / 懸針: lift progressively while still moving.
      const lift = smooth((u - liftFrom) / (1 - liftFrom));
      p *= Math.pow(1 - lift, opts.end === "nuki" ? 1.25 : 1.05);
    }
    const s = (opts.strokeArc0 + u * total) / Math.max(1, opts.strokeArcTotal);
    p *= 1 - decay * s;
    p *= 1 + tremor * .07 * (shodoNoise(seed, s * 3.1, 7) - .5) * 2;
    return clamp(p, 0, .98);
  };
  const wobble = tremor * .006 * ctx.w * 6;
  const pos = (u: number): V => {
    const q = at(path, arcs, u * total);
    if (!wobble) return q;
    const s = opts.strokeArc0 + u * total;
    const before = at(path, arcs, Math.max(0, u * total - 2)), after = at(path, arcs, Math.min(total, u * total + 2));
    const [nx, ny] = norm(-(after[1] - before[1]), after[0] - before[0]);
    const n = (shodoNoise(seed + 9, s / 180, 3) - .5) * 2 * wobble * Math.sin(Math.PI * u);
    return [q[0] + nx * n, q[1] + ny * n];
  };
  // Arm motion: ease in from the press, cruise, ease toward a stop; sweeps accelerate out.
  const warp = sweepOut
    ? (t: number) => lerp(t, Math.pow(t, 1.45), .75)
    : (t: number) => lerp(t, smooth(t), .55);
  let segs: Segment[] = [{
    duration: total / speed + .02, pos, press, warp, phase: "sohitsu", technique: "okuri", step: 0,
  }];
  // Label the parts of the run that belong to the start or the end technique.
  if (sweepOut) {
    const [a, b] = split(segs[0], liftFrom, {}, { phase: "shuhitsu", technique: opts.end, step: 0, follow: .7 });
    segs = [a, b];
  }
  if (opts.firstRun) {
    const head = roho ? T.rohoBuild : ease;
    const label: Partial<Segment> = roho ? { phase: "kihitsu", technique: "roho", step: 0 }
      : { phase: "kihitsu", technique: opts.start, step: opts.start === "zoho" ? 2 : 2 };
    const [a, b] = split(segs[0], sweepOut ? head / liftFrom * .999 : head, label, {});
    segs = [a, b, ...segs.slice(1)];
  }
  return segs;
}

/** 転折: slight lift at the corner, a short 45° re-press along the bisector, a hold. */
function turnSegments(corner: V, din: V, dout: V, shortest: number, ctx: StrokeContext): Segment[] {
  const { pt, w, style } = ctx, T = style.technique;
  if (style.hand.script === "sosho") return [];
  const k = scriptK(style, .55, 0) * clamp(shortest / (2.6 * w), .3, 1);
  // The shoulder (肩): lift a little and step out past the corner, then press down along
  // the new direction with the tip held up-left. The press bulges only on the outside.
  const out: V = norm(din[0] - dout[0], din[1] - dout[1]);
  const lifted: V = [corner[0] + out[0] * .12 * w * k, corner[1] + out[1] * .12 * w * k];
  const pressed: V = [corner[0] + dout[0] * T.tensetsuShoulder * w * k, corner[1] + dout[1] * T.tensetsuShoulder * w * k];
  const peak = clamp(pt * (1 + T.tensetsuPress * k), 0, .97);
  return [
    { duration: .06 * k + .01, pos: line(corner, lifted), press: ramp(pt * .86, pt * .6), phase: "tensetsu", technique: "orehi", step: 0, follow: 0 },
    { duration: .1 * k + .02, pos: line(lifted, pressed), press: ramp(pt * .6, peak), phase: "tensetsu", technique: "orehi", step: 1, follow: 0 },
    { duration: T.tensetsuHold * k, pos: hold(pressed), press: ramp(peak, peak * .95), phase: "tensetsu", technique: "orehi", step: 2, pause: true, follow: 0 },
  ];
}

/** 終筆 / 収筆: stop or leave the paper. */
function endSegments(
  end: ShodoEnd, kind: ShodoStrokeKind, e: V, dir: V, hook: V | undefined, ctx: StrokeContext, runLength: number, joined = false,
): Segment[] {
  const { pt, w, style } = ctx, T = style.technique;
  let k = scriptK(style, .6, .3);
  if (end === "tome" && joined) {
    // A stop inside another stroke (接筆): settle, then lift with the tip held. No knob.
    const out: V = [e[0] - dir[0] * .08 * w, e[1] - dir[1] * .08 * w];
    return [
      { duration: .05, pos: hold(e), press: ramp(pt, pt * .95), phase: "shuhitsu", technique: "tome", step: 2, pause: true, follow: 0 },
      { duration: .1, pos: line(e, out), press: ramp(pt * .95, 0, t => Math.pow(t, .7)), phase: "shuhitsu", technique: "tome", step: 3, follow: 0 },
    ];
  }
  if (end === "tome") {
    // Teachers make big stops on long main strokes and quiet ones on short strokes.
    k *= clamp(runLength / (4.5 * w), .35, 1);
    const vertical = Math.abs(dir[1]) > Math.abs(dir[0]);
    // 垂露 on a vertical is a small dewdrop, not a ball.
    if (vertical) k *= T.suiro;
    // 止め, after 2× crops of teachers' models: the brush steps forward and toward the tip
    // side, so the knob stands above the line; it presses forward with the tip held, which
    // cuts the end on a diagonal with the bulge on the belly side; then it lifts straight
    // out, so the end never turns into a ball. `down` is the side away from the tip
    // (below a horizontal, right of a vertical).
    const tipA = style.hand.tipAngle * Math.PI / 180;
    const n1: V = [-dir[1], dir[0]];
    const down: V = n1[0] * Math.cos(tipA) + n1[1] * Math.sin(tipA) > 0 ? [-n1[0], -n1[1]] : n1;
    const lifted: V = [e[0] + dir[0] * .06 * w * k - down[0] * .18 * w * k, e[1] + dir[1] * .06 * w * k - down[1] * .18 * w * k];
    const pressed: V = [lifted[0] + dir[0] * T.tomeReach * w * k, lifted[1] + dir[1] * T.tomeReach * w * k];
    const out: V = [pressed[0] - dir[0] * .06 * w - down[0] * .04 * w, pressed[1] - dir[1] * .06 * w - down[1] * .04 * w];
    const peak = clamp(pt * (1 + T.tomePress * k), 0, .97);
    return [
      { duration: .06 * k + .01, pos: line(e, lifted), press: ramp(pt * .98, pt * .9), phase: "shuhitsu", technique: "tome", step: 0, follow: 0 },
      { duration: .11 * k + .03, pos: line(lifted, pressed), press: ramp(pt * .9, peak), phase: "shuhitsu", technique: "tome", step: 1, follow: 0 },
      { duration: T.tomeHold * k, pos: hold(pressed), press: ramp(peak, peak * .97), phase: "shuhitsu", technique: "tome", step: 2, pause: true, follow: 0 },
      { duration: .12, pos: line(pressed, out), press: ramp(peak * .97, 0, t => Math.pow(t, .7)), phase: "shuhitsu", technique: "tome", step: 3, follow: 0 },
    ];
  }
  if (end === "hane") {
    // 撥ね: 溜め at the bottom, a short 45° line, then a quick flick in the hook direction.
    const h = norm(...(hook ?? [-.78, -.62]));
    const short = norm(dir[0] * .4 + h[0] * .2 - .5, dir[1] * .4 + h[1] * .2 + .5);
    const s1: V = [e[0] + short[0] * .1 * w, e[1] + short[1] * .1 * w];
    const tipEnd: V = [s1[0] + h[0] * T.haneLength * w, s1[1] + h[1] * T.haneLength * w];
    return [
      { duration: T.haneHold * k, pos: hold(e), press: ramp(pt, pt * 1.04), phase: "shuhitsu", technique: "hane", step: 0, pause: true },
      { duration: .06, pos: line(e, s1), press: ramp(pt * 1.04, pt * 1.06), phase: "shuhitsu", technique: "hane", step: 1 },
      { duration: T.haneSpeed, pos: line(s1, tipEnd), press: ramp(pt * 1.06, 0, t => Math.pow(t, 1.15)), warp: t => Math.pow(t, .85),
        phase: "shuhitsu", technique: "hane", step: 2, follow: 1 },
    ];
  }
  if (end === "harai" && kind === "right-sweep") return []; // handled by the foot program
  // 払い / 懸針: the run already lifted; leave the paper still moving.
  const out: V = [e[0] + dir[0] * .12 * w, e[1] + dir[1] * .12 * w];
  return [{ duration: .03, pos: line(e, out), press: () => 0, phase: "shuhitsu", technique: end, step: 1, follow: .8 }];
}

/** The full program of one stroke, in em units. */
function strokeProgram(spec: ShodoStrokeSpec, base: ShodoStyle, seed: number, strokeCount: number): { segs: Segment[]; land: V; start: ShodoStart; end: ShodoEnd } {
  // A stroke's own technique settings (a teacher's head, stop or lift) override the style's.
  const style: ShodoStyle = spec.technique ? { ...base, technique: { ...base.technique, ...spec.technique } } : base;
  const T = style.technique;
  const D = style.brush.diameter * style.hand.width;
  const weight = spec.weight ?? 1;
  // Kaisho contrast: horizontals clearly lighter than verticals.
  const kindPress = spec.kind === "horizontal" ? .84 : 1;
  // Dense characters are written with a lighter hand so their counters stay open.
  const density = clamp(1.16 - .04 * strokeCount, .6, 1.06);
  // Base press calibrated so ink coverage matches a teacher's kaisho models (411 characters).
  const pt = clamp(.27 * style.hand.pressure * weight * kindPress * density, .05, .92);
  const w = D * shodoContactWidth(pt, style.brush.stiffness);
  const ctx: StrokeContext = { style, pt, w, seed };
  const start = resolveStart(spec), end = resolveEnd(spec);
  const pts = spec.points.map(p => [p[0], p[1]] as V);
  const segs: Segment[] = [];

  if (spec.kind === "dot") {
    // 点 (studied frame by frame): the tip lands, then the tuft is PRESSED almost in place
    // along 45° so its own footprint makes the seed shape; a hold leaves a glossy pool;
    // the brush gathers with a small turn down-left and lifts.
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const d = norm(b[0] - a[0], b[1] - a[1]);
    const peak = clamp(pt * (1 + T.tenPress), 0, .97);
    // A dot is about one and a half stroke widths long: most of its length is the pressed
    // footprint, so the brush travels only part of the authored line.
    const span = clamp(1.05 * w / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1])), .25, .6);
    const land: V = [lerp(a[0], b[0], .5 - span / 2), lerp(a[1], b[1], .5 - span / 2)];
    const pressed: V = [lerp(a[0], b[0], .5 + span / 2), lerp(a[1], b[1], .5 + span / 2)];
    // The press path bows slightly outward, giving the convex upper edge of a real dot.
    const bow: V = [(land[0] + pressed[0]) / 2 - d[1] * .16 * w, (land[1] + pressed[1]) / 2 + d[0] * .16 * w];
    const bowed = (u: number): V => { const q = 1 - u; return [q * q * land[0] + 2 * q * u * bow[0] + u * u * pressed[0], q * q * land[1] + 2 * q * u * bow[1] + u * u * pressed[1]]; };
    const back: V = [b[0] - d[0] * .18 * w - .12 * w, b[1] - d[1] * .18 * w + .05 * w];
    segs.push(
      { duration: .2, pos: bowed, press: ramp(.04, peak, t => 1 - Math.pow(1 - smooth(t), 1.8)), warp: t => lerp(t, smooth(t), .6), phase: "kihitsu", technique: "ten", step: 0 },
      { duration: T.tenHold, pos: line(pressed, b), press: ramp(peak, peak * .98), phase: "shuhitsu", technique: "ten", step: 1, pause: true },
      { duration: .14, pos: line(b, back), press: ramp(peak * .98, 0, t => Math.pow(t, .7)), phase: "shuhitsu", technique: "ten", step: 2, follow: .45 },
    );
    return { segs, land, start: "uchikomi", end: "tome" };
  }

  const turns = [...(spec.turns ?? [])].sort((x, y) => x - y);
  const breaks = [0, ...turns, pts.length - 1];
  let footRun: V[] | null = null;
  if (spec.kind === "right-sweep" && end === "harai" && pts.length >= 3) {
    // 右払い: the last point pair is the pull-out from the pressed foot.
    footRun = [pts[pts.length - 2], pts[pts.length - 1]];
    breaks[breaks.length - 1] = pts.length - 2;
  }
  const runs: V[][] = [];
  for (let i = 0; i < breaks.length - 1; i++) runs.push(spline(pts.slice(breaks[i], breaks[i + 1] + 1), 4));
  const runLengths = runs.map(r => arcTable(r)[r.length - 1]);
  const total = runLengths.reduce((a, b) => a + b, 0) + (footRun ? Math.hypot(footRun[1][0] - footRun[0][0], footRun[1][1] - footRun[0][1]) : 0);
  const dirAt = (r: V[], fromEnd: boolean): V => {
    const n = r.length, i = fromEnd ? Math.max(0, n - 4) : 0, j = fromEnd ? n - 1 : Math.min(n - 1, 3);
    return norm(r[j][0] - r[i][0], r[j][1] - r[i][1]);
  };

  const begin = startSegments(start, runs[0][0], dirAt(runs[0], false), runLengths[0], ctx, spec.joinStart);
  segs.push(...begin.segs);
  // Bridge from the press position back onto the centreline, easing the press to travel.
  const landedAt = begin.segs.length ? begin.segs[begin.segs.length - 1].pos(1) : runs[0][0];
  const entryPeak = begin.segs.length ? begin.segs[begin.segs.length - 1].press(1) : .03;
  let arc0 = 0;
  runs.forEach((run, i) => {
    const first = i === 0, last = i === runs.length - 1 && !footRun;
    let path = run;
    if (first && begin.segs.length) {
      // Join the pressed head to the line a little way along it (the ease back).
      const arcs = arcTable(run), join = Math.min(arcs[arcs.length - 1] * .4, .75 * w);
      const rest = run.filter((_, j) => arcs[j] >= join);
      path = [landedAt, ...rest];
    }
    const sweepPeak = spec.kind === "right-sweep" ? clamp(pt * 1.28, 0, .97) : pt;
    const mid = spec.kind === "horizontal" && !spec.turns?.length ? .88 : undefined;
    const run0 = segs.length;
    const runKind: ShodoStrokeKind = footRun ? "right-sweep" : spec.kind === "turn"
      ? (Math.abs(dirAt(run, false)[1]) > Math.abs(dirAt(run, false)[0]) ? "vertical" : "horizontal") : spec.kind;
    // Inside a 転折 stroke the horizontal run is lighter than the vertical run, as in kaisho.
    const runPress = spec.kind === "turn" ? (runKind === "horizontal" ? .86 : 1.06) : 1;
    segs.push(...runSegments(path, ctx, runKind, {
      pressFrom: first ? (begin.segs.length ? entryPeak : .03) : pt * 1.26 * runPress,
      pressTo: (footRun ? sweepPeak : pt) * runPress, pressMid: footRun ? undefined : mid,
      firstRun: first, lastRun: last, end, start, pressedStart: begin.segs.length > 0,
      strokeArc0: arc0, strokeArcTotal: total,
    }));
    if (footRun && first) {
      // A right sweep swells toward its foot. After a 打ち込み head it narrows gently
      // first, so the head never reads as a separate arrowhead.
      const pressed = begin.segs.length > 0;
      const parts = segs.slice(run0);
      const durations = parts.map(sg => sg.duration), all = durations.reduce((x, y) => x + y, 0);
      let acc = 0;
      parts.forEach((sg, j) => {
        const from = acc / all, span = durations[j] / all, base = sg.press;
        acc += durations[j];
        // Approximate the run fraction by its time share; the swell is gentle enough.
        sg.press = u => {
          const r = from + span * u;
          return base(u) * (pressed
            ? (r < .12 ? lerp(1, .6, smooth(r / .12)) : lerp(.6, 1.12, Math.pow(smooth((r - .12) / .88), 1.3)))
            : lerp(.72, 1, smooth(r)));
        };
      });
    }
    arc0 += runLengths[i];
    if (i < runs.length - 1) segs.push(...turnSegments(run[run.length - 1], dirAt(run, true), dirAt(runs[i + 1], false),
      Math.min(runLengths[i], runLengths[i + 1]), ctx));
  });
  if (footRun) {
    // Foot: pause and press (溜め), turn the hair flat, then pull out to the chisel end.
    const [f, e] = footRun;
    const peak = clamp(pt * (1 + T.footPress), 0, .97);
    const outDir = norm(e[0] - f[0], e[1] - f[1]);
    const exit: V = [e[0] + outDir[0] * T.pullOut * w, e[1] + outDir[1] * T.pullOut * w];
    const k = scriptK(style, .5, .5);
    segs.push(
      { duration: T.footHold * k + .02, pos: hold(f), press: ramp(pt * 1.28, peak), phase: "shuhitsu", technique: "harai", step: 2, pause: true },
      { duration: Math.hypot(e[0] - f[0], e[1] - f[1]) / 480 + .06, pos: line(f, exit), press: ramp(peak, 0, t => Math.pow(t, 1.5)),
        warp: t => lerp(t, smooth(t), .3), phase: "shuhitsu", technique: "harai", step: 3, follow: .25 },
    );
  } else {
    const lastRun = runs[runs.length - 1];
    segs.push(...endSegments(end, spec.kind, lastRun[lastRun.length - 1], dirAt(lastRun, true), spec.hook ? [spec.hook[0], spec.hook[1]] : undefined, ctx,
      runLengths[runLengths.length - 1], spec.joinEnd));
  }
  return { segs, land: begin.land, start, end };
}

// ── Sampling ───────────────────────────────────────────────────────────────────────

interface Placed { item: ShodoLayoutItem; scale: number }
const toPx = (pl: Placed, p: V): V => [pl.item.x + p[0] * pl.scale, pl.item.y + p[1] * pl.scale];

/** The hand's resting lean vector (degrees): the handle top points toward the writer's hand. */
export function shodoRestLean(style: ShodoStyle): V {
  const a = style.hand.leanAzimuth * Math.PI / 180;
  return [style.hand.lean * Math.cos(a), style.hand.lean * Math.sin(a)];
}

/**
 * Target handle lean (degree vector) for one contact sample. Studied on side-view writing:
 * - pressing stands the brush up (the hand comes down; 筆を立てる);
 * - in travel the handle top leans a little toward the direction of travel (順筆; more
 *   with 側筆, "ほんの少し、進行方向に");
 * - a 払い or 懸針 follows through toward its sweep as the brush lifts;
 * - a 撥ね flick throws the handle toward the hook;
 * - a 逆筆 (蔵鋒) reverse entry is pushed, so the handle leans against that motion.
 */
export function shodoHandLean(
  style: ShodoStyle, p: number, ux: number, uy: number, speed: number, D: number,
  technique: ShodoTechnique, step: number,
): V {
  const [rx, ry] = shodoRestLean(style);
  const stand = 1 - .36 * smooth(p / .45) * (technique === "tome" && step >= 1 && step <= 2 ? 1.25 : 1);
  const moving = smooth(speed / (1.4 * D));
  let travel = (3 + 22 * style.hand.sideBrush) * moving;
  if ((technique === "harai" || technique === "nuki") && step <= 1) travel += 12 * moving;
  if (technique === "hane" && step === 2) travel += 16;
  if (technique === "zoho" && step === 0) travel = -8 * moving;
  return [rx * stand + ux * travel, ry * stand + uy * travel];
}

function sampleProgram(
  segs: Segment[], placed: Placed, style: ShodoStyle, t0: number, inkStart: number,
): { samples: ShodoContact[]; ink: number } {
  const speed = style.hand.speed, pauseScale = style.hand.pause;
  const D = style.brush.diameter * style.hand.width * placed.scale;
  const L = D * style.brush.length;
  const raw: { t: number; x: number; y: number; p: number; phase: ShodoPhase; technique: ShodoTechnique; step: number; follow?: number }[] = [];
  let t = t0;
  for (const seg of segs) {
    const duration = seg.duration * (seg.pause ? pauseScale : 1) / speed;
    if (duration <= 0) continue;
    const n = Math.max(1, Math.ceil(duration / DT));
    for (let i = raw.length ? 1 : 0; i <= n; i++) {
      const tf = i / n, u = seg.warp ? seg.warp(tf) : tf;
      const [x, y] = toPx(placed, seg.pos(u));
      raw.push({ t: t + tf * duration, x, y, p: seg.press(u), phase: seg.phase, technique: seg.technique, step: seg.step ?? 0, follow: seg.follow });
    }
    t += duration;
  }
  // Velocity, the hair's tip direction (with lag), ink spending and patch size.
  const a = style.hand.tipAngle * Math.PI / 180;
  const base: V = [Math.cos(a), Math.sin(a)];
  const tau = .045 + .06 * (1 - style.brush.stiffness);
  let tip: V = base, ink = inkStart, arc = 0;
  // The hand turns the brush quickly but not instantly (fingers and wrist).
  let lean: V = shodoRestLean(style);
  const leanTau = .085;
  const samples: ShodoContact[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i], prev = raw[Math.max(0, i - 1)], next = raw[Math.min(raw.length - 1, i + 1)];
    const dt = Math.max(1e-6, next.t - prev.t);
    const vx = (next.x - prev.x) / dt, vy = (next.y - prev.y) / dt;
    const sp = Math.hypot(vx, vy);
    const [ux, uy] = sp > 1e-3 ? [vx / sp, vy / sp] : [0, 0];
    const follow = clamp((r.follow ?? style.hand.tipFollow) * smooth(sp / (2.2 * D)), 0, 1);
    const target = sp > 1e-3 ? norm(base[0] * (1 - follow) - ux * follow, base[1] * (1 - follow) - uy * follow) : base;
    const step = i ? r.t - raw[i - 1].t : 0;
    const k = 1 - Math.exp(-step / tau);
    tip = norm(lerp(tip[0], target[0], k), lerp(tip[1], target[1], k));
    if (i) arc += Math.hypot(r.x - raw[i - 1].x, r.y - raw[i - 1].y);
    const dist = i ? Math.hypot(r.x - raw[i - 1].x, r.y - raw[i - 1].y) / placed.scale : 0;
    ink = Math.max(0, ink - style.ink.decay * (dist / 1000 * (.55 + .9 * r.p) + step * .05 * r.p));
    const want = shodoHandLean(style, r.p, ux, uy, sp, D, r.technique, r.step);
    const kl = 1 - Math.exp(-step / leanTau);
    lean = [lerp(lean[0], want[0], kl), lerp(lean[1], want[1], kl)];
    samples.push({
      t: r.t, x: r.x, y: r.y, p: r.p, tx: tip[0], ty: tip[1], vx: ux, vy: uy, speed: sp, ink, arc,
      width: D * shodoContactWidth(r.p, style.brush.stiffness) * (.86 + .14 * Math.sqrt(ink)),
      length: L * shodoContactLength(r.p),
      phase: r.phase, technique: r.technique, step: r.step, lx: lean[0], ly: lean[1],
    });
  }
  return { samples, ink };
}

function bounds(samples: readonly ShodoContact[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of samples) {
    const r = Math.max(s.width, s.length) * .75 + 2;
    x0 = Math.min(x0, s.x - r); y0 = Math.min(y0, s.y - r);
    x1 = Math.max(x1, s.x + r); y1 = Math.max(y1, s.y + r);
  }
  return [x0, y0, x1, y1];
}

/** Plan the whole writing: strokes, air moves between them and ink dips. */
export function planShodoWriting(input: ShodoWritingInput): ShodoPlan {
  const { items, style } = input;
  assertShodoStyle(style);
  if (!items || items.length < 1) throw new RangeError("Supply at least one placed glyph.");
  for (const it of items) if (!(it.size > 8) || !Number.isFinite(it.x) || !Number.isFinite(it.y))
    throw new RangeError("Each item needs a finite position and a size above 8 px.");
  const speed = style.hand.speed;
  const first = items[0];
  const rest: V = input.rest ? [input.rest[0], input.rest[1]] : [first.x + first.size * 1.05, first.y + first.size * .95];
  const inkstone: V = input.inkstone ? [input.inkstone[0], input.inkstone[1]] : [first.x + first.size * 1.6, first.y + first.size * .5];
  let t = input.lead ?? .5;
  let ink = style.ink.load;
  let pos: V = rest, leaveTip: V = [0, 0], leavePress = 0, lastDir: V = [1, 0];
  let leaveLean: V = shodoRestLean(style);
  const tuftL = style.brush.diameter * style.hand.width * first.size / 1000 * style.brush.length;
  const strokes: ShodoPlannedStroke[] = [];
  const air: ShodoAirMove[] = [];
  const restZ = first.size * .16;
  let color = style.ink.color;
  const airMove = (to: V, approach: V, dip: boolean, z0 = 0, z1 = 0, nextColor = color) => {
    const dist = Math.hypot(to[0] - pos[0], to[1] - pos[1]);
    const ref = items[0].size;
    const duration = (.3 + dist / (1.05 * ref)) / Math.sqrt(speed) * (dip ? 1.3 : 1);
    const c1: V = [pos[0] + lastDir[0] * dist * .22, pos[1] + lastDir[1] * dist * .22 - dist * .08];
    const c2: V = [to[0] - approach[0] * dist * .2, to[1] - approach[1] * dist * .2 - dist * .05];
    air.push({
      // Between strokes the hand lifts the tip clear by a third to two thirds of the tuft.
      t0: t, t1: t + duration, from: pos, c1, c2, to, height: tuftL * (.3 + .35 * Math.min(1, dist / ref)), z0, z1,
      leaveTip, leavePress, leaveLean, ink, dip, color, nextColor,
    });
    t += duration;
    pos = to;
    color = nextColor;
  };
  let order = 0;
  items.forEach((item, itemIndex) => {
    const scale = item.size / 1000;
    const placed: Placed = { item, scale };
    // Joins (接筆) are part of how a stroke is written; mark them when the glyph has none.
    const marked = item.glyph.strokes.some(st => st.joinStart || st.joinEnd) ? item.glyph : shodoJoinStrokes(item.glyph, 70, false);
    marked.strokes.forEach((spec, strokeIndex) => {
      const seed = style.seed + itemIndex * 977 + strokeIndex * 131;
      const program = strokeProgram(spec, style, seed, marked.strokes.length);
      const land = toPx(placed, program.land);
      const override = item.strokeInk?.[strokeIndex];
      const strokeInk: ShodoInk = override ? { ...style.ink, ...override } : style.ink;
      const strokeStyle: ShodoStyle = override ? { ...style, ink: strokeInk } : style;
      const changesInk = strokeInk.color !== color;
      if (changesInk || !override && style.ink.redipBelow > 0 && ink < style.ink.redipBelow) {
        // 墨継ぎ: go to the inkstone, reload (or change ink), come back.
        airMove(inkstone, [1, 0], true, 0, 0, strokeInk.color);
        air[air.length - 1].t1 += .7 / Math.sqrt(speed);
        t += .7 / Math.sqrt(speed);
        if (!override) ink = style.ink.load;
        leaveTip = [0, 0]; leavePress = 0; leaveLean = shodoRestLean(style);
      }
      const pd = pressDirection(style);
      const approach: V = program.start === "uchikomi" ? pd : norm(...(spec.points.length > 1
        ? [spec.points[1][0] - spec.points[0][0], spec.points[1][1] - spec.points[0][1]] as V : [1, 0] as V));
      const gap = Math.hypot(land[0] - pos[0], land[1] - pos[1]);
      const link = strokes.length > 0 && style.hand.ligature >= .45 && gap < item.size * .42 && style.hand.script !== "kaisho";
      if (link) {
        // 連綿 / 糸引き: the brush barely leaves the paper; a hairline joins the strokes.
        const t0 = t, from = pos, mid: V = [lerp(from[0], land[0], .5) + lastDir[0] * gap * .15, lerp(from[1], land[1], .5) + lastDir[1] * gap * .15];
        const linkSegs: Segment[] = [{
          duration: (.12 + gap / (1.6 * item.size)) * 1.0,
          pos: u => { const a = 1 - u; return [(a * a * from[0] + 2 * a * u * mid[0] + u * u * land[0] - item.x) / scale,
            (a * a * from[1] + 2 * a * u * mid[1] + u * u * land[1] - item.y) / scale]; },
          press: u => .028 * style.hand.ligature * (1 - .6 * Math.sin(Math.PI * u)),
          phase: "renmen", technique: "itohiki", follow: 1,
        }];
        const linked = sampleProgram(linkSegs, placed, style, t0, ink);
        strokes.push({ order: order++, item: itemIndex, stroke: -1, kind: "link", start: "roho", end: "harai", t0, t1: linked.samples[linked.samples.length - 1].t, samples: linked.samples, bounds: bounds(linked.samples), ink: style.ink });
        t = linked.samples[linked.samples.length - 1].t;
        pos = land;
      } else airMove(land, approach, false, strokes.length ? 0 : restZ);
      // A stroke's own pace (a teacher's rhythm) scales the hand's speed for this stroke only.
      const paced = spec.pace && spec.pace !== 1 ? { ...strokeStyle, hand: { ...strokeStyle.hand, speed: strokeStyle.hand.speed * spec.pace } } : strokeStyle;
      // An ink override is a separate charge of ink; the main load is kept for later strokes.
      const { samples, ink: left } = sampleProgram(program.segs, placed, paced, t, override ? strokeInk.load : ink);
      if (!override) ink = left;
      const lastSample = samples[samples.length - 1];
      strokes.push({
        order: order++, item: itemIndex, stroke: strokeIndex, kind: spec.kind, start: program.start, end: program.end,
        t0: samples[0].t, t1: lastSample.t, samples, bounds: bounds(samples), ink: strokeInk,
      });
      t = lastSample.t;
      pos = [lastSample.x, lastSample.y];
      const prior = samples[Math.max(0, samples.length - 6)];
      lastDir = norm(lastSample.x - prior.x || .001, lastSample.y - prior.y);
      // The hair springs back in proportion to how fast it left the paper: a slow 止め
      // gather leaves it straight; a 払い or 撥ね flick sets it wobbling.
      let leave = samples.length - 1;
      while (leave > 0 && samples[leave].p < .02) leave--;
      const D = style.brush.diameter * style.hand.width * scale;
      leaveTip = [samples[leave].tx, samples[leave].ty];
      leavePress = clamp(samples[leave].speed / (D * 26), 0, .45);
      leaveLean = [lastSample.lx, lastSample.ly];
    });
  });
  if (input.exit === "hover") {
    // Lift just off the end of the last stroke and stay there, as a teacher pauses.
    const hover: V = [pos[0] - lastDir[0] * first.size * .02, pos[1] - lastDir[1] * first.size * .02];
    airMove(hover, [0, 1], false, 0, first.size * .03);
  } else airMove(rest, [0, 1], false, 0, restZ);
  const D = style.brush.diameter * style.hand.width * first.size / 1000;
  return {
    duration: t + (input.tail ?? 1.2), strokes, air, style,
    brush: { diameter: D, tuftLength: D * style.brush.length },
  };
}

// ── Brush pose query ───────────────────────────────────────────────────────────────

export interface ShodoBrushPose {
  x: number;
  y: number;
  /** Height of the tip above the paper, design px (0 = touching). */
  z: number;
  /** Tuft press, 0..1 (0 in the air). */
  p: number;
  /** Unit vector toward the tip of the bent hair, and the bend amount 0..1. */
  tx: number;
  ty: number;
  bend: number;
  vx: number;
  vy: number;
  speed: number;
  ink: number;
  contact: boolean;
  phase: ShodoPhase | "air" | "dip" | "rest";
  technique: ShodoTechnique | null;
  /** Index into plan.strokes while in contact, otherwise the next stroke. */
  stroke: number;
  /** Colour of the ink on the tuft. */
  color: string;
  /** Handle lean vector in degrees (length = lean from vertical, direction = where the top points). */
  leanX: number;
  leanY: number;
}

function bezier(m: ShodoAirMove, u: number): V {
  const a = 1 - u;
  return [
    a * a * a * m.from[0] + 3 * a * a * u * m.c1[0] + 3 * a * u * u * m.c2[0] + u * u * u * m.to[0],
    a * a * a * m.from[1] + 3 * a * a * u * m.c1[1] + 3 * a * u * u * m.c2[1] + u * u * u * m.to[1],
  ];
}

/** Brush state at an absolute time in seconds. Order-independent. */
export function shodoBrushPose(plan: ShodoPlan, seconds: number): ShodoBrushPose {
  const t = Math.max(0, seconds);
  // Contact: binary search the stroke whose span holds t.
  let lo = 0, hi = plan.strokes.length - 1, hit = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, s = plan.strokes[mid];
    if (t < s.t0) hi = mid - 1; else if (t > s.t1) lo = mid + 1; else { hit = mid; break; }
  }
  if (hit >= 0) {
    const s = plan.strokes[hit].samples;
    let a = 0, b = s.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (s[m].t <= t) a = m; else b = m; }
    const A = s[a], B = s[b], u = B.t > A.t ? clamp((t - A.t) / (B.t - A.t), 0, 1) : 0;
    const p = lerp(A.p, B.p, u);
    const [tx, ty] = norm(lerp(A.tx, B.tx, u), lerp(A.ty, B.ty, u));
    return {
      x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), z: 0, p, tx, ty, bend: p,
      vx: A.vx, vy: A.vy, speed: lerp(A.speed, B.speed, u), ink: lerp(A.ink, B.ink, u),
      contact: p > .004, phase: A.phase, technique: A.technique, stroke: hit, color: plan.strokes[hit].ink.color,
      leanX: lerp(A.lx, B.lx, u), leanY: lerp(A.ly, B.ly, u),
    };
  }
  const next = plan.strokes.findIndex(s => s.t0 > t);
  const move = plan.air.find(m => t >= m.t0 && t <= m.t1);
  if (move) {
    const dipHold = move.dip ? .7 / Math.sqrt(plan.style.hand.speed) : 0;
    const travel = move.t1 - move.t0 - dipHold;
    const local = t - move.t0;
    const outbound = move.dip ? Math.min(local, travel) : local;
    const u = move.dip ? clamp(outbound / travel, 0, 1) : clamp(local / (move.t1 - move.t0), 0, 1);
    // Studied on side views: the brush leaves the paper almost straight up, travels high,
    // arrives over its target, then comes down onto it; it never skims the paper.
    const [x, y] = bezier(move, smooth(u / .86));
    const z = lerp(move.z0, move.z1, smooth(u)) + move.height * Math.min(smooth(u / .22), smooth((1 - u) / .3));
    // The lean relaxes from how the brush left the paper back to the resting hold.
    const rest = shodoRestLean(plan.style), k = smooth(u);
    const leanX = lerp(move.leaveLean[0], rest[0], k), leanY = lerp(move.leaveLean[1], rest[1], k);
    // The hair springs back from its last bend with a damped wobble.
    const since = t - move.t0;
    const stiff = plan.style.brush.stiffness;
    const decay = Math.exp(-since / (.07 + .1 * (1 - stiff)));
    const bend = move.leavePress * decay * Math.cos(since * (18 + 22 * stiff));
    const dx = move.to[0] - move.from[0], dy = move.to[1] - move.from[1];
    const [vx, vy] = norm(dx || 1e-6, dy);
    return {
      x, y, z, p: 0, tx: move.leaveTip[0], ty: move.leaveTip[1], bend: Math.max(-.2, bend), vx, vy,
      speed: Math.hypot(dx, dy) / Math.max(.05, move.t1 - move.t0), ink: move.ink, contact: false,
      phase: move.dip && local > travel ? "dip" : "air", technique: null, stroke: next,
      color: move.dip && local > travel ? move.nextColor : move.color, leanX, leanY,
    };
  }
  const first = plan.air[0], last = plan.air[plan.air.length - 1];
  const before = t < first.t0;
  const at0 = before ? first.from : last.to;
  const restLean = shodoRestLean(plan.style);
  return {
    x: at0[0], y: at0[1], z: before ? first.z0 : last.z1, p: 0,
    tx: before ? 0 : last.leaveTip[0], ty: before ? 0 : last.leaveTip[1], bend: 0, vx: 0, vy: 0, speed: 0,
    ink: t < first.t0 ? plan.style.ink.load : last.ink, contact: false, phase: "rest", technique: null, stroke: next,
    color: before ? first.color : last.nextColor, leanX: restLean[0], leanY: restLean[1],
  };
}
