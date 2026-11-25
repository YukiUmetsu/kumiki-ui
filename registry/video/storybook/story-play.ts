/**
 * A screenplay → a film. A scene says where everyone is and what happens; the compiler finds the times, the pictures, the moves of
 * the camera, who looks at whom, and the small answers of those who listen. Nothing in a screenplay needs code.
 *
 *   scene: { stage, cast: { ana: "door" }, beats: [{ shot: { on: ["ana", "ben"], size: "knee" } }, { say: "hello", to: "ben" }] }
 *
 * A beat starts when the one before is over (`with` starts them together). A beat with `shot` starts a new picture; everyone is
 * where the last one left them. Each choice of the compiler can be overruled in the beat.
 */
import type { EasingSpec } from "../../motion/types";
import { floorOf } from "../../rig/rig-walk";
import { storyLineSeconds } from "./storybook-film";
import type { StoryAct, StoryAttend, StoryBurst, StoryCameraKey, StoryDrift, StoryFiredBurst, StoryHold, StoryLine, StoryPlace, StoryRole, StorySay, StorySet, StoryShot, StorySound, StoryStagedProp, StoryTransition, StoryWords, StorybookFilm } from "./storybook-film";

type Pt = readonly [number, number];

/** A place where someone can be on a stage. */
export interface PlaySpot {
  at: Pt; view?: string; facing?: 1 | -1; /** Default 1; a set with a ground has its own. */ scale?: number; z?: number; hidden?: readonly string[];
  /** Someone who sits: how much of the standing height is above the place, 0–1. */ low?: number; /** Is in each picture that shows the place (who sits in a car): the picture grows, and nobody is left out. */ stays?: true;
  /** Parts that come over something: hands on a wheel, arms over a counter. */ raise?: readonly { layers: readonly string[]; z: number }[];
  /** What the hands and the body do as long as no beat says otherwise. */ pose?: readonly PlayAct[]; /** Looks here when nobody speaks. */ toward?: StoryPlace | "viewer" | "ahead"; tint?: readonly [number, number, number]; /** What people wear here, other than at the rest of the stage (socks on the wooden floor of a hall). */ wear?: readonly string[];
}
/** A place with its spots and its pictures. It can be used by any screenplay. */
export interface StoryStage {
  set: string; /** What it is, for people who cannot see it. */ about: string; /** What people wear here, of what they have (socks on a tatami floor). */ wear?: readonly string[]; spots: Readonly<Record<string, PlaySpot>>;
  /** The same place from other sides, for a shot and a reverse shot: who is at a spot is at the spot of that name there, or is not in the picture. */ sides?: Readonly<Record<string, StorySide>>;
  frames?: Readonly<Record<string, { at: Pt; tall: number }>>; /** What the camera may see: left, top, right, bottom. Default: the first layer. */ bounds?: readonly [number, number, number, number];
  /** How soft the painting behind gets when the camera is close, centimetres. */ soft?: number; /** Sounds of single steps, by name. */ steps?: { takes: readonly string[]; gain?: number }; drifts?: readonly (string | StoryDrift)[]; /** Sounds under every picture. */ bed?: readonly PlaySound[];
  /** Always there: things that stand on the stage. */ props?: readonly StoryStagedProp[]; grade?: StoryShot["grade"];
}
export type StorySide = Pick<StoryStage, "wear" | "set" | "spots" | "frames" | "bounds" | "soft" | "steps" | "drifts" | "props" | "grade"> & { about?: string };

/** A sound of the library by name; what is said here comes over it. */
export type PlaySound = { sound: string; at?: number } & Partial<Omit<StorySound, "src" | "at">>;
export interface PlayAct { act: string; at?: number; for?: number; strength?: number; ease?: Pt; [param: string]: unknown }
export type PlayDo = PlayAct & { who: string };
export type PlaySize = "face" | "chest" | "waist" | "knee" | "full" | "wide";
export interface PlayFraming { /** Who is in it. */ on?: string | readonly string[]; size?: PlaySize; /** Or a frame of the stage, or a place. */ frame?: string | { at: Pt; tall: number }; /** Moves the picture, parts of its width and height. */ shift?: Pt }
export interface PlayShot extends PlayFraming {
  id?: string; /** What can be seen. */ about?: string; /** The side of the stage. Default: where the face of the first of `on` can be seen, or "home". */ from?: string; /** Where the camera goes. "in" and "out" are slow; a framing is gone to. Default "in" for a picture of people. */ move?: "in" | "out" | "hold" | "follow" | PlayFraming; /** When the move starts and ends, seconds; an end below 0 is before the end of the picture. */ over?: Pt;
  /** Someone seen from behind, close, at one side. */ past?: string; side?: "left" | "right"; join?: StoryTransition["kind"] | StoryTransition; layout?: StoryShot["layout"]; /** Who is not in it. */ without?: readonly string[]; ease?: EasingSpec; /** How fast what goes by behind a window goes. */ pace?: StoryShot["pace"]; /** Layers that move: a train that comes in, a door. */ slides?: StoryShot["slides"]; grade?: StoryShot["grade"];
}
/** Where a thing goes. `to` is a person and a socket ("ana:palm-f"), or a place. */
export interface PlayGive { prop: string; to: StoryPlace | `${string}:${string}`; at?: number; over?: number; view?: string; angle?: number; hidden?: boolean; z?: number; scale?: number; /** Where it is held, parts of its size. Default: of its drawing. */ grip?: Pt }
export interface PlayBeat {
  shot?: PlayShot; /** Id of a line. */ say?: string; to?: string; /** Look of the one who speaks. */ mood?: string; /** Looks of others when they have heard it. */ react?: Readonly<Record<string, string>>; /** Whether the one who is spoken to nods. Default true. */ nod?: boolean;
  do?: readonly PlayDo[]; /** People who walk: to a spot or a place. */ go?: Readonly<Record<string, string | Pt>>; /** Seconds of the walk. */ in?: number; give?: readonly PlayGive[]; /** From here on: who looks where. */ look?: Readonly<Record<string, StoryPlace | "viewer" | "ahead">>;
  /** From here on: what someone does all the time. */ pose?: Readonly<Record<string, readonly PlayAct[]>>; words?: readonly PlayWords[]; sounds?: readonly PlaySound[]; /** Least seconds. */ seconds?: number; /** Rest after it. */ after?: number; /** Starts with the beat before. */ with?: boolean;
  /** From here on: what someone wears, other than what people wear at this place. */ wear?: Readonly<Record<string, readonly string[]>>;
  /** People who come on or go off. */ enter?: Readonly<Record<string, string | PlaySpot>>; exit?: readonly string[]; drifts?: readonly (string | StoryDrift)[]; /** Fireworks by name: when they open, and where. */ bursts?: readonly { burst: string; at?: number; place: Pt; size?: number }[];
}
export interface PlayWords extends Omit<StoryWords, "place" | "size" | "at"> { at?: number; place?: Pt; size?: number }
export interface PlayScene {
  id: string; stage: string; join?: PlayShot["join"]; cast: Readonly<Record<string, string | PlaySpot>>; /** Things that are held or stand at the start. */ props?: readonly PlayGive[]; bed?: readonly PlaySound[]; beats: readonly PlayBeat[]; layout?: StoryShot["layout"];
  /** Look of everyone. */ look?: string; /** "auto" (default) cuts to whoever speaks when the picture does not show the face, or has been there long. */ cover?: "auto" | "none";
}
/** A plain stage with a spot for one person, and where things are shown on it (centimetres of its home picture). */
export interface TeachStage { stage: string; /** Someone who asks, and someone who answers. */ asker: string; other: string; /** Where things are shown: the middle, and the size of one. */ show: { at: Pt; width: number; height: number }; /** A thing under titles: a brush stroke. */ ribbon?: string }
/** Lines once more, words with their pictures, and things to name: scenes that are made from a list. */
export interface PlayPractice { lines: readonly string[]; title?: string; gloss?: string; /** Seconds for the viewer, times the length of the line. */ slack?: number }
export interface PlayRecap { words: readonly { text: string; gloss?: string; prop?: string; /** Another drawing of it. */ view?: string }[]; title?: string; gloss?: string; seconds?: number }
export interface PlayQuiz { ask: string; items: readonly { prop: string; view?: string; answer: string; word: string; gloss?: string }[]; /** Seconds to think. */ think?: number }
export type PlayLesson = { id: string; join?: PlayShot["join"] } & ({ practice: PlayPractice } | { recap: PlayRecap } | { quiz: PlayQuiz });
export interface StoryPlay { id: string; title: string; scenes: readonly (PlayScene | PlayLesson)[] }
/** What screenplays are made from. */
export interface PlayLibrary {
  /** Where lessons take place. */ teach?: TeachStage;
  cast: StorybookFilm["cast"]; sets: StorybookFilm["sets"]; stages: Readonly<Record<string, StoryStage>>; props: StorybookFilm["props"]; lines: StorybookFilm["lines"]; acts?: StorybookFilm["acts"];
  /** Sounds, drifts (petals, steam) and bursts (fireworks) by name. */ sounds?: Readonly<Record<string, Omit<StorySound, "at">>>; drifts?: Readonly<Record<string, StoryDrift>>; bursts?: Readonly<Record<string, StoryBurst>>;
  size: StorybookFilm["size"]; frame: StorybookFilm["frame"]; fps: number; paper?: string;
}

