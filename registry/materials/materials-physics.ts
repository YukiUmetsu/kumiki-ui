/**
 * MATL1 construction: a material record turned into what a painter or a renderer needs. Colours in sRGB, lightness
 * (the painter's value), reflectance, a standard PBR material for any renderer, the material wet, aged along its
 * weathering track or worn, and how wide its highlight spreads.
 */
import type { MaterialRecord, WeatheringStage, WeatheringTrack } from "./materials-data";
import { MATERIALS, WEATHERING, WET } from "./materials-data";

export type RGB = readonly [number, number, number];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** A material by id. */
export const findMaterial = (id: string) => MATERIALS.find(m => m.id === id);

// ---- Colour ------------------------------------------------------------------------------------------------------------

/** Linear light to an sRGB channel 0–1 (the sRGB transfer function). */
export const encodeSrgb = (v: number) => { const x = clamp(v); return x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055; };
/** An sRGB channel 0–1 to linear light. */
export const decodeSrgb = (c: number) => (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
/** Linear RGB to an sRGB hex colour. */
export const toHex = (rgb: RGB) => `#${rgb.map(v => Math.round(encodeSrgb(v) * 255).toString(16).padStart(2, "0")).join("")}`;
/** An sRGB hex colour to linear RGB. */
export const fromHex = (hex: string): RGB => [1, 3, 5].map(i => decodeSrgb(parseInt(hex.slice(i, i + 2), 16) / 255)) as unknown as RGB;
/** Relative luminance (Rec. 709 weights) of linear RGB. */
export const luminance = (rgb: RGB) => .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
/** CIE 1976 lightness L* (0 black to 100 white) of linear RGB: the painter's value, on a perceptual scale. */
export const lightness = (rgb: RGB) => { const y = clamp(luminance(rgb)); return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : y * 24389 / 27; };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---- Reflectance -------------------------------------------------------------------------------------------------------

/** Reflectance at normal incidence: a metal's own colour; for a dielectric ((n − 1)/(n + 1))², about 4% at n = 1.5. */
export function f0(m: MaterialRecord): RGB {
  if (m.metal) return m.albedo;
  const n = m.ior ?? 1.5, r = ((n - 1) / (n + 1)) ** 2;
  return [r, r, r];
}
/**
 * How wide a highlight spreads, in degrees (half-width): the GGX distribution's α = roughness², and a highlight
 * spreads about 2·atan(α) around the mirror direction (estimated rule of thumb). Polished lacquer gives a tight spot,
 * plaster none at all.
 */
export const highlightSpread = (roughness: number) => 2 * Math.atan(clamp(roughness) ** 2) * 180 / Math.PI;

/** The parameters of a standard metalness–roughness material (three.js MeshStandardMaterial, glTF, Blender Principled). */
export interface StandardMaterialParams { color: string; metalness: number; roughness: number; ior?: number; name: string }
/** A material as standard PBR parameters: base colour in sRGB, metalness, roughness (typical unless given). */
export function toStandardMaterial(m: MaterialRecord, roughness: number | "min" | "typical" | "max" = "typical"): StandardMaterialParams {
  const r = typeof roughness === "number" ? roughness : m.roughness[roughness];
  return { name: m.name, color: toHex(m.albedo), metalness: m.metal, roughness: clamp(r), ior: m.ior };
}

// ---- Wet ---------------------------------------------------------------------------------------------------------------

/**
 * The diffuse reflectance of a water–air surface for light from all directions, and the share of light from inside
 * the water that is reflected back down, for n = 1.333 (computed from Fresnel; estimated).
 */
export const WATER_FILM = { external: .066, internal: 1 - (1 - .066) / WET.n ** 2 };
/**
 * A porous surface wet: water traps light by internal reflection, so A_wet = (1 − Rₑ)(1 − Rᵢ) A / (1 − Rᵢ A), after
 * the Ångström–Lekner–Dorf model (the exact form is estimated; it gives 0.098 for Ångström's sand, measured 0.091,
 * and 0.074 for black mould, measured 0.084). A water film also makes it glossy. Non-porous materials only gain
 * gloss. `wetness` 0 dry to 1 soaked with a film.
 */
export function wetMaterial(m: MaterialRecord, wetness: number) {
  const w = clamp(wetness), Re = WATER_FILM.external, Ri = WATER_FILM.internal;
  const soaked = m.albedo.map(a => (1 - Re) * (1 - Ri) * a / (1 - Ri * a)) as unknown as RGB;
  const albedo = m.porous && !m.metal ? mix(m.albedo, soaked, w) : m.albedo;
  const roughness = m.roughness.typical + (Math.min(m.roughness.typical, .1) - m.roughness.typical) * w * (m.porous ? .8 : 1);
  return { albedo, roughness, darkening: luminance(albedo) / Math.max(1e-6, luminance(m.albedo)) };
}

// ---- Weathering --------------------------------------------------------------------------------------------------------

/**
 * A material along its weathering track at an age (years): the colour, roughness and metalness between the stages
 * either side. Copper runs on a clock of 20 years to green, scaled by the environment's years (marine about 8).
 */
export function weathered(track: WeatheringTrack, years: number, environment?: string) {
  const w = WEATHERING[track], env = environment && w.environments?.[environment];
  const age = Math.max(0, years) * (env ? 20 / env : 1), st = w.stages;
  let a: WeatheringStage = st[0], b: WeatheringStage = st[0], t = 0;
  if (age >= st[st.length - 1].at) a = b = st[st.length - 1];
  else for (let i = 0; i < st.length - 1; i++) if (age >= st[i].at && age < st[i + 1].at) { a = st[i]; b = st[i + 1]; t = (age - a.at) / (b.at - a.at); break; }
  // Ease between stages, so a change starts slowly and settles.
  const e = t * t * (3 - 2 * t);
  return { albedo: mix(a.albedo, b.albedo, e), roughness: a.roughness + (b.roughness - a.roughness) * e, metal: (e < .5 ? a.metal : b.metal) ?? 0, label: e < .5 ? a.label : b.label, from: a, to: b };
}

/**
 * Red-over-black lacquer worn by handling: `exposure` 0 (sheltered) to 1 (a rim or handle) and age in years; the
 * share of black showing (estimated: rims show black within a few decades of daily use).
 */
export const lacquerWear = (exposure: number, years: number) => clamp(exposure ** 1.5 * years / 40);

/** Materials sorted by lightness, darkest first: a value ladder. */
export const valueLadder = (list: readonly MaterialRecord[] = MATERIALS) => [...list].map(m => ({ m, L: lightness(m.metal ? mix(m.albedo, [0, 0, 0], .4) : m.albedo) })).sort((x, y) => x.L - y.L);
