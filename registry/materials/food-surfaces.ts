/**
 * FOOD1 still-life surfaces: what each food, vessel and table top looks like up close, as surface functions for
 * `food-scene.ts`. Each one writes albedo, roughness, micro-relief (mm), subsurface mean free path, translucency,
 * sheen and clear coat from the sample's object-space position, so its texture stays put on the food.
 *
 * Measured light transport where it exists: Jensen et al. 2001 (SIGGRAPH, "A Practical Model for Subsurface Light
 * Transport", fig. 5) measured reduced scattering σs′ and absorption σa for apple, chicken, cream, ketchup, potato and
 * milk. The diffuse mean free path here is 1/σtr with σtr = √(3 σa (σa + σs′)), per colour (`MFP`). Everything else
 * (roughness, relief sizes) is estimated from close-up photographs and noted as such in `food-data.ts`.
 */
import { fbm, fbm3, gradNoise3, linearOf, worley, worley3 } from "../anatomy/foundation-raster";
import type { RGB3 } from "../anatomy/foundation-raster";
import { crustColour } from "./food-physics";
import type { V3 } from "./food-mesh";
import type { Sample, Surface, SurfaceFn } from "./food-scene";

// ---- Helpers ---------------------------------------------------------------------------------------------------------------------

export const lin = (hex: string): V3 => { const c = linearOf(hex); return [c[0], c[1], c[2]]; };
const cache = new Map<string, V3>();
/** Linear colour of a hex string (cached). */
export const C = (hex: string): V3 => { let c = cache.get(hex); if (!c) { c = lin(hex); cache.set(hex, c); } return c; };
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sst = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export function setMix(out: V3, a: RGB3, b: RGB3, t: number): V3 { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; }
export function mixInto(out: V3, b: RGB3, t: number): V3 { out[0] += (b[0] - out[0]) * t; out[1] += (b[1] - out[1]) * t; out[2] += (b[2] - out[2]) * t; return out; }
export function scaleInto(out: V3, k: number): V3 { out[0] *= k; out[1] *= k; out[2] *= k; return out; }
const setC = (out: V3, c: RGB3) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; };
const setV = (out: V3, x: number, y: number, z: number) => { out[0] = x; out[1] = y; out[2] = z; return out; };

/** Diffuse mean free path per colour (mm) from Jensen et al. 2001's measured σs′ and σa (mm⁻¹). */
function mfpOf(ss: V3, sa: V3): V3 { return [0, 1, 2].map(c => 1 / Math.sqrt(3 * sa[c] * (sa[c] + ss[c]))) as V3; }
export const MFP = {
  apple: mfpOf([2.29, 2.39, 1.97], [0.003, 0.0034, 0.046]),
  chicken: mfpOf([0.15, 0.21, 0.38], [0.015, 0.077, 0.19]),
  cream: mfpOf([7.38, 5.47, 3.15], [0.0002, 0.0028, 0.0163]),
  ketchup: mfpOf([0.18, 0.07, 0.03], [0.061, 0.97, 1.45]),
  potato: mfpOf([0.68, 0.7, 0.55], [0.0024, 0.009, 0.12]),
  wholemilk: mfpOf([2.55, 3.21, 3.77], [0.0011, 0.0024, 0.014]),
  skimmilk: mfpOf([0.7, 1.22, 1.9], [0.0014, 0.0025, 0.0142]),
} as const;
/** A mean free path scaled down (food skins scatter less far than the bulk measurements' slabs show on screen). */
const mfpK = (m: readonly number[], k: number, out: V3) => setV(out, m[0] * k, m[1] * k, m[2] * k);

// ---- Table tops and settings -----------------------------------------------------------------------------------------------------

export type TableKind = "oak" | "walnut" | "linen" | "slate" | "marble" | "burlap" | "zinc" | "pine";
/** A table top (world X–Z, mm): oiled planks, linen, slate, marble, market burlap, zinc or scrubbed pine. */
export function tableSurface(kind: TableKind, seed = 1): SurfaceFn {
  if (kind === "linen") {
    const a = C("#d9cfbf"), b = C("#b9ad99");
    return (s, o) => {
      const x = s.o[0], z = s.o[2], wx = Math.sin(x * 4.2 + fbm(seed, x / 9, z / 9, 2) * 2), wz = Math.sin(z * 4.0 + fbm(seed + 1, x / 8, z / 8, 2) * 2);
      const slub = fbm(seed + 2, x / 1.5, z / 40, 3) * 0.5 + fbm(seed + 3, x / 40, z / 1.4, 3) * 0.5, fold = fbm(seed + 4, x / 80, z / 60, 3);
      setMix(o.albedo, b, a, clamp01(0.55 + 0.25 * slub + 0.15 * fold));
      o.height = (wx * 0.5 + 0.5) * 0.12 + (wz * 0.5 + 0.5) * 0.12 + fold * 1.5; o.rough = 0.85; o.spec = 0.03; o.sheen = 0.25; setC(o.sheenTint, a);
    };
  }
  if (kind === "burlap") {
    const a = C("#a88a5d"), b = C("#6f5634");
    return (s, o) => {
      const x = s.o[0], z = s.o[2], wx = Math.abs(Math.sin(x * 1.25)), wz = Math.abs(Math.sin(z * 1.25)), slub = fbm(seed, x / 2, z / 30, 3);
      const cross = (Math.floor(x * 1.25 / Math.PI) + Math.floor(z * 1.25 / Math.PI)) & 1, thread = cross ? wx : wz;
      setMix(o.albedo, b, a, clamp01(0.35 + 0.5 * thread + 0.2 * slub));
      o.height = thread * 0.5 + fbm(seed + 3, x / 60, z / 60, 2) * 2; o.rough = 0.9; o.spec = 0.03; o.sheen = 0.2; setC(o.sheenTint, a); o.occl = 0.75 + 0.25 * thread;
    };
  }
  if (kind === "slate") {
    const a = C("#3b3e42"), b = C("#25272a");
    return (s, o) => {
      const x = s.o[0], z = s.o[2], cleave = fbm(seed, x / 30 + z / 90, z / 6, 4), spot = fbm(seed + 1, x / 12, z / 12, 3);
      setMix(o.albedo, b, a, clamp01(0.5 + 0.4 * cleave + 0.2 * spot)); o.rough = 0.55 + 0.2 * spot; o.spec = 0.04; o.height = cleave * 0.35;
    };
  }
  if (kind === "marble") {
    const a = C("#ebe7e1"), v = C("#9a958e");
    return (s, o) => {
      const x = s.o[0], z = s.o[2], vein = Math.abs(fbm(seed, x / 70 + fbm(seed + 2, x / 40, z / 40, 4) * 1.4, z / 120, 5));
      setMix(o.albedo, v, a, sst(0.0, 0.06, vein) * 0.85 + 0.15); o.rough = 0.18; o.spec = 0.045; o.mfp[0] = 3; o.mfp[1] = 2.8; o.mfp[2] = 2.6;
    };
  }
  if (kind === "zinc") {
    const a = C("#9ea3a6"), b = C("#6e7477");
    return (s, o) => { const x = s.o[0], z = s.o[2], sp = fbm(seed, x / 25, z / 25, 4), sc = Math.abs(fbm(seed + 3, x / 2, z / 50, 2)); setMix(o.albedo, b, a, clamp01(0.5 + 0.5 * sp)); o.spec = 0.5; o.rough = 0.38 + 0.2 * sc; };
  }
  // planks: oak (honey), walnut (dark), pine (scrubbed pale)
  const tones: Record<string, [string, string, string]> = { oak: ["#a3784a", "#6e4b2b", "#3a2616"], walnut: ["#5b3a24", "#3a2416", "#1a100a"], pine: ["#c9a97e", "#9c7b52", "#5a432a"] };
  const [light, dark, gap] = tones[kind] ?? tones.oak, cl = C(light), cd = C(dark), cg = C(gap);
  const plankW = kind === "pine" ? 140 : 160;
  return (s, o) => {
    const x = s.o[0], z = s.o[2], row = Math.floor((z + 4000) / plankW), zf = ((z + 4000) % plankW) / plankW, sh = (row * 0.37) % 1;
    const ring = fbm(seed + row * 13, x / 180, zf * 3 + sh * 9, 3) * 6 + zf * 9 + sh * 40, grain = Math.sin(ring * Math.PI * 2) * 0.5 + 0.5;
    const fine = fbm(seed + 5, x / 25, z / 0.8, 3), wear = fbm(seed + 7, x / 90, z / 90, 3);
    setMix(o.albedo, cd, cl, clamp01(0.35 + 0.35 * Math.pow(grain, 2) + 0.15 * fine + 0.25 * wear));
    // seams between planks
    const seam = Math.min(zf, 1 - zf) * plankW;
    if (seam < 2.5) { mixInto(o.albedo, cg, 1 - sst(0.4, 2.5, seam)); o.height = -0.6 * (1 - sst(0.3, 2.5, seam)); }
    o.height += fine * 0.03 + grain * 0.02; o.rough = kind === "pine" ? 0.75 : 0.42 + 0.2 * wear; o.spec = 0.035;
  };
}

// ---- Vessels -----------------------------------------------------------------------------------------------------------------------

