/**
 * MAKEUP1 knowledge: what makeup does to how a face reads, where it goes on each face, and named looks built from it.
 *
 * Every rule names its grade and source:
 *   reported   quoted from a study
 *   learned    measured by this pack's Python pipeline on openly licensed photographs (data/makeup-learned.json)
 *   convention makeup-artist and cosmetology practice, consistent across sources, not tested experimentally
 *   estimated  an amount chosen within what the sources support
 */
import type { BlendMode, BlushFamily, LipFamily } from "./makeup-color";
import type { FinishId, ProductId, ZoneAdjust } from "./makeup-zones";
import learnedJson from "./data/makeup-learned.json";

export interface MakeupEvidence { id: string; grade: "reported" | "learned" | "convention" | "estimated"; finding: string; appliedAs: string; source: string; url: string }

/** The learned data (Python pipeline): bare-skin prior, makeup effects, placement, contrast, beauty correlations. */
export interface LearnedStat { median: number; p25: number; p75: number }
export interface MakeupLearned {
  counts: { bare: number; made_up: number; rated: number };
  prior: Record<string, { dL: number; da: number; db: number; n: number }>;
  effects: Record<string, { n: number; dL: LearnedStat; da: LearnedStat; db: LearnedStat }>;
  effects_by_style: Record<string, Record<string, { n: number; dL: LearnedStat; da: LearnedStat; db: LearnedStat }>>;
  placement: Record<string, { n: number; centroid_ew: [number, number]; angle_deg: number; spread_ew: [number, number] }>;
  contrast: Record<"bare" | "made_up", Record<"brows" | "eyes" | "lips", Record<"L" | "a" | "b", LearnedStat & { n: number }>>>;
  palettes: Record<"lips" | "lids", { hex: string; lab: [number, number, number]; style: string | null }[]>;
  beauty: Record<"female" | "male", { feature: string; r: number; ci95: [number, number]; p: number; n: number }[]>;
  shape_reference: Record<string, number>;
  finish_thresholds: Record<string, number>;
  sources: { id: string; licence: string; credit: string; url: string; makeup: boolean | null; style: string | null }[];
  about: string; generated: string;
}
export const MAKEUP_LEARNED = learnedJson as unknown as MakeupLearned;

