/**
 * RIG1 acting: named, reusable acts for a person rig, blended at any time. A scene says who does what and when; every
 * figure with the RIG1 person bones (`pelvis torso neck head arm-f fore-f hand-f arm-b fore-b hand-b …`) can do it, whatever
 * its art or proportions. An act is a pure function of time, so a frame can be drawn alone, scrubbed or interrupted.
 *
 * Angles are degrees in the picture, clockwise, for a figure that faces right: a positive head or torso leans forward and a
 * negative arm swings forward. Lengths are body heights, so a child and an adult reach the same part of themselves.
 * The acts are written for a body seen from the side or three-quarter. For one that faces the viewer, forward goes into depth:
 * a bow gets shorter and not oblique, a nod tips the face, and a hand that goes forward comes to its own side.
 */
import { armFrom, meanArm, solveArm, turnBetween } from "./rig-arm";
import type { ArmAim, ArmBuild, ArmPose } from "./rig-arm";
import { armAngles, armEffort, armStrain, readArm, wristRange } from "./rig-comfort";
import type { ArmAngles, HandView } from "./rig-comfort";
import { seeded } from "./rig-flutter";
import { evaluateRig } from "./rig-evaluate";
import type { RigFrame } from "./rig-evaluate";
import type { RigDriver, RigKey, RigRootKey, RigSpec } from "./rig-spec";
import { bendLeg, ownFloor } from "./rig-walk";
import type { LegStance } from "./rig-walk";

export type ActPoint = readonly [number, number];
export type ActHand = "f" | "b";
export interface ActReach {
  /** Where the palm goes, rig units in the figure's own space (root, facing right). */ to?: ActPoint;
  /** Or a place of the body: from the shoulder, in body heights (+x forward, +y down). */ shoulder?: ActPoint;
  /** Or a place of the head, in body heights from its joint. */ head?: ActPoint;
  /** Or a place before the body, in body heights from the base of the neck, as the picture has it: where two hands meet. */ chest?: ActPoint;
  /** How a body that faces the viewer holds the arm there instead, as photographs show it: degrees out from hanging of the upper arm, the forearm and the hand (default: in line), and how much of the length of both parts shows (0–1, default all): a forearm that comes to the viewer is shorter. */ front?: { upper: number; lower: number; hand?: number; long?: ActPoint };
  /** How far before `to` the palm stays, body heights: a hand that points at something does not lie on it. The hand then looks along the line from the shoulder to `to`. */ short?: number;
  weight: number;
  /** How far before `chest`, body heights: a side view shows it. */ ahead?: number;
  /** Angle of the hand in the picture. */ angle?: number; /** Or its angle for a body seen from the side. */ forward?: number; /** 0–1: how far the elbow points at the viewer. */ out?: number; /** Degrees added to either. */ spin?: number; /** 0–1: how far the elbow is held out from the side of the body. */ aside?: number; /** 0–1: the shortest that a part of the arm is drawn (an arm that points at the viewer). */ shortest?: number; /** What of the hand goes there: this far from the wrist, body heights. Default: the palm. */ palm?: number; /** How near to its shoulder the hand can be, 0–1 of the arm. */ near?: number;
  /** The arm is drawn over the head. */ over?: boolean; /** Which of the acts it belongs to, and the drawing of the hand that this act wants. */ of?: TimedAct; grip?: string;
}
export interface ActPose {
  /** Added to joints, degrees. */ turn?: Partial<Record<string, number>>;
  /** The back bends forward from the hips as one, degrees, and the head with it: drawn as the body is turned. */ pitch?: number;
  /** Moves the pelvis, body heights. */ shift?: ActPoint;
  reach?: Partial<Record<ActHand, ActReach>>;
  /** The most that the body leans when a hand cannot reach its place, degrees. */ lean?: number;
  /** Hand drawings. */ grip?: Partial<Record<ActHand, string>>;
  look?: string; gaze?: ActPoint; brow?: number; headTurn?: ActPoint; blink?: number;
  /** Turn of the chest in depth, degrees. */ trunk?: number;
  /** 0–1: from standing to sitting, on a seat this high (body heights). */ sit?: number; seat?: number;
  /** How much of the standing sway and breath stays. */ calm?: number;
}
export interface ActContext {
  /** Seconds since the act began. */ t: number; /** How long it lasts. */ d: number; /** 0–1 of it. */ u: number;
  /** 0–1: blends the act in and out. */ w: number;
  params: Readonly<Record<string, unknown>>;
  /** Loudness of the figure's own voice now, 0–1. */ voice: number;
}
export interface Act { /** How long it takes when nothing else is said, seconds. */ seconds: number; /** Seconds to blend in and out. */ ease?: readonly [number, number]; /** What it is for. */ about: string; group: "basic" | "talk" | "body" | "feel" | "hands" | "work"; pose(c: ActContext): ActPose }
export interface TimedAct { act: string; /** Seconds. */ at: number; for?: number; /** 0–1 (more is broader). */ strength?: number; params?: Readonly<Record<string, unknown>>; ease?: readonly [number, number] }

const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** There and back: up in `a`, held, down in `b` (seconds). */
const hold = (c: ActContext, a = 0.35, b = 0.4) => Math.min(smooth(c.t / a), smooth((c.d - c.t) / b));
/** A dip against the move before it, then a spring from rest, a little past and back: 0 → 1. */
const strike = (t: number, d: number) => { const u = Math.min(1, Math.max(0, t / d)), s = u - 0.16; return s < 0 ? -0.06 * Math.sin((Math.PI * u) / 0.16) : 1 - Math.exp(-5 * s) * (Math.cos(4.6 * s) + (5 / 4.6) * Math.sin(4.6 * s)); };
const num = (c: ActContext, k: string, or: number) => (typeof c.params[k] === "number" ? (c.params[k] as number) : or);
const point = (c: ActContext, k: string): ActPoint | undefined => { const v = c.params[k]; return Array.isArray(v) ? [Number(v[0]), Number(v[1])] : undefined; };
const text = (c: ActContext, k: string): string | undefined => (typeof c.params[k] === "string" ? (c.params[k] as string) : undefined);
/** The hand of an act. A body seen from the front or from behind takes the one on the side of the place it is told (`performActs`). */
const hand = (c: ActContext): ActHand => (c.params.hand === "b" ? "b" : "f");
/** The angle of a hand that its act was given, or the one that it has when the body is seen from the side. */
const way = (c: ActContext, forward: number): Pick<ActReach, "angle" | "forward"> => (typeof c.params.angle === "number" ? { angle: c.params.angle } : { forward });
const wave = (t: number, hz: number, phase = 0) => Math.sin(2 * Math.PI * (t * hz + phase));

/** Reach out to a place: the hand rises first, the body goes with it, the eyes are there before the hand. */
function reachTo(c: ActContext, o: { to: ActPoint; out?: number; way?: Pick<ActReach, "angle" | "forward">; grip?: string; lean?: number }): ActPose {
  const go = num(c, "in", 0.7), k = hold(c, go, num(c, "away", 0.6)), lift = c.t < go ? Math.sin((Math.PI * c.t) / go) * 4 : 0, h = hand(c);
  return { reach: { [h]: { to: [o.to[0], o.to[1] - lift], weight: k, ...o.way, out: o.out ?? 0 } }, lean: (o.lean ?? 14) * k, turn: { torso: 0.8 * k, head: 3.5 * k, neck: 1.5 * k }, gaze: [0.5, 0.75], headTurn: [0, 7 * k], ...(o.grip ? { grip: { [h]: o.grip } } : {}) };
}

/** Two hands hold one thing: side by side, `apart` from its middle, or the far one `under` the near one. Palms that carry look up, and the elbows stay low at the ribs. */
function twoHands(c: ActContext, grip: string, forward: number): ActPose {
  const to = point(c, "to"), k = hold(c, num(c, "in", 0.6), num(c, "away", 0.5)), apart = num(c, "apart", 5), under = num(c, "under", NaN), low = Number.isFinite(under), g = text(c, "grip") ?? grip, flat = g === "under";
  const at = (x: number, y: number): Partial<ActReach> => (to ? { to: [to[0] + x, to[1] + y] } : { chest: [x / 160, num(c, "y", 0.21) + y / 160] }), palm = (s: 1 | -1): Partial<ActReach> => ({ angle: s * num(c, "palm", 84), near: 0.3, shortest: 0.5 });
  return { reach: { f: { ...at(low ? 0 : -apart, flat ? 0 : 2), weight: k, ...(flat ? palm(-1) : { forward, near: 0.3, shortest: 0.5 }) }, b: { ...(low ? at(num(c, "side", 3), under) : at(apart, flat ? 0 : 2)), weight: k, ...(low || flat ? palm(1) : { forward, near: 0.3, shortest: 0.5 }) } }, grip: { f: g, b: low ? "under" : g } };
}

/** Both arms for a bow: hands go to the front of the thighs. */
const bowArms = (k: number, drop: number): ActPose["reach"] => ({ f: { shoulder: [0.045 + 0.02 * k, 0.335 - drop], weight: k, forward: 12 }, b: { shoulder: [0.02, 0.335 - drop], weight: k, forward: 12 } });
const bow = (deg: number, seconds: number, look?: string): Act => ({
  seconds, group: "talk", about: `A bow of ${deg}°: the back goes as one, it rests at the bottom, and it comes up slower than it went down.`, ease: [0.12, 0.2],
  pose: c => { const D = num(c, "degrees", deg), k = Math.min(smooth(c.t / (c.d * 0.32)), smooth((c.d - c.t) / (c.d * 0.42))), w = D / 45; return { pitch: D * k, reach: c.params.arms === false ? undefined : bowArms(k * Math.min(1, 0.4 + w * 0.6), 0.015 * w), gaze: [0.2, 0.9 * k], blink: 0.45 * smooth((k - 0.4) / 0.3), ...(look ? { look } : {}), calm: 1 - 0.7 * k }; },
});

