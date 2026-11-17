/**
 * FX1 data: fire, smoke, sparks, explosions and firelight in any art style, from the physics of flames.
 *
 * - Flame height from the fire's heat release and diameter (Heskestad's correlation).
 * - Flame colour from the temperature of glowing soot (blackbody, `blackbodyRGB`), with a blue base where the gas
 *   burns premixed (chemiluminescence of CH and C₂).
 * - Flicker: buoyant flames puff at about 1.5/√D Hz (D the fire's diameter, m).
 * - Smoke plumes widen with height (a half-angle of about 6–7°), white-grey from wood, black from oil and plastics.
 * - Sparks and embers, fireballs, and the colour and flicker of firelight.
 *
 * Each value is graded like the other foundations: `reported` (quoted from a cited source), `measured`, `estimated`.
 */
import type { Range } from "../anatomy/foundation-shapes";
import { range as r } from "../anatomy/foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

/** Mean flame height, m, for a heat release Q (kW) and fire diameter D (m): L = 0.235 Q^(2/5) − 1.02 D (Heskestad 1983). */
export const flameHeight = (Q: number, D: number) => Math.max(0.01, 0.235 * Math.pow(Q, 0.4) - 1.02 * D);
/** Puffing (flicker) frequency, Hz, of a buoyant fire of diameter D (m): about 1.5/√D (Cetegen & Ahmed 1993; Zukoski). */
export const flickerHz = (D: number) => 1.5 / Math.sqrt(Math.max(0.005, D));

export type FireId = "candle" | "match" | "torch" | "campfire" | "bonfire" | "oil-fire";
export interface Fire { id: FireId; label: string; Q: number; D: number; soot: number; smoke: "light" | "grey" | "black"; note: string; source: string;
  /** A small laminar flame's measured height and width (m): Heskestad's correlation is for turbulent fires. */
  laminar?: { height: number; width: number } }
/** Fires by heat release (kW) and diameter (m). Candle and campfire powers reported; the rest estimated. */
export const FIRES: readonly Fire[] = [
  { id: "candle", label: "Candle", Q: 0.08, D: 0.01, soot: 0.6, smoke: "light", laminar: { height: 0.035, width: 0.012 }, note: "A blue base at the wick, a bright yellow core, a dim orange tip; about 3–4 cm tall; steady in still air, flickering at 10–15 Hz in a draught.", source: "Wikipedia: Candle (about 80 W)" },
  { id: "match", label: "Match", Q: 0.05, D: 0.004, soot: 0.5, smoke: "light", laminar: { height: 0.03, width: 0.012 }, note: "Flares bright and white at first (the head), then a small yellow flame.", source: "estimated" },
  { id: "torch", label: "Torch (oil-soaked rag)", Q: 15, D: 0.08, soot: 1, smoke: "black", note: "Ragged orange flames with a black sooty tail.", source: "estimated" },
  { id: "campfire", label: "Campfire", Q: 120, D: 0.6, soot: 0.8, smoke: "grey", note: "Flames about 0.5–1 m, licking up in tongues; embers glow red underneath; grey-white wood smoke.", source: "Wikipedia: Campfire; heat release about 50–300 kW (estimated)" },
  { id: "bonfire", label: "Bonfire", Q: 2000, D: 2.5, soot: 0.9, smoke: "grey", note: "Flames several metres tall; columns of sparks; slow, large puffs (about 1 Hz).", source: "estimated" },
  { id: "oil-fire", label: "Oil pool fire", Q: 3000, D: 2, soot: 1.4, smoke: "black", note: "Orange flames wrapped in thick black smoke; much of the flame hidden by soot.", source: "Pool fire practice (estimated)" },
];
export const findFire = (id: string): Fire => FIRES.find(f => f.id === id) ?? FIRES[0];

/** Flame and ember temperatures, K, and how they look. */
export const FLAME_TEMPERATURES: readonly { what: string; kelvin: Range; look: string }[] = [
  { what: "Embers, dull red", kelvin: rep(870, 950, 1000, "Wikipedia: Incandescence (dull red about 600–700 °C)"), look: "Deep red, visible only in the dark." },
  { what: "Embers, glowing orange", kelvin: rep(1100, 1200, 1300, "Wikipedia: Incandescence"), look: "Orange, flickering as air reaches them." },
  { what: "Wood fire flame (soot)", kelvin: rep(1300, 1400, 1600, "Wikipedia: Flame (wood fire about 1027 °C)"), look: "Orange-yellow." },
  { what: "Candle flame (soot)", kelvin: rep(1400, 1500, 1700, "Wikipedia: Flame (candle luminous zone about 1200–1400 °C)"), look: "Yellow, the hottest part just above the blue zone." },
  { what: "Blue base (premixed)", kelvin: rep(1700, 1900, 2200, "Wikipedia: Flame (blue light from CH and C₂ radicals, not heat)"), look: "Blue from chemiluminescence, faint; the hottest gas, not the brightest." },
];

