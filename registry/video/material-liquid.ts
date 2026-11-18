/**
 * Liquid transitions (registry item `material-transitions`).
 *
 * - **ripple**: a drop lands on water holding the outgoing scene. Rings spread at the real speeds of capillary–gravity
 *   waves: the surface is the Cauchy–Poisson response to the drop, η(r, t) = ∫ η̂(k) J₀(kr) cos(ω t) e^(−2νk²t) k dk with
 *   ω² = gk + (σ/ρ)k³ (Lamb, *Hydrodynamics* §266–267), so short ripples outrun long ones and die faster. The surface's
 *   slope bends the view (refraction) and catches the light. The next scene shows inside the packet the drop sends out;
 *   the waves break the seam into rings.
 *   The drop's splash comes first, at its real speed (Worthington 1908; Rein 1993): a crown rises at the crater's rim
 *   with beads on its edge, spray flies out and lands in ringlets, the crater collapses into a central jet whose tip
 *   falls back as a second, smaller splash. At 30 fps it lasts about nine frames.
 * - **melt**: the picture is a layer of wax on a warm wall. It softens and drains: a viscous film on a vertical wall
 *   thins fastest at the top (Jeffreys 1930, h ∝ √(νy / gt)), so the top clears first while the rest sags, stretches
 *   and runs in drips of one spacing whose tips lead (Huppert 1982). The melt is glossy, and the next scene is behind it.
 */
import { clamp01, fbm, hash, smooth } from "./material-kit";
import type { MaterialFrame } from "./material-kit";

export type LiquidKind = "ripple" | "melt";

export interface LiquidPlan {
  material: LiquidKind;
  cols: number;
  rows: number;
  aspect: number;
  seed: number;
  seconds: number;
  color: string;
  /** ripple: where the drop lands, frame heights. */
  origin: { x: number; y: number };
  /** ripple: the frame's height in metres, chosen so the drop's main packet reaches the far corner near the end. */
  metres: number;
  /** ripple: the farthest corner from the drop, frame heights. */
  reach: number;
  /** ripple: refraction gain, frame heights of displacement per unit slope. */
  gain: number;
  /** melt: the wet edge running down the wall, drips and all. */
  front?: Front;
  /** ripple: the splash's spray, per droplet [angle, outward speed m/s, upward speed m/s, radius m]. */
  spray: Float32Array;
}

export const LIQUID_FRAMES: Readonly<Record<LiquidKind, number>> = { ripple: 40, melt: 48 };
const DEFAULT_COLOR: Record<LiquidKind, string> = { ripple: "#ffffff", melt: "#ffffff" };

/** Water at 20 °C. */
const G = 9.81, SIGMA_RHO = 7.3e-5, NU = 1e-6;
/** The drop's footprint: a Gaussian dent about 3 mm across. */
const DROP = 0.003;
const K = Array.from({ length: 192 }, (_, i) => 30 * Math.exp((i / 191) * Math.log(4000 / 30)));
const omega = (k: number) => Math.sqrt(G * k + SIGMA_RHO * k ** 3);
/** Warps read the picture at least this far inside the frame (frame heights), never off its edge. */
const EDGE = 0.002;

/** Bessel J₁ (rational approximations, Numerical Recipes §6.5). */
function besselJ1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a = x * (72362614232 + y * (-7895059235 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const b = 144725228442 + y * (2300535178 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return a / b;
  }
  const z = 8 / ax, y = z * z, xx = ax - 2.356194491;
  const a = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const b = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const v = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b);
  return x < 0 ? -v : v;
}

/** The surface slope ∂η/∂r of the drop's rings at radii r (metres) and time t (seconds), unscaled. */
function rippleSlope(radii: Float64Array, t: number): Float64Array {
  const out = new Float64Array(radii.length);
  for (let q = 0; q < K.length; q++) {
    const k = K[q], dk = (q === 0 ? K[1] - K[0] : K[q] - K[q - 1]);
    // ∂/∂r of ∫ η̂ J₀(kr) cos ωt e^(−2νk²t) k dk, with η̂ ∝ e^(−(k·DROP)²/4).
    const w = Math.exp(-((k * DROP) ** 2) / 4) * Math.cos(omega(k) * t) * Math.exp(-2 * NU * k * k * t) * k * k * dk;
    for (let i = 0; i < radii.length; i++) out[i] -= w * besselJ1(k * radii[i]);
  }
  return out;
}

