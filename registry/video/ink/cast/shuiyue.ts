/**
 * 水月 Shuǐyuè, water and moon: an original ink-wash figure on the INK-RISO1 engine, painted wash first and line last. Three spot inks:
 * teal, vermilion, sumi. `inkShuiyue` is the figure in layers, for a film; `drawInkWashPortrait` the still picture. Both draw the same marks.
 *
 * The trunk is turned about 66 degrees away and the head looks back over the near shoulder, bowed and tilted. The hair parts over the
 * forehead: one lock falls beside the far cheek, the rest is gathered into a bun, and the back hangs free. The robe closes the
 * wearer's left over right.
 */
import { inkFbm2, inkSpline } from "../../ink-riso-press";
import type { InkRisoSheet, InkRisoSheetSpec } from "../../ink-riso-press";
import { createInkRisoPens, inkSplatter } from "../../ink-riso-pen";
import type { InkRisoPen, PenNode as N3, PenPoint as P2 } from "../../ink-riso-pen";
import { inkBlob, inkBloom, inkSide, inkThread } from "../../ink-riso-wet";
import { inkClumps, inkFlyaways, inkGap, inkSweep, inkTress, inkWisps } from "../../ink-riso-hair";
import type { InkClumpOptions, InkFlyawayOptions, InkGapShape, InkSweepOptions } from "../../ink-riso-hair";
import { inkGuideSheet, inkHang } from "../../ink-riso-coiffure";
import type { InkSheetForm } from "../../ink-riso-coiffure";
import { poseInkHead } from "../../ink-riso-face";
import type { InkHead } from "../../ink-riso-face";
import { paintInkEar, paintInkEarring, paintInkFace } from "../../ink-riso-face-paint";
import { beautifulFace } from "../../../anatomy/face-beauty";
import { eyeCentres } from "../../../anatomy/anatomy-face";
import { inkPaintOrder } from "../ink-cel";
import { inkCover, inkFade, inkOval } from "../ink-veil";
import type { InkPaintContext, InkPart, InkSubject } from "../ink-cel";

type Pens = Record<"face" | "robe" | "page", InkRisoPen>;
const K = "black", R = "red", T = "teal";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A soft spot of tone: centre, half-length, half-width, angle (radians). */
const spot = (x: number, y: number, cx: number, cy: number, l: number, s: number, an = 0) => { const c = Math.cos(an), n = Math.sin(an), u = (x - cx) * c + (y - cy) * n, v = -(x - cx) * n + (y - cy) * c; return Math.exp(-((u / l) ** 2 + (v / s) ** 2)); };

const PAGE = { width: 1200, height: 1600, margin: 36 };
const PLATES: InkRisoSheetSpec["plates"] = [
  { id: T, ink: "#2A6072", screen: "grain", cell: 0.6, angle: 15, register: [-0.8, 0.6], rotate: 0.02, density: 0.94, mottle: 0.5, pinholes: 0.4 },
  { id: R, ink: "#F2492A", screen: "grain", cell: 0.55, angle: 75, register: [0.9, -0.6], rotate: -0.03, density: 0.96, mottle: 0.5, pinholes: 0.4 },
  { id: K, ink: "#18171A", screen: "grain", cell: 0.5, angle: 45, register: [0, 0], density: 1, mottle: 0.2, pinholes: 0.25 },
];
export interface InkWashPortraitCrop { x: number; y: number; width: number; height: number }
export function inkWashPortraitSheet(scale: number, crop?: InkWashPortraitCrop): InkRisoSheetSpec {
  return { width: crop?.width ?? PAGE.width, height: crop?.height ?? PAGE.height, scale, paper: "#F8F1E3", seed: 11, plates: PLATES, margin: crop ? 0 : PAGE.margin };
}
/** The figure's size on the page. */
const Z = 1.62;
const FACE = { x: 498, y: 652, scale: 1.92 * Z };
/** One posed head; every part of the drawing is placed from it. */
const SITTER = beautifulFace({ sex: 0, faceType: "east-asian" });
const pose = (open = 1): InkHead => poseInkHead({ vertices: SITTER.vertices, faces: SITTER.mesh.faces, eyes: eyeCentres(SITTER.vertices) }, { yaw: -17, pitch: 7, roll: -8, scale: 0.78, at: [0, 0] }, { forehead: 0.6, length: 0.951, lift: 3.9, philtrum: 2.8, noseHeight: 0.08, gaze: [0, 0.02], open });
const HEAD = pose();
/** The middle between the pupils. */
const EYES = HEAD.face(0, 0);
const FRAMES = { face: FACE, robe: { x: FACE.x + FACE.scale * EYES[0], y: FACE.y + FACE.scale * EYES[1], scale: (FACE.scale * HEAD.span) / 100 }, page: { x: 0, y: 0, scale: 1 } };
export function drawInkWashPortrait(sheet: InkRisoSheet, crop?: InkWashPortraitCrop): void {
  const pen: Pens = createInkRisoPens(sheet, FRAMES, crop);
  drawMist(pen);
  drawBody(pen);
  drawHead(pen);
  if (crop) return;
  drawInscription(pen);
}

// ---- head -----------------------------------------------------------------------------------------------------------------------
const FACE_STYLE = { ink: K, warm: R };
function drawHead(pen: Pens) {
  const f = pen.face;
  drawFall(pen);
  paintInkFace(f, HEAD, FACE_STYLE);
  const lobe = paintInkEar(f, HEAD, FACE_STYLE);
  drawHair(pen);
  paintInkEarring(f, lobe, { ink: K, jewel: T, warm: R, sway: 0.03, seed: 610 });
}

