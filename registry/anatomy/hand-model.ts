/**
 * ANAT1 hands in detail: measured hand types, an articulated skeleton, poses for gestures and the 33 grasps of the
 * GRASP taxonomy (fingers closing until they touch the object), and animations with human timing.
 *
 * - `HAND_TYPES`: hands as they differ: a large strong man's, an average man's and woman's, a slender long-fingered
 *   hand, a small woman's, a teenager's, a six-year-old's, a toddler's, and an old woman's and man's. Sizes from ANSUR
 *   II (hand length, breadth, palm length) and children's finger studies; shape traits (finger thickness, padding,
 *   muscle, knuckles, veins and tendons, taper, nails, digit ratio) estimated from public-domain photographs.
 * - `buildHand(type)`: bone lengths and radii. Finger segments follow two reported regularities: the middle and
 *   distal phalanges together are about as long as the proximal one, and the distance from the middle joint to the tip
 *   is about 1.3 times the end segment (1.0 on the little finger).
 * - `HandPose` (joint angles), `HAND_GESTURES` and `GRASPS`; `poseHand(hand, pose)` places every bone.
 *   Unspecified end joints follow the middle joint (DIP ≈ ⅔ PIP); relaxed fingers flex more toward the little finger
 *   (the normal cascade); neighbours follow a little (finger enslaving).
 * - `graspHand(hand, grasp)`: shapes the hand for a grasp, then closes each finger, joint by joint, until it touches
 *   the object, so any hand fits any object.
 * - `HAND_ANIMATIONS` and `animateHand(anim, t)`: keyframed actions eased by the minimum-jerk profile of human
 *   point-to-point movements, with per-finger delays.
 *
 * Sources and grades: `HAND_EVIDENCE` and docs/research/hands-2026-11-16.md.
 */
import ansur from "./data/ansur-ii-ranges.json";

export type Vec3 = [number, number, number];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const sc = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: Vec3): Vec3 => sc(a, 1 / (len(a) || 1));
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** Rotate v about a unit axis by an angle (radians). */
export function rotAxis(v: Vec3, axis: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang), s = Math.sin(ang), d = dot(axis, v);
  return add(add(sc(v, c), sc(cross(axis, v), s)), sc(axis, d * (1 - c)));
}
const rad = (d: number) => (d * Math.PI) / 180;

// ---- Hand types ------------------------------------------------------------------------------------------------------------------

export interface HandType {
  id: string; label: string;
  /** 0 female … 1 male; age in years. */
  sex: number; age: number;
  /** Hand length (wrist crease to the middle fingertip), hand breadth (across the knuckles) and palm length, mm. */
  length: number; breadth: number; palmLength: number;
  /** Finger girth relative to the average for this hand's size (1 = average). */
  thickness: number;
  /** Soft padding (children, plump hands) 0–1; muscle bulk of the thenar and hypothenar 0–1. */
  fat: number; muscle: number;
  /** How the joints stand out (strong or old hands) 0–1; visible veins and tendons on the back 0–1. */
  knuckles: number; veins: number; tendons: number;
  /** How much the fingers narrow toward the tips 0–1. */
  taper: number;
  /** Index : ring finger length (2D:4D); about 0.95 in men, 0.97 in women. */
  digitRatio: number;
  nail: { shape: "square" | "oval" | "almond" | "round"; free: number };
  /** Skin colour (sRGB hex) used by default, and the skin's age for texture. */
  skin: string; skinAge: number;
  note: string;
}

type AnsurSex = { measurements: Record<string, { mean: number; sd: number }> };
const A = ansur as unknown as { female: AnsurSex; male: AnsurSex };
const ans = (k: string, sex: "female" | "male", z = 0) => A[sex].measurements[k].mean + z * A[sex].measurements[k].sd;

/**
 * Hand types. Adults from ANSUR II (means and percentiles of hand length, breadth and palm length); children from
 * studies of children's fingers (a 37% growth in finger length from 3 to 10 years) and grip-size surveys, estimated;
 * traits estimated from public-domain photographs (Reference board, hands).
 */
export const HAND_TYPES: readonly HandType[] = [
  { id: "man-strong", label: "Large, strong (man)", sex: 1, age: 40, length: ans("handlength", "male", 1.3), breadth: ans("handbreadth", "male", 1.7), palmLength: ans("palmlength", "male", 1.4), thickness: 1.22, fat: 0.25, muscle: 1, knuckles: 0.85, veins: 0.65, tendons: 0.45, taper: 0.08, digitRatio: 0.94, nail: { shape: "square", free: 0.5 }, skin: "#c99a7e", skinAge: 45, note: "A labourer's hand: broad palm, thick square fingers, heavy knuckles, a strong thenar; short nails. ANSUR II men at about the 90th–95th percentile." },
  { id: "man", label: "Average (man)", sex: 1, age: 30, length: ans("handlength", "male"), breadth: ans("handbreadth", "male"), palmLength: ans("palmlength", "male"), thickness: 1, fat: 0.3, muscle: 0.6, knuckles: 0.55, veins: 0.4, tendons: 0.35, taper: 0.2, digitRatio: 0.95, nail: { shape: "oval", free: 0.8 }, skin: "#d7aa86", skinAge: 30, note: "ANSUR II men's means: length 193 mm, breadth 88 mm, palm 116 mm." },
  { id: "man-slender", label: "Slender, long-fingered", sex: 0.8, age: 30, length: ans("handlength", "male", 0.6), breadth: ans("handbreadth", "male", -0.9), palmLength: ans("palmlength", "male", 0.2), thickness: 0.84, fat: 0.2, muscle: 0.45, knuckles: 0.45, veins: 0.35, tendons: 0.4, taper: 0.45, digitRatio: 0.96, nail: { shape: "oval", free: 1 }, skin: "#e6c0a4", skinAge: 30, note: "Long, narrow fingers on a slim palm (a pianist's hand): long relative to its breadth." },
  { id: "woman", label: "Average (woman)", sex: 0, age: 30, length: ans("handlength", "female"), breadth: ans("handbreadth", "female"), palmLength: ans("palmlength", "female"), thickness: 1, fat: 0.4, muscle: 0.4, knuckles: 0.3, veins: 0.2, tendons: 0.2, taper: 0.35, digitRatio: 0.97, nail: { shape: "oval", free: 1.5 }, skin: "#e6c0a4", skinAge: 30, note: "ANSUR II women's means: length 181 mm, breadth 78 mm, palm 109 mm." },
  { id: "woman-slender", label: "Slender (woman)", sex: 0, age: 28, length: ans("handlength", "female", 0.5), breadth: ans("handbreadth", "female", -0.8), palmLength: ans("palmlength", "female", 0.3), thickness: 0.84, fat: 0.3, muscle: 0.3, knuckles: 0.25, veins: 0.25, tendons: 0.3, taper: 0.55, digitRatio: 0.98, nail: { shape: "almond", free: 3 }, skin: "#f1d3bd", skinAge: 28, note: "Long tapering fingers and long almond nails." },
  { id: "woman-small", label: "Small (woman)", sex: 0, age: 30, length: ans("handlength", "female", -1.6), breadth: ans("handbreadth", "female", -1.6), palmLength: ans("palmlength", "female", -1.6), thickness: 0.95, fat: 0.45, muscle: 0.35, knuckles: 0.25, veins: 0.15, tendons: 0.15, taper: 0.3, digitRatio: 0.97, nail: { shape: "round", free: 0.8 }, skin: "#c99a7e", skinAge: 30, note: "ANSUR II women at about the 5th percentile." },
  { id: "teen", label: "Teenager (13)", sex: 0.5, age: 13, length: 170, breadth: 74, palmLength: 101, thickness: 0.95, fat: 0.4, muscle: 0.35, knuckles: 0.25, veins: 0.1, tendons: 0.2, taper: 0.3, digitRatio: 0.96, nail: { shape: "oval", free: 0.6 }, skin: "#b3825f", skinAge: 13, note: "Nearly adult in length, slimmer (estimated from growth surveys)." },
  { id: "child", label: "Child (6)", sex: 0.5, age: 6, length: 128, breadth: 60, palmLength: 74, thickness: 1.12, fat: 0.8, muscle: 0.2, knuckles: 0, veins: 0, tendons: 0, taper: 0.1, digitRatio: 0.97, nail: { shape: "round", free: 0.3 }, skin: "#e6c0a4", skinAge: 6, note: "Small, soft and padded: short plump fingers, dimples over the knuckles instead of bumps, small round nails (fingers grow 37% from 3 to 10)." },
  { id: "toddler", label: "Toddler (2)", sex: 0.5, age: 2, length: 98, breadth: 48, palmLength: 58, thickness: 1.25, fat: 1, muscle: 0.1, knuckles: 0, veins: 0, tendons: 0, taper: 0.05, digitRatio: 0.97, nail: { shape: "round", free: 0.2 }, skin: "#f1d3bd", skinAge: 2, note: "Chubby: deep dimples, creased wrists, short fingers on a broad palm (estimated)." },
  { id: "elder-woman", label: "Old (woman, 78)", sex: 0, age: 78, length: ans("handlength", "female", -0.3), breadth: ans("handbreadth", "female", 0.1), palmLength: ans("palmlength", "female", -0.3), thickness: 0.92, fat: 0.1, muscle: 0.2, knuckles: 0.95, veins: 0.95, tendons: 0.85, taper: 0.25, digitRatio: 0.97, nail: { shape: "oval", free: 0.8 }, skin: "#e6c0a4", skinAge: 78, note: "Thin skin over bone: swollen joints, raised veins and tendons, crêpe and age spots." },
  { id: "elder-man", label: "Old (man, 80)", sex: 1, age: 80, length: ans("handlength", "male", -0.2), breadth: ans("handbreadth", "male", 0.2), palmLength: ans("palmlength", "male", -0.2), thickness: 0.98, fat: 0.1, muscle: 0.35, knuckles: 1, veins: 1, tendons: 0.9, taper: 0.15, digitRatio: 0.95, nail: { shape: "square", free: 0.4 }, skin: "#c99a7e", skinAge: 80, note: "Bony, with large knuckles, ropey veins and tendons, deep creases (Reference board: the old hand)." },
];
export const findHandType = (id: string) => HAND_TYPES.find(t => t.id === id) ?? HAND_TYPES[1];

