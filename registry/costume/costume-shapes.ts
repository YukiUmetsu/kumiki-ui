/**
 * COSTUME1 silhouettes: a garment's front-view construction on ANAT1's measured person (man, 25; metres, y up, the
 * ground at 0), for any style to paint over. Heights come from the person's landmarks: neck, shoulder, bust, natural
 * waist, hip, knee, ankle. A garment is a body piece with widths at the shoulder, waist and hem, sleeves of a kind,
 * and extras (sash, apron, drape, hood, hats). Defaults follow slot and cut; garments whose silhouette is the point
 * (long kimono sleeves, a crinoline bell, winged kamishimo shoulders, a gat's brim) carry their own.
 */
import type { FPoint } from "../anatomy/foundation-shapes";
import { SCALE_PERSON, smoothClosedPath } from "../anatomy/foundation-shapes";
import type { GarmentRecord } from "./costume-data";
import { bendingLength, elbowFolds, hangingFolds, swagFolds } from "./costume-drape";

type Level = "neck" | "shoulder" | "bust" | "waist" | "hip" | "thigh" | "knee" | "calf" | "ankle" | "floor";
type Sleeve = "none" | "cap" | "short" | "long" | "wide" | "square" | "hanging";
type Extra = "sash" | "obi" | "apron" | "drape-left" | "hood" | "wings" | "train" | "collar-ruff" | "open-front" | "panels" | "brace" | "kasa" | "gat" | "keffiyeh" | "kokoshnik" | "sandal" | "sock" | "shoe" | "fringe";
export interface SilhouetteSpec {
  top: Level; hem: Level;
  /** Half-widths in metres at the shoulder line, the waist and the hem (the body piece's outline). */
  shoulder: number; waist: number; hemWidth: number;
  sleeve: Sleeve;
  /** Trousers: a split body piece with this half-width at the hem of each leg. */
  legs?: number;
  extras?: readonly Extra[];
}

const L = SCALE_PERSON.landmarks as Record<string, number[]>;
const Y = (k: string) => L[k][1], X = (k: string) => Math.abs(L[k][0]);
/** Heights on the scale person, metres. */
export const LEVELS: Readonly<Record<Level, number>> = {
  neck: Y("cervicale") - .03, shoulder: Y("acromion.L") - .01, bust: (Y("acromion.L") + Y("iliocristale.L")) / 2 + .1, waist: Y("iliocristale.L") + .04,
  hip: Y("trochanterion.L"), thigh: (Y("trochanterion.L") + Y("patella.L")) / 2, knee: Y("patella.L"), calf: (Y("patella.L") + Y("lateral-malleolus.L")) / 2, ankle: Y("lateral-malleolus.L") + .02, floor: .005,
};
const SH = X("acromion.L"), HIP = X("trochanterion.L") + .02;

/** Defaults by slot and cut. */
function defaults(g: GarmentRecord): SilhouetteSpec {
  const base = { shoulder: SH + .02, waist: HIP - .02, hemWidth: HIP + .04, sleeve: "long" as Sleeve };
  switch (g.slot) {
    case "upper": return { ...base, top: "neck", hem: "hip", hemWidth: HIP + .02 };
    case "lower": return { ...base, top: "waist", hem: "ankle", shoulder: HIP - .04, waist: HIP - .04, hemWidth: HIP + .08, sleeve: "none" };
    case "outer": return { ...base, top: "neck", hem: "knee", shoulder: SH + .04, waist: HIP + .04, hemWidth: HIP + .12, extras: ["open-front"] };
    case "waist": return { top: "waist", hem: "hip", shoulder: HIP, waist: HIP, hemWidth: HIP, sleeve: "none", extras: ["sash"] };
    case "under": return { ...base, top: "bust", hem: "floor", shoulder: SH - .04, waist: HIP - .06, hemWidth: HIP + .3, sleeve: "none" };
    case "draped": return { ...base, top: "shoulder", hem: "ankle", hemWidth: HIP + .12, sleeve: "none", extras: ["drape-left"] };
    case "head": return { top: "neck", hem: "neck", shoulder: 0, waist: 0, hemWidth: 0, sleeve: "none", extras: [] };
    case "feet": return { top: "ankle", hem: "floor", shoulder: 0, waist: 0, hemWidth: 0, sleeve: "none", extras: ["shoe"] };
    case "accessory": return { top: "neck", hem: "neck", shoulder: 0, waist: 0, hemWidth: 0, sleeve: "none", extras: [] };
    default: return { ...base, top: "neck", hem: g.cut === "tunic" ? "calf" : "ankle", hemWidth: HIP + (g.cut === "tailored" ? .04 : .08), sleeve: g.cut === "straight-cut" ? "square" : "long" };
  }
}

