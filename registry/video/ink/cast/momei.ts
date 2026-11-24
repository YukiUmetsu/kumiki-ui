/**
 * 墨梅 Mòméi, ink plum: an original ink-wash figure on the INK-RISO1 engine, painted wash first and line last. Three inks: indigo,
 * cinnabar, black.
 *
 * A young woman of about twenty, turned to the viewer's right beside a plum branch: wide calm eyes, a small mouth, warm cheeks, the plum
 * blossom mark of 梅花妝 on her brow. Her hair is parted in two soft masses with a curtain lock at each temple; behind stand the hollow
 * loops of an unmarried girl (鬟), with a spray of white plum and a pin whose bead chain swings (步搖), and one tress tied with a red
 * cord comes down over the shoulder. The robe closes the wearer's left over right; a thin scarf (披帛) lies over the crooks of the arms.
 */
import { inkSplatter } from "../../ink-riso-pen";
import type { InkRisoPen, PenNode as N3, PenPoint as P2 } from "../../ink-riso-pen";
import { inkBlob, inkBloom, inkSide, inkThread } from "../../ink-riso-wet";
import { inkFbm2 } from "../../ink-riso-press";
import { inkClumps, inkFlyaways, inkGap, inkSweep, inkTress } from "../../ink-riso-hair";
import type { InkClumpOptions, InkFlyawayOptions, InkGapShape, InkSweepOptions } from "../../ink-riso-hair";
import { inkGuideSheet } from "../../ink-riso-coiffure";
import type { InkSheetForm } from "../../ink-riso-coiffure";
import { poseInkHead } from "../../ink-riso-face";
import type { InkHead, InkProfile } from "../../ink-riso-face";
import { paintInkEar, paintInkFace } from "../../ink-riso-face-paint";
import type { InkFaceStyle } from "../../ink-riso-face-paint";
import { beautifulFace } from "../../../anatomy/face-beauty";
import { eyeCentres } from "../../../anatomy/anatomy-face";
import { inkPaintOrder } from "../ink-cel";
import { inkCover, inkFade } from "../ink-veil";
import type { InkPaintContext, InkPart, InkSubject } from "../ink-cel";
import { inkPlates } from "../ink-pigments";

type Pens = Record<"face" | "page", InkRisoPen>;
const K = "ink", R = "cinnabar", B = "indigo";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const dice = (seed: number) => { let k = 0; return () => { const v = Math.sin(seed * 12.9898 + k++ * 78.233) * 43758.5453; return v - Math.floor(v); }; };

const PAGE = { width: 1200, height: 1600, margin: 36 };
const PLATES = inkPlates({ [B]: "indigo", [R]: "cinnabar", [K]: "ink" });
const Z = 1.42;
const SITTER = beautifulFace({ sex: 0, faceType: "east-asian" });
/** A young woman's brow: soft, nearly level, its tail let down a little. */
const BROW: InkProfile = [[0.17, -0.016, 0.7], [0.235, -0.004, 1], [0.32, 0.006, 1.1], [0.4, 0.012, 1.02], [0.465, 0.01, 0.8], [0.53, 0, 0.46], [0.58, -0.014, 0.02]];
/** The head is posed, and all its hair is laid out, turned to the viewer's left; the pen it is drawn with is mirrored, so she looks to the right. */
const pose = (open = 1): InkHead => soften(poseInkHead({ vertices: SITTER.vertices, faces: SITTER.mesh.faces, eyes: eyeCentres(SITTER.vertices) }, { yaw: -25, pitch: 7, roll: -5, scale: 0.78, at: [0, 0] }, {
  open, gaze: [0, -0.02], forehead: 0.48, length: 0.95, cheek: 0.97, eye: [1.5, 1.44], iris: 1.16, eyeRoll: 0, eyeTilt: 1.2, lids: { tall: 1.32, line: 0.64, lineOut: 0.64, wing: 0.56, fold: 0.8 }, brow: { form: BROW, height: 1, thick: 0.84, roll: 0 },
  lift: 1.8, noseUnder: 5, noseHeight: 0.04, nose: 0.58, philtrum: 3.2, mouth: 0.46, lips: 1.02, chinWidth: 0.86, side: { square: 0, ear: 0.8, earWidth: 0.94 },
}));
const mirror = (p: InkRisoPen): InkRisoPen => {
  const m = (q: N3): N3 => [-q[0], q[1], q[2]];
  return { sheet: p.sheet, at: (x, y) => p.at(-x, y), local: (X, Y) => { const [x, y] = p.local(X, Y); return [-x, y]; }, line: (plate, q, w, o) => p.line(plate, q.map(m), w, o), shape: (q, closed) => p.shape(q.map(m), closed), wash: (plate, q, o, solid) => p.wash(plate, q, typeof o.tone === "number" ? o : { ...o, tone: (x, y) => (o.tone as (x: number, y: number) => number)(-x, y) }, solid), knock: p.knock, lift: (q, w, plates) => p.lift(q.map(m), w, plates), disc: (x, y, r) => p.disc(-x, y, r) };
};
/** Chin and jaw run through one softer turn: a bowed chin has no corner on its far side. */
function soften(h: InkHead): InkHead {
  const all = [...h.contour, ...h.jaw.slice(1)], at = h.contour.length - 1, local = all.map(q => h.local(q)), chin = local[at][0];
  let q = all.map(v => [v[0], v[1]] as P2);
  for (let k = 0; k < 60; k++) q = q.map((v, i) => { const d = Math.abs(local[i][0] - (chin - 0.07)), w = 0.5 * ss(0.2, 0.06, d); return i === 0 || i === q.length - 1 || !w ? v : [lerp(v[0], (q[i - 1][0] + q[i + 1][0]) / 2, w), lerp(v[1], (q[i - 1][1] + q[i + 1][1]) / 2, w)]; });
  return { ...h, contour: q.slice(0, at + 1), jaw: q.slice(at) };
}

const HEAD = pose();
/** The middle between the pupils, pen units, and where it lies on the page; the distance between them on the page. */
const EYES = HEAD.level(0, 0), AT = { x: 622, y: 640, pd: 134 };
const UNIT = Math.hypot(HEAD.level(1, 0)[0] - EYES[0], HEAD.level(1, 0)[1] - EYES[1]), FZ = AT.pd / UNIT;
const FACE = { x: AT.x + FZ * EYES[0], y: AT.y - FZ * EYES[1], scale: FZ };
const FRAMES = { face: FACE, page: { x: 0, y: 0, scale: 1 } };
const STYLE: InkFaceStyle = { ink: K, warm: R, rouge: 1.2, lip: 0.74, shade: 0.55, lashes: 5, lashSize: 0.7, brow: 0.7, smile: 0.34, contour: 0.76, jaw: 1, underNose: 0.8, bowl: 0.6 };

