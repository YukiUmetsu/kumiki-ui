/**
 * RIG1 evaluator: `evaluateRig(spec, frame)` → every part's matrix, outline and opacity at that frame.
 *
 * Passes, all pure in the absolute frame:
 *   1. root travel (keys) → signed travel in the figure's own units, speed, depth scale and yaw;
 *   2. rest pose + keyed tracks + pose drivers (flaps, wings, chains, wheels, spins, oscillators, pendulums, clocks,
 *      suspension, lights, turns);
 *   3. world matrices in root space (forward = +x; facing, depth and yaw are applied once, at the root);
 *   4. gaits: feet planted on the ground by analytic two-bone IK, so a stance foot stays exactly where it landed; then
 *      reaches (feet on pedals or the floor, hands on knees and handlebars);
 *   5. crank linkages and emitters, which need world positions; then drapes, so hanging chains rest on the body
 *      where every other driver put it;
 *   6. part outlines (variants resolved) sorted by z.
 * Nothing accumulates between calls, so any frame can be rendered alone.
 */
import { evaluateEasing } from "../motion/easing";
import { flutterState, projectPlate, seeded } from "./rig-flutter";
import { settleStrand } from "./rig-strand";
import type { FlutterParams } from "./rig-flutter";
import type { AffineMatrix, EasingSpec } from "../motion/types";
import type { RigBone, RigDriver, RigKey, RigLeg, RigPart, RigRole, RigRootKey, RigShape, RigSpec, RigWindow } from "./rig-spec";

// ---- Matrices (row form a b c d e f, applied as x' = a x + c y + e) -----------------------------------------------------------------

const mul = (p: AffineMatrix, q: AffineMatrix): AffineMatrix => ({ // p ∘ q: apply q, then p
  a: p.a * q.a + p.c * q.b, b: p.b * q.a + p.d * q.b, c: p.a * q.c + p.c * q.d, d: p.b * q.c + p.d * q.d,
  e: p.a * q.e + p.c * q.f + p.e, f: p.b * q.e + p.d * q.f + p.f,
});
/** Bone-local matrix: translate · rotate · (scale with an optional vertical shear `ky`, y += ky·x). */
const local = (x: number, y: number, deg: number, sx: number, sy: number, ky = 0): AffineMatrix => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return { a: c * sx - s * ky * sx, b: s * sx + c * ky * sx, c: -s * sy, d: c * sy, e: x, f: y };
};
const apply = (m: AffineMatrix, x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const invert = (m: AffineMatrix): AffineMatrix => {
  const det = m.a * m.d - m.b * m.c || 1e-9;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
};
/** World rotation (degrees) of the bone's +y axis, measured like a bone's `rotate` (0 = pointing down). */
const angleOf = (m: AffineMatrix) => Math.atan2(m.b, m.a) * 180 / Math.PI;
const DEG = 180 / Math.PI;

// ---- Small helpers ---------------------------------------------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const frac = (v: number) => v - Math.floor(v);
/** Shortest signed difference between two angles in degrees. */
const angleDelta = (from: number, to: number) => ((to - from + 540) % 360 + 360) % 360 - 180;
function hash(seed: number, n: number) {
  let h = (Math.imul(seed | 0, 0x27d4eb2d) ^ Math.imul(n | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
/** 0→1→0 envelope for a driver window with blend ramps. */
export function envelope(w: RigWindow, frame: number): number {
  const start = w.start ?? -Infinity, end = w.end ?? Infinity, ramp = w.ramp ?? 8;
  if (frame < start || frame > end) return 0;
  const a = start === -Infinity || ramp <= 0 ? 1 : smooth((frame - start) / ramp);
  const b = end === Infinity || ramp <= 0 ? 1 : smooth((end - frame) / ramp);
  return Math.min(a, b);
}
/** Cubic Hermite from p0 to p1 with tangents m0, m1 (per unit t). */
const hermite = (p0: number, p1: number, m0: number, m1: number, t: number) => {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
};

// ---- Root travel -----------------------------------------------------------------------------------------------------------------

export interface RigRootState {
  x: number; y: number; rotate: number; facing: 1 | -1;
  /** Path length travelled (scene px, unsigned). */
  distance: number;
  /** Signed travel along the facing direction in the figure's own units (depth scale and yaw removed): gaits, wheels
   * and emitters run on it, so reversing steps and rolls backward. */
  travel: number;
  /** Speed in the figure's own units per frame (unsigned), and signed along the facing. */
  speed: number; velocity: number;
  vy: number; scale: number; yaw: number;
}

interface RootSample { x: number; y: number; rotate: number; scale: number; yaw: number }
function rootSample(keys: readonly RigRootKey[], frame: number): RootSample {
  if (!keys.length) return { x: 0, y: 0, rotate: 0, scale: 1, yaw: 0 };
  // Optional channels hold their last keyed value.
  let y = keys[0].y ?? 0, rot = keys[0].rotate ?? 0, sc = keys[0].scale ?? 1, yaw = keys[0].yaw ?? 0;
  if (frame <= keys[0].frame) return { x: keys[0].x, y, rotate: rot, scale: sc, yaw };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const by = b.y ?? y, br = b.rotate ?? rot, bs = b.scale ?? sc, byaw = b.yaw ?? yaw;
    if (frame <= b.frame) {
      const t = evaluateEasing(b.ease ?? "ease-in-out-quad", (frame - a.frame) / (b.frame - a.frame));
      return { x: a.x + (b.x - a.x) * t, y: y + (by - y) * t, rotate: rot + (br - rot) * t, scale: sc + (bs - sc) * t, yaw: yaw + (byaw - yaw) * t };
    }
    y = by; rot = br; sc = bs; yaw = byaw;
  }
  return { x: keys[keys.length - 1].x, y, rotate: rot, scale: sc, yaw };
}
const hasDepth = (keys: readonly RigRootKey[]) => keys.some(k => k.scale !== undefined || k.yaw !== undefined);
/** Facing at a frame: explicit `facing` keys hold from their frame on; otherwise the figure faces its travel, and
 * before it sets off the way it will go. */
function facingAt(keys: readonly RigRootKey[], frame: number): 1 | -1 {
  const off = keys.findIndex((k, i) => i > 0 && k.x !== keys[i - 1].x);
  let facing: 1 | -1 = off > 0 && keys[off].x < keys[off - 1].x ? -1 : 1, explicit: 1 | -1 | undefined;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k.facing && (k.frame <= frame || i === 0)) explicit = k.facing;
    if (i > 0 && keys[i - 1].frame < frame && keys[i - 1].x !== k.x) facing = k.x > keys[i - 1].x ? 1 : -1;
  }
  return explicit ?? facing;
}
/** Root position, facing, travel and speed at a frame. */
export function rootState(spec: RigSpec, frame: number): RigRootState {
  const keys = spec.root ?? [];
  const p = rootSample(keys, frame);
  const facing = facingAt(keys, frame), depth = hasDepth(keys);
  let distance = 0, travel = 0;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const segEnd = Math.min(frame, b.frame);
    if (segEnd <= a.frame) break;
    const segFacing = facingAt(keys, (a.frame + segEnd) / 2);
    if (!depth) {
      const q = rootSample(keys, segEnd), s = rootSample(keys, a.frame), dx = q.x - s.x, len = Math.hypot(dx, q.y - s.y);
      distance += len; travel += dx * segFacing < 0 ? -len : len;
    } else {
      // Depth-scaled travel: integrate in steps so wheels and feet turn by the distance covered in the figure's own units.
      const n = Math.min(64, Math.max(1, Math.ceil(segEnd - a.frame)));
      let prev = rootSample(keys, a.frame);
      for (let k = 1; k <= n; k++) {
        const q = rootSample(keys, a.frame + (segEnd - a.frame) * k / n), dx = q.x - prev.x, len = Math.hypot(dx, q.y - prev.y);
        const own = len / (((q.scale + prev.scale) / 2) * Math.max(.35, Math.cos((q.yaw + prev.yaw) / 2 / DEG)));
        distance += len; travel += dx * segFacing < 0 ? -own : own;
        prev = q;
      }
    }
  }
  const before = rootSample(keys, frame - 1), after = rootSample(keys, frame + 1), k = 1 / Math.max(.05, p.scale);
  const vx = (after.x - before.x) / 2;
  return { ...p, facing, distance, travel, speed: Math.hypot(vx, (after.y - before.y) / 2) * k, velocity: vx * facing * k, vy: (after.y - before.y) / 2 * k };
}
/** Signed forward velocity (own units per frame) without the path integral, for spring responses. */
function velocityAt(keys: readonly RigRootKey[], frame: number) {
  const a = rootSample(keys, frame - .5), b = rootSample(keys, frame + .5);
  return (b.x - a.x) * facingAt(keys, frame) / Math.max(.05, (a.scale + b.scale) / 2);
}

