/**
 * WATER1 construction: water turned into what a drawing or an animation needs, in any art style. Wavelengths and
 * speeds from the period and depth, the sea a wind raises, a sea surface to sample at any point and time, how a float
 * rides it, breakers by beach slope, ripples, wakes, reflections, glitter, meanders and water colour.
 *
 * Units: metres, seconds, degrees; y up.
 */
import type { FPoint } from "../anatomy/foundation-shapes";
import { seeded } from "../anatomy/foundation-shapes";
import { beaufortSpeed } from "./sky-physics";
import type { BreakerType } from "./water-data";
import { BREAKERS, FULLY_DEVELOPED, G, MEANDERS, OPTICS, SEA_STATES, SLOPES, SMALL_WAVES, WAVE_LIMITS, WHITECAPS } from "./water-data";

const TAU = Math.PI * 2, RAD = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// ---- Linear waves ----------------------------------------------------------------------------------------------------

/** Deep-water wavelength for a period: L₀ = g T² / 2π. */
export const deepWavelength = (period: number) => G * period * period / TAU;
/** Wavelength for a period at a depth (the dispersion relation ω² = g k tanh k h, solved by iteration). */
export function wavelength(period: number, depth = Infinity): number {
  const L0 = deepWavelength(period);
  if (!Number.isFinite(depth)) return L0;
  let L = L0;
  for (let i = 0; i < 40; i++) L = L0 * Math.tanh(TAU * depth / L);
  return L;
}
/** Phase speed, m/s: √(g L / 2π · tanh(2π h / L)); deep water √(g L / 2π), shallow √(g h). */
export const phaseSpeed = (L: number, depth = Infinity) => Math.sqrt(G * L / TAU * Math.tanh(TAU * Math.min(depth, 1e6) / L));
/** Group speed, m/s: half the phase speed in deep water, all of it in shallow water. Wave groups travel at this. */
export function groupSpeed(L: number, depth = Infinity) {
  const kh = TAU * Math.min(depth, 1e6) / L;
  return phaseSpeed(L, depth) / 2 * (1 + (kh > 20 ? 0 : 2 * kh / Math.sinh(2 * kh)));
}

// ---- The sea a wind raises -------------------------------------------------------------------------------------------

export interface SeaForWind {
  /** Wind at 10 m, m/s. */
  wind: number;
  /** Significant height, m; peak period, s; wavelength, m; crest speed, m/s. */
  height: number; period: number; wavelength: number; speed: number;
  /** Steepness H/L of the significant wave. */
  steepness: number;
  /** WMO sea state code and whitecap coverage (0–1). */
  seaState: number; whitecaps: number;
}
/** The fully developed sea for a 10 m wind (Pierson–Moskowitz): the most a wind can raise given time and fetch. */
export function fullyDevelopedSea(wind: number): SeaForWind {
  const u = Math.max(0, wind), u195 = u * FULLY_DEVELOPED.u195, height = FULLY_DEVELOPED.height * u * u / G;
  const period = u195 > 0 ? TAU * u195 / (FULLY_DEVELOPED.peak * G) : 0, L = deepWavelength(period);
  return { wind: u, height, period, wavelength: L, speed: L ? phaseSpeed(L) : 0, steepness: L ? height / L : 0, seaState: seaStateOf(height).code, whitecaps: whitecapCoverage(u) };
}
/** The sea for a Beaufort force. */
export const seaForBeaufort = (force: number) => fullyDevelopedSea(beaufortSpeed(force));
/** The WMO sea state for a significant height, m. */
export const seaStateOf = (height: number) => SEA_STATES.find(s => height <= s.height[1]) ?? SEA_STATES[SEA_STATES.length - 1];
/** The share of the sea covered by whitecaps, 0–1: none under about 3 m/s, then 3.84 × 10⁻⁶ U^3.41. */
export const whitecapCoverage = (wind: number) => (wind < WHITECAPS.onset ? 0 : clamp(WHITECAPS.a * wind ** WHITECAPS.b, 0, 1));

// ---- A sea surface ---------------------------------------------------------------------------------------------------

