/**
 * A RIG1 person from the joints of a painting: the bone lengths come from the painted figure, so any age or build keeps its
 * own proportions. At rest the arms and legs hang straight down, so an act means the same thing for every figure; `pose`
 * says how far each joint is turned in the painting itself. The painted figure faces right.
 */
import type { RigBone, RigDriver, RigLeg, RigSpec } from "./rig-spec";

export type Joint = readonly [number, number];
export interface LimbJoints { /** Shoulder or hip. */ top: Joint; /** Elbow or knee. */ mid: Joint; /** Wrist or ankle. */ end: Joint; /** Middle fingertip, or tip of the toe. */ tip: Joint; /** The sole below the ankle, when the painted foot does not stand on the ground (a figure painted in mid-stride). */ sole?: Joint }
export interface PersonJoints {
  /** Middle of the hips. */ pelvis: Joint; /** Base of the neck. */ neck: Joint; /** Where the skull turns: behind the jaw, below the ear. */ head: Joint; crown: Joint;
  /** Near arm and far arm, near leg and far leg. */ armF: LimbJoints; armB: LimbJoints; legF: LimbJoints; legB: LimbJoints;
  /** y of the sole. */ ground: number; /** x that the figure stands over. Default: between the ankles. */ over?: number;
}
/** A loose part: a scarf end, a bun, a bag, the hem of an apron. */
export interface ExtraBone { id: string; parent: string; at: Joint; /** Where it points. Default: straight down. */ to?: Joint; /** How it trails its parent: a bag swings, a pinned bun hardly does. Share of the parent's turn, seconds, degrees at most. */ sway?: { gain?: number; lag?: number; limit?: number }; /** 0–1: how much it hangs straight down when its parent turns (the corner of a wide sleeve). */ hang?: number }
export interface JointedPerson { spec: RigSpec; /** Turn of each joint in the painting, degrees. */ pose: Record<string, number>; legs: RigLeg[]; height: number; /** Degrees that the painted body is turned to the viewer, from how far apart its shoulders are. */ facing: number }

const DEG = 180 / Math.PI;
const span = (a: Joint, b: Joint) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** Turn that points a bone (down at 0, clockwise) from one joint to the next. */
const aim = (a: Joint, b: Joint) => Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * DEG;

