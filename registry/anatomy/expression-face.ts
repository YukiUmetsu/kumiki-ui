/**
 * EXPR1 face: FACS action units applied to ANAT1's measured face (`createFace`). It returns:
 * - the moved vertices (mm), a mesh to render;
 * - style-neutral features: brow heights, lid opening, mouth corners and opening, in eye widths;
 * - the wrinkle lines each unit makes (where any style draws its creases, or where kumadori goes).
 *
 * A style maps the features onto its own drawing:
 * - a woodblock beauty's lifted brow;
 * - a crayon character's open mouth;
 * - a pencil portrait's crow's feet.
 *
 * Every face then shows the same anatomy of an emotion.
 *
 * Amounts (mm at full intensity) are estimates for drawing; FACS itself describes appearance only.
 */
import { createFace, FACE_FEATURES, FACE_LANDMARKS, IRIS_DIAMETER_MM, eyeCentres } from "./anatomy-face";
import type { FaceParams, FaceStudy } from "./anatomy-face";
import type { Vec3 } from "./anatomy-body";
import { EMOTIONS } from "./expression-facs";
import type { EmotionPrototype } from "./expression-facs";

export type AuWeights = Readonly<Record<number, number>>;
type Side = "L" | "R";

const loop = (k: string) => FACE_FEATURES[k].loop;
const inner = (k: string) => loop(k).slice(1, -1);
const LIDS = { upper: { R: inner("eye-upper.R"), L: inner("eye-upper.L") }, lower: { R: inner("eye-lower.R"), L: inner("eye-lower.L") } };
const SIDES = {
  browInner: { R: [107, 66], L: [336, 296] }, browMid: { R: [105], L: [334] }, browOuter: { R: [70, 63], L: [300, 293] },
  cheek: { R: [FACE_LANDMARKS["cheekbone.R"], 118, 117], L: [FACE_LANDMARKS["cheekbone.L"], 347, 346] },
  alare: { R: [FACE_LANDMARKS["alare.R"], 98], L: [FACE_LANDMARKS["alare.L"], 327] },
  corner: { R: [FACE_LANDMARKS["cheilion.R"], 78], L: [FACE_LANDMARKS["cheilion.L"], 308] },
} as const;
const UPPER_LIP = [0, 37, 267, 39, 269, 40, 270, 13, 82, 312, 81, 311];
const LOWER_LIP = [17, 84, 314, 181, 405, 14, 87, 317, 178, 402];
const CHIN = [FACE_LANDMARKS.pogonion, FACE_LANDMARKS.menton, FACE_LANDMARKS.sublabiale, 175, 200];