export interface SeaSurface {
  sea: SeaForWind;
  /** Elevation, m, at a horizontal position (x along the waves' travel, y across) and time. */
  at: (x: number, t: number, y?: number) => number;
  /** Slope dη/dx there. */
  slope: (x: number, t: number, y?: number) => number;
  components: readonly { amplitude: number; k: number; omega: number; phase: number; angle: number }[];
}
/**
 * A sea surface for a wind: Pierson–Moskowitz components (S(ω) = α g² ω⁻⁵ e^(−β (ω₀/ω)⁴), α = 8.1 × 10⁻³, β = 0.74,
 * ω₀ = g / U₁₉.₅; Stewart 16.4) with seeded phases and a spread of directions, so crests are short and come in groups.
 * Each component is a third-order Stokes wave when `stokes` (sharper crests, flatter troughs), linear otherwise.
 */
export function seaSurface(wind: number, opts: { seed?: number; components?: number; spread?: number; stokes?: boolean } = {}): SeaSurface {
  const sea = fullyDevelopedSea(wind), rnd = seeded(opts.seed ?? 1), n = opts.components ?? 14, spread = (opts.spread ?? 30) * RAD;
  const u195 = Math.max(.5, sea.wind * FULLY_DEVELOPED.u195), w0 = G / u195, wp = FULLY_DEVELOPED.peak * w0;
  const S = (w: number) => 8.1e-3 * G * G / w ** 5 * Math.exp(-.74 * (w0 / w) ** 4);
  const w1 = wp * .7, w2 = wp * 3, dw = (w2 - w1) / n, comps: { amplitude: number; k: number; omega: number; phase: number; angle: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = w1 + (i + rnd()) * dw, a = Math.sqrt(2 * S(w) * dw);
    comps.push({ amplitude: a, k: w * w / G, omega: w, phase: rnd() * TAU, angle: (rnd() - .5) * 2 * spread * (i / n + .3) });
  }
  // Scale so the significant height (≈ 4 σ) is the fully developed one.
  const sigma = Math.sqrt(comps.reduce((s, c) => s + c.amplitude * c.amplitude / 2, 0)) || 1, k = sea.height ? sea.height / (4 * sigma) : 0;
  for (const c of comps) c.amplitude *= k;
  const stokes = opts.stokes ?? true;
  const at = (x: number, t: number, y = 0) => comps.reduce((s, c) => {
    const th = c.k * (x * Math.cos(c.angle) + y * Math.sin(c.angle)) - c.omega * t + c.phase, ka = c.k * c.amplitude;
    return s + c.amplitude * (Math.cos(th) + (stokes ? .5 * ka * Math.cos(2 * th) + .375 * ka * ka * Math.cos(3 * th) : 0));
  }, 0);
  return { sea, components: comps, at, slope: (x, t, y = 0) => (at(x + .05, t, y) - at(x - .05, t, y)) / .1 };
}

/**
 * A wave train's profile for drawing: a trochoid (Gerstner wave) of height H and wavelength L, sharp crests and broad
 * troughs, its steepness kept below the looping limit. Points run over `length` from x 0, y up, still water at 0.
 */
export function trochoidProfile(H: number, L: number, length: number, phase = 0, steps = 200): FPoint[] {
  const k = TAU / L, a = H / 2, ka = Math.min(.9, k * a), pts: FPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const x0 = -L + (length + 2 * L) * i / steps, th = k * x0 - phase;
    pts.push([x0 - ka / k * Math.sin(th), a * Math.cos(th) + ka * a / 2]);
  }
  return pts.filter(p => p[0] >= 0 && p[0] <= length);
}

/**
 * A water particle's path under a wave (Airy theory): a circle shrinking as e^(kz) in deep water; in water of depth h
 * an ellipse, flatter near the bottom. Returns the offset at phase `theta` for rest position depth z (negative down).
 */
export function orbit(H: number, L: number, z: number, theta: number, depth = Infinity): FPoint {
  const k = TAU / L, a = H / 2;
  if (!Number.isFinite(depth) || k * depth > 3) { const e = Math.exp(k * z); return [-a * e * Math.sin(theta), a * e * Math.cos(theta)]; }
  const s = Math.sinh(k * depth);
  return [-a * Math.cosh(k * (z + depth)) / s * Math.sin(theta), a * Math.sinh(k * (z + depth)) / s * Math.cos(theta)];
}

/** How a floating object of `length` (m) rides a sea: heave (mean elevation under it) and pitch (degrees, its mean slope). */
export function floatMotion(surface: SeaSurface, x: number, t: number, length: number) {
  const n = 7, xs = Array.from({ length: n }, (_, i) => x + (i / (n - 1) - .5) * length), hs = xs.map(xx => surface.at(xx, t));
  const heave = hs.reduce((s, h) => s + h, 0) / n, pitch = Math.atan2(hs[n - 1] - hs[0], length) / RAD;
  return { heave, pitch };
}

