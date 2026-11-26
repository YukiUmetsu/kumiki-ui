/**
 * Painted storybook films as data: a cast of painted, rigged figures, painted sets and props, spoken Japanese lines, and shots
 * that say who does what and when. `planStorybook` lays the shots out; `storybookFrame` gives the picture of one moment for
 * `PaintStage` and the words that go with it. No film has code of its own, and any frame can be drawn alone.
 *
 * Places and sizes in a scene are centimetres: x to the right, y down, the ground at y = 0. Times are seconds from the start of
 * the shot. Words and the picture's frame on the page are in stage units (the film's own pixels).
 */
import { evaluateEasing } from "../../motion/easing";
import type { EasingSpec } from "../../motion/types";
import { ACTS, GRIP_FOR, actFrame, performActs } from "../../rig/rig-acting";
import type { ActedFrame, ActingBody, ActPoint, Act, TimedAct } from "../../rig/rig-acting";
import { evaluateRig } from "../../rig/rig-evaluate";
import type { RigFrame } from "../../rig/rig-evaluate";
import type { FlutterParams } from "../../rig/rig-flutter";
import { walkDriver } from "../../rig/rig-joints";
import type { JointedPerson } from "../../rig/rig-joints";
import { inspectPainted, paintedLooks, paintedMeshes, paintedSocket } from "../../rig/rig-look-painted";
import type { PaintedArt, PaintedImage, PaintedMesh } from "../../rig/rig-look-painted";
import type { RigBone, RigDriver, RigRootKey, RigSpec } from "../../rig/rig-spec";
import { floorOf, stepsOf, walkAt } from "../../rig/rig-walk";
import type { Floor, GroundView, LegStance, Steps } from "../../rig/rig-walk";
import { inspectRuby, parseRuby, rubyPlain } from "./japanese-text";
import type { RubyToken } from "./japanese-text";
import { PAINT_TRANSITIONS } from "./paint-stage";
import type { PaintFrame, PaintGrade, PaintMesh, PaintPlace, PaintRect, PaintSheet, PaintTransitionKind } from "./paint-stage";
import { burstLight, sparksOf } from "./story-burst";
import type { Burst, SparkColor } from "./story-burst";
import { MOUTH_REST, mouthAt, mouthKeys, spokenToken } from "./speech-mouth";
import type { MouthKey, SpeechTrack } from "./speech-mouth";

type Pt = readonly [number, number];
/** A place: scene centimetres, a mark of the set, or a prop of the shot. */
export type StoryPlace = Pt | string;

export interface StoryFigure { art: PaintedArt; body: ActingBody; person?: JointedPerson; /** The walk in this view. */ walk?: { stride?: number; arms?: number; lift?: number; bob?: number } }
export interface StoryActor { name: string; /** Written name with reading, in ruby markup. */ label?: string; /** Colour of the name in subtitles. */ color?: string; figures: Readonly<Record<string, StoryFigure>>; /** Makes blinks and sway their own. */ seed?: number }
export interface StoryPropView { image: PaintedImage; /** Centimetres. */ width: number; height: number; /** Where it is held, 0–1 of the painting. */ grip?: Pt; /** Where it stands, 0–1 of the painting. Default: the middle of its bottom edge. */ foot?: Pt }
export interface StoryProp extends StoryPropView { name: string; views?: Readonly<Record<string, StoryPropView>>; /** Held, it hangs straight down from its grip and swings after the hand (a bag, a lantern). A number is how much; `true` is 1, and with 0 it only stays upright. */ hangs?: boolean | number; /** How dark its shadow is where it stands, 0–1. Default 0. */ shadow?: number }
export interface StorySetLayer {
  id: string; image: PaintedImage; x: number; y: number; width: number; height: number;
  /** Parallax: 1 moves with the figures, less is further away, more is closer. */ depth?: number;
  /** Order with roles and props. Default −100. */ z?: number; /** Or the y of the floor that it stands on: it is in front of who is further away. */ stands?: number; blur?: number; opacity?: number; tint?: readonly [number, number, number]; mirror?: boolean;
  /** It swings a little (a branch, a lantern, a curtain). `pivot` is 0–1 of the painting. */ sway?: { pivot: Pt; degrees: number; period: number; phase?: number };
  /** It moves along: how far, in centimetres, at times of the shot (a door). `swing` turns it about its `hinge`, degrees toward the viewer (a car door). */ slide?: readonly { t: number; x: number; y?: number; swing?: number; ease?: EasingSpec }[]; /** The upright that it swings about, 0–1 of its width. Default 0. */ hinge?: number;
  /** It goes by without an end (a street behind a window, clouds): centimetres a second to the right. Its edges have to fit, `round` apart (its width). It shows only `within` (from x to x). With `into` it goes away to a place instead, or comes from there: it is `by` times as large at one end, `seconds` for that, with the pace at 1. */ flow?: { speed?: number; round?: number; within?: Pt; into?: { at: Pt; by: number; seconds: number } };
  /** It goes along with another layer (a wheel with its car), and turns as far as it rolls. */ with?: string; /** Radius of a wheel, centimetres. */ rolls?: number;
  /** Who has both hands on it turns it (a steering wheel): it goes round with them. */ hands?: boolean;
}
export interface StorySet { /** The camera that the set was painted for. */ home: { at: Pt; tall: number }; layers: readonly StorySetLayer[]; /** Places by name: across, up, and what is in front of what there (`z` of a thing that stands there). */ marks?: Readonly<Record<string, readonly [number, number, number?]>>; /** Its floor goes into the distance: who stands higher in the picture is smaller, and behind. */ ground?: GroundView; /** How dark the floor is under feet, 0–1. Default: 0.34 with a ground, else 0. */ shade?: number }
export interface StoryLine { speaker: string; /** Japanese in ruby markup. */ ja: string; /** Translation. It is hidden until `glosses` is on. */ en?: string; track: SpeechTrack; /** Recording. */ audio?: string }

export interface StoryCameraKey { t: number; at: Pt; /** Height of the picture, centimetres. */ tall: number; ease?: EasingSpec }
export interface StoryAct extends Omit<TimedAct, "params"> { params?: Readonly<Record<string, unknown>> }
export interface StoryRole {
  actor: string; view?: string; /** Where it is: one place, or a path over time. */ path: Pt | readonly { t: number; x: number; y?: number; ease?: EasingSpec }[];
  /** Other views at later times: the figure turns from one to the next. */ views?: readonly { t: number; view: string; facing?: 1 | -1 }[];
  /** What it looks at from a time on: eyes first, then head, then chest. */ attend?: readonly StoryAttend[];
  facing?: 1 | -1; scale?: number; z?: number; acts?: readonly StoryAct[]; /** Expression when no act says otherwise. */ look?: string;
  /** Where the eyes rest, −1..1. */ gaze?: Pt; /** Turn of the head that stays. */ turn?: Pt; /** Hand drawings that stay: layer → drawing. */ hands?: Readonly<Record<string, string>>; /** What it wears: every part that has a drawing of this name ("sock"). */ wear?: readonly string[]; tint?: readonly [number, number, number]; hidden?: readonly string[];
  /** Layers that come forward for a time (an arm over a counter). What of the own body is in front of them stays in front. */ raise?: readonly { layers: readonly string[]; z: number; from?: number; to?: number; /** Only while that hand is at a place. */ reach?: boolean; /** Height of the far edge of what they go over: a hand goes up before the body and changes sides while all of it is over the edge. */ edge?: number }[];
  /** It moves its head and hands when it speaks. Default true. */ speaks?: boolean;
  /** Recordings of single steps: one sounds when a foot comes down. */ steps?: { takes: readonly Omit<StorySound, "at" | "bed">[]; gain?: number };
}
export interface StoryAttend { t: number; /** Someone of the shot, a place, the viewer, or nothing. */ to: StoryPlace | "viewer" | "ahead"; /** 0–1: how far the head and the chest go along. Default 1. */ much?: number }
export type StoryHold = { t: number; /** Seconds to go over from the place before. */ over?: number; view?: string; angle?: number; hidden?: boolean; /** Where it is held, parts of its size. Default: of the view. */ grip?: Pt } & ({ at: StoryPlace; z?: number } | { by: string; socket: string });
export interface StoryStagedProp { prop: string; holds: readonly StoryHold[]; scale?: number; /** Order when it is not held. Default 21. */ z?: number }
export interface StoryDrift { id: string; sprites: readonly PaintedImage[]; count: number; /** x, y, width, height where they start. */ area: readonly [number, number, number, number]; /** Width of a sprite, centimetres. */ size: Pt; /** Frames. */ life: number; flutter: FlutterParams; tumble?: number; roll?: number; vary?: number; fade?: number; seed?: number; /** Its size when it comes and when it goes. */ grow?: Pt; z?: number; depth?: number; opacity?: number; blur?: number }
/** Fireworks and the like. `spark` is a dab of white paint that lies along x, `glow` a soft white disc. */
export interface StoryBurst extends Burst { id: string; spark: PaintedImage; glow?: PaintedImage; /** Order with the layers of the set. Default −98. */ z?: number; depth?: number; /** How much its light is on the whole picture, 0–1. */ light?: number }
export interface StoryFiredBurst { burst: StoryBurst; /** Seconds into the shot when it opens. */ at: number; /** Where it opens. */ place: Pt; /** Times its size. */ size?: number }
export interface StorySay { line: string; at: number }
export interface StoryWords { text: string; /** Translation under it, smaller. */ gloss?: string; /** The translation is what the page teaches: it shows, also when `glosses` is off. */ means?: boolean; at?: number; for?: number; /** Seconds after the words come when their translation comes. */ reveal?: number; /** Middle of its letters, in the last row: furigana stand above it and the translation under it, so that words stay in one line. */ place: Pt; size: number; align?: "left" | "center" | "right"; tone?: "title" | "vocab" | "note" }
export interface StorySound {
  src: string; /** Seconds into the shot. */ at: number; /** dB. */ gain?: number; /** Seconds into the recording, and how many of them sound. */ from?: number; for?: number;
  /** Seconds from the start of the recording to its hit, which lands on `at`. */ lead?: number; /** Seconds to come in and to go out. */ fade?: Pt; /** −1 left, 1 right. */ pan?: number;
  /** A sound that lies under the shots: it repeats for `for` seconds (default: the rest of this shot) and goes down under a voice. */ bed?: boolean;
}
export interface StoryTransition { kind: PaintTransitionKind; seconds: number; /** 0–1 of the picture. */ from?: Pt }
export interface StoryShot {
  id: string; /** What can be seen, for people who cannot see it. */ label: string; set: string; seconds: number; camera: readonly StoryCameraKey[];
  roles?: readonly StoryRole[]; props?: readonly StoryStagedProp[]; says?: readonly StorySay[]; drifts?: readonly StoryDrift[]; bursts?: readonly StoryFiredBurst[]; words?: readonly StoryWords[]; sounds?: readonly StorySound[];
  /** How this shot takes over from the one before; they share its seconds. */ transition?: StoryTransition; layout?: "page" | "full"; grade?: PaintGrade; /** How fast the layers go by that flow: 0 stands. Default 1. */ pace?: number | readonly { t: number; pace: number }[];
  /** Layers of the set that move in this shot, by id, as their own `slide` would (a train that comes in, a door). */ slides?: Readonly<Record<string, NonNullable<StorySetLayer["slide"]>>>;
}
export interface StorybookFilm {
  id: string; title: string; size: { width: number; height: number }; fps: number; paper?: string;
  /** Where the picture lies on a page. */ frame: PaintRect;
  cast: Readonly<Record<string, StoryActor>>; sets: Readonly<Record<string, StorySet>>; props: Readonly<Record<string, StoryProp>>; lines: Readonly<Record<string, StoryLine>>; shots: readonly StoryShot[];
  /** The whole sound track, mixed. */ audio?: string;
  /** Drawings a second of the moving outline; 0 holds it still. Default 6. */ boil?: number;
  /** More acts by name. */ acts?: Readonly<Record<string, Act>>;
}

