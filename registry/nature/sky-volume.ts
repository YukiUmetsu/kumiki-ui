/**
 * SKY1 volumetric clouds: every genus as a field of cloud water or ice in the real atmosphere, rendered on the CPU by
 * marching light through it, seen from the ground under a physical sky (`sky-atmosphere.ts`).
 *
 * Each genus is built from what makes it that genus (`CLOUD_VOLUMES`):
 * - heights and thicknesses for its étage, its cells at the WMO apparent widths (cirrocumulus under 1°, altocumulus
 *   1–5°, stratocumulus over 5°), billow rows about seven to ten times the shear layer's depth (Kelvin–Helmholtz);
 * - extinction from water or ice content and droplet size, σ = 3·LWC ÷ (2·ρ·r_e) (Stephens 1978), with effective
 *   radii reported by Hansen (1971);
 * - cirrus as fall streaks of ice, curved into hooks by wind shear (a parabola for a linear shear);
 * - cirrostratus as a thin ice veil that shows the 22° and 46° halos (minimum deviation through 60° and 90° ice prisms,
 *   red inside, blue outside);
 * - altostratus thick enough to show the sun as through ground glass; nimbostratus dark, with a ragged base, scud and
 *   rain; stratus a low grey layer;
 * - cumulus as heaps on a flat condensation level; cumulonimbus a tower to the tropopause spreading into an anvil,
 *   with mammatus pouches (1–3 km across, about 0.5 km deep) beneath and a rain shaft.
 *
 * Light: sunlight reddened by the air to each point, marched to the sun through the cloud, a multiple-scattering
 * approximation (Wrenninge et al. 2013), forward-peaked phase functions (water) or ice halos, sky light from above,
 * aerial perspective, cloud shadows on the ground and the sun's disc dimmed through thin cloud.
 */
import type { CloudGenus } from "./sky-data";
import { atmosphere, norm3 } from "./sky-atmosphere";
import type { Atmosphere, V3 } from "./sky-atmosphere";

// ---- Periodic noise textures ----------------------------------------------------------------------------------------------

function ih(seed: number, x: number, y: number, z: number): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const wrap = (i: number, p: number) => ((i % p) + p) % p;
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Perlin noise that repeats every `p` units in x, y and z. */
function perlinP(seed: number, x: number, y: number, z: number, p: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = fade(xf), v = fade(yf), w = fade(zf);
  const g = (i: number, j: number, k: number, dx: number, dy: number, dz: number) => {
    const h = ih(seed, wrap(xi + i, p), wrap(yi + j, p), wrap(zi + k, p)) % 12, a = h < 8 ? dx : dy, b = h < 4 ? dy : dz;
    return ((h & 1) ? -a : a) + ((h & 2) ? -b : b);
  };
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(g(0, 0, 0, xf, yf, zf), g(1, 0, 0, xf - 1, yf, zf), u), l(g(0, 1, 0, xf, yf - 1, zf), g(1, 1, 0, xf - 1, yf - 1, zf), u), v),
    l(l(g(0, 0, 1, xf, yf, zf - 1), g(1, 0, 1, xf - 1, yf, zf - 1), u), l(g(0, 1, 1, xf, yf - 1, zf - 1), g(1, 1, 1, xf - 1, yf - 1, zf - 1), u), v), w);
}
/** Worley F1 that repeats every `p` cells. */
function worleyP(seed: number, x: number, y: number, z: number, p: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let f1 = 9;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, cz = zi + k, h = ih(seed, wrap(cx, p), wrap(cy, p), wrap(cz, p));
    const px = cx + ((h & 1023) / 1023), py = cy + (((h >>> 10) & 1023) / 1023), pz = cz + (((h >>> 20) & 1023) / 1023);
    f1 = Math.min(f1, Math.hypot(px - x, py - y, pz - z));
  }
  return f1;
}
interface Tex3 { n: number; data: Float32Array }
const TEX_CACHE = new Map<string, { shape: Tex3; billow: Tex3; detail: Tex3; cov: Float32Array }>();
/** The noise textures: Perlin–Worley shape (64³), Worley billows (64³), Worley detail (32³), a coverage map (256²). */
function textures(seed: number) {
  const key = String(seed), hit = TEX_CACHE.get(key);
  if (hit) return hit;
  const make = (n: number, f: (x: number, y: number, z: number) => number): Tex3 => {
    const data = new Float32Array(n * n * n);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) data[(z * n + y) * n + x] = f(x / n, y / n, z / n);
    return { n, data };
  };
  const wfbm = (s: number, x: number, y: number, z: number, base: number) => 0.625 * (1 - worleyP(s, x * base, y * base, z * base, base)) + 0.25 * (1 - worleyP(s + 1, x * base * 2, y * base * 2, z * base * 2, base * 2)) + 0.125 * (1 - worleyP(s + 2, x * base * 4, y * base * 4, z * base * 4, base * 4));
  const pfbm = (s: number, x: number, y: number, z: number) => { let v = 0, a = 0.55, f = 4, sum = 0; for (let o = 0; o < 4; o++) { v += a * perlinP(s + o, x * f, y * f, z * f, f); sum += a; a *= 0.5; f *= 2; } return v / sum; };
  const shape = make(64, (x, y, z) => {
    const p = Math.min(1, Math.max(0, 0.5 + 0.75 * pfbm(seed, x, y, z))), w = wfbm(seed + 9, x, y, z, 4);
    return Math.min(1, Math.max(0, (p - (1 - w)) / Math.max(1e-3, w)));
  });
  const billow = make(64, (x, y, z) => wfbm(seed + 21, x, y, z, 6));
  const detail = make(32, (x, y, z) => wfbm(seed + 33, x, y, z, 3));
  const cov = new Float32Array(256 * 256);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    let v = 0, a = 0.5, f = 4, sum = 0;
    for (let o = 0; o < 5; o++) { v += a * perlinP(seed + 50 + o, (i / 256) * f, (j / 256) * f, 0.37, f); sum += a; a *= 0.5; f *= 2; }
    cov[j * 256 + i] = v / sum;
  }
  // rank-normalise: a threshold of 1 − cover then covers exactly that share
  { const order = Array.from(cov.keys()).sort((a, b) => cov[a] - cov[b]); order.forEach((k, r) => { cov[k] = r / (order.length - 1); }); }
  const t = { shape, billow, detail, cov };
  TEX_CACHE.set(key, t);
  return t;
}
function sample3(t: Tex3, x: number, y: number, z: number): number {
  const n = t.n, m = n - 1, xs = x * n, ys = y * n, zs = z * n, xi = Math.floor(xs), yi = Math.floor(ys), zi = Math.floor(zs), fx = xs - xi, fy = ys - yi, fz = zs - zi;
  const x0 = xi & m, x1 = (xi + 1) & m, y0 = (yi & m) * n, y1 = ((yi + 1) & m) * n, z0 = (zi & m) * n * n, z1 = ((zi + 1) & m) * n * n, d = t.data;
  const a = d[z0 + y0 + x0] + (d[z0 + y0 + x1] - d[z0 + y0 + x0]) * fx, b = d[z0 + y1 + x0] + (d[z0 + y1 + x1] - d[z0 + y1 + x0]) * fx;
  const c = d[z1 + y0 + x0] + (d[z1 + y0 + x1] - d[z1 + y0 + x0]) * fx, e = d[z1 + y1 + x0] + (d[z1 + y1 + x1] - d[z1 + y1 + x0]) * fx;
  const ab = a + (b - a) * fy, ce = c + (e - c) * fy;
  return ab + (ce - ab) * fz;
}
function sample2(c: Float32Array, x: number, y: number): number {
  const xs = x * 256, ys = y * 256, xi = Math.floor(xs), yi = Math.floor(ys), fx = xs - xi, fy = ys - yi, x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * 256, y1 = ((yi + 1) & 255) * 256;
  const a = c[y0 + x0] + (c[y0 + x1] - c[y0 + x0]) * fx, b = c[y1 + x0] + (c[y1 + x1] - c[y1 + x0]) * fx;
  return a + (b - a) * fy;
}
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const remap = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / Math.max(1e-6, b - a)));