// ---- Breakers --------------------------------------------------------------------------------------------------------

/** The Iribarren number ξ₀ = tan α / √(H₀ / L₀) for a beach slope (tan α), deep-water height and period. */
export const iribarren = (slope: number, height: number, period: number) => slope / Math.sqrt(Math.max(1e-6, height) / deepWavelength(Math.max(.1, period)));
/** The breaker type for an Iribarren number. */
export const breakerType = (xi: number): BreakerType => (Object.values(BREAKERS).find(b => xi >= b.iribarren[0] && xi < b.iribarren[1]) ?? BREAKERS.surging).id;
/** The depth at which a wave of height H breaks, m (H ≈ 0.8 h). */
export const breakingDepth = (height: number) => height / WAVE_LIMITS.breakDepth;
/**
 * How far ahead of the crest a plunging lip lands, m: thrown forward at the crest's speed √(g (h + H)) and falling
 * about 0.9 H under gravity (a ballistic estimate).
 */
export const lipReach = (height: number, depth = breakingDepth(height)) => Math.sqrt(G * (depth + height)) * Math.sqrt(2 * .9 * height / G);

export interface BreakerShape {
  type: BreakerType;
  /** Water outline (y up, still water 0, the bed below), foam patches, the trapped air (plunging tube), the bed line. */
  water: FPoint[]; foam: FPoint[][]; air?: FPoint[]; bed: FPoint[];
  /** Spray points (plunging and spilling). */
  spray: FPoint[];
  bounds: readonly [number, number, number, number];
}
/** Beach slope (tan α) that typically gives each breaker for a wave of steepness 1/20 (estimated from the Iribarren bands). */
export const BREAKER_SLOPES: Readonly<Record<BreakerType, number>> = { spilling: .02, plunging: .1, collapsing: .2, surging: .3 };

/**
 * A breaker in cross-section at `stage` 0–1, wave height 1, travelling to +x, for any style to paint: the water body,
 * foam, the air in a plunging tube and spray. The back is a long cosine slope; the front face's exponent takes it from
 * convex to hollow and near-vertical at the top as it steepens.
 * - Plunging: the crest then throws a lip, thick at its root, along its ballistic arc (`lipReach`). A concave tube wall
 *   runs from under the root to the face's base, so the air pocket is a hole in the water; the lip lands in a burst of
 *   foam and spray.
 * - Spilling: a roller of white water slides down a milder face.
 * - Collapsing: the base steepens and falls into foam under a crest that never breaks.
 * - Surging: the smooth front runs up the slope as a thin sheet.
 */
