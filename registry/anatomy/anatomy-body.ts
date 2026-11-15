/**
 * ANAT1 — a measured, morphable, posable human for drawing people in any art style.
 *
 * The body is a compact lattice baked from the CC0 MakeHuman model (base mesh hm08, macro targets, default skeleton
 * and skin weights; see scripts/anatomy/bake_makehuman.py). Blending the lattice with MakeHuman's own piecewise-linear
 * weights gives any sex/age/muscle/weight/height/ancestry setting as a surface of ~3,400 points, a 57-bone skeleton
 * and 47 named anthropometric landmarks. ANSUR II (measured adults) and CDC growth data calibrate it: see
 * `measureHumanBody` and docs/component-specs/human-anatomy.md.
 *
 * Coordinates are metres, right-handed: +x toward the figure's own left, +y up, +z forward (the way the figure
 * faces); origin on the floor under the pelvis. Every function here is pure and deterministic.
 */

import { statureForAge } from "./anatomy-growth";

export type Vec3 = [number, number, number];

/** Body settings. All fields optional; defaults are an average young adult between female and male. */
export interface HumanParams {
  /** 0 female … 1 male (MakeHuman gender axis). Values between blend the sculpted forms. */
  sex?: number;
  /** Age in years, 1–90. Proportions change most between 1 and 25 (head-to-height, limb lengths). */
  age?: number;
  /** 0 slight … 0.5 average … 1 very muscular. */
  muscle?: number;
  /** 0 very lean … 0.5 average … 1 heavy (soft-tissue volume). */
  weight?: number;
  /** 0 short … 0.5 average … 1 tall for the age: MakeHuman's height morph, which changes proportions, not only size. */
  height?: number;
  /**
   * MakeHuman's coarse sculpted ancestry morphs (African / Asian / Caucasian averages); normalised to sum 1.
   * Default equal thirds. They are artistic averages, not identities: for a specific person, work from references.
   */
  ancestry?: { african?: number; asian?: number; caucasian?: number };
  /** Optional final stature in metres (uniform scale after morphing). */
  stature?: number;
  /**
   * Without an explicit stature, scale to the CDC 2000 length/stature for age and sex (1–20 y; adults keep the age-20
   * value, minus ~1 mm per year after 40), at the percentile set by `height` (0.5 = median, 0/1 ≈ ±2 SD). MakeHuman
   * alone interpolates linearly between its age keys and makes infants and teenagers far too small. Default true.
   */
  growthCurve?: boolean;
}

export interface ResolvedHumanParams {
  sex: number; age: number; muscle: number; weight: number; height: number;
  ancestry: { african: number; asian: number; caucasian: number };
  stature?: number;
  growthCurve: boolean;
}

export interface HumanBone { id: string; parent: string | null; head: number; tail: number }

export interface HumanBodyModel {
  readonly header: BodyLatticeHeader;
  /** nodes × points × 3, int16 at `header.quant` metres. */
  readonly positions: Int16Array;
  /** Triangles over the render points (body then eyes). */
  readonly faces: Uint16Array;
  /** points × 4 bone indices and weights (0–255); joint points have zero rows. */
  readonly skinIndex: Uint8Array;
  readonly skinWeight: Uint8Array;
}

export interface BodyLatticeHeader {
  schema: string;
  source: { name: string; url: string; revision: string; license: string; note: string };
  units: string; axes: string; quant: number;
  counts: { body: number; eyes: number; joints: number; landmarks: number; points: number; faces: number; bodyFaces: number };
  nodes: { corners: string[]; heights: string[]; ethnic: string[] };
  bones: HumanBone[];
  landmarks: Record<string, number>;
  eyes: { L: [number, number]; R: [number, number] };
  layout: Record<"positions" | "faces" | "skinIndex" | "skinWeight", [number, number]>;
}

/** One evaluated body in its rest pose (MakeHuman A-pose). */
export interface HumanBody {
  readonly model: HumanBodyModel;
  readonly params: ResolvedHumanParams;
  /** All points × 3 (render points, joints, landmarks), metres. */
  readonly points: Float32Array;
  /** Number of render points (body + eyes) at the front of `points`. */
  readonly renderCount: number;
  readonly faces: Uint16Array;
  /** Rest joint head/tail per bone id. */
  readonly bones: readonly HumanBone[];
  readonly stature: number;
}

// ---- Decoding ------------------------------------------------------------------------------------------------------------------

