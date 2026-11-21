/** Beat hits: short impulses that land on a beat, a moment or a loud onset of the music, as short-form editors cut to a track.
 *
 * - **Punch.** The picture snaps larger on the hit and eases back: the "zoom on the beat" (about 100 % to 110 %).
 * - **Shake.** A short camera shake that dies in four or five swings, each one smaller, in a direction that changes per hit.
 * - **Split.** The red and blue channels jump apart and close again: an RGB split.
 * - **Blur.** A zoom blur from the punch centre: the picture smeared outwards, as if the camera lunged.
 * - **Flash.** A brief lift of light, limited to three a second (WCAG 2.3.1).
 *
 * Kinds combine (a punch with a blur and a split is the usual "impact"). Practice: editors scale the frame from 100 % to about
 * 110 % on a beat and let it settle ([Adobe community](https://community.adobe.com/t5/premiere-pro-discussions/how-to-zoom-in-on-beat-in-a-music-video/m-p/8792160));
 * a shake is four or five keyframes of falling size in position and rotation ([FreeVisuals](https://www.freevisuals.net/item/dynamic-shake-2));
 * a beat shake is 2 to 10 px over about 150 ms ([a beat-effect reference](https://fbratten.github.io/music-video-creator-showcase/demos/beat-effects)).
 * Velocity edits put a shake, a glow or a flash on every hit ([CapCut](https://www.capcut.com/resource/how-to-do-velocity-on-capcut)).
 *
 * Hits come from one of three sources: frames or moments of the scene's content (`at`); the beats of a bed that declares its tempo
 * (`beats`, from the bed's `bpm` and `beatOffset`); or the loud onsets of a bed, measured ahead of time by `npm run sound:levels`
 * (`onsets`). Every value is a pure function of the frame, so a film renders the same in any frame order.
 */
import { bedLevels, follow, riseFrames } from "./film-drive";
import type { SoundLevels } from "./film-drive";
import { MAX_FLASHES_PER_SECOND } from "./film-flash";

export const HIT_KINDS = ["punch", "shake", "split", "blur", "flash"] as const;
export type HitKind = typeof HIT_KINDS[number];

export interface FilmHitsSpec {
  /** What each hit does: one kind, or several at once. @default "punch" */
  kind?: HitKind | readonly HitKind[];
  /** Hits on content frames of the scene, or on its moments by name. */
  at?: ReadonlyArray<number | string>;
  /** Hits on the beats of a bed that declares `bpm`. `every`: every nth beat (1, 2, 4 or 8). `phase`: which beat of each group, so
   * `every: 2, phase: 1` is the backbeat. `from` and `to`: scene frames, to keep hits to part of the scene. */
  beats?: { bed: string; every?: number; phase?: number; from?: number; to?: number };
  /** Hits on a bed's loud onsets, measured by `npm run sound:levels`. `rise`: how far (0 to 1) the level must climb. @default 0.3 */
  onsets?: { bed: string; rise?: number; from?: number; to?: number };
  /** Strength from 0.1 to 1. At 0.5: a punch to 108 %, a 1 % shake, a 2 % split, a 6 % zoom blur, a flash at 25 %. @default 0.5 */
  amount?: number;
  /** Frames a hit takes to settle. @default 0.2 s */
  frames?: number;
  /** Frames the picture lands before the beat; a viewer accepts picture slightly early more readily than late. @default 0 */
  lead?: number;
  /** Direction of the shake and the split, in degrees (0 is to the right). @default a new direction for each hit */
  direction?: number;
  /** Centre of the punch and the zoom blur, as fractions of the frame. @default the middle */
  centre?: { x: number; y: number };
  /** A sound on every hit: a kit sound name, or `catalog:<id>`. Needs `audio.accents.kit`. Its start meets the hit. */
  sound?: string;
  gainDb?: number;
}
/** Compiled hits: the kinds, and the scene frames (output, after any time map) where each hit peaks. */
export interface FilmHits {
  kinds: readonly HitKind[];
  frames: readonly number[];
  amount: number;
  settle: number;
  direction?: number;
  centre: { x: number; y: number };
  sound?: string;
  gainDb?: number;
}
/** A hit as the stage draws it, at one frame. Offsets and split are fractions of the frame height; `blur` is the zoom of the smear. */
export interface HitState { scale: number; x: number; y: number; rotate: number; splitX: number; splitY: number; blur: number; flash: number }
export interface HitProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** How far each kind goes at amount 1. */
export const HIT_RANGE = { punch: .16, shake: .02, rotate: 1.2, split: .04, blur: .12, flash: .5 } as const;
export const HIT_REST: HitState = { scale: 1, x: 0, y: 0, rotate: 0, splitX: 0, splitY: 0, blur: 0, flash: 0 };
/** More hits than this in one second read as jitter, not as beats. */
export const MAX_HITS_PER_SECOND = 4;