// ---- The genera as volumes ---------------------------------------------------------------------------------------------

export interface CloudVolumeRecord {
  /** Base and top above the ground, m (temperate latitudes; typical values within the étage). */
  base: number; top: number;
  /** Liquid (or ice) water content at its peak, g/m³, and the effective radius of droplets or crystals, µm. */
  waterContent: number; effectiveRadius: number; phase: "water" | "ice";
  /** Share of the sky covered by default. */
  cover: number;
  /** Size of the elements, m (patterned genera), or of the cloud cells. */
  cell: number;
  note: string;
}
/**
 * The genera as volumes. Heights from the étage ranges (sky-data.ts); thicknesses, water contents and default covers
 * estimated; effective radii reported for stratocumulus 5.3, altostratus 7.0, nimbostratus 10.8, stratus 11.2 and
 * cumulus congestus 10.5 µm (Hansen 1971), estimated for the rest; cell sizes from the WMO apparent widths at 30°.
 */
export const CLOUD_VOLUMES: Readonly<Record<CloudGenus, CloudVolumeRecord>> = {
  cirrus: { base: 8200, top: 9800, waterContent: 0.035, effectiveRadius: 30, phase: "ice", cover: 0.4, cell: 2500, note: "Fall streaks of ice from small generating heads, bent into hooks by the wind's shear." },
  cirrocumulus: { base: 7500, top: 7700, waterContent: 0.05, effectiveRadius: 8, phase: "water", cover: 0.6, cell: 160, note: "Grains under 1° across, often of supercooled droplets, in ripples a few hundred metres apart; too thin to shade." },
  cirrostratus: { base: 8000, top: 9500, waterContent: 0.008, effectiveRadius: 50, phase: "ice", cover: 1, cell: 4000, note: "A thin ice veil; the sun's 22° and 46° halos." },
  altocumulus: { base: 3800, top: 4100, waterContent: 0.15, effectiveRadius: 7, phase: "water", cover: 0.6, cell: 320, note: "Rounded masses 1–5° across, in billow rows; shaded beneath." },
  altostratus: { base: 3500, top: 5200, waterContent: 0.011, effectiveRadius: 7, phase: "water", cover: 1, cell: 3000, note: "A grey sheet; the sun as through ground glass, no halo." },
  nimbostratus: { base: 900, top: 4200, waterContent: 0.3, effectiveRadius: 10.8, phase: "water", cover: 1, cell: 2500, note: "Thick and dark, a ragged base, scud and rain beneath." },
  stratocumulus: { base: 1300, top: 1700, waterContent: 0.25, effectiveRadius: 5.3, phase: "water", cover: 0.8, cell: 700, note: "Large rounded masses over 5° across, in rolls, with lighter gaps." },
  stratus: { base: 350, top: 750, waterContent: 0.2, effectiveRadius: 11.2, phase: "water", cover: 1, cell: 2000, note: "A low, uniform grey layer." },
  cumulus: { base: 1200, top: 2800, waterContent: 0.5, effectiveRadius: 10.5, phase: "water", cover: 0.4, cell: 1600, note: "Heaps on a flat condensation level, cauliflower tops." },
  cumulonimbus: { base: 1200, top: 12000, waterContent: 1.2, effectiveRadius: 12, phase: "water", cover: 1, cell: 9000, note: "A tower to the tropopause, an anvil, mammatus, a rain shaft." },
};
/** A view that shows each genus's tell-tale feature (sun placed for halos and the ground-glass sun, the anvil downwind, away from the sun). */
export const CLOUD_SCENES: Readonly<Record<CloudGenus, { sunElevation: number; sunAzimuth: number; pitch: number; wind: number; visibilityKm: number }>> = {
  cumulus: { sunElevation: 40, sunAzimuth: 70, pitch: 8, wind: 80, visibilityKm: 40 },
  cumulonimbus: { sunElevation: 32, sunAzimuth: -65, pitch: 7, wind: 90, visibilityKm: 60 },
  stratocumulus: { sunElevation: 30, sunAzimuth: 60, pitch: 14, wind: 80, visibilityKm: 35 },
  altocumulus: { sunElevation: 35, sunAzimuth: 50, pitch: 22, wind: 70, visibilityKm: 45 },
  cirrocumulus: { sunElevation: 45, sunAzimuth: 40, pitch: 30, wind: 60, visibilityKm: 50 },
  cirrus: { sunElevation: 40, sunAzimuth: 50, pitch: 22, wind: 80, visibilityKm: 50 },
  cirrostratus: { sunElevation: 26, sunAzimuth: 8, pitch: 20, wind: 80, visibilityKm: 45 },
  altostratus: { sunElevation: 30, sunAzimuth: 12, pitch: 15, wind: 80, visibilityKm: 30 },
  nimbostratus: { sunElevation: 30, sunAzimuth: 30, pitch: 10, wind: 70, visibilityKm: 18 },
  stratus: { sunElevation: 30, sunAzimuth: 40, pitch: 8, wind: 80, visibilityKm: 20 },
};
/** Extinction coefficient (m⁻¹) from water content (g/m³) and effective radius (µm): σ = 3·LWC ÷ (2·ρ·r_e) (Stephens 1978). */
export const extinction = (waterContent: number, effectiveRadiusUm: number, phase: "water" | "ice" = "water") => (3 * waterContent * 1e-3) / (2 * (phase === "ice" ? 917 : 1000) * effectiveRadiusUm * 1e-6);
/** Mammatus lobes (reported: Schultz et al. 2006): 1–3 km across, about 0.5 km deep. */
export const MAMMATUS = { diameter: [1000, 3000] as const, depth: 500 };
/** Ice halos by minimum deviation (reported): 60° prisms 21.8° (22° halo), 90° prisms 45.7° (46°); ice's index 1.307 (red) to 1.317 (blue). */
export const HALO = { iceIndex: [1.307, 1.311, 1.317] as const, prism22: 60, prism46: 90 };
/** Minimum deviation (radians) of light through an ice prism of apex `apexDeg` with refractive index n: the radius of its halo. */
export const minimumDeviation = (n: number, apexDeg: number) => { const A = (apexDeg * Math.PI) / 180; return 2 * Math.asin(Math.min(1, n * Math.sin(A / 2))) - A; };
const minDeviation = minimumDeviation;