const GAP = 0.5, LEAD = 0.3, WALK = 92, STRIP = { place: [960, 962] as Pt, size: 70 }, TITLE = { place: [960, 948] as Pt, size: 84 };
const SHARE: Record<Exclude<PlaySize, "wide">, number> = { face: 0.27, chest: 0.4, waist: 0.58, knee: 0.8, full: 1.12 };
const ACTOR_KEYS = new Set(["who", "act", "at", "for", "strength", "ease"]);
const lastOf = <T>(list: readonly T[] | undefined): T | undefined => list?.[list.length - 1];
const smallHash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const act = ({ act: name, at = 0, for: long, strength, ease, ...rest }: PlayAct, from: number): StoryAct => {
  const params = Object.fromEntries(Object.entries(rest).filter(([k]) => !ACTOR_KEYS.has(k))); return { act: name, at: from + at, ...(long === undefined ? {} : { for: long }), ...(strength === undefined ? {} : { strength }), ...(ease ? { ease } : {}), ...(Object.keys(params).length ? { params } : {}) };
};

interface On { spot: PlaySpot; /** Of the spot. */ name?: string; at: Pt; view?: string; facing?: 1 | -1; pose: readonly PlayAct[]; /** A beat gave the pose. */ own?: boolean; look: StoryAttend["to"]; mood?: string }
interface RoleDraft { on: On; path: { t: number; x: number; y: number; ease?: EasingSpec }[]; views: { t: number; view: string; facing?: 1 | -1 }[]; attend: StoryAttend[]; acts: StoryAct[]; pose: { t: number; acts: readonly PlayAct[] }[] }
interface ShotDraft { spec: PlayShot; scene: PlayScene; roles: Map<string, RoleDraft>; says: StorySay[]; words: StoryWords[]; sounds: StorySound[]; drifts: StoryDrift[]; bursts: StoryFiredBurst[]; holds: Map<string, { holds: StoryHold[]; scale?: number }>; t: number; shown: readonly string[]; id: string; join?: StoryTransition }

const JOIN_SECONDS: Record<string, number> = { cut: 0, dissolve: 0.5, wash: 0.7, brush: 0.8, page: 1, shoji: 0.9, petals: 1, enso: 1 };
const joinOf = (j: PlayShot["join"]): StoryTransition | undefined => (!j || j === "cut" ? undefined : typeof j === "string" ? { kind: j, seconds: JOIN_SECONDS[j] ?? 0.7 } : j);
const boundsOf = (d: StorySide, set: StorySet): readonly [number, number, number, number] => { const l = set.layers[0]; return d.bounds ?? (l ? [l.x, l.y, l.x + l.width, l.y + l.height] : [-1e4, -1e4, 1e4, 1e4]); };

