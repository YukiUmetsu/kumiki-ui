/**
 * MOTION1: human movement on ANAT1's posable body. Walking and running as joint-angle curves through the gait cycle,
 * how a mood changes a walk, and the cycle placed on the ground so the standing foot never slides.
 *
 * - `GAITS`: walk and run, with speeds, cadences, stance shares and sagittal joint-angle curves (hip, knee, ankle,
 *   toes; arm swing and trunk). The curves follow the shapes of the normative data (Winter 1991, "The biomechanics and
 *   motor control of human gait"; Perry & Burnfield 2010; running: Novacheck 1998, Gait & Posture 7:77) as keyframes;
 *   values are approximate reconstructions (estimated), the timing landmarks reported.
 * - `MOODS`: how emotion shows in a walk (Roether, Omlor, Christensen & Giese 2009, J Vis 9(6):15; Montepare et al.
 *   1987): sad is slower with less arm swing and a bowed head; happy and angry faster with more arm swing; fear tense
 *   and short-stepped. Directions reported, sizes estimated.
 * - `gaitPose(gait, phase, mood)`: an ANAT1 `HumanPose` at a phase (0 = right heel strike).
 * - `gaitCycle(body, gait, { frames, mood })`: posed frames with the body placed on the ground: the lowest point of the
 *   feet on the floor, and the stance foot held where it landed (the body moves over it), so feet never slide.
 */
import type { HumanBody } from "./anatomy-body";
import { humanLandmarks } from "./anatomy-body";
import type { HumanPose } from "./anatomy-pose";
import { poseHumanBody } from "./anatomy-pose";
import type { Range } from "./foundation-shapes";
import { range as r } from "./foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

type Keys = readonly (readonly [number, number])[];
export interface Gait {
  id: "walk" | "run";
  label: string;
  speed: Range; cadence: Range; strideLength: Range;
  /** Share of the cycle a foot is on the ground (toe-off), and the events in words. */
  stance: number; events: readonly string[];
  /** Joint angles through the cycle (phase 0–1 from right heel strike), degrees, for the right side (the left is half a cycle later). */
  curves: { hip: Keys; knee: Keys; ankle: Keys; toes: Keys; shoulder: Keys; elbow: Keys };
  /** Trunk lean (flexion) and twist amplitude, degrees. */
  trunkLean: number; trunkTwist: number;
  sources: readonly string[];
}