interface Field { sigma: number; ice: boolean; base: number; top: number; /** Lowest altitude with anything in it (ragged bases, scud, rain). */ low: number; /** A single cloud's bounds in x and z (m): the march stays inside. */ box?: readonly [number, number, number, number]; density: (x: number, h: number, z: number, light: boolean) => number; rain?: (x: number, h: number, z: number) => number }

function genusField(genus: CloudGenus, seed: number, cover: number, windDeg: number): Field {
  const v = CLOUD_VOLUMES[genus], t = textures(seed), sigma = extinction(v.waterContent, v.effectiveRadius, v.phase), base = v.base, top = v.top, th = top - base;
  // wind azimuth: 0 = away from the viewer (+z), 90 = to the right (+x)
  const wa = (windDeg * Math.PI) / 180, cw = Math.sin(wa), sw = Math.cos(wa);
  const along = (x: number, z: number) => x * cw + z * sw, across = (x: number, z: number) => -x * sw + z * cw;
  const cov = (x: number, z: number, scale: number) => sample2(t.cov, x / scale, z / scale);
  const ice = v.phase === "ice";
  const field = (density: Field["density"], extra: Partial<Field> = {}): Field => ({ sigma, ice, base, top, low: base - 150, density, ...extra });
  switch (genus) {
    case "cumulus": return field((x, h, z, light) => {
      const hf = (h - base) / th;
      if (hf < 0 || hf > 1) return 0;
      // cells: where the coverage map is high a cloud grows, taller where it is stronger (thermals of different strength)
      const c = remap(cov(x, z, 14000), 1 - cover, 1 - cover + 0.3);
      if (c <= 0) return 0;
      const topH = 0.25 + 0.75 * c, prof = sst(0, 0.035, hf) * sst(topH, topH * 0.5, hf) * c;
      if (prof <= 0) return 0;
      // the tops lean downwind a little; billows (inverted Worley) give the cauliflower
      const sx = x - hf * 400 * cw, sz = z - hf * 400 * sw;
      let d = remap(sample3(t.shape, sx / 3600, h / 3600, sz / 3600) * 0.45 + sample3(t.billow, sx / 1900, h / 1900, sz / 1900) * 0.55, 1 - prof * 0.95, 1.02);
      if (d <= 0 || light) return d;
      d = remap(d, 0.3 * sample3(t.detail, x / 420, h / 420, z / 420) * (1 - hf * 0.3), 1);
      return d;
    });
    case "stratocumulus": return field((x, h, z, light) => {
      const hf = (h - base) / th;
      if (hf < 0 || hf > 1) return 0;
      // rolls across the wind: cells stretched across it, merging into each other
      const u = along(x, z) / v.cell, w = across(x, z) / (v.cell * 1.8), cell = sample3(t.billow, u / 6, hf * 0.15, w / 6);
      const c = cover * (0.75 + 0.5 * cov(x, z, 30000)), topH = 0.45 + 0.55 * cell;
      const prof = sst(0, 0.18, hf) * sst(topH, topH - 0.35, hf);
      let d = remap(cell * 0.75 + sample3(t.shape, x / 3000, h / 3000, z / 3000) * 0.4, 1 - c, 1.05) * prof;
      if (d <= 0 || light) return d;
      d = remap(d, 0.25 * sample3(t.detail, x / 300, h / 300, z / 300), 1);
      return d;
    });
    case "altocumulus": case "cirrocumulus": {
      // cells in billow rows: rows about seven to ten times the shear layer's depth apart (Kelvin–Helmholtz)
      const lambda = genus === "altocumulus" ? 1900 : 650;
      return field((x, h, z, light) => {
        const hf = (h - base) / th;
        if (hf < 0 || hf > 1) return 0;
        const u = along(x, z), w = across(x, z), rows = 0.5 + 0.5 * Math.sin((u / lambda) * Math.PI * 2 + 2.2 * (cov(x, z, 9000) - 0.5) * 3);
        const cell = sample3(t.billow, u / (v.cell * 6.5), hf * 0.12, w / (v.cell * 5.2));
        const patch = cov(x + 7000, z - 3000, genus === "altocumulus" ? 24000 : 18000), c = cover * (0.6 + 0.8 * patch);
        const prof = sst(0, 0.25, hf) * sst(0.55 + 0.45 * cell, 0.2 + 0.3 * cell, hf);
        let d = remap(cell * (0.55 + 0.45 * rows), 1 - c * 0.85, 1) * prof;
        if (d <= 0 || light) return d;
        d = remap(d, 0.3 * sample3(t.detail, x / (v.cell * 1.4), h / (v.cell * 1.4), z / (v.cell * 1.4)), 1);
        return d;
      });
    }
    case "cirrus": {
      // fall streaks: crystals fall from heads at the top and drift downwind faster with height (linear shear):
      // a parabola, the hook of cirrus uncinus. The strands are long along the wind and thin across it.
      return field((x, h, z) => {
        const dd = top - h;
        if (dd < 0 || dd > th) return 0;
        const u = along(x, z) + 0.0009 * dd * dd, w = across(x, z);
        const c = remap(cov(u * 0.6, w * 1.8, 60000), 1 - cover, 1 - cover + 0.25);
        if (c <= 0) return 0;
        // strands: ridges of noise stretched 12:1 along the wind, a few hundred metres wide
        const ridge = 1 - Math.abs(sample3(t.shape, u / 40000, dd / 20000, w / 3300) * 2 - 1), fib = Math.pow(ridge, 6);
        const fine = 0.6 + 0.4 * sample3(t.detail, u / 6000, dd / 900, w / 300);
        const head = sst(0.1, 0, dd / th) * 0.6 + 0.4, length = 0.3 + 0.7 * c, prof = sst(0, 0.05, dd / th) * sst(length, length * 0.25, dd / th);
        return fib * fine * prof * c * (0.7 + 0.6 * head);
      });
    }
    case "cirrostratus": return field((x, h, z) => {
      const hf = (h - base) / th;
      if (hf < 0 || hf > 1) return 0;
      const u = along(x, z), w = across(x, z), fib = sample3(t.shape, u / 14000, hf * 0.1, w / 2600);
      return sst(0, 0.3, hf) * sst(1, 0.6, hf) * (0.55 + 0.45 * fib) * Math.min(1, cover + 0.1);
    });
    case "altostratus": return field((x, h, z) => {
      const hf = (h - base) / th;
      if (hf < 0 || hf > 1) return 0;
      const u = along(x, z), w = across(x, z), streak = sample3(t.shape, u / 9000, hf * 0.2, w / 2200), lump = sample3(t.billow, x / 5000, h / 5000, z / 5000);
      // thicker and thinner patches 5–10 km across; fibrous streaks along the wind on the base
      const patch = sample3(t.billow, x / 14000, 0.61, z / 14000), topF = 0.55 + 0.6 * patch;
      return sst(0, 0.2, hf) * sst(topF, topF - 0.3, hf) * (0.55 + 0.3 * streak + 0.15 * lump) * Math.min(1, cover + 0.05);
    });
    case "nimbostratus": {
      // a ragged base (±250 m), pannus scud below it, rain in streaks down to the ground
      const baseAt = (x: number, z: number) => base + 420 * (sample3(t.shape, x / 2600, 0.31, z / 2600) - 0.45) + 160 * (sample3(t.billow, x / 900, 0.77, z / 900) - 0.5);
      return field((x, h, z, light) => {
        if (h > top) return 0;
        const b = baseAt(x, z);
        if (h >= b) {
          // thicker and thinner parts (darker and lighter patches seen from below), lumps on the base
          const patch = 0.6 * sample3(t.billow, x / 7000, 0.43, z / 7000) + 0.4 * sample3(t.shape, x / 3000, 0.19, z / 3000), tp = top - 2400 + 3200 * patch;
          return sst(tp, tp - 700, h) * (0.45 + 0.55 * patch) * (0.7 + 0.3 * sample3(t.billow, x / 1800, h / 1800, z / 1800));
        }
        // scud: ragged fractus pieces 300–600 m up
        if (h > 280 && h < 640) {
          const f = remap(sample3(t.shape, x / 1300, h / 900, z / 1300) * (light ? 1 : 0.7 + 0.3 * sample3(t.detail, x / 250, h / 250, z / 250)), 0.5, 0.85);
          return f * sst(280, 380, h) * sst(640, 520, h) * 0.6;
        }
        return 0;
      }, { low: 20, rain: (x, h, z) => { const b = baseAt(x, z); if (h > b) return 0; const sl = (b - h) * 0.25; return (0.55 + 0.45 * sample3(t.detail, (x + sl * cw) / 900, h / 9000, (z + sl * sw) / 900)) * sst(0, 300, h); } });
    }
    case "stratus": return field((x, h, z, light) => {
      const b = base + 70 * (sample3(t.shape, x / 2500, 0.2, z / 2500) - 0.5), hf = (h - b) / (top - b);
      if (hf < 0 || hf > 1) return 0;
      // undulations: gentle waves across the wind, and thinner patches
      const wave = 0.5 + 0.5 * Math.sin(along(x, z) / 900 + 2 * sample3(t.shape, x / 6000, 0.7, z / 6000)), patch = sample3(t.billow, x / 9000, 0.27, z / 9000);
      const tp = 0.55 + 0.45 * patch;
      let d = sst(0, 0.25, hf) * sst(tp, tp - 0.3, hf) * (0.7 + 0.15 * wave + 0.15 * sample3(t.billow, x / 3000, h / 3000, z / 3000));
      if (!light) d *= 0.85 + 0.15 * sample3(t.detail, x / 400, h / 400, z / 400);
      return d;
    });
    case "cumulonimbus": {
      // one storm about 32 km ahead: a broad body of towers to the tropopause, smaller towers in a flanking line,
      // the anvil spreading downwind as a plate that thins to fibres, an overshooting dome, mammatus beneath, a rain shaft
      const cx = -2000, cz = 25000, anvilBase = 9800, anvilTop = 11600, trop = 11400;
      const towers = [[0, 0, 1], [-5200, 2500, 0.78], [4300, -2600, 0.72], [-9800, 5200, 0.5], [-14000, 8200, 0.32], [7200, 3600, 0.45]] as const;
      return field((x, h, z, light) => {
        if (h < base || h > top) return 0;
        const dx = x - cx, dz = z - cz, a = dx * cw + dz * sw, c = -dx * sw + dz * cw;
        const q = Math.hypot(dx, dz), turret = 0.6 * sample3(t.billow, x / 5200, h / 5200, z / 5200) + 0.4 * sample3(t.billow, x / 2300, h / 2300, z / 2300), lump = sample3(t.shape, x / 8000, h / 8000, z / 8000);
        let d = 0;
        for (const [ox, oz, s] of towers) {
          const tq = Math.hypot(dx - ox, dz - oz), tTop = base + (trop - base) * s * (0.9 + 0.2 * lump);
          if (h > tTop + 1500) continue;
          // each tower narrows a little to a rounded top; billows make its surface cauliflower
          const hf = (h - base) / Math.max(1, tTop - base), R = (2600 + 3200 * s) * (1 - 0.35 * hf * hf) + 2200 * (turret - 0.45) + 1200 * (lump - 0.5);
          d = Math.max(d, sst(R, R - 700, tq) * sst(tTop + 1200 * (turret - 0.3), tTop - 400, h));
        }
        d *= sst(base, base + 100, h);
        // the anvil: a plate at the tropopause, reaching far downwind, thinning to fibres at its edge
        const reach = a > 0 ? 34000 : 7000, ell = Math.hypot(a / reach, c / (9000 + 0.25 * Math.max(0, a)));
        if (h > anvilBase - 600 && h < anvilTop && ell < 1.3) {
          const edgeFib = sample3(t.shape, a / 30000, h / 3000, c / 6000), thick = sst(1.05, 0.5, ell + 0.25 * (edgeFib - 0.5) + 0.1 * (sample3(t.billow, x / 6000, h / 6000, z / 6000) - 0.5));
          const lift = anvilBase + 700 * ell * ell - 500 * (1 - ell), hi = anvilTop - 1300 * ell;
          d = Math.max(d, thick * sst(lift, lift + 250, h) * sst(hi, hi - 300, h));
          // mammatus: pouches hanging from the anvil's underside downwind of the core
          if (h < lift + 50 && ell < 0.85 && a > 4000) {
            const pouch = sample3(t.billow, x / 9000, 0.5, z / 9000), depth = MAMMATUS.depth * pouch * pouch * 1.8;
            if (h > lift - depth) d = Math.max(d, 0.85 * sst(lift - depth, lift - depth + 120, h));
          }
        }
        // the overshooting top above the core
        const dome = 2400 * Math.sqrt(Math.max(0, 1 - (q / 4200) ** 2));
        if (dome > 0 && h > anvilTop - 300 && h < anvilTop + dome) d = Math.max(d, sst(anvilTop + dome, anvilTop + dome - 250, h) * sst(4200, 3000, q));
        if (d <= 0 || light) return d;
        return remap(d, 0.2 * sample3(t.detail, x / 1300, h / 1300, z / 1300), 1);
      }, { low: 20, box: [cx - 36000, cz - 36000, cx + 36000, cz + 36000], rain: (x, h, z) => { const q = Math.hypot(x - cx, z - cz); if (q > 7000 || h > base) return 0; return sst(7000, 3500, q) * (0.6 + 0.4 * sample3(t.detail, x / 700, h / 6000, z / 700)); } });
    }
  }
}

