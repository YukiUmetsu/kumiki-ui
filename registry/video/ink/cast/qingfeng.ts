/**
 * 清風 Qīngfēng, clear wind: an original ink-wash figure on the INK-RISO1 engine, the partner of 水月. A swordsman-scholar of twenty-five.
 * Four spot inks: a skin earth, indigo, cinnabar, ink. `inkQingfeng` is the figure in layers, for a film or a still.
 */
import { inkFbm2, inkSpline } from "../../ink-riso-press";
import type { InkRisoPen, PenNode as N3, PenPoint as P2 } from "../../ink-riso-pen";
import { inkBlob, inkBloom, inkDrops, inkSide, inkThread } from "../../ink-riso-wet";
import { inkFlyaways, inkGap, inkHank } from "../../ink-riso-hair";
import type { InkFlyawayOptions, InkGapShape, InkHankOptions } from "../../ink-riso-hair";
import { inkGuideSheet } from "../../ink-riso-coiffure";
import type { InkSheetForm } from "../../ink-riso-coiffure";
import { poseInkHead } from "../../ink-riso-face";
import type { InkHead, InkProfile } from "../../ink-riso-face";
import { inkDab, paintInkEar, paintInkFace } from "../../ink-riso-face-paint";
import type { InkFaceStyle } from "../../ink-riso-face-paint";
import { beautifulFace } from "../../../anatomy/face-beauty";
import { eyeCentres } from "../../../anatomy/anatomy-face";
import { inkPlates } from "../ink-pigments";
import { inkPaintOrder } from "../ink-cel";
import { inkCover, inkFade } from "../ink-veil";
import type { InkPaintContext, InkPart, InkSubject } from "../ink-cel";

type Pens = Record<"face" | "robe" | "page", InkRisoPen>;
const K = "black", R = "red", T = "indigo", E = "earth", PLATE = [E, R, T];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const PAGE = { width: 1200, height: 1600 };
const PLATES = inkPlates({ [E]: "skin", [T]: "indigo", [R]: "cinnabar", [K]: "ink" });

// ---- the head ---------------------------------------------------------------------------------------------------------------------
/** A young man's brow: it sets in close over the eye and climbs in one straight stroke, full in its middle, to a long point over the temple. */
const BROW: InkProfile = [[0.105, -0.034, 0.5], [0.18, -0.022, 0.96], [0.28, -0.004, 1.14], [0.385, 0.014, 1.1], [0.49, 0.026, 0.88], [0.59, 0.024, 0.54], [0.7, 0.006, 0.02]];
/** The far one is shorter and steeper: its tail is round the corner. */
const FAR_BROW: InkProfile = [[0.12, -0.03, 0.5], [0.185, -0.012, 0.96], [0.26, 0.012, 1.14], [0.335, 0.034, 1.06], [0.4, 0.05, 0.86], [0.45, 0.056, 0.56], [0.5, 0.058, 0.04]];
/** The face's outline: share of its height, far side, near side. A long face: a flat cheek, then one straight line to a narrow chin. */
const OUTLINE: InkProfile = [[-0.33, -0.47, 0.75], [-0.22, -0.445, 0.745], [-0.09, -0.425, 0.74], [0, -0.41, 0.735], [0.09, -0.396, 0.73], [0.18, -0.379, 0.72], [0.27, -0.374, 0.71], [0.36, -0.352, 0.7], [0.44, -0.323, 0.69], [0.53, -0.284, 0.655], [0.62, -0.237, 0.58], [0.7, -0.192, 0.5], [0.77, -0.156, 0.42], [0.84, -0.119, 0.35], [0.905, -0.083, 0.28], [0.945, -0.046, 0.23], [0.975, -0.004, 0.19], [0.992, 0.05, 0.15], [1, 0.1, 0.1]];
const SITTER = beautifulFace({ sex: 1, faceType: "east-asian" });
const pose = (open = 1): InkHead => poseInkHead({ vertices: SITTER.vertices, faces: SITTER.mesh.faces, eyes: eyeCentres(SITTER.vertices), head: { breadth: 154.2, length: 199.2, top: 131.4 } }, { yaw: 25, pitch: 5, roll: 4, scale: 0.78, at: [0, 0] }, {
  open: open * 0.92, gaze: [0, -0.04], forehead: 0.38, eye: [1.44, 1.2], wrap: 0.74, iris: 1.06, eyeRoll: 0, eyeTilt: 4, lids: { tall: 0.95, line: 0.46, lineOut: 0.46, wing: 0.95, fold: 0.6, flick: lerp(1.2, 0.6, open) }, brow: { form: BROW, far: FAR_BROW, height: 0.74, thick: 1, roll: 0 },
  lift: -4, noseUnder: 4.5, noseHeight: 0.85, nose: 0.66, philtrum: 0, mouth: 0.74, lips: 0.72, lean: 6, outline: OUTLINE, length: 1.09, side: { square: 0.9, lobe: [1.46, 0.57], ear: 0.92 },
});
const HEAD = pose();
const FACE_STYLE: InkFaceStyle = { ink: K, warm: R, earth: E, rouge: 0.26, lip: 0.58, lipSoft: 0.65, noseTip: 1, liner: 0.22, lipLine: 1, shade: 0.12, flesh: 1.25, warmLine: 0.42, browWarm: 0.2, underEye: 0.35, lashes: 0, lowerLid: 0.4, fold: 0.7, browHead: 0.6, brow: 0.9, bridge: 1.4, straight: 1, iris: 0.78, underNose: 0.4, bowl: 0.5, smile: 0, jaw: 0.85, contour: 0.75 };
/** The middle between the pupils, pen units, and where it lies on the page; the distance between them on the page. */
const EYES = HEAD.level(0, 0), AT = { x: 592, y: 526, pd: 128 };
const UNIT = Math.hypot(HEAD.level(1, 0)[0] - EYES[0], HEAD.level(1, 0)[1] - EYES[1]), FZ = AT.pd / UNIT;
const FACE = { x: AT.x - FZ * EYES[0], y: AT.y - FZ * EYES[1], scale: FZ };
/** Widths of marks on the page. */
const Z = 1.34;
/** The robe is laid out upright on the page, its zero where the eyes are. */
const FRAMES = { face: FACE, robe: { x: 590, y: 512, scale: Z }, page: { x: 0, y: 0, scale: 1 } };