/**
 * A viscous front running down a wall, column by column (a reduced model of thin-film fingering, after Huppert 1982 and
 * Troian et al. 1989). The front's leading ridge holds a volume V that sets its speed (u ∝ h², so v ∝ V^(2/3) for a
 * ridge whose width grows with its height). Fluid in the ridge drains sideways toward the columns that are ahead, so a
 * drip that leads takes its neighbours' fluid and runs faster still; surface tension smooths the front (a fourth-order
 * term, which sets the drip spacing). Fresh fluid arrives from behind, and some is left on the wall as a film. Drips
 * appear, compete and merge on their own. Returns the front, normalised so the last column reaches the foot at the
 * last sample: `y[sample · columns + column]`, frame heights.
 */
export interface Front { columns: number; samples: number; y: Float32Array }
export function fingeringFront(seed: number, spacing = 0.14, columns = 160, samples = 96): Front {
  const N = columns, ds = 1 / N, k = (2 * Math.PI) / spacing;
  // Small ripples in the front grow at about gain·k against smoothing·k⁴, fastest at k = (gain / 4·smoothing)^(1/3), the
  // chosen spacing; strong enough that drips show from a third of the way down.
  const c = 1.2, q = 0.5, film = 0.4, slow = 0.18, gain = 0.3, cprime = (2 / 3) * c, kappa = (gain * gain) / cprime;
  // Explicit steps: the fourth-order term needs dt < ds⁴ / (8 · smoothing); half of that.
  const smoothing = gain / (4 * k ** 3), spread = 2e-5, dt = Math.min(5e-4, ds ** 4 / (16 * smoothing));
  const y = new Float64Array(N), V = new Float64Array(N), ny = new Float64Array(N), nv = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    // A poured edge is never straight: a little unevenness in how much arrived where.
    V[i] = 1 + 0.1 * (fbm((i / N) * 9, 0.5, seed + 81, 4) - 0.5) + 0.03 * (hash(i, 82, seed) - 0.5);
    y[i] = 0.012 * (fbm((i / N) * 14, 1.5, seed + 84, 3) - 0.5);
  }
  const at = (a: Float64Array, i: number) => a[i < 0 ? -i - 1 : i >= N ? 2 * N - i - 1 : i];
  const history: Float64Array[] = [], times: number[] = [];
  let t = 0;
  history.push(Float64Array.from(y)); times.push(0);
  for (let step = 0; step < 60000; step++) {
    for (let i = 0; i < N; i++) {
      const yxx = (at(y, i - 1) - 2 * y[i] + at(y, i + 1)) / (ds * ds);
      const yxxxx = (at(y, i - 2) - 4 * at(y, i - 1) + 6 * y[i] - 4 * at(y, i + 1) + at(y, i + 2)) / ds ** 4;
      const v = c * (Math.max(0, V[i]) + slow) ** (2 / 3);
      ny[i] = y[i] + dt * (v + spread * yxx - smoothing * yxxxx);
      // Sideways flow toward the columns that are ahead: J = κ V ∂y/∂s, and V changes by −∂J/∂s. V is taken from the
      // column the fluid leaves (upwind), and no step moves more than a quarter of it, so V stays positive and stable.
      const flux = (a: number, b: number, ya: number, yb: number) => {
        const slope = (yb - ya) / ds, from = slope > 0 ? a : b, j = kappa * from * slope;
        return Math.sign(j) * Math.min(Math.abs(j), (0.25 * from * ds) / dt);
      };
      const jr = flux(V[i], at(V, i + 1), y[i], at(y, i + 1)), jl = flux(at(V, i - 1), V[i], at(y, i - 1), y[i]);
      const vxx = (at(V, i - 1) - 2 * V[i] + at(V, i + 1)) / (ds * ds);
      nv[i] = Math.max(0, V[i] + dt * (q - film * v - (jr - jl) / ds + spread * vxx));
    }
    y.set(ny); V.set(nv); t += dt;
    if (step % 8 === 0) { history.push(Float64Array.from(y)); times.push(t); }
    let lowest = Infinity;
    for (let i = 0; i < N; i++) lowest = Math.min(lowest, y[i]);
    if (!(lowest < 1.02)) break;
  }
  // Resample to even times, from the start until the last column passes the foot.
  const out = new Float32Array(samples * N), end = times[times.length - 1];
  for (let s = 0; s < samples; s++) {
    const want = (s / (samples - 1)) * end;
    let lo = 0;
    while (lo < times.length - 2 && times[lo + 1] < want) lo++;
    const u = clamp01((want - times[lo]) / Math.max(1e-9, times[lo + 1] - times[lo]));
    for (let i = 0; i < N; i++) out[s * N + i] = history[lo][i] * (1 - u) + history[lo + 1][i] * u;
  }
  return { columns: N, samples, y: out };
}