/** Joints are in the figure's own units (centimetres, say), y down; the result stands on y = 0 over x = 0. */
export function personFromJoints(id: string, joints: PersonJoints, o: { extra?: readonly ExtraBone[]; /** Feet stay where they stand when the body shifts. Default true. */ plant?: boolean } = {}): JointedPerson {
  const over = joints.over ?? (joints.legF.end[0] + joints.legB.end[0]) / 2, move = (p: Joint): Joint => [p[0] - over, p[1] - joints.ground], limb = (l: LimbJoints): LimbJoints => ({ top: move(l.top), mid: move(l.mid), end: move(l.end), tip: move(l.tip), ...(l.sole ? { sole: move(l.sole) } : {}) });
  const j = { pelvis: move(joints.pelvis), neck: move(joints.neck), head: move(joints.head), crown: move(joints.crown), armF: limb(joints.armF), armB: limb(joints.armB), legF: limb(joints.legF), legB: limb(joints.legB) };
  const bones: RigBone[] = [{ id: "root", x: 0, y: 0 }], pose: Record<string, number> = {}, world: Record<string, { at: Joint; turn: number }> = { root: { at: [0, 0], turn: 0 } };
  // At rest a bone is where its parent's unturned frame puts it; in the painting the parents are turned, and so is the offset
  const add = (bone: string, parent: string, at: Joint, length: number, turn: number) => {
    const p = world[parent], dx = at[0] - p.at[0], dy = at[1] - p.at[1], a = -p.turn / DEG, c = Math.cos(a), s = Math.sin(a);
    // a part that is drawn shorter because it points at the viewer does not squeeze what hangs on it
    bones.push({ id: bone, parent, x: dx * c - dy * s, y: dx * s + dy * c, length, ...(/^(neck|arm|fore|hand|thigh|shin|foot)/.test(bone) ? { inheritScale: false } : {}) });
    world[bone] = { at, turn }; if (Math.abs(turn - p.turn) > 1e-6) pose[bone] = turn - p.turn;
  };
  add("pelvis", "root", j.pelvis, 0, 0);
  add("torso", "pelvis", j.pelvis, span(j.pelvis, j.neck), 0);
  add("neck", "torso", j.neck, span(j.neck, j.head), 0);
  add("head", "neck", j.head, span(j.head, j.crown), 0);
  for (const [k, l] of [["f", j.armF], ["b", j.armB]] as const) { add(`arm-${k}`, "torso", l.top, span(l.top, l.mid), aim(l.top, l.mid)); add(`fore-${k}`, `arm-${k}`, l.mid, span(l.mid, l.end), aim(l.mid, l.end)); add(`hand-${k}`, `fore-${k}`, l.end, span(l.end, l.tip), aim(l.end, l.tip)); }
  // a foot's bone is level at 0 whatever the shin does
  for (const [k, l] of [["f", j.legF], ["b", j.legB]] as const) { add(`thigh-${k}`, "pelvis", l.top, span(l.top, l.mid), aim(l.top, l.mid)); add(`shin-${k}`, `thigh-${k}`, l.mid, span(l.mid, l.end), aim(l.mid, l.end)); add(`foot-${k}`, `shin-${k}`, l.end, span(l.end, l.tip), 0); }
  for (const e of o.extra ?? []) { const at = move(e.at), to = e.to ? move(e.to) : ([at[0], at[1] + 10] as Joint), from = world[e.parent]; if (!from) throw new Error(`The bone "${e.id}" hangs from "${e.parent}", which does not exist.`); add(e.id, e.parent, at, span(at, to), aim(at, to)); }
  const legs: RigLeg[] = (["f", "b"] as const).map((k, i) => { const l = k === "f" ? j.legF : j.legB; return { upper: `thigh-${k}`, lower: `shin-${k}`, foot: `foot-${k}`, phase: i * 0.5, bend: 1, sole: l.sole ? l.sole[1] - l.end[1] : -l.end[1], toe: Math.max(0, l.tip[0] - l.end[0]) * 0.72 }; });
  const plant: RigDriver[] = o.plant === false ? [] : (["f", "b"] as const).map(k => { const l = k === "f" ? j.legF : j.legB, a = (l.mid[0] - l.top[0]) * (l.end[1] - l.top[1]) - (l.mid[1] - l.top[1]) * (l.end[0] - l.top[0]); return { type: "reach", upper: `thigh-${k}`, lower: `shin-${k}`, tip: `foot-${k}`, bend: a < 0 ? -1 : 1, target: [{ frame: 0, x: l.sole ? l.top[0] : l.end[0], y: l.sole ? l.end[1] - l.sole[1] : l.end[1] }], tipAngle: 0 }; });
  const hangs: RigDriver[] = (o.extra ?? []).filter(e => e.hang).map(e => ({ type: "drape", bones: [e.id], hang: e.hang }));
  const height = -j.crown[1], wide = Math.max(...[j.armF, j.armB, j.legF, j.legB].flatMap(l => [l.end[0], l.tip[0]]).map(Math.abs));
  // shoulder joints are about 0.21 of the height apart when the body faces the viewer
  const facing = Math.asin(Math.min(1, Math.abs(j.armB.top[0] - j.armF.top[0]) / (0.21 * height))) * DEG;
  return { spec: { version: 1, id, kind: "biped", bones, parts: [], palette: {}, drivers: [...plant, ...hangs], ground: 0, bounds: { x: -wide, y: -height, width: wide * 2, height }, provenance: { license: "project", source: "joints measured on a painted figure" } }, pose, legs, height, facing };
}

/** A walk for the figure: strides and swings in proportion to its legs, feet planted by the rig. */
export function walkDriver(p: JointedPerson, o: { start: number; end: number; /** Stride (two steps) in leg lengths. */ stride?: number; arms?: number; lift?: number; bob?: number; /** Frames to blend in and out. */ ramp?: number } ): RigDriver {
  const at = (id: string) => p.spec.bones.find(b => b.id === id)!, leg = at("thigh-f").length! + at("shin-f").length!, swing = o.arms ?? 22;
  return { type: "gait", start: o.start, end: o.end, ramp: o.ramp ?? 5, body: "pelvis", stride: leg * (o.stride ?? 1.42), stance: 0.62, lift: leg * (o.lift ?? 0.1), bob: leg * (o.bob ?? 0.034), bobPhase: 0.28, sink: leg * 0.018, legs: p.legs,
    swing: [{ bone: "arm-f", amplitude: swing, phase: 0 }, { bone: "arm-b", amplitude: swing, phase: 0.5 }, { bone: "fore-f", amplitude: swing * 0.4, phase: 0.95 }, { bone: "fore-b", amplitude: swing * 0.4, phase: 0.45 }, { bone: "head", amplitude: 1.2, phase: 0.25, harmonic: 2 }, { bone: "torso", amplitude: 0.8, phase: 0.31, harmonic: 2 }] };
}