/** The acts. A host may add its own: `performActs(list, t, { ...ACTS, mine })`. */
export const ACTS: Readonly<Record<string, Act>> = {
  // ---- basic
  look: { seconds: 1.5, group: "basic", about: "Eyes go first, then the head, to `gaze` [x, y] (−1..1).", ease: [0.12, 0.2], pose: c => { const g = point(c, "gaze") ?? [0.8, 0], k = hold(c, 0.18, 0.2), h = smooth((c.t - 0.12) / 0.35) * smooth((c.d - c.t) / 0.4); return { gaze: [g[0] * k, g[1] * k], headTurn: [g[0] * 9 * h, g[1] * 7 * h], turn: { head: g[1] * 4 * h } }; } },
  sway: { seconds: 3, group: "basic", about: "Weight goes to one foot and back.", pose: c => { const k = Math.sin(Math.PI * c.u); return { shift: [0.012 * k, 0.003 * k], turn: { torso: -1.8 * k, head: 2.2 * k } }; } },
  lean: { seconds: 2, group: "basic", about: "Leans in by `degrees`.", pose: c => ({ turn: { torso: num(c, "degrees", 7) * hold(c, 0.5, 0.6), head: -2 * hold(c) } }) },
  breathe: { seconds: 2.6, group: "basic", about: "One deep breath, with relief at the end.", pose: c => { const k = c.u < 0.45 ? smooth(c.u / 0.45) : 1 - smooth((c.u - 0.45) / 0.4); return { turn: { torso: -2.2 * k, head: -2 * k, "arm-f": 2.5 * k, "arm-b": -2.5 * k }, shift: [0, -0.004 * k] }; } },
  // ---- talk
  speak: { seconds: 2, group: "talk", about: "Head, brows and a hand follow the voice.", ease: [0.2, 0.3], pose: c => { const v = c.voice, beat = wave(c.t, 0.9) * 0.5 + wave(c.t, 1.45, 0.3) * 0.35; return { turn: { head: 2.4 * v * (0.6 + 0.4 * beat) + 1.1 * beat, neck: 0.8 * beat, torso: 0.8 * beat + 0.8 * v }, brow: 0.28 * v, headTurn: [2.2 * beat, 1.5 * v] }; } },
  listen: { seconds: 2.4, group: "talk", about: "Head a little to one side, small nods.", pose: c => { const k = hold(c); return { turn: { head: -2.4 * k + 2.6 * k * Math.max(0, wave(c.t, 0.62, -0.2)) ** 3, torso: 1 * k }, brow: 0.18 * k, headTurn: [2 * k, 0] }; } },
  fold: { seconds: 3, group: "basic", about: "The left hand over the right before the hips, both seen from the back: how staff wait.", ease: [0.35, 0.35], pose: c => { const y = num(c, "y", 0.262), x = num(c, "x", 0.006); return { reach: { f: { chest: [-x, y + 0.006], weight: 1, angle: -46, near: 0.2, shortest: 0.72 }, b: { chest: [x, y], weight: 1, angle: 46, near: 0.26, shortest: 0.72, over: true } }, grip: { f: text(c, "grip") ?? "back", b: text(c, "grip") ?? "back" } }; } },
  nod: { seconds: 1.25, group: "talk", about: "Yes: down, up, and once more smaller.", ease: [0.2, 0.3], pose: c => { const n = Math.exp(-1.4 * c.u) * Math.sin(2 * Math.PI * c.u * num(c, "times", 1.4)); return { turn: { head: 9.5 * Math.max(-0.25, n), neck: 3 * n, torso: 0.8 * n }, headTurn: [0, 6 * n] }; } },
  shake: { seconds: 1.1, group: "talk", about: "No: the head turns from side to side and settles.", ease: [0.1, 0.2], pose: c => ({ headTurn: [14 * Math.sin(2 * Math.PI * c.u * 2.2) * Math.exp(-1.2 * c.u), 0], gaze: [-0.35 * Math.sin(2 * Math.PI * c.u * 2.2) * Math.exp(-1.2 * c.u), 0], turn: { head: 1.5 * Math.sin(2 * Math.PI * c.u * 2.2) } }) },
  explain: { seconds: 2.2, group: "talk", about: "An open hand offers the words.", pose: c => { const k = hold(c, 0.5, 0.55), b = wave(c.t, 0.8); return { reach: { [hand(c)]: { shoulder: [0.165 + 0.012 * b, 0.16 - 0.012 * b], front: { upper: 24 + 2 * b, lower: 75 + 5 * b, hand: 93 + 7 * b, long: [1, 0.8] }, weight: k, forward: -72 + 6 * b } }, grip: { [hand(c)]: text(c, "grip") ?? "open" }, turn: { torso: 1.4 * k, head: 1.5 * b * k } }; } },
  invite: { seconds: 1.8, group: "talk", about: "どうぞ: the arm opens toward `to`, or ahead.", pose: c => { const k = strike(c.t, 0.9) * smooth((c.d - c.t) / 0.55), to = point(c, "to"); return { reach: { [hand(c)]: { ...(to ? { to } : { shoulder: [0.21, 0.185] as ActPoint, front: { upper: 28, lower: 68, hand: 86, long: [1, 0.86] } }), weight: k, ...way(c, -80) } }, grip: { [hand(c)]: text(c, "grip") ?? "open" }, turn: { torso: 3 * k, head: 3 * k } }; } },
  point: { seconds: 1.6, group: "talk", about: "Points at `to`, or ahead.", pose: c => { const k = strike(c.t, 1.7) * smooth((c.d - c.t) / 0.75), to = point(c, "to"); return { reach: { [hand(c)]: to ? { to, short: num(c, "short", 0.13), weight: k, ...(typeof c.params.angle === "number" ? { angle: c.params.angle } : {}) } : { shoulder: [0.24, 0.02] as ActPoint, weight: k, ...way(c, -85) } }, grip: { [hand(c)]: text(c, "grip") ?? "point" }, gaze: [0.7 * k, 0], turn: { torso: 2 * k } }; } },
  wave: { seconds: 2.6, group: "talk", about: "A hand goes up and waves from the wrist. The far hand (`b`) is clear of the body in a three-quarter view.", pose: c => { const k = hold(c, 0.9, 1), h = c.params.hand === "f" ? "f" : "b"; const b = 15 * wave(c.t, 2.1); return { reach: { [h]: { front: { upper: 72, lower: 158 + 0.35 * b, hand: 168 + b }, shoulder: h === "f" ? [-0.09, -0.08] : [0.12, -0.05], weight: k, angle: (h === "f" ? 165 : -172) + (h === "f" ? 1 : -1) * b, near: 0.15, over: true } }, grip: { [h]: text(c, "grip") ?? "wave" }, turn: { head: -2 * k } }; } },
  call: { seconds: 3.2, group: "talk", about: "呼び込み: a hand stands beside the mouth, and the voice goes far.", pose: c => { const k = hold(c, 1, 1), h = hand(c); return { reach: { [h]: { head: [num(c, "x", 0.088), num(c, "y", 0.012)], weight: k, angle: (h === "f" ? 1 : -1) * num(c, "palm", 170), near: 0.5, shortest: 0.55, over: true } }, grip: { [h]: text(c, "grip") ?? "open" }, turn: { head: -3 * k, torso: -1.5 * k } }; } },
  greet: { ...bow(16, 1.35), about: "会釈: a small bow on the way in." },
  bow: bow(30, 1.9), "deep-bow": bow(45, 2.6),
  thank: { ...bow(26, 1.8, "happy"), about: "A bow with a smile." },
  apologise: { ...bow(32, 2, "worried"), about: "A bow with a troubled face." },
  raise: { seconds: 1.8, group: "talk", about: "A hand goes straight up: to call a taxi, to answer, to be seen.", pose: c => { const k = hold(c, 1.2, 1.3), h = hand(c); return { reach: { [h]: { front: { upper: num(c, "upper", 138), lower: num(c, "lower", 170) }, shoulder: [h === "f" ? -0.04 : 0.06, num(c, "y", -0.2)], weight: k, angle: h === "f" ? 172 : -172, near: 0.15, over: true } }, grip: { [h]: text(c, "grip") ?? "wave" }, turn: { torso: -1 * k, head: -2 * k }, gaze: [0.4 * k, -0.2 * k] }; } },
  offer: { seconds: 2, group: "talk", about: "Both hands hold something out at `to`, with a small bow: how things are given. With `grip` under, the thing lies on two palms. With `under` the far hand is that far below the near one, with its palm up (a bag: one hand has its handles, the other its bottom).", ease: [0.1, 0.1], pose: c => ({ ...twoHands(c, "card", -76), pitch: num(c, "degrees", 9) * hold(c, num(c, "in", 0.6), num(c, "away", 0.5)), lean: num(c, "lean", 8) }) },
  beckon: { seconds: 2.8, group: "talk", about: "Come here, as it is done in Japan: the palm down, the fingers fold.", pose: c => { const k = hold(c, 0.95, 0.95), h = hand(c), b = Math.max(0, wave(c.t, 1.9)); return { reach: { [h]: { shoulder: [0.18, 0.01 + 0.012 * b], front: { upper: 38, lower: 128 + 4 * b, hand: 118 - 62 * b }, weight: k, forward: -60 + 44 * b } }, grip: { [h]: text(c, "grip") ?? "open" }, turn: { head: 2 * b * k } }; } },
  // ---- body
  sit: { seconds: 3, group: "body", about: "Sits down on a seat (`seat`, body heights) in `in` seconds, and gets up in the last `away` seconds. The back goes forward on the way.", ease: [0, 0], pose: c => { const a = num(c, "in", 1), b = num(c, "away", 1), x = Math.min(1, Math.max(0, c.t / Math.max(0.01, a))), y = Math.min(1, Math.max(0, (c.d - c.t) / Math.max(0.01, b))), k = Math.min(smooth(x), smooth(y)), bump = (a > 0.02 ? Math.sin(Math.PI * x) : 0) + (b > 0.02 ? Math.sin(Math.PI * y) : 0); return { sit: k, seat: num(c, "seat", SEAT), pitch: 24 * Math.min(1, bump), calm: 1 - 0.4 * k }; } },
  turn: { seconds: 1.6, group: "body", about: "Head, then chest, turn by `yaw` degrees, and the eyes are there first.", ease: [0, 0], pose: c => { const yaw = num(c, "yaw", 24), e = smooth(c.t / 0.1) * smooth((c.d - c.t - 0.2) / 0.1), h = smooth((c.t - 0.06) / 0.42) * smooth((c.d - c.t) / 0.4), b = smooth((c.t - 0.16) / 0.6) * smooth((c.d - c.t) / 0.5); return { gaze: [(yaw / 24) * (e - 0.75 * h), 0], headTurn: [yaw * h, 0], trunk: 0.55 * yaw * b }; } },
  "look-around": { seconds: 3.2, group: "body", about: "Looks to one side, up, and to the other side, as someone does who is new here.", ease: [0.15, 0.3], pose: c => { const x = Math.sin(2 * Math.PI * smooth(c.u)) , up = Math.sin(Math.PI * c.u); return { gaze: [0.75 * x, -0.45 * up], headTurn: [20 * Math.sin(2 * Math.PI * smooth(c.u - 0.04)), -7 * up], trunk: 8 * Math.sin(2 * Math.PI * smooth(c.u - 0.08)), brow: 0.35 * up }; } },
  hop: { seconds: 1.1, group: "body", about: "Two small jumps of joy.", ease: [0.05, 0.1], pose: c => { const n = num(c, "times", 2), u = c.u * n, i = u - Math.floor(u), up = Math.sin(Math.PI * Math.min(1, i / 0.8)); return { shift: [0, i < 0.8 ? -0.035 * up : 0.008], turn: { "arm-f": 16 * up, "arm-b": -16 * up, "fore-f": 10 * up, "fore-b": -10 * up }, look: text(c, "look"), headTurn: [0, -4 * up], calm: 0.2 }; } },
  clap: { seconds: 2.2, group: "body", about: "Claps softly in front of the chest.", pose: c => { const k = hold(c, 0.6, 0.6), m = 0.5 + 0.5 * wave(c.t, 2.4), x = 0.014 + 0.04 * m; return { reach: { f: { chest: [-x, 0.13], ahead: 0.14, weight: k, forward: -140, near: 0.3, shortest: 0.45 }, b: { chest: [x, 0.13], ahead: 0.14, weight: k, forward: -140, near: 0.3, shortest: 0.45 } }, grip: { f: "open", b: "open" }, turn: { head: 2 * m * k }, look: text(c, "look") }; } },
  shrug: { seconds: 1.5, group: "body", about: "Elbows by the sides, both forearms up and out, the palms open: who knows?", pose: c => { const k = strike(c.t, 0.95) * smooth((c.d - c.t) / 0.72); return { reach: { f: { shoulder: [0.2, 0.15], front: { upper: 17, lower: 139, hand: 104, long: [1, 0.92] }, weight: k, forward: -70 }, b: { shoulder: [0.2, 0.15], front: { upper: 17, lower: 139, hand: 104, long: [1, 0.92] }, weight: k, forward: -70 } }, grip: { f: "open", b: "open" }, shift: [0, -0.006 * k], brow: 0.6 * k, turn: { head: -4 * k } }; } },
  // ---- feel
  think: { seconds: 2.6, group: "feel", about: "Eyes up and aside, a hand to the chin with the elbow down. `look` is the face.", pose: c => { const k = hold(c, 0.8, 0.8), h = hand(c); return { look: text(c, "look") ?? "thoughtful", reach: c.params.hand === false ? undefined : { [h]: { head: [num(c, "x", 0.05), num(c, "y", 0.044)], weight: k, ...way(c, -164), near: 0.3, shortest: 0.3, over: true } }, grip: { [h]: text(c, "grip") ?? "point" }, gaze: [0.55 * k, -0.75 * k], turn: { head: -4.5 * k, torso: -1 * k }, headTurn: [5 * k, -4 * k], calm: 0.6 }; } },
  react: { seconds: 1.1, group: "feel", about: "Surprise: starts back, eyes wide, then settles.", ease: [0.05, 0.35], pose: c => { const k = c.t < 0.14 ? smooth(c.t / 0.14) : Math.exp(-2.4 * (c.t - 0.14)); return { look: "surprised", turn: { torso: -5.5 * k, head: -5 * k, "arm-f": -9 * k, "arm-b": -7 * k }, shift: [-0.008 * k, -0.008 * k], brow: k }; } },
  laugh: { seconds: 1.7, group: "feel", about: "Shoulders and head shake with the breath.", pose: c => { const k = hold(c, 0.2, 0.5), s = wave(c.t, 4.4) * Math.exp(-0.5 * c.t); return { look: "laughing", turn: { torso: -2.5 * k + 1.5 * s * k, head: -4 * k + 2.2 * s * k }, shift: [0, -0.004 * Math.abs(s) * k] }; } },
  puzzled: { seconds: 1.8, group: "feel", about: "Head goes over to one side.", pose: c => { const k = strike(c.t, 0.5) * smooth((c.d - c.t) / 0.4); return { look: "confused", turn: { head: -9 * k, neck: -2 * k }, brow: 0.6 * k }; } },
  feel: { seconds: 1.5, group: "feel", about: "Only the face: `look`.", ease: [0.1, 0.2], pose: c => ({ look: text(c, "look") }) },
  // ---- hands
  reach: { seconds: 1.4, group: "hands", about: "A hand goes to `to` (in `in` seconds) and comes back (in `away` seconds).", ease: [0, 0], pose: c => reachTo(c, { to: point(c, "to") ?? [60, -100], out: num(c, "out", 0), way: way(c, -82), grip: text(c, "grip"), lean: num(c, "lean", 14) }) },
  place: { seconds: 1.8, group: "hands", about: "Puts down at `to` what the hand holds: drawing `grip` until `release` (0–1 of the act), then `after`.", ease: [0, 0], pose: c => reachTo(c, { to: point(c, "to") ?? [60, -100], out: num(c, "out", 0), way: way(c, -82), grip: c.u < num(c, "release", 0.5) ? (text(c, "grip") ?? "hold") : (text(c, "after") ?? "open"), lean: num(c, "lean", 14) }) },
  take: { seconds: 1.8, group: "hands", about: "Goes to `to` with an open hand (`grip`), closes on it at `catch` (0–1 of the act) and comes back with it (`after`).", ease: [0, 0], pose: c => reachTo(c, { to: point(c, "to") ?? [60, -100], out: num(c, "out", 0), way: way(c, -82), grip: c.u < num(c, "catch", 0.45) ? (text(c, "grip") ?? "open") : (text(c, "after") ?? "hold"), lean: num(c, "lean", 14) }) },
  carry: { seconds: 2, group: "hands", about: "Holds something in front of the waist; or on a palm that looks up, at `chest` (from the neck, in body heights): the elbow stays low at the ribs and the forearm goes up.", ease: [0.35, 0.35], pose: c => { const h = hand(c), chest = point(c, "chest"); return { reach: { [h]: { weight: 1, ...(chest ? { chest, near: 0.3, shortest: 0.5, angle: num(c, "angle", h === "f" ? -84 : 84) } : { shoulder: [num(c, "x", 0.12), num(c, "y", 0.2)], ...way(c, -78) }) } }, grip: c.params.grip ? { [h]: text(c, "grip")! } : undefined }; } },
  rest: { seconds: 2, group: "hands", about: "A hand rests at `to` (a counter, a table).", ease: [0.35, 0.35], pose: c => ({ lean: num(c, "lean", 10), reach: { [hand(c)]: { to: point(c, "to"), weight: 1, ...way(c, -80) } }, grip: c.params.grip ? { [hand(c)]: text(c, "grip")! } : undefined }) },
  receive: { seconds: 1.8, group: "hands", about: "Both hands out to take something politely at `to`: as `offer`, with the eyes on the hands.", ease: [0, 0], pose: c => { const k = hold(c, 0.6, 0.5); return { ...twoHands(c, "open", -80), lean: num(c, "lean", 14) * k, turn: { torso: 0.8 * k, head: 3.5 * k, neck: 1.5 * k }, gaze: [0.5, 0.75 * k], headTurn: [0, 7 * k] }; } },
  drink: { seconds: 3.2, group: "hands", about: "Lifts a cup to the mouth and tips the head back.", pose: c => { const k = Math.min(smooth(c.u / 0.3), smooth((1 - c.u) / 0.3)); return { reach: { [hand(c)]: { head: [0.06, 0.02], weight: k, forward: -120 - 18 * k, near: 0.3, shortest: 0.35, over: true } }, grip: { [hand(c)]: text(c, "grip") ?? "hold" }, turn: { head: -8 * k } }; } },
  phone: { seconds: 3, group: "hands", about: "Looks at a phone that one hand holds before the chest, the elbow low at the ribs.", pose: c => { const h = hand(c), k = hold(c, 0.75, 0.75); return { reach: { [h]: { chest: [(h === "f" ? -1 : 1) * 0.03, 0.14], ahead: 0.12, weight: k, forward: -122, near: 0.3, shortest: 0.45 } }, grip: { [hand(c)]: text(c, "grip") ?? "hold" }, turn: { head: 9 * k, neck: 3 * k }, gaze: [0.2, 0.8 * k] }; } },
  // ---- work
  scan: { seconds: 1.3, group: "work", about: "A scanner goes to the goods at `to`, a short push, and back.", ease: [0.1, 0.1], pose: c => { const to = point(c, "to") ?? [60, -100], k = hold(c, 0.4, 0.4), push = Math.exp(-(((c.t - c.d * 0.5) / 0.09) ** 2)); return { reach: { [hand(c)]: { to: [to[0] + 2.2 * push, to[1] + 1.4 * push], weight: k, ...way(c, -72) } }, grip: { [hand(c)]: text(c, "grip") ?? "scanner" }, lean: num(c, "lean", 14) * k, turn: { torso: 1.2 * k + 0.6 * push, head: 4 * k }, headTurn: [0, 8 * k], gaze: [0.4, 0.8 * k] }; } },
  fan: { seconds: 3, group: "hands", about: "Fans slowly with what a hand holds, from the chest to the chin: the hand is before the breastbone, the elbow low at the ribs, the fingers lie outside. How much it moves is `cool` (0 only shows it), how often a second `pace`.", ease: [0.1, 0.1], pose: c => { const h = hand(c), s = h === "f" ? -1 : 1, k = hold(c, num(c, "in", 0.7), num(c, "away", 0.6)), goes = num(c, "cool", 1) * smooth((c.t - 0.6) / 0.5) * smooth((c.d - c.t - 0.4) / 0.6), w = wave(c.t - 0.6, num(c, "pace", 1.1)) * goes; return { reach: { [h]: { chest: [s * num(c, "x", 0.03), num(c, "y", 0.13) - 0.006 * w], weight: k, forward: -(num(c, "up", 128) + 9 * w), near: 0.3, shortest: 0.45 } }, grip: { [h]: text(c, "grip") ?? "bar" }, turn: { head: 1.2 * k } }; } },
  unfold: { seconds: 1.6, group: "hands", about: "Opens a fan that a hand holds at its foot before the breastbone: the other hand takes its guard and swings it out, `at` 0–1 of the act.", ease: [0.1, 0.1], pose: c => { const h = hand(c), o: ActHand = h === "f" ? "b" : "f", s = h === "f" ? -1 : 1, k = hold(c, num(c, "in", 0.5), num(c, "away", 0.4)), m = smooth((c.u - num(c, "from", 0.35)) / num(c, "over", 0.3)), a = ((lerp(-12, 62, m)) * Math.PI) / 180, r = num(c, "long", 0.075), x = s * num(c, "x", 0.03), y = num(c, "y", 0.13); return { reach: { [h]: { chest: [x, y], weight: k, forward: -num(c, "up", 128), near: 0.3, shortest: 0.45 }, [o]: { chest: [x - s * r * Math.sin(a), y - r * Math.cos(a)], weight: k * smooth((1 - c.u) / 0.25), forward: -140, near: 0.3, shortest: 0.4 } }, grip: { [h]: text(c, "grip") ?? "bar", [o]: m < 0.98 ? "card" : "easy" }, gaze: [0.2, 0.7 * k], headTurn: [0, 5 * k] }; } },
  pack: { seconds: 1.8, group: "work", about: "Puts goods into a bag: up from `from`, over and down into `to`.", ease: [0.15, 0.2], pose: c => { const from = point(c, "from") ?? [50, -100], to = point(c, "to") ?? [40, -100], m = smooth((c.u - 0.3) / 0.35), k = hold(c, 0.35, 0.35); return { reach: { [hand(c)]: { to: [lerp(from[0], to[0], m), lerp(from[1], to[1], m) - 11 * Math.sin(Math.PI * m)], weight: k, ...way(c, -70) } }, grip: { [hand(c)]: m < 0.96 ? (text(c, "grip") ?? "hold") : "open" }, lean: num(c, "lean", 12) * k, turn: { torso: 1.2 * k, head: 5 * k }, gaze: [0.3, 0.85 * k], headTurn: [0, 7 * k] }; } },
  steer: { seconds: 4, group: "work", about: "Both hands on a wheel: its middle is at `to`, its rim `wide` and `tall` from there, the hands `up` degrees over the middle (0 is 9 and 3 o'clock, 30 is 10 and 2). Elbows low and out, wrists in line with the forearms. Small moves all the time, and a bend of `bend` degrees in the middle.", ease: [0, 0], pose: c => { const to = point(c, "to") ?? [0, -110], w = num(c, "wide", 19.4), tall = num(c, "tall", 0.86 * w), up = num(c, "up", 12), spin = num(c, "bend", 0) * Math.sin(Math.PI * c.u) ** 2 + 0.9 * wave(c.t, 0.31) + 0.5 * wave(c.t, 0.73, 0.3), on = (a0: number): ActReach => { const a = ((a0 + spin) * Math.PI) / 180; return { to: [to[0] + w * Math.cos(a), to[1] + tall * Math.sin(a)], weight: 1, forward: num(c, "forward", -112), spin, aside: num(c, "aside", 0.2), shortest: 0.3, palm: num(c, "palm", 0.034) }; }; return { reach: { f: on(180 + up), b: on(-up) }, grip: { f: text(c, "grip") ?? "bar", b: text(c, "grip") ?? "bar" }, lean: 4, calm: 0.5 }; } },
  cook: { seconds: 3, group: "work", about: "Turns little things over with a pick, one after another, along a plate at `to` (`wide` long). `late`: a second hand is at another one. With `angle` the wrist flicks round it.", ease: [0.2, 0.2], pose: c => { const to = point(c, "to") ?? [30, -100], k = hold(c, 0.4, 0.4), t = c.t / 0.55 + num(c, "late", 0), n = Math.floor(t), u = t - n, x = ((n * 0.382) % 1) - 0.5, next = (((n + 1) * 0.382) % 1) - 0.5, go = smooth((u - 0.6) / 0.4), flick = Math.sin(Math.PI * Math.min(1, u / 0.6)); return { reach: { [hand(c)]: { to: [to[0] + num(c, "wide", 22) * lerp(x, next, go) + 1.6 * flick, to[1] - 3.2 * flick], weight: k, ...(typeof c.params.angle === "number" ? { angle: c.params.angle + (hand(c) === "f" ? 8 : -8) * flick } : { forward: -50 - 24 * flick }) } }, grip: { [hand(c)]: text(c, "grip") ?? "hold" }, turn: { head: 4 * k, torso: 0.6 * flick * k }, gaze: [0.2, 0.8 * k], headTurn: [0, 8 * k] }; } },
  eat: { seconds: 2.2, group: "work", about: "Brings food to the mouth, bites (`bite`, part of the act), chews, and lowers the hand.", pose: c => { const k = Math.min(smooth(c.u / 0.35), smooth((1 - c.u) / 0.4)), bite = num(c, "bite", 0.5); return { look: c.u < bite - 0.28 ? undefined : c.u < bite ? "bite" : "chew", reach: { [hand(c)]: { head: [num(c, "x", 0.045), num(c, "y", 0.03)], weight: k, ...way(c, -125), near: 0.3, shortest: 0.35, over: true } }, grip: { [hand(c)]: text(c, "grip") ?? "hold" }, turn: { head: 3 * k } }; } },
  press: { seconds: 1.2, group: "work", about: "Taps a screen or keys at `to`, twice.", ease: [0.1, 0.1], pose: c => { const to = point(c, "to") ?? [50, -110], k = hold(c, 0.35, 0.35), tap = Math.max(0, wave(c.t - 0.35, 2.2)) ** 3; return { reach: { [hand(c)]: { to: [to[0] + 1.6 * tap, to[1] + 1.6 * tap], weight: k, ...way(c, -70) } }, grip: { [hand(c)]: text(c, "grip") ?? "point" }, lean: num(c, "lean", 12) * k, turn: { torso: 1 * k, head: 3 * k }, gaze: [0.5, 0.6 * k] }; } },
};