const pct = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}`;
/** A learned beauty correlation, as text: "r = -0.40, p = 0.004". */
export const learnedR = (sex: "female" | "male", feature: string): string => {
  const row = MAKEUP_LEARNED.beauty[sex].find(r => r.feature === feature);
  return row ? `r = ${row.r.toFixed(2)}, p = ${row.p < 0.001 ? "< 0.001" : row.p.toFixed(3)}` : "not measured";
};
const fx = (z: string) => MAKEUP_LEARNED.effects[z];
const con = (s: "bare" | "made_up", f: "brows" | "eyes" | "lips") => MAKEUP_LEARNED.contrast[s][f].L.median.toFixed(2);

export const MAKEUP_EVIDENCE: readonly MakeupEvidence[] = [
  { id: "eyes-first", grade: "reported", finding: "Ten women photographed bare, with foundation, eye, lip or full makeup: women judged eye makeup the largest single contributor to a full makeover; for men, foundation and eye makeup both mattered.",
    appliedAs: "Looks put their contrast in the eyes first; foundation evens tone in every look.", source: "Mulhern, Fieldman, Hussey, Leveque & Pineau 2003, Int. J. Cosmet. Sci. 25(4):199-205 (as summarised in its abstract)", url: "https://www.scilit.net/publications/31f2e7e4c2b87b139d1cced69fcdfcc2" },
  { id: "contrast", grade: "reported", finding: "Women's faces have greater luminance contrast between the eyes and lips and the surrounding skin than men's; makeup increases it.",
    appliedAs: "Lips and eyes are darkened against an evened, slightly lightened skin; checkMakeup reports the lip contrast.", source: "Russell 2009, Perception 38:1211", url: "https://doi.org/10.1068/p6331" },
  { id: "night-out", grade: "reported", finding: "44 women made up for a night out: eye luminance contrast rose (d = 1.46), mouth contrast rose, brow contrast fell (d = 0.52); the skin under the brow darkened by about 6 L*.",
    appliedAs: "Lid and crease shades about 6-15 L* below the skin; brows filled, not blackened.", source: "Jones, Russell & Ward 2015, Evol. Psychol. 13:210", url: "https://doi.org/10.1177/147470491501300113" },
  { id: "age-contrast", grade: "reported", finding: "Facial contrast falls with age; faces with contrast raised were judged younger in 93% of forced choices (about 1.3 years).",
    appliedAs: "Defined brows, eyes and lips keep a face's contrast; the intensity control scales it.", source: "Porcheron, Mauger & Russell 2013, PLoS ONE 8:e57985", url: "https://doi.org/10.1371/journal.pone.0057985" },
  { id: "health-colour", grade: "reported", finding: "Observers made faces look healthiest by raising skin yellowness (db* +5.25), redness (da* +1.62) and lightness (dL* +1.21).",
    appliedAs: "Foundation carries a share of this shift (default 30%); blush adds redness on the cheeks.", source: "Stephen, Law Smith, Stirrat & Perrett 2009, Int. J. Primatol. 30:845", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2780675" },
  { id: "cheeks-periorbital", grade: "reported", finding: "Cheek redness and periorbital lightness each raised perceived health (manipulations of about +/-4.8 L* and a*, about half an SD).",
    appliedAs: "Blush about +5 a* (natural) to +10 (evident); concealer about +5 L* under the eyes.", source: "Jones, Porcheron, Sweda, Morizot & Russell 2016, Body Image 17:57", url: "https://doi.org/10.1016/j.bodyim.2016.02.001" },
  { id: "lip-red", grade: "reported", finding: "Raising lip redness contrast made women's faces look more feminine and attractive and lowering it made men's faces look more masculine.",
    appliedAs: "Lipstick reddens against the skin; the grooming look keeps the lips' own colour.", source: "Stephen & McKeegan 2010, Perception 39:1104", url: "https://doi.org/10.1068/p6730" },
  { id: "eye-size", grade: "reported", finding: "Eyeliner or mascara makes eyes look up to 6% larger (13% in area), their effects do not add; eyeshadow about 5%.",
    appliedAs: "Liner and mascara in every eye look; heavy liner is not stacked for size.", source: "Matsushita, Morikawa & Yamanami 2015, J. Cosmet. Sci. 66:161", url: "https://library.scconline.org/v066n03/17" },
  { id: "feature-size", grade: "reported", finding: "With makeup, eyes and brows looked larger; professionally applied makeup (contouring) made the nose look smaller; lips barely changed.",
    appliedAs: "Nose contour in sculpted looks; brows defined.", source: "Jones, Porcheron & Russell 2018, Psychol. Aesthet. Creat. Arts 12:359", url: "https://doi.org/10.1037/aca0000152" },
  { id: "dose", grade: "reported", finding: "All three professional looks raised attractiveness at a 250 ms glance; with unlimited viewing, the natural and professional looks still raised it, the high-contrast glamour look lost trust.",
    appliedAs: "Intensity 1 is a professional look; glamour looks are labelled as such.", source: "Etcoff, Stock, Haley, Vickery & House 2011, PLoS ONE 6:e25656", url: "https://doi.org/10.1371/journal.pone.0025656" },
  { id: "learned-effects", grade: "learned", finding: `In ${MAKEUP_LEARNED.counts.made_up} CC0 made-up portraits against ${MAKEUP_LEARNED.counts.bare} bare faces, makeup sat mostly in the eyes and lips: lips ${pct(fx("lips").dL.median)} L* / ${pct(fx("lips").da.median)} a*, liner ${pct(fx("liner").dL.median)} L*, outer V ${pct(fx("outer-v").dL.median)} L*, brows ${pct(fx("brow").dL.median)} L*; cheek contour only ${pct(fx("cheek-contour").dL.median)} L*.`,
    appliedAs: "Everyday looks keep sculpting subtle; the sculpted look is labelled editorial.", source: "MAKEUP1 pipeline, data/makeup-learned.json", url: "https://doi.org/10.6084/m9.figshare.5047666.v5" },
  { id: "learned-contrast", grade: "learned", finding: `Facial contrast (Porcheron's formula, L*): lips ${con("bare", "lips")} bare against ${con("made_up", "lips")} made up; eyes ${con("bare", "eyes")} against ${con("made_up", "eyes")}; brows ${con("bare", "brows")} against ${con("made_up", "brows")}. Different people and cameras, so a direction, not an effect size.`,
    appliedAs: "checkMakeup compares a plan's lip contrast with these ranges.", source: "MAKEUP1 pipeline, data/makeup-learned.json", url: "" },
  { id: "learned-beauty", grade: "learned", finding: `Among the women of the Face Research Lab London Set (n = ${MAKEUP_LEARNED.beauty.female[0]?.n ?? 0}; 2,513 raters), rated attractiveness rose with a narrower jaw for the cheek width (${learnedR("female", "shape jaw_cheek")}) and with more even skin redness (${learnedR("female", "skin evenness sd a*")}). Exploratory: 18 features tested per sex.`,
    appliedAs: "Foundation evens redness first; contour narrows the jaw only in sculpted looks.", source: "MAKEUP1 pipeline on DeBruine & Jones 2017 (CC BY 4.0)", url: "https://doi.org/10.6084/m9.figshare.5047666.v5" },
  { id: "evenness", grade: "reported", finding: "Homogeneous skin colour is related to perceived youth, health and attractiveness.",
    appliedAs: "Foundation's job is evenness, not a mask: it evens colour and keeps relief.", source: "Matts, Fink, Grammer & Burquest 2007, J. Am. Acad. Dermatol. 57:977", url: "https://doi.org/10.1016/j.jaad.2007.07.040" },
  { id: "brow-peak", grade: "reported", finding: "Observers preferred the brow peak at 71% of the eye width from the inner corner, roughly the lateral limbus (a study with many raters but fewer than 10 photographs). Makeup artist Westmore put the peak above the lateral limbus; Byrd on the line from the nose wing through it; Cook et al. 1989 above the lateral canthus, as a more medial peak looks surprised.",
    appliedAs: "The atlas puts the brow peak at 71% of the eye width and the tail on the line from the nose wing through the outer canthus.", source: "Griffin & Kim, Ideal Female Brow Aesthetics, Clin. Plast. Surg. (review)", url: "https://doi.org/10.1016/j.cps.2012.07.003" },
  { id: "undertone", grade: "estimated", finding: "Cheek hue angle 53.6 +/- 7.7 degrees across four populations (spectrophotometer, 960 adults); its terciles split cool, neutral and warm.",
    appliedAs: "readSkin classifies undertone; blush, lip red and highlight follow it.", source: "Xiao et al. 2017, Skin Res. Technol. 23:21 (data); split estimated", url: "https://eprints.whiterose.ac.uk/id/eprint/100718/" },
  { id: "light-shadow", grade: "convention", finding: "Light advances and shadow recedes: contour (a cool, greyed shade) goes in the hollows that should recede, highlight (light, reflective) on the planes that should come forward.",
    appliedAs: "The atlas's contour, highlight and bronzer zones; contour colour = skin darker, greyer, cooler.", source: "Chiaroscuro in portrait painting; professional makeup practice (Aucoin 1997, Making Faces)", url: "" },
];