interface Move { anchors: readonly number[]; delta: Vec3; radius: number }
/** Per unit: moves for one side (the face's left, x mirrored for its right), and moves on the midline. */
const SIDED: Record<number, (s: Side) => Move[]> = {
  // The inner brow lifts alone (the brow slants up toward the middle), so its reach stops short of the outer end.
  1: s => [{ anchors: SIDES.browInner[s], delta: [0, 9, 0], radius: 12 }],
  2: s => [{ anchors: SIDES.browOuter[s], delta: [0, 7, 0], radius: 16 }, { anchors: SIDES.browMid[s], delta: [0, 3, 0], radius: 12 }],
  // The inner brow is pulled down and in hardest: the brows form a V.
  4: s => [{ anchors: SIDES.browInner[s], delta: [-4, -7.5, 1], radius: 11 }, { anchors: SIDES.browMid[s], delta: [-1, -3, 0], radius: 10 }],
  5: s => [{ anchors: LIDS.upper[s], delta: [0, 2.5, 0], radius: 4 }],
  6: s => [{ anchors: SIDES.cheek[s], delta: [0, 4, 1.5], radius: 18 }, { anchors: LIDS.lower[s], delta: [0, 2, 0], radius: 5 }],
  7: s => [{ anchors: LIDS.lower[s], delta: [0, 2.2, 0], radius: 4 }, { anchors: LIDS.upper[s], delta: [0, -1, 0], radius: 3 }],
  9: s => [{ anchors: SIDES.alare[s], delta: [0, 3, 0], radius: 10 }, { anchors: SIDES.browInner[s], delta: [-1, -2, 0], radius: 10 }],
  10: s => [{ anchors: SIDES.alare[s], delta: [0, 1.5, 0], radius: 8 }],
  12: s => [{ anchors: SIDES.corner[s], delta: [5, 7, -2], radius: 12 }, { anchors: SIDES.cheek[s], delta: [0, 1.5, 1], radius: 14 }],
  14: s => [{ anchors: SIDES.corner[s], delta: [-1, .5, -2.5], radius: 9 }],
  15: s => [{ anchors: SIDES.corner[s], delta: [.5, -4.5, 0], radius: 12 }],
  20: s => [{ anchors: SIDES.corner[s], delta: [6, -1, -1], radius: 13 }],
  23: s => [{ anchors: SIDES.corner[s], delta: [-2, 0, 0], radius: 9 }],
};
const MIDLINE: Record<number, Move[]> = {
  10: [{ anchors: UPPER_LIP, delta: [0, 3.5, .5], radius: 9 }],
  16: [{ anchors: LOWER_LIP, delta: [0, -3.5, .5], radius: 9 }],
  17: [{ anchors: CHIN, delta: [0, 3, 1.5], radius: 14 }, { anchors: LOWER_LIP, delta: [0, 2, 1], radius: 9 }],
  23: [{ anchors: UPPER_LIP, delta: [0, -.8, 0], radius: 6 }, { anchors: LOWER_LIP, delta: [0, .8, 0], radius: 6 }],
  24: [{ anchors: UPPER_LIP, delta: [0, -1.5, 0], radius: 7 }, { anchors: LOWER_LIP, delta: [0, 1.5, 0], radius: 7 }],
  25: [{ anchors: LOWER_LIP, delta: [0, -3, 0], radius: 8 }],
};

const fall = (d: number, r: number) => { const t = d / r; return t >= 1 ? 0 : (1 - t * t) ** 2; };

export interface ExpressedFace {
  /** Moved vertices (mm) and a mesh source (metres) for ANAT1's renderers. */
  vertices: Vec3[];
  mesh: FaceStudy["mesh"];
  neutral: readonly Vec3[];
  weights: AuWeights;
  /** Gaze (−1…1 left/right, down/up; cross-eyed 0–1) and head pose (deg). */
  gaze: { x: number; y: number; cross: number };
  head: { pitch: number; roll: number };
}