/** The film of a screenplay. */
export function composeStory(play: StoryPlay, lib: PlayLibrary): StorybookFilm {
  const shots: StoryShot[] = [], sets: Record<string, StorySet> = {}, usedLines: Record<string, StoryLine> = {}, usedCast = new Set<string>(), usedProps = new Set<string>(); const bedSeconds: { shot: number; bed: StorySound; from: number }[] = [];
  const line = (id: string): StoryLine => { const l = lib.lines[id]; if (!l) throw new Error(`Screenplay "${play.id}" says "${id}", which is not recorded.`); usedLines[id] = l; return l; };
  const figure = (who: string, view?: string) => { const a = lib.cast[who]; if (!a) throw new Error(`Screenplay "${play.id}" casts "${who}", who is not in the library.`); return a.figures[view ?? Object.keys(a.figures)[0]] ?? a.figures[Object.keys(a.figures)[0]]; };
  const soundOf = ({ sound, at = 0, ...rest }: PlaySound, from = 0): StorySound => { const s = lib.sounds?.[sound]; if (!s) throw new Error(`Screenplay "${play.id}" wants the sound "${sound}", which is not in the library.`); return { ...s, ...rest, at: from + at }; };
  const driftOf = (d: string | StoryDrift): StoryDrift => { const q = typeof d === "string" ? lib.drifts?.[d] : d; if (!q) throw new Error(`Screenplay "${play.id}" wants the drift "${String(d)}", which is not in the library.`); return q; };
  const setOf = (id: string): StorySet => { const s = lib.sets[id]; if (!s) throw new Error(`There is no set "${id}".`); return s; };

  for (const scene of play.scenes.map(s => ("stage" in s ? s : lessonScene(s, lib)))) {
    const home = lib.stages[scene.stage]; if (!home) throw new Error(`Scene "${scene.id}" is on the stage "${scene.stage}", which does not exist.`);
    const sides: Readonly<Record<string, StorySide>> = { home, ...home.sides }; let side = "home", stage: StorySide = home, set = setOf(home.set), floor = set.ground && floorOf(set.ground), bounds = boundsOf(home, set);
    const spotOf = (s: string | PlaySpot): PlaySpot => { if (typeof s !== "string") return s; const q = stage.spots[s]; if (!q) throw new Error(`Stage "${scene.stage}" has no spot "${s}" on its side "${side}".`); return q; };
    /** Who is in the place but has no spot on this side; everyone as a side left them. */ const away = new Map<string, On>(), left = new Map<string, Map<string, On>>();
    const worn = new Map<string, readonly string[]>(), onStage = new Map<string, On>(), hold = new Map<string, { hold: StoryHold; scale?: number; /** Of the stage, for what is at a place. */ side: string }>(), firstShot = shots.length; let draft: ShotDraft | null = null, lastSpeaker = "", count = 0, begin = 0, singles = 0;
    const standing = (s: string | PlaySpot): On => { const spot = spotOf(s); return { spot, ...(typeof s === "string" ? { name: s } : {}), at: spot.at, view: spot.view, facing: spot.facing, pose: spot.pose ?? [], look: spot.toward ?? "viewer" }; };
    const enter = (who: string, s: string | PlaySpot) => {
      usedCast.add(who); away.delete(who); if (typeof s !== "string" || stage.spots[s]) { onStage.set(who, standing(s)); return; }
      const q = Object.values(sides).find(d => d.spots[s])?.spots[s]; if (!q) throw new Error(`Stage "${scene.stage}" has no spot "${s}".`); onStage.delete(who); away.set(who, { spot: q, name: s, at: q.at, pose: q.pose ?? [], look: q.toward ?? "viewer" });
    };
    /** Where the face of someone can be seen: here, at home, or on another side. */
    const sideOfFace = (who: string): string | undefined => { const name = (onStage.get(who) ?? away.get(who))?.name, seen = (d: string) => { const q = name === undefined ? undefined : sides[d].spots[name]; return !!q && q.view !== "rear"; }; if (onStage.has(who) && onStage.get(who)!.view !== "rear") return side; return ["home", ...Object.keys(sides)].find(seen); };
    const turnTo = (to: string) => {
      if (to === side) return; const d = sides[to]; if (!d) throw new Error(`Stage "${scene.stage}" has no side "${to}".`);
      left.set(side, new Map(onStage)); side = to; stage = d; set = setOf(d.set); floor = set.ground && floorOf(set.ground); bounds = boundsOf(d, set);
      for (const [who, on] of [...onStage, ...away]) {
        const old = left.get(to)?.get(who), there = old && old.name === on.name ? old : on.name !== undefined && d.spots[on.name] ? standing(on.name) : undefined; onStage.delete(who); away.delete(who);
        if (there) onStage.set(who, { ...there, mood: on.mood, look: on.look, ...(on.own && !on.pose.some(a => a.to !== undefined) ? { pose: on.pose, own: true } : {}) }); else away.set(who, on);
      }
    };
    for (const [who, s] of Object.entries(scene.cast)) enter(who, s);
    const holdOf = (g: PlayGive, t: number): StoryHold => { usedProps.add(g.prop); const extra = { t, ...(g.over === undefined ? {} : { over: g.over }), ...(g.view ? { view: g.view } : {}), ...(g.angle === undefined ? {} : { angle: g.angle }), ...(g.hidden ? { hidden: true } : {}), ...(g.grip ? { grip: g.grip } : {}) }, m = typeof g.to === "string" && /^([^:]+):(.+)$/.exec(g.to); return m ? { ...extra, by: m[1], socket: m[2] } : { ...extra, at: g.to as StoryPlace, ...(g.z === undefined ? {} : { z: g.z }) }; };
    for (const g of scene.props ?? []) hold.set(g.prop, { hold: holdOf(g, 0), scale: g.scale, side });

    const sizeAt = (p: Pt, spot: PlaySpot) => (spot.scale ?? 1) * (floor ? floor.scale(p[1]) : 1);
    /** Head, feet and height of someone, in the picture. */
    const bodyAt = (who: string, p: Pt, on: On) => { const k = sizeAt(p, on.spot), H = figure(who, on.view).body.height * k, up = (on.spot.low ?? 1) * H; return { x: p[0], top: p[1] - up, H }; };
    const aspectOf = (layout: StoryShot["layout"]) => (layout === "full" ? lib.size.width / lib.size.height : lib.frame.width / lib.frame.height);
    /** Keeps the picture inside the painting. */
    const inside = (at: Pt, tall: number, aspect: number): { at: Pt; tall: number } => {
      const [x0, y0, x1, y1] = bounds, h = Math.min(tall, y1 - y0, (x1 - x0) / aspect), w = h * aspect; return { at: [Math.min(x1 - w / 2, Math.max(x0 + w / 2, at[0])), Math.min(y1 - h / 2, Math.max(y0 + h / 2, at[1]))], tall: h };
    };
    const frameOf = (f: PlayFraming, places: (who: string) => Pt, looks: (who: string) => number, layout: StoryShot["layout"]): { at: Pt; tall: number } => {
      const aspect = aspectOf(layout), moved = (q: { at: Pt; tall: number }) => inside([q.at[0] + (f.shift?.[0] ?? 0) * q.tall * aspect, q.at[1] + (f.shift?.[1] ?? 0) * q.tall], q.tall, aspect);
      if (typeof f.frame === "string") { const q = stage.frames?.[f.frame]; if (!q) throw new Error(`Stage "${scene.stage}" has no frame "${f.frame}".`); return moved(q); }
      if (f.frame) return moved(f.frame);
      const who = (typeof f.on === "string" ? [f.on] : f.on) ?? [...onStage.keys()]; if (!who.length || f.size === "wide") return moved(set.home);
      const boxes = who.map(w => { const on = onStage.get(w) ?? draft?.roles.get(w)?.on; if (!on) throw new Error(`Scene "${scene.id}" frames "${w}", who is not on.`); return bodyAt(w, places(w), on); }), share = SHARE[f.size ?? (who.length > 1 ? "knee" : "chest")], big = Math.max(...boxes.map(b => b.H));
      const top = Math.min(...boxes.map(b => b.top)), low = Math.max(...boxes.map(b => b.top + b.H * share)), left = Math.min(...boxes.map(b => b.x)), right = Math.max(...boxes.map(b => b.x)), room = big * (who.length > 1 ? 0.3 : 0.2);
      const tall = Math.max((low - top) / 0.9, (right - left + 2 * room) / aspect), lead = who.length === 1 ? 0.09 * looks(who[0]) : 0;
      return moved({ at: [(left + right) / 2 + lead * tall * aspect, top - 0.1 * tall + tall / 2], tall });
    };

    /** Where someone looks in the picture: −1 left, 1 right. */
    const sideOf = (who: string, to: StoryAttend["to"]): number => { const me = onStage.get(who); if (!me || to === "viewer" || to === "ahead") return 0; const p: readonly [number, number, number?] | undefined = typeof to === "string" ? onStage.get(to)?.at ?? set.marks?.[to] : to; return p ? Math.sign(Math.round((p[0] - me.at[0]) / 6)) : 0; };
    /** The others of a picture are in it with their heads, or not at all: the picture grows a little for someone, or leaves out who stands at its edge. */
    const settle = (f: { at: Pt; tall: number }, d: ShotDraft, places: (who: string) => Pt, aspect: number): { one: { at: Pt; tall: number }; off: Set<string> } => {
      const meant = (typeof d.spec.on === "string" ? [d.spec.on] : d.spec.on) ?? d.shown, off = new Set<string>(), most = 1.28 * f.tall; let one = f;
      const others = d.shown.filter(w => !meant.includes(w) && w !== d.spec.past).map(w => { const on = onStage.get(w) ?? d.roles.get(w)!.on; return { w, stays: on.spot.stays, ...bodyAt(w, places(w), on) }; }), xs = meant.map(w => places(w)[0]), between = (x: number) => x > Math.min(...xs) && x < Math.max(...xs);
      for (const o of others.sort((a, b) => Math.abs(a.x - f.at[0]) - Math.abs(b.x - f.at[0]))) {
        const half = (one.tall * aspect) / 2, far = Math.abs(o.x - one.at[0]), top = one.at[1] - one.tall / 2, low = one.at[1] + one.tall / 2;
        if (far > half + 0.16 * o.H) continue;
        if (far > half - 0.15 * o.H && o.stays) { const l = Math.min(one.at[0] - half, o.x - 0.2 * o.H), r = Math.max(one.at[0] + half, o.x + 0.2 * o.H), tall = (r - l) / aspect; one = inside([(l + r) / 2, low - tall / 2], tall, aspect); continue; }
        if (far > half - 0.15 * o.H || o.top + 0.2 * o.H > low) { off.add(o.w); continue; }
        if (o.top >= top + 0.02 * one.tall) continue;
        const tall = (low - o.top) / 0.94; if (tall <= most || between(o.x)) one = inside([one.at[0], low - tall / 2], tall, aspect); else off.add(o.w);
      }
      return { one, off };
    };
    /** From when to when those of the picture walk. */
    const walked = (d: ShotDraft): Pt | undefined => { const legs = [...d.roles].filter(([w]) => d.spec.on === undefined || d.spec.on === w || d.spec.on.includes(w)).flatMap(([, r]) => r.path.slice(1).map((k, i) => ({ from: r.path[i], to: k })).filter(l => l.from.x !== l.to.x || l.from.y !== l.to.y)); return legs.length ? [Math.min(...legs.map(l => l.from.t)), Math.max(...legs.map(l => l.to.t))] : undefined; };
    const close = () => {
      if (!draft) return; const d = draft, seconds = Math.round(Math.max(1.2, d.t) * lib.fps) / lib.fps, layout = d.spec.layout ?? scene.layout ?? "page";
      const startOf = (who: string): Pt => { const p = d.roles.get(who)?.path[0]; return p ? [p.x, p.y] : onStage.get(who)!.at; }, endOf = (who: string): Pt => { const p = lastOf(d.roles.get(who)?.path); return p ? [p.x, p.y] : onStage.get(who)!.at; };
      const looks = (who: string) => { const a = d.roles.get(who)?.attend; return a?.length ? sideOf(who, (a[1] ?? a[0]).to) : 0; };
      const people = !d.spec.frame && d.spec.size !== "wide", move = d.spec.move ?? (people ? "in" : "hold"), framed = frameOf(d.spec, move === "follow" ? startOf : w => { const a = startOf(w), b = endOf(w); return d.spec.on && Math.abs(a[0] - b[0]) < 1 ? a : move === "in" || move === "out" || move === "hold" ? (d.roles.get(w)!.path.length > 1 ? b : a) : a; }, looks, layout), aspect = aspectOf(layout);
      const { one, off } = people && typeof move === "string" && move !== "follow" ? settle(framed, d, endOf, aspect) : { one: framed, off: new Set<string>() }, seen = d.shown.filter(w => !off.has(w));
      const seenAt = (to: StoryAttend["to"]): StoryAttend["to"] => { const on = typeof to === "string" && !seen.includes(to) && onStage.get(to); if (!on) return to; const b = bodyAt(to as string, endOf(to as string), on); return [b.x, b.top + 0.07 * b.H]; };
      const grown = (k: number) => inside([one.at[0], one.at[1] - ((k - 1) * one.tall) * 0.1], one.tall * k, aspect), [t0, t1] = d.spec.over ?? (move === "follow" ? walked(d) : undefined) ?? [0, seconds], end = t1 <= 0 ? seconds + t1 : Math.min(t1, seconds), ease = d.spec.ease ?? "ease-in-out-quad"; 
      const from = move === "in" ? grown(1 + Math.min(0.07, 0.016 * seconds)) : one, to = move === "in" ? one : move === "out" ? grown(1 + Math.min(0.1, 0.02 * seconds)) : move === "follow" ? frameOf(d.spec, endOf, looks, layout) : move === "hold" ? one : frameOf({ ...d.spec, frame: undefined, ...move }, endOf, looks, layout);
      const camera: StoryCameraKey[] = [{ t: 0, ...from }]; if (t0 > 0) camera.push({ t: t0, ...from }); if (move !== "hold") camera.push({ t: end, ...to, ease: typeof move === "object" ? "ease-in-out-cubic" : ease });
      // close pictures have the painting behind them out of focus
      const soft = stage.soft && Math.min(...camera.map(k => k.tall)) < 0.62 * set.home.tall ? stage.soft : 0, setId = soft ? `${stage.set}~soft` : stage.set;
      sets[stage.set] = set; if (soft && !sets[setId]) sets[setId] = { ...set, layers: set.layers.map(l => ((l.z ?? -100) < 0 && l.stands === undefined ? { ...l, blur: (l.blur ?? 0) + soft } : l)) };
      const roles: StoryRole[] = [...d.roles].filter(([w]) => seen.includes(w)).map(([w, r]) => {
        const path = r.path, poses = r.pose.flatMap((p, i) => { const from = i ? p.t : -1.5, till = r.pose[i + 1]?.t ?? seconds + 1.5; return p.acts.map(a => act({ ease: [0.45, 0.45], ...a, for: till - from - (a.at ?? 0) + (r.pose[i + 1] ? 0.3 : 0) }, from)); });
        const role: StoryRole = { actor: w, ...(r.on.view ? { view: r.on.view } : {}), ...(r.on.facing ? { facing: r.on.facing } : {}), ...(r.on.spot.scale ? { scale: r.on.spot.scale } : {}), ...(r.on.spot.z !== undefined ? { z: r.on.spot.z } : {}), ...(r.on.spot.hidden ? { hidden: r.on.spot.hidden } : {}), ...(worn.get(w) ?? r.on.spot.wear ?? stage.wear ? { wear: worn.get(w) ?? r.on.spot.wear ?? stage.wear } : {}), ...(r.on.spot.raise ? { raise: r.on.spot.raise.map(q => ({ reach: true, ...q })) } : {}), ...(r.on.spot.tint ? { tint: r.on.spot.tint } : {}), path: path.length > 1 ? path : [path[0].x, path[0].y], ...(r.views.length ? { views: r.views } : {}), attend: r.attend.map(k => ({ ...k, to: seenAt(k.to) })), acts: [...poses, ...r.acts], ...(scene.look || r.on.mood ? { look: r.on.mood ?? scene.look } : {}), ...(path.length > 1 && stage.steps ? { steps: { ...stage.steps, takes: stage.steps.takes.map(s => soundOf({ sound: s })) } } : {}) };
        return d.spec.past === w ? overShoulder(role, w, to, aspect, d.spec.side ?? "left") : role;
      });
      const props: StoryStagedProp[] = [...(stage.props ?? []).map(p => { usedProps.add(p.prop); return p; }), ...[...d.holds].filter(([, q]) => q.holds.some(h => !h.hidden)).map(([prop, q]) => ({ prop, holds: q.holds.filter(h => !("by" in h) || seen.includes(h.by)), ...(q.scale ? { scale: q.scale } : {}) })).filter(p => p.holds.length)];
      shots.push({ id: d.id, label: d.spec.about ?? `${stage.about ?? home.about} ${d.shown.map(w => lib.cast[w].name).join(", ")}${d.says.length ? ` — ${d.says.map(s => lib.lines[s.line].en ?? lib.lines[s.line].ja).join(" ")}` : "."}`, set: setId, seconds, camera, roles, props, says: d.says, words: d.words, sounds: d.sounds, drifts: [...(stage.drifts ?? []).map(driftOf), ...d.drifts], ...(d.bursts.length ? { bursts: d.bursts } : {}), ...(d.join ? { transition: d.join } : {}), ...(layout === "page" ? {} : { layout }), ...(d.spec.pace === undefined ? {} : { pace: d.spec.pace }), ...(d.spec.slides ? { slides: d.spec.slides } : {}), ...(d.spec.grade ?? stage.grade ? { grade: d.spec.grade ?? stage.grade } : {}) });
      begin += seconds - (d.join?.seconds ?? 0) * (shots.length - 1 > firstShot ? 1 : 0);
      for (const [w, r] of d.roles) { const on = onStage.get(w); if (on) { on.look = lastOf(r.attend)!.to; const v = lastOf(r.views); if (v) { on.view = v.view; on.facing = v.facing; } on.pose = lastOf(r.pose)!.acts; on.own ||= r.pose.length > 1; } }
      for (const [prop, q] of d.holds) { const h = lastOf(q.holds)!; hold.set(prop, { hold: { ...h, t: 0, over: undefined }, scale: q.scale, side }); }
      draft = null;
    };
    /** Seen from behind, close to the camera, at one side of the picture. */
    const overShoulder = (role: StoryRole, who: string, f: { at: Pt; tall: number }, aspect: number, side: "left" | "right"): StoryRole => {
      const rear = lib.cast[who].figures.rear ? "rear" : undefined, H = figure(who, rear).body.height, k = (f.tall * 1.9) / H, x = f.at[0] + (side === "left" ? -0.36 : 0.36) * f.tall * aspect, y = f.at[1] - 0.24 * f.tall + H * k; return { ...role, ...(rear ? { view: rear } : {}), path: [x, y], scale: k / (floor ? floor.scale(y) : 1), z: 900, views: undefined, steps: undefined, attend: [{ t: 0, to: "ahead" }], acts: (role.acts ?? []).filter(a => a.act === "nod" || a.act === "listen") };
    };
    const open = (spec: PlayShot, extraLead = 0): ShotDraft => {
      close(); const join = joinOf(spec.join ?? (count === 0 ? scene.join ?? (shots.length ? "page" : undefined) : undefined)), before = lastOf(shots); if (join && before) shots[shots.length - 1] = { ...before, seconds: Math.round((before.seconds + 0.6 * join.seconds) * lib.fps) / lib.fps };
      const id = `${scene.id}-${spec.id ?? count}`; count++;
      const shown = [...onStage.keys()].filter(w => !spec.without?.includes(w));
      const roles = new Map<string, RoleDraft>(shown.map(w => { const on = onStage.get(w)!; return [w, { on: { ...on }, path: [{ t: 0, x: on.at[0], y: on.at[1] }], views: [], attend: [{ t: 0, to: typeof on.look === "string" && on.look !== "viewer" && on.look !== "ahead" && !shown.includes(on.look) && !set.marks?.[on.look] ? on.spot.toward ?? "viewer" : on.look }], acts: [], pose: [{ t: -1.5, acts: on.pose }] }]; }));
      const holds = new Map([...hold].filter(([, q]) => "by" in q.hold || q.side === side || (typeof q.hold.at === "string" && !!set.marks?.[q.hold.at])).map(([p, q]) => [p, { holds: [{ ...q.hold }], scale: q.scale }])); for (const p of holds.keys()) usedProps.add(p);
      draft = { spec, scene, roles, says: [], words: [], sounds: [], drifts: [], bursts: [], holds, t: (join?.seconds ?? 0) * 0.8 + extraLead, shown, id, join }; return draft;
    };
    const attend = (d: ShotDraft, who: string, t: number, to: StoryAttend["to"]) => { const r = d.roles.get(who); if (!r) return; if (typeof to === "string" && away.has(to)) to = r.on.spot.toward ?? "viewer"; const last = lastOf(r.attend)!; if (last.to === to) return; if (t <= last.t + 0.05) { last.to = to; return; } r.attend.push({ t: Math.max(0, t), to }); };
    /** Who hears a line: the one it is said to, or the last other who spoke, or the nearest. */
    const hearer = (speaker: string, to?: string): string => { if (to) return to; if (lastSpeaker && lastSpeaker !== speaker && (onStage.has(lastSpeaker) || away.has(lastSpeaker))) return lastSpeaker; const me = onStage.get(speaker)!; return [...onStage].filter(([w]) => w !== speaker).sort((a, b) => Math.abs(a[1].at[0] - me.at[0]) - Math.abs(b[1].at[0] - me.at[0]))[0]?.[0] ?? [...away.keys()][0] ?? "viewer"; };
    const walk = (d: ShotDraft, who: string, target: string | Pt, from: number, seconds?: number): number => {
      const r = d.roles.get(who), on = onStage.get(who); if (!r || !on) return 0; const spot = typeof target === "string" ? spotOf(target) : undefined, to = spot?.at ?? (target as Pt), a = on.at; let dx = to[0] - a[0], dz = 0, far = Math.hypot(dx, to[1] - a[1]);
      if (floor) { const p = floor.place(a[0], a[1]), q = floor.place(to[0], to[1]); dx = q[0] - p[0]; dz = q[1] - p[1]; far = Math.hypot(dx, dz); }
      const H = figure(who, on.view).body.height * (on.spot.scale ?? 1), long = seconds ?? Math.max(0.9, far / (WALK * Math.sqrt(H / 165)) + 0.35), has = lib.cast[who].figures, rest = spot?.view ?? on.spot.view, face = spot?.facing ?? on.spot.facing, across = Math.abs(dx) > Math.abs(dz) * 1.2 && has.side, now = on.view ?? Object.keys(has)[0], way = across ? "side" : dz < -20 && has.rear ? "rear" : dz > 20 && dz > 0.8 * Math.abs(dx) && has.front && now !== "front" ? "front" : undefined;
      if (way) { r.views.push({ t: from, view: way, ...(across ? { facing: dx > 0 ? 1 : -1 } : {}) }); const back = rest ?? Object.keys(has)[0]; if (!(spot && spot.view === way)) r.views.push({ t: from + long - 0.05, view: back, ...(face ? { facing: face } : {}) }); else on.view = way; }
      const last = lastOf(r.path)!; if (last.t < from) r.path.push({ t: from, x: a[0], y: a[1] }); r.path.push({ t: from + long, x: to[0], y: to[1], ease: "ease-in-out-quad" });
      const moved: On = { ...on, at: to, ...(spot ? { spot: { ...spot, scale: spot.scale ?? on.spot.scale, hidden: spot.hidden }, name: target as string } : {}) }; onStage.set(who, moved); r.on.spot = { ...moved.spot, z: r.on.spot.z ?? moved.spot.z }; attend(d, who, from, spot?.toward ?? "ahead"); return long;
    };

    let prior = { from: 0, till: 0 };
    scene.beats.forEach((beat, n) => {
      const speaker = beat.say ? line(beat.say).speaker : "";
      if (beat.shot) close();
      if (beat.exit) { for (const w of beat.exit) { onStage.delete(w); away.delete(w); } }
      for (const [w, s] of Object.entries(beat.enter ?? {})) enter(w, s);
      for (const [w, parts] of Object.entries(beat.wear ?? {})) worn.set(w, parts);
      let spec = beat.shot;
      if (!spec && beat.say && (scene.cover ?? "auto") === "auto" && draft) {
        const d: ShotDraft = draft, now = typeof d.spec.on === "string" ? [d.spec.on] : d.spec.on, seen = !now || now.includes(speaker), long = d.t > 7.5;
        if (!seen || long) { const at = sideOfFace(speaker) ?? side, there = (w: string) => { const name = (onStage.get(w) ?? away.get(w))?.name; return at === side ? onStage.has(w) : name !== undefined && !!sides[at].spots[name]; }, pair = [speaker, hearer(speaker, beat.to)].filter(there); spec = singles >= 2 || (long && now?.length === 1) ? { on: pair, size: "waist", from: at } : { on: speaker, size: "chest", from: at }; }
      }
      if (spec || !draft) { close(); const first = typeof spec?.on === "string" ? spec.on : spec?.on?.[0], framed = typeof spec?.frame === "string" ? spec.frame : undefined; turnTo(spec?.from ?? (first ? sideOfFace(first) : framed && Object.keys(sides).find(d => sides[d].frames?.[framed])) ?? "home"); open(spec ?? { size: "wide" }); singles = spec && typeof spec.on === "string" ? singles + 1 : 0; prior = { from: draft!.t, till: draft!.t }; }
      const opened = !!spec || draft!.t === 0 || n === 0, d = draft!, from = beat.with ? prior.from : n === 0 || spec ? d.t + (beat.say ? LEAD : 0) : d.t; let till = from + (beat.seconds ?? 0);
      for (const [w, to] of Object.entries(beat.look ?? {})) attend(d, w, from, to);
      for (const [w, to] of Object.entries(beat.go ?? {})) till = Math.max(till, from + walk(d, w, to, from, beat.in));
      for (const [w, acts] of Object.entries(beat.pose ?? {})) { const r = d.roles.get(w); if (r) { if (opened || from <= 0.05) r.pose = [{ t: -1.5, acts }]; else r.pose.push({ t: from, acts }); } const on = onStage.get(w); if (on) { on.pose = acts; on.own = true; } }
      if (beat.say) {
        const l = line(beat.say), long = storyLineSeconds(l), to = hearer(speaker, beat.to), end = from + long; d.says.push({ line: beat.say, at: from }); till = Math.max(till, end);
        attend(d, speaker, from - 0.18, beat.look?.[speaker] ?? to);
        [...d.roles.keys()].filter(w => w !== speaker && !beat.look?.[w]).forEach((w, i) => {
          const r = d.roles.get(w)!; if ((lastOf(r.path)!.t ?? 0) > from + 0.2) return;
          attend(d, w, from + 0.12 + 0.1 * (w === to ? 0 : i + 1) + (smallHash(w + beat.say) % 7) * 0.02, speaker);
          if (w === to && long > 1.1 && !(beat.do ?? []).some(q => q.who === w)) r.acts.push({ act: "listen", at: from + 0.25, for: long - 0.1, strength: 0.8 });
          const next = scene.beats[n + 1], answers = next?.say && lib.lines[next.say]?.speaker === w && !next.shot;
          if (w === to && beat.nod !== false && !answers && !(beat.do ?? []).some(q => q.who === w)) r.acts.push({ act: "nod", at: end - 0.2, for: 1.1, strength: 0.75 });
        });
        if (beat.mood) d.roles.get(speaker)?.acts.push({ act: "feel", at: from - 0.15, for: long + 0.8, params: { look: beat.mood } });
        for (const [w, look] of Object.entries(beat.react ?? {})) d.roles.get(w)?.acts.push({ act: "feel", at: end - 0.35, for: 2.2, params: { look } });
        lastSpeaker = speaker;
      } else for (const [w, look] of Object.entries(beat.react ?? {})) d.roles.get(w)?.acts.push({ act: "feel", at: from, for: Math.max(1.8, (beat.seconds ?? 0) + 0.6), params: { look } });
      for (const { who, ...a } of beat.do ?? []) { const r = d.roles.get(who); if (!r) throw new Error(`Scene "${scene.id}" wants "${who}" to ${a.act}, who is not on.`); r.acts.push(act(a, from)); if (beat.seconds === undefined && a.for !== undefined && !beat.say) till = Math.max(till, from + (a.at ?? 0) + a.for); }
      for (const g of beat.give ?? []) { const t = opened && g.at === undefined ? 0 : from + (g.at ?? 0), q = d.holds.get(g.prop), h = holdOf(g, t); if (!q) d.holds.set(g.prop, { holds: t <= 0.02 ? [{ ...h, t: 0 }] : [{ ...h, t: 0, over: undefined, hidden: true } as StoryHold, h], scale: g.scale }); else { if (t <= 0) q.holds.length = 0; q.holds.push(h); if (g.scale) q.scale = g.scale; } }
      for (const w of beat.words ?? []) if (!w.place && beat.say && (w.at ?? 0) < till - from) throw new Error(`Scene "${scene.id}" shows "${w.text}" where the caption of "${beat.say}" is. Give it another beat or another place.`); else d.words.push({ ...w, place: w.place ?? (w.tone === "title" ? TITLE : STRIP).place, size: w.size ?? (w.tone === "title" ? TITLE : STRIP).size, tone: w.tone ?? "vocab", at: from + (w.at ?? 0), for: w.for ?? Math.max(1.2, till - from - (w.at ?? 0)) });
      for (const s of beat.sounds ?? []) d.sounds.push(soundOf(s, from));
      d.drifts.push(...(beat.drifts ?? []).map(driftOf));
      for (const { burst, at, ...b } of beat.bursts ?? []) { const q = lib.bursts?.[burst]; if (!q) throw new Error(`Scene "${scene.id}" wants the burst "${burst}", which is not in the library.`); d.bursts.push({ ...b, burst: q, at: from + (at ?? 0) }); }
      if (!beat.do && !beat.say && !beat.go && !beat.seconds && !beat.shot) till = from;
      prior = { from, till }; d.t = Math.max(d.t, till + (beat.after ?? (beat.say ? GAP : beat.go ? 0.15 : 0.1)));
    });
    close();
    // beds lie under the whole scene
    const total = shots.slice(firstShot).reduce((s, q, i) => s + q.seconds - (i ? q.transition?.seconds ?? 0 : 0), 0);
    [...(home.bed ?? []), ...(scene.bed ?? [])].map(b => soundOf(b)).forEach(b => bedSeconds.push({ shot: firstShot, bed: { bed: true, fade: [0.8, 1.2], ...b, for: b.for ?? total - b.at + 0.4 }, from: begin }));
  }
  for (const b of bedSeconds) shots[b.shot] = { ...shots[b.shot], sounds: [...(shots[b.shot].sounds ?? []), b.bed] };
  return {
    id: play.id, title: play.title, size: lib.size, fps: lib.fps, ...(lib.paper ? { paper: lib.paper } : {}), frame: lib.frame, sets, shots, lines: usedLines, ...(lib.acts ? { acts: lib.acts } : {}),
    cast: Object.fromEntries([...usedCast].map(w => [w, lib.cast[w]])), props: Object.fromEntries([...usedProps].map(p => { const q = lib.props[p]; if (!q) throw new Error(`There is no prop "${p}".`); return [p, q]; })),
  };
}

