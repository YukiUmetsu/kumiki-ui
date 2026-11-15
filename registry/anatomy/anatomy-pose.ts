/**
 * ANAT1 posing: clinical joint angles → forward kinematics → linear-blend skinning.
 *
 * Angles are anatomical degrees measured the way a goniometer reads them (shoulder flexion 90 = arm straight forward,
 * knee flexion 90 = shin at a right angle). Zero is the anatomical position except where noted (forearm: thumb up;
 * spine and neck: the sculpted relaxed curve). Ranges come from AAOS norms and the CDC normal joint ROM study; see
 * `JOINTS[].dofs[].source`. Poses are clamped to the range by default, so a figure cannot bend the wrong way.
 */
import type { HumanBody, Vec3 } from "./anatomy-body";

export type Dof = "flex" | "abduct" | "twist";
export type JointAngles = Partial<Record<Dof, number>>;
/** Joint id (with `.L` / `.R` for sided joints) → angles. */
export type HumanPose = Record<string, JointAngles>;

export interface DofDef {
  /** Direction the bone tip moves for a positive angle (left side; mirrored for the right). */
  motion: Vec3 | "palm" | "ulnar" | "radial" | "thumb-flex" | "spread";
  /** Twist only: the perpendicular reference that rotates toward `motion`. */
  ref?: Vec3 | "palm";
  min: number; max: number;
  /** Plain names of the negative and positive directions. */
  names: [string, string];
  /** A: AAOS table (verified) · C: CDC measured study · B: commonly cited clinical norm · E: estimate for drawing. */
  source: "A" | "B" | "C" | "E";
}
export interface JointDef {
  id: string; label: string; sided: boolean;
  /** Bones (side-less ids; `.L/.R` appended for sided joints) and the share of the angle each takes. */
  bones: [string, number][];
  /**
   * Neutral: "rest" = the sculpted pose is neutral; "parent" = straight in line with the parent bone (plus `neutral`
   * degrees of flexion, e.g. the ankle's foot ⟂ shin); a vector = an absolute anatomical direction (arms hanging).
   */
  zero: "rest" | "parent" | Vec3;
  neutral?: number;
  dofs: Partial<Record<Dof, DofDef>>;
}

const Z: Vec3 = [0, 0, 1], X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0];
const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