/** The front at column s (0..1 across the frame) and time u (0..1), frame heights. */
export function frontAt(front: Front, s: number, u: number): number {
  const fc = clamp01(s) * (front.columns - 1), c0 = Math.min(front.columns - 2, Math.floor(fc)), a = fc - c0;
  const fu = clamp01(u) * (front.samples - 1), u0 = Math.min(front.samples - 2, Math.floor(fu)), b = fu - u0, N = front.columns, y = front.y;
  const row = (k: number) => y[k * N + c0] * (1 - a) + y[k * N + c0 + 1] * a;
  return row(u0) * (1 - b) + row(u0 + 1) * b;
}

/** When the front reaches each cell of a `cols × rows` grid, 0..1 (1: the last column reaches the foot). */
export function fingeringArrival(front: Front, cols: number, rows: number): Float32Array {
  const { columns: N, samples: S, y } = front, crossing = new Float32Array(N * rows);
  for (let c = 0; c < N; c++) {
    let k = 0;
    for (let j = 0; j < rows; j++) {
      const target = (j + 0.5) / rows;
      while (k < S - 1 && y[(k + 1) * N + c] < target) k++;
      const y0 = y[k * N + c], y1 = y[Math.min(S - 1, k + 1) * N + c];
      crossing[c * rows + j] = Math.min(1, (k + clamp01((target - y0) / Math.max(1e-9, y1 - y0))) / (S - 1));
    }
  }
  const out = new Float32Array(cols * rows);
  for (let i = 0; i < cols; i++) {
    const fc = ((i + 0.5) / cols) * (N - 1), c0 = Math.min(N - 2, Math.floor(fc)), a = fc - c0;
    for (let j = 0; j < rows; j++) out[i + j * cols] = crossing[c0 * rows + j] * (1 - a) + crossing[(c0 + 1) * rows + j] * a;
  }
  return out;
}

export function planLiquid(material: LiquidKind, opts: { cols: number; rows: number; aspect: number; seed: number; seconds: number; color?: string; origin?: { x: number; y: number } }): LiquidPlan {
  const { cols, rows, aspect, seed, seconds } = opts;
  const origin = { x: (opts.origin?.x ?? 0.5) * aspect, y: opts.origin?.y ?? 0.5 };
  const reach = Math.max(...[[0, 0], [aspect, 0], [0, 1], [aspect, 1]].map(([x, y]) => Math.hypot(x - origin.x, y - origin.y)));
  // The drop's main packet: the wavenumber where its spectrum peaks, travelling at its group velocity.
  const kMain = 2 / DROP, cg = (G + 3 * SIGMA_RHO * kMain * kMain) / (2 * omega(kMain));
  const metres = (cg * 0.86 * seconds) / (reach + 0.08);
  // Gain: the largest slope a third of the way through bends the view by 2.2% of the frame height.
  const radii = Float64Array.from({ length: 240 }, (_, i) => ((i + 0.5) / 240) * reach * metres);
  const slope = rippleSlope(radii, seconds / 3);
  const gain = 0.022 / Math.max(1e-12, Math.max(...slope.map(Math.abs)));
  // Melt: the wet edge is a draining front whose drips appear, compete and merge (fingeringFront).
  const front = material === "melt" ? fingeringFront(seed + 2, 0.11) : undefined;
  // A 4 mm drop falling about half a metre throws a dozen or so droplets of a millimetre or less.
  const spray = new Float32Array(material === "ripple" ? 4 * 16 : 0);
  for (let i = 0; i < spray.length / 4; i++) {
    spray.set([((i + 0.6 * hash(i, 61, seed)) / (spray.length / 4)) * Math.PI * 2, 0.18 + 0.4 * hash(i, 62, seed), 0.35 + 0.55 * hash(i, 63, seed), 0.0004 + 0.0007 * hash(i, 64, seed) ** 2], 4 * i);
  }
  return { material, cols, rows, aspect, seed, seconds, color: opts.color ?? DEFAULT_COLOR[material], origin, metres, reach, gain, front, spray };
}