// ---- hair -----------------------------------------------------------------------------------------------------------------------
// Every lock leaves one short part over the forehead and runs along the hairline, not back from it: forward over the far temple, along
// the near one, and up over the crown. The near side is gathered into a bun at the back in a few full locks with paper between them.
// Places are read in the frame portraits are measured in: the irises level, 1 = the distance between them.
type Run = readonly P2[];
/** Places in that frame with a half width, or with the pressure. */
type Lock = readonly (readonly [number, number, number])[];
const lv = (q: Run): P2[] => q.map(([x, y]) => HEAD.level(x, y));
/** The unit of that frame, pen units. */
const UNIT = Math.hypot(HEAD.level(1, 0)[0] - HEAD.level(0, 0)[0], HEAD.level(1, 0)[1] - HEAD.level(0, 0)[1]);
/** A lock's middle line and its half width, on the pen. */
const lock = (q: Lock) => q.map(([x, y, w]) => [...HEAD.level(x, y), w * UNIT] as const);
/** Wide in the middle, a point at both ends. */
const leaf = (t: number) => Math.sin(Math.PI * t) ** 0.8;
const guides = (list: readonly (readonly [s: number, path: Run])[]) => inkGuideSheet(HEAD, list.map(([s, path]) => ({ s, path: lv(path) })));
/** Over the crown: from the part's end up and back, then drawn in under the bun. The top guide is the head's outline. */
const CROWN = guides([
  [0, [[-0.315, -1.56], [-0.335, -1.7], [-0.285, -1.82], [-0.16, -1.92], [0.02, -2.02], [0.22, -2.1], [0.45, -2.155], [0.68, -2.17], [0.9, -2.145], [1.1, -2.09], [1.25, -2.04], [1.36, -2]]],
  [0.3, [[-0.25, -1.57], [-0.22, -1.69], [-0.13, -1.79], [0.03, -1.88], [0.24, -1.96], [0.47, -2.01], [0.7, -2.02], [0.93, -2], [1.14, -1.97], [1.29, -1.95], [1.4, -1.94]]],
  [0.58, [[-0.17, -1.575], [-0.07, -1.69], [0.08, -1.78], [0.28, -1.84], [0.5, -1.87], [0.73, -1.87], [0.95, -1.85], [1.15, -1.84], [1.3, -1.86], [1.42, -1.89]]],
  [0.8, [[-0.1, -1.575], [0.04, -1.66], [0.22, -1.7], [0.42, -1.735], [0.63, -1.73], [0.84, -1.71], [1.03, -1.7], [1.19, -1.73], [1.31, -1.8], [1.41, -1.86]]],
  [1, [[-0.06, -1.55], [0.1, -1.575], [0.28, -1.565], [0.48, -1.545], [0.68, -1.53], [0.86, -1.535], [1.02, -1.55], [1.17, -1.61], [1.28, -1.7], [1.36, -1.79], [1.39, -1.84]]],
]);
/** Down the near side: four locks, each between two guides that meet at the roots and part toward the bun, so paper opens there. */
const SIDE = guides([
  [0, [[-0.1, -1.595], [0.1, -1.63], [0.3, -1.61], [0.55, -1.56], [0.8, -1.51], [1.1, -1.5], [1.4, -1.52], [1.6, -1.555], [1.74, -1.6]]],
  [0.2, [[-0.125, -1.485], [0.1, -1.435], [0.35, -1.35], [0.65, -1.275], [1, -1.225], [1.3, -1.215], [1.55, -1.28], [1.72, -1.37], [1.82, -1.45]]],
  [0.22, [[-0.125, -1.52], [0.1, -1.5], [0.35, -1.41], [0.65, -1.33], [1, -1.26], [1.3, -1.225], [1.5, -1.215], [1.7, -1.225], [1.88, -1.25]]],
  [0.48, [[-0.14, -1.368], [-0.02, -1.318], [0.1, -1.25], [0.28, -1.145], [0.48, -1.05], [0.72, -0.975], [0.95, -0.925], [1.25, -0.905], [1.5, -0.96], [1.72, -1.05], [1.9, -1.15]]],
  [0.5, [[0.1, -1.26], [0.3, -1.16], [0.5, -1.07], [0.72, -0.985], [0.9, -0.905], [1.15, -0.855], [1.4, -0.865], [1.65, -0.93], [1.92, -1.07]]],
  [0.7, [[0.3, -1.15], [0.5, -1], [0.7, -0.81], [0.88, -0.695], [1.05, -0.62], [1.25, -0.585], [1.45, -0.61], [1.65, -0.68], [1.8, -0.78], [1.95, -0.92]]],
  [0.72, [[0.6, -0.95], [0.75, -0.84], [0.89, -0.725], [1.03, -0.6], [1.25, -0.535], [1.45, -0.56], [1.65, -0.64], [1.8, -0.74], [1.96, -0.88]]],
  [0.9, [[0.72, -0.88], [0.82, -0.72], [0.92, -0.58], [1.02, -0.49], [1.2, -0.445], [1.4, -0.435], [1.6, -0.48], [1.8, -0.57], [1.97, -0.7]]],
]);
/** What the head's hair stands on: paper, inside its outline. */
const GROUND: Run = [[-0.12, -1.37], [-0.31, -1.6], [-0.335, -1.71], [-0.285, -1.82], [-0.16, -1.92], [0.02, -2.02], [0.22, -2.1], [0.45, -2.155], [0.68, -2.17], [0.9, -2.145], [1.1, -2.09], [1.36, -2], [1.7, -1.8], [1.95, -1.3], [2.06, -0.8], [2, -0.45], [1.8, -0.18], [1.5, -0.1], [1.2, -0.1], [1.03, -0.2], [0.94, -0.45], [0.8, -0.72], [0.5, -1.02], [0.1, -1.255]];
/** The bun: a hank that rises from the gather, turns over the top and comes down behind. */
const BUN = guides([
  [0, [[1.17, -2.24], [1.22, -2.38], [1.38, -2.465], [1.57, -2.465], [1.76, -2.42], [1.96, -2.34], [2.14, -2.22], [2.29, -2.06], [2.38, -1.86], [2.405, -1.68], [2.37, -1.51], [2.25, -1.34]]],
  [0.35, [[1.19, -2.21], [1.28, -2.31], [1.45, -2.36], [1.63, -2.34], [1.8, -2.28], [1.97, -2.18], [2.12, -2.04], [2.23, -1.88], [2.29, -1.7], [2.3, -1.54], [2.27, -1.4], [2.19, -1.26]]],
  [0.7, [[1.21, -2.18], [1.34, -2.22], [1.5, -2.21], [1.66, -2.15], [1.81, -2.06], [1.95, -1.94], [2.06, -1.8], [2.14, -1.64], [2.18, -1.48], [2.19, -1.34], [2.17, -1.22], [2.13, -1.1]]],
  [1, [[1.22, -2.14], [1.36, -2.11], [1.5, -2.06], [1.64, -1.97], [1.77, -1.85], [1.88, -1.72], [1.97, -1.57], [2.03, -1.42], [2.06, -1.28], [2.08, -1.16], [2.08, -1.06], [2.08, -0.98]]],
]);
/** The lock wrapped round its foot, over the ends of the gathered hair, from the crown down to the nape. */
const WRAP = guides([
  [0, [[1.16, -2.28], [1.2, -2.13], [1.32, -1.96], [1.47, -1.79], [1.61, -1.58], [1.73, -1.37], [1.83, -1.15], [1.9, -0.94], [1.97, -0.75], [2.03, -0.6]]],
  [0.5, [[1.2, -2.28], [1.34, -2.14], [1.52, -1.97], [1.69, -1.76], [1.83, -1.53], [1.93, -1.3], [2.0, -1.09], [2.04, -0.9], [2.06, -0.73], [2.07, -0.59]]],
  [1, [[1.23, -2.29], [1.46, -2.2], [1.69, -2.04], [1.89, -1.82], [2.05, -1.58], [2.15, -1.35], [2.19, -1.13], [2.17, -0.93], [2.13, -0.74], [2.09, -0.58]]],
]);
/** The tie: a flat ribbon round the bun's foot, along the wrapped lock's front edge. */
const TIE = guides([
  [0, [[1.19, -2.165], [1.28, -1.97], [1.435, -1.8], [1.565, -1.6], [1.685, -1.39], [1.785, -1.17], [1.855, -0.97]]],
  [1, [[1.215, -2.18], [1.375, -2.0], [1.54, -1.82], [1.68, -1.61], [1.8, -1.39], [1.89, -1.17], [1.945, -0.98]]],
]);
/** The hair's tools. */
function comb(f: InkRisoPen, from: number) {
  let s = from;
  const m = Z / 1.4;
  const style = (o: Partial<InkSweepOptions>): InkSweepOptions => ({ seed: s++, clear: [R, T], ...o, hairWidth: m * (o.hairWidth ?? 1.2) });
  /** A lock of a sheet, between two places along its root line. */
  const tress = (form: InkSheetForm, s0: number, s1: number, o: Partial<InkSweepOptions> & { to?: number; pinch?: (t: number) => number; lift?: number; flat?: boolean } = {}) => inkTress(f, K, form.lock(s0, s1, { to: o.to, pinch: o.pinch, lift: o.lift, flat: o.flat }), style(o));
  /** A lock on its own: its middle line and half width. */
  const sweep = (q: Lock, o: Partial<InkSweepOptions> & { seed: number }) => inkSweep(f, K, lock(q), { load: 0.98, root: 0.02, tip: 0.1, edge: [0.06, 0.06], hairs: 3, stray: 1.3, streak: 0.18, clear: [R, T], hairWidth: 1.3, ...o });
  /** One hair: its line and the pressure along it. */
  const hair = (q: Lock, w: number, ink: number, seed: number) => inkThread(f, K, q.map(([x, y, p]) => [...HEAD.level(x, y), p] as const), w, { ink, inkEnd: ink * 0.7, seed });
  /** One hair that comes out of a mass and goes back into it. */
  const strand = (q: Run, w: number, ink: number, seed: number) => hair(q.map(([x, y], k) => [x, y, 0.1 + 0.9 * leaf(k / (q.length - 1))] as const), w, ink, seed);
  const wisps = (g: readonly Run[], o: Omit<Parameters<typeof inkWisps>[3], "seed">) => inkWisps(f, K, g.map(lv), { seed: s++, ...o, width: [m * (o.width?.[0] ?? 0.7), m * (o.width?.[1] ?? 1.8)] });
  /** Loose locks over a sheet, each its own; and single hairs standing off it. */
  const clumps = (form: InkSheetForm, o: Omit<InkClumpOptions, "seed"> & { seed?: number }) => inkClumps(f, K, form, { seed: s++, clear: [R, T], ...o, hairWidth: m * (o.hairWidth ?? 1.1) });
  const flyaways = (form: InkSheetForm, o: Omit<InkFlyawayOptions, "seed">) => inkFlyaways(f, K, form, { seed: s++, ...o, width: [m * (o.width?.[0] ?? 0.6), m * (o.width?.[1] ?? 1.5)] });
  /** Paper let into the mass where two locks part, or along a lock of a sheet. */
  const gap = (q: Run, w: number, shape?: InkGapShape) => inkGap(f, [K], lv(q), w * UNIT * FACE.scale, shape);
  const slit = (form: InkSheetForm, at: number, t0: number, t1: number, w: number) => inkGap(f, [K], form.run(at, t0, t1, 9), w * UNIT * FACE.scale, "leaf");
  /** A full lock of a sheet: one dark, and looser ones over it. */
  const lobe = (form: InkSheetForm, s0: number, s1: number, seed: number, o: NonNullable<Parameters<typeof tress>[3]> & { n?: number } = {}) => {
    const { n = 3, ...rest } = o, w = s1 - s0;
    tress(form, s0, s1, { load: 0.9, root: 0.01, tip: 0.02, edge: [0.02, 0.03], streak: 0.34, hairs: 4, stray: 1.1, seed, ...rest });
    if (n) clumps(form, { n, s: [s0 + 0.12 * w, s1 - 0.12 * w], half: [0.08 * w, 0.16 * w], from: [0.04, 0.3], to: [0.76, 0.98], lift: [1, 3], drift: 0.05 * w, load: [1, 0.95], root: 0.2, tip: 0.2, streak: 0.3, hairs: 1, stray: 1, seed: seed + 60 });
  };
  return { sweep, hair, strand, wisps, flyaways, gap, slit, lobe };
}
function drawHair(pen: Pens) { drawGathered(pen); drawKnot(pen); drawTails(pen); drawBand(pen); drawFarLock(pen); drawParting(pen); drawStrands(pen); }
/** The head's ground, the crown and the near side. */
function drawGathered({ face: f }: Pens) {
  const { sweep, hair, strand, flyaways, gap, slit, lobe } = comb(f, 500);
  f.knock(f.shape(lv(GROUND)), [K, R, T]);
  // ---- crown: one full lock, a fine line standing off its outline
  hair([[-0.31, -1.61, 0.3], [-0.345, -1.72, 0.9], [-0.3, -1.84, 1], [-0.18, -1.95, 0.9], [0, -2.055, 0.7], [0.18, -2.125, 0.3]], 2.4, 0.86, 541);
  flyaways(CROWN, { n: 10, s: [-0.02, 0.25], from: [0, 0.3], length: [0.35, 0.7], lift: [2, 9], drift: 0.06, ink: [0.35, 0.8] });
  sweep([[0.36, -2.12, 0.008], [0.39, -2.23, 0.024], [0.49, -2.36, 0.034], [0.66, -2.455, 0.036], [0.86, -2.49, 0.034], [1.04, -2.44, 0.034], [1.16, -2.32, 0.038], [1.23, -2.18, 0.042], [1.29, -2.04, 0.036], [1.36, -1.92, 0.02]], { seed: 538, load: 0.86, streak: 0.4, hairs: 7, stray: 2, root: 0.06, tip: 0.04 });
  lobe(CROWN, 0, 1, 537, { n: 5 });
  slit(CROWN, 0.17, 0.16, 0.58, 0.008); slit(CROWN, 0.45, 0.44, 0.86, 0.007);
  // ---- near side: from the lowest lock up
  const loose: readonly (readonly [Run, number, number])[] = [
    [[[1, -0.47], [1.08, -0.41], [1.2, -0.385], [1.4, -0.375], [1.6, -0.41], [1.8, -0.5], [1.93, -0.63]], 1.9, 0.82], [[[1, -0.44], [1.06, -0.36], [1.15, -0.31], [1.35, -0.28], [1.55, -0.3], [1.75, -0.4], [1.9, -0.55]], 1.7, 0.78],
    [[[1.0, -0.38], [1.07, -0.3], [1.2, -0.245], [1.45, -0.23], [1.65, -0.3], [1.82, -0.44]], 2.3, 0.86], [[[1.02, -0.36], [1.12, -0.275], [1.28, -0.24], [1.5, -0.26], [1.72, -0.36]], 1.2, 0.6],
  ];
  for (const [i, [q, w, ink]] of loose.entries()) strand(q, w, ink, 550 + i);
  sweep([[0.99, -0.24, 0.006], [1.08, -0.165, 0.032], [1.28, -0.135, 0.05], [1.5, -0.15, 0.056], [1.7, -0.22, 0.072], [1.86, -0.36, 0.096], [1.95, -0.55, 0.112], [1.96, -0.76, 0.112], [1.93, -0.96, 0.104], [1.86, -1.16, 0.09], [1.76, -1.34, 0.05]], { seed: 530, tip: 0.02, plies: { n: 2, load: [1, 0.94], streak: 0.2 } });
  lobe(SIDE, 0.72, 0.9, 531, { n: 2 });
  lobe(SIDE, 0.5, 0.7, 532, { n: 2 });
  lobe(SIDE, 0.22, 0.48, 533, { n: 4 });
  lobe(SIDE, 0, 0.2, 534, { n: 2 });
  // paper inside the locks, long points that lie along them
  gap([[1.46, -0.79], [1.64, -0.82], [1.8, -0.9], [1.93, -1.02]], 0.034, "leaf"); gap([[1.0, -0.965], [1.16, -0.952], [1.34, -0.968]], 0.018, "leaf"); gap([[0.97, -0.64], [1.07, -0.575], [1.22, -0.545]], 0.02, "leaf");
  slit(SIDE, 0.33, 0.22, 0.6, 0.007);
  // hairs that did not go with them
  for (const [i, [q, w, ink]] of ([
    [[[0.8, -1.505], [1.05, -1.515], [1.26, -1.56], [1.42, -1.64], [1.5, -1.73]], 1.7, 0.8], [[[0.95, -1.525], [1.18, -1.56], [1.34, -1.63], [1.43, -1.73]], 1.3, 0.7], [[[1.4, -1.22], [1.58, -1.265], [1.74, -1.35]], 1.5, 0.8], [[[1.45, -1.215], [1.62, -1.24], [1.8, -1.31]], 1.2, 0.7],
    [[[0.85, -0.96], [1.1, -0.895], [1.35, -0.89], [1.6, -0.95], [1.8, -1.05]], 1.4, 0.85], [[[1, -0.66], [1.15, -0.6], [1.35, -0.575], [1.55, -0.62]], 1.2, 0.8],
  ] as readonly (readonly [Run, number, number])[]).entries()) strand(q, w, ink, 556 + i);
}
/** The far side: one lock from the part, over the temple, beside the cheek and out; one behind it, with paper let in between, and a hair line on either side. */
function drawFarLock({ face: f }: Pens) {
  const { sweep, hair, gap } = comb(f, 500);
  hair([[-0.44, -1.49, 0.2], [-0.62, -1.38, 0.8], [-0.8, -1.2, 1], [-0.96, -0.98, 1], [-1.09, -0.72, 1], [-1.19, -0.44, 1], [-1.25, -0.14, 0.9], [-1.26, 0.16, 0.8], [-1.21, 0.46, 0.7], [-1.11, 0.76, 0.6], [-1, 1, 0.4], [-0.92, 1.16, 0]], 2.2, 0.8, 521);
  sweep([[-0.52, -1.4, 0.004], [-0.7, -1.2, 0.02], [-0.84, -1, 0.024], [-0.955, -0.78, 0.028], [-1.05, -0.55, 0.032], [-1.125, -0.32, 0.034], [-1.165, -0.1, 0.033], [-1.17, 0.12, 0.028], [-1.145, 0.34, 0.022], [-1.09, 0.56, 0.015], [-1.025, 0.78, 0.009], [-0.965, 0.98, 0]], { seed: 523, streak: 0.24, tip: 0.1, hairs: 2 });
  sweep([[-0.085, -1.475, 0.088], [-0.2, -1.475, 0.12], [-0.31, -1.455, 0.134], [-0.47, -1.345, 0.114], [-0.62, -1.205, 0.102], [-0.755, -1.025, 0.1], [-0.865, -0.81, 0.092], [-0.945, -0.57, 0.092], [-0.995, -0.33, 0.088], [-1.03, -0.1, 0.083], [-1.05, 0.12, 0.077], [-1.05, 0.32, 0.07], [-1.015, 0.52, 0.062], [-0.955, 0.72, 0.054], [-0.9, 0.92, 0.048], [-0.865, 1.12, 0.043], [-0.858, 1.32, 0.038], [-0.885, 1.52, 0.032], [-0.955, 1.72, 0.027], [-1.06, 1.92, 0.022], [-1.19, 2.12, 0.018], [-1.33, 2.31, 0.015], [-1.45, 2.47, 0.012], [-1.5, 2.6, 0.008], [-1.465, 2.69, 0.002]], { seed: 522, load: 0.93, root: 0.004, tip: 0.02, hairs: 2, stray: 1.2, plies: { n: 3, load: [1, 0.95], streak: 0.3 } });
  gap([[-0.975, -0.76], [-1.035, -0.55], [-1.085, -0.32], [-1.12, -0.1], [-1.128, 0.08]], 0.034, "leaf"); gap([[-0.955, -0.46], [-1, -0.22], [-1.02, 0]], 0.012, "leaf");
  hair([[-0.155, -1.325, 0.2], [-0.3, -1.275, 0.8], [-0.45, -1.19, 1], [-0.57, -1.09, 1], [-0.685, -0.955, 0.9], [-0.775, -0.82, 0.6], [-0.83, -0.7, 0.1]], 2.6, 0.9, 524);
  hair([[-0.9, -0.44, 0.1], [-0.925, -0.2, 0.8], [-0.92, 0.05, 1], [-0.905, 0.3, 0.9], [-0.9, 0.52, 0.6], [-0.88, 0.74, 0]], 1.4, 0.66, 525);
  hair([[-0.96, 0.55, 0.2], [-0.9, 0.72, 0.8], [-0.85, 0.94, 1], [-0.82, 1.18, 0.8], [-0.83, 1.42, 0.4], [-0.85, 1.58, 0]], 1.4, 0.66, 526);
  hair([[-1.0, 0.82, 0.3], [-1.07, 1.06, 0.9], [-1.2, 1.28, 1], [-1.4, 1.45, 0.8], [-1.62, 1.52, 0]], 1.7, 0.74, 527);
  hair([[-0.95, 0.95, 0.3], [-0.98, 1.22, 0.8], [-1.08, 1.5, 0.8], [-1.26, 1.78, 0.6], [-1.48, 1.96, 0]], 1.3, 0.6, 528);
}
/** The part: a narrow ragged strip of paper that locks leave both ways, and a star of wedges where they fan over the crown. */
function drawParting({ face: f }: Pens) {
  const { gap } = comb(f, 500);
  gap([[-0.122, -1.35], [-0.128, -1.395], [-0.134, -1.42], [-0.12, -1.455], [-0.122, -1.49], [-0.112, -1.52], [-0.08, -1.56], [-0.05, -1.598]], 0.044, t => [0.9, 0.74, 0.9, 0.6, 0.8, 1, 1.15, 1.1][Math.round(7 * t)]);
  for (const [q, w] of [
    [[[-0.09, -1.55], [-0.03, -1.59], [0.035, -1.625], [0.095, -1.645], [0.16, -1.648]], 0.052], [[[-0.06, -1.59], [0.015, -1.655], [0.075, -1.7], [0.145, -1.748], [0.22, -1.79]], 0.05], [[[-0.06, -1.6], [-0.045, -1.665], [-0.018, -1.73], [0.025, -1.78], [0.06, -1.815]], 0.024], [[[-0.075, -1.59], [-0.065, -1.645], [-0.06, -1.69]], 0.032],
    [[[-0.08, -1.585], [-0.145, -1.597], [-0.21, -1.6]], 0.032], [[[-0.15, -1.595], [-0.156, -1.63], [-0.157, -1.67]], 0.028],
    [[[-0.1, -1.515], [-0.16, -1.503], [-0.215, -1.485]], 0.028], [[[-0.11, -1.54], [-0.145, -1.535], [-0.18, -1.528]], 0.026], [[[-0.12, -1.42], [-0.155, -1.416], [-0.19, -1.405]], 0.026], [[[-0.12, -1.385], [-0.19, -1.378], [-0.28, -1.345], [-0.37, -1.3]], 0.015],
    [[[-0.12, -1.455], [-0.08, -1.468], [-0.045, -1.486]], 0.024], [[[-0.11, -1.505], [-0.08, -1.508], [-0.055, -1.518]], 0.022],
  ] as readonly (readonly [Run, number])[]) gap(q, w);
}
/** Before the near temple the mass's front edge comes loose, broad and fine strands by turns, and falls past the brow's end to the jaw. */
function drawStrands({ face: f }: Pens) {
  const { sweep, hair } = comb(f, 500);
  sweep([[0.56, -1.15, 0.014], [0.68, -1.01, 0.034], [0.785, -0.865, 0.046], [0.86, -0.71, 0.052], [0.925, -0.54, 0.051], [0.97, -0.37, 0.049], [1, -0.2, 0.046], [1.02, -0.02, 0.041], [1.035, 0.16, 0.034], [1.04, 0.34, 0.026], [1.025, 0.53, 0.018], [0.995, 0.72, 0.012], [0.95, 0.89, 0.006], [0.9, 1.02, 0]], { seed: 543, root: 0.16, tip: 0.2, hairs: 3, stray: 1.1, plies: { n: 2, load: [1, 0.9], streak: 0.3 } });
  sweep([[0.1, -1.36, 0.01], [0.23, -1.21, 0.028], [0.33, -1.07, 0.033], [0.42, -0.93, 0.034], [0.505, -0.79, 0.034], [0.585, -0.65, 0.033], [0.66, -0.51, 0.033], [0.73, -0.37, 0.033], [0.8, -0.22, 0.032], [0.87, -0.04, 0.03], [0.925, 0.14, 0.027], [0.96, 0.32, 0.022], [0.975, 0.5, 0.016], [0.955, 0.68, 0.011], [0.905, 0.85, 0.006], [0.84, 1, 0]], { seed: 544, root: 0.01, tip: 0.22, hairs: 4, stray: 1.8 });
  sweep([[0.04, -1.32, 0.008], [0.14, -1.2, 0.015], [0.21, -1.09, 0.017], [0.28, -0.975, 0.017], [0.345, -0.86, 0.014], [0.435, -0.7, 0.012], [0.53, -0.54, 0.011], [0.62, -0.4, 0.011], [0.71, -0.24, 0.011], [0.785, -0.09, 0.01], [0.85, 0.07, 0.009], [0.89, 0.25, 0.007], [0.91, 0.44, 0.004], [0.905, 0.62, 0]], { seed: 542, root: 0.01, tip: 0.3, hairs: 2, stray: 1.6, load: 0.94 });
  for (const [q, w, ink, seed] of [
    [[[0.27, -1, 0.1], [0.31, -0.87, 0.7], [0.33, -0.73, 0.8], [0.37, -0.59, 0.8], [0.43, -0.46, 0.8], [0.505, -0.345, 0.7], [0.595, -0.225, 0.6], [0.685, -0.13, 0.4], [0.75, -0.095, 0]], 1.6, 0.7, 546],
    [[[0.46, -0.99, 0.1], [0.56, -0.85, 0.7], [0.635, -0.73, 1], [0.7, -0.6, 1], [0.765, -0.46, 1], [0.835, -0.31, 0.9], [0.895, -0.15, 0.9], [0.945, 0.02, 0.8], [0.98, 0.2, 0.6], [1, 0.4, 0.3], [0.99, 0.55, 0]], 2.4, 0.88, 547],
    [[[0.5, -0.96, 0.2], [0.6, -0.865, 0.9], [0.7, -0.785, 1], [0.79, -0.7, 0.8], [0.86, -0.58, 0.2]], 2.2, 0.86, 545],
    [[[0.6, -0.86, 0.1], [0.68, -0.71, 0.8], [0.745, -0.575, 1], [0.805, -0.44, 1], [0.865, -0.31, 0.9], [0.925, -0.15, 0.7], [0.97, 0.03, 0.4], [0.99, 0.2, 0]], 1.8, 0.84, 548],
    [[[0.8, -0.4, 0], [0.88, -0.32, 0.8], [0.945, -0.21, 0.9], [0.98, -0.07, 0.8], [0.995, 0.1, 0.4], [1, 0.24, 0]], 1.2, 0.66, 551],
    [[[0.6, -0.5, 0], [0.71, -0.33, 0.7], [0.81, -0.12, 0.9], [0.885, 0.1, 0.9], [0.925, 0.32, 0.8], [0.93, 0.55, 0.6], [0.89, 0.78, 0.4], [0.82, 0.95, 0.2], [0.76, 1.06, 0]], 1.6, 0.8, 549],
  ] as const) hair(q, w, ink, seed);
}
/** The fall: one dark mass from behind the ear to the shoulder, then a few long tails that part, cross and flick out. */
function drawFall({ face: f }: Pens) {
  const { sweep, hair, wisps, gap } = comb(f, 600);
  const dark = { root: 0.01, tip: 0.06, hairs: 6, stray: 1.6, streak: 0.2, clear: [R] };
  sweep([[1.8, -0.42, 0.02], [1.84, -0.1, 0.022], [1.86, 0.18, 0.024], [1.87, 0.5, 0.024], [1.85, 0.85, 0.022], [1.79, 1.2, 0.02], [1.735, 1.5, 0.017], [1.75, 1.8, 0.013], [1.84, 2.1, 0.01], [1.94, 2.45, 0.006], [2, 2.8, 0]], { ...dark, seed: 624, load: 0.82, loadEnd: 0.6, hairs: 8, stray: 2.4, streak: 0.4 });
  sweep([[1.6, 1.45, 0.02], [1.63, 1.85, 0.05], [1.69, 2.25, 0.07], [1.79, 2.63, 0.075], [1.9, 3, 0.074], [1.99, 3.35, 0.064], [2.06, 3.7, 0.05], [2.11, 4.02, 0.036], [2.19, 4.35, 0.026], [2.31, 4.66, 0.017], [2.47, 4.92, 0.01], [2.66, 5.08, 0]], { ...dark, seed: 621, plies: { n: 2, load: [1, 0.94], streak: 0.2 }, loadEnd: 0.8, over: 10 });
  sweep([[1.66, -0.6, 0.12], [1.645, -0.25, 0.13], [1.625, 0.1, 0.135], [1.61, 0.55, 0.13], [1.57, 1, 0.125], [1.53, 1.4, 0.125], [1.52, 1.8, 0.14], [1.55, 2.2, 0.15], [1.61, 2.6, 0.155], [1.69, 3, 0.15], [1.78, 3.38, 0.135], [1.86, 3.72, 0.116], [1.925, 4.06, 0.102], [1.955, 4.4, 0.094], [1.935, 4.74, 0.084], [1.86, 5.04, 0.067], [1.75, 5.3, 0.045], [1.63, 5.52, 0.022], [1.56, 5.68, 0]], { ...dark, seed: 620, plies: { n: 4, load: [1, 0.94], streak: 0.15, round: { at: 0.5, amount: 0.05 } }, loadEnd: 0.94, slits: { n: 2, from: 0.55, to: 0.86, width: 3.4, open: 0.95 }, over: 8 });
  sweep([[1.29, -0.3, 0.06], [1.3, 0, 0.09], [1.29, 0.3, 0.11], [1.255, 0.6, 0.124], [1.205, 0.9, 0.13], [1.15, 1.2, 0.134], [1.1, 1.5, 0.134], [1.075, 1.8, 0.13], [1.06, 2.1, 0.122], [1.065, 2.38, 0.112], [1.095, 2.63, 0.098], [1.16, 2.86, 0.084], [1.245, 3.06, 0.074], [1.32, 3.27, 0.066], [1.365, 3.5, 0.056], [1.36, 3.74, 0.045], [1.31, 3.96, 0.03], [1.24, 4.12, 0.012], [1.2, 4.2, 0]], { ...dark, seed: 623, plies: { n: 3, load: [1, 0.94], streak: 0.16, round: { at: 0.5, amount: 0.05 } }, over: 4 });
  sweep([[1.45, -0.4, 0.12], [1.455, 0.1, 0.14], [1.44, 0.55, 0.15], [1.4, 1, 0.155], [1.345, 1.4, 0.155], [1.31, 1.8, 0.15], [1.31, 2.2, 0.14], [1.34, 2.6, 0.12], [1.385, 3, 0.1], [1.405, 3.35, 0.086], [1.385, 3.68, 0.075], [1.305, 3.98, 0.066], [1.19, 4.22, 0.055], [1.07, 4.46, 0.043], [0.985, 4.71, 0.032], [0.96, 4.96, 0.023], [1.01, 5.19, 0.016], [1.12, 5.38, 0.009], [1.27, 5.5, 0]], { ...dark, seed: 622, plies: { n: 3, load: [1, 0.94], streak: 0.15, round: { at: 0.5, amount: 0.05 } }, loadEnd: 0.9, over: 12 });
  // a second tail leaves the first where it turns
  sweep([[1.24, 4.06, 0.014], [1.06, 4.27, 0.026], [0.84, 4.46, 0.023], [0.6, 4.62, 0.016], [0.35, 4.74, 0.009], [0.12, 4.79, 0.004], [-0.05, 4.78, 0]], { ...dark, seed: 625, load: 0.92, loadEnd: 0.7, root: 0.1 });
  gap([[1.185, 2.12], [1.17, 2.42], [1.215, 2.74], [1.3, 3.02], [1.37, 3.22]], 0.05, "leaf"); gap([[1.63, 2.86], [1.72, 3.14], [1.84, 3.42], [1.93, 3.62]], 0.03, "leaf"); gap([[1.44, 2.5], [1.48, 2.85], [1.55, 3.2], [1.65, 3.5]], 0.034, t => Math.sin(Math.PI * t ** 1.6) ** 0.8);
  gap([[1.33, 0.75], [1.3, 1.2], [1.235, 1.65], [1.215, 2.05]], 0.013, "leaf"); gap([[1.57, 0.4], [1.56, 0.8], [1.5, 1.25]], 0.008, "leaf");
  // single hairs: forward over the neck and the collar, and out behind
  for (const [q, w, ink, seed] of [
    [[[1.12, 0.98, 0.3], [0.96, 1.36, 0.9], [0.74, 1.66, 0.9], [0.57, 1.9, 0.8], [0.51, 2.15, 0.6], [0.56, 2.38, 0]], 1.9, 0.74, 626], [[[1.06, 1.2, 0.3], [0.88, 1.52, 1], [0.74, 1.84, 1], [0.69, 2.16, 0.8], [0.74, 2.46, 0.5], [0.72, 2.7, 0]], 2.6, 0.84, 627], [[[1.03, 1.45, 0.3], [0.86, 1.72, 0.8], [0.79, 2, 0.9], [0.79, 2.3, 0.6], [0.83, 2.55, 0]], 1.6, 0.7, 628],
    [[[1, 2.1, 0.3], [0.76, 2.28, 0.8], [0.55, 2.55, 0.8], [0.46, 2.86, 0.7], [0.5, 3.15, 0.5], [0.62, 3.36, 0]], 1.4, 0.6, 629], [[[1.04, 2.7, 0.3], [0.96, 3.02, 0.8], [0.76, 3.34, 0.8], [0.5, 3.6, 0.6], [0.24, 3.78, 0]], 1.5, 0.6, 630], [[[1.2, 3, 0.3], [1.23, 3.4, 0.9], [1.17, 3.8, 0.9], [1.21, 4.16, 0.7], [1.19, 4.5, 0.6], [1.04, 4.76, 0.5], [0.82, 4.92, 0]], 1.9, 0.7, 631], [[[1.36, 3.6, 0.3], [1.5, 3.95, 0.9], [1.52, 4.3, 0.8], [1.4, 4.62, 0.6], [1.18, 4.86, 0]], 1.6, 0.66, 632],
    [[[1.86, 0.1, 0.3], [1.91, 0.6, 0.7], [1.89, 1.15, 0.7], [1.94, 1.7, 0.8], [2.06, 2.16, 0.8], [2.22, 2.54, 0.7], [2.44, 2.76, 0.6], [2.72, 2.78, 0]], 1.6, 0.62, 633], [[[2.02, 3.3, 0.3], [2.24, 3.58, 0.9], [2.46, 3.9, 0.9], [2.6, 4.22, 0.8], [2.6, 4.52, 0.6], [2.5, 4.68, 0]], 1.7, 0.62, 634], [[[2.06, 3.42, 0.3], [2.34, 3.64, 0.8], [2.6, 3.96, 0.8], [2.74, 4.32, 0.7], [2.7, 4.66, 0]], 1.3, 0.5, 635],
    [[[2.1, 4, 0.3], [2.2, 4.5, 0.9], [2.28, 5, 0.8], [2.3, 5.5, 0]], 2.4, 0.8, 636], [[[1.98, 4.3, 0.3], [2.07, 4.75, 0.8], [2.1, 5.2, 0.7], [2.06, 5.65, 0]], 1.6, 0.7, 637],
  ] as const) hair(q, w, ink, seed);
  wisps([[[1.42, 3.5], [1.4, 3.85], [1.27, 4.15], [1.1, 4.44], [1, 4.72], [0.99, 5], [1.08, 5.25]], [[1.46, 3.4], [1.46, 3.8], [1.36, 4.15], [1.18, 4.48], [1.08, 4.76], [1.08, 5.04], [1.2, 5.3]]], { n: 4, width: [0.8, 1.8], ink: [0.45, 0.8], short: 0.35, stray: 0.4 });
  wisps([[[1.9, 3.9], [1.99, 4.3], [2.0, 4.75], [1.9, 5.15], [1.75, 5.5]], [[1.96, 3.9], [2.06, 4.3], [2.08, 4.8], [2, 5.25], [1.86, 5.7]]], { n: 5, width: [0.8, 1.9], ink: [0.45, 0.85], short: 0.35, stray: 0.5 });
}
/** The bun over the ends of the gathered hair: loops that slipped out behind it, the hank, and the lock wrapped round its foot. */
function drawKnot({ face: f }: Pens) {
  const { sweep, hair, strand, flyaways, gap, lobe } = comb(f, 650);
  sweep([[2.28, -1.95, 0.012], [2.38, -1.8, 0.026], [2.44, -1.62, 0.03], [2.42, -1.44, 0.028], [2.33, -1.27, 0.022], [2.22, -1.15, 0.016], [2.12, -1.07, 0.01]], { seed: 672, load: 0.84, streak: 0.4, hairs: 6, stray: 2.2, root: 0.06, tip: 0.06 });
  sweep([[2.14, -0.98, 0.012], [2.27, -0.8, 0.026], [2.35, -0.58, 0.03], [2.34, -0.36, 0.026], [2.23, -0.18, 0.018], [2.06, -0.08, 0.01], [1.92, -0.06, 0]], { seed: 673, load: 0.8, loadEnd: 0.6, streak: 0.4, hairs: 7, stray: 2.4, root: 0.06, tip: 0.2 });
  for (const [i, [q, w, ink]] of ([
    [[[1.5, -2.46], [1.62, -2.56], [1.78, -2.6], [1.92, -2.53], [1.98, -2.36]], 1.7, 0.8], [[[1.85, -2.36], [2.02, -2.39], [2.2, -2.32], [2.34, -2.17], [2.41, -2], [2.4, -1.84]], 1.9, 0.8], [[[2.36, -2], [2.46, -1.82], [2.45, -1.6], [2.33, -1.42]], 1.5, 0.7],
    [[[2.2, -1.5], [2.38, -1.5], [2.56, -1.38], [2.64, -1.2], [2.56, -1.02], [2.38, -0.95], [2.24, -0.98]], 1.7, 0.78], [[[2.22, -1.42], [2.4, -1.22], [2.56, -1.02], [2.64, -0.82], [2.58, -0.68], [2.4, -0.68], [2.24, -0.76], [2.14, -0.88]], 2, 0.84], [[[2.1, -0.75], [2.28, -0.66], [2.46, -0.66], [2.62, -0.74]], 1.5, 0.7],
    [[[2.16, -0.9], [2.36, -0.7], [2.45, -0.45], [2.42, -0.2], [2.27, -0.02], [2.08, 0.06]], 1.8, 0.74], [[[2.1, -0.8], [2.24, -0.55], [2.27, -0.3], [2.16, -0.12]], 1.5, 0.7],
  ] as readonly (readonly [Run, number, number])[]).entries()) strand(q, w, ink, 660 + i);
  lobe(BUN, 0, 1, 674, { n: 4 });
  flyaways(BUN, { n: 7, s: [-0.04, 0.2], from: [0.05, 0.4], length: [0.3, 0.6], lift: [2, 8], drift: 0.06, ink: [0.4, 0.8] });
  lobe(WRAP, 0, 1, 675, { n: 3, edge: [0.02, 0.1], hairs: 6 });
  // small loops at the top that did not go in, with paper between them and the hank
  sweep([[1.19, -2.2, 0.012], [1.23, -2.34, 0.024], [1.34, -2.44, 0.028], [1.49, -2.47, 0.026], [1.64, -2.42, 0.016], [1.72, -2.36, 0.004]], { seed: 676, load: 0.9, streak: 0.34, hairs: 5, stray: 1.8, root: 0.04, tip: 0.1 });
  gap([[1.235, -2.23], [1.28, -2.32], [1.37, -2.385], [1.45, -2.4]], 0.026, "leaf"); gap([[1.5, -2.43], [1.58, -2.41], [1.65, -2.375]], 0.02, "leaf"); gap([[2.08, -1.95], [2.12, -1.86], [2.14, -1.79]], 0.018, t => (1 - t) ** 0.5 * 0.9 + 0.1); gap([[2.2, -2.08], [2.3, -1.92], [2.35, -1.74], [2.335, -1.58]], 0.016, "leaf");
  hair([[1.3, -2.02, 0.2], [1.6, -2.04, 0.9], [1.86, -1.86, 1], [2.02, -1.6, 0.8], [2.09, -1.36, 0.1]], 1.5, 0.5, 677);
}
/** The tie round the bun's foot: a ribbon, a small bow and two long ends. */
function drawTails({ face: f }: Pens) {
  const { tail, by, span } = tie(f, 690), turn = (t: number, k: number, ph: number) => 0.24 + 0.76 * Math.abs(Math.cos(k * t + ph)) * ss(0, 0.1, t) + 0.1;
  tail(inkHang(by(0.02, 0.02), { length: 2 * span, leave: [0.9, 1], stiff: 0.3, stiffEnd: 0.12, wave: { bend: 2.8, count: 1.2, phase: 0.3 } }), 10, t => turn(t, 6.2, 0.5) * (1 - ss(0.9, 1, t) * 0.7));
  tail(inkHang(by(0.02, 0), { length: 1.5 * span, leave: [0.7, 1], stiff: 0.32, stiffEnd: 0.12, wave: { bend: 2.6, count: 1.1, phase: 0.05 } }), 9, t => turn(t, 5.8, 1.1) * (1 - ss(0.9, 1, t) * 0.7));
}
function drawBand({ face: f }: Pens) {
  const { cloth, pleat, by, span } = tie(f, 692);
  // two turns that cross under the knot
  cloth(f.shape([...TIE.run(0, 0, 0.9, 24), ...TIE.run(0.56, 0.02, 0.9, 24).reverse()])); cloth(f.shape([...TIE.run(0.46, 0.01, 0.9, 24), ...TIE.run(1, 0.03, 0.9, 24).reverse()]));
  pleat(TIE.run(0.22, 0.04, 0.8, 20), 1, 0.36); pleat(TIE.run(0.5, 0.01, 0.84, 20), 1.7, 0.78); pleat(TIE.run(0.8, 0.1, 0.8, 20), 1, 0.4);
  // two small loops, flat, the hollow a fold of ink; the knot over their roots
  const bow = (q: Run, fold: Run) => { cloth(f.shape(inkSpline([...q, q[0]].map(([a, b]) => by(a, b)), 1) as unknown as P2[])); pleat(fold.map(([a, b]) => by(a, b)), 2.4, 0.8); };
  bow([[0.004, 0.006], [-0.03, -0.05], [-0.075, -0.12], [-0.1, -0.185], [-0.075, -0.215], [-0.035, -0.19], [-0.005, -0.12], [0.012, -0.05]], [[-0.02, -0.06], [-0.045, -0.13], [-0.07, -0.18]]);
  bow([[0, 0.004], [0.06, 0.004], [0.125, 0.018], [0.185, 0.05], [0.2, 0.085], [0.165, 0.098], [0.1, 0.08], [0.04, 0.045]], [[0.06, 0.03], [0.12, 0.052], [0.165, 0.075]]);
  cloth(inkBlob(f, ([[-0.016, -0.026, 0.024], [0.0, 0.012, 0.032], [0.012, 0.036, 0.022]] as const).map(([a, b, r]) => [...by(a, b), r * span] as const)));
  pleat([by(-0.012, -0.03), by(0.008, 0), by(0.006, 0.045)], 1.3, 0.6);
}
function tie(f: InkRisoPen, from: number) {
  const span = HEAD.span;
  let s = from;
  const cloth = (shape: number[][], tone = 0.96) => { f.knock(shape, [K, T, R]); inkBloom(f, R, shape, { tone, soft: 0.6, wander: 0.5, fringe: 0.3, rim: 0.3, rimWidth: 2, mottle: 0.42, cloud: 16, seed: s++ }); };
  const pleat = (q: readonly P2[], w = 1.2, ink = 0.5) => inkThread(f, K, q.map((p, i) => [p[0], p[1], Math.max(0.05, leaf(i / (q.length - 1)))] as const), w * Z, { ink, inkEnd: ink * 0.5, seed: s++ });
  /** A brushed end: it turns flat and edge-on as it falls. */
  const tail = (q: readonly P2[], w: number, press: (t: number) => number, dryEnd = 0.6) => {
    const n = q.map((r, i) => [r[0], r[1], press(i / (q.length - 1))] as const);
    f.knock(inkBlob(f, n.map(([x, y, k]) => [x, y, Math.max(0.15, w * 0.145 * k)] as const)), [K]);
    inkSide(f, R, n, w * Z, { tip: 0.98, belly: 0.66, side: 1, head: 0.1, rim: 0.3, dry: 0.03, dryEnd, bristles: 7, grain: 0.8, seed: s++ });
  };
  // the knot lies near the lower end of the band
  const K0 = TIE.point(0.5, 0.86), a1 = TIE.point(0.5, 0.92), dl = Math.hypot(a1[0] - K0[0], a1[1] - K0[1]), d: P2 = [(a1[0] - K0[0]) / dl, (a1[1] - K0[1]) / dl];
  const by = (a: number, b: number): P2 => [K0[0] + span * (d[0] * a - d[1] * b), K0[1] + span * (d[1] * a + d[0] * b)];
  return { span, cloth, pleat, tail, by };
}
// ---- body -----------------------------------------------------------------------------------------------------------------------
// Laid out in hundredths of the eyes' span from the middle between the pupils, upright on the page. The trunk is turned about 66°
// away and the head comes back to the viewer, as in the classic figures; landmarks are read off an ANAT1 body posed under this head,
// drawn a tenth slighter. The far shoulder is a sliver, the front is one long diagonal from the nape to the waist.
/** The figure's own ground: robe, neck and shoulders. */
const FIGURE: P2[] = [[90, 96], [112, 122], [134, 146], [152, 174], [164, 204], [171, 240], [174, 300], [170, 350], [172, 400], [184, 470], [-150, 470], [-132, 420], [-114, 382], [-92, 360], [-66, 350], [-72, 332], [-79, 318], [-83, 303], [-82, 287], [-76, 271], [-67, 254], [-58, 236], [-50, 218], [-43, 200], [-35, 182], [-23, 165], [-8, 150], [12, 137]];
const MOON = { x: 742, y: 452, r: 302 };
/** 烘雲托月: the moon is the paper the wash goes round. */
function drawMist({ page: p }: Pens) {
  const out = (x: number, y: number) => Math.hypot(x - MOON.x, y - MOON.y) - MOON.r + (inkFbm2(17, x / 190, y / 190, 2) - 0.5) * 7;
  const lobe = (a: number, c: number, w: number) => { let d = a - c; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.exp(-((d / w) ** 2)); };
  const lo = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  type Bloom = Parameters<typeof inkBloom>[3];
  const ring = (plate: string, nodes: [number, number, number][], tone: (d: number, a: number, x: number, y: number) => number, o: Partial<Bloom>, seed: number) => inkBloom(p, plate, inkBlob(p, nodes), { tone: lo((x, y) => { const d = out(x, y); return d < -1 ? 0 : ss(-1, 0.8, d) * ss(1170, 1000, x + 90 * (inkFbm2(41, x / 120, y / 150, 2) - 0.5)) * tone(d, Math.atan2(y - MOON.y, x - MOON.x), x, y); }), soft: 1, wander: 24, wave: 130, fringe: 1.4, tooth: 2.4, rim: 0.3, rimWidth: 4, mottle: 0.45, cloud: 130, seed, ...o });
  const bank = (plate: string, nodes: [number, number, number][], tone: Bloom["tone"], o: Partial<Bloom>, seed: number) => inkBloom(p, plate, inkBlob(p, nodes), { tone, soft: 20, wander: 14, wave: 70, fringe: 1.6, tooth: 2.6, rim: 0.3, rimWidth: 4, mottle: 0.5, cloud: 90, seed, ...o });
  ring(K, [[500, 250, 50], [600, 150, 70], [720, 110, 90], [880, 130, 110], [1010, 240, 120], [1070, 430, 110], [1070, 620, 120], [1050, 790, 110], [1070, 900, 60]], (d, a, x, y) => (0.09 + 0.22 * Math.exp(-d / 80)) * (0.22 + 0.95 * lobe(a, 0.3, 0.8) + 0.2 * lobe(a, -1, 0.7)) * (0.65 + 0.7 * inkFbm2(21, x / 120, y / 70, 3)), { soft: 64 }, 1);
  ring(T, [[880, 180, 60], [1010, 330, 100], [1060, 540, 110], [1040, 760, 110]], (d, _a, x, y) => (0.1 + 0.18 * Math.exp(-d / 90)) * (0.5 + inkFbm2(22, x / 150, y / 80, 2)), { soft: 54, mottle: 0.6 }, 2);
  // Drifts: dry above, pooled below.
  const flat = (y0: number, up: number, down: number) => lo((_x, y) => lerp(up, down, ss(y0 - 14, y0 + 16, y)));
  bank(K, [[930, 700, 12], [980, 690, 30], [1050, 696, 44], [1110, 690, 46], [1160, 700, 30]], lo((x, y) => (0.12 + 0.22 * ss(660, 740, y)) * ss(890, 1010, x) * ss(1166, 1070, x)), { soft: flat(716, 30, 1.6) }, 3);
  bank(K, [[1000, 792, 8], [1050, 782, 24], [1110, 788, 34], [1170, 786, 30]], lo((x, y) => (0.1 + 0.26 * ss(768, 824, y)) * ss(980, 1060, x) * ss(1166, 1080, x)), { soft: flat(800, 24, 1.4), wave: 50 }, 4);
  bank(T, [[960, 720, 14], [1040, 730, 34], [1120, 736, 40], [1170, 740, 26]], lo((x) => 0.16 * ss(1166, 1070, x)), { soft: 22 }, 5);
  bank(K, [[900, 206, 8], [960, 200, 18], [1030, 206, 22], [1100, 198, 16]], lo((x, y) => (0.05 + 0.12 * ss(190, 226, y)) * ss(880, 970, x)), { soft: flat(208, 20, 2) }, 6);
  inkSplatter(p, K, { x: 1080, y: 900, spread: [50, 60], n: 12, radius: [0.7, 3.6], seed: 31 });
  inkSplatter(p, K, { x: 1000, y: 150, spread: [110, 40], n: 8, radius: [0.6, 2.6], seed: 32 });
}
function drawBody(pen: Pens) {
  const { robe: p, face } = pen;
  let s = 800;
  const th = (pts: N3[], w: number, ink = 0.85, inkEnd = ink * 0.6, mid?: number) => inkThread(p, K, pts, w * Z, { ink, inkEnd, mid, seed: s++ });
  const side = (pts: N3[], w: number, o: Omit<Parameters<typeof inkSide>[4], "seed">, plate = K) => inkSide(p, plate, pts, w * Z, { ...o, bristles: o.bristles ?? Math.max(6, w * 0.62), seed: s++ });
  const wash = (plate: string, pts: readonly (readonly number[])[], o: Omit<Parameters<typeof inkBloom>[3], "seed">) => inkBloom(p, plate, p.shape(pts as readonly P2[]), { ...o, soft: typeof o.soft === "function" ? (x, y) => Z * (o.soft as (x: number, y: number) => number)(x, y) : Z * o.soft!, seed: s++ });
  const loc = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  /** A contour: the brush presses where the form turns and lifts where it runs on; water on the form's side. */
  const edge = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.92, belly: 0.1, side: sd, head: 0.3, rim: 0.15, dry: 0.06, dryEnd: 0.4, grain: 0.8, ...o });
  const fold = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.82, belly: 0.02, side: sd, head: 0.3, rim: 0.1, dry: 0.1, dryEnd: 0.8, grain: 1.1, ...o });
  /** A line set off to one side by a distance of its own. */
  const aside = (q: readonly P2[], d: (t: number) => number) => q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], z = q[Math.min(q.length - 1, i + 1)], l = Math.hypot(z[0] - a[0], z[1] - a[1]), k = d(i / (q.length - 1)); return [x - ((z[1] - a[1]) / l) * k, y + ((z[0] - a[0]) / l) * k] as const; });
  const press = (q: readonly (readonly number[])[], ...k: number[]) => q.map((r, i) => { const t = (i / (q.length - 1)) * (k.length - 1), j = Math.min(k.length - 2, Math.floor(t)); return [r[0], r[1], lerp(k[j], k[j + 1], t - j)] as const; });
  /** The picture is let go at the foot of the page, unevenly. */
  const fade = (x: number, y: number) => ss(0, 34, 446 - y - 46 * inkFbm2(12, x / 38, y / 120, 2));
  p.knock(p.shape(FIGURE));
  // ---- neck and chest
  const jaw = HEAD.jaw.filter((_, i) => i % 6 === 0).map(q => p.local(...face.at(q[0], q[1])));
  const throat: P2[] = [[20.5, 92], [26, 104], [28.5, 120], [28.4, 136], [26, 150], [20, 162]];
  const neck = p.shape([...throat, [4, 190], [-4, 250], [30, 226], [66, 184], [92, 140], [100, 104], [101, 56], [92, 14], [66, 14], [40, 64]]);
  p.knock(neck);
  const onNeck = (plate: string, tone: (x: number, y: number) => number) => inkBloom(p, plate, neck, { tone: loc(tone), soft: 1.4, wander: 0, fringe: 0, rim: 0, mottle: 0.3, cloud: 30, seed: s++ });
  const below = (x: number, y: number) => { let d = 1e9; for (const q of jaw) d = Math.min(d, Math.hypot(x - q[0], (y - q[1]) * 0.8)); return d; };
  onNeck(K, (x, y) => { const d = below(x, y) + 4 * (inkFbm2(6, x / 24, y / 24, 2) - 0.5); return (0.16 * Math.exp(-((d / 15) ** 2)) + 0.09 * Math.exp(-((d / 36) ** 2))) * ss(70, 44, x) + 0.05 * ss(36, 18, x) * ss(150, 110, y) + 0.08 * spot(x, y, 26, 172, 9, 5, 0.3); });
  onNeck(R, (x, y) => 0.03 * Math.exp(-((below(x, y) / 28) ** 2)) + 0.03 * spot(x, y, 30, 200, 30, 24));
  // ---- waters of the robe, before any line
  const front: P2[] = [[-7, 151], [-22, 165], [-33, 182], [-41, 200], [-48, 218], [-56, 236], [-65, 254], [-74, 271], [-80, 287], [-81, 303], [-77, 318], [-70, 332], [-63, 345], [-58, 358]];
  // the far side: grey down the arm, paper on the breast where it stands forward, grey again under it
  const under = (x: number, y: number, cx: number, cy: number, rx: number, drop: number) => { const k = (x - cx) / rx, d = y - (cy - drop * k * k); return Math.exp(-((d / (d > 0 ? 20 : 9)) ** 2)) * ss(1.25, 0.6, Math.abs(k)); };
  wash(K, [...front, [-40, 352], [-30, 300], [-26, 240], [-18, 190]], { tone: loc((x, y) => (0.14 * ss(150, 195, y) * ss(276, 216, y) + 0.09 * under(x, y, -58, 332, 30, 14)) * (0.6 + 0.7 * inkFbm2(5, x / 22, y / 60, 2))), soft: 5, wander: 2, mottle: 0.5 });
  // ---- far collar: it comes out from behind the neck
  const innerFar: P2[] = [[28.4, 137], [23.5, 157], [14, 180], [3, 206], [-8, 234]], outerFar: P2[] = [[-43, 300], [-38, 272], [-29, 240], [-19, 207], [-8, 178], [4, 156], [16, 138], [28, 129]];
  p.knock(p.shape([...innerFar, ...outerFar]));
  wash(K, [...innerFar.map(([x, y]) => [x - 5, y]), ...outerFar], { tone: loc((_x, y) => lerp(0.97, 0.45, ss(180, 300, y))), soft: 1, wander: 1, fringe: 0.4, rim: 0.2, mottle: 0.24, cloud: 50 });
  side(press([[18, 141], [4, 168], [-8, 200], [-18, 234], [-28, 268], [-36, 298]], 0.2, 0.7, 1, 1, 0.8), 19, { tip: 0.94, belly: 0.6, side: 1, head: 0, rim: 0.1, dry: 0.1, dryEnd: 0.9 });
  side(press(innerFar.map(([x, y]) => [x - 2.6, y]), 0.3, 1, 0.8, 1, 0.6), 3.8, { tip: 0.94, belly: 0.7, side: 1, head: 0.1, rim: 0.3, dry: 0.1, dryEnd: 0.5, bristles: 5 }, R);
  th(innerFar.map(([x, y], i) => [x + 2, y, [0.2, 0.8, 0.8, 0.8, 0.3][i]] as const), 1.8, 0.6, 0.45);
  // the throat stands before it
  th(press([[17.5, 90.5], ...throat], 0.5, 1, 1, 0.86, 0.6, 0.4, 0.05), 3.8, 0.92, 0.5);
  th([[72, 108, 0.02], [60, 130, 0.5], [44, 152, 0.8], [30, 166, 0.05]], 1.6, 0.1, 0.4);
  th([[34, 171, 0.05], [52, 165, 0.8], [72, 152, 0.02]], 1.8, 0.5, 0.12);
  th([[18, 168, 0.05], [11, 168, 0.6], [5, 165, 0.02]], 1.5, 0.4, 0.1);
  // ---- near collar: from behind the nape, over the collar bone and the breast, to the waist
  const N: P2[] = [[100, 100], [96, 118], [85, 139], [64, 164], [37, 192], [9, 224], [-16, 259], [-35, 293], [-46, 322], [-50, 345], [-50, 366]], wide = (t: number) => lerp(8, 18, ss(0.05, 0.62, t)) - 5 * ss(0.8, 1, t);
  const outer = aside(N, t => -wide(t)), mid = aside(N, t => -wide(t) / 2);
  const inner = (t: number) => ss(0, 0.2, t);
  p.knock(p.shape([...aside(N, t => 12 * inner(t) * ss(0.8, 0.45, t)), ...[...outer].reverse()]));
  wash(K, [...N, ...[...outer].reverse()], { tone: loc((_x, y) => lerp(0.98, 0.24, ss(230, 372, y))), soft: loc((_x, y) => lerp(1, 8, ss(330, 384, y))), wander: 1.4, fringe: 0.5, rim: 0.2, mottle: 0.36, cloud: 60 });
  side(mid.map((q, i) => [q[0], q[1], wide(i / 10) / 18] as const), 19, { tip: 0.94, belly: 0.6, side: -1, head: 0, rim: 0.1, dry: 0.08, dryEnd: 1 });
  side(press(aside(N, () => 3.6).slice(0, 10), 0.4, 1, 0.9, 1, 0.8, 1, 0.8, 0.5, 0.02), 4.8, { tip: 0.96, belly: 0.72, side: 1, head: 0.1, rim: 0.3, dry: 0.08, dryEnd: 0.7, bristles: 5 }, R);
  th(press(aside(N, t => 11 * inner(t)).slice(0, 8), 0.05, 0.3, 0.8, 0.9, 0.8, 0.9, 0.7, 0.05), 2, 0.7, 0.5);
  // ---- sash, under the sleeve
  wash(K, [[-60, 355], [-44, 368], [-18, 378], [34, 381], [30, 416], [-2, 426], [-30, 424], [-52, 410], [-58, 386]], { tone: loc((x, y) => 0.8 * ss(434, 392, y) * (0.5 + 0.9 * inkFbm2(8, x / 44, y / 12, 3))), soft: loc((_x, y) => lerp(1.2, 12, ss(392, 424, y))), wander: 3, wave: 40, fringe: 1.2, rim: 0.3, rimWidth: 4, mottle: 0.6, cloud: 50 });
  side([[-59, 360, 0.4], [-40, 374, 1], [-14, 384, 1], [30, 387, 0.8]], 17, { tip: 0.96, belly: 0.5, side: -1, head: 0.2, rim: 0.1, dry: 0.2, dryEnd: 0.6 });
  side([[-57, 378, 0.3], [-38, 392, 0.9], [-12, 402, 1], [28, 404, 0.7]], 9, { tip: 0.8, belly: 0.2, side: 1, head: 0.1, rim: 0.1, dry: 0.4, dryEnd: 1 });
  // ---- the near breast: its roundness is in the cloth, drawn from the armpit and up from the sash; under it only a breath of water
  wash(K, [[-30, 296], [10, 300], [60, 296], [96, 276], [100, 320], [72, 366], [30, 384], [-20, 378], [-40, 350]], { tone: loc((x, y) => 0.05 * under(x, y, 30, 346, 56, 40) * (0.4 + 1.1 * inkFbm2(15, x / 30, y / 22, 2))), soft: 8, wander: 4, mottle: 0.5 });
  fold([[102, 246, 0.03], [94, 270, 0.5], [78, 292, 0.7], [56, 309, 0.4], [34, 319, 0.02]], 8, 1);
  fold([[50, 371, 0.04], [51, 365, 0.8], [58, 344, 0.6], [72, 320, 0.3], [84, 302, 0.02]], 9, 1);
  fold([[27, 379, 0.04], [27, 373, 0.8], [31, 352, 0.6], [42, 332, 0.3], [56, 318, 0.02]], 8, 1);
  fold([[4, 381, 0.04], [3, 375, 0.8], [2, 354, 0.6], [7, 336, 0.02]], 8, -1);
  fold([[-21, 377, 0.04], [-23, 371, 0.7], [-30, 352, 0.5], [-33, 334, 0.02]], 7, -1);
  p.knock(p.shape([[112, 236], [106, 262], [96, 290], [80, 322], [56, 354], [30, 382], [12, 402], [2, 424], [-2, 452], [120, 452], [150, 380], [150, 280]]));
  wash(T, [[92, 300], [120, 276], [160, 262], [172, 300], [169, 350], [171, 400], [178, 446], [120, 452], [40, 452], [24, 420], [52, 360]], { tone: loc((x, y) => (0.04 + 0.34 * ss(280, 420, y)) * fade(x, y) * (0.35 + 1.0 * inkFbm2(3, x / 46, y / 96, 3))), soft: loc(x => lerp(30, 3, ss(154, 172, x))), wander: 8, wave: 70, fringe: 1.4, rim: 0.3, rimWidth: 5, mottle: 0.55, cloud: 80 });
  wash(K, [[108, 236], [130, 230], [132, 280], [112, 324], [84, 364], [48, 400], [24, 404], [60, 354], [92, 298]], { tone: 0.07, soft: 18, wander: 8, mottle: 0.5 });
  // ---- the robe's lines: the far shoulder and breast, the back, the near sleeve
  edge(press([[8, 141], ...front.slice(0, 8)], 0.1, 0.7, 0.5, 0.9, 0.6, 0.5, 0.4, 0.2, 0.02), 10, 1);
  edge(press(front.slice(4), 0.03, 0.3, 0.6, 0.6, 0.8, 1, 0.9, 0.6, 0.3), 11, 1);
  edge([[100, 112, 0.1], [116, 129, 0.8], [135, 149, 0.6], [151, 173, 1], [162, 202, 0.7], [169, 236, 0.5], [172, 272, 0.6], [171, 308, 0.9], [167, 344, 0.6], [168, 378, 0.8], [175, 412, 0.6], [186, 450, 0.04]], 13, -1, { dryEnd: 0.8 });
  edge([[121, 204, 0.03], [117, 222, 0.22], [111, 242, 0.5], [104, 266, 0.8], [94, 292, 1], [79, 322, 0.7], [56, 354, 0.7], [30, 382, 0.9], [12, 402, 1], [3, 424, 0.5], [0, 446, 0.04]], 12, 1, { dryEnd: 0.7 });
  // folds meet at the crook of the arm
  fold([[10, 413, 0.03], [17, 407, 0.8], [30, 396, 1], [58, 370, 0.8], [90, 334, 0.5], [108, 302, 0.03]], 14, 1);
  fold([[10, 418, 0.03], [20, 415, 0.8], [36, 407, 1], [72, 386, 0.7], [110, 354, 0.4], [130, 326, 0.03]], 13, 1);
  fold([[8, 422, 0.03], [20, 422, 0.7], [44, 418, 1], [86, 410, 0.6], [126, 392, 0.4], [150, 374, 0.03]], 14, -1);
  fold([[160, 226, 0.03], [152, 262, 0.7], [150, 300, 0.6], [153, 340, 0.03]], 12, -1);
  fold([[-47, 216, 0.05], [-44, 236, 0.6], [-48, 256, 0.4], [-56, 270, 0.03]], 6, 1);
  // ---- the far sleeve, behind
  wash(T, [[-64, 350], [-92, 362], [-116, 388], [-128, 420], [-134, 448], [-98, 450], [-72, 430], [-64, 396]], { tone: loc((x, y) => 0.34 * ss(344, 420, y) * fade(x, y) * (0.5 + 0.9 * inkFbm2(9, x / 34, y / 60, 3))), soft: 9, wander: 6, mottle: 0.5 });
  edge([[-64, 347, 0.1], [-84, 353, 0.9], [-106, 370, 0.6], [-118, 393, 0.9], [-127, 420, 0.6], [-133, 448, 0.04]], 11, 1, { dryEnd: 0.9 });
  fold([[-72, 366, 0.3], [-89, 387, 0.9], [-98, 414, 0.5], [-102, 444, 0.03]], 10, 1);
}
function drawInscription({ page: p }: Pens) {
  const glyph = (x: number, y: number, z: number, strokes: N3[][], w: number) => { for (const st of strokes) p.line(K, st.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2]] as const), w, { rough: 0.4, slant: 0.3, dryEnd: 0.35 }); };
  glyph(150, 236, 70, [[[50, 6, 0.8], [52, 20, 1], [51, 50, 0.8], [50, 84, 1], [44, 84, 0.6], [36, 74, 0.05]], [[14, 36, 0.5], [28, 34, 0.7], [39, 31, 0.9], [34, 46, 0.7], [24, 62, 0.5], [8, 80, 0.05]], [[80, 20, 0.9], [70, 32, 0.7], [56, 44, 0.1]], [[54, 40, 0.3], [66, 56, 0.6], [80, 70, 1], [96, 78, 0.1]]], 9);
  glyph(152, 322, 66, [[[32, 10, 0.8], [33, 40, 0.7], [30, 66, 0.7], [16, 92, 0.05]], [[33, 12, 0.5], [52, 9, 0.6], [70, 9, 1], [72, 40, 0.8], [71, 82, 1], [66, 86, 0.7], [56, 78, 0.05]], [[36, 35, 0.5], [52, 34, 0.5], [66, 33, 0.6]], [[34, 57, 0.5], [52, 56, 0.5], [67, 55, 0.6]]], 8);
  // ---- seal: 心, cut white into red
  const [x, y, z] = [170, 418, 38];
  inkBloom(p, R, p.shape([[x, y + 1], [x + z * 0.5, y], [x + z, y + 1], [x + z - 0.5, y + z * 0.5], [x + z, y + z], [x + z * 0.5, y + z - 0.5], [x, y + z], [x + 0.6, y + z * 0.5]]), { tone: 0.95, soft: 0.5, wander: 0.8, wave: 14, fringe: 0.4, rim: 0.2, mottle: 0.3, cloud: 14, seed: 901 });
  const cut = (pts: N3[], w: number) => p.lift(pts.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2] ?? 1] as const), w, [R]);
  cut([[20, 48, 0.8], [17, 62, 1], [15, 72, 0.5]], 4);
  cut([[33, 40, 0.8], [35, 66, 1], [44, 80, 1], [62, 81, 1], [71, 74, 0.8], [71, 64, 0.4]], 4);
  cut([[48, 30, 0.8], [55, 44, 1]], 4);
  cut([[76, 36, 0.8], [85, 56, 1]], 4);
}