// ---- time ------------------------------------------------------------------------------------------------------------------------

export interface PlannedShot { shot: StoryShot; index: number; /** Seconds. */ start: number; end: number }
export interface StoryPlan { film: StorybookFilm; shots: readonly PlannedShot[]; seconds: number; frames: number }
export function planStorybook(film: StorybookFilm): StoryPlan {
  let at = 0;
  const shots = film.shots.map((shot, index): PlannedShot => { const start = index ? at - (shot.transition?.seconds ?? 0) : 0; at = start + shot.seconds; return { shot, index, start, end: at }; });
  return { film, shots, seconds: at, frames: Math.max(1, Math.round(at * film.fps)) };
}
/** The shot on at a time; while two overlap, the later one. */
export function storyShotAt(plan: StoryPlan, t: number): PlannedShot { let on = plan.shots[0]; for (const s of plan.shots) if (t >= s.start) on = s; return on; }

const eased = (e: EasingSpec | undefined, u: number) => evaluateEasing(e ?? "ease-in-out-cubic", Math.min(1, Math.max(0, u)));
/** Keys over time, eased between. */
function keyed<K extends { t: number; ease?: EasingSpec }>(keys: readonly K[], t: number, read: (k: K) => readonly number[]): number[] {
  if (t <= keys[0].t) return [...read(keys[0])];
  for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t < b.t) { const u = eased(b.ease, (t - a.t) / Math.max(1e-6, b.t - a.t)), p = read(a), q = read(b); return p.map((v, n) => v + (q[n] - v) * u); } }
  return [...read(keys[keys.length - 1])];
}

// ---- camera ----------------------------------------------------------------------------------------------------------------------

export interface StoryView { /** Scene centimetres → stage units, for something at this depth. */ put(x: number, y: number, depth?: number): [number, number]; scale(depth?: number): number; camera: { at: Pt; tall: number }; rect: PaintRect }
export function storyView(film: StorybookFilm, shot: StoryShot, t: number): StoryView {
  const set = film.sets[shot.set], rect: PaintRect = shot.layout === "full" ? { x: 0, y: 0, width: film.size.width, height: film.size.height } : film.frame;
  const [x, y, tall] = keyed(shot.camera, t, k => [k.at[0], k.at[1], k.tall]), home = set.home, cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  const scale = (k = 1) => rect.height / (home.tall * Math.pow(tall / home.tall, k));
  return { scale, camera: { at: [x, y], tall }, rect, put: (px, py, k = 1) => { const s = scale(k); return [cx + (px - (home.at[0] + (x - home.at[0]) * k)) * s, cy + (py - (home.at[1] + (y - home.at[1]) * k)) * s]; } };
}

// ---- speech ----------------------------------------------------------------------------------------------------------------------

export interface StorySpoken { line: StoryLine; tokens: readonly RubyToken[]; keys: readonly MouthKey[]; level(t: number): number }
const spoken = new WeakMap<StoryLine, StorySpoken>();
export function storySpoken(line: StoryLine): StorySpoken {
  let s = spoken.get(line);
  if (!s) {
    const phones = line.track.phones, level = (t: number) => { let v = 0; for (const p of phones) if (p.p !== "sp") { const k = Math.min(1, Math.max(0, (t - p.start + 0.06) / 0.06)) * Math.min(1, Math.max(0, (p.end + 0.1 - t) / 0.1)); v = Math.max(v, k * (p.level ?? 0.75) * ("aiueo".includes(p.p[0]) ? 1 : 0.6)); } return v; };
    spoken.set(line, (s = { line, tokens: parseRuby(line.ja), keys: mouthKeys(line.track), level }));
  }
  return s;
}
export const storyLineSeconds = (line: StoryLine): number => { const p = line.track.phones; return p.length ? p[p.length - 1].end : line.track.seconds; };

// ---- roles -----------------------------------------------------------------------------------------------------------------------

export interface StoryPlayed { role: StoryRole; actor: StoryActor; figure: StoryFigure; spec: RigSpec; frame: RigFrame; meshes: readonly PaintedMesh[]; /** Turn of the head in depth, degrees: yaw and pitch. */ turn: Pt; /** 0–1: how far each hand is at a place. */ reaching: Readonly<Record<"f" | "b", number>>; /** The hand comes to its place, and the arm and the hand of that side are all over the far edge of what they are raised over (`raise.edge`, 1 cm kept): they change sides there, before the hand is half there, and nobody sees it. */ clear: Readonly<Record<"f" | "b", boolean>>; /** Joints of the arms that reach, degrees, and the drawings of the hands. */ arms: ActedFrame["arms"]; hands: Readonly<Record<string, string>>; /** Layers that are drawn over the head now. */ lift: Readonly<Record<string, number>> }
const viewAt = (role: StoryRole, t: number) => role.views?.reduce<{ view: string; facing?: 1 | -1 } | undefined>((on, k) => (t >= k.t ? k : on), undefined);
const figureOf = (film: StorybookFilm, role: StoryRole, t = 0): StoryFigure => { const f = film.cast[role.actor].figures; return f[viewAt(role, t)?.view ?? role.view ?? Object.keys(f)[0]]; };
/** Every figure that a role is drawn with. */
const figuresOf = (film: StorybookFilm, role: StoryRole): StoryFigure[] => [figureOf(film, role, -1), ...(role.views ?? []).map(k => film.cast[role.actor].figures[k.view])];
const facingAt = (role: StoryRole, t: number): 1 | -1 => viewAt(role, t)?.facing ?? role.facing ?? 1;
const isPath = (p: StoryRole["path"]): p is Exclude<StoryRole["path"], Pt> => typeof p[0] !== "number";
const pathOf = (role: StoryRole) => (isPath(role.path) ? role.path : [{ t: 0, x: role.path[0], y: role.path[1] }]);