export function liquidFrame(plan: LiquidPlan, progress: number): MaterialFrame {
  return plan.material === "ripple" ? rippleFrame(plan, clamp01(progress)) : meltFrame(plan, clamp01(progress));
}

function rippleFrame(plan: LiquidPlan, p: number): MaterialFrame {
  const { cols, rows, aspect, origin, metres, reach } = plan, n = cols * rows, t = p * plan.seconds;
  const samples = 720, radii = Float64Array.from({ length: samples }, (_, i) => (i / (samples - 1)) * (reach + 0.05) * metres);
  // The waves fade out over the last frames so the next scene lands still.
  const calm = 1 - smooth(0.82, 1, p), slope = t > 0 ? rippleSlope(radii, t) : new Float64Array(samples);
  const at = (r: number) => { const f = (r / ((reach + 0.05) * metres)) * (samples - 1), i = Math.min(samples - 2, Math.floor(f)), u = f - i; return slope[i] * (1 - u) + slope[i + 1] * u; };
  // The seam rides with the main packet; the waves break it into rings.
  const kMain = 2 / DROP, cg = (G + 3 * SIGMA_RHO * kMain * kMain) / (2 * omega(kMain)), front = (cg * t) / metres, seam = 0.07, lead = 1.7 * front + 0.04, craterR = 0.012 / metres;
  const dx = new Float32Array(n), dy = new Float32Array(n), reveal = new Uint8ClampedArray(n), light = new Uint8ClampedArray(n), dark = new Uint8ClampedArray(n);
  // Light from the upper left: a slope facing it glints.
  const lx = -0.6, ly = -0.8;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = i + j * cols, x = ((i + 0.5) / cols) * aspect, y = (j + 0.5) / rows, ex = x - origin.x, ey = y - origin.y, r = Math.hypot(ex, ey) || 1e-6;
    // Ahead of the fastest ripples the water is still: the shortest waves that could run there die within a tenth of a
    // second (viscous damping e^(−2νk²t)), so the solution's tiny far tail is cut. Near the drop the first rings are
    // steep; the bend saturates smoothly rather than tearing the picture.
    const still = smooth(lead + 0.06, lead, r);
    // The crater: for its first 90 ms the surface dips under the drop and bends the view outward.
    const crater = t < CRATER_S ? 0.012 * Math.sin((Math.PI * t) / CRATER_S) * (r / craterR) * Math.exp(-((r / craterR) ** 2)) : 0;
    const g = 0.03 * Math.tanh((at(r * metres) * plan.gain * calm * still + crater) / 0.03), ux = ex / r, uy = ey / r;
    // Refraction: the view shifts down the slope, staying a pixel inside the frame.
    dx[k] = Math.max(EDGE - x, Math.min(aspect - EDGE - x, -g * ux));
    dy[k] = Math.max(EDGE - y, Math.min(1 - EDGE - y, -g * uy));
    const sr = Math.hypot(x + dx[k] - origin.x, y + dy[k] - origin.y);
    reveal[k] = Math.round(255 * smooth(front + seam, front - seam, sr));
    const facing = (ux * lx + uy * ly) * (g / 0.022);
    light[k] = Math.round(255 * clamp01(0.4 * facing) ** 1.6);
    dark[k] = Math.round(255 * clamp01(-0.25 * facing));
  }
  const warp = { dx, dy };
  return { reveal, layers: [{ id: "ripple-shade", color: "#0b1620", alpha: dark, blend: "multiply" }, { id: "ripple-light", color: plan.color, alpha: light, blend: "screen" }], vectors: splash(plan, t), warpOut: warp, warpIn: warp };
}

