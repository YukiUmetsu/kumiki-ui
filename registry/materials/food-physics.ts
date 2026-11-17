/**
 * FOOD1 physics: cooking by heat conduction, and the colours it leaves.
 *
 * - `cookSteak`: a slab of beef seared in a pan, flipped and rested. Heat enters through the face on the pan (a contact
 *   coefficient), leaves the top to the air, and spreads by conduction (diffusivity about 1.35 × 10⁻⁷ m²/s); resting
 *   carries it on. Proteins set by the highest temperature each depth reached, so the cut face shows the history: a
 *   browned crust, a grey band, then pink and red toward a cooler centre.
 * - `cookEgg`: an egg boiled in water for some minutes then cooled in ice water, as a sphere with the yolk inside.
 *   The white sets at about 62–80 °C, the yolk at about 65–70 °C; a long boil leaves a grey-green ring on the yolk.
 * - `toastBrowning`: Maillard browning on a toasting slice (estimated kinetics: a drying lag, then browning).
 * - `meatColour`, `eggColours`, `crustColour`: colours for a peak temperature or a browning index.
 *
 * Explicit finite differences; deterministic.
 */
import type { RGB3 } from "../anatomy/foundation-raster";
import { linearOf } from "../anatomy/foundation-raster";
import { crustColour } from "./food-textures";
import { COOKING_TEMPERATURES as T, DIFFUSIVITY } from "./food-data";

export interface SteakCook {
  /** Thickness, mm (default 25). */ thickness?: number;
  /** Pan surface temperature, °C (default 220). */ pan?: number;
  /** Starting temperature, °C (default 5, from the fridge; 20 tempered). */ start?: number;
  /** Seconds on each side (default 270), sides cooked (default 2), and resting time, s (default 300). The usual guide for 25 mm: 4–5 min a side, medium rare. */ perSide?: number; sides?: number; rest?: number;
}
export interface SteakResult {
  /** Positions through the thickness, 0 (first side down) … 1, and the peak temperature each reached, °C. */
  depth: Float32Array; peak: Float32Array;
  /** The browning index (0 … 1) of each face (0: the first side down, 1: the other). */
  crust: [number, number];
  /** The centre's peak temperature and the doneness it reads as. */ core: number; doneness: string;
}

/** Cook a steak: sear each side, rest, by 1D heat conduction. */
export function cookSteak(o: SteakCook = {}): SteakResult {
  const L = (o.thickness ?? 25) / 1000, pan = o.pan ?? 220, n = 60, dx = L / (n - 1), a = DIFFUSIVITY.beef.typical, k = 0.45; // W/m·K
  // contact through a film of fat and juice (about 200–300 W/m²K, estimated); moist meat cannot pass 100 °C (its water boils)
  const hPan = 800, hAir = 12, air = 22, dt = (0.4 * dx * dx) / a;
  const Tn = new Float64Array(n).fill(o.start ?? 5), peak = new Float32Array(n).fill(o.start ?? 5);
  const crust = [0, 0];
  const step = (bottom: "pan" | "air", top: "pan" | "air", downFace: 0 | 1) => {
    const next = new Float64Array(n);
    for (let i = 1; i < n - 1; i++) next[i] = Tn[i] + (a * dt * (Tn[i - 1] - 2 * Tn[i] + Tn[i + 1])) / (dx * dx);
    // faces: a half cell with the boundary flux (moist surfaces cannot pass 100 °C until they dry; a seared face does)
    const face = (i: number, j: number, env: "pan" | "air") => {
      const h = env === "pan" ? hPan : hAir, Te = env === "pan" ? pan : air;
      return Tn[i] + ((2 * dt) / (dx * dx)) * a * (Tn[j] - Tn[i]) + ((2 * dt) / dx) * (a / k) * h * (Te - Tn[i]);
    };
    next[0] = face(0, 1, bottom); next[n - 1] = face(n - 1, n - 2, top);
    for (let i = 0; i < n; i++) { Tn[i] = i > 0 && i < n - 1 ? Math.min(100, next[i]) : next[i]; if (Tn[i] > peak[i]) peak[i] = Tn[i]; }
    // browning: Maillard proceeds above about 140 °C, faster as it gets hotter (an Arrhenius-like doubling per 10 °C)
    const f0 = downFace === 0 ? Tn[0] : Tn[n - 1];
    if (f0 > T.maillard.min) crust[downFace] += dt * 0.0024 * Math.pow(2, (f0 - T.maillard.typical) / 15);
  };
  const sides = o.sides ?? 2, per = o.perSide ?? 270;
  for (let s = 0; s < sides; s++) { const steps = Math.round(per / dt); for (let q = 0; q < steps; q++) step(s % 2 === 0 ? "pan" : "air", s % 2 === 0 ? "air" : "pan", (s % 2) as 0 | 1); }
  for (let q = 0, steps = Math.round((o.rest ?? 300) / dt); q < steps; q++) step("air", "air", 0);
  const depth = Float32Array.from({ length: n }, (_, i) => i / (n - 1)), core = peak[Math.floor(n / 2)];
  const doneness = core < 50 ? "blue" : core < 55 ? "rare" : core < 60 ? "medium-rare" : core < 65 ? "medium" : core < 70 ? "medium-well" : "well";
  return { depth, peak, crust: [Math.min(1, crust[0]), Math.min(1, crust[1])], core, doneness };
}