/** Glazed stoneware: a speckled glaze that pools darker at the rim, a raw foot ring below `footY` (mm). */
export function stoneware(glaze: string, opts: { speckle?: number; rim?: string; footY?: number; clay?: string; rough?: number; drip?: number; seed?: number } = {}): SurfaceFn {
  const g = C(glaze), rim = C(opts.rim ?? glaze), clay = C(opts.clay ?? "#b08a66"), sp = opts.speckle ?? 0.5, fy = opts.footY ?? 5, seed = opts.seed ?? 3, rough = opts.rough ?? 0.22;
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 9, p[1] / 9, p[2] / 9, 3), dots = worley3(seed + 1, p[0] / 1.3, p[1] / 1.3, p[2] / 1.3);
    if (s.p[1] < fy + n1 * 1.5 && s.k.rawFoot !== 0) {
      setMix(o.albedo, clay, C("#7c5f45"), clamp01(0.5 + 0.5 * n1)); o.rough = 0.85; o.height = fbm3(seed + 2, p[0] / 0.8, p[1] / 0.8, p[2] / 0.8, 2) * 0.08; return;
    }
    const pool = s.k.rimY ? sst(s.k.rimY - 9, s.k.rimY - 1, s.p[1]) : 0, drip = (opts.drip ?? 0) * sst(0.1, 0.4, fbm(seed + 5, Math.atan2(p[2], p[0]) * 6, p[1] / 30, 3));
    setMix(o.albedo, g, rim, clamp01(pool * 0.8 + drip));
    scaleInto(o.albedo, 0.92 + 0.1 * n1);
    if (dots.f1 < 0.11 * sp) scaleInto(o.albedo, 0.45);
    o.rough = rough + 0.08 * n1; o.spec = 0.045; o.coat = 0.5; o.coatRough = rough * 0.6; o.height = n1 * 0.04;
  };
}
/** Unglazed earthenware (terracotta): porous, grog flecks, darker where food and oil soaked in, a burnished rim. */
export function earthenware(tone = "#b4673f", seed = 5): SurfaceFn {
  const a = C(tone), d = C("#6b3820"), grog = C("#e2c39a");
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 14, p[1] / 14, p[2] / 14, 4), fl = worley3(seed + 1, p[0] / 1.1, p[1] / 1.1, p[2] / 1.1), soak = sst(0.1, 0.5, fbm3(seed + 2, p[0] / 30, p[1] / 30, p[2] / 30, 3));
    setMix(o.albedo, a, d, clamp01(0.25 + 0.3 * n1 + 0.4 * soak));
    if (fl.f1 < 0.12 && fl.id > 0.5) mixInto(o.albedo, grog, 0.6);
    o.rough = 0.78 - 0.35 * soak; o.spec = 0.035; o.height = fbm3(seed + 3, p[0] / 1.2, p[1] / 1.2, p[2] / 1.2, 2) * 0.1 + (fl.f1 < 0.12 ? -0.05 : 0);
  };
}
/** Vintage enamelware: glossy white enamel, a dark rim band, chips showing black steel at the rim and foot. */
export function enamel(body = "#efece4", band = "#1f3550", opts: { bandY?: number; chips?: number; seed?: number } = {}): SurfaceFn {
  const w = C(body), b = C(band), steel = C("#1b1c1e"), seed = opts.seed ?? 7;
  return (s, o) => {
    const p = s.o, r = Math.hypot(p[0], p[2]), top = s.k.rimY ?? 40, isBand = s.p[1] > top - (opts.bandY ?? 2.5) || (s.k.rimR !== undefined && r > s.k.rimR - 2.5);
    setC(o.albedo, isBand ? b : w);
    const chip = worley3(seed, p[0] / 4, p[1] / 4, p[2] / 4), chipZone = isBand || s.p[1] < 2.5;
    if (chipZone && chip.f1 < 0.18 * (opts.chips ?? 1) && chip.id > 0.45) { setC(o.albedo, steel); o.rough = 0.5; o.spec = 0.3; o.height = -0.15; return; }
    const ripple = fbm3(seed + 3, p[0] / 12, p[1] / 12, p[2] / 12, 3);
    scaleInto(o.albedo, 0.96 + 0.04 * ripple); o.rough = 0.1; o.spec = 0.05; o.coat = 0.7; o.coatRough = 0.06; o.height = ripple * 0.05;
  };
}
/** Blue-and-white porcelain: translucent white body, cobalt brush rings and a scroll band (anonymous pattern). */
export function porcelain(cobalt = "#24407a", seed = 9): SurfaceFn {
  const w = C("#f3f2ee"), b = C(cobalt);
  return (s, o) => {
    const p = s.o, r = Math.hypot(p[0], p[2]), ang = Math.atan2(p[2], p[0]), y = p[1];
    setC(o.albedo, w);
    // rings near the rim and the foot, a wavy scroll between, wash strength wobbling like a brush
    const bandY = s.k.rimY ?? 40, wob = fbm(seed, ang * 3, y / 10, 2);
    let ink = 0;
    if (Math.abs(y - (bandY - 3.5)) < 0.7 + 0.2 * wob || Math.abs(y - (bandY - 6.5)) < 0.35) ink = 0.9;
    const scroll = Math.sin(ang * 9 + Math.sin(ang * 3) * 0.6) * 4, mid = bandY * 0.5;
    if (s.k.rimY && Math.abs(y - mid - scroll) < 0.8 + 0.4 * wob) ink = Math.max(ink, 0.75);
    if (!s.k.rimY && (Math.abs(r - (s.k.rimR ?? 100) + 6) < 0.8 || Math.abs(r - (s.k.rimR ?? 100) * 0.55) < 0.6)) ink = 0.85;
    if (ink) mixInto(o.albedo, b, ink * (0.8 + 0.2 * fbm(seed + 2, p[0] / 3, p[2] / 3, 2)));
    o.rough = 0.08; o.spec = 0.05; o.coat = 0.8; o.coatRough = 0.05; o.mfp[0] = 0.8; o.mfp[1] = 0.8; o.mfp[2] = 0.7;
  };
}
/** Seasoned cast iron: near-black, slightly oily, with rough cast texture and brown polymerised oil at the rim. */
export function castIron(seed = 11): SurfaceFn {
  const a = C("#1d1b1a"), b = C("#2e2620");
  return (s, o) => { const p = s.o, n1 = fbm3(seed, p[0] / 3, p[1] / 3, p[2] / 3, 3); setMix(o.albedo, a, b, clamp01(0.5 + n1)); o.rough = 0.42 + 0.15 * n1; o.spec = 0.18; o.height = fbm3(seed + 1, p[0] / 0.7, p[1] / 0.7, p[2] / 0.7, 2) * 0.05; };
}
/** Hammered copper (a pot or pan): warm metal, dents, darkened tarnish in the hollows. */
export function copper(seed = 13): SurfaceFn {
  const a = C("#b66a43"), b = C("#6d3a22");
  return (s, o) => { const p = s.o, dent = worley3(seed, p[0] / 6, p[1] / 6, p[2] / 6), tarn = fbm3(seed + 1, p[0] / 20, p[1] / 20, p[2] / 20, 3); setMix(o.albedo, a, b, clamp01(0.3 + 0.5 * tarn)); o.spec = 0.6; o.rough = 0.25 + 0.15 * tarn; o.height = dent.f1 * dent.f1 * 0.25; };
}
/** End- or long-grain wood (boards, spoons, bowls): grain along X, knife scores, oiled. */
export function woodBoard(tone = "#a5763f", seed = 17): SurfaceFn {
  const a = C(tone), d = C("#5a3a1e");
  return (s, o) => {
    const p = s.o, ring = fbm3(seed, p[0] / 140, p[1] / 6, p[2] / 6, 3) * 5 + p[2] / 7 + p[1] / 9, grain = Math.sin(ring * Math.PI * 2) * 0.5 + 0.5, fine = fbm3(seed + 1, p[0] / 30, p[1] / 0.8, p[2] / 0.8, 2);
    setMix(o.albedo, d, a, clamp01(0.45 + 0.35 * grain * grain + 0.15 * fine));
    const cut = Math.abs(fbm(seed + 3, p[0] / 3 + p[2] / 9, p[2] / 40, 2));
    o.height = fine * 0.03 + grain * 0.04 - (cut < 0.02 ? 0.06 : 0); o.rough = 0.5; o.spec = 0.035;
  };
}
/** Black lacquer with a red interior (by `k.inner`): deep, glassy coat with faint brush ripples. */
export function lacquer(outer = "#16110f", inner = "#7a1d14", seed = 19): SurfaceFn {
  const a = C(outer), b = C(inner);
  return (s, o) => { const p = s.o, rip = fbm3(seed, p[0] / 10, p[1] / 3, p[2] / 10, 2); setC(o.albedo, s.n[1] > 0.2 && Math.hypot(p[0], p[2]) < (s.k.innerR ?? 0) ? b : a); o.rough = 0.12; o.spec = 0.045; o.coat = 1; o.coatRough = 0.04; o.height = rip * 0.02; };
}
/** Woven bamboo (steamers, baskets): strips over and under, pale and slightly glossy. */
export function bambooWeave(seed = 23): SurfaceFn {
  const a = C("#d2b27a"), b = C("#8d6d3d");
  return (s, o) => {
    const p = s.o, ang = Math.atan2(p[2], p[0]) * 40, yy = p[1] * 0.9 + Math.hypot(p[0], p[2]) * 0.0, cell = (Math.floor(ang / Math.PI) + Math.floor(yy / Math.PI)) & 1, wv = cell ? Math.abs(Math.sin(ang)) : Math.abs(Math.sin(yy));
    setMix(o.albedo, b, a, clamp01(0.3 + 0.7 * wv + 0.15 * fbm3(seed, p[0] / 9, p[1] / 9, p[2] / 9, 2))); o.height = wv * 0.4; o.rough = 0.55; o.spec = 0.04; o.occl = 0.7 + 0.3 * wv;
  };
}
/** Clear glass (jars, cups): transparent, faint green edge tint, a little refraction. */
export function glass(tint = "#e8f0ea"): SurfaceFn {
  const t = C(tint);
  return (_s, o) => { setV(o.absorb, (1 - t[0]) * 0.08 + 0.004, (1 - t[1]) * 0.08 + 0.002, (1 - t[2]) * 0.08 + 0.004); o.rough = 0.03; o.spec = 0.045; o.refract = 0.25; };
}
/** A fresh banana leaf used as a plate: glossy green, parallel veins from the midrib, a few splits and brown edges. */
export function bananaLeaf(seed = 29): SurfaceFn {
  const a = C("#3f7a2c"), b = C("#2a5a1d"), dry = C("#8b7a3a");
  return (s, o) => {
    const p = s.o, v = Math.sin((p[2] * 0.9 + fbm(seed, p[0] / 60, p[2] / 60, 2) * 4) * 1.6), fine = fbm(seed + 1, p[0] / 30, p[2] / 0.9, 2);
    setMix(o.albedo, b, a, clamp01(0.5 + 0.3 * v + 0.2 * fine));
    const edge = s.k.edge ? 1 - sst(0, 6, s.k.edge - Math.hypot(p[0] * 0.7, p[2])) : 0;
    if (edge > 0) mixInto(o.albedo, dry, edge * 0.7);
    o.height = v * 0.06; o.rough = 0.25; o.spec = 0.05; o.coat = 0.5; o.coatRough = 0.12; o.trans = 0.5; o.mfp[0] = 0.6; o.mfp[1] = 0.9; o.mfp[2] = 0.4;
  };
}