/** How long the crater lasts, seconds. */
const CRATER_S = 0.09;
/** Ripples from a landing droplet travel at about the slowest capillary–gravity speed, m/s. */
const RINGLET_SPEED = 0.23;

/** A circle as a closed polyline, frame heights. */
const circle = (x: number, y: number, r: number, count = 36) => {
  const out: number[] = [];
  for (let i = 0; i <= count; i++) { const a = (i / count) * Math.PI * 2; out.push(x + r * Math.cos(a), y + r * Math.sin(a)); }
  return out;
};

/** The drop's splash at time t (seconds): crown, spray, ringlets, jet and the jet's falling tip, seen from above. */
function splash(plan: LiquidPlan, t: number): MaterialFrame["vectors"] {
  const { origin, metres: M, spray } = plan, o = origin, unit = (m: number) => m / M;
  const rings: number[][] = [], ringAlpha: number[] = [], beads: number[][] = [], beadAlpha: number[] = [], shade: number[][] = [], shadeAlpha: number[] = [];
  const ringlet = (x: number, y: number, since: number, size: number) => {
    if (since < 0 || since > 0.3) return;
    rings.push(circle(x, y, unit(size + RINGLET_SPEED * since)));
    ringAlpha.push(0.55 * Math.exp(-since / 0.1));
  };
  // The crown: a thin sheet thrown up round the crater, beaded at its rim (Rayleigh–Plateau), gone in about 70 ms.
  if (t > 0.002 && t < 0.075) {
    const R = unit(0.011) * (1 - Math.exp(-t / 0.012)), seen = smooth(0.002, 0.012, t) * (1 - smooth(0.035, 0.075, t));
    rings.push(circle(o.x, o.y, R, 48)); ringAlpha.push(0.85 * seen);
    shade.push(circle(o.x, o.y, R * 0.8, 48)); shadeAlpha.push(0.4 * seen);
    // Rim fingers are irregular: uneven spacing and size, some already flung a little way out.
    for (let i = 0; i < 18; i++) {
      const a = ((i + 0.9 * (hash(i, 71, plan.seed) - 0.5)) / 18) * Math.PI * 2, rr = R * (1.02 + 0.16 * hash(i, 72, plan.seed) ** 2);
      beads.push(circle(o.x + rr * Math.cos(a), o.y + rr * Math.sin(a), unit(0.0004 + 0.0008 * hash(i, 73, plan.seed)), 8)); beadAlpha.push((0.6 + 0.35 * hash(i, 74, plan.seed)) * seen);
    }
  }
  // Spray: each droplet flies out (seen from above it moves straight out), streaked over a 180° shutter, and lands in a
  // ringlet where it falls.
  for (let i = 0; i < spray.length; i += 4) {
    const [a, vr, vz, size] = [spray[i], spray[i + 1], spray[i + 2], spray[i + 3]], t0 = 0.008, flight = (2 * vz) / G, tau = t - t0;
    const at = (s: number) => unit(0.006 + vr * s);
    if (tau > 0 && tau < flight) {
      const r = at(tau), r0 = at(Math.max(0, tau - 1 / 60)), height = vz * tau - 0.5 * G * tau * tau, grow = 1 + height / 0.5;
      beads.push(circle(o.x + r * Math.cos(a), o.y + r * Math.sin(a), Math.max(0.0016, unit(size) * grow), 8)); beadAlpha.push(0.95);
      rings.push([o.x + r0 * Math.cos(a), o.y + r0 * Math.sin(a), o.x + r * Math.cos(a), o.y + r * Math.sin(a)]); ringAlpha.push(0.45);
    }
    const land = at(flight);
    ringlet(o.x + land * Math.cos(a), o.y + land * Math.sin(a), tau - flight, size);
  }
  // The jet: the crater closes into a column that rises toward the lens (a bright drop of light from above), and its tip
  // pinches off and falls back about a quarter of a second later, splashing again on a small scale.
  if (t > 0.05 && t < 0.2) {
    const rise = Math.sin((Math.PI * (t - 0.05)) / 0.15), R = unit(0.0018 + 0.0022 * rise);
    beads.push(circle(o.x, o.y, R, 16)); beadAlpha.push(0.85 * rise);
    shade.push(circle(o.x, o.y, R * 1.8, 24)); shadeAlpha.push(0.35 * rise);
  }
  if (t > 0.32 && t < 0.37) {
    const R = unit(0.005) * (1 - Math.exp(-(t - 0.32) / 0.01)), seen = 1 - smooth(0.34, 0.37, t);
    rings.push(circle(o.x, o.y, R, 32)); ringAlpha.push(0.6 * seen);
  }
  ringlet(o.x, o.y, t - 0.34, 0.002);
  const out: NonNullable<MaterialFrame["vectors"]> = [];
  if (shade.length) out.push({ id: "splash-shade", rings: shade, closed: false, stroke: "#0b1620", width: 2.4, alpha: 1, alphas: shadeAlpha, blend: "multiply" });
  if (rings.length) out.push({ id: "splash-rings", rings, closed: false, stroke: plan.color, width: 1.5, alpha: 1, alphas: ringAlpha, blend: "screen" });
  if (beads.length) out.push({ id: "splash-beads", rings: beads, closed: true, fill: plan.color, alpha: 1, alphas: beadAlpha, blend: "screen" });
  return out;
}

