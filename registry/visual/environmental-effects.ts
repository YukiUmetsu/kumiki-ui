/** V09 `EnvironmentalEffects` — seeded, bounded, illustrative rain, snow, dust, drips,
 * condensation and stains, and the cinematic kinds: embers, sparks, bokeh, motes and fireflies.
 *
 * Every particle is a closed-form function of (seed, index, frame): there is no
 * simulation state, so any frame in any seek order renders identically and
 * memory is bounded by the declared budget (capped; `budget-capped` is
 * reported). Effects are **always illustrative**: intensity is a visual
 * density, not rainfall, humidity or leak rate, and the plan says so
 * (`illustrative: true`, with a caption). Reduced motion is a first-class
 * variant: particles freeze at a representative frame (`static`) or the effect
 * is hidden, while persistent results such as stains stay visible.
 *
 * Geometry is in asset units. Renderers: `environmental-effects-three`
 * (points, streaks, instanced droplets, stain decals) and
 * `EnvironmentalEffectsSvg` (any 2D projection).
 */

import { inspectParticleUse } from "./particle-guide";

export type EffectKind = "rain" | "snow" | "dust" | "hail" | "splash" | "drips" | "condensation" | "stain" | "snow-cover" | "embers" | "sparks" | "bokeh" | "motes" | "fireflies" | "assemble" | "flow";
export type Vec3 = readonly [number, number, number];

/** A planar surface: origin, two in-plane axes (unit vectors) and extents along them. */
export interface EffectSurface { origin: Vec3; u: Vec3; v: Vec3; size: readonly [number, number] }

export interface EffectSpec {
  id: string;
  kind: EffectKind;
  /** Volume for rain/snow/dust (particles wrap inside it). */
  region?: { min: Vec3; max: Vec3 };
  /** Surface for condensation (droplets on it) and stains (growing patch on it). `v` points "up" on the surface. */
  surface?: EffectSurface;
  /** Leak points for drips, with the floor height (y) drops fall to. */
  sources?: Vec3[];
  floorY?: number;
  /** Visual density 0–1 (illustrative). @default 0.6 */
  intensity?: number;
  /** Horizontal drift per frame (asset units). @default [0, 0, 0] */
  wind?: Vec3;
  /** Gusts: wind(t) = wind · (1 + amount · cos(2πt / period + phase)), integrated exactly. */
  gust?: { amount: number; period: number };
  /** Snow drawn with motion streaks as well as flakes (blizzards). */
  streaks?: boolean;
  /** Particle size multiplier. @default 1 */
  scale?: number;
  /** Color override for renderers (CSS color). */
  color?: string;
  /** Snow cover: surfaces it settles on (`v` downhill on slopes), max depth and the frames it takes to build up. */
  cover?: { surfaces: EffectSurface[]; depth: number; buildFrames?: number };
  seed?: number;
  /** Maximum particles requested; capped at 4000. @default by kind */
  budget?: number;
  /** Fall speed (units per frame) override. */
  speed?: number;
  /** Active window with fades. */
  frames?: { start?: number; end?: number; fadeIn?: number; fadeOut?: number };
  /** Reduced-motion variant. @default "static" */
  reducedMotion?: "static" | "hide";
  /** Caption shown with the effect. @default "<kind> (illustrative)" */
  label?: string;
  /** Sparks: one burst at a host frame, thrown from `origin` around `direction`. Speeds are units per frame; gravity is units per frame squared. */
  burst?: { frame: number; origin: Vec3; direction?: Vec3; spread?: number; speed?: number; gravity?: number; drag?: number; restitution?: number; life?: number };
  /** Motes: the light beam they glint in. Outside the cone they all but vanish, as dust does out of the light. `angle` is the half-angle in radians. */
  beam?: { origin: Vec3; direction: Vec3; angle: number };
  /** Embers and fireflies: frames one particle lives, or one blink cycle lasts. */
  life?: number;
  /** Assemble: particles fly from scattered points in `region` to `targets` (a shape, for example from `sampleShapeTargets`) between two host frames.
   * `stagger` from 0 to 1 spreads the arrivals; `dissolve` plays it backwards, so a shape breaks apart. */
  assemble?: { targets: readonly Vec3[]; startFrame: number; endFrame: number; stagger?: number; dissolve?: boolean };
  /** Flow: particles stream along a path, for movement from one thing to another. Density shows rough volume, not an exact value.
   * `speed` is the share of the path a particle crosses per frame. */
  flow?: { path: readonly Vec3[]; speed?: number; spread?: number };
  /** What the particles are for in the shot. A job the kind does not suit is reported; see `PARTICLE_GUIDE`. */
  job?: string;
}