// ---- Produce -----------------------------------------------------------------------------------------------------------------------

export interface SkinSpec {
  base: string;
  /** A second colour flushed over the sun side (apples, peaches, mangoes) and how much. */
  blush?: string; blushAmount?: number;
  /** Fine streaks along the fruit (apples) 0…1. */
  streaks?: number;
  /** Lenticels: pale dots (apples, pears) or dark specks (bananas), 0…1, and their colour. */
  speckle?: number; speckleColour?: string;
  /** GGX roughness of the skin and a wax coat 0…1. */
  rough?: number; wax?: number;
  /** A dusty bloom (plums, grapes, blueberries) 0…1. */
  bloom?: number;
  /** Peach-like fuzz 0…1. */
  fuzz?: number;
  /** Oil-gland pores (citrus), mm deep. */
  pores?: number;
  /** Pebbled skin (avocado), mm. */
  pebble?: number;
  /** Russet patches (pears, apples) 0…1. */
  russet?: number;
  /** A bruise or soft brown spot 0…1. */
  bruise?: number;
  /** Translucency and how far light scatters (× the measured apple). */
  trans?: number; scatter?: number;
  /** Vertical stripes (aubergine, zucchini): count around and strength. */
  stripes?: number; stripeColour?: string;
  seed?: number;
}
/** Fruit and vegetable skin: base and blush, streaks, lenticels, wax, bloom, fuzz, pores, russet and bruises. */
export function skin(sp: SkinSpec): SurfaceFn {
  const base = C(sp.base), blush = C(sp.blush ?? sp.base), spk = C(sp.speckleColour ?? "#efe2b8"), rus = C("#8a6a3e"), bruise = C("#6b4a2a"), bloomC = C("#c9ccd6"), stripeC = C(sp.stripeColour ?? sp.base);
  const seed = sp.seed ?? 1, mfp = MFP.apple, sc = sp.scatter ?? 0.35;
  return (s, o) => {
    const p = s.o, sd = s.seed + seed, r = Math.hypot(p[0], p[1], p[2]) || 1, ux = p[0] / r, uy = p[1] / r, uz = p[2] / r;
    // blush: on one side (the sun side on the tree), broken into flecks and streaks
    const side = ux * 0.55 + uz * 0.45 + uy * 0.2 + (s.k.blushTurn ?? 0), patch = fbm3(sd, p[0] / 14, p[1] / 14, p[2] / 14, 4);
    const streak = sp.streaks ? fbm3(sd + 1, ux * 30 + Math.atan2(uz, ux) * 0, Math.atan2(uz, ux) * 9, uy * 2, 3) : 0;
    const bl = clamp01((sp.blushAmount ?? 0) * (sst(-0.7, 0.6, side + patch * 0.6) + (sp.streaks ?? 0) * 0.5 * streak));
    setMix(o.albedo, base, blush, bl);
    scaleInto(o.albedo, 0.9 + 0.1 * fbm3(sd + 2, p[0] / 4, p[1] / 4, p[2] / 4, 3) + 0.08 * fbm3(sd + 12, p[0] / 16, p[1] / 16, p[2] / 16, 2));
    if (sp.stripes) { const ang = Math.atan2(p[2], p[0]), st = Math.sin(ang * sp.stripes + fbm3(sd + 9, p[0] / 20, p[1] / 20, p[2] / 20, 2) * 2); mixInto(o.albedo, stripeC, sst(0.2, 0.9, st) * 0.8); }
    o.rough = sp.rough ?? 0.35; o.spec = 0.04; o.coat = sp.wax ?? 0.3; o.coatRough = Math.max(0.05, (sp.rough ?? 0.35) * 0.5);
    let ht = fbm3(sd + 3, p[0] / 6, p[1] / 6, p[2] / 6, 3) * 0.05;
    if (sp.speckle) {
      const d = worley3(sd + 4, p[0] / 1.6, p[1] / 1.6, p[2] / 1.6);
      if (d.f1 < 0.16 * sp.speckle + 0.04 && d.id > 0.35) { mixInto(o.albedo, spk, 0.55 * (1 - d.f1 / 0.2)); ht += 0.02; }
    }
    if (sp.pores) {
      const d = worley3(sd + 5, p[0] / 0.9, p[1] / 0.9, p[2] / 0.9);
      ht += (Math.min(1, d.f1 * 2.2) - 1) * sp.pores; o.occl = 0.88 + 0.12 * Math.min(1, d.f1 * 2.5);
    }
    if (sp.pebble) { const d = worley3(sd + 6, p[0] / 1.8, p[1] / 1.8, p[2] / 1.8); ht += -(d.f2 - d.f1) * 0 + Math.sqrt(Math.max(0, 1 - d.f1 * 1.6)) * sp.pebble; o.occl = 0.75 + 0.25 * Math.min(1, (d.f2 - d.f1) * 3); }
    if (sp.russet) { const ru = fbm3(sd + 7, p[0] / 8, p[1] / 8, p[2] / 8, 4) + (-uy) * 0.5; if (ru > 1 - sp.russet) { mixInto(o.albedo, rus, sst(1 - sp.russet, 1.1 - sp.russet, ru) * 0.85); o.rough = 0.7; o.coat = 0; } }
    if (sp.bruise) { const br = fbm3(sd + 8, p[0] / 9, p[1] / 9, p[2] / 9, 3) + ux * 0.4; if (br > 0.75 - sp.bruise * 0.4) { mixInto(o.albedo, bruise, sst(0.75 - sp.bruise * 0.4, 0.95, br) * 0.6); ht -= 0.08; } }
    if (sp.bloom) { const bm = clamp01(sp.bloom * (0.45 + 0.55 * sst(-0.4, 0.6, fbm3(sd + 10, p[0] / 3, p[1] / 3, p[2] / 3, 3)))); mixInto(o.albedo, bloomC, bm * 0.16); o.rough = Math.max(o.rough, 0.55 * bm + o.rough * (1 - bm)); o.coat *= 1 - bm * 0.8; o.sheen = 0.3 * bm; setV(o.sheenTint, 0.55, 0.58, 0.68); }
    if (sp.fuzz) { o.sheen = sp.fuzz * 0.7; setV(o.sheenTint, o.albedo[0] * 1.6 + 0.2, o.albedo[1] * 1.6 + 0.2, o.albedo[2] * 1.6 + 0.2); o.rough = Math.max(o.rough, 0.7); o.coat = 0; }
    o.height = ht; mfpK(mfp, sc, o.mfp); o.trans = sp.trans ?? 0.1;
  };
}
/** Stems, calyxes and stalks: woody brown to green, fibrous, dull. */
export function stalk(colour = "#5a4426", green = "#5b6b2c", seed = 31): SurfaceFn {
  const a = C(colour), g = C(green);
  return (s, o) => { const p = s.o, f = fbm3(seed, p[0] / 0.4, p[1] / 4, p[2] / 0.4, 2); setMix(o.albedo, a, g, clamp01(s.uv[1] * 0.8 + 0.2 * f)); scaleInto(o.albedo, 0.85 + 0.2 * f); o.rough = 0.7; o.height = f * 0.04; };
}
/** A leaf: midrib and side veins from u (across) and v (along), translucent in backlight, a waxy sheen on top. */
export function leaf(colour = "#3f6b26", opts: { vein?: string; veins?: number; gloss?: number; seed?: number; edgeBrown?: number } = {}): SurfaceFn {
  const a = C(colour), vc = C(opts.vein ?? "#9bb267"), brown = C("#7a5a2a"), seed = opts.seed ?? 37, nveins = opts.veins ?? 7, gloss = opts.gloss ?? 0.4;
  return (s, o) => {
    const u = s.uv[0] - 0.5, v = s.uv[1], mid = Math.abs(u), lat = Math.abs(((v * nveins - mid * 3.2 + 1000) % 1) - 0.5);
    const vein = Math.max(1 - sst(0.0, 0.03, mid), (1 - sst(0.0, 0.06, lat)) * (1 - sst(0.35, 0.5, mid)) * 0.7);
    setC(o.albedo, a);
    scaleInto(o.albedo, 0.85 + 0.2 * fbm(s.seed + seed, s.o[0] / 3, s.o[2] / 3, 3));
    mixInto(o.albedo, vc, vein * 0.55);
    if (opts.edgeBrown) mixInto(o.albedo, brown, sst(0.38, 0.5, mid + fbm(seed + 2, v * 4, 0.3, 2) * 0.1) * opts.edgeBrown);
    o.height = -vein * 0.05 + fbm(seed + 3, s.o[0] / 1.5, s.o[2] / 1.5, 2) * 0.02; o.rough = 0.45 - gloss * 0.25; o.spec = 0.045; o.coat = gloss * 0.6; o.coatRough = 0.18;
    o.trans = 0.75; o.mfp[0] = 0.5; o.mfp[1] = 0.9; o.mfp[2] = 0.3;
  };
}
/** Root-vegetable skin with soil: rings (carrots, parsnips), eyes (potatoes), dried earth in the hollows. */
export function rootSkin(colour: string, opts: { rings?: number; eyes?: number; soil?: number; rough?: number; seed?: number; tip?: string } = {}): SurfaceFn {
  const a = C(colour), soil = C("#5a4430"), tip = C(opts.tip ?? colour), seed = opts.seed ?? 41;
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 5, p[1] / 5, p[2] / 5, 3);
    setMix(o.albedo, a, tip, clamp01(s.k.tipAt !== undefined ? sst(s.k.tipAt, 1, s.uv[1]) : 0));
    scaleInto(o.albedo, 0.88 + 0.16 * n1);
    let ht = n1 * 0.08;
    if (opts.rings) { const ring = Math.pow(Math.abs(Math.sin(s.uv[1] * opts.rings * Math.PI + fbm3(seed + 1, p[0] / 3, p[1] / 3, p[2] / 3, 2) * 1.2)), 18); ht -= ring * 0.25; o.occl = 1 - ring * 0.35; }
    if (opts.eyes) { const d = worley3(seed + 2, p[0] / 14, p[1] / 14, p[2] / 14); if (d.f1 < 0.12 * opts.eyes) { ht -= (0.12 * opts.eyes - d.f1) * 6; mixInto(o.albedo, soil, 0.4); } }
    const earth = (opts.soil ?? 0) * sst(0.1, 0.6, fbm3(seed + 3, p[0] / 7, p[1] / 7, p[2] / 7, 4) - ht * 2);
    mixInto(o.albedo, soil, earth * 0.85);
    o.height = ht + earth * 0.1; o.rough = (opts.rough ?? 0.6) + earth * 0.3; o.spec = 0.035; mfpK(MFP.potato, 0.4, o.mfp); o.trans = 0.1;
  };
}
/** Papery skin (onion, garlic): thin, veined lengthwise, translucent, crackled. */
export function paperSkin(colour = "#b9773f", seed = 43): SurfaceFn {
  const a = C(colour), pale = C("#e7cfa4");
  return (s, o) => {
    const p = s.o, ang = Math.atan2(p[2], p[0]), vein = Math.abs(Math.sin(ang * 34 + fbm3(seed, p[0] / 10, p[1] / 10, p[2] / 10, 2) * 3)), flake = fbm3(seed + 1, p[0] / 8, p[1] / 8, p[2] / 8, 4);
    setMix(o.albedo, a, pale, clamp01(0.25 * vein + (flake > 0.35 ? 0.5 : 0)));
    o.height = vein * 0.03 + (flake > 0.35 ? 0.06 : 0); o.rough = 0.4; o.spec = 0.04; o.coat = 0.3; o.coatRough = 0.25; o.trans = 0.7; o.mfp[0] = 1.2; o.mfp[1] = 0.8; o.mfp[2] = 0.4; o.sheen = 0.2; setC(o.sheenTint, pale);
  };
}
/** The cut face of fruit or vegetables (in the cut plane): flesh, radial segments, seeds, a rind band near the edge. */
export interface CutSpec { flesh: string; centre?: string; rind?: string; rindWidth?: number; segments?: number; seedRing?: number; seedColour?: string; juicy?: number; pits?: number; radius: number; seed?: number }
export function cutFace(sp: CutSpec): SurfaceFn {
  const fl = C(sp.flesh), ce = C(sp.centre ?? sp.flesh), ri = C(sp.rind ?? sp.flesh), sdc = C(sp.seedColour ?? "#1c140c"), seed = sp.seed ?? 47;
  return (s, o) => {
    const x = s.o[0], z = s.o[2], r = Math.hypot(x, z) / sp.radius, ang = Math.atan2(z, x);
    setMix(o.albedo, ce, fl, sst(0, 0.55, r));
    let ht = 0;
    if (sp.segments) {
      const seg = Math.abs(Math.sin((ang * sp.segments) / 2)), wall = 1 - sst(0.0, 0.06, seg);
      mixInto(o.albedo, C("#fbf6e6"), wall * 0.85 * sst(0.12, 0.25, r)); ht -= wall * 0.2;
      if (r < 0.16) mixInto(o.albedo, C("#f8f1dc"), 0.8 * (1 - sst(0.1, 0.16, r)));
      // juice vesicles: little teardrop sacs pointing outwards
      const ves = worley(seed, r * 22, ang * sp.segments * 1.6, 1);
      ht += (1 - Math.min(1, ves.f1 * 2)) * 0.25; scaleInto(o.albedo, 0.78 + 0.3 * (1 - Math.min(1, ves.f1 * 1.6)));
    }
    if (sp.seedRing) {
      const sr = Math.abs(r - sp.seedRing), sd = worley(seed + 1, ang * 9, r * 9, 0.6);
      if (sr < 0.08 && sd.f1 < 0.28) { setC(o.albedo, sdc); ht += 0.2; o.rough = 0.2; }
    }
    if (sp.rind) { const rw = sp.rindWidth ?? 0.08; mixInto(o.albedo, ri, sst(1 - rw * 1.3, 1 - rw * 0.7, r)); }
    o.height = ht + fbm(seed + 2, x / 1.2, z / 1.2, 2) * 0.03; o.rough = 0.15 + 0.25 * (1 - (sp.juicy ?? 0.7)); o.spec = 0.035; o.coat = (sp.juicy ?? 0.7) * 0.6; o.coatRough = 0.08;
    mfpK(MFP.apple, 0.5, o.mfp); o.trans = 0.5;
  };
}

