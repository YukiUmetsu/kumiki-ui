/** Flashes: moments where the whole frame jumps in light.
 *
 * - **Flash cut** (`{ "kind": "flash" }` on a transition): the cut lands on a frame or two of white (or any colour), and the next scene
 *   burns back through it, like a camera flash. For a drop in the music, a montage peak or a memory.
 * - **Flash burst** (`{ "kind": "burst", "inserts": [...] }`): three to seven very short shots, two or three frames each, between two
 *   scenes. The inserts are stills of the film's own scenes, or licensed pictures.
 * - **Polarity flip** (`"flips": [24, 30]` on a card): the card cuts between its ground and the opposite ground, dark to light and back.
 *
 * Practice (doc 34, T2 and T7): 35% of 491 measured motion-award films have changes three frames or less apart, in bursts of a median 4
 * changes in 0.42 s; a quarter jump between dark and light frames.
 *
 * **Safety.** A flash is a pair of opposing changes in light. No more than three flashes in any one second (six changes), the limit of
 * WCAG 2.3.1 and broadcast guidance for viewers with photosensitive epilepsy. Flash cuts and flips are counted when the film compiles;
 * a burst's pictures are measured on the rendered frames by `film:review`, with `flashChanges`.
 */

export interface FilmFlashSpec {
  /** @default "#ffffff" */
  color?: string;
  /** Frames at full colour. @default 2 */
  frames?: number;
  /** Frames for the next scene to burn back through. @default 4 */
  fadeFrames?: number;
}
/** A still for a burst: a scene of the film at one of its moments (or a content frame), or a picture. */
export type FilmBurstInsert =
  | { scene: string; at?: number | string }
  | { image: { id: string; src: string; alt: string; licenseRef?: string; width: number; height: number } };
export interface FilmBurstSpec {
  inserts: readonly FilmBurstInsert[];
  /** Frames each insert holds. @default 2 */
  framesEach?: number;
}
/** A flash cut as the stage draws it, by incoming scene ID. */
export interface FilmFlash { color: string; frames: number; fade: number }
/** A burst as the stage draws it, by incoming scene ID: each insert resolved to a scene frame or a picture. */
export interface FilmBurst {
  framesEach: number;
  inserts: ReadonlyArray<{ sceneId: string; localFrame: number } | { src: string; alt: string }>;
}
export interface FlashProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const COLOR = /^#[0-9a-f]{6}$/i;
/** At most three flashes, six opposing changes in light, in any one second. */
export const MAX_FLASHES_PER_SECOND = 3;

export function flashFrames(spec: FilmFlashSpec): number { return (spec.frames ?? 2) + (spec.fadeFrames ?? 4); }
export function burstFrames(spec: FilmBurstSpec): number { return (spec.inserts?.length ?? 0) * (spec.framesEach ?? 2); }

/** A flash cut at frame `i` of its window: the colour's opacity and how far the next scene is over-exposed as it burns back. */
export function flashFrame(flash: Pick<FilmFlash, "frames" | "fade">, i: number): { veil: number; glow: number } {
  if (i < flash.frames) return { veil: 1, glow: 1 };
  const t = Math.min(1, (i - flash.frames + 1) / (flash.fade + 1)), left = (1 - t) ** 2;
  return { veil: left * .85, glow: left };
}
/** The insert a burst shows at frame `i` of its window, or the first one under reduced motion. */
export const burstInsert = (burst: Pick<FilmBurst, "framesEach" | "inserts">, i: number, reducedMotion = false) =>
  burst.inserts[reducedMotion ? 0 : Math.min(burst.inserts.length - 1, Math.floor(i / burst.framesEach))];

/** Which ground a card stands on at a scene frame, after its flips: each flip swaps it for the opposite ground. */
export function flippedGround<G extends "dark" | "light" | "brand">(ground: G, flips: readonly number[] | undefined, frame: number): "dark" | "light" | "brand" {
  const count = (flips ?? []).filter(at => frame >= at).length;
  if (count % 2 === 0) return ground;
  return ground === "light" ? "dark" : "light";
}

/** Count changes in light in a series of frame luminances (relative luminance, 0 to 1), as WCAG 2.3.1 does: a change is a rise or a fall of
 * at least 0.1 where the darker side is below 0.8, and a run of frames moving one way is one change. Returns the frames each change ends on. */
export function flashChanges(luminance: readonly number[]): number[] {
  const changes: number[] = [], close = (from: number, to: number) => {
    const a = luminance[from], b = luminance[to];
    if (Math.abs(b - a) >= .1 && Math.min(a, b) < .8) changes.push(to);
  };
  let start = 0, direction = 0, last = 0;
  for (let i = 1; i < luminance.length; i++) {
    const step = Math.sign(luminance[i] - luminance[i - 1]);
    if (!step) continue;
    if (direction && step !== direction) { close(start, last); start = last; }
    direction = step; last = i;
  }
  if (direction) close(start, last);
  return changes;
}
/** The most flashes (pairs of changes) in any one second, from the frames of each change. */
export function peakFlashesPerSecond(changeFrames: readonly number[], fps: number): number {
  const sorted = [...changeFrames].sort((a, b) => a - b);
  let most = 0;
  for (let i = 0, j = 0; i < sorted.length; i++) {
    while (sorted[i] - sorted[j] >= fps) j++;
    most = Math.max(most, i - j + 1);
  }
  return most / 2;
}