// ---- The skeleton --------------------------------------------------------------------------------------------------------------

export type FingerId = "thumb" | "index" | "middle" | "ring" | "little";
export const FINGERS: readonly FingerId[] = ["thumb", "index", "middle", "ring", "little"];

export interface FingerGeom {
  id: FingerId;
  /** The finger's base joint (MCP; CMC for the thumb) in hand space, its rest direction and its dorsal ("up") direction. */
  base: Vec3; dir: Vec3; up: Vec3;
  /** Segment lengths, mm: for fingers [proximal, middle, distal]; for the thumb [metacarpal, proximal, distal]. */
  lengths: [number, number, number];
  /** Radii at the base joint, each joint, and the tip, mm. */
  radii: [number, number, number, number];
  /** Width of the nail, mm. */
  nailWidth: number;
}
export interface Hand {
  type: HandType;
  fingers: Record<FingerId, FingerGeom>;
  /** Palm dimensions: half widths at the wrist and the knuckles, thickness, the knuckle line's y, and the wrist. */
  palm: { wristHalf: number; mcpHalf: number; thick: number; mcpY: number; wristThick: number };
  /** Metacarpal heads (knuckles) of the four fingers, hand space. */
  knuckles: Vec3[];
  side: "right" | "left";
}

/**
 * Bone lengths and radii for a hand type. Hand space, mm: the wrist crease's centre at the origin, y toward the
 * fingers, x toward the thumb, z toward the back of the hand (as built, a left hand; a right hand is drawn mirrored).
 */
export function buildHand(typeOrId: HandType | string, side: "right" | "left" = "right"): Hand {
  const t = typeof typeOrId === "string" ? findHandType(typeOrId) : typeOrId;
  const L = t.length, B = t.breadth, PL = t.palmLength;
  // the middle finger's proximal phalanx from the visible finger length: the web covers about a third of it, and the
  // middle + distal phalanges together are as long as the proximal (so the chain from the knuckle is 2 P)
  const Pm = (L - PL) / 1.68, mcpY = PL - 0.32 * Pm;
  // finger lengths relative to the middle finger; index from the digit ratio
  const ringK = 0.955, rel: Record<Exclude<FingerId, "thumb">, number> = { index: ringK * t.digitRatio, middle: 1, ring: ringK, little: 0.79 };
  // finger widths at the base from the breadth, adjusted by thickness
  // (base widths about 20, 19.5, 18.5 and 16 mm on an 88 mm hand: index 22.5% of the breadth … little 18%, estimated)
  const baseW: Record<Exclude<FingerId, "thumb">, number> = { index: 0.225, middle: 0.222, ring: 0.21, little: 0.18 };
  const xs = { index: 0.335, middle: 0.11, ring: -0.115, little: -0.32 }, yOff = { index: -0.012, middle: 0, ring: -0.02, little: -0.065 }, zOff = { index: -0.004, middle: 0, ring: -0.012, little: -0.03 };
  // fingers held together and straight converge a little toward the middle finger
  const spreadRest = { index: 1.5, middle: 0, ring: -1, little: -3 };
  const fingers = {} as Record<FingerId, FingerGeom>;
  const knuckles: Vec3[] = [];
  for (const f of ["index", "middle", "ring", "little"] as const) {
    const P = Pm * rel[f], ratio = f === "little" ? 1.0 : 1.3; // middle : distal by joint-to-tip ratio
    const midP = P * (ratio / (1 + ratio)), distP = P - midP;
    const r0 = (B * baseW[f] * 0.5) * t.thickness * (1 + 0.15 * t.fat);
    const tap = 1 - 0.28 * t.taper;
    const base: Vec3 = [B * xs[f], mcpY + L * yOff[f], B * zOff[f]];
    const a = rad(spreadRest[f]), dir = nrm([-Math.sin(a), Math.cos(a), 0]);
    fingers[f] = { id: f, base, dir, up: [0, 0, 1], lengths: [P, midP, distP], radii: [r0 * 1.02, r0 * 0.93, r0 * 0.86 * tap, r0 * 0.78 * tap], nailWidth: r0 * 2 * 0.78 * tap };
    knuckles.push(base);
  }
  // the thumb: its base (CMC) at the radial side near the wrist, pointing out and forward, nail turned toward the index
  const Mt = 0.245 * L, Pt = 0.16 * L, Dt = 0.135 * L, rt = B * 0.13 * t.thickness * (1 + 0.15 * t.fat);
  const tBase: Vec3 = [0.3 * B, 0.13 * L, -0.08 * B], tDir = nrm([0.62, 0.7, -0.36]);
  const tUp = nrm(sub([0.55, 0.05, 0.85], sc(tDir, dot([0.55, 0.05, 0.85], tDir))));
  fingers.thumb = { id: "thumb", base: tBase, dir: tDir, up: tUp, lengths: [Mt, Pt, Dt], radii: [rt * 1.25, rt * 1.08, rt * 0.98 * (1 - 0.15 * t.taper), rt * 0.85 * (1 - 0.2 * t.taper)], nailWidth: rt * 2 * 0.8 };
  const palm = { wristHalf: B * 0.36, mcpHalf: B * 0.5, thick: B * (0.34 + 0.06 * t.muscle + 0.05 * t.fat), mcpY, wristThick: B * 0.42 };
  const hand: Hand = { type: t, fingers, palm, knuckles, side };
  return hand;
}

// ---- Poses -----------------------------------------------------------------------------------------------------------------------

/** Joint angles, degrees. Fingers: MCP flexion and abduction (spread, + away from the middle finger), PIP and DIP flexion. */
export interface FingerAngles { mcp: number; pip: number; dip?: number; spread?: number }
/** Thumb: CMC flexion (across the palm), palmar abduction (away from the palm), opposition (pronation of the thumb), MCP and IP flexion. */
export interface ThumbAngles { cmcFlex: number; cmcAbduct: number; oppose: number; mcp: number; ip: number }
export interface HandPose {
  index: FingerAngles; middle: FingerAngles; ring: FingerAngles; little: FingerAngles; thumb: ThumbAngles;
  /** Wrist flexion (+ toward the palm) and deviation (+ toward the thumb), degrees. */
  wrist?: { flex: number; dev: number };
  /**
   * Where the thumb's pad goes: a point on a finger segment (0 proximal … 2 end), along it (0–1), on its pad (palmar)
   * or its back (dorsal). The thumb's angles then start from `thumb` and are solved to reach it, within its ranges.
   */
  thumbTo?: { finger: Exclude<FingerId, "thumb">; seg: 0 | 1 | 2; at: number; face: "palmar" | "dorsal" };
  /** Or a point (hand space, before the wrist turns) for the thumb's pad. */
  thumbPoint?: Vec3;
}
const F = (mcp: number, pip: number, dip?: number, spread = 0): FingerAngles => ({ mcp, pip, dip, spread });
const T = (cmcFlex: number, cmcAbduct: number, oppose: number, mcp: number, ip: number): ThumbAngles => ({ cmcFlex, cmcAbduct, oppose, mcp, ip });