// ---- Bakery ------------------------------------------------------------------------------------------------------------------------

export interface CrustSpec {
  /** Browning index 0 (pale) … 1 (very dark), as `toastBrowning` / `crustColour`. */
  bake: number;
  /** Flour dusting 0…1 (rustic loaves: heavier in the scores and on the shoulders). */
  flour?: number;
  /** Blisters from a long cold proof 0…1. */
  blisters?: number;
  /** Egg wash or a sugar glaze: gloss 0…1. */
  shine?: number;
  /** The scores: a function giving 0 (no score) … 1 (in the open score) from object position. */
  score?: (p: V3) => number;
  /** Seeds on top: sesame, poppy, oats (0 none). */
  seeds?: "sesame" | "poppy" | "salt" | "nigella" | "none";
  /** The dough's colour before baking (wheat, rye, brioche). */
  dough?: string;
  seed?: number;
}
/** A baked crust: uneven Maillard browning (raised parts and edges first), flour in recesses, blisters, scores, seeds. */
export function crust(sp: CrustSpec): SurfaceFn {
  const dough = C(sp.dough ?? "#e0c79a"), flourC = C("#efe9dc"), seed = sp.seed ?? 53, tmp: V3 = [0, 0, 0];
  const seedCol = sp.seeds === "sesame" ? C("#e8d6a8") : sp.seeds === "poppy" ? C("#26282e") : sp.seeds === "nigella" ? C("#121214") : C("#f4f2ee");
  return (s, o) => {
    const p = s.o, up = s.n[1], n1 = fbm3(seed, p[0] / 9, p[1] / 9, p[2] / 9, 4), n2 = fbm3(seed + 1, p[0] / 2.2, p[1] / 2.2, p[2] / 2.2, 3);
    const sc = sp.score ? sp.score(p) : 0;
    // browning: more on top and on raised crumb, less in the score (it opens late) and low on the sides; `bake` 0.5 is
    // a golden-brown loaf, 0.8 a bold, dark-caramel bake
    const b = clamp01(sp.bake * 0.8 * (0.84 + 0.16 * n1 + 0.08 * n2 + 0.12 * up) - sc * 0.4 * sp.bake - (1 - sst(-0.2, 0.5, up)) * 0.06);
    const cc = crustColour(b, dough);
    setV(o.albedo, cc[0], cc[1], cc[2]);
    let ht = n2 * 0.25 + n1 * 0.4;
    // the ear of a score: a sharp, darker ridge on one lip
    if (sc > 0) { ht -= sc * 0.6; if (sc > 0.3 && sc < 0.55) { setC(tmp, crustColour(Math.min(1, b + 0.2), dough)); setC(o.albedo, tmp); } }
    if (sp.blisters) {
      const bw = worley3(seed + 2, p[0] / 1.2, p[1] / 1.2, p[2] / 1.2), bl = (1 - sst(0.12, 0.3, bw.f1)) * (bw.id < sp.blisters * 0.55 ? 1 : 0) * sst(0.0, 0.5, up + 0.3);
      if (bl > 0) { ht += bl * 0.3; setC(tmp, crustColour(Math.min(1, b + 0.18 * bl), dough)); mixInto(o.albedo, tmp, bl); }
    }
    o.rough = 0.62 - (sp.shine ?? 0) * 0.35; o.spec = 0.035; o.coat = (sp.shine ?? 0) * 0.9; o.coatRough = 0.15;
    if (sp.flour) {
      // flour: a fine, even veil on the top and shoulders, packed white in the scores; never blotches
      const veil = 0.3 + 0.7 * sst(0.1, 0.8, up), drift = 0.75 + 0.25 * fbm3(seed + 3, p[0] / 22, p[1] / 22, p[2] / 22, 2);
      const f = clamp01(sp.flour * (veil * drift * 0.32 + sc * 0.95));
      if (f > 0) { const grain = 0.8 + 0.4 * fbm3(seed + 4, p[0] / 0.25, p[1] / 0.25, p[2] / 0.25, 2); mixInto(o.albedo, flourC, Math.min(0.92, f * grain)); o.rough = Math.max(o.rough, 0.9 * f + o.rough * (1 - f)); o.coat *= 1 - f; o.sheen = f * 0.5; setC(o.sheenTint, flourC); ht += f * 0.05 * grain; }
    }
    if (sp.seeds && sp.seeds !== "none") {
      const d = worley3(seed + 5, p[0] / 2.4, p[1] / 2.4, p[2] / 2.4, 0.9), onTop = sst(0.2, 0.6, up);
      if (d.f1 < 0.26 && onTop > 0.1 && d.id < 0.85) { setC(o.albedo, seedCol); scaleInto(o.albedo, 0.8 + 0.3 * d.id); ht += 0.4 * (1 - d.f1 / 0.26); o.rough = sp.seeds === "salt" ? 0.1 : 0.4; o.coat = sp.seeds === "salt" ? 0.8 : 0.2; if (sp.seeds === "salt") { o.trans = 0.4; o.mfp[0] = o.mfp[1] = o.mfp[2] = 1; } }
    }
    o.height = ht; o.occl = 0.92 + 0.08 * n2;
  };
}
export interface CrumbSpec { colour?: string; open?: number; gloss?: number; crustColour?: string; crustWidth?: number; outline?: (p: V3) => number; seed?: number; swirl?: string }
/** A cut crumb face: irregular alveoli (an open sourdough crumb or a tight sandwich crumb), glossy hole walls. */
export function crumb(sp: CrumbSpec = {}): SurfaceFn {
  const c = C(sp.colour ?? "#ead7b0"), crustC = C(sp.crustColour ?? "#7a4520"), seed = sp.seed ?? 59, open = sp.open ?? 0.5, sw = sp.swirl ? C(sp.swirl) : null;
  return (s, o) => {
    const p = s.o, cell = worley3(seed, p[0] / (1.2 + open * 2.6), p[1] / (1.2 + open * 2.6) * 1.15, p[2] / (1.2 + open * 2.6)), size = 0.1 + 0.32 * open * (0.4 + cell.id);
    const hole = 1 - sst(size - 0.06, size + 0.03, cell.f1), small = worley3(seed + 1, p[0] / 0.7, p[1] / 0.7, p[2] / 0.7), pin = 1 - sst(0.18, 0.26, small.f1);
    setC(o.albedo, c);
    scaleInto(o.albedo, 0.95 + 0.1 * fbm3(seed + 2, p[0] / 3, p[1] / 3, p[2] / 3, 2));
    if (sw) { const ang = Math.atan2(p[1], p[0]), rr = Math.hypot(p[0], p[1]); mixInto(o.albedo, sw, sst(0.75, 0.95, Math.sin(rr * 0.55 - ang) * 0.5 + 0.5) * 0.8); }
    // inside a hole: deeper and shadowed, the far wall glossy (gelatinised starch)
    const depth = Math.max(hole, pin * 0.6);
    scaleInto(o.albedo, 1 - depth * 0.42);
    o.height = -depth * (0.6 + open * 1.2) + fbm3(seed + 3, p[0] / 0.35, p[1] / 0.35, p[2] / 0.35, 2) * 0.05;
    o.rough = 0.75 - hole * 0.4 * (sp.gloss ?? 0.6); o.spec = 0.035; o.occl = 1 - depth * 0.3; mfpK(MFP.potato, 0.3, o.mfp);
    if (sp.outline) { const e = sp.outline(p); if (e < (sp.crustWidth ?? 3)) { setC(o.albedo, crustC); o.height = 0; o.rough = 0.6; } }
  };
}
/** Laminated pastry (croissants): flaky layers in the arms, a glossy egg-washed top, darker on the ridges. */
export function laminated(sp: { bake?: number; shine?: number; seed?: number } = {}): SurfaceFn {
  const seed = sp.seed ?? 61, dough = C("#e9cf96"), tmp: V3 = [0, 0, 0];
  return (s, o) => {
    const p = s.o, up = s.n[1], layer = Math.sin(s.uv[0] * Math.PI * 2 * 9 + fbm3(seed, p[0] / 6, p[1] / 6, p[2] / 6, 2) * 2), ridge = sst(0.4, 1, layer);
    const b = clamp01((sp.bake ?? 0.55) * 0.8 * (0.78 + 0.28 * ridge + 0.12 * up + 0.1 * fbm3(seed + 1, p[0] / 3, p[1] / 3, p[2] / 3, 3)));
    setC(tmp, crustColour(b, dough)); setC(o.albedo, tmp);
    const flake = fbm3(seed + 2, p[0] / 0.6, p[1] / 1.8, p[2] / 0.6, 3);
    o.height = ridge * 0.5 + flake * 0.12 + (flake > 0.45 ? 0.15 : 0); o.rough = 0.42 - (sp.shine ?? 0.6) * 0.2; o.coat = (sp.shine ?? 0.6) * 0.8; o.coatRough = 0.12; o.spec = 0.035; o.occl = 0.85 + 0.15 * ridge;
  };
}
/** Sponge cake and other soft crumbs: fine, even pores; pale or cocoa. */
export function sponge(colour = "#f0d79c", seed = 67): SurfaceFn {
  const c = C(colour);
  return (s, o) => { const p = s.o, d = worley3(seed, p[0] / 0.5, p[1] / 0.5, p[2] / 0.5), pore = 1 - sst(0.15, 0.3, d.f1); setC(o.albedo, c); scaleInto(o.albedo, 1 - pore * 0.3 + 0.06 * fbm3(seed + 1, p[0] / 4, p[1] / 4, p[2] / 4, 2)); o.height = -pore * 0.15; o.rough = 0.85; o.occl = 1 - pore * 0.2; mfpK(MFP.potato, 0.3, o.mfp); };
}
/** Whipped cream, frosting, mascarpone, sour cream, yogurt: soft white with deep subsurface glow and soft peaks. */
export function cream(colour = "#fbf6ea", opts: { gloss?: number; seed?: number } = {}): SurfaceFn {
  const c = C(colour), seed = opts.seed ?? 71;
  return (s, o) => { const p = s.o; setC(o.albedo, c); o.height = fbm3(seed, p[0] / 2, p[1] / 2, p[2] / 2, 3) * 0.08; o.rough = 0.45 - (opts.gloss ?? 0.2) * 0.3; o.spec = 0.03; o.coat = (opts.gloss ?? 0.2) * 0.5; o.coatRough = 0.2; mfpK(MFP.cream, 0.18, o.mfp); o.trans = 0.25; };
}
/** Chocolate: tempered (glossy) or ganache, or with a cocoa dusting (velvety). */
export function chocolate(sp: { colour?: string; dust?: number; gloss?: number; seed?: number } = {}): SurfaceFn {
  const c = C(sp.colour ?? "#3a2116"), dust = C("#5a3524"), seed = sp.seed ?? 73;
  return (s, o) => {
    const p = s.o; setC(o.albedo, c);
    const d = clamp01((sp.dust ?? 0) * (0.75 + 0.35 * fbm3(seed, p[0] / 2, p[1] / 2, p[2] / 2, 3)));
    o.rough = 0.15 + (1 - (sp.gloss ?? 0.8)) * 0.4; o.spec = 0.045; o.coat = (sp.gloss ?? 0.8) * (1 - d);
    o.height = fbm3(seed + 1, p[0] / 1.5, p[1] / 1.5, p[2] / 1.5, 2) * 0.04;
    if (d > 0) { mixInto(o.albedo, dust, d); o.rough = 0.95 * d + o.rough * (1 - d); o.sheen = d * 0.85; setV(o.sheenTint, 0.42, 0.26, 0.17); o.height += fbm3(seed + 2, p[0] / 0.2, p[1] / 0.2, p[2] / 0.2, 2) * 0.03 * d; }
  };
}
/** A fine dusting (cocoa, icing sugar, flour, matcha, cinnamon, kinako) laid over another surface by `amount`. */
export function dusted(under: SurfaceFn, colour: string, amount = 0.8, seed = 79): SurfaceFn {
  const c = C(colour);
  return (s, o) => {
    under(s, o);
    const p = s.o, cover = clamp01(amount * (0.6 + 0.6 * fbm3(seed, p[0] / 3, p[1] / 3, p[2] / 3, 3)) * sst(-0.1, 0.5, s.n[1]));
    if (cover <= 0) return;
    const grain = 0.85 + 0.3 * fbm3(seed + 1, p[0] / 0.2, p[1] / 0.2, p[2] / 0.2, 2);
    mixInto(o.albedo, c, cover * grain); o.rough = 0.95 * cover + o.rough * (1 - cover); o.coat *= 1 - cover; o.spec = 0.03; o.sheen = Math.max(o.sheen, cover * 0.7); setC(o.sheenTint, c); o.height += cover * 0.04 * grain;
  };
}
/** A clear glaze, syrup or honey over another surface: glossy, darker where it pools (low and in hollows). */
export function glazed(under: SurfaceFn, colour: string, amount = 0.8): SurfaceFn {
  const c = C(colour);
  return (s, o) => { under(s, o); const pool = clamp01(amount * (0.6 + 0.4 * (1 - s.n[1]))); o.albedo[0] *= 1 - pool * (1 - c[0]); o.albedo[1] *= 1 - pool * (1 - c[1]); o.albedo[2] *= 1 - pool * (1 - c[2]); o.coat = Math.max(o.coat, amount); o.coatRough = 0.04; o.rough = Math.min(o.rough, 0.3); o.height *= 0.5; };
}