// ---- hair -------------------------------------------------------------------------------------------------------------------------
// 束髮: the crown's hair is drawn up into a knot with a small crown, the rest hangs. Two locks leave one short part over the forehead and
// frame the face: the near one bows over the temple, back over the ear; the far one lies along the cheek. Places are read in the frame
// portraits are measured in: the irises level, 1 = the distance between them, +x toward the near side.
type Run = readonly P2[];
type Lock = readonly (readonly [number, number, number])[];
const lv = (q: Run): P2[] => q.map(([x, y]) => HEAD.level(x, y));
/** The knot and its crown are laid out upright, then set on the skull, which slopes to the back there. */
const KNOT_AT = { from: [0.6, -1.95], to: [0.74, -2.26], size: 0.86, lean: 0.24 } as const;
const tip = ([x, y]: P2): P2 => { const { from, to, size, lean } = KNOT_AT, c = size * Math.cos(lean), n = size * Math.sin(lean), u = x - from[0], v = y - from[1]; return [to[0] + u * c - v * n, to[1] + u * n + v * c]; };
const lock = (q: Lock) => q.map(([x, y, w]) => [...HEAD.level(x, y), w * UNIT] as const);
const leaf = (t: number) => Math.sin(Math.PI * t) ** 0.8;
/** A lock's width along it: full, then drawn in to a point from `a` on. */
const pointed = (a: number) => (t: number) => 1 - ss(a, 1.02, t);
const guides = (list: readonly (readonly [s: number, path: Run])[]) => inkGuideSheet(HEAD, list.map(([s, path]) => ({ s, path: lv(path) })));
/** Up over the crown to the knot: from the far temple, the head's outline, to the part. */
const CROWN = guides([
  [0, [[-0.98, -0.3], [-1.06, -0.72], [-1.04, -1.14], [-0.92, -1.54], [-0.68, -1.9], [-0.36, -2.16], [0, -2.33], [0.34, -2.4], [0.62, -2.38]]],
  [0.25, [[-0.86, -0.62], [-0.9, -0.98], [-0.84, -1.32], [-0.66, -1.64], [-0.42, -1.92], [-0.1, -2.13], [0.22, -2.26], [0.46, -2.31], [0.64, -2.33]]],
  [0.5, [[-0.64, -1.0], [-0.66, -1.24], [-0.58, -1.52], [-0.4, -1.78], [-0.14, -2.0], [0.14, -2.15], [0.38, -2.24], [0.54, -2.27], [0.67, -2.29]]],
  [0.76, [[-0.4, -1.1], [-0.4, -1.28], [-0.32, -1.52], [-0.13, -1.75], [0.1, -1.95], [0.33, -2.1], [0.5, -2.19], [0.6, -2.23], [0.7, -2.25]]],
  [1, [[-0.16, -1.12], [-0.15, -1.28], [-0.05, -1.5], [0.12, -1.7], [0.32, -1.9], [0.48, -2.05], [0.6, -2.14], [0.67, -2.19], [0.73, -2.21]]],
]);
/** The near side to the knot, from the part round the temple to over the ear; its roots lie under the near lock. */
const SIDE = guides([
  [0, [[-0.1, -1.3], [0, -1.5], [0.16, -1.7], [0.34, -1.88], [0.5, -2.03], [0.63, -2.13], [0.7, -2.2]]],
  [0.25, [[0.06, -1.3], [0.28, -1.46], [0.48, -1.66], [0.64, -1.86], [0.75, -2.02], [0.8, -2.13], [0.8, -2.21]]],
  [0.5, [[0.34, -1.1], [0.66, -1.22], [0.94, -1.42], [1.12, -1.68], [1.14, -1.92], [1.04, -2.09], [0.92, -2.2]]],
  [0.75, [[0.68, -0.8], [1.06, -0.88], [1.4, -1.08], [1.62, -1.4], [1.62, -1.74], [1.42, -2.0], [1.1, -2.17]]],
  [1, [[0.96, -0.46], [1.34, -0.48], [1.74, -0.66], [2, -1.04], [2.04, -1.5], [1.8, -1.88], [1.28, -2.12]]],
]);
/** The back of the head: hair that was not drawn up comes down over the nape. */
const BACK = guides([
  [0, [[1.16, -2.17], [1.6, -2.03], [1.98, -1.72], [2.24, -1.3], [2.38, -0.8], [2.42, -0.26], [2.38, 0.28], [2.34, 0.8], [2.32, 1.3], [2.36, 2.0]]],
  [0.5, [[1.12, -1.95], [1.52, -1.72], [1.86, -1.36], [2.06, -0.92], [2.15, -0.44], [2.14, 0.02], [2.1, 0.46], [2.04, 0.9], [2, 1.4], [2, 2.06]]],
  [1, [[0.98, -1.42], [1.28, -1.1], [1.54, -0.8], [1.74, -0.46], [1.82, -0.12], [1.8, 0.2], [1.7, 0.54], [1.62, 0.92], [1.56, 1.4], [1.52, 2.1]]],
]);
/** The near lock: it leaves the part, stands up off the head, bows over the temple and goes back over the top of the ear. */
const NEAR = guides([
  [0, [[-0.12, -1.68], [0, -1.85], [0.22, -1.94], [0.46, -1.94], [0.7, -1.82], [0.92, -1.6], [1.12, -1.36], [1.32, -1.06], [1.56, -0.8], [1.86, -0.62], [2.12, -0.42], [2.22, -0.1]]],
  [0.36, [[-0.12, -1.66], [0.04, -1.65], [0.24, -1.56], [0.44, -1.4], [0.64, -1.21], [0.84, -1.04], [1.06, -0.9], [1.3, -0.78], [1.56, -0.66], [1.82, -0.5], [2.02, -0.28], [2.12, 0.04]]],
  [0.7, [[-0.12, -1.64], [0.03, -1.58], [0.17, -1.44], [0.31, -1.24], [0.46, -1.02], [0.64, -0.78], [0.86, -0.57], [1.1, -0.43], [1.38, -0.4], [1.68, -0.36], [1.92, -0.2], [2.04, 0.06]]],
  [1, [[-0.12, -1.63], [-0.01, -1.55], [0.11, -1.4], [0.22, -1.2], [0.33, -0.98], [0.45, -0.76], [0.59, -0.53], [0.74, -0.3], [0.92, -0.1], [1.14, -0.02], [1.4, -0.08], [1.6, -0.2]]],
]);
/** The far lock: up from the part, over, and down past the far temple. */
const FAR = guides([
  [0, [[-0.13, -1.68], [-0.28, -1.81], [-0.5, -1.85], [-0.72, -1.79], [-0.92, -1.62], [-1.08, -1.38], [-1.2, -1.1], [-1.3, -0.8], [-1.36, -0.5]]],
  [0.5, [[-0.14, -1.66], [-0.3, -1.68], [-0.5, -1.65], [-0.68, -1.54], [-0.84, -1.36], [-0.96, -1.12], [-1.06, -0.85], [-1.13, -0.56], [-1.18, -0.26]]],
  [1, [[-0.15, -1.63], [-0.28, -1.44], [-0.44, -1.42], [-0.58, -1.42], [-0.69, -1.29], [-0.76, -1.08], [-0.82, -0.84], [-0.87, -0.56], [-0.9, -0.28]]],
]);
/** Between the two locks hair rises from the hairline in two arches, and bends to the side it goes to. */
const ROOTS = [
  guides([[0, [[0.25, -1.02], [0.27, -1.08], [0.29, -1.14]]], [0.33, [[0.13, -1.03], [0.17, -1.14], [0.25, -1.26]]], [0.66, [[-0.02, -1.03], [0.03, -1.22], [0.12, -1.42]]], [1, [[-0.2, -1.06], [-0.17, -1.32], [-0.09, -1.6]]]]),
  guides([[0, [[-0.26, -1.06], [-0.28, -1.22], [-0.33, -1.46]]], [0.33, [[-0.34, -1.04], [-0.43, -1.22], [-0.54, -1.44]]], [0.66, [[-0.47, -1.02], [-0.59, -1.17], [-0.7, -1.32]]], [1, [[-0.64, -1.0], [-0.72, -1.05], [-0.79, -1.1]]]]),
];
/** The knot: the hank goes up through the little crown, turns over and comes down behind. */
const KNOT = guides(([
  [0, [[0.27, -2.0], [0.2, -2.24], [0.22, -2.52], [0.37, -2.74], [0.62, -2.83], [0.88, -2.78], [1.08, -2.6], [1.16, -2.36], [1.12, -2.13], [1, -1.96]]],
  [0.5, [[0.5, -2.0], [0.44, -2.22], [0.46, -2.42], [0.56, -2.56], [0.7, -2.6], [0.84, -2.55], [0.93, -2.42], [0.95, -2.26], [0.9, -2.1], [0.84, -1.98]]],
  [1, [[0.62, -2.0], [0.62, -2.14], [0.63, -2.24], [0.66, -2.3], [0.69, -2.31], [0.72, -2.28], [0.73, -2.2], [0.74, -2.12], [0.74, -2.04], [0.74, -1.98]]],
] as readonly (readonly [number, Run])[]).map(([k, q]) => [k, q.map(tip)] as const));
/** The hair of the temple, which comes down over the front of the ear and gathers there into the long lock. */
const TEMPLE: Run = [[0.8, -0.44], [0.88, -0.22], [0.97, -0.04], [1.08, 0.1], [1.22, 0.19], [1.36, 0.24], [1.5, 0.22], [1.58, 0.1], [1.64, -0.08], [1.72, -0.2], [1.82, -0.28], [1.84, -0.38], [1.56, -0.42], [1.2, -0.42]];
/** What the drawn-up hair stands on, from the hairline to the knot. */
const CAP: Run = [[-0.14, -1.64], [-0.28, -1.56], [-0.5, -1.54], [-0.7, -1.38], [-0.84, -1.1], [-0.92, -0.8], [-1, -0.5], [-1.06, -0.72], [-1.04, -1.14], [-0.92, -1.54], [-0.68, -1.9], [-0.36, -2.16], [0, -2.33], [0.34, -2.4], [0.62, -2.4], [0.9, -2.3], [1.28, -2.12], [1.8, -1.88], [2.04, -1.5], [2, -1.04], [1.9, -0.6], [1.6, -0.4], [1.3, -0.4], [1, -0.5], [0.7, -0.84], [0.46, -1.12], [0.2, -1.46]];
/** The wash of the head: water where it is round to the light, ink where one lock goes in under another and where all is bound. */
const HAIR_TONE = inkDrops(0.72, [
  { at: [1.12, -0.16], size: [0.36, 0.13], turn: 0.3, ink: -0.4 }, 
  { at: [0.5, -2.1], size: [0.5, 0.14], turn: 0.2, ink: -0.22 }, { at: [0.68, -1.5], size: [0.3, 0.17], turn: 0.8, ink: -0.34 }, { at: [1.3, -0.9], size: [0.34, 0.12], turn: 0.5, ink: -0.2 }, { at: [2.2, -0.9], size: [0.1, 0.4], turn: 0, ink: -0.24 }, { at: [-0.8, -1.56], size: [0.2, 0.14], turn: -0.7, ink: -0.3 }, { at: [1.5, -1.4], size: [0.12, 0.4], turn: -0.2, ink: -0.24 }, { at: [0.56, -0.98], size: [0.24, 0.1], turn: 0.8, ink: -0.16 }, { at: [-0.2, -2.06], size: [0.3, 0.1], turn: -0.5, ink: -0.16 },
  { at: [0.2, -1.3], size: [0.2, 0.1], turn: 0.9, ink: 0.2 }, { at: [1.9, 0.2], size: [0.3, 0.3], turn: 0, ink: 0.16 }, { at: [0.75, -2.18], size: [0.4, 0.1], turn: 0, ink: 0.3 }, { at: [-0.12, -1.72], size: [0.14, 0.12], turn: 0, ink: 0.3 }, { at: [1, -1.1], size: [0.4, 0.08], turn: 0.7, ink: 0.2 }, { at: [1.8, -0.5], size: [0.4, 0.1], turn: 0.2, ink: 0.1 }, { at: [-0.8, -1.06], size: [0.1, 0.3], turn: 0, ink: 0.16 },
], { wave: 0.5, run: 0.3, seed: 71 });
/** Where hair hangs free the ink is let down. */
const FALL_TONE = inkDrops(0.6, [{ at: [2.1, 1.2], size: [0.2, 0.5], turn: 0, ink: -0.2 }, { at: [1.8, 2.6], size: [0.3, 0.4], turn: 0, ink: 0.24 }, { at: [2.6, 2.2], size: [0.4, 0.14], turn: 0.6, ink: -0.2 }, { at: [3.2, 2.5], size: [0.4, 0.2], turn: 0, ink: -0.24 }, { at: [1.5, 3], size: [0.2, 0.6], turn: 0, ink: -0.2 }, { at: [1.4, 1.2], size: [0.2, 0.4], turn: 0, ink: 0.2 }, { at: [1.3, 4.6], size: [0.3, 0.6], turn: 0, ink: 0.16 }], { wave: 0.5, run: 0.3, seed: 73 });
const inPen = (tone: (x: number, y: number) => number) => (x: number, y: number) => tone(...HEAD.fromLevel([x, y]));
function comb(f: InkRisoPen, from: number) {
  let s = from;
  const m = Z / 1.04;
  const hair = (q: Lock, w: number, ink: number, seed: number) => inkThread(f, K, q.map(([x, y, p]) => [...HEAD.level(x, y), p] as const), w, { ink, inkEnd: ink * 0.7, seed });
  const strand = (q: Run, w: number, ink: number, seed: number) => hair(q.map(([x, y], k) => [x, y, 0.1 + 0.9 * leaf(k / (q.length - 1))] as const), w, ink, seed);
  const flyaways = (form: InkSheetForm, o: Omit<InkFlyawayOptions, "seed">) => inkFlyaways(f, K, form, { seed: s++, ...o, width: [m * (o.width?.[0] ?? 0.6), m * (o.width?.[1] ?? 1.5)] });
  const gap = (q: Run, w: number, shape?: InkGapShape) => inkGap(f, [K], lv(q), w * UNIT * FACE.scale, shape);
  /** A wash on an outline read in the head's frame; the tone is read there too. */
  const wash = (plate: string, q: Run, tone: (x: number, y: number) => number, o: Omit<Parameters<typeof inkBloom>[3], "seed" | "tone" | "soft"> & { soft?: number | ((x: number, y: number) => number) } = {}) => inkBloom(f, plate, f.shape(lv(q)), { wander: 0.8, wave: 60, fringe: 0.4, rim: 0.24, rimWidth: 3, mottle: 0.34, cloud: 26, seed: s++, ...o, tone: (X, Y) => clamp(tone(...HEAD.fromLevel(f.local(X, Y)))), soft: typeof o.soft === "function" ? (g => (X: number, Y: number) => g(...HEAD.fromLevel(f.local(X, Y))))(o.soft) : o.soft ?? 1.2 });
  type Wet = Omit<InkHankOptions, "seed" | "tone"> & { seed?: number; tone?: InkHankOptions["tone"] };
  const wet = (o: Wet): InkHankOptions => ({ tone: inPen(HAIR_TONE), earth: E, earthTone: 0.24, clear: PLATE, seed: (s += 2), ...o, hairWidth: m * (o.hairWidth ?? 1.1) });
  /** A lock as a wash: given node by node, or as a piece of a sheet. */
  const hank = (q: Lock, o: Wet = {}) => inkHank(f, K, lock(q), wet(o));
  const band = (form: InkSheetForm, s0: number, s1: number, o: Wet & { from?: number; to?: number; pinch?: (t: number) => number } = {}) => { const { from, to, pinch, ...rest } = o; inkHank(f, K, { sheet: form.lock(s0, s1, { from, to, pinch: pinch && (t => pinch((t - (from ?? 0)) / ((to ?? 1) - (from ?? 0)))) }) }, wet(rest)); };
  /** Hairs that leave the skin one by one. */
  const rooted = (form: InkSheetForm, n: number, w: number, ink: number) => { for (let i = 0; i < n; i++) { const r = (k: number) => { const v = Math.sin((s + i * 7 + k) * 12.9898) * 43758.5453; return v - Math.floor(v); }, p = form.run((i + 0.2 + 0.6 * r(0)) / n, 0.2 * r(1), 1, 8); inkThread(f, K, p.map((c, k) => [c[0], c[1], Math.min(1, 0.06 + 1.3 * (k / 7))] as const), w * m * (0.6 + 0.8 * r(2)), { ink: ink * (0.7 + 0.3 * r(3)), inkEnd: 0.9, seed: s + 31 * i }); } s += n; };
  /** And the soft points they gather into. */
  const tufts = (form: InkSheetForm, n: number, half: number) => { for (let i = 0; i < n; i++) { const p = form.run((i + 0.5) / n, 1.1, 0.04 + 0.12 * (i % 3), 8); inkHank(f, K, p.map((c, k) => [c[0], c[1], half * UNIT * (1 - k / 7) ** 0.7] as const), wet({ tone: 0.5, earthTone: 0.3, round: 0, soft: 2.6, glaze: 0, tip: 0.7, end: 0.1, root: 0, clear: [] })); } };
  return { hair, strand, flyaways, gap, wash, hank, band, rooted, tufts };
}
/** Behind the trunk: the hair that hangs, two tails taken by the wind, and some of it past the far side of the neck. */
function drawFall({ face: f }: Pens) {
  const { hank, hair, gap } = comb(f, 600), all = { tone: inPen(FALL_TONE), root: 0.02, tip: 0.2, hairs: 5, stray: 1.6, clear: [K, ...PLATE] };
  // past the far side of the neck: a thin ink, it lies behind
  const pale = { ...all, tone: 0.34, round: 0.4, tip: 0.5, earthTone: 0.1, glaze: 0.3, streak: 0.9, hairs: 4 };
  hank([[-0.66, -0.3, 0.05], [-0.78, 0.1, 0.1], [-0.82, 0.6, 0.14], [-0.78, 1.1, 0.2], [-0.72, 1.6, 0.22], [-0.76, 2.1, 0.2], [-0.86, 2.5, 0.14], [-0.98, 2.9, 0.07], [-1.08, 3.2, 0.01]], pale);
  hank([[-0.86, -0.1, 0.02], [-0.96, 0.3, 0.04], [-1, 0.7, 0.05], [-0.98, 1.1, 0.055], [-1, 1.5, 0.05], [-1.08, 1.9, 0.04], [-1.2, 2.3, 0.02], [-1.3, 2.6, 0]], { ...pale, tone: 0.3 });
  for (const [q, w, ink, seed] of [[[[-0.94, 0.1, 0.2], [-1.06, 0.5, 0.8], [-1.1, 0.9, 0.9], [-1.08, 1.4, 0.8], [-1.16, 1.9, 0.6], [-1.3, 2.3, 0]], 1.6, 0.5, 619], [[[-0.8, 0.2, 0.2], [-0.9, 0.7, 0.8], [-0.9, 1.2, 0.9], [-0.86, 1.7, 0.8], [-0.92, 2.2, 0.6], [-1.02, 2.6, 0]], 1.4, 0.44, 618]] as const) hair(q, w, ink, seed);
  // tails
  hank([[2, 0.5, 0.03], [2.13, 1.0, 0.06], [2.32, 1.44, 0.075], [2.57, 1.78, 0.07], [2.88, 1.94, 0.055], [3.18, 1.9, 0.036], [3.4, 1.74, 0.016], [3.51, 1.6, 0]], all);
  hank([[1.88, 0.9, 0.12], [1.98, 1.35, 0.17], [2.15, 1.8, 0.19], [2.4, 2.2, 0.18], [2.72, 2.48, 0.15], [3.07, 2.6, 0.11], [3.38, 2.54, 0.07], [3.68, 2.36, 0.036], [3.88, 2.16, 0.012], [3.96, 2.02, 0]], { ...all, round: 0.4, light: -0.4 });
  hank([[2.06, -0.2, 0.18], [2.1, 0.3, 0.2], [2.06, 0.8, 0.22], [1.99, 1.3, 0.24], [1.95, 1.8, 0.28], [1.97, 2.3, 0.32], [2.07, 2.8, 0.29], [2.18, 3.2, 0.17], [2.3, 3.56, 0]], { ...all, round: 0.2 });
  hank([[1.7, 0.2, 0.1], [1.68, 0.8, 0.14], [1.66, 1.3, 0.16], [1.7, 1.8, 0.2], [1.78, 2.3, 0.22], [1.9, 2.8, 0.19], [2, 3.2, 0.11], [2.08, 3.52, 0]], { ...all, tone: 0.86, round: 0.2 });
  gap([[2.2, 1.42], [2.4, 1.82], [2.67, 2.1], [3, 2.22]], 0.04, "leaf"); gap([[1.86, 0.9], [1.82, 1.3], [1.82, 1.8], [1.9, 2.3]], 0.014, "leaf");
  for (const [q, w, ink, seed] of [
    [[[2.12, 0.4, 0.3], [2.25, 0.86, 0.8], [2.46, 1.24, 0.9], [2.76, 1.46, 0.8], [3.1, 1.46, 0.5], [3.34, 1.3, 0]], 1.7, 0.7, 633], [[[2.3, 1.5, 0.3], [2.55, 1.94, 0.9], [2.86, 2.14, 0.9], [3.3, 2.1, 0.7], [3.64, 1.92, 0.4], [3.86, 1.72, 0]], 1.9, 0.74, 634], [[[2.36, 2.3, 0.3], [2.76, 2.66, 0.8], [3.16, 2.8, 0.8], [3.56, 2.74, 0.5], [3.86, 2.56, 0]], 1.5, 0.62, 635],
    [[[2.26, 0.4, 0.3], [2.28, 1.0, 0.9], [2.2, 1.6, 0.9], [2.24, 2.2, 0.7], [2.36, 2.8, 0]], 1.6, 0.8, 636], [[[2, 0.4, 0.3], [1.92, 1.0, 0.9], [1.84, 1.6, 0.9], [1.86, 2.2, 0.8], [1.98, 2.8, 0]], 1.6, 0.86, 637],
  ] as const) hair(q, w, ink, seed);
}
/** One lock brought forward over the near shoulder. */
function drawLock({ face: f }: Pens) {
  const { hank, hair, gap } = comb(f, 700);
  // the robe does not show through it
  f.knock(inkBlob(f, lock([[1.5, 1.96, 0.1], [1.395, 2.3, 0.125], [1.33, 2.7, 0.118], [1.368, 3.15, 0.106], [1.416, 3.6, 0.096], [1.394, 4.05, 0.08], [1.302, 4.48, 0.062], [1.18, 4.88, 0.042], [1.134, 5.22, 0.024], [1.19, 5.48, 0.008]])));
  const all = { tone: inPen(FALL_TONE), root: 0.02, tip: 0.14, hairs: 5, stray: 1.6, glaze: 0.36, clear: [K, ...PLATE] };
  hank([[2.06, 0.06, 0], [2.04, 0.36, 0.045], [1.96, 0.68, 0.095], [1.82, 1.04, 0.145], [1.65, 1.4, 0.165], [1.52, 1.8, 0.175], [1.41, 2.25, 0.165], [1.35, 2.7, 0.15], [1.38, 3.15, 0.135], [1.43, 3.6, 0.12], [1.41, 4.05, 0.1], [1.32, 4.48, 0.08], [1.2, 4.88, 0.058], [1.15, 5.22, 0.036], [1.2, 5.5, 0.016], [1.3, 5.7, 0]], { ...all, round: 0.4, light: -0.3 });
  hank([[1.94, 0.24, 0], [1.87, 0.52, 0.022], [1.74, 0.96, 0.05], [1.56, 1.4, 0.07], [1.43, 1.84, 0.074], [1.32, 2.3, 0.07], [1.26, 2.74, 0.06], [1.28, 3.2, 0.056], [1.32, 3.6, 0.05], [1.31, 4.0, 0.04], [1.22, 4.4, 0.03], [1.1, 4.8, 0.014], [1.02, 5.06, 0]], { ...all, round: 0.3, glaze: 0.3 });
  gap([[1.38, 2.5], [1.42, 2.95], [1.48, 3.4], [1.49, 3.8]], 0.016, "leaf"); gap([[1.66, 1.5], [1.52, 1.95], [1.42, 2.4]], 0.01, "leaf");
  for (const [q, w, ink, seed] of [
    [[[1.22, 2.4, 0.3], [1.14, 2.9, 0.8], [1.18, 3.4, 0.9], [1.22, 3.9, 0.7], [1.12, 4.4, 0.5], [0.98, 4.8, 0]], 1.7, 0.7, 721], [[[1.5, 2.6, 0.3], [1.6, 3.1, 0.9], [1.64, 3.6, 0.9], [1.58, 4.1, 0.7], [1.44, 4.6, 0.5], [1.38, 5, 0]], 1.9, 0.74, 722],
    [[[1.8, 0.9, 0.3], [1.6, 1.4, 0.9], [1.44, 1.9, 0.9], [1.34, 2.4, 0.8], [1.32, 3.0, 0.5], [1.36, 3.5, 0]], 1.7, 0.86, 723],
  ] as const) hair(q, w, ink, seed);
}
function drawGathered({ face: f }: Pens) {
  const { flyaways, gap, strand, hair, wash, hank, band, rooted, tufts } = comb(f, 500), over = (q: readonly (readonly [Run, number, number])[], from: number) => { for (const [i, [r, w, ink]] of q.entries()) strand(r, w, ink, from + i); };
  // ---- behind: what comes down over the nape
  for (const [s0, s1, to] of [[0.72, 1, 0.8], [0, 0.26, 0.96], [0.5, 0.8, 0.9], [0.18, 0.44, 0.86], [0.36, 0.6, 1]] as const) band(BACK, s0, s1, { to, pinch: pointed(0.6), round: 0.26, tip: 0.4, hairs: 5, stray: 1.8, clear: [K, ...PLATE] });
  flyaways(BACK, { n: 5, s: [-0.03, 0.3], from: [0.1, 0.66], length: [0.1, 0.24], lift: [1, 5], drift: 0.07, ink: [0.35, 0.7] });
  // ---- the drawn-up hair: one wash, then lock over lock
  f.knock(f.shape(lv(CAP)), [K, ...PLATE]);
  wash(E, CAP, () => 0.17, { mottle: 0.2 }); wash(K, CAP, HAIR_TONE);
  for (const [s0, s1, from] of [[0, 0.4, 0.3], [0.36, 0.72, 0.36], [0.68, 1, 0.36]] as const) band(CROWN, s0, s1, { from, round: 0.26, light: 0.2, tip: 0.1, root: 0.1, glaze: 0.4, hairs: 1, clear: [K, ...PLATE] });
  flyaways(CROWN, { n: 6, s: [-0.02, 0.24], from: [0.06, 0.5], length: [0.22, 0.5], lift: [1, 8], drift: 0.12, ink: [0.35, 0.7] });
  for (const [s0, s1, from] of [[0.74, 1, 0.1], [0.48, 0.77, 0.1], [0.24, 0.52, 0.12], [0, 0.28, 0.3]] as const) band(SIDE, s0, s1, { from, round: 0.32, tip: 0.08, root: 0.02, glaze: 0.42, hairs: 1, clear: [K, ...PLATE] });
  over([
    [[[0.06, -1.66], [0.3, -1.84], [0.52, -2.02], [0.68, -2.16]], 1.6, 0.8], [[[0.66, -1.74], [0.86, -1.86], [0.9, -2.04], [0.84, -2.18]], 1.5, 0.8], [[[0.98, -1.5], [1.16, -1.7], [1.14, -1.94], [1, -2.12]], 1.8, 0.86], [[[1.2, -1.16], [1.42, -1.36], [1.5, -1.66], [1.36, -1.94], [1.08, -2.14]], 1.4, 0.76], [[[1.4, -0.94], [1.66, -1.1], [1.84, -1.42], [1.76, -1.78], [1.36, -2.08]], 1.8, 0.86], [[[1.6, -0.76], [1.9, -1.0], [2.03, -1.4], [1.9, -1.78], [1.5, -2.06]], 1.5, 0.8],
    [[[-0.24, -1.9], [0.02, -2.06], [0.3, -2.16], [0.58, -2.22]], 1.3, 0.7], [[[-0.62, -1.82], [-0.34, -2.06], [0, -2.22], [0.36, -2.31]], 1.3, 0.66],
  ], 540);
  gap([[0.98, -1.62], [1.06, -1.84], [0.98, -2.04], [0.88, -2.16]], 0.014, "leaf"); gap([[1.56, -1.1], [1.7, -1.4], [1.64, -1.74], [1.36, -2.0]], 0.014, "leaf"); gap([[0.3, -1.98], [0.46, -2.08], [0.62, -2.18]], 0.01, "leaf"); gap([[-0.5, -1.98], [-0.2, -2.16], [0.14, -2.28]], 0.01, "leaf");
  // ---- between the locks: hair that rises from the skin
  for (const q of [[[0.27, -1.04], [0.26, -1.24], [0.14, -1.44], [0, -1.6], [-0.14, -1.66], [-0.22, -1.44], [-0.25, -1.18], [-0.16, -1.1], [-0.04, -1.06], [0.1, -1.05]], [[-0.25, -1.14], [-0.28, -1.36], [-0.4, -1.48], [-0.58, -1.48], [-0.72, -1.3], [-0.78, -1.06], [-0.68, -1.02], [-0.5, -1.04], [-0.36, -1.06]]] as readonly Run[]) { wash(E, q, (_x, y) => 0.42 * ss(-0.98, -1.3, y), { soft: 14, rim: 0, mottle: 0.2 }); wash(K, q, (_x, y) => 0.56 * ss(-1.02, -1.42, y), { soft: 14, rim: 0 }); }
  for (const form of ROOTS) { tufts(form, 9, 0.036); rooted(form, 14, 0.8, 0.5); rooted(form, 8, 1.4, 0.84); }
  hank([[-0.13, -1.66, 0.014], [-0.2, -1.53, 0.026], [-0.245, -1.37, 0.027], [-0.255, -1.2, 0.015], [-0.25, -1.04, 0]], { tip: 0.4, hairs: 1 });
  // ---- the ear stands before all that goes back behind it; the hair of the temple comes down over its front, thin at its foot, and tucks in behind its top
  paintInkEar(f, HEAD, FACE_STYLE);
  f.knock(f.shape(lv(TEMPLE.map(([x, y]) => y > -0.3 ? [lerp(1.46, x, 0.76), lerp(-0.2, y, 0.7)] as const : [x, y] as const))), [E, R, K]);
  const loose = (_x: number, y: number) => lerp(1.4, 11, ss(-0.1, 0.12, y));
  wash(E, TEMPLE, (_x, y) => lerp(0.24, 0.3, ss(-0.2, 0.2, y)), { soft: loose, rim: 0.1, mottle: 0.2 }); wash(K, TEMPLE, (x, y) => lerp(0.74, 0.5, ss(-0.3, 0.16, y)) * lerp(0.66, 1, ss(0.9, 1.3, x)) * (1 - 0.34 * Math.exp(-(((x - 1.18) / 0.22) ** 2) - ((y - 0.03) / 0.07) ** 2)), { soft: loose, rim: 0.1 });
  hank([[0.7, -0.5, 0.02], [0.9, -0.34, 0.06], [1.12, -0.23, 0.1], [1.34, -0.21, 0.12], [1.54, -0.27, 0.11], [1.72, -0.35, 0.09], [1.9, -0.33, 0.07], [2.04, -0.17, 0.05], [2.1, 0.06, 0.03], [2.11, 0.3, 0]], { tone: inPen((x, y) => HAIR_TONE(x, y) * 0.86), root: 0.1, tip: 0.3, round: 0.36, hairs: 4, glaze: 0.42, clear: [K, ...PLATE] });
  over([[[[0.94, -0.46], [1.2, -0.36], [1.46, -0.36], [1.72, -0.44], [1.94, -0.42], [2.1, -0.22]], 1.6, 0.86], [[[1, -0.16], [1.22, -0.1], [1.42, -0.11], [1.58, -0.2], [1.76, -0.28], [1.94, -0.24], [2.05, -0.06]], 1.5, 0.8], [[[0.82, -0.36], [0.92, -0.12], [1.05, 0.08], [1.22, 0.19], [1.42, 0.24]], 1.5, 0.7], [[[0.84, -0.28], [0.94, -0.02], [1.08, 0.17], [1.26, 0.29], [1.44, 0.34]], 1.2, 0.5], [[[0.9, -0.06], [1.02, 0.13], [1.18, 0.27], [1.36, 0.37]], 1, 0.36], [[[0.96, -0.06], [1.08, 0.12], [1.24, 0.24], [1.42, 0.28]], 1.1, 0.6], [[[0.9, -0.3], [1.02, -0.12], [1.16, 0.02], [1.32, 0.1], [1.48, 0.1]], 1.3, 0.7], [[[1.0, -0.24], [1.16, -0.08], [1.34, 0.0], [1.5, -0.04], [1.62, -0.16]], 1.2, 0.7], [[[1.5, 0.18], [1.57, 0.06], [1.62, -0.08], [1.7, -0.2], [1.82, -0.28]], 1.5, 0.8]], 570);
  // ---- the near lock: three, the top one last
  for (const [s0, s1, light, to] of [[0.68, 1, 0.2, 0.88], [0.34, 0.74, 0, 0.94], [0, 0.4, -0.2, 0.94]] as const) band(NEAR, s0, s1, { to, pinch: pointed(0.62), light, round: 0.36, root: 0.03, tip: 0.1, glaze: 0.42, hairs: 2, clear: [K, ...PLATE] });
  over([
    [[[-0.1, -1.69], [0.06, -1.86], [0.3, -1.95], [0.54, -1.92], [0.78, -1.75], [1.02, -1.48], [1.24, -1.17], [1.5, -0.86], [1.82, -0.65]], 2.2, 0.92], [[[-0.04, -1.63], [0.2, -1.53], [0.5, -1.29], [0.8, -1.05], [1.12, -0.86], [1.5, -0.68], [1.84, -0.48]], 1.8, 0.9], [[[-0.02, -1.6], [0.18, -1.4], [0.4, -1.08], [0.64, -0.76], [0.92, -0.52], [1.26, -0.4], [1.6, -0.36]], 1.7, 0.86],
    [[[-0.1, -1.61], [0.06, -1.48], [0.2, -1.24], [0.32, -0.99], [0.46, -0.74], [0.62, -0.48], [0.8, -0.23], [1.02, -0.06]], 1.8, 0.86], [[[0.1, -1.78], [0.36, -1.78], [0.64, -1.6], [0.9, -1.32], [1.16, -1.06], [1.5, -0.84]], 1.2, 0.6], [[[0.14, -1.68], [0.42, -1.56], [0.72, -1.3], [1.02, -1.06], [1.36, -0.88]], 1.2, 0.66], [[[0.28, -1.2], [0.52, -0.84], [0.78, -0.5], [1.06, -0.28], [1.4, -0.24]], 1.2, 0.66],
  ], 560);
  gap([[0.02, -1.79], [0.2, -1.88], [0.42, -1.88], [0.64, -1.78], [0.84, -1.58]], 0.012, "leaf"); gap([[0.34, -1.4], [0.6, -1.17], [0.9, -0.95], [1.24, -0.76]], 0.012, "leaf"); gap([[-0.03, -1.67], [0.12, -1.68], [0.26, -1.63]], 0.016, "leaf"); gap([[0.5, -0.8], [0.74, -0.5], [1.02, -0.32]], 0.01, "leaf");
  flyaways(NEAR, { n: 6, s: [-0.04, 0.2], from: [0, 0.3], length: [0.3, 0.6], lift: [2, 7], drift: 0.06, ink: [0.35, 0.7] });
  // ---- the far lock: what lies on the head, then what hangs from it in points, the nearest to the face last
  hair([[-0.1, -2.16, 0.2], [-0.46, -2.06, 0.8], [-0.86, -1.8, 1], [-1.2, -1.4, 0.9], [-1.38, -1.1, 0.5], [-1.46, -0.9, 0]], 1.4, 0.6, 521); hair([[-0.3, -1.84, 0.2], [-0.7, -1.87, 0.8], [-1.06, -1.58, 1], [-1.34, -1.1, 1], [-1.52, -0.66, 0.8], [-1.6, -0.28, 0.5], [-1.52, -0.02, 0]], 1.8, 0.76, 522);
  band(FAR, 0, 0.55, { to: 0.94, pinch: pointed(0.36), round: 0.3, root: 0.04, tip: 0.3, glaze: 0.36, tone: inPen((x, y) => HAIR_TONE(x, y) * 0.86), clear: [K, ...PLATE] });
  const tipped = { root: 0, tip: 0.1, round: 0.36, glaze: 0.4, hairs: 2, stray: 1.3, tone: inPen((x, y) => HAIR_TONE(x, y) * 0.9), clear: [K, ...PLATE] };
  hank([[-0.26, -1.77, 0], [-0.5, -1.8, 0.03], [-0.78, -1.68, 0.07], [-1, -1.42, 0.08], [-1.15, -1.1, 0.075], [-1.27, -0.8, 0.062], [-1.36, -0.54, 0.045], [-1.38, -0.34, 0.025], [-1.32, -0.22, 0.01], [-1.25, -0.18, 0]], tipped);
  hank([[-0.8, -1.2, 0], [-0.88, -0.9, 0.016], [-0.96, -0.6, 0.032], [-1.06, -0.28, 0.04], [-1.14, -0.06, 0.04], [-1.2, 0.08, 0.028], [-1.2, 0.2, 0.016], [-1.12, 0.3, 0]], tipped);
  hank([[-0.22, -1.7, 0], [-0.5, -1.69, 0.045], [-0.76, -1.5, 0.1], [-0.92, -1.2, 0.11], [-1.03, -0.88, 0.1], [-1.12, -0.58, 0.085], [-1.21, -0.28, 0.065], [-1.3, 0, 0.045], [-1.37, 0.26, 0.026], [-1.36, 0.46, 0.012], [-1.28, 0.58, 0]], tipped);
  hank([[-0.16, -1.66, 0], [-0.24, -1.55, 0.06], [-0.29, -1.43, 0.07], [-0.295, -1.3, 0.045], [-0.275, -1.19, 0.02], [-0.262, -1.06, 0]], { tone: inPen((x, y) => HAIR_TONE(x, y) * lerp(0.9, 0.6, ss(-1.5, -1.2, y))), round: 0.3, light: -0.3, root: 0, tip: 0.5, end: 0.2, glaze: 0.4, hairs: 2, stray: 1.2, soft: 2, clear: [] });
  band(FAR, 0.5, 1, { to: 0.92, pinch: pointed(0.36), round: 0.34, root: 0.04, tip: 0.3, glaze: 0.4, clear: [K, ...PLATE] });
  hank([[-0.16, -1.65, 0], [-0.4, -1.52, 0.07], [-0.57, -1.45, 0.09], [-0.68, -1.24, 0.1], [-0.76, -0.96, 0.096], [-0.81, -0.64, 0.086], [-0.85, -0.34, 0.068], [-0.885, -0.04, 0.045], [-0.88, 0.2, 0.024], [-0.82, 0.36, 0.01], [-0.76, 0.44, 0]], tipped);
  over([
    [[[-0.15, -1.67], [-0.3, -1.81], [-0.52, -1.86], [-0.74, -1.79], [-0.94, -1.6], [-1.1, -1.34]], 1.9, 0.86], [[[-0.17, -1.62], [-0.3, -1.47], [-0.46, -1.45], [-0.6, -1.43], [-0.7, -1.29], [-0.78, -1.04], [-0.84, -0.76]], 1.7, 0.86], [[[-0.22, -1.66], [-0.46, -1.66], [-0.68, -1.53], [-0.84, -1.3], [-0.95, -1.0], [-1.03, -0.66]], 1.5, 0.8], [[[-0.3, -1.72], [-0.56, -1.74], [-0.8, -1.58], [-0.97, -1.3], [-1.1, -0.96], [-1.2, -0.6]], 1.3, 0.7], [[[-0.82, -0.8], [-0.88, -0.44], [-0.9, -0.12], [-0.88, 0.14], [-0.8, 0.34]], 1.2, 0.8],
  ], 600);
  gap([[-0.26, -1.74], [-0.46, -1.78], [-0.66, -1.72], [-0.84, -1.56]], 0.012, "leaf"); gap([[-0.3, -1.54], [-0.48, -1.53], [-0.63, -1.45], [-0.74, -1.24]], 0.01, "leaf"); gap([[-0.94, -0.9], [-1, -0.6], [-1.04, -0.3]], 0.014, "leaf");
  for (const [q, w, ink, seed] of [[[[-0.9, -0.2, 0.2], [-0.96, 0.06, 0.8], [-0.92, 0.28, 0.8], [-0.8, 0.38, 0.5], [-0.66, 0.41, 0]], 1.3, 0.7, 523], [[[-1.18, -0.5, 0.2], [-1.26, -0.2, 0.8], [-1.24, 0.06, 0.8], [-1.14, 0.24, 0.5], [-1, 0.3, 0]], 1.3, 0.66, 524], [[[-1, -0.6, 0.2], [-1.08, -0.2, 0.8], [-1.08, 0.16, 0.8], [-1.16, 0.4, 0]], 1.2, 0.6, 525]] as const) hair(q, w, ink, seed);
  // ---- the part
  gap([[-0.16, -1.58], [-0.13, -1.64], [-0.11, -1.7], [-0.09, -1.78], [-0.02, -1.86]], 0.012, t => [0.3, 0.8, 1, 0.7, 0.9, 0.5, 0.1][Math.round(6 * t)]);
}
function drawKnot({ face: f }: Pens) {
  const { hank, flyaways, gap, hair, strand } = comb(f, 650), all = { tone: 0.72, tip: 0.2, clear: [K, ...PLATE] };
  const up = (q: Lock): Lock => q.map(([x, y, w]) => [...tip([x, y]), w * KNOT_AT.size] as const), upto = (q: Run): Run => q.map(tip);
  // ends of the hank, let go behind
  hank(up([[0.9, -2.5, 0.05], [1.08, -2.64, 0.07], [1.3, -2.72, 0.058], [1.52, -2.68, 0.036], [1.7, -2.56, 0.012], [1.8, -2.46, 0]]), { ...all, hairs: 4, stray: 1.7, tip: 0.3 });
  hank(up([[0.96, -2.36, 0.04], [1.16, -2.46, 0.048], [1.34, -2.46, 0.032], [1.48, -2.38, 0.014], [1.56, -2.28, 0]]), { ...all, tone: 0.6, hairs: 3, stray: 1.7, tip: 0.3 });
  for (const [q, seed] of [[[[1.06, -2.7, 0.3], [1.32, -2.82, 0.8], [1.58, -2.78, 0.6], [1.82, -2.62, 0]], 666], [[[1.1, -2.56, 0.3], [1.32, -2.6, 0.8], [1.54, -2.52, 0.6], [1.68, -2.38, 0]], 667]] as const) hair(up(q), 1.5, 0.6, seed);
  hank(up([[0.5, -2.0, 0.1], [0.56, -2.3, 0.16], [0.68, -2.45, 0.2], [0.8, -2.3, 0.2], [0.82, -2.0, 0.14]]), { ...all, tone: 0.95, round: 0, glaze: 0 });
  { const wound = { sheet: KNOT.lock(0, 1) }, lit = (x: number, y: number) => { const [u, v] = HEAD.fromLevel([x, y]), c = tip([0.42, -2.62]); return 0.7 - 0.3 * Math.exp(-(((u - c[0]) / 0.22) ** 2) - ((v - c[1]) / 0.16) ** 2) + 0.2 * Math.exp(-(((u - tip([0.8, -2.2])[0]) / 0.2) ** 2) - ((v - tip([0.8, -2.2])[1]) / 0.24) ** 2); }; inkHank(f, K, wound, { tone: lit, round: 0, glaze: 0.3, streak: 0.9, earth: E, earthTone: 0.3, clear: [K, ...PLATE], hairs: 3, seed: 680 }); }
  flyaways(KNOT, { n: 7, s: [-0.04, 0.2], from: [0.05, 0.4], length: [0.3, 0.6], lift: [2, 8], drift: 0.06, ink: [0.35, 0.7] });
  strand(upto([[0.34, -2.02], [0.3, -2.3], [0.4, -2.58], [0.62, -2.7], [0.86, -2.66], [1.0, -2.46], [1.02, -2.2], [0.94, -2.0]]), 1.6, 0.86, 671); strand(upto([[0.46, -2.02], [0.42, -2.26], [0.52, -2.5], [0.68, -2.56], [0.84, -2.48], [0.9, -2.28], [0.86, -2.04]]), 1.4, 0.86, 672); strand(upto([[0.27, -2.0], [0.2, -2.26], [0.24, -2.54], [0.4, -2.76], [0.62, -2.83], [0.88, -2.78], [1.08, -2.6]]), 1.6, 0.8, 673);
  gap(upto([[1.04, -2.24], [1.01, -2.44], [0.88, -2.6], [0.72, -2.68]]), 0.014, "leaf"); gap(upto([[0.32, -2.36], [0.4, -2.54], [0.54, -2.65]]), 0.012, "leaf");
}
/** The little crown round the knot's foot and the pin through it: filigree, wiped out of the dark hair and drawn dark where it stands on the paper. */
function drawCrown({ face: f }: Pens) {
  let s = 750;
  const at = ([x, y]: readonly number[]) => HEAD.level(...tip([x, y])), px = KNOT_AT.size;
  const ink = (q: Lock, w: number, tone = 0.95) => inkThread(f, K, q.map(r => [...at(r), r[2]] as const), w * px, { ink: tone, inkEnd: tone, seed: s++ });
  /** A wire of silver: paper with a dark bed, so that it shows on hair and beside it. */
  const wire = (q: Lock, w: number) => { const n = q.map(r => [...at(r), r[2]] as const); inkThread(f, K, n, (w + 3) * px, { ink: 0.97, inkEnd: 0.97, seed: s++ }); f.knock(inkBlob(f, n.map(([x, y, k]) => [x, y, (0.5 * w * px * k) / FACE.scale] as const))); if (w >= 4) inkThread(f, K, n.map(([x, y, k], i) => [x + 0.2 * w * px / FACE.scale, y + 0.2 * w * px / FACE.scale, k * leaf(0.12 + 0.76 * i / (n.length - 1))] as const), 1.3 * px, { ink: 0.6, inkEnd: 0.4, seed: s++ }); };
  const curl = (x: number, y: number, r: number, from: number, turns: number, w: number) => wire(Array.from({ length: 12 }, (_, i) => { const t = i / 11, a = from + turns * 2 * Math.PI * t, k = r * (1 - 0.72 * t); return [x + k * Math.cos(a), y + k * Math.sin(a), 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t + 0.25))] as const; }), w);
  // ground
  const ground: Run = [[0.17, -1.93], [0.14, -2.05], [0.15, -2.17], [0.22, -2.27], [0.32, -2.34], [0.43, -2.4], [0.54, -2.35], [0.66, -2.27], [0.8, -2.2], [0.96, -2.2], [1.1, -2.24], [1.1, -2.06], [1.05, -1.9], [0.6, -1.85]];
  inkBloom(f, K, f.shape(ground.map(at)), { tone: 0.96, soft: 0.6, wander: 0.4, wave: 14, fringe: 0.2, rim: 0.1, rimWidth: 2, mottle: 0.1, cloud: 14, seed: s++ });
  // pin, behind the knot
  ink([[-0.32, -2.15, 0.1], [-0.18, -2.15, 0.7], [0, -2.15, 1], [0.16, -2.15, 0.9]], 7); f.lift([[-0.1, -2.156, 0.2], [0.02, -2.156, 1], [0.14, -2.156, 0.6]].map(r => [...at(r), r[2]] as const), 2 * px, [K]);
  wire([[0.9, -2.16, 0.8], [1.1, -2.17, 0.9], [1.3, -2.175, 1], [1.44, -2.18, 0.8]], 4);
  // wings, swept back: leaves of wire
  wire([[0.27, -1.96, 0.4], [0.17, -2.04, 0.9], [0.1, -2.15, 1], [0.075, -2.26, 0.7], [0.08, -2.37, 0.1]], 3.6); wire([[0.3, -1.97, 0.4], [0.24, -2.1, 0.8], [0.17, -2.2, 0.9], [0.12, -2.28, 0.6], [0.08, -2.37, 0.1]], 2.8);
  wire([[0.6, -1.93, 0.5], [0.71, -2.06, 0.9], [0.85, -2.17, 1], [1, -2.25, 0.8], [1.2, -2.31, 0.1]], 5); wire([[0.78, -1.92, 0.5], [0.94, -1.98, 0.9], [1.07, -2.08, 1], [1.14, -2.19, 0.8], [1.2, -2.31, 0.1]], 4); wire([[0.72, -1.97, 0.1], [0.85, -2.06, 0.8], [0.97, -2.14, 0.7], [1.06, -2.2, 0.1]], 2.6);
  curl(0.75, -2.26, 0.07, 1.2, 1.15, 2.8);
  // the flame before the knot
  wire([[0.4, -1.93, 0.5], [0.3, -2.0, 0.9], [0.235, -2.11, 1], [0.25, -2.23, 0.9], [0.34, -2.33, 0.8], [0.4, -2.44, 0.6], [0.425, -2.56, 0.1]], 4.6); wire([[0.44, -1.93, 0.5], [0.55, -2.0, 0.9], [0.625, -2.11, 1], [0.6, -2.23, 1], [0.5, -2.33, 0.8], [0.45, -2.44, 0.6], [0.425, -2.56, 0.1]], 5.2);
  wire([[0.42, -2.28, 0.3], [0.422, -2.36, 0.9], [0.424, -2.45, 0.2]], 2.4); wire([[0.36, -1.98, 0.3], [0.31, -2.08, 0.9], [0.32, -2.18, 0.7], [0.37, -2.22, 0.2]], 2.4); wire([[0.48, -1.98, 0.3], [0.545, -2.08, 0.9], [0.53, -2.18, 0.7], [0.47, -2.22, 0.2]], 2.6);
  inkDab(f, R, [[0.425, -2.14, 0.026], [0.425, -2.1, 0.034], [0.424, -2.06, 0.022]].map(q => [...at(q), q[2] * UNIT] as const), { tone: 0.95, foot: 1, seed: s++ });
  // the band, two wires and beads
  wire([[0.15, -1.975, 0.5], [0.34, -1.93, 1], [0.55, -1.905, 0.9], [0.8, -1.915, 1], [1.06, -1.955, 0.6]], 3.2); wire([[0.17, -1.9, 0.5], [0.34, -1.85, 1], [0.55, -1.828, 1], [0.8, -1.838, 1], [1.05, -1.875, 0.6]], 5);
  for (const [x, y, w] of [[0.25, -1.914, 0.8], [0.35, -1.89, 1], [0.46, -1.874, 0.8], [0.57, -1.867, 1.1], [0.68, -1.868, 0.8], [0.79, -1.876, 1], [0.91, -1.892, 0.8], [1.0, -1.908, 0.7]] as const) f.lift([[...at([x - 0.012, y]), 0.7], [...at([x, y]), 1], [...at([x + 0.012, y]), 0.7]], 5 * w * px, [K, E]);
  // the pin's head, a curl of cloud
  curl(1.5, -2.23, 0.078, 2.4, 1.15, 3.2); curl(1.545, -2.135, 0.05, 3.2, -1.05, 2.6);
}
/** Ribbons from the back of the crown, taken by the wind: they turn flat and edge-on. */
function drawRibbons({ face: f }: Pens) {
  let s = 790;
  const tail = (q: Run, w: number, press: (t: number) => number, side: 1 | -1) => {
    const n = lv(q).map((r, i) => [r[0], r[1], press(i / (q.length - 1))] as const);
    f.knock(inkBlob(f, n.slice(1).map(([x, y, k]) => [x, y, Math.max(0.15, w * UNIT * 0.46 * k)] as const)), [K, R, E]);
    inkSide(f, T, n, w * AT.pd, { tip: 1, belly: 0.8, side, head: 0.1, rim: 0.3, dry: 0, dryEnd: 0.12, bristles: 7, grain: 0.5, seed: s++ });
    inkSide(f, K, n.map(([x, y, k]) => [x, y, k * 0.96] as const), w * AT.pd, { tip: 0.86, belly: 0.06, side, head: 0.2, rim: 0.2, dry: 0, dryEnd: 0.2, bristles: 7, grain: 0.7, seed: s++ });
  };
  tail([[1.1, -2.13], [1.34, -2.14], [1.7, -2.1], [2.05, -1.92], [2.4, -1.72], [2.76, -1.66], [3.1, -1.76], [3.4, -1.94], [3.66, -2], [3.86, -1.92]], 0.15, t => ss(1.02, 0.86, t) * (0.24 + 0.76 * Math.abs(Math.sin(Math.PI * (1.75 * t + 0.3)))), 1);
  tail([[1.12, -2.1], [1.32, -2.03], [1.62, -1.82], [1.9, -1.5], [2.12, -1.12], [2.38, -0.86], [2.68, -0.78], [2.96, -0.9], [3.16, -1.1]], 0.14, t => ss(1.02, 0.84, t) * (0.24 + 0.76 * Math.abs(Math.sin(Math.PI * (1.9 * t + 0.12)))), -1);
}
/** The forehead's skin, and the shade the hair casts on it. */
const FOREHEAD: Run = [[0.3, -1.1], [0, -1.16], [-0.25, -1.2], [-0.5, -1.16], [-0.72, -1.06], [-0.755, -0.8], [-0.775, -0.5], [-0.78, -0.26], [-0.5, -0.12], [-0.1, -0.1], [0.4, -0.16], [0.86, -0.02], [0.72, -0.34], [0.5, -0.68]];
const HAIRLINE: Run = [[0.9, -0.1], [0.6, -0.5], [0.33, -0.98], [0.1, -1.08], [-0.25, -1.12], [-0.6, -1.06], [-0.74, -0.96], [-0.78, -0.4]];
function drawForehead(f: InkRisoPen) {
  const { wash } = comb(f, 480), under = (x: number, y: number) => Math.min(...HAIRLINE.slice(1).map((b, i) => { const a = HAIRLINE[i], k = clamp(((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)); return Math.hypot(x - lerp(a[0], b[0], k), y - lerp(a[1], b[1], k)); }));
  const tone = (x: number, y: number) => (0.5 * Math.exp(-((under(x, y) / 0.09) ** 2)) + 0.5 * Math.exp(-((under(x, y) / 0.3) ** 2))) * ss(-0.06, -0.4, y);
  wash(E, FOREHEAD, (x, y) => 0.05 * ss(-0.1, -0.3, y) + 0.15 * tone(x, y), { soft: 10, rim: 0, fringe: 0, mottle: 0.2 }); wash(R, FOREHEAD, (x, y) => 0.06 * tone(x, y), { soft: 10, rim: 0, fringe: 0, mottle: 0.2 });
}
/** Before the ear two loose locks and a curl; over the near brow a pointed strand; past the far cheek single hairs. */
function drawStrands({ face: f }: Pens) {
  const { hank, hair } = comb(f, 500), all = { tone: 0.6, root: 0.2, tip: 0.3, round: 0.2, hairs: 2, stray: 1.3, glaze: 0.34 };
  hank([[1.6, -0.14, 0], [1.54, 0.0, 0.024], [1.49, 0.16, 0.056], [1.45, 0.36, 0.088], [1.41, 0.64, 0.1], [1.35, 0.98, 0.095], [1.28, 1.34, 0.082], [1.21, 1.7, 0.064], [1.15, 2.05, 0.044], [1.1, 2.35, 0.022], [1.08, 2.6, 0]], { ...all, root: 0, tone: 0.56, hairs: 4, clear: [K, ...PLATE] });
  hank([[1.17, 0.02, 0], [1.12, 0.14, 0.018], [1.06, 0.36, 0.02], [0.97, 0.55, 0.014], [0.88, 0.67, 0.007], [0.8, 0.74, 0]], { ...all, root: 0, hairs: 1 });
  hank([[0.08, -1.44, 0.008], [0.2, -1.2, 0.024], [0.29, -0.96, 0.038], [0.33, -0.76, 0.034], [0.315, -0.56, 0.024], [0.275, -0.38, 0.014], [0.22, -0.2, 0]], { ...all, root: 0.2 });
  for (const [q, w, ink, seed] of [
    [[[0.14, -1.34, 0.1], [0.26, -1.06, 0.8], [0.33, -0.8, 1], [0.335, -0.58, 0.9], [0.31, -0.4, 0.5], [0.28, -0.28, 0]], 1.3, 0.8, 546], [[[0.12, -1.36, 0.1], [0.2, -1.12, 0.8], [0.26, -0.88, 1], [0.28, -0.64, 0.9], [0.25, -0.42, 0.4], [0.21, -0.24, 0]], 1.2, 0.8, 545],
    [[[1.36, 0.1, 0.2], [1.35, 0.4, 0.8], [1.31, 0.8, 0.9], [1.24, 1.2, 0.8], [1.16, 1.6, 0.6], [1.1, 1.95, 0]], 1.5, 0.84, 547], [[[1.54, 0.1, 0.2], [1.55, 0.5, 0.8], [1.49, 1.0, 0.9], [1.4, 1.5, 0.7], [1.32, 1.9, 0]], 1.4, 0.8, 550], [[[1.46, 0.2, 0.2], [1.44, 0.6, 0.7], [1.37, 1.06, 0.7], [1.29, 1.5, 0.5], [1.22, 1.9, 0]], 1.1, 0.6, 552],
    [[[1.08, 0.06, 0.2], [1.02, 0.26, 0.8], [0.95, 0.44, 0.6], [0.87, 0.58, 0]], 1.1, 0.6, 549], [[[1.28, 0.16, 0.2], [1.26, 0.5, 0.8], [1.2, 0.9, 0.8], [1.12, 1.3, 0.6], [1.06, 1.6, 0]], 1.1, 0.56, 548],
    [[[-0.94, 0.3, 0.2], [-0.96, 0.6, 0.8], [-0.9, 0.9, 0.8], [-0.84, 1.2, 0.6], [-0.84, 1.5, 0]], 1.4, 0.6, 551],
  ] as const) hair(q, w, ink, seed);
}

// ---- body -------------------------------------------------------------------------------------------------------------------------
// Laid out in hundredths of the distance between the pupils from the middle between them, upright on the page. The trunk is turned about
// 42° to the viewer's right and the head less, so the near arm comes forward over the trunk and the far shoulder is short.
type Q = readonly (readonly number[])[];
const NECK: P2[] = [[4, 118], [8, 148], [12, 182], [26, 214], [60, 236], [40, 290], [10, 320], [-30, 310], [-90, 268], [-126, 222], [-146, 176], [-152, 120], [-154, 66], [-146, 40], [-60, 50], [0, 120]];
const ROBE: P2[] = [[-150, 164], [-164, 188], [-200, 214], [-258, 242], [-308, 276], [-336, 326], [-351, 392], [-354, 460], [-348, 526], [-356, 590], [-386, 658], [-430, 730], [-470, 800], [-480, 860], [360, 860], [324, 806], [272, 738], [234, 668], [212, 600], [206, 540], [211, 486], [213, 428], [207, 368], [197, 312], [180, 266], [152, 236], [110, 212], [72, 192], [48, 182], [40, 260], [20, 300], [-50, 280], [-106, 220], [-130, 160]];
/** The near sleeve lies over the trunk; the far one comes out behind it. */
const NEAR_SLEEVE: P2[] = [[-164, 300], [-168, 360], [-173, 430], [-168, 506], [-168, 582], [-178, 662], [-202, 746], [-232, 820], [-246, 860], [-480, 860], [-470, 800], [-430, 730], [-386, 658], [-356, 590], [-348, 526], [-354, 460], [-351, 392], [-336, 326], [-308, 276], [-258, 242], [-206, 216], [-180, 250]];
const FAR_SLEEVE: P2[] = [[150, 236], [160, 290], [162, 350], [158, 430], [150, 512], [147, 600], [158, 700], [188, 800], [206, 850], [360, 850], [324, 806], [272, 738], [234, 668], [212, 600], [206, 540], [211, 486], [213, 428], [207, 368], [197, 312], [180, 266]];
/** The inner edges of the two sides of the collar. The far one, from the wearer's left shoulder, lies on top, as the living wear it. */
const OVER: P2[] = [[43, 184], [54, 200], [54, 232], [44, 266], [28, 300], [8, 338], [-14, 384], [-36, 440], [-56, 508], [-71, 580], [-80, 650], [-84, 730]];
const UNDER: P2[] = [[-144, 150], [-136, 186], [-114, 224], [-84, 258], [-48, 286], [-8, 310], [34, 332]];
/** A line set off to one side by a distance of its own. */
const aside = (q: readonly P2[], d: (t: number) => number): P2[] => q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], z = q[Math.min(q.length - 1, i + 1)], l = Math.hypot(z[0] - a[0], z[1] - a[1]), k = d(i / (q.length - 1)); return [x - ((z[1] - a[1]) / l) * k, y + ((z[0] - a[0]) / l) * k] as const; });
const press = (q: Q, ...k: number[]): N3[] => q.map((r, i) => { const t = (i / (q.length - 1)) * (k.length - 1), j = Math.min(k.length - 2, Math.floor(t)); return [r[0], r[1], lerp(k[j], k[j + 1], t - j)] as const; });
const spot = (x: number, y: number, cx: number, cy: number, l: number, s: number, an = 0) => { const c = Math.cos(an), n = Math.sin(an), u = (x - cx) * c + (y - cy) * n, v = -(x - cx) * n + (y - cy) * c; return Math.exp(-((u / l) ** 2) - (v / s) ** 2); };
/** How far the top lapel's outer edge lies from its inner one. */
const lapelOut = (t: number) => lerp(3, 92, ss(0, 0.5, t) ** 0.62) - 8 * ss(0.7, 1, t);
function drawBody({ robe: p, face }: Pens) {
  let s = 800;
  const th = (pts: N3[], w: number, ink = 0.85, inkEnd = ink * 0.6, mid?: number) => inkThread(p, K, pts, w * Z, { ink, inkEnd, mid, seed: s++ });
  const side = (pts: N3[], w: number, o: Omit<Parameters<typeof inkSide>[4], "seed">, plate = K) => inkSide(p, plate, pts, w * Z, { ...o, bristles: o.bristles ?? Math.max(6, w * 0.62), seed: s++ });
  const wash = (plate: string, pts: Q, o: Omit<Parameters<typeof inkBloom>[3], "seed">) => inkBloom(p, plate, p.shape(pts as readonly P2[]), { ...o, soft: typeof o.soft === "function" ? (x, y) => Z * (o.soft as (x: number, y: number) => number)(x, y) : Z * (o.soft ?? 1), seed: s++ });
  const loc = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return Math.max(0, fn(x, y)); };
  const edge = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.95, belly: 0.14, side: sd, head: 0.35, rim: 0.15, dry: 0.05, dryEnd: 0.5, grain: 0.8, ...o });
  const fold = (pts: N3[], w: number, sd: 1 | -1, o: Partial<Parameters<typeof inkSide>[4]> = {}) => side(pts, w, { tip: 0.94, belly: 0.06, side: sd, head: 0.5, rim: 0.1, dry: 0.06, dryEnd: 0.8, grain: 1, ...o });
  /** The picture is let go at the foot of the page, unevenly. */
  const fade = (x: number, y: number) => ss(0, 110, 826 - y - 90 * inkFbm2(12, x / 46, y / 260, 2) - 0.34 * Math.max(0, Math.abs(x + 20) - 150));
  p.knock(p.shape(ROBE)); p.knock(p.shape(NECK));
  // ---- neck
  const jaw = HEAD.jaw.filter((_, i) => i % 6 === 0).map(q => p.local(...face.at(q[0], q[1])));
  // the strap of muscle from behind the ear to the pit of the neck: shade along its front edge
  const strap = (x: number, y: number) => { const t = clamp((y - 110) / 170), d = x - lerp(-104, -10, t ** 0.9); return Math.exp(-((d / (d < 0 ? 5 : 22)) ** 2)) * ss(0, 0.2, t) * ss(1, 0.7, t); };
  const onNeck = (plate: string, tone: (x: number, y: number) => number) => inkBloom(p, plate, p.shape(NECK), { tone: loc(tone), soft: 1.4, wander: 0, fringe: 0, rim: 0, mottle: 0.3, cloud: 30, seed: s++ });
  const below = (x: number, y: number) => { let d = 1e9; for (const q of jaw) d = Math.min(d, Math.hypot(x - q[0], (y - q[1]) * 0.8)); return d; };
  const shade = (x: number, y: number) => { const d = below(x, y) + 6 * (inkFbm2(6, x / 30, y / 30, 2) - 0.5); return (0.62 * Math.exp(-((d / 22) ** 2)) + 0.5 * Math.exp(-((d / 74) ** 2))) * ss(40, 100, y + 0.35 * (x + 100)) + 0.3 * ss(-60, -130, x) * ss(90, 150, y) + 0.2 * strap(x, y) + 0.3 * spot(x, y, 6, 286, 14, 8) + 0.16 * spot(x, y, -6, 226, 18, 10, -0.4) + 0.5 * spot(x, y, -138, 84, 40, 46); };
  onNeck(E, (x, y) => 0.2 * shade(x, y) + 0.05); onNeck(R, (x, y) => 0.08 * shade(x, y) + 0.015); onNeck(K, (x, y) => 0.16 * shade(x, y) * ss(44, 16, x));
  th(press([[2, 140], [8, 158], [11, 176], [14, 194], [26, 213], [50, 230]], 0.5, 1, 0.9, 0.8, 0.9, 0.3), 3.6, 0.92, 0.7);
  th([[-60, 208, 0.02], [-42, 240, 0.6], [-24, 266, 0.8], [-9, 284, 0.1]], 2, 0.1, 0.5, 0.32);
  th([[4, 206, 0.05], [9, 216, 0.6], [6, 228, 0.5], [-1, 234, 0.05]], 1.8, 0.3, 0.2);
  th([[-6, 282, 0.1], [4, 290, 0.9], [14, 288, 0.1]], 2.2, 0.55, 0.4); th([[-70, 258, 0.03], [-44, 272, 0.7], [-18, 282, 0.05]], 1.8, 0.35, 0.3); th([[20, 286, 0.05], [32, 276, 0.6], [44, 262, 0.05]], 1.7, 0.35, 0.2);
  // the collar's inside, behind the throat
  wash(K, [[44, 186], [41, 224], [53, 231], [56, 206], [50, 192]], { tone: 0.3, soft: 1.4, wander: 0.4, rim: 0.2, mottle: 0.3, cloud: 20 });
  // ---- waters of the robe, before any line
  /** A loaded brush laid on its side and drawn down the cloth: dark at its tip, clear at its belly, dry where it runs out. */
  const drag = (q: N3[], w: number, sd: 1 | -1, t: number, k: number, o: Partial<Parameters<typeof inkSide>[4]> = {}) => { side(q, w, { tip: t, belly: 0.02, side: sd, head: 0.15, rim: 0.2, dry: 0.2, dryEnd: 1, bristles: w * 0.4, grain: 0.9, bleed: 1.6, ...o }, T); side(q, w * 0.9, { tip: k, belly: 0, side: sd, head: 0.15, rim: 0.15, dry: 0.26, dryEnd: 1, bristles: w * 0.4, grain: 1.1, bleed: 1.6, ...o }); };
  /** Wet planes: `t` and `k` are the tones of indigo and ink at a place; the edge is dried on the side of `crisp` and lost away from it. */
  const water = (pts: Q, t: (x: number, y: number) => number, k: (x: number, y: number) => number, crisp: (x: number, y: number) => number, o: Partial<Parameters<typeof inkBloom>[3]> = {}) => {
    const f = (fn: (x: number, y: number) => number, n: number) => loc((x, y) => fn(x, y) * (0.68 + 0.64 * inkFbm2(n, (x + 0.2 * y) / 40, y / 230, 2)) * fade(x, y)), soft = loc(crisp);
    wash(T, pts, { tone: f(t, 3), soft, wander: 4, wave: 60, fringe: 0.7, rim: 0.34, rimWidth: 5, mottle: 0.3, cloud: 110, ...o }); wash(K, pts, { tone: f(k, 7), soft, wander: 4, wave: 60, fringe: 0.7, rim: 0.34, rimWidth: 5, mottle: 0.4, cloud: 80, ...o });
  };
  const trunkNear: P2[] = [[-146, 262], [-164, 320], [-173, 430], [-168, 506], [-170, 582], [-182, 650], [-190, 690], [-84, 700], [-80, 640], [-71, 580], [-56, 508], [-36, 440], [-14, 384], [-60, 350], [-104, 310]];
  const trunkFar: P2[] = [[84, 206], [112, 220], [150, 244], [160, 300], [162, 360], [158, 430], [150, 512], [147, 600], [160, 690], [100, 700], [0, 704], [4, 640], [26, 540], [52, 440], [72, 350], [80, 270]];
  water(trunkNear, (x, y) => 0.8 + 0.2 * ss(300, 500, y) + 0.2 * ss(-110, -170, x), (x, y) => 0.16 + 0.2 * ss(420, 680, y) + 0.34 * ss(-110, -172, x), () => 1.2);
  water(trunkFar, (x, y) => 0.7 + 0.3 * ss(260, 520, y) + 0.2 * ss(90, 10, x), (x, y) => 0.14 + 0.26 * ss(380, 680, y) + 0.4 * ss(90, 20, x), (_x, y) => lerp(1.2, 24, ss(300, 240, y)));
  drag(press([[-166, 330], [-178, 420], [-176, 510], [-178, 590], [-188, 690]], 0.2, 0.9, 1, 1, 0.8), 74, 1, 0.86, 0.6, { dryEnd: 0.2, dry: 0.1 });
  drag(press([[90, 236], [88, 320], [70, 420], [42, 530], [26, 640], [24, 720]], 0.2, 0.7, 1, 1, 0.9, 0.8), 84, 1, 0.8, 0.74, { dryEnd: 0.3 });
  drag(press([[152, 340], [150, 430], [142, 512], [138, 600], [148, 700]], 0.3, 0.9, 1, 1, 0.9), 56, -1, 0.8, 0.76, { dryEnd: 0.3 });
  // skirts, under the sash
  for (const [pl, k, n] of [[T, 0.95, 3], [K, 0.3, 7]] as const) wash(pl, [[-210, 728], [-100, 742], [0, 742], [100, 730], [190, 704], [204, 790], [224, 870], [-260, 870], [-232, 790]], { tone: loc((x, y) => k * ss(846, 730, y + 50 * (inkFbm2(n, x / 34, 2, 3) - 0.5)) * (0.72 + 0.56 * inkFbm2(n + 1, (x + 0.1 * y) / 22, y / 170, 3))), soft: 8, wander: 4, fringe: 1.4, rim: 0.2, mottle: 0.5, cloud: 60 });
  // ---- collars: white, white, a thread of cinnabar, then the dark lapel. First the side that goes under
  const collar = (q: P2[], k: 1 | -1, w: (t: number) => [number, number, number], lapelTone: (x: number, y: number) => number, to = q.length) => {
    const at = (j: 0 | 1 | 2, plus = 0) => aside(q, t => k * (w(t)[j] + plus)), cut = (r: P2[]) => r.slice(0, to);
    p.knock(p.shape([...cut(q), ...cut(at(2)).reverse()]));
    const mid = cut(aside(q, t => k * (w(t)[1] + w(t)[2]) * 0.5)), half = (i: number) => (w(i / (q.length - 1))[2] - w(i / (q.length - 1))[1]);
    wash(K, [...cut(at(1)), ...cut(at(2)).reverse()], { tone: loc(lapelTone), soft: 1, wander: 1.2, fringe: 0.5, rim: 0.2, mottle: 0.32, cloud: 60 });
    const top = Math.max(...mid.map((_, i) => half(i)));
    side(mid.map((r, i) => [r[0], r[1], half(i) / top] as const), top * 1.02, { tip: 0.96, belly: 0.64, side: k === 1 ? -1 : 1, head: 0, rim: 0.1, dry: 0.05, dryEnd: 0.9 });
    side(press(cut(aside(q, t => k * (w(t)[1] - 4.4))), 0.3, 0.9, 0.8, 1, 0.7, 0.9, 0.6, 0.2), 4.4, { tip: 0.94, belly: 0.72, side: 1, head: 0.1, rim: 0.3, dry: 0.06, dryEnd: 0.6, bristles: 5 }, R);
    th(press(cut(q), 0.3, 0.9, 1, 0.7, 0.9, 0.8, 0.3), 3, 0.85, 0.6);
    th(press(cut(at(0)), 0.2, 0.8, 0.9, 0.6, 0.9, 0.6, 0.1), 2.4, 0.75, 0.5);
    const shade = cut(aside(q, t => k * (w(t)[0] + 3)));
    side(press(shade, 0.1, 0.6, 0.9, 0.7, 0.8, 0.4, 0.05), 9, { tip: 0.2, belly: 0, side: k === 1 ? 1 : -1, head: 0, rim: 0, dry: 0, dryEnd: 0.3 });
  };
  collar(UNDER, 1, t => [lerp(7, 17, ss(0, 0.5, t)), lerp(16, 36, ss(0, 0.5, t)), lerp(34, 90, ss(0, 0.62, t))], (x, y) => lerp(0.98, 0.8, ss(220, 400, y) * ss(-60, 20, x)));
  collar(OVER, -1, t => [lerp(0.6, 17, ss(0, 0.4, t) ** 0.8), lerp(1.2, 36, ss(0, 0.4, t) ** 0.8), lapelOut(t)], (_x, y) => lerp(0.98, 0.78, ss(420, 720, y)));
  // ---- folds of the breast, and the sash. Paper is left along the lit side of a fold, where two waters did not meet
  const left = (q: P2[], w: number) => inkGap(p, [K, T], q, w * Z, t => Math.sin(Math.PI * t ** 0.7) ** 0.9);
  left([[154, 356], [126, 388], [98, 408], [64, 421]], 2.2); left([[92, 640], [98, 600], [112, 560], [134, 522]], 1.8); left([[14, 692], [16, 642], [30, 592], [52, 546]], 3); left([[-164, 386], [-146, 418], [-120, 442]], 1.6); left([[-136, 690], [-139, 640], [-152, 596], [-166, 560]], 2);
  fold(press([[-172, 396], [-150, 436], [-120, 460], [-86, 470]], 0.5, 1, 0.5, 0.03), 12, -1);
  fold(press([[-174, 424], [-158, 476], [-132, 514]], 0.4, 0.8, 0.03), 9, -1);
  fold(press([[-124, 684], [-128, 640], [-142, 590], [-160, 548]], 0.4, 1, 0.5, 0.03), 12, 1);
  fold(press([[26, 692], [28, 644], [44, 586], [74, 526]], 0.5, 1, 0.5, 0.03), 14, 1);
  fold(press([[64, 690], [76, 636], [100, 580], [132, 522]], 0.5, 1, 0.6, 0.03), 13, 1);
  fold(press([[104, 684], [116, 638], [134, 594]], 0.5, 0.9, 0.03), 11, 1);
  fold(press([[158, 366], [124, 400], [90, 422], [58, 434]], 0.5, 1, 0.5, 0.03), 13, -1);
  fold(press([[158, 386], [132, 434], [104, 474]], 0.4, 0.8, 0.03), 10, -1);
  const SASH: P2[] = [[-250, 678], [-140, 694], [-70, 700], [10, 696], [90, 683], [194, 654], [206, 708], [96, 741], [10, 753], [-70, 757], [-140, 751], [-260, 732]];
  p.knock(p.shape(SASH));
  wash(K, SASH, { tone: loc((x, y) => (0.5 + 0.9 * inkFbm2(8, x / 90, y / 11, 3)) * 0.92), soft: 1.2, wander: 2, wave: 40, fringe: 0.7, rim: 0.3, rimWidth: 4, mottle: 0.5, cloud: 50 });
  side([[-240, 692, 0.5], [-110, 707, 1], [-30, 710, 1], [60, 700, 1], [194, 668, 0.6]], 19, { tip: 0.98, belly: 0.6, side: -1, head: 0.2, rim: 0.1, dry: 0.06, dryEnd: 0.4 });
  side([[-246, 720, 0.4], [-110, 739, 0.9], [-30, 743, 1], [70, 733, 0.8], [200, 698, 0.3]], 13, { tip: 0.96, belly: 0.5, side: 1, head: 0.1, rim: 0.1, dry: 0.3, dryEnd: 0.7 });
  side([[-244, 709, 0.5], [-110, 725, 0.9], [-30, 728, 0.8], [60, 718, 0.9], [198, 685, 0.4]], 6, { tip: 1, belly: 0.86, side: 1, head: 0.1, rim: 0.3, dry: 0.02, dryEnd: 0.1, bristles: 5 }, R);
  // its knot, and the two ends that hang from it
  side([[40, 726, 0.4], [44, 762, 1], [38, 806, 1], [46, 850, 0.8]], 24, { tip: 0.98, belly: 0.66, side: 1, head: 0.1, rim: 0.1, dry: 0.06, dryEnd: 0.8 });
  side([[62, 724, 0.4], [78, 766, 1], [84, 810, 0.9], [104, 850, 0.8]], 22, { tip: 0.94, belly: 0.5, side: -1, head: 0.1, rim: 0.1, dry: 0.1, dryEnd: 0.9 });
  const knot: P2[] = [[38, 694], [56, 688], [72, 690], [76, 708], [72, 732], [56, 742], [38, 744], [33, 722]];
  p.knock(p.shape(knot)); wash(K, knot, { tone: 0.97, soft: 1, wander: 1.6, wave: 12, fringe: 0.5, rim: 0.2, mottle: 0.2, cloud: 30 }); p.lift([[37, 698, 0.1], [33, 720, 1], [38, 742, 0.1]], 2 * Z, [K]); p.lift([[73, 692, 0.1], [77, 710, 0.9], [72, 732, 0.1]], 2 * Z, [K]);
  fold(press([[-120, 758], [-130, 790], [-152, 826]], 0.5, 1, 0.03), 12, 1); fold(press([[132, 734], [146, 770], [168, 806]], 0.4, 0.8, 0.03), 11, -1);
  // ---- the far shoulder and sleeve
  p.knock(p.shape(FAR_SLEEVE));
  water([[160, 262], [182, 282], [194, 316], [203, 370], [209, 430], [207, 488], [203, 542], [209, 602], [230, 670], [268, 742], [318, 808], [340, 850], [206, 850], [190, 800], [160, 700], [150, 600], [153, 512], [161, 430], [165, 350]], (_x, y) => 0.66 + 0.3 * ss(300, 460, y), (x, y) => 0.1 + 0.2 * ss(430, 640, y) + 0.4 * ss(190, 156, x), (_x, y) => lerp(1, 14, ss(320, 270, y)));
  drag(press([[168, 350], [170, 440], [162, 530], [164, 630], [186, 740], [222, 830]], 0.3, 0.8, 1, 1, 1, 0.8), 56, 1, 0.86, 0.84);
  drag(press([[196, 650], [222, 724], [264, 790], [306, 850]], 0.2, 0.8, 1, 0.8), 60, -1, 0.6, 0.54, { dry: 0.3 });
  edge(press([[62, 186], [84, 197], [112, 211], [152, 236], [172, 254]], 0.1, 0.5, 0.9, 0.6, 0.8), 14, -1, { dryEnd: 0.3 });
  edge(press([[166, 246], [184, 272], [198, 314], [208, 368], [214, 428], [212, 486], [206, 540], [212, 600], [234, 668], [272, 738], [314, 792]], 0.1, 0.9, 1, 0.5, 0.8, 1, 0.5, 0.9, 0.7, 0.6, 0.04), 16, -1, { dryEnd: 0.7 });
  edge(press([[154, 300], [162, 352], [158, 430], [150, 512], [147, 600], [158, 700], [186, 796]], 0.05, 0.8, 1, 0.7, 0.9, 0.7, 0.1), 16, 1, { dryEnd: 0.8 });
  left([[163, 432], [178, 470], [192, 502], [204, 522]], 1.8); left([[160, 520], [182, 586], [216, 656], [246, 702]], 2.6);
  fold(press([[158, 436], [172, 478], [188, 516], [206, 540]], 0.6, 1, 0.6, 0.03), 12, -1);
  fold(press([[153, 516], [176, 592], [212, 668], [250, 726]], 0.5, 1, 0.6, 0.03), 13, -1);
  fold(press([[149, 604], [170, 684], [206, 752], [244, 806]], 0.5, 0.9, 0.6, 0.03), 12, -1);
  // ---- the near sleeve, before the trunk: paper on the shoulder, water in its folds, let go in the wind
  p.knock(p.shape(NEAR_SLEEVE));
  water([[-172, 348], [-200, 366], [-230, 398], [-262, 436], [-292, 486], [-318, 540], [-340, 600], [-372, 680], [-430, 760], [-470, 830], [-470, 870], [-250, 870], [-204, 746], [-182, 664], [-172, 584], [-172, 506], [-176, 430]], (x, y) => 0.16 + 0.2 * ss(430, 640, y) + 0.16 * ss(-240, -176, x), () => 0.015, (x, y) => lerp(1.6, 40, ss(-220, -330, x) * ss(700, 600, y)), { wander: 6, wave: 130, fringe: 0.8, rim: 0.4, rimWidth: 6 });
  water([[-176, 400], [-214, 440], [-262, 500], [-306, 580], [-340, 640], [-384, 710], [-430, 800], [-440, 870], [-250, 870], [-204, 746], [-182, 664], [-172, 584], [-172, 506], [-176, 430]], (x, y) => 0.26 + 0.4 * ss(500, 740, y) + 0.34 * ss(-250, -180, x), (x, y) => 0.02 + 0.12 * ss(600, 760, y) + 0.24 * ss(-226, -176, x), x => lerp(1.2, 30, ss(-200, -300, x)), { wander: 8, rim: 0.5 });
  drag(press([[-180, 396], [-196, 470], [-194, 560], [-208, 660], [-240, 760], [-276, 840]], 0.1, 0.7, 1, 1, 1, 0.8), 68, -1, 0.94, 0.66);
  drag(press([[-186, 430], [-230, 510], [-276, 590], [-336, 690], [-410, 790]], 0.2, 0.7, 1, 1, 0.8), 62, -1, 0.84, 0.36, { dry: 0.1 });
  drag(press([[-332, 340], [-341, 420], [-344, 500], [-356, 580], [-390, 680], [-430, 770]], 0.1, 0.6, 0.6, 0.8, 1, 0.8), 54, 1, 0.7, 0.26, { dry: 0.4 });
  drag(press([[-318, 560], [-352, 640], [-400, 720], [-452, 800]], 0.1, 0.7, 1, 0.8), 66, -1, 0.7, 0.24, { dry: 0.3 }); drag(press([[-236, 660], [-262, 730], [-306, 800], [-346, 850]], 0.2, 0.8, 1, 0.8), 70, 1, 0.76, 0.3, { dry: 0.3 });
  edge(press([[-186, 209], [-216, 223], [-258, 241], [-296, 264], [-316, 286]], 0.1, 0.5, 0.9, 0.5, 0.9), 15, 1, { dryEnd: 0.3 });
  edge(press([[-302, 270], [-326, 302], [-342, 346], [-352, 400], [-355, 460], [-348, 526], [-356, 590], [-386, 658], [-424, 720], [-446, 758]], 0.05, 0.8, 1, 0.5, 0.8, 1, 0.5, 0.9, 0.6, 0.04), 16, 1, { dryEnd: 0.6 });
  edge(press([[-160, 286], [-166, 350], [-173, 426], [-168, 506], [-168, 582], [-178, 662], [-202, 746], [-230, 816]], 0.04, 0.6, 1, 0.7, 1, 0.7, 0.9, 0.05), 19, -1, { dryEnd: 0.8 });
  fold(press([[-174, 410], [-208, 446], [-250, 492], [-302, 536]], 0.6, 1, 0.6, 0.03), 14, 1);
  fold(press([[-171, 448], [-208, 520], [-258, 602], [-328, 694], [-386, 756]], 0.6, 1, 0.8, 0.6, 0.03), 16, 1);
  fold(press([[-169, 520], [-192, 606], [-232, 690], [-296, 782]], 0.5, 1, 0.7, 0.03), 15, 1);
  fold(press([[-172, 604], [-190, 686], [-222, 760], [-262, 820]], 0.4, 0.9, 0.6, 0.03), 13, 1);
  fold(press([[-262, 254], [-290, 312], [-304, 386], [-318, 452]], 0.4, 0.9, 0.5, 0.03), 11, 1);
}
/** The wrapped hilt of the sword on his back, over the far shoulder, and its tassel. */
function drawSword({ robe: p }: Pens) {
  let s = 1000;
  const O: P2 = [170, 198], d: P2 = [0.4, -0.9165], at = (a: number, b: number): P2 => [O[0] + d[0] * a - d[1] * b, O[1] + d[1] * a + d[0] * b];
  const line = (q: Q, w: number, ink = 0.95, end = ink) => inkThread(p, K, q.map(r => [...at(r[0], r[1]), r[2]] as const), w * Z, { ink, inkEnd: end, seed: s++ });
  const shape = (q: Q) => p.shape(q.map(r => at(r[0], r[1])));
  const wet = (plate: string, q: Q, tone: number, o: Partial<Parameters<typeof inkBloom>[3]> = {}) => inkBloom(p, plate, shape(q), { tone, soft: 0.8, wander: 0.8, wave: 20, fringe: 0.3, rim: 0.3, rimWidth: 2.4, mottle: 0.5, cloud: 22, ...o, seed: s++ });
  // throat of the scabbard
  const sheath: Q = [[-60, -15], [-8, -14], [-8, 14], [-60, 15]]; p.knock(shape(sheath)); wet(K, sheath, 0.9); line([[-34, -14, 0.5], [-33, 0, 1], [-34, 14, 0.6]], 2.4);
  // grip, wrapped
  const grip: Q = [[6, -9.5], [60, -8], [120, -8.4], [164, -10], [164, 10], [120, 8.6], [60, 8.2], [6, 9.5]];
  p.knock(shape(grip)); wet(T, grip, 0.9); wet(K, grip, 0.62, { mottle: 0.7 });
  for (let i = 0; i < 9; i++) { const a = 14 + i * 17.2 + 2.4 * Math.sin(i * 2.3); p.lift([[...at(a, -8.6), 0.5], [...at(a + 8, 0), 1], [...at(a + 16, 8.6), 0.4]] as N3[], 2.6 * Z, [K, T]); p.lift([[...at(a + 1, 8.4), 0.4], [...at(a + 8, 0), 0.9], [...at(a + 14, -8.4), 0.3]] as N3[], 1.6 * Z, [K, T]); }
  line([[4, -9.6, 0.4], [60, -8.2, 1], [120, -8.6, 0.7], [166, -10, 0.5]], 2.2); line([[4, 9.6, 0.5], [60, 8.3, 1], [120, 8.8, 0.8], [166, 10.2, 0.6]], 3.2);
  // guard: a pair of clouds
  const guard: Q = [[-10, -12], [-13, -24], [-6, -34], [6, -33], [9, -25], [5, -18], [12, -10], [14, 0], [12, 10], [5, 18], [9, 25], [6, 33], [-6, 34], [-13, 24], [-10, 12]];
  p.knock(shape(guard)); wet(T, [[-8, 2], [-11, 22], [-5, 31], [4, 30], [6, 24], [2, 17], [8, 8], [8, 2]], 0.5); wet(K, [[-8, 6], [-10, 22], [-5, 30], [0, 28], [-2, 18], [0, 8]], 0.4);
  line([[-10, -10, 0.4], [-13, -24, 1], [-6, -34, 0.9], [6, -33, 0.8], [9, -25, 0.9], [5, -18, 0.4]], 3); line([[5, -18, 0.4], [12, -10, 0.9], [14, 0, 0.6], [12, 10, 0.9], [5, 18, 0.4]], 3); line([[5, 18, 0.4], [9, 25, 0.9], [6, 33, 0.8], [-6, 34, 1], [-13, 24, 1], [-10, 10, 0.5]], 4);
  line([[-4, -26, 0.2], [2, -28, 0.8], [3, -23, 0.7], [-2, -21, 0.2]], 1.7); line([[-4, 26, 0.2], [2, 28, 0.8], [3, 23, 0.7], [-2, 21, 0.2]], 1.7);
  // pommel
  const pommel: Q = [[160, -9], [170, -14], [182, -17], [192, -12], [198, 0], [192, 12], [182, 17], [170, 14], [160, 9]];
  p.knock(shape(pommel)); wet(T, [[162, 2], [172, 12], [182, 14], [190, 9], [192, 2], [178, 5]], 0.5); line([[160, -9, 0.5], [170, -14, 0.9], [182, -17, 1], [192, -12, 0.8], [198, 0, 0.6]], 3); line([[198, 0, 0.5], [192, 12, 0.9], [182, 17, 1], [170, 14, 0.8], [160, 9, 0.6]], 4); line([[164, -10, 0.5], [166, 0, 1], [164, 10, 0.5]], 2.4); line([[174, 0, 0.2], [180, -6, 0.8], [187, 0, 0.9], [181, 5, 0.6], [177, 1, 0.2]], 1.7);
}
/** The tassel on the pommel: a cord, a knot, and a hank of silk. */
function drawTassel({ robe: p }: Pens) {
  const dx = -58, dy = -26, by = (q: Q): N3[] => q.map(r => [r[0] + dx, r[1] + dy, r[2]] as const);
  let s = 1060;
  const silk = (q: Q, w: number, o: Partial<Parameters<typeof inkSide>[4]> = {}) => inkSide(p, R, by(q), w * Z, { tip: 0.98, belly: 0.7, side: 1, head: 0.2, rim: 0.3, dry: 0.04, dryEnd: 0.8, bristles: 7, grain: 0.8, ...o, seed: s++ });
  silk([[306, 44, 0.8], [322, 50, 1], [333, 72, 0.9], [336, 100, 1], [333, 126, 0.8]], 3.4, { dryEnd: 0.1 }); silk([[308, 46, 0.6], [318, 58, 0.9], [328, 84, 0.8], [330, 126, 0.7]], 2.6, { dryEnd: 0.1 });
  inkDab(p, R, [[331, 126, 5], [331, 134, 8], [330, 143, 6]].map(([x, y, r]) => [x + dx, y + dy, r] as const), { tone: 0.9, foot: 1, seed: s++ });
  for (const [x0, x1, x2, y2, w] of [[326, 318, 306, 224, 7], [329, 326, 316, 240, 9], [332, 334, 328, 246, 9], [335, 340, 338, 236, 7]] as const) silk([[x0, 144, 0.6], [lerp(x0, x1, 0.7), 168, 1], [x1, 196, 0.9], [x2, y2, 0.25]], w);
  for (const [a, b, c] of [[324, 312, 296], [330, 322, 308], [336, 344, 346]] as const) inkThread(p, R, by([[a, 146, 0.5], [b + 4, 190, 0.9], [c, 244, 0]]), 1.8 * Z, { ink: 0.9, inkEnd: 0.6, seed: s++ });
}
// ---- the page -----------------------------------------------------------------------------------------------------------------------
/** Far peaks: the ridge is an edge, the foot goes into mist. */
function drawMist({ page: p }: Pens) {
  let s = 1;
  const loc = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return Math.max(0, fn(x, y)); };
  const peak = (ridge: P2[], foot: number, tone: number, deep: number, plates: readonly (readonly [string, number])[], edge = 1.2) => {
    const r = inkSpline(ridge.map(q => p.at(...q)), 2).map(q => p.local(q[0], q[1])), top = (x: number) => { for (let i = 0; i + 1 < r.length; i++) if ((r[i][0] - x) * (r[i + 1][0] - x) <= 0) return lerp(r[i][1], r[i + 1][1], (x - r[i][0]) / (r[i + 1][0] - r[i][0] || 1e-9)); return 1e9; };
    const ends = [r[0][0], r[r.length - 1][0]];
    const belt = (x: number, y: number) => { const v = foot - 0.36 * (foot - Math.min(...ridge.map(q => q[1]))) + 34 * (inkFbm2(61 + s, x / 120, 3, 2) - 0.5); return 1 - 0.85 * Math.exp(-(((y - v) / (y < v ? 9 : 30)) ** 2)) * ss(0.36, 0.62, inkFbm2(63, x / 150, y / 60, 2)); };
    for (const [plate, k] of plates) inkBloom(p, plate, p.shape([...ridge, [ends[1], foot], [ends[0], foot]]), { tone: loc((x, y) => { const d = y - top(x), wob = 60 * (inkFbm2(51, x / 140, y / 46, 3) - 0.5); return d < -20 ? 0 : k * tone * Math.exp(-Math.max(0, d) / deep) * (0.55 + 0.9 * inkFbm2(21, x / 90, y / 60, 3)) * ss(ends[0], ends[0] + 110, x + wob) * ss(ends[1], ends[1] - 110, x - wob) * ss(foot, foot - 150, y + wob) * belt(x, y); }), soft: edge, wander: 3, wave: 40, fringe: 1.2, tooth: 2.6, rim: 0.2, rimWidth: 5, mottle: 0.5, cloud: 100, seed: s++ });
  };
  peak([[690, 690], [730, 652], [764, 640], [790, 590], [806, 576], [822, 520], [838, 470], [850, 452], [866, 400], [884, 372], [898, 378], [910, 412], [930, 424], [940, 470], [952, 520], [974, 534], [990, 580], [1024, 596], [1050, 640], [1104, 660], [1180, 700]], 930, 0.24, 150, [[T, 1], [K, 0.5]], 0.9);
  peak([[900, 800], [940, 776], [962, 730], [984, 716], [1000, 668], [1020, 640], [1034, 644], [1046, 690], [1066, 704], [1080, 746], [1110, 760], [1140, 800], [1190, 816]], 980, 0.34, 100, [[T, 1], [K, 0.7]], 0.9);
  peak([[10, 742], [50, 730], [82, 700], [104, 694], [124, 660], [142, 664], [160, 700], [196, 716], [230, 750], [300, 772]], 900, 0.16, 90, [[T, 1], [K, 0.4]], 0.9);
}
function drawInscription({ page: p }: Pens) {
  const glyph = (x: number, y: number, z: number, strokes: N3[][], w: number) => { for (const st of strokes) p.line(K, st.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2]] as const), w, { rough: 0.4, slant: 0.3, dryEnd: 0.35 }); };
  glyph(1000, 190, 72, [
    [[17, 11, 0.5], [24, 16, 1], [29, 24, 0.5]], [[8, 36, 0.5], [16, 40, 1], [22, 47, 0.4]], [[5, 88, 0.9], [14, 78, 0.8], [31, 52, 0.05]],
    [[43, 17, 0.6], [64, 14, 0.7], [85, 11, 0.9]], [[47, 29, 0.5], [64, 27, 0.6], [82, 24, 0.8]], [[64, 2, 0.8], [65, 20, 0.8], [64, 40, 0.6]], [[34, 43, 0.7], [64, 39, 0.7], [97, 36, 1]],
    [[48, 50, 0.8], [47, 70, 0.7], [44, 84, 0.5], [36, 97, 0.05]], [[49, 51, 0.5], [66, 49, 0.6], [81, 48, 1], [82, 72, 0.8], [81, 93, 1], [75, 91, 0.6], [69, 85, 0.05]], [[51, 64, 0.5], [64, 63, 0.5], [78, 62, 0.6]], [[50, 77, 0.5], [64, 76, 0.5], [78, 75, 0.6]],
  ], 8.4);
  glyph(1002, 286, 72, [
    [[24, 12, 0.8], [23, 40, 0.8], [19, 66, 0.7], [3, 95, 0.05]], [[25, 13, 0.6], [50, 9, 0.7], [75, 7, 1], [76, 36, 0.8], [80, 66, 0.9], [88, 86, 1], [95, 92, 0.8], [98, 76, 0.05]],
    [[63, 18, 0.7], [52, 24, 0.5], [38, 28, 0.1]], [[37, 38, 0.7], [38, 48, 0.7], [40, 56, 0.6]], [[38, 38, 0.5], [50, 36, 0.6], [63, 35, 0.9], [61, 46, 0.7], [60, 54, 0.6]], [[41, 55, 0.5], [50, 54, 0.5], [60, 53, 0.5]], [[50, 25, 0.7], [51, 52, 0.7], [50, 78, 0.8]], [[30, 84, 0.6], [48, 79, 0.7], [66, 73, 0.4]], [[60, 66, 0.4], [66, 73, 0.8], [71, 82, 0.9]],
  ], 8.4);
  // ---- seal: 山, cut white into red
  const [x, y, z] = [1018, 386, 38];
  inkBloom(p, R, p.shape([[x, y + 1], [x + z * 0.5, y], [x + z, y + 1], [x + z - 0.5, y + z * 0.5], [x + z, y + z], [x + z * 0.5, y + z - 0.5], [x, y + z], [x + 0.6, y + z * 0.5]]), { tone: 0.95, soft: 0.5, wander: 0.8, wave: 14, fringe: 0.4, rim: 0.2, mottle: 0.3, cloud: 14, seed: 901 });
  const cut = (pts: N3[], w: number) => p.lift(pts.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2] ?? 1] as const), w, [R]);
  cut([[50, 18, 0.9], [51, 48, 1], [50, 78, 0.8]], 4); cut([[24, 42, 0.8], [24, 62, 1], [25, 78, 0.9], [50, 79, 0.8], [76, 78, 0.8]], 4); cut([[76, 40, 0.9], [77, 60, 1], [76, 82, 0.7]], 4);
}