/** Checks a flash cut. */
export function inspectFlash(spec: FilmFlashSpec, path: string): { flash?: FilmFlash; problems: FlashProblem[] } {
  const problems: FlashProblem[] = [], say = (severity: FlashProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const color = spec.color ?? "#ffffff", frames = spec.frames ?? 2, fade = spec.fadeFrames ?? 4;
  if (!COLOR.test(color)) say("error", "flash-color", "/color", "A flash's colour is a #rrggbb colour.");
  if (!(Number.isSafeInteger(frames) && frames >= 1 && frames <= 4)) say("error", "flash-frames", "/frames", "A flash holds its colour 1 to 4 frames.", "Longer is a dip; use { \"kind\": \"dip\" }.");
  if (!(Number.isSafeInteger(fade) && fade >= 0 && fade <= 12)) say("error", "flash-frames", "/fadeFrames", "A flash burns back over 0 to 12 frames.");
  return problems.length ? { problems } : { flash: { color, frames, fade }, problems };
}
/** Checks a burst. `resolve` turns a scene ID and moment into that scene's frame, or reports why it cannot. */
export function inspectBurst(spec: FilmBurstSpec, rate: number, path: string, resolve: (scene: string, at: number | string | undefined) => number | string): { burst?: FilmBurst; problems: FlashProblem[] } {
  const problems: FlashProblem[] = [], say = (severity: FlashProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const framesEach = spec.framesEach ?? 2, inserts = spec.inserts ?? [];
  if (!(Number.isSafeInteger(framesEach) && framesEach >= 2 && framesEach <= 6)) say("error", "burst-frames", "/framesEach", "Each insert of a burst holds 2 to 6 frames.", "One frame is below what the eye can name; over 6 it is a montage.");
  if (inserts.length < 2 || inserts.length > 8) say("error", "burst-inserts", "/inserts", "A burst has 2 to 8 inserts.");
  const resolved = inserts.map((insert, i) => {
    if ("scene" in insert) {
      const frame = resolve(insert.scene, insert.at);
      if (typeof frame === "string") { say("error", "burst-insert", `/inserts/${i}`, frame); return undefined; }
      return { sceneId: insert.scene, localFrame: frame };
    }
    if (!insert.image?.src || !(insert.image.width > 0 && insert.image.height > 0)) { say("error", "burst-insert", `/inserts/${i}/image`, "A picture insert needs its source, width and height."); return undefined; }
    if (!insert.image.licenseRef) say("error", "burst-licence", `/inserts/${i}/image/licenseRef`, "A picture insert needs a rights record.");
    return { src: insert.image.src, alt: insert.image.alt };
  });
  if (problems.some(item => item.severity === "error")) return { problems };
  if (inserts.length * framesEach > rate * .9) say("warning", "burst-long", "/inserts", `The burst runs ${(inserts.length * framesEach / rate).toFixed(2)} s.`, "A burst is a jolt of under a second; longer, and it reads as a montage the viewer tries to follow.");
  const scenes = new Set(inserts.flatMap(insert => "scene" in insert ? [insert.scene] : []));
  if (!scenes.size) say("warning", "burst-unrelated", "/inserts", "No insert comes from the film's own scenes.", "Inserts read as a burst of memory or foreshadowing when the viewer has seen, or will see, the pictures.");
  return { burst: { framesEach, inserts: resolved as FilmBurst["inserts"] }, problems };
}
/** Checks a card's flips against its length. */
export function inspectFlips(flips: readonly number[], durationFrames: number, rate: number, path: string): FlashProblem[] {
  const problems: FlashProblem[] = [];
  flips.forEach((at, i) => {
    if (!(Number.isSafeInteger(at) && at > 0 && at < durationFrames)) problems.push({ severity: "error", code: "card-flip", path: `${path}/${i}`, message: `A flip at ${at} is not inside the card's ${durationFrames} frames.` });
    else if (i > 0 && at - flips[i - 1] < Math.round(rate * .15)) problems.push({ severity: "warning", code: "card-flip-close", path: `${path}/${i}`, message: `Flips ${at - flips[i - 1]} frames apart blur into flicker.`, hint: "Space flips at least 5 frames apart, on beats." });
    else if (i > 0 && at <= flips[i - 1]) problems.push({ severity: "error", code: "card-flip", path: `${path}/${i}`, message: "Flips run in order." });
  });
  return problems;
}