// ---- Dairy -------------------------------------------------------------------------------------------------------------------------

export interface CheeseSpec { paste: string; rind?: string; holes?: number; veins?: number; crystals?: number; bloomy?: boolean; rindWidth?: number; wet?: number; seed?: number; outline?: (p: V3) => number }
/** Cheese: paste with eyes (holes), blue veins, crunchy crystals; a natural, waxed or bloomy rind near the outline. */
export function cheese(sp: CheeseSpec): SurfaceFn {
  const pc = C(sp.paste), rc = C(sp.rind ?? sp.paste), blue = C("#4a5a5a"), cry = C("#fff8e4"), seed = sp.seed ?? 83;
  return (s, o) => {
    const p = s.o; setC(o.albedo, pc);
    scaleInto(o.albedo, 0.95 + 0.08 * fbm3(seed, p[0] / 5, p[1] / 5, p[2] / 5, 3));
    let ht = 0;
    if (sp.holes) { const d = worley3(seed + 1, p[0] / 9, p[1] / 9, p[2] / 9), r = 0.25 * sp.holes * (0.4 + d.id); if (d.f1 < r) { const k = d.f1 / r; ht -= Math.sqrt(1 - k * k) * 4; scaleInto(o.albedo, 0.78 + 0.2 * k); o.rough = 0.25; o.coat = 0.3; } }
    if (sp.veins) { const v = Math.abs(fbm3(seed + 2, p[0] / 6, p[1] / 6, p[2] / 6, 4)); if (v < 0.05 * sp.veins) { const sp2 = worley3(seed + 3, p[0] / 0.8, p[1] / 0.8, p[2] / 0.8); mixInto(o.albedo, blue, 0.75 * (1 - sst(0.2, 0.4, sp2.f1))); ht -= 0.15; } }
    if (sp.crystals) { const d = worley3(seed + 4, p[0] / 2, p[1] / 2, p[2] / 2); if (d.f1 < 0.1 * sp.crystals) { mixInto(o.albedo, cry, 0.6); ht += 0.05; } }
    o.rough = Math.min(o.rough, 0.55 - (sp.wet ?? 0) * 0.35); o.spec = 0.035; o.coat = Math.max(o.coat, (sp.wet ?? 0) * 0.6); mfpK(MFP.wholemilk, 0.12, o.mfp); o.trans = 0.15;
    if (sp.outline) {
      const e = sp.outline(p), rw = sp.rindWidth ?? 3;
      if (e < rw) { setC(o.albedo, rc); const t = fbm3(seed + 5, p[0] / 1.2, p[1] / 1.2, p[2] / 1.2, 3); scaleInto(o.albedo, 0.85 + 0.25 * t); ht = t * (sp.bloomy ? 0.25 : 0.12); o.rough = sp.bloomy ? 0.95 : 0.6; o.coat = 0; if (sp.bloomy) { o.sheen = 0.5; setC(o.sheenTint, rc); } o.mfp[0] = o.mfp[1] = o.mfp[2] = 0; }
    }
    o.height = ht;
  };
}
/** Bubbling, broiled cheese (gratin, pizza, French onion soup): melted paste, raised bubbles browned on their tops,
 *  oil glistening in micro-droplets, darker blistered edges. `browning` 0…1. */