// ---- Rendering ---------------------------------------------------------------------------------------------------------------

export interface CloudLayerInput { genus: CloudGenus; cover?: number }
export interface SkyRenderOptions {
  width?: number; height?: number;
  layers?: readonly (CloudGenus | CloudLayerInput)[];
  /** Sun elevation and azimuth, degrees; azimuth 0 = straight ahead (backlit clouds), 180 = behind the viewer. */
  sunElevation?: number; sunAzimuth?: number;
  /** Camera: pitch above the horizon and horizontal field of view, degrees; eye height, m. */
  pitch?: number; fov?: number; eyeHeight?: number;
  visibilityKm?: number;
  /** Wind direction the clouds move towards, degrees (0 ahead, 90 right). */
  wind?: number;
  seed?: number;
  /** Steps through each layer (more = finer, slower). */
  steps?: number;
  ground?: boolean;
  exposure?: number;
  /** How far the camera's white balance pulls the bright parts to neutral (0 none, 1 fully; default 0.5). */
  whiteBalance?: number;
}
export interface SkyRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number }

const ACES = (v: number) => Math.min(1, Math.max(0, (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14)));
const enc = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const RE = 6_371_000;
const hg = (c: number, g: number) => (1 - g * g) / (4 * Math.PI * Math.pow(Math.max(1e-6, 1 + g * g - 2 * g * c), 1.5));

