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
  hakama: { legs: .2, hemWidth: HIP + .14 },
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

export interface GarmentShape {
  /** Main body piece(s), sleeves, details in the garment's colour (bands, wings, trains, hats), white trim (ruffs, aprons), a lighter drape, and fine lines (folds, openings). */
  body: string; sleeves: string; details: string; trim: string; drape: string; lines: string;
  /** Trouser legs (drawn under the body) and bands (obi, sashes, braces) in a contrasting colour. */
  legs: string; bands: string;
  bounds: readonly [number, number, number, number];
}

const mirror = (pts: readonly FPoint[]) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y] as FPoint)];
const path = (pts: readonly FPoint[]) => (pts.length ? `M${pts.map(p => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join("L")}` : "");

/** A garment's front-view shape on the scale person. */
export function garmentShape(g: GarmentRecord): GarmentShape {
  const s = silhouetteSpec(g), lv = LEVELS, top = lv[s.top], hem = lv[s.hem], ex = new Set(s.extras ?? []);
  const bodyParts: string[] = [], sleeves: string[] = [], details: string[] = [], trim: string[] = [], drape: string[] = [], lines: string[] = [], legs: string[] = [], bands: string[] = [];
  const has = s.shoulder > 0 && top > hem;
  if (has) {
    const neckW = .07, startsAtWaist = s.top === "waist" || s.top === "bust";
    // The right half of the outline from the neck (or waistband) down to the hem, then mirrored.
    const half: FPoint[] = startsAtWaist
      ? [[0, top], [s.shoulder, top], [s.waist, Math.min(top, lv.waist)], [(s.waist + s.hemWidth) / 2 + (s.hemWidth - s.waist) * .12, (lv.waist + hem) / 2], [s.hemWidth, hem], [0, hem]]
      : [[0, lv.neck - .02], [neckW, lv.neck], [s.shoulder, lv.shoulder], [Math.max(s.waist, s.shoulder * .92), lv.bust], [s.waist, Math.max(hem, lv.waist)],
        ...(hem < lv.waist - .05 ? [[(s.waist + s.hemWidth) / 2 + (s.hemWidth - s.waist) * .1, (Math.min(lv.waist, top) + hem) / 2] as FPoint] : []), [s.hemWidth, hem], [0, hem]];
    if (s.legs) {
      // Trousers: two legs from the hip to the hem (the ankle under a full garment), behind any body piece.
      const lower = s.top === "waist", legHem = lower ? hem : lv.ankle, w = s.legs;
      const leg = (sd: number): FPoint[] => [[sd * .015, lv.hip], [sd * (HIP - .005), lv.hip + .04], [sd * (HIP + w * .25), (lv.hip + legHem) / 2], [sd * (w + .09), legHem], [sd * .03, legHem]];
      for (const sd of [1, -1]) legs.push(smoothClosedPath(leg(sd)));
      if (lower) bodyParts.push(smoothClosedPath(mirror([[0, lv.waist + .02], [HIP - .03, lv.waist + .02], [HIP + .005, lv.hip + .02], [0, lv.hip - .02]])));
      else bodyParts.push(smoothClosedPath(mirror(half)));
    } else bodyParts.push(smoothClosedPath(mirror(half)));
    // Sleeves, hanging from the shoulder: straight-cut sleeves are rectangles, others follow the arm.
    const armX = s.shoulder + .02, wrist = lv.waist - .06;
    const sleeveShape = (side: number): FPoint[] | undefined => {
      switch (s.sleeve) {
        case "none": return undefined;
        case "cap": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .05), lv.shoulder - .05], [side * (armX + .02), lv.shoulder - .12], [side * (s.shoulder - .04), lv.shoulder - .1]];
        case "short": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .07), lv.shoulder - .08], [side * (armX + .05), lv.bust - .08], [side * (s.shoulder - .03), lv.bust - .04]];
        case "long": return [[side * (s.shoulder - .03), lv.shoulder + .01], [side * (armX + .06), lv.shoulder - .1], [side * (armX + .05), wrist], [side * (armX - .03), wrist], [side * (s.shoulder - .04), lv.bust - .06]];
        case "wide": return [[side * (s.shoulder - .04), lv.shoulder + .01], [side * (armX + .16), lv.shoulder - .12], [side * (armX + .24), wrist - .1], [side * (armX - .02), wrist - .08], [side * (s.shoulder - .04), lv.bust - .04]];
        case "square": return [[side * (s.shoulder - .04), lv.shoulder + .01], [side * (armX + .14), lv.shoulder - .02], [side * (armX + .15), lv.bust - .1], [side * (armX - .02), lv.bust - .12], [side * (s.shoulder - .03), lv.bust - .04]];
        case "hanging": return [[side * (s.shoulder - .04), lv.shoulder + .01], [side * (armX + .16), lv.shoulder - .02], [side * (armX + .18), lv.knee + .05], [side * (armX + .02), lv.knee + .02], [side * (armX - .02), lv.bust - .12], [side * (s.shoulder - .03), lv.bust - .04]];
      }
    };
    for (const sd of [1, -1]) { const sl = sleeveShape(sd); if (sl) sleeves.push(smoothClosedPath(sl)); }
    // Front opening or the left-over-right overlap of a wrapped garment.
    if (ex.has("open-front")) lines.push(path([[0, lv.neck - .02], [0, hem]]));
    else if (g.cut === "wrapped" || g.cut === "straight-cut") lines.push(path([[-.05, lv.neck], [.07, lv.bust - .06], [.08, Math.max(hem, lv.waist - .2)], [.09, hem]]));
    // Vertical fold lines down the skirt.
    const folds = Math.round(2 + (s.hemWidth - s.waist) * 12);
    for (let i = 1; i < folds; i++) { const u = i / folds * 2 - 1, x0 = u * s.waist * .8, x1 = u * s.hemWidth * .9; if (Math.abs(u) > .15) lines.push(path([[x0, Math.min(lv.waist, top) - .05], [x1, hem + .02]])); }
  }
  // Extras.
  const waistY = lv.waist;
  if (ex.has("obi")) bands.push(smoothClosedPath(mirror([[0, waistY + .1], [HIP - .03, waistY + .1], [HIP - .03, waistY - .08], [0, waistY - .08]])));
  if (ex.has("sash")) bands.push(smoothClosedPath(mirror([[0, waistY + .03], [s.waist + .01, waistY + .03], [s.waist + .01, waistY - .02], [0, waistY - .02]])));
  if (ex.has("apron")) trim.push(smoothClosedPath(mirror([[0, waistY], [.16, waistY], [.18, (waistY + hem) / 2], [.17, hem + .08], [0, hem + .06]])));
  if (ex.has("drape-left")) drape.push(smoothClosedPath([[-SH - .02, lv.shoulder + .02], [-SH + .14, lv.shoulder + .03], [.18, lv.waist + .05], [s.hemWidth * .7, lv.hip - .05], [s.hemWidth * .5, lv.hip - .14], [.05, lv.waist - .04], [-SH + .02, lv.bust - .1]]));
  if (ex.has("wings")) details.push(smoothClosedPath(mirror([[0, lv.neck - .02], [.08, lv.neck], [s.shoulder + .06, lv.shoulder + .04], [s.shoulder + .02, lv.shoulder - .04], [SH - .02, lv.bust - .05], [0, lv.waist]])));
  if (ex.has("train")) details.push(smoothClosedPath(mirror([[0, lv.knee], [s.hemWidth * .9, lv.calf], [s.hemWidth + .16, lv.floor], [0, lv.floor - .02]])));
  if (ex.has("collar-ruff")) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; trim.push(smoothClosedPath([[Math.cos(a) * .05, lv.neck + .03 + Math.sin(a) * .025], [Math.cos(a) * .16, lv.neck + .03 + Math.sin(a) * .055], [Math.cos(a + .17) * .16, lv.neck + .03 + Math.sin(a + .17) * .055]])); }
  if (ex.has("hood")) details.push(smoothClosedPath([[-.12, lv.neck], [-.14, lv.neck + .24], [0, lv.neck + .34], [.14, lv.neck + .24], [.12, lv.neck], [0, lv.neck + .04]]));
  if (ex.has("panels")) lines.push(path([[-.06, lv.hip], [-.07, hem]]), path([[.06, lv.hip], [.07, hem]]));
  if (ex.has("brace")) for (const sd of [1, -1]) bands.push(smoothClosedPath([[sd * .08, lv.waist + .02], [sd * .11, lv.waist + .02], [sd * .1, lv.shoulder - .03], [sd * .07, lv.shoulder - .03]]));
  if (ex.has("fringe")) for (let i = -10; i <= 10; i++) lines.push(path([[i * s.hemWidth / 10, hem], [i * s.hemWidth / 10, hem - .05]]));
  const head = Y("vertex");
  if (ex.has("kasa")) details.push(smoothClosedPath([[-.32, head - .12], [0, head + .1], [.32, head - .12], [0, head - .08]]));
  if (ex.has("gat")) { details.push(smoothClosedPath(mirror([[0, head - .04], [.24, head - .04], [.24, head - .06], [0, head - .07]]))); details.push(smoothClosedPath(mirror([[0, head - .05], [.07, head - .05], [.065, head + .1], [0, head + .1]]))); }
  if (ex.has("keffiyeh")) details.push(smoothClosedPath([[-.12, lv.shoulder - .05], [-.1, head], [0, head + .04], [.1, head], [.12, lv.shoulder - .05], [.06, lv.neck + .02], [-.06, lv.neck + .02]]));
  if (ex.has("kokoshnik")) details.push(smoothClosedPath([[-.1, head - .1], [-.12, head + .02], [0, head + .14], [.12, head + .02], [.1, head - .1], [0, head - .06]]));
  const ax = X("lateral-malleolus.L");
  if (ex.has("sandal") || ex.has("shoe") || ex.has("sock")) for (const sd of [1, -1]) details.push(smoothClosedPath([[sd * (ax - .06), lv.floor], [sd * (ax + .05), lv.floor], [sd * (ax + .05), ex.has("sandal") ? .05 : .09], [sd * (ax - .05), ex.has("sandal") ? .05 : .1]]));
  return { body: bodyParts.join(""), sleeves: sleeves.join(""), details: details.join(""), trim: trim.join(""), drape: drape.join(""), lines: lines.join(""), legs: legs.join(""), bands: bands.join(""), bounds: [-.8, -.02, .8, head + .2] };
}