export function gratin(sp: { paste?: string; browning?: number; bubbles?: number; oil?: number; seed?: number; scale?: number } = {}): SurfaceFn {
  const pc = C(sp.paste ?? "#f2d27a"), seed = sp.seed ?? 89, tmp: V3 = [0, 0, 0], k = sp.scale ?? 1;
  return (s, o) => {
    const p = s.o, cell = worley3(seed, p[0] / (5.5 * k), p[1] / (5.5 * k), p[2] / (5.5 * k)), small = worley3(seed + 1, p[0] / 1.6, p[1] / 1.6, p[2] / 1.6);
    const bub = Math.sqrt(Math.max(0, 1 - Math.min(1, cell.f1 / (0.5 + 0.3 * cell.id)))) * (sp.bubbles ?? 0.8), micro = Math.sqrt(Math.max(0, 1 - Math.min(1, small.f1 / 0.38)));
    const br = sp.browning ?? 0.5, wash = 0.5 + 0.5 * fbm3(seed + 2, p[0] / 14, p[1] / 14, p[2] / 14, 3);
    // golden all over where the heat reached, deeper in broad patches, scorched only on the tallest blisters
    const b = clamp01(br * (0.35 + 0.5 * wash + 0.2 * bub) + (cell.id > 0.62 ? sst(0.75, 1, bub) * br * 0.45 : 0));
    setC(tmp, crustColour(b * 0.95, pc)); setC(o.albedo, tmp);
    o.height = bub * 1.4 + micro * 0.2; o.rough = 0.32 - (sp.oil ?? 0.6) * 0.15; o.spec = 0.04; o.coat = (sp.oil ?? 0.6) * (0.5 + 0.5 * micro); o.coatRough = 0.06;
    mfpK(MFP.wholemilk, 0.1, o.mfp); o.occl = 0.75 + 0.25 * sst(0, 0.5, bub);
  };
}
/** Butter: pale yellow, waxy, strong subsurface glow (a block or a curl melting). */
export function butter(seed = 97): SurfaceFn {
  const c = C("#f7df8e");
  return (s, o) => { const p = s.o; setC(o.albedo, c); o.height = fbm3(seed, p[0] / 1.5, p[1] / 1.5, p[2] / 1.5, 2) * 0.05 + Math.sin(p[0] * 1.3) * 0.02; o.rough = 0.38; o.spec = 0.035; o.coat = 0.25; o.coatRough = 0.15; mfpK(MFP.cream, 0.35, o.mfp); o.trans = 0.55; };
}

// ---- Meat and fish -----------------------------------------------------------------------------------------------------------------

