/**
 * Where the parts of a face go, for a brush drawing. It takes a measured head (468 face-mesh points in mm: ANAT1's
 * `beautifulFace`, or any MediaPipe-ordered set), bends it a little the way ink portraits do, turns it, and returns every
 * line a painter needs from that one posed head. The eyes, nose, mouth, chin, ear and hairline then always share a pose.
 *
 * Head space: mm, x to the subject's left, y up, z toward the viewer. Drawn space: the pen's units, y down.
 */
import { inkSpline } from "./ink-riso-press";
import type { PenPoint } from "./ink-riso-pen";

export type InkVec3 = readonly [number, number, number];
export interface InkHeadSource {
  vertices: readonly InkVec3[];
  faces: ArrayLike<number>;
  eyes: { L: InkVec3; R: InkVec3 };
  /** Head breadth, length and ear-hole-to-top height, mm (default: ANSUR II women). */
  head?: { breadth: number; length: number; top: number };
}
/** A drawn curve as rows of three numbers; what they are is said where it is used. */
export type InkProfile = readonly (readonly [number, number, number])[];
/** How far the drawing departs from the measured face. All 0–1 neutral values mean "as measured". */
export interface InkHeadShape {
  /** Eye size, width and height (default [1.38, 1.1]). */
  eye?: readonly [number, number];
  /** How much of the eye's growth goes outward instead of toward the nose, 0–1 (default 0.72). */
  eyeOut?: number;
  /** How fast the face falls away from its middle to the temples under the eyes and the brows (default 0.64; measured faces run from 0.35 at the lids to 1 at the brows). It shortens the far eye and the far brow, the outer half first. */
  wrap?: number;
  /** How far the eyes are turned against the line through the pupils, degrees (default 2.7): on a bowed, turned head the far one slants more and the near one less. The brows have their own: `brow.roll`. */
  eyeRoll?: number;
  /** How far the outer corner of each eye rises, degrees, beyond the measured face's (default 0). */
  eyeTilt?: number;
  /** How far the lids are open (default 1, calm; 1.2 = wide) and where the eyes look, shares of the iris from the viewer: [toward the subject's near side, down] (default [0, 0.1]). */
  open?: number; gaze?: readonly [number, number];
  mouth?: number;
  nose?: number;
  /** How far the nose stands out beyond the measured one, as a share of its own height off the face (default 0.18). */
  noseHeight?: number;
  /** How far the underside of the nose, and all below it, comes up toward the tip, mm (default 5): a bowed head's nose would hang. */
  noseUnder?: number;
  /** Height of the face from the pupils' line to the chin, as a share of the distance between the outer corners (default 0.93). */
  length?: number;
  /** Width of the face at the cheeks and at the chin (default 1, 1). */
  cheek?: number; chinWidth?: number;
  /** How far everything below the nose's bridge comes up, mm (default 4.6): a shorter nose, a younger face. */
  lift?: number;
  /** How far the mouth moves down from the nose, mm (default 1.4). */
  philtrum?: number;
  /** Height of the lips about their parting (default 1.08). */
  lips?: number;
  /** Brow: height over the eye (default 1), its lift toward the peak (1), thickness (1), and its turn like `eyeRoll` (default -1: the far one lies nearly level on a tipped head). */
  brow?: { height?: number; arch?: number; thick?: number; roll?: number; /** Another brow, seen from the front and drawn once: distance out from the face's middle and height over the brow's level, in spans, then thickness; seven places from the head to the tail. */ form?: InkProfile };
  /** Size of the irises (default 1). */
  iris?: number;
  /** The painted lids, each 1 by default: how tall the opening is drawn, how thick the line on the upper lid is at the corner by the nose and at the outer one, how far that line runs on past the corner, and how far the fold stands off the lid. */
  lids?: { tall?: number; line?: number; lineOut?: number; wing?: number; fold?: number };
  /** Another outline for the face: share of its height, then the place on the far and on the near side, in spans, for a head turned 20°. */
  outline?: InkProfile;
  /** Height of the hairline's peak above the brows, as a share of brow-to-chin (measured faces: about 0.28). Default 0.42. */
  forehead?: number;
  /** Ear size (default 0.76: portraits draw it small and high). With `side` it is not read. */
  ear?: number;
  /** Draws the side of a turned head: a jaw that runs on past its corner up to the ear, and an ear where the turn puts it (default: left out, the near side stays narrow). For a head turned 15° to 40°. */
  side?: InkHeadSide;
}
/** The side of the head, from the jaw's corner back to the ear. Places are in the frame `InkHead.level` reads: 1 = the distance between the irises. */
export interface InkHeadSide {
  /** The jaw: 0 one long soft turn, 1 straight along its foot with a corner under the ear (default 0.5). */
  square?: number;
  /** Where the ear's lobe joins the face: how far from the middle and how far below the eyes (defaults from the turn and the bow of the head: [1.36, 0.55] at 25° and 5°). */
  lobe?: readonly [number, number];
  /** Height of the ear (default 0.87: its top lies level with the brow, its lobe a little above the foot of the nose), and its width as a share of what the turn shows (default 1). */
  ear?: number; earWidth?: number;
}
export interface InkHeadPose {
  /** Degrees. Negative yaw turns the face to the viewer's left; positive pitch bows it; negative roll tips it to the viewer's left. */
  yaw: number; pitch: number; roll: number;
  /** Pen units per mm, and where the point under the nose lands. */
  scale: number; at: PenPoint;
}
export interface InkEyeLines {
  /** The lids' edges, corner by the nose to outer corner; the fold over them. */
  upper: PenPoint[]; lower: PenPoint[]; crease: PenPoint[];
  /** The line on the upper lid: its top, from the point inside the corner (`line[0]`) to the one past the outer corner; and the under side of what passes it. */
  line: PenPoint[]; wing: PenPoint[];
  iris: PenPoint; rx: number; ry: number; dir: 1 | -1;
}
/** Head to tail; `mid` runs between them and on to the tail's point. */
export interface InkBrowLines { lower: PenPoint[]; upper: PenPoint[]; mid: PenPoint[] }
export interface InkHead {
  /** Pen units per mm, and the yaw it was posed at, degrees. */
  unit: number; yaw: number;
  /** Landmark by face-mesh index. */
  p(index: number): PenPoint;
  /** Any point of head space. */
  at(v: InkVec3): PenPoint;
  /** A point of the face's own flat frame: origin between the pupils, u toward the near eye, v down the face, 1 = `span`. */
  face(u: number, v: number): PenPoint;
  /** The same, the other way round. */
  local(q: PenPoint): PenPoint;
  /** Distance between the outer corners of the eyes, pen units. */
  span: number;
  /** The frame portraits are measured in: the irises level, the origin between them, 1 = the distance between them, y down. Read a place off a portrait laid out the same way and it is the same place here. */
  level(x: number, y: number): PenPoint;
  /** The same, the other way round. */
  fromLevel(q: PenPoint): PenPoint;
  /** A point on the skull: longitude from the face's middle toward the near side, latitude up, degrees; `lift` mm off it. */
  skull(lon: number, lat: number, lift?: number): PenPoint;
  /** The other way round: the place on the viewer's side of the skull, `lift` mm off it, that a point of the drawing lies on. */
  onSkull(q: PenPoint, lift?: number): [lon: number, lat: number, lift: number];
  /** Is that side of the skull turned to the viewer? */
  facing(lon: number, lat: number): number;
  /** The same point in head space, mm; and how near the viewer a point of head space is, mm. */
  scalp(lon: number, lat: number, lift?: number): InkVec3;
  depth(v: InkVec3): number;
  /** Does the head, with hair of that thickness on it, stand between this point and the viewer? */
  hides(v: InkVec3, lift?: number): boolean;
  eyes: { near: InkEyeLines; far: InkEyeLines };
  brows: { near: InkBrowLines; far: InkBrowLines };
  /** Far temple down to the lowest point of the chin. */
  contour: PenPoint[];
  /** Chin along the jaw to the near ear. */
  jaw: PenPoint[];
  /** Near ear: outline from its top front round the rim to the lobe and back; and the inner ridge. */
  ear: PenPoint[]; earRidge: PenPoint[];
  /** What is drawn inside an ear seen from the side, with `side`: the inner edge of the rim, the fold before it down to the notch, the bowl between fold and cheek, the flap before the bowl, and where the lobe joins the face. */
  earParts?: { rim: PenPoint[]; fold: PenPoint[]; bowl: PenPoint[]; flap: PenPoint[]; join: PenPoint };
  /** Far temple over the peak to the near temple. */
  hairline: PenPoint[];
  lips: { upper: PenPoint[]; lower: PenPoint[]; line: PenPoint[] };
  nose: { tip: PenPoint; base: PenPoint; wingNear: PenPoint[]; wingFar: PenPoint[]; nostrilNear: PenPoint[]; nostrilFar: PenPoint[] };
  nearSide: "L" | "R";
  /** Height of the hairline's peak in the face's frame. */
  peak: number;
  /** The mid-line from the brows to the chin. */
  axis: PenPoint[];
}
const IDX = {
  L: { lid: [362, 263], wing: [437, 279, 331, 294, 327], nostril: [458, 459, 309, 392, 289, 290] },
  R: { lid: [133, 33], wing: [217, 49, 102, 64, 98], nostril: [238, 239, 79, 166, 59, 60] },
} as const;
// Read by hand off ink portraits and kept between them, in spans: see INK_FACE_RANGE.
/**
 * Share of the face's height, then the outline's place on the far and near side, for a head turned 20°. The far cheek falls nearly straight
 * to the level of the nose's foot, turns, and runs straight to the chin. The near jaw is one straight run at about 30°, from beside the
 * chin to its corner below the ear, and only there turns up: a jaw that leaves the chin in an arc reads as an egg.
 */
