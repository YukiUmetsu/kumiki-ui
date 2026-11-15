/**
 * UKIYO1 sound: effects tied to what the picture does, placed where it happens.
 *
 * A shot lists its sounds as recorded catalog sounds and the moments they belong to: a shot frame, or what a figure or
 * creature does (`{ node, on: "step" }` for every foot it sets down, `"strike"` for each blow of an axe, `"release"` for
 * an arrow loosed, `"contact"` for a blade or club meeting its mark, `"fall"`, `"drop"`, `"land"`, or the `start` /
 * `end` of an action). The frames come from the same rig that draws the figure, on the drawings that show them, so a
 * re-timed walk keeps its steps under its feet.
 *
 * Each sound is placed where its source stands on screen: its x pans it (never hard to one side), and its height on
 * screen sets how far away it is (a figure half the frame tall is about 2 m from the camera, one a tenth of it about
 * 7 m), so far figures are quieter, duller and wetter. A source off screen or hidden is not heard.
 *
 * `ukiyoeShotCues()` turns a shot's sounds into FD1 sound cues; `ukiyoeEpisode()` calls it for every shot.
 */
import type { FilmSoundCue } from "../film-document";
import type { SoundRoomId } from "../sound-design";
import { soundVariant } from "../sound-design";
import { cameraAt, hash01, seedOf, stepped } from "./ukiyoe-core";
import { creatureTravel } from "./ukiyoe-creatures";
import { figureHeight, figureMoments, travelAt } from "./ukiyoe-figure";
import type { UkiyoeActionType, UkiyoeFigureMoment } from "./ukiyoe-figure";
import { nodeState } from "./ukiyoe-react";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

/** A moment a node makes: a figure's steps, strikes, releases, contacts, falls, drops and landings, or any action's start and end. */
export interface UkiyoeSoundMoment {
  node: string;
  on: UkiyoeFigureMoment;
  /** Only this kind of action (a creature's `howl`, a figure's `bow`). */
  type?: string;
  /** Shot frames to keep, `from` inclusive, `to` exclusive. */
  from?: number;
  to?: number;
  /** Keep every n-th moment (a crowd's steps, thinned). @default 1 */
  every?: number;
}
export interface UkiyoeShotSound {
  /** Catalog sound IDs. With several, the moments take them in turn, each pass in its own order, never the same take twice running. */
  sound: string | readonly string[];
  /** Shot frames (mist included, so frame 0 is the shot's first frame), or the moments a node makes. */
  at: number | readonly number[] | UkiyoeSoundMoment;
  /** Frames after each moment (negative leads it). @default 0 */
  offset?: number;
  gainDb?: number;
  /** Each take's level varies by up to this many dB either way, as no two footsteps are alike. @default 1.5 for steps, else 0 */
  vary?: number;
  /** The space around the sound. @default "outdoors" */
  room?: SoundRoomId;
  /** The node the sound comes from; defaults to the moment's node. Its place on screen pans the sound and sets its distance. */
  source?: string;
  /** A fixed pan (−1 left to 1 right), instead of the source's place. */
  pan?: number;
  /** A fixed distance in metres, instead of the source's size on screen. */
  distance?: number;
  /** What meets the moment: the sound's start (a foot, a blow, a knock) or its peak (a swish's apex, a bell). @default "start" for
   * steps, strikes, contacts, landings, falls and drops; "peak" otherwise */
  align?: "peak" | "start";
}
const STARTS: ReadonlySet<UkiyoeFigureMoment> = new Set(["step", "strike", "contact", "land", "fall", "drop"]);

/** Pan stays inside ±0.7: a print is a window, not a surround field. */
const PAN_MAX = .7;
/** A figure this share of the frame tall is 2 m away; smaller is farther, on a gentler law than size alone. */
const NEAR_SHARE = .5, NEAR_METRES = 2;
/** A creature's height on screen against its scale, as a share of an average figure. */
const CREATURE_SHARE = .55;

const quantise = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(3));
/** Distances on a ladder, so the baked takes are shared between cues. */
const LADDER = [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64];
const onLadder = (d: number) => LADDER.reduce((best, v) => Math.abs(Math.log(v / d)) < Math.abs(Math.log(best / d)) ? v : best, LADDER[0]);