export type FaceShape = "oval" | "round" | "square" | "oblong" | "heart" | "diamond" | "triangle";
/** Face-shape placement (cosmetology convention, grade 'convention'): changes to zones, the blush style, extra zones. */
export const FACE_SHAPE_RULES: Record<FaceShape, { note: string; contour?: ZoneAdjust; blush: string; blushAdjust?: ZoneAdjust; add?: { zone: string; coverage: number }[]; skip?: string[] }> = {
  oval: { note: "Balanced: a soft sculpt under the cheekbone; blush on the apples blended up.", blush: "blush-apples" },
  round: { note: "Add angles and length: a steeper, longer contour; blush lifted toward the temples; shade the temples and jaw.", contour: { rotate: -9, scale: 1.08 }, blush: "blush-lifted", add: [{ zone: "temple-contour", coverage: 0.5 }, { zone: "jaw-contour", coverage: 0.45 }] },
  square: { note: "Soften the corners: shade the jaw angles, round blush on the apples.", blush: "blush-apples", add: [{ zone: "jaw-contour", coverage: 0.6 }] },
  oblong: { note: "Add width: a more horizontal contour and blush across the apples; no highlight on the chin.", contour: { rotate: 8 }, blush: "blush-apples", blushAdjust: { scale: 1.1 }, skip: ["chin-highlight"] },
  heart: { note: "Narrow the top: shade the temples; keep the jaw and chin light.", blush: "blush-apples", add: [{ zone: "temple-contour", coverage: 0.6 }], skip: ["jaw-contour"] },
  diamond: { note: "Widen the forehead and chin: highlight both; contour only the cheekbones' outer tips.", contour: { scale: 0.85 }, blush: "blush-draped", add: [{ zone: "forehead-highlight", coverage: 0.6 }, { zone: "chin-highlight", coverage: 0.6 }] },
  triangle: { note: "Balance a wide jaw: shade the jaw, highlight the forehead.", blush: "blush-lifted", add: [{ zone: "jaw-contour", coverage: 0.6 }, { zone: "forehead-highlight", coverage: 0.5 }] },
};

