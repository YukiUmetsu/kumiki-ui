/** V09 `EnvironmentalEffects` — seeded, bounded, illustrative rain, snow, dust, drips,
 * condensation and stains.
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

export type EffectKind = "rain" | "snow" | "dust" | "hail" | "splash" | "drips" | "condensation" | "stain" | "snow-cover";
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
  illustrative: true;
  caption: string;
  staticPose: boolean;
}

const CAP = 4000;
const DEFAULT_BUDGET: Record<EffectKind, number> = { rain: 1800, snow: 1400, dust: 600, hail: 900, splash: 500, drips: 24, condensation: 420, stain: 1, "snow-cover": 1 };

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
  const needs: Record<EffectKind, "region" | "surface" | "sources" | "cover"> = { rain: "region", snow: "region", dust: "region", hail: "region", splash: "region", drips: "sources", condensation: "surface", stain: "surface", "snow-cover": "cover" };
  const need = needs[spec.kind];
  if (need === "cover" && !spec.cover?.surfaces.length) throw new Error(`Effect "${spec.id}" (snow-cover) needs cover surfaces.`);
  if (need === "region" && !spec.region) throw new Error(`Effect "${spec.id}" (${spec.kind}) needs a region.`);
  if (need === "surface" && !spec.surface) throw new Error(`Effect "${spec.id}" (${spec.kind}) needs a surface.`);
  if (need === "sources" && !spec.sources?.length) throw new Error(`Effect "${spec.id}" (drips) needs at least one source point.`);
  const intensity = Math.max(0, Math.min(1, spec.intensity ?? 0.6));
  const requested = spec.kind === "stain" || spec.kind === "snow-cover" ? 1 : Math.round((spec.budget ?? DEFAULT_BUDGET[spec.kind]) * (spec.kind === "drips" ? 1 : intensity));
  let count = requested;
  if (requested > CAP) { count = CAP; diagnostics.push({ code: "budget-capped", severity: "warning", message: `"${spec.id}" asked for ${requested} particles; capped at ${CAP}.` }); }
  if (spec.kind === "drips") count = Math.min(count, spec.sources!.length * 4);
  const caption = spec.label ?? `${spec.kind[0].toUpperCase()}${spec.kind.slice(1)} (illustrative, not measured)`;
  diagnostics.push({ code: "illustrative", severity: "info", message: `"${spec.id}" is an illustrative ${spec.kind} effect; its density and speed do not represent measured rates.` });
  return { spec, count, caption, diagnostics };
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
