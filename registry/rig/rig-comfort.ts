/**
 * RIG1 comfort: the angles that a person's joints have.
 *
 * Each joint has what it can do at all (`can`: the passive ranges of ANAT1, `registry/anatomy/anatomy-pose.ts`) and what reads as easy
 * in a picture (`easy`: the bands of the RULA sheet, widened by what photographs of the same acts show). A film refuses the first and
 * asks about the second. A range is no pose: a hand can be inside all of them and still hold a handle as nobody does. A pose comes from
 * photographs (`ACT_STUDIES`), the ranges only find what went wrong.
 *
 * Own space of the figure, as in `rig-arm.ts`: x right, y down, z to the viewer. Angles are degrees. Pure.
 */
import { turnBetween } from "./rig-arm";

export type ComfortVec = readonly [number, number, number];
/** The side of a hand that its drawing shows. */
export type HandView = "palm" | "back" | "thumb" | "little";
export type JointId = "raise" | "behind" | "aside" | "across" | "bend" | "turn" | "wrist-flex" | "wrist-side" | "neck-turn" | "neck-nod" | "neck-tilt" | "back-bend" | "back-tilt" | "back-turn";
export interface JointRange { can: readonly [number, number]; easy: readonly [number, number]; /** What 0 is and which way is plus. */ about: string }
export const JOINT_RANGES: Readonly<Record<JointId, JointRange>> = {
  raise: { can: [0, 180], easy: [0, 100], about: "Upper arm away from hanging down." },
  behind: { can: [0, 60], easy: [0, 30], about: "Upper arm behind the body." },
  aside: { can: [0, 180], easy: [0, 110], about: "Upper arm out to its side, the elbow away from the ribs." },
  across: { can: [0, 60], easy: [0, 35], about: "Upper arm over the chest, past straight ahead." },
  bend: { can: [0, 150], easy: [0, 135], about: "Elbow; 0 is straight." },
  turn: { can: [-85, 80], easy: [-80, 75], about: "Forearm; 0 has the thumb up at a bent elbow, plus turns the palm down." },
  // the tasks of daily life that Gates et al. 2016 measured need no more than 38° to the palm and 40° back (https://pmc.ncbi.nlm.nih.gov/articles/PMC4690598/)
  "wrist-flex": { can: [-70, 80], easy: [-40, 40], about: "Wrist; plus bends to the palm." },
  "wrist-side": { can: [-20, 30], easy: [-18, 28], about: "Wrist; minus to the thumb, plus to the little finger." },
  "neck-turn": { can: [-60, 60], easy: [-45, 45], about: "Head to a side." },
  "neck-nod": { can: [-45, 45], easy: [-20, 30], about: "Head; plus looks down." },
  "neck-tilt": { can: [-45, 45], easy: [-20, 20], about: "Ear to a shoulder." },
  "back-bend": { can: [-25, 80], easy: [-10, 60], about: "Back; plus bends forward." },
  "back-tilt": { can: [-35, 35], easy: [-15, 15], about: "Back to a side." },
  "back-turn": { can: [-45, 45], easy: [-25, 25], about: "Chest to a side." },
};
export const inRange = ([lo, hi]: readonly [number, number], v: number, slack = 0) => v >= lo - slack && v <= hi + slack;

const RAD = Math.PI / 180, dot = (a: ComfortVec, b: ComfortVec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a: ComfortVec, b: ComfortVec): ComfortVec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: ComfortVec): ComfortVec => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const deg = (c: number) => Math.acos(Math.min(1, Math.max(-1, c))) / RAD;
const minus = (a: ComfortVec, b: ComfortVec, k: number): ComfortVec => [a[0] - b[0] * k, a[1] - b[1] * k, a[2] - b[2] * k];

export interface ArmSeen { side: "f" | "b"; /** Degrees that the front of the body is turned to the viewer: 90 faces the viewer. */ facing: number; /** Elbow and wrist from the shoulder. */ elbow: ComfortVec; wrist: ComfortVec; /** Angle of the hand in the picture. */ hand: number; shows?: HandView; /** Degrees that the hand in the drawing is turned about its forearm from `shows`, the palm to the thumb: a palm painted a little from the side of the little finger. */ slant?: number }
export type ArmAngles = Partial<Record<"raise" | "behind" | "aside" | "across" | "bend" | "turn" | "wrist-flex" | "wrist-side", number>>;

/** Where the palm and the thumb of a hand look whose forearm points along `f`. */
function handAxes(side: "f" | "b", f: ComfortVec, shows: HandView, slant = 0): { palm: ComfortVec; thumb: ComfortVec } {
  // a right hand has its thumb where palm × fingers points, a left hand on the other side; `f` is the arm of the right hand of a body that faces the viewer, and of one seen from the side that walks to the right
  const way = side === "f" ? 1 : -1, z: ComfortVec = [0, 0, shows === "back" || shows === "little" ? -1 : 1], seen = unit(minus(z, f, dot(z, f)));
  const t = cross(seen, f), n = cross(f, seen), [palm, thumb]: ComfortVec[] = shows === "palm" || shows === "back" ? [seen, [t[0] * way, t[1] * way, t[2] * way]] : [[n[0] * way, n[1] * way, n[2] * way], seen], c = Math.cos(slant * RAD), s = Math.sin(slant * RAD);
  return { palm: [palm[0] * c + thumb[0] * s, palm[1] * c + thumb[1] * s, palm[2] * c + thumb[2] * s], thumb: [thumb[0] * c - palm[0] * s, thumb[1] * c - palm[1] * s, thumb[2] * c - palm[2] * s] };
}

