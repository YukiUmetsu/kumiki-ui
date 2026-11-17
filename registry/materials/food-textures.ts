/**
 * Food textures (MATL1 family `food`, used by FOOD1's still lifes): what the surface of each food is made of, as a
 * solid texture in millimetres, built from its structure at real size before any colour noise. MATL1 shows each as a
 * ball and a tile (`materialTexture("food-…")`); FOOD1's surfaces sample the same recipes with their own settings.
 *
 * - beef: muscle fibres run in fascicles about 1–2 mm across, bound by thin perimysium into bundles several mm across;
 *   intramuscular fat (marbling) collects in that seam network, so it is a web of streaks, not blobs. A steak is cut
 *   across the grain, so its face shows the fascicles end-on. A ribeye's face has the eye, the cap (spinalis) and the
 *   fat seam and kernel between them.
 * - seared: a Maillard crust of fused protein beads, darkest on the peaks, fissured where it shrank.
 * - salmon and tuna: W-shaped myomeres separated by white myosepta (fat lines); cooked fish opens into flakes along
 *   them with beads of white albumin.
 * - poultry skin: feather follicles in tracts, fat showing yellow through thin skin; roasting blisters it.
 * - fish skin: overlapping cycloid scales in rows, dark margins, a silver belly.
 * - bread: a blistered, fissured crust; an open crumb of alveoli with glossy walls.
 * - cooked rice: plump translucent grains with dark gaps.
 * - cheese: tyrosine crystals and fissures in an aged paste; a gratin's blisters.
 * - produce: tomato (micro-dimples, a glossy cuticle), pepper (glossy, dented and folded), potato (russet net,
 *   eyes, lenticels, earth), citrus peel (oil glands), mushroom cap (radial fibrils and cracks).
 *
 * Sizes are estimated from close-up photographs of the foods (`grade: estimated`); nothing here is measured.
 */
import { fbm3, gradNoise3, worley3 } from "../anatomy/foundation-raster";
import type { C3, TexSample } from "./materials-texture";

export type FoodSolid = (x: number, y: number, z: number) => TexSample;

const srgbToLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const memo = new Map<string, C3>();
/** Linear colour of a hex string (cached). */
export const hexLin = (hex: string): C3 => { let c = memo.get(hex); if (!c) { const n = parseInt(hex.slice(1, 7), 16); c = [srgbToLin(((n >> 16) & 255) / 255), srgbToLin(((n >> 8) & 255) / 255), srgbToLin((n & 255) / 255)]; memo.set(hex, c); } return c; };
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sst = (a: number, b: number, x: number) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: readonly number[], b: readonly number[], t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: readonly number[], k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];

/** Maillard browning of a surface: a browning index 0 (the raw colour `base`) … 1 (near black), through gold, amber and
 *  mahogany. (FOOD1's `crustColour`.) */
export function crustColour(b: number, base: readonly number[] = hexLin("#d9b98a")): C3 {
  const stops = [base, hexLin("#c9944e"), hexLin("#8a5126"), hexLin("#4a2a16"), hexLin("#1c120c")];
  const x = Math.min(0.999, Math.max(0, b)) * (stops.length - 1), i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}

// ---- Meat -----------------------------------------------------------------------------------------------------------------------