/** 梅花妝: the plum blossom a princess is said to have worn on her brow. Five wet touches of cinnabar, no two as full, smaller than the iris. */
function drawHuadian(f: InkRisoPen, head: InkHead) {
  const bn = head.local(head.brows.near.mid[0]), bf = head.local(head.brows.far.mid[0]), c: P2 = [lerp(bf[0], bn[0], 0.5) - 0.004, lerp(bf[1], bn[1], 0.5) - 0.095], S = head.span;
  const q = (a: number, r: number, w: number): N3 => [...head.face(c[0] + Math.sin(a) * r * 0.88, c[1] - Math.cos(a) * r), w * S] as unknown as N3;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.12 + [0.06, -0.1, 0.05, -0.04, 0.09][i], r = [1, 0.86, 1.06, 0.92, 0.98][i], w = [1, 0.84, 1.04, 0.92, 0.88][i];
    inkBloom(f, R, inkBlob(f, [q(a, 0.007, 0.004), q(a, 0.017 * r, 0.0095 * w), q(a + 0.05, 0.026 * r, 0.0115 * w), q(a + 0.05, 0.03 * r, 0.008 * w)] as never), { tone: [0.95, 0.72, 0.9, 0.8, 0.66][i], soft: 0.7, wander: 0.35, wave: 5, fringe: 0.3, rim: 0.4, rimWidth: 1.6, mottle: 0.3, cloud: 6, seed: 2100 + i });
  }
}
function drawFace(f: InkRisoPen, head: InkHead) {
  paintInkFace(f, head, STYLE);
  drawHuadian(f, head);
}
// ---- hair -----------------------------------------------------------------------------------------------------------------------
// 鬟: a girl's hair, looped and not yet wound up. From one short part two soft masses leave for the temples; the near one bows over the
// brow and goes back over the top of the ear; behind, three hollow loops stand and one tress is let down. Places are read in the frame
// portraits are measured in: the irises level, 1 = the distance between them, x toward the near side.
type Run = readonly P2[];
type Lock = readonly (readonly [number, number, number])[];
const lv = (q: Run): P2[] => q.map(([x, y]) => HEAD.level(x, y));
const lock = (q: Lock) => q.map(([x, y, w]) => [...HEAD.level(x, y), w * UNIT] as const);
const leaf = (t: number) => Math.sin(Math.PI * t) ** 0.8;
const guides = (list: readonly (readonly [s: number, path: Run])[]) => inkGuideSheet(HEAD, list.map(([s, path]) => ({ s, path: lv(path) })));
/** A place read in the head's own frame, on the page. */
const onPage = (x: number, y: number): P2 => { const q = HEAD.level(x, y); return [FACE.x - FACE.scale * q[0], FACE.y + FACE.scale * q[1]]; };
/** The far mass: from the part down over the temple and out of sight. The first guide is the head's outline. */
const FARSIDE = guides([
  [0, [[-0.03, -2.0], [-0.34, -2.08], [-0.66, -1.9], [-0.9, -1.55], [-1.05, -1.12], [-1.11, -0.66], [-1.12, -0.18], [-1.06, 0.4]]],
  [0.33, [[-0.07, -1.81], [-0.3, -1.82], [-0.57, -1.66], [-0.78, -1.36], [-0.93, -0.99], [-1.02, -0.6], [-1.06, -0.14], [-1.05, 0.4]]],
  [0.66, [[-0.115, -1.58], [-0.27, -1.56], [-0.48, -1.41], [-0.66, -1.16], [-0.81, -0.87], [-0.92, -0.55], [-1.01, -0.12], [-1.035, 0.4]]],
  [1, [[-0.145, -1.325], [-0.25, -1.27], [-0.39, -1.14], [-0.53, -0.96], [-0.67, -0.74], [-0.79, -0.48], [-0.935, -0.1], [-1.02, 0.4]]],
]);
/** The near mass: from the part over the brow's end and the top of the ear to where the loops are gathered. */
const NEARSIDE = guides([
  [0, [[-0.08, -2.0], [0.26, -2.16], [0.62, -2.18], [0.98, -2.08], [1.32, -1.88], [1.58, -1.62], [1.76, -1.34], [1.86, -1.08]]],
  [0.25, [[-0.11, -1.82], [0.18, -1.91], [0.5, -1.87], [0.86, -1.71], [1.2, -1.5], [1.49, -1.27], [1.72, -1.08], [1.87, -0.95]]],
  [0.5, [[-0.135, -1.63], [0.1, -1.62], [0.4, -1.47], [0.73, -1.25], [1.07, -1.01], [1.39, -0.82], [1.67, -0.75], [1.88, -0.78]]],
  [0.75, [[-0.16, -1.47], [0.04, -1.4], [0.28, -1.19], [0.57, -0.91], [0.89, -0.63], [1.22, -0.42], [1.56, -0.4], [1.88, -0.56]]],
  [1, [[-0.18, -1.33], [-0.02, -1.24], [0.18, -1.01], [0.43, -0.72], [0.72, -0.43], [1.02, -0.17], [1.32, -0.02], [1.62, -0.06], [1.94, -0.34]]],
]);
/** The crown behind the part, back to the foot of the loops. The first guide is the outline. */
const CROWN = guides([
  [0, [[-0.36, -2.06], [-0.18, -2.22], [0.06, -2.34], [0.36, -2.4], [0.68, -2.39], [0.96, -2.31], [1.2, -2.2]]],
  [0.5, [[-0.12, -2.03], [0.08, -2.14], [0.32, -2.21], [0.6, -2.23], [0.86, -2.2], [1.08, -2.13], [1.28, -2.04]]],
  [1, [[-0.02, -1.96], [0.2, -2.03], [0.46, -2.05], [0.74, -2.03], [1, -1.97], [1.22, -1.9], [1.4, -1.82]]],
]);
/** Behind the ear: let down from the gather to the nape, where a cord takes it. The first guide is the outline, the last lies along the ear and the neck. */
const NAPE = guides([
  [0, [[1.7, -1.5], [2.0, -1.14], [2.16, -0.68], [2.18, -0.2], [2.08, 0.24], [1.91, 0.6], [1.78, 0.86], [1.73, 1.06]]],
  [0.5, [[1.68, -1], [1.86, -0.7], [1.96, -0.36], [1.96, 0], [1.88, 0.34], [1.76, 0.64], [1.67, 0.88], [1.65, 1.07]]],
  [1, [[1.58, -0.4], [1.68, -0.16], [1.7, 0.08], [1.65, 0.3], [1.57, 0.52], [1.52, 0.74], [1.53, 0.92], [1.57, 1.08]]],
]);
/** What the head's hair stands on. */
const GROUND: Run = [[-0.16, -1.3], [-0.25, -1.25], [-0.39, -1.12], [-0.53, -0.94], [-0.66, -0.72], [-0.78, -0.46], [-0.88, -0.2], [-0.97, 0.06], [-1.05, 0.06], [-1.1, -0.24], [-1.1, -0.66], [-1.04, -1.12], [-0.89, -1.55], [-0.64, -1.9], [-0.36, -2.06], [-0.18, -2.2], [0.06, -2.32], [0.36, -2.38], [0.68, -2.37], [0.96, -2.29], [1.28, -2.1], [1.7, -1.5], [2.0, -1.14], [2.15, -0.68], [2.17, -0.2], [2.07, 0.24], [1.9, 0.6], [1.77, 0.86], [1.72, 1.06], [1.58, 1.08], [1.54, 0.92], [1.53, 0.74], [1.58, 0.52], [1.66, 0.3], [1.7, 0.06], [1.62, -0.07], [1.32, -0.04], [1.02, -0.19], [0.72, -0.45], [0.43, -0.74], [0.18, -1.02], [-0.02, -1.22]];
/** The head and its hair, without the loops: what hides a scene behind the figure in a film. On the page. */
const COVER: P2[] = ([[-0.96, 0.14], [-1.08, -0.2], [-1.1, -0.66], [-1.04, -1.12], [-0.89, -1.55], [-0.64, -1.9], [-0.36, -2.06], [-0.18, -2.2], [0.06, -2.32], [0.36, -2.38], [0.68, -2.37], [0.96, -2.29], [1.28, -2.1], [1.7, -1.5], [2.0, -1.14], [2.15, -0.68], [2.17, -0.2], [2.07, 0.24], [1.9, 0.6], [1.77, 0.86], [1.72, 1.06], [1.58, 1.08], [1.53, 0.74], [1.5, 0.58], [1.36, 0.56], [1.2, 0.84], [1.06, 1.02], [0.64, 1.28], [0.2, 1.42], [-0.08, 1.48], [-0.3, 1.36], [-0.56, 1.02], [-0.76, 0.6], [-0.85, 0.26]] as const).map(([x, y]) => onPage(x, y));
function comb(f: InkRisoPen, from: number) {
  let s = from;
  const m = Z / 1.4, clear = [R, B];
  const style = (o: Partial<InkSweepOptions>): InkSweepOptions => ({ seed: s++, clear, ...o, hairWidth: m * (o.hairWidth ?? 1.2) });
  const tress = (form: InkSheetForm, s0: number, s1: number, o: Partial<InkSweepOptions> & { from?: number; to?: number; pinch?: (t: number) => number; lift?: number; flat?: boolean } = {}) => inkTress(f, K, form.lock(s0, s1, { from: o.from, to: o.to, pinch: o.pinch, lift: o.lift, flat: o.flat }), style(o));
  const sweep = (q: Lock, o: Partial<InkSweepOptions> & { seed: number }) => inkSweep(f, K, lock(q), { load: 0.98, root: 0.02, tip: 0.1, edge: [0.06, 0.06], hairs: 3, stray: 1.3, streak: 0.18, clear, hairWidth: 1.3, ...o });
  const hair = (q: Lock, w: number, ink: number, seed: number) => inkThread(f, K, q.map(([x, y, p]) => [...HEAD.level(x, y), p] as const), w * m, { ink, inkEnd: ink * 0.7, seed });
  const strand = (q: Run, w: number, ink: number, seed: number) => hair(q.map(([x, y], k) => [x, y, 0.1 + 0.9 * leaf(k / (q.length - 1))] as const), w, ink, seed);
  const clumps = (form: InkSheetForm, o: Omit<InkClumpOptions, "seed"> & { seed?: number }) => inkClumps(f, K, form, { seed: s++, clear, ...o, hairWidth: m * (o.hairWidth ?? 1.1) });
  const flyaways = (form: InkSheetForm, o: Omit<InkFlyawayOptions, "seed">) => inkFlyaways(f, K, form, { seed: s++, ...o, width: [m * (o.width?.[0] ?? 0.6), m * (o.width?.[1] ?? 1.5)] });
  const gap = (q: Run, w: number, shape?: InkGapShape) => inkGap(f, [K], lv(q), w * UNIT * FACE.scale, shape);
  const slit = (form: InkSheetForm, at: number, t0: number, t1: number, w: number, shape: InkGapShape = "leaf") => inkGap(f, [K], form.run(at, t0, t1, 9), w * UNIT * FACE.scale, shape);
  const lobe = (form: InkSheetForm, s0: number, s1: number, seed: number, o: NonNullable<Parameters<typeof tress>[3]> & { n?: number } = {}) => {
    const { n = 3, ...rest } = o, w = s1 - s0;
    tress(form, s0, s1, { load: 0.92, root: 0.01, tip: 0.02, edge: [0.02, 0.03], streak: 0.3, hairs: 4, stray: 1.1, seed, ...rest });
    if (n) clumps(form, { n, s: [s0 + 0.12 * w, s1 - 0.12 * w], half: [0.08 * w, 0.16 * w], from: [0.04, 0.3], to: [0.76, 0.98], lift: [1, 3], drift: 0.05 * w, load: [1, 0.95], root: 0.2, tip: 0.2, streak: 0.28, hairs: 1, stray: 1, seed: seed + 60 });
  };
  return { tress, sweep, hair, strand, clumps, flyaways, gap, slit, lobe };
}
/** The two masses, the crown and the hair behind the ear. */
function drawSides(f: InkRisoPen) {
  const { gap, slit, lobe, flyaways, strand, hair } = comb(f, 500);
  f.knock(f.shape(lv(GROUND)), [K, R, B]);
  lobe(NAPE, 0, 1, 505, { n: 5, hairs: 8, stray: 1.3, tip: 0 });
  flyaways(NAPE, { n: 6, s: [-0.04, 0.2], from: [0.1, 0.5], length: [0.2, 0.36], lift: [1, 5], drift: 0.06, ink: [0.4, 0.8] });
  slit(NAPE, 0.3, 0.3, 0.8, 0.014); slit(NAPE, 0.62, 0.34, 0.86, 0.012); slit(NAPE, 0.84, 0.5, 0.94, 0.009);
  paintInkEar(f, HEAD, STYLE);
  hair([[-0.3, -2.14, 0.3], [-0.1, -2.29, 0.9], [0.12, -2.38, 1], [0.38, -2.425, 0.7], [0.6, -2.42, 0]], 1.7, 0.74, 506);
  lobe(CROWN, 0, 1, 507, { n: 4 });
  slit(CROWN, 0.4, 0.2, 0.7, 0.01);
  flyaways(CROWN, { n: 7, s: [-0.04, 0.2], from: [0, 0.3], length: [0.3, 0.6], lift: [1, 5], drift: 0.06, ink: [0.35, 0.8] });
  // ---- near
  lobe(NEARSIDE, 0.76, 1, 523, { n: 3, hairs: 8, stray: 1.4 });
  lobe(NEARSIDE, 0.48, 0.78, 522, { n: 3 });
  lobe(NEARSIDE, 0.24, 0.5, 521, { n: 3 });
  lobe(NEARSIDE, 0, 0.26, 520, { n: 3 });
  slit(NEARSIDE, 0.77, 0.24, 0.74, 0.018); slit(NEARSIDE, 0.49, 0.2, 0.6, 0.018); slit(NEARSIDE, 0.25, 0.26, 0.7, 0.014); slit(NEARSIDE, 0.9, 0.4, 0.86, 0.011); slit(NEARSIDE, 0.62, 0.56, 0.92, 0.012);
  flyaways(NEARSIDE, { n: 8, s: [0.3, 1.03], from: [0.1, 0.4], length: [0.3, 0.5], lift: [1, 4], drift: 0.1, ink: [0.4, 0.8] });
  for (const [i, [q, w, ink]] of ([
    [[[0.2, -0.97], [0.45, -0.67], [0.74, -0.38], [1.04, -0.12], [1.34, 0.03]], 1.7, 0.8], [[[0.58, -0.54], [0.82, -0.28], [1.08, -0.06], [1.34, 0.06], [1.6, 0.02]], 1.4, 0.74],
  ] as readonly (readonly [Run, number, number])[]).entries()) strand(q, w, ink, 566 + i);
  // ---- far
  hair([[-0.46, -2.06, 0.2], [-0.74, -1.87, 0.8], [-0.97, -1.52, 1], [-1.11, -1.1, 0.9], [-1.155, -0.7, 0.5], [-1.15, -0.4, 0]], 1.6, 0.72, 515);
  lobe(FARSIDE, 0, 0.36, 510, { n: 3, tip: 0.24 });
  lobe(FARSIDE, 0.34, 0.7, 511, { n: 3, tip: 0.26 });
  lobe(FARSIDE, 0.66, 1, 512, { n: 3, tip: 0.28, hairs: 7, stray: 1.2 });
  slit(FARSIDE, 0.35, 0.22, 0.62, 0.016); slit(FARSIDE, 0.68, 0.22, 0.64, 0.014); slit(FARSIDE, 0.14, 0.4, 0.8, 0.012);
  flyaways(FARSIDE, { n: 5, s: [0.9, 1.04], from: [0.05, 0.3], length: [0.3, 0.5], lift: [0, 3], drift: 0.08, ink: [0.5, 0.8] });
  // ---- the part: narrow, and wandering; locks fan from its end
  gap([[-0.165, -1.31], [-0.172, -1.4], [-0.165, -1.52], [-0.158, -1.62], [-0.128, -1.74], [-0.09, -1.84], [-0.03, -1.95], [0.04, -2.03]], 0.014, t => [0.3, 0.8, 0.95, 0.6, 0.9, 0.6, 0.5, 0.1][Math.round(7 * t)]);
  for (const [q, w] of [
    [[[-0.06, -1.88], [0.04, -1.93], [0.17, -1.94]], 0.014], [[[-0.145, -1.66], [-0.05, -1.65], [0.06, -1.6]], 0.012], [[[-0.11, -1.79], [-0.2, -1.83], [-0.31, -1.82]], 0.013],
  ] as readonly (readonly [Run, number])[]) gap(q, w);
  // hairs at its foot: they leave the skin one by one
  for (const [i, [q, w, ink]] of ([[[[-0.165, -1.2], [-0.175, -1.3], [-0.21, -1.42]], 1.9, 0.82], [[[-0.135, -1.19], [-0.12, -1.29], [-0.07, -1.41]], 1.9, 0.82], [[[-0.21, -1.2], [-0.24, -1.29], [-0.3, -1.4]], 1.5, 0.74], [[[-0.085, -1.18], [-0.04, -1.27], [0.04, -1.36]], 1.5, 0.74], [[[-0.28, -1.15], [-0.31, -1.23], [-0.39, -1.32]], 1.3, 0.66], [[[0, -1.12], [0.06, -1.19], [0.15, -1.26]], 1.3, 0.66]] as readonly (readonly [Run, number, number])[]).entries()) strand(q, w, ink, 570 + i);
}
/** Three hollow loops of hair, each a hank that rises thin, swells where it turns over and comes back thin to its foot: their middles, with half widths. */
const LOOPS: { far: Lock; back: Lock; tall: Lock } = {
  far: [[1, -2.16, 0.06], [0.76, -2.24, 0.12], [0.55, -2.42, 0.17], [0.48, -2.65, 0.195], [0.6, -2.86, 0.2], [0.83, -2.9, 0.18], [1.01, -2.76, 0.15], [1.08, -2.52, 0.12], [1.08, -2.26, 0.08]],
  back: [[1.46, -1.96, 0.07], [1.74, -2.14, 0.15], [2.06, -2.2, 0.215], [2.36, -2.05, 0.25], [2.5, -1.74, 0.245], [2.43, -1.42, 0.21], [2.22, -1.2, 0.17], [1.97, -1.13, 0.12], [1.75, -1.2, 0.06]],
  tall: [[1.14, -2.08, 0.07], [1, -2.34, 0.15], [0.96, -2.64, 0.21], [1.1, -2.94, 0.25], [1.4, -3.07, 0.26], [1.7, -2.96, 0.25], [1.86, -2.66, 0.22], [1.82, -2.34, 0.17], [1.66, -2.08, 0.11], [1.48, -1.92, 0.05]],
};
function drawLoops(f: InkRisoPen) {
  const { sweep, gap, hair } = comb(f, 700);
  const hank = { root: 0.02, tip: 0.04, edge: [0.03, 0.06] as [number, number], streak: 0.24, hairs: 7, stray: 1.2, load: 0.97 };
  // the far one, small, seen nearly from its edge
  sweep(LOOPS.far, { ...hank, load: 0.92, seed: 711, plies: { n: 3, load: [0.98, 0.86], streak: 0.34 } });
  hair([[0.36, -2.44, 0.3], [0.265, -2.62, 0.9], [0.3, -2.86, 0.8], [0.44, -3.06, 0.4], [0.6, -3.16, 0]], 1.4, 0.66, 712);
  gap([[0.84, -2.37], [0.7, -2.5], [0.66, -2.66], [0.74, -2.76]], 0.014, "leaf");
  // the back one, let down toward the nape
  sweep(LOOPS.back, { ...hank, seed: 713, plies: { n: 4, load: [1, 0.9], streak: 0.28 } });
  hair([[2.3, -2.3, 0.3], [2.56, -2.14, 0.9], [2.74, -1.86, 0.8], [2.82, -1.58, 0.4], [2.83, -1.4, 0]], 1.5, 0.68, 714); hair([[2.5, -1.28, 0.3], [2.32, -1.08, 0.8], [2.1, -0.98, 0.5], [1.94, -0.97, 0]], 1.4, 0.66, 718);
  gap([[1.8, -2.02], [2.04, -2.04], [2.24, -1.92], [2.32, -1.7]], 0.018, "leaf"); gap([[2.3, -2.16], [2.5, -1.96], [2.56, -1.66]], 0.013, "leaf"); gap([[2.3, -1.38], [2.14, -1.26], [1.94, -1.2]], 0.014, "leaf");
  // the middle one, the tallest
  sweep(LOOPS.tall, { ...hank, seed: 715, plies: { n: 5, load: [1, 0.92], streak: 0.26 } });
  hair([[0.92, -3.04, 0.3], [1.1, -3.24, 0.9], [1.36, -3.35, 0.8], [1.6, -3.36, 0.4], [1.78, -3.3, 0]], 1.5, 0.7, 716); hair([[0.79, -2.4, 0.3], [0.735, -2.64, 0.8], [0.78, -2.88, 0.5], [0.86, -3.04, 0]], 1.3, 0.6, 719);
  gap([[1.12, -2.4], [1.12, -2.68], [1.26, -2.86], [1.44, -2.88]], 0.02, "leaf"); gap([[0.9, -2.5], [0.88, -2.76], [1, -3.02], [1.22, -3.16]], 0.014, "leaf"); gap([[1.64, -2.8], [1.72, -2.58], [1.66, -2.3]], 0.016, "leaf"); gap([[1.86, -2.86], [1.94, -2.62], [1.88, -2.36]], 0.011, "leaf");
  // one hank laid round their feet
  sweep([[0.82, -2.2, 0.02], [1.02, -2.2, 0.08], [1.26, -2.08, 0.115], [1.48, -1.9, 0.125], [1.67, -1.64, 0.115], [1.8, -1.36, 0.085], [1.87, -1.1, 0.03]], { ...hank, seed: 717, plies: { n: 3, load: [1, 0.94], streak: 0.24 } });
  gap([[1.06, -2.12], [1.28, -2], [1.47, -1.82], [1.61, -1.58]], 0.013, "leaf"); gap([[1.3, -2.14], [1.52, -1.96], [1.7, -1.7]], 0.01, "leaf");
}
/** 一縷青絲: the tress an unmarried girl lets down over her shoulder, tied at the nape with a cord. */
function drawTress(f: InkRisoPen) {
  const { sweep, gap, hair } = comb(f, 740);
  const dark = { root: 0.01, tip: 0.06, hairs: 7, stray: 1.4, streak: 0.18, load: 0.98 };
  f.knock(inkBlob(f, lock([[1.66, 1.16, 0.05], [1.78, 1.46, 0.1], [1.76, 1.9, 0.12], [1.65, 2.35, 0.12], [1.55, 2.8, 0.11], [1.52, 3.2, 0.1], [1.52, 3.6, 0.08], [1.46, 3.95, 0.05]])));
  sweep([[1.64, 1.04, 0.07], [1.7, 1.24, 0.1], [1.77, 1.5, 0.135], [1.77, 1.9, 0.155], [1.68, 2.34, 0.15], [1.58, 2.78, 0.14], [1.53, 3.2, 0.125], [1.53, 3.58, 0.1], [1.49, 3.92, 0.07], [1.4, 4.22, 0.04], [1.34, 4.46, 0.016], [1.36, 4.64, 0]], { ...dark, seed: 741, plies: { n: 4, load: [1, 0.95], streak: 0.18 }, over: 8 });
  gap([[1.74, 1.46], [1.72, 1.9], [1.62, 2.4], [1.53, 2.84]], 0.018, "leaf"); gap([[1.84, 1.76], [1.78, 2.2], [1.69, 2.62]], 0.014, "leaf"); gap([[1.5, 3], [1.5, 3.4], [1.48, 3.74]], 0.016, "leaf");
  for (const [q, w, ink, seed] of [
    [[[1.62, 1.5, 0.2], [1.58, 1.9, 0.8], [1.49, 2.4, 0.8], [1.4, 2.9, 0.6], [1.37, 3.4, 0.4], [1.42, 3.7, 0]], 1.5, 0.72, 742], [[[1.9, 1.6, 0.2], [1.92, 2, 0.8], [1.82, 2.5, 0.7], [1.72, 2.9, 0.3], [1.7, 3.1, 0]], 1.5, 0.7, 743], [[[1.62, 3, 0.2], [1.66, 3.4, 0.8], [1.64, 3.8, 0.7], [1.54, 4.2, 0.4], [1.52, 4.44, 0]], 1.6, 0.72, 744], [[[1.44, 3.3, 0.2], [1.41, 3.6, 0.8], [1.36, 3.9, 0.6], [1.27, 4.2, 0]], 1.3, 0.64, 745],
  ] as const) hair(q, w, ink, seed);
  // the cord: three turns, and two ends that lie over the tress, off the dark of the collar
  f.knock(inkBlob(f, lock([[1.555, 1.04, 0.03], [1.64, 1.075, 0.06], [1.73, 1.06, 0.03]])), [K, R, B]);
  for (const [i, y] of [1.03, 1.075, 1.12].entries()) inkThread(f, R, [[...HEAD.level(1.535 - 0.004 * i, y - 0.008), 0.6], [...HEAD.level(1.64, y + 0.016), 1], [...HEAD.level(1.75 + 0.008 * i, y - 0.004), 0.6]] as N3[], 7.4, { ink: 0.96, seed: 750 + i });
  for (const [i, q] of ([[[1.64, 1.12, 0.7], [1.71, 1.3, 1], [1.725, 1.5, 0.9], [1.775, 1.74, 0.8], [1.75, 1.94, 0.3]], [[1.67, 1.12, 0.7], [1.77, 1.28, 1], [1.82, 1.46, 0.9], [1.88, 1.62, 0.7], [1.87, 1.76, 0.3]]] as const).entries()) {
    const n = q.map(([x, y, p]) => [...HEAD.level(x, y), p] as const) as unknown as N3[];
    f.lift(n, 4.6, [K, B]); inkThread(f, R, n, 3.4, { ink: 0.94, seed: 755 + i });
  }
}
// ---- neck and robe, in page units --------------------------------------------------------------------------------------------------
/** The figure's ground: paper, so nothing behind her shows through. */
const FIGURE: P2[] = [[430, 560], [424, 660], [420, 720], [414, 780], [406, 816], [386, 848], [354, 886], [320, 926], [290, 972], [266, 1032], [252, 1110], [238, 1200], [226, 1290], [219, 1372], [226, 1440], [206, 1530], [160, 1640], [862, 1640], [824, 1560], [782, 1490], [762, 1420], [761, 1340], [759, 1250], [750, 1160], [732, 1078], [704, 1014], [676, 980], [642, 953], [620, 936], [598, 918], [580, 900], [571, 888], [567, 878], [573, 860], [583, 838], [560, 700]];
/** The collars' edges toward the throat, from behind the neck down. */
const NEAR_IN: P2[] = [[420, 808], [409, 834], [411, 869], [425, 908], [452, 951], [488, 995], [528, 1037], [564, 1075], [596, 1110], [616, 1134]];
const FAR_IN: P2[] = [[569, 898], [576, 930], [584, 966], [587, 1008], [585, 1052], [578, 1100], [560, 1152], [538, 1206], [514, 1260], [490, 1312], [466, 1362], [446, 1408]];
const draws = (p: InkRisoPen, from: number) => {
  let s = from;
  const th = (pts: N3[], w: number, ink = 0.85, inkEnd = ink * 0.6, mid?: number) => inkThread(p, K, pts, w, { ink, inkEnd, mid, seed: s++ });
  const side = (pts: N3[], w: number, o: Omit<Parameters<typeof inkSide>[4], "seed">, plate = K) => inkSide(p, plate, pts, w, { ...o, bristles: o.bristles ?? Math.max(6, w * 0.45), seed: s++ });
  const wash = (plate: string, pts: readonly (readonly number[])[], o: Omit<Parameters<typeof inkBloom>[3], "seed">) => inkBloom(p, plate, p.shape(pts as readonly P2[]), { ...o, seed: s++ });
  const loc = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  /** A contour: the brush presses where the form turns and lifts where it runs on; water on the form's side. */
  const edge = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.92, belly: 0.1, side: sd, head: 0.3, rim: 0.15, dry: 0.06, dryEnd: 0.4, grain: 0.8, ...o });
  const fold = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.82, belly: 0.02, side: sd, head: 0.3, rim: 0.1, dry: 0.1, dryEnd: 0.8, grain: 1.1, ...o });
  return { th, side, wash, loc, edge, fold };
};
/** A line set off to one side by a distance of its own. */
const aside = (q: readonly P2[], d: (t: number) => number): P2[] => q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], z = q[Math.min(q.length - 1, i + 1)], l = Math.hypot(z[0] - a[0], z[1] - a[1]), k = d(i / (q.length - 1)); return [x - ((z[1] - a[1]) / l) * k, y + ((z[0] - a[0]) / l) * k] as const; });
const press = (q: readonly (readonly number[])[], ...k: number[]): N3[] => q.map((r, i) => { const t = (i / (q.length - 1)) * (k.length - 1), j = Math.min(k.length - 2, Math.floor(t)); return [r[0], r[1], lerp(k[j], k[j + 1], t - j)] as const; });
function drawBody(pen: Pens) {
  const { page: p, face } = pen, { th, side, wash, loc, edge, fold } = draws(p, 800);
  /** Where the wet ink of the hem ends: it runs to the paper's foot in some places and dries short of it in others. */
  const foot = (x: number, y: number) => ss(0, 90, 1640 - y - 90 * inkFbm2(21, x / 130, 0.4, 2));
  /** Water in the valley of a fold: full on the fold's own line, gone `width` away from it, deeper toward the hem. */
  const vale = (plate: string, q: readonly P2[], width: number, tone: number, seed: number) => {
    const n = Math.abs(width), sg = Math.sign(width), far = aside(q, t => sg * n * (0.35 + 0.65 * t)), y0 = q[0][1], y1 = q[q.length - 1][1];
    const off = (x: number, y: number) => { let b = 1e9; for (let i = 0; i < q.length - 1; i++) { const [ax, ay] = q[i], dx = q[i + 1][0] - ax, dy = q[i + 1][1] - ay, f = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)); b = Math.min(b, Math.hypot(x - ax - f * dx, y - ay - f * dy)); } return b; };
    inkBloom(p, plate, p.shape([...q, ...[...far].reverse()]), { tone: loc((x, y) => { const t = clamp((y - y0) / (y1 - y0)), w = n * (0.3 + 0.6 * t); return tone * (0.3 + 0.7 * ss(0, 0.7, t)) * Math.exp(-((off(x, y) / w) ** 2) * 2.4) * (0.45 + 1.0 * inkFbm2(seed, x / 40, y / 150, 3)) * foot(x, y); }), soft: 2.4, wander: 1.4, wave: 60, fringe: 0.8, rim: 0.2, rimWidth: 5, mottle: 0.4, cloud: 60, seed });
  };
  p.knock(p.shape(FIGURE));
  // ---- neck and chest
  const throat: P2[] = [[582, 838], [573, 862], [567, 886], [566, 910]];
  const neck = p.shape([...throat, [600, 1060], [560, 1080], [500, 1000], [424, 900], [404, 836], [412, 790], [415, 740], [418, 690], [430, 630], [500, 620], [560, 760]]);
  const jaw = HEAD.jaw.filter((_, i) => i % 6 === 0).map(q => p.local(...face.at(q[0], q[1])));
  const below = (x: number, y: number) => { let d = 1e9; for (const q of jaw) d = Math.min(d, Math.hypot(x - q[0], (y - q[1]) * 0.8)); return d; };
  const onNeck = (plate: string, tone: (x: number, y: number) => number) => inkBloom(p, plate, neck, { tone: loc(tone), soft: 2, wander: 0, fringe: 0, rim: 0, mottle: 0.3, cloud: 42, seed: 790 + plate.length });
  onNeck(K, (x, y) => { const d = below(x, y) + 8 * (inkFbm2(6, x / 48, y / 48, 2) - 0.5); return (0.17 * Math.exp(-((d / 30) ** 2)) + 0.08 * Math.exp(-((d / 76) ** 2))) * ss(462, 540, x) + 0.05 * ss(560, 600, x) * ss(1000, 900, y); });
  onNeck(R, (x, y) => 0.035 * Math.exp(-((below(x, y) / 60) ** 2)));
  // ---- inner collars, a breath of indigo
  const nearIn2 = aside(NEAR_IN.slice(0, 8), t => -lerp(3, 20, ss(0, 0.45, t))), farIn2 = aside(FAR_IN.slice(0, 6), t => lerp(2, 20, ss(0, 0.45, t)));
  p.knock(p.shape([...NEAR_IN.slice(0, 8), ...[...nearIn2].reverse()]));
  wash(B, [...NEAR_IN.slice(0, 8), ...[...nearIn2].reverse()], { tone: 0.24, soft: 2, wander: 1, rim: 0.4, rimWidth: 3, mottle: 0.4, cloud: 40 });
  th(press(nearIn2, 0.1, 0.5, 0.9, 0.7, 0.9, 0.8, 0.3), 2.6, 0.74, 0.5);
  p.knock(p.shape([...FAR_IN.slice(0, 6), ...[...farIn2].reverse()]));
  wash(B, [...FAR_IN.slice(0, 6), ...[...farIn2].reverse()], { tone: 0.28, soft: 2, wander: 1, rim: 0.4, rimWidth: 3, mottle: 0.4, cloud: 40 });
  th(press(farIn2, 0.1, 0.5, 0.9, 0.7, 0.9, 0.6, 0.1), 2.6, 0.78, 0.5);
  // the throat stands before the far collar; the nape is one long line from behind the ear to the collar
  th(press(throat, 0.3, 1, 1, 0.9, 0.6, 0.05), 4.6, 0.92, 0.5);
  th(press([[424, 712], [421, 744], [418, 776], [412, 806], [403, 834]], 0.04, 0.6, 0.9, 0.9, 0.4), 3.6, 0.88, 0.6);
  th([[565, 992, 0.05], [553, 1000, 0.7], [535, 999, 0.4], [514, 988, 0.02]], 2.4, 0.4, 0.12);
  th([[470, 866, 0.02], [499, 896, 0.5], [532, 936, 0.7], [556, 972, 0.05]], 2, 0.1, 0.3);
  // ---- near collar: it comes out from behind the nape and stands away from it
  const nearW = (t: number) => lerp(3, 26, ss(0, 0.14, t)) + 22 * ss(0.12, 0.6, t), nearOut = aside(NEAR_IN, nearW);
  p.knock(p.shape([...NEAR_IN, ...[...nearOut].reverse()]));
  wash(K, [...NEAR_IN, ...[...nearOut].reverse()], { tone: loc((_x, y) => lerp(0.97, 0.6, ss(920, 1180, y))), soft: 1.6, wander: 1.4, fringe: 0.2, tooth: 6, rim: 0.2, mottle: 0.3, cloud: 70 });
  side(press(aside(NEAR_IN, t => nearW(t) / 2), 0.05, 0.5, 0.7, 0.85, 1, 1, 1), 42, { tip: 0.94, belly: 0.6, side: 1, head: 0, rim: 0.1, dry: 0.08, dryEnd: 0.8 });
  // ---- the far panel, over it: the wearer's left over her right
  const farW = (t: number) => lerp(3, 54, ss(0, 0.42, t)), farOut = aside(FAR_IN, t => -farW(t));
  p.knock(p.shape([...FAR_IN, ...[...farOut].reverse()]));
  wash(K, [...FAR_IN, ...[...farOut].reverse()], { tone: loc((_x, y) => lerp(0.98, 0.3, ss(1080, 1430, y))), soft: loc((_x, y) => lerp(1.6, 10, ss(1320, 1420, y))), wander: 2, fringe: 0.2, tooth: 6, rim: 0.2, mottle: 0.36, cloud: 90 });
  side(press(aside(FAR_IN, t => -farW(t) / 2), 0.04, 0.34, 0.66, 0.9, 1, 1, 0.9, 0.8), 48, { tip: 0.94, belly: 0.6, side: -1, head: 0, rim: 0.1, dry: 0.08, dryEnd: 1 });
  // ---- waters of the robe: whites stand, grey goes where cloth turns away
  wash(K, [[696, 1060], [730, 1080], [750, 1160], [758, 1250], [758, 1340], [752, 1410], [716, 1404], [684, 1390], [698, 1300], [712, 1200]], { tone: loc((x, y) => 0.2 * ss(1060, 1200, y) * (0.5 + 0.9 * inkFbm2(5, x / 50, y / 130, 2))), soft: 12, wander: 5, mottle: 0.5 });
  wash(K, [[470, 1130], [430, 1190], [412, 1290], [384, 1390], [470, 1430], [520, 1330], [560, 1210]], { tone: loc((x, y) => 0.06 * ss(1150, 1300, y) * (0.4 + 1.1 * inkFbm2(15, x / 70, y / 50, 2))), soft: 24, wander: 8, mottle: 0.5 });
  // ---- sash
  wash(K, [[438, 1404], [480, 1418], [552, 1424], [622, 1414], [682, 1390], [694, 1424], [652, 1488], [600, 1500], [540, 1482], [480, 1456], [440, 1432]], { tone: 0.62, soft: 2, wander: 2, wave: 60, fringe: 0.3, tooth: 6, rim: 0.2, rimWidth: 6, mottle: 0.3, cloud: 120 });
  for (const [q, w, tip] of [[[[436, 1410, 0.5], [500, 1430, 1], [580, 1430, 1], [660, 1406, 0.9], [694, 1392, 0.4]], 34, 0.97], [[[452, 1438, 0.3], [520, 1458, 0.9], [596, 1456, 1], [676, 1424, 0.5]], 32, 0.9], [[[540, 1478, 0.2], [596, 1484, 0.9], [652, 1460, 0.4]], 30, 0.86]] as const) side(q as unknown as N3[], w, { tip, belly: 0.55, side: -1, head: 0.1, rim: 0.1, dry: 0.12, dryEnd: 0.7, bristles: 13, grain: 0.9 });
  // ---- the far sleeve, then the near one
  p.knock(p.shape([[704, 1392], [672, 1438], [640, 1486], [620, 1530], [616, 1640], [862, 1640], [824, 1560], [782, 1490], [758, 1440], [726, 1404]]));
  wash(B, [[690, 1420], [660, 1456], [634, 1500], [628, 1640], [870, 1640], [822, 1560], [780, 1490], [752, 1440]], { tone: loc((x, y) => 0.26 * ss(1400, 1560, y) * foot(x, y) * (0.25 + 1.1 * inkFbm2(9, x / 70, y / 170, 3))), soft: 4, wander: 4, wave: 70, fringe: 1, mottle: 0.5 });
  vale(K, [[706, 1400], [720, 1458], [738, 1520], [760, 1580], [776, 1640]], 62, 0.46, 1101); vale(B, [[712, 1394], [736, 1408], [762, 1440], [786, 1490], [824, 1560], [862, 1640]], 80, 0.5, 1102); vale(K, [[640, 1494], [664, 1536], [674, 1590], [680, 1640]], 40, 0.4, 1103);
  edge(press([[706, 1388], [684, 1424], [658, 1458], [632, 1500]], 0.04, 0.8, 0.7, 0.05), 13, -1);
  p.knock(p.shape([[376, 1392], [430, 1424], [500, 1456], [560, 1482], [616, 1500], [628, 1560], [632, 1640], [164, 1640], [206, 1540], [226, 1446]]));
  wash(B, [[430, 1440], [520, 1474], [612, 1506], [626, 1640], [190, 1640], [214, 1540], [300, 1500], [360, 1430]], { tone: loc((x, y) => 0.24 * ss(1430, 1580, y) * foot(x, y) * (0.2 + 1.2 * inkFbm2(3, x / 90, y / 190, 3))), soft: 14, wander: 12, wave: 110, fringe: 1.2, rim: 0.2, mottle: 0.55, cloud: 120 });
  vale(K, [[384, 1404], [350, 1436], [306, 1484], [276, 1540], [262, 1590], [256, 1640]], -84, 0.44, 1111); vale(B, [[392, 1410], [374, 1452], [352, 1516], [342, 1580], [340, 1640]], -70, 0.6, 1112); vale(K, [[600, 1502], [560, 1524], [500, 1552], [450, 1592], [400, 1640]], -60, 0.5, 1113); vale(B, [[618, 1500], [628, 1556], [632, 1640]], 90, 0.5, 1114);
  vale(K, [[225, 1440], [205, 1530], [172, 1604], [156, 1640]], -50, 0.3, 1115);
  wash(K, [[250, 1360], [330, 1380], [374, 1400], [350, 1440], [300, 1490], [250, 1520], [232, 1470]], { tone: loc((_x, y) => 0.11 * ss(1340, 1400, y) * ss(1530, 1440, y)), soft: 30, wander: 12, mottle: 0.5 });
  // ---- lines
  edge(press([[372, 874], [350, 896], [320, 928], [290, 972], [266, 1032], [250, 1110], [237, 1200], [225, 1290], [218, 1372], [225, 1440], [205, 1530], [172, 1604]], 0.1, 0.5, 0.7, 1, 0.8, 0.5, 0.6, 0.9, 0.8, 1, 0.6, 0.04), 19, 1, { dryEnd: 0.8 });
  edge(press([[626, 942], [642, 952], [676, 980], [704, 1014], [732, 1078], [750, 1160], [759, 1250], [761, 1340], [762, 1420], [782, 1490], [824, 1560], [852, 1600]], 0.05, 0.4, 0.8, 1, 0.6, 0.4, 0.7, 0.6, 0.9, 0.6, 0.3, 0.04), 16, -1, { dryEnd: 0.8 });
  edge([[716, 1120, 0.02], [718, 1180, 0.4], [710, 1250, 0.8], [696, 1318, 0.6], [684, 1386, 0.1]], 13, 1);
  edge([[424, 1172, 0.02], [420, 1236, 0.4], [406, 1306, 0.8], [376, 1392, 0.7], [430, 1424, 0.8], [500, 1456, 1], [560, 1482, 0.8], [616, 1500, 0.9], [628, 1556, 0.5], [632, 1600, 0.04]], 15, -1, { dryEnd: 0.7 });
  fold([[384, 1404, 0.03], [350, 1436, 0.8], [306, 1484, 0.9], [276, 1540, 0.5], [266, 1590, 0.03]], 18, 1);
  fold([[392, 1410, 0.03], [374, 1452, 0.7], [352, 1516, 0.7], [344, 1580, 0.03]], 15, 1);
  fold([[604, 1504, 0.03], [560, 1524, 0.7], [500, 1552, 0.8], [450, 1592, 0.03]], 16, -1);
  fold([[370, 1380, 0.03], [336, 1362, 0.7], [298, 1352, 0.4], [266, 1354, 0.02]], 13, 1);
  fold([[712, 1398, 0.05], [736, 1380, 0.7], [756, 1356, 0.03]], 11, 1);
  fold([[706, 1391, 0.05], [732, 1404, 0.8], [760, 1438, 0.7], [776, 1476, 0.5], [796, 1530, 0.03]], 14, -1);
  fold([[706, 1412, 0.05], [718, 1458, 0.7], [738, 1520, 0.5], [760, 1580, 0.03]], 13, -1);
  fold([[644, 1494, 0.05], [664, 1536, 0.7], [672, 1590, 0.03]], 13, -1);
  fold([[336, 934, 0.02], [352, 984, 0.6], [356, 1040, 0.5], [350, 1096, 0.02]], 11, 1);
  fold([[258, 1090, 0.02], [262, 1150, 0.6], [256, 1220, 0.5], [244, 1290, 0.02]], 13, 1);
  fold([[660, 1010, 0.02], [670, 1060, 0.6], [668, 1110, 0.4], [658, 1150, 0.02]], 10, -1);
}