/**
 * Gestures and everyday hand shapes. Angles estimated from photographs within the clinical ranges (MCP 0–90°,
 * PIP 0–100°, DIP 0–80°, thumb MCP 0–50°, IP −10–80°; AAOS via Hendriks et al. 2020).
 */
export const HAND_GESTURES: readonly { id: string; label: string; pose: HandPose; note: string }[] = [
  { id: "relaxed", label: "Relaxed", note: "At rest the fingers flex a little more toward the little finger: the normal cascade.", pose: { index: F(18, 30, 12, 2), middle: F(22, 36, 15), ring: F(28, 42, 18, -2), little: F(34, 48, 20, -4), thumb: T(5, 25, 15, 12, 10), wrist: { flex: -15, dev: 0 } } },
  { id: "open", label: "Open, flat", note: "Fingers straight and together.", pose: { index: F(0, 0, 0), middle: F(0, 0, 0), ring: F(0, 0, 0), little: F(0, 0, 0), thumb: T(-5, 15, 0, 0, 0) } },
  { id: "spread", label: "Spread", note: "Fingers straight and spread; the thumb out.", pose: { index: F(-5, 0, 0, 14), middle: F(-5, 0, 0, 2), ring: F(-5, 0, 0, 12), little: F(-5, 0, 0, 22), thumb: T(-20, 30, 5, 0, -5) } },
  { id: "fist", label: "Fist", note: "Fingers rolled into the palm, the thumb across the middle phalanges.", pose: { index: F(85, 100, 60), middle: F(88, 102, 62), ring: F(90, 104, 64), little: F(92, 105, 65), thumb: T(55, 35, 55, 35, 25), thumbTo: { finger: "middle", seg: 1, at: 0.45, face: "dorsal" } } },
  { id: "point", label: "Point", note: "The index straight, the others curled, the thumb on the middle finger.", pose: { index: F(5, 5, 0, 3), middle: F(85, 100, 60), ring: F(88, 102, 62), little: F(90, 104, 64), thumb: T(45, 30, 50, 35, 20), thumbTo: { finger: "middle", seg: 1, at: 0.5, face: "dorsal" } } },
  { id: "ok", label: "OK", note: "Thumb and index tips meet in a ring, the other fingers up and a little spread.", pose: { index: F(50, 62, 34, 2), middle: F(12, 8, 4, 2), ring: F(14, 10, 4, 6), little: F(18, 12, 6, 14), thumb: T(25, 45, 60, 15, 20), thumbTo: { finger: "index", seg: 2, at: 0.85, face: "palmar" } } },
  { id: "thumbs-up", label: "Thumbs up", note: "A fist with the thumb straight up.", pose: { index: F(85, 100, 60), middle: F(88, 102, 62), ring: F(90, 104, 64), little: F(92, 105, 65), thumb: T(-10, 20, 5, 0, -5) } },
  { id: "peace", label: "V (peace)", note: "Index and middle up and apart; ring and little held by the thumb.", pose: { index: F(2, 2, 0, 12), middle: F(2, 2, 0, -8), ring: F(85, 100, 60), little: F(88, 102, 62), thumb: T(50, 30, 55, 35, 25), thumbTo: { finger: "ring", seg: 1, at: 0.5, face: "dorsal" } } },
  { id: "horns", label: "Horns", note: "Index and little up, middle and ring held by the thumb.", pose: { index: F(4, 4, 0, 6), middle: F(85, 100, 60), ring: F(85, 100, 60), little: F(4, 4, 0, 12), thumb: T(50, 30, 55, 35, 25), thumbTo: { finger: "middle", seg: 1, at: 0.6, face: "dorsal" } } },
  { id: "call", label: "Call me", note: "Thumb and little out, the others curled.", pose: { index: F(85, 100, 60), middle: F(88, 102, 62), ring: F(90, 104, 64), little: F(-5, 0, 0, 25), thumb: T(-25, 35, 5, 0, -5) } },
  { id: "pinch", label: "Pinch", note: "Thumb and index pads meet; the others curl a little.", pose: { index: F(40, 50, 25, 0), middle: F(30, 45, 20), ring: F(32, 48, 22), little: F(35, 50, 25, -3), thumb: T(20, 45, 60, 15, 15), thumbTo: { finger: "index", seg: 2, at: 0.75, face: "palmar" } } },
  { id: "claw", label: "Claw", note: "Knuckles straight, middle and end joints bent (a cat's paw).", pose: { index: F(10, 75, 55, 6), middle: F(10, 78, 58, 2), ring: F(10, 80, 60, 4), little: F(10, 82, 62, 8), thumb: T(5, 35, 25, 30, 40) } },
  { id: "cupped", label: "Cupped", note: "A shallow bowl, as for holding water.", pose: { index: F(25, 30, 15, -2), middle: F(25, 30, 15), ring: F(25, 30, 15, 2), little: F(28, 32, 15, 4), thumb: T(20, 25, 35, 15, 10), wrist: { flex: -10, dev: 0 } } },
  { id: "beckon", label: "Beckon", note: "Palm up, the index curling in: \"come here\".", pose: { index: F(55, 85, 50, 2), middle: F(80, 95, 55), ring: F(82, 98, 58), little: F(85, 100, 60), thumb: T(15, 25, 35, 25, 15) } },
  { id: "count-3", label: "Three", note: "Thumb, index and middle out (as counted in much of Europe).", pose: { index: F(2, 2, 0, 8), middle: F(2, 2, 0, -2), ring: F(85, 100, 60), little: F(88, 102, 62), thumb: T(-20, 30, 5, 0, 0) } },
];

/** One grasp of the GRASP taxonomy: its number, kind, opposition, thumb position, observed frequency, its pre-shape and its object. */
export interface GraspSpec {
  n: number; id: string; label: string;
  kind: "power" | "intermediate" | "precision"; opposition: "palm" | "pad" | "side"; thumb: "abducted" | "adducted";
  /** Share of grasps observed in housekeepers' and machinists' work (%), Feix et al. 2016. */
  freq: number;
  /** The open pre-shape; then the listed fingers close until they touch the object. */
  pose: HandPose; close: FingerId[];
  prop: Prop;
}
export type Prop =
  | { kind: "cylinder"; centre: Vec3; axis: Vec3; radius: number; half: number }
  | { kind: "sphere"; centre: Vec3; radius: number }
  | { kind: "box"; centre: Vec3; half: Vec3; axisX: Vec3; axisY: Vec3 }
  | { kind: "none" };

/** Props are placed in units of the hand: `h` length, `b` breadth, `p` palm thickness (resolved by `placeProp`). */
interface PropTemplate { kind: Prop["kind"]; at: [number, number, number]; axis?: Vec3; size: [number, number, number]; axisY?: Vec3 }
const cyl = (at: [number, number, number], axis: Vec3, diam: number, length: number): PropTemplate => ({ kind: "cylinder", at, axis, size: [diam, length, 0] });
const sph = (at: [number, number, number], diam: number): PropTemplate => ({ kind: "sphere", at, size: [diam, 0, 0] });
const box = (at: [number, number, number], size: [number, number, number], axis: Vec3 = [1, 0, 0], axisY: Vec3 = [0, 1, 0]): PropTemplate => ({ kind: "box", at, size, axis, axisY });

/**
 * The 33 grasps of the GRASP taxonomy (Feix, Romero, Schmiedmayer, Dollar & Kragic 2016), numbered as in the paper,
 * with their classification and the frequencies observed in work. Pre-shapes and object sizes estimated.
 * Object positions: [x across the palm (+ thumb side), y along the hand from the wrist, z (+ back)] as fractions of
 * hand breadth, length and palm thickness; sizes in mm (diameter, length).
 */
