/** Stutter: a few frames of a scene play two to four times over, on a beat ("b-b-b-but"), then the scene carries on. It stresses a moment,
 * a landing, a word.
 *
 * Practice (doc 34, T6): a common edit in music videos and trailers; the measured motion-award films have bursts of changes two to three
 * frames apart.
 *
 * A stutter is a time map, like a speed ramp: the scene's content is compiled at its own length, and the scene runs `frames × repeats`
 * longer, showing `frames` content frames from `at` again and again. Every scene is a pure function of its frame, so the repeats are
 * exact. Reduced motion plays the content once, evenly slowed to the scene's length.
 */
import type { CompiledSpeed } from "./film-speed";

export interface FilmStutter {
  /** Where the stutter starts: a content frame, or one of the scene's moments. */
  at: number | string;
  /** Content frames that repeat. @default 4 */
  frames?: number;
  /** Times they play again after the first. @default 2 */
  repeats?: number;
}
export interface StutterProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** Frames a stutter adds to its scene. */
export const stutterExtra = (stutter: FilmStutter) => (stutter.frames ?? 4) * (stutter.repeats ?? 2);

/** The content frame a stuttered scene shows at each of its frames, as a speed map, and where each content frame first lands. */
export function compileStutter(stutter: FilmStutter, durationFrames: number, moment: (id: string) => number | undefined, kind: string):
  { speed?: CompiledSpeed; output?: (content: number) => number; problems: StutterProblem[] } {
  const problems: StutterProblem[] = [], say = (severity: StutterProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const frames = stutter.frames ?? 4, repeats = stutter.repeats ?? 2, content = durationFrames - frames * repeats;
  const at = typeof stutter.at === "number" ? stutter.at : moment(stutter.at);
  if (!(Number.isSafeInteger(frames) && frames >= 2 && frames <= 8)) say("error", "stutter-frames", "/frames", "A stutter repeats 2 to 8 frames.", "Fewer is a flicker; more is a replay.");
  if (!(Number.isSafeInteger(repeats) && repeats >= 1 && repeats <= 4)) say("error", "stutter-repeats", "/repeats", "A stutter plays its frames again 1 to 4 times.");
  if (at === undefined) say("error", "stutter-moment", "/at", `"${stutter.at}" is not one of this scene's moments.`);
  else if (!(Number.isSafeInteger(at) && at >= 0 && at + frames <= content)) say("error", "stutter-range", "/at", `A stutter of ${frames} frames at content frame ${at} does not fit in the scene's ${content} frames of content.`, `The scene runs ${frames * repeats} frames longer than its content; give it more frames.`);
  if (problems.length) return { problems };
  if (kind === "screen-demo") say("warning", "stutter-on-ui", "/at", "A stutter on a screen recording reads as broken playback.", "Stutter a moment of motion: a landing, a hit, a turn.");
  const end = at! + frames, extra = frames * repeats;
  const map = Array.from({ length: durationFrames + 1 }, (_, o) => o < end ? o : o < end + extra ? at! + (o - end) % frames : o - extra);
  return { speed: { map, rate: 1, holds: [] }, output: c => (c < end ? c : c + extra), problems };
}