/** Silhouettes where the shape is the point (estimated from the descriptions and period images). */
const SPECS: Partial<Record<string, Partial<SilhouetteSpec>>> = {
  kimono: { hem: "ankle", hemWidth: HIP + .02, waist: HIP - .02, sleeve: "square", extras: ["obi"] },
  kosode: { hem: "ankle", hemWidth: HIP + .06, waist: HIP + .02, sleeve: "short", extras: ["obi"] },
  furisode: { hem: "floor", hemWidth: HIP + .04, sleeve: "hanging", extras: ["obi"] },
  junihitoe: { hem: "floor", shoulder: SH + .14, waist: HIP + .2, hemWidth: HIP + .42, sleeve: "wide", extras: ["train"] },
  sokutai: { hem: "floor", shoulder: SH + .12, waist: HIP + .16, hemWidth: HIP + .3, sleeve: "wide", extras: ["train", "sash"] },
  kariginu: { hem: "knee", sleeve: "wide", extras: ["sash"] },
  // Divided or not, hakama read from the front as one wide pleated skirt (umanori and andon "appear similar", Wikipedia).
  hakama: { top: "waist", hem: "ankle", waist: HIP - .02, hemWidth: HIP + .12 },
  kamishimo: { top: "neck", hem: "waist", shoulder: SH + .2, waist: HIP - .02, hemWidth: HIP - .02, sleeve: "none", extras: ["wings"] },
  haori: { hem: "thigh", sleeve: "square", extras: ["open-front"] },
  yukata: { hem: "ankle", hemWidth: HIP, sleeve: "square", extras: ["obi"] },
  shenyi: { hem: "floor", hemWidth: HIP + .14, waist: HIP + .02, sleeve: "wide", extras: ["sash"] },
  ruqun: { top: "neck", hem: "floor", waist: HIP - .08, hemWidth: HIP + .2, sleeve: "wide", extras: ["sash"] },
  cheongsam: { hem: "ankle", waist: HIP - .1, hemWidth: HIP - .04, sleeve: "cap" },
  changshan: { hem: "ankle", hemWidth: HIP + .04, sleeve: "long" },
  chima: { top: "bust", hem: "floor", shoulder: SH - .06, waist: SH - .02, hemWidth: HIP + .3 },
  jeogori: { hem: "bust", hemWidth: SH + .02, sleeve: "long" },
  hanbok: { top: "neck", hem: "floor", waist: SH - .02, hemWidth: HIP + .3, sleeve: "long" },
  durumagi: { hem: "calf", hemWidth: HIP + .14, extras: [] },
  deel: { hem: "calf", hemWidth: HIP + .12, sleeve: "long", extras: ["sash"] },
  sari: { hem: "floor", hemWidth: HIP + .08, extras: ["drape-left"] },
  dhoti: { legs: .14, hem: "ankle" },
  kurta: { hem: "knee", hemWidth: HIP + .06 },
  "shalwar-kameez": { hem: "knee", legs: .1, hemWidth: HIP + .06 },
  sherwani: { hem: "knee", waist: HIP - .02, hemWidth: HIP + .06, extras: [] },
  lehenga: { hem: "floor", hemWidth: HIP + .32 },
  "ao-dai": { hem: "calf", waist: HIP - .1, hemWidth: HIP - .02, extras: ["panels"], legs: .14 },
  thawb: { hem: "ankle", hemWidth: HIP + .08 },
  abaya: { top: "neck", hem: "floor", shoulder: SH + .08, waist: HIP + .12, hemWidth: HIP + .2, extras: [] },
  djellaba: { hem: "ankle", hemWidth: HIP + .12, extras: ["hood"] },
  kaftan: { hem: "floor", hemWidth: HIP + .12, extras: ["open-front", "sash"] },
  chador: { top: "neck", hem: "floor", shoulder: SH + .14, waist: HIP + .2, hemWidth: HIP + .3, sleeve: "none", extras: ["hood"] },
  chiton: { hem: "floor", shoulder: SH + .06, waist: HIP - .02, hemWidth: HIP + .1, sleeve: "cap", extras: ["sash"] },
  toga: { hem: "ankle", hemWidth: HIP + .16, extras: ["drape-left"] },
  tunic: { hem: "knee", sleeve: "long", extras: ["sash"] },
  kirtle: { hem: "floor", waist: HIP - .1, hemWidth: HIP + .2 },
  houppelande: { hem: "floor", shoulder: SH + .06, waist: HIP - .04, hemWidth: HIP + .3, sleeve: "hanging", extras: ["sash"] },
  doublet: { hem: "hip", waist: HIP - .1, hemWidth: HIP - .02, legs: .07 },
  ruff: { extras: ["collar-ruff"] },
  farthingale: { top: "waist", hem: "floor", waist: HIP - .12, hemWidth: HIP + .38 },
  "robe-a-la-francaise": { hem: "floor", waist: HIP - .14, hemWidth: HIP + .5, sleeve: "short" },
  corset: { top: "bust", hem: "hip", shoulder: SH - .06, waist: HIP - .16, hemWidth: HIP - .04 },
  "frock-coat": { hem: "knee", waist: HIP - .06, hemWidth: HIP + .1, legs: .08, extras: [] },
  crinoline: { top: "waist", hem: "floor", waist: HIP - .14, hemWidth: HIP + .55 },
  bustle: { top: "waist", hem: "floor", waist: HIP - .14, hemWidth: HIP + .12 },
  dirndl: { top: "bust", hem: "calf", waist: HIP - .1, hemWidth: HIP + .26, sleeve: "short", extras: ["apron"] },
  lederhosen: { legs: .1, hem: "knee", extras: ["brace"] },
  kilt: { hem: "knee", hemWidth: HIP + .08, extras: [] },
  sarafan: { top: "bust", hem: "floor", hemWidth: HIP + .3, sleeve: "long" },
  kente: { hem: "ankle", hemWidth: HIP + .16, extras: ["drape-left"] },
  boubou: { hem: "ankle", shoulder: SH + .3, waist: HIP + .3, hemWidth: HIP + .3, sleeve: "none" },
  agbada: { hem: "ankle", shoulder: SH + .36, waist: HIP + .32, hemWidth: HIP + .3, sleeve: "none", legs: .1 },
  dashiki: { hem: "hip", hemWidth: HIP + .08, sleeve: "short" },
  kanga: { hem: "ankle", hemWidth: HIP + .04 },
  "habesha-kemis": { hem: "floor", waist: HIP - .06, hemWidth: HIP + .14 },
  poncho: { top: "neck", hem: "hip", shoulder: SH + .26, waist: SH + .28, hemWidth: SH + .3, sleeve: "none", extras: ["fringe"] },
  serape: { top: "neck", hem: "thigh", shoulder: SH + .1, waist: SH + .12, hemWidth: SH + .12, sleeve: "none", extras: ["drape-left", "fringe"] },
  huipil: { hem: "hip", shoulder: SH + .12, waist: SH + .14, hemWidth: SH + .14, sleeve: "none" },
  parka: { hem: "thigh", hemWidth: HIP + .12, extras: ["hood"] },
  lavalava: { hem: "calf", hemWidth: HIP + .06 },
  tapa: { hem: "calf", hemWidth: HIP + .1, extras: ["drape-left"] },
  "zoot-suit": { hem: "thigh", shoulder: SH + .12, waist: HIP - .02, hemWidth: HIP + .06, legs: .14 },
  suit: { hem: "hip", waist: HIP - .06, hemWidth: HIP - .02, legs: .08 },
  jeans: { legs: .07 },
  kasa: { extras: ["kasa"] }, gat: { extras: ["gat"] }, keffiyeh: { extras: ["keffiyeh"] }, kokoshnik: { extras: ["kokoshnik"] },
  geta: { extras: ["sandal"] }, waraji: { extras: ["sandal"] }, tabi: { extras: ["sock"] }, moccasin: { extras: ["shoe"] },
  obi: { extras: ["obi"] },
};