const GRASP_TABLE: readonly [number, string, string, GraspSpec["kind"], GraspSpec["opposition"], GraspSpec["thumb"], number, HandPose, FingerId[], PropTemplate][] = [
  [1, "large-diameter", "Large diameter", "power", "palm", "abducted", 1.7, { index: F(5, 5, 0), middle: F(5, 5, 0), ring: F(5, 5, 0), little: F(5, 5, 0), thumb: T(10, 45, 60, 5, 5) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.1, 0.48, -1.55], [0.95, 0.3, 0], 60, 160)],
  [2, "small-diameter", "Small diameter", "power", "palm", "abducted", 0.7, { index: F(15, 20, 10), middle: F(15, 20, 10), ring: F(15, 20, 10), little: F(15, 20, 10), thumb: T(20, 40, 60, 10, 10) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.1, 0.52, -1.0], [0.95, 0.3, 0], 25, 160)],
  [3, "medium-wrap", "Medium wrap", "power", "palm", "abducted", 12.7, { index: F(10, 10, 5), middle: F(10, 10, 5), ring: F(10, 10, 5), little: F(10, 10, 5), thumb: T(15, 42, 60, 8, 8) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.1, 0.5, -1.25], [0.95, 0.3, 0], 40, 160)],
  [4, "adducted-thumb", "Adducted thumb", "power", "palm", "adducted", 1.0, { index: F(10, 10, 5), middle: F(10, 10, 5), ring: F(10, 10, 5), little: F(10, 10, 5), thumb: T(-5, 10, 15, 0, 0) }, ["index", "middle", "ring", "little"], cyl([0.05, 0.5, -1.2], [0.98, 0.2, 0], 38, 160)],
  [5, "light-tool", "Light tool", "power", "palm", "adducted", 4.8, { index: F(15, 15, 8), middle: F(15, 15, 8), ring: F(15, 15, 8), little: F(15, 15, 8), thumb: T(0, 15, 20, 5, 0) }, ["index", "middle", "ring", "little"], cyl([0.05, 0.52, -1.0], [0.97, 0.25, 0], 22, 150)],
  [6, "prismatic-4", "Prismatic 4 finger", "precision", "pad", "abducted", 4.0, { index: F(30, 15, 8), middle: F(30, 15, 8), ring: F(30, 15, 8), little: F(30, 15, 8), thumb: T(25, 50, 70, 10, 10) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.05, 0.92, 4], [0.98, 0.15, 0], 26, 140)],
  [7, "prismatic-3", "Prismatic 3 finger", "precision", "pad", "abducted", 4.2, { index: F(30, 15, 8), middle: F(30, 15, 8), ring: F(30, 15, 8), little: F(50, 70, 40), thumb: T(25, 50, 70, 10, 10) }, ["index", "middle", "ring", "thumb"], cyl([0.12, 0.92, 4], [0.98, 0.15, 0], 22, 120)],
  [8, "prismatic-2", "Prismatic 2 finger", "precision", "pad", "abducted", 6.4, { index: F(30, 15, 8), middle: F(30, 15, 8), ring: F(50, 70, 40), little: F(55, 75, 40), thumb: T(25, 50, 70, 10, 10) }, ["index", "middle", "thumb"], cyl([0.2, 0.92, 4], [0.98, 0.15, 0], 16, 100)],
  [9, "palmar-pinch", "Palmar pinch", "precision", "pad", "abducted", 3.9, { index: F(35, 25, 10), middle: F(45, 60, 30), ring: F(50, 65, 35), little: F(55, 70, 35), thumb: T(25, 50, 70, 10, 10) }, ["index", "thumb"], box([0.36, 0.9, 6], [24, 24, 3], [0.7, 0.1, -0.7], [0, 1, 0])],
  [10, "power-disk", "Power disk", "power", "palm", "abducted", 0.2, { index: F(10, 5, 0, 8), middle: F(10, 5, 0, 2), ring: F(10, 5, 0, 6), little: F(10, 5, 0, 12), thumb: T(5, 50, 60, 0, 0) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.05, 0.62, -1.4], [0, 0, 1], 90, 18)],
  [11, "power-sphere", "Power sphere", "power", "palm", "abducted", 6.3, { index: F(10, 10, 5, 10), middle: F(10, 10, 5, 2), ring: F(10, 10, 5, 8), little: F(10, 10, 5, 14), thumb: T(15, 50, 60, 5, 5) }, ["index", "middle", "ring", "little", "thumb"], sph([0.05, 0.62, -2.1], 75)],
  [12, "precision-disk", "Precision disk", "precision", "pad", "abducted", 7.1, { index: F(20, 15, 5, 12), middle: F(20, 15, 5, 3), ring: F(20, 15, 5, 8), little: F(20, 15, 5, 16), thumb: T(15, 55, 60, 5, 5) }, ["index", "middle", "ring", "little", "thumb"], cyl([0.05, 0.78, 10], [0, 0.35, 0.94], 85, 14)],
  [13, "precision-sphere", "Precision sphere", "precision", "pad", "abducted", 0.2, { index: F(20, 20, 8, 10), middle: F(20, 20, 8, 3), ring: F(20, 20, 8, 8), little: F(20, 20, 8, 14), thumb: T(20, 55, 65, 5, 5) }, ["index", "middle", "ring", "little", "thumb"], sph([0.05, 0.8, 4], 55)],
  [14, "tripod", "Tripod", "precision", "pad", "abducted", 8.4, { index: F(35, 25, 10, 3), middle: F(35, 25, 10, -3), ring: F(55, 70, 35), little: F(60, 75, 40), thumb: T(25, 50, 65, 10, 10) }, ["index", "middle", "thumb"], sph([0.2, 0.92, 6], 30)],
  [15, "fixed-hook", "Fixed hook", "power", "palm", "adducted", 0.4, { index: F(15, 70, 40), middle: F(15, 70, 40), ring: F(15, 70, 40), little: F(15, 70, 40), thumb: T(-5, 15, 10, 0, 0) }, [], cyl([0.0, 1.0, -0.9], [1, 0, 0], 18, 140)],
  [16, "lateral", "Lateral (key)", "intermediate", "side", "adducted", 8.9, { index: F(50, 70, 35), middle: F(65, 85, 45), ring: F(70, 90, 50), little: F(75, 95, 55), thumb: T(5, 15, 25, 15, 15) }, ["thumb"], box([0.62, 0.85, -0.4], [30, 24, 2.5], [0.2, 0.98, 0], [0, 0, 1])],
  [17, "index-extension", "Index finger extension", "power", "palm", "adducted", 3.4, { index: F(10, 5, 0), middle: F(15, 15, 8), ring: F(15, 15, 8), little: F(15, 15, 8), thumb: T(0, 15, 20, 5, 0) }, ["middle", "ring", "little"], cyl([-0.05, 0.5, -1.0], [0.95, 0.3, 0], 25, 150)],
  [18, "extension", "Extension type", "power", "pad", "abducted", 3.6, { index: F(25, 5, 0), middle: F(25, 5, 0), ring: F(25, 5, 0), little: F(25, 5, 0), thumb: T(10, 50, 60, 0, 0) }, ["thumb"], box([0.0, 0.85, 4], [110, 70, 3], [1, 0, 0], [0, 1, 0])],
  [19, "distal", "Distal type", "power", "pad", "abducted", 0.0, { index: F(40, 50, 20, 10), middle: F(40, 50, 20, 2), ring: F(50, 60, 30, 6), little: F(55, 65, 35, 12), thumb: T(20, 50, 65, 10, 10) }, ["index", "middle", "thumb"], box([0.1, 0.85, 4], [70, 12, 12], [0.9, 0.4, 0], [0, 0, 1])],
  [20, "writing-tripod", "Writing tripod", "intermediate", "side", "abducted", 0.7, { index: F(30, 40, 15), middle: F(45, 60, 30), ring: F(60, 75, 40), little: F(65, 80, 45), thumb: T(25, 45, 60, 15, 15) }, ["index", "thumb"], cyl([0.3, 0.85, -1.0], [0.3, 0.8, -0.5], 9, 140)],
  [21, "tripod-variation", "Tripod variation", "intermediate", "side", "abducted", 0.0, { index: F(30, 40, 15), middle: F(45, 55, 25), ring: F(55, 70, 35), little: F(60, 75, 40), thumb: T(25, 45, 60, 15, 15) }, ["index", "middle", "thumb"], cyl([0.28, 0.9, -1.0], [0.25, 0.85, -0.45], 10, 140)],
  [22, "parallel-extension", "Parallel extension", "precision", "pad", "adducted", 2.0, { index: F(40, 5, 0), middle: F(40, 5, 0), ring: F(40, 5, 0), little: F(40, 5, 0), thumb: T(10, 30, 30, 0, 0) }, ["thumb"], box([0.05, 1.05, -1.3], [90, 60, 3], [1, 0, 0], [0, 0.2, 1])],
  [23, "adduction", "Adduction grip", "intermediate", "side", "adducted", 2.2, { index: F(10, 10, 5, -3), middle: F(10, 10, 5, 8), ring: F(20, 25, 10), little: F(25, 30, 12), thumb: T(5, 25, 25, 10, 5) }, [], cyl([0.25, 1.0, 0.0], [0, 0, 1], 8, 80)],
  [24, "tip-pinch", "Tip pinch", "precision", "pad", "abducted", 0.3, { index: F(45, 55, 40), middle: F(50, 65, 35), ring: F(55, 70, 40), little: F(60, 75, 40), thumb: T(25, 55, 70, 20, 30) }, ["index", "thumb"], sph([0.36, 0.88, 10], 6)],
  [25, "lateral-tripod", "Lateral tripod", "intermediate", "side", "abducted", 10.4, { index: F(40, 50, 25), middle: F(55, 65, 35), ring: F(65, 80, 45), little: F(70, 85, 50), thumb: T(15, 30, 45, 20, 15) }, ["index", "thumb"], cyl([0.35, 0.82, -0.8], [0.15, 0.9, -0.4], 8, 120)],
  [26, "sphere-4", "Sphere 4 finger", "power", "pad", "abducted", 0.2, { index: F(20, 20, 8, 10), middle: F(20, 20, 8, 3), ring: F(20, 20, 8, 8), little: F(20, 20, 8, 14), thumb: T(20, 55, 65, 5, 5) }, ["index", "middle", "ring", "little", "thumb"], sph([0.05, 0.75, 2], 60)],
  [27, "quadpod", "Quadpod", "precision", "pad", "abducted", 0.3, { index: F(30, 25, 10, 6), middle: F(30, 25, 10, 0), ring: F(30, 25, 10, 6), little: F(60, 75, 40), thumb: T(25, 55, 65, 10, 10) }, ["index", "middle", "ring", "thumb"], sph([0.12, 0.9, 6], 38)],
  [28, "sphere-3", "Sphere 3 finger", "power", "pad", "abducted", 1.5, { index: F(20, 20, 8, 10), middle: F(20, 20, 8, 3), ring: F(20, 20, 8, 8), little: F(60, 75, 40), thumb: T(20, 55, 65, 5, 5) }, ["index", "middle", "ring", "thumb"], sph([0.12, 0.78, 3], 50)],
  [29, "stick", "Stick", "intermediate", "side", "adducted", 1.2, { index: F(20, 25, 10), middle: F(25, 30, 12), ring: F(30, 35, 15), little: F(35, 40, 15), thumb: T(5, 20, 20, 10, 5) }, ["thumb"], cyl([0.35, 0.65, -0.4], [0.2, 0.95, 0.2], 9, 120)],
  [30, "palmar", "Palmar", "power", "palm", "adducted", 0.6, { index: F(10, 5, 0), middle: F(10, 5, 0), ring: F(10, 5, 0), little: F(10, 5, 0), thumb: T(-5, 10, 10, 0, 0) }, [], box([0.0, 0.6, -0.9], [90, 120, 6], [1, 0, 0], [0, 1, 0])],
  [31, "ring", "Ring", "power", "pad", "abducted", 2.0, { index: F(40, 50, 25, 2), middle: F(70, 90, 50), ring: F(75, 95, 55), little: F(80, 100, 60), thumb: T(20, 45, 60, 15, 15) }, ["index", "thumb"], cyl([0.3, 0.86, 6], [0, 0.2, 1], 22, 60)],
  [32, "ventral", "Ventral", "intermediate", "side", "adducted", 0.4, { index: F(15, 10, 5), middle: F(15, 10, 5), ring: F(20, 15, 8), little: F(25, 20, 10), thumb: T(0, 15, 10, 5, 5) }, ["index"], box([0.1, 0.92, -0.85], [16, 70, 6], [1, 0, 0], [0, 0, 1])],
  [33, "inferior-pincer", "Inferior pincer", "precision", "pad", "abducted", 0.6, { index: F(35, 40, 20), middle: F(55, 70, 40), ring: F(60, 75, 45), little: F(65, 80, 45), thumb: T(25, 50, 65, 10, 10) }, ["index", "thumb"], sph([0.34, 0.86, 8], 10)],
];