export interface BeefSpec {
  /** Intramuscular fat 0 (lean) … 1 (wagyu). */
  marbling?: number;
  /** The fibres run along this axis (a steak lying flat: "y", its face shows them end-on). */
  axis?: "x" | "y" | "z";
  muscle?: string; fat?: string;
  /** A ribeye's face (in x, z of a steak `size` mm across): eye, cap, seam and kernel. */
  ribeye?: { w: number; d: number };
  /** Knife marks on the cut face 0…1. */
  knife?: number;
  seed?: number;
}
/** Raw beef. */
export function beefSolid(sp: BeefSpec = {}): FoodSolid {
  const seed = sp.seed ?? 11, marb = sp.marbling ?? 0.35, red = hexLin(sp.muscle ?? "#9a1f26"), dark = hexLin("#561018"), bright = hexLin("#b8323a");
  const fat = hexLin(sp.fat ?? "#f2e6cc"), fatY = hexLin("#e9d39c"), knife = sp.knife ?? 0.5, fine = 1 - marb * 0.25;
  return (x, y, z) => {
    // fibre-aligned coordinates: u along the fibres, (v, w) across them, wandering a little
    const [u, v0, w0] = sp.axis === "x" ? [x, y, z] : sp.axis === "z" ? [z, y, x] : [y, x, z];
    const wv = fbm3(seed + 3, u / 30, v0 / 11, w0 / 11, 3) * 3.5, v = v0 + wv, w = w0 - wv * 0.6;
    // fascicles end-on: cells about 1.4 mm, barely paler at their walls
    const fas = worley3(seed, u / 16, v / 1.4, w / 1.4), wall = 1 - sst(0, 0.1, fas.f2 - fas.f1);
    // marbling: streaks along the seams between bundles, broken and branching, thicker where more fat collects
    const bs = 9 * fine, bun = worley3(seed + 1, u / 40, v / bs, w / bs), seamD = bun.f2 - bun.f1;
    // fat collects along only some stretches of the seams: streaks of very different widths, forks and specks,
    // most of the face clean muscle (unless it is wagyu)
    const feed = 0.5 + 0.5 * fbm3(seed + 2, u / 12, v / 4.5, w / 4.5, 4), on = sst(0.66 - marb * 0.42, 0.74 - marb * 0.38, feed);
    const width = (0.015 + 0.1 * marb) * (0.25 + 2.2 * Math.max(0, feed - 0.6 + marb * 0.35));
    let fatT = (1 - sst(width * 0.5, width + 0.004, seamD)) * on;
    const speck = worley3(seed + 14, u / 20, v / 2.2, w / 2.2), sr = 0.1 + 0.18 * speck.id;
    if (speck.f1 < sr && speck.id < 0.04 + marb * 0.35) fatT = Math.max(fatT, sst(sr, sr * 0.5, speck.f1));
    const thread = 1 - sst(0, 0.035 + 0.05 * marb, Math.abs(fbm3(seed + 12, u / 25, v / 3.5, w / 3.5, 3)));
    fatT = c01(Math.max(fatT, thread * sst(0.7 - marb * 0.4, 0.85, feed) * sst(0.5, 0.95, marb) * (0.3 + marb)));
    let region = 0;
    if (sp.ribeye) {
      // eye muscle (longissimus) offset from centre, cap (spinalis) curving over it, a fat seam between, the kernel
      const W = sp.ribeye.w / 2, D = sp.ribeye.d / 2, ex = (x + W * 0.12) / (W * 0.62), ez = (z + D * 0.08) / (D * 0.7), eye = Math.hypot(ex, ez) + fbm3(seed + 7, x / 14, 0, z / 14, 2) * 0.08;
      const seamBand = (1 - sst(0.01, 0.03 + 0.06 * (0.5 + 0.5 * fbm3(seed + 15, x / 9, 0, z / 9, 2)), Math.abs(eye - 1))) * sst(-0.5, 0, fbm3(seed + 16, x / 20, 0, z / 20, 2) + 0.35);
      const kernel = 1 - sst(0, 0.12, Math.hypot((x - W * 0.42) / (W * 0.16), (z + D * 0.3) / (D * 0.2)) - 1 + fbm3(seed + 8, x / 6, 0, z / 6, 2) * 0.3);
      region = eye < 1 ? 0 : 1;
      fatT = Math.max(fatT, seamBand * 0.95, kernel);
    }
    // myoglobin: cherry where it bloomed, darker purple-red in patches; fascicles a shade apart
    const bloom = 0.5 + 0.5 * fbm3(seed + 4, x / 22, y / 22, z / 22, 3);
    let a = mix(mix(dark, red, sst(0.1, 0.55, bloom)), bright, sst(0.7, 0.98, bloom) * 0.45);
    a = mul(a, (0.94 + 0.08 * fas.id) * (1 + wall * 0.05) * (region ? 1.04 : 1));
    const fatCol = mix(fat, fatY, 0.25 + 0.5 * (0.5 + 0.5 * fbm3(seed + 5, x / 7, y / 7, z / 7, 2)));
    // fat at a thin edge is translucent: the meat shows pink through it
    a = mix(a, fatCol, fatT * (0.55 + 0.45 * sst(0.2, 0.7, fatT)));
    // a cut face: fascicles faintly domed, fat standing proud, the knife's drag in shallow strokes, a torn patch here and there
    const stroke = knife * 0.02 * Math.sin((x * 0.9 + z * 0.35 + fbm3(seed + 6, x / 20, y / 20, z / 20, 2) * 3) * 2.2);
    const tear = knife * Math.max(0, fbm3(seed + 13, x / 5, y / 5, z / 5, 3) - 0.35) * 0.6;
    const h = (1 - Math.min(1, fas.f1 * 1.5)) * 0.035 - wall * 0.02 + fatT * 0.05 + stroke - tear + fbm3(seed + 10, x / 3, y / 3, z / 3, 2) * 0.04;
    const r = 0.2 + 0.18 * (0.5 + 0.5 * fbm3(seed + 11, x / 9, y / 9, z / 9, 2)) + fatT * 0.16 + tear * 0.3;
    return { a, h, r };
  };
}
/** A seared crust: fused protein beads browned to `bake`, char on the peaks, a few fissures where the crust shrank. */
export function searSolid(sp: { bake?: number; base?: string; seed?: number; char?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 21, base = hexLin(sp.base ?? "#a86a48"), bake = sp.bake ?? 0.7, char = sp.char ?? 0.4;
  return (x, y, z) => {
    const wx = fbm3(seed + 5, x / 8, y / 8, z / 8, 2) * 1.5;
    const bead = worley3(seed, (x + wx) / 0.8, y / 0.8, (z - wx) / 0.8), dome = Math.sqrt(Math.max(0, 1 - Math.min(1, bead.f1 * 1.5)));
    const patch = fbm3(seed + 1, x / 9, y / 9, z / 9, 4), fine = fbm3(seed + 6, x / 2.5, y / 2.5, z / 2.5, 3);
    // fissures: a broken ridged network, here and gone
    const fissure = Math.pow(1 - Math.abs(fbm3(seed + 2, x / 7, y / 7, z / 7, 3)), 14) * sst(0.1, 0.5, fbm3(seed + 3, x / 15, y / 15, z / 15, 2) + 0.2);
    const b = c01(bake * (0.7 + 0.32 * patch + 0.1 * fine) + dome * 0.12 - fissure * 0.25);
    let a = crustColour(b, base) as C3;
    if (b > 0.68 && dome > 0.6 && bead.id < char * 0.45) a = mix(a, [0.012, 0.008, 0.006], 0.8 * dome);
    const h = dome * 0.12 + patch * 0.4 + fine * 0.08 - fissure * 0.3;
    return { a, h, r: 0.52 - dome * 0.18 + fissure * 0.12 };
  };
}

// ---- Fish -------------------------------------------------------------------------------------------------------------------------

/** Salmon (or trout) flesh: W-shaped myomeres between white myosepta; cooked (0…1) it turns opaque and flakes. */
export function salmonSolid(sp: { cooked?: number; colour?: string; spacing?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 31, ck = sp.cooked ?? 0, raw = hexLin(sp.colour ?? "#ee7240"), deep = hexLin("#cf4a24"), pale = hexLin("#f6a070"), cooked = hexLin("#f3a582"), fatC = hexLin("#fbefe4"), sp0 = sp.spacing ?? 8;
  return (x, y, z) => {
    // the myomere index: a W across the fillet, its spacing breathing, the septa wandering
    const warp = fbm3(seed, x / 25, y / 18, z / 18, 3) * 4.5 + fbm3(seed + 5, x / 6, y / 6, z / 6, 2) * 0.8;
    const ch = (x + Math.abs(z) * 0.62 + Math.abs(y) * 0.3 + warp) / (sp0 * (0.85 + 0.3 * (0.5 + 0.5 * fbm3(seed + 6, x / 40, 0, z / 40, 1)))), f = ch - Math.floor(ch), d = Math.abs(f - 0.5) * 2;
    // a septum's fat line: its width swelling and thinning, sometimes doubled, sometimes fading out
    const swell = 0.5 + 0.5 * fbm3(seed + 1, x / 7, y / 7, z / 7, 3), width = 0.02 + 0.1 * swell * swell, fade = sst(-0.4, 0.1, fbm3(seed + 7, x / 12, y / 12, z / 12, 2));
    const septum = sst(1 - width, 1 - width * 0.25, d) * (0.45 + 0.55 * fade), twin = sst(0.9, 0.97, Math.abs(f - 0.5 - 0.12 * Math.sign(f - 0.5)) * 2) * 0.35 * (swell > 0.7 ? 1 : 0);
    // muscle fibres within each myomere, and marbled fat streaks along them
    const fibre = 0.5 + 0.5 * Math.sin(f * Math.PI * 24 + fbm3(seed + 2, x / 3, y / 3, z / 3, 2) * 2.5);
    const streak = Math.pow(Math.max(0, fbm3(seed + 8, x / 2.5, f * 9, z / 9, 3)), 3) * 1.6;
    let a = mix(deep, raw, 0.55 + 0.45 * fbm3(seed + 3, x / 30, y / 18, z / 18, 2));
    a = mix(a, pale, sst(0.4, 1, Math.abs(z) / 40) * 0.3);
    a = mix(a, cooked, ck);
    a = mul(a, 0.94 + 0.07 * fibre);
    a = mix(a, fatC, c01(Math.max(septum, twin) * (0.88 - ck * 0.2) + streak * 0.25));
    let h = -septum * 0.07 + fibre * 0.012;
    if (ck > 0) {
      // flakes part along the septa into blocks; albumin beads on the seams
      h -= septum * ck * 0.55;
      const al = worley3(seed + 4, x / 1.1, y / 1.1, z / 1.1);
      if (septum > 0.3 && al.f1 < 0.25 * ck) { a = mix(a, [0.92, 0.9, 0.86], 0.8); h += 0.25; }
    }
    return { a, h, r: 0.16 + ck * 0.42 + septum * 0.1 };
  };
}
/** Tuna loin: deep red, faint pale septa arcs, an oily sheen. */
export function tunaSolid(seed = 33): FoodSolid {
  const red = hexLin("#8c1424"), dark = hexLin("#5a0c18"), sept = hexLin("#c25a62");
  return (x, y, z) => {
    const ch = (x + Math.hypot(y, z) * 0.9 + fbm3(seed, x / 25, y / 25, z / 25, 2) * 6) / 14, d = Math.abs((ch - Math.floor(ch)) - 0.5) * 2, s = sst(0.93, 0.985, d) * (0.3 + 0.7 * sst(-0.3, 0.4, fbm3(seed + 4, x / 15, y / 15, z / 15, 2)));
    let a = mix(dark, red, 0.55 + 0.45 * fbm3(seed + 1, x / 14, y / 14, z / 14, 3));
    a = mix(a, sept, s * 0.35);
    return { a, h: -s * 0.03 + fbm3(seed + 2, x / 2, y / 2, z / 2, 2) * 0.02, r: 0.2 + 0.1 * fbm3(seed + 3, x / 8, y / 8, z / 8, 2) };
  };
}
/** Fish skin with cycloid scales in rows (scale `size` mm), dark back to silver belly by height (y), a lateral line. */
export function fishScaleSolid(sp: { back?: string; belly?: string; size?: number; seed?: number; bellyY?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 35, back = hexLin(sp.back ?? "#3c4e57"), belly = hexLin(sp.belly ?? "#d8dde0"), S = sp.size ?? 2.2, margin = hexLin("#20262a");
  return (x, y, z) => {
    const row = Math.floor(y / S), xx = x / S + (row & 1) * 0.5, col = Math.floor(xx), fx = xx - col - 0.5, fy = y / S - row - 0.5;
    // each scale: a disc overlapping the next one forward, its free edge darker
    const rr = Math.hypot(fx * 1.1, fy), edge = sst(0.32, 0.5, rr) * (fx > 0 ? 1 : 0.4);
    let a = mix(belly, back, sst((sp.bellyY ?? 0) - 6, (sp.bellyY ?? 0) + 8, y + fbm3(seed, x / 15, y / 15, z / 15, 2) * 4));
    a = mul(a, 0.9 + 0.15 * (((col * 31 + row * 17) % 7) / 7));
    a = mix(a, margin, edge * 0.35);
    const lateral = 1 - sst(0.2, 0.5, Math.abs(y - (sp.bellyY ?? 0) - 3 + Math.sin(x * 0.05) * 1.5));
    a = mix(a, mul(a, 0.7), lateral * 0.5);
    return { a, h: (0.5 - rr) * 0.06 + edge * 0.03, r: 0.18 + edge * 0.15 };
  };
}

// ---- Poultry ------------------------------------------------------------------------------------------------------------------

/** Poultry skin: raw (pale, follicles in tracts, fat showing through) or roasted (`roast` browning 0…1, blistered). */
export function poultrySolid(sp: { roast?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 41, rs = sp.roast ?? 0, raw = hexLin("#e8c0a4"), fatY = hexLin("#ecc878"), pink = hexLin("#d98e86"), base = hexLin("#e7c48a");
  return (x, y, z) => {
    // feather follicles: a dimple ringed by a raised collar, in tracts (dense bands, bare between)
    const tract = sst(-0.1, 0.25, fbm3(seed + 6, x / 22, y / 22, z / 22, 2));
    const fo = worley3(seed, x / 2.6, y / 2.6, z / 2.6, 0.7), pit = (1 - sst(0.06, 0.14, fo.f1)) * tract, collar = sst(0.12, 0.2, fo.f1) * (1 - sst(0.2, 0.34, fo.f1)) * tract;
    // loose skin folds and wrinkles
    const folds = Math.pow(1 - Math.abs(fbm3(seed + 1, x / 9, y / 9, z / 9, 3)), 7), wr = Math.pow(1 - Math.abs(fbm3(seed + 7, x / 2.5, y / 6, z / 2.5, 2)), 10);
    const big = fbm3(seed + 2, x / 14, y / 14, z / 14, 3);
    if (rs <= 0) {
      let a = mix(raw, fatY, sst(0.05, 0.55, big) * 0.65);
      a = mix(a, pink, sst(0.15, 0.6, -big) * 0.45);
      a = mul(a, (1 - pit * 0.35) * (1 + collar * 0.08) * (1 - folds * 0.14) * (0.94 + 0.1 * fbm3(seed + 9, x / 4, y / 4, z / 4, 2)));
      return { a, h: collar * 0.16 - pit * 0.12 - folds * 0.2 - wr * 0.04, r: 0.28 + 0.12 * folds };
    }
    // roasted: irregular blisters where fat bubbled under the skin, browner where the heat struck, fat glossy in the dips
    const bl = worley3(seed + 3, x / 1.6, y / 1.6, z / 1.6), blis = Math.sqrt(Math.max(0, 1 - Math.min(1, bl.f1 / (0.35 + 0.25 * bl.id)))) * (0.4 + 0.6 * sst(-0.3, 0.4, big));
    const b = c01(rs * (0.7 + 0.28 * big + 0.16 * blis) - folds * 0.12 + wr * 0.05);
    const a = mul(crustColour(b, base), (1 - pit * 0.22) * (0.92 + 0.12 * fbm3(seed + 8, x / 3, y / 3, z / 3, 2)));
    return { a, h: blis * 0.3 + big * 0.45 - pit * 0.05 - folds * 0.2 - wr * 0.04, r: 0.34 - 0.14 * (1 - blis) * sst(0, 0.5, -big + 0.3) };
  };
}

// ---- Bakery ---------------------------------------------------------------------------------------------------------------------

/** A bread crust: Maillard-browned to `bake`, blistered, finely crackled, `flour`-dusted. */
export function crustSolid(sp: { bake?: number; dough?: string; blisters?: number; flour?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 51, dough = hexLin(sp.dough ?? "#e0c79a"), bake = sp.bake ?? 0.6, flourC = hexLin("#efe9dc");
  return (x, y, z) => {
    const n1 = fbm3(seed, x / 9, y / 9, z / 9, 4), n2 = fbm3(seed + 1, x / 2.2, y / 2.2, z / 2.2, 3);
    const bw = worley3(seed + 2, x / 1.3, y / 1.3, z / 1.3), bl = Math.sqrt(Math.max(0, 1 - Math.min(1, bw.f1 / (0.25 + 0.15 * bw.id)))) * (bw.id < (sp.blisters ?? 0.4) * 0.6 ? 1 : 0);
    // crackle: fine shrinkage cracks that come and go
    const crack = Math.pow(1 - Math.abs(fbm3(seed + 3, x / 4, y / 4, z / 4, 3)), 16) * sst(0, 0.5, fbm3(seed + 6, x / 12, y / 12, z / 12, 2) + 0.15);
    const b = c01(bake * 0.8 * (0.84 + 0.18 * n1 + 0.08 * n2) + bl * 0.16 - crack * 0.18);
    let a = crustColour(b, dough) as C3;
    const f = (sp.flour ?? 0) * (0.25 + 0.2 * (0.5 + 0.5 * fbm3(seed + 4, x / 20, y / 20, z / 20, 2)));
    if (f > 0) a = mix(a, flourC, f * (0.8 + 0.4 * fbm3(seed + 5, x / 0.25, y / 0.25, z / 0.25, 2)));
    return { a, h: n2 * 0.25 + n1 * 0.4 + bl * 0.35 - crack * 0.2, r: 0.62 - bl * 0.1 + f * 0.3 };
  };
}
/** A cut crumb: irregular alveoli (`open` 0 tight … 1 open sourdough) with shaded, glossy walls inside the holes. */
export function crumbSolid(sp: { open?: number; colour?: string; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 59, c = hexLin(sp.colour ?? "#ead7b0"), open = sp.open ?? 0.5, k = 1.4 + open * 2.4;
  return (x, y, z) => {
    // alveoli stretched by the rise (taller than wide) and warped into irregular shapes
    const wx = fbm3(seed + 4, x / 6, y / 6, z / 6, 2) * 2.2 * k, wy = fbm3(seed + 5, x / 6, y / 6, z / 6, 2) * 2.2 * k;
    const cell = worley3(seed, (x + wx) / k, ((y + wy) / k) * 0.8, z / k), size = 0.22 + 0.36 * open * Math.pow(cell.id, 1.2);
    const t = cell.f1 / size, hole = 1 - sst(0.8, 1.02, t);
    const mid = worley3(seed + 1, x / 1.1, y / 1.3, z / 1.1), mhole = (1 - sst(0.22, 0.3, mid.f1)) * (mid.id > 0.45 ? 1 : 0), pin = 1 - sst(0.15, 0.25, worley3(seed + 7, x / 0.5, y / 0.5, z / 0.5).f1);
    // inside a hole: a shadowed rim under the lip, then the far wall lit and glossy (not black)
    const rim = hole * sst(0.55, 0.9, t), depth = Math.max(hole * (0.3 + 0.3 * (1 - t)) + rim * 0.25, mhole * 0.4, pin * 0.3);
    const wallGrain = 0.95 + 0.1 * fbm3(seed + 2, x / 0.8, y / 0.8, z / 0.8, 2);
    const a = mul(mix(c, mul(c, 0.82), hole * 0.4), wallGrain * (1 - depth * 0.55) * (0.97 + 0.06 * fbm3(seed + 6, x / 8, y / 8, z / 8, 2)));
    return { a, h: -(hole * (1 - t * 0.6) * (1.2 + open * 2) + mhole * 0.5 + pin * 0.2) + fbm3(seed + 3, x / 0.35, y / 0.35, z / 0.35, 2) * 0.05, r: 0.78 - hole * 0.4 };
  };
}
/** Cooked short-grain rice: plump grains about 5.5 × 3 mm, glossy and a little translucent, dark in the gaps. */
export function riceSolid(sp: { colour?: string; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 61, c = hexLin(sp.colour ?? "#f3efe6");
  return (x, y, z) => {
    const g = worley3(seed, x / 2.6, y / 1.5, z / 1.6), dome = Math.sqrt(Math.max(0, 1 - Math.min(1, g.f1 / 0.62)));
    return { a: mul(c, (0.62 + 0.42 * dome) * (0.95 + 0.07 * g.id)), h: dome * 0.6, r: 0.25 + (1 - dome) * 0.4 };
  };
}

// ---- Dairy -------------------------------------------------------------------------------------------------------------------------

/** An aged hard cheese: dense paste, tyrosine crystals (white specks), a few short fissures. */
export function agedCheeseSolid(sp: { paste?: string; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 71, p = hexLin(sp.paste ?? "#efd28a"), cry = hexLin("#fff8e4");
  return (x, y, z) => {
    let a = mul(p, 0.93 + 0.1 * fbm3(seed, x / 6, y / 6, z / 6, 3));
    const c = worley3(seed + 1, x / 1.3, y / 1.3, z / 1.3), crystal = c.f1 < 0.16 && c.id > 0.25 ? 1 - c.f1 / 0.16 : 0;
    a = mix(a, cry, crystal * 0.75);
    const fiss = Math.pow(1 - Math.abs(fbm3(seed + 2, x / 6, y / 6, z / 6, 3)), 18) * sst(0, 0.35, fbm3(seed + 4, x / 14, y / 14, z / 14, 2) + 0.1);
    a = mul(a, 0.96 + 0.06 * fbm3(seed + 5, x / 1.2, y / 1.2, z / 1.2, 2));
    return { a: mul(a, 1 - fiss * 0.3), h: crystal * 0.08 - fiss * 0.35 + fbm3(seed + 3, x / 1.5, y / 1.5, z / 1.5, 2) * 0.04, r: 0.5 - crystal * 0.12 };
  };
}
/** A gratin: golden melted cheese, raised blisters scorched only on the tallest, micro-droplets of fat. */
export function gratinSolid(sp: { paste?: string; browning?: number; bubbles?: number; scale?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 89, pc = hexLin(sp.paste ?? "#f2d27a"), k = sp.scale ?? 1, br = sp.browning ?? 0.5;
  return (x, y, z) => {
    const cell = worley3(seed, x / (5.5 * k), y / (5.5 * k), z / (5.5 * k)), small = worley3(seed + 1, x / 1.6, y / 1.6, z / 1.6);
    const bub = Math.sqrt(Math.max(0, 1 - Math.min(1, cell.f1 / (0.5 + 0.3 * cell.id)))) * (sp.bubbles ?? 0.8), micro = Math.sqrt(Math.max(0, 1 - Math.min(1, small.f1 / 0.38)));
    const wash = 0.5 + 0.5 * fbm3(seed + 2, x / 14, y / 14, z / 14, 3);
    const b = c01(br * (0.35 + 0.5 * wash + 0.2 * bub) + (cell.id > 0.62 ? sst(0.75, 1, bub) * br * 0.45 : 0));
    return { a: crustColour(b * 0.95, pc) as C3, h: bub * 1.4 + micro * 0.2, r: 0.3 - micro * 0.1 };
  };
}

// ---- Produce -------------------------------------------------------------------------------------------------------------------

/** Tomato skin: a glossy cuticle, micro-dimples, faint radial stretch lines round the stem end (+y). */
export function tomatoSolid(sp: { colour?: string; shoulder?: string; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 81, red = hexLin(sp.colour ?? "#c8240f"), sh = hexLin(sp.shoulder ?? sp.colour ?? "#c8240f");
  return (x, y, z) => {
    const r = Math.hypot(x, y, z) || 1, top = y / r, ang = Math.atan2(z, x);
    let a = mix(red, sh, sst(0.75, 0.98, top) * 0.5);
    a = mul(a, 0.93 + 0.1 * fbm3(seed, x / 9, y / 9, z / 9, 3));
    const dim = worley3(seed + 1, x / 0.55, y / 0.55, z / 0.55), stretch = sst(0.7, 0.95, top) * Math.abs(Math.sin(ang * 40 + fbm3(seed + 2, x / 4, y / 4, z / 4, 2) * 2));
    return { a, h: -(1 - Math.min(1, dim.f1 * 2)) * 0.012 - stretch * 0.02 + fbm3(seed + 3, x / 12, y / 12, z / 12, 2) * 0.15, r: 0.08 + stretch * 0.1 };
  };
}
/** Bell pepper skin: very glossy, gently dented and folded, a faint waxy orange-peel. */
export function pepperSolid(sp: { colour?: string; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 83, c = hexLin(sp.colour ?? "#c41a12");
  return (x, y, z) => {
    const dent = fbm3(seed, x / 16, y / 16, z / 16, 3), fold = Math.pow(1 - Math.abs(fbm3(seed + 1, x / 26, y / 9, z / 26, 2)), 12) * sst(0, 0.4, fbm3(seed + 3, x / 30, y / 30, z / 30, 1) + 0.2);
    return { a: mul(c, 0.92 + 0.1 * dent - fold * 0.06), h: dent * 0.35 - fold * 0.18 + fbm3(seed + 2, x / 0.6, y / 0.6, z / 0.6, 2) * 0.008, r: 0.06 + fold * 0.08 };
  };
}
/** Potato skin: a raised russet net (or thin skin), eyes, pale lenticels, earth in the hollows. */
export function potatoSolid(sp: { colour?: string; russet?: number; soil?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 85, c = hexLin(sp.colour ?? "#c8a36a"), soilC = hexLin("#5a4430"), len = hexLin("#e8d8b4"), rus = sp.russet ?? 0.6;
  return (x, y, z) => {
    const net = worley3(seed, x / 1.6, y / 1.6, z / 1.6), ridge = (1 - sst(0, 0.12, net.f2 - net.f1)) * rus;
    let a = mul(c, 0.86 + 0.18 * fbm3(seed + 1, x / 6, y / 6, z / 6, 3) - ridge * 0.15);
    const ln = worley3(seed + 2, x / 3, y / 3, z / 3);
    if (ln.f1 < 0.09 && ln.id > 0.6) a = mix(a, len, 0.5);
    const eye = worley3(seed + 3, x / 16, y / 16, z / 16), pit = eye.f1 < 0.11 ? (0.11 - eye.f1) * 9 : 0;
    const earth = (sp.soil ?? 0.4) * sst(0.15, 0.6, fbm3(seed + 4, x / 7, y / 7, z / 7, 4) + pit * 0.5 + ridge * 0.3);
    a = mix(a, soilC, earth * 0.85);
    return { a, h: ridge * 0.12 - pit * 0.8 + earth * 0.08 + fbm3(seed + 5, x / 4, y / 4, z / 4, 2) * 0.08, r: 0.6 + earth * 0.3 };
  };
}
/** Citrus peel: oil glands as shallow pits of mixed sizes, a waxed sheen, colour mottled. */
export function citrusSolid(sp: { colour?: string; seed?: number; pores?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 87, c = hexLin(sp.colour ?? "#ef8a1c"), deep = mul(hexLin(sp.colour ?? "#ef8a1c"), 0.8);
  return (x, y, z) => {
    const g = worley3(seed, x / 0.95, y / 0.95, z / 0.95), g2 = worley3(seed + 1, x / 0.45, y / 0.45, z / 0.45), pit = (1 - Math.min(1, g.f1 * 2.1)) * (0.6 + 0.4 * g.id) + (1 - Math.min(1, g2.f1 * 2.3)) * 0.3;
    const a = mix(c, deep, sst(0.4, 1, pit) * 0.5 + 0.1 * fbm3(seed + 2, x / 10, y / 10, z / 10, 2));
    return { a, h: -pit * (sp.pores ?? 0.12) + fbm3(seed + 3, x / 15, y / 15, z / 15, 2) * 0.2, r: 0.28 + pit * 0.1 };
  };
}
/** Mushroom cap: radial fibrils from the centre, scaly cracks in older caps, a suede bloom. */
export function mushroomCapSolid(sp: { colour?: string; cracks?: number; seed?: number } = {}): FoodSolid {
  const seed = sp.seed ?? 89, c = hexLin(sp.colour ?? "#8a6a4a"), pale = hexLin("#d8c8a8");
  return (x, y, z) => {
    const ang = Math.atan2(z, x), r = Math.hypot(x, z), fib = gradNoise3(seed, ang * 26, r / 2.5, y / 3);
    let a = mul(c, 0.85 + 0.2 * fbm3(seed + 1, x / 5, y / 5, z / 5, 3) + 0.06 * fib);
    const cr = worley3(seed + 2, x / 4.5, y / 4.5, z / 4.5), crack = (1 - sst(0, 0.05, cr.f2 - cr.f1)) * (sp.cracks ?? 0.3) * sst(5, 18, r);
    a = mix(a, pale, crack * 0.8);
    return { a, h: fib * 0.03 - crack * 0.3 + fbm3(seed + 3, x / 3, y / 3, z / 3, 2) * 0.1, r: 0.7 };
  };
}