/** Drawings of a hand that can stand in for one that a figure does not have, the best first. */
export const GRIP_FOR: Readonly<Record<string, readonly string[]>> = { guide: ["palm", "open"], palm: ["guide", "open"], open: ["guide"], card: ["hold", "grip", "easy"], hold: ["grip"], grip: ["hold"], fist: ["grip", "hold"], bar: ["fist", "grip"], point: ["open"], wave: ["guide", "open"], back: ["easy"] };

export interface Performance { turn: Record<string, number>; pitch: number; shift: [number, number]; /** Where each hand is wanted, the acts that began first in front; `weight` is the act's blend with it. */ reach: Record<ActHand, ActReach[]>; lean: number; grip: Partial<Record<ActHand, string>>; /** Arms drawn over the head. */ over: ActHand[]; look: string | null; lookFrom: string | null; lookMix: number; gaze: [number, number]; brow: number; headTurn: [number, number]; blink: number; calm: number; trunk: number; sit: number; seat: number }
export interface PerformOptions { library?: Readonly<Record<string, Act>>; /** Loudness of the figure's voice at a time, 0–1. */ voice?: (t: number) => number; seed?: number; /** Times to blink as well, seconds. */ blinks?: readonly number[]; /** Face when no act says otherwise. */ look?: string; /** Nothing idles. */ still?: boolean; /** Degrees that the body is turned to the viewer: 0 is a side view, 90 faces the viewer. */ facing?: number }