/** Where a node stands on screen at a frame (its feet or origin), and how tall it is there; undefined when hidden. */
export function ukiyoeNodeOnScreen(scene: UkiyoeSceneSpec, id: string, frame: number): { x: number; y: number; tall?: number } | undefined {
  const byId = new Map(scene.nodes.map(n => [n.id, n])), node = byId.get(id);
  if (!node) return undefined;
  const cad = scene.cadence ?? 2;
  let x = 0, y = 0, n: UkiyoeNode | undefined = node, top = node, tall: number | undefined;
  while (n) {
    const st = nodeState(n, frame, cad);
    if (!st.visible) return undefined;
    let ex = 0, ey = 0;
    const f = stepped(frame, n.cadence ?? cad);
    if (n.kind === "figure") { const tr = travelAt(n.actions ?? [], f); ex = tr.x; ey = tr.y; }
    if (n.kind === "creature") { const tr = creatureTravel(n.actions ?? [], f); ex = tr.x; ey = tr.y; }
    const ps = st.pose.scale * st.pose.scaleY, flip = n.flip ? -1 : 1;
    if (n === node) tall = n.kind === "figure" ? figureHeight(n.look) * ps : n.kind === "creature" ? 250 * CREATURE_SHARE * ps : undefined;
    else { x *= ps * flip; y *= ps; if (tall !== undefined) tall *= ps; }
    x += st.pose.x + ex; y += st.pose.y + ey;
    top = n;
    n = n.parent ? byId.get(n.parent) : undefined;
  }
  const W = scene.width, H = scene.height, cam = cameraAt(scene.camera, frame, W, H, scene.seed), d = top.depth ?? 1;
  if (d === 0) return { x, y, tall };
  const z = 1 + (cam.zoom - 1) * d, fx = W / 2 + (cam.x - W / 2) * d, fy = H / 2 + (cam.y - H / 2) * d;
  return { x: W / 2 + z * (x - fx), y: H / 2 + z * (y - fy), tall: tall === undefined ? undefined : tall * z };
}

/** The shot frames of a sound's moments. */
export function ukiyoeSoundFrames(scene: UkiyoeSceneSpec, at: UkiyoeShotSound["at"]): number[] {
  if (typeof at === "number") return [at];
  if (Array.isArray(at)) return [...at as readonly number[]];
  const m = at as UkiyoeSoundMoment, node = scene.nodes.find(n => n.id === m.node), cadence = node?.cadence ?? scene.cadence ?? 2;
  let frames: number[] = [];
  if (node?.kind === "figure") frames = figureMoments({ look: node.look, actions: node.actions, facing: node.facing }, m.on, { type: m.type as UkiyoeActionType | undefined, cadence });
  else if (node?.kind === "creature" && (m.on === "start" || m.on === "end"))
    frames = (node.actions ?? []).filter(a => !m.type || a.type === m.type).map(a => Math.ceil((m.on === "start" ? a.start : a.end) / cadence - 1e-9) * cadence);
  frames = frames.filter(f => f >= (m.from ?? 0) && f < (m.to ?? Infinity) && f < scene.durationFrames);
  const every = Math.max(1, Math.round(m.every ?? 1));
  return frames.filter((_, i) => i % every === 0);
}

/**
 * A shot's sounds as FD1 cues on the shot's scene (`<shotId>/start`, which begins after the mist; a moment inside the mist
 * leads it). Pan and distance follow each source on screen at its frame.
 */
export function ukiyoeShotCues(shotId: string, scene: UkiyoeSceneSpec, sounds: readonly UkiyoeShotSound[], mist = 0): FilmSoundCue[] {
  const W = scene.width, H = scene.height, out: FilmSoundCue[] = [];
  sounds.forEach((snd, k) => {
    const pool = typeof snd.sound === "string" ? [snd.sound] : snd.sound, moment = typeof snd.at === "object" && !Array.isArray(snd.at) ? snd.at as UkiyoeSoundMoment : undefined;
    const source = snd.source ?? moment?.node, vary = snd.vary ?? (moment?.on === "step" ? 1.5 : 0), seed = seedOf(`${shotId}/${k}`);
    // Takes are counted over the sounds actually heard, so a skipped moment never puts one take twice in a row.
    let heard = 0;
    ukiyoeSoundFrames(scene, snd.at).forEach((f, i) => {
      const frame = f + (snd.offset ?? 0);
      let pan = snd.pan, distance = snd.distance;
      if (source && (pan === undefined || distance === undefined)) {
        const at = ukiyoeNodeOnScreen(scene, source, Math.max(0, Math.min(scene.durationFrames - 1, f)));
        // Hidden, or more than a quarter of the frame beyond its edge: not heard.
        if (!at || at.x < -W * .25 || at.x > W * 1.25) return;
        pan ??= quantise(Math.max(-1, Math.min(1, at.x / W * 2 - 1)) * PAN_MAX, .05);
        if (distance === undefined && at.tall) distance = onLadder(Math.max(1.5, NEAR_METRES * (NEAR_SHARE * H / Math.max(1, at.tall)) ** .75));
      }
      const n = heard++, gain = (snd.gainDb ?? 0) + (vary ? quantise((hash01(seed, n, 71) * 2 - 1) * vary, .5) : 0);
      out.push({
        id: `${shotId}-${k + 1}-${i + 1}`, sound: "catalog:" + soundVariant(pool, seed, n), at: `${shotId}/start`, offsetFrames: frame - mist,
        ...gain ? { gainDb: gain } : {}, room: snd.room ?? "outdoors", ...(snd.align ?? (moment && STARTS.has(moment.on) ? "start" : "peak")) === "start" ? { align: "start" as const } : {}, ...pan !== undefined ? { pan: pan || 0 } : {}, ...distance !== undefined ? { distance } : {},
      });
    });
  });
  return out;
}