/** The joints of an arm as it is drawn. The turn of the forearm is left out of a straight arm: there the shoulder turns the hand. */
export function armAngles(a: ArmSeen): ArmAngles {
  const phi = a.facing * RAD, s = Math.abs(Math.sin(phi)), ahead: ComfortVec = [Math.cos(phi), 0, s], out: ComfortVec = a.side === "f" ? [-s, 0, Math.cos(phi)] : [s, 0, -Math.cos(phi)], u = unit(a.elbow), f = unit(minus(a.wrist, a.elbow, 1)), raise = deg(u[1]), bend = deg(dot(u, f)), got: ArmAngles = { raise, bend, behind: Math.max(0, Math.asin(Math.max(-1, Math.min(1, -dot(u, ahead)))) / RAD) };
  got.aside = Math.max(0, Math.asin(Math.max(-1, Math.min(1, dot(u, out)))) / RAD);
  if (raise > 25) got.across = Math.max(0, Math.asin(Math.max(-1, Math.min(1, -dot(u, out)))) / RAD);
  if (!a.shows) return got;
  const { palm, thumb } = handAxes(a.side, f, a.shows, a.slant), flat = turnBetween(Math.atan2(-f[0], f[1]) / RAD, a.hand), h: ComfortVec = [-Math.sin(a.hand * RAD), Math.cos(a.hand * RAD), 0];
  if (a.shows === "palm" || a.shows === "back") got["wrist-side"] = dot(h, thumb) > 0 ? -Math.abs(flat) : Math.abs(flat);
  else got["wrist-flex"] = dot(h, palm) > 0 ? Math.abs(flat) : -Math.abs(flat);
  if (bend > 25) { const way = a.side === "f" ? 1 : -1, c = cross(u, f), m = unit([c[0] * way, c[1] * way, c[2] * way]), n = unit(minus(palm, f, dot(palm, f))); got.turn = (Math.atan2(dot(cross(m, n), f), dot(m, n)) / RAD) * way; }
  return got;
}
/** The joints of a drawn arm, read as a viewer reads them: a picture does not say if a short part points to the viewer or away, and the easier way is the one that is seen. Of a forearm that points at the viewer, a flat hand does not say how it is turned. */
export function readArm(a: ArmSeen): ArmAngles {
  const [ux, uy, uz] = a.elbow, [vx, vy, vz] = minus(a.wrist, a.elbow, 1), short = Math.hypot(vx, vy) < 0.6 * Math.hypot(vx, vy, vz);
  const ways = [1, -1].flatMap(i => [1, -1].map(j => armAngles({ ...a, elbow: [ux, uy, uz * i], wrist: [ux + vx, uy + vy, uz * i + vz * j], shows: short ? undefined : a.shows }))), cost = (g: ArmAngles) => 10 * armStrain(g, "can") + armEffort(g);
  return ways.reduce((p, q) => (cost(q) < cost(p) ? q : p));
}
/** How far over what is easy an arm is drawn, degrees: 0 when all of it is easy. `can`: over what is possible. */
export function armStrain(got: ArmAngles, range: "easy" | "can" = "easy"): number {
  return Object.entries(got).reduce((worst, [j, v]) => { const [lo, hi] = JOINT_RANGES[j as JointId][range]; return Math.max(worst, lo - v!, v! - hi); }, 0);
}
/** What it costs to hold an arm like this, for choosing between ways that reach the same place: an arm that hangs with the forearm before the body costs nothing. */
export function armEffort(got: ArmAngles): number {
  const over = (v: number | undefined, free: number, unit: number) => Math.max(0, Math.abs(v ?? 0) - free) / unit;
  return over(got.raise, 10, 35) ** 2 + over(got.behind, 5, 20) ** 2 + over(got.aside, 12, 14) ** 2 + over(got.across, 5, 25) ** 2 + over((got.bend ?? 80) - 80, 30, 60) ** 2 + over(got["wrist-flex"], 15, 25) ** 2 + over(got["wrist-side"], 8, 15) ** 2 + over(got.turn, 45, 35) ** 2 + armStrain(got) / 10;
}
/** How far a hand bends from its forearm in the picture, clockwise: to the thumb and to the little finger when its palm or its back is seen, to the palm and back when it is seen from its edge. `studied`: what the study of the act shows (`ACT_STUDIES` hand), in place of what is easy. */
export function wristRange(side: "f" | "b", shows: HandView, studied?: Partial<Record<JointId, readonly [number, number]>>): readonly [number, number] {
  const joint = shows === "palm" || shows === "back" ? "wrist-side" : "wrist-flex", { can, easy } = JOINT_RANGES[joint], own = studied?.[joint], [lo, hi] = own ? [Math.max(can[0], own[0]), Math.min(can[1], own[1])] : easy, { palm, thumb } = handAxes(side, [0, 1, 0], shows);
  // to its right in the picture is against the clock for a hand that points down
  const first = shows === "palm" || shows === "back" ? -thumb[0] : palm[0];
  return first > 0 ? [-hi, -lo] : [lo, hi];
}