/** Films one after another as one film. Each keeps its own places, things, lines and pictures. */
export function joinStories(id: string, title: string, films: readonly StorybookFilm[], join: StoryTransition = { kind: "page", seconds: 1 }): StorybookFilm {
  const one = films[0]; if (!one) throw new Error("An episode needs a film.");
  const keyed = <V>(f: StorybookFilm, o: Readonly<Record<string, V>>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`${f.id}/${k}`, v]));
  const shots = films.flatMap((f, n) => {
    const place = (p: unknown, s: StoryShot) => (typeof p === "string" && s.props?.some(q => q.prop === p) && !f.sets[s.set].marks?.[p] ? `${f.id}/${p}` : p) as StoryPlace;
    return f.shots.map((s, i): StoryShot => ({
      ...s, id: `${f.id}/${s.id}`, set: `${f.id}/${s.set}`, ...(i === 0 && n > 0 && !s.transition ? { transition: join } : {}), says: s.says?.map(q => ({ ...q, line: `${f.id}/${q.line}` })),
      props: s.props?.map(p => ({ ...p, prop: `${f.id}/${p.prop}`, holds: p.holds.map(h => ("at" in h ? { ...h, at: place(h.at, s) } : h)) })),
      roles: s.roles?.map(r => ({ ...r, attend: r.attend?.map(k => ({ ...k, to: s.roles?.some(q => q.actor === k.to) || k.to === "viewer" || k.to === "ahead" ? k.to : place(k.to, s) })), acts: r.acts?.map(a => (a.params && (typeof a.params.to === "string" || typeof a.params.from === "string") ? { ...a, params: { ...a.params, ...(a.params.to === undefined ? {} : { to: place(a.params.to, s) }), ...(a.params.from === undefined ? {} : { from: place(a.params.from, s) }) } } : a)) })),
    }));
  });
  return { ...one, id, title, shots, audio: undefined, cast: Object.assign({}, ...films.map(f => f.cast)), sets: Object.assign({}, ...films.map(f => keyed(f, f.sets))), props: Object.assign({}, ...films.map(f => keyed(f, f.props))), lines: Object.assign({}, ...films.map(f => keyed(f, f.lines))), acts: Object.assign({}, ...films.map(f => f.acts ?? {})) };
}