/**
 * Resolve a prop template for a hand. x and y are fractions of the hand's breadth and length; the depth places the
 * object by its contact: on the palm (power grasps), held off the palm between the pads (precision grasps: the third
 * number is the gap in mm), beside the index (side grasps) or hanging in hooked fingers. Sizes in mm, scaled by hand
 * length / 190 mm.
 */
function placeProp(t: PropTemplate, hand: Hand, anchor: "palm" | "pad" | "side" | "hook" = "palm"): Prop {
  const L = hand.type.length, B = hand.type.breadth, P = hand.palm.thick, k = L / 190;
  // the distance from the object's centre to the palm: a disk lying flat on the palm touches it with its face
  const flat = t.kind === "cylinder" && Math.abs((t.axis ?? [1, 0, 0])[2]) > 0.7;
  const r = t.kind === "box" ? (t.size[2] / 2) * k : flat ? (t.size[1] / 2) * k : (t.size[0] / 2) * k;
  // a hook carries the bar in the crook of the bent fingers, at their middle joints
  const mid = hand.fingers.middle, hookY = mid.base[1] + mid.lengths[0] * 0.95, hookZ = -(mid.radii[1] + (t.size[0] / 2) * k + mid.lengths[1] * 0.35);
  const z = anchor === "palm" ? -(0.48 * P + r) : anchor === "pad" ? -(0.4 * P + r + t.at[2] * k) : anchor === "hook" ? hookZ : -(0.1 * P);
  const c: Vec3 = [anchor === "side" ? 0.5 * B + r : t.at[0] * B, anchor === "hook" ? hookY : t.at[1] * L, z];
  if (t.kind === "cylinder") return { kind: "cylinder", centre: c, axis: nrm(t.axis ?? [1, 0, 0]), radius: (t.size[0] / 2) * k, half: (t.size[1] / 2) * k };
  if (t.kind === "sphere") return { kind: "sphere", centre: c, radius: (t.size[0] / 2) * k };
  if (t.kind === "box") { const ax = nrm(t.axis ?? [1, 0, 0]); let ay = nrm(t.axisY ?? [0, 1, 0]); ay = nrm(sub(ay, sc(ax, dot(ay, ax)))); return { kind: "box", centre: c, half: [(t.size[0] / 2) * k, (t.size[1] / 2) * k, (t.size[2] / 2) * k], axisX: ax, axisY: ay }; }
  return { kind: "none" };
}

export const GRASPS: readonly (Omit<GraspSpec, "prop"> & { propTemplate: PropTemplate })[] = GRASP_TABLE.map(([n, id, label, kind, opposition, thumb, freq, pose, close, propTemplate]) => ({ n, id, label, kind, opposition, thumb, freq, pose, close, propTemplate }));
export const findGrasp = (id: string) => GRASPS.find(g => g.id === id) ?? GRASPS[2];

/** Signed distance to a prop, mm. */
export function propDistance(p: Vec3, pr: Prop): number {
  if (pr.kind === "sphere") return len(sub(p, pr.centre)) - pr.radius;
  if (pr.kind === "cylinder") {
    const d = sub(p, pr.centre), a = dot(d, pr.axis), radial = len(sub(d, sc(pr.axis, a)));
    const qx = radial - pr.radius, qy = Math.abs(a) - pr.half;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  }
  if (pr.kind === "box") {
    const d = sub(p, pr.centre), az = cross(pr.axisX, pr.axisY), q: Vec3 = [Math.abs(dot(d, pr.axisX)) - pr.half[0], Math.abs(dot(d, pr.axisY)) - pr.half[1], Math.abs(dot(d, az)) - pr.half[2]];
    return Math.min(Math.max(q[0], q[1], q[2]), 0) + len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) - 0.6;
  }
  return Infinity;
}

// ---- Posing ------------------------------------------------------------------------------------------------------------------------

/** A placed bone: from `a` to `b` with radii, its local frame, and which finger and segment it is. */
export interface PlacedBone { finger: FingerId; seg: 0 | 1 | 2; a: Vec3; b: Vec3; ra: number; rb: number; up: Vec3; side: Vec3 }
export interface PosedHand { hand: Hand; pose: HandPose; bones: PlacedBone[]; knuckles: Vec3[]; wristRot: (v: Vec3) => Vec3; prop: Prop }