/** A role's way over the floor: where it is at a time, and the steps that take it there. */
interface Way { floor?: Floor; at(t: number): { x: number; y: number; scale: number }; roots: readonly { t: number; x: number; y: number; scale: number; ease?: EasingSpec }[]; runs: readonly Run[] }
interface Run { from: number; to: number; steps: Steps; /** How far along at a time. */ along(t: number): number; /** A place of the floor, this far along. */ place(along: number): [number, number] }
const ways = new WeakMap<StoryRole, { set: StorySet; way: Way }>(), SAMPLE = 1 / 12;
function wayOf(film: StorybookFilm, shot: StoryShot, role: StoryRole): Way {
  const set = film.sets[shot.set], kept = ways.get(role); if (kept && kept.set === set) return kept.way;
  const keys = pathOf(role), floor = set.ground && floorOf(set.ground), own = role.scale ?? 1; let way: Way;
  if (!floor) { way = { at: t => { const [x, y] = keyed(keys, t, k => [k.x, k.y ?? 0]); return { x, y, scale: own }; }, roots: keys.map(k => ({ t: k.t, x: k.x, y: k.y ?? 0, scale: own, ease: k.ease })), runs: [] }; }
  else {
    // it goes over the floor, not over the picture: an even walk looks slower further away
    const spot = (t: number) => keyed(keys, t, k => floor.place(k.x, k.y ?? 0)) as [number, number], at = (t: number) => { const [X, Z] = spot(t), [x, y, s] = floor.show([X, 0, Z]); return { x, y, scale: s * own }; };
    const first = keys[0].t, last = keys[keys.length - 1].t, count = Math.max(1, Math.ceil((last - first) / SAMPLE)), times = keys.length > 1 ? Array.from({ length: count + 1 }, (_, i) => first + ((last - first) * i) / count) : [first];
    const height = figureOf(film, role, -1).body.height * own, runs: Run[] = []; let from = -1;
    keys.slice(1).forEach((k, i) => { const a = keys[i], moves = Math.hypot(k.x - a.x, (k.y ?? 0) - (a.y ?? 0)) > 2; if (moves && from < 0) from = i; if (from >= 0 && (!moves || i === keys.length - 2)) { const t0 = keys[from].t, t1 = moves ? k.t : a.t; runs.push(runOf(spot, t0, t1, height, runs.length)); from = -1; } });
    way = { floor, at, roots: times.map(t => ({ t, ...at(t), ease: "linear" as const })), runs };
  }
  ways.set(role, { set, way }); return way;
}
function runOf(spot: (t: number) => [number, number], from: number, to: number, height: number, n: number): Run {
  const count = Math.max(2, Math.ceil((to - from) / 0.02)), times = Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count), at = times.map(spot), far = [0]; for (let i = 1; i <= count; i++) far.push(far[i - 1] + Math.hypot(at[i][0] - at[i - 1][0], at[i][1] - at[i - 1][1]));
  const between = (list: readonly number[], v: number): [number, number] => { let lo = 0, hi = list.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (list[m] <= v) lo = m; else hi = m; } return [lo, Math.min(1, Math.max(0, (v - list[lo]) / Math.max(1e-6, list[hi] - list[lo])))]; };
  return { from, to, steps: stepsOf(far[count], height, { first: n % 2 ? "b" : "f" }), along: t => { const [i, u] = between(times, t); return far[i] + (far[Math.min(count, i + 1)] - far[i]) * u; }, place: l => { const [i, u] = between(far, l), b = Math.min(count, i + 1); return [at[i][0] + (at[b][0] - at[i][0]) * u, at[i][1] + (at[b][1] - at[i][1]) * u]; } };
}
const rootAt = (film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number) => wayOf(film, shot, role).at(t);
/** A figure that is seen from the front or from behind, and walks over a floor: its legs at a time. */
function legsOf(film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number): LegStance | null {
  const way = wayOf(film, shot, role), figure = figureOf(film, role, t), facing = figure.body.facing ?? 45; if (!way.floor || Math.abs(Math.sin((facing * Math.PI) / 180)) < 0.8) return null;
  const run = way.runs.find(r => t > r.from && t < r.to); if (!run) return null;
  const { floor } = way, H = figure.body.height, own = role.scale ?? 1, side = facingAt(role, t), along = run.along(t), w = walkAt(run.steps, along), [X, Z] = run.place(along), root = way.at(t), bone = (id: string) => figure.body.spec.bones.find(b => b.id === id)!, pelvis = bone("pelvis"), toward = facing > 180 ? -1 : 1;
  const ankle = (k: "f" | "b"): [number, number, number] => { const q = w.feet[k], [x, z] = run.place(q.along), thigh = bone(`thigh-${k}`), shin = bone(`shin-${k}`), foot = bone(`foot-${k}`), rest = pelvis.x + thigh.x + shin.x + foot.x, up = pelvis.y + thigh.y + shin.y + foot.y; return [((x - X) / own) * side + rest * (1 - 0.1 * q.close), up - (0.045 * q.lift + 0.03 * q.heel) * H, (z - Z) / own]; };
  const ankles = { f: ankle("f"), b: ankle("b") }, over = w.over * Math.sign(ankles.f[0] || -1), step = run.steps.step / own, arm = (k: "f" | "b") => Math.max(-20, Math.min(20, (-toward * ankles[k][2] * 20) / step)) * w.much;
  return { ankle: ankles, knee: [0, toward], hips: { x: 0.011 * H * over, y: 0.02 * H * w.sink, roll: -1.8 * w.over }, arms: { f: arm("f"), b: arm("b") }, show: ([x, y, z]) => { const [px, py, s] = floor.show([X + x * side * own, y * own, Z + z * own]); return [((px - root.x) * side) / root.scale, (py - root.y) / root.scale, (s * own) / root.scale]; } };
}
/** Order on a floor: who stands lower in the picture is in front. */
const depthZ = (set: StorySet, y: number): number => (set.ground ? (floorOf(set.ground).scale(y) - 1) * 100 : 0);
/** How near someone is drawn: the larger number covers the smaller one. */
export const storyDepth = (film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number): number => role.z ?? depthZ(film.sets[shot.set], rootAt(film, shot, role, t).y);

/** Which way a figure looks in the picture, degrees: 0 at the viewer, 90 to the right, 180 away. */
const heading = (figure: StoryFigure, facing: 1 | -1) => facing * (90 - (figure.body.facing ?? 45));
const TURN = 0.3, TURNED = 27;
/** A figure that goes over from one view to another turns on both sides of the change: head and chest toward the next one before, and out of it after. Degrees, as the figure has them. */
function turningAt(film: StorybookFilm, role: StoryRole, t: number): { yaw: number; trunk: number; thin: number } {
  for (const k of role.views ?? []) {
    const d = t - k.t; if (Math.abs(d) >= TURN) continue;
    const before = figureOf(film, role, k.t - 1e-3), after = figureOf(film, role, k.t), f0 = facingAt(role, k.t - 1e-3), f1 = facingAt(role, k.t); if (before === after && f0 === f1) continue;
    const turn = ((heading(after, f1) - heading(before, f0) + 540) % 360) - 180, way = Math.sign(turn) || 1, u = d < 0 ? smooth(1 + d / TURN) : 1 - smooth(d / TURN), s = d < 0 ? way * f0 : -way * f1;
    return { yaw: 23 * u * s, trunk: 15 * u * s, thin: 27 * u };
  }
  return { yaw: 0, trunk: 0, thin: 0 };
}

/** Where the face of a role is, scene centimetres. */
function faceOf(film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number): { x: number; y: number; depth: number; /** Over its own floor, in its own centimetres. */ up: number } {
  const r = rootAt(film, shot, role, t), H = figureOf(film, role, t).body.height, floor = film.sets[shot.set].ground && floorOf(film.sets[shot.set].ground!);
  const low = (role.acts ?? []).reduce((v, a) => { if (a.act !== "sit") return v; const d = a.for ?? 3, u = t - a.at; return u < 0 || u > d ? v : Math.max(v, 0.22 * smooth(u / Number(a.params?.in ?? 1)) * smooth((d - u) / Math.max(0.01, Number(a.params?.away ?? 1)))); }, 0);
  return { x: r.x, y: r.y - (0.92 - low) * H * r.scale, depth: floor ? floor.place(r.x, r.y)[1] : 0, up: (0.92 - low) * H };
}
interface Attention { gaze: Pt; turn: Pt; trunk: number }
/** The head tips this far after what it looks at, degrees; the eyes do the rest. */
const TIP = 5;
const EYES = { lag: 0, over: 0.1 }, HEAD = { lag: 0.09, over: 0.44 }, CHEST = { lag: 0.22, over: 0.62 };
/** Where a role looks: the eyes are there first, the head follows, the chest last. A face that is turned to the viewer keeps some of that. */
function attention(film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number): Attention {
  const list = role.attend; if (!list?.length) return { gaze: [0, 0], turn: [0, 0], trunk: 0 };
  const me = faceOf(film, shot, role, t), side = facingAt(role, t), figure = figureOf(film, role, t), size = rootAt(film, shot, role, t).scale, base = 90 - (figure.body.facing ?? 45), most = 13;
  const wants = list.map(k => {
    if (k.to === "viewer") return { yaw: -base, pitch: 0, head: -base * 0.6, tip: 0, chest: 0 };
    if (k.to === "ahead") return { yaw: 0, pitch: 0, head: 0, tip: 0, chest: 0 };
    const who = typeof k.to === "string" ? shot.roles?.find(r => r !== role && r.actor === k.to) : undefined, at: { x: number; y: number; depth: number; up?: number } = who ? faceOf(film, shot, who, t) : (() => { const [x, y] = storyPlace(film, shot, k.to, k.t); return { x, y, depth: me.depth }; })();
    // two people look at each other by how tall they are, not by how high the picture has them: who stands farther off stands higher in it
    const dx = ((at.x - me.x) * side) / size, dy = at.up !== undefined ? me.up - at.up : (at.y - me.y) / size, dz = (at.depth - me.depth) * (Math.abs(base) < 20 ? 1 : 0), far = Math.hypot(dx, dz, 40), much = k.much ?? 1;
    const yaw = (Math.atan2(dx, Math.max(30, 62 + 0.7 * dz)) * 180) / Math.PI - base, pitch = Math.max(-26, Math.min(30, (Math.atan2(dy, far) * 180) / Math.PI));
    const head = Math.max(-most, Math.min(most, yaw * 0.6)) * much;
    return { yaw, pitch, head, tip: Math.max(-TIP, Math.min(TIP, pitch * 0.3)) * much, chest: Math.sign(head) * Math.max(0, Math.abs(yaw) * 0.3 - 5) * much };
  });
  const follow = (read: (w: (typeof wants)[number]) => number, p: { lag: number; over: number }) => wants.reduce((v, w, i) => (i ? v + (read(w) - v) * smooth((t - list[i].t - p.lag) / p.over) : read(w)), 0);
  const head = follow(w => w.head, HEAD), tip = follow(w => w.tip, HEAD), chest = Math.max(-13, Math.min(13, follow(w => w.chest, CHEST)));
  return { gaze: [Math.max(-1, Math.min(1, (follow(w => w.yaw, EYES) - head) / 46)), Math.max(-0.9, Math.min(0.9, (follow(w => w.pitch, EYES) - tip) / 30))], turn: [head, tip], trunk: chest };
}
/** A look that goes far comes with a blink. */
const blinksOf = (role: StoryRole, seed: number): number[] => (role.attend ?? []).slice(1).filter((_, i) => (i + seed) % 2 === 0).map(k => k.t + ((seed * 0.618034) % 1) * 0.3);