// ---- scenes that teach -----------------------------------------------------------------------------------------------------------

/** Where a page of the film is on a lesson's stage: stage units → centimetres. */
function pageOf(at: TeachStage, lib: PlayLibrary, layout: "page" | "full") {
  const { home } = lib.sets[lib.stages[at.stage].set], f = layout === "full" ? { x: 0, y: 0, ...lib.size } : lib.frame, unit = f.height / home.tall; return { home, unit, width: f.width / unit, cm: ([x, y]: Pt): Pt => [home.at[0] + (x - f.x - f.width / 2) / unit, home.at[1] + (y - f.y - f.height / 2) / unit] };
}
/** Words of a lesson with a brush stroke under them. */
function titled(at: TeachStage, lib: PlayLibrary, page: ReturnType<typeof pageOf>, words: PlayWords & { place: Pt; size: number }, wide: number): { give: PlayGive[]; words: PlayWords[] } {
  const ribbon = at.ribbon === undefined ? undefined : lib.props[at.ribbon]; if (!ribbon) return { give: [], words: [words] };
  const scale = wide / page.unit / ribbon.width, [x, y] = page.cm(words.place); return { give: [{ prop: at.ribbon!, to: [x, y + (ribbon.height * scale) / 2], scale, z: 2 }], words: [words] };
}