/** Apply action unit weights (0–1) to a face. `side` restricts sided units to one side (a one-sided contempt). */
export function expressFace(weights: AuWeights, base: FaceStudy | FaceParams = {}, side?: Side): ExpressedFace {
  const face = "vertices" in base ? base : createFace(base);
  const neutral = face.vertices, v: Vec3[] = neutral.map(p => [p[0], p[1], p[2]]);
  const leftSign = Math.sign(neutral[FACE_LANDMARKS["cheilion.L"]][0]) || 1;
  const sideOf = (p: Vec3): Side => (Math.sign(p[0]) === leftSign ? "L" : "R");
  const apply = (m: Move, w: number, s?: Side) => {
    if (w <= 0) return;
    const mirror = s === "R" ? -1 : 1, anchors = m.anchors.map(i => neutral[i]);
    neutral.forEach((p, i) => {
      if (s && sideOf(p) !== s && Math.abs(p[0]) > 2) return;
      let k = 0;
      for (const a of anchors) k = Math.max(k, fall(Math.hypot(p[0] - a[0], p[1] - a[1]), m.radius));
      if (k <= 0) return;
      v[i][0] += m.delta[0] * leftSign * mirror * k * w; v[i][1] += m.delta[1] * k * w; v[i][2] += m.delta[2] * k * w;
    });
  };
  for (const [idStr, w0] of Object.entries(weights)) {
    const id = Number(idStr), w = Math.min(1, Math.max(0, w0));
    const sides: Side[] = side ? [side] : ["L", "R"];
    // With AU 1, AU 4 draws the brows together but no longer pulls them down: the oblique grief brow (1 + 4).
    const lowerScale = id === 4 ? 1 - .75 * Math.min(1, weights[1] ?? 0) : 1;
    if (SIDED[id]) for (const s of sides) for (const m of SIDED[id](s)) apply(lowerScale === 1 ? m : { ...m, delta: [m.delta[0], m.delta[1] * lowerScale, m.delta[2]] }, w, s);
    if (MIDLINE[id]) for (const m of MIDLINE[id]) apply(m, w);
  }
  // Jaw drop and mouth stretch: the lower face swings down and back from below the mouth line.
  const drop = Math.min(1, weights[26] ?? 0) * 11 + Math.min(1, weights[27] ?? 0) * 22;
  if (drop > 0) {
    // The parting line runs from the lip centre out to the corners, so the corners stay with the upper face.
    const yStom = neutral[FACE_LANDMARKS.stomion][1], yMe = neutral[FACE_LANDMARKS.menton][1], jawHalf = Math.abs(neutral[FACE_LANDMARKS["gonion.L"]][0]) * 1.1;
    const ch = neutral[FACE_LANDMARKS["cheilion.L"]], yCh = (ch[1] + neutral[FACE_LANDMARKS["cheilion.R"]][1]) / 2, xCh = Math.abs(ch[0]);
    const lipLine = (x: number) => yStom + (yCh - yStom) * Math.min(1, Math.abs(x) / xCh) - (Math.abs(x) > xCh ? 1.5 : 0);
    neutral.forEach((p, i) => {
      const below = (yStom - p[1]) / Math.max(1, yStom - yMe), w = Math.min(1, Math.max(0, (lipLine(p[0]) - p[1] - .6) / 4)) * Math.max(0, 1 - Math.max(0, Math.abs(p[0]) - jawHalf * .7) / (jawHalf * .5));
      if (w > 0) { v[i][1] -= drop * w * (.85 + .15 * below); v[i][2] -= drop * .25 * w; }
    });
  }
  // Lids: droop (41) and closing (43) carry each upper-lid point toward its partner on the lower lid.
  const close = Math.min(1, Math.max(weights[43] ?? 0, (weights[41] ?? 0) * .45));
  if (close > 0) for (const s of ["R", "L"] as const) {
    const up = loop(`eye-upper.${s}`), lo = loop(`eye-lower.${s}`);
    up.forEach((iu, k) => {
      const dy = (v[lo[k]][1] + .3 - v[iu][1]) * close;
      neutral.forEach((p, i) => { const w = fall(Math.hypot(p[0] - neutral[iu][0], p[1] - neutral[iu][1]), 3.2); if (w > 0 && p[1] >= neutral[iu][1] - .5) v[i][1] += dy * w * (i === iu ? 1 : .8); });
    });
  }
  const gaze = { x: (weights[61] ?? 0) - (weights[62] ?? 0), y: (weights[63] ?? 0) - (weights[64] ?? 0), cross: weights[66] ?? 0 };
  const head = { pitch: ((weights[53] ?? 0) - (weights[54] ?? 0)) * 20, roll: ((weights[55] ?? 0) - (weights[56] ?? 0)) * 15 };
  const pts = new Float32Array(v.length * 3);
  v.forEach((x, i) => { pts[i * 3] = x[0] / 1000; pts[i * 3 + 1] = x[1] / 1000; pts[i * 3 + 2] = x[2] / 1000; });
  return { vertices: v, mesh: { ...face.mesh, points: pts }, neutral, weights, gaze, head };
}

/** An emotion prototype at an intensity (0–1), by id (`smile`, `sad`, `surprise`, `fear`, `angry`, `disgust`, `contempt`, …). */
export function expressEmotion(id: string, intensity = 1, base: FaceStudy | FaceParams = {}): ExpressedFace {
  const e = findEmotion(id);
  if (!e) throw new Error(`Unknown expression "${id}"`);
  return expressFace(Object.fromEntries(Object.entries(e.aus).map(([k, w]) => [k, w * intensity])), base, e.side);
}
export const findEmotion = (id: string): EmotionPrototype | undefined => EMOTIONS.find(e => e.id === id);
/** Blend two or more weight sets (crossfading expressions, layering a blink on a smile). */
export function blendWeights(...sets: readonly [AuWeights, number][]): AuWeights {
  const out: Record<number, number> = {};
  for (const [w, k] of sets) for (const [id, x] of Object.entries(w)) out[Number(id)] = Math.min(1, (out[Number(id)] ?? 0) + x * k);
  return out;
}