export interface EffectPlan {
  spec: EffectSpec;
  count: number;
  caption: string;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string }[];
}

export interface EffectFrame {
  id: string;
  kind: EffectKind;
  /** Overall opacity from the active window and fades. */
  opacity: number;
  count: number;
  /** xyz per particle (asset units). */
  positions: Float32Array;
  /** Per-particle size (asset units) and alpha. */
  sizes: Float32Array;
  alphas: Float32Array;
  /** For rain: streak tail offsets (xyz) per particle. For drips: elongation along y. */
  tails?: Float32Array;
  /** For stains: patch center, radius and the surface it lies on. */
  stain?: { center: Vec3; radius: number; surface: EffectSurface };
  /** For snow cover: current depth on each surface (persistent; grows, never shrinks while active). */
  cover?: { surfaces: EffectSurface[]; depth: number; maxDepth: number };
  /** Embers and sparks: heat per particle, from 1 (white-hot) to 0 (cooled). Renderers map it to colour. */
  heats?: Float32Array;
  illustrative: true;
  caption: string;
  staticPose: boolean;
}

const CAP = 4000;
const DEFAULT_BUDGET: Record<EffectKind, number> = { rain: 1800, snow: 1400, dust: 600, hail: 900, splash: 500, drips: 24, condensation: 420, stain: 1, "snow-cover": 1,
  embers: 260, sparks: 160, bokeh: 36, motes: 700, fireflies: 40, assemble: 1400, flow: 260 };

/** Heat to colour for embers and sparks, as glowing metal cools: white-hot, yellow, orange, then deep red. Channels run 0 to 1. */
export function heatColor(heat: number): [number, number, number] {
  const h = Math.max(0, Math.min(1, heat)), stops: [number, [number, number, number]][] = [[0, [0.45, 0.06, 0.02]], [0.35, [0.95, 0.32, 0.06]], [0.7, [1, 0.72, 0.28]], [1, [1, 0.97, 0.86]]];
  const i = Math.max(1, stops.findIndex(([at]) => at >= h)), [a0, c0] = stops[i - 1], [a1, c1] = stops[i], t = (h - a0) / (a1 - a0 || 1);
  return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
}