/** How much of what points forward still shows as sideways in the picture: all of it up to a three-quarter view, nothing of a body that faces the viewer. */
const sideways = (facing: number) => Math.min(1, Math.max(0, Math.cos((facing * Math.PI) / 180) / 0.5));
/** A body that bends forward from the hips by `pitch`, as it shows: oblique when it is seen from the side, shorter and nearer when it faces the viewer. */
function pitched(pitch: number, facing: number) {
  const p = (0.9 * pitch * Math.PI) / 180, f = (facing * Math.PI) / 180, across = Math.sin(p) * Math.cos(f), up = Math.cos(p), torso = (Math.atan2(across, up) * 180) / Math.PI;
  return { torso, neck: 0.11 * torso, head: 0.17 * torso, scale: Math.hypot(across, up), hips: -0.052 * across, size: 1 + 0.12 * Math.sin(p) * Math.sin(f) };
}

/** The height of a chair, body heights. */
const SEAT = 0.26;
/** The joint of the hip is in the middle of the thigh that lies on the seat, body heights over it. */
const ON_SEAT = 0.045;
/** A blink: shut faster than it opens. 0 open, 1 closed. */
const blinkShape = (t: number) => (t < 0 || t > 0.3 ? 0 : t < 0.08 ? smooth(t / 0.08) : t < 0.13 ? 1 : 1 - smooth((t - 0.13) / 0.17));
const schedules = new Map<number, number[]>();
/** Seeded blink times: every two to five seconds, sometimes twice. */
function blinkTimes(seed: number): number[] {
  let s = schedules.get(seed);
  if (!s) { const r = seeded(seed * 7919 + 17); s = []; for (let t = 0.7 + r() * 1.6; t < 240; t += 1.9 + r() * 3.1) { s.push(t); if (r() < 0.16) s.push(t + 0.36); } schedules.set(seed, s); }
  return s;
}