export interface ExpressionFeatures {
  /** Brow movement in eye widths (+ up): inner ends, outer ends; how far the inner ends drew together. */
  browInner: number; browOuter: number; browKnit: number;
  /** Lid opening as a share of the neutral opening (1 neutral, 0 closed, > 1 staring). */
  eyeOpen: number;
  /** Cheek, nose wing and upper lip lift, in eye widths. */
  cheekRaise: number; noseWrinkle: number; upperLip: number;
  /** Mouth corners (+ up, − down) and the mouth's width (share of neutral) and opening, in eye widths. */
  mouthCorner: number; mouthWidth: number; mouthOpen: number;
  /** Chin drop in eye widths. */
  jaw: number;
  /** One side differs from the other (contempt): corner height difference in eye widths. */
  asymmetry: number;
}

/** Style-neutral features of an expressed face: what a style needs to draw the same expression its own way. */
export function expressionFeatures(f: ExpressedFace): ExpressionFeatures {
  const v = f.vertices, n = f.neutral, L = (k: keyof typeof FACE_LANDMARKS) => FACE_LANDMARKS[k];
  const ew = (Math.hypot(n[L("exocanthion.L")][0] - n[L("endocanthion.L")][0], n[L("exocanthion.L")][1] - n[L("endocanthion.L")][1]) + Math.hypot(n[L("exocanthion.R")][0] - n[L("endocanthion.R")][0], n[L("exocanthion.R")][1] - n[L("endocanthion.R")][1])) / 2;
  const dy = (i: number) => (v[i][1] - n[i][1]) / ew, avg = (a: number, b: number) => (a + b) / 2;
  const gap = (s: Side, arr: readonly Vec3[]) => arr[L(`palpebrale-superius.${s}`)][1] - arr[L(`palpebrale-inferius.${s}`)][1];
  const cornerY = (s: Side) => dy(L(`cheilion.${s}`));
  const width = (arr: readonly Vec3[]) => Math.hypot(arr[L("cheilion.L")][0] - arr[L("cheilion.R")][0], arr[L("cheilion.L")][1] - arr[L("cheilion.R")][1]);
  const open = (arr: readonly Vec3[]) => arr[13][1] - arr[14][1];
  return {
    browInner: avg(dy(L("brow-inner.L")), dy(L("brow-inner.R"))), browOuter: avg(dy(L("brow-outer.L")), dy(L("brow-outer.R"))),
    browKnit: (Math.abs(n[L("brow-inner.L")][0] - n[L("brow-inner.R")][0]) - Math.abs(v[L("brow-inner.L")][0] - v[L("brow-inner.R")][0])) / ew,
    eyeOpen: avg(gap("L", v) / gap("L", n), gap("R", v) / gap("R", n)),
    cheekRaise: avg(dy(L("cheekbone.L")), dy(L("cheekbone.R"))), noseWrinkle: avg(dy(L("alare.L")), dy(L("alare.R"))), upperLip: dy(0),
    mouthCorner: avg(cornerY("L"), cornerY("R")), mouthWidth: width(v) / width(n), mouthOpen: Math.max(0, open(v) - open(n)) / ew,
    jaw: -dy(L("menton")), asymmetry: Math.abs(cornerY("L") - cornerY("R")),
  };
}

export interface ExpressionMark { id: string; points: [number, number][]; strength: number }
/**
 * The creases the active units make, as front-view polylines (mm): forehead lines (1, 2), lines between the brows (4),
 * crow's feet (6), the nasolabial fold (10, 12), nose-bridge lines (9), the chin crease and dimpling (17), dimples (14).
 */
