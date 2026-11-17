/**
 * MAKEUP1 colour: colour difference, undertone, the pigment-film model and the palette rules a makeup artist uses,
 * stated as numbers on a skin's CIELAB colour.
 *
 * Grades as in ANAT1: M measured, B standard fact, E estimate for drawing. The Python pipeline
 * (scripts/makeup/kumiki_makeup/color.py) has the same undertone split and film model.
 */
import type { Lab, RGB } from "./anatomy-color";
import { hexToRgb, itaCategory, itaDegrees, labToSrgb, rgbToHex, srgbToLab, toLinear, toSrgb } from "./anatomy-color";
import type { ItaCategory } from "./anatomy-color";

export const labToLinear = (lab: Lab): RGB => toLinear(labToSrgb(lab));
export const linearToLab = (c: RGB): Lab => srgbToLab(toSrgb(c.map(v => Math.min(1, Math.max(0, v))) as RGB));
export const hexToLab = (hex: string): Lab => srgbToLab(hexToRgb(hex));
export const labToHex = (lab: Lab): string => rgbToHex(labToSrgb(lab));

/** CIELAB to lightness, chroma, hue angle (degrees) and back. */
export const lch = ([L, a, b]: Lab): [number, number, number] => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
export const fromLch = (L: number, C: number, h: number): Lab => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). About 1 is a just-noticeable difference side by side. */
export function deltaE2000(l1: Lab, l2: Lab): number {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2, rad = Math.PI / 180;
  const Cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = ((Math.atan2(b1, a1p) / rad) + 360) % 360, h2p = ((Math.atan2(b2, a2p) / rad) + 360) % 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) dhp = Math.abs(h2p - h1p) <= 180 ? h2p - h1p : h2p - h1p > 180 ? h2p - h1p - 360 : h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lpm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
  const hpm = C1p * C2p === 0 ? h1p + h2p : Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad) + 0.32 * Math.cos((3 * hpm + 6) * rad) - 0.2 * Math.cos((4 * hpm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2), Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T, Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

// ---- Undertone ----------------------------------------------------------------------------------------------------

export type Undertone = "cool" | "neutral" | "warm" | "olive";
/**
 * Cheek skin of 960 adults measured by spectrophotometer (Xiao et al. 2017, Skin Res. Technol. 23:21, Table 2): hue
 * angles 51.0 (Caucasian), 51.2 (Chinese), 53.5 (Kurdish), 58.6 (Thai) degrees; pooled with the within-group spread,
 * 53.6 +/- 7.7. Its terciles split cool, neutral and warm; low redness with normal yellowness is olive. No study has
 * validated colorimetric undertone classes, so the split is an estimate (grade E). Camera colour balance moves a
 * photo's hue, so classify a photo only after white balance.
 */
export const UNDERTONE_REF = { hueMean: 53.6, hueSd: 7.7, coolBelow: 50.3, warmAbove: 56.9, oliveABelow: 8.9,
  source: "Xiao et al. 2017, Skin Research and Technology 23:21-29, Table 2 (cheek)", url: "https://eprints.whiterose.ac.uk/id/eprint/100718/" } as const;
export interface SkinReading { lab: Lab; hex: string; ita: number; category: ItaCategory; undertone: Undertone; hue: number; chroma: number; z: number }
/** Depth (ITA, Chardon 1991) and undertone of a skin colour. */
export function readSkin(skin: string | Lab): SkinReading {
  const lab = typeof skin === "string" ? hexToLab(skin) : skin, [L, C, h] = lch(lab), z = (h - UNDERTONE_REF.hueMean) / UNDERTONE_REF.hueSd;
  const undertone: Undertone = lab[1] < UNDERTONE_REF.oliveABelow && lab[2] >= 13 && L >= 35 && L <= 72 && h > UNDERTONE_REF.coolBelow ? "olive"
    : h < UNDERTONE_REF.coolBelow ? "cool" : h > UNDERTONE_REF.warmAbove ? "warm" : "neutral";
  const ita = itaDegrees(lab);
  return { lab, hex: labToHex(lab), ita, category: itaCategory(ita), undertone, hue: h, chroma: C, z };
}

// ---- Pigment films --------------------------------------------------------------------------------------------------

/** How a layer meets the skin: the pigment film (default), or the designer's blend modes (film with hide 0 or 1,
 * screen, soft light). */
export type BlendMode = "film" | "multiply" | "normal" | "screen" | "soft-light";

/**
 * A product is a thin pigment film over skin (data/makeup-zones.json 'film'). At strength w it reflects w*hide*m
 * itself and filters the rest: skin <- skin*((1-w) + w*(1-hide)*m). hide 0 is a stain (a multiply blend), hide 1 opaque
 * paint (a normal blend). m is the product's colour over white, linear RGB. Two-flux simplification of Kubelka-Munk.
 */
export function filmStep(skin: RGB, film: RGB, w: number, m: RGB, hide: number): void {
  for (let k = 0; k < 3; k++) {
    const pass = (1 - w) + w * (1 - hide) * m[k];
    skin[k] *= pass;
    film[k] = film[k] * pass + w * hide * m[k];
  }
}
/** The pigment whose film at full strength turns `base` into `apparent` (linear RGB), clamped to what pigment can do. */
export function pigmentFor(apparent: RGB, base: RGB, hide: number): RGB {
  return apparent.map((a, k) => Math.min(1, Math.max(0, a / Math.max(1e-4, hide + (1 - hide) * base[k])))) as RGB;
}

// ---- Palettes -------------------------------------------------------------------------------------------------------

export interface Swatch { id: string; label: string; lab: Lab; hex: string; why: string; grade: "M" | "B" | "E" }
const sw = (id: string, label: string, lab: Lab, why: string, grade: Swatch["grade"]): Swatch => ({ id, label, lab: [lab[0], lab[1], lab[2]], hex: labToHex(lab), why, grade });
const clampL = (L: number) => Math.min(96, Math.max(6, L));

/** Measured healthy-skin preference: observers shifted whole-face colour by dL* +1.21, da* +1.62, db* +5.25 to look
 * healthiest (51 Caucasian faces; Stephen, Law Smith, Stirrat & Perrett 2009). Grade M (direction); amounts used are
 * a share of it. */
export const HEALTHY_SHIFT = { dL: 1.21, da: 1.62, db: 5.25, source: "Stephen, Law Smith, Stirrat & Perrett 2009, Int. J. Primatol. 30:845", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2780675" } as const;

/** The base products for a skin: foundation match, concealer, corrector, contour, bronzer, highlight. */
export function basePalette(skin: string | Lab, o: { warmth?: number; underEye?: Lab } = {}): Record<"foundation" | "concealer" | "corrector" | "contour" | "bronzer" | "highlight", Swatch> {
  const s = readSkin(skin), [L, C, h] = lch(s.lab), deep = L < 45, warmth = o.warmth ?? 0.3;
  const found: Lab = [s.lab[0] + HEALTHY_SHIFT.dL * warmth, s.lab[1] + HEALTHY_SHIFT.da * warmth, s.lab[2] + HEALTHY_SHIFT.db * warmth];
  // dark circles: blue-purple shadows take peach (light skin) or orange-red (deep skin); redness takes green
  const ue = o.underEye ?? [s.lab[0] - 5, s.lab[1] + 1, s.lab[2] - 3];
  const corr: Lab = ue[1] - s.lab[1] > 3 ? fromLch(clampL(L + 4), 14, 140) : deep ? fromLch(clampL(L + 6), 42, 42) : fromLch(clampL(L + 6), 28, 55);
  const hl: Lab = deep ? fromLch(clampL(L + 16), Math.max(30, C + 12), 70) : s.undertone === "cool" ? fromLch(clampL(L + 12), Math.max(4, C * 0.35), h - 25)
    : fromLch(clampL(L + 11), Math.max(12, C * 0.8), 78);
  return {
    foundation: sw("foundation", "Foundation", found, `Matches the skin (aim for CIEDE2000 below 2.5) with ${Math.round(warmth * 100)}% of the measured healthy shift (Stephen et al. 2009: more yellow, a little redder and lighter).`, "M"),
    concealer: sw("concealer", "Concealer", [clampL(s.lab[0] + 5), s.lab[1] - 0.5, s.lab[2] + 2.5], "One to two shades lighter and a little warmer than the foundation: lighter periorbital skin reads healthier (Jones et al. 2016 used +/-4.8 L*).", "M"),
    corrector: sw("corrector", "Colour corrector", corr, ue[1] - s.lab[1] > 3 ? "Green cancels redness (complementary hues mix toward grey)." : deep ? "Orange-red cancels blue-purple shadows on deep skin; peach would turn ashy." : "Peach cancels blue-purple shadows on light skin.", "B"),
    contour: sw("contour", "Contour", fromLch(clampL(L - (deep ? 9 : 11)), C * 0.7, h - 6), "Deeper, greyer and a little cooler than the skin, like a shadow (contour imitates shade; bronzer imitates sun).", "E"),
    bronzer: sw("bronzer", "Bronzer", fromLch(clampL(L - 5), C * 1.3 + 3, h + 4), "A little deeper and warmer than the skin, like a tan, for the planes the sun reaches.", "E"),
    highlight: sw("highlight", "Highlight", hl, deep ? "Gold-bronze: a white or pearl highlight looks ashy on deep skin." : s.undertone === "cool" ? "Pearl or pink-champagne for a cool skin." : "Champagne-gold for a neutral or warm skin.", "E"),
  };
}

/** Blush and lip families with the hue that suits each undertone (makeup-artist convention, grade E); chroma rises
 * with depth so colour does not turn chalky on deep skin. */
export const BLUSH_FAMILIES = {
  rose: { hue: 12, chroma: 30, suits: ["cool", "neutral"] }, berry: { hue: 358, chroma: 34, suits: ["cool"] }, mauve: { hue: 350, chroma: 18, suits: ["cool", "neutral", "olive"] },
  peach: { hue: 50, chroma: 32, suits: ["warm", "neutral"] }, coral: { hue: 34, chroma: 40, suits: ["warm"] }, terracotta: { hue: 40, chroma: 34, suits: ["olive", "warm"] },
} as const satisfies Record<string, { hue: number; chroma: number; suits: readonly Undertone[] }>;
export type BlushFamily = keyof typeof BLUSH_FAMILIES;
export const LIP_FAMILIES = {
  nude: { L: 0, hue: 0, chroma: 0, note: "Close to the skin: a little deeper, a little rosier than the lips." },
  pink: { L: 64, hue: 4, chroma: 38, note: "Light, cool, saturated." },
  rose: { L: 52, hue: 14, chroma: 36, note: "Mid-tone rose." },
  coral: { L: 60, hue: 32, chroma: 50, note: "Warm orange-pink." },
  "blue-red": { L: 36, hue: 24, chroma: 55, note: "A red leaning blue: makes teeth look whiter; suits cool undertones." },
  "orange-red": { L: 45, hue: 36, chroma: 62, note: "A red leaning orange: suits warm undertones." },
  berry: { L: 30, hue: 6, chroma: 42, note: "Deep red-purple." },
  plum: { L: 24, hue: 352, chroma: 24, note: "Deep purple-brown." },
  brown: { L: 40, hue: 45, chroma: 22, note: "Warm brown." },
} as const;
export type LipFamily = keyof typeof LIP_FAMILIES;
export const RED_FOR: Record<Undertone, LipFamily> = { cool: "blue-red", neutral: "blue-red", warm: "orange-red", olive: "orange-red" };
export const BLUSH_FOR: Record<Undertone, BlushFamily> = { cool: "rose", neutral: "rose", warm: "peach", olive: "terracotta" };

/** How a blush family should look on this skin (the change it makes at full strength, not the pan colour). */
export function blushOn(skin: Lab, family: BlushFamily, strength = 1): Lab {
  const f = BLUSH_FAMILIES[family], [L, C, h] = lch(skin), deep = L < 45;
  // a translucent flush: the skin's own hue moves most of the way to the family's, chroma rises (more on deep skin)
  const dh = ((f.hue - h + 540) % 360) - 180, k = Math.min(1, strength);
  return fromLch(clampL(L - (deep ? 3 : 6) * k), C + (f.chroma + (deep ? 8 : 0) - C) * 0.8 * k, h + dh * 0.75 * k);
}
/** A lipstick colour (over white) for a family on this skin: nude follows the skin; the rest are fixed hues whose
 * lightness follows the skin's depth (lighter skins wear the family's own value; deep skins a deeper, richer one). */
export function lipColour(skin: Lab, family: LipFamily): Lab {
  const f = LIP_FAMILIES[family], [L, C, h] = lch(skin);
  if (family === "nude") return fromLch(clampL(L - 10), C + 10, h - 18);
  const depth = Math.max(0, 55 - L) * 0.35;
  return fromLch(clampL(f.L - depth), f.chroma + depth * 0.4, f.hue);
}

/** Iris hues and the eyeshadow families that contrast with them (complementary on the hue circle; convention, grade E). */
export const EYE_COMPLEMENTS: Record<string, { shadow: Lab; label: string; why: string }> = {
  blue: { shadow: [48, 22, 34], label: "copper-bronze", why: "Orange is opposite blue: copper and bronze make blue irises look bluer." },
  grey: { shadow: [42, 16, 6], label: "plum-taupe", why: "Warm plum and taupe give grey irises a hint of blue by contrast." },
  green: { shadow: [36, 26, -4], label: "plum-burgundy", why: "Red-violet is opposite green: plum and burgundy deepen green irises." },
  hazel: { shadow: [44, 6, 26], label: "olive-gold", why: "Olive and gold pick up the gold in hazel; purple brings out the green." },
  brown: { shadow: [32, 10, 14], label: "espresso-bronze", why: "Brown irises suit most families; navy, plum and bronze add contrast." },
  "dark-brown": { shadow: [30, 8, 10], label: "espresso", why: "Very dark irises take deep neutrals and jewel tones (navy, emerald, plum)." },
};

/** The complement family for an iris id (ANAT1's IRIS_TYPES or the older six colours). */
export function irisFamily(id: string): keyof typeof EYE_COMPLEMENTS {
  if (/blue/.test(id)) return "blue";
  if (/grey/.test(id)) return id === "grey-green" ? "green" : "grey";
  if (/green|heterochromia/.test(id)) return "green";
  if (/hazel|amber|light-brown/.test(id)) return "hazel";
  if (/black|dark/.test(id)) return "dark-brown";
  return "brown";
}

/** Brow pencil for a hair colour: dark hair one to two shades lighter, light hair one to two shades darker (convention, grade E). */
export function browColour(hair: Lab): Lab {
  const [L, C, h] = lch(hair);
  return fromLch(L < 30 ? L + 7 : clampL(L - 12), Math.min(C, 22), h);
}