const OUTLINE = [[-0.26, -0.545, 0.786], [-0.1, -0.52, 0.786], [0, -0.507, 0.783], [0.1, -0.497, 0.777], [0.2, -0.488, 0.769], [0.3, -0.474, 0.759], [0.4, -0.449, 0.749], [0.5, -0.414, 0.736], [0.57, -0.379, 0.712], [0.64, -0.338, 0.664], [0.7, -0.301, 0.602], [0.76, -0.26, 0.525], [0.82, -0.216, 0.438], [0.88, -0.171, 0.337], [0.93, -0.136, 0.242], [0.96, -0.112, 0.177], [0.985, -0.07, 0.112], [1, 0.01, 0.01]] as const;
/** Along the eye from the corner by the nose: height of the upper lid's edge, of the lower lid's, and of the top of the line painted on the upper lid. The edge is highest a little inside the middle and slopes to the corner; the line gets thicker as fast, so its top runs level. */
const LIDS = [[0, 0.02, 0.017, 0.031], [0.05, 0.0295, 0.0095, 0.0415], [0.14, 0.0445, -0.001, 0.058], [0.26, 0.0575, -0.016, 0.0755], [0.42, 0.0615, -0.0325, 0.0855], [0.57, 0.058, -0.0415, 0.0865], [0.74, 0.0475, -0.036, 0.0805], [0.88, 0.034, -0.0185, 0.071], [1, 0.014, 0.014, 0.06]] as const;
/** Where the line starts, inside the corner; how it ends past the outer one, its under side and its top. */
const TIP = [-0.085, 0.0185] as const, WING = [[1, 0.014, 0.06], [1.07, 0.027, 0.0545], [1.13, 0.036, 0.048], [1.19, 0.0425, 0.0435]] as const;
/** The fold over the lid, a short line well clear of it. */
const FOLD = [[0.08, 0.098], [0.2, 0.115], [0.35, 0.1265], [0.52, 0.1305], [0.68, 0.125], [0.82, 0.112], [0.93, 0.094]] as const;
/** From the front: distance from the face's middle and height over the brow's level, in spans, then its thickness. A low rise to a peak two thirds out, then a tail that comes down to about its head's height. */
const BROW = [[0.153, -0.024, 0.66], [0.235, -0.01, 1], [0.32, 0.005, 1.1], [0.4, 0.017, 1.02], [0.465, 0.018, 0.8], [0.53, 0.006, 0.46], [0.588, -0.016, 0.02]] as const;
/** Points along the measured brows: they set how far forward the brows' mask stands. */
const BROW_POINTS = [66, 105, 63, 70, 296, 334, 293, 300] as const;
/** Far temple to near temple: level across the forehead, a corner on each side, then straight down the near temple. Height runs from the brows (0) to the peak (1). */
const HAIRLINE = [[-0.56, -0.24], [-0.563, 0.111], [-0.54, 0.38], [-0.482, 0.614], [-0.397, 0.824], [-0.267, 0.941], [-0.085, 0.97], [0.084, 0.959], [0.181, 0.894], [0.259, 0.772], [0.376, 0.567], [0.513, 0.327], [0.643, 0.094], [0.722, -0.158], [0.744, -0.45], [0.754, -0.801], [0.757, -1.081]] as const;
/**
 * The near jaw of a turned head from the chin to the ear's lobe: share of the way back, share of the way up. Read by hand off turned heads
 * by different hands, drawn, painted and photographed. All of them run on past the corner and meet the lobe: a jaw that stops at a corner
 * under the cheek reads as a mask.
 */