/** Fill unspecified end joints (DIP ≈ ⅔ PIP, Rijpkema & Girard 1991) and add a little neighbour coupling (enslaving). */
function completePose(pose: HandPose): HandPose {
  const fs = ["index", "middle", "ring", "little"] as const, out = { ...pose } as HandPose;
  const flex = fs.map(f => pose[f].mcp + pose[f].pip);
  fs.forEach((f, i) => {
    const a = pose[f];
    // neighbours flex a little with a finger (ring and little most), only toward more flexion and only when it is held straight
    const nb = [i > 0 ? flex[i - 1] : 0, i < 3 ? flex[i + 1] : 0], coupling = f === "ring" || f === "little" ? 0.12 : 0.06;
    const pull = Math.max(0, Math.max(...nb) - flex[i]) * coupling * (flex[i] < 20 ? 1 : 0);
    out[f] = { mcp: a.mcp + pull * 0.4, pip: a.pip + pull * 0.6, dip: a.dip ?? (a.pip + pull * 0.6) * (2 / 3), spread: a.spread ?? 0 };
  });
  return out;
}

/** Place every bone of a hand in a pose (and optionally hold a prop). */
export function poseHand(hand: Hand, pose0: HandPose, prop: Prop = { kind: "none" }): PosedHand {
  const pose = completePose(pose0), bones: PlacedBone[] = [];
  // the wrist: flexion about x (toward the palm, -z), deviation about z (toward the thumb, +x)
  const wf = rad(pose.wrist?.flex ?? 0), wd = rad(pose.wrist?.dev ?? 0);
  const wristRot = (v: Vec3) => rotAxis(rotAxis(v, [1, 0, 0], -wf), [0, 0, 1], wd);
  for (const f of ["index", "middle", "ring", "little"] as const) {
    const g = hand.fingers[f], a = pose[f];
    // spread: + moves a finger away from the middle finger (the middle finger itself: + toward the thumb); a turn of +θ
    // about +z carries +y toward −x, and the thumb is at +x
    const away = f === "ring" || f === "little" ? 1 : -1;
    let dir = rotAxis(g.dir, [0, 0, 1], rad(away * (a.spread ?? 0)));
    let up: Vec3 = [0, 0, 1], pos = g.base;
    const side = nrm(cross(dir, up)), flexes = [a.mcp, a.pip, a.dip ?? 0];
    for (let s = 0; s < 3; s++) {
      dir = rotAxis(dir, side, rad(-flexes[s])); up = rotAxis(up, side, rad(-flexes[s]));
      const end = add(pos, sc(dir, g.lengths[s]));
      bones.push({ finger: f, seg: s as 0 | 1 | 2, a: wristRot(pos), b: wristRot(end), ra: g.radii[s], rb: g.radii[s + 1], up: wristRot(up), side: wristRot(side) });
      pos = end;
    }
  }
  const placeThumb = (a: ThumbAngles) => {
    const g = hand.fingers.thumb, out: PlacedBone[] = [];
    let dir = g.dir, up = g.up;
    const palmN: Vec3 = [0, 0, 1], abAxis = nrm(cross(dir, palmN));
    dir = rotAxis(dir, abAxis, rad(-(a.cmcAbduct - 25))); up = rotAxis(up, abAxis, rad(-(a.cmcAbduct - 25)));
    dir = rotAxis(dir, palmN, rad(a.cmcFlex)); up = rotAxis(up, palmN, rad(a.cmcFlex));
    up = rotAxis(up, dir, rad(-a.oppose * 0.9));
    let side = nrm(cross(dir, up)), pos = g.base;
    const flexes = [0, a.mcp, a.ip];
    for (let s2 = 0; s2 < 3; s2++) {
      if (s2 > 0) { dir = rotAxis(dir, side, rad(-flexes[s2])); up = rotAxis(up, side, rad(-flexes[s2])); }
      const end = add(pos, sc(dir, g.lengths[s2]));
      out.push({ finger: "thumb", seg: s2 as 0 | 1 | 2, a: pos, b: end, ra: g.radii[s2], rb: g.radii[s2 + 1], up, side });
      pos = end; side = nrm(cross(dir, up));
    }
    return out;
  };
  if (pose.thumbTo || pose.thumbPoint) {
    // the target on the finger's surface (before the wrist turns), and the thumb's pad: just short of its tip, palmar
    const tt = pose.thumbTo, fb = tt ? bones.find(b => b.finger === tt.finger && b.seg === tt.seg) : undefined;
    let target: Vec3 | undefined = pose.thumbPoint;
    if (tt && fb) {
      const unW = (v: Vec3) => rotAxis(rotAxis(v, [0, 0, 1], -wd), [1, 0, 0], wf);
      const A0 = unW(fb.a), B0 = unW(fb.b), U0 = unW(fb.up), r0 = fb.ra + (fb.rb - fb.ra) * tt.at;
      target = add(add(A0, sc(sub(B0, A0), tt.at)), sc(U0, (tt.face === "dorsal" ? 1 : -1) * (r0 + hand.fingers.thumb.radii[3] * 0.8)));
    }
    if (target) {
      const tgt = target;
      const cost = (a: ThumbAngles) => { const tb = placeThumb(a)[2], pad = add(add(tb.a, sc(sub(tb.b, tb.a), 0.8)), sc(tb.up, -tb.rb * 0.6)); return len(sub(pad, tgt)); };
      const lim: Record<keyof ThumbAngles, [number, number]> = { cmcFlex: [-30, 70], cmcAbduct: [0, 70], oppose: [-10, 80], mcp: [-5, 55], ip: [-15, 80] };
      let best = { ...pose.thumb }, bc = cost(best);
      for (const step of [16, 8, 4, 2, 1, 0.5]) {
        let improved = true;
        for (let rep = 0; rep < 8 && improved; rep++) {
          improved = false;
          for (const k of Object.keys(lim) as (keyof ThumbAngles)[]) for (const sg of [-1, 1]) {
            const c = { ...best, [k]: clamp(best[k] + sg * step, lim[k][0], lim[k][1]) }, cc = cost(c);
            if (cc < bc - 1e-3) { best = c; bc = cc; improved = true; }
          }
        }
      }
      pose.thumb = best;
    }
  }
  // the thumb: CMC abducts away from the palm (about the axis along the index metacarpal), flexes across the palm
  // (about the palm's normal) and pronates (opposition) about its own axis; then MCP and IP flex
  for (const b of placeThumb(pose.thumb)) bones.push({ ...b, a: wristRot(b.a), b: wristRot(b.b), up: wristRot(b.up), side: wristRot(b.side) });
  const moveProp = (p: Prop): Prop => p.kind === "none" ? p : p.kind === "sphere" ? { ...p, centre: wristRot(p.centre) } : p.kind === "cylinder" ? { ...p, centre: wristRot(p.centre), axis: wristRot(p.axis) } : { ...p, centre: wristRot(p.centre), axisX: wristRot(p.axisX), axisY: wristRot(p.axisY) };
  return { hand, pose, bones, knuckles: hand.knuckles.map(wristRot), wristRot, prop: moveProp(prop) };
}

/** Does a finger chain (from segment `from` on) touch the prop? Samples along each segment against its radius. */
function chainTouches(ph: PosedHand, f: FingerId, from: number, pr: Prop, gap = 0.6): boolean {
  for (const b of ph.bones) {
    if (b.finger !== f || b.seg < from) continue;
    for (let k = 0; k <= 6; k++) { const t = k / 6, p = add(b.a, sc(sub(b.b, b.a), t)), r = b.ra + (b.rb - b.ra) * t; if (propDistance(p, pr) < r * 0.92 + gap) return true; }
  }
  return false;
}

/**
 * Shape the hand for a grasp, then close each listed finger joint by joint until it touches the object (proximal
 * joints first, the further joints then wrap): the hand fits the object whatever its size.
 */