export const GAITS: Record<"walk" | "run", Gait> = {
  walk: {
    id: "walk", label: "Walking",
    speed: rep(1.2, 1.4, 1.5, "Wikipedia: Preferred walking speed (about 1.4 m/s)"), cadence: rep(100, 112, 125, "Wikipedia: Cadence (gait) (about 100–120 steps a minute)"), strideLength: rep(1.2, 1.45, 1.6, "Wikipedia: Gait (human)"),
    stance: 0.6, events: ["0%: heel strike (knee nearly straight, ankle neutral)", "about 10%: foot flat; the knee flexes about 15–20° to absorb the load", "about 30%: mid-stance, the body over the foot (highest point)", "about 40%: heel rises", "about 60%: toe-off (ankle plantarflexed about 15–20°)", "about 73%: the swing knee bends most, about 60°", "100%: the next heel strike"],
    curves: {
      hip: [[0, 30], [0.12, 27], [0.3, 10], [0.5, -10], [0.6, -5], [0.73, 18], [0.87, 32], [1, 30]],
      knee: [[0, 3], [0.15, 18], [0.4, 4], [0.55, 25], [0.62, 40], [0.73, 61], [0.87, 30], [0.97, 3], [1, 3]],
      ankle: [[0, 0], [0.07, -6], [0.3, 7], [0.45, 10], [0.6, -16], [0.68, -12], [0.8, 0], [1, 0]],
      toes: [[0, 0], [0.45, 5], [0.55, -25], [0.62, -35], [0.7, -5], [1, 0]],
      shoulder: [[0, -16], [0.25, -2], [0.5, 16], [0.75, 2], [1, -16]],
      elbow: [[0, 12], [0.25, 18], [0.5, 30], [0.75, 18], [1, 12]],
    },
    trunkLean: 3, trunkTwist: 5,
    sources: ["Winter 1991, The biomechanics and motor control of human gait", "Perry & Burnfield 2010, Gait Analysis", "Wikipedia: Gait (human)"],
  },
  run: {
    id: "run", label: "Running (jogging pace)",
    speed: rep(2.5, 3.5, 5, "Novacheck 1998 (jogging 3.2 m/s, running 3.9 m/s)"), cadence: rep(150, 165, 185, "Wikipedia: Running (recreational cadence about 160–180 steps a minute)"), strideLength: est(2, 2.5, 3.2),
    stance: 0.38, events: ["0%: foot strike under the hips, knee bent about 20°", "about 15%: the knee bends about 40° as the body passes over (absorption)", "about 38%: toe-off; then both feet leave the ground (flight)", "about 70%: the swing knee bends about 100°, the heel near the buttock", "about 90%: the thigh drives forward, the shin reaches out"],
    curves: {
      hip: [[0, 32], [0.15, 18], [0.38, -10], [0.5, 0], [0.7, 42], [0.85, 48], [1, 32]],
      knee: [[0, 20], [0.15, 42], [0.38, 16], [0.55, 70], [0.7, 102], [0.88, 45], [1, 20]],
      ankle: [[0, 5], [0.15, 18], [0.38, -20], [0.5, -10], [0.8, 8], [1, 5]],
      toes: [[0, 0], [0.3, -10], [0.38, -30], [0.48, 0], [1, 0]],
      shoulder: [[0, -30], [0.25, 0], [0.5, 32], [0.75, 0], [1, -30]],
      elbow: [[0, 80], [0.25, 95], [0.5, 105], [0.75, 90], [1, 80]],
    },
    trunkLean: 8, trunkTwist: 9,
    sources: ["Novacheck 1998, The biomechanics of running, Gait & Posture 7:77–95", "Wikipedia: Running"],
  },
};

export type MoodId = "neutral" | "happy" | "sad" | "angry" | "afraid" | "tired";
export interface Mood { id: MoodId; label: string; speed: number; stride: number; armSwing: number; elbow: number; head: number; trunk: number; bounce: number; note: string }
/** Emotion in a walk (directions reported by Roether et al. 2009 and Montepare et al. 1987; sizes estimated). */
export const MOODS: readonly Mood[] = [
  { id: "neutral", label: "Neutral", speed: 1, stride: 1, armSwing: 1, elbow: 0, head: 0, trunk: 0, bounce: 1, note: "The reference walk." },
  { id: "happy", label: "Happy", speed: 1.12, stride: 1.06, armSwing: 1.35, elbow: 5, head: -6, trunk: -2, bounce: 1.3, note: "Faster, longer steps, bigger arm swing, head up, a springy bounce." },
  { id: "sad", label: "Sad", speed: 0.78, stride: 0.86, armSwing: 0.45, elbow: -4, head: 18, trunk: 8, bounce: 0.6, note: "Slow, short steps, little arm swing, head bowed and trunk bent — the most recognised emotion in gait." },
  { id: "angry", label: "Angry", speed: 1.1, stride: 1.08, armSwing: 1.3, elbow: 22, head: -2, trunk: 4, bounce: 0.9, note: "Fast, heavy steps; bigger arm swing with elbows bent; chest forward." },
  { id: "afraid", label: "Afraid", speed: 0.9, stride: 0.8, armSwing: 0.6, elbow: 25, head: 8, trunk: 6, bounce: 0.7, note: "Tense, short steps, elbows bent and close, head drawn in." },
  { id: "tired", label: "Tired", speed: 0.75, stride: 0.82, armSwing: 0.5, elbow: -2, head: 12, trunk: 10, bounce: 0.6, note: "Slow, shuffling (little knee lift), shoulders slumped (estimated)." },
];
export const findMood = (id: string): Mood => MOODS.find(m => m.id === id) ?? MOODS[0];