// ---- Pose ------------------------------------------------------------------------------------------------------------------------

interface Pose { x: number; y: number; rotate: number; sx: number; sy: number; opacity: number; ky?: number }

function trackAt(keys: readonly RigKey[] | undefined, frame: number): Partial<Pose> {
  if (!keys?.length) return {};
  const out: Partial<Pose> = {};
  const channels: [keyof RigKey, keyof Pose][] = [["x", "x"], ["y", "y"], ["rotate", "rotate"], ["scaleX", "sx"], ["scaleY", "sy"], ["opacity", "opacity"], ["shear", "ky"]];
  for (const [kc, pc] of channels) {
    let prev: RigKey | undefined, next: RigKey | undefined;
    for (const k of keys) { if (k[kc] === undefined) continue; if (k.frame <= frame) prev = k; else { next = k; break; } }
    if (!prev && !next) continue;
    const v = (k: RigKey) => k[kc] as number;
    out[pc] = !prev ? v(next!) : !next ? v(prev) : v(prev) + (v(next) - v(prev)) * evaluateEasing(next.ease ?? "ease-in-out-cubic", (frame - prev.frame) / (next.frame - prev.frame));
  }
  return out;
}

/** Wing stroke: a quick downstroke (40% of the cycle) and a slower recovery. Returns -1..1 (up = +1). */
export function wingStroke(u: number, downstroke = .4): number {
  const t = frac(u);
  return t < downstroke ? Math.cos(Math.PI * t / downstroke) : -Math.cos(Math.PI * (t - downstroke) / (1 - downstroke));
}

function keyedPoint(keys: readonly { frame: number; x: number; y: number; ease?: EasingSpec; out?: number }[], frame: number): [number, number, number] {
  if (frame <= keys[0].frame) return [keys[0].x, keys[0].y, keys[0].out ?? 0];
  for (let i = 1; i < keys.length; i++) if (frame <= keys[i].frame) {
    const a = keys[i - 1], b = keys[i], t = evaluateEasing(b.ease ?? "ease-in-out-cubic", (frame - a.frame) / (b.frame - a.frame));
    return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, (a.out ?? 0) + ((b.out ?? 0) - (a.out ?? 0)) * t];
  }
  const z = keys[keys.length - 1];
  return [z.x, z.y, z.out ?? 0];
}

export interface RigBoneFrame { id: string; local: AffineMatrix; world: AffineMatrix; opacity: number; length: number }
export interface RigPartFrame {
  id: string; bone: string; role: RigRole; shape: RigShape; matrix: AffineMatrix; z: number; color?: string; opacity: number; line?: boolean; lineWidth?: number; variant?: string; far?: boolean;
  /** For `extrude` parts: the far side's matrix (the faces span from `matrix` to it). For `far3d` parts it replaces `matrix`. */
  farMatrix?: AffineMatrix; extrude?: boolean; far3d?: "under" | "over"; faceRole?: RigRole;
}
export interface RigFrame {
  frame: number;
  root: RigRootState;
  /** Root space → scene: translate to the root, rotate, mirror for facing, depth scale and yaw foreshortening. */
  toScene: AffineMatrix;
  bones: ReadonlyMap<string, RigBoneFrame>;
  /** Parts in paint order with their final scene matrices. */
  parts: RigPartFrame[];
  /** Feet / wheels contact points in scene space, for ground shadows. */
  contacts: [number, number][];
}

export interface RigEvaluateOptions {
  /** Hold poses for this many frames (2 = stop-motion on twos). Root travel stays smooth unless `stepRoot`. */
  cadence?: number;
  stepRoot?: boolean;
  /** Settled pose: drivers at rest, root at its last key. */
  reducedMotion?: boolean;
  /** False: hanging chains answer at once, without the swing of `drape.momentum`. */
  momentum?: boolean;
}

const POSE_DRIVERS_IN_REDUCED = new Set(["clock", "reach", "turn", "flash", "serpent", "drift", "drape"]);