export function breakerShape(type: BreakerType, stage: number, seed = 1): BreakerShape {
  const s = clamp(stage, 0, 1), rnd = seeded(seed * 31 + type.length), slope = BREAKER_SLOPES[type];
  const depth0 = breakingDepth(1), x0 = -7, x1 = 5, shore = depth0 / slope, yt = -.15;
  const bedAt = (x: number) => Math.min(1.2, -(depth0 - slope * x));
  const bed: FPoint[] = [[x0, bedAt(x0)], [x1, bedAt(x1)]];
  const crest = type === "surging" ? .72 : 1, pre = clamp(s / .35, 0, 1);
  const pts: FPoint[] = [];
  // The back: a cosine from the trough 3.4 behind up to the crest.
  for (let i = 0; i <= 40; i++) { const x = x0 + (0 - x0) * i / 40, u = clamp(-x / 3.4, 0, 1); pts.push([x, yt + (crest - yt) * (1 + Math.cos(Math.PI * u)) / 2]); }
  const foam: FPoint[][] = [], spray: FPoint[] = [];
  let air: FPoint[] | undefined;
  /** A front from the crest (x 0) down to the trough at xb with exponent q: q < 1 hollow and steep at the top, q > 1 steep at the base. */
  const front = (xb: number, q: number, top = crest): FPoint[] => Array.from({ length: 30 }, (_, i) => { const u = (i + 1) / 30; return [xb * u, yt + (top - yt) * (1 - u ** q)] as FPoint; });
  const ahead = (from: number): FPoint[] => {
    const out: FPoint[] = [];
    for (let i = 0; i <= 20; i++) { const x = from + (x1 - from) * i / 20; out.push([x, Math.max(yt + .03 * Math.sin(i / 20 * Math.PI), bedAt(x) + .01)]); }
    return out;
  };
  if (type === "plunging") {
    const u = clamp((s - .35) / .45, 0, 1), post = clamp((s - .8) / .2, 0, 1);
    if (u === 0) pts.push(...front(1.5 - 1.05 * pre, 1.4 - 1 * pre), ...ahead(1.5 - 1.05 * pre).slice(1));
    else {
      const reach = Math.min(2.2, lipReach(1) * .6), drop = (crest - yt) * .97, th = (v: number) => .27 * (1 - v) ** .8 + .035;
      const upper: FPoint[] = [], lower: FPoint[] = [];
      for (let i = 0; i <= 24; i++) {
        const v = i / 24 * u, x = reach * v, y = crest + .04 * Math.sin(Math.PI * Math.min(1, v * 2)) - drop * v * v;
        upper.push([x, y]); lower.push([x - th(v) * .25 * v, y - th(v)]);
      }
      // The tube wall: from under the lip's root, bulging back under the crest, down to the face's base.
      const bx = reach * (.3 + .1 * u), P0 = lower[0], P1: FPoint = [-.16, crest - .7], P2: FPoint = [bx * .15, yt + .06], P3: FPoint = [bx, yt], wall: FPoint[] = [];
      for (let i = 1; i <= 20; i++) { const t = i / 20, m = 1 - t; wall.push([m ** 3 * P0[0] + 3 * m * m * t * P1[0] + 3 * m * t * t * P2[0] + t ** 3 * P3[0], m ** 3 * P0[1] + 3 * m * m * t * P1[1] + 3 * m * t * t * P2[1] + t ** 3 * P3[1]]); }
      const tip = upper[upper.length - 1], tipFloor: FPoint = [tip[0], Math.max(yt, tip[1] - th(u))];
      pts.push(...upper, ...lower.slice().reverse(), ...wall, ...ahead(bx).slice(1));
      // The air: under the lip, in front of the wall, above the trough (shrinking as the tube collapses after landing).
      const raw: FPoint[] = [...lower, tipFloor, [tip[0], yt], ...wall.slice().reverse()];
      const cx = raw.reduce((a, p) => a + p[0], 0) / raw.length, cy = raw.reduce((a, p) => a + p[1], 0) / raw.length, k = 1 - .85 * post;
      air = raw.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as FPoint);
      if (post > 0) {
        foam.push(blobAround([reach, yt + .05], .35 + post * .9, .2 + post * .45, rnd));
        foam.push(blobAround([reach * .45, crest - .1], .25 + post * .5, .12 + post * .2, rnd));
        for (let i = 0; i < 22; i++) spray.push([reach + (rnd() - .35) * (.7 + post * 1.2), yt + .15 + rnd() * (.4 + post * 1.1)]);
      }
    }
  } else if (type === "spilling") {
    const xb = 1.7 - .55 * pre, q = 1.35 - .45 * pre, face = front(xb, q);
    pts.push(...face, ...ahead(xb).slice(1));
    if (s > .3) {
      // The roller: white water riding the crest, its toe sliding down the face as the stage grows.
      // A thick, lumpy roller on the upper face (up to about 0.35 H), thinning toward its toe.
      const k = clamp((s - .3) / .7, 0, 1), toe = xb * (.25 + .7 * k), top: FPoint[] = [], under: FPoint[] = [];
      for (let i = 0; i <= 22; i++) {
        const x = -.45 + (toe + .45) * i / 22, y = x <= 0 ? yt + (crest - yt) * (1 + Math.cos(Math.PI * clamp(-x / 3.4, 0, 1))) / 2 : yt + (crest - yt) * (1 - (x / xb) ** q);
        const along = i / 22, thick = (.16 + .2 * k) * Math.sin(Math.PI * Math.min(1, along * 1.05 + .04)) ** .5 * (1 - .55 * along);
        // Mostly on the face, its lumpy top just proud of the surface.
        top.push([x, y + thick * (.25 + .3 * rnd())]); under.push([x, y - thick * .95]);
      }
      foam.push([...top, ...under.reverse()]);
      for (let i = 0; i < 8; i++) spray.push([-.15 + rnd() * .5, crest + .08 + rnd() * .2]);
    }
  } else if (type === "collapsing") {
    // The crest stays whole; the steepened base falls forward into a growing mass of foam.
    const post = clamp((s - .5) / .5, 0, 1), xb = 1.3 - .5 * pre, q = 1.6 + 2.2 * pre;
    pts.push(...front(xb, q), ...ahead(xb).slice(1));
    if (post > 0) {
      foam.push(blobAround([xb * (.85 + .25 * post), yt + .02], .25 + post * .55, .18 + post * .28, rnd));
      for (let i = 0; i < 10; i++) spray.push([xb * (.9 + .4 * rnd()), yt + .3 + rnd() * (.2 + .4 * post)]);
    }
  } else {
    // Surging: a gentle front whose base runs up the slope as a thin sheet past the still-water shoreline.
    const xb = 2.2, run = Math.min(x1, shore - .8 + 2.2 * s), face = front(xb, 1.7);
    pts.push(...face.filter(p => p[0] < run));
    const startX = pts[pts.length - 1][0];
    for (let i = 1; i <= 16; i++) { const x = startX + (run - startX) * i / 16, film = .14 * (1 - i / 16) ** .6 + .035; pts.push([x, Math.max(bedAt(x) + film, yt * (1 - i / 16) + (bedAt(x) + film) * (i / 16))]); }
    // A thin lace of foam at the leading edge only.
    if (s > .4) foam.push(blobAround([run - .1, bedAt(run - .1) + .05], .16, .05, rnd));
  }
  const last = pts[pts.length - 1];
  const water: FPoint[] = [...pts, [last[0], bedAt(last[0]) - .01], [x0, bedAt(x0)]];
  return { type, water, foam, air, bed, spray, bounds: [x0, Math.min(bedAt(x0), -1.6), x1, 2.2] };
}
function blobAround(c: FPoint, rx: number, ry: number, rnd: () => number): FPoint[] {
  return Array.from({ length: 14 }, (_, i) => { const a = i / 14 * TAU, k = .8 + rnd() * .35; return [c[0] + rx * k * Math.cos(a), c[1] + ry * k * Math.abs(Math.sin(a)) * (Math.sin(a) < 0 ? .3 : 1)] as FPoint; });
}