/** A periodic curve through keyframes (Catmull-Rom), at phase 0–1. */
export function curveAt(keys: Keys, phase: number): number {
  const p = ((phase % 1) + 1) % 1, n = keys.length;
  let i = 0;
  while (i < n - 2 && keys[i + 1][0] <= p) i++;
  const k = (j: number) => keys[((j % (n - 1)) + (n - 1)) % (n - 1)];
  const p0 = k(i - 1), p1 = keys[i], p2 = keys[i + 1], p3 = k(i + 2);
  const t = (p - p1[0]) / Math.max(1e-6, p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
}

/** The pose at a phase of the cycle (0 = right heel strike), shaped by a mood. */
export function gaitPose(gaitId: "walk" | "run", phase: number, moodId: MoodId = "neutral"): HumanPose {
  const g = GAITS[gaitId], m = findMood(moodId), c = g.curves;
  const side = (ph: number, arm: number) => {
    const knee = curveAt(c.knee, ph) * (moodId === "tired" && ph > g.stance ? 0.75 : 1);
    return {
      hip: { flex: curveAt(c.hip, ph) * m.stride },
      knee: { flex: Math.max(0, knee) },
      ankle: { flex: curveAt(c.ankle, ph) },
      toes: { flex: curveAt(c.toes, ph) },
      // the arm swings with the opposite leg
      shoulder: { flex: curveAt(c.shoulder, arm) * m.armSwing, abduct: 6 },
      elbow: { flex: curveAt(c.elbow, arm) + m.elbow },
    };
  };
  const R = side(phase, phase), L = side(phase + 0.5, phase + 0.5);
  const twist = g.trunkTwist * Math.sin(2 * Math.PI * phase) * m.armSwing;
  return {
    "hip.R": R.hip, "knee.R": R.knee, "ankle.R": R.ankle, "toes.R": R.toes, "shoulder.R": R.shoulder, "elbow.R": R.elbow,
    "hip.L": L.hip, "knee.L": L.knee, "ankle.L": L.ankle, "toes.L": L.toes, "shoulder.L": L.shoulder, "elbow.L": L.elbow,
    spine: { flex: g.trunkLean + m.trunk, twist },
    neck: { flex: m.head - (g.trunkLean + m.trunk) * 0.5, twist: -twist },
  };
}

export interface GaitFrame { phase: number; points: Float32Array; root: [number, number, number]; stance: "L" | "R" | "flight"; contact: [number, number, number] | null }
export interface GaitCycle { gait: Gait; mood: Mood; frames: GaitFrame[]; /** Cycle time, s, and the distance covered in one cycle, m. */ seconds: number; stride: number }

/**
 * A full cycle of posed frames placed on the ground: each frame's lowest foot point on the floor (y = 0), and while a
 * foot is in stance its lowest point stays where it was (the body is moved over it), so feet never slide. In a run's
 * flight the body coasts at the stance's mean speed on a ballistic arc.
 */
export function gaitCycle(body: HumanBody, gaitId: "walk" | "run", o: { frames?: number; mood?: MoodId } = {}): GaitCycle {
  const g = GAITS[gaitId], m = findMood(o.mood ?? "neutral"), n = o.frames ?? 24;
  const seconds = 120 / (g.cadence.typical * m.speed);
  const raw = Array.from({ length: n }, (_, k) => {
    const phase = k / n, posed = poseHumanBody(body, gaitPose(gaitId, phase, m.id)), L = humanLandmarks(body, posed.points);
    // the foot rolls over three rockers: the heel, the ball (the metatarsal heads, about 72% toward the toe) and the toe
    const rockers = (s: "L" | "R") => { const h = L[`pternion.${s}`], t = L[`acropodion.${s}`], b: [number, number, number] = [h[0] + (t[0] - h[0]) * 0.72, h[1] + (t[1] - h[1]) * 0.72 - 0.012, h[2] + (t[2] - h[2]) * 0.72]; return [h, b, t]; };
    const lowest = (pts: number[][]) => pts.reduce((a, q, i) => (q[1] < pts[a][1] ? i : a), 0);
    const feet = { L: rockers("L"), R: rockers("R") };
    return { phase, points: posed.points, feet, low: { L: lowest(feet.L), R: lowest(feet.R) } };
  });
  const stanceOf = (ph: number): "L" | "R" | "flight" => {
    const inR = ph < g.stance, inL = ((ph + 0.5) % 1) < g.stance;
    if (inR && inL) return ph < 0.5 ? (ph < g.stance - 0.5 ? "L" : "R") : (ph - 0.5 < g.stance - 0.5 ? "R" : "L");
    return inR ? "R" : inL ? "L" : "flight";
  };
  const frames: GaitFrame[] = [];
  let rootZ = 0, speed = 0;
  const speeds: number[] = [];
  for (let k = 0; k < n; k++) {
    const f = raw[k], st = stanceOf(f.phase), low = Math.min(f.feet.L[f.low.L][1], f.feet.R[f.low.R][1]);
    if (k > 0) {
      // hold the stance foot's current rocker (the one touching now) where it was in the frame before
      const prev = raw[k - 1], pst = frames[k - 1].stance;
      if (st !== "flight" && pst === st) { const c = f.low[st], dz = prev.feet[st][c][2] - f.feet[st][c][2]; rootZ += dz; speeds.push(dz); }
      else rootZ += speed;
      if (speeds.length) speed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    }
    // in flight the body rides a shallow ballistic arc above the lower foot
    let lift = 0;
    if (st === "flight") { const ft = (1 - 2 * g.stance) / 2, u = ((f.phase % 0.5) - g.stance + 0.5 - 0.5) / Math.max(1e-6, ft); lift = 9.81 * (ft * seconds) ** 2 / 8 * (1 - (2 * Math.min(1, Math.max(0, u)) - 1) ** 2) * m.bounce; }
    const root: [number, number, number] = [0, -low + lift, rootZ];
    const cp = st === "flight" ? null : f.feet[st][f.low[st]];
    const contact = cp ? [cp[0], 0, cp[2] + rootZ] as [number, number, number] : null;
    frames.push({ phase: f.phase, points: f.points, root, stance: st, contact });
  }
  return { gait: g, mood: m, frames, seconds, stride: rootZ + speed };
}

/** Sit to stand in four phases (Schenkman et al. 1990, Phys Ther 70:638): keyframes as poses over about 1.6 s. */
export const SIT_TO_STAND: readonly { at: number; label: string; pose: HumanPose }[] = [
  { at: 0, label: "Seated", pose: { "hip.L": { flex: 90 }, "hip.R": { flex: 90 }, "knee.L": { flex: 95 }, "knee.R": { flex: 95 }, "ankle.L": { flex: 5 }, "ankle.R": { flex: 5 }, spine: { flex: 0 } } },
  { at: 0.3, label: "Flexion momentum: the trunk leans forward about 40°", pose: { "hip.L": { flex: 110 }, "hip.R": { flex: 110 }, "knee.L": { flex: 100 }, "knee.R": { flex: 100 }, "ankle.L": { flex: 15 }, "ankle.R": { flex: 15 }, spine: { flex: 25 }, "shoulder.L": { flex: 25 }, "shoulder.R": { flex: 25 } } },
  { at: 0.45, label: "Seat-off: the weight moves over the feet", pose: { "hip.L": { flex: 100 }, "hip.R": { flex: 100 }, "knee.L": { flex: 85 }, "knee.R": { flex: 85 }, "ankle.L": { flex: 18 }, "ankle.R": { flex: 18 }, spine: { flex: 20 }, "shoulder.L": { flex: 20 }, "shoulder.R": { flex: 20 } } },
  { at: 0.75, label: "Extension: hips and knees straighten together", pose: { "hip.L": { flex: 35 }, "hip.R": { flex: 35 }, "knee.L": { flex: 30 }, "knee.R": { flex: 30 }, "ankle.L": { flex: 8 }, "ankle.R": { flex: 8 }, spine: { flex: 8 } } },
  { at: 1, label: "Standing", pose: { "hip.L": { flex: 0 }, "hip.R": { flex: 0 }, "knee.L": { flex: 2 }, "knee.R": { flex: 2 }, "ankle.L": { flex: 0 }, "ankle.R": { flex: 0 }, spine: { flex: 0 } } },
];
export const SIT_TO_STAND_SECONDS = est(1.2, 1.6, 2.5, "Typical adults rise in about 1–2 s; older adults slower");