/** Evaluate a rig at a frame. Pure: no state survives between calls. */
export function evaluateRig(spec: RigSpec, frame: number, options: RigEvaluateOptions = {}): RigFrame {
  const cadence = Math.max(1, Math.round(options.cadence ?? 1));
  const reduced = !!options.reducedMotion;
  const keys = spec.root ?? [];
  const lastRoot = keys.length ? keys[keys.length - 1].frame : 0;
  const f = reduced ? Math.max(frame, lastRoot) : Math.floor(frame / cadence) * cadence;
  const root = rootState(spec, options.stepRoot || reduced ? f : frame);
  const rootForPose = rootState(spec, f);
  const byId = new Map(spec.bones.map(b => [b.id, b]));
  const pose = new Map<string, Pose>();
  for (const b of spec.bones) {
    const t = trackAt(spec.tracks?.[b.id], f);
    pose.set(b.id, { x: b.x + (t.x ?? 0), y: b.y + (t.y ?? 0), rotate: (b.rotate ?? 0) + (t.rotate ?? 0), sx: t.sx ?? 1, sy: t.sy ?? 1, opacity: t.opacity ?? 1, ky: t.ky });
  }
  const drivers = reduced ? (spec.drivers ?? []).filter(d => POSE_DRIVERS_IN_REDUCED.has(d.type) || d.type === "variant" && d.mode === "keys") : spec.drivers ?? [];
  const variants = new Map<string, string>();
  const lights = new Map<string, number>();
  const seedBase = hashString(spec.id);

  // Pass 2: pose drivers.
  for (const d of drivers) {
    const w = envelope(d, f);
    if (w <= 0 && d.type !== "clock" && d.type !== "variant" && d.type !== "flash" && d.type !== "wheel" && d.type !== "turn" && d.type !== "spin") continue;
    const P = (id: string) => pose.get(id)!;
    switch (d.type) {
      case "wing": {
        const u = f / d.period + (d.phase ?? 0), s = wingStroke(u), fold = d.fold ?? 40;
        P(d.shoulder).rotate += w * ((d.bias ?? 0) + d.amplitude * s);
        if (d.elbow) P(d.elbow).rotate += w * fold * Math.max(0, -wingStroke(u - .08)) * .9;
        if (d.tip) P(d.tip).rotate += w * (d.amplitude * .35 * wingStroke(u - .14) + fold * .5 * Math.max(0, -wingStroke(u - .14)));
        break;
      }
      case "flap": {
        const ds = d.downstroke ?? .45, u = frac(f / d.period + (d.phase ?? 0));
        const s = wingStroke(u, ds), mid = (d.up + d.down) / 2, half = (d.up - d.down) / 2;
        // Normalised stroke clock: 0..½ downstroke, ½..1 upstroke.
        const v = u < ds ? u / ds * .5 : .5 + (u - ds) / (1 - ds) * .5;
        const glideW = d.glide === undefined ? 0 : 1;
        let elev = lerp(mid + half * s, d.glide ?? mid, glideW);
        // Upstroke: the wing folds back toward the body (tips tucked), spreading again just before the top.
        let fold = (u < ds ? 0 : Math.sin(Math.PI * (u - ds) / (1 - ds)) ** 1.4) * (1 - glideW);
        // Downstroke: the hand presses slightly ahead of the arm (the tip lags into a loop).
        let press = (u < ds ? Math.sin(Math.PI * u / ds) : 0) * (1 - glideW);
        elev = lerp(d.glide ?? mid, elev, w); fold *= w; press *= w;
        const tilt = d.tilt ?? 12, e = (elev + (d.side === "far" ? tilt : -tilt)) / DEG;
        const proj = Math.sin(e), shown = Math.sign(proj || 1) * Math.max(Math.abs(proj), .05);
        const plane = P(d.plane);
        plane.sy *= shown;
        plane.rotate += (d.sweep ?? 0) * Math.sin(2 * Math.PI * v) * clamp(proj * 3, -1, 1) * w * (1 - glideW);
        const F = d.fold ?? 60;
        if (d.arm) P(d.arm).rotate -= F * .4 * fold;
        if (d.hand) P(d.hand).rotate += -F * fold + F * .18 * press;
        if (d.body && d.heave) P(d.body).y += d.heave * w * (1 - glideW) * wingStroke(u - .06, ds);
        break;
      }
      case "chain": {
        const n = d.bones.length, g = d.growth ?? 1;
        const accel = rootState(spec, f).speed - rootState(spec, f - 6).speed;
        d.bones.forEach((id, i) => {
          const k = 1 + g * i / Math.max(1, n - 1);
          P(id).rotate += w * ((d.bias ?? 0) + d.amplitude * k * Math.sin(2 * Math.PI * (f / d.period + (d.phase ?? 0)) - i * d.lag) + (d.follow ?? 0) * accel * (i + 1) / n);
        });
        break;
      }
      case "wheel": {
        // Locked wheels skid: the distance covered while locked does not turn them.
        let skid = 0;
        for (const l of d.lock ?? []) if (f > l.start) skid += rootState(spec, Math.min(f, l.end)).travel - rootState(spec, l.start).travel;
        for (const id of d.bones) P(id).rotate += ((rootForPose.travel - skid) / d.radius) * DEG + (d.extra ?? 0) * f;
        break;
      }
      case "spin": {
        const t = f - (d.start ?? 0), up = d.spinUp ?? 0, down = d.spinDown ?? 0;
        const spun = (tt: number) => up > 0 && tt < up ? d.speed * tt * tt / (2 * up) : d.speed * (tt - up / 2);
        let turned = spun(t);
        if (down > 0 && d.end !== undefined) {
          // Wind down linearly to a stop at the window's end, then hold the blade where it stopped.
          const t1 = d.end - (d.start ?? 0) - down;
          if (t > t1) { const tau = Math.min(t - t1, down); turned = spun(t1) + d.speed * (tau - tau * tau / (2 * down)); }
        }
        if (d.project) P(d.bone).sx *= Math.cos(((t > 0 ? turned : 0) + (d.phase ?? 0)) / DEG);
        else P(d.bone).rotate += t > 0 ? turned : 0;
        break;
      }
      case "oscillate": {
        const ph = 2 * Math.PI * (f / d.period + (d.phase ?? 0));
        const k = d.bySpeed ? Math.min(1.5, rootForPose.speed / 4) : 1;
        const v = w * k * d.amplitude * (Math.sin(ph) + (d.wobble ?? 0) * Math.sin(ph * 2.3 + 1.1));
        const q = P(d.bone);
        if (d.property === "scaleX") q.sx *= 1 + v; else if (d.property === "scaleY") q.sy *= 1 + v; else q[d.property] += v;
        break;
      }
      case "pendulum": {
        const t = Math.max(0, f - (d.start ?? 0));
        P(d.bone).rotate += w * d.amplitude * Math.exp(-(d.damping ?? 0) * t) * Math.cos(2 * Math.PI * t / d.period);
        break;
      }
      case "suspension": {
        // Damped spring driven by the root's forward acceleration: x'' + 2ζωx' + ω²x = ω²·a(t). Convolving the
        // acceleration history with the spring's impulse response keeps it a pure function of the frame.
        const period = d.period ?? 22, zeta = clamp(d.damping ?? .32, .05, .95), om = 2 * Math.PI / period, od = om * Math.sqrt(1 - zeta * zeta);
        const N = Math.min(150, Math.ceil(5 / (zeta * om)));
        let x = 0;
        for (let k = 0; k <= N; k++) {
          const a = velocityAt(keys, f - k + .5) - velocityAt(keys, f - k - .5);
          x += a * om * om * Math.exp(-zeta * om * k) * Math.sin(od * k) / od;
        }
        const lim = d.max ?? 12, [lo, hi] = d.range ?? [-lim, lim];
        P(d.bone).rotate += clamp(-x * d.pitch, lo, hi);
        if (d.heave) P(d.bone).y += -x * d.heave;
        break;
      }
      case "flash": {
        const start = d.start ?? 0;
        let on = w > 0 ? 1 : 0;
        if (on && d.period) {
          const t = frac((f - start) / d.period + (d.phase ?? 0)) * d.period, dur = (d.duty ?? .5) * d.period, fade = d.fade ?? 0;
          on = fade > 0 ? smooth(t / fade) * (1 - smooth((t - dur) / fade)) : t < dur ? 1 : 0;
        }
        for (const id of d.bones) lights.set(id, Math.max(lights.get(id) ?? 0, on));
        break;
      }
      case "turn": {
        // End-face bones of a body turning in depth: the root foreshortens the side by cos(yaw); a face opens by
        // sin(yaw). With a solid (`depth3d`) and a raised camera (`depth3dTilt`), the face's far edge also rises, so the
        // face bone shears to stay on the extruded nose or tail it decorates.
        const yaw = rootForPose.yaw / DEG, c = Math.max(.2, Math.cos(yaw)), D = spec.depth3d ?? 0;
        const rise = -D * (spec.depth3dTilt ?? 0) * Math.abs(Math.sin(yaw));
        for (const [ids, open, side] of [[d.rear, Math.sin(yaw), -1], [d.front, -Math.sin(yaw), 1]] as const) for (const id of ids ?? []) {
          const q = P(id);
          if (open > .01) { const sx = open / c; q.sx *= sx; if (D > 0) q.ky = side * rise / (sx * D); }
          else q.opacity = 0;
        }
        break;
      }
      case "clock": {
        const hours = clockHours(d.time, f);
        const rest = d.restAngles ?? {};
        if (d.hour) P(d.hour).rotate += hours * 30 - (rest.hour ?? 0);
        if (d.minute) P(d.minute).rotate += hours * 360 - (rest.minute ?? 0);
        if (d.second) {
          const sec = hours * 3600;
          let ang = sec * 6;
          if (d.tick) {
            const whole = Math.floor(sec), since = (sec - whole) * d.tick.fps;
            const settle = since >= 4 ? 1 : evaluateEasing("ease-out-back", since / 4);
            ang = (whole - 1) * 6 + 6 * settle;
          }
          P(d.second).rotate += ang - (rest.second ?? 0);
        }
        break;
      }
      case "variant": {
        if (d.mode === "blink") {
          const [lo, hi] = d.interval ?? [70, 140], seed = d.seed ?? seedBase;
          // Blink starts are laid out from frame 0 with seeded gaps, so any frame finds its slot directly.
          const slot = Math.floor(f / hi), at = slot * hi + Math.floor(hash(seed, slot) * (hi - lo));
          if (w > 0 && f >= at && f < at + (d.duration ?? 4)) variants.set(d.part, d.name);
        } else if (d.mode === "keys") {
          let name: string | null = null;
          for (const k of d.keys) if (k.frame <= f) name = k.name;
          if (name) variants.set(d.part, name);
        } else if (w > .5) {
          const local = f - (d.start ?? 0), seed = d.seed ?? seedBase + 7;
          const syllable = Math.floor(local / 4), open = hash(seed, syllable);
          const v = open > .62 ? d.open : open > .3 && d.mid ? d.mid : null;
          if (v) variants.set(d.part, v);
        }
        break;
      }
      case "drift": {
        const life = d.life, vary = d.vary ?? .35, base = d.flutter, fade = d.fade ?? 10, s0 = d.start ?? 0;
        d.bones.forEach((id, i) => {
          const r = seeded((d.seed ?? 1) * 7919 + i * 104729), jitter = (v: number | undefined) => v === undefined ? undefined : v * (1 + vary * (r() * 2 - 1));
          const offset = r() * life, rx = r(), ry = r(), tumbles = r() < (d.tumble ?? .4), roll = (d.roll ?? 0) * (r() * 2 - 1), headingJ = (r() * 2 - 1) * .6;
          const params: FlutterParams = { ...base, fall: jitter(base.fall)!, wind: jitter(base.wind), swing: jitter(base.swing), period: jitter(base.period), tilt: jitter(base.tilt),
            lift: jitter(base.lift), heading: (base.heading ?? .9) + headingJ, phase: r() * Math.PI * 2,
            spin: tumbles ? (base.spin ?? .18) * (.6 + .8 * r()) * (r() < .25 ? -1 : 1) : undefined };
          const age = (((f - s0 + offset) % life) + life) % life, st = flutterState(params, age, f), k = projectPlate(st.pitch, st.heading, roll * age);
          const q = P(id), b = byId.get(id)!;
          q.x = b.x + d.area[0] + rx * d.area[2] + st.x * w; q.y = b.y + d.area[1] + ry * d.area[3] + st.y * w;
          q.rotate += k.rotate; q.sx *= k.scaleX; q.sy *= k.scaleY; q.ky = k.shear;
          q.opacity *= w * Math.min(1, age / fade, (life - age) / fade);
        });
        break;
      }
      case "serpent": {
        // Track y(x) = A·sin(2π(x + s)/λ + φ) in the first bone's parent space, s = distance travelled: fixed to the ground.
        const s = rootForPose.travel, k = 2 * Math.PI / d.wavelength, ph = d.phase ?? 0, b0 = byId.get(d.bones[0])!;
        const x0 = b0.x, headA = d.head ?? .6;
        const amp = (x: number) => d.amplitude * (headA + (1 - headA) * clamp((x0 - x) / (d.wavelength * .35), 0, 1));
        const yAt = (x: number) => amp(x) * Math.sin(k * (x + s) + ph);
        let x = x0, y = yAt(x0), prev = 0;
        P(d.bones[0]).y += w * y;
        d.bones.forEach(id => {
          const L = byId.get(id)!.length ?? 0;
          // The next joint is where the track is exactly L away (bisection: steep stretches defeat fixed-point steps).
          let lo = x - L, hi = x;
          for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2, dy = yAt(mid) - y; if ((x - mid) ** 2 + dy * dy > L * L) lo = mid; else hi = mid; }
          const nx = (lo + hi) / 2;
          const ny = yAt(nx), worldAngle = Math.atan2(-(nx - x), ny - y) * DEG;
          const q = P(id);
          q.rotate += w * angleDelta(q.rotate, worldAngle - prev);
          prev = worldAngle; x = nx; y = ny;
        });
        break;
      }
      case "bank": {
        const angle = Math.atan2(rootForPose.vy, Math.max(.01, rootForPose.speed)) * DEG;
        root.rotate += clamp(angle * d.amount + (d.lean ?? 0) * rootForPose.velocity, -(d.max ?? 35), d.max ?? 35) * w;
        break;
      }
      default: break;
    }
  }
  // Lights: bones driven by `flash` show only while switched on.
  const lit = new Set(drivers.flatMap(d => d.type === "flash" ? d.bones : []));
  for (const id of lit) pose.get(id)!.opacity *= lights.get(id) ?? 0;

  // Pass 3: world matrices (root space).
  const order = spec.bones;
  const world = new Map<string, AffineMatrix>(), alpha = new Map<string, number>();
  const solve = () => {
    for (const b of order) {
      const p = pose.get(b.id)!;
      world.set(b.id, boneWorld(b, p, b.parent ? world.get(b.parent)! : IDENT));
      alpha.set(b.id, (b.parent ? alpha.get(b.parent)! : 1) * p.opacity);
    }
  };
  solve();

  // Pass 4: gaits, then reaches.
  const contacts: [number, number][] = [];
  let rest: Map<string, AffineMatrix> | undefined;
  for (const d of drivers) {
    if (d.type !== "gait") continue;
    rest ??= restWorld(spec);
    const w = envelope(d, f);
    const ground = d.ground ?? spec.ground ?? 0, stance = d.stance ?? .6, lift = d.lift ?? d.stride * .12;
    const moving = rootForPose.speed > .05 || !!d.idleCycle;
    const cyc = rootForPose.speed > .05 || !d.idleCycle ? rootForPose.travel / d.stride : (f - (d.start ?? 0)) / d.idleCycle;
    const wm = w * (moving ? 1 : 0);
    // Body bob (highest at `bobPhase`) and pitch, locked to the footfalls.
    if (d.sink) pose.get(d.body)!.y += wm * d.sink;
    if (d.bob) pose.get(d.body)!.y += wm * d.bob * (.5 - .5 * Math.cos(2 * Math.PI * (d.bobHarmonic ?? 2) * (cyc - (d.bobPhase ?? 0))));
    if (d.pitch) pose.get(d.body)!.rotate += wm * d.pitch * Math.cos(2 * Math.PI * (d.pitchHarmonic ?? 1) * (cyc - (d.pitchPhase ?? 0)));
    for (const sw of d.swing ?? []) pose.get(sw.bone)!.rotate += wm * sw.amplitude * Math.cos(2 * Math.PI * (sw.harmonic ?? 1) * (cyc + sw.phase));
    solve();
    for (const leg of d.legs) {
      if (leg.pastern && leg.foot) {
        const c = pasternLeg(leg, cyc, stance, d.stride, lift, ground, wm, rest, byId, pose, world, solve);
        if (c) contacts.push(c);
        continue;
      }
      const target = legTarget(leg, cyc, stance, d.stride, lift, ground, wm, rest, byId);
      if (leg.swingHip) { pose.get(leg.upper)!.x += leg.swingHip * (target.foot[0] - target.hip); solve(); }
      solveTwoBone(leg.upper, leg.lower, leg.bend, target.foot, byId, pose, world, 1);
      solve();
      if (leg.foot) {
        const shinAngle = angleOf(world.get(leg.lower)!);
        // Stance: level, or rolled up onto the toe; swing: toe lifted, or curled with the shin (hooves, paws).
        const swingAngle = leg.curl === undefined ? target.swingAngle : lerp(target.swingAngle, shinAngle + leg.curl, Math.sin(Math.PI * clamp(target.swingT * 1.1, 0, 1)));
        const footWorld = (target.swing ? swingAngle : target.stanceAngle) * wm;
        pose.get(leg.foot)!.rotate = footWorld - shinAngle + (byId.get(leg.foot)!.rotate ?? 0);
        solve();
      }
      if (target.contact) contacts.push(target.contact);
    }
  }
  for (const d of drivers) {
    if (d.type !== "reach") continue;
    const w = envelope(d, f);
    if (w <= 0) continue;
    let target: [number, number], out = 0;
    if (d.follow) {
      const [fx, fy] = apply(world.get(d.follow)!, 0, 0);
      target = [fx + (d.offset?.[0] ?? 0), fy + (d.offset?.[1] ?? 0)];
      if (d.target?.length) { const [ox, oy, o] = keyedPoint(d.target, f); target = [target[0] + ox, target[1] + oy]; out = o; }
    } else { const [tx, ty, o] = keyedPoint(d.target!, f); target = [tx, ty]; out = o; }
    solveTwoBone(d.upper, d.lower, d.bend, target, byId, pose, world, w, out);
    solve();
    if (d.floor !== undefined) {
      const at = world.get(d.lower)!, s = world.get(d.upper)!, tip = apply(at, 0, byId.get(d.lower)!.length!), low = (spec.ground ?? 0) - d.floor;
      if (Math.max(at.f, tip[1]) > low) {
        // Blending two poses, or a bend that points down, would put the joint or the tip under the ground.
        const bend = (at.e - s.e) * (tip[1] - s.f) - (at.f - s.f) * (tip[0] - s.e) < 0 ? -1 : 1;
        solveTwoBone(d.upper, d.lower, bend, [tip[0], Math.min(tip[1], low)], byId, pose, world, 1, 0, low);
        solve();
      }
    }
    if (d.floor !== undefined && d.tip && d.tipAngle === undefined) {
      const m = world.get(d.tip)!, L = byId.get(d.tip)!.length ?? 0, turn = L > 0 ? layOnFloor(Math.atan2(m.d, m.c), ((spec.ground ?? 0) - d.floor - m.f) / L) : 0;
      if (turn) { pose.get(d.tip)!.rotate += turn * 180 / Math.PI; solve(); }
    }
    if (d.tip && d.tipAngle !== undefined) {
      const lowerAngle = angleOf(world.get(d.lower)!), q = pose.get(d.tip)!;
      q.rotate += angleDelta(q.rotate, d.tipAngle - lowerAngle) * w;
      solve();
    }
  }

  // Pass 5: linkages and emitters.
  for (const d of drivers) {
    if (d.type === "crank") {
      const wm = world.get(d.wheel)!, [cx, cy] = apply(wm, 0, 0), th = angleOf(wm) * Math.PI / 180 + (d.phase ?? 0) * Math.PI / 180;
      const pin: [number, number] = [cx + d.radius * Math.cos(th), cy + d.radius * Math.sin(th)];
      const rod = byId.get(d.rod)!, parentM = rod.parent ? world.get(rod.parent)! : IDENT, inv = invert(parentM), parentAngle = angleOf(parentM);
      let end: [number, number];
      if (d.mode === "coupling") end = [pin[0] + 10, pin[1]];
      else { const L = d.length!, sy = d.slideY ?? cy, dy = clamp(sy - pin[1], -L + .001, L - .001); end = [pin[0] + Math.sqrt(L * L - dy * dy), sy]; }
      const [lx, ly] = apply(inv, pin[0], pin[1]), dir = Math.atan2(end[1] - pin[1], end[0] - pin[0]) * DEG;
      const rp = pose.get(d.rod)!;
      rp.x = lx; rp.y = ly; rp.rotate = dir - 90 - parentAngle;
      if (d.slider && d.mode === "slide") {
        const sl = byId.get(d.slider)!, sm = sl.parent ? world.get(sl.parent)! : IDENT, [sx] = apply(invert(sm), end[0], end[1]);
        pose.get(d.slider)!.x = sx;
      }
      solve();
    } else if (d.type === "emitter") {
      const om = world.get(d.origin)!, [ox, oy] = apply(om, 0, 0), start = d.start ?? 0, N = d.puffs.length;
      const n = Math.floor((f - start) / d.every), travelNow = rootState(spec, f).travel;
      d.puffs.forEach((id, j) => {
        const p = pose.get(id)!, b = byId.get(id)!;
        const e = n - (((n - j) % N) + N) % N, age = f - start - e * d.every;
        if (e < 0 || age < 0 || age >= d.life || envelope(d, start + e * d.every) <= 0) { p.opacity = 0; return; }
        const t = age / d.life;
        // Born at the origin, left behind in the world as the root moves on (ahead of it when reversing).
        const back = travelNow - rootState(spec, start + e * d.every).travel;
        const wob = (d.drift ?? 0) * Math.sin(age * .21 + j * 1.7);
        const wx = ox - back + d.velocity[0] * age + wob, wy = oy + d.velocity[1] * age;
        const pm = b.parent ? world.get(b.parent)! : IDENT, [lx, ly] = apply(invert(pm), wx, wy);
        p.x = lx; p.y = ly;
        const s = 1 + d.growth * t;
        p.sx = s; p.sy = s; p.opacity *= Math.min(1, t * 6) * (1 - t) ** 1.4;
      });
      solve();
    }
  }
  for (const d of drivers) {
    if (d.type !== "drape") continue;
    const w = envelope(d, f);
    if (w <= 0) continue;
    drape(d, w, spec.ground ?? 0, byId, pose, world, rest ??= restWorld(spec), solve);
    if (d.momentum && !reduced && options.momentum !== false) {
      // Where each lock hung over the last frames, weighted as a damped pendulum remembers them. Turning over passes through zero
      // length: the lock swings toward the viewer instead of flipping.
      const swung = d.bones.map((): [number, number] => [0, 0]);
      swingWeights(d.momentum).forEach((g, k) => {
        const locks = k ? stillLocks(spec, f - k, d.bones) : d.bones.map(id => lockVector(world.get(id)!, byId.get(id)!.length!));
        locks.forEach((v, i) => { swung[i][0] += v[0] * g; swung[i][1] += v[1] * g; });
      });
      drape(d, w, spec.ground ?? 0, byId, pose, world, rest, solve, swung);
    }
  }
  for (const id of spec.shadows ?? []) contacts.push([apply(world.get(id)!, 0, 0)[0], spec.ground ?? 0]);
  for (const d of drivers) if (d.type === "wheel" && d.radius > 0) for (const id of d.bones) {
    const [x] = apply(world.get(id)!, 0, 0);
    contacts.push([x, spec.ground ?? 0]);
  }

  // Pass 6: parts.
  const yawC = Math.max(.2, Math.cos(root.yaw / DEG));
  const toScene = mul(local(root.x, root.y, root.rotate, 1, 1), local(0, 0, 0, root.facing * root.scale * yawC, root.scale));
  // Solid figures turning in depth: the far side sits depth·tan(yaw) behind the near side (in root space, before the
  // cos(yaw) foreshortening of `toScene`).
  // A raised camera (`depth3dTilt`) also lifts the far side as the body turns, revealing bonnet and roof tops.
  const yawR = clamp(root.yaw, -80, 80) / DEG, farShift = spec.depth3d ? -spec.depth3d * Math.tan(yawR) : 0;
  const farRise = spec.depth3d ? -spec.depth3d * (spec.depth3dTilt ?? 0) * Math.abs(Math.sin(yawR)) : 0;
  const farAt = (k: number) => mul(toScene, local(farShift * k, farRise * k, 0, 1, 1));
  const farScene = farAt(1);
  const parts: RigPartFrame[] = spec.parts.map((q: RigPart) => {
    const v = variants.get(q.id), m = world.get(q.bone)!, back = m.a * m.d - m.b * m.c < 0;
    return {
      id: q.id, bone: q.bone, role: q.role, z: q.z, color: back && q.backColor ? q.backColor : q.color, line: q.line, lineWidth: q.lineWidth, variant: v, far: q.far,
      hidden: q.side !== undefined && (q.side === "back") !== back,
      shape: v && q.variants?.[v] ? q.variants[v] : q.shape,
      matrix: mul(q.far3d ? farScene : toScene, world.get(q.bone)!), opacity: alpha.get(q.bone)!,
      extrude: q.extrude || undefined, far3d: q.far3d, faceRole: q.faceRole, farMatrix: q.extrude ? mul(farAt(q.extrudeDepth ?? 1), world.get(q.bone)!) : undefined,
    };
  }).filter(p => p.opacity > .003 && !p.hidden).map(p => { const { hidden, ...rest } = p; void hidden; return rest as RigPartFrame; }).sort((a, b) => a.z - b.z);
  const bones = new Map<string, RigBoneFrame>(spec.bones.map((b: RigBone) => {
    const p = pose.get(b.id)!;
    return [b.id, { id: b.id, local: local(p.x, p.y, p.rotate, p.sx, p.sy, p.ky), world: mul(toScene, world.get(b.id)!), opacity: alpha.get(b.id)!, length: b.length ?? 0 }];
  }));
  return { frame: f, root, toScene, bones, parts, contacts: contacts.map(([x, y]) => apply(toScene, x, y)) };
}

