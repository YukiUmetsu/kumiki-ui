/**
 * RIG1 evaluator: `evaluateRig(spec, frame)` → every part's matrix, outline and opacity at that frame.
 *
 * Passes, all pure in the absolute frame:
 *   1. root travel (keys) → distance travelled and speed, which drive gaits and wheels;
 *   2. rest pose + keyed tracks + pose drivers (wings, chains, wheels, spins, oscillators, pendulums, clocks);
 *   3. world matrices in root space (forward = +x; facing is applied once, at the root);
 *   4. gaits: feet planted on the ground by analytic two-bone IK, so a stance foot stays exactly where it landed;
 *   5. crank linkages and emitters, which need world positions;
 *   6. part outlines (variants resolved) sorted by z.
 * Nothing accumulates between calls, so any frame can be rendered alone.
 */
import { evaluateEasing } from "../motion/easing";
import type { AffineMatrix } from "../motion/types";
import type { RigBone, RigKey, RigLeg, RigPart, RigRole, RigRootKey, RigShape, RigSpec, RigWindow } from "./rig-spec";

// ---- Matrices (row form a b c d e f, applied as x' = a x + c y + e) -----------------------------------------------------------------

const mul = (p: AffineMatrix, q: AffineMatrix): AffineMatrix => ({ // p ∘ q: apply q, then p
  a: p.a * q.a + p.c * q.b, b: p.b * q.a + p.d * q.b, c: p.a * q.c + p.c * q.d, d: p.b * q.c + p.d * q.d,
  e: p.a * q.e + p.c * q.f + p.e, f: p.b * q.e + p.d * q.f + p.f,
});
const local = (x: number, y: number, deg: number, sx: number, sy: number): AffineMatrix => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return { a: c * sx, b: s * sx, c: -s * sy, d: c * sy, e: x, f: y };
};
const apply = (m: AffineMatrix, x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const invert = (m: AffineMatrix): AffineMatrix => {
  const det = m.a * m.d - m.b * m.c || 1e-9;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
};
/** World rotation (degrees) of a matrix without skew. */
const angleOf = (m: AffineMatrix) => Math.atan2(m.b, m.a) * 180 / Math.PI;
const DEG = 180 / Math.PI;

// ---- Small helpers ---------------------------------------------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const frac = (v: number) => v - Math.floor(v);
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

// ---- Root travel -----------------------------------------------------------------------------------------------------------------

export interface RigRootState { x: number; y: number; rotate: number; facing: 1 | -1; distance: number; speed: number; vy: number }

function rootSample(keys: readonly RigRootKey[], frame: number): { x: number; y: number; rotate: number } {
  if (!keys.length) return { x: 0, y: 0, rotate: 0 };
  if (frame <= keys[0].frame) return { x: keys[0].x, y: keys[0].y ?? 0, rotate: keys[0].rotate ?? 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (frame <= b.frame) {
      const t = evaluateEasing(b.ease ?? "ease-in-out-quad", (frame - a.frame) / (b.frame - a.frame));
      return { x: a.x + (b.x - a.x) * t, y: (a.y ?? 0) + ((b.y ?? a.y ?? 0) - (a.y ?? 0)) * t, rotate: (a.rotate ?? 0) + ((b.rotate ?? a.rotate ?? 0) - (a.rotate ?? 0)) * t };
    }
  }
  const z = keys[keys.length - 1];
  return { x: z.x, y: z.y ?? 0, rotate: z.rotate ?? 0 };
}
/** Root position, facing, path distance travelled and speed at a frame. */
export function rootState(spec: RigSpec, frame: number): RigRootState {
  const keys = spec.root ?? [];
  const p = rootSample(keys, frame);
  // Distance is the path length up to the frame (segments are monotonic in x for the default easings).
  let distance = 0, facing: 1 | -1 = 1;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const segEnd = Math.min(frame, b.frame);
    if (segEnd <= a.frame) break;
    const q = rootSample(keys, segEnd);
    distance += Math.hypot(q.x - a.x, q.y - (a.y ?? 0));
    if (b.x !== a.x) facing = b.x > a.x ? 1 : -1;
  }
  for (const k of keys) if (k.frame <= frame && k.facing) facing = k.facing;
  if (keys.length && frame < keys[0].frame && keys[0].facing) facing = keys[0].facing;
  const before = rootSample(keys, frame - 1), after = rootSample(keys, frame + 1);
  return { ...p, facing, distance, speed: Math.hypot(after.x - before.x, after.y - before.y) / 2, vy: (after.y - before.y) / 2 };
}