/** Where a place is, scene centimetres. */
export function storyPlace(film: StorybookFilm, shot: StoryShot, place: StoryPlace, t = 0): Pt {
  if (typeof place !== "string") return place;
  const mark = film.sets[shot.set].marks?.[place]; if (mark) return [mark[0], mark[1]];
  const prop = shot.props?.find(p => p.prop === place), hold = prop?.holds.filter(h => "at" in h && h.t <= t + 1e-6).pop() ?? prop?.holds.find(h => "at" in h);
  if (hold && "at" in hold && hold.at !== place) { const p = storyPlace(film, shot, hold.at, t), v = propView(film, prop!.prop, hold.view), foot = v.foot ?? [0.5, 1], grip = v.grip ?? [0.5, 0.5], k = prop!.scale ?? 1; return [p[0] + (grip[0] - foot[0]) * v.width * k, p[1] + (grip[1] - foot[1]) * v.height * k]; }
  throw new Error(`Shot "${shot.id}" names the place "${place}", which is not a mark of its set or a prop that stands anywhere.`);
}
const propView = (film: StorybookFilm, id: string, view?: string): StoryPropView => { const p = film.props[id]; return (view && p.views?.[view]) || p; };

/** Acts of a role with their places in the figure's own space, and the acts that follow from what it says. */
function actsOf(film: StorybookFilm, shot: StoryShot, role: StoryRole): TimedAct[] {
  const own = (role.acts ?? []).map((a): TimedAct => {
    if (!a.params) return a as TimedAct;
    const params: Record<string, unknown> = { ...a.params };
    for (const k of ["to", "from"]) if (params[k] !== undefined && params[k] !== null) {
      const p = storyPlace(film, shot, params[k] as StoryPlace, a.at), mid = a.at + (a.for ?? 1) / 2, root = rootAt(film, shot, role, mid), f = facingAt(role, mid);
      params[k] = [((p[0] - root.x) * f) / root.scale, (p[1] - root.y) / root.scale];
    }
    return { ...a, params };
  });
  if (role.speaks === false) return own;
  return [...own, ...(shot.says ?? []).filter(s => film.lines[s.line]?.speaker === role.actor).map((s): TimedAct => ({ act: "speak", at: s.at, for: storyLineSeconds(film.lines[s.line]) + 0.2 }))];
}
const libraries = new WeakMap<StorybookFilm, Readonly<Record<string, Act>>>();
/** The acts that a film knows: the library and its own. */
function libraryOf(film: StorybookFilm): Readonly<Record<string, Act>> { let l = libraries.get(film); if (!l) libraries.set(film, (l = film.acts ? { ...ACTS, ...film.acts } : ACTS)); return l; }
/** Puts an arm in front of every layer of its own figure. */
const OVER_HEAD = 20;
const cachedActs = new WeakMap<StoryRole, { shot: StoryShot; acts: TimedAct[] }>();

/** The bones of a role at a time of its shot. */
function poseRole(film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number, still: boolean) {
  const actor = film.cast[role.actor], figure = figureOf(film, role, t), { body } = figure, way = wayOf(film, shot, role), facing = facingAt(role, t), { thin } = turningAt(film, role, t), path = way.roots;
  let kept = cachedActs.get(role); if (!kept || kept.shot !== shot) cachedActs.set(role, (kept = { shot, acts: actsOf(film, shot, role) }));
  const says = (shot.says ?? []).filter(s => film.lines[s.line]?.speaker === role.actor), voice = (time: number) => says.reduce((v, s) => Math.max(v, storySpoken(film.lines[s.line]).level(time - s.at)), 0);
  const root: RigRootKey[] = path.map(k => ({ frame: way.floor ? k.t * film.fps : Math.round(k.t * film.fps), x: k.x, y: k.y, facing, scale: k.scale, ...(thin ? { yaw: thin } : {}), ease: k.ease })), legs = way.floor && way.runs.length ? (time: number) => legsOf(film, shot, role, time) : undefined, moves = path.length > 1 && path.some(k => k.x !== path[0].x) && !(way.floor && Math.abs(Math.sin(((body.facing ?? 45) * Math.PI) / 180)) >= 0.8), drivers: RigDriver[] = [];
  if (moves && figure.person) drivers.push(walkDriver(figure.person, { start: root[0].frame - 100, end: root[root.length - 1].frame + 6, ramp: 6, ...figure.walk }));
  const spec: RigSpec = moves ? { ...body.spec, drivers: (body.spec.drivers ?? []).filter(d => d.type !== "reach") } : body.spec;
  const edge = (h: "f" | "b") => role.raise?.find(r => r.edge !== undefined && r.layers.includes(`hand-${h}`) && t >= (r.from ?? 0) && t <= (r.to ?? Infinity))?.edge, over = role.raise ? { f: edge("f"), b: edge("b") } : undefined;
  // where the hands are a frame later: a hand that comes over an edge may change sides before it is half there
  const soon = over && (over.f !== undefined || over.b !== undefined) ? performActs(kept.acts, t + 1 / film.fps, { library: libraryOf(film), facing: body.facing ?? 45, height: body.height }) : undefined;
  return { actor, figure, says, soon, acted: actFrame({ ...body, spec }, kept.acts, t, { root, over, fps: film.fps, drivers, voice, seed: (actor.seed ?? 1) * 3 + shot.id.length, blinks: blinksOf(role, actor.seed ?? 1), look: role.look ?? figure.art.face?.idle, library: libraryOf(film), still, legs }) };
}
/** The drawing that a figure has of a hand. */
function handFor(art: PaintedArt, layer: string, name: string): string { const has = art.layers.find(l => l.id === layer)?.variants; return !has || has[name] ? name : (GRIP_FOR[name]?.find(g => has[g]) ?? name); }
/** A role at a time of its shot. */
export function playRole(film: StorybookFilm, shot: StoryShot, role: StoryRole, t: number, still = false): StoryPlayed {
  const { actor, figure, says, soon, acted } = poseRole(film, shot, role, t, still), art = figure.art, p = acted.performance;
  const now = says.map(s => ({ s, at: t - s.at, sp: storySpoken(film.lines[s.line]) })).find(q => q.at >= 0 && q.at <= storyLineSeconds(q.sp.line) + 0.16), mouth = now ? mouthAt(now.sp.keys, now.at) : MOUTH_REST;
  const speaking = now ? Math.min(1, now.at / 0.06, (storyLineSeconds(now.sp.line) + 0.16 - now.at) / 0.1) : 0;
  const hands: Record<string, string> = {};
  for (const l of art.layers) for (const w of role.wear ?? []) if (l.variants?.[w]) hands[l.id] = w;
  Object.assign(hands, role.hands);
  for (const h of ["f", "b"] as const) if (acted.hands[h]) hands[`hand-${h}`] = handFor(art, `hand-${h}`, acted.hands[h]!);
  const lift: Record<string, number> = {}; for (const h of p.over) { lift[`arm-${h}`] = OVER_HEAD; lift[`hand-${h}`] = OVER_HEAD; }
  const a = attention(film, shot, role, t), turning = turningAt(film, role, t);
  const turn: Pt = [p.headTurn[0] + (role.turn?.[0] ?? 0) + (turning.yaw ? Math.max(-TURNED, Math.min(TURNED, a.turn[0] + turning.yaw)) : a.turn[0]), p.headTurn[1] + (role.turn?.[1] ?? 0) + a.turn[1]];
  const meshes = paintedMeshes(art, acted.spec, acted.frame, {
    trunk: p.trunk + a.trunk + turning.trunk, hands, lift, hidden: role.hidden, tint: role.tint,
    face: { look: p.look ?? undefined, from: p.lookFrom ?? undefined, mix: p.lookMix, blink: p.blink, gaze: [p.gaze[0] + (role.gaze?.[0] ?? 0) + a.gaze[0] * (1 - p.gazeHeld), p.gaze[1] + (role.gaze?.[1] ?? 0) + a.gaze[1] * (1 - p.gazeHeld)], brow: p.brow, turn, mouth: { ...mouth, weight: Math.max(0, speaking) } },
  });
  const clear = { f: false, b: false }, weigh = (reach: typeof p.reach.f) => 1 - reach.reduce((w, r) => (r.to ? w * (1 - r.weight) : w), 1);
  for (const h of ["f", "b"] as const) {
    const r = role.raise?.find(q => q.edge !== undefined && q.layers.includes(`hand-${h}`) && t >= (q.from ?? 0) && t <= (q.to ?? Infinity)); if (!r || !soon || weigh(soon.reach[h]) <= weigh(p.reach[h])) continue;
    clear[h] = meshes.every(m => { const id = m.id.split("/")[0]; if (!r.layers.includes(id) || !id.endsWith(`-${h}`) || (m.opacity ?? 1) <= 0.02) return true; for (let i = 1; i < m.positions.length; i += 2) if (m.positions[i] > r.edge! + 1) return false; return true; });
  }
  return { role, actor, figure, spec: acted.spec, frame: acted.frame, meshes, turn, reaching: { f: weigh(p.reach.f), b: weigh(p.reach.b) }, clear, lift, arms: acted.arms, hands };
}