/** What a figure does at a time: every act that is on, blended, over breath, sway and blinks. */
export function performActs(acts: readonly TimedAct[], t: number, o: PerformOptions = {}): Performance {
  const library = o.library ?? ACTS, voice = o.voice?.(t) ?? 0, front = 1 - sideways(o.facing ?? 45), out: Performance = { turn: {}, pitch: 0, shift: [0, 0], reach: { f: [], b: [] }, lean: 0, grip: {}, over: [], look: o.look ?? null, lookFrom: null, lookMix: 1, gaze: [0, 0], brow: 0, headTurn: [0, 0], blink: 0, calm: 1, trunk: 0, sit: 0, seat: SEAT };
  const looks: { at: number; end: number; look: string }[] = [];
  const faint: Record<ActHand, { grip: string; k: number }[]> = { f: [], b: [] };
  let gw = 0;
  for (const a of [...acts].sort((p, q) => p.at - q.at)) {
    const act = library[a.act]; if (!act) continue;
    const d = a.for ?? act.seconds, [i, e] = a.ease ?? act.ease ?? [0.25, 0.3], s = a.strength ?? 1, dt = t - a.at;
    if (dt < 0 || dt > d) { continue; }
    const w = Math.min(i > 0 ? smooth(dt / i) : 1, e > 0 ? smooth((d - dt) / e) : 1), to = a.params?.to, p = act.pose({ t: dt, d, u: d > 0 ? dt / d : 1, w, params: front > 0.6 && Array.isArray(to) && a.params?.hand === undefined ? { ...a.params, hand: Number(to[0]) > 0 ? "b" : "f" } : a.params ?? {}, voice });
    for (const [j, v = 0] of Object.entries(p.turn ?? {})) {
      // seen from the front, a head tips to the viewer, a back hardly moves, and an arm goes out to its side
      const seen = j === "arm-f" || j === "arm-b" ? lerp(v, Math.abs(v) * (j === "arm-f" ? 0.4 : -0.4), front) : v * (1 - 0.75 * front);
      out.turn[j] = (out.turn[j] ?? 0) + seen * w * s; if (j === "head") out.headTurn[1] += v * front * w * s;
    }
    if (p.pitch) out.pitch += p.pitch * w * s;
    if (p.shift) { out.shift[0] += p.shift[0] * w * s; out.shift[1] += p.shift[1] * w * s; }
    for (const h of ["f", "b"] as const) { const r = p.reach?.[h]; if (r && r.weight * w > 0.001) out.reach[h].push({ ...r, weight: r.weight * w, of: a, grip: p.grip?.[h] }); const g = p.grip?.[h], gk = r?.weight ?? 1; if (g && w > 0.3) { if (gk > 0.42) out.grip[h] = g; else if (gk > 0.02) faint[h].push({ grip: g, k: gk }); } if (r?.over && r.weight * w > 0.3) out.over.push(h); }
    if (p.lean) out.lean = Math.max(out.lean, p.lean * w * s);
    if (p.gaze) { out.gaze = [lerp(out.gaze[0], p.gaze[0], w), lerp(out.gaze[1], p.gaze[1], w)]; gw = Math.max(gw, w); }
    if (p.headTurn) { out.headTurn[0] += p.headTurn[0] * w * s; out.headTurn[1] += p.headTurn[1] * w * s; }
    if (p.brow) out.brow += p.brow * w * s;
    if (p.trunk) out.trunk += p.trunk * w * s;
    if (p.sit && p.sit * w >= out.sit) { out.sit = p.sit * w; out.seat = p.seat ?? SEAT; }
    if (p.blink) out.blink = Math.max(out.blink, p.blink * w);
    if (p.calm !== undefined) out.calm = Math.min(out.calm, lerp(1, p.calm, w));
    if (p.look) looks.push({ at: a.at, end: a.at + d, look: p.look });
  }
  // half way from one reach to the next neither counts for much: the hand keeps a drawing, and does not hang for a frame
  for (const h of ["f", "b"] as const) if (!out.grip[h] && faint[h].length > 1) out.grip[h] = faint[h].reduce((p, q) => (q.k > p.k ? q : p)).grip;
  // the face on now, and the one before it
  const lookOn = (time: number) => { const q = looks.filter(l => time >= l.at && time < l.end - 0.08); return q.length ? q[q.length - 1].look : (o.look ?? null); };
  out.look = lookOn(t);
  if (!looks.length) { // an act with a look may have ended a moment ago
    const ended = acts.filter(a => { const act = library[a.act]; if (!act) return false; const e = a.at + (a.for ?? act.seconds); return t >= e - 0.08 && t < e + 0.1; }).map(a => library[a.act].pose({ t: 0.1, d: a.for ?? library[a.act].seconds, u: 0.1, w: 1, params: a.params ?? {}, voice: 0 }).look).filter(Boolean);
    out.lookFrom = (ended[0] as string | undefined) ?? null;
  } else { const now = looks[looks.length - 1]; out.lookFrom = t - now.at < 0.12 ? (o.look ?? null) : null; out.lookMix = t - now.at < 0.12 ? smooth((t - now.at) / 0.12) : 1; if (t > now.end - 0.08) { out.lookFrom = now.look; out.lookMix = smooth((t - now.end + 0.08) / 0.08); } }
  out.headTurn[1] += 0.35 * out.pitch * Math.sin(((o.facing ?? 45) * Math.PI) / 180);
  if (o.still) return out;
  // life: breath, a slow sway, small moves of the eyes, blinks
  const seed = o.seed ?? 1, c = out.calm, br = wave(t, 0.27, seed * 0.37), add = (j: string, v: number) => { out.turn[j] = (out.turn[j] ?? 0) + v; };
  add("torso", c * (0.45 * br + 0.55 * wave(t, 0.083, seed * 0.21))); add("head", c * (-0.5 * wave(t - 0.25, 0.27, seed * 0.37) + 0.9 * wave(t, 0.061, seed * 0.47))); add("arm-f", c * 0.8 * br); add("arm-b", c * -0.6 * br); add("fore-f", c * 0.9 * wave(t - 0.2, 0.27, seed * 0.37)); add("fore-b", c * 0.7 * wave(t - 0.25, 0.27, seed * 0.37));
  out.shift[0] += c * 0.0022 * wave(t, 0.083, seed * 0.21); out.shift[1] += c * -0.0011 * br;
  if (gw < 0.4) { const step = Math.floor(t / 1.3 + seed * 0.61), r = seeded(step * 131 + seed * 977), gx = (r() - 0.5) * 0.34, gy = (r() - 0.5) * 0.2, k = smooth(((t / 1.3 + seed * 0.61) % 1) / 0.06); out.gaze = [out.gaze[0] + gx * k * (1 - gw), out.gaze[1] + gy * k * (1 - gw)]; }
  for (const b of blinkTimes(seed)) { if (b > t) break; out.blink = Math.max(out.blink, blinkShape(t - b)); }
  for (const b of o.blinks ?? []) out.blink = Math.max(out.blink, blinkShape(t - b));
  // the eyes shut for a moment when they change to another expression
  return out;
}

/** A person whose art can act: its rig, its height and how its painted pose relaxes. */
export interface ActingBody {
  spec: RigSpec; /** Rig units. */ height: number;
  /** Added to the rest pose to stand at ease, degrees. */ stance?: Readonly<Record<string, number>>;
  /** The middle of the palm in the hand bone's space: a reach puts it, not the wrist, at its place. */ palm?: ActPoint;
  /** Joint limits after everything, degrees from the rest pose. */ limits?: Readonly<Record<string, readonly [number, number]>>;
  /** Loose parts that trail what they hang from. */ follow?: readonly { bone: string; of: string; gain: number; lag: number; limit?: number }[];
  /** Degrees that the painted body is turned to the viewer: 0 is a side view. Default 45. */ facing?: number;
  /** False: its clothes hang to the floor in one piece, so it only stands. */ sits?: false;
  /** Arm bones. */ arms?: Readonly<Record<ActHand, { upper: string; lower: string; hand: string }>>;
  /** What the drawings of its hands show. One that is another view of a grip (`as`) is taken where the forearm can show that side and not the other. */ hands?: Readonly<Record<string, { shows: HandView; as?: string }>>;
}
const ARMS: NonNullable<ActingBody["arms"]> = { f: { upper: "arm-f", lower: "fore-f", hand: "hand-f" }, b: { upper: "arm-b", lower: "fore-b", hand: "hand-b" } };
/** How near to its shoulder a hand is held in front of the body, of the arm. */
const NEAR = 0.68;
interface Reached { to: ActPoint; /** The hand comes up before the body, not at its side. */ inside: boolean; angle?: number; out: number; aside: number; near: number; shortest: number; /** The act says how short the arm is drawn (`shortest`), else the easiest arm does. */ said: boolean; palm: number; /** A place of the scene, not of the body. */ place: boolean; weight: number }
export interface ActedFrame { frame: RigFrame; spec: RigSpec; performance: Performance; /** Joints of the arms that reach, degrees. */ arms: Partial<Record<ActHand, ArmAngles>>; /** The drawings of the hands that do something. */ hands: Partial<Record<ActHand, string>> }
export interface ActOptions extends PerformOptions { root?: readonly RigRootKey[]; fps: number; /** Frames: which frames the gait drivers are on. */ drivers?: readonly RigDriver[]; /** Scene height of the far edge of what a hand goes over (a counter). */ over?: Partial<Record<ActHand, number>>; /** Where the legs stand at a time, when a walk says so. */ legs?: (t: number) => LegStance | null }

/** The figure at a time: acts → joints, reaches and the rig's own drivers → bones. */
export function actFrame(body: ActingBody, acts: readonly TimedAct[], t: number, o: ActOptions): ActedFrame {
  const now = stands(body, acts, t, o), { p, at, hands, turns } = now, solved = hands.length ? solveArms(body, now) : {};
  if (hands.length) now.posed = now.pose(turns, Object.fromEntries(Object.values(solved).flatMap(a => Object.entries(keysOf(a, turns))).map(([id, k]) => [id, [{ frame: at, ...k }]])));
  const facing = body.facing ?? 45, arms: ActedFrame["arms"] = {}, drawn: ActedFrame["hands"] = { ...p.grip };
  for (const h of hands) { const a = solved[h]!; if (a.grip) drawn[h] = a.grip; arms[h] = readArm({ side: h, facing, ...seenArm(a.U, a.V, a.got), shows: a.shows }); }
  return { frame: evaluateRig(now.posed, at), spec: now.posed, performance: p, arms, hands: drawn };
}

