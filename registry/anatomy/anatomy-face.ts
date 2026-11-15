/**
 * ANAT1 face study: a measured-average 3D face you can turn, vary within real population ranges and measure.
 *
 * Surface: the MediaPipe canonical face model (468 points, Apache-2.0) in millimetres, +x the face's left, +y up,
 * +z forward. Named craniofacial landmarks map onto its vertices; feature loops (eyelids, lips, brows, face oval,
 * nose) give painters clean curves. Variation is expressed in standard deviations of published norms (Farkas et al.
 * via Al-Sebaei 2015, CC BY), so "a wider nose" stays inside what real faces do. The mask stops at the hairline and
 * has no ears or cranium: combine it with the body's head for full-head work.
 */
import type { Vec3 } from "./anatomy-body";
import type { HumanFrame, MeshSource } from "./anatomy-view";
import faceData from "./data/face-mesh-mediapipe.json";

export const FACE_MESH_SOURCE = faceData.source;
const BASE: readonly Vec3[] = faceData.vertices as Vec3[];
const TRIS = new Uint16Array((faceData.triangles as number[][]).flat());

/** Craniofacial landmark names (Farkas / ISO) → canonical vertex index. Sides are the face's own left/right. */
export const FACE_LANDMARKS = {
  "forehead": 10, "glabella": 9, "sellion": 168, "pronasale": 4, "subnasale": 2, "labiale-superius": 0, "stomion": 13, "labiale-inferius": 17,
  "sublabiale": 18, "pogonion": 199, "menton": 152,
  "exocanthion.R": 33, "endocanthion.R": 133, "endocanthion.L": 362, "exocanthion.L": 263,
  "palpebrale-superius.R": 159, "palpebrale-inferius.R": 145, "palpebrale-superius.L": 386, "palpebrale-inferius.L": 374,
  "cheilion.R": 61, "cheilion.L": 291, "alare.R": 129, "alare.L": 358, "zygion.R": 234, "zygion.L": 454, "gonion.R": 172, "gonion.L": 397,
  "brow-inner.R": 107, "brow-mid.R": 105, "brow-outer.R": 70, "brow-inner.L": 336, "brow-mid.L": 334, "brow-outer.L": 300, "cheekbone.R": 50, "cheekbone.L": 280,
} as const;
export type FaceLandmark = keyof typeof FACE_LANDMARKS;

/** Feature curves as ordered vertex loops (MediaPipe face-mesh connection sets). */
export const FACE_FEATURES: Record<string, { loop: number[]; closed?: boolean }> = {
  "oval": { loop: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109], closed: true },
  "eye-upper.R": { loop: [33, 246, 161, 160, 159, 158, 157, 173, 133] }, "eye-lower.R": { loop: [33, 7, 163, 144, 145, 153, 154, 155, 133] },
  "eye-upper.L": { loop: [263, 466, 388, 387, 386, 385, 384, 398, 362] }, "eye-lower.L": { loop: [263, 249, 390, 373, 374, 380, 381, 382, 362] },
  "brow.R": { loop: [70, 63, 105, 66, 107] }, "brow.L": { loop: [300, 293, 334, 296, 336] },
  "lips-upper": { loop: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291] }, "lips-lower": { loop: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291] },
  "mouth-line": { loop: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308] },
  "nose-bridge": { loop: [168, 6, 197, 195, 5, 4] }, "nose-base": { loop: [129, 98, 97, 2, 326, 327, 358] },
};

/** Published norms (mm, mean ± SD) for young adults. Each set names its source; sample sizes as reported. */
export interface FaceNorm { label: string; n: { female: number; male: number }; source: string;
  female: Partial<Record<FaceMeasureKey, [number, number]>>; male: Partial<Record<FaceMeasureKey, [number, number]>> }
export type FaceMeasureKey = "trN" | "nSn" | "snGn" | "exEn" | "enEn" | "alAl" | "chCh" | "exEx" | "zyZy" | "nGn";
export const FACE_NORMS: Record<string, FaceNorm> = {
  "north-american-white": { label: "North American white (Farkas 2005)", n: { female: 200, male: 109 },
    source: "Farkas et al. 2005 as tabulated in Al-Sebaei, Head & Face Medicine 2015;11:4 (Table 4), CC BY 4.0",
    male: { trN: [67.1, 7.5], nSn: [54.8, 3.3], snGn: [72.6, 4.5], exEn: [31.3, 1.2], enEn: [33.3, 2.7], alAl: [34.9, 2.1] },
    female: { trN: [63.0, 6.0], nSn: [50.6, 3.1], snGn: [64.3, 4.0], exEn: [30.7, 1.2], enEn: [31.8, 2.3], alAl: [31.4, 2.0] } },
  "african-american": { label: "African American (Farkas 2007)", n: { female: 50, male: 50 },
    source: "Farkas et al. 2007 as tabulated in Al-Sebaei 2015 (Table 4), CC BY 4.0",
    male: { trN: [72.0, 7.8], nSn: [51.8, 3.1], snGn: [78.7, 7.3], exEn: [32.9, 1.7], enEn: [35.8, 2.9], alAl: [44.1, 3.4] },
    female: { trN: [67.1, 5.9], nSn: [48.8, 3.7], snGn: [71.5, 5.2], exEn: [32.4, 2.4], enEn: [34.4, 3.4], alAl: [40.1, 3.2] } },
  "saudi": { label: "Saudi, 20–24 y (Al-Sebaei 2015)", n: { female: 93, male: 75 },
    source: "Al-Sebaei, Head & Face Medicine 2015;11:4 (Table 1, direct calliper anthropometry), CC BY 4.0",
    male: { trN: [64.71, 7.51], nSn: [54.12, 4.34], snGn: [65.02, 5.16], exEn: [32.85, 2.73], enEn: [30.30, 3.10], alAl: [36.85, 3.16] },
    female: { trN: [65.46, 6.90], nSn: [53.19, 4.13], snGn: [60.27, 4.62], exEn: [32.41, 3.44], enEn: [30.32, 2.40], alAl: [32.87, 3.29] } },
};