export function graspHand(hand: Hand, graspId: string, closeAmount = 1): PosedHand {
  const g = findGrasp(graspId), anchor = g.id === "fixed-hook" ? "hook" : g.opposition;
  const pose: HandPose = JSON.parse(JSON.stringify(g.pose));
  let prop = placeProp(g.propTemplate, hand, anchor);
  // the adduction grip holds a thin object between the index and middle fingers' proximal phalanges
  if (g.id === "adduction" && prop.kind === "cylinder") {
    const pre = poseHand(hand, pose), ix = pre.bones.find(b => b.finger === "index" && b.seg === 0)!, md = pre.bones.find(b => b.finger === "middle" && b.seg === 0)!;
    const at = (b: PlacedBone) => add(b.a, sc(sub(b.b, b.a), 0.7));
    prop = { ...prop, centre: sc(add(at(ix), at(md)), 0.5), axis: nrm(add(ix.up, md.up)) };
  }
  // precision and side grasps: the object sits where the pre-shaped pads meet (the thumb's and the closing fingers')
  else if (anchor === "pad" || anchor === "side") {
    const pre = poseHand(hand, pose), pads: Vec3[] = [];
    for (const b of pre.bones) if (b.seg === 2 && g.close.includes(b.finger)) pads.push(add(add(b.a, sc(sub(b.b, b.a), 0.75)), sc(b.up, -b.rb)));
    if (anchor === "side") { const ix = pre.bones.find(b => b.finger === "index" && b.seg === 1); if (ix) pads.push(add(add(ix.a, sc(sub(ix.b, ix.a), 0.5)), sc(ix.side, -ix.ra))); }
    if (pads.length) {
      const c = sc(pads.reduce((a, b) => add(a, b), [0, 0, 0] as Vec3), 1 / pads.length);
      prop = prop.kind === "none" ? prop : { ...prop, centre: c } as Prop;
    }
  }
  const maxF = { mcp: 90, pip: 105, dip: 75 };
  /** Open a joint until the chain beyond it is free of the object, then close it until it touches. */
  const settle = (lo0: number, hi: number, at: (v: number) => boolean, minV: number) => {
    let lo = lo0;
    if (at(lo)) { let a = minV, b = lo; if (at(a)) return a; for (let it = 0; it < 12; it++) { const m = (a + b) / 2; if (at(m)) b = m; else a = m; } return a; }
    if (!at(hi)) return hi;
    let a = lo, b = hi; for (let it = 0; it < 12; it++) { const m = (a + b) / 2; if (at(m)) b = m; else a = m; }
    lo = a; return lo;
  };
  for (const f of g.close) {
    if (f === "thumb") continue;
    for (const j of ["mcp", "pip", "dip"] as const) {
      const fa = pose[f], lo = (fa[j] ?? (j === "dip" ? (fa.pip * 2) / 3 : 0)), hi = lo + (maxF[j] - lo) * closeAmount, seg = j === "mcp" ? 0 : j === "pip" ? 1 : 2;
      const at = (v: number) => { const q: HandPose = JSON.parse(JSON.stringify(pose)); q[f][j] = v; if (j === "pip" && q[f].dip === undefined) q[f].dip = v * (2 / 3); return chainTouches(poseHand(hand, q, prop), f, seg, prop); };
      fa[j] = settle(lo, hi, at, j === "mcp" ? -10 : 0);
      if (j === "pip" && fa.dip === undefined) fa.dip = ((fa.pip ?? 0) * 2) / 3;
    }
  }
  // the thumb: around a cylinder it wraps over the index finger's middle phalanx; otherwise its pad meets the object on
  // the side facing it
  if (g.close.includes("thumb") && prop.kind !== "none") {
    if (prop.kind === "cylinder" && anchor === "palm") pose.thumbTo = { finger: "index", seg: 1, at: 0.5, face: "dorsal" };
    else {
      const c = prop.centre, tb = hand.fingers.thumb.base, toward = nrm(sub(tb, c));
      const r = prop.kind === "sphere" ? prop.radius : prop.kind === "cylinder" ? prop.radius : Math.min(...prop.half);
      pose.thumbPoint = add(c, sc(toward, r + hand.fingers.thumb.radii[3] * 0.8));
    }
    if (closeAmount < 1) { const open = poseHand(hand, g.pose).pose.thumb, solved = poseHand(hand, pose, prop).pose.thumb; pose.thumbTo = undefined; pose.thumbPoint = undefined; pose.thumb = { cmcFlex: open.cmcFlex + (solved.cmcFlex - open.cmcFlex) * closeAmount, cmcAbduct: open.cmcAbduct + (solved.cmcAbduct - open.cmcAbduct) * closeAmount, oppose: open.oppose + (solved.oppose - open.oppose) * closeAmount, mcp: open.mcp + (solved.mcp - open.mcp) * closeAmount, ip: open.ip + (solved.ip - open.ip) * closeAmount }; }
  }
  return poseHand(hand, pose, prop);
}

// ---- Animation ---------------------------------------------------------------------------------------------------------------------

/** The minimum-jerk profile of human point-to-point movement (Flash & Hogan 1985): 10τ³ − 15τ⁴ + 6τ⁵. */
export const minimumJerk = (t: number) => { const x = clamp(t, 0, 1); return x * x * x * (10 + x * (-15 + 6 * x)); };

export interface HandKey { t: number; pose?: string | HandPose; grasp?: string; close?: number; wrist?: { flex: number; dev: number } }
export interface HandAnimation { id: string; label: string; duration: number; loop: boolean; keys: HandKey[];
  /** Per-finger delays (s): fingers start a move a little apart, not in lockstep. */
  delays?: Partial<Record<FingerId, number>>;
  /** A small oscillation on top: what moves, its amplitude (degrees) and frequency (Hz). */
  wobble?: { what: "wrist-dev" | "wrist-flex" | "index"; amp: number; hz: number };
  note: string }

const gesture = (id: string) => HAND_GESTURES.find(g => g.id === id)?.pose ?? HAND_GESTURES[0].pose;

/** Actions, timed after video of real hands (durations estimated). */
export const HAND_ANIMATIONS: readonly HandAnimation[] = [
  { id: "wave", label: "Wave", duration: 2, loop: true, note: "The open hand rocks at the wrist about twice a second.", keys: [{ t: 0, pose: "spread" }, { t: 2, pose: "spread" }], wobble: { what: "wrist-dev", amp: 22, hz: 2 } },
  { id: "grasp-release", label: "Grasp and release", duration: 2.6, loop: true, note: "Open round a handle, close on it (the fingers a few tens of milliseconds apart), hold, let go.", keys: [{ t: 0, grasp: "medium-wrap", close: 0 }, { t: 0.4, grasp: "medium-wrap", close: 0 }, { t: 1.0, grasp: "medium-wrap", close: 1 }, { t: 1.8, grasp: "medium-wrap", close: 1 }, { t: 2.6, grasp: "medium-wrap", close: 0 }], delays: { little: 0, ring: 0.03, middle: 0.06, index: 0.09, thumb: 0.05 } },
  { id: "count", label: "Count to five", duration: 4.4, loop: true, note: "From a fist, one finger after another (index first, the thumb last).", keys: [{ t: 0, pose: "fist" }, { t: 0.6, pose: "point" }, { t: 1.4, pose: "peace" }, { t: 2.2, pose: { index: F(2, 2, 0, 8), middle: F(2, 2, 0, -2), ring: F(2, 2, 0, 8), little: F(88, 102, 62), thumb: T(30, 18, 45, 35, 25) } }, { t: 3.0, pose: { index: F(2, 2, 0, 8), middle: F(2, 2, 0, 0), ring: F(2, 2, 0, 6), little: F(2, 2, 0, 14), thumb: T(30, 18, 45, 35, 25) } }, { t: 3.8, pose: "spread" }, { t: 4.4, pose: "fist" }] },
  { id: "beckon", label: "Beckon", duration: 1.6, loop: true, note: "\"Come here\": the index curls and straightens, about once a second.", keys: [{ t: 0, pose: "beckon" }, { t: 1.6, pose: "beckon" }], wobble: { what: "index", amp: 32, hz: 1.25 } },
  { id: "drum", label: "Drum the fingers", duration: 1.2, loop: true, note: "Little, ring, middle, index tap in turn, about 100 ms apart.", keys: [{ t: 0, pose: "relaxed" }, { t: 1.2, pose: "relaxed" }] },
  { id: "pinch-release", label: "Pinch and let go", duration: 2.2, loop: true, note: "Thumb and index meet on a small bead and part.", keys: [{ t: 0, grasp: "tip-pinch", close: 0 }, { t: 0.5, grasp: "tip-pinch", close: 0 }, { t: 1.0, grasp: "tip-pinch", close: 1 }, { t: 1.6, grasp: "tip-pinch", close: 1 }, { t: 2.2, grasp: "tip-pinch", close: 0 }] },
  { id: "thumbs-up", label: "Thumbs up", duration: 2, loop: true, note: "A fist, then the thumb rises.", keys: [{ t: 0, pose: "fist" }, { t: 0.5, pose: "fist" }, { t: 1.0, pose: "thumbs-up" }, { t: 1.6, pose: "thumbs-up" }, { t: 2, pose: "fist" }] },
  { id: "ok-sign", label: "Make an OK", duration: 2.2, loop: true, note: "From relaxed, thumb and index meet in a ring while the others lift.", keys: [{ t: 0, pose: "relaxed" }, { t: 0.9, pose: "ok" }, { t: 1.5, pose: "ok" }, { t: 2.2, pose: "relaxed" }] },
];
export const findAnimation = (id: string) => HAND_ANIMATIONS.find(a => a.id === id) ?? HAND_ANIMATIONS[0];