/** Lines once more, one after the other: someone says it to the viewer, then it stays on the page while the viewer says it. */
function practiceScene(id: string, o: PlayPractice, at: TeachStage, lib: PlayLibrary): PlayScene {
  const page = pageOf(at, lib, "page"), speakers = o.lines.map(l => lib.lines[l]?.speaker ?? ""), title = titled(at, lib, page, { text: o.title ?? "いっしょに {言|い}いましょう", gloss: o.gloss ?? "Say it together", tone: "title", place: [1298, 420], size: 60 }, 860), beats: PlayBeat[] = [];
  o.lines.forEach((id, n) => {
    const who = speakers[n], l = lib.lines[id]; if (!l) throw new Error(`There is no line "${id}" to practise.`);
    const long = storyLineSeconds(l), own = long * (o.slack ?? 1.25) + 0.9, H = Object.values(lib.cast[who].figures)[0].body.height, scale = (1.5 * page.home.tall) / H, spot: PlaySpot = { at: [page.home.at[0] - 0.2 * page.width, page.home.at[1] - 0.41 * page.home.tall + H * scale], scale, toward: "viewer" };
    beats.push({ ...(n && speakers[n - 1] !== who ? { exit: [speakers[n - 1]] } : {}), enter: { [who]: spot }, shot: { id: `practice-${id}`, frame: page.home, move: "hold", ...(n ? { join: "dissolve" } : {}) }, ...(title.give.length ? { give: title.give.map(g => ({ ...g, hidden: true })) } : {}), say: id, to: "viewer", look: { [who]: "viewer" }, mood: "happy", after: 0.2 });
    beats.push({ seconds: own, after: 0.3, give: title.give, do: [{ who, act: "listen", at: 0.2, for: long + 0.8 }, { who, act: "nod", at: own - 0.8, for: 1 }], words: [...title.words, { text: l.ja, gloss: l.en }] });
  });
  return { id, stage: at.stage, cast: {}, cover: "none", beats };
}