// ---- the figure in layers ---------------------------------------------------------------------------------------------------------
/** A place read in the head's own frame, and one in the robe's, on the page. */
const onPage = (x: number, y: number): P2 => { const q = HEAD.level(x, y); return [FACE.x + FACE.scale * q[0], FACE.y + FACE.scale * q[1]]; };
const onRobe = (x: number, y: number): P2 => [FRAMES.robe.x + FRAMES.robe.scale * x, FRAMES.robe.y + FRAMES.robe.scale * y];
const LIDS: Readonly<Record<string, number>> = { open: 1, half: 0.5, shut: 0.04 };
const pens = (c: InkPaintContext): Pens => c.pens(FRAMES);
const paint = (draw: (p: Pens) => void) => (c: InkPaintContext) => draw(pens(c));
export interface InkQingfengOptions {
  /** The far peaks in their mist, and the name with its seal (default: both). */
  mountain?: boolean; name?: boolean;
  /** How far hair, ribbons and tassel move (default 1). */
  wind?: number;
}
/** 清風 in layers. He breathes and blinks; a light wind from before him moves his hair, the ribbons of his crown and the tassel of his sword. */
export function inkQingfeng({ mountain = true, name = true, wind = 1 }: InkQingfengOptions = {}): InkSubject {
  const breath: InkPart["motion"] = [{ kind: "breathe", at: onRobe(-20, 800), amount: 0.0042, seconds: 5 }];
  const parts: InkPart[] = [
    { id: "mist", draw: paint(drawMist), depth: -0.25 },
    { id: "sword", draw: paint(drawSword), motion: breath },
    { id: "tassel", draw: paint(drawTassel), motion: [{ kind: "sway", from: onRobe(262, 24), to: onRobe(262, 224), amount: 9 * wind, seconds: 4.2, lag: 0.3, power: 1.5, lean: 0.3, phase: 0.6 }] },
    { id: "under", only: "film", group: "head", draw: c => inkCover(c.page, c.page.shape([[470, 290], [640, 290], [704, 400], [692, 560], [600, 690], [424, 690], [384, 640], [354, 560], [350, 450], [390, 350]])) },
    { id: "fall", group: "head", draw: paint(drawFall), motion: [{ kind: "sway", from: onPage(1.6, 0.2), to: onPage(3.7, 2.4), amount: 15 * wind, seconds: 5.8, lag: 0.34, power: 1.7, lean: 0.3 }] },
    { id: "body", draw: c => { paint(drawBody)(c); inkFade(c.page, [0, 1400, PAGE.width, 200], (x, y) => 1 - ss(1462, 1596, y + 90 * (inkFbm2(61, x / 130, y / 60, 3) - 0.5))); inkFade(c.page, [0, 800, PAGE.width, 800], x => ss(4, 80, x) * ss(PAGE.width - 4, PAGE.width - 80, x)); }, motion: breath },
    { id: "face", group: "head", poses: { kind: "blink", open: "open", order: ["half", "shut"], every: 5.2, seconds: 0.3 }, draw: c => { const f = pens(c).face, head = c.pose === "open" ? HEAD : pose(LIDS[c.pose] ?? 1); paintInkFace(f, head, FACE_STYLE); drawForehead(f); } },
    { id: "hair", group: "head", draw: paint(p => { drawGathered(p); drawKnot(p); }) },
    { id: "ribbons", group: "head", draw: paint(drawRibbons), motion: [{ kind: "sway", from: onPage(1.1, -1.8), to: onPage(3.6, -1.2), amount: 15 * wind, seconds: 4.6, lag: 0.42, power: 1.5, lean: 0.3, phase: 0.9 }] },
    { id: "crown", group: "head", draw: paint(drawCrown) },
    { id: "lock", group: "head", draw: paint(drawLock), motion: [{ kind: "sway", from: onPage(1.5, 0.6), to: onPage(1.15, 5.6), amount: 9 * wind, seconds: 6.4, lag: 0.28, power: 2, lean: 0.35, phase: 1.5 }] },
    { id: "strands", group: "head", draw: paint(drawStrands), motion: [{ kind: "sway", from: onPage(0.4, -0.9), to: onPage(0.9, 2.5), amount: 6 * wind, seconds: 5, lag: 0.32, power: 1.9, lean: 0.35, phase: 2.3 }] },
    { id: "name", draw: paint(drawInscription) },
  ];
  return { id: "qingfeng", label: "Half figure of a young swordsman turned to the right: the hair drawn up into a knot with a small silver crown, the rest blown back in the wind, a dark robe, the hilt of a sword over his shoulder, far peaks in mist", page: PAGE, plates: PLATES, paper: "#F8F1E3", seed: 11, groups: { head: [{ kind: "turn", at: onRobe(-30, 220), degrees: 0.4, seconds: 7.8 }] }, parts: inkPaintOrder(parts.filter(p => (mountain || p.id !== "mist") && (name || p.id !== "name")), ["under", "hair", "fall", "crown", "face", "lock", "strands", "ribbons", "body", "sword", "tassel", "mist", "name"], ["face"]) };
}