const JAW = {
  soft: [[0.11, 0.014], [0.22, 0.046], [0.36, 0.115], [0.52, 0.215], [0.69, 0.36], [0.83, 0.55], [0.92, 0.755], [0.975, 0.9], [1, 1]],
  square: [[0.1, 0.016], [0.22, 0.06], [0.384, 0.15], [0.53, 0.26], [0.69, 0.405], [0.836, 0.567], [0.925, 0.72], [0.985, 0.9], [1, 1]],
} as const;
/** The near ear of a head turned 25° and bowed 5°, its lobe joined to the face at `join`: from the top front round the rim and the lobe; then what lies inside. The front is covered by the cheek, or by hair. */
const EAR = {
  join: [1.36, 0.55], height: 0.9,
  outer: [[1.47, -0.02], [1.5, -0.14], [1.555, -0.235], [1.64, -0.29], [1.74, -0.285], [1.83, -0.215], [1.885, -0.1], [1.895, 0.03], [1.86, 0.16], [1.79, 0.29], [1.705, 0.4], [1.63, 0.485], [1.56, 0.56], [1.48, 0.61], [1.405, 0.605], [1.36, 0.55]], front: [[1.365, 0.36], [1.39, 0.16], [1.43, 0.04]],
  rim: [[1.555, -0.01], [1.585, -0.12], [1.655, -0.19], [1.74, -0.18], [1.8, -0.1], [1.812, 0.02], [1.782, 0.14], [1.72, 0.255], [1.65, 0.35]],
  fold: [[1.655, -0.08], [1.7, 0.01], [1.7, 0.12], [1.655, 0.22], [1.59, 0.305], [1.53, 0.37], [1.49, 0.415]],
  bowl: [[1.6, 0.03], [1.66, 0.04], [1.69, 0.11], [1.65, 0.215], [1.588, 0.298], [1.528, 0.362], [1.488, 0.4], [1.464, 0.36], [1.49, 0.31], [1.496, 0.25], [1.474, 0.175], [1.5, 0.1], [1.55, 0.045]],
  flap: [[1.44, 0.09], [1.47, 0.17], [1.495, 0.25], [1.488, 0.315], [1.46, 0.35]],
} as const;
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function poseInkHead(src: InkHeadSource, pose: InkHeadPose, shape: InkHeadShape = {}): InkHead {
  const { eye: [ex, ey] = [1.38, 1.1], eyeOut = 0.72, wrap = 0.64, eyeRoll = 2.7, eyeTilt = 0, open = 1, gaze = [0, 0.1], mouth = 0.7, nose = 0.69, noseHeight = 0.18, noseUnder = 5, length = 0.93, cheek = 1, chinWidth = 1, lift = 4.6, philtrum = 1.4, lips = 1.08, brow = {}, forehead = 0.42, ear: earSize = 0.76, iris = 1, lids = {}, outline = OUTLINE, side } = shape;
  const { tall: lidTall = 1, line: lidLine = 1, lineOut = lidLine, wing: wingLong = 1, fold: foldUp = 1 } = lids, browForm: InkProfile = brow.form ?? BROW;
  const V = src.vertices, mid = (a: number, b: number): InkVec3 => [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2];
  const mouthAt = mid(61, 291), noseY = (V[4][1] + V[2][1]) / 2, chinY = V[152][1], lipY = V[17][1], browY = (V[105][1] + V[334][1]) / 2, bridgeY = V[6][1];
  // ---- the painter's bend: each pull fades out with distance, so nothing near it is torn
  const bend = (v: InkVec3): InkVec3 => {
    let [x, y, z] = v;
    // A higher bridge and tip: the nose's own height off the plane from the brows to the lip, stretched.
    { const t = Math.max(0, Math.min(1, (browY - v[1]) / (browY - V[164][1]))), plane = V[9][2] + (V[164][2] - V[9][2]) * t, h = v[2] - plane; if (h > 0) z += noseHeight * h * Math.exp(-((v[0] / 13) ** 2)) * smooth(0, 0.16, t) * smooth(1.08, 0.94, t); }
    for (const s of ["L", "R"] as const) {
      const c = src.eyes[s], sg = Math.sign(c[0]), w = Math.exp(-(((v[0] - c[0]) / 27) ** 2 + ((v[1] - c[1]) / 13) ** 2)), ox = c[0] - sg * 14 * eyeOut;
      x += (v[0] - ox) * (ex - 1) * w; y += (v[1] - c[1]) * (ey - 1) * w;
    }
    const m = Math.exp(-((v[0] / 30) ** 2 + ((v[1] - mouthAt[1]) / 14) ** 2)), n = Math.exp(-((v[0] / 22) ** 2 + ((v[1] - noseY) / 15) ** 2));
    x *= 1 + (mouth - 1) * m; x *= 1 + (nose - 1) * n;
    { const u = v[1] - mouthAt[1]; y += (lips - 1) * (u > 0 ? 1.4 : 0.7) * u * Math.exp(-((u / 15) ** 2)) * smooth(34, 22, Math.abs(v[0])); }
    y -= philtrum * smooth(V[2][1], V[0][1], v[1]) * smooth(chinY + 6, lipY, v[1]) * smooth(42, 26, Math.abs(v[0]));
    y += lift * smooth(bridgeY, noseY + 4, v[1]) + noseUnder * smooth(V[4][1], V[2][1], v[1]);
    return [x, y, z];
  };
  const rad = Math.PI / 180, cy = Math.cos(pose.yaw * rad), sy = Math.sin(pose.yaw * rad), cp = Math.cos(pose.pitch * rad), sp = Math.sin(pose.pitch * rad), cr = Math.cos(pose.roll * rad), sr = Math.sin(pose.roll * rad);
  const turn = (v: InkVec3): InkVec3 => { const x = v[0] * cy + v[2] * sy, z0 = -v[0] * sy + v[2] * cy; return [x, v[1] * cp - z0 * sp, v[1] * sp + z0 * cp]; };
  const flat = (v: InkVec3): PenPoint => { const w = turn(v), k = 1 / (1 - (w[2] - 40) / 1100); return [w[0] * k, -w[1] * k]; };
  const base = flat(bend(V[2]));
  const place = (q: PenPoint): PenPoint => { const x = (q[0] - base[0]) * pose.scale, y = (q[1] - base[1]) * pose.scale; return [pose.at[0] + x * cr - y * sr, pose.at[1] + x * sr + y * cr]; };
  const at = (v: InkVec3) => place(flat(v)), p = (i: number) => at(bend(V[i]));
  const nearSide: "L" | "R" = pose.yaw <= 0 ? "L" : "R", farSide = nearSide === "L" ? "R" : "L", ns = Math.sign(src.eyes[nearSide][0]);
  // ---- skull
  const H = src.head ?? { breadth: 147.8, length: 189.8, top: 126.5 }, tragionY = ((src.eyes.L[1] + src.eyes.R[1]) / 2 + V[2][1]) / 2 - 2, top = tragionY + H.top, ry = (top - tragionY + 45) / 2, cY = top - ry, rz = H.length / 2, cZ = V[9][2] - 6 - rz, rx = H.breadth / 2;
  const ball = (lon: number, lat: number, off: number): InkVec3 => { const a = lon * rad, b = lat * rad; return [ns * (rx + off) * Math.cos(b) * Math.sin(a), cY + (ry + off) * Math.sin(b), cZ + (rz + off) * Math.cos(b) * Math.cos(a)]; };
  const skull = (lon: number, lat: number, off = 0) => at(ball(lon, lat, off));
  const onSkull = (q: PenPoint, off = 0): [number, number, number] => {
    let lon = -pose.yaw * ns, lat = 30;
    for (let i = 0; i < 30; i++) {
      const c = skull(lon, lat, off), a = skull(lon + 0.2, lat, off), b = skull(lon, lat + 0.2, off), m = [(a[0] - c[0]) / 0.2, (b[0] - c[0]) / 0.2, (a[1] - c[1]) / 0.2, (b[1] - c[1]) / 0.2], D = m[0] * m[3] - m[1] * m[2] || 1e-6, x = q[0] - c[0], y = q[1] - c[1];
      lon += Math.max(-12, Math.min(12, (x * m[3] - y * m[1]) / D)); lat = Math.max(-80, Math.min(88, lat + Math.max(-12, Math.min(12, (y * m[0] - x * m[2]) / D))));
      if (Math.hypot(x, y) < 1e-3) break;
    }
    return [lon, lat, off];
  };
  const facing = (lon: number, lat: number) => { const q = ball(lon, lat, 0), n: InkVec3 = [q[0] / rx ** 2, (q[1] - cY) / ry ** 2, (q[2] - cZ) / rz ** 2], l = Math.hypot(...n); return turn(n)[2] / l; };
  const eye = [turn([1, 0, 0])[2], turn([0, 1, 0])[2], turn([0, 0, 1])[2]] as InkVec3;
  const hides = (v: InkVec3, off = 0) => {
    const R: InkVec3 = [rx + off, ry + off, rz + off], q: InkVec3 = [v[0] / R[0], (v[1] - cY) / R[1], (v[2] - cZ) / R[2]], d: InkVec3 = [eye[0] / R[0], eye[1] / R[1], eye[2] / R[2]];
    const a = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, b = q[0] * d[0] + q[1] * d[1] + q[2] * d[2], D = b * b - a * (q[0] ** 2 + q[1] ** 2 + q[2] ** 2 - 1);
    return D > 0 && -b + Math.sqrt(D) > 1e-6;
  };
  // ---- the face's own frame
  const corner = { near: [p(IDX[nearSide].lid[0]), p(IDX[nearSide].lid[1])] as const, far: [p(IDX[farSide].lid[0]), p(IDX[farSide].lid[1])] as const }, pn = at(bend(src.eyes[nearSide])), pf = at(bend(src.eyes[farSide]));
  const fl = Math.hypot(pn[0] - pf[0], pn[1] - pf[1]), fx: PenPoint = [(pn[0] - pf[0]) / fl, (pn[1] - pf[1]) / fl], dn = Math.sign(fx[0]) || 1, fy: PenPoint = [-fx[1] * dn, fx[0] * dn], fo: PenPoint = [(pn[0] + pf[0]) / 2, (pn[1] + pf[1]) / 2], span = (corner.near[1][0] - corner.far[1][0]) * fx[0] + (corner.near[1][1] - corner.far[1][1]) * fx[1];
  const face = (u: number, v: number): PenPoint => [fo[0] + span * (u * fx[0] + v * fy[0]), fo[1] + span * (u * fx[1] + v * fy[1])];
  const local = (q: PenPoint): PenPoint => { const x = (q[0] - fo[0]) / span, y = (q[1] - fo[1]) / span; return [x * fx[0] + y * fx[1], x * fy[0] + y * fy[1]]; };
  // ---- eyes and brows: drawn once, from the front, on a mask that falls away from the face's middle, then turned with the head.
  // The far ones are not redrawn: the turn shortens them, the outer half first, so the lid comes down to its corner sooner and the brow keeps one straight rise and a short tail.
  const cL = bend(V[IDX.L.lid[1]]), cR = bend(V[IDX.R.lid[1]]), front = Math.abs(cL[0] - cR[0]), eyeY = (src.eyes.L[1] + src.eyes.R[1]) / 2, lidZ = (src.eyes.L[2] + src.eyes.R[2]) / 2, browZ = BROW_POINTS.reduce((t, i) => t + V[i][2] + (wrap * V[i][0] ** 2) / front, 0) / BROW_POINTS.length;
  /** A place seen from the front, in spans: f out from the middle, h up from the eyes' level; `z` mm is the mask's middle. */
  const mask = (side: "near" | "far", f: number, h: number, z: number): PenPoint => local(at([(side === "near" ? ns : -ns) * f * front, eyeY + h * front, z - wrap * f * f * front]));
  /** The same, turned about a middle of its own. */
  const rolled = (side: "near" | "far", z: number, o: PenPoint, roll: number) => { const m = mask(side, o[0], o[1], z), c = Math.cos(roll * rad), n = Math.sin(roll * rad); return (f: number, h: number): PenPoint => { const q = mask(side, f, h, z), u = q[0] - m[0], v = q[1] - m[1]; return face(m[0] + u * c - v * n, m[1] + u * n + v * c); }; };
  const lidAt = { a: [Math.abs(bend(V[IDX.L.lid[0]])[0]) / front, (bend(V[IDX.L.lid[0]])[1] - eyeY) / front], b: [0.5, (cL[1] - eyeY) / front - 0.012] };
  if (eyeTilt) { const { a, b } = lidAt, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = Math.cos(eyeTilt * rad), n = Math.sin(eyeTilt * rad); for (const q of [a, b]) { const x = q[0] - m[0], y = q[1] - m[1]; q[0] = m[0] + x * c - y * n; q[1] = m[1] + x * n + y * c; } }
  const eyeLines = (side: "near" | "far"): InkEyeLines => {
    const { a, b } = lidAt, l = Math.hypot(b[0] - a[0], b[1] - a[1]), n: PenPoint = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], put = rolled(side, lidZ, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], eyeRoll), r = 0.074 * iris;
    // the drawn eye keeps clear of both ends of its socket: the lid's line and its lashes fill the outer one
    const on = (t: number, h: number) => { const s = 0.08 + 0.87 * t, k = h * lidTall; return put(a[0] + (b[0] - a[0]) * s + n[0] * k, a[1] + (b[1] - a[1]) * s + n[1] * k); };
    // the top of the painted line, and the line past the corner
    const top = (t: number, edge: number, over: number) => edge + (over - edge) * (lidLine + (lineOut - lidLine) * Math.max(0, Math.min(1, t))), out = (t: number) => 1 + (t - 1) * wingLong, at1 = WING[0][1];
    // what the lids' opening adds to the upper one
    const raise = (t: number) => { const j = Math.max(1, LIDS.findIndex(q => q[0] >= Math.min(1, t) - 1e-9)), x = LIDS[j], y = LIDS[j - 1], k = Math.max(0, Math.min(1, (t - y[0]) / (x[0] - y[0]))); return (open - 1) * (y[1] - y[2] + (x[1] - x[2] - y[1] + y[2]) * k); };
    // an eye that looks at the viewer shows its iris straight over the middle of the ball, which lies behind the lids
    const c = src.eyes[side === "near" ? nearSide : farSide], ball = local(at([bend(c)[0] * 0.97, eyeY + 0.022 * front, lidZ - 0.142 * front]));
    return {
      upper: LIDS.map(q => on(q[0], q[1] + raise(q[0]))), lower: LIDS.map(q => on(q[0], q[2])), crease: inkSpline(FOLD, 0.04).map(q => on(q[0], foldUp === 1 ? q[1] + raise(q[0]) : 0.06 + (q[1] - 0.06) * foldUp + raise(q[0]))),
      line: [on(TIP[0], TIP[1]), ...LIDS.map(q => on(q[0], top(q[0], q[1], q[3]) + raise(q[0]))), ...WING.slice(1).map(q => on(out(q[0]), wingLong === 1 ? top(1, q[1], q[2]) : at1 + (top(1, q[1], q[2]) - at1) * wingLong))], wing: WING.map(q => on(out(q[0]), wingLong === 1 ? q[1] : at1 + (q[1] - at1) * wingLong)),
      iris: face(ball[0] + gaze[0] * r, ball[1] + gaze[1] * r), rx: r * span * (side === "near" ? 1 : 0.97), ry: r * span, dir: (Math.sign(corner[side][1][0] - corner[side][0][0]) || 1) as 1 | -1,
    };
  };
  const browLines = (side: "near" | "far"): InkBrowLines => {
    const tall = 0.235 * (brow.height ?? 1), arch = brow.arch ?? 1, th = 0.027 * (brow.thick ?? 1), put = rolled(side, browZ, [browForm[3][0], tall], brow.roll ?? -1);
    const on = (i: number, e: number) => put(browForm[i][0], tall + browForm[i][1] * arch - e * browForm[i][2] * th);
    const n = browForm.length;
    return { lower: browForm.slice(0, n - 1).map((_, i) => on(i, 1)), upper: browForm.slice(0, n - 1).map((_, i) => on(i, -1)), mid: browForm.map((_, i) => on(i, 0)) };
  };
  // ---- the frame portraits are measured in
  const eyes = { near: eyeLines("near"), far: eyeLines("far") }, [iF, iN] = [eyes.far.iris, eyes.near.iris], lo: PenPoint = [(iF[0] + iN[0]) / 2, (iF[1] + iN[1]) / 2], lx: PenPoint = [iN[0] - iF[0], iN[1] - iF[1]], ly: PenPoint = [-lx[1] * dn, lx[0] * dn], ll = lx[0] ** 2 + lx[1] ** 2;
  const level = (x: number, y: number): PenPoint => [lo[0] + x * lx[0] + y * ly[0], lo[1] + x * lx[1] + y * ly[1]], fromLevel = (q: PenPoint): PenPoint => { const x = q[0] - lo[0], y = q[1] - lo[1]; return [(x * lx[0] + y * lx[1]) / ll, (x * ly[0] + y * ly[1]) / ll]; };
  // ---- outline: it hangs on the features, so it keeps its taper at any size; a little more near side shows as the head turns
  // One curve, temple to chin to hinge, so the chin has no corner of its own.
  const more = Math.abs(pose.yaw) - 20, edge = (side: 1 | 2) => outline.map(q => { const low = smooth(0.55, 1, q[0]), c = -0.03, w = (q[side] - c) * (1 + (cheek - 1) * (1 - low) + (chinWidth - 1) * low); return face(c + w + (side === 1 ? 0.005 : 0.009) * more * (1 - low), q[0] * length); });
  // With `side`, the near half is read in the level frame, from the chin to where the lobe joins the face.
  const turned = Math.abs(pose.yaw), join: PenPoint = side?.lobe ?? [EAR.join[0] + 1.06 * (Math.tan(turned * rad) - Math.tan(25 * rad)), EAR.join[1] + 0.014 * (5 - pose.pitch)], far = edge(1);
  const near = (k: number): PenPoint[] => { const c = fromLevel(far[far.length - 1]); return JAW.soft.map((q, i) => { const a = q[0] + (JAW.square[i][0] - q[0]) * k, b = q[1] + (JAW.square[i][1] - q[1]) * k; return level(c[0] + a * (join[0] - 0.012 - c[0]), c[1] + b * (join[1] + 0.02 - c[1])); }); };
  const round = inkSpline([...far, ...(side ? near(side.square ?? 0.5) : edge(2).reverse().slice(1))], 0.5).map(q => [q[0], q[1]] as const), chin = round.reduce((b, q, i) => (local(q)[1] > local(round[b])[1] ? i : b), 0);
  const contour = round.slice(0, chin + 1), jaw = side ? round.slice(chin) : round.slice(chin).filter(q => local(q)[1] > 0.16);
  // ---- ear: a plate standing off the skull behind the jaw's hinge
  const eTop = browY - 4, len = (browY - V[2][1] - lift) * earSize, eBot = eTop - len, vm = (eTop + eBot) / 2, O: InkVec3 = [ns * (rx - 3), vm, cZ + rz * 0.08 + 14], raw = (u: number, v: number) => at([O[0] + ns * 0.5 * u * 2.6 * earSize, v, O[2] - 0.866 * u * 2.6 * earSize]);
  // it stands on the jaw's line, not on the skull's width
  const lobe = local(raw(3, eBot)), hinge = local(jaw[jaw.length - 1]), dx = hinge[0] + 0.015 - lobe[0], dy = hinge[1] + 0.05 - lobe[1], earAt = (u: number, v: number): PenPoint => { const q = local(raw(u, v)); return face(q[0] + dx, q[1] + dy); };
  // with `side`, where the turn of the head puts it: read off turned heads, it is taller and stands much farther from the eye
  const tall = (side?.ear ?? 0.87) / EAR.height, wide = (tall * (side?.earWidth ?? 1) * Math.sin((turned + 20) * rad)) / Math.sin(45 * rad), turnedEar = (q: readonly (readonly [number, number])[]) => q.map(([x, y]) => level(join[0] + (x - EAR.join[0]) * wide, join[1] + (y - EAR.join[1]) * tall)), run = (q: readonly (readonly [number, number])[]) => inkSpline(turnedEar(q), 0.8).map(r => [r[0], r[1]] as const);
  const earParts = side && { rim: run(EAR.rim), fold: run(EAR.fold), bowl: turnedEar([...EAR.bowl, EAR.bowl[0]]), flap: run(EAR.flap), join: level(...join) };
  const ear = side ? [...run(EAR.outer), ...turnedEar(EAR.front)] : inkSpline(([[0, eTop - len * 0.05], [5, eTop + 2], [10, eTop - len * 0.06], [12.5, eTop - len * 0.25], [11.5, eTop - len * 0.5], [9, eTop - len * 0.74], [6.5, eBot + 4], [4.5, eBot - 0.5], [1.8, eBot - 0.5], [0, eBot + 5]] as const).map(([u, v]) => earAt(u, v)), 2).map(q => [q[0], q[1]] as const);
  const earRidge = earParts ? earParts.fold : ([[4, eTop - len * 0.12], [8, eTop - len * 0.2], [9, eTop - len * 0.42], [7, eTop - len * 0.62], [3.4, eBot + len * 0.28]] as const).map(([u, v]) => earAt(u, v));
  // ---- hairline
  const peak = forehead * (length + 0.23), hairline = inkSpline(HAIRLINE.map(([u, h]) => { const w = u < 0 ? 0.005 : 0.009; return face(u * cheek + w * more + (side && u > 0 ? Math.max(0, local(level(join[0] + 0.06, 0))[0] - u * cheek - w * more) * smooth(0.25, -0.75, h) : 0), -0.23 - h * peak); }), 2).map(q => [q[0], q[1]] as const);
  return {
    unit: pose.scale, yaw: pose.yaw, p, at, face, local, span, level, fromLevel, skull, onSkull, facing, scalp: (lon, lat, off = 0) => ball(lon, lat, off), depth: v => turn(v)[2], hides, nearSide, peak: -0.23 - peak, contour, jaw, ear, earRidge, ...(earParts && { earParts }), hairline,
    eyes, brows: { near: browLines("near"), far: browLines("far") },
    lips: { upper: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291].map(p), lower: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291].map(p), line: [61, 191, 80, 81, 82, 13, 312, 311, 310, 415, 291].map(p) },
    nose: { tip: p(4), base: p(2), wingNear: IDX[nearSide].wing.map(p), wingFar: IDX[farSide].wing.map(p), nostrilNear: IDX[nearSide].nostril.map(p), nostrilFar: IDX[farSide].nostril.map(p) },
    axis: [9, 168, 6, 197, 195, 5, 4, 2, 0, 13, 17, 18, 199, 152].map(p),
  };
}