// ---- Ripples and wakes -----------------------------------------------------------------------------------------------

/**
 * Rings spreading from a drop or a touch at time t (s): a few crests about `spacing` apart moving out at a little over
 * the slowest ripple speed (0.23 m/s, reported), their height falling as 1/√r and fading over `life` s (estimated).
 */
export function rippleRings(t: number, opts: { speed?: number; spacing?: number; count?: number; life?: number } = {}) {
  const v = opts.speed ?? SMALL_WAVES.capillarySpeed * 1.2, sp = opts.spacing ?? .03, n = opts.count ?? 4, life = opts.life ?? 2.5;
  return Array.from({ length: n }, (_, i) => {
    const r = v * t - i * sp;
    return { radius: Math.max(0, r), amplitude: r > 0 ? Math.min(1, .04 / Math.sqrt(r)) * Math.max(0, 1 - t / life) * (1 - i * .18) : 0 };
  }).filter(rg => rg.radius > 0 && rg.amplitude > 0);
}

export interface Wake {
  /** Half-angle of the wake's V, degrees (19.47 in deep water at ordinary speeds), and the feather angle. */
  halfAngle: number; featherAngle: number;
  /** Spacing of the transverse waves, m: they travel with the boat, so λ = 2π V² / g (deep-water dispersion). */
  transverseWavelength: number;
  /** The two cusp lines from the stern, in plan (x astern, y across), for `length` m. */
  arms: readonly [FPoint[], FPoint[]];
  /** Crest lines: each a transverse arc joined at the cusps to two divergent branches running back to the boat's track. */
  crests: FPoint[][];
}
/**
 * A boat's Kelvin wake in plan view, for a speed (m/s) over `length` m astern. Crests are Kelvin's constant-phase
 * curves x = A cos θ (1 + sin² θ), y = A cos² θ sin θ with A = n λ; their cusps lie on the 19.47° lines.
 */
export function kelvinWake(speed: number, length: number): Wake {
  const half = SMALL_WAVES.kelvinAngle, t = Math.tan(half * RAD), lambda = TAU * speed * speed / G;
  const arm = (s: number): FPoint[] => [[0, 0], [length, s * length * t]];
  const crests: FPoint[][] = [];
  for (let A = lambda; A * 1.09 < length; A += lambda) {
    const c: FPoint[] = [];
    for (let i = 0; i <= 60; i++) { const th = (i / 60 - .5) * Math.PI * .98, co = Math.cos(th), si = Math.sin(th); c.push([A * co * (1 + si * si), A * co * co * si]); }
    crests.push(c);
  }
  return { halfAngle: half, featherAngle: SMALL_WAVES.featherAngle, transverseWavelength: lambda, arms: [arm(1), arm(-1)], crests };
}

