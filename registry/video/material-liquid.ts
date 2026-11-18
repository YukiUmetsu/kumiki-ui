/**
 * Liquid transitions (registry item `material-transitions`).
 *
 * - **ripple**: a drop lands on water holding the outgoing scene. Rings spread at the real speeds of capillary–gravity
 *   waves: the surface is the Cauchy–Poisson response to the drop, η(r, t) = ∫ η̂(k) J₀(kr) cos(ω t) e^(−2νk²t) k dk with
 *   ω² = gk + (σ/ρ)k³ (Lamb, *Hydrodynamics* §266–267), so short ripples outrun long ones and die faster. The surface's
 *   slope bends the view (refraction) and catches the light. The next scene shows inside the packet the drop sends out;
 *   the waves break the seam into rings.
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
  /** melt: the drip profile per column (−1..1). */
  drips: Float32Array;
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
  // Melt: drips of one spacing (Huppert), 7 to 10 across the frame.
  const drips = new Float32Array(cols);
  if (material === "melt") {
    // Narrow drips with flat edge between them, of uneven length: a few run far, most only a little.
    const count = 9 + Math.floor(hash(1, 9, seed) * 5);
    const centres = Array.from({ length: count }, (_, k) => (k + 0.2 + 0.6 * hash(k, 13, seed)) / count);
    const heights = centres.map((_, k) => 0.25 + 0.75 * hash(k, 17, seed) ** 1.6), widths = centres.map((_, k) => (0.1 + 0.08 * hash(k, 19, seed)) / count);
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) / cols;
      let f = -0.25;
      // Flat-topped: a drip keeps its width down its length and ends in a rounded head.
      centres.forEach((c, k) => { const d = (x - c) / widths[k]; f = Math.max(f, heights[k] * 1.25 * Math.exp(-(d * d) * (d * d)) - 0.25); });
      drips[i] = f + 0.05 * (fbm(x * 24, 1, seed + 3, 3) - 0.5);
    }
  }
  return { material, cols, rows, aspect, seed, seconds, color: opts.color ?? DEFAULT_COLOR[material], origin, metres, reach, gain, drips };
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
  const kMain = 2 / DROP, cg = (G + 3 * SIGMA_RHO * kMain * kMain) / (2 * omega(kMain)), front = (cg * t) / metres, seam = 0.07, lead = 1.7 * front + 0.04;
  const dx = new Float32Array(n), dy = new Float32Array(n), reveal = new Uint8ClampedArray(n), light = new Uint8ClampedArray(n), dark = new Uint8ClampedArray(n);
  // Light from the upper left: a slope facing it glints.
  const lx = -0.6, ly = -0.8;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = i + j * cols, x = ((i + 0.5) / cols) * aspect, y = (j + 0.5) / rows, ex = x - origin.x, ey = y - origin.y, r = Math.hypot(ex, ey) || 1e-6;
    // Ahead of the fastest ripples the water is still: the shortest waves that could run there die within a tenth of a
    // second (viscous damping e^(−2νk²t)), so the solution's tiny far tail is cut. Near the drop the first rings are
    // steep; the bend saturates smoothly rather than tearing the picture.
    const still = smooth(lead + 0.06, lead, r);
    const g = 0.03 * Math.tanh((at(r * metres) * plan.gain * calm * still) / 0.03), ux = ex / r, uy = ey / r;
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
  return { reveal, layers: [{ id: "ripple-shade", color: "#0b1620", alpha: dark, blend: "multiply" }, { id: "ripple-light", color: plan.color, alpha: light, blend: "screen" }], warpOut: warp, warpIn: warp };
}

function meltFrame(plan: LiquidPlan, p: number): MaterialFrame {
  const { cols, rows, aspect, drips } = plan, n = cols * rows;
  // The layer drains like a viscous film on a wall (Jeffreys): material moves with a speed that grows with depth, so the
  // picture sags and stretches from the top, and the film above a wet edge thins until it is gone. Drip columns run
  // faster. Slow while the wax softens, then faster.
  const tau = smooth(0, 1, p) ** 1.35, stretch = 1 + 1.3 * tau * tau;
  // The even stretch is exact (a transform of the whole layer); the warp holds only each column's extra.
  const dx = new Float32Array(n), dy = new Float32Array(n), cover = new Uint8ClampedArray(n);
  const gloss = new Uint8ClampedArray(n), lip = new Uint8ClampedArray(n);
  for (let i = 0; i < cols; i++) {
    const f = drips[i], own = stretch * (1 + 0.12 * tau * f), x = ((i + 0.5) / cols) * aspect;
    // The wet edge: above it the film has drained too thin to see. It runs ahead down the drip columns.
    const edge = -0.08 + 1.35 * tau ** 1.3 * (1 + 0.3 * f) + 0.012 * (fbm(x * 14, tau * 3, plan.seed + 7, 3) - 0.5);
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