/** Eye placement (convention): spacing against one eye width, tilt. */
export const EYE_RULES = {
  closeSet: { below: 0.92, note: "Eyes closer than one eye width apart: depth on the outer half, light at the inner corners." },
  wideSet: { above: 1.12, note: "Eyes wider than one eye width apart: bring the crease shade toward the nose." },
  downturned: { below: 1, note: "Outer corners lower than inner: lift the wing and keep the lower outer lash line light." },
  upturned: { above: 7, note: "Strong upward tilt: a flatter wing keeps it from looking severe." },
} as const;

/** Eye-shape placement (makeup-artist convention) for ANAT1's eye shapes (eye-detail.ts EYE_SHAPES): per zone, a
 * coverage factor and an adjustment. */
export const EYE_SHAPE_RULES: Record<string, { note: string; zones: Record<string, { coverage?: number; adjust?: ZoneAdjust }> }> = {
  almond: { note: "Almond eyes take most placements; follow the shape.", zones: {} },
  round: { note: "Elongate: a longer, flatter wing and more depth at the outer corner.", zones: { "liner-wing": { adjust: { scale: 1.25, rotate: -4 } }, "outer-v": { coverage: 1.15 } } },
  hooded: { note: "Place the crease shade above the natural crease, where it shows with the eyes open; keep the lid light and the liner thin.", zones: { crease: { adjust: { shift: [0, 0.12], scale: 1.08 } }, lid: { coverage: 0.7 }, liner: { adjust: { radius: 0.8 } } } },
  monolid: { note: "No crease to follow: a gradient from the lash line fading upward, and a slightly thicker liner so it shows past the fold.", zones: { lid: { adjust: { grow: 0.06 } }, crease: { coverage: 0.5 }, liner: { adjust: { radius: 1.35 } }, "liner-wing": { adjust: { scale: 1.1 } } } },
  "inner-double": { note: "A low in-fold crease: keep shade on the outer lid and taper the liner toward the inner corner.", zones: { crease: { coverage: 0.7 }, "outer-v": { coverage: 1.1 } } },
  downturned: { note: "Lift the outer corner: an upswept wing, little shade under the outer lower lashes.", zones: { "liner-wing": { adjust: { rotate: 10 } }, "lower-lash": { coverage: 0.6 } } },
  upturned: { note: "Balance the tilt: a flatter wing, a little shade under the outer lower lashes.", zones: { "liner-wing": { adjust: { rotate: -6 } }, "lower-lash": { coverage: 1.2 } } },
  "deep-set": { note: "Bring the lid forward: a light lid and a softer crease (dark lids sink further).", zones: { lid: { coverage: 0.6 }, crease: { coverage: 0.75 } } },
  prominent: { note: "Recede the lid: deeper, matte lid and crease shades.", zones: { lid: { coverage: 1.2 }, crease: { coverage: 1.2 } } },
  "close-set": { note: "Depth on the outer half, light at the inner corners.", zones: { "outer-v": { coverage: 1.15 }, "inner-corner": { coverage: 1.2 } } },
  "wide-set": { note: "Bring the crease shade toward the nose.", zones: { crease: { adjust: { shift: [0.06, 0] } } } },
};