/** Deterministic hash → [0, 1). */
function rnd(seed: number, i: number, k: number) {
  let h = (seed * 374761393 + i * 668265263 + k * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}
const wrap = (x: number, lo: number, hi: number) => { const r = hi - lo || 1; return lo + ((((x - lo) % r) + r) % r); };

export function compileEffect(spec: EffectSpec): EffectPlan {
  const diagnostics: EffectPlan["diagnostics"] = [];
  const needs: Record<EffectKind, "region" | "surface" | "sources" | "cover" | "burst" | "assemble" | "flow"> = { rain: "region", snow: "region", dust: "region", hail: "region", splash: "region", drips: "sources", condensation: "surface", stain: "surface", "snow-cover": "cover", embers: "region", sparks: "burst", bokeh: "region", motes: "region", fireflies: "region", assemble: "assemble", flow: "flow" };
  const need = needs[spec.kind];
  if (need === "cover" && !spec.cover?.surfaces.length) throw new Error(`Effect "${spec.id}" (snow-cover) needs cover surfaces.`);
  if (need === "region" && !spec.region) throw new Error(`Effect "${spec.id}" (${spec.kind}) needs a region.`);
  if (need === "surface" && !spec.surface) throw new Error(`Effect "${spec.id}" (${spec.kind}) needs a surface.`);
  if (need === "sources" && !spec.sources?.length) throw new Error(`Effect "${spec.id}" (drips) needs at least one source point.`);
  if (need === "burst" && !spec.burst) throw new Error(`Effect "${spec.id}" (sparks) needs a burst: a frame and an origin.`);
  if (need === "assemble" && !spec.assemble?.targets.length) throw new Error(`Effect "${spec.id}" (assemble) needs targets: the points of the shape to form.`);
  if (need === "flow" && !((spec.flow?.path.length ?? 0) >= 2)) throw new Error(`Effect "${spec.id}" (flow) needs a path of at least two points.`);
  const intensity = Math.max(0, Math.min(1, spec.intensity ?? 0.6));
  const requested = spec.kind === "stain" || spec.kind === "snow-cover" ? 1 : Math.round((spec.budget ?? DEFAULT_BUDGET[spec.kind]) * (spec.kind === "drips" ? 1 : intensity));
  let count = requested;
  if (requested > CAP) { count = CAP; diagnostics.push({ code: "budget-capped", severity: "warning", message: `"${spec.id}" asked for ${requested} particles; capped at ${CAP}.` }); }
  if (spec.kind === "drips") count = Math.min(count, spec.sources!.length * 4);
  // One particle per target point, so the shape is exactly the shape asked for.
  if (spec.kind === "assemble") count = Math.min(CAP, spec.assemble!.targets.length);
  const caption = spec.label ?? `${spec.kind[0].toUpperCase()}${spec.kind.slice(1)} (illustrative, not measured)`;
  diagnostics.push({ code: "illustrative", severity: "info", message: `"${spec.id}" is an illustrative ${spec.kind} effect; its density and speed do not represent measured rates.` });
  for (const problem of inspectParticleUse(spec, count)) diagnostics.push(problem);
  return { spec, count, caption, diagnostics };
}

/** Points of a shape for `assemble`, sampled from an RGBA picture of a silhouette (alpha above `threshold`). Pure and deterministic.
 * The shape is centred and scaled to `width` world units, with y up. */
export function sampleShapeTargets(pixels: ArrayLike<number>, w: number, h: number, count: number, options: { width?: number; center?: Vec3; threshold?: number; seed?: number } = {}): Vec3[] {
  const inside: number[] = [], threshold = options.threshold ?? 128;
  for (let i = 0; i < w * h; i++) if (pixels[i * 4 + 3] >= threshold) inside.push(i);
  if (!inside.length) return [];
  const width = options.width ?? 2, c = options.center ?? [0, 0, 0], seed = options.seed ?? 1, out: Vec3[] = [];
  const n = Math.min(count, inside.length), step = inside.length / n;
  for (let k = 0; k < n; k++) {
    const i = inside[Math.min(inside.length - 1, Math.floor((k + rnd(seed, k, 0)) * step))];
    const x = (i % w + rnd(seed, k, 1)) / w - .5, y = .5 - (Math.floor(i / w) + rnd(seed, k, 2)) / h;
    out.push([c[0] + x * width, c[1] + y * width * h / w, c[2] + (rnd(seed, k, 3) - .5) * width * .02]);
  }
  return out;
}

/** Particles at an absolute frame. Pure. */
export function evaluateEffect(plan: EffectPlan, frame: number, options: { reducedMotion?: boolean } = {}): EffectFrame {
  const s = plan.spec, seed = s.seed ?? 7, n = plan.count;
  const start = s.frames?.start ?? 0, end = s.frames?.end ?? Infinity, fi = s.frames?.fadeIn ?? 20, fo = s.frames?.fadeOut ?? 20;
  const reduced = !!options.reducedMotion;
  const persistent = s.kind === "stain" || s.kind === "snow-cover";
  const hide = reduced && (s.reducedMotion ?? "static") === "hide" && !persistent;
  const opacity = hide ? 0 : Math.max(0, Math.min(1, (frame - start) / Math.max(1, fi), end === Infinity ? 1 : (end - frame) / Math.max(1, fo)));
  // Reduced motion freezes moving particles at a representative frame; persistent results (stains, condensation growth) keep time.
  const t = reduced && !persistent && s.kind !== "condensation" ? start + 45 : frame;
  const local = Math.max(0, t - start);
  const positions = new Float32Array(n * 3), sizes = new Float32Array(n), alphas = new Float32Array(n);
  const wind = s.wind ?? [0, 0, 0], sizeK = s.scale ?? 1;
  // Exact integral of the gusting wind factor from 0 to `tt`, and its instantaneous value (per-particle phase).
  const gustInt = (tt: number, ph: number) => { const g = s.gust; if (!g || g.period <= 0) return tt; const w = (2 * Math.PI) / g.period; return tt + (g.amount / w) * (Math.sin(w * tt + ph) - Math.sin(ph)); };
  const gustNow = (tt: number, ph: number) => { const g = s.gust; if (!g || g.period <= 0) return 1; return 1 + g.amount * Math.cos(((2 * Math.PI) / g.period) * tt + ph); };
  const base = { id: s.id, kind: s.kind, opacity, count: n, positions, sizes, alphas, illustrative: true as const, caption: plan.caption, staticPose: reduced };
  if (s.kind === "rain" || s.kind === "snow" || s.kind === "dust") {
    const { min, max } = s.region!;
    const tails = s.kind === "rain" || (s.kind === "snow" && s.streaks) ? new Float32Array(n * 3) : undefined;
    const fall = s.speed ?? (s.kind === "rain" ? (max[1] - min[1]) / 22 : s.kind === "snow" ? (max[1] - min[1]) / 260 : 0);
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      const v = fall * (0.8 + 0.4 * r3);
      let x = min[0] + r0 * (max[0] - min[0]), y = min[1] + r1 * (max[1] - min[1]), z = min[2] + r2 * (max[2] - min[2]);
      if (s.kind === "dust") {
        // Slow drift as a sum of sines (bounded, smooth).
        const a = local * 0.012;
        x += Math.sin(a * (1 + r3) + r0 * 20) * 0.25 + wind[0] * local; y += Math.sin(a * 0.7 + r1 * 30) * 0.12; z += Math.cos(a * (1.3 - r3 * 0.5) + r2 * 25) * 0.25 + wind[2] * local;
      } else {
        y -= v * local;
        const drift = gustInt(local, r0 * 0.8) * (s.kind === "snow" ? 0.6 : 1);
        x += wind[0] * drift + (s.kind === "snow" ? Math.sin(local * 0.05 + r0 * 40) * 0.15 : 0);
        z += wind[2] * drift + (s.kind === "snow" ? Math.cos(local * 0.043 + r2 * 40) * 0.15 : 0);
      }
      x = wrap(x, min[0], max[0]); y = wrap(y, min[1], max[1]); z = wrap(z, min[2], max[2]);
      positions.set([x, y, z], i * 3);
      // Dust motes are drawn larger than real particles so they read on screen (illustrative).
      sizes[i] = (s.kind === "rain" ? 0.012 : s.kind === "snow" ? 0.03 + r3 * 0.03 : 0.022 + r3 * 0.03) * sizeK;
      alphas[i] = s.kind === "dust" ? 0.25 + r3 * 0.35 : s.kind === "snow" ? 0.75 + r3 * 0.25 : 0.35 + r3 * 0.35;
      if (tails) {
        // Streaks trail the instantaneous velocity (fall + gusting wind), so sideways rain leans with the gusts.
        const k = (reduced ? 0.6 : 1.6) * (s.kind === "snow" ? 0.55 : 1), g = gustNow(local, r0 * 0.8) * (s.kind === "snow" ? 0.6 : 1);
        tails.set([-wind[0] * g * k, v * k, -wind[2] * g * k], i * 3);
      }
    }
    return { ...base, tails };
  }
  if (s.kind === "hail") {
    // Pellets fall fast, hit the ground, hop twice with decaying height, then lie there until they recycle.
    const { min, max } = s.region!, ground = s.floorY ?? min[1], h = max[1] - ground;
    const fall = s.speed ?? h / 16, period = Math.ceil(h / fall) * 3.2;
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      const ph = wrap(local + rnd(seed, i, 1) * period, 0, period), tf = h / (fall * (0.85 + 0.3 * r3));
      const drift = gustInt(Math.min(ph, tf), r0);
      let x = min[0] + r0 * (max[0] - min[0]) + wind[0] * drift, z = min[2] + r2 * (max[2] - min[2]) + wind[2] * drift, y: number;
      if (ph < tf) y = max[1] - (ph / tf) * h;
      else {
        const b = ph - tf, b1 = 9, b2 = 6, hop1 = 0.12 * (0.6 + r3), hop2 = hop1 * 0.35;
        y = ground + (b < b1 ? hop1 * 4 * (b / b1) * (1 - b / b1) : b < b1 + b2 ? hop2 * 4 * ((b - b1) / b2) * (1 - (b - b1) / b2) : 0);
        const roll = Math.min(b, b1 + b2) * 0.004;
        x += wind[0] * roll * 4 + (r3 - 0.5) * roll; z += wind[2] * roll * 4;
      }
      positions.set([wrap(x, min[0], max[0]), Math.max(ground, y) + 0.008 * sizeK, wrap(z, min[2], max[2])], i * 3);
      sizes[i] = (0.007 + r3 * 0.012) * sizeK;
      alphas[i] = 0.95;
    }
    return base;
  }
  if (s.kind === "splash") {
    // Short-lived crowns where drops land: grow and fade over a few frames at seeded spots.
    const { min, max } = s.region!, life = 9;
    for (let i = 0; i < n; i++) {
      const cyc = Math.floor((local + rnd(seed, i, 4) * life) / life), ph = ((local + rnd(seed, i, 4) * life) % life) / life;
      const x = min[0] + rnd(seed, i * 31 + cyc, 0) * (max[0] - min[0]), z = min[2] + rnd(seed, i * 31 + cyc, 2) * (max[2] - min[2]);
      positions.set([x, min[1] + 0.01 + ph * 0.03, z], i * 3);
      sizes[i] = (0.02 + ph * 0.05) * sizeK;
      alphas[i] = (1 - ph) * 0.55;
    }
    return base;
  }
  if (s.kind === "embers") {
    // Each ember lives one cycle: it rises from the bottom of the region, sways, cools from white-hot to red, and flickers out.
    const { min, max } = s.region!, life = Math.max(20, s.life ?? 130), h = max[1] - min[1], heats = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      const shifted = local + r1 * life, cyc = Math.floor(shifted / life), ph = (shifted - cyc * life) / life;
      const x0 = min[0] + rnd(seed, i * 31 + cyc, 5) * (max[0] - min[0]), z0 = min[2] + rnd(seed, i * 31 + cyc, 6) * (max[2] - min[2]);
      const sway = Math.sin(local * 0.05 + r0 * 40) * 0.12 * ph + Math.sin(local * 0.021 + r2 * 17) * 0.06 * ph;
      positions.set([x0 + sway + wind[0] * ph * life, min[1] + ph * h * (0.7 + 0.5 * r3), z0 + Math.cos(local * 0.04 + r2 * 30) * 0.08 * ph + wind[2] * ph * life], i * 3);
      sizes[i] = (0.012 + 0.02 * r3) * (1 - ph * 0.55) * sizeK;
      heats[i] = Math.pow(1 - ph, 0.8) * (0.75 + 0.25 * r2);
      const flicker = 0.65 + 0.35 * Math.sin(local * 0.9 + r0 * 90);
      alphas[i] = Math.min(1, ph / 0.06) * Math.pow(1 - ph, 1.3) * flicker;
    }
    return { ...base, heats };
  }
  if (s.kind === "sparks") {
    // One burst, in closed form: each spark flies with drag and gravity, bounces once off the floor, and cools as it dies.
    const b = s.burst!, heats = new Float32Array(n), tails = new Float32Array(n * 3);
    const age0 = reduced ? 6 : frame - b.frame, k = Math.max(1e-4, b.drag ?? 0.045), g = b.gravity ?? 0.006, life = b.life ?? 34;
    const d = b.direction ?? [0, 1, 0], dl = Math.hypot(d[0], d[1], d[2]) || 1, dir: Vec3 = [d[0] / dl, d[1] / dl, d[2] / dl];
    // Two axes across the throw direction, for the cone.
    const helper: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const ux: Vec3 = [helper[1] * dir[2] - helper[2] * dir[1], helper[2] * dir[0] - helper[0] * dir[2], helper[0] * dir[1] - helper[1] * dir[0]];
    const ul = Math.hypot(...ux) || 1, u: Vec3 = [ux[0] / ul, ux[1] / ul, ux[2] / ul], w: Vec3 = [dir[1] * u[2] - dir[2] * u[1], dir[2] * u[0] - dir[0] * u[2], dir[0] * u[1] - dir[1] * u[0]];
    const fly = (p0: Vec3, v0: Vec3, t: number): [Vec3, Vec3] => {
      const e = Math.exp(-k * t), a = (1 - e) / k;
      return [[p0[0] + v0[0] * a, p0[1] + (v0[1] + g / k) * a - (g / k) * t, p0[2] + v0[2] * a], [v0[0] * e, (v0[1] + g / k) * e - g / k, v0[2] * e]];
    };
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      const th = (b.spread ?? 0.9) * Math.sqrt(r0), ph = 2 * Math.PI * r1, sp = (b.speed ?? 0.12) * (0.45 + 0.55 * r2), myLife = life * (0.5 + 0.5 * r3);
      const c = Math.cos(th), sn = Math.sin(th);
      const v0: Vec3 = [0, 1, 2].map(j => sp * (dir[j] * c + (u[j] * Math.cos(ph) + w[j] * Math.sin(ph)) * sn)) as unknown as Vec3;
      const age = Math.min(age0, myLife);
      if (age0 < 0) { positions.set(b.origin, i * 3); sizes[i] = 0; alphas[i] = 0; continue; }
      let [p, v] = fly(b.origin, v0, age);
      if (s.floorY !== undefined && p[1] < s.floorY) {
        // Find the landing time by bisection on the exact path, then fly on from there with a damped bounce.
        let lo = 0, hi = age;
        for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (fly(b.origin, v0, mid)[0][1] > s.floorY) lo = mid; else hi = mid; }
        const [hitP, hitV] = fly(b.origin, v0, hi), r = b.restitution ?? 0.35;
        [p, v] = fly([hitP[0], s.floorY, hitP[2]], [hitV[0] * 0.55, -hitV[1] * r, hitV[2] * 0.55], age - hi);
        if (p[1] < s.floorY) { p = [p[0], s.floorY, p[2]]; v = [v[0] * 0.2, 0, v[2] * 0.2]; }
      }
      positions.set(p, i * 3);
      const left = Math.max(0, 1 - age0 / myLife);
      sizes[i] = (0.006 + 0.008 * r3) * sizeK;
      heats[i] = left;
      alphas[i] = left > 0 ? Math.pow(left, 0.7) : 0;
      // The streak trails the velocity, so fast sparks read as lines and slow ones as points.
      tails.set([-v[0] * 2.6, -v[1] * 2.6, -v[2] * 2.6], i * 3);
    }
    return { ...base, heats, tails };
  }
  if (s.kind === "bokeh" || s.kind === "motes" || s.kind === "fireflies") {
    const { min, max } = s.region!, span = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const beam = s.beam, bl = beam ? Math.hypot(...beam.direction) || 1 : 1, bd = beam ? beam.direction.map(x => x / bl) : [0, 0, 0];
    const period = Math.max(20, s.life ?? 110);
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      let x = min[0] + r0 * span[0], y = min[1] + r1 * span[1], z = min[2] + r2 * span[2];
      if (s.kind === "bokeh") {
        // Out-of-focus lights drift very slowly and breathe a little.
        x += Math.sin(local * 0.004 + r0 * 20) * span[0] * 0.04 + wind[0] * local; y += Math.sin(local * 0.003 + r1 * 30) * span[1] * 0.03;
        sizes[i] = (0.06 + 0.16 * r3) * sizeK;
        alphas[i] = (0.08 + 0.22 * r2) * (0.8 + 0.2 * Math.sin(local * 0.012 + r1 * 30));
      } else if (s.kind === "motes") {
        const a = local * 0.01;
        x += Math.sin(a * (1 + r3) + r0 * 20) * 0.2 + wind[0] * local; y += Math.sin(a * 0.6 + r1 * 30) * 0.1 - local * 0.0006 * (0.5 + r3); z += Math.cos(a * (1.2 - r3 * 0.4) + r2 * 25) * 0.2 + wind[2] * local;
        x = wrap(x, min[0], max[0]); y = wrap(y, min[1], max[1]); z = wrap(z, min[2], max[2]);
        let lit = 1;
        if (beam) {
          // Distance from the beam's axis against the cone's radius at that depth.
          const px = x - beam.origin[0], py = y - beam.origin[1], pz = z - beam.origin[2], along = px * bd[0] + py * bd[1] + pz * bd[2];
          const off = Math.hypot(px - bd[0] * along, py - bd[1] * along, pz - bd[2] * along), radius = Math.max(0, along) * Math.tan(beam.angle);
          lit = along <= 0 ? 0 : Math.max(0, Math.min(1, 1 - (off - radius * 0.7) / Math.max(1e-4, radius * 0.3)));
        }
        const glint = Math.pow(Math.max(0, Math.sin(local * 0.11 + r0 * 60)), 12);
        sizes[i] = (0.008 + 0.012 * r3) * sizeK * (1 + glint * 0.8);
        alphas[i] = (0.25 + 0.45 * r3 + glint * 0.5) * (0.04 + 0.96 * lit);
      } else {
        // Fireflies wander on smooth paths and blink in soft pulses, each on its own clock.
        x += Math.sin(local * 0.013 * (0.6 + r3) + r0 * 40) * span[0] * 0.08 + Math.sin(local * 0.031 + r1 * 20) * span[0] * 0.03;
        y += Math.sin(local * 0.017 * (0.6 + r2) + r1 * 40) * span[1] * 0.08;
        z += Math.cos(local * 0.011 * (0.6 + r0) + r2 * 40) * span[2] * 0.08;
        const ph = wrap(local + r2 * period, 0, period) / period, pulse = Math.exp(-(((ph - 0.5) / 0.2) ** 2));
        sizes[i] = (0.012 + 0.008 * r3) * sizeK;
        alphas[i] = 0.14 + 0.86 * pulse;
      }
      positions.set([x, y, z], i * 3);
    }
    return base;
  }
  if (s.kind === "assemble") {
    // Each particle flies from a scattered point to its target on a curling path, then holds with a faint shimmer.
    const a = s.assemble!, { min, max } = s.region ?? { min: [-3, -2, -2] as Vec3, max: [3, 2, 2] as Vec3 }, dur = Math.max(1, a.endFrame - a.startFrame), stagger = Math.max(0, Math.min(.9, a.stagger ?? .45));
    const at = reduced ? a.endFrame : frame;
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3), t = a.targets[i];
      const from: Vec3 = [min[0] + r0 * (max[0] - min[0]), min[1] + r1 * (max[1] - min[1]), min[2] + r2 * (max[2] - min[2])];
      const begin = a.startFrame + stagger * dur * r3, raw = Math.max(0, Math.min(1, (at - begin) / (dur * (1 - stagger))));
      const p = a.dissolve ? 1 - raw : raw, e = p * p * (3 - 2 * p), swirl = Math.sin(e * Math.PI) * .6;
      const shimmer = e > .999 ? .004 * Math.sin(at * .2 + r0 * 50) : 0;
      positions.set([from[0] + (t[0] - from[0]) * e + swirl * Math.cos(r0 * 40) * .5 + shimmer, from[1] + (t[1] - from[1]) * e + swirl * Math.sin(r1 * 40) * .5, from[2] + (t[2] - from[2]) * e + swirl * Math.cos(r2 * 40) * .5], i * 3);
      sizes[i] = (0.012 + 0.008 * r3) * sizeK;
      alphas[i] = Math.min(1, .15 + e * 1.2) * (a.dissolve ? Math.min(1, e * 3) : 1);
    }
    return base;
  }
  if (s.kind === "flow") {
    // Particles stream along the path at a steady pace, with a little spread around it, and fade in and out at its ends.
    const path = s.flow!.path, speed = s.flow!.speed ?? .006, spread = s.flow!.spread ?? .08;
    const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2])), total = lengths.reduce((x, y) => x + y, 0) || 1;
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2), r3 = rnd(seed, i, 3);
      const u = wrap(r0 + local * speed * (.8 + .4 * r3), 0, 1);
      let d = u * total, k = 0;
      while (k < lengths.length - 1 && d > lengths[k]) { d -= lengths[k]; k++; }
      const a = path[k], b = path[k + 1], f = lengths[k] ? d / lengths[k] : 0;
      const ang = r1 * Math.PI * 2, rad = spread * Math.sqrt(r2);
      positions.set([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + Math.sin(ang) * rad, a[2] + (b[2] - a[2]) * f + Math.cos(ang) * rad], i * 3);
      sizes[i] = (0.01 + 0.006 * r3) * sizeK;
      alphas[i] = Math.min(1, u / .08, (1 - u) / .08) * (.6 + .4 * r3);
    }
    return base;
  }
  if (s.kind === "snow-cover") {
    // Depth builds up with an ease-out over `buildFrames` and persists.
    const c = s.cover!, k = Math.max(0, Math.min(1, local / Math.max(1, c.buildFrames ?? 240)));
    const depth = c.depth * (1 - (1 - k) ** 2);
    return { ...base, count: 1, cover: { surfaces: c.surfaces, depth, maxDepth: c.depth } };
  }
  if (s.kind === "drips") {
    const src = s.sources!, floor = s.floorY ?? 0, tails = new Float32Array(n);
    const period = 70;
    for (let i = 0; i < n; i++) {
      const p = src[i % src.length], k = Math.floor(i / src.length);
      const ph = wrap(local + k * (period / 4) + rnd(seed, i, 0) * period, 0, period) / period;
      const growUntil = 0.62, h = p[1] - floor;
      if (ph < growUntil) {
        // A drop forms on the underside, swelling.
        const g = ph / growUntil;
        positions.set([p[0], p[1] - 0.006 - g * 0.012, p[2]], i * 3); sizes[i] = 0.004 + g * 0.01; alphas[i] = 0.9; tails[i] = 1 + g * 0.6;
      } else {
        const q = (ph - growUntil) / (1 - growUntil), y = p[1] - 0.02 - q * q * h;
        positions.set([p[0], Math.max(floor + 0.005, y), p[2]], i * 3); sizes[i] = 0.012; alphas[i] = y <= floor + 0.006 ? 0 : 0.85; tails[i] = 2.4;
      }
    }
    return { ...base, tails };
  }
  const surf = s.surface!;
  const at = (a: number, b: number): [number, number, number] => [0, 1, 2].map((k) => surf.origin[k] + surf.u[k] * a + surf.v[k] * b) as [number, number, number];
  if (s.kind === "condensation") {
    // Droplets nucleate over time and grow; the largest run down the surface and reset (closed form per cycle).
    for (let i = 0; i < n; i++) {
      const r0 = rnd(seed, i, 0), r1 = rnd(seed, i, 1), r2 = rnd(seed, i, 2);
      const born = r2 * 120, age = Math.max(0, local - born);
      const grow = Math.min(1, age / 160);
      const runner = r0 > 0.86;
      const cycle = 220, c = runner ? wrap(age, 0, cycle) / cycle : 0;
      const a = (r0 - 0.5) * surf.size[0], b0 = (r1 - 0.5) * surf.size[1];
      const b = runner && c > 0.55 ? wrap(b0 - (c - 0.55) * surf.size[1] * 1.6, -surf.size[1] / 2, surf.size[1] / 2) : b0;
      positions.set(at(a, b), i * 3);
      sizes[i] = age <= 0 ? 0 : (0.002 + 0.006 * Math.sqrt(grow) * (0.4 + r1)) * (runner && c > 0.55 ? 1.4 : 1);
      alphas[i] = age <= 0 ? 0 : 0.75;
    }
    return base;
  }
  // Stain: a patch that spreads with diminishing rate (persistent, never shrinks while active).
  const grow = 1 - Math.exp(-local / 160);
  const radius = Math.min(surf.size[0], surf.size[1]) * 0.5 * grow;
  return { ...base, count: 1, stain: { center: at(0, 0), radius, surface: surf } };
}