/** Decode `human-body-lattice.bin` (the ANAT magic, a JSON header and four little-endian sections). */
export function decodeHumanBodyModel(buffer: ArrayBuffer): HumanBodyModel {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "ANAT") throw new Error("human-body-lattice: not an ANAT file");
  const headerLength = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, headerLength))) as BodyLatticeHeader;
  if (header.schema !== "kumiki.anatomy.body-lattice/1") throw new Error(`human-body-lattice: unsupported schema ${header.schema}`);
  const base = 8 + headerLength;
  const slice = (name: keyof BodyLatticeHeader["layout"]) => { const [o, l] = header.layout[name]; return buffer.slice(base + o, base + o + l); };
  return {
    header,
    positions: new Int16Array(slice("positions")),
    faces: new Uint16Array(slice("faces")),
    skinIndex: new Uint8Array(slice("skinIndex")),
    skinWeight: new Uint8Array(slice("skinWeight")),
  };
}

const modelCache = new Map<string, Promise<HumanBodyModel>>();
/** Fetch and decode the lattice once per URL (browser or any runtime with fetch). */
export function loadHumanBodyModel(url: string): Promise<HumanBodyModel> {
  let p = modelCache.get(url);
  if (!p) {
    p = fetch(url).then(r => { if (!r.ok) throw new Error(`human-body-lattice: ${r.status} ${url}`); return r.arrayBuffer(); }).then(decodeHumanBodyModel);
    p.catch(() => modelCache.delete(url));
    modelCache.set(url, p);
  }
  return p;
}

// ---- Macro weights (MakeHuman's own interpolation) --------------------------------------------------------------------------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const SEXES = ["female", "male"] as const;
const AGES = ["baby", "child", "young", "old"] as const;
const LEVELS = ["min", "average", "max"] as const;
const ANCESTRY = ["african", "asian", "caucasian"] as const;

export function resolveHumanParams(p: HumanParams = {}): ResolvedHumanParams {
  const a = p.ancestry ?? {};
  let af = Math.max(0, a.african ?? 1 / 3), as = Math.max(0, a.asian ?? 1 / 3), ca = Math.max(0, a.caucasian ?? 1 / 3);
  const sum = af + as + ca || 1; af /= sum; as /= sum; ca /= sum;
  return {
    sex: clamp01(p.sex ?? 0.5), age: Math.min(90, Math.max(1, p.age ?? 25)), muscle: clamp01(p.muscle ?? 0.5), weight: clamp01(p.weight ?? 0.5),
    height: clamp01(p.height ?? 0.5), ancestry: { african: af, asian: as, caucasian: ca }, stature: p.stature, growthCurve: p.growthCurve ?? true,
  };
}

/** Years → MakeHuman age value (1 y = 0, 25 y = 0.5, 90 y = 1). */
export const ageValue = (years: number) => years < 25 ? (years - 1) / 48 : 0.5 + (years - 25) / 130;

function ageWeights(years: number): Record<(typeof AGES)[number], number> {
  const a = clamp01(ageValue(years));
  if (a < 0.5) {
    const young = Math.max(0, (a - 0.1875) * 3.2);
    return { baby: Math.max(0, 1 - a * 5.333), child: Math.max(0, Math.min(1, 5.333 * a) - young), young, old: 0 };
  }
  const old = Math.max(0, a * 2 - 1);
  return { baby: 0, child: 0, young: 1 - old, old };
}
const tri = (v: number) => { const max = Math.max(0, v * 2 - 1), min = Math.max(0, 1 - v * 2); return { min, average: 1 - max - min, max }; };

/** Lattice node weights for a setting: [node index, weight] pairs. */
export function latticeWeights(model: HumanBodyModel, params: ResolvedHumanParams): [number, number][] {
  const { corners, heights, ethnic } = model.header.nodes;
  const g = { female: 1 - params.sex, male: params.sex };
  const age = ageWeights(params.age), mu = tri(params.muscle), we = tri(params.weight);
  const hMax = Math.max(0, params.height * 2 - 1), hMin = Math.max(0, 1 - params.height * 2);
  const out: [number, number][] = [];
  for (const s of SEXES) for (const a of AGES) {
    const ga = g[s] * age[a];
    if (ga <= 1e-6) continue;
    for (const m of LEVELS) for (const w of LEVELS) {
      const k = ga * mu[m] * we[w];
      if (k > 1e-6) out.push([corners.indexOf(`${s}/${a}/${m}muscle/${w}weight`), k]);
    }
    if (hMin > 0) out.push([corners.length + heights.indexOf(`${s}/${a}/minheight`), ga * hMin]);
    if (hMax > 0) out.push([corners.length + heights.indexOf(`${s}/${a}/maxheight`), ga * hMax]);
    for (const e of ANCESTRY) {
      const k = ga * params.ancestry[e];
      if (k > 1e-6) out.push([corners.length + heights.length + ethnic.indexOf(`${s}/${a}/${e}`), k]);
    }
  }
  return out;
}