/** The figure before its hands are put anywhere: joints from the acts, and the lean that the hands need. */
interface Stands { p: Performance; at: number; /** What is done just before and after. */ about: readonly Moment[]; over?: ActOptions["over"]; hands: ActHand[]; turns: Record<string, number>; posed: RigSpec; pose: (turn: Readonly<Record<string, number>>, over?: Record<string, RigKey[]>) => RigSpec }
function stands(body: ActingBody, acts: readonly TimedAct[], t: number, o: ActOptions): Stands {
  const facing = body.facing ?? 45, seen = { ...o, facing }, p = performActs(acts, t, seen), at = Math.round(t * o.fps * 1000) / 1000, spec = body.spec, joints = new Set(spec.bones.map(b => b.id)), arms = body.arms ?? ARMS;
  const turns: Record<string, number> = { ...(body.stance ?? {}) }; let bent = pitched(p.pitch, facing);
  const turned = (q: Performance): Record<string, number> => { const b = pitched(q.pitch, facing), add = (j: string, v: number) => (q.turn[j] ?? 0) + v; return { ...q.turn, torso: add("torso", b.torso), neck: add("neck", b.neck), head: add("head", b.head), "arm-f": add("arm-f", -0.8 * b.torso), "arm-b": add("arm-b", -0.8 * b.torso) }; };
  for (const [j, v] of Object.entries(turned(p))) turns[j] = (turns[j] ?? 0) + v;
  for (const f of body.follow ?? []) {
    // a damped swing after what it hangs from: late, a little past, then still
    const of = (s: number) => { const q = turned(performActs(acts, s, seen)); return (q[f.of] ?? 0) + (f.of === "head" ? q.neck : 0) + (f.of === "torso" ? 0 : q.torso); };
    let v = 0; for (let i = 1; i <= 5; i++) v += (of(t - (i * f.lag) / 5) - of(t - ((i - 1) * f.lag) / 5)) * Math.exp(-1.1 * (i - 1)) * Math.cos(0.75 * (i - 1));
    const lim = f.limit ?? 14; turns[f.bone] = (turns[f.bone] ?? 0) + Math.max(-lim, Math.min(lim, v * f.gain));
  }
  for (const [j, [lo, hi]] of Object.entries(body.limits ?? {})) if (turns[j] !== undefined) turns[j] = Math.max(lo, Math.min(hi, turns[j]));
  const stance = o.legs?.(t) ?? seated(body, p, facing), hips = stance?.hips;
  if (hips?.roll) { turns.pelvis = (turns.pelvis ?? 0) + hips.roll; turns.torso = (turns.torso ?? 0) - 1.35 * hips.roll; }
  const pose = (turn: Readonly<Record<string, number>>, over: Record<string, RigKey[]> = {}): RigSpec => {
    const tracks: Record<string, RigKey[]> = {};
    for (const [j, rotate] of Object.entries(turn)) if (joints.has(j)) tracks[j] = [{ frame: at, rotate }];
    // an arm that swings toward the viewer or away is drawn shorter, the forearm more: it bends as it comes forward
    if (stance?.arms) for (const h of ["f", "b"] as const) { const a = stance.arms[h], fore = a + 9 + Math.max(0, a) * 0.75; tracks[arms[h].upper] = [{ frame: at, rotate: turn[arms[h].upper] ?? 0, scaleY: Math.cos((a * Math.PI) / 180) }]; tracks[arms[h].lower] = [{ frame: at, rotate: turn[arms[h].lower] ?? 0, scaleY: Math.cos((fore * Math.PI) / 180) }]; }
    if (p.shift[0] || p.shift[1] || bent.hips || hips) tracks.pelvis = [{ frame: at, rotate: turn.pelvis ?? 0, x: (p.shift[0] + bent.hips) * body.height + (hips?.x ?? 0), y: p.shift[1] * body.height + (hips?.y ?? 0) }];
    if (stance) Object.assign(tracks, legKeys(spec, stance, tracks.pelvis[0], at));
    if (bent.scale < 1) { tracks.torso = [{ frame: at, rotate: turn.torso ?? 0, scaleY: bent.scale }]; tracks.head = [{ frame: at, rotate: turn.head ?? 0, scaleX: bent.size, scaleY: bent.size }]; }
    return { ...spec, root: o.root ?? spec.root, tracks: { ...spec.tracks, ...tracks, ...over }, drivers: [...(spec.drivers ?? []).filter(d => !stance || d.type !== "reach" || !d.upper.startsWith("thigh")), ...(o.drivers ?? [])] };
  };
  let posed = pose(turns);
  const hands = (["f", "b"] as const).filter(h => p.reach[h].length && joints.has(arms[h].upper)), about: readonly Moment[] = hands.length ? MOMENTS.map(m => ({ ...m, p: m.dt ? performActs(acts, t + m.dt, seen) : p })) : [];
  if (hands.length && p.lean > 0) {
    // the body leans only as far as the hands need it
    const solved = solveArms(body, { p, at, about, hands, posed, over: o.over }), lean = hands.map(h => p.lean * solved[h]!.need).reduce((a, b) => Math.max(a, b)), most = hands.find(h => p.lean * solved[h]!.need === lean)!, ahead = sideways(facing);
    if (lean > 0.05) { turns.torso = (turns.torso ?? 0) + lean * lerp(0.4 * solved[most]!.side, 1, ahead); bent = pitched(p.pitch + lean * (1 - ahead), facing); posed = pose(turns); }
  }
  return { p, at, about, over: o.over, hands, turns, posed, pose };
}

/** The legs of a figure that sits: the hips go back and down, the feet stay. Seen from the front, knees that bend always go toward the viewer. */
function seated(body: ActingBody, p: Performance, facing: number): LegStance | null {
  const f = (facing * Math.PI) / 180, way: ActPoint = [Math.cos(f), Math.sin(f)], at = (id: string) => body.spec.bones.find(b => b.id === id), pelvis = at("pelvis"), H = body.height, k = p.sit, back = 0.2 * H * k;
  if ((k <= 0.001 && Math.abs(way[1]) < 0.8) || !pelvis || !at("foot-f") || !at("foot-b")) return null;
  const show = ownFloor(H), [, y] = show([pelvis.x, lerp(pelvis.y, -(p.seat + ON_SEAT) * H, k), -back * way[1]]), ankle = (h: ActHand): [number, number, number] => { const thigh = at(`thigh-${h}`)!, shin = at(`shin-${h}`)!, foot = at(`foot-${h}`)!; return [(pelvis.x + thigh.x + shin.x + foot.x) * (1 + 0.15 * k), pelvis.y + thigh.y + shin.y + foot.y, 0.02 * H * k * way[1]]; };
  return { ankle: { f: ankle("f"), b: ankle("b") }, knee: way, hips: { x: -back * way[0], y: y - pelvis.y, z: -back * way[1], roll: 0 }, show };
}
/** Where a knee is drawn: a thigh that points at the viewer is short, and it still goes down. At no length its knee would change sides from one frame to the next, and the foot would jump with it. */
function lap(hip: ActPoint, [x, y, size]: readonly [number, number, number], U: number): [number, number, number] {
  const m = 0.14 * U, u = (y - hip[1]) / m, down = u >= 2 ? u : u <= 0 ? 1 : 1 + (u * u) / 4;
  return [x, lerp(y, hip[1] + m * down, 1 - smooth(Math.abs(x - hip[0]) / (0.4 * U))), size];
}
/** Rig keys of legs that stand somewhere, under hips that have been moved. */
function legKeys(spec: RigSpec, s: LegStance, pelvis: RigKey, frame: number): Record<string, RigKey[]> {
  const bone = (id: string) => spec.bones.find(b => b.id === id)!, root = bone("pelvis"), roll = ((pelvis.rotate ?? 0) * Math.PI) / 180, c = Math.cos(roll), n = Math.sin(roll), z = s.hips.z ?? 0, px = root.x + (pelvis.x ?? 0), py = root.y + (pelvis.y ?? 0), out: Record<string, RigKey[]> = {}, aim = (a: ActPoint, b: ActPoint) => (Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * 180) / Math.PI;
  for (const h of ["f", "b"] as const) {
    const thigh = bone(`thigh-${h}`), shin = bone(`shin-${h}`), U = thigh.length!, V = shin.length!, at: ActPoint = [px + thigh.x * c - thigh.y * n, py + thigh.x * n + thigh.y * c];
    // the hip is where the picture has it: that place, as deep as the hips are
    const [, , size] = s.show([0, 0, z]), [ox, oy] = s.show([0, 0, z]), hip = [(at[0] - ox) / size, (at[1] - oy) / size, z] as const, { knee, ankle } = bendLeg(hip, s.ankle[h], U, V, s.knee), K = lap(at, s.show(knee), U), A = s.show(ankle), upper = aim(at, [K[0], K[1]]), lower = aim([K[0], K[1]], [A[0], A[1]]);
    out[thigh.id] = [{ frame, rotate: upper - (pelvis.rotate ?? 0), scaleY: Math.max(0.12, Math.hypot(K[0] - at[0], K[1] - at[1]) / U), scaleX: (size + K[2]) / 2 }];
    out[shin.id] = [{ frame, rotate: lower - upper, scaleY: Math.max(0.12, Math.hypot(A[0] - K[0], A[1] - K[1]) / V), scaleX: (K[2] + A[2]) / 2 }];
    out[`foot-${h}`] = [{ frame, rotate: -lower, scaleX: A[2], scaleY: A[2] }];
  }
  return out;
}

/** A place that an act gives from the shoulder or the head, and the angle of its hand, for a body that faces the viewer: to the side of that arm. */
const frontal = (h: ActHand, q: ActPoint): number => { const far = Math.abs(q[0]); return far * Math.max(0.4 + 0.5 * smooth((0.1 - q[1]) / 0.15), 0.4 + 0.6 * smooth((far - 0.12) / 0.09)) * (h === "f" ? -1 : 1); };
const frontalAngle = (h: ActHand, forward: number): number => (Math.abs(forward) > 90 ? -Math.abs(forward) : Math.abs(forward) * 0.5) * (h === "f" ? 1 : -1);