/** Words of a story with their pictures, side by side. */
function recapScene(id: string, o: PlayRecap, at: TeachStage, lib: PlayLibrary): PlayScene {
  const page = pageOf(at, lib, "full"), n = o.words.length, step = (lib.size.width * 0.86) / n, x = (i: number) => lib.size.width / 2 + (i - (n - 1) / 2) * step, wide = Math.min(at.show.width, (step / page.unit) * 0.86), low = 712;
  const props = o.words.flatMap((w, i): PlayGive[] => { const p = w.prop && lib.props[w.prop]; if (!p) return []; const v = (w.view && p.views?.[w.view]) || p, even = (0.74 * Math.sqrt(wide * at.show.height)) / Math.sqrt(v.width * v.height); return [{ prop: w.prop!, ...(w.view ? { view: w.view } : {}), to: page.cm([x(i), low]), scale: Math.min(even, wide / v.width, at.show.height / v.height), z: 5 }]; });
  const title = titled(at, lib, page, { text: o.title ?? "{今日|きょう}の ことば", gloss: o.gloss ?? "Today’s words", tone: "title", place: [960, 190], size: 72 }, 760);
  return { id, stage: at.stage, layout: "full", cast: {}, props: [...title.give, ...props], cover: "none", beats: [{ shot: { id: "words", size: "wide", move: "hold", about: "The words of the story, with their readings." }, seconds: o.seconds ?? 2.2 + 0.9 * n, sounds: lib.sounds?.["page-turns"] ? [{ sound: "page-turns", at: 0.34 }] : [], words: [...title.words, ...o.words.map((w, i): PlayWords => ({ text: w.text, gloss: w.gloss, place: [x(i), low + 112], size: 64, at: 0.5 + 0.4 * i }))] }] };
}