export interface FaceParams {
  /** Norm set the z-scores refer to (default north-american-white) and sex (0 female … 1 male). */
  norm?: keyof typeof FACE_NORMS; sex?: number;
  /** Variation in standard deviations of that norm (about ±2 covers 95% of people). */
  eyeSpacing?: number; eyeWidth?: number; noseWidth?: number; noseLength?: number; lowerFace?: number;
  /** Proportional changes without a norm in the cited sources: 1 = canonical. */
  faceWidth?: number; mouthWidth?: number;
}

export interface FaceStudy {
  /** Vertices in mm. */
  vertices: Vec3[];
  params: FaceParams;
  /** Mesh source in metres for `renderMeshFrame`. */
  mesh: MeshSource;
}

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/** Measure a face (mm) with the same definitions as the norms. */
export function measureFace(v: readonly Vec3[]): Record<FaceMeasureKey, number> {
  const L = (k: FaceLandmark) => v[FACE_LANDMARKS[k]];
  const d = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return {
    trN: NaN, // the mask has no hairline (trichion)
    nSn: d(L("sellion"), L("subnasale")), snGn: d(L("subnasale"), L("menton")),
    exEn: (d(L("exocanthion.R"), L("endocanthion.R")) + d(L("exocanthion.L"), L("endocanthion.L"))) / 2,
    enEn: d(L("endocanthion.R"), L("endocanthion.L")), alAl: d(L("alare.R"), L("alare.L")), chCh: d(L("cheilion.R"), L("cheilion.L")),
    exEx: d(L("exocanthion.R"), L("exocanthion.L")), zyZy: d(L("zygion.R"), L("zygion.L")), nGn: d(L("sellion"), L("menton")),
  };
}

const CANON = measureFace(BASE);

/**
 * Build a face. By default the canonical mask is first fitted to the chosen norm's means (eye width and spacing, nose
 * width and height, lower-face height), so z = 0 is the published average for that group and sex and each z step is
 * one published SD. `calibrate: false` keeps the raw MediaPipe proportions.
 */