export const silhouetteSpec = (g: GarmentRecord): SilhouetteSpec => ({ ...defaults(g), ...(SPECS[g.id] ?? {}) });

export type Neckline = "crossed" | "mandarin" | "lapel" | "placket" | "round" | "square" | "none";
export type PatternKind = "tartan" | "stripes" | "kente" | "scatter" | "none";
export interface GarmentShape {
  /** Main body piece(s), sleeves, details in the garment's colour (bands, wings, trains, hats), white trim (ruffs, aprons), a lighter drape, and fine lines (openings, seams). */
  body: string; sleeves: string; details: string; trim: string; drape: string; lines: string;
  /** Trouser legs (drawn under the body) and bands (obi, sashes, braces) in a contrasting colour. */
  legs: string; bands: string;
  /** Folds from the drape physics: shadow bands and ridge lines on the body, sleeves and drape. */
  foldShadow: string; foldRidges: string;
  /** Swag folds across a draped cloth, painted over the drape. */
  drapeFolds: string;
  /** The neckline: collar bands in the garment's colour (shaded), a white under-collar or shirt, lining edges (sleeve openings, hem). */
  collar: string; underCollar: string; lining: string;
  /** Small fastenings and cords: buttons and knots (dark), cords and ties (light), pleat and seam lines (dark, fine). */
  buttons: string; cords: string; pleats: string;
  /** The pattern the cloth is woven or dyed in, if it is part of the garment's look. */
  pattern: PatternKind;
  neckline: Neckline;
  /** The hanging folds' count across the front, spacing and depth (metres), from the fabric's bending length. */
  drapeInfo?: { count: number; spacing: number; depth: number; bend: number };
  bounds: readonly [number, number, number, number];
}

/** Necklines where the garment's construction sets them (reported from each garment's article where it describes the collar; else by cut). */
const NECKS: Partial<Record<string, Neckline>> = {
  kimono: "crossed", kosode: "crossed", furisode: "crossed", yukata: "crossed", junihitoe: "crossed", shenyi: "crossed", ruqun: "crossed", hanbok: "crossed", jeogori: "crossed", durumagi: "crossed", deel: "crossed",
  sokutai: "round", kariginu: "round", cheongsam: "mandarin", changshan: "mandarin", sherwani: "mandarin", "ao-dai": "mandarin",
  suit: "lapel", "frock-coat": "lapel", "zoot-suit": "lapel", kurta: "placket", thawb: "placket", "shalwar-kameez": "placket", djellaba: "placket", kaftan: "placket", dashiki: "placket",
  kirtle: "square", "robe-a-la-francaise": "square", dirndl: "square", sarafan: "square", huipil: "square", corset: "square", "habesha-kemis": "round", chiton: "round", tunic: "round",
};
const neckOf = (g: GarmentRecord): Neckline => NECKS[g.id] ?? (g.slot === "head" || g.slot === "feet" || g.slot === "accessory" || g.slot === "waist" || g.slot === "lower" ? "none"
  : g.cut === "wrapped" || g.cut === "straight-cut" ? "crossed" : g.cut === "tailored" ? "lapel" : g.cut === "tunic" ? "placket" : "round");