/** A length of the scarf: thin indigo inside two edges that swell and thin. `w` is half its width along the way; `tone` is asked how far along and how far across (−1..1). */
function scarfBand(d: ReturnType<typeof draws>, q: readonly P2[], w: readonly number[], tone: (t: number, u: number) => number, o: Partial<Parameters<typeof inkBloom>[3]> = {}, ends: readonly P2[] = []) {
  const at = (t: number) => { const x = t * (w.length - 1), i = Math.min(w.length - 2, Math.floor(x)); return lerp(w[i], w[i + 1], x - i); }, L = aside(q, t => -at(t)), M = aside(q, t => at(t)), k = ends.length ? 1 : 0;
  const thin = d.loc((x, y) => { let b = 1e9, bt = 0, bu = 0; for (let i = 0; i < q.length - 1; i++) { const [ax, ay] = q[i], dx = q[i + 1][0] - ax, dy = q[i + 1][1] - ay, f = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)), l = Math.hypot(x - ax - f * dx, y - ay - f * dy); if (l < b) { b = l; bt = (i + f) / (q.length - 1); bu = (dx * (y - ay) - dy * (x - ax) > 0 ? 1 : -1) * l; } } return tone(bt, bu / Math.max(4, at(bt))) * (0.6 + 0.8 * inkFbm2(27, x / 46, y / 120, 3)); });
  d.wash(B, [...L.slice(k), ...[...M.slice(k)].reverse(), ...ends], { tone: thin, soft: 1.6, wander: 2.4, wave: 60, fringe: 0.8, rim: 0.5, rimWidth: 5, mottle: 0.4, cloud: 60, ...o });
  return { L, M };
}
/** 披帛: the end of the scarf that is out on the air behind her far arm. It turns over once. */
function drawScarfEnd({ page: p }: Pens) {
  const d = draws(p, 1000), { th } = d;
  const out1: P2[] = [[716, 1276], [760, 1262], [806, 1260], [856, 1284], [896, 1330], [916, 1386], [914, 1436]], out2: P2[] = [[915, 1420], [905, 1468], [910, 1518], [938, 1554], [982, 1570], [1034, 1562]];
  const b2 = scarfBand(d, out2, [3, 17, 30, 31, 22, 3], (t, u) => 0.52 - 0.2 * u - 0.16 * t), b1 = scarfBand(d, out1, [26, 30, 32, 35, 30, 17, 2], (t, u) => 0.28 + 0.14 * u + 0.12 * t);
  th(press(b1.L, 0.3, 0.5, 0.9, 1, 0.5, 0.8, 0.3), 3.4, 0.72, 0.6); th(press(b1.M, 0.2, 0.9, 0.5, 0.4, 1, 0.8, 0.3), 3.8, 0.8, 0.6); th(press(b2.L, 0.3, 0.9, 1, 0.6, 0.4, 0.05), 3.8, 0.84, 0.5); th(press(b2.M, 0.3, 0.8, 0.5, 1, 0.6, 0.05), 3, 0.7, 0.4);
  th([[782, 1256, 0.05], [836, 1284, 0.6], [878, 1332, 0.7], [903, 1390, 0.5], [912, 1430, 0.1]], 2, 0.4, 0.5); th([[914, 1446, 0.1], [912, 1490, 0.6], [928, 1532, 0.6], [968, 1556, 0.05]], 2, 0.5, 0.3);
}
/** The scarf over the near arm, gathered in the crook and let fall: so thin that the robe's lines show through. */
function drawScarf({ page: p }: Pens) {
  const d = draws(p, 1040), { th, loc } = d;
  const near: P2[] = [[226, 1276], [262, 1302], [304, 1340], [346, 1380], [382, 1416], [408, 1456], [424, 1504], [428, 1554], [418, 1612]];
  const b = scarfBand(d, near, [42, 43, 40, 32, 21, 19, 29, 37, 44], (t, u) => (0.24 + 0.2 * Math.exp(-(((t - 0.54) / 0.2) ** 2)) + (t < 0.54 ? -0.08 : 0.1) * u) * ss(1.04, 0.72, t), { soft: loc((_x, y) => lerp(1.6, 16, ss(1520, 1600, y))) }, [[222, 1338], [214, 1322], [216, 1270], [230, 1232], [240, 1230]]);
  th([[240, 1228, 0.1], [226, 1238, 0.7], [216, 1270, 1], [213, 1306, 0.9], [219, 1336, 0.5]], 3, 0.8, 0.7);
  th(press([[232, 1230], ...b.L.slice(1)], 0.1, 0.5, 1, 0.6, 0.4, 1, 0.8, 0.4, 0.03), 4, 0.84, 0.4); th(press([[216, 1330], ...b.M.slice(1)], 0.1, 0.9, 0.45, 0.7, 1, 0.9, 0.5, 0.4, 0.03), 4, 0.84, 0.4);
  th([[256, 1278, 0.03], [312, 1330, 0.5], [364, 1386, 0.8], [398, 1430, 0.9], [420, 1486, 0.5], [426, 1546, 0.03]], 2.6, 0.55, 0.3); th([[296, 1352, 0.03], [346, 1398, 0.6], [388, 1436, 0.9], [402, 1482, 0.6], [402, 1540, 0.03]], 2.2, 0.5, 0.3); th([[392, 1420, 0.7], [416, 1462, 0.8], [442, 1528, 0.4], [450, 1578, 0.03]], 2.2, 0.55, 0.3);
}
/** Ink and water thrown behind her: one great blot that leaves her face on clean paper, dry strokes pulled down out of it, drops. */
function drawSplash({ page: p }: Pens) {
  const lo = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  type Bloom = Parameters<typeof inkBloom>[3];
  const blot = (plate: string, nodes: [number, number, number][], tone: Bloom["tone"], o: Partial<Bloom>, seed: number) => inkBloom(p, plate, inkBlob(p, nodes), { tone, soft: 30, wander: 22, wave: 120, fringe: 1.8, tooth: 2.6, rim: 0.35, rimWidth: 6, mottle: 0.55, cloud: 120, seed, ...o });
  const wet = (x: number, y: number) => 0.25 + 1.3 * ss(0.22, 0.74, inkFbm2(33, x / 190, y / 230, 4));
  // behind her nape and shoulder, so that the white of both stands out; then down and away from her
  blot(K, [[420, 520, 50], [380, 620, 90], [330, 730, 110], [250, 830, 130], [170, 930, 120], [130, 1050, 80]], lo((x, y) => 0.2 * wet(x, y) * lerp(0.75, 1, ss(560, 760, y))), { soft: 40, wander: 56, wave: 190 }, 42);
  blot(B, [[360, 640, 70], [270, 780, 100], [190, 1000, 90]], lo((x, y) => 0.26 * wet(x + 300, y)), { soft: 46, wander: 50, wave: 160 }, 41);
  blot(K, [[310, 780, 34], [250, 840, 62], [180, 890, 60], [150, 970, 54], [108, 1010, 34]], lo((x, y) => 0.36 * wet(x, y + 200)), { soft: lo((x, y) => lerp(3, 40, ss(-60, 60, x - 170 - 90 * inkFbm2(34, y / 46, x / 60, 3) + (y - 900) * 0.4))), wander: 46, wave: 74, fringe: 3, rim: 0.4, rimWidth: 10 }, 43);
  blot(K, [[176, 1010, 10], [150, 1060, 26], [128, 1100, 16]], lo((x, y) => 0.3 * wet(x + 60, y)), { soft: 8, wander: 24, wave: 40, fringe: 3 }, 58);
  blot(K, [[404, 640, 24], [384, 700, 44], [360, 780, 40]], lo((x, y) => 0.14 * wet(x + 80, y)), { soft: 26, wander: 26, wave: 70 }, 44);
  blot(K, [[60, 1090, 10], [96, 1104, 22], [140, 1096, 18]], lo(() => 0.26), { soft: lo((_x, y) => lerp(20, 1.6, ss(1088, 1114, y))), wander: 12, wave: 50, rim: 0.5 }, 55);
  const pull = (q: N3[], w: number, tip: number, seed: number) => inkSide(p, K, q, w, { tip, belly: tip * 0.4, side: 1, head: 0.1, rim: 0.1, dry: 0.75, dryEnd: 1, bristles: w * 0.7, grain: 1.2, seed });
  pull([[120, 880, 0.3], [108, 970, 0.9], [112, 1060, 0.8], [102, 1180, 0.2]], 54, 0.62, 45); pull([[186, 960, 0.3], [174, 1040, 0.9], [180, 1110, 0.7], [166, 1210, 0.1]], 34, 0.5, 46); pull([[82, 800, 0.2], [72, 880, 0.8], [78, 960, 0.2]], 24, 0.5, 47); pull([[308, 560, 0.2], [290, 620, 0.7], [286, 700, 0.1]], 26, 0.3, 56);
  inkSplatter(p, K, { x: 96, y: 1200, spread: [50, 70], n: 14, radius: [0.8, 6], seed: 48 });
  inkSplatter(p, K, { x: 250, y: 560, spread: [80, 70], n: 11, radius: [0.7, 4], seed: 49 });
  inkSplatter(p, B, { x: 210, y: 640, spread: [80, 60], n: 7, radius: [0.8, 4.4], seed: 50 });
}
/** A few petals on the air. */
function drawPetals({ page: p }: Pens) {
  for (const [x, y, r, a, seed] of [[892, 1180, 9, 0.6, 51], [1010, 1250, 7, 2.2, 52], [148, 1242, 8, 1.2, 53], [960, 1420, 6, -0.4, 54]] as const) inkBloom(p, R, p.shape([[-1, 0], [-0.4, -0.5], [0.4, -0.56], [1, -0.1], [0.86, 0.3], [0.2, 0.42], [-0.6, 0.3]].map(([u, v]) => [x + r * (u * Math.cos(a) - v * Math.sin(a)), y + r * (u * Math.sin(a) + v * Math.cos(a))] as const)), { tone: 0.62, soft: 0.9, wander: 0.6, wave: 8, fringe: 0.5, rim: 0.4, rimWidth: 3, mottle: 0.5, cloud: 10, seed });
}
// ---- plum blossom ------------------------------------------------------------------------------------------------------------------
interface BlossomOptions { turn?: number; squash?: number; lean?: number; line?: number; blush?: number; seed: number }
/** A white plum blossom: five paper petals that lap over one another, each drawn with two touches that do not meet, and a red heart. `squash` 1 faces the viewer. */
function blossom(p: InkRisoPen, x: number, y: number, r: number, { turn = 0, squash = 1, lean = 0, line = 0.86, blush = 0.12, seed }: BlossomOptions) {
  const rnd = dice(seed), cl = Math.cos(lean), sl = Math.sin(lean);
  const at = (u: number, v: number): P2 => { const a = u * cl + v * sl, b = (v * cl - u * sl) * squash; return [x + r * (a * cl - b * sl), y + r * (a * sl + b * cl)]; };
  let s = seed * 31;
  p.knock(p.shape(Array.from({ length: 10 }, (_, i) => at(0.2 * Math.cos(i * 0.628), 0.2 * Math.sin(i * 0.628)))));
  const petals = [0, 2, 4, 1, 3].map(i => { const a = turn + i * 1.2566 + 0.4 * (rnd() - 0.5), len = 0.8 + 0.34 * rnd(), w = 0.8 + 0.4 * rnd(), n = 0.02 + 0.1 * rnd(), c = Math.cos(a), k = Math.sin(a); return { side: rnd(), grey: rnd() ** 2, q: (d: number, e: number): P2 => at(len * d * c - w * e * k, len * d * k + w * e * c), n, a }; });
  for (const { q, n, side, grey, a: dir } of petals) {
    const left: [number, number][] = [[0.36, -0.27], [0.6, -0.43], [0.84, -0.41], [0.99, -0.22], [1 - n, 0]], right: [number, number][] = [[1.02, 0.19], [0.88, 0.4], [0.62, 0.44], [0.36, 0.27]], shape = p.shape([q(0.06, 0), ...left.map(v => q(...v)), ...right.map(v => q(...v))]);
    p.knock(shape);
    inkBloom(p, R, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); return blush * Math.exp(-((Math.hypot(a - x, b - y) / (0.5 * r)) ** 2)); }, soft: 0.8, wander: 0, fringe: 0, rim: 0.2, rimWidth: 2, mottle: 0.4, cloud: 12, seed: s++ });
    if (blush) inkBloom(p, K, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); const u = (a - x) / r, v = (b - y) / r; return 0.06 * Math.exp(-((Math.hypot(u, v) / 0.62) ** 2)) + 0.2 * grey * ss(0.1, 0.5, v * Math.cos(dir) - u * Math.sin(dir)); }, soft: 0.8, wander: 0, fringe: 0, rim: 0.4, rimWidth: 2, mottle: 0.5, cloud: 12, seed: s++ });
    if (line) {
      const touch = (v: readonly (readonly [number, number])[], w: number) => inkThread(p, K, v.map((m, i) => [...q(m[0], m[1]), [0.2, 0.8, 1, 0.8, 0.3, 0.04][Math.min(5, i)]] as const), w * (r / 36), { ink: line, inkEnd: line * 0.5, seed: s++ });
      touch(left, lerp(1.1, 2.1, side)); if (grey < 0.72) touch([[1 - n, 0.03] as const, ...right], lerp(2, 1, side));
    }
  }
  // the heart: a wet touch, and stamens no two as long
  const n = 10 + Math.round(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * 6.283 + 0.3 * (rnd() - 0.5), l = 0.3 + 0.28 * rnd(), c = Math.cos(a), k = Math.sin(a), e = at(l * c, l * k);
    inkThread(p, R, [[...at(0.06 * c, 0.06 * k), 0.8], [...at(0.6 * l * c - 0.03 * k, 0.6 * l * k + 0.03 * c), 0.7], [...e, 0.5]], 0.9 * (r / 36), { ink: 0.9, inkEnd: 0.8, seed: s++ });
    p.wash(rnd() < 0.3 ? K : R, p.disc(e[0], e[1], (0.02 + 0.02 * rnd()) * r), { tone: 0.95 }, true);
  }
  const heart = at(0.02, 0.02);
  inkBloom(p, R, inkBlob(p, [[heart[0] - 0.03 * r, heart[1], 0.09 * r], [heart[0] + 0.05 * r, heart[1] - 0.02 * r, 0.075 * r]]), { tone: 0.9, soft: 0.8, wander: 0.8, wave: 5, fringe: 0.4, rim: 0.3, rimWidth: 2, mottle: 0.4, cloud: 6, seed: s++ });
}
/** A bud on its stalk: a drop of cinnabar or of paper, held by two dark touches. */
function bud(p: InkRisoPen, x: number, y: number, r: number, angle: number, o: { red?: number; seed: number; white?: boolean }) {
  const c = Math.cos(angle), k = Math.sin(angle), q = (d: number, e: number): P2 => [x + r * (d * c - e * k), y + r * (d * k + e * c)], shape = p.shape([q(-0.8, 0), q(-0.4, -0.62), q(0.3, -0.74), q(0.9, -0.36), q(1.06, 0.05), q(0.84, 0.44), q(0.24, 0.76), q(-0.46, 0.6)]);
  p.knock(shape);
  if (!o.white) inkBloom(p, R, shape, { tone: o.red ?? 0.7, soft: 0.8, wander: 0.5, wave: 6, fringe: 0.4, rim: 0.4, rimWidth: 3, mottle: 0.5, cloud: 8, seed: o.seed });
  else { inkBloom(p, R, shape, { tone: 0.14, soft: 1, wander: 0.4, wave: 6, rim: 0.4, rimWidth: 2, mottle: 0.5, cloud: 8, seed: o.seed }); inkThread(p, K, [[...q(-0.5, -0.6), 0.5], [...q(0.3, -0.76), 1], [...q(0.95, -0.34), 0.6], [...q(1.06, 0.06), 0.1]], 1.6, { ink: 0.7, seed: o.seed + 1 }); }
  for (const e of [-1, 1]) inkThread(p, K, [[...q(-1.05, 0), 1], [...q(-0.6, 0.5 * e), 0.9], [...q(-0.1, 0.66 * e), 0.1]], 0.3 * r, { ink: 0.95, seed: o.seed + 2 + e });
}
/** Paper along a stroke, as cover and not as wiped ink, so that it also stands before ink that lies on a layer further back. */
function ground(p: InkRisoPen, q: readonly N3[], width: number) {
  const w = (t: number) => { const x = t * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x)); return 0.5 * width * lerp(q[i][2] ?? 1, q[i + 1][2] ?? 1, x - i); }, line = q.map(v => [v[0], v[1]] as const);
  p.knock(p.shape([...aside(line, w), ...[...aside(line, t => -w(t))].reverse()]));
}
/** The spray in her hair, over the place where the loops are gathered. */
function drawSpray(p: InkRisoPen) {
  const on = (q: readonly (readonly [number, number, number])[]): N3[] => q.map(([x, y, k]) => [...onPage(x, y), k] as const);
  const twig = (q: readonly (readonly [number, number, number])[], w: number, seed: number) => { const n = on(q); ground(p, n.map(v => [v[0], v[1] + 1.2, v[2]] as const), w * 1.5); inkThread(p, K, n, w * 0.62, { ink: 0.86, seed }); };
  twig([[1.28, -2.06, 0.5], [1.5, -1.8, 0.9], [1.76, -1.56, 1], [1.96, -1.24, 0.9], [2.06, -1.02, 0.7], [2.06, -0.86, 0.1]], 7, 1200);
  twig([[2.02, -1.14, 0.9], [2.32, -1.04, 0.7], [2.58, -1.12, 0.6], [2.76, -1.3, 0.1]], 6, 1201);
  const at = (x: number, y: number) => onPage(x, y);
  const b = (x: number, y: number, r: number, o: BlossomOptions) => { const q = at(x, y); blossom(p, q[0], q[1], r, o); }, d = (x: number, y: number, r: number, a: number, o: Parameters<typeof bud>[5]) => { const q = at(x, y); bud(p, q[0], q[1], r, a, o); };
  d(2.06, -0.81, 9, 1.6, { red: 0.75, seed: 1210 }); d(2.8, -1.35, 10, 3.9, { red: 0.8, seed: 1215 }); d(2.56, -1.0, 8, 2.4, { red: 0.6, seed: 1220 });
  b(2.02, -1.16, 30, { turn: 0.5, squash: 0.66, lean: 0.7, line: 0.4, seed: 1230 });
  b(1.36, -1.96, 33, { turn: 0.2, squash: 0.74, lean: -0.5, line: 0.4, seed: 1240 });
  b(1.7, -1.56, 46, { turn: -0.3, squash: 0.94, lean: 0.2, line: 0.4, seed: 1250 });
}
/** The branch she looks toward: an old limb that turns in angles, dragged with a drying brush, straight young shoots off its outer sides, a few blossoms. */
function drawBranch(p: InkRisoPen) {
  let s = 1300;
  const wood = (q: N3[], w: number, o: Partial<Parameters<typeof inkSide>[4]> = {}) => inkSide(p, K, q, w, { tip: 0.95, belly: 0.5, side: 1, head: 0.24, rim: 0.1, dry: 0.3, dryEnd: 0.9, bristles: w * 0.5, grain: 1.5, seed: s++, ...o });
  const shoot = (q: N3[], w: number, o: Partial<Parameters<InkRisoPen["line"]>[3]> = {}) => p.line(K, q, w, { rough: 0.3, slant: 0.2, dryEnd: 0.25, seed: s++, ...o });
  const dab = (x: number, y: number, r: number, a: number, tone = 0.95) => inkBloom(p, K, inkBlob(p, [[x - Math.cos(a) * r * 0.7, y - Math.sin(a) * r * 0.7, r * 0.8], [x, y, r], [x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, r * 0.55]]), { tone, soft: 0.8, wander: r * 0.2, wave: 7, fringe: 0.7, rim: 0.2, mottle: 0.3, cloud: 9, seed: s++ });
  // what stands behind the wood
  shoot([[1090, 1010, 0.8], [1084, 972, 0.6], [1066, 924, 0.5], [1058, 884, 0.45], [1060, 836, 0.4], [1052, 792, 0.05]], 8.4); shoot([[1064, 918, 0.7], [1082, 884, 0.5], [1110, 846, 0.4], [1118, 816, 0.04]], 6, { dryEnd: 0.5 });
  bud(p, 1069, 846, 8, -0.75, { seed: 1341, red: 0.8 }); bud(p, 1048, 858, 7, 3.6, { seed: 1342, red: 0.55 }); bud(p, 1059, 806, 6, -1.0, { seed: 1348, red: 0.9 }); bud(p, 1116, 857, 6.4, -0.1, { seed: 1349, red: 0.5 });
  blossom(p, 1032, 962, 27, { turn: 0.8, squash: 0.55, lean: 0.2, seed: 1390 });
  // ---- the limb: a pale wet body first, then the brush dragged along its lower side, turned hard at every joint
  inkBloom(p, K, p.shape([[1236, 1084], [1190, 1062], [1150, 1048], [1122, 1032], [1104, 1004], [1078, 996], [1046, 986], [1014, 984], [994, 960], [966, 938], [958, 944], [982, 968], [1000, 1000], [1044, 1006], [1080, 1016], [1098, 1046], [1132, 1066], [1182, 1086], [1236, 1124]]), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.1 + 0.34 * ss(0.4, 0.7, inkFbm2(7, x / 30, y / 18, 3)); }, soft: 2, wander: 5, wave: 22, fringe: 1.4, rim: 0.3, rimWidth: 4, mottle: 0.6, cloud: 20, seed: s++ });
  wood([[1236, 1112, 1], [1190, 1078, 0.8], [1154, 1064, 0.75], [1124, 1048, 1], [1104, 1026, 0.5]], 34); wood([[1122, 1052, 0.6], [1098, 1030, 1], [1086, 1008, 0.8], [1052, 996, 0.6], [1022, 996, 0.9], [1004, 984, 0.4]], 23, { dryEnd: 0.8 }); wood([[1018, 1002, 0.5], [1000, 984, 1], [984, 958, 0.7], [958, 936, 0.6]], 17); wood([[966, 946, 0.8], [940, 930, 0.6], [912, 926, 0.8], [890, 904, 0.5], [872, 872, 0.1]], 11.5, { dry: 0.15, dryEnd: 0.7 });
  // the brush nearly empty along the light side, and the bark's short touches
  for (const [q, w] of [[[[1216, 1086, 0.2], [1166, 1058, 0.8], [1132, 1042, 0.3]], 8], [[[1094, 1004, 0.2], [1052, 988, 0.8], [1018, 986, 0.2]], 5]] as const) shoot(q as unknown as N3[], w, { rough: 0.8, dryEnd: 1, opacity: 0.8 } as never);
  for (const [x, y, r, a, t] of [[1200, 1094, 5, 0.9, 0.9], [1186, 1084, 3, 0.8, 0.7], [1160, 1066, 4.4, 1, 0.95], [1128, 1050, 8, 0.9, 0.95], [1114, 1036, 4, 1.3, 0.8], [1096, 1018, 6, 1.1, 0.95], [1060, 1000, 3, 0.7, 0.7], [1020, 994, 6, 0.9, 0.95], [1008, 984, 3.4, 1.2, 0.8], [980, 952, 5, 0.9, 0.95], [940, 930, 2.8, 0.4, 0.8], [908, 924, 4.4, 1, 0.95], [1172, 1050, 3.6, -0.6, 0.9], [1162, 1046, 2.4, -0.7, 0.8], [1180, 1056, 2, -0.4, 0.7], [1070, 988, 2.6, -0.5, 0.8], [1062, 985, 1.8, -0.5, 0.7]] as const) dab(x, y, r, a, t);
  // ---- shoots before it
  shoot([[1020, 990, 1], [1000, 1008, 0.7], [962, 1018, 0.6], [938, 1044, 0.5], [904, 1070, 0.35], [882, 1096, 0.04]], 8.6); shoot([[964, 1016, 0.8], [936, 1012, 0.5], [906, 998, 0.35], [890, 982, 0.04]], 5, { dryEnd: 0.5 });
  shoot([[980, 950, 1], [972, 918, 0.6], [954, 884, 0.5], [944, 850, 0.3], [930, 812, 0.2], [930, 778, 0.04]], 7.4); shoot([[908, 924, 1], [880, 926, 0.6], [852, 934, 0.5], [828, 930, 0.3], [800, 936, 0.04]], 6, { dryEnd: 0.5 });
  shoot([[1150, 1062, 0.9], [1140, 1096, 0.5], [1118, 1122, 0.35], [1112, 1146, 0.03]], 6, { dryEnd: 0.6 });
  bud(p, 838, 922, 8.5, -2.0, { seed: 1343 }); bud(p, 818, 941, 7, 2.4, { seed: 1351, red: 0.5 }); bud(p, 892, 1069, 8, 3.5, { seed: 1344, red: 0.6 }); bud(p, 907, 1080, 6.4, 1.2, { seed: 1352, red: 0.9 }); bud(p, 910, 991, 7, -1.9, { seed: 1345, red: 0.5 }); bud(p, 926, 823, 7, 3.6, { seed: 1353, red: 0.85 }); bud(p, 937, 800, 5.6, -0.6, { seed: 1354, red: 0.5 }); bud(p, 1126, 1128, 7, 0.9, { seed: 1347, red: 0.6 });
  blossom(p, 952, 862, 31, { turn: 1.1, squash: 0.72, lean: -0.5, seed: 1360 });
  blossom(p, 932, 1046, 28, { turn: 0.1, squash: 0.6, lean: 0.5, seed: 1370 });
  blossom(p, 872, 872, 41, { turn: -0.2, squash: 0.9, lean: 0.6, seed: 1380 });
  blossom(p, 1088, 988, 24, { turn: 2.2, squash: 0.8, lean: 1.2, seed: 1350 });
}