export const JOINTS: readonly JointDef[] = [
  { id: "spine", label: "Trunk (lumbar + thoracic)", sided: false, zero: "rest",
    bones: [["spine05", 0.15], ["spine04", 0.2], ["spine03", 0.25], ["spine02", 0.2], ["spine01", 0.2]],
    dofs: { flex: { motion: Z, min: -25, max: 80, names: ["extension", "flexion"], source: "B" },
      abduct: { motion: X, min: -35, max: 35, names: ["side bend right", "side bend left"], source: "B" },
      twist: { ref: Z, motion: X, min: -45, max: 45, names: ["rotate right", "rotate left"], source: "B" } } },
  { id: "neck", label: "Neck and head", sided: false, zero: "rest",
    bones: [["neck01", 0.3], ["neck02", 0.25], ["neck03", 0.2], ["head", 0.25]],
    dofs: { flex: { motion: Z, min: -45, max: 45, names: ["extension", "flexion"], source: "A" },
      abduct: { motion: X, min: -45, max: 45, names: ["tilt right", "tilt left"], source: "A" },
      twist: { ref: Z, motion: X, min: -60, max: 60, names: ["turn right", "turn left"], source: "A" } } },
  { id: "jaw", label: "Jaw", sided: false, zero: "rest", bones: [["jaw", 1]],
    dofs: { flex: { motion: neg(Z), min: 0, max: 28, names: ["closed", "open"], source: "E" } } },
  { id: "eyes", label: "Gaze", sided: false, zero: "rest", bones: [["eye.L", 1], ["eye.R", 1]],
    dofs: { flex: { motion: Y, min: -30, max: 30, names: ["look down", "look up"], source: "E" },
      abduct: { motion: X, min: -35, max: 35, names: ["look right", "look left"], source: "E" } } },
  { id: "clavicle", label: "Shoulder girdle", sided: true, zero: "rest", bones: [["clavicle", 1]],
    dofs: { abduct: { motion: Y, min: -10, max: 40, names: ["depression", "elevation"], source: "E" },
      flex: { motion: Z, min: -15, max: 20, names: ["retraction", "protraction"], source: "E" } } },
  { id: "shoulder", label: "Shoulder", sided: true, zero: [0, -1, 0], bones: [["upperarm", 1]],
    dofs: { flex: { motion: Z, min: -60, max: 180, names: ["extension", "flexion"], source: "A" },
      abduct: { motion: X, min: -40, max: 180, names: ["adduction", "abduction"], source: "A" },
      twist: { ref: Z, motion: neg(X), min: -90, max: 70, names: ["external rotation", "internal rotation"], source: "B" } } },
  { id: "elbow", label: "Elbow", sided: true, zero: "parent", bones: [["forearm", 1]],
    dofs: { flex: { motion: Z, min: -5, max: 150, names: ["hyperextension", "flexion"], source: "A" } } },
  { id: "forearm", label: "Forearm", sided: true, zero: "rest", bones: [["forearm", 0.35], ["forearm-twist", 0.65]],
    dofs: { twist: { ref: "palm", motion: neg(Z), min: -85, max: 80, names: ["supination", "pronation"], source: "C" } } },
  { id: "wrist", label: "Wrist", sided: true, zero: "parent", bones: [["wrist", 1]],
    dofs: { flex: { motion: "palm", min: -70, max: 80, names: ["extension", "flexion"], source: "A" },
      abduct: { motion: "ulnar", min: -20, max: 30, names: ["radial deviation", "ulnar deviation"], source: "B" } } },
  ...[2, 3, 4, 5].flatMap((f): JointDef[] => {
    const name = ["", "", "Index", "Middle", "Ring", "Little"][f];
    return [
      { id: `finger${f}-mcp`, label: `${name} knuckle (MCP)`, sided: true, zero: "parent", bones: [[`finger${f}-1`, 1]],
        dofs: { flex: { motion: "palm", min: -20, max: 80, names: ["hyperextension", "flexion"], source: "A" },
          abduct: { motion: "spread", min: -10, max: 20, names: ["together", "spread"], source: "E" } } },
      { id: `finger${f}-pip`, label: `${name} middle joint (PIP)`, sided: true, zero: "parent", bones: [[`finger${f}-2`, 1]],
        dofs: { flex: { motion: "palm", min: 0, max: 100, names: ["straight", "flexion"], source: "A" } } },
      { id: `finger${f}-dip`, label: `${name} end joint (DIP)`, sided: true, zero: "parent", bones: [[`finger${f}-3`, 1]],
        dofs: { flex: { motion: "palm", min: 0, max: 80, names: ["straight", "flexion"], source: "A" } } },
    ];
  }),
  { id: "thumb-cmc", label: "Thumb base (CMC)", sided: true, zero: "rest", bones: [["finger1-1", 1]],
    dofs: { abduct: { motion: "palm", min: -10, max: 60, names: ["adduction", "palmar abduction"], source: "A" },
      flex: { motion: "radial", min: -20, max: 60, names: ["across the palm", "radial abduction"], source: "A" } } },
  { id: "thumb-mcp", label: "Thumb knuckle (MCP)", sided: true, zero: "parent", bones: [["finger1-2", 1]],
    dofs: { flex: { motion: "thumb-flex", min: 0, max: 50, names: ["straight", "flexion"], source: "A" } } },
  { id: "thumb-ip", label: "Thumb end joint (IP)", sided: true, zero: "parent", bones: [["finger1-3", 1]],
    dofs: { flex: { motion: "thumb-flex", min: -10, max: 80, names: ["hyperextension", "flexion"], source: "A" } } },
  { id: "hip", label: "Hip", sided: true, zero: [0, -1, 0], bones: [["thigh", 1]],
    dofs: { flex: { motion: Z, min: -20, max: 125, names: ["extension", "flexion"], source: "A" },
      abduct: { motion: X, min: -25, max: 45, names: ["adduction", "abduction"], source: "A" },
      twist: { ref: Z, motion: neg(X), min: -45, max: 45, names: ["external rotation", "internal rotation"], source: "B" } } },
  { id: "knee", label: "Knee", sided: true, zero: "parent", bones: [["shin", 1]],
    dofs: { flex: { motion: neg(Z), min: -3, max: 140, names: ["hyperextension", "flexion"], source: "A" } } },
  { id: "ankle", label: "Ankle", sided: true, zero: "parent", neutral: 90, bones: [["foot", 1]],
    dofs: { flex: { motion: Y, min: -50, max: 20, names: ["plantarflexion", "dorsiflexion"], source: "A" },
      twist: { ref: Y, motion: X, min: -15, max: 35, names: ["eversion", "inversion"], source: "B" } } },
  { id: "toes", label: "Toes (MTP)", sided: true, zero: "rest", bones: [["big-toe", 1], ["toes", 1]],
    dofs: { flex: { motion: neg(Y), min: -70, max: 45, names: ["extension", "flexion"], source: "A" } } },
];