// ---- props -----------------------------------------------------------------------------------------------------------------------

interface Propped { view: StoryPropView; at: [number, number]; angle: number; z: number; hidden: boolean; /** Held by a raised hand. */ behind?: PaintPlace; /** It stands: where, and how dark its shadow is. */ stands?: { foot: Pt; shadow: number } }
/** How far a hanging thing swings behind the hand that moves it, degrees. */
function swingOf(film: StorybookFilm, shot: StoryShot, who: StoryPlayed, socket: string, t: number, gain: number): number {
  const x = (s: number) => paintedSocket(who.figure.art, poseRole(film, shot, who.role, Math.max(0, s), false).acted.frame, socket)?.at[0] ?? 0, a = x(t), b = x(t - 0.16), c = x(t - 0.34), d = x(t - 0.52);
  return Math.max(-18, Math.min(18, gain * ((a - b) * 1.1 + (b - c) * 0.35 - (c - d) * 0.6)));
}
function holdAt(film: StorybookFilm, shot: StoryShot, staged: StoryStagedProp, hold: StoryHold, played: readonly StoryPlayed[], t: number): Propped {
  const view = propView(film, staged.prop, hold.view), k = staged.scale ?? 1;
  if ("by" in hold) {
    const who = played.find(p => p.role.actor === hold.by), socket = who && paintedSocket(who.figure.art, who.frame, hold.socket);
    if (who && socket) {
      const mirrored = who.frame.root.facing < 0, deg = (mirrored ? 180 - socket.angle : socket.angle) + (hold.angle ?? 0) * (mirrored ? -1 : 1), hangs = film.props[staged.prop].hangs ?? false, angle = hangs !== false ? (hold.angle ?? 0) + (hangs ? swingOf(film, shot, who, hold.socket, t, Number(hangs)) : 0) : mirrored ? -deg : deg, a = (angle * Math.PI) / 180, grip = hold.grip ?? view.grip ?? [0.5, 0.5], gx = (0.5 - grip[0]) * view.width * k, gy = (0.5 - grip[1]) * view.height * k;
      const layer = who.figure.art.layers.find(l => l.id === (who.figure.art.sockets?.[hold.socket]?.layer ?? "")), raised = layer && storyRaised(who, layer.id, t), order = (layer?.z ?? 50) + (who.lift[layer?.id ?? ""] ?? 0) + 0.03;
      return { view, at: [socket.at[0] + gx * Math.cos(a) - gy * Math.sin(a), socket.at[1] + gx * Math.sin(a) + gy * Math.cos(a)], angle, z: (raised?.z ?? storyDepth(film, shot, who.role, t)) + order * 0.01, hidden: !!hold.hidden, behind: raised && veilOf(who, layer!.id) > 0.5 ? { body: who.role.actor, near: order } : undefined };
    }
    return { view, at: [0, 0], angle: 0, z: 0, hidden: true };
  }
  const p = storyPlace(film, shot, hold.at, hold.t), foot = view.foot ?? [0.5, 1], angle = hold.angle ?? 0, a = (angle * Math.PI) / 180, fx = (0.5 - foot[0]) * view.width * k, fy = (0.5 - foot[1]) * view.height * k;
  return { view, at: [p[0] + fx * Math.cos(a) - fy * Math.sin(a), p[1] + fx * Math.sin(a) + fy * Math.cos(a)], angle, z: hold.z ?? staged.z ?? (typeof hold.at === "string" ? film.sets[shot.set].marks?.[hold.at]?.[2] : undefined) ?? 21, hidden: !!hold.hidden, stands: { foot: p, shadow: film.props[staged.prop].shadow ?? 0 } };
}
/** A prop at a time: who holds it, or where it stands, and the way between. */
function propAt(film: StorybookFilm, shot: StoryShot, staged: StoryStagedProp, played: readonly StoryPlayed[], t: number): Propped | null {
  let i = -1; staged.holds.forEach((h, n) => { if (t >= h.t) i = n; });
  if (i < 0) return null;
  const hold = staged.holds[i], now = holdAt(film, shot, staged, hold, played, t), over = hold.over ?? 0.16, before = staged.holds[i - 1];
  if (!before || over <= 0 || t - hold.t >= over || before.hidden || hold.hidden) return now.hidden ? null : now;
  const was = holdAt(film, shot, staged, before, played, t), u = eased("ease-in-out-quad", (t - hold.t) / over), turn = ((now.angle - was.angle + 540) % 360) - 180;
  return { view: u < 0.5 ? was.view : now.view, at: [was.at[0] + (now.at[0] - was.at[0]) * u, was.at[1] + (now.at[1] - was.at[1]) * u], angle: was.angle + turn * u, z: u < 0.5 ? Math.max(was.z, now.z) : now.z, hidden: false, behind: u < 0.5 ? was.behind : now.behind, stands: now.stands ? { ...now.stands, shadow: now.stands.shadow * (was.stands ? 1 : u) } : was.stands && { ...was.stands, shadow: was.stands.shadow * (1 - u) } };
}

// ---- pictures --------------------------------------------------------------------------------------------------------------------

