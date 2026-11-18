/**
 * Physical paper — bend profiles (registry item `paper-sheet`).
 *
 * Paper cannot stretch, so every bend is a developable surface. Here a bend is a generalised cylinder: a planar
 * cross-section curve swept along a straight crease line. The curve is parameterised by arc length s from the
 * crease (s = 0, tangent to the sheet) to the free edge of the flap, so lengths on paper are kept exactly.
 *
 * The curve has a rest curvature (a scored crease, an imposed bend, a peel front, a roll) and, optionally, sags
 * under its own weight as a heavy elastica: D w(s) (φ′ − κ₀) = M(s), where the moment M comes from the weight of
 * the flap beyond s. The weight beyond s is known in advance, so the problem is solved by shooting on the tip
 * angle from the free end (M = 0 there) back to the clamped crease (φ = 0), with load continuation so the solver
 * follows the physical branch. A floor keeps the flap from passing through the sheet or the surface under it.
 */

/** Constant rest curvature over an arc-length interval, px and 1/px. */
export interface CurvatureSpan {
  start: number;
  end: number;
  curvature: number;
}

/** The sheet's own weight, in the profile plane (x along the flap, z along the parent sheet's normal). */
export interface ProfileLoad {
  /** Gravity direction in the profile plane; its length is at most 1 (the rest acts along the crease). */
  x: number;
  z: number;
  /** 1 / ℓ³ in px⁻³, ℓ the elastogravity length. */
  strength: number;
  /** Width of the flap at arc length s, px. */
  width: (s: number) => number;
}

export interface ProfileFloor {
  /** Lowest z over the parent sheet (x < 0). */
  root: number;
  /** Lowest z beyond the crease (x ≥ 0); -Infinity for no surface. */
  beyond: number;
}

export interface ProfileOptions {
  /** Flap extent from the crease to its farthest point, px. */
  length: number;
  rest: readonly CurvatureSpan[];
  load?: ProfileLoad;
  floor?: ProfileFloor;
  /** Largest turn between nodes, radians. @default 4° */
  maxTurn?: number;
  /** Largest node spacing, px. @default length / 40 */
  maxStep?: number;
}

/** Nodes of a cross-section curve: arc length, position (x along the flap, z up) and tangent angle. */
export interface PaperProfile {
  count: number;
  s: Float64Array;
  x: Float64Array;
  z: Float64Array;
  phi: Float64Array;
}

const DEG = Math.PI / 180;

function restCurvatureAt(rest: readonly CurvatureSpan[], s: number): number {
  let k = 0;
  for (const span of rest) if (s >= span.start && s < span.end) k += span.curvature;
  return k;
}

/** Node arc lengths: every span edge, then subdivisions so no segment turns or runs too far. */
function nodePositions(options: ProfileOptions): number[] {
  const length = Math.max(0, options.length);
  const maxTurn = options.maxTurn ?? 4 * DEG;
  const maxStep = Math.max(0.5, options.maxStep ?? Math.max(length / 40, 1));
  const breaks = new Set<number>([0, length]);
  for (const span of options.rest) {
    if (span.start > 0 && span.start < length) breaks.add(span.start);
    if (span.end > 0 && span.end < length) breaks.add(span.end);
  }
  const sorted = [...breaks].sort((a, b) => a - b);
  const nodes: number[] = [0];
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < 1e-9) continue;
    const k = Math.abs(restCurvatureAt(options.rest, (a + b) / 2));
    const n = Math.max(1, Math.ceil((k * (b - a)) / maxTurn), Math.ceil((b - a) / maxStep));
    for (let j = 1; j <= n; j += 1) nodes.push(a + ((b - a) * j) / n);
  }
  return nodes;
}

interface Discrete {
  n: number;
  ds: Float64Array;
  kappa: Float64Array;
  /** Stiffness width per segment. */
  w: Float64Array;
  /** Weight beyond each node (px², width × length). */
  weight: Float64Array;
  /** Weight beyond each segment midpoint. */
  weightMid: Float64Array;
}

function discretise(s: readonly number[], options: ProfileOptions): Discrete {
  const n = s.length - 1;
  const ds = new Float64Array(n);
  const kappa = new Float64Array(n);
  const width = new Float64Array(n);
  for (let j = 0; j < n; j += 1) {
    ds[j] = s[j + 1] - s[j];
    const mid = (s[j] + s[j + 1]) / 2;
    kappa[j] = restCurvatureAt(options.rest, mid);
    width[j] = options.load ? Math.max(0, options.load.width(mid)) : 1;
  }
  let maxWidth = 0;
  for (let j = 0; j < n; j += 1) maxWidth = Math.max(maxWidth, width[j]);
  const w = new Float64Array(n);
  // A segment with no paper carries no load; a tiny stiffness keeps the integration finite there.
  for (let j = 0; j < n; j += 1) w[j] = Math.max(width[j], maxWidth * 0.02, 1e-6);
  const weight = new Float64Array(n + 1);
  const weightMid = new Float64Array(n);
  for (let j = n - 1; j >= 0; j -= 1) {
    weight[j] = weight[j + 1] + width[j] * ds[j];
    weightMid[j] = weight[j + 1] + (width[j] * ds[j]) / 2;
  }
  return { n, ds, kappa, w, weight, weightMid };
}

/**
 * Integrate from the free end (angle `tip`, no moment) back to the crease; returns the angle at the crease and
 * fills `phi` with node angles. `scale` multiplies the load (continuation).
 */
