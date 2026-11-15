/**
 * ANAT1 colour: measured and physically based colour for skin, hair and eyes, plus colour science helpers.
 *
 *   Skin   Monk Skin Tone scale (10 tones, CC BY 4.0), ITA° classification (Chardon et al. 1991), measured skin
 *          scattering (Jensen et al. 2001, skin1/skin2), shade ramps with subsurface red bleed at the terminator,
 *          regional colour shifts (forehead, cheeks, nose, ears, lips, beard shadow, palms).
 *   Hair   melanin → absorption (Chiang et al. 2016 / pbrt) → base colour; blonde 0.3, brown 1.3, black 8 eumelanin
 *          (pbrt-v4 documentation); greying as a mix of pigmented and white fibres; Marschner highlight lobes.
 *   Eyes   iris palette and structure notes (drawing guide).
 * Evidence grades as in anatomy-reference.ts: M measured, B standard fact, S model, E estimate for drawing.
 */

export type RGB = [number, number, number];
export type Lab = [number, number, number];

// ---- Colour science ------------------------------------------------------------------------------------------------------------

export const hexToRgb = (hex: string): RGB => { const n = parseInt(hex.replace("#", ""), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const rgbToHex = (c: RGB): string => "#" + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
export const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export const linearToSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);
export const toLinear = (c: RGB): RGB => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])];
export const toSrgb = (c: RGB): RGB => [linearToSrgb(c[0]), linearToSrgb(c[1]), linearToSrgb(c[2])];