// ---- Pose ------------------------------------------------------------------------------------------------------------------------

interface Pose { x: number; y: number; rotate: number; sx: number; sy: number; opacity: number }

function trackAt(keys: readonly RigKey[] | undefined, frame: number): Partial<Pose> {
  if (!keys?.length) return {};
  const out: Partial<Pose> = {};
  const channels: [keyof RigKey, keyof Pose][] = [["x", "x"], ["y", "y"], ["rotate", "rotate"], ["scaleX", "sx"], ["scaleY", "sy"], ["opacity", "opacity"]];
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
export function wingStroke(u: number): number {
  const t = frac(u);
  return t < .4 ? Math.cos(Math.PI * t / .4) : -Math.cos(Math.PI * (t - .4) / .6);
}

export interface RigBoneFrame { id: string; local: AffineMatrix; world: AffineMatrix; opacity: number; length: number }
export interface RigPartFrame { id: string; bone: string; role: RigRole; shape: RigShape; matrix: AffineMatrix; z: number; color?: string; opacity: number; line?: boolean; lineWidth?: number; variant?: string; far?: boolean }
export interface RigFrame {
  frame: number;
  root: RigRootState;
  /** Root space → scene: translate to the root, rotate, mirror for facing. */
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
}

/** Evaluate a rig at a frame. Pure: no state survives between calls. */
export function evaluateRig(spec: RigSpec, frame: number, options: RigEvaluateOptions = {}): RigFrame {
  const cadence = Math.max(1, Math.round(options.cadence ?? 1));
  const reduced = !!options.reducedMotion;
  const lastRoot = spec.root?.length ? spec.root[spec.root.length - 1].frame : 0;
  const f = reduced ? Math.max(frame, lastRoot) : Math.floor(frame / cadence) * cadence;
  const root = rootState(spec, options.stepRoot || reduced ? f : frame);
  const rootForPose = rootState(spec, f);
  const byId = new Map(spec.bones.map(b => [b.id, b]));
  const pose = new Map<string, Pose>();
  for (const b of spec.bones) {
    const t = trackAt(spec.tracks?.[b.id], f);
    pose.set(b.id, { x: b.x + (t.x ?? 0), y: b.y + (t.y ?? 0), rotate: (b.rotate ?? 0) + (t.rotate ?? 0), sx: t.sx ?? 1, sy: t.sy ?? 1, opacity: t.opacity ?? 1 });
  }
  const drivers = reduced ? (spec.drivers ?? []).filter(d => d.type === "clock" || d.type === "variant" && d.mode === "keys") : spec.drivers ?? [];
  const variants = new Map<string, string>();
  const seedBase = hashString(spec.id);

  // Pass 2: pose drivers.
  for (const d of drivers) {
    const w = envelope(d, f);
    if (w <= 0 && d.type !== "clock" && d.type !== "variant") continue;
    const P = (id: string) => pose.get(id)!;
    switch (d.type) {
      case "wing": {
        const u = f / d.period + (d.phase ?? 0), s = wingStroke(u), fold = d.fold ?? 40;
        P(d.shoulder).rotate += w * ((d.bias ?? 0) + d.amplitude * s);
        if (d.elbow) P(d.elbow).rotate += w * fold * Math.max(0, -wingStroke(u - .08)) * .9;
        if (d.tip) P(d.tip).rotate += w * (d.amplitude * .35 * wingStroke(u - .14) + fold * .5 * Math.max(0, -wingStroke(u - .14)));
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
      case "wheel":
        for (const id of d.bones) P(id).rotate += (rootForPose.distance / d.radius) * DEG + (d.extra ?? 0) * f;
        break;
      case "spin": {
        const t = f - (d.start ?? 0), up = d.spinUp ?? 0;
        const turned = up > 0 && t < up ? d.speed * t * t / (2 * up) : d.speed * (t - up / 2);
        P(d.bone).rotate += t > 0 ? turned : 0;
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
      case "bank": {
        const angle = Math.atan2(rootForPose.vy, Math.max(.01, rootForPose.speed)) * DEG;
        root.rotate += clamp(angle * d.amount, -(d.max ?? 35), d.max ?? 35) * w;
        break;
      }
      default: break;
    }
  }

  // Pass 3: world matrices (root space).
  const order = spec.bones;
  const world = new Map<string, AffineMatrix>(), alpha = new Map<string, number>();
  const solve = () => {
    for (const b of order) {
      const p = pose.get(b.id)!, m = local(p.x, p.y, p.rotate, p.sx, p.sy);
      const parent = b.parent ? world.get(b.parent)! : IDENT;
      world.set(b.id, mul(parent, m));
      alpha.set(b.id, (b.parent ? alpha.get(b.parent)! : 1) * p.opacity);
    }
  };
  solve();

  // Pass 4: gaits.
  const contacts: [number, number][] = [];
  for (const d of drivers) {
    if (d.type !== "gait") continue;
    const w = envelope(d, f);
    const ground = d.ground ?? spec.ground ?? 0, stance = d.stance ?? .6, lift = d.lift ?? d.stride * .12;
    const moving = rootForPose.speed > .05 || !!d.idleCycle;
    const cyc = rootForPose.speed > .05 || !d.idleCycle ? rootForPose.distance / d.stride : (f - (d.start ?? 0)) / d.idleCycle;
    // Body bob: lowest when feet are spread, twice per cycle for a symmetric gait.
    if (moving && d.bob) pose.get(d.body)!.y += w * d.bob * (.5 - .5 * Math.cos(4 * Math.PI * cyc));
    for (const sw of d.swing ?? []) pose.get(sw.bone)!.rotate += (moving ? w : 0) * sw.amplitude * Math.cos(2 * Math.PI * (sw.harmonic ?? 1) * (cyc + sw.phase));
    solve();
    for (const leg of d.legs) {
      const target = legTarget(leg, cyc, stance, d.stride, lift, ground, w * (moving ? 1 : 0), world, byId);
      solveLeg(leg, target.foot, byId, pose, world);
      solve();
      if (leg.foot) {
        const shinAngle = angleOf(world.get(leg.lower)!);
        pose.get(leg.foot)!.rotate = (target.swing ? -14 * Math.sin(Math.PI * target.swingT) * w : 0) - shinAngle + (byId.get(leg.foot)!.rotate ?? 0);
        solve();
      }
      if (!target.swing) contacts.push([target.foot[0], ground]);
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
      const n = Math.floor((f - start) / d.every);
      d.puffs.forEach((id, j) => {
        const p = pose.get(id)!, b = byId.get(id)!;
        const e = n - (((n - j) % N) + N) % N, age = f - start - e * d.every;
        if (e < 0 || age < 0 || age >= d.life || envelope(d, start + e * d.every) <= 0) { p.opacity = 0; return; }
        const t = age / d.life;
        // Born at the origin, left behind in the world as the root moves on, drifting on the velocity.
        const back = (rootState(spec, f).distance - rootState(spec, start + e * d.every).distance);
        const wob = (d.drift ?? 0) * Math.sin(age * .21 + j * 1.7);
        const wx = ox - back + d.velocity[0] * age + wob, wy = oy + d.velocity[1] * age;
        const pm = b.parent ? world.get(b.parent)! : IDENT, [lx, ly] = apply(invert(pm), wx, wy);
        p.x = lx; p.y = ly;
        const s = 1 + d.growth * t;
        p.sx = s; p.sy = s; p.opacity = Math.min(1, t * 6) * (1 - t) ** 1.4;
      });
      solve();
    }
  }
  for (const d of drivers) if (d.type === "wheel") for (const id of d.bones) {
    const [x] = apply(world.get(id)!, 0, 0);
    contacts.push([x, spec.ground ?? 0]);
  }

  // Pass 6: parts.
  const toScene = mul(local(root.x, root.y, root.rotate, 1, 1), local(0, 0, 0, root.facing, 1));
  const parts: RigPartFrame[] = spec.parts.map((q: RigPart) => {
    const v = variants.get(q.id);
    return {
      id: q.id, bone: q.bone, role: q.role, z: q.z, color: q.color, line: q.line, lineWidth: q.lineWidth, variant: v, far: q.far,
      shape: v && q.variants?.[v] ? q.variants[v] : q.shape,
      matrix: mul(toScene, world.get(q.bone)!), opacity: alpha.get(q.bone)!,
    };
  }).filter(p => p.opacity > .003).sort((a, b) => a.z - b.z);
  const bones = new Map<string, RigBoneFrame>(spec.bones.map((b: RigBone) => {
    const p = pose.get(b.id)!;
    return [b.id, { id: b.id, local: local(p.x, p.y, p.rotate, p.sx, p.sy), world: mul(toScene, world.get(b.id)!), opacity: alpha.get(b.id)!, length: b.length ?? 0 }];
  }));
  return { frame: f, root, toScene, bones, parts, contacts: contacts.map(([x, y]) => apply(toScene, x, y)) };
}

const IDENT: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function hashString(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

export function clockHours(time: readonly { frame: number; hours: number; ease?: import("../motion/types").EasingSpec }[], frame: number): number {
  if (frame <= time[0].frame) return time[0].hours;
  for (let i = 1; i < time.length; i++) if (frame <= time[i].frame) {
    const a = time[i - 1], b = time[i];
    return a.hours + (b.hours - a.hours) * evaluateEasing(b.ease ?? "linear", (frame - a.frame) / (b.frame - a.frame));
  }
  return time[time.length - 1].hours;
}

/**
 * Where a foot goes. During stance it slides back exactly as fast as the body moves forward, so in the world it does
 * not move; during swing it arcs forward to the next plant. Positions are relative to the hip's neutral drop.
 */
function legTarget(leg: RigLeg, cycle: number, stance: number, stride: number, lift: number, ground: number, w: number,
  world: Map<string, AffineMatrix>, byId: Map<string, RigBone>) {
  const upper = byId.get(leg.upper)!;
  const [hx] = apply(upper.parent ? mul(world.get(upper.parent)!, local(upper.x, upper.y, 0, 1, 1)) : local(upper.x, upper.y, 0, 1, 1), 0, 0);
  const c = cycle + leg.phase, t = frac(c), reach = stride * stance;
  let rel: number, up = 0, swing = false, swingT = 0;
  if (t < stance) rel = reach * (.5 - t / stance);
  else {
    swing = true; swingT = (t - stance) / (1 - stance);
    rel = reach * (-.5 + smooth(swingT));
    up = lift * Math.sin(Math.PI * swingT);
  }
  const sole = leg.sole ?? 0;
  return { foot: [hx + rel * w, ground - sole - up * w] as [number, number], swing: swing && w > .5, swingT };
}

/** Analytic two-bone IK in root space; writes the upper and lower bones' local rotations. */
function solveLeg(leg: RigLeg, target: [number, number], byId: Map<string, RigBone>, pose: Map<string, Pose>, world: Map<string, AffineMatrix>) {
  const upper = byId.get(leg.upper)!, lower = byId.get(leg.lower)!;
  const a = upper.length!, b = lower.length!;
  const parentM = upper.parent ? world.get(upper.parent)! : IDENT;
  const [hx, hy] = apply(parentM, pose.get(leg.upper)!.x, pose.get(leg.upper)!.y);
  const dx = target[0] - hx, dy = target[1] - hy;
  const dist = clamp(Math.hypot(dx, dy), Math.abs(a - b) + .001, a + b - .001);
  const base = Math.atan2(dy, dx);
  const inner = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1));
  const thigh = base - leg.bend * inner;
  const kx = hx + a * Math.cos(thigh), ky = hy + a * Math.sin(thigh);
  const shin = Math.atan2(target[1] - ky, target[0] - kx);
  const thighDeg = thigh * DEG - 90, shinDeg = shin * DEG - 90;
  pose.get(leg.upper)!.rotate = thighDeg - angleOf(parentM);
  pose.get(leg.lower)!.rotate = shinDeg - thighDeg;
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