export const ROM_SOURCES = {
  A: "AAOS normal ROM table as reproduced in Hendriks et al., Plast Reconstr Surg Glob Open 2020, SDC 1 (fingers from Richards & Parry).",
  C: "CDC normal joint range of motion study (Soucie et al., Haemophilia 2011), means by sex and age; see CDC_ROM.",
  B: "Commonly cited AAOS/clinical norm not re-verified against a primary table in this pass.",
  E: "Estimate for drawing believable poses; not a clinical norm.",
} as const;

/** CDC normal ROM study means (degrees) by age band and sex — measured, public domain. */
export const CDC_ROM: Record<"2-8" | "9-19" | "20-44" | "45-69", Record<"female" | "male", Record<string, number>>> = {
  "2-8": { female: { hipExtension: 26.2, hipFlexion: 140.8, kneeFlexion: 152.6, kneeExtension: 5.4, ankleDorsiflexion: 24.8, anklePlantarflexion: 67.1, shoulderFlexion: 178.6, elbowFlexion: 152.9, elbowExtension: 6.8, pronation: 84.6, supination: 93.7 },
    male: { hipExtension: 28.3, hipFlexion: 131.1, kneeFlexion: 147.8, kneeExtension: 1.6, ankleDorsiflexion: 22.8, anklePlantarflexion: 55.8, shoulderFlexion: 177.8, elbowFlexion: 151.4, elbowExtension: 2.2, pronation: 79.6, supination: 86.4 } },
  "9-19": { female: { hipExtension: 20.5, hipFlexion: 134.9, kneeFlexion: 142.3, kneeExtension: 2.4, ankleDorsiflexion: 17.3, anklePlantarflexion: 57.3, shoulderFlexion: 171.8, elbowFlexion: 149.7, elbowExtension: 6.4, pronation: 81.2, supination: 90.0 },
    male: { hipExtension: 18.2, hipFlexion: 135.2, kneeFlexion: 142.2, kneeExtension: 1.8, ankleDorsiflexion: 16.3, anklePlantarflexion: 52.8, shoulderFlexion: 170.9, elbowFlexion: 148.3, elbowExtension: 5.3, pronation: 79.8, supination: 87.8 } },
  "20-44": { female: { hipExtension: 18.1, hipFlexion: 133.8, kneeFlexion: 141.9, kneeExtension: 1.6, ankleDorsiflexion: 13.8, anklePlantarflexion: 62.1, shoulderFlexion: 172.0, elbowFlexion: 150.0, elbowExtension: 4.7, pronation: 82.0, supination: 90.6 },
    male: { hipExtension: 17.4, hipFlexion: 130.4, kneeFlexion: 137.7, kneeExtension: 1.0, ankleDorsiflexion: 12.7, anklePlantarflexion: 54.6, shoulderFlexion: 168.8, elbowFlexion: 144.6, elbowExtension: 0.8, pronation: 76.9, supination: 85.0 } },
  "45-69": { female: { hipExtension: 16.7, hipFlexion: 130.8, kneeFlexion: 137.8, kneeExtension: 1.2, ankleDorsiflexion: 11.6, anklePlantarflexion: 56.5, shoulderFlexion: 168.1, elbowFlexion: 148.3, elbowExtension: 3.6, pronation: 80.8, supination: 87.2 },
    male: { hipExtension: 13.5, hipFlexion: 127.2, kneeFlexion: 132.9, kneeExtension: 0.5, ankleDorsiflexion: 11.9, anklePlantarflexion: 49.4, shoulderFlexion: 164.0, elbowFlexion: 143.5, elbowExtension: -0.7, pronation: 77.7, supination: 82.4 } },
};

// ---- Small linear algebra (row-major 3×3) ---------------------------------------------------------------------------------------

type M3 = number[];
const I3 = (): M3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8]];
const tr = (a: M3): M3 => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const app = (m: M3, v: Vec3): Vec3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rad = (d: number) => (d * Math.PI) / 180;
/** Rotation by `angle` (radians) about unit axis `a`. */
export function axisAngle(a: Vec3, angle: number): M3 {
  const [x, y, z] = a, c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}