export function createFace(p: FaceParams & { calibrate?: boolean } = {}): FaceStudy {
  const norm = FACE_NORMS[p.norm ?? "north-american-white"], sex = Math.min(1, Math.max(0, p.sex ?? 0.5));
  const calibrate = p.calibrate ?? true;
  const nm = (k: FaceMeasureKey): [number, number] | null => {
    const f = norm.female[k], m = norm.male[k];
    if (!f || !m) return null;
    return [f[0] + (m[0] - f[0]) * sex, f[1] + (m[1] - f[1]) * sex];
  };
  /** Target: norm mean + z·SD (calibrated) or canonical + z·SD (raw); canonical when no norm exists. */
  const target = (k: FaceMeasureKey, z = 0) => { const n = nm(k); return n ? (calibrate ? n[0] : CANON[k]) + z * n[1] : CANON[k]; };
  const v: Vec3[] = BASE.map(x => [x[0], x[1], x[2]]);
  const L = (k: FaceLandmark) => v[FACE_LANDMARKS[k]];
  const band = (d: number, inner: number, outer: number) => (d <= inner ? 1 : smooth(1 - (d - inner) / (outer - inner)));
  // 1. vertical proportions: piecewise remap of y through sellion, subnasale and menton
  {
    const ySe = L("sellion")[1], ySn = L("subnasale")[1], yMe = L("menton")[1];
    const ySn2 = ySe - (ySe - ySn) * (target("nSn", p.noseLength) / CANON.nSn);
    const yMe2 = ySn2 - (ySn - yMe) * (target("snGn", p.lowerFace) / CANON.snGn);
    for (const x of v) if (x[1] < ySe) x[1] = x[1] >= ySn ? ySe - (ySe - x[1]) * ((ySe - ySn2) / (ySe - ySn)) : ySn2 - (ySn - x[1]) * ((ySn2 - yMe2) / (ySn - yMe));
  }
  // 2. eye width about each eye centre (whole eye region moves; soft falloff beyond the lids)
  const eyeRegion = (fn: (x: Vec3, w: number, c: Vec3, dir: number) => void) => {
    for (const side of ["R", "L"] as const) {
      const ex = L(`exocanthion.${side}`), en = L(`endocanthion.${side}`);
      const c: Vec3 = [(ex[0] + en[0]) / 2, (ex[1] + en[1]) / 2, (ex[2] + en[2]) / 2], half = Math.abs(ex[0] - en[0]) / 2;
      const snapshot = v.map(q => [q[0], q[1]]);
      v.forEach((x, i) => { const d = Math.hypot(snapshot[i][0] - c[0], (snapshot[i][1] - c[1]) * 1.6); const w = band(d, half * 1.05, half * 2.1); if (w > 0 && x[2] > c[2] - 20) fn(x, w, c, side === "L" ? 1 : -1); });
    }
  };
  const kW = target("exEn", p.eyeWidth) / measureFace(v).exEn;
  if (Math.abs(kW - 1) > 1e-6) eyeRegion((x, w, c) => { x[0] = c[0] + (x[0] - c[0]) * (1 + (kW - 1) * w); x[1] = c[1] + (x[1] - c[1]) * (1 + (kW - 1) * w * 0.6); });
  // 3. eye spacing: shift both eye regions apart
  const dS = target("enEn", p.eyeSpacing) - measureFace(v).enEn;
  if (Math.abs(dS) > 1e-6) eyeRegion((x, w, _c, dir) => { x[0] += dir * w * dS / 2; });
  // 4. nose width about the midline, exact at the alae
  const scaleMid = (k: number, center: Vec3, halfW: number, halfH: number) => {
    if (Math.abs(k - 1) < 1e-6) return;
    const snap = v.map(q => [q[0], q[1], q[2]]);
    v.forEach((x, i) => {
      const [bx, by, bz] = snap[i];
      const w = band(Math.hypot(bx / (halfW * 1.08), (by - center[1]) / halfH), 1, 1.9);
      if (w > 0 && bz > center[2] - 30) x[0] = bx * (1 + (k - 1) * w);
    });
  };
  // two passes: the falloff region overlaps the cheeks, so the first pass lands close and the second lands exact
  for (let pass = 0; pass < 2; pass++) scaleMid(target("alAl", p.noseWidth) / measureFace(v).alAl, L("alare.L"), Math.abs(L("alare.L")[0]), 9);
  // 5. mouth width, 6. overall face width (no cited norms: proportional)
  scaleMid(p.mouthWidth ?? 1, L("stomion"), Math.abs(L("cheilion.L")[0]), 7);
  if (p.faceWidth && p.faceWidth !== 1) for (const x of v) x[0] *= p.faceWidth;
  const pts = new Float32Array(v.length * 3);
  v.forEach((x, i) => { pts[i * 3] = x[0] / 1000; pts[i * 3 + 1] = x[1] / 1000; pts[i * 3 + 2] = x[2] / 1000; });
  return { vertices: v, params: p, mesh: { points: pts, faces: TRIS, pointCount: v.length, renderCount: v.length, eyeStart: v.length, contourFaces: TRIS.length / 3, landmarks: { ...FACE_LANDMARKS }, borders: true } };
}

/** Canonical measurements of the mask itself (mm), for reports. */
export const FACE_CANONICAL_MEASURES = CANON;

/** Feature curves of a rendered face frame in screen space, keeping only the parts that face the camera. */
export function faceFeatureLines(frame: HumanFrame, features = FACE_FEATURES): { id: string; points: [number, number][] }[] {
  const out: { id: string; points: [number, number][] }[] = [];
  for (const [id, f] of Object.entries(features)) {
    const loop = f.closed ? [...f.loop, f.loop[0]] : f.loop;
    let run: [number, number][] = [];
    for (const i of loop) {
      if (frame.vertexFacing[i] > 0.02) run.push([frame.screen[i * 3], frame.screen[i * 3 + 1]]);
      else { if (run.length > 1) out.push({ id, points: run }); run = []; }
    }
    if (run.length > 1) out.push({ id, points: run });
  }
  return out;
}

/** Visible iris diameter, mm (horizontal visible iris diameter of adults ≈ 11.7 ± 0.5; commonly cited clinical value). */
export const IRIS_DIAMETER_MM = 11.7;
/** Eye centre (between the lid corners and the lid midpoints) and the eyeball's forward point, in mm, per side. */
export function eyeCentres(v: readonly Vec3[]): Record<"L" | "R", Vec3> {
  const at = (k: FaceLandmark) => v[FACE_LANDMARKS[k]];
  const c = (s: "L" | "R"): Vec3 => {
    const a = at(`exocanthion.${s}`), b = at(`endocanthion.${s}`), u = at(`palpebrale-superius.${s}`), d = at(`palpebrale-inferius.${s}`);
    return [(a[0] + b[0] + u[0] + d[0]) / 4, (a[1] + b[1]) / 4 + (u[1] + d[1]) / 4, Math.max(u[2], d[2]) + 1];
  };
  return { L: c("L"), R: c("R") };
}