/** Patterns that are part of a garment's look (tartan kilts, striped hakama, kente strips, scattered motifs on kimono). */
const PATTERNS: Partial<Record<string, PatternKind>> = { kilt: "tartan", hakama: "stripes", kente: "kente", kimono: "scatter", furisode: "scatter", yukata: "scatter", kosode: "scatter" };

/** Skirts held out by hoops or a cage: the cloth spans the frame in a few broad folds. */
const FRAMED = new Set(["crinoline", "farthingale", "robe-a-la-francaise"]);
const mirror = (pts: readonly FPoint[]) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y] as FPoint)];
const path = (pts: readonly FPoint[]) => (pts.length ? `M${pts.map(p => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join("L")}` : "");
const poly = (pts: readonly FPoint[]) => (pts.length ? `${path(pts)}Z` : "");
const circle = (c: FPoint, r: number) => smoothClosedPath(Array.from({ length: 10 }, (_, i) => [c[0] + Math.cos(i / 10 * Math.PI * 2) * r, c[1] + Math.sin(i / 10 * Math.PI * 2) * r] as FPoint));
/** A band of width w along a polyline (to its left or right). */
const band = (line: readonly FPoint[], w: number): FPoint[] => {
  const left: FPoint[] = [], right: FPoint[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], vx = b[0] - a[0], vy = b[1] - a[1], l = Math.hypot(vx, vy) || 1;
    left.push([p[0] - vy / l * w / 2, p[1] + vx / l * w / 2]); right.push([p[0] + vy / l * w / 2, p[1] - vx / l * w / 2]);
  });
  return [...left, ...right.reverse()];
};
const seedOf = (id: string) => [...id].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7);