/** Water clouds: a strong forward lobe (diffraction), a soft back lobe; ice: forward lobe and the 22°/46° halos. */
function phaseFn(ice: boolean): (c: number, g: number) => V3 {
  if (!ice) return (c, g) => { const p = 0.78 * hg(c, g) + 0.22 * hg(c, -0.25); return [p, p, p]; };
  const d22 = HALO.iceIndex.map(n => minDeviation(n, HALO.prism22)), d46 = HALO.iceIndex.map(n => minDeviation(n, HALO.prism46));
  return (c, g) => {
    const th = Math.acos(Math.max(-1, Math.min(1, c))), base = 0.72 * hg(c, g) + 0.08 * hg(c, -0.2);
    return [0, 1, 2].map(k => {
      // minimum deviation: no refracted light inside the ring, a sharp inner edge, a tail outwards
      const r22 = th < d22[k] ? Math.exp(-(((d22[k] - th) / 0.004) ** 2)) : Math.exp(-(th - d22[k]) / 0.045);
      const r46 = th < d46[k] ? Math.exp(-(((d46[k] - th) / 0.006) ** 2)) : Math.exp(-(th - d46[k]) / 0.06);
      return base + 0.32 * r22 + 0.05 * r46 + 0.03;
    }) as V3;
  };
}