/** Minimal rotation taking unit vector a onto unit vector b. */
function arc(a: Vec3, b: Vec3): M3 {
  const c = dot(a, b);
  if (c > 0.999999) return I3();
  if (c < -0.999999) return axisAngle(nrm(cross(a, Math.abs(a[0]) < 0.9 ? X : Y)), Math.PI);
  return axisAngle(nrm(cross(a, b)), Math.acos(c));
}
const signedAngle = (from: Vec3, to: Vec3, axis: Vec3) => Math.atan2(dot(cross(from, to), axis), dot(from, to));
const proj = (v: Vec3, axis: Vec3): Vec3 => nrm(sub(v, sc(axis, dot(v, axis))));

// ---- Rig preparation ------------------------------------------------------------------------------------------------------------

interface RigBone { id: string; parent: number; head: Vec3; tail: Vec3 }
interface Prepared {
  bones: RigBone[]; index: Map<string, number>;
  /** Anatomical-rest world rotation per bone (relative to the sculpted rest) and anatomical joint positions. */
  A: M3[]; anatHead: Vec3[]; anatTail: Vec3[];
}
const prepCache = new WeakMap<Float32Array, Prepared>();

function prepare(body: HumanBody): Prepared {
  const hit = prepCache.get(body.points);
  if (hit) return hit;
  const p = body.points, at = (i: number): Vec3 => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  const index = new Map<string, number>();
  const bones: RigBone[] = body.bones.map((b, i) => { index.set(b.id, i); return { id: b.id, parent: -1, head: at(b.head), tail: at(b.tail) }; });
  body.bones.forEach((b, i) => { bones[i].parent = b.parent ? index.get(b.parent)! : -1; });
  // zero rotations (absolute anatomical directions), applied as local deltas in bone order (parents first)
  const zeroDir = new Map<string, Vec3>();
  for (const j of JOINTS) if (Array.isArray(j.zero)) for (const [b] of j.bones) for (const s of j.sided ? [".L", ".R"] : [""]) zeroDir.set(b + s, j.zero as Vec3);
  const A: M3[] = [], anatHead: Vec3[] = [], anatTail: Vec3[] = [];
  bones.forEach((b, i) => {
    const P = b.parent;
    const parentDelta = P < 0 ? I3() : A[P];
    const head = P < 0 ? b.head : add(anatHead[P], app(parentDelta, sub(b.head, bones[P].head)));
    let W = parentDelta;
    const z = zeroDir.get(b.id);
    if (z) { const d = nrm(app(parentDelta, sub(b.tail, b.head))); W = mul(arc(d, z), parentDelta); }
    A[i] = W; anatHead[i] = head; anatTail[i] = add(head, app(W, sub(b.tail, b.head)));
  });
  const prep = { bones, index, A, anatHead, anatTail };
  prepCache.set(body.points, prep);
  return prep;
}

/** Hand frame (in the anatomical rest skeleton): palm normal, ulnar direction (index → little), forward. */
function handFrame(prep: Prepared, side: ".L" | ".R") {
  const g = (id: string) => prep.index.get(id + side)!;
  const wrist = prep.anatHead[g("wrist")];
  const k = nrm(sub(prep.anatTail[g("metacarpal4")], prep.anatTail[g("metacarpal1")]));
  const h = nrm(sub(prep.anatTail[g("metacarpal2")], wrist));
  const palm = nrm(side === ".L" ? cross(k, h) : cross(h, k));
  return { palm, ulnar: k, forward: h };
}

// ---- Posing -----------------------------------------------------------------------------------------------------------------------

export interface PoseOptions {
  /** Clamp every angle to its joint range (default true). */
  clamp?: boolean;
  /** Lift the shoulder girdle as the arm rises above 60° (scapulohumeral rhythm; default true). */
  rhythm?: boolean;
  /** Put the lowest body point on the floor (default true). */
  ground?: boolean;
  /** Whole-body placement after posing: offset (m) and turn about the vertical (degrees). */
  root?: { x?: number; y?: number; z?: number; yaw?: number; pitch?: number; roll?: number };
}

export interface PosedHuman {
  readonly body: HumanBody;
  /** Posed copy of every point (render points, joints, landmarks). */
  readonly points: Float32Array;
  readonly pose: HumanPose;
  /** Angles that were outside their range (before clamping). */
  readonly outOfRange: { joint: string; dof: Dof; value: number; min: number; max: number }[];
}