/** A place at the own shoulder is taken on the outside of it, as near as the arm can be drawn short: seen from the front, the arm cannot fold through it. */
function around(h: ActHand, from: ActPoint, to: ActPoint, r: number): ActPoint {
  const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy), out = h === "f" ? -1 : 1;
  return r > 0 && d < r ? [to[0] + out * smooth((dx * out + r) / r) * Math.sqrt(r * r - d * d), to[1]] : to;
}

/** A hand that stops before a place: the palm, and the way it looks. A place far off is looked at along the arm. A near one is looked at along the forearm, from an elbow at the ribs. */
function before(h: ActHand, up: ActPoint, to: ActPoint, short: number, U: number, V: number): { at: ActPoint; angle?: number } {
  if (!short) return { at: to };
  const near = 1 - smooth((Math.hypot(to[0] - up[0], to[1] - up[1]) / (U + V) - 1) / 0.5), from: ActPoint = [up[0] + (h === "f" ? -0.12 : 0.12) * U * near, up[1] + U * near], dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy) || 1e-6;
  const k = Math.min(1, Math.max(d - short, Math.min(lerp(0.5 * (U + V), 0.75 * V, near), d)) / d); return { at: [from[0] + dx * k, from[1] + dy * k], angle: (Math.atan2(-dx, dy) * 180) / Math.PI };
}
/** An arm that reaches: its joints as the rig has them, in the figure's own space, and how it is bent to its place. */
interface Solved { arm: { upper: string; lower: string; hand: string }; U: number; V: number; hangs: OwnJoint; up: OwnJoint; low: OwnJoint; tip: OwnJoint; got: ArmPose; /** 0–1: how much the body has to come along, and to which side. */ need: number; side: number; /** The drawing of its hand, and the side of it that a body seen from the front would show. */ grip?: string; shows?: HandView }
interface OwnJoint { x: number; y: number; angle: number; scale: number }

/** Elbow and wrist from the shoulder, as deep as they are drawn short. */
function seenArm(U: number, V: number, got: ArmPose): { elbow: readonly [number, number, number]; wrist: readonly [number, number, number]; hand: number } {
  const way = (deg: number, n: number): ActPoint => [-Math.sin((deg * Math.PI) / 180) * n, Math.cos((deg * Math.PI) / 180) * n], deep = (L: number, shown: number, sign: number) => (sign < 0 ? -1 : 1) * L * Math.sqrt(Math.max(0, 1 - shown * shown)), e = way(got.upper, U * got.upperScale), f = way(got.lower, V * got.lowerScale), ez = deep(U, got.upperScale, got.depth[0]);
  return { elbow: [e[0], e[1], ez], wrist: [e[0] + f[0], e[1] + f[1], ez + deep(V, got.lowerScale, got.depth[1] - got.depth[0])], hand: got.hand };
}
const OTHER_SIDE: Readonly<Record<HandView, HandView>> = { palm: "back", back: "palm", thumb: "little", little: "thumb" };
/** Moments before and after, seconds; what a drawing of a hand counts there, and what a place does: an arm goes over in time to how another drawing can be held. */
const MOMENTS: readonly { dt: number; grip: number; place: number }[] = Array.from({ length: 25 }, (_, i) => { const dt = (i - 12) / 30, over = (span: number) => Math.cos((Math.PI / 2) * Math.min(1, Math.abs(dt) / span)) ** 2; return { dt, grip: over(0.4), place: over(0.36) }; });
type Moment = (typeof MOMENTS)[number] & { p: Performance };
/** A reach to where its place is on the whole, about now. */
function slowly(r: ActReach, about: readonly Moment[], h: ActHand): ActReach {
  const all = about.flatMap(m => m.p.reach[h].filter(q => q.of === r.of).map(q => ({ q, k: m.place }))), sum = all.reduce((n, { k }) => n + k, 0), mean = (of: (q: ActReach) => ActPoint | undefined): ActPoint | undefined => (of(r) ? [0, 1].map(i => all.reduce((n, { q, k }) => n + (of(q) ?? of(r)!)[i] * k, 0) / sum) as unknown as ActPoint : undefined);
  return { ...r, to: mean(q => q.to), shoulder: mean(q => q.shoulder), head: mean(q => q.head), chest: mean(q => q.chest) };
}
interface Drawn { /** The drawing, and the grip that it draws. */ grip?: string; of?: string; shows?: HandView; share: number }
/** The grips that an act wants about now, each with its share. */
function gripsOf(r: ActReach, about: readonly Moment[], h: ActHand): { grip?: string; share: number }[] {
  const all = about.flatMap(m => m.p.reach[h].filter(q => q.of === r.of).map(q => ({ grip: q.grip ?? m.p.grip[h], k: m.grip }))), sum = all.reduce((n, { k }) => n + k, 0);
  return [...new Set(all.map(q => q.grip))].map(grip => ({ grip, share: all.reduce((n, q) => n + (q.grip === grip ? q.k : 0), 0) / sum }));
}
/** The drawings of a grip, each with its share: most has the one that the forearm can show. From behind, an arm is solved as it is seen from the front: there its hand shows the other side. */
function drawnHands(body: ActingBody, h: ActHand, grip: string | undefined, U: number, V: number, got: ArmPose): Drawn[] {
  const all = body.hands ?? {}, facing = body.facing ?? 45, seen = (n: string) => (Math.sin((facing * Math.PI) / 180) < -0.3 ? OTHER_SIDE[all[n].shows] : all[n].shows);
  if (!grip || !all[grip]) return [{ grip, of: grip, share: 1 }];
  const strain = (n: string) => armStrain(armAngles({ side: h, facing, ...seenArm(U, V, { ...got, hand: got.lower }), shows: seen(n) })) + (n === grip ? -8 : 0), names = [grip, ...Object.keys(all).filter(n => all[n].as === grip)], cost = names.map(strain), least = Math.min(...cost), share = cost.map(c => Math.exp((least - c) / 4)), sum = share.reduce((a, b) => a + b, 0);
  return names.map((n, i) => ({ grip: n, of: grip, shows: seen(n), share: share[i] / sum })).sort((a, b) => b.share - a.share);
}

/** The ways to hold an arm that are compared: how short a part of it is drawn, how near to the viewer the hand is, and over a counter how far the elbow goes out. Nearer lets the elbow hang where it else goes out. */
const WAYS = [0, 0.25, 0.5, 0.75, 0.92].map(near => ({ near, shortest: 0 })), SIDES = [-0.8, -0.3, 0.1], LIFTS = [...SIDES, 0.6, 1.3];
/** The way that costs the least to hold (`armEffort`), drawn short as little as it can be, with the elbow over the `edge` of a counter that the arm goes over. Each way has a share, so that nothing jumps from one to another. */
function easiest(build: ArmBuild, goal: ArmAim, shows: HandView | undefined, edge: number | undefined): ArmPose {
  const aside = goal.aside ?? 0, all = WAYS.flatMap(w => (edge === undefined ? (aside > 0 ? [0] : SIDES) : LIFTS).map(l => solveArm(build, { ...goal, ...w, aside: aside + l }, true))), L = build.upper + build.lower;
  const cost = all.map(got => { const arm = seenArm(build.upper, build.lower, got), low = edge === undefined ? 0 : Math.max(0, goal.shoulder[1] + got.shift[1] + arm.elbow[1] - edge) / L; return armEffort(armAngles({ side: build.side, facing: build.facing, ...arm, shows })) + [got.upperScale, got.lowerScale].reduce((n, k) => n + 1.6 * Math.max(0, 0.78 - k) + 4 * Math.max(0, 0.5 - k), 0) + 60 * low; });
  const least = Math.min(...cost), share = cost.map(c => ((1 + least) / (1 + c)) ** 6), sum = share.reduce((a, b) => a + b, 0);
  return meanArm(build, all.map((got, i) => ({ got, share: share[i] / sum })));
}

/**
 * An arm as its joints hold it: the upper arm out from hanging (forward, in a side view), how far the elbow and the wrist bend, degrees,
 * and how much of each part shows. Only the place that an act wants is solved. From one hold to the next each joint turns on its own:
 * the elbow is a pivot that the forearm swings about, it goes one way and stays when the arm stays. A hand that is drawn along a line
 * has no such elbow: it slides, it jumps where the forearm points at the viewer, and the sleeve grows and shrinks with it.
 */
interface Hold { x: number; y: number; upper: number; upperScale: number; bend: number; lowerScale: number; wrist: number; elbowZ: number; wristZ: number }
const holds = (make: (k: keyof Hold) => number): Hold => ({ x: make("x"), y: make("y"), upper: make("upper"), upperScale: make("upperScale"), bend: make("bend"), lowerScale: make("lowerScale"), wrist: make("wrist"), elbowZ: make("elbowZ"), wristZ: make("wristZ") });
const mixed = (a: Hold, b: Hold, u: number): Hold => holds(k => lerp(a[k], b[k], u));
/** From `a` to `b`, half way through `via`. */
const through = (a: Hold, via: Hold, b: Hold, u: number): Hold => holds(k => (1 - u) ** 2 * a[k] + 2 * u * (1 - u) * (2 * via[k] - (a[k] + b[k]) / 2) + u * u * b[k]);
/** An angle within half a turn of `middle`. */
const about = (middle: number, deg: number) => middle + turnBetween(middle, deg);
/** The way that the joints come up in the picture: out to its own side, or forward when the body is seen from its side. */
const outward = (h: ActHand, ahead: number) => (ahead < 0.5 && h === "f" ? 1 : -1);
/** `inside`: the forearm comes up before the body, not beside it. That is which way round an elbow goes that is bent nearly flat. */
const holdOf = (got: ArmPose, way: number, inside: boolean): Hold => ({ x: got.shift[0], y: got.shift[1], upper: about(60, way * got.upper), upperScale: got.upperScale, bend: about(inside ? -40 : 40, way * (got.lower - got.upper)), lowerScale: got.lowerScale, wrist: turnBetween(got.lower, got.hand), elbowZ: got.depth[0], wristZ: got.depth[1] });
const poseOf = (q: Hold, way: number, stretch: number): ArmPose => ({ shift: [q.x, q.y], upper: way * q.upper, upperScale: q.upperScale, lower: way * (q.upper + q.bend), lowerScale: q.lowerScale, hand: way * (q.upper + q.bend) + q.wrist, depth: [q.elbowZ, q.wristZ], stretch });