/** Render a sky with cloud layers, seen from the ground. Returns 8-bit sRGBA. */
export function renderCloudSky(o: SkyRenderOptions = {}): SkyRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = Math.max(16, Math.round(o.width ?? 480)), H = Math.max(9, Math.round(o.height ?? 270)), seed = o.seed ?? 1, eye = o.eyeHeight ?? 2, steps = o.steps ?? 56;
  const sunEl = o.sunElevation ?? 35, sunAz = o.sunAzimuth ?? 60, atm: Atmosphere = atmosphere({ sunElevation: sunEl, sunAzimuth: sunAz, visibilityKm: o.visibilityKm ?? 40, eyeHeight: eye });
  const sun = atm.sunDir, wind = o.wind ?? 80;
  const layers = (o.layers ?? ["cumulus"]).map(l => (typeof l === "string" ? { genus: l } : l)).map(l => ({ genus: l.genus, f: genusField(l.genus, seed + l.genus.length * 13, l.cover ?? CLOUD_VOLUMES[l.genus].cover, wind) }));
  const fields = layers.map(l => l.f).sort((a, b) => a.base - b.base);
  const pitch = ((o.pitch ?? 12) * Math.PI) / 180, fov = ((o.fov ?? 75) * Math.PI) / 180, tx = Math.tan(fov / 2), ty = tx * (H / W);
  const fwd: V3 = [0, Math.sin(pitch), Math.cos(pitch)], right: V3 = [1, 0, 0], up: V3 = [0, Math.cos(pitch), -Math.sin(pitch)];
  const skyAmbient: V3 = [atm.skyIrradiance[0] / Math.PI, atm.skyIrradiance[1] / Math.PI, atm.skyIrradiance[2] / Math.PI];
  const groundAlbedo: V3 = [0.075, 0.095, 0.05];
  const out = new Uint8ClampedArray(W * H * 4), hdr = new Float32Array(W * H * 3);
  const phases = fields.map(f => phaseFn(f.ice));
  // how much sunlight gets through the clouds on average: it also lights the air and the ground
  let meanSun = 0, meanDiffuse = 0;
  {
    const sy0 = Math.max(0.06, sun[1]);
    for (let k = 0; k < 64; k++) {
      const gx = ((k % 8) - 3.5) * 2500, gz = 4000 + Math.floor(k / 8) * 2500;
      let tau = 0;
      for (const f of fields) for (let q = 0; q < 6; q++) { const hh = f.low + (q + 0.5) / 6 * (f.top - f.low), tt = hh / sy0; tau += f.sigma * f.density(gx + sun[0] * tt, hh, gz + sun[2] * tt, true) * (f.top - f.low) / 6 / sy0; }
      meanSun += Math.exp(-tau) / 64;
      // light that diffuses through a thick deck (two-stream: 1 ÷ (1 + 0.75 τ (1 − g)), g 0.85)
      meanDiffuse += (1 - Math.exp(-tau)) / (1 + 0.75 * tau * sy0 * 0.15) / 64;
    }
  }
  const airDim = meanSun;
  // a camera exposing for the scene: for the light falling on the ground (sun through cloud, and sky)
  const sunAtEye = atm.sunlight(eye, Math.max(0.02, sun[1])), throughGround = meanSun + meanDiffuse * 0.85;
  const groundLight: V3 = [0, 1, 2].map(c => sunAtEye[c] * Math.max(0, sun[1]) * throughGround + atm.skyIrradiance[c] * (0.25 + 0.75 * meanSun)) as V3;
  const exposure = 1.9 / Math.max(0.01, groundLight[1] * 1.15);
  // the air under cloud glows with the light that diffuses through (neutral grey), the clear sky's light where the sun gets through
  const gl = (0.2126 * groundLight[0] + 0.7152 * groundLight[1] + 0.0722 * groundLight[2]) / Math.PI * (1 - meanSun);
  const greyAir: V3 = [gl * 0.93, gl * 0.97, gl * 1.04];
  const altitude = (x: number, y: number, z: number) => y + (x * x + z * z) / (2 * RE);
  // where a ray from the eye is between two altitudes (the curved Earth drops the layer away: altitude = eye + b·t + a·t²)
  const reach = (d: V3, alt: number) => { const a = (d[0] * d[0] + d[2] * d[2]) / (2 * RE), c = alt - eye; return (2 * c) / (d[1] + Math.sqrt(d[1] * d[1] + 4 * a * c)); };
  const shell = (d: V3, lo: number, hi: number): [number, number] | null => {
    const tIn = lo > eye ? reach(d, lo) : 0, tOut = Math.min(reach(d, hi), 180000);
    return Number.isFinite(tIn) && tIn < tOut ? [tIn, tOut] : null;
  };
  // optical depth from a point towards the sun through every layer above it (growing steps in its own layer)
  const sy = Math.max(0.06, sun[1]);
  const sunDepth = (x: number, y: number, z: number, self: Field, h: number): number => {
    let tau = 0;
    for (const f of fields) {
      if (f.top < h) continue;
      const own = f === self, t0 = own ? 0 : Math.max(0, (f.low - h) / sy), t1 = Math.min(t0 + (own ? 4000 : 3000), (f.top - h) / sy);
      if (t1 <= t0) continue;
      let s = t0, step = own ? 35 : (t1 - t0) / 5;
      for (let k = 0; k < (own ? 7 : 5) && s < t1; k++) {
        const len = Math.min(step, t1 - s), tt = s + len / 2, px = x + sun[0] * tt, py = y + sun[1] * tt, pz = z + sun[2] * tt;
        tau += f.sigma * f.density(px, altitude(px, py, pz), pz, true) * len;
        s += len; if (own) step *= 1.9;
      }
    }
    return tau;
  };
  const glowW = 0.0012;
  // one ray: its colour (HDR)
  const shade = (ux: number, uy: number, jitter: number): V3 => {
    const d = norm3([fwd[0] + right[0] * ux * tx + up[0] * uy * ty, fwd[1] + right[1] * ux * tx + up[1] * uy * ty, fwd[2] + right[2] * ux * tx + up[2] * uy * ty]);
    let col: V3, T: V3 = [1, 1, 1];
    const L: V3 = [0, 0, 0];
    let meanDist = 0, wsum = 0;
    const horizonDip = -Math.sqrt((2 * eye) / RE);
    if (d[1] < horizonDip && o.ground !== false) {
      // the ground: lit by sun and sky, shaded by the clouds, faded by the air
      const tg = Math.min(60000, -eye / Math.min(-1e-4, d[1])), gx = d[0] * tg, gz = d[2] * tg;
      let shadow = 1;
      for (const f of fields) {
        let tau = 0;
        for (let k = 0; k < 8; k++) { const hh = f.low + (k + 0.5) / 8 * (f.top - f.low), tt = hh / sy; tau += f.sigma * f.density(gx + sun[0] * tt, hh, gz + sun[2] * tt, true) * (f.top - f.low) / 8 / sy; }
        shadow *= Math.exp(-tau * 0.8);
      }
      const sl = atm.sunlight(0, sun[1]), lit: V3 = [0, 1, 2].map(c => groundAlbedo[c] * (sl[c] * Math.max(0, sun[1]) * (shadow + meanDiffuse * 0.85) + atm.skyIrradiance[c] * (0.25 + 0.75 * meanSun)) / Math.PI) as V3;
      const air0 = atm.sky([d[0], Math.max(0.0001, -d[1] * 0.2), d[2]]), air: V3 = [air0[0] * airDim + greyAir[0], air0[1] * airDim + greyAir[1], air0[2] * airDim + greyAir[2]], fadeK = 1 - Math.exp(-tg / ((o.visibilityKm ?? 40) * 1000 / 3.912) * 0.9);
      col = [lit[0] * (1 - fadeK) + air[0] * fadeK, lit[1] * (1 - fadeK) + air[1] * fadeK, lit[2] * (1 - fadeK) + air[2] * fadeK];
    } else {
      const sky0 = atm.sky([d[0], Math.max(d[1], 0.0005), d[2]]), sky: V3 = [sky0[0], sky0[1], sky0[2]], skyAir: V3 = [sky0[0] * airDim + greyAir[0], sky0[1] * airDim + greyAir[1], sky0[2] * airDim + greyAir[2]], cosSun = d[0] * sun[0] + d[1] * sun[1] + d[2] * sun[2];
      for (let li = 0; li < fields.length; li++) {
        const f = fields[li];
        let seg = shell(d, f.low, f.top);
        if (seg && f.box) {
          const [x0, z0, x1, z1] = f.box, ix = d[0] !== 0 ? [x0 / d[0], x1 / d[0]] : [-1e9, 1e9], iz = d[2] !== 0 ? [z0 / d[2], z1 / d[2]] : [-1e9, 1e9];
          const a0 = Math.max(seg[0], Math.min(ix[0], ix[1]), Math.min(iz[0], iz[1])), a1 = Math.min(seg[1], Math.max(ix[0], ix[1]), Math.max(iz[0], iz[1]));
          seg = a0 < a1 ? [a0, a1] : null;
        }
        if (!seg) continue;
        const [ta, tb] = seg, n = Math.min(f.box ? steps * 3 : steps, Math.max(12, Math.ceil((tb - ta) / 60))), ph = phases[li](cosSun, f.ice ? 0.8 : 0.85), ph2 = phases[li](cosSun, 0.4);
        // long grazing paths: steps grow with distance (fine near, coarse far, where clouds are small on screen)
        const pw = tb - ta > 9000 ? 2.2 : 1;
        for (let s = 0; s < n; s++) {
          if (T[1] < 0.004) { T = [0, 0, 0]; break; }
          const u = (s + jitter) / n, tt = ta + (tb - ta) * Math.pow(u, pw), dt = ((tb - ta) * pw * Math.pow(Math.max(u, 0.5 / n), pw - 1)) / n;
          const x = d[0] * tt, y = eye + d[1] * tt, z = d[2] * tt, h = altitude(x, y, z);
          let dens = f.density(x, h, z, tt > 26000), rain = 0;
          if (f.rain && h < f.base + 400) rain = f.rain(x, h, z) * 0.012;
          if (h < f.low || h > f.top) continue;
          if (dens <= 0.002 && rain <= 0) continue;
          const sigT = f.sigma * dens + f.sigma * rain;
          const tauSun = sunDepth(x, y, z, f, h), sl = atm.sunlight(h, (x * sun[0] + (y + RE) * sun[1] + z * sun[2]) / (RE + h));
          // multiple scattering (Wrenninge): octaves with weaker extinction and softer phase
          const hf = Math.min(1, Math.max(0, (h - f.base) / (f.top - f.base)));
          const ms0 = Math.exp(-tauSun), ms1 = Math.exp(-tauSun * 0.5) * 0.5, ms2 = Math.exp(-tauSun * 0.25) * 0.25;
          const powder = 1 - Math.exp(-sigT * 120), diffuse = Math.max(0, 1 / (1 + 0.75 * tauSun * sy * 0.15) - ms0);
          const tauTop = f.sigma * dens * (f.top - h) * 0.35;
          const amb = Math.exp(-tauTop) * (0.35 + 0.65 * hf);
          const Sc: V3 = [0, 0, 0];
          for (let c = 0; c < 3; c++) {
            const direct = sl[c] * (ms0 * ph[c] + (ms1 + ms2) * ph2[c] * 0.9) * (0.65 + 0.35 * powder) + (sl[c] * sy + atm.skyIrradiance[c] * 0.7) * diffuse / Math.PI * 0.9;
            Sc[c] = (direct + skyAmbient[c] * amb * 1.1 + skyAmbient[c] * 0.15) * (rain > 0 && dens < 0.05 ? 0.55 : 1);
          }
          const ext = Math.exp(-sigT * dt), w = (1 - ext);
          for (let c = 0; c < 3; c++) { L[c] += T[c] * Sc[c] * w; T[c] *= ext; }
          const contrib = T[1] * w + 1e-9;
          meanDist += tt * contrib; wsum += contrib;
        }
      }
      // aerial perspective between the eye and the cloud light
      const dist = wsum > 0 ? meanDist / wsum : 0, air = Math.exp(-dist / ((o.visibilityKm ?? 40) * 1000 / 3.912) * Math.min(1, 1500 / Math.max(300, eye + d[1] * dist * 0.5)));
      col = [0, 1, 2].map(c => sky[c] * T[c] + L[c] * air + skyAir[c] * (1 - T[c]) * (1 - air)) as V3;
      // the sun's disc and its glow, dimmed by the cloud in front
      const ang = Math.acos(Math.max(-1, Math.min(1, cosSun)));
      if (sun[1] > -0.02) {
        const st = atm.sunlight(eye, sun[1]), disc = ang < 0.0047 ? 1 - 0.4 * (ang / 0.0047) ** 2 : 0, glow = Math.exp(-(ang * ang) / glowW) * 0.6 + Math.exp(-ang / 0.06) * 0.025;
        for (let c = 0; c < 3; c++) col[c] += st[c] * T[c] * (disc * 1800 + glow * 1.4);
      }
    }
    return col;
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const ux = ((i + 0.5) / W) * 2 - 1, uy = 1 - ((j + 0.5) / H) * 2, jitter = ((Math.imul(i, 1103515245) ^ Math.imul(j, 12345 + 2654435761)) >>> 0) / 4294967296;
    // grazing rays near the horizon cross distant clouds in a few long steps: two rays per pixel there
    const elev = pitch + Math.atan(uy * ty);
    let col: V3;
    if (Math.abs(elev) < 0.1) {
      const a = shade(ux - 0.25 / W * 2, uy + 0.25 / H * 2, jitter), b = shade(ux + 0.25 / W * 2, uy - 0.25 / H * 2, (jitter + 0.5) % 1);
      col = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    } else col = shade(ux, uy, jitter);
    const k = (j * W + i) * 3;
    hdr[k] = col[0]; hdr[k + 1] = col[1]; hdr[k + 2] = col[2];
  }
  // metering: a camera's average (the scene to mid-grey) blended with the fixed exposure for a sunny day,
  // so an overcast sky stays grey and a rain layer darker than a thin one
  let logSum = 0;
  for (let k = 0; k < W * H; k++) logSum += Math.log(1e-5 + 0.2126 * hdr[k * 3] + 0.7152 * hdr[k * 3 + 1] + 0.0722 * hdr[k * 3 + 2]);
  const meanL = Math.exp(logSum / (W * H)), sunny = 1.9 / Math.max(0.01, (sunAtEye[1] * Math.max(0.1, sun[1]) + atm.skyIrradiance[1]) * 1.15);
  const ex = o.exposure ?? Math.exp(0.55 * Math.log(0.2 / meanL) + 0.45 * Math.log(Math.min(sunny, exposure)));
  // white balance, as a camera's does it partly: the brightest third of the frame pulled halfway to neutral
  const lums = Array.from({ length: W * H }, (_, k) => 0.2126 * hdr[k * 3] + 0.7152 * hdr[k * 3 + 1] + 0.0722 * hdr[k * 3 + 2]), cut = [...lums].sort((a, b) => a - b)[Math.floor(W * H * 0.67)];
  const wb = [0, 0, 0];
  for (let k = 0; k < W * H; k++) if (lums[k] >= cut) { wb[0] += hdr[k * 3]; wb[1] += hdr[k * 3 + 1]; wb[2] += hdr[k * 3 + 2]; }
  const gain = wb.map(v => Math.pow(Math.max(1e-6, wb[1]) / Math.max(1e-6, v), o.whiteBalance ?? 0.5));
  for (let k = 0; k < W * H; k++) for (let c = 0; c < 3; c++) hdr[k * 3 + c] *= gain[c];
  for (let k = 0; k < W * H; k++) { out[k * 4] = enc(ACES(hdr[k * 3] * ex)); out[k * 4 + 1] = enc(ACES(hdr[k * 3 + 1] * ex)); out[k * 4 + 2] = enc(ACES(hdr[k * 3 + 2] * ex)); out[k * 4 + 3] = 255; }
  return { width: W, height: H, rgba: out, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 };
}