const WHITE = [0.95047, 1, 1.08883];
/** sRGB (0–1, gamma-encoded) → CIELAB (D65). */
export function srgbToLab(c: RGB): Lab {
  const [r, g, b] = toLinear(c);
  const xyz = [0.4124564 * r + 0.3575761 * g + 0.1804375 * b, 0.2126729 * r + 0.7151522 * g + 0.072175 * b, 0.0193339 * r + 0.119192 * g + 0.9503041 * b];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = xyz.map((v, i) => f(v / WHITE[i]));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/** CIELAB (D65) → sRGB (0–1, clamped). */
export function labToSrgb([L, a, b]: Lab): RGB {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const [x, y, z] = [inv(fx) * WHITE[0], inv(fy) * WHITE[1], inv(fz) * WHITE[2]];
  const lin: RGB = [3.2404542 * x - 1.5371385 * y - 0.4985314 * z, -0.969266 * x + 1.8760108 * y + 0.041556 * z, 0.0556434 * x - 0.2040259 * y + 1.0572252 * z];
  return toSrgb(lin.map(v => Math.min(1, Math.max(0, v))) as RGB);
}

// ---- Skin ------------------------------------------------------------------------------------------------------------------------

/** Individual Typology Angle in degrees: atan((L* − 50) / b*). Higher = lighter skin. */
export const itaDegrees = ([L, , b]: Lab) => (Math.atan2(L - 50, b) * 180) / Math.PI;
export type ItaCategory = "very light" | "light" | "intermediate" | "tan" | "brown" | "dark";
/** ITA° skin-colour categories (Chardon, Dupont & Lévêque 1991; used in Del Bino et al. 2006). Grade B. */
export function itaCategory(ita: number): ItaCategory {
  return ita > 55 ? "very light" : ita > 41 ? "light" : ita > 28 ? "intermediate" : ita > 10 ? "tan" : ita > -30 ? "brown" : "dark";
}

export interface SkinTone { id: string; hex: string; lab: Lab; ita: number; category: ItaCategory }
const MST_HEX = ["#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96", "#a07e56", "#825c43", "#604134", "#3a312a", "#292420"];
/**
 * Monk Skin Tone scale (Ellis Monk with Google, 2023), CC BY 4.0 — "Monk Skin Tone Scale by Ellis Monk, Google".
 * Ten swatches for inclusive representation; each is converted to CIELAB and ITA° here.
 */
export const MONK_SKIN_TONES: readonly SkinTone[] = MST_HEX.map((hex, i) => {
  const lab = srgbToLab(hexToRgb(hex)), ita = itaDegrees(lab);
  return { id: `mst-${i + 1}`, hex, lab, ita, category: itaCategory(ita) };
});
export const MONK_SKIN_TONE_ATTRIBUTION = "Monk Skin Tone Scale by Ellis Monk and Google, licensed CC BY 4.0 (skintone.google).";

/**
 * Measured skin scattering (Jensen, Marschner, Levoy & Hanrahan, SIGGRAPH 2001, Fig. 5b; forearm skin, two subjects).
 * Reduced scattering σs′ and absorption σa in mm⁻¹, diffuse reflectance per RGB channel, refractive index η.
 * Skin also scatters strongly forward (mean cosine g ≈ 0.85, albedo ≈ 0.95 in the same paper). Grade M.
 */
export const SKIN_SCATTERING = {
  skin1: { sigmaSPrime: [0.74, 0.88, 1.01] as RGB, sigmaA: [0.032, 0.17, 0.48] as RGB, diffuse: [0.44, 0.22, 0.13] as RGB, eta: 1.3 },
  skin2: { sigmaSPrime: [1.09, 1.59, 1.79] as RGB, sigmaA: [0.013, 0.07, 0.145] as RGB, diffuse: [0.63, 0.44, 0.34] as RGB, eta: 1.3 },
  g: 0.85,
  source: "Jensen et al., A Practical Model for Subsurface Light Transport, SIGGRAPH 2001 (Fig. 5b)",
} as const;
/** Mean free path per channel (mm), 1 / (σs′ + σa): red light travels furthest under the skin. */
export const skinMeanFreePath = (s: { sigmaSPrime: readonly number[]; sigmaA: readonly number[] }): RGB =>
  [0, 1, 2].map(i => 1 / (s.sigmaSPrime[i] + s.sigmaA[i])) as RGB;

export interface SkinShadeOptions {
  /** Ambient/sky fill (0–1) and its tint (cool daylight by default). */
  ambient?: number; ambientTint?: RGB;
  /** Strength of the subsurface red band at the terminator (0 = off). */
  scatter?: number;
  /** Specular strength (skin's dielectric reflection is ~3% at normal incidence; oily skin more). */
  specular?: number;
}
/**
 * Skin colour at a light level `nl` (n·l, −1…1), for painters. Linear-light diffuse with a wrapped falloff, a soft
 * ambient fill in the shadow, and a saturated warm band at the terminator whose channel balance follows the measured
 * absorption of skin1 (red is absorbed least, so light scattered under the skin into the shadow edge is red).
 * Returns sRGB 0–1. Grade E (stylised from grade-M data).
 */
export function skinShade(baseHex: string, nl: number, o: SkinShadeOptions = {}): RGB {
  const base = toLinear(hexToRgb(baseHex));
  const amb = o.ambient ?? 0.18, tint = o.ambientTint ?? [0.97, 0.93, 0.92], scatter = o.scatter ?? 0.6;
  const wrap = Math.max(0, (nl + 0.25) / 1.25);
  // light that entered on the lit side and travelled ~2 mm under the skin: red survives, blue is absorbed (skin1 σa)
  const trans = SKIN_SCATTERING.skin1.sigmaA.map(a => Math.exp(-a * 2.4)), tmax = Math.max(...trans);
  const band = scatter * Math.exp(-((nl / 0.24) ** 2));
  const out = base.map((c, i) => c * (amb * tint[i] + (1 - amb) * wrap) * (1 - band * (1 - trans[i] / tmax) * 0.55)) as RGB;
  const spec = (o.specular ?? 0.03) * Math.pow(Math.max(0, nl), 24) * 2.5;
  return toSrgb(out.map(v => Math.min(1, v + spec)) as RGB);
}
/** A shade ramp (dark → light) for a skin tone, `steps` colours as hex. */
export function skinRamp(baseHex: string, steps = 7, o?: SkinShadeOptions): string[] {
  return Array.from({ length: steps }, (_, i) => rgbToHex(skinShade(baseHex, -0.4 + (1.4 * i) / (steps - 1), o)));
}

export type SkinZone = "forehead" | "cheeks" | "nose" | "ears" | "lips" | "beard-shadow" | "eyelids" | "under-eye" | "knuckles-elbows-knees" | "palms-soles" | "nipples-areola";
/**
 * Regional colour shifts relative to the base skin colour, in CIELAB. Painters' convention for the face's colour
 * zones (yellower forehead, redder middle third, cooler lower third in shaved men) plus anatomical facts (palms and
 * soles carry less melanin; thin, vascular skin reads redder). Scaled by tone so darker skin keeps contrast. Grade E/B.
 */
export const SKIN_ZONES: Record<SkinZone, { dL: number; da: number; db: number; note: string; grade: "B" | "E" }> = {
  "forehead": { dL: 1.5, da: -1, db: 3, note: "Slightly yellower and lighter: bone close under the skin, less blood.", grade: "E" },
  "cheeks": { dL: -1, da: 5, db: 0.5, note: "Redder: dense superficial vessels; flushes with warmth, effort, emotion.", grade: "E" },
  "nose": { dL: -1, da: 6, db: 0.5, note: "Redder, especially the tip and wings; shiny highlight on the bridge and tip.", grade: "E" },
  "ears": { dL: -2, da: 7, db: 0, note: "Thin and vascular: red, translucent against back light.", grade: "B" },
  "lips": { dL: -12, da: 14, db: 2, note: "Vermilion: thin epithelium over vessels; upper lip usually darker (faces down).", grade: "B" },
  "beard-shadow": { dL: -5, da: -2.5, db: -5, note: "Shaved men's lower face and upper lip: cool blue-green-grey from hair below the skin.", grade: "E" },
  "eyelids": { dL: -4, da: 2.5, db: -2.5, note: "Thin skin, darker and slightly violet; the crease is darker still.", grade: "E" },
  "under-eye": { dL: -5, da: 1.5, db: -3, note: "Thin skin over the orbicularis and vessels: darker, cool.", grade: "E" },
  "knuckles-elbows-knees": { dL: -3, da: 4, db: 1, note: "Creased, thicker and often darker or redder.", grade: "E" },
  "palms-soles": { dL: 8, da: 1, db: -2, note: "Less melanin in palmoplantar skin: lighter, pinker — most visible on darker skin.", grade: "B" },
  "nipples-areola": { dL: -10, da: 6, db: 2, note: "More melanin and vessels: darker, redder brown.", grade: "B" },
};
/** Colour of a skin zone for a base tone. Darker tones get proportionally stronger lightness shifts. */
export function skinZoneColor(baseHex: string, zone: SkinZone): string {
  const [L, a, b] = srgbToLab(hexToRgb(baseHex));
  const z = SKIN_ZONES[zone], k = 0.75 + (1 - L / 100) * 0.6;
  return rgbToHex(labToSrgb([L + z.dL * k, a + z.da * k, b + z.db * k]));
}

// ---- Hair ------------------------------------------------------------------------------------------------------------------------

/** Absorption per unit melanin concentration (RGB), from Chiang et al. 2016 as implemented in pbrt-v3. Grade B. */
export const EUMELANIN_SIGMA_A: RGB = [0.419, 0.697, 1.37];
export const PHEOMELANIN_SIGMA_A: RGB = [0.187, 0.4, 1.05];
/** Hair absorption coefficient for a pigment mix. */
export const hairSigmaA = (eumelanin: number, pheomelanin = 0): RGB =>
  [0, 1, 2].map(i => eumelanin * EUMELANIN_SIGMA_A[i] + pheomelanin * PHEOMELANIN_SIGMA_A[i]) as RGB;
/**
 * Painter's base colour for a hair absorption coefficient: 85% transmittance through about four fibre diameters,
 * exp(−4σa), plus 3% colourless reflection from the cuticle surface (keratin η ≈ 1.55). Linear RGB. A stylised
 * stand-in for multiple scattering that keeps pbrt's documented anchors readable (0.3 blonde, 1.3 brown, 8 black).
 * Grade E.
 */
export const hairAlbedo = (sigmaA: RGB): RGB => sigmaA.map(s => 0.85 * Math.exp(-4 * Math.max(0, s)) + 0.03) as RGB;
/**
 * pbrt-v3 compatible "reflectance" for an absorption coefficient (the inverse of SigmaAFromReflectance at azimuthal
 * roughness βn): use it to hand colours to a physically based hair BSDF, not as a flat paint colour (it is much darker).
 */
export function hairReflectanceFromSigmaA(sigmaA: RGB, betaN = 0.3): RGB {
  const d = 5.969 - 0.215 * betaN + 2.532 * betaN ** 2 - 10.73 * betaN ** 3 + 5.574 * betaN ** 4 + 0.245 * betaN ** 5;
  return sigmaA.map(s => Math.exp(-Math.sqrt(Math.max(0, s)) * d)) as RGB;
}
export interface HairColorPreset { id: string; label: string; eumelanin: number; pheomelanin: number; grade: "B" | "E" }
/** Blonde 0.3, brown 1.3 and black 8 are pbrt-v4's documented eumelanin concentrations (grade B); others estimates. */
export const HAIR_COLOR_PRESETS: readonly HairColorPreset[] = [
  { id: "black", label: "Black", eumelanin: 8, pheomelanin: 0, grade: "B" },
  { id: "dark-brown", label: "Dark brown", eumelanin: 3.2, pheomelanin: 0.1, grade: "E" },
  { id: "brown", label: "Brown", eumelanin: 1.3, pheomelanin: 0, grade: "B" },
  { id: "light-brown", label: "Light brown", eumelanin: 0.75, pheomelanin: 0.15, grade: "E" },
  { id: "dark-blonde", label: "Dark blonde", eumelanin: 0.5, pheomelanin: 0.12, grade: "E" },
  { id: "blonde", label: "Blonde", eumelanin: 0.3, pheomelanin: 0, grade: "B" },
  { id: "platinum", label: "Platinum blonde", eumelanin: 0.1, pheomelanin: 0.02, grade: "E" },
  { id: "strawberry-blonde", label: "Strawberry blonde", eumelanin: 0.25, pheomelanin: 0.45, grade: "E" },
  { id: "red", label: "Red (ginger)", eumelanin: 0.25, pheomelanin: 1.6, grade: "E" },
  { id: "auburn", label: "Auburn", eumelanin: 0.9, pheomelanin: 1.4, grade: "E" },
  { id: "white", label: "White (unpigmented)", eumelanin: 0.02, pheomelanin: 0.01, grade: "E" },
];
/** sRGB hex of hair base colour; `grey` is the fraction of unpigmented fibres (greying is a mix, not a tint). */
export function hairColorHex(eumelanin: number, pheomelanin = 0, grey = 0): string {
  const c = hairAlbedo(hairSigmaA(eumelanin, pheomelanin)), w = hairAlbedo(hairSigmaA(0.02, 0.01));
  return rgbToHex(toSrgb(c.map((v, i) => v * (1 - grey) + w[i] * grey) as RGB));
}

/**
 * Marschner et al. 2003 highlight lobes (recommended ranges): the primary reflection R is white and shifted toward the
 * root by αR (−10° to −5°), width βR 5–10°; the secondary TRT is tinted by the hair colour, shifted toward the tip by
 * −1.5 αR and twice as wide; TT (back-lit glow) is shifted by −αR/2, half as wide. Grade B.
 */
export const HAIR_HIGHLIGHTS = { alphaR: -7, betaR: 7.5, alphaTT: 3.5, betaTT: 3.75, alphaTRT: 10.5, betaTRT: 15 } as const;
/**
 * Shade one hair segment: Kajiya–Kay diffuse plus the two shifted Marschner lobes. `t` tangent (root → tip), `l` light
 * and `v` view directions (unit). Returns linear RGB for a hair of base colour `albedo` (linear).
 */
export function shadeHair(t: number[], l: number[], v: number[], albedo: RGB, light = 1): RGB {
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tl = dot(t, l), tv = dot(t, v);
  const diffuse = Math.sqrt(Math.max(0, 1 - tl * tl));
  // longitudinal half angle θh = (θi + θr)/2 with sinθ = t·dir
  const th = (Math.asin(Math.max(-1, Math.min(1, tl))) + Math.asin(Math.max(-1, Math.min(1, tv)))) / 2 * 180 / Math.PI;
  const g = (x: number, mu: number, w: number) => Math.exp(-(((x - mu) / w) ** 2) / 2);
  const H = HAIR_HIGHLIGHTS;
  const r = 0.16 * g(th, H.alphaR, H.betaR), trt = 0.22 * g(th, H.alphaTRT, H.betaTRT);
  const lit = Math.max(0, tl < 1 ? diffuse : 0);
  return albedo.map(c => light * (c * (0.22 + 0.78 * lit) * 0.9 + (r + trt * c) * lit)) as RGB;
}

// ---- Eyes ------------------------------------------------------------------------------------------------------------------------

export interface IrisColor { id: string; label: string; inner: string; outer: string; limbal: string; grade: "E" }
/**
 * Iris palette for drawing (grade E): eye colour comes from stromal melanin — brown irises have much, blue little
 * (blue is structural scattering, not pigment). Inner = near the pupil (collarette), outer = periphery, limbal = the
 * darker ring at the edge.
 */
export const IRIS_COLORS: readonly IrisColor[] = [
  { id: "dark-brown", label: "Dark brown", inner: "#3a2414", outer: "#2a1a10", limbal: "#140d08", grade: "E" },
  { id: "brown", label: "Brown", inner: "#6b4122", outer: "#4a2e18", limbal: "#22150c", grade: "E" },
  { id: "amber", label: "Amber", inner: "#a8702c", outer: "#7c5222", limbal: "#33220f", grade: "E" },
  { id: "hazel", label: "Hazel", inner: "#8a6230", outer: "#5f7044", limbal: "#2a2a18", grade: "E" },
  { id: "green", label: "Green", inner: "#8b7a3c", outer: "#4f7550", limbal: "#1f2e22", grade: "E" },
  { id: "grey", label: "Grey", inner: "#9aa0a0", outer: "#7a8890", limbal: "#2e3438", grade: "E" },
  { id: "blue", label: "Blue", inner: "#8aa3b5", outer: "#4f7da6", limbal: "#1c2e40", grade: "E" },
];
export const EYE_NOTES: readonly string[] = [
  "Pupil diameter about 2–4 mm in bright light and 4–8 mm in the dark (grade B); a small pupil reads alert, a large one soft.",
  "The iris is a shallow cone behind a clear cornea: the catch-light sits on the cornea, usually in the upper quadrant toward the light, and the iris is lightest on the side away from the light (light passes through and lights the far side).",
  "The upper lid casts a shadow across the top of the iris and sclera; the upper lid edge also has thickness (a light lower ledge).",
  "The sclera is never pure white: it is greyer and warmer than the highlight, darker in the corners and under the upper lid, with faint vessels toward the corners.",
];