/** Raw red meat: muscle grain along X, intramuscular fat marbling (0 lean … 1 wagyu), a wet surface. */
export function rawMeat(sp: { colour?: string; fat?: string; marbling?: number; seed?: number; fatCap?: (p: V3) => number } = {}): SurfaceFn {
  const m = C(sp.colour ?? "#9d2a2a"), f = C(sp.fat ?? "#f2e6d0"), seed = sp.seed ?? 101;
  return (s, o) => {
    const p = s.o, fib = fbm3(seed, p[0] / 9, p[1] / 0.5, p[2] / 0.5, 3), mb = fbm3(seed + 1, p[0] / 9 + fbm3(seed + 2, p[0] / 18, p[1] / 6, p[2] / 6, 2), p[1] / 3, p[2] / 3, 4);
    setC(o.albedo, m); scaleInto(o.albedo, 0.85 + 0.2 * fib);
    const fatT = sst(0.55 - (sp.marbling ?? 0.3) * 0.5, 0.65 - (sp.marbling ?? 0.3) * 0.5, mb) * Math.min(1, (sp.marbling ?? 0.3) * 2.5);
    const cap = sp.fatCap ? sp.fatCap(p) : 0;
    mixInto(o.albedo, f, Math.max(fatT, cap));
    o.height = fib * 0.06 + fatT * 0.05; o.rough = 0.3; o.spec = 0.035; o.coat = 0.55; o.coatRough = 0.12; mfpK(MFP.chicken, 0.3, o.mfp); o.trans = 0.15;
  };
}
/** Roasted poultry skin: golden to mahogany by heat exposure, tight micro-blisters with rendered fat glistening. */
export function roastSkin(sp: { bake?: number; seed?: number; herbs?: number } = {}): SurfaceFn {
  const seed = sp.seed ?? 103, base = C("#e7c48a"), herb = C("#3d4a1e"), pep = C("#1f1712"), tmp: V3 = [0, 0, 0];
  return (s, o) => {
    const p = s.o, up = s.n[1], big = fbm3(seed, p[0] / 14, p[1] / 14, p[2] / 14, 4), bl = worley3(seed + 1, p[0] / 1.15, p[1] / 1.15, p[2] / 1.15), blis = Math.sqrt(Math.max(0, 1 - Math.min(1, bl.f1 / 0.42)));
    const b = clamp01((sp.bake ?? 0.6) * (0.72 + 0.35 * sst(-0.3, 0.8, up) + 0.22 * big + 0.12 * blis));
    setC(tmp, crustColour(b, base)); setC(o.albedo, tmp);
    // pores where the feathers were, on a 2–3 mm grid
    const pore = worley3(seed + 2, p[0] / 2.6, p[1] / 2.6, p[2] / 2.6);
    if (pore.f1 < 0.08) scaleInto(o.albedo, 0.75);
    o.height = blis * 0.22 + big * 0.5 - (pore.f1 < 0.08 ? 0.05 : 0);
    o.rough = 0.35; o.spec = 0.04; o.coat = 0.55 + 0.4 * blis; o.coatRough = 0.07; mfpK(MFP.chicken, 0.25, o.mfp);
    if (sp.herbs) { const d = worley3(seed + 3, p[0] / 3.2, p[1] / 3.2, p[2] / 3.2); if (d.f1 < 0.12 * sp.herbs && up > -0.2) { setC(o.albedo, d.id > 0.5 ? herb : pep); o.coat = 0.2; o.height += 0.1; } }
  };
}
/** Sticky braise or barbecue glaze over meat: deep mahogany lacquer, charred caramelised edges, sesame optional. */
export function glazeMeat(sp: { colour?: string; char?: number; seed?: number; sesame?: number; fat?: (p: V3) => number } = {}): SurfaceFn {
  const g = C(sp.colour ?? "#5a2412"), ch = C("#1d0d07"), ses = C("#efe0b4"), fatC = C("#e8c890"), seed = sp.seed ?? 107;
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 6, p[1] / 6, p[2] / 6, 4), edge = sst(0.3, 1, 1 - Math.abs(s.n[1]));
    setC(o.albedo, g); scaleInto(o.albedo, 0.8 + 0.35 * n1);
    if (sp.fat) mixInto(o.albedo, fatC, sp.fat(p) * 0.7);
    const charA = clamp01((sp.char ?? 0.4) * sst(0.15, 0.6, n1 + edge * 0.5));
    mixInto(o.albedo, ch, charA);
    o.height = n1 * 0.5 + fbm3(seed + 1, p[0] / 1, p[1] / 1, p[2] / 1, 2) * 0.08; o.rough = 0.28; o.spec = 0.04; o.coat = 1 - charA * 0.6; o.coatRough = 0.035; mfpK(MFP.ketchup, 0.4, o.mfp);
    if (sp.sesame) { const d = worley3(seed + 2, p[0] / 3, p[1] / 3, p[2] / 3, 0.9); if (d.f1 < 0.16 && d.id < sp.sesame) { setC(o.albedo, ses); o.coat = 0.4; o.height += 0.3; } }
  };
}
/** Seared or grilled surface: a browned crust with dark grill bars (`bars` mm apart, 0 none). */
export function seared(sp: { bake?: number; base?: string; bars?: number; barAngle?: number; seed?: number; gloss?: number } = {}): SurfaceFn {
  const seed = sp.seed ?? 109, base = C(sp.base ?? "#b9805a"), tmp: V3 = [0, 0, 0], ang = ((sp.barAngle ?? 35) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 4, p[1] / 4, p[2] / 4, 4), up = s.n[1];
    let b = clamp01((sp.bake ?? 0.6) * (0.75 + 0.3 * n1) * (0.6 + 0.4 * sst(-0.2, 0.7, Math.abs(up))));
    if (sp.bars) { const t = (p[0] * ca + p[2] * sa) / sp.bars, bar = 1 - sst(0.08, 0.2, Math.abs(t - Math.round(t)) + fbm3(seed + 3, p[0] / 3, 0, p[2] / 3, 2) * 0.05); b = Math.max(b, bar * 0.97 * sst(0.3, 0.8, Math.abs(up))); }
    setC(tmp, crustColour(b, base)); setC(o.albedo, tmp);
    o.height = n1 * 0.3 + fbm3(seed + 1, p[0] / 0.8, p[1] / 0.8, p[2] / 0.8, 2) * 0.1; o.rough = 0.5 - (sp.gloss ?? 0.4) * 0.25; o.spec = 0.04; o.coat = (sp.gloss ?? 0.4) * 0.7; o.coatRough = 0.1; mfpK(MFP.chicken, 0.15, o.mfp);
  };
}
/** Fish flesh: raw (salmon, tuna) or cooked (white, flaking): myotome bands with white fat lines, wet sheen. */
export function fishFlesh(sp: { colour: string; fat?: string; bands?: number; cooked?: number; seed?: number }): SurfaceFn {
  const c = C(sp.colour), f = C(sp.fat ?? "#f6efe6"), seed = sp.seed ?? 113;
  return (s, o) => {
    const p = s.o, chevron = (p[0] + Math.abs(p[2]) * 0.55 + fbm3(seed, p[0] / 12, p[1] / 12, p[2] / 12, 2) * 2) / (sp.bands ?? 7), line = 1 - sst(0.0, 0.09, Math.abs(chevron - Math.round(chevron)));
    setC(o.albedo, c); scaleInto(o.albedo, 0.9 + 0.12 * fbm3(seed + 1, p[0] / 3, p[1] / 3, p[2] / 3, 2));
    mixInto(o.albedo, f, line * 0.75);
    const ck = sp.cooked ?? 0;
    o.height = -line * (0.08 + ck * 0.4); o.rough = 0.22 + ck * 0.45; o.spec = 0.035; o.coat = 0.6 * (1 - ck); o.coatRough = 0.06; mfpK(MFP.chicken, 0.5 * (1 - ck * 0.7), o.mfp); o.trans = 0.3 * (1 - ck);
  };
}
/** Fish skin with scales: silver belly to dark back by `k.side` (object y), overlapping scale rows, iridescent sheen. */
export function fishSkin(sp: { back?: string; belly?: string; scale?: number; crisp?: number; seed?: number; bars?: boolean } = {}): SurfaceFn {
  const back = C(sp.back ?? "#3c4e57"), belly = C(sp.belly ?? "#d8dde0"), seed = sp.seed ?? 127, sz = sp.scale ?? 2.2, tmp: V3 = [0, 0, 0];
  return (s, o) => {
    const p = s.o, row = p[0] / sz + (Math.floor(p[1] / sz) % 2) * 0.5, cell = Math.abs((row % 1 + 1) % 1 - 0.5), arc = Math.abs(((p[1] / sz) % 1 + 1) % 1 - 0.5);
    const sc = sst(0.3, 0.5, Math.max(cell, arc));
    setMix(o.albedo, belly, back, sst(-3, 6, p[1] + fbm3(seed, p[0] / 15, p[1] / 15, p[2] / 15, 2) * 3));
    if (sp.bars) { const bar = Math.sin(p[0] * 0.45 + Math.sin(p[1] * 0.5) * 1.2); if (p[1] > 1) mixInto(o.albedo, C("#1d2a30"), sst(0.4, 0.9, bar) * 0.8); }
    if (sp.crisp) { setC(tmp, crustColour(clamp01(sp.crisp * (0.7 + 0.4 * fbm3(seed + 1, p[0] / 4, p[1] / 4, p[2] / 4, 3))), C("#c9b496"))); mixInto(o.albedo, tmp, sp.crisp); }
    o.height = sc * 0.06; o.rough = 0.2 + (sp.crisp ?? 0) * 0.3; o.spec = 0.06 + 0.1 * (1 - (sp.crisp ?? 0)); o.coat = 0.7; o.coatRough = 0.05; o.sheen = 0.25 * (1 - (sp.crisp ?? 0)); setV(o.sheenTint, 0.7, 0.85, 0.95);
  };
}
/** Deep-fried batter or breadcrumbs: craggy, golden, crisp, with oil glints (tempura, schnitzel, fried chicken). */
export function fried(sp: { bake?: number; crumbs?: number; base?: string; seed?: number } = {}): SurfaceFn {
  const seed = sp.seed ?? 131, base = C(sp.base ?? "#f0d28e"), tmp: V3 = [0, 0, 0];
  return (s, o) => {
    const p = s.o, cr = fbm3(seed, p[0] / (1.5 + (sp.crumbs ?? 0.5) * 2), p[1] / 2, p[2] / 2, 4), w = worley3(seed + 1, p[0] / 1.4, p[1] / 1.4, p[2] / 1.4), crag = 1 - Math.min(1, w.f1 * 2.4);
    const b = clamp01((sp.bake ?? 0.5) * (0.7 + 0.45 * cr + 0.25 * crag));
    setC(tmp, crustColour(b, base)); setC(o.albedo, tmp);
    o.height = cr * 0.6 + crag * 0.4; o.rough = 0.45; o.spec = 0.04; o.coat = 0.35 * crag; o.coatRough = 0.08; o.occl = 0.75 + 0.25 * crag;
  };
}

// ---- Grains, pasta, sauces, liquids ------------------------------------------------------------------------------------------------