const QUAD = new Uint16Array([0, 1, 2, 1, 3, 2]), UV = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), UV_MIRROR = new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]);
type Put = (x: number, y: number) => [number, number];
/** A painting on a rectangle turned about a point. */
function quad(image: string, x: number, y: number, w: number, h: number, put: Put, o: { angle?: number; about?: Pt; mirror?: boolean; /** Room round it for its blur, in the widths and heights of the picture. */ room?: Pt } = {}): PaintMesh {
  const a = ((o.angle ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), [ox, oy] = o.about ?? [x + w / 2, y + h / 2], [rx, ry] = o.room ?? [0, 0], positions = new Float32Array(8);
  [[x - rx * w, y - ry * h], [x + w + rx * w, y - ry * h], [x - rx * w, y + h + ry * h], [x + w + rx * w, y + h + ry * h]].forEach(([px, py], i) => { const dx = px - ox, dy = py - oy, [X, Y] = put(ox + dx * c - dy * s, oy + dx * s + dy * c); positions[i * 2] = X; positions[i * 2 + 1] = Y; });
  return { image, positions, uvs: o.room ? new Float32Array([-rx, -ry, 1 + rx, -ry, -rx, 1 + ry, 1 + rx, 1 + ry]) : o.mirror ? UV_MIRROR : UV, indices: QUAD };
}

/** What hangs on an upright hinge, swung toward the viewer: narrower, and what is nearer is larger. */
function swung(set: StorySet, hinge: number, degrees: number): (x: number, y: number) => [number, number] {
  if (!degrees) return (x, y) => [x, y];
  const a = (degrees * Math.PI) / 180, { horizon: [cx, cy], distance } = set.ground ?? { horizon: set.home.at, distance: 4 * set.home.tall };
  return (x, y) => { const near = distance / (distance - Math.abs(x - hinge) * Math.sin(a)); return [cx + (hinge + (x - hinge) * Math.cos(a) - cx) * near, cy + (y - cy) * near]; };
}

const drifts = new WeakMap<StoryDrift, RigSpec>();
function driftSpec(d: StoryDrift): RigSpec {
  let s = drifts.get(d);
  if (!s) {
    const bones: RigBone[] = [{ id: "root", x: 0, y: 0 }, ...Array.from({ length: d.count }, (_, i) => ({ id: `d${i}`, parent: "root", x: 0, y: 0 }))];
    s = { version: 1, id: "drift", kind: "drift", bones, parts: [], palette: {}, drivers: [{ type: "drift", bones: bones.slice(1).map(b => b.id), area: d.area, life: d.life, flutter: d.flutter, tumble: d.tumble, roll: d.roll, vary: d.vary, fade: d.fade, seed: d.seed, grow: d.grow }], bounds: { x: 0, y: 0, width: 1, height: 1 }, provenance: { license: "project", source: "drifting sprites" } };
    drifts.set(d, s);
  }
  return s;
}

interface Ordered { z: number; mesh: PaintMesh }
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
/** How a layer is raised at a time, if it is. */
export const storyRaised = ({ role, reaching, clear }: Pick<StoryPlayed, "role" | "reaching" | "clear">, layer: string, t: number) => role.raise?.find(r => { const h = layer.endsWith("-b") ? "b" : "f"; return r.layers.includes(layer) && t >= (r.from ?? 0) && t <= (r.to ?? Infinity) && (!r.reach || reaching[h] > (r.edge === undefined ? 0.3 : 0.5) || (r.edge !== undefined && reaching[h] > 0.01 && clear[h])); });
/** How far the own body is in front of a raised hand and forearm: all the way, until a far hand comes in front of its own chest. */
function veilOf(p: StoryPlayed, layer: string): number {
  const side = layer.slice(-1), at = p.frame.bones.get(`hand-${side}`), from = p.frame.bones.get(`arm-${side}`);
  return side !== "b" || !at || !from ? 1 : smooth((((at.world.e - from.world.e) * p.frame.root.facing) / p.frame.root.scale - 1) / 6);
}
/** A soft blot. */
const BLOT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAADd0lEQVR42r2Y6XbiMAyFr5dAEvr+b9qQzfH80GI5C6Uzh6lPoAeCPku2ruS4jM/+xbfucuYCgGyufwS4ahCCTNvxlwAHDwfPrw7eADZkvuS/XwIcHDyCuTz7AJ7/hg3JXBeenAM8PDwCAiK/eoMQ8xtWJCSs8Ej8yRsAB4fAZhtEHgFhByDTNBZG4ehHPDUfEdGYIYgCEPMLFiwIWLDAAQy5BIj5BjczBEFBAgdIzM+YMbN/OCL2gIDIZu86BBEMIKn5Sb9xirgAeJ39HXe0PAqC9hJ4/4j5xgDK3LcjwDGAZt+hQ4cWHVq0HKhoPFg5OCMa3QCn6bcH0PxbdOjQo2dMy4DAZhIDRp0/1PzGYwdwVYBadOjxQI8HI+4cJAEsWDBVfoENJ84J9iGa+Ac0CmjRo8cXHuwFrUPgNUhV/MvC0+ZNnNmpAEgYYuVBhwePHp0GiYxJgPbmJekiEhwccgF4zV3ZQx2H6Qs9eg5SZA9WLJjUo1wl3YwFAYG9MABZgxIkWWjy4Y6bAcy6IjYnZpMxvDJRNT+w6jScxzWCgmQB0cyeVqTkfGRZccjWA29U6GbSjTA1IFbLfa8kJaj2Vh4UgS5Cd6uy+oaGzS7VWtwOouhVOowHgjjHEEoAYv7MdDA1UD2w1debchO0HkRdPtJLClOpFUF/54zsOZsHtsB78+7NEFHYzGf13bY9cJTB/6UvyrtWZDPvmxmJ9d5+Vt9dlNRoUTZamI0xW3VX3Tm0ixbzTVKB2wyEGzTxYKsaEZv6lKGx2j9SKGe9Z1WRS3WvFCsdPzM9VRpUMnnEiAnTBUY8MR5srCqrMT1xxdrnLwGeeB4whDAlp3iQNNZSDG0Vo7SygAlPDBgUYxEr0pkHtlMYjS5KDdvL9YihQkyKSLUHtmBIpWpUE0XSppOC88SAb0VMjCg1rcoDaaXmqlUUQZ5PS+aTEd+KmDlIh5q8IcFjQcCs2mI7iPOiTwv9jQFDFSTyoOoqSrcmsoWqA7pqW0b2Yqg8SMe2RRBL1QQKdHrReI146pYlQLIHkj2gqKEsvMz/qnWcMPKgbFivAKWftGcAmunr5lfGbAJ00V1zs6TiQWbead9nY/7F+SBzvcJu/j8dQKwS5VeAgrCp9/4RKv18hCrFh5byvUNguj4EuvzhY6zLHz6Iu/zhRwkuf/hhiPv045w/JNpFrmKtORQAAAAASUVORK5CYII=";
/** The floor is darker under a body, and more so under each foot. */
function shadeOf(p: StoryPlayed, dark: number, z: number, view: StoryView): Ordered[] {
  const feet = p.meshes.filter(m => /^foot-[fb]/.test(m.id) && (m.opacity ?? 1) > 0.5).map(m => { let x0 = Infinity, x1 = -Infinity, low = -Infinity; for (let i = 0; i < m.positions.length; i += 2) { x0 = Math.min(x0, m.positions[i]); x1 = Math.max(x1, m.positions[i]); low = Math.max(low, m.positions[i + 1]); } return { x0, x1, low }; });
  if (!feet.length) return [];
  const blot = (x: number, y: number, w: number, h: number, opacity: number): Ordered => ({ z: z - 0.006, mesh: { ...quad(BLOT, x - w / 2, y - h / 2, w, h, (px, py) => view.put(px, py)), tint: [0.2, 0.16, 0.2], opacity, steady: true } });
  const x0 = Math.min(...feet.map(f => f.x0)), x1 = Math.max(...feet.map(f => f.x1)), low = Math.max(...feet.map(f => f.low)), H = p.figure.body.height * p.frame.root.scale, wide = Math.max(x1 - x0, 0.14 * H) + 0.16 * H;
  return [blot((x0 + x1) / 2 + 0.02 * H, low - 0.022 * H, wide, wide * 0.24, 0.55 * dark), ...feet.map(f => { const w = (f.x1 - f.x0) * 1.5; return blot((f.x0 + f.x1) / 2, f.low - 0.012 * H, w, Math.max(0.035 * H, w * 0.34), dark); })];
}
/** How far the flowing layers have come: the pace, summed up. */
function flowed(pace: StoryShot["pace"], t: number): number {
  if (pace === undefined || typeof pace === "number") return (pace ?? 1) * t;
  let sum = pace[0].pace * Math.min(t, pace[0].t);
  for (let i = 0; i < pace.length; i++) { const a = pace[i], b = pace[i + 1] ?? { t: Infinity, pace: a.pace }; if (t <= a.t) break; const long = Math.min(t, b.t) - a.t, end = b.t === Infinity ? a.pace : a.pace + ((b.pace - a.pace) * long) / (b.t - a.t); sum += (long * (a.pace + end)) / 2; }
  return sum;
}
/** A rectangle that shows only from one x of the picture to another. */
function cropped(positions: Float32Array, uvs: Float32Array, x0: number, x1: number): { positions: Float32Array; uvs: Float32Array } {
  const a = positions[0], b = positions[2], u0 = uvs[0], u1 = uvs[2], to = new Float32Array(positions), uv = new Float32Array(uvs);
  for (let i = 0; i < 8; i += 2) { const x = Math.min(x1, Math.max(x0, positions[i])); to[i] = x; uv[i] = u0 + ((u1 - u0) * (x - a)) / (b - a || 1); }
  return { positions: to, uvs: uv };
}
/** How far two hands on a round thing have turned it, degrees. */
function turnedBy(p: StoryPlayed, at: Pt, radius: number): number {
  const f = p.frame.bones.get("hand-f")?.world, b = p.frame.bones.get("hand-b")?.world; if (!f || !b) return 0;
  const off = Math.max(Math.hypot(f.e - at[0], f.f - at[1]), Math.hypot(b.e - at[0], b.f - at[1])), [l, r] = f.e < b.e ? [f, b] : [b, f];
  return (smooth((1.7 * radius - off) / (0.3 * radius)) * Math.atan2(r.f - l.f, r.e - l.e) * 180) / Math.PI;
}
/** The picture of one shot at a time of its own. */
export function storySheet(film: StorybookFilm, shot: StoryShot, t: number, still = false): { sheet: PaintSheet; played: readonly StoryPlayed[]; view: StoryView } {
  const view = storyView(film, shot, still ? 0 : t), set = film.sets[shot.set], out: Ordered[] = [], played = (shot.roles ?? []).map(r => playRole(film, shot, r, t, still));
  for (const l of set.layers) {
    const k = l.depth ?? 1, slid = (q: StorySetLayer | undefined) => { const keys = q && (shot.slides?.[q.id] ?? q.slide); return keys ? keyed(keys, t, v => [v.x, v.y ?? 0, v.swing ?? 0]) : [0, 0, 0]; };
    const own = slid(l), [lx, ly] = slid(l.with ? set.layers.find(q => q.id === l.with) : undefined), sx = own[0] + lx, sy = own[1] + ly, x = l.x + sx, y = l.y + sy, hung = swung(set, x + (l.hinge ?? 0) * l.width, own[2]), sway = l.sway && !still ? l.sway.degrees * (Math.sin((2 * Math.PI * t) / l.sway.period + (l.sway.phase ?? 0)) * 0.7 + Math.sin((2 * Math.PI * t) / (l.sway.period * 0.37) + 1.3) * 0.3) : 0;
    const m = quad(l.image.src, x, y, l.width, l.height, (px, py) => view.put(...hung(px, py), k), { mirror: l.mirror, angle: sway + (l.rolls ? (sx / l.rolls) * (180 / Math.PI) : 0) + (l.hands ? played.reduce((sum, p) => sum + turnedBy(p, [x + l.width / 2, y + l.height / 2], l.width / 2), 0) : 0), about: l.sway ? [x + l.sway.pivot[0] * l.width, y + l.sway.pivot[1] * l.height] : undefined });
    const mesh: PaintMesh = { ...m, opacity: l.opacity, tint: l.tint, blur: l.blur ? l.blur * (view.scale(k) / (view.rect.height / set.home.tall)) : undefined, steady: true }, z = l.z ?? (l.stands === undefined ? -100 : depthZ(set, l.stands));
    if (!l.flow) { out.push({ z, mesh }); continue; }
    const flow = l.flow, rate = flowed(shot.pace, t);
    if (flow.into) {
      // two of it, one size apart: the next one comes over the one that goes
      const { at: to, by, seconds } = flow.into, far = still ? 0 : rate / seconds, u = far - Math.floor(far), [cx, cy] = view.put(to[0], to[1], k);
      const sized = (size: number, opacity: number): Ordered => ({ z, mesh: { ...mesh, positions: mesh.positions.map((v, i) => (i % 2 ? cy + (v - cy) * size : cx + (v - cx) * size)), opacity: (mesh.opacity ?? 1) * opacity } });
      out.push(sized(by ** -u, 1), sized(by ** (1 - u), u)); continue;
    }
    // as many of it as the picture is wide
    const round = flow.round ?? l.width, unit = view.scale(k), zero = view.put(0, 0, k)[0], gone = still ? 0 : (flow.speed ?? 0) * rate, from = Math.max((view.rect.x - zero) / unit, flow.within?.[0] ?? -Infinity), to = Math.min((view.rect.x + view.rect.width - zero) / unit, flow.within?.[1] ?? Infinity), first = Math.floor((from - x - gone - l.width) / round) + 1, last = Math.ceil((to - x - gone) / round) - 1;
    for (let n = first; n <= last; n++) { const at = gone + n * round, by = at * unit, moved = mesh.positions.map((v, i) => (i % 2 ? v : v + by)); out.push({ z, mesh: { ...mesh, ...(flow.within ? cropped(moved, mesh.uvs, zero + flow.within[0] * unit, zero + flow.within[1] * unit) : { positions: moved }) } }); }
  }
  const dark = set.shade ?? (set.ground ? 0.34 : 0);
  for (const p of played) { const z = storyDepth(film, shot, p.role, t); if (dark > 0) out.push(...shadeOf(p, dark, z, view)); for (const m of p.meshes) {
    const positions = new Float32Array(m.positions.length); for (let i = 0; i < positions.length; i += 2) { const [X, Y] = view.put(m.positions[i], m.positions[i + 1]); positions[i] = X; positions[i + 1] = Y; }
    const id = m.id.split("/")[0], raised = storyRaised(p, id, t), least = Math.min(...p.meshes.filter(q => storyRaised(p, q.id.split("/")[0], t)).map(q => q.z)), bare = raised ? veilOf(p, id) : 1;
    const veil = !raised || bare >= 1 ? undefined : m.along ? m.along.map(s => 1 - (1 - bare) * smooth((s - 1.05) / 0.3)) : new Float32Array(m.positions.length / 2).fill(bare);
    out.push({ z: (raised?.z ?? z) + m.z * 0.01, mesh: { image: p.figure.art.images[m.image].src, positions, uvs: m.uvs, indices: m.indices, opacity: m.opacity, tint: m.tint, veil, fade: m.fade, behind: raised && { body: p.role.actor, near: m.z }, own: !raised && m.z > least ? { body: p.role.actor, near: m.z } : undefined } });
  } }
  for (const s of shot.props ?? []) {
    const p = propAt(film, shot, s, played, t); if (!p) continue;
    const w = p.view.width * (s.scale ?? 1), h = p.view.height * (s.scale ?? 1);
    // where it stands, its own outline lies flat and dark on the ground
    if (p.stands && p.stands.shadow > 0.01) { const [x, y] = p.stands.foot, lies = h * 0.2; out.push({ z: p.z - 0.005, mesh: { ...quad(p.view.image.src, x - w * 0.47, y - lies * 0.72, w * 1.06, lies, (px, py) => view.put(px, py), { room: [0.2, 0.6] }), tint: [0.16, 0.12, 0.12], opacity: p.stands.shadow, blur: w * 0.06 * view.scale(1), steady: true } }); }
    out.push({ z: p.z, mesh: { ...quad(p.view.image.src, p.at[0] - w / 2, p.at[1] - h / 2, w, h, (x, y) => view.put(x, y), { angle: p.angle }), behind: p.behind } });
  }
  if (!still) for (const d of shot.drifts ?? []) {
    const f = evaluateRig(driftSpec(d), t * film.fps), k = d.depth ?? 1;
    for (let i = 0; i < d.count; i++) {
      const b = f.bones.get(`d${i}`)!, m = b.world, img = d.sprites[i % d.sprites.length], w = d.size[0] + (d.size[1] - d.size[0]) * (((i * 0.618034) % 1 + 1) % 1), h = (w * img.height) / img.width;
      out.push({ z: d.z ?? 60, mesh: { ...quad(img.src, -w / 2, -h / 2, w, h, (x, y) => view.put(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, k)), opacity: b.opacity * (d.opacity ?? 1), blur: d.blur, steady: true } });
    }
  }
  let lit: SparkColor = [1, 1, 1];
  if (!still) for (const f of shot.bursts ?? []) {
    const b = f.burst, k = b.depth ?? 1, z = b.z ?? -98, size = f.size ?? 1, light = burstLight(b, t - f.at), [r, g, bl] = b.rings[0].colors[0];
    const dab = (image: string, at: Pt, w: number, h: number, angle: number, opacity: number, tint: SparkColor, blur?: number) => out.push({ z, mesh: { ...quad(image, at[0] - w / 2, at[1] - h / 2, w, h, (x, y) => view.put(x, y, k), { angle }), opacity, tint, blur, steady: true } });
    if (b.glow && light > 0.01) { const w = 2.3 * size * Math.max(...b.rings.map(q => q.radius)); dab(b.glow.src, f.place, w, w, 0, 0.5 * light, [r, g, bl]); }
    for (const s of sparksOf(b, t - f.at)) dab(b.spark.src, [f.place[0] + s.x * size, f.place[1] + s.y * size], s.length * size, s.width * size, s.angle, s.opacity, s.color);
    const on = (b.light ?? 0) * light; lit = [lit[0] * (1 + on * r), lit[1] * (1 + on * g), lit[2] * (1 + on * bl)];
  }
  const grade = shot.bursts?.length ? { ...shot.grade, tint: lit.map((v, i) => v * (shot.grade?.tint?.[i] ?? 1)) as unknown as SparkColor } : shot.grade;
  return { sheet: { layers: out.map((q, i) => ({ ...q, i })).sort((a, b) => a.z - b.z || a.i - b.i).map(q => q.mesh), grade, frame: shot.layout === "full" ? undefined : film.frame }, played, view };
}

export interface StoryCaption { line: StoryLine; tokens: readonly RubyToken[]; /** Token being said, −1 before the first. */ token: number; opacity: number; key: string }
export interface StoryShownWords { words: StoryWords; tokens: readonly RubyToken[]; opacity: number; /** How much of the translation shows, 0 to 1. */ glossOpacity: number; key: string }
export interface StoryFrame { paint: PaintFrame; shot: PlannedShot; caption: StoryCaption | null; words: readonly StoryShownWords[]; /** Who is on, for tools. */ played: readonly StoryPlayed[]; view: StoryView }
const fade = (t: number, from: number, to: number, a = 0.22, b = 0.22) => Math.min(1, Math.max(0, Math.min((t - from) / a, (to - t) / b)));
const tokensOf = new Map<string, RubyToken[]>();
const ruby = (text: string) => { let k = tokensOf.get(text); if (!k) tokensOf.set(text, (k = parseRuby(text))); return k; };

export interface StoryFrameOptions { /** Nothing idles, no camera moves, no outline boils. */ still?: boolean }
/** The film at a time. */
export function storybookFrame(plan: StoryPlan, time: number, o: StoryFrameOptions = {}): StoryFrame {
  const { film } = plan, at = storyShotAt(plan, time), before = plan.shots[at.index - 1], tr = at.shot.transition, u = tr && before ? (time - at.start) / Math.max(1e-6, tr.seconds) : 1, joined = !!tr && !!before && u < 1 && tr.kind !== "cut";
  const now = storySheet(film, at.shot, time - at.start, o.still), boil = film.boil ?? 6;
  const paint: PaintFrame = { drawing: o.still || !boil ? 0 : Math.floor(time * boil), ...(joined ? { sheet: storySheet(film, before.shot, time - before.start, o.still).sheet, next: now.sheet, transition: { kind: o.still ? "dissolve" : tr.kind, t: eased("ease-in-out-quad", u), from: tr.from, seed: at.index * 5 + 3 } } : { sheet: now.sheet }) };
  let caption: StoryCaption | null = null; const words: StoryShownWords[] = [];
  for (const s of plan.shots) {
    if (time < s.start - 0.01 || time > s.end + 0.01) continue;
    const t = time - s.start, over = plan.shots[s.index + 1]?.shot.transition?.seconds ?? 0, leave = s.shot.seconds - over * 0.75, enter = s.index ? (s.shot.transition?.seconds ?? 0) * 0.7 : 0;
    // under the picture there is room for one text: a caption goes when words come there, and words go when the next line starts
    const says = s.shot.says ?? [], strip = (s.shot.words ?? []).filter(w => w.place[1] > film.frame.y + film.frame.height), start = (w: StoryWords) => Math.max(w.at ?? 0, enter), stop = (w: StoryWords) => Math.min(start(w) + (w.for ?? s.shot.seconds), strip.includes(w) ? Math.min(Infinity, ...says.filter(q => q.at > start(w)).map(q => q.at - 0.12)) : Infinity);
    for (const say of says) {
      const line = film.lines[say.line], sp = storySpoken(line), next = says.filter(q => q.at > say.at).map(q => q.at)[0] ?? Infinity, long = storyLineSeconds(line), read = strip.map(start).filter(at => at >= say.at + long - 0.05), end = Math.min(say.at + long + 1.1, next - 0.05, leave, ...read);
      const a = fade(t, say.at - 0.12, end, 0.16, 0.18); if (a > 0) caption = { line, tokens: sp.tokens, token: spokenToken(line.track, t - say.at), opacity: a, key: `${s.shot.id}/${say.line}/${say.at}` };
    }
    (s.shot.words ?? []).forEach((w, i) => { const end = Math.min(stop(w), s.index === plan.shots.length - 1 ? Infinity : leave + 0.1), a = fade(t, start(w), end, 0.35, 0.28); if (a > 0) words.push({ words: w, tokens: ruby(w.text), opacity: a, glossOpacity: w.reveal === undefined ? 1 : fade(t, start(w) + w.reveal, end, 0.35, 0.28), key: `${s.shot.id}/w${i}` }); });
  }
  return { paint, shot: at, caption, words, played: now.played, view: now.view };
}

/** Every painting a film needs, by its address; `near` limits it to shots round a time. */
export function storyImages(plan: StoryPlan, near?: number, ahead = 1): Set<string> {
  const { film } = plan, out = new Set<string>(), at = near === undefined ? -1 : storyShotAt(plan, near).index;
  for (const s of plan.shots) {
    if (near !== undefined && (s.index < at - 1 || s.index > at + ahead)) continue;
    film.sets[s.shot.set]?.layers.forEach(l => out.add(l.image.src));
    if (s.shot.roles?.length) out.add(BLOT);
    for (const r of s.shot.roles ?? []) for (const f of figuresOf(film, r)) Object.values(f.art.images).forEach(i => out.add(i.src));
    for (const p of s.shot.props ?? []) { const q = film.props[p.prop]; out.add(q.image.src); Object.values(q.views ?? {}).forEach(v => out.add(v.image.src)); }
    for (const d of s.shot.drifts ?? []) d.sprites.forEach(i => out.add(i.src));
    for (const { burst: b } of s.shot.bursts ?? []) { out.add(b.spark.src); if (b.glow) out.add(b.glow.src); }
  }
  return out;
}

export interface StoryCue { kind: "voice" | "sound" | "bed"; src: string; /** Seconds from the film's start. */ at: number; /** dB. */ gain: number; from?: number; for?: number; lead?: number; fade?: Pt; pan?: number; id: string }
/** When a foot of someone who walks comes down, seconds into the shot: it was up, and it is on the ground again. */
export function footfalls(film: StorybookFilm, shot: StoryShot, role: StoryRole): number[] {
  const way = wayOf(film, shot, role), facing = figureOf(film, role, 0).body.facing ?? 45;
  if (way.runs.length && Math.abs(Math.sin((facing * Math.PI) / 180)) >= 0.8) return way.runs.flatMap(r => r.steps.list.map(q => { let lo = r.from, hi = r.to; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (r.along(m) < q.b) lo = m; else hi = m; } return hi; })).filter(t => t >= 0 && t < shot.seconds).sort((a, b) => a - b);
  const step = 1 / (film.fps * 2), times = Array.from({ length: Math.floor(shot.seconds / step) + 1 }, (_, i) => i * step), frames = times.map(t => poseRole(film, shot, role, t, true).acted.frame.bones);
  return ["foot-f", "foot-b"].flatMap(id => {
    const y = frames.map(b => b.get(id)?.world.f); if (y.some(v => v === undefined)) return [];
    const own = y as number[], ground = Math.max(...own), tall = ground - Math.min(...own), at: number[] = []; let up = false;
    if (tall > 1) own.forEach((v, i) => { const h = (ground - v) / tall; if (h > 0.5) up = true; else if (up && h < 0.2) { up = false; at.push(times[i]); } });
    return at;
  }).sort((a, b) => a - b);
}
/** What the sound track is made of, for a mixer. */
export function storyCues(plan: StoryPlan): StoryCue[] {
  const { film } = plan;
  return plan.shots.flatMap(s => [
    ...(s.shot.says ?? []).filter(q => film.lines[q.line].audio).map((q): StoryCue => ({ kind: "voice", id: q.line, src: film.lines[q.line].audio!, at: s.start + q.at, gain: 0 })),
    ...(s.shot.roles ?? []).flatMap((role, n) => (role.steps ? footfalls(film, s.shot, role).map((t, i): StoryCue => { const { takes, gain = 0 } = role.steps!, { gain: own = 0, ...take } = takes[(i + Math.floor(i / takes.length)) % takes.length]; return { ...take, kind: "sound", id: `${s.shot.id}-${role.actor}-${n}-step-${i}`, at: s.start + t, gain: gain + own - (i % 2 ? 1.5 : 0) }; }) : [])),
    ...(s.shot.sounds ?? []).map(({ bed, at, gain = 0, ...q }, i): StoryCue => ({ ...q, kind: bed ? "bed" : "sound", id: `${s.shot.id}-${i}`, at: s.start + at, gain, ...(bed ? { for: q.for ?? s.end - s.start - at } : {}) })),
  ]).sort((a, b) => a.at - b.at);
}