export function expressionMarks(f: ExpressedFace): ExpressionMark[] {
  const v = f.vertices, w = f.weights, L = (k: keyof typeof FACE_LANDMARKS) => v[FACE_LANDMARKS[k]], out: ExpressionMark[] = [];
  const P = (p: Vec3, dx = 0, dy = 0): [number, number] => [p[0] + dx, p[1] + dy];
  const push = (id: string, strength: number, points: [number, number][]) => { if (strength > .05) out.push({ id, points, strength: Math.min(1, strength) }); };
  const bi = { L: L("brow-inner.L"), R: L("brow-inner.R") }, bo = { L: L("brow-outer.L"), R: L("brow-outer.R") }, top = Math.max(bi.L[1], bi.R[1], bo.L[1], bo.R[1]);
  const lift = (w[1] ?? 0) + (w[2] ?? 0);
  for (let k = 0; k < 3; k++) {
    const y = top + 9 + k * 7, spread = (w[2] ?? 0) > (w[1] ?? 0) ? 1 : .55;
    push(`forehead-${k}`, lift * .6, [[bo.R[0] * spread, y - 2], [bo.R[0] * spread * .5, y + 1], [0, y + (w[1] ?? 0) * 3], [bo.L[0] * spread * .5, y + 1], [bo.L[0] * spread, y - 2]]);
  }
  for (const s of ["L", "R"] as const) {
    const x = bi[s][0] * .45;
    push(`glabella.${s}`, w[4] ?? 0, [[x, bi[s][1] - 2], [x * .8, bi[s][1] + 8]]);
    const ex = L(`exocanthion.${s}`), out1 = Math.sign(ex[0]);
    for (let k = -1; k <= 1; k++) push(`crows-feet.${s}.${k}`, (w[6] ?? 0) * .9, [P(ex, out1 * 2, k * 2.5), P(ex, out1 * 8, k * 4.5)]);
    const al = L(`alare.${s}`), ch = L(`cheilion.${s}`), so = Math.sign(al[0]);
    push(`nasolabial.${s}`, .25 + (w[12] ?? 0) * .6 + (w[10] ?? 0) * .5, [P(al, so * 3, 1), [al[0] + so * 6, (al[1] + ch[1]) / 2], P(ch, so * 4, -4)]);
    push(`dimple.${s}`, w[14] ?? 0, [P(ch, so * 3, 2), P(ch, so * 3.5, -3)]);
  }
  const se = L("sellion");
  for (let k = 0; k < 2; k++) push(`nose-bridge-${k}`, w[9] ?? 0, [P(se, -5, -6 - k * 4), P(se, 0, -5 - k * 4), P(se, 5, -6 - k * 4)]);
  const sl = L("sublabiale");
  push("chin-crease", w[17] ?? 0, [P(sl, -9, 1), P(sl, 0, -1), P(sl, 9, 1)]);
  return out;
}

/** The iris centres and radius (mm) for the gaze, front view. */
export function irisPositions(f: ExpressedFace): { L: [number, number]; R: [number, number]; r: number } {
  const c = eyeCentres(f.vertices), r = IRIS_DIAMETER_MM / 2, shift = (s: "L" | "R"): [number, number] => {
    const inward = Math.sign(c[s][0]) * -1;
    return [c[s][0] + f.gaze.x * 3.5 + inward * f.gaze.cross * 3, c[s][1] + f.gaze.y * 2.5];
  };
  return { L: shift("L"), R: shift("R"), r };
}

/** The nearest prototype to a set of features (to check that a drawn face reads as the emotion it is meant to). */
export function nearestEmotion(features: ExpressionFeatures, candidates = EMOTIONS): { id: string; distance: number }[] {
  const keys: (keyof ExpressionFeatures)[] = ["browInner", "browOuter", "browKnit", "eyeOpen", "cheekRaise", "noseWrinkle", "upperLip", "mouthCorner", "mouthWidth", "mouthOpen", "jaw", "asymmetry"];
  return candidates.map(e => {
    const g = expressionFeatures(expressEmotion(e.id));
    return { id: e.id, distance: Math.sqrt(keys.reduce((s, k) => s + (features[k] - g[k]) ** 2, 0)) };
  }).sort((a, b) => a.distance - b.distance);
}