// ---- Looks -------------------------------------------------------------------------------------------------------------

/** How a layer's colour is chosen for a particular skin, hair and iris. */
export type ColourRule =
  | { kind: "palette"; swatch: "foundation" | "concealer" | "corrector" | "contour" | "bronzer" | "highlight" }
  | { kind: "skin"; dL?: number; da?: number; db?: number }
  | { kind: "zone"; dL?: number; da?: number; db?: number }
  | { kind: "blush"; family?: BlushFamily }
  | { kind: "lip"; family?: LipFamily | "red" }
  | { kind: "eye"; tone: "complement" | "champagne" | "taupe" | "brown" | "espresso" | "charcoal" | "rose" | "peach-gold" | "pink" | "red" }
  | { kind: "liner"; tone: "black" | "brown" }
  | { kind: "brow" }
  | { kind: "lab"; lab: [number, number, number] };
export interface LookLayer { zone: string; product?: ProductId; colour: ColourRule; coverage: number; finish?: FinishId; blend?: BlendMode; adjust?: ZoneAdjust; why?: string }
export interface Look {
  id: string; label: string; summary: string; layers: LookLayer[];
  /** Mascara: lash length and thickness factors, darkness 0-1. */
  lashes?: { length: number; thickness: number; darkness: number };
  /** Hair density of the brows drawn over the fill (1 = natural). */
  brows?: { density: number };
  /** Apply the face-shape and eye placement rules (default true). */
  adapt?: boolean;
  evidence: string[];
}