function meltFrame(plan: LiquidPlan, p: number): MaterialFrame {
  const { cols, rows, aspect } = plan, n = cols * rows, front = plan.front!;
  // The layer drains like a viscous film on a wall (Jeffreys): material moves with a speed that grows with depth, so the
  // picture sags and stretches from the top, and the film above a wet edge thins until it is gone. Drip columns run
  // faster. Slow while the wax softens, then faster.
  const tau = smooth(0, 1, p) ** 1.35, stretch = 1 + 1.3 * tau * tau;
  // The even stretch is exact (a transform of the whole layer); the warp holds only each column's extra.
  const dx = new Float32Array(n), dy = new Float32Array(n), cover = new Uint8ClampedArray(n);
  const gloss = new Uint8ClampedArray(n), lip = new Uint8ClampedArray(n);
  // The wet edge runs down the wall as the draining front: its drips appear, compete and merge. Its mean, for each
  // column's lead.
  const u = tau ** 1.3;
  let mean = 0;
  for (let i = 0; i < cols; i++) mean += frontAt(front, (i + 0.5) / cols, u) / cols;
  for (let i = 0; i < cols; i++) {
    const at = frontAt(front, (i + 0.5) / cols, u), lead = Math.max(-1, Math.min(1, (at - mean) / 0.2));
    // A drip column carries more of the wax down, so it stretches more.
    const own = stretch * (1 + 0.12 * tau * lead), x = ((i + 0.5) / cols) * aspect;
    // Above the wet edge the film has drained too thin to see; by the end the edge is past the frame's foot everywhere.
    const edge = -0.1 + 1.25 * at + 0.01 * (fbm(x * 14, tau * 3, plan.seed + 7, 3) - 0.5);
    for (let j = 0; j < rows; j++) {
      const k = i + j * cols, local = (j + 0.5) / rows, y = local * stretch;
      // On screen this cell shows the picture from y / own; in the layer's own coordinates that is local·stretch/own.
      dy[k] = Math.max(0.002 - local, local * (stretch / own) - local);
      dx[k] = 0;
      cover[k] = Math.round(255 * smooth(edge - 0.16, edge + 0.02, y));
      // Overlays are on the frame's own grid: the meniscus at the wet edge catches the light; just below it the thicker
      // rim is darker.
      const sy = local, film = smooth(edge - 0.16, edge + 0.02, sy), shown = smooth(0, 0.1, tau);
      gloss[k] = Math.round(255 * 0.32 * Math.exp(-(((sy - edge) / 0.012) ** 2)) * film * shown);
      lip[k] = Math.round(255 * 0.28 * Math.exp(-(((sy - edge - 0.028) / 0.016) ** 2)) * film * shown);
    }
  }
  return { reveal: new Uint8ClampedArray(n).fill(255), layers: [{ id: "melt-lip", color: "#1a1410", alpha: lip, blend: "multiply" }, { id: "melt-gloss", color: plan.color, alpha: gloss, blend: "screen" }],
    warpOut: { dx, dy, cover }, outMatrix: [1, 0, 0, stretch, 0, 0], incomingBelow: true };
}