/** A garment's front-view shape on the scale person, with folds from its fabric and its construction details. */
export function garmentShape(g: GarmentRecord): GarmentShape {
  const s = silhouetteSpec(g), lv = LEVELS, top = lv[s.top], hem = lv[s.hem], ex = new Set(s.extras ?? []), bend = bendingLength(g), seed = seedOf(g.id);
  const bodyParts: string[] = [], sleeves: string[] = [], details: string[] = [], trim: string[] = [], drape: string[] = [], lines: string[] = [], legs: string[] = [], bands: string[] = [];
  const drapeFolds: string[] = [], foldShadow: string[] = [], foldRidges: string[] = [], collar: string[] = [], underCollar: string[] = [], lining: string[] = [], buttons: string[] = [], cords: string[] = [], pleats: string[] = [];
  const addFolds = (f: ReturnType<typeof hangingFolds>) => { for (const k of f.folds) { foldShadow.push(poly(k.shadow)); foldRidges.push(path(k.ridge)); } };
  let drapeInfo: GarmentShape["drapeInfo"];
  // Waist pieces (obi, sashes) are their bands alone.
  const has = s.shoulder > 0 && top > hem && g.slot !== "waist", neckline: Neckline = has ? neckOf(g) : "none", crossed = neckline === "crossed";
  if (has) {
    const neckW = .07, startsAtWaist = s.top === "waist" || s.top === "bust";
    // The right half of the outline from the neck (or waistband) down to the hem.
    const half: FPoint[] = startsAtWaist
      ? [[0, top], [s.shoulder, top], [s.waist, Math.min(top, lv.waist)], [(s.waist + s.hemWidth) / 2 + (s.hemWidth - s.waist) * .12, (lv.waist + hem) / 2], [s.hemWidth, hem]]
      : [[0, lv.neck - .02], [neckW, lv.neck], [s.shoulder, lv.shoulder], [Math.max(s.waist, s.shoulder * .92), lv.bust], [s.waist, Math.max(hem, lv.waist)],
        ...(hem < lv.waist - .05 ? [[(s.waist + s.hemWidth) / 2 + (s.hemWidth - s.waist) * .1, (Math.min(lv.waist, top) + hem) / 2] as FPoint] : []), [s.hemWidth, hem]];
    // Hanging folds below the support (an obi, sash or waistband; else the bust), sized by the fabric's stiffness.
    const belted = ex.has("obi") || ex.has("sash") || ex.has("apron") || startsAtWaist || s.waist < s.hemWidth - .06;
    const supportY = startsAtWaist ? top - .02 : belted ? lv.waist - (ex.has("obi") ? .08 : .02) : lv.bust - .04;
    const skirt = hem < supportY - .1 && !s.legs ? hangingFolds({ top: supportY, hem, topHalf: Math.max(.08, startsAtWaist || belted ? s.waist : s.shoulder * .9), hemHalf: s.hemWidth, bend, seed,
      gathered: startsAtWaist && s.hemWidth > s.waist + .15 && !FRAMED.has(g.id), framed: FRAMED.has(g.id) }) : undefined;
    const hemPts: FPoint[] = skirt ? skirt.hem : [[s.hemWidth, hem], [-s.hemWidth, hem]];
    if (skirt) { addFolds(skirt); drapeInfo = { count: skirt.count, spacing: skirt.spacing, depth: skirt.depth, bend }; }
    const outline = [...half, ...hemPts.slice(1, -1), ...half.slice().reverse().map(([x, y]) => [-x, y] as FPoint)];
    if (s.legs) {
      // Trousers: two legs from the hip to the hem (the ankle under a full garment), behind any body piece.
      const lower = s.top === "waist", legHem = lower ? hem : lv.ankle, w = s.legs;
      // Straight legs: the outer seam from the hip down, the inner from the crotch, a little wider at the hem.
      const leg = (sd: number): FPoint[] => [[sd * .006, lv.hip + .03], [sd * (HIP - .005), lv.hip + .04], [sd * (HIP + .01), lv.hip - .06], [sd * Math.max(HIP * .75, w + .09), legHem],
        [sd * .035, legHem], [sd * .02, lv.hip - .14], [sd * .006, lv.hip - .09]];
      for (const sd of [1, -1]) {
        legs.push(poly(leg(sd)));
        // A few soft folds down each leg, breaking over the foot.
        for (const k of hangingFolds({ top: lv.hip - .05, hem: legHem, topHalf: .05, hemHalf: (w + .06) / 2, bend, seed: seed + sd }).folds.slice(0, 2)) {
          foldShadow.push(poly(k.shadow.map(([x, y]) => [x + sd * (HIP * .5 + w * .2), y] as FPoint))); foldRidges.push(path(k.ridge.map(([x, y]) => [x + sd * (HIP * .5 + w * .2), y] as FPoint)));
        }
      }
      if (lower) bodyParts.push(smoothClosedPath(mirror([[0, lv.waist + .02], [HIP - .03, lv.waist + .02], [HIP + .005, lv.hip + .02], [0, lv.hip - .02]])));
      else bodyParts.push(poly(outline));
    } else bodyParts.push(poly(outline));
    // Sleeves, hanging from the shoulder: straight-cut sleeves are rectangles, others follow the arm.
    const armX = s.shoulder + .02, wrist = lv.waist - .06;
    const sleeveShape = (side: number): FPoint[] | undefined => {
      switch (s.sleeve) {
        case "none": return undefined;
        case "cap": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .05), lv.shoulder - .05], [side * (armX + .02), lv.shoulder - .12], [side * (s.shoulder - .04), lv.shoulder - .1]];
        case "short": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .07), lv.shoulder - .08], [side * (armX + .05), lv.bust - .08], [side * (s.shoulder - .03), lv.bust - .04]];
        case "long": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .035), lv.shoulder - .04], [side * (armX + .05), lv.bust - .04], [side * (armX + .045), lv.waist + .04],
          [side * (armX + .04), wrist], [side * (armX - .035), wrist], [side * (armX - .035), lv.waist + .04], [side * (armX - .03), lv.bust - .08], [side * (s.shoulder - .04), lv.bust - .06]];
        case "wide": return [[side * (s.shoulder - .04), lv.shoulder + .01], [side * (armX + .16), lv.shoulder - .12], [side * (armX + .24), wrist - .1], [side * (armX - .02), wrist - .08], [side * (s.shoulder - .04), lv.bust - .04]];
        // Kimono-family sleeves hang as long rectangles beside the body: about 49 cm from the shoulder to the hip
        // (furisode to the knee or below), the bottom corner gently rounded (estimated from photographs).
        case "square": case "hanging": {
          const bot = s.sleeve === "hanging" ? lv.knee + .02 : lv.waist - .1, out = armX + .13;
          return [[side * (s.shoulder - .04), lv.shoulder + .01], [side * out, lv.shoulder - .02], [side * (out + .005), bot + .035], [side * (out - .008), bot + .008], [side * (out - .035), bot],
            [side * (armX - .03), bot], [side * (armX - .03), lv.bust - .06], [side * (s.shoulder - .03), lv.bust - .04]];
        }
      }
    };
    for (const sd of [1, -1] as const) {
      const sl = sleeveShape(sd);
      if (!sl) continue;
      sleeves.push(s.sleeve === "square" || s.sleeve === "hanging" ? poly(sl) : smoothClosedPath(sl));
      // Sleeve folds: a hanging sleeve bag folds near its bottom; a wide sleeve falls in pipe folds from the shoulder;
      // a long fitted sleeve bunches at the elbow.
      const cx = sd * (armX + .03);
      if (s.sleeve === "long") for (const z of elbowFolds(cx, lv.waist + .06, .045, bend, sd)) foldRidges.push(path(z));
      else if (s.sleeve === "wide" || s.sleeve === "hanging" || s.sleeve === "square") {
        const yTop = s.sleeve === "wide" ? lv.shoulder - .06 : lv.bust - .02, yBot = s.sleeve === "hanging" ? lv.knee + .04 : s.sleeve === "wide" ? wrist - .1 : lv.waist - .09;
        const f = hangingFolds({ top: yTop, hem: yBot, topHalf: .04, hemHalf: s.sleeve === "wide" ? .1 : .06, bend, seed: seed + 11 * sd });
        for (const k of f.folds) { foldShadow.push(poly(k.shadow.map(([x, y]) => [x + cx + sd * (s.sleeve === "wide" ? .08 : .04), y] as FPoint))); foldRidges.push(path(k.ridge.map(([x, y]) => [x + cx + sd * (s.sleeve === "wide" ? .08 : .04), y] as FPoint))); }
      }
      // Kimono-family sleeves show their lining colour at the opening (the inner edge of the sleeve).
      if (crossed && (s.sleeve === "square" || s.sleeve === "hanging" || s.sleeve === "wide")) {
        const yo = s.sleeve === "hanging" ? lv.knee + .02 : s.sleeve === "wide" ? wrist - .08 : lv.waist - .1;
        if (s.sleeve !== "wide") lining.push(poly(band([[sd * (armX - .024), lv.bust - .05], [sd * (armX - .024), yo + .015]], .01)));
      }
    }
    // Necklines.
    const nk = lv.neck, jY = lv.bust - .06;
    if (crossed) {
      // Left over right: the top panel's collar runs from the wearer's left of the neck (the viewer's right) down to
      // the wearer's right, the long stroke of a "y". Right over left is for dressing the dead.
      const topEdge: FPoint[] = [[.065, nk + .005], [.02, jY + .05], [-.045, jY - .04], [-.07, lv.waist + .02]], under: FPoint[] = [[-.065, nk + .005], [-.01, jY + .02]];
      collar.push(poly(band(under, .042)), poly(band(topEdge, .045)));
      // A woman's white under-collar (han-eri) shows as a narrow edge inside the collar, meeting in the V.
      if (g.wornBy !== "men" && g.slot === "full") underCollar.push(poly(band([[-.045, nk + .008], [-.005, jY + .045]], .028)), poly(band([[.047, nk + .008], [-.002, jY + .05]], .028)));
      // Below the waist the top panel's edge (okumi) continues down to the hem, a little to the wearer's right.
      if (hem < lv.waist - .2) lines.push(path([[-.07, lv.waist - .08], [-.09, (lv.waist + hem) / 2], [-.11, hem + .01]]));
      if (g.id !== "haori" && hem < lv.knee) lining.push(poly(band([[-.11, hem + .008], [-s.hemWidth * .55, hem + .006]], .012)));
    } else if (neckline === "mandarin") {
      collar.push(smoothClosedPath([[-.055, nk - .005], [-.055, nk + .035], [.055, nk + .035], [.055, nk - .005], [0, nk - .015]]));
      // The flap opens from the collar across to the wearer's right underarm, fastened by knot buttons.
      const flap: FPoint[] = [[0, nk - .01], [-.06, lv.shoulder - .05], [-.11, lv.bust + .02], [-.14, lv.bust - .04]];
      lines.push(path(flap));
      for (const p of [[0, nk + .015], [-.035, lv.shoulder - .025], [-.09, lv.bust + .035], [-.135, lv.bust - .02]] as FPoint[]) buttons.push(circle(p, .007));
      if (g.id === "cheongsam") for (const sd of [1, -1]) lines.push(path([[sd * s.hemWidth * .98, hem + .005], [sd * (s.hemWidth * .9), lv.knee + .02]]));
    } else if (neckline === "lapel") {
      // Shirt and tie in the V, notched lapels rolling to the top button, buttons, the opening below them.
      const vb = lv.bust - .1;
      underCollar.push(poly([[-.065, nk + .005], [0, vb], [.065, nk + .005], [.04, nk + .02], [-.04, nk + .02]]));
      cords.push(poly([[-.012, nk - .005], [.012, nk - .005], [.018, vb + .01], [0, vb - .01], [-.018, vb + .01]]));
      for (const sd of [1, -1]) collar.push(poly([[sd * .065, nk + .005], [sd * .135, lv.shoulder - .06], [sd * .1, lv.shoulder - .085], [sd * .14, lv.bust - .03], [sd * .005, lv.waist + .05], [sd * .02, vb]]));
      const dbl = g.id === "frock-coat", rows = dbl ? [lv.waist + .02, lv.waist - .07, lv.waist - .16] : [lv.waist + .03, lv.waist - .06];
      for (const y of rows) for (const x of dbl ? [-.06, .06] : [0]) buttons.push(circle([x, y], .009));
      lines.push(path([[0, lv.waist - .1], [-.02, Math.max(hem, lv.hip - .1) + .01]]), path([[.11, lv.bust + .02], [.17, lv.bust + .025]]));
    } else if (neckline === "placket") {
      lines.push(path([[-.06, nk], [0, nk - .035], [.06, nk]]), path([[0, nk - .035], [0, lv.bust - .06]]));
      for (let i = 0; i < 3; i++) buttons.push(circle([.008, nk - .05 - i * .045], .006));
    } else if (neckline === "round") {
      collar.push(poly(band([[-.075, nk + .005], [-.05, nk - .035], [0, nk - .045], [.05, nk - .035], [.075, nk + .005]], .018)));
    } else if (neckline === "square") {
      // A low square neck over a white chemise or blouse.
      underCollar.push(poly([[-.12, lv.bust + .07], [-.12, nk - .02], [.12, nk - .02], [.12, lv.bust + .07]]));
      lines.push(path([[-.12, nk - .02], [-.12, lv.bust + .07], [.12, lv.bust + .07], [.12, nk - .02]]));
      if (g.id === "dirndl" || g.id === "corset") for (let i = 0; i < 5; i++) { const y = lv.bust + .05 - i * .045; cords.push(path([[-.035, y], [.035, y - .03]]), path([[.035, y], [-.035, y - .03]])); }
    }
    // Front opening of an open coat.
    if (ex.has("open-front") && neckline !== "lapel") lines.push(path([[0, lv.neck - .02], [0, hem]]));
  }
  // Extras.
  const waistY = lv.waist;
  if (ex.has("obi")) {
    bands.push(poly([[-(HIP - .025), waistY + .1], [0, waistY + .104], [HIP - .025, waistY + .1], [HIP - .02, waistY - .08], [0, waistY - .084], [-(HIP - .02), waistY - .08]]));
    // Women's kimono: the obiage scarf above the obi and the obijime cord round its middle (as in Kusakabe Kimbei's portraits).
    if (g.wornBy !== "men" && g.id !== "yukata") {
      cords.push(poly(band([[-(HIP - .035), waistY + .005], [-.04, waistY], [0, waistY - .005], [.04, waistY], [HIP - .035, waistY + .005]], .012)));
      lining.push(poly(band([[-(HIP - .04), waistY + .104], [0, waistY + .112], [HIP - .04, waistY + .104]], .014)));
    }
  }
  if (ex.has("sash")) bands.push(smoothClosedPath(mirror([[0, waistY + .03], [s.waist + .01, waistY + .03], [s.waist + .01, waistY - .02], [0, waistY - .02]])));
  if (ex.has("apron")) trim.push(smoothClosedPath(mirror([[0, waistY], [.16, waistY], [.18, (waistY + hem) / 2], [.17, hem + .08], [0, hem + .06]])));
  if (ex.has("drape-left")) {
    // Over the wearer's left shoulder (the viewer's right), leaving the right arm free: the sari's pallu, the toga,
    // a kente cloth (reported in each garment's article). Across the front to the wearer's right hip.
    const m = (pts: FPoint[]) => pts.map(([x, y]) => [-x, y] as FPoint);
    const a: FPoint = [SH + .02, lv.shoulder + .02], b: FPoint = [-s.hemWidth * .62, lv.hip - .08];
    drape.push(smoothClosedPath(m([[-SH - .02, lv.shoulder + .02], [-SH + .14, lv.shoulder + .03], [.18, lv.waist + .05], [s.hemWidth * .7, lv.hip - .05], [s.hemWidth * .5, lv.hip - .14], [.05, lv.waist - .04], [-SH + .02, lv.bust - .1]])));
    // The drape hangs from the shoulder to the hip in nested catenary swags (a sari's pallu, a toga's sinus).
    for (const c of swagFolds([a[0] - .1, a[1] - .06], [b[0] + .04, b[1] + .04], .1, 4)) drapeFolds.push(path(c));
    // Folds also run along the cloth where it is pulled from the shoulder to the hip.
    for (const c of swagFolds([a[0] - .04, a[1] - .02], [b[0] + .1, b[1] + .1], .035, 3)) drapeFolds.push(path(c));
  }
  if (ex.has("wings")) details.push(smoothClosedPath(mirror([[0, lv.neck - .02], [.08, lv.neck], [s.shoulder + .06, lv.shoulder + .04], [s.shoulder + .02, lv.shoulder - .04], [SH - .02, lv.bust - .05], [0, lv.waist]])));
  if (ex.has("train")) details.push(smoothClosedPath(mirror([[0, lv.knee], [s.hemWidth * .9, lv.calf], [s.hemWidth + .16, lv.floor], [0, lv.floor - .02]])));
  if (ex.has("collar-ruff")) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; trim.push(smoothClosedPath([[Math.cos(a) * .05, lv.neck + .03 + Math.sin(a) * .025], [Math.cos(a) * .16, lv.neck + .03 + Math.sin(a) * .055], [Math.cos(a + .17) * .16, lv.neck + .03 + Math.sin(a + .17) * .055]])); }
  if (ex.has("hood")) details.push(smoothClosedPath([[-.12, lv.neck], [-.14, lv.neck + .24], [0, lv.neck + .34], [.14, lv.neck + .24], [.12, lv.neck], [0, lv.neck + .04]]));
  if (ex.has("panels")) lines.push(path([[-.06, lv.hip], [-.07, hem]]), path([[.06, lv.hip], [.07, hem]]));
  if (ex.has("brace")) for (const sd of [1, -1]) bands.push(smoothClosedPath([[sd * .08, lv.waist + .02], [sd * .11, lv.waist + .02], [sd * .1, lv.shoulder - .03], [sd * .07, lv.shoulder - .03]]));
  if (ex.has("fringe")) for (let i = -10; i <= 10; i++) lines.push(path([[i * s.hemWidth / 10, hem], [i * s.hemWidth / 10, hem - .05]]));
  // Garment signatures.
  if (g.id === "hakama") {
    // Five front pleats, two on the wearer's right and three on the left (reported, Wikipedia: Hakama), and the ties at the waist.
    for (const x of [-.13, -.07, .05, .1, .15]) pleats.push(path([[x * .6, lv.waist - .02], [x, (lv.waist + hem) / 2], [x * 1.25, hem + .01]]));
    bands.push(poly(band([[-(HIP - .02), lv.waist + .01], [HIP - .02, lv.waist + .01]], .028)));
    cords.push(poly([[-.035, lv.waist - .005], [.035, lv.waist + .025], [.035, lv.waist - .005], [-.035, lv.waist + .025]]));
  }
  if (g.id === "kilt") {
    // A flat front apron, its free edge fringed, with the kilt pin near its foot; pleats round the sides and back.
    const fx = -.12;
    pleats.push(path([[fx, lv.waist], [fx - .01, hem + .005]]));
    for (let i = 0; i < 6; i++) lines.push(path([[fx - .002, lv.waist - .05 - i * .06], [fx - .018, lv.waist - .07 - i * .06]]));
    cords.push(poly([[fx + .03, hem + .1], [fx + .04, hem + .1], [fx + .04, hem + .19], [fx + .03, hem + .19]]));
    for (const x of [.15, .18, .21, -.17, -.2]) pleats.push(path([[x * .85, lv.hip], [x, hem + .005]]));
  }
  if (g.id === "sari") for (let i = 0; i < 7; i++) { const u = (i / 6 - .5); pleats.push(path([[.01 + u * .05, lv.waist - .01], [.03 + u * .13, (lv.waist + hem) / 2], [.05 + u * .2, hem + .01]])); }
  if (g.id === "haori") {
    // The haori-himo tied at the chest (a loop), and crests on the chest and sleeves for formal wear.
    cords.push(poly(band([[-.05, lv.bust + .03], [-.015, lv.bust + .01], [0, lv.bust - .03], [.015, lv.bust + .01], [.05, lv.bust + .03]], .01)));
    for (const p of [[-.11, lv.shoulder - .06], [.11, lv.shoulder - .06], [-(s.shoulder + .1), lv.shoulder - .06], [s.shoulder + .1, lv.shoulder - .06]] as FPoint[]) buttons.push(circle(p, .012));
  }
  if (g.id === "junihitoe") {
    // Layered robes (kasane) show as nested edges at the neck and the sleeve openings.
    for (let i = 1; i <= 5; i++) {
      lining.push(poly(band([[.065 + i * .012, lv.neck + .005], [-.045 + i * .012, lv.bust - .1], [-.07 + i * .01, lv.waist]], .009)));
      const armX = s.shoulder + .02, wrist = lv.waist - .06;
      for (const sd of [1, -1]) lining.push(poly(band([[sd * (s.shoulder - .02), wrist - .085 + i * .011], [sd * (armX + .23), wrist - .105 + i * .011]], .009)));
    }
  }
  if (g.id === "hanbok" || g.id === "jeogori") {
    // The goreum ribbon tied at the wearer's right chest: a bow with two long ends.
    for (const [dx, len] of [[-.02, .3], [-.045, .26]] as const) cords.push(poly(band([[-.06, lv.bust + .02], [-.06 + dx, lv.bust - len]], .022)));
    cords.push(smoothClosedPath([[-.06, lv.bust + .02], [-.12, lv.bust + .05], [-.11, lv.bust - .01]]));
  }
  if (g.id === "suit") lines.push(path([[-.17, lv.hip + .02], [-.08, lv.hip + .02]]), path([[.08, lv.hip + .02], [.17, lv.hip + .02]]));
  const head = Y("vertex");
  if (ex.has("kasa")) details.push(smoothClosedPath([[-.32, head - .12], [0, head + .1], [.32, head - .12], [0, head - .08]]));
  if (ex.has("gat")) { details.push(smoothClosedPath(mirror([[0, head - .04], [.24, head - .04], [.24, head - .06], [0, head - .07]]))); details.push(smoothClosedPath(mirror([[0, head - .05], [.07, head - .05], [.065, head + .1], [0, head + .1]]))); }
  if (ex.has("keffiyeh")) details.push(smoothClosedPath([[-.12, lv.shoulder - .05], [-.1, head], [0, head + .04], [.1, head], [.12, lv.shoulder - .05], [.06, lv.neck + .02], [-.06, lv.neck + .02]]));
  if (ex.has("kokoshnik")) details.push(smoothClosedPath([[-.1, head - .1], [-.12, head + .02], [0, head + .14], [.12, head + .02], [.1, head - .1], [0, head - .06]]));
  const ax = X("lateral-malleolus.L");
  if (ex.has("sandal") || ex.has("shoe") || ex.has("sock")) for (const sd of [1, -1]) details.push(smoothClosedPath([[sd * (ax - .06), lv.floor], [sd * (ax + .05), lv.floor], [sd * (ax + .05), ex.has("sandal") ? .05 : .09], [sd * (ax - .05), ex.has("sandal") ? .05 : .1]]));
  const j = (a: string[]) => a.join("");
  return { body: j(bodyParts), sleeves: j(sleeves), details: j(details), trim: j(trim), drape: j(drape), lines: j(lines), legs: j(legs), bands: j(bands),
    foldShadow: j(foldShadow), foldRidges: j(foldRidges), drapeFolds: j(drapeFolds), collar: j(collar), underCollar: j(underCollar), lining: j(lining), buttons: j(buttons), cords: j(cords), pleats: j(pleats),
    pattern: PATTERNS[g.id] ?? "none", neckline, drapeInfo, bounds: [-.8, -.02, .8, head + .2] };
}