const IDENT: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** A bone's matrix in root space from its pose and its parent's matrix. */
function boneWorld(b: RigBone, p: Pose, parent: AffineMatrix): AffineMatrix {
  if (b.inheritScale === false && b.parent) {
    // Joint placed by the (possibly foreshortened) parent; orientation from the parent's rotation only.
    const [jx, jy] = apply(parent, p.x, p.y), len = Math.hypot(parent.a, parent.b) || 1, sg = Math.sign(parent.a * parent.d - parent.b * parent.c) || 1;
    const rot = { a: parent.a / len, b: parent.b / len, c: -parent.b / len * sg, d: parent.a / len * sg, e: 0, f: 0 };
    return { ...mul(rot, local(0, 0, p.rotate, p.sx, p.sy, p.ky)), e: jx, f: jy };
  }
  return mul(parent, local(p.x, p.y, p.rotate, p.sx, p.sy, p.ky));
}
function hashString(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
const restCache = new WeakMap<RigSpec, Map<string, AffineMatrix>>();
/** World matrices of the rest pose (no tracks, no drivers): where hips sit when nothing moves. */
function restWorld(spec: RigSpec) {
  let m = restCache.get(spec);
  if (!m) {
    m = new Map();
    for (const b of spec.bones) m.set(b.id, mul(b.parent ? m.get(b.parent)! : IDENT, local(b.x, b.y, b.rotate ?? 0, 1, 1)));
    restCache.set(spec, m);
  }
  return m;
}

export function clockHours(time: readonly { frame: number; hours: number; ease?: EasingSpec }[], frame: number): number {
  if (frame <= time[0].frame) return time[0].hours;
  for (let i = 1; i < time.length; i++) if (frame <= time[i].frame) {
    const a = time[i - 1], b = time[i];
    return a.hours + (b.hours - a.hours) * evaluateEasing(b.ease ?? "linear", (frame - a.frame) / (b.frame - a.frame));
  }
  return time[time.length - 1].hours;
}

/** Where the fetlock sits for a hoof planted at H: on the pastern's circle around H, at the distance from the hip that keeps
 * the leg above nearly straight, behind and above the hoof. Out of range, the pastern points at the hip. */
function fetlockFor(H: [number, number], P: number, J: [number, number], s: number): [number, number] {
  const dx = J[0] - H[0], dy = J[1] - H[1], d = Math.hypot(dx, dy) || 1e-6;
  const toHip: [number, number] = [H[0] + P * dx / d, H[1] + P * dy / d];
  if (d >= P + s || d <= Math.abs(s - P)) return toHip;
  const a = (P * P - s * s + d * d) / (2 * d), h = Math.sqrt(Math.max(0, P * P - a * a)), mx = H[0] + a * dx / d, my = H[1] + a * dy / d;
  const p1: [number, number] = [mx + h * dy / d, my - h * dx / d], p2: [number, number] = [mx - h * dy / d, my + h * dx / d];
  const F = p1[0] < p2[0] ? p1 : p2;
  // A pastern stays steep: it never flattens past ~38° above the ground (lower and it reads as a foot bent the wrong
  // way); beyond that the knee takes the compression.
  const minUp = Math.sin(38 / DEG) * P;
  return H[1] - F[1] >= minUp ? F : [H[0] - Math.cos(38 / DEG) * P, H[1] - minUp];
}
/** Bone `rotate` (0 = pointing down) whose +y points from p to q. */
const directionAngle = (p: [number, number], q: [number, number]) => Math.atan2(-(q[0] - p[0]), q[1] - p[1]) * DEG;

/**
 * A leg with a pastern (hooves, paws). Stance: the hoof is planted and stays put while the body passes; the fetlock rides
 * the pastern so the leg above stays almost straight (a column), sinking under load at mid-stance. Swing: the fetlock
 * follows a ground-speed-matched arc between the lift-off and landing fetlocks, folding high, and the hoof flips back.
 */
function pasternLeg(leg: RigLeg, cycle: number, stance: number, stride: number, lift: number, ground: number, w: number,
  rest: Map<string, AffineMatrix>, byId: Map<string, RigBone>, pose: Map<string, Pose>, world: Map<string, AffineMatrix>, solve: () => void): [number, number] | undefined {
  const upper = byId.get(leg.upper)!, lower = byId.get(leg.lower)!, P = leg.pastern!;
  const [hx] = apply(upper.parent ? mul(rest.get(upper.parent)!, local(upper.x, upper.y, 0, 1, 1)) : local(upper.x, upper.y, 0, 1, 1), 0, 0);
  const t = frac(cycle + leg.phase), R = stride * stance, L = lift * (leg.lift ?? 1), swing = t >= stance;
  // Hooves match ground speed almost fully at lift-off and touch-down: they leave and arrive without skidding.
  const s = swing ? (t - stance) / (1 - stance) : 0, m = -R / stance * (1 - stance) * .85;
  const relStance = (tt: number) => R * (.5 - tt / stance);
  const rel = swing ? hermite(relStance(stance), relStance(0), m, m, s) : relStance(t);
  if (leg.swingHip) { pose.get(leg.upper)!.x += leg.swingHip * rel * w; solve(); }
  const parentM = upper.parent ? world.get(upper.parent)! : IDENT, up = pose.get(leg.upper)!;
  const J = apply(parentM, up.x, up.y), reachS = (leg.straight ?? .985) * (upper.length! + lower.length!);
  const hoofAt = (r: number): [number, number] => [hx + r * w, ground];
  // Unloaded, the pastern continues the line of the leg (it points at the hip); loaded, the fetlock sinks onto the
  // pastern so the leg above stays straight. The load comes on just after touchdown and goes off before push-off.
  const unloaded = (H: [number, number]): [number, number] => { const dx = J[0] - H[0], dy = J[1] - H[1], d = Math.hypot(dx, dy) || 1; return [H[0] + P * dx / d, H[1] + P * dy / d]; };
  // Hoof and pastern "in line": the hoof keeps its standing relation to the pastern (hoofRest), as it does in the air
  // and at break-over; planted, the hoof lies flat whatever the pastern does.
  const hoofRest = leg.hoof ? byId.get(leg.hoof)!.rotate ?? 0 : 0, restAngle = -hoofRest, toe = leg.toe ?? P * .6;
  const along = (theta: number): [number, number] => [-Math.sin(theta / DEG), Math.cos(theta / DEG)];
  const fromHoof = (H: [number, number], theta: number): [number, number] => { const [dx, dy] = along(theta); return [H[0] - P * dx, H[1] - P * dy]; };
  const lerpAngle = (x: number, y: number, k: number) => x + angleDelta(x, y) * k;
  /** Break-over (Muybridge's walk plates; slow-motion gallop studies measure ~90°): at the end of stance the heel lifts
   * and the hoof pivots on its planted toe, the pastern turning with it, so at lift-off hoof and pastern stand in line,
   * sole facing back. Returns the hoof origin, its world angle and the pastern angle at stance fraction k. */
  const BREAK_START = .72, BREAK = 64;
  const breakover = (Hplant: [number, number], k: number, loadedAngle: number) => {
    const b = smooth((k - BREAK_START) / (1 - BREAK_START)), phi = BREAK * b, tip: [number, number] = [Hplant[0] + toe, Hplant[1]];
    const Hb: [number, number] = [tip[0] - toe * Math.cos(phi / DEG), tip[1] - toe * Math.sin(phi / DEG)];
    return { H: Hb, tip, phi, pastern: lerpAngle(loadedAngle, restAngle, b) + phi, active: b > 0 };
  };
  let F: [number, number], aim: [number, number], footAngle: number, hoofLocal = 0, lw = 1, hoofWorld: number | undefined, contact: [number, number] | undefined;
  if (!swing) {
    // Loaded through the stance: the leg stays a straight column on the sinking fetlock, then breaks over the toe.
    const H = hoofAt(rel), k = w < 1 ? 0 : t / stance, Fl = fetlockFor(H, P, J, reachS), br = breakover(H, k, directionAngle(Fl, H));
    if (br.active) { F = fromHoof(br.H, br.pastern); aim = br.H; hoofWorld = br.phi; contact = br.tip; }
    else { F = Fl; aim = H; hoofWorld = 0; contact = H; }
  } else {
    // The hoof leaves standing on its toe, folds high under the body (the fetlock flexes, sole facing back), then the
    // leg unfolds so the last third of the swing is a straight reach that sets the hoof down flat.
    const fold = Math.max(s < .35 ? Math.sin(Math.PI / 2 * s / .35) : Math.cos(Math.PI / 2 * Math.min(1, (s - .35) / .42)) ** 2, .28 * Math.sqrt(Math.sin(Math.PI * s)));
    const lift0 = hoofAt(relStance(stance)), end = breakover(lift0, 1, restAngle), fade = 1 - smooth(s / .3);
    // Everything the swing adds fades with `w`: a leg that stands still in the swing part of the cycle stands flat.
    const H: [number, number] = [hx + rel * w + (end.H[0] - lift0[0]) * fade * w, ground - L * w * fold + (end.H[1] - lift0[1]) * fade * w];
    const Fl = fetlockFor(H, P, J, reachS), hang = directionAngle(unloaded(H), H), land = directionAngle(Fl, H);
    lw = smooth((s - .6) / .4);
    const theta = lerpAngle(land, s < .3 ? lerpAngle(end.pastern, hang, smooth(s / .3)) : lerpAngle(hang, land, lw), w);
    lw = 1 - (1 - lw) * w;
    F = fromHoof(H, theta); aim = H;
  }
  solveTwoBone(leg.upper, leg.lower, leg.bend, F, byId, pose, world, 1);
  solve();
  const shinAngle = angleOf(world.get(leg.lower)!);
  // Aim the pastern from the fetlock the IK actually reached at the hoof's intended point. Planted, it may stretch by a
  // few percent so the hoof (and at break-over its toe) sits exactly where it landed even at full reach.
  const lm = world.get(leg.lower)!, Fa: [number, number] = [lm.c * lower.length! + lm.e, lm.d * lower.length! + lm.f];
  footAngle = directionAngle(Fa, aim);
  if (contact) {
    hoofLocal = hoofWorld! - footAngle;
    const stretch = clamp(Math.hypot(aim[0] - Fa[0], aim[1] - Fa[1]) / P, .85, 1.15);
    pose.get(leg.foot!)!.sy *= stretch;
    if (leg.hoof) pose.get(leg.hoof)!.sy /= stretch;
  } else hoofLocal = lerpAngle(hoofRest, -footAngle, lw);
  if (swing && leg.curl !== undefined) {
    // The fetlock flexes at the top of the swing: pastern and hoof flip back together, done by three quarters of the
    // swing so the reaching leg comes down clean.
    const bump = Math.sin(Math.PI * clamp(s / .75, 0, 1)) * w;
    footAngle = footAngle + angleDelta(footAngle, shinAngle + leg.curl) * bump;
  }
  if (swing) {
    // A swinging hoof never dips through the ground: tilt the pastern forward until it just clears.
    const Fy = lm.d * lower.length! + lm.f, drop = Fy + P * Math.cos(footAngle / DEG);
    if (drop > ground && ground - Fy < P) {
      const tilt = Math.acos(clamp((ground - Fy) / P, -1, 1)) * DEG * (footAngle < 0 ? -1 : 1);
      footAngle = tilt;
    }
  }
  pose.get(leg.foot!)!.rotate = footAngle - shinAngle;
  if (leg.hoof) pose.get(leg.hoof)!.rotate = hoofLocal;
  solve();
  return w > .5 ? contact : undefined;
}

/** Toe-off roll at the end of stance (radians at lift-off). */
const ROLL = .62;
/** How much of the stance sweep speed a swinging foot keeps at lift-off and touch-down (ground-speed matching). */
const SWING_TANGENT = .55;

/**
 * Where a foot goes. During stance it slides back exactly as fast as the body moves forward, so in the world it does
 * not move (a foot with a `toe` rolls up onto the planted toe at the end); during swing it follows a Hermite arc whose
 * end speeds match the stance sweep, so it eases off and onto the ground instead of snapping. Positions are in root
 * space, relative to the hip's rest position.
 */
function legTarget(leg: RigLeg, cycle: number, stance: number, stride: number, lift: number, ground: number, w: number,
  rest: Map<string, AffineMatrix>, byId: Map<string, RigBone>) {
  const upper = byId.get(leg.upper)!;
  const [hx] = apply(upper.parent ? mul(rest.get(upper.parent)!, local(upper.x, upper.y, 0, 1, 1)) : local(upper.x, upper.y, 0, 1, 1), 0, 0);
  const t = frac(cycle + leg.phase), R = stride * stance, sole = leg.sole ?? 0, toe = leg.toe ?? 0, L = lift * (leg.lift ?? 1);
  const stanceAt = (tt: number) => {
    const rel = R * (.5 - tt / stance);
    if (toe <= 0) return { x: rel, y: ground - sole, angle: 0, contact: [rel, ground] as [number, number] };
    // Heel strike lands toe-up and slaps flat; late stance peels the heel up around the planted toe.
    const k = tt / stance, roll = ROLL * smooth((k - .52) / .48), heel = -10 * (1 - smooth(k / .14));
    const c = Math.cos(roll), s = Math.sin(roll), tipX = rel + toe;
    return roll > 0
      ? { x: tipX - toe * c + sole * s, y: ground - toe * s - sole * c, angle: roll * DEG, contact: [tipX, ground] as [number, number] }
      : { x: rel, y: ground - sole, angle: heel, contact: [rel + toe * .4, ground] as [number, number] };
  };
  if (t < stance) {
    const p = stanceAt(t);
    return { hip: hx, foot: [hx + p.x * w, ground - sole + (p.y - ground + sole) * w] as [number, number], swing: false, swingT: 0, stanceAngle: p.angle, swingAngle: 0,
      contact: w > .5 ? [hx + p.contact[0] * w, ground] as [number, number] : undefined };
  }
  const s = (t - stance) / (1 - stance), a = stanceAt(stance - 1e-6), m = -R / stance * (1 - stance) * SWING_TANGENT;
  const x = hermite(a.x, R / 2, m, m, s);
  const y = lerp(a.y, ground - sole, smooth(s)) - L * Math.sin(Math.PI * Math.pow(s, .85));
  // Free foot: leaves the ground pointing down off the toe, then lifts its toe through the swing.
  const swingAngle = toe > 0 ? (s < .35 ? lerp(a.angle, -16, smooth(s / .35)) : lerp(-16, -10, smooth((s - .35) / .65))) : -14 * Math.sin(Math.PI * s);
  return { hip: hx, foot: [hx + x * w, ground - sole + (y - ground + sole) * w] as [number, number], swing: w > .5, swingT: s, stanceAngle: 0, swingAngle, contact: undefined };
}

/**
 * How far (radians) a hand or foot turns at its joint so that its end does not pass the floor. `angle` is its direction
 * (0 forward, π/2 straight down) and `room` the height of the joint above the floor in bone lengths. It starts to turn
 * forward before it lands and lies flat when there is no room left; one that already points well back lies flat backward.
 */
function layOnFloor(angle: number, room: number): number {
  if (angle <= 0 || room >= 1.6) return 0;
  const flat = Math.asin(clamp(room, 0, 1));
  if (angle > Math.PI * 5 / 6) return Math.max(0, Math.PI - flat - angle);
  return Math.min(0, (room > 1 ? Math.PI / 2 * (1 + (room - 1) / .6) : flat) - angle);
}

/**
 * Analytic two-bone IK in root space; blends the upper and lower bones' local rotations toward the solution by `w`.
 * `out` (0..1) points the joint toward the viewer: both bones are drawn shorter, and at 1 the limb is straight. With `low`,
 * a joint that would sit below that y points toward the viewer as far as it takes.
 */
function solveTwoBone(upperId: string, lowerId: string, bend: 1 | -1, target: [number, number], byId: Map<string, RigBone>,
  pose: Map<string, Pose>, world: Map<string, AffineMatrix>, w: number, out = 0, low?: number) {
  const upper = byId.get(upperId)!, lower = byId.get(lowerId)!;
  const parentM = upper.parent ? world.get(upper.parent)! : IDENT;
  const up = pose.get(upperId)!, lo = pose.get(lowerId)!;
  // A limb pointing into depth is drawn shorter (scaleY on its bone): solve with the lengths as drawn.
  let a = upper.length! * Math.abs(up.sy), b = lower.length! * Math.abs(lo.sy) * (lower.inheritScale === false ? 1 : Math.abs(up.sy));
  const [hx, hy] = apply(parentM, up.x, up.y);
  const dx = target[0] - hx, dy = target[1] - hy, base = Math.atan2(dy, dx);
  const upperAngle = (k: number) => {
    const dist = clamp(Math.hypot(dx, dy), Math.abs(a - b) * k + .001, (a + b) * k - .001);
    return base - bend * Math.acos(clamp((a * a * k * k + dist * dist - b * b * k * k) / (2 * a * k * dist), -1, 1));
  };
  // Shortest is the straight limb, whose joint lies between the shoulder and the hand.
  const straight = Math.min(1, Math.hypot(dx, dy) / (a + b));
  let short = 1 - out * w * (1 - straight);
  if (low !== undefined) {
    const limit = Math.max(low, hy), jointY = (k: number) => hy + a * k * Math.sin(upperAngle(k));
    if (jointY(short) > limit) {
      let from = straight, to = short;
      for (let i = 0; i < 24; i++) { const mid = (from + to) / 2; if (jointY(mid) > limit) to = mid; else from = mid; }
      short = from;
    }
  }
  if (short < 1) {
    up.sy *= short; a *= short; b *= short;
    if (lower.inheritScale === false) lo.sy *= short;
  }
  const thigh = upperAngle(1);
  const kx = hx + a * Math.cos(thigh), ky = hy + a * Math.sin(thigh);
  const shin = Math.atan2(target[1] - ky, target[0] - kx);
  const thighDeg = thigh * DEG - 90, shinDeg = shin * DEG - 90;
  const ikUpper = thighDeg - angleOf(parentM), ikLower = shinDeg - thighDeg;
  if (w >= 1) { up.rotate = ikUpper; lo.rotate = ikLower; return; }
  up.rotate += angleDelta(up.rotate, ikUpper) * w;
  lo.rotate += angleDelta(lo.rotate, ikLower) * w;
}

// ---- Drape -----------------------------------------------------------------------------------------------------------------------

/** Where a lock points and how long it is drawn: joint to tip. */
const lockVector = (m: AffineMatrix, length: number): [number, number] => [m.c * length, m.d * length];
const stillCache = new WeakMap<RigSpec, Map<number, RigFrame>>();
/** The locks of a chain in root space as they hang at frame `f` without momentum. */
function stillLocks(spec: RigSpec, f: number, bones: readonly string[]): [number, number][] {
  let frames = stillCache.get(spec);
  if (!frames) stillCache.set(spec, frames = new Map());
  let fr = frames.get(f);
  if (!fr) {
    fr = evaluateRig(spec, f, { momentum: false });
    if (frames.size >= 64) frames.delete(frames.keys().next().value!);
    frames.set(f, fr);
  }
  const back = invert({ ...fr.toScene, e: 0, f: 0 });
  return bones.map(id => { const b = fr.bones.get(id)!, [x, y] = lockVector(b.world, b.length); return apply(back, x, y); });
}
const swingCache = new Map<number, number[]>();
/** The answer of a half-damped pendulum, sampled each frame and summing to 1: it overshoots once, by about a sixth, and settles. */
function swingWeights(period: number): number[] {
  let weights = swingCache.get(period);
  if (!weights) {
    const w0 = 2 * Math.PI / period, wd = w0 * Math.sqrt(.75);
    const raw = Array.from({ length: Math.ceil(period * 1.1) }, (_, t) => Math.exp(-.5 * w0 * (t + .5)) * Math.sin(wd * (t + .5))), sum = raw.reduce((a, b) => a + b, 0);
    swingCache.set(period, weights = raw.map(v => v / sum));
  }
  return weights;
}

/**
 * Hang a chain under gravity, settle it on the colliders and the floor (`rig-strand.ts`), and turn the bones to follow.
 * Rotation never changes a bone's length. `swung` (lock vectors) replaces the hanging pose when the chain has momentum.
 */
function drape(d: Extract<RigDriver, { type: "drape" }>, w: number, ground: number, byId: Map<string, RigBone>, pose: Map<string, Pose>,
  world: Map<string, AffineMatrix>, rest: Map<string, AffineMatrix>, solve: () => void, swung?: readonly [number, number][]) {
  const r = d.radius ?? 0, n = d.bones.length;
  // A local turn shows mirrored in the world under a mirrored parent.
  const parentSign = (id: string) => { const p = byId.get(id)!.parent, m = p ? world.get(p)! : IDENT; return Math.sign(m.a * m.d - m.b * m.c) || 1; };
  const tilted = (bone: string) => angleDelta(angleOf(rest.get(bone)!), angleOf(world.get(bone)!));
  const parent = byId.get(d.bones[0])!.parent;
  if (d.hang && parent && !swung) {
    // Undo the parent's tilt from rest, more of it down the chain, so the root follows the head and the tip hangs straight.
    // Each bone blends two directions (with the parent, and hanging), not two angles: an angle flips sign upside down.
    const tilt = tilted(parent) / DEG, undone = (k: number) => Math.atan2(k * Math.sin(tilt), 1 - k + k * Math.cos(tilt)) * DEG;
    d.bones.forEach((id, i) => { pose.get(id)!.rotate -= parentSign(id) * w * angleDelta(undone(d.hang! * i / n), undone(d.hang! * (i + 1) / n)); });
    solve();
  }
  // A body tipped past `slip` no longer holds the strand: its collider fades out over +-10 degrees, so the strand slips off
  // and hangs beside it in depth.
  const slip = d.slip ?? 65;
  const capsules = (d.colliders ?? []).map(c => {
    const m = world.get(c.bone)!, hold = 1 - smooth((Math.abs(tilted(c.bone)) - slip + 10) / 20);
    const a = apply(m, c.at[0], c.at[1]), b = c.to ? apply(m, c.to[0], c.to[1]) : a;
    const side = c.side && [m.a * c.side[0] + m.c * c.side[1], m.b * c.side[0] + m.d * c.side[1]] as const;
    return { a, b, side, r: hold * (c.radius * (Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1) + r) };
  }).filter(c => c.r > 0);
  const tipOf = (id: string) => apply(world.get(id)!, 0, byId.get(id)!.length!);
  const hang = [apply(world.get(d.bones[0])!, 0, 0), ...d.bones.map(tipOf)];
  if (swung) swung.forEach((v, i) => {
    const k = Math.min(1, byId.get(d.bones[i])!.length! / (Math.hypot(v[0], v[1]) || 1)); // the overshoot turns a lock, it does not stretch it
    hang[i + 1] = [hang[i][0] + v[0] * k, hang[i][1] + v[1] * k];
  });
  const pm = parent ? world.get(parent)! : IDENT;
  const floorSide = d.floorSide && (pm.a * d.floorSide[0] + pm.c * d.floorSide[1]) / (Math.hypot(pm.a * d.floorSide[0] + pm.c * d.floorSide[1], pm.b * d.floorSide[0] + pm.d * d.floorSide[1]) || 1);
  const settled = settleStrand(hang, capsules, { floor: d.floor ? ground - (d.floor === true ? 0 : d.floor) - r : undefined, floorSide, floorFree: !!swung });
  const heading = (a: readonly [number, number], b: readonly [number, number]) => Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * DEG;
  d.bones.forEach((id, i) => {
    const bone = byId.get(id)!, want = heading(settled[i], settled[i + 1]), from = pose.get(id)!.rotate, sign = parentSign(id);
    // A lock lying toward the viewer is drawn shorter; its children keep their own length (`inheritScale: false`).
    if (bone.inheritScale === false) pose.get(id)!.sy = Math.max(.15, Math.min(1, Math.hypot(settled[i + 1][0] - settled[i][0], settled[i + 1][1] - settled[i][1]) / bone.length!));
    // Twice, because an uneven scale above the bone (a breathing torso) skews how far one local turn goes.
    for (let k = 0; k < 2; k++) {
      const m = world.get(id)!;
      pose.get(id)!.rotate += sign * angleDelta(heading([m.e, m.f], tipOf(id)), want);
      solve();
    }
    if (w < 1) { pose.get(id)!.rotate = from + (pose.get(id)!.rotate - from) * w; solve(); }
  });
}

// ---- Shapes ----------------------------------------------------------------------------------------------------------------------

const r2 = (v: number) => Math.round(v * 100) / 100;
/** SVG path data for any rig shape (bone-local coordinates). */
export function shapePath(shape: RigShape): string {
  switch (shape.type) {
    case "path": return shape.d;
    case "ellipse": {
      const cx = shape.cx ?? 0, cy = shape.cy ?? 0;
      return `M${r2(cx - shape.rx)} ${r2(cy)}A${r2(shape.rx)} ${r2(shape.ry)} 0 1 0 ${r2(cx + shape.rx)} ${r2(cy)}A${r2(shape.rx)} ${r2(shape.ry)} 0 1 0 ${r2(cx - shape.rx)} ${r2(cy)}Z`;
    }
    case "rect": {
      const { x, y, width: w, height: h } = shape, r = Math.min(shape.radius ?? 0, w / 2, h / 2);
      if (!r) return `M${r2(x)} ${r2(y)}H${r2(x + w)}V${r2(y + h)}H${r2(x)}Z`;
      return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}Z`;
    }
    case "capsule": {
      const a = shape.w0 / 2, b = shape.w1 / 2, L = shape.length;
      return `M${r2(-a)} 0A${r2(a)} ${r2(a)} 0 0 1 ${r2(a)} 0L${r2(b)} ${r2(L)}A${r2(b)} ${r2(b)} 0 0 1 ${r2(-b)} ${r2(L)}Z`;
    }
    case "polygon": return "M" + shape.points.map(p => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
  }
}
export const matrixAttr = (m: AffineMatrix) => `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(v => Math.round(v * 10000) / 10000).join(" ")})`;
export { apply as applyRigMatrix, angleOf as rigMatrixAngle };