// ---- Light ------------------------------------------------------------------------------------------------------------

/** Fresnel reflectance of water (Schlick): `cosIncidence` is the cosine of the angle from the surface normal. */
export const fresnel = (cosIncidence: number) => OPTICS.r0 + (1 - OPTICS.r0) * (1 - clamp(cosIncidence, 0, 1)) ** 5;
/** Reflectance seen looking down at the water `depressionDeg` below the horizon (level water). */
export const reflectanceAt = (depressionDeg: number) => fresnel(Math.sin(clamp(depressionDeg, 0, 90) * RAD));
/** A point's mirror image in level water at height `surfaceY` (y up): the reflection hangs from the surface point under it. */
export const reflectPoint = (p: FPoint, surfaceY = 0): FPoint => [p[0], 2 * surfaceY - p[1]];
/**
 * The sun's glitter path on a wind-roughened sea: facets tilt with an rms slope √σ² (Cox & Munk), and a reflection
 * turns twice the tilt, so the glints spread about ±2 × 2 rms slopes around the sun's mirror image (an estimate from
 * the reported slopes). Returns the rms slope and the half-width of the path in degrees, vertically and across.
 */
export function glitterPath(sunElevationDeg: number, wind: number) {
  const ms = SLOPES.base + SLOPES.perWind * Math.max(0, wind), rms = Math.sqrt(ms), half = 2 * 2 * Math.atan(rms) / RAD;
  return { rmsSlope: rms, centre: -sunElevationDeg, halfHeight: half, halfWidth: half * Math.sqrt((SLOPES.crosswind[0] + SLOPES.crosswind[1] * wind) / ms) };
}

// ---- Rivers -----------------------------------------------------------------------------------------------------------

/** J₀, the Bessel function of the first kind of order 0 (by its integral). */
function besselJ0(x: number) { let s = 0; const n = 64; for (let i = 0; i < n; i++) s += Math.cos(x * Math.sin((i + .5) / n * Math.PI)); return s / n; }
/**
 * The maximum angle (radians) of a sine-generated meander for a sinuosity: the down-valley share of each unit of
 * channel is J₀(ω), so sinuosity = 1 / J₀(ω) (derived from the sine-generated curve of Langbein & Leopold 1966).
 */
export function meanderAngle(sinuosity: number) {
  const target = 1 / Math.max(1.0001, sinuosity);
  let lo = 0, hi = 2.4;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (besselJ0(m) > target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/**
 * A river's centreline in plan: a sine-generated curve whose direction swings as ω sin(2π s / M), with the meander
 * length 11 channel widths down-valley (reported average) and the sinuosity given. Returns points (x down-valley).
 */
export function meanderPath(opts: { width: number; sinuosity?: number; bends?: number; seed?: number; jitter?: number }): FPoint[] {
  const K = opts.sinuosity ?? 1.8, w = opts.width, lam = MEANDERS.wavelength.typical * w, M = lam * K, omega = meanderAngle(K);
  const rnd = seeded(opts.seed ?? 1), n = Math.round((opts.bends ?? 2) * 60), ds = M / 60, pts: FPoint[] = [[0, 0]];
  let x = 0, y = 0, wobble = 0;
  for (let i = 1; i <= n; i++) {
    wobble = wobble * .97 + (rnd() - .5) * (opts.jitter ?? .04);
    const th = omega * Math.sin(TAU * i * ds / M) + wobble;
    x += Math.cos(th) * ds; y += Math.sin(th) * ds; pts.push([x, y]);
  }
  return pts;
}

// ---- Colour -----------------------------------------------------------------------------------------------------------

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: readonly number[]) => `#${rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * clamp(t, 0, 1))); };
/** The bottom seen through `depth` m of water: its colour fades toward the water's own as 1 − e^(−depth / clarity) (clarity m; estimated). */
export const throughWater = (bottom: string, water: string, depth: number, clarity = 4) => mix(bottom, water, 1 - Math.exp(-Math.max(0, depth) / clarity));
/** The surface's colour seen `depressionDeg` below the horizon: the body mixed with the reflected sky by Fresnel. */
export const surfaceColour = (body: string, skyReflected: string, depressionDeg: number) => mix(body, skyReflected, reflectanceAt(depressionDeg));