const jointDef = new Map(JOINTS.map(j => [j.id, j]));
/** Split "shoulder.L" → definition and side. */
export function jointOf(key: string): { def: JointDef; side: "" | ".L" | ".R" } | null {
  const m = /^(.*?)(\.L|\.R)?$/.exec(key)!;
  const def = jointDef.get(m[1]);
  if (!def) return null;
  return { def, side: (m[2] as ".L" | ".R" | undefined) ?? "" };
}

/** Pose a body. Unknown joints are ignored; sided joints need `.L` or `.R`. */
export function poseHumanBody(body: HumanBody, pose: HumanPose = {}, options: PoseOptions = {}): PosedHuman {
  const prep = prepare(body);
  const { bones, index, A, anatHead, anatTail } = prep;
  const clamp = options.clamp ?? true;
  const outOfRange: PosedHuman["outOfRange"] = [];
  const hands = { ".L": handFrame(prep, ".L"), ".R": handFrame(prep, ".R") };
  // effective angles per joint key, with girdle rhythm
  const angles = new Map<string, JointAngles>();
  for (const [key, a] of Object.entries(pose)) {
    const j = jointOf(key);
    if (!j || (j.def.sided && !j.side)) continue;
    const out: JointAngles = {};
    for (const [dof, v] of Object.entries(a) as [Dof, number][]) {
      const d = j.def.dofs[dof];
      if (!d || !Number.isFinite(v)) continue;
      if (v < d.min || v > d.max) outOfRange.push({ joint: key, dof, value: v, min: d.min, max: d.max });
      out[dof] = clamp ? Math.min(d.max, Math.max(d.min, v)) : v;
    }
    angles.set(key, out);
  }
  if (options.rhythm ?? true) for (const s of [".L", ".R"]) {
    const sh = angles.get("shoulder" + s);
    if (!sh) continue;
    const elev = Math.max(sh.flex ?? 0, sh.abduct ?? 0);
    if (elev > 60) { const c = { ...(angles.get("clavicle" + s) ?? {}) }; c.abduct = (c.abduct ?? 0) + (elev - 60) / 4; angles.set("clavicle" + s, c); }
  }
  // per-bone DOF rotation D (world-anatomical axes). Every joint is visited: "parent"-zeroed joints straighten and
  // the forearm turns to thumb-up even when the pose leaves them out.
  const D: M3[] = bones.map(() => I3());
  for (const def of JOINTS) for (const side of def.sided ? [".L", ".R"] as const : [""] as const) {
    const a = angles.get(def.id + side) ?? {};
    const always = def.zero === "parent" || def.id === "forearm";
    if (!always && !angles.has(def.id + side)) continue;
    const mir = side === ".R" ? -1 : 1;
    const mirror = (v: Vec3): Vec3 => [v[0] * mir, v[1], v[2]];
    const hf = hands[side === ".R" ? ".R" : ".L"];
    for (const [bone, share] of def.bones) {
      const bi = index.get(bone + side);
      if (bi === undefined) continue;
      const d = nrm(sub(anatTail[bi], anatHead[bi]));
      const P = bones[bi].parent;
      const pd = P >= 0 ? nrm(sub(anatTail[P], anatHead[P])) : Y;
      const dirOf = (m: DofDef["motion"]): Vec3 => {
        if (m === "palm") return hf.palm;
        if (m === "ulnar") return hf.ulnar;
        if (m === "radial") return sc(hf.ulnar, -1);
        if (m === "thumb-flex") return nrm(add(hf.palm, sc(hf.ulnar, 0.8)));
        if (m === "spread") { const f = Number(/finger(\d)/.exec(bone)?.[1] ?? 3); return sc(hf.ulnar, f <= 3 ? -1 : 1); }
        return mirror(m);
      };
      let R = I3();
      // twist first, then abduction, then flexion (extrinsic, about the parent's anatomical axes)
      const tw = def.dofs.twist;
      if (tw && (a.twist !== undefined || def.id === "forearm")) {
        const ref = tw.ref === "palm" ? hf.palm : mirror(tw.ref ?? Z), mv = dirOf(tw.motion);
        const ax = sc(d, Math.sign(dot(cross(d, ref), mv)) || 1);
        let target = rad((a.twist ?? 0) * share);
        // forearm neutral = thumb up (palm toward the body): measure the sculpted palm against the medial direction
        if (def.id === "forearm") target -= signedAngle(proj(mirror([-1, 0, 0]), d), proj(hf.palm, d), ax) * share;
        R = mul(axisAngle(ax, target), R);
      }
      const ab = def.dofs.abduct;
      if (ab && a.abduct !== undefined) R = mul(axisAngle(nrm(cross(d, dirOf(ab.motion))), rad(a.abduct * share)), R);
      const fl = def.dofs.flex;
      if (fl && (a.flex !== undefined || def.zero === "parent")) {
        const ax = nrm(cross(d, dirOf(fl.motion)));
        let target = rad((a.flex ?? 0) * share);
        if (def.zero === "parent") target += (rad(def.neutral ?? 0) - signedAngle(proj(pd, ax), proj(d, ax), ax)) * share;
        R = mul(axisAngle(ax, target), R);
      }
      D[bi] = mul(R, D[bi]);
    }
  }
  // forward kinematics: W = W_parent · A_parent⁻¹ · D · A
  const W: M3[] = [], head: Vec3[] = [];
  const r = options.root ?? {};
  const rootR = mul(axisAngle(Y, rad(r.yaw ?? 0)), mul(axisAngle(X, rad(r.pitch ?? 0)), axisAngle(Z, rad(r.roll ?? 0))));
  bones.forEach((b, i) => {
    const P = b.parent;
    if (P < 0) { W[i] = mul(rootR, mul(D[i], A[i])); head[i] = b.head; return; }
    const delta = mul(W[P], tr(A[P]));
    W[i] = mul(delta, mul(D[i], A[i]));
    head[i] = add(head[P], app(delta, sub(anatHead[i], anatHead[P])));
  });
  // skin
  const n = body.model.header.counts.points, out = new Float32Array(n * 3);
  const src = body.points, si = body.model.skinIndex, sw = body.model.skinWeight;
  const Mx: number[][] = W.map((w, i) => { const h = head[i], rh = bones[i].head; const t = sub(h, app(w, rh)); return [...w, ...t]; });
  for (let v = 0; v < n; v++) {
    let x = 0, y = 0, z = 0, wsum = 0;
    const px = src[v * 3], py = src[v * 3 + 1], pz = src[v * 3 + 2];
    for (let k = 0; k < 4; k++) {
      const w = sw[v * 4 + k];
      if (!w) continue;
      const m = Mx[si[v * 4 + k]];
      x += w * (m[0] * px + m[1] * py + m[2] * pz + m[9]); y += w * (m[3] * px + m[4] * py + m[5] * pz + m[10]); z += w * (m[6] * px + m[7] * py + m[8] * pz + m[11]);
      wsum += w;
    }
    if (wsum) { out[v * 3] = x / wsum; out[v * 3 + 1] = y / wsum; out[v * 3 + 2] = z / wsum; }
  }
  // joint points by FK
  body.bones.forEach((b, i) => {
    const h = head[i], t = add(h, app(W[i], sub(bones[i].tail, bones[i].head)));
    out.set(h, b.head * 3); out.set(t, b.tail * 3);
  });
  // placement
  let dy = r.y ?? 0;
  if (options.ground ?? true) { let minY = Infinity; for (let v = 0; v < body.model.header.counts.body; v++) minY = Math.min(minY, out[v * 3 + 1]); dy -= minY; }
  const dx = r.x ?? 0, dz = r.z ?? 0;
  if (dx || dy || dz) for (let v = 0; v < n; v++) { out[v * 3] += dx; out[v * 3 + 1] += dy; out[v * 3 + 2] += dz; }
  return { body, points: out, pose, outOfRange };
}