const lerpPose = (a: HandPose, b: HandPose, k: number, kf?: Partial<Record<FingerId, number>>): HandPose => {
  const out = {} as HandPose;
  for (const f of ["index", "middle", "ring", "little"] as const) {
    const t = kf?.[f] ?? k, fa = a[f], fb = b[f];
    out[f] = { mcp: fa.mcp + (fb.mcp - fa.mcp) * t, pip: fa.pip + (fb.pip - fa.pip) * t, dip: (fa.dip ?? fa.pip * 2 / 3) + ((fb.dip ?? fb.pip * 2 / 3) - (fa.dip ?? fa.pip * 2 / 3)) * t, spread: (fa.spread ?? 0) + ((fb.spread ?? 0) - (fa.spread ?? 0)) * t };
  }
  const t = kf?.thumb ?? k, ta = a.thumb, tb = b.thumb;
  out.thumb = { cmcFlex: ta.cmcFlex + (tb.cmcFlex - ta.cmcFlex) * t, cmcAbduct: ta.cmcAbduct + (tb.cmcAbduct - ta.cmcAbduct) * t, oppose: ta.oppose + (tb.oppose - ta.oppose) * t, mcp: ta.mcp + (tb.mcp - ta.mcp) * t, ip: ta.ip + (tb.ip - ta.ip) * t };
  const wa = a.wrist ?? { flex: 0, dev: 0 }, wb = b.wrist ?? { flex: 0, dev: 0 };
  out.wrist = { flex: wa.flex + (wb.flex - wa.flex) * k, dev: wa.dev + (wb.dev - wa.dev) * k };
  return out;
};

/** The hand at time t (s) of an animation: the pose (and the object, if a key holds one). */
export function animateHand(hand: Hand, anim: HandAnimation, t0: number): PosedHand {
  const t = anim.loop ? ((t0 % anim.duration) + anim.duration) % anim.duration : clamp(t0, 0, anim.duration);
  const resolve = (k: HandKey): { pose: HandPose; prop: Prop } => {
    if (k.grasp) { const ph = graspHand(hand, k.grasp, k.close ?? 1); return { pose: ph.pose, prop: ph.prop }; }
    const pose = typeof k.pose === "string" ? gesture(k.pose) : k.pose ?? gesture("relaxed");
    return { pose: k.wrist ? { ...pose, wrist: k.wrist } : pose, prop: { kind: "none" } };
  };
  let i = 0; while (i < anim.keys.length - 2 && anim.keys[i + 1].t <= t) i++;
  const ka = anim.keys[i], kb = anim.keys[Math.min(anim.keys.length - 1, i + 1)], span = Math.max(1e-6, kb.t - ka.t);
  const A0 = resolve(ka), B0 = resolve(kb);
  const kf: Partial<Record<FingerId, number>> = {};
  for (const f of FINGERS) kf[f] = minimumJerk((t - ka.t - (anim.delays?.[f] ?? 0)) / Math.max(0.05, span - (anim.delays?.[f] ?? 0)));
  let pose = lerpPose(A0.pose, B0.pose, minimumJerk((t - ka.t) / span), kf);
  if (anim.id === "drum") {
    // little, ring, middle, index tap in turn: each lifts (extends) and comes down again
    const order: FingerId[] = ["little", "ring", "middle", "index"];
    order.forEach((f, k) => { const ph = (t - k * 0.11) / 0.22; if (ph > 0 && ph < 1 && f !== "thumb") { const lift = Math.sin(Math.PI * ph); const fa = pose[f as Exclude<FingerId, "thumb">]; pose = { ...pose, [f]: { ...fa, mcp: fa.mcp - 30 * lift, pip: fa.pip - 12 * lift } }; } });
  }
  if (anim.wobble) {
    const w = Math.sin(2 * Math.PI * anim.wobble.hz * t) * anim.wobble.amp;
    if (anim.wobble.what === "wrist-dev") pose = { ...pose, wrist: { flex: pose.wrist?.flex ?? 0, dev: (pose.wrist?.dev ?? 0) + w } };
    if (anim.wobble.what === "wrist-flex") pose = { ...pose, wrist: { flex: (pose.wrist?.flex ?? 0) + w, dev: pose.wrist?.dev ?? 0 } };
    if (anim.wobble.what === "index") { const c = (w / anim.wobble.amp) * 0.5 + 0.5; pose = { ...pose, index: { ...pose.index, mcp: 20 + 45 * c, pip: 30 + 60 * c, dip: 15 + 40 * c } }; }
  }
  const prop = kb.grasp && minimumJerk((t - ka.t) / span) > 0.5 ? B0.prop : A0.prop.kind !== "none" ? A0.prop : B0.prop;
  return poseHand(hand, pose, prop);
}

// ---- Evidence ----------------------------------------------------------------------------------------------------------------------

export const HAND_EVIDENCE: readonly { id: string; grade: "reported" | "measured" | "estimated"; finding: string; source: string; url?: string }[] = [
  { id: "ansur", grade: "reported", finding: "Hand length 181 ± 10 mm (women) and 193 ± 10 mm (men); breadth 78 ± 4 and 88 ± 4 mm; palm length 109 ± 6 and 116 ± 6 mm.", source: "ANSUR II (2012), as in ANAT1's ansur-ii-ranges.json" },
  { id: "phalanges", grade: "reported", finding: "The middle and distal phalanges together are about as long as the proximal; the distance from the middle joint to the tip is about 1.3 times the end segment for the index, middle and ring fingers, and about 1.0 for the little finger.", source: "Radiographic studies of finger proportions (Folia Morphologica; Anat Cell Biol 57(2), 2024)", url: "https://synapse.koreamed.org/articles/1516087497" },
  { id: "children", grade: "reported", finding: "Children's fingers lengthen about 37% from 3 to 10 years (middle finger about 72 mm on average), with no difference between boys and girls.", source: "Lengths, girths and diameters of children's fingers from 3 to 10 years, Ann Anat 2010" },
  { id: "digit-ratio", grade: "reported", finding: "The index-to-ring finger ratio (2D:4D) is lower in men (about 0.95) than in women (about 0.97).", source: "Manning et al. 1998 and later meta-analyses" },
  { id: "grasp", grade: "reported", finding: "33 grasp types, classed as power, intermediate or precision, by opposition (palm, pad, side) and thumb (abducted, adducted); in housekeeping and machining work the medium wrap (12.7%), lateral tripod (10.4%), lateral (8.9%) and tripod (8.4%) were the most frequent.", source: "Feix, Romero, Schmiedmayer, Dollar & Kragic, The GRASP taxonomy of human grasp types, IEEE THMS 46(1):66–77, 2016", url: "https://ieeexplore.ieee.org/document/7243327" },
  { id: "rom", grade: "reported", finding: "Finger MCP 0–90°, PIP 0–100°, DIP 0–80°; thumb MCP 0–50°, IP −10–80°.", source: "AAOS normal ROM via Hendriks et al., Plast Reconstr Surg Glob Open 2020 (ANAT1 JOINTS)" },
  { id: "dip-pip", grade: "reported", finding: "In natural flexion the end joint follows the middle joint at about two-thirds of its angle.", source: "Rijpkema & Girard 1991, Computer animation of knowledge-based human grasping (SIGGRAPH)" },
  { id: "min-jerk", grade: "reported", finding: "Human point-to-point movements follow the minimum-jerk profile 10τ³ − 15τ⁴ + 6τ⁵.", source: "Flash & Hogan 1985, J Neurosci 5:1688" },
  { id: "cascade", grade: "reported", finding: "At rest the fingers flex progressively more from the index to the little finger (the normal cascade); a finger out of the cascade is a clinical sign of injury.", source: "Clinical hand examination" },
  { id: "enslaving", grade: "reported", finding: "Fingers are not independent: moving one moves its neighbours a little, most between the ring and little fingers.", source: "Zatsiorsky, Li & Latash 2000 (enslaving)" },
];