/** Captions of the film as text with times, for a transcript or a subtitle file. */
export function storyTranscript(plan: StoryPlan): { start: number; end: number; speaker: string; ja: string; en?: string }[] {
  return plan.shots.flatMap(s => (s.shot.says ?? []).map(q => { const l = plan.film.lines[q.line]; return { start: s.start + q.at, end: s.start + q.at + storyLineSeconds(l), speaker: plan.film.cast[l.speaker]?.name ?? l.speaker, ja: rubyPlain(parseRuby(l.ja)), en: l.en }; }));
}

/** What is wrong with a film, before anything is drawn. */
export function inspectStorybook(film: StorybookFilm): string[] {
  const wrong: string[] = [], library = libraryOf(film);
  for (const [id, a] of Object.entries(film.cast)) for (const [v, f] of Object.entries(a.figures)) inspectPainted(f.art, f.body.spec).forEach(w => wrong.push(`${id}/${v}: ${w}`));
  for (const [id, l] of Object.entries(film.lines)) {
    if (!film.cast[l.speaker]) wrong.push(`Line "${id}" is said by "${l.speaker}", who is not in the cast.`);
    inspectRuby(l.ja).forEach(w => wrong.push(`Line "${id}": ${w}`));
    let last = 0; for (const p of l.track.phones) { if (p.start < last - 1e-6 || p.end < p.start) wrong.push(`Line "${id}" has phones out of order at ${p.start.toFixed(2)} s.`); last = p.end; }
    if (last > l.track.seconds + 0.05) wrong.push(`Line "${id}" goes on after its recording ends.`);
  }
  const ids = new Set<string>();
  film.shots.forEach((s, n) => {
    const who = `Shot "${s.id}"`, over = (film.shots[n + 1]?.transition?.seconds ?? 0);
    if (ids.has(s.id)) wrong.push(`${who} is there twice.`); ids.add(s.id);
    if (!film.sets[s.set]) { wrong.push(`${who} is on the set "${s.set}", which does not exist.`); return; }
    if (!s.camera.length) wrong.push(`${who} has no camera.`);
    if (!(s.seconds > 0)) wrong.push(`${who} lasts no time.`);
    if (s.transition && !PAINT_TRANSITIONS.includes(s.transition.kind)) wrong.push(`${who} has the transition "${s.transition.kind}", which does not exist.`);
    if (s.transition && s.transition.seconds >= s.seconds) wrong.push(`${who} is all transition.`);
    for (const r of s.roles ?? []) {
      const a = film.cast[r.actor]; if (!a) { wrong.push(`${who} casts "${r.actor}", who is not in the cast.`); continue; }
      if (r.view && !a.figures[r.view]) { wrong.push(`${who} wants the view "${r.view}" of "${r.actor}", which is not painted.`); continue; }
      for (const k of r.views ?? []) if (!a.figures[k.view]) wrong.push(`${who} wants the view "${k.view}" of "${r.actor}", which is not painted.`);
      if (r.views?.some(k => !a.figures[k.view])) continue;
      const { art: { face }, body } = figureOf(film, r);
      if (r.look && !(face && paintedLooks(face).includes(r.look))) wrong.push(`${who}: "${r.actor}" has no look "${r.look}".`);
      for (const k of r.attend ?? []) if (typeof k.to === "string" && k.to !== "viewer" && k.to !== "ahead" && !s.roles?.some(q => q.actor === k.to)) try { storyPlace(film, s, k.to, k.t); } catch (e) { wrong.push((e as Error).message); }
      for (const q of r.acts ?? []) {
        if (!library[q.act]) wrong.push(`${who}: "${r.actor}" does not know the act "${q.act}".`);
        else if (q.act === "sit" && body.sits === false) wrong.push(`${who}: "${r.actor}" cannot sit in this painting.`);
        if (q.at > s.seconds) wrong.push(`${who}: "${q.act}" starts after the shot ends.`);
        for (const k of ["to", "from"]) if (q.params?.[k] !== undefined) try { storyPlace(film, s, q.params[k] as StoryPlace, q.at); } catch (e) { wrong.push((e as Error).message); }
      }
    }
    for (const p of s.props ?? []) {
      if (!film.props[p.prop]) { wrong.push(`${who} has the prop "${p.prop}", which does not exist.`); continue; }
      for (const h of p.holds) if ("by" in h) { const r = s.roles?.find(q => q.actor === h.by); if (!r) wrong.push(`${who}: "${p.prop}" is held by "${h.by}", who is not in the shot.`); else if (!figureOf(film, r).art.sockets?.[h.socket]) wrong.push(`${who}: "${h.by}" has no socket "${h.socket}".`); } else try { storyPlace(film, s, h.at, h.t); } catch (e) { wrong.push((e as Error).message); }
      p.holds.forEach((h, i) => { if (i && h.t < p.holds[i - 1].t) wrong.push(`${who}: the holds of "${p.prop}" are out of order.`); });
    }
    let free = 0;
    for (const q of [...(s.says ?? [])].sort((a, b) => a.at - b.at)) { const l = film.lines[q.line]; if (!l) { wrong.push(`${who} has the line "${q.line}", which does not exist.`); continue; } if (q.at < free - 0.02) wrong.push(`${who}: "${q.line}" starts before the line before it ends.`); free = q.at + storyLineSeconds(l); if (free > s.seconds - over * 0.5) wrong.push(`${who}: "${q.line}" is still being said when the next shot comes.`); }
  });
  return wrong;
}

export type { ActPoint, PaintedArt, PaintedImage };