/** Bends the arms that reach: from where the rig has them to how each act holds them. */
function solveArms(body: ActingBody, s: Pick<Stands, "p" | "at" | "about" | "hands" | "posed" | "over">): Partial<Record<ActHand, Solved>> {
  const base = evaluateRig(s.posed, s.at), w = base.toScene, det = w.a * w.d - w.b * w.c || 1e-9, arms = body.arms ?? ARMS, facing = body.facing ?? 45, ahead = sideways(facing), H = body.height, out: Partial<Record<ActHand, Solved>> = {};
  const own = (x: number, y: number): [number, number] => [(w.d * x - w.c * y) / det, (w.a * y - w.b * x) / det];
  // a joint and the way its bone points, in the figure's own space: bones are in the scene
  const joint = (id: string): OwnJoint => { const m = base.bones.get(id)!.world, [x, y] = own(m.e - w.e, m.f - w.f), [vx, vy] = own(m.c, m.d); return { x, y, angle: (Math.atan2(-vx, vy) * 180) / Math.PI, scale: Math.hypot(vx, vy) }; };
  for (const h of s.hands) {
    const arm = arms[h], bone = (id: string) => s.posed.bones.find(b => b.id === id)!, shown = (id: string) => s.posed.tracks?.[id]?.[0]?.scaleY ?? 1, U = bone(arm.upper).length!, V = bone(arm.lower).length!, L = U + V, hangs = joint(bone(arm.upper).parent!), up = joint(arm.upper), low = joint(arm.lower), tip = joint(arm.hand), own0 = body.palm ?? [0, 0], at: ActPoint = [up.x, up.y], way = outward(h, ahead);
    const edge = s.over?.[h] === undefined ? undefined : own(0, s.over[h]! - w.f)[1];
    // what is far off is only a direction: the hand goes as far that way as the arm does
    const limit = (to: ActPoint, palm: ActPoint): ActPoint => { const far = Math.hypot(to[0] - up.x, to[1] - up.y), most = 1.02 * L + Math.hypot(palm[0], palm[1]); return far > most ? [lerp(up.x, to[0], most / far), lerp(up.y, to[1], most / far)] : to; };
    // the place that an act wants. What lies on a counter is pointed at from over the counter, not from the own hip
    const reached = (r: ActReach): Reached => {
      const from = r.head ? joint("head") : r.chest ? joint("neck") : up, q = r.head ?? r.chest ?? r.shoulder ?? [0, 0], stop = r.to ? before(h, at, r.to, (edge !== undefined && r.to[1] > edge ? 0.6 : 1) * (r.short ?? 0) * H, U, V) : undefined, side = r.angle ?? (r.forward !== undefined ? lerp(frontalAngle(h, r.forward), r.forward, ahead) : stop?.angle);
      return { to: stop ? stop.at : [from.x + (r.chest ? q[0] + ahead * (r.ahead ?? 0) : lerp(frontal(h, q), q[0], ahead)) * H, from.y + q[1] * H], inside: r.to ? ((r.to[0] - up.x) * (h === "f" ? 1 : -1)) / L > 0.1 : !!r.chest || (!!r.head && Math.abs(r.head[0]) < 0.075), angle: side === undefined ? undefined : side + (r.spin ?? 0), out: r.out ?? 0, aside: r.aside ?? 0, near: r.near ?? NEAR, shortest: r.shortest ?? 0.62, said: r.shortest !== undefined, palm: r.palm === undefined ? own0[1] : r.palm * H, place: !!r.to, weight: r.weight };
    };
    let need = 0, side = 0;
    const drawn = (r: ActReach, got: ArmPose): Drawn[] => gripsOf(r, s.about, h).flatMap(q => drawnHands(body, h, q.grip, U, V, got).map(d => ({ ...d, share: d.share * q.share }))).filter(d => d.share > 0.02);
    const mean = (all: readonly Drawn[], of: (shows: HandView | undefined) => Hold): Hold => { const got = all.map(d => of(d.shows)), sum = all.reduce((n, d) => n + d.share, 0); return holds(k => got.reduce((n, q, i) => n + (q[k] * all[i].share) / sum, 0)); };
    const armOf = (g: Reached): ArmBuild => ({ side: h, upper: U, lower: V, facing, palm: [own0[0], g.palm] });
    // the elbow as it is held for `calm`, the hand at `to`
    const hold = (g: Reached, to: ActPoint, calm: Reached, all: readonly Drawn[]): Hold => mean(all, shows => {
      const bare = armOf(g), build = shows ? { ...bare, wrist: wristRange(h, shows) } : bare, { angle, out, aside, shortest, near } = calm, goal: ArmAim = { shoulder: at, to: open(calm), angle, out, aside, shortest, near };
      // first the arm as it is held on the whole, with a forearm that can be seen; then the hand, and the elbow stays
      const calmly = armFrom(build, goal, g.said || ahead >= 0.5 ? solveArm(build, goal) : easiest(build, goal, shows, edge !== undefined && calm.to[1] > edge ? edge : undefined), 0.42);
      return holdOf(armFrom(build, { ...goal, to, angle: g.angle }, calmly, 0.15), way, ahead < 0.5 && g.inside);
    });
    const open = (g: Reached) => around(h, at, limit(g.to, [own0[0], g.palm]), 0.68 * g.shortest * L * (1 - ahead));
    /** The place that an act wants, and the drawings of the hand there: those that can be held where it is on the whole. */
    const solve = (r: ActReach, g: Reached, calm: Reached): { held: Hold; all: readonly Drawn[] } => {
      const full = solveArm(armOf(g), { shoulder: at, ...g }), all = drawn(r, solveArm(armOf(calm), { shoulder: at, ...calm, to: open(calm) })); need = lerp(need, smooth((full.stretch - 0.86) / 0.3), g.weight); side = lerp(side, Math.sign(g.to[0] - up.x), g.weight);
      return { held: hold(g, open(g), calm, all), all };
    };
    // photographs say how the arm is held: its joints, and nothing to solve
    const shownAs = (r: ActReach, f: NonNullable<ActReach["front"]>): { held: Hold; all: readonly Drawn[] } => {
      const got: ArmPose = { shift: [0, -0.055 * L * smooth((Math.abs(f.upper) - 50) / 80)], upper: way * f.upper, upperScale: f.long?.[0] ?? 1, lower: way * f.lower, lowerScale: f.long?.[1] ?? 1, hand: way * (f.hand ?? f.lower), depth: [0, 0], stretch: 0 }, q = holdOf(got, way, false), all = drawn(r, got);
      return { held: mean(all, shows => { const [lo, hi] = shows ? wristRange(h, shows) : [-46, 46]; return { ...q, wrist: Math.min(hi, Math.max(lo, q.wrist)) }; }), all };
    };
    const rests: Hold = { x: 0, y: 0, upper: about(60, way * up.angle), upperScale: shown(arm.upper), bend: about(0, way * (low.angle - up.angle)), lowerScale: shown(arm.lower), wrist: turnBetween(low.angle, tip.angle), elbowZ: 0, wristZ: 0 };
    let now = rests, over = 0, counter: { g: Reached; all: readonly Drawn[] } | undefined, look: Drawn | undefined;
    for (const r of s.p.reach[h]) {
      // how an arm is held to a place that moves (over a pan, at a mouth) is found for where that is on the whole: the hand is quick, the elbow is calm
      const front = ahead < 0.5 ? r.front : undefined, g = reached(r), past = front || edge === undefined || !g.place ? 0 : smooth((g.to[1] - edge + 0.05 * H) / (0.05 * H)), { held, all } = front ? shownAs(r, front) : solve(r, g, reached(slowly(r, s.about, h)));
      // over a counter: up before the body first. Half way, all of the hand is over the far edge, and there it changes from behind the counter to in front of it
      const rises = Math.max(past * (1 - over), over * (1 - past)), of = past >= over ? { g, all } : counter, u = r.weight, direct = mixed(now, held, u);
      now = rises > 0 && of ? mixed(direct, through(now, hold(of.g, [lerp(up.x, of.g.to[0], 0.85), edge! - 0.07 * H], of.g, of.all), held, u), rises) : direct;
      if (past > 0) counter = { g, all }; over = lerp(over, past, u); look = all.filter(d => d.of === s.p.grip[h]).reduce<Drawn | undefined>((a, d) => (a && a.share >= d.share ? a : d), undefined) ?? look;
    }
    const got = poseOf(now, way, 0); look ??= drawnHands(body, h, s.p.grip[h], U, V, got)[0];
    out[h] = { arm, U, V, hangs, up, low, tip, got, need, side: Math.sign(side), grip: look.grip, shows: look.shows };
  }
  return out;
}

/** Rig keys of a bent arm. */
function keysOf({ arm, hangs, up, low, tip, got }: Solved, turns: Readonly<Record<string, number>>): Record<string, Omit<RigKey, "frame">> {
  const t = (-hangs.angle * Math.PI) / 180, [sx, sy] = got.shift;
  return {
    [arm.upper]: { rotate: (turns[arm.upper] ?? 0) + turnBetween(up.angle - hangs.angle, got.upper - hangs.angle), scaleY: got.upperScale, x: sx * Math.cos(t) - sy * Math.sin(t), y: (sx * Math.sin(t) + sy * Math.cos(t)) / hangs.scale },
    [arm.lower]: { rotate: (turns[arm.lower] ?? 0) + turnBetween(low.angle - up.angle, got.lower - got.upper), scaleY: got.lowerScale },
    [arm.hand]: { rotate: (turns[arm.hand] ?? 0) + turnBetween(tip.angle - low.angle, got.hand - got.lower) },
  };
}