// ---- Evaluation ------------------------------------------------------------------------------------------------------------------

/** Evaluate a body in its rest pose. */
export function createHumanBody(model: HumanBodyModel, input: HumanParams = {}): HumanBody {
  const params = resolveHumanParams(input);
  const { points: n, body, eyes } = model.header.counts;
  const q = model.header.quant, stride = n * 3;
  const pts = new Float32Array(stride);
  for (const [node, w] of latticeWeights(model, params)) {
    const off = node * stride, k = w * q;
    for (let i = 0; i < stride; i++) pts[i] += model.positions[off + i] * k;
  }
  // re-ground on the lowest body point
  const renderCount = body + eyes;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < body; i++) { const y = pts[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  let s = 1;
  if (params.stature && params.stature > 0) s = params.stature / (maxY - minY);
  else if (params.growthCurve) {
    // CDC length/stature for age (1–20 y); adults keep the age-20 value and lose about 1 mm a year after 40.
    // Sexes between 0 and 1 blend the two curves.
    const pct = normalCdf((params.height - 0.5) * 4), a = Math.min(20, params.age);
    let mm = statureForAge("female", a, pct) * (1 - params.sex) + statureForAge("male", a, pct) * params.sex;
    if (params.age > 40) mm -= params.age - 40;
    s = mm / 1000 / (maxY - minY);
  }
  for (let i = 0; i < n; i++) { pts[i * 3] *= s; pts[i * 3 + 1] = (pts[i * 3 + 1] - minY) * s; pts[i * 3 + 2] *= s; }
  return { model, params, points: pts, renderCount, faces: model.faces, bones: model.header.bones, stature: (maxY - minY) * s };
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return 0.5 * (1 + Math.sign(z) * e);
}

export const pointOf = (pts: ArrayLike<number>, i: number): Vec3 => [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]];

/** Named landmark positions (metres) from any evaluated or posed point array. */
export function humanLandmarks(body: Pick<HumanBody, "model">, pts: ArrayLike<number>): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  for (const [name, i] of Object.entries(body.model.header.landmarks)) out[name] = pointOf(pts, i);
  return out;
}

/** Joint positions: each bone's head and tail. */
export function humanJoints(body: Pick<HumanBody, "bones">, pts: ArrayLike<number>): Record<string, { head: Vec3; tail: Vec3 }> {
  const out: Record<string, { head: Vec3; tail: Vec3 }> = {};
  for (const b of body.bones) out[b.id] = { head: pointOf(pts, b.head), tail: pointOf(pts, b.tail) };
  return out;
}

// ---- Population presets -------------------------------------------------------------------------------------------------------------

export interface HumanPreset { id: string; label: string; params: HumanParams }
/** A spread of people for line-ups, model sheets and tests: ages, sexes and builds. */
export const HUMAN_PRESETS: readonly HumanPreset[] = [
  { id: "toddler", label: "Toddler, 2 y", params: { age: 2, sex: 0.5 } },
  { id: "girl-6", label: "Girl, 6 y", params: { age: 6, sex: 0 } },
  { id: "boy-10", label: "Boy, 10 y", params: { age: 10, sex: 1 } },
  { id: "girl-14", label: "Girl, 14 y", params: { age: 14, sex: 0 } },
  { id: "boy-16", label: "Boy, 16 y", params: { age: 16, sex: 1, muscle: 0.55 } },
  { id: "woman-25", label: "Woman, 25", params: { age: 25, sex: 0 } },
  { id: "man-25", label: "Man, 25", params: { age: 25, sex: 1 } },
  { id: "woman-athletic", label: "Woman, athletic", params: { age: 28, sex: 0, muscle: 0.85, weight: 0.4 } },
  { id: "man-athletic", label: "Man, athletic", params: { age: 28, sex: 1, muscle: 0.9, weight: 0.45 } },
  { id: "woman-lean", label: "Woman, lean", params: { age: 30, sex: 0, muscle: 0.4, weight: 0.15 } },
  { id: "man-heavy", label: "Man, heavy", params: { age: 40, sex: 1, muscle: 0.45, weight: 0.95 } },
  { id: "woman-heavy", label: "Woman, heavy", params: { age: 40, sex: 0, muscle: 0.45, weight: 0.9 } },
  { id: "woman-50", label: "Woman, 50", params: { age: 50, sex: 0, weight: 0.6 } },
  { id: "man-50", label: "Man, 50", params: { age: 50, sex: 1, weight: 0.6 } },
  { id: "woman-80", label: "Woman, 80", params: { age: 80, sex: 0, muscle: 0.3 } },
  { id: "man-80", label: "Man, 80", params: { age: 80, sex: 1, muscle: 0.3 } },
];