/** Where hand-read ink portraits sit, as [low, high]: five portraits by different hands, bowed, level and raised. */
export const INK_FACE_RANGE = {
  faceLength: [0.85, 1.07], noseShare: [0.36, 0.49], lipToChin: [0.46, 0.54], philtrumToLips: [0.27, 0.72], eyeGap: [0.88, 1.12], eyeOpening: [0.24, 0.37],
  noseToGap: [0.62, 0.9], mouthWidth: [0.3, 0.44], mouthToNose: [1.33, 1.63], lipsToMouth: [0.41, 0.63], lowerToUpper: [0.82, 1.82], browGap: [0.32, 0.6],
} as const;
export type InkFaceRatio = keyof typeof INK_FACE_RANGE;
/**
 * The proportions of a posed head as it will be drawn, in the same terms as the ranges above: lengths run down the face from the
 * pupils' line; widths are opened up by the yaw; an eye is counted from the end of the mark at its inner corner to the end of its lid's line,
 * which is longer than its opening. Read a reference's own points by hand to compare; a face detector fitted to a drawing puts the
 * chin and the nose's wings where a photograph would have them. The numbers catch a wrong face. They do not certify a beautiful one.
 */
export function inkFaceRatios(head: InkHead): Record<InkFaceRatio, number> {
  const { near, far } = head.eyes, L = head.lips, N = head.nose, rise = [near.iris[0] - far.iris[0], near.iris[1] - far.iris[1]] as const, len = Math.hypot(...rise), ex = rise[0] / len, ey = rise[1] / len, down = Math.sign(ex) || 1, open = Math.cos((head.yaw * Math.PI) / 180);
  const mx = (near.iris[0] + far.iris[0]) / 2, my = (near.iris[1] + far.iris[1]) / 2, X = (q: PenPoint) => ((q[0] - mx) * ex + (q[1] - my) * ey) / open, Y = (q: PenPoint) => down * (-(q[0] - mx) * ey + (q[1] - my) * ex);
  const span = (a: PenPoint, b: PenPoint) => Math.abs(X(a) - X(b)), end = (e: InkEyeLines) => e.wing[e.wing.length - 1], outer = span(end(near), end(far)), eye = (span(end(near), near.line[0]) + span(end(far), far.line[0])) / 2, gap = span(near.line[0], far.line[0]);
  const base = Y(N.base), dip = Y(L.upper[5]), part = Y(L.line[5]), low = Y(L.lower[5]), chin = Y(head.contour[head.contour.length - 1]), wings = [...N.wingNear, ...N.wingFar].map(X), nose = Math.max(...wings) - Math.min(...wings), mouth = span(L.line[0], L.line[10]);
  const height = (e: InkEyeLines) => Math.abs(Y(e.upper[4]) - Y(e.lower[4])), brow = (b: InkBrowLines, e: InkEyeLines) => Y(e.upper[4]) - Y(b.lower[2]);
  return {
    faceLength: chin / outer, noseShare: base / chin, lipToChin: (part - base) / (chin - part), philtrumToLips: (dip - base) / (low - dip), eyeGap: gap / eye, eyeOpening: (height(near) + height(far)) / 2 / eye,
    noseToGap: nose / gap, mouthWidth: mouth / outer, mouthToNose: mouth / nose, lipsToMouth: (low - dip) / mouth, lowerToUpper: (low - part) / (part - dip), browGap: (brow(head.brows.near, near) + brow(head.brows.far, far)) / 2 / eye,
  };
}