function shoot(d: Discrete, load: ProfileLoad, scale: number, tip: number, phi: Float64Array): number {
  const gx = load.x * load.strength * scale;
  const gz = load.z * load.strength * scale;
  let angle = tip;
  let moment = 0;
  phi[d.n] = angle;
  for (let j = d.n - 1; j >= 0; j -= 1) {
    const h = d.ds[j];
    // dφ/ds = κ₀ + M / w, dM/ds = −(t × F), F = weight beyond × g (known in advance).
    const fxEnd = gx * d.weight[j + 1];
    const fzEnd = gz * d.weight[j + 1];
    const crossEnd = Math.cos(angle) * fzEnd - Math.sin(angle) * fxEnd;
    const angleMid = angle - (h / 2) * (d.kappa[j] + moment / d.w[j]);
    const momentMid = moment + (h / 2) * crossEnd;
    const fxMid = gx * d.weightMid[j];
    const fzMid = gz * d.weightMid[j];
    const crossMid = Math.cos(angleMid) * fzMid - Math.sin(angleMid) * fxMid;
    angle -= h * (d.kappa[j] + momentMid / d.w[j]);
    moment += h * crossMid;
    phi[j] = angle;
  }
  return angle;
}

/** Root of `shoot(tip) = 0` closest to `guess`. */
function solveTip(d: Discrete, load: ProfileLoad, scale: number, guess: number, phi: Float64Array): number {
  const f = (tip: number) => shoot(d, load, scale, tip, phi);
  const f0 = f(guess);
  if (Math.abs(f0) < 1e-10) return guess;
  let lo = Number.NaN;
  let hi = Number.NaN;
  let step = 0.01;
  for (let k = 0; k < 40 && Number.isNaN(lo); k += 1, step *= 1.45) {
    for (const sign of [-1, 1]) {
      const t = guess + sign * step;
      const ft = f(t);
      if (Number.isFinite(ft) && Math.sign(ft) !== Math.sign(f0)) {
        lo = sign < 0 ? t : guess;
        hi = sign < 0 ? guess : t;
        break;
      }
    }
    if (step > 2 * Math.PI) break;
  }
  if (Number.isNaN(lo)) return guess;
  let flo = f(lo);
  for (let it = 0; it < 48; it += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
    if (hi - lo < 1e-9) break;
  }
  return (lo + hi) / 2;
}

/** Solve a bend profile: rest curvature, then sag under gravity, then contact with the floor. */
export function solveProfile(options: ProfileOptions): PaperProfile {
  const s = nodePositions(options);
  const n = s.length - 1;
  const count = s.length;
  const out: PaperProfile = { count, s: Float64Array.from(s), x: new Float64Array(count), z: new Float64Array(count), phi: new Float64Array(count) };
  if (n < 1) return out;
  const d = discretise(s, options);
  const phi = out.phi;
  const load = options.load;
  const loaded = load && load.strength > 0 && Math.hypot(load.x, load.z) > 1e-6 && d.weight[0] > 0;
  if (loaded) {
    let rest = 0;
    for (let j = 0; j < n; j += 1) rest += d.kappa[j] * d.ds[j];
    // Load continuation: the stiffer the sheet relative to its length, the fewer steps are needed.
    const severity = load.strength * d.weight[0] * options.length;
    const steps = Math.min(48, Math.max(4, Math.ceil(severity * 3)));
    let tip = rest;
    for (let k = 1; k <= steps; k += 1) tip = solveTip(d, load, k / steps, tip, phi);
    shoot(d, load, 1, tip, phi);
    // Shooting leaves a tiny residual at the crease; remove it so the flap leaves the sheet tangentially.
    const residual = phi[0];
    for (let j = 0; j <= n; j += 1) phi[j] -= residual * (1 - s[j] / s[n]);
  } else {
    phi[0] = 0;
    for (let j = 0; j < n; j += 1) phi[j + 1] = phi[j] + d.kappa[j] * d.ds[j];
  }
  const floor = options.floor;
  for (let j = 0; j < n; j += 1) {
    const mean = (phi[j] + phi[j + 1]) / 2;
    let dx = d.ds[j] * Math.cos(mean);
    let dz = d.ds[j] * Math.sin(mean);
    if (floor) {
      const nx = out.x[j] + dx;
      const lowest = nx < 0 ? floor.root : floor.beyond;
      if (out.z[j] + dz < lowest && dz < 0) {
        // Rest on the floor: keep the segment's length, drop no lower than the floor.
        dz = Math.min(0, Math.max(lowest - out.z[j], dz));
        dx = Math.sign(dx || 1) * Math.sqrt(Math.max(0, d.ds[j] * d.ds[j] - dz * dz));
        phi[j + 1] = Math.atan2(dz, dx);
      }
    }
    out.x[j + 1] = out.x[j] + dx;
    out.z[j + 1] = out.z[j] + dz;
  }
  return out;
}

/**
 * Group profile nodes into bands that render as flat facets: a band ends when its tangent has turned by
 * `maxTurn` or its height has changed by `maxRise`. Returns node indices.
 */
export function profileBands(profile: PaperProfile, maxTurn = 4 * DEG, maxRise = Infinity): number[] {
  const n = profile.count - 1;
  const marks = [0];
  if (n < 1) return marks;
  let start = 0;
  for (let j = 1; j <= n; j += 1) {
    const turned = Math.abs(profile.phi[j] - profile.phi[start]) > maxTurn;
    const rose = Math.abs(profile.z[j] - profile.z[start]) > maxRise;
    if ((turned || rose) && j - 1 > start) {
      marks.push(j - 1);
      start = j - 1;
    } else if (turned || rose) {
      marks.push(j);
      start = j;
    }
  }
  if (marks[marks.length - 1] !== n) marks.push(n);
  return marks;
}