/** A grain heap seen as one surface (rice, couscous, quinoa, lentils): grain-shaped cells, glossy when cooked. */
export function grains(sp: { colour: string; size?: number; cooked?: number; varied?: string; seed?: number }): SurfaceFn {
  const c = C(sp.colour), v = C(sp.varied ?? sp.colour), seed = sp.seed ?? 137, sz = sp.size ?? 1;
  return (s, o) => {
    const p = s.o, d = worley3(seed, p[0] / (2.6 * sz), p[1] / (1.4 * sz), p[2] / (1.6 * sz)), dome = Math.sqrt(Math.max(0, 1 - Math.min(1, d.f1 / 0.62)));
    setMix(o.albedo, c, v, d.id); scaleInto(o.albedo, 0.65 + 0.4 * dome);
    o.height = dome * 0.6 * sz; o.rough = 0.5 - (sp.cooked ?? 0) * 0.3; o.spec = 0.035; o.coat = (sp.cooked ?? 0) * 0.6 * dome; o.coatRough = 0.1; o.occl = 0.6 + 0.4 * dome; mfpK(MFP.potato, 0.35, o.mfp); o.trans = 0.2;
  };
}
/** An opaque sauce, stew or curry: colour, gloss, oil separating at the edges, flecks of spice or herbs. */
export function sauce(sp: { colour: string; oil?: string; oiliness?: number; flecks?: string; fleckAmount?: number; gloss?: number; chunky?: number; seed?: number }): SurfaceFn {
  const c = C(sp.colour), oc = C(sp.oil ?? "#c8551a"), fk = C(sp.flecks ?? "#2f3a18"), seed = sp.seed ?? 139;
  return (s, o) => {
    const p = s.o, n1 = fbm3(seed, p[0] / 6, p[1] / 6, p[2] / 6, 4); setC(o.albedo, c); scaleInto(o.albedo, 0.85 + 0.2 * n1);
    const oilA = (sp.oiliness ?? 0.3) * sst(0.1, 0.5, fbm3(seed + 1, p[0] / 9, p[1] / 9, p[2] / 9, 3));
    mixInto(o.albedo, oc, oilA * 0.6);
    if (sp.flecks) { const d = worley3(seed + 2, p[0] / 1.6, p[1] / 1.6, p[2] / 1.6); if (d.f1 < 0.12 * (sp.fleckAmount ?? 1) && d.id > 0.4) { mixInto(o.albedo, fk, 0.85); } }
    o.height = n1 * (sp.chunky ?? 0.3) * 1.2 + fbm3(seed + 3, p[0] / 1.2, p[1] / 1.2, p[2] / 1.2, 2) * 0.06; o.rough = 0.25 - (sp.gloss ?? 0.6) * 0.15; o.spec = 0.04; o.coat = (sp.gloss ?? 0.6) * (0.6 + 0.4 * oilA); o.coatRough = 0.04; mfpK(MFP.ketchup, 0.6, o.mfp); o.trans = 0.2;
  };
}
/** A broth or clear liquid (transparent): colour by absorption, cloudiness by in-scattering, fat eyes on top. */
export function broth(sp: { colour: string; cloudy?: number; fat?: number; fatColour?: string; seed?: number; ripple?: number }): SurfaceFn {
  const c = C(sp.colour), fc = C(sp.fatColour ?? "#f0b44a"), seed = sp.seed ?? 149;
  // absorption from the colour seen through ~25 mm of broth; scattering colour for cloudy (emulsified) broths
  const ab: V3 = [0, 1, 2].map(k => -Math.log(Math.max(0.01, c[k])) / 25) as V3;
  return (s, o) => {
    const p = s.o;
    setV(o.absorb, ab[0], ab[1], ab[2]); setV(o.scatter, Math.min(1, c[0] * 1.3), Math.min(1, c[1] * 1.3), Math.min(1, c[2] * 1.3)); o.density = (sp.cloudy ?? 0.1) * 0.25;
    o.rough = 0.04; o.spec = 0.025; o.refract = 0.6;
    let ht = fbm(seed, p[0] / 25, p[2] / 25, 3) * (sp.ripple ?? 0.25);
    if (sp.fat) {
      // fat eyes: circles from a few mm to a centimetre, lens-domed, golden
      const d = worley(seed + 1, p[0] / 5.5, p[2] / 5.5, 1), r = 0.18 + 0.32 * d.id * sp.fat;
      if (d.f1 < r && d.id < 0.25 + sp.fat * 0.6) { const k = d.f1 / r; ht += Math.sqrt(1 - k * k) * 0.25; o.absorb[0] += (1 - fc[0]) * 0.03; o.absorb[1] += (1 - fc[1]) * 0.03; o.absorb[2] += (1 - fc[2]) * 0.03; o.spec = 0.035; }
      const d2 = worley(seed + 2, p[0] / 1.4, p[2] / 1.4, 1);
      if (d2.f1 < 0.2 && d2.id < sp.fat * 0.7) ht += (1 - d2.f1 / 0.2) * 0.12;
    }
    o.height = ht;
  };
}
/** Water droplets and condensation (transparent lenses). */
export const water: SurfaceFn = (_s, o) => { setV(o.absorb, 0.002, 0.001, 0.0015); o.rough = 0.02; o.spec = 0.025; o.refract = 2.6; };
/** Honey, syrup, caramel, brine (transparent, coloured): `colour` as seen through `depth` mm (default 5; brines ~60). */
export function syrup(colour: string, opts: { cloudy?: number; depth?: number } = {}): SurfaceFn {
  const c = C(colour), ab: V3 = [0, 1, 2].map(k => -Math.log(Math.max(0.005, c[k])) / (opts.depth ?? 5)) as V3;
  return (_s, o) => { setV(o.absorb, ab[0], ab[1], ab[2]); setV(o.scatter, c[0], c[1], c[2]); o.density = opts.cloudy ?? 0; o.rough = 0.03; o.spec = 0.04; o.refract = 0.8; };
}
/** Froth (matcha, cappuccino, beer-like foams): fine bubbles, matte, pale. */
export function froth(colour: string, seed = 151): SurfaceFn {
  const c = C(colour);
  return (s, o) => { const p = s.o, d = worley(seed, p[0] / 0.45, p[2] / 0.45, 1), d2 = worley(seed + 1, p[0] / 1.6, p[2] / 1.6, 1); setC(o.albedo, c); scaleInto(o.albedo, 0.9 + 0.1 * Math.min(1, d.f1 * 2)); o.height = Math.sqrt(Math.max(0, 1 - d.f1 * 2)) * 0.05 + Math.sqrt(Math.max(0, 1 - d2.f1 * 1.6)) * 0.12; o.rough = 0.55; o.spec = 0.03; mfpK(MFP.cream, 0.1, o.mfp); o.trans = 0.3; };
}
/** Noodles and pasta: semolina or wheat, smooth or slightly rough, glossy when sauced. */
export function noodle(colour = "#f0d08a", opts: { gloss?: number; seed?: number; rough?: number } = {}): SurfaceFn {
  const c = C(colour), seed = opts.seed ?? 157;
  return (s, o) => { const p = s.o; setC(o.albedo, c); scaleInto(o.albedo, 0.92 + 0.1 * fbm3(seed, p[0] / 3, p[1] / 3, p[2] / 3, 2)); o.height = fbm3(seed + 1, p[0] / 0.5, p[1] / 0.5, p[2] / 0.5, 2) * (opts.rough ?? 0.02); o.rough = 0.35; o.spec = 0.035; o.coat = opts.gloss ?? 0.5; o.coatRough = 0.08; mfpK(MFP.potato, 0.25, o.mfp); o.trans = 0.3; };
}
/** A plain, smooth, slightly glossy surface with gentle variation (tofu, mochi, egg white, fish cake, peeled veg). */
export function smooth(colour: string, opts: { rough?: number; gloss?: number; scatter?: number; trans?: number; pores?: number; seed?: number; vary?: number } = {}): SurfaceFn {
  const c = C(colour), seed = opts.seed ?? 163;
  return (s, o) => {
    const p = s.o; setC(o.albedo, c); scaleInto(o.albedo, 1 - (opts.vary ?? 0.06) + (opts.vary ?? 0.06) * 2 * (0.5 + 0.5 * fbm3(seed, p[0] / 6, p[1] / 6, p[2] / 6, 3)));
    let ht = fbm3(seed + 1, p[0] / 2, p[1] / 2, p[2] / 2, 2) * 0.03;
    if (opts.pores) { const d = worley3(seed + 2, p[0] / 0.8, p[1] / 0.8, p[2] / 0.8); ht -= (1 - sst(0.1, 0.25, d.f1)) * opts.pores; }
    o.height = ht; o.rough = opts.rough ?? 0.4; o.spec = 0.035; o.coat = opts.gloss ?? 0; o.coatRough = 0.1; mfpK(MFP.wholemilk, opts.scatter ?? 0.1, o.mfp); o.trans = opts.trans ?? 0.2;
  };
}
/** Coarse salt and sugar crystals: nearly clear, faceted, sparkling, glowing in backlight. */
export function crystal(colour = "#f6f4f0"): SurfaceFn {
  const c = C(colour);
  return (s, o) => { setC(o.albedo, c); scaleInto(o.albedo, 0.9 + 0.1 * gradNoise3(s.seed, s.o[0] * 3, s.o[1] * 3, s.o[2] * 3)); o.rough = 0.06; o.spec = 0.05; o.coat = 0.9; o.coatRough = 0.03; o.mfp[0] = o.mfp[1] = o.mfp[2] = 1.6; o.trans = 0.8; };
}
/** Spice powder or ground seeds in a heap (paprika, turmeric, cumin, sumac): matte, velvety, fine clumps. */
export function powder(colour: string, seed = 167): SurfaceFn {
  const c = C(colour);
  return (s, o) => { const p = s.o, cl = worley3(seed, p[0] / 1.2, p[1] / 1.2, p[2] / 1.2), lump = Math.sqrt(Math.max(0, 1 - cl.f1 * 1.8)); setC(o.albedo, c); scaleInto(o.albedo, 0.8 + 0.3 * lump + 0.1 * fbm3(seed + 1, p[0] / 4, p[1] / 4, p[2] / 4, 2)); o.height = lump * 0.18 + fbm3(seed + 2, p[0] / 0.25, p[1] / 0.25, p[2] / 0.25, 2) * 0.03; o.rough = 0.95; o.spec = 0.03; o.sheen = 0.45; setV(o.sheenTint, c[0] * 1.5 + 0.1, c[1] * 1.5 + 0.1, c[2] * 1.5 + 0.1); o.occl = 0.8 + 0.2 * lump; };
}
/** Mushroom cap or gills (by `k.gills`): suede-like cap, fine radial gills below. */
export function mushroom(cap = "#8a6a4a", gillsColour = "#cdb79a", seed = 173): SurfaceFn {
  const c = C(cap), g = C(gillsColour);
  return (s, o) => {
    const p = s.o;
    if (s.n[1] < -0.2 && s.k.gills) { const ang = Math.atan2(p[2], p[0]), gl = Math.abs(Math.sin(ang * 70)); setC(o.albedo, g); scaleInto(o.albedo, 0.6 + 0.4 * gl); o.height = gl * 0.12; o.rough = 0.8; o.occl = 0.6 + 0.4 * gl; return; }
    const n1 = fbm3(seed, p[0] / 4, p[1] / 4, p[2] / 4, 4), fibr = fbm3(seed + 1, Math.atan2(p[2], p[0]) * 12, Math.hypot(p[0], p[2]) / 1.5, p[1], 2);
    setC(o.albedo, c); scaleInto(o.albedo, 0.8 + 0.25 * n1 + 0.08 * fibr); o.height = n1 * 0.15 + fibr * 0.04; o.rough = 0.7; o.spec = 0.035; o.sheen = 0.3; setV(o.sheenTint, c[0] * 1.6, c[1] * 1.6, c[2] * 1.6);
  };
}
/** Nori and seaweed: near-black green, fibrous, a dull sheen; crisp or soaked. */
export function nori(seed = 179): SurfaceFn {
  const c = C("#1b2418");
  return (s, o) => { const p = s.o, f = fbm3(seed, p[0] / 0.4, p[1] / 3, p[2] / 3, 3), sh = fbm3(seed + 1, p[0] / 8, p[1] / 8, p[2] / 8, 2); setC(o.albedo, c); scaleInto(o.albedo, 0.75 + 0.45 * f); o.height = f * 0.03; o.rough = 0.45; o.spec = 0.045; o.sheen = 0.3 + 0.2 * sh; setV(o.sheenTint, 0.12, 0.18, 0.14); o.trans = 0.3; };
}

/** Pick a surface by the part's object Y (layers in a cake, a burger, a lasagne): `[topY, surface][]` from the bottom. */
export function layered(layers: readonly (readonly [number, SurfaceFn])[]): SurfaceFn {
  return (s: Sample, o: Surface) => {
    const y = s.o[1];
    for (const [top, fn] of layers) if (y <= top) { fn(s, o); return; }
    layers[layers.length - 1][1](s, o);
  };
}
/** Choose between two surfaces by a predicate on the sample. */
export const either = (pred: (s: Sample) => boolean, a: SurfaceFn, b: SurfaceFn): SurfaceFn => (s, o) => (pred(s) ? a(s, o) : b(s, o));