const BASE_LIGHT: LookLayer[] = [
  { zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.4, finish: "satin" },
  { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.45 },
];
const CHEEK_SCULPT: LookLayer[] = [
  { zone: "cheek-contour", colour: { kind: "palette", swatch: "contour" }, coverage: 0.7, finish: "matte" },
  { zone: "cheekbone-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.55, finish: "dewy" },
  { zone: "nose-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.45, finish: "dewy" },
];
const BROWS: LookLayer = { zone: "brow", colour: { kind: "brow" }, coverage: 0.4 };

export const MAKEUP_LOOKS: readonly Look[] = [
  { id: "bare", label: "Bare skin", summary: "No makeup: the reference every look is compared with.", layers: [], adapt: false, evidence: [] },
  { id: "no-makeup", label: "No-makeup makeup", summary: "Sheer, even skin, brightened under-eyes, a natural flush, groomed brows, tinted lips: reads as healthy, not made up.",
    layers: [...BASE_LIGHT, { zone: "blush-apples", colour: { kind: "blush" }, coverage: 0.45 }, { ...BROWS, coverage: 0.25 },
      { zone: "lips", colour: { kind: "zone", dL: -3, da: 5, db: 0 }, coverage: 0.6, finish: "satin", product: "lipstick" }],
    lashes: { length: 1.08, thickness: 1.15, darkness: 0.6 }, evidence: ["dose", "cheeks-periorbital", "health-colour", "evenness"] },
  { id: "fresh-dewy", label: "Fresh dewy skin", summary: "Luminous skin with a dewy highlight, a pink flush on the apples, light under the lower lashes and a gradient lip (a K-beauty idea).",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.45, finish: "dewy" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.45 },
      { zone: "blush-apples", colour: { kind: "blush", family: "rose" }, coverage: 0.5 }, { zone: "cheekbone-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.5, finish: "dewy" },
      { zone: "nose-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.4, finish: "dewy" }, { zone: "lower-lash", product: "highlight", colour: { kind: "eye", tone: "champagne" }, coverage: 0.5, finish: "shimmer", adjust: { radius: 2.2, soft: 1.8 } },
      { zone: "lid", colour: { kind: "eye", tone: "peach-gold" }, coverage: 0.35, finish: "shimmer" }, { ...BROWS, coverage: 0.3 },
      { zone: "lip-centre", colour: { kind: "lip", family: "rose" }, coverage: 0.75, finish: "glossy", product: "lipstick" }, { zone: "lip-gloss", colour: { kind: "lab", lab: [92, 2, 4] }, coverage: 0.5, finish: "glossy" }],
    lashes: { length: 1.12, thickness: 1.2, darkness: 0.7 }, evidence: ["cheeks-periorbital", "health-colour"] },
  { id: "soft-glam", label: "Soft glam", summary: "Medium coverage, a soft sculpt, a lifted flush, a blended brown eye with a thin wing, defined brows and a rose lip.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.55, finish: "satin" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.55 },
      ...CHEEK_SCULPT, { zone: "bronzer", colour: { kind: "palette", swatch: "bronzer" }, coverage: 0.3 }, { zone: "blush-apples", colour: { kind: "blush" }, coverage: 0.6 },
      { zone: "lid", colour: { kind: "eye", tone: "champagne" }, coverage: 0.6, finish: "shimmer" }, { zone: "crease", colour: { kind: "eye", tone: "taupe" }, coverage: 0.65 },
      { zone: "outer-v", colour: { kind: "eye", tone: "brown" }, coverage: 0.7 }, { zone: "lower-lash", colour: { kind: "eye", tone: "brown" }, coverage: 0.45 },
      { zone: "liner", colour: { kind: "liner", tone: "brown" }, coverage: 0.85 }, { zone: "liner-wing", colour: { kind: "liner", tone: "brown" }, coverage: 0.8, adjust: { scale: 0.7 } },
      { ...BROWS, coverage: 0.5 }, { zone: "lips", colour: { kind: "lip", family: "rose" }, coverage: 0.8, finish: "satin" }],
    lashes: { length: 1.25, thickness: 1.5, darkness: 0.95 }, evidence: ["eyes-first", "night-out", "contrast", "eye-size"] },
  { id: "sculpted", label: "Sculpted (editorial)", summary: "Full matte coverage, strong contour on the cheeks, temples, jaw and nose, a bright highlight, draped blush, a nude lip.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.75, finish: "matte" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.65 },
      { zone: "cheek-contour", colour: { kind: "skin", dL: -13, da: -1, db: -4 }, coverage: 0.8, finish: "matte" }, { zone: "temple-contour", colour: { kind: "palette", swatch: "contour" }, coverage: 0.6 },
      { zone: "jaw-contour", colour: { kind: "palette", swatch: "contour" }, coverage: 0.6 }, { zone: "nose-contour", colour: { kind: "palette", swatch: "contour" }, coverage: 0.6 },
      { zone: "cheekbone-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.75, finish: "dewy" }, { zone: "nose-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.6, finish: "dewy" },
      { zone: "forehead-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.3, finish: "satin" }, { zone: "chin-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.35, finish: "satin" },
      { zone: "blush-draped", colour: { kind: "blush", family: "terracotta" }, coverage: 0.45 }, { zone: "crease", colour: { kind: "eye", tone: "taupe" }, coverage: 0.6 },
      { zone: "liner", colour: { kind: "liner", tone: "brown" }, coverage: 0.7 }, { ...BROWS, coverage: 0.6 }, { zone: "lips", colour: { kind: "lip", family: "nude" }, coverage: 0.8, finish: "matte" }],
    lashes: { length: 1.3, thickness: 1.5, darkness: 1 }, evidence: ["light-shadow", "feature-size", "dose"] },
  { id: "classic-red", label: "Classic red lip and wing", summary: "A matte, even base, a black winged liner, defined brows and a red chosen for the undertone (1950s-inspired).",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.65, finish: "matte" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.55 },
      { zone: "blush-apples", colour: { kind: "blush" }, coverage: 0.3 }, { zone: "lid", colour: { kind: "eye", tone: "champagne" }, coverage: 0.4 }, { zone: "crease", colour: { kind: "eye", tone: "taupe" }, coverage: 0.4 },
      { zone: "liner", colour: { kind: "liner", tone: "black" }, coverage: 0.95 }, { zone: "liner-wing", colour: { kind: "liner", tone: "black" }, coverage: 0.95 },
      { ...BROWS, coverage: 0.55 }, { zone: "lip-liner", colour: { kind: "lip", family: "red" }, coverage: 0.9 }, { zone: "lips", colour: { kind: "lip", family: "red" }, coverage: 0.95, finish: "satin" }],
    lashes: { length: 1.35, thickness: 1.6, darkness: 1 }, evidence: ["lip-red", "contrast", "eye-size"] },
  { id: "smoky-eye", label: "Smoky eye", summary: "Lid, crease and lower lash line smoked from espresso to charcoal, a soft sculpt and a pale nude lip so the eyes lead.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.6, finish: "satin" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.6 },
      { zone: "cheek-contour", colour: { kind: "palette", swatch: "contour" }, coverage: 0.45 }, { zone: "lid", colour: { kind: "eye", tone: "espresso" }, coverage: 0.85, finish: "shimmer" },
      { zone: "crease", colour: { kind: "eye", tone: "brown" }, coverage: 0.85 }, { zone: "outer-v", colour: { kind: "eye", tone: "charcoal" }, coverage: 0.9 },
      { zone: "lower-lash", colour: { kind: "eye", tone: "charcoal" }, coverage: 0.8, adjust: { radius: 1.6, soft: 1.6 } }, { zone: "liner", colour: { kind: "liner", tone: "black" }, coverage: 0.9 },
      { zone: "inner-corner", colour: { kind: "eye", tone: "champagne" }, coverage: 0.6, finish: "shimmer" }, { ...BROWS, coverage: 0.45 },
      { zone: "lips", colour: { kind: "lip", family: "nude" }, coverage: 0.7, finish: "satin" }],
    lashes: { length: 1.35, thickness: 1.7, darkness: 1 }, evidence: ["night-out", "eyes-first"] },
  { id: "sun-kissed", label: "Sun-kissed", summary: "Bronzer where the sun lands, a flush across the nose and cheeks, a dewy glow, a peach-gold lid and a glossy lip.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.35, finish: "dewy" }, { zone: "bronzer", colour: { kind: "palette", swatch: "bronzer" }, coverage: 0.6 },
      { zone: "blush-sunkissed", colour: { kind: "blush", family: "coral" }, coverage: 0.45 }, { zone: "cheekbone-highlight", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.6, finish: "dewy" },
      { zone: "lid", colour: { kind: "eye", tone: "peach-gold" }, coverage: 0.6, finish: "shimmer" }, { zone: "liner", colour: { kind: "liner", tone: "brown" }, coverage: 0.6 }, { ...BROWS, coverage: 0.35 },
      { zone: "lips", colour: { kind: "lip", family: "coral" }, coverage: 0.55, finish: "glossy" }],
    lashes: { length: 1.15, thickness: 1.3, darkness: 0.85 }, evidence: ["health-colour"] },
  { id: "igari", label: "Igari flush", summary: "A Japanese style: blush high under the eyes toward the nose, a sheer pink lid, glossy lips and dewy skin, for a just-flushed look.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.4, finish: "dewy" }, { zone: "blush-igari", colour: { kind: "blush", family: "rose" }, coverage: 0.6 },
      { zone: "lid", colour: { kind: "eye", tone: "pink" }, coverage: 0.45, finish: "shimmer" }, { zone: "lower-lash", colour: { kind: "eye", tone: "pink" }, coverage: 0.4, adjust: { radius: 1.8, soft: 1.6 } },
      { ...BROWS, coverage: 0.3 }, { zone: "lips", colour: { kind: "lip", family: "pink" }, coverage: 0.6, finish: "glossy" }],
    lashes: { length: 1.15, thickness: 1.2, darkness: 0.7 }, evidence: ["cheeks-periorbital"] },
  { id: "monochrome-rose", label: "Monochrome rose", summary: "One rose hue on the lids, cheeks and lips: monochromatic harmony.",
    layers: [...BASE_LIGHT, { zone: "lid", colour: { kind: "eye", tone: "rose" }, coverage: 0.6, finish: "satin" }, { zone: "crease", colour: { kind: "eye", tone: "rose" }, coverage: 0.4 },
      { zone: "blush-lifted", colour: { kind: "blush", family: "rose" }, coverage: 0.55 }, { ...BROWS, coverage: 0.35 }, { zone: "lips", colour: { kind: "lip", family: "rose" }, coverage: 0.8, finish: "satin" }],
    lashes: { length: 1.15, thickness: 1.3, darkness: 0.85 }, evidence: [] },
  { id: "grooming", label: "Grooming (any face)", summary: "Evens redness and shine, brightens under the eyes, tidies brows, keeps the lips' own colour: invisible on camera.",
    layers: [{ zone: "foundation", colour: { kind: "palette", swatch: "foundation" }, coverage: 0.3, finish: "matte" }, { zone: "under-eye", colour: { kind: "palette", swatch: "concealer" }, coverage: 0.35 },
      { ...BROWS, coverage: 0.12 }],
    lashes: { length: 1, thickness: 1, darkness: 0.5 }, adapt: false, evidence: ["evenness", "lip-red"] },
  { id: "maiko", label: "Maiko (Kyoto, traditional)", summary: "Oshiroi white over the face, red and black at the eyes, red lips (beni): stage makeup with a strict tradition.",
    layers: [{ zone: "foundation", colour: { kind: "lab", lab: [93, 1, 4] }, coverage: 0.95, finish: "matte", adjust: { grow: 0.25 } },
      { zone: "outer-v", colour: { kind: "eye", tone: "red" }, coverage: 0.8, adjust: { scale: 1.15 } }, { zone: "crease", colour: { kind: "eye", tone: "red" }, coverage: 0.45 },
      { zone: "liner", colour: { kind: "liner", tone: "black" }, coverage: 0.95 }, { zone: "liner-wing", colour: { kind: "liner", tone: "black" }, coverage: 0.85, adjust: { scale: 0.8 } },
      { zone: "brow", colour: { kind: "lab", lab: [26, 14, 8] }, coverage: 0.7 }, { zone: "lips", colour: { kind: "lab", lab: [42, 62, 38] }, coverage: 0.95, finish: "glossy", adjust: { grow: -0.08 } }],
    lashes: { length: 1, thickness: 1.1, darkness: 1 }, adapt: false, evidence: [] },
];
export const findLook = (id: string): Look | undefined => MAKEUP_LOOKS.find(l => l.id === id);