/** Mirror a pose left ↔ right (sided joints swap; side-to-side angles of central joints flip sign). */
export function mirrorPose(pose: HumanPose): HumanPose {
  const out: HumanPose = {};
  for (const [k, a] of Object.entries(pose)) {
    const j = jointOf(k);
    if (!j) continue;
    if (j.side) out[j.def.id + (j.side === ".L" ? ".R" : ".L")] = { ...a };
    else out[k] = { ...a, ...(a.abduct !== undefined ? { abduct: -a.abduct } : {}), ...(a.twist !== undefined ? { twist: -a.twist } : {}) };
  }
  return out;
}

/** Blend two poses (missing angles count as 0). */
export function blendPoses(a: HumanPose, b: HumanPose, t: number): HumanPose {
  const out: HumanPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? {}, y = b[k] ?? {}, o: JointAngles = {};
    for (const d of new Set([...Object.keys(x), ...Object.keys(y)]) as Set<Dof>) o[d] = (x[d] ?? 0) * (1 - t) + (y[d] ?? 0) * t;
    out[k] = o;
  }
  return out;
}

// ---- Pose library -------------------------------------------------------------------------------------------------------------------

const both = (id: string, a: JointAngles): HumanPose => ({ [`${id}.L`]: a, [`${id}.R`]: { ...a } });
const fingers = (mcp: number, pip: number, dip: number, side?: ".L" | ".R"): HumanPose => {
  const out: HumanPose = {};
  for (const s of side ? [side] : [".L", ".R"]) for (const f of [2, 3, 4, 5]) {
    const k = 1 + (f - 2) * 0.12; // ring and little fingers curl a little more
    out[`finger${f}-mcp${s}`] = { flex: mcp * k }; out[`finger${f}-pip${s}`] = { flex: pip * k }; out[`finger${f}-dip${s}`] = { flex: dip * k };
  }
  return out;
};
export const HAND_POSES: Record<string, (side?: ".L" | ".R") => HumanPose> = {
  relaxed: s => ({ ...fingers(18, 28, 14, s) }),
  open: s => ({ ...fingers(0, 0, 0, s) }),
  spread: s => { const out = fingers(-5, 0, 0, s); for (const k of Object.keys(out)) if (k.includes("mcp")) out[k].abduct = 15; return out; },
  fist: s => { const o = fingers(85, 95, 60, s); for (const x of s ? [s] : [".L", ".R"]) { o[`thumb-cmc${x}`] = { abduct: 25, flex: -15 }; o[`thumb-mcp${x}`] = { flex: 45 }; o[`thumb-ip${x}`] = { flex: 40 }; } return o; },
  point: s => { const o = fingers(85, 95, 60, s); for (const x of s ? [s] : [".L", ".R"]) { o[`finger2-mcp${x}`] = { flex: 0 }; o[`finger2-pip${x}`] = { flex: 0 }; o[`finger2-dip${x}`] = { flex: 0 }; o[`thumb-cmc${x}`] = { abduct: 20, flex: -10 }; o[`thumb-mcp${x}`] = { flex: 35 }; } return o; },
  grip: s => ({ ...fingers(55, 60, 35, s) }),
  pinch: s => { const o = fingers(20, 30, 15, s); for (const x of s ? [s] : [".L", ".R"]) { o[`finger2-mcp${x}`] = { flex: 45 }; o[`finger2-pip${x}`] = { flex: 50 }; o[`finger2-dip${x}`] = { flex: 20 }; o[`thumb-cmc${x}`] = { abduct: 40, flex: 0 }; o[`thumb-mcp${x}`] = { flex: 20 }; } return o; },
};