export interface EggCook { /** Minutes in boiling water (default 7). */ minutes?: number; /** Start temperature, °C (default 5, from the fridge). */ start?: number; /** Egg width, mm (default 43, a large egg). */ eggWidth?: number }
export interface EggResult { /** Radius fractions 0 (centre) … 1 (shell) and the peak temperature each reached, °C. */ r: Float32Array; peak: Float32Array; yolkRadius: number; greenRing: boolean; label: string }

/** Boil an egg (a sphere of white round a yolk) for some minutes, then cool it in ice water. */
export function cookEgg(o: EggCook = {}): EggResult {
  const R = (o.eggWidth ?? 43) / 2000, n = 40, dr = R / (n - 1), a = DIFFUSIVITY.egg.typical, dt = (0.3 * dr * dr) / a;
  const Tn = new Float64Array(n).fill(o.start ?? 5), peak = new Float32Array(n).fill(o.start ?? 5);
  const run = (seconds: number, water: number) => {
    for (let q = 0, steps = Math.round(seconds / dt); q < steps; q++) {
      const next = new Float64Array(n);
      next[0] = Tn[0] + (6 * a * dt * (Tn[1] - Tn[0])) / (dr * dr);
      for (let i = 1; i < n - 1; i++) { const ri = i * dr; next[i] = Tn[i] + a * dt * ((Tn[i + 1] - 2 * Tn[i] + Tn[i - 1]) / (dr * dr) + (Tn[i + 1] - Tn[i - 1]) / (ri * dr)); }
      next[n - 1] = water; // the shell sits in the water
      for (let i = 0; i < n; i++) { Tn[i] = next[i]; if (Tn[i] > peak[i]) peak[i] = Tn[i]; }
    }
  };
  const min = o.minutes ?? 7;
  run(min * 60, 100); run(120, 2);
  const yolkRadius = 0.58, yi = Math.round(yolkRadius * (n - 1)), centre = peak[0];
  const label = centre < 62 ? "runny yolk" : centre < 66 ? "jammy yolk (just set at the edge)" : centre < 70 ? "soft-set yolk" : "hard yolk";
  return { r: Float32Array.from({ length: n }, (_, i) => i / (n - 1)), peak, yolkRadius, greenRing: min >= 12 && peak[yi] > 90, label };
}

/** Toast browning index (0 pale … 1 burnt) after some seconds in a toaster of a power level (0.5 low … 1.5 high; estimated kinetics). */
export function toastBrowning(seconds: number, power = 1): number {
  const lag = 55 / power, rate = 0.0052 * power;
  return Math.min(1, Math.max(0, 1 - Math.exp(-Math.pow(Math.max(0, seconds - lag) * rate, 1.35))));
}

const mix = (a: RGB3, b: RGB3, t: number): RGB3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RAW = linearOf("#9b2630"), PINK = linearOf("#c55752"), ROSE = linearOf("#c98a7c"), GREY = linearOf("#8a6a56");
/** Beef's cut face for the peak temperature it reached (°C), linear RGB. */
export function meatColour(peakC: number): RGB3 {
  if (peakC < 50) return mix(RAW, PINK, ss(40, 50, peakC) * 0.4);
  if (peakC < 60) return mix(mix(RAW, PINK, 0.4), PINK, ss(50, 60, peakC));
  if (peakC < 68) return mix(PINK, ROSE, ss(60, 68, peakC));
  return mix(ROSE, GREY, ss(68, 75, peakC));
}
/** A browned surface for a browning index 0 … 1: golden, brown, deep brown, nearly black. */
/** Maillard browning colour (defined with MATL1's food textures). */
export { crustColour };
/** Egg white and yolk for the peak temperature reached (°C): colour and how set (0 liquid … 1 firm). */
export function eggColours(peakC: number, inYolk: boolean): { colour: RGB3; set: number } {
  if (inYolk) {
    const set = ss(T.eggYolkSets.min - 2, T.eggYolkSets.max + 2, peakC);
    return { colour: mix(linearOf("#f09a16"), linearOf("#f4cf5c"), ss(66, 80, peakC)), set };
  }
  const set = ss(T.eggWhiteSets.min - 1, T.eggWhiteFirm.typical, peakC);
  // (a set white is a bright, slightly cool white; underdone white stays glassy and faintly yellow)
  return { colour: mix(linearOf("#ddd8b8"), linearOf("#fbfbf8"), set), set };
}