// ---- ornaments ---------------------------------------------------------------------------------------------------------------------
function bead(p: InkRisoPen, x: number, y: number, rx: number, ry: number, o: { plate?: string; tone?: number; seed: number }) {
  const shape = p.shape(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return [x + Math.sin(a) * rx * (1 - 0.18 * Math.cos(a) * (ry > rx ? 1 : 0)), y - Math.cos(a) * ry] as const; }));
  p.knock(shape);
  if (o.plate) { inkBloom(p, o.plate, shape, { tone: o.tone ?? 0.8, soft: 0.8, wander: 0.3, wave: 5, fringe: 0.2, rim: 0.4, rimWidth: 2.4, mottle: 0.4, cloud: 8, seed: o.seed }); if (o.plate !== K) p.lift([[x - rx * 0.4, y - ry * 0.3, 0.2], [x - rx * 0.36, y, 1], [x - rx * 0.3, y + ry * 0.22, 0.2]], rx * 0.36, [o.plate]); }
  else { inkBloom(p, K, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); return 0.2 * ss(0.2, 1, (a - x) / rx + (b - y) / ry); }, soft: 0.8, wander: 0, fringe: 0, rim: 0, mottle: 0.3, cloud: 8, seed: o.seed }); inkThread(p, K, [[x - rx * 0.3, y - ry * 0.95, 0.5], [x + rx * 0.62, y - ry * 0.8, 0.8], [x + rx, y + ry * 0.1, 1], [x + rx * 0.5, y + ry * 0.88, 1], [x - rx * 0.5, y + ry * 0.88, 0.8], [x - rx, y, 0.5], [x - rx * 0.66, y - ry * 0.72, 0.1]], 1.6, { ink: 0.9, inkEnd: 0.6, seed: o.seed }); }
}
const HOOK: P2 = onPage(2.44, -0.84);
/** 步搖: the pin behind the blossoms, and the chain that swings from its head. */
function drawPin(p: InkRisoPen) {
  const [x, y] = HOOK, q = (u: number, v: number, k: number): N3 => [x + u, y + v, k], shaft: N3[] = [q(62, -38, 1), q(44, -27, 1), q(26, -15, 0.9), q(11, -6, 0.8)];
  ground(p, shaft, 9.6); inkThread(p, K, shaft, 5.6, { ink: 0.97, inkEnd: 0.95, seed: 1400 });
  bead(p, x + 11, y + 1.6, 3, 6.4, { plate: K, tone: 0.97, seed: 1405 }); bead(p, x, y - 1, 9.4, 8.8, { seed: 1403 }); bead(p, x - 12, y - 3, 4.4, 4.4, { plate: R, tone: 0.95, seed: 1404 });
}
function drawChain(p: InkRisoPen) {
  const [x, y] = HOOK;
  inkThread(p, K, [[x, y - 2, 0.6], [x + 0.6, y + 60, 0.7], [x, y + 122, 0.6], [x - 0.4, y + 184, 0.5]], 1.3, { ink: 0.8, inkEnd: 0.7, seed: 1410 });
  for (const [i, [d, r]] of ([[14, 2.2], [25, 2.6], [37, 2.2], [74, 2.4], [86, 2.1], [99, 2.5], [142, 2.2], [153, 2]] as const).entries()) bead(p, x + (i % 2 ? 0.5 : -0.3), y + d, r, r, { plate: K, tone: 0.95, seed: 1420 + i });
  bead(p, x, y + 55, 6.4, 6.8, { seed: 1430 }); bead(p, x + 0.2, y + 121, 6, 9.5, { plate: B, tone: 0.8, seed: 1431 }); bead(p, x - 0.2, y + 170, 4, 4.4, { seed: 1432 }); bead(p, x - 0.3, y + 190, 4.4, 8, { plate: R, tone: 0.95, seed: 1433 });
}
/** Where the earring hangs: a little above the foot of the lobe. */
const LOBE: P2 = (q => onPage(q[0], q[1] - 0.05))(HEAD.ear.map(q => HEAD.fromLevel(q)).reduce((a, q) => (q[1] > a[1] ? q : a)));
function drawEarring(p: InkRisoPen) {
  const [x, y] = LOBE;
  inkThread(p, K, [[x - 1, y - 6, 0.6], [x - 3.4, y + 1, 1], [x - 0.6, y + 7, 0.8], [x + 2, y + 2, 0.2]], 1.6, { ink: 0.9, seed: 1440 });
  inkThread(p, K, [[x - 0.4, y + 7, 0.7], [x, y + 30, 0.6], [x, y + 54, 0.5]], 1.4, { ink: 0.85, seed: 1441 });
  bead(p, x - 0.3, y + 14, 3, 3, { plate: K, tone: 0.95, seed: 1442 }); bead(p, x, y + 29, 5.6, 8.6, { plate: B, tone: 0.82, seed: 1443 }); bead(p, x, y + 44, 2.6, 2.6, { plate: K, tone: 0.95, seed: 1444 }); bead(p, x, y + 58, 4, 7, { plate: R, tone: 0.95, seed: 1445 });
}
/** Strands let go: a curtain of two before the near ear, one fine pair over the brow, a lock past the far cheek, wisps at the nape. */
function drawStrands(f: InkRisoPen) {
  const { sweep, hair } = comb(f, 800);
  // the curtain: from the part across the temple to the cheek
  sweep([[0.08, -1.24, 0.001], [0.14, -1.12, 0.008], [0.24, -0.94, 0.026], [0.4, -0.7, 0.041], [0.61, -0.46, 0.045], [0.82, -0.24, 0.043], [0.98, -0.02, 0.04], [1.08, 0.22, 0.037], [1.125, 0.48, 0.034], [1.125, 0.76, 0.03], [1.1, 1.02, 0.025], [1.085, 1.28, 0.019], [1.1, 1.52, 0.012], [1.15, 1.72, 0.005], [1.2, 1.84, 0]], { seed: 811, root: 0.02, tip: 0.2, hairs: 5, stray: 1.7, streak: 0.24 });
  sweep([[0.02, -1.14, 0.003], [0.2, -0.82, 0.012], [0.42, -0.54, 0.015], [0.59, -0.32, 0.013], [0.74, -0.1, 0.011], [0.84, 0.12, 0.009], [0.89, 0.34, 0.006], [0.9, 0.52, 0.003], [0.88, 0.66, 0]], { seed: 812, root: 0.02, tip: 0.24, hairs: 1, stray: 1.6 });
  sweep([[-0.39, -1.24, 0.001], [-0.43, -1.12, 0.008], [-0.51, -0.95, 0.028], [-0.625, -0.73, 0.048], [-0.75, -0.48, 0.06], [-0.865, -0.2, 0.058], [-0.935, 0.08, 0.053], [-0.965, 0.38, 0.047], [-0.96, 0.68, 0.04], [-0.945, 0.96, 0.031], [-0.95, 1.22, 0.022], [-1, 1.46, 0.013], [-1.08, 1.66, 0.006], [-1.15, 1.78, 0]], { seed: 813, root: 0.02, tip: 0.18, hairs: 5, stray: 1.6, streak: 0.24 });
  sweep([[-1.02, -0.44, 0.01], [-1.07, -0.14, 0.022], [-1.08, 0.18, 0.024], [-1.06, 0.5, 0.021], [-1.04, 0.8, 0.016], [-1.07, 1.1, 0.011], [-1.16, 1.36, 0.005], [-1.24, 1.5, 0]], { seed: 814, root: 0.1, tip: 0.24, hairs: 2, stray: 1.6 });
  for (const [q, w, ink, seed] of [
    [[[0.06, -1.1, 0.1], [0.2, -0.86, 0.8], [0.32, -0.6, 0.9], [0.44, -0.38, 0.7], [0.54, -0.22, 0.4], [0.6, -0.1, 0]], 1.4, 0.74, 819],
    [[[0.86, -0.28, 0.1], [0.98, -0.06, 0.8], [1.04, 0.2, 0.9], [1.03, 0.46, 0.7], [0.98, 0.68, 0.4], [0.93, 0.82, 0]], 1.5, 0.72, 820],
    [[[1.06, -0.1, 0.1], [1.17, 0.14, 0.8], [1.205, 0.42, 0.9], [1.19, 0.72, 0.8], [1.17, 1.04, 0.6], [1.2, 1.34, 0.3], [1.28, 1.54, 0]], 1.6, 0.76, 821],
    [[[-1.06, -0.5, 0.1], [-1.14, -0.14, 0.8], [-1.16, 0.22, 0.9], [-1.12, 0.56, 0.8], [-1.07, 0.88, 0.6], [-1.1, 1.18, 0.3], [-1.2, 1.4, 0]], 1.7, 0.76, 822],
    [[[-0.92, -0.2, 0.1], [-0.95, 0.12, 0.7], [-0.95, 0.44, 0.8], [-0.91, 0.74, 0.5], [-0.86, 0.98, 0]], 1.4, 0.7, 823],
    // the fine hair before the ear
    [[[1.2, -0.08, 0.1], [1.32, 0.1, 0.8], [1.365, 0.26, 0.6], [1.36, 0.42, 0.3], [1.335, 0.52, 0]], 1.4, 0.6, 827],
    [[[1.12, -0.1, 0.1], [1.25, 0.11, 0.7], [1.29, 0.28, 0.5], [1.28, 0.42, 0]], 1.3, 0.52, 828],
    [[[1.28, -0.08, 0.1], [1.385, 0.09, 0.6], [1.41, 0.22, 0.4], [1.4, 0.32, 0]], 1.2, 0.5, 829],
    [[[1.54, 0.6, 0.2], [1.49, 0.8, 0.8], [1.48, 1.0, 0.7], [1.54, 1.2, 0.3], [1.61, 1.3, 0]], 1.5, 0.7, 824],
  ] as const) hair(q, w, ink, seed);
}
/** 墨梅, and a seal. */
function drawInscription({ page: p }: Pens) {
  const glyph = (x: number, y: number, z: number, strokes: N3[][], w: number) => { for (const st of strokes) p.line(K, st.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2]] as const), w, { rough: 0.4, slant: 0.3, dryEnd: 0.35 }); };
  glyph(1012, 176, 80, [
    [[27, 8, 0.7], [29, 20, 0.8], [31, 36, 0.5]], [[27, 10, 0.5], [50, 7, 0.6], [72, 5, 1], [72, 18, 0.8], [68, 34, 0.6]], [[40, 14, 0.9], [44, 22, 0.3]], [[61, 12, 0.9], [56, 21, 0.2]], [[31, 34, 0.4], [50, 33, 0.6], [69, 32, 0.6]],
    [[50, 8, 0.7], [51, 30, 0.8], [50, 58, 0.7]], [[25, 46, 0.5], [50, 45, 0.6], [76, 42, 0.8]], [[10, 60, 0.8], [40, 58, 0.6], [70, 56, 0.7], [91, 56, 1]],
    [[21, 66, 0.4], [17, 72, 0.9], [13, 77, 0.6]], [[38, 67, 0.5], [41, 75, 1]], [[57, 66, 0.5], [61, 74, 1]], [[76, 64, 0.5], [82, 69, 0.9], [88, 75, 0.8]],
    [[31, 88, 0.6], [50, 86, 0.6], [70, 84, 0.9]], [[50, 76, 0.8], [51, 90, 0.9], [50, 104, 0.8]], [[8, 108, 0.9], [38, 105, 0.6], [68, 103, 0.7], [94, 104, 1]],
  ], 8.4);
  glyph(1014, 284, 78, [
    [[3, 36, 0.7], [22, 33, 0.6], [39, 29, 0.9]], [[22, 4, 0.8], [23, 30, 0.8], [22, 66, 0.8], [23, 98, 0.9]], [[22, 36, 0.7], [15, 54, 0.6], [3, 71, 0.05]], [[26, 44, 0.4], [36, 54, 0.9]],
    [[60, 2, 0.8], [55, 14, 0.7], [44, 30, 0.05]], [[55, 18, 0.5], [74, 15, 0.6], [93, 13, 0.9]],
    [[58, 32, 0.7], [54, 54, 0.7], [49, 79, 0.8], [68, 78, 0.5], [92, 76, 0.7]], [[59, 33, 0.5], [74, 31, 0.6], [89, 30, 0.9], [87, 60, 0.8], [83, 90, 0.9], [77, 97, 0.7], [69, 90, 0.05]], [[67, 39, 0.5], [72, 47, 0.9]], [[64, 60, 0.5], [69, 69, 0.9]], [[41, 57, 0.7], [70, 54, 0.6], [99, 53, 0.9]],
  ], 8);
  // ---- seal: 玉, cut white into red
  const [x, y, z] = [1034, 394, 40];
  inkBloom(p, R, p.shape([[x, y + 1], [x + z * 0.5, y], [x + z, y + 1], [x + z - 0.5, y + z * 0.5], [x + z, y + z], [x + z * 0.5, y + z - 0.5], [x, y + z], [x + 0.6, y + z * 0.5]]), { tone: 0.95, soft: 0.5, wander: 0.8, wave: 14, fringe: 0.4, rim: 0.2, mottle: 0.3, cloud: 14, seed: 901 });
  const cut = (pts: N3[], w: number) => p.lift(pts.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2] ?? 1] as const), w, [R]);
  cut([[24, 22, 0.8], [50, 21, 1], [77, 23, 0.8]], 4); cut([[28, 48, 0.8], [50, 47, 1], [72, 48, 0.8]], 4); cut([[17, 78, 0.8], [50, 77, 1], [84, 79, 0.9]], 4); cut([[50, 21, 0.9], [51, 50, 1], [50, 78, 0.9]], 4); cut([[63, 60, 0.7], [72, 67, 1]], 4);
}
// ---- the figure in layers ---------------------------------------------------------------------------------------------------------
const LIDS: Readonly<Record<string, number>> = { open: 1, half: 0.5, shut: 0.04 };
const pens = (c: InkPaintContext): Pens => { const p = c.pens(FRAMES); return { ...p, face: mirror(p.face) }; };
const paint = (draw: (p: Pens) => void) => (c: InkPaintContext) => draw(pens(c));
const BREATH = { kind: "breathe", at: [520, 1500], amount: 0.0045, seconds: 5 } as const;
export interface InkMomeiOptions {
  /** The ink thrown behind her, the plum branch with its loose petals, and the name with its seal (default: all). */
  wash?: boolean; branch?: boolean; name?: boolean;
  /** How far the scarf, the branch, loose hair and the hanging beads move (default 1). */
  wind?: number;
}
/** 墨梅 in layers. She breathes and blinks slowly; the beads of her hairpin and earring swing, the scarf, the branch and her loose hair move in a light wind. */
export function inkMomei({ wash = true, branch = true, name = true, wind = 1 }: InkMomeiOptions = {}): InkSubject {
  const shown: Readonly<Record<string, boolean>> = { wash, branch, petals: branch, name };
  const parts: InkPart[] = [
    { id: "wash", draw: paint(drawSplash), depth: -0.25 },
    { id: "branch", draw: c => drawBranch(pens(c).page), depth: 0.12, motion: [{ kind: "sway", from: [1236, 1104], to: [862, 872], amount: 6 * wind, seconds: 7.2, lag: 0.16, power: 1.5, lean: 0.1 }] },
    { id: "petals", draw: paint(drawPetals), depth: 0.2, motion: [{ kind: "drift", by: [-16 * wind, 22 * wind], back: 8 }] },
    { id: "under", only: "film", group: "head", draw: c => { const f = pens(c).face; inkCover(c.page, c.page.shape(COVER)); for (const q of Object.values(LOOPS)) inkCover(f, inkBlob(f, lock(q))); } },
    { id: "scarf-end", draw: paint(drawScarfEnd), motion: [{ kind: "sway", from: [740, 1264], to: [1034, 1562], amount: 16 * wind, seconds: 6, lag: 0.34, power: 1.6, lean: 0.25 }] },
    { id: "body", draw: c => { paint(drawBody)(c); inkFade(c.page, [0, 1440, PAGE.width, 160], (_, y) => 1 - ss(1480, 1592, y), { coverOnly: true }); }, motion: [BREATH] },
    { id: "scarf", draw: paint(drawScarf), motion: [BREATH, { kind: "sway", from: [392, 1430], to: [418, 1620], amount: 5 * wind, seconds: 6, lag: 0.3, power: 1.8, lean: 0.2, phase: 1.1 }] },
    { id: "face", group: "head", poses: { kind: "blink", open: "open", order: ["half", "shut"], every: 5.2, seconds: 0.36 }, draw: c => { const f = pens(c).face, open = LIDS[c.pose] ?? 1; drawFace(f, c.pose === "open" ? HEAD : pose(open)); } },
    { id: "hair", group: "head", draw: paint(p => drawSides(p.face)) },
    { id: "chignon", group: "head", draw: paint(p => { drawLoops(p.face); drawPin(p.page); }) },
    { id: "flowers", group: "head", draw: paint(p => drawSpray(p.page)) },
    { id: "pin", group: "head", draw: paint(p => drawChain(p.page)), motion: [{ kind: "turn", at: HOOK, degrees: 2.6 * wind, seconds: 3.4 }] },
    { id: "tress", group: "head", draw: paint(p => drawTress(p.face)), motion: [{ kind: "sway", from: onPage(1.64, 1), to: onPage(1.36, 4.64), amount: 9 * wind, seconds: 6.2, lag: 0.26, power: 2, lean: 0.3, phase: 1.3 }] },
    { id: "strands", group: "head", draw: paint(p => drawStrands(p.face)), motion: [{ kind: "sway", from: onPage(0.4, -0.6), to: onPage(0.5, 1.2), amount: 6 * wind, seconds: 5.4, lag: 0.3, power: 1.8, lean: 0.3, phase: 2.2 }] },
    { id: "earring", group: "head", draw: paint(p => drawEarring(p.page)), motion: [{ kind: "turn", at: LOBE, degrees: 2.4 * wind, seconds: 2.9, phase: 0.7 }] },
    { id: "name", draw: paint(drawInscription) },
  ];
  return { id: "momei", label: "Half figure of a girl turned to the right beside a branch of plum blossom: her hair parted in the middle and drawn up into three hollow loops with white blossom and a hanging chain of beads, one long tress tied with a red cord over her shoulder, a white robe with a broad dark collar, a thin blue scarf", page: PAGE, plates: PLATES, paper: "#F8F1E3", seed: 23, groups: { head: [{ kind: "turn", at: [520, 900], degrees: 0.42, seconds: 7.4 }, BREATH] }, parts: inkPaintOrder(parts.filter(p => shown[p.id] ?? true), ["under", "hair", "chignon", "face", "flowers", "pin", "strands", "tress", "earring", "body", "scarf", "scarf-end", "wash", "branch", "petals", "name"], ["face"]) };
}