export interface PosePreset { id: string; label: string; pose: HumanPose; note: string }
export const POSE_PRESETS: readonly PosePreset[] = [
  { id: "anatomical", label: "Anatomical position", note: "Reference zero: palms forward, feet together.",
    pose: { ...both("forearm", { twist: -85 }), ...both("shoulder", { abduct: 6 }), ...HAND_POSES.open() } },
  { id: "relaxed", label: "Relaxed stand", note: "Arms hang with a soft elbow, thumbs forward, fingers lightly curled.",
    pose: { ...both("shoulder", { abduct: 6, flex: 3 }), ...both("elbow", { flex: 12 }), ...both("forearm", { twist: 10 }), ...HAND_POSES.relaxed(), ...both("hip", { abduct: 3 }) } },
  { id: "contrapposto", label: "Contrapposto", note: "Weight on the right leg: the right hip rises, shoulders tilt the other way, the head rebalances over the standing foot.",
    pose: { spine: { abduct: -6, twist: 4 }, neck: { abduct: 6, twist: -8 }, "hip.R": { abduct: -6, flex: 2 }, "hip.L": { abduct: 8, flex: 10, twist: 8 }, "knee.L": { flex: 18 }, "ankle.L": { flex: -10 },
      "shoulder.L": { abduct: 8, flex: 6 }, "elbow.L": { flex: 25 }, "shoulder.R": { abduct: 5, flex: -6 }, "elbow.R": { flex: 10 }, ...both("forearm", { twist: 15 }), ...HAND_POSES.relaxed() } },
  { id: "walk-contact", label: "Walk — contact", note: "Front heel strikes with the knee nearly straight; arms swing opposite the legs.",
    pose: { "hip.L": { flex: 25 }, "knee.L": { flex: 3 }, "ankle.L": { flex: 8 }, "hip.R": { flex: -15 }, "knee.R": { flex: 12 }, "ankle.R": { flex: -12 }, "toes.R": { flex: -30 },
      "shoulder.R": { flex: 22, abduct: 5 }, "elbow.R": { flex: 25 }, "shoulder.L": { flex: -20, abduct: 5 }, "elbow.L": { flex: 12 }, spine: { twist: 6 }, neck: { twist: -6 }, ...HAND_POSES.relaxed() } },
  { id: "run", label: "Run — flight", note: "Knee drives forward, back leg trails, elbows near 90°, trunk leans in.",
    pose: { spine: { flex: 10, twist: 8 }, neck: { flex: -8, twist: -8 }, "hip.L": { flex: 70 }, "knee.L": { flex: 100 }, "ankle.L": { flex: 5 }, "hip.R": { flex: -18 }, "knee.R": { flex: 80 }, "ankle.R": { flex: -30 },
      "shoulder.R": { flex: 38, abduct: 10 }, "elbow.R": { flex: 92 }, "shoulder.L": { flex: -42, abduct: 12 }, "elbow.L": { flex: 88 }, ...both("forearm", { twist: 10 }), ...HAND_POSES.grip() } },
  { id: "sit-chair", label: "Sit — chair", note: "Hips and knees near 90°, forearms on the thighs.",
    pose: { ...both("hip", { flex: 88, abduct: 6 }), ...both("knee", { flex: 90 }), spine: { flex: 8 }, ...both("shoulder", { flex: 25, abduct: 6 }), ...both("elbow", { flex: 55 }), ...both("forearm", { twist: 60 }), ...HAND_POSES.relaxed() } },
  { id: "crouch", label: "Crouch", note: "Deep hip and knee flexion with the heels down; the trunk leans forward over the feet to keep balance.",
    pose: { ...both("hip", { flex: 118, abduct: 15, twist: -10 }), ...both("knee", { flex: 138 }), ...both("ankle", { flex: 18 }), spine: { flex: 30 }, neck: { flex: -25 }, ...both("shoulder", { flex: 45, abduct: 8 }), ...both("elbow", { flex: 30 }), ...HAND_POSES.relaxed() } },
  { id: "kneel", label: "Kneel", note: "One knee down, the other foot planted.",
    pose: { "hip.L": { flex: 90 }, "knee.L": { flex: 90 }, "hip.R": { flex: -5 }, "knee.R": { flex: 95 }, "ankle.R": { flex: -40 }, "toes.R": { flex: -60 }, spine: { flex: 5 }, "shoulder.L": { flex: 30 }, "elbow.L": { flex: 60 }, "shoulder.R": { abduct: 8 }, "elbow.R": { flex: 15 }, ...HAND_POSES.relaxed() } },
  { id: "reach-up", label: "Reach up", note: "Full shoulder flexion lifts the rib cage and girdle; the spine extends slightly.",
    pose: { "shoulder.L": { flex: 170, abduct: 10 }, "elbow.L": { flex: 8 }, "shoulder.R": { abduct: 10 }, "elbow.R": { flex: 15 }, spine: { flex: -6, abduct: -5 }, neck: { flex: -25 }, ...HAND_POSES.relaxed(".R"), ...HAND_POSES.open(".L") } },
  { id: "hands-on-hips", label: "Hands on hips", note: "Elbows wide, wrists bent back, knuckles on the iliac crest.",
    pose: { ...both("shoulder", { abduct: 45, flex: -12, twist: 30 }), ...both("elbow", { flex: 100 }), ...both("forearm", { twist: 70 }), ...both("wrist", { flex: -30 }), ...HAND_POSES.fist(), ...both("hip", { abduct: 6 }) } },
  { id: "think", label: "Thinking", note: "Hand to the chin, the other arm folded under the elbow, head tilted.",
    pose: { "shoulder.R": { flex: 40, abduct: 10, twist: 30 }, "elbow.R": { flex: 140 }, "forearm.R": { twist: 30 }, "wrist.R": { flex: -20 }, ...HAND_POSES.point(".R"),
      "shoulder.L": { flex: 25, abduct: 5, twist: 55 }, "elbow.L": { flex: 100 }, "forearm.L": { twist: 60 }, ...HAND_POSES.relaxed(".L"), neck: { flex: 12, abduct: -8, twist: -6 } } },
  { id: "wave", label: "Wave", note: "Upper arm out and up, forearm vertical, open hand.",
    pose: { "shoulder.L": { abduct: 88, flex: 12, twist: -75 }, "elbow.L": { flex: 105 }, "forearm.L": { twist: -50 }, ...HAND_POSES.spread(".L"), "shoulder.R": { abduct: 6 }, "elbow.R": { flex: 12 }, ...HAND_POSES.relaxed(".R"), neck: { abduct: 6 } } },
];
