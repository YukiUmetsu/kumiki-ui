/**
 * Per-pixel colour maths for the selective colour engine (registry item `selective-color`). Pure scalar functions of
 * gamma-encoded sRGB in 0..1, with no allocation and no branches that a shader could not take, so the same maths runs
 * on typed arrays here and in a fragment shader later.
 *
 * - HSV: hue in degrees 0..360, saturation and value 0..1 (the hexcone model editors use for qualifiers).
 * - CIELAB: D65, from linearised sRGB through CIE XYZ (IEC 61966-2-1; CIE 15).
 * - YCbCr: full range, Cb and Cr centred on 0 (±0.5), from ITU-R BT.601 or BT.709 luma weights. Chroma alone
 *   separates hues well under changing light, which is why skin detectors use the CbCr plane (Chai & Ngan 1999).
 * - Colour difference: CIE76 (Euclidean ΔE*ab) and CIEDE2000 (Sharma, Wu & Dalal 2005).
 */

/** Luma weights for R′, G′ and B′ (ITU-R BT.601 and BT.709). */
export const LUMA_WEIGHTS = { rec601: [0.299, 0.587, 0.114], rec709: [0.2126, 0.7152, 0.0722] } as const;
export type LumaStandard = keyof typeof LUMA_WEIGHTS;

/** The sRGB transfer function, encoded 0..1 to linear light. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** A 256-entry table of `srgbToLinear` for 8-bit channels. */
export const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => srgbToLinear(i / 255));

/** #rrggbb to [r, g, b] in 0..1, or undefined when it is not a colour. */
export function parseHex(hex: string): [number, number, number] | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const v = parseInt(m[1], 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** HSV of an sRGB colour: hue in degrees (0 for greys), saturation and value 0..1. */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 1e-9) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max > 1e-9 ? d / max : 0, max];
}

/** The smallest angle between two hues, degrees, 0..180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const D65 = [0.95047, 1, 1.08883] as const;
const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);

/** CIELAB (D65) of linear-light sRGB. */
export function linearToLab(r: number, g: number, b: number): [number, number, number] {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / D65[0];
  const y = (0.2126729 * r + 0.7151522 * g + 0.072175 * b) / D65[1];
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / D65[2];
  const fx = labF(x), fy = labF(y), fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB (D65) of gamma-encoded sRGB in 0..1. */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  return linearToLab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

/** Full-range YCbCr of gamma-encoded sRGB: Y 0..1, Cb and Cr −0.5..0.5. */
export function rgbToYcbcr(r: number, g: number, b: number, standard: LumaStandard = "rec709"): [number, number, number] {
  const [kr, kg, kb] = LUMA_WEIGHTS[standard], y = kr * r + kg * g + kb * b;
  return [y, (0.5 * (b - y)) / (1 - kb), (0.5 * (r - y)) / (1 - kr)];
}

/** CIE76 colour difference: Euclidean distance in CIELAB. `lightness` 0 ignores ΔL* (hue and chroma only). */
export function deltaE76(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number, lightness = 1): number {
  return Math.hypot(lightness * (l1 - l2), a1 - a2, b1 - b2);
}

const RAD = Math.PI / 180;
/**
 * CIEDE2000 colour difference (kL = kC = kH = 1, or `lightness` for kL⁻¹: 0 ignores ΔL′). Follows Sharma, Wu & Dalal
 * (2005), including the hue-mean rule for hues more than 180° apart.
 */
export function deltaE2000(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number, lightness = 1): number {
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cm = (c1 + c2) / 2, cm7 = cm ** 7;
  const g = 0.5 * (1 - Math.sqrt(cm7 / (cm7 + 25 ** 7)));
  const ap1 = (1 + g) * a1, ap2 = (1 + g) * a2, cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
  const hp1 = cp1 === 0 ? 0 : (Math.atan2(b1, ap1) / RAD + 360) % 360, hp2 = cp2 === 0 ? 0 : (Math.atan2(b2, ap2) / RAD + 360) % 360;
  const dl = l2 - l1, dc = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) { dh = hp2 - hp1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh * RAD) / 2);
  const lm = (l1 + l2) / 2, cpm = (cp1 + cp2) / 2;
  let hm = hp1 + hp2;
  if (cp1 * cp2 !== 0) { if (Math.abs(hp1 - hp2) <= 180) hm /= 2; else hm = hp1 + hp2 < 360 ? (hm + 360) / 2 : (hm - 360) / 2; }
  const t = 1 - 0.17 * Math.cos((hm - 30) * RAD) + 0.24 * Math.cos(2 * hm * RAD) + 0.32 * Math.cos((3 * hm + 6) * RAD) - 0.2 * Math.cos((4 * hm - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2)), cpm7 = cpm ** 7, rc = 2 * Math.sqrt(cpm7 / (cpm7 + 25 ** 7));
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2), sc = 1 + 0.045 * cpm, sh = 1 + 0.015 * cpm * t, rt = -Math.sin(2 * dTheta * RAD) * rc;
  return Math.sqrt((lightness * dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}

/** 1 inside `tolerance`, falling smoothly (smoothstep) to 0 at `tolerance + softness`. */
export function softWindow(distance: number, tolerance: number, softness: number): number {
  if (distance <= tolerance) return 1;
  if (softness <= 0) return 0;
  const t = Math.min(1, (distance - tolerance) / softness);
  return 1 - t * t * (3 - 2 * t);
}

/** 0 below `floor`, rising smoothly to 1 at `floor + softness` (a saturation or value minimum). */
export function softFloor(value: number, floor: number, softness: number): number {
  if (softness <= 0) return value >= floor ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - floor) / softness));
  return t * t * (3 - 2 * t);
}