/** A bed's beats in film frames, from its declared tempo: the first at `beatOffset` seconds into the bed, then one every 60 / bpm s,
 * while the bed plays. A reversed bed has no beat grid. */
export function bedBeats(bed: { bpm?: number; beatOffset?: number; startFrame?: number; durationFrames?: number; reverse?: boolean }, fps: number, filmFrames: number): number[] {
  if (!bed.bpm || bed.reverse) return [];
  const start = bed.startFrame ?? 0, end = start + (bed.durationFrames ?? filmFrames - start), step = 60 / bed.bpm, beats: number[] = [];
  for (let n = 0; ; n++) {
    const frame = Math.round(start + ((bed.beatOffset ?? 0) + n * step) * fps);
    if (frame >= end) break;
    beats.push(frame);
  }
  return beats;
}

/** A small deterministic hash of a hit's index, for its direction. */
const hash = (n: number) => { let h = Math.imul(n + 0x9e37, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

/**
 * Compiles a scene's hits. `moment` finds the scene frame of one of its moments (already placed by any time map), and `output` maps a
 * content frame to a scene frame through the scene's time map (the identity without one). `filmStart` is the scene's first film frame. `beds` are the film's beds by ID, `levels`
 * what `sound:levels` measured (needed for onsets). `textHeavy` marks a scene whose words must stay readable.
 */
export function compileHits(spec: FilmHitsSpec, ctx: {
  path: string; durationFrames: number; contentFrames: number; fps: number; filmStart: number; filmFrames: number;
  moment: (id: string) => number | undefined; output: (content: number) => number;
  beds: ReadonlyMap<string, { sound: string; bpm?: number; beatOffset?: number; startFrame?: number; durationFrames?: number; reverse?: boolean }>;
  levels?: SoundLevels; textHeavy?: boolean; silent?: (frame: number) => boolean;
}): { hits?: FilmHits; problems: HitProblem[] } {
  const problems: HitProblem[] = [], say = (severity: HitProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: ctx.path + at, message, hint });
  const kinds = [...new Set(spec.kind === undefined ? ["punch" as const] : typeof spec.kind === "string" ? [spec.kind] : spec.kind)];
  for (const kind of kinds) if (!(HIT_KINDS as readonly string[]).includes(kind)) say("error", "hits-kind", "/kind", `"${kind}" is not a kind of hit.`, `Kinds: ${HIT_KINDS.join(", ")}.`);
  if (!kinds.length) say("error", "hits-kind", "/kind", "A hit needs at least one kind.");
  const sources = [spec.at, spec.beats, spec.onsets].filter(item => item !== undefined).length;
  if (sources !== 1) say("error", "hits-source", "", "Hits land on one source: `at`, `beats` or `onsets`.");
  const amount = spec.amount ?? .5, settle = spec.frames ?? Math.max(3, Math.round(ctx.fps * .2)), lead = spec.lead ?? 0;
  if (!(amount >= .1 && amount <= 1)) say("error", "hits-amount", "/amount", "A hit's amount runs from 0.1 to 1.", "More moves the frame the viewer is reading.");
  if (!(Number.isSafeInteger(settle) && settle >= 2 && settle <= Math.round(ctx.fps))) say("error", "hits-frames", "/frames", `A hit settles in 2 to ${Math.round(ctx.fps)} frames.`);
  if (!(Number.isSafeInteger(lead) && lead >= 0 && lead <= 3)) say("error", "hits-lead", "/lead", "A hit leads its beat by 0 to 3 frames.");
  if (spec.direction !== undefined && !Number.isFinite(spec.direction)) say("error", "hits-direction", "/direction", "The direction is an angle in degrees.");
  const centre = spec.centre ?? { x: .5, y: .5 };
  if (!(centre.x >= 0 && centre.x <= 1 && centre.y >= 0 && centre.y <= 1)) say("error", "hits-centre", "/centre", "The centre is a point inside the frame, as fractions.");
  if (spec.gainDb !== undefined && !(spec.gainDb >= -40 && spec.gainDb <= 12)) say("error", "hits-gain", "/gainDb", "A hit's sound level runs from -40 to +12 dB.");
  const range = (from: number | undefined, to: number | undefined, at: string) => {
    const lo = from ?? 0, hi = to ?? ctx.durationFrames;
    if (!(Number.isSafeInteger(lo) && Number.isSafeInteger(hi) && lo >= 0 && hi <= ctx.durationFrames && lo < hi)) { say("error", "hits-range", at, `\`from\` and \`to\` are scene frames from 0 to ${ctx.durationFrames}, in order.`); return undefined; }
    return [lo, hi] as const;
  };
  const bed = (id: string, at: string) => { const found = ctx.beds.get(id); if (!found) say("error", "hits-bed", at, `The film has no bed "${id}".`, "Name a bed in audio.beds."); return found; };
  let frames: number[] = [];
  if (spec.at) spec.at.forEach((item, i) => {
    if (typeof item === "string") {
      const frame = ctx.moment(item);
      if (frame === undefined) say("error", "hits-moment", `/at/${i}`, `"${item}" is not one of this scene's moments.`);
      else frames.push(frame);
      return;
    }
    if (!(Number.isSafeInteger(item) && item >= 0 && item < ctx.contentFrames)) { say("error", "hits-at", `/at/${i}`, `A hit lands on a content frame from 0 to ${ctx.contentFrames - 1}.`); return; }
    frames.push(Math.round(ctx.output(item)));
  });
  if (spec.beats) {
    const source = bed(spec.beats.bed, "/beats/bed"), every = spec.beats.every ?? 1, phase = spec.beats.phase ?? 0, span = range(spec.beats.from, spec.beats.to, "/beats");
    if (![1, 2, 4, 8].includes(every)) say("error", "hits-every", "/beats/every", "Hits fall on every 1, 2, 4 or 8 beats.");
    if (!(Number.isSafeInteger(phase) && phase >= 0 && phase < every)) say("error", "hits-phase", "/beats/phase", `The phase is a beat of the group, 0 to ${every - 1}.`);
    if (source && !source.bpm) say("error", "hits-no-tempo", "/beats/bed", `The bed "${spec.beats.bed}" declares no tempo.`, "Give the bed its `bpm` (and `beatOffset`, seconds to its first beat).");
    if (source?.reverse) say("error", "hits-reverse", "/beats/bed", "A reversed bed has no beat grid.");
    if (source && span) frames = bedBeats(source, ctx.fps, ctx.filmFrames).map((frame, n) => [frame - ctx.filmStart, n] as const)
      .filter(([frame, n]) => n % every === phase && frame >= span[0] && frame < span[1]).map(([frame]) => frame);
  }
  if (spec.onsets) {
    const source = bed(spec.onsets.bed, "/onsets/bed"), rise = spec.onsets.rise ?? .3, span = range(spec.onsets.from, spec.onsets.to, "/onsets");
    if (!(rise >= .05 && rise <= .9)) say("error", "hits-rise", "/onsets/rise", "An onset's rise runs from 0.05 to 0.9.");
    if (source && ctx.levels && !ctx.levels.sounds[source.sound]) say("error", "hits-levels", "/onsets/bed", `No levels were measured for "${source.sound}".`, "Run npm run sound:levels.");
    if (source && !ctx.levels) say("warning", "hits-no-levels", "/onsets", "This compile was given no bed levels, so the scene has no onsets to hit.", "Pass soundLevels (assets/sound/levels.json) to compileFilm.");
    const levels = source && ctx.levels?.sounds[source.sound];
    if (source && levels && span) {
      // The meter starts a second early, so a beat on the scene's first frame (or the bed's) rises from what came before it.
      const start = source.startFrame ?? 0, early = Math.round(ctx.fps), values = follow(bedLevels(levels, ctx.levels!.rate, ctx.fps, { startFrame: start, durationFrames: source.durationFrames ?? ctx.filmFrames - start, reverse: source.reverse },
        ctx.filmStart - early, ctx.filmStart + ctx.durationFrames, ctx.silent));
      frames = riseFrames(values, rise).map(frame => frame - early).filter(frame => frame >= span[0] && frame < span[1]);
    }
  }
  if (problems.some(item => item.severity === "error")) return { problems };
  // A hit led past the scene's cut lands on the cut.
  frames = [...new Set(frames.filter(frame => frame >= 0 && frame < ctx.durationFrames).map(frame => Math.max(0, frame - lead)))].sort((a, b) => a - b);
  if (!frames.length) say("warning", "hits-none", "", "No hit lands inside the scene.", spec.beats ? "Check the bed's start, `beatOffset` and the scene's place in the film." : undefined);
  // Hits closer than a beat at 240 bpm read as jitter; a flash more often than three times a second is a seizure risk.
  const most = (list: readonly number[]) => list.reduce((top, frame, i) => Math.max(top, list.slice(i).filter(other => other < frame + Math.round(ctx.fps)).length), 0);
  if (most(frames) > MAX_HITS_PER_SECOND) say("warning", "hits-busy", "", `${most(frames)} hits land within one second.`, "Hit every second or fourth beat; more reads as jitter.");
  if (kinds.includes("flash") && most(frames) > MAX_FLASHES_PER_SECOND) say("error", "hits-flash-rate", "/kind", `${most(frames)} flashes land within one second; the limit is ${MAX_FLASHES_PER_SECOND}.`, "Flash on fewer hits (WCAG 2.3.1), or drop the flash.");
  // A split blurs words only while it lasts: a light one gone in a few frames leaves them readable.
  if (ctx.textHeavy && kinds.includes("split") && (amount > .5 || settle > Math.round(ctx.fps * .2))) say("warning", "hits-split-text", "/kind", "A strong or long RGB split makes words hard to read.", "Keep a split over words at 0.5 or less, settling within 0.2 s; or split pictures and motion, not text.");
  if (ctx.textHeavy && kinds.includes("shake") && amount > .6) say("warning", "hits-shake-text", "/amount", "A strong shake makes words hard to read.", "Keep the shake at 0.6 or less on text.");
  return { hits: { kinds, frames, amount, settle, ...spec.direction !== undefined ? { direction: spec.direction } : {}, centre, ...spec.sound ? { sound: spec.sound, gainDb: spec.gainDb ?? 0 } : {} }, problems };
}

/** How far a scene's hits can move the picture at their peak: the shake (a fraction of the frame height, all patterns at once), the turn
 * (degrees) and the split. The stage enlarges the scene by this once, as an editor scales a clip up before shaking it, so no frame shows
 * an edge and the zoom does not pump with each swing. */
export function hitsReach(list: readonly FilmHits[]): { move: number; turn: number; split: number } {
  return list.reduce((sum, hits) => ({
    move: sum.move + (hits.kinds.includes("shake") ? HIT_RANGE.shake * hits.amount : 0),
    turn: sum.turn + (hits.kinds.includes("shake") ? HIT_RANGE.rotate * hits.amount : 0),
    split: Math.max(sum.split, hits.kinds.includes("split") ? HIT_RANGE.split * hits.amount : 0),
  }), { move: 0, turn: 0, split: 0 });
}

/** Several hit patterns at one frame (a punch on the kick, a shake on the snare): their scales multiply, their moves add, and the
 * strongest split, blur and flash win. */
export function hitsAt(list: readonly FilmHits[], frame: number, fps: number, reducedMotion = false): HitState {
  if (list.length === 1) return hitAt(list[0], frame, fps, reducedMotion);
  return list.reduce<HitState>((sum, hits) => {
    const one = hitAt(hits, frame, fps, reducedMotion);
    return { scale: sum.scale * one.scale, x: sum.x + one.x, y: sum.y + one.y, rotate: sum.rotate + one.rotate,
      ...Math.hypot(one.splitX, one.splitY) > Math.hypot(sum.splitX, sum.splitY) ? { splitX: one.splitX, splitY: one.splitY } : { splitX: sum.splitX, splitY: sum.splitY },
      blur: Math.max(sum.blur, one.blur), flash: Math.max(sum.flash, one.flash) };
  }, HIT_REST);
}

/**
 * The hit state at a scene frame: the latest hit at or before it, falling off over `settle` frames. The punch, split, blur and flash
 * peak on the hit frame and ease out; the shake swings about every 1/24 s, each swing smaller. Reduced motion is at rest.
 */
export function hitAt(hits: FilmHits, frame: number, fps: number, reducedMotion = false): HitState {
  if (reducedMotion) return HIT_REST;
  let index = -1;
  for (let i = 0; i < hits.frames.length && hits.frames[i] <= frame; i++) index = i;
  if (index < 0) return HIT_REST;
  const age = frame - hits.frames[index];
  if (age >= hits.settle) return HIT_REST;
  const t = age / hits.settle, fall = (1 - t) * (1 - t), quick = Math.max(0, 1 - age / Math.max(1, hits.settle * .7)) ** 2, a = hits.amount, has = (kind: HitKind) => hits.kinds.includes(kind);
  // A swing about every 1/24 s: at 24 or 30 fps the shake changes side every frame, at 60 fps every other frame.
  const half = Math.max(1, Math.round(fps / 24)), swing = Math.cos(Math.PI * age / half);
  const angle = ((hits.direction ?? hash(index) * 180) * Math.PI) / 180, shake = has("shake") ? HIT_RANGE.shake * a * fall * swing : 0;
  const split = has("split") ? HIT_RANGE.split * a * quick : 0, splitAngle = hits.direction !== undefined ? angle : 0;
  const round = (v: number) => Math.round(v * 1e5) / 1e5;
  return {
    scale: round(1 + (has("punch") ? HIT_RANGE.punch * a * fall : 0)),
    x: round(shake * Math.cos(angle)), y: round(shake * Math.sin(angle)),
    rotate: round(has("shake") ? HIT_RANGE.rotate * a * fall * Math.cos(Math.PI * age / (2 * half)) * (index % 2 ? -1 : 1) : 0),
    splitX: round(split * Math.cos(splitAngle)), splitY: round(split * Math.sin(splitAngle)),
    blur: round(has("blur") ? HIT_RANGE.blur * a * quick : 0),
    flash: round(has("flash") ? HIT_RANGE.flash * a * quick : 0),
  };
}