// ---- the figure in layers ---------------------------------------------------------------------------------------------------------
/** A place read in the head's own frame, on the page. */
const onPage = (x: number, y: number): P2 => { const q = HEAD.level(x, y); return [FACE.x + FACE.scale * q[0], FACE.y + FACE.scale * q[1]]; };
const onRobe = (x: number, y: number): P2 => [FRAMES.robe.x + FRAMES.robe.scale * x, FRAMES.robe.y + FRAMES.robe.scale * y];
const LOBE = HEAD.ear.reduce((a, q) => (q[1] > a[1] ? q : a));
const LIDS: Readonly<Record<string, number>> = { open: 1, half: 0.52, shut: 0.04 };
const pens = (c: InkPaintContext): Pens => c.pens(FRAMES);
const paint = (draw: (p: Pens) => void) => (c: InkPaintContext) => draw(pens(c));
export interface InkShuiyueOptions {
  /** The moon and the mist round it, and the name with its seal (default: both). */
  moon?: boolean; name?: boolean;
  /** How far hair and ribbons move (default 1). */
  wind?: number;
}
/** 水月 in layers. She breathes, blinks, and her hair, ribbons and earring move in a light wind. */
export function inkShuiyue({ moon = true, name = true, wind = 1 }: InkShuiyueOptions = {}): InkSubject {
  const lobe: P2 = [FACE.x + FACE.scale * LOBE[0], FACE.y + FACE.scale * LOBE[1]];
  const parts: InkPart[] = [
    { id: "moon", draw: paint(drawMist), depth: -0.25 },
    { id: "under", only: "film", group: "head", draw: c => { inkCover(c.page, c.page.shape(inkOval(560, 500, 130, 200))); inkCover(c.page, c.page.shape(inkOval(755, 235, 75, 60))); } },
    { id: "body", draw: c => { paint(drawBody)(c); inkFade(c.page, [0, 1440, PAGE.width, 160], (_, y) => 1 - ss(1480, 1592, y), { coverOnly: true }); }, motion: [{ kind: "breathe", at: onRobe(10, 450), amount: 0.0045, seconds: 4.6 }] },
    { id: "fall", group: "head", draw: paint(drawFall), motion: [{ kind: "sway", from: onPage(1.5, -0.3), to: onPage(1.5, 5.4), amount: 15 * wind, seconds: 6.2, lag: 0.28, power: 1.8, lean: 0.3 }] },
    { id: "face", group: "head", poses: { kind: "blink", open: "open", order: ["half", "shut"], every: 4.6, seconds: 0.3 }, draw: c => { const f = pens(c).face, head = c.pose === "open" ? HEAD : pose(LIDS[c.pose] ?? 1); paintInkFace(f, head, FACE_STYLE); paintInkEar(f, HEAD, FACE_STYLE); } },
    { id: "hair", group: "head", draw: paint(p => { drawGathered(p); drawKnot(p); drawParting(p); }) },
    { id: "ribbon", group: "head", draw: paint(drawTails), motion: [{ kind: "sway", from: onPage(1.86, -1.2), to: onPage(1.9, 1.7), amount: 15 * wind, seconds: 4.8, lag: 0.4, power: 1.5, lean: 0.4, phase: 0.8 }] },
    { id: "band", group: "head", draw: paint(drawBand) },
    { id: "far-lock", group: "head", draw: paint(p => { drawFarLock(p); drawParting(p); }), motion: [{ kind: "sway", from: onPage(-0.9, -0.5), to: onPage(-1.2, 2.6), amount: 11 * wind, seconds: 5.6, lag: 0.3, power: 2.1, lean: 0.35, phase: 1.4 }] },
    { id: "strands", group: "head", draw: paint(drawStrands), motion: [{ kind: "sway", from: onPage(0.7, -0.6), to: onPage(0.95, 1), amount: 6 * wind, seconds: 5, lag: 0.3, power: 1.8, lean: 0.3, phase: 2.2 }] },
    { id: "earring", group: "head", draw: c => paintInkEarring(pens(c).face, LOBE, { ink: K, jewel: T, warm: R, sway: 0.03, seed: 610 }), motion: [{ kind: "turn", at: lobe, degrees: 2.4 * wind, seconds: 2.9 }] },
    { id: "name", draw: paint(drawInscription) },
  ];
  return { id: "shuiyue", label: "Half figure of a calm woman turned away, looking back over her shoulder: the hair parted over the forehead and gathered into a bun tied with a red ribbon, the rest falling down her back", page: PAGE, plates: PLATES, paper: "#F8F1E3", seed: 11, groups: { head: [{ kind: "turn", at: onRobe(58, 150), degrees: 0.42, seconds: 7.4 }] }, parts: inkPaintOrder(parts.filter(p => (moon || p.id !== "moon") && (name || p.id !== "name")), ["moon", "under", "face", "hair", "far-lock", "band", "fall", "ribbon", "strands", "earring", "body", "name"], ["face"]) };
}