/** Things to name: someone asks, the viewer has a moment, someone answers. */
function quizScene(id: string, o: PlayQuiz, at: TeachStage, lib: PlayLibrary): PlayScene {
  const who = lib.lines[o.ask]?.speaker; if (!who) throw new Error(`There is no line "${o.ask}" to ask with.`);
  const page = pageOf(at, lib, "page"), place: Pt = [at.show.at[0], at.show.at[1] + at.show.height / 2], word = (text: string, gloss?: string) => titled(at, lib, page, { text, gloss, place: [960, 190], size: 84, tone: "title" }, 620), think = o.think ?? 2.4, beats: PlayBeat[] = []; let before = "";
  // people from the knee up, as tall to each other as they are
  const large = 1.12 * page.home.tall / Object.values(lib.cast[who].figures)[0].body.height, near = (spot: string): PlaySpot => { const s = lib.stages[at.stage].spots[spot]; return { ...s, at: [s.at[0], page.home.at[1] + 0.8 * page.home.tall], scale: large }; };
  o.items.forEach((q, n) => {
    const by = lib.lines[q.answer]?.speaker ?? ""; const p = lib.props[q.prop]; if (!p) throw new Error(`There is no prop "${q.prop}" to ask about.`); const v = (q.view && p.views?.[q.view]) || p, last = o.items[n - 1], ask = word("？"), answer = word(q.word, q.gloss);
    beats.push({ ...(before && before !== by ? { exit: [before] } : {}), enter: before === by ? {} : { [by]: near(at.other) }, shot: { id: `quiz-${n}`, size: "wide", move: "hold", ...(n ? { join: "wash" } : {}) }, give: [...ask.give.map(g => ({ ...g, hidden: true })), ...(last ? [{ prop: last.prop, to: place, hidden: true }] : []), { prop: q.prop, ...(q.view ? { view: q.view } : {}), to: place, scale: Math.min(at.show.width / v.width, at.show.height / v.height), z: 5 }], say: o.ask, to: "viewer", look: { [who]: "viewer", [by]: "viewer" }, after: 0.1 });
    beats.push({ seconds: think, after: 0, give: ask.give, do: [{ who: by, act: "think", at: 0.1, for: think - 0.2 }], words: ask.words });
    beats.push({ say: q.answer, to: "viewer", look: { [by]: "viewer", [who]: by }, mood: "happy", react: { [who]: "happy" }, words: answer.words, after: 0.9 });
    before = by;
  });
  return { id, stage: at.stage, cast: { [who]: near(at.asker) }, cover: "none", beats };
}
function lessonScene(s: PlayLesson, lib: PlayLibrary): PlayScene {
  const at = lib.teach; if (!at) throw new Error(`"${s.id}" is a lesson, and the library has no place for lessons.`);
  return { ...("practice" in s ? practiceScene(s.id, s.practice, at, lib) : "recap" in s ? recapScene(s.id, s.recap, at, lib) : quizScene(s.id, s.quiz, at, lib)), join: s.join ?? "page" };
}