/** Smoke: plume spread and colour. */
export const SMOKE = {
  halfAngle: rep(6, 7, 9, "Plume theory: radius about 0.12 × height (Morton, Taylor & Turner 1956)"),
  colours: { light: "#d9dde2", grey: "#a3acb6", black: "#1d1c1b" },
  notes: ["Wood smoke is white to blue-grey (fine droplets scatter light; blue against dark, brown against bright sky).", "Oil, rubber and plastics give black, sooty smoke that hides the flame.", "Smoke rises in billows that roll and widen; it stops rising and spreads flat at an inversion."],
} as const;

/** Sparks and embers carried up from a fire. */
export const SPARKS = {
  life: est(0.5, 1.5, 4, "Small wood sparks cool and fade within a second or two"),
  rise: est(1, 2.5, 6, "Carried by the plume (m/s)"),
  notes: ["Sparks start yellow-orange and dim to red as they cool, then vanish.", "They follow the swirling plume, not straight lines; a few drop back."],
} as const;

/** A hydrocarbon fireball's diameter and duration for a fuel mass M (kg): D ≈ 5.8 M^(1/3) m, t ≈ 0.45 M^(1/3) s (CCPS; reported). */
export const fireball = (M: number) => ({ diameter: 5.8 * Math.cbrt(M), seconds: 0.45 * Math.cbrt(M) });

/** Firelight as a light source: colour temperature and flicker. */
export const FIRELIGHT = {
  candle: rep(1800, 1850, 1930, "Wikipedia: Color temperature (candle flame about 1850 K)"),
  campfire: est(1700, 1900, 2000, "Wikipedia: Color temperature (similar to a candle)"),
  flicker: est(0.1, 0.18, 0.3, "Brightness swings of about 10–30% at a few hertz"),
  notes: ["Firelight is deep orange (about 1900 K): faces warm, shadows deep and moving.", "Light falls off with the square of the distance: a campfire lights faces within a few metres and leaves the rest dark."],
} as const;

// ---- Blackbody colour ---------------------------------------------------------------------------------------------------

/** CIE 1931 colour-matching functions, multi-lobe Gaussian fit (Wyman, Sloan & Shirley 2013). */
function cie(lambdaNm: number): [number, number, number] {
  const g = (x: number, mu: number, s1: number, s2: number) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const x = 1.056 * g(lambdaNm, 599.8, 37.9, 31) + 0.362 * g(lambdaNm, 442, 16, 26.7) - 0.065 * g(lambdaNm, 501.1, 20.4, 26.2);
  const y = 0.821 * g(lambdaNm, 568.8, 46.9, 40.5) + 0.286 * g(lambdaNm, 530.9, 16.3, 31.1);
  const z = 1.217 * g(lambdaNm, 437, 11.8, 36) + 0.681 * g(lambdaNm, 459, 26, 13.8);
  return [x, y, z];
}
const bbCache = new Map<number, [number, number, number]>();
/**
 * The colour of a blackbody at T kelvin as linear sRGB, normalised so its brightest channel is 1, and its relative
 * radiance (`blackbodyRadiance`, Stefan–Boltzmann-like growth in the visible).
 */
export function blackbodyRGB(T: number): [number, number, number] {
  const key = Math.round(T / 10) * 10, hit = bbCache.get(key);
  if (hit) return hit;
  let X = 0, Y = 0, Z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const m = l * 1e-9, B = 1 / (m ** 5 * (Math.exp(0.014388 / (m * key)) - 1)), c = cie(l);
    X += B * c[0]; Y += B * c[1]; Z += B * c[2];
  }
  const R = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, G = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, Bc = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const mx = Math.max(R, G, Bc, 1e-30), out: [number, number, number] = [Math.max(0, R / mx), Math.max(0, G / mx), Math.max(0, Bc / mx)];
  bbCache.set(key, out);
  return out;
}
/** Visible radiance of a blackbody relative to one at 1500 K (steeply rising: about T^10 near flame temperatures). */
export function blackbodyRadiance(T: number): number {
  const vis = (t: number) => { let s = 0; for (let l = 400; l <= 700; l += 10) { const m = l * 1e-9; s += 1 / (m ** 5 * (Math.exp(0.014388 / (m * t)) - 1)) * cie(l)[1]; } return s; };
  return vis(T) / vis(1500);
}
