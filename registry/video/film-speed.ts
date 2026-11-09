/** Speed ramps for film scenes: a time map from the scene's output frames to the frames of its content, so a 3D shot, a card, a screen
 * demo or any recipe can play fast, slow to near-stillness on the moment that matters ("ramp and hold"), and speed back up; and so a
 * scene can ramp up into a cut and the next ramp down out of it, which hides the join inside one fast move.
 *
 * Practice (doc 32, §7): fast, slow, fast, with about 1.5 s of near-stillness so the product registers; ramps also hide a cut inside
 * one fast move. Every Kumiki scene is a pure function of its frame, so remapping time is exact in any frame order.
 *
 * The speed profile is a baseline rate with smooth dips for holds and smooth boosts at the ends. The baseline and each hold's place in
 * output time are solved so the content fits the scene exactly and each hold is centred on its moment.
 */

export interface FilmSpeed {
  /** Frames of content the scene plays: what its recipe is timed in, its moments and its checks. */
  source: number;
  /** Moments to slow to near-stillness: a content frame, or the name of one of the scene's moments, and output frames to hold it. */
  holds?: ReadonlyArray<{ at: number | string; frames: number }>;
  /** Speed during a hold, as a fraction of normal. @default .08 */
  slow?: number;
  /** Output frames to ramp between fast and slow. @default 8 */
  ramp?: number;
  /** Ramp up into the cut over this many output frames at the end, and come down out of the cut over `enter` at the start. Pair with
   * a cut or a whip. */
  exit?: number;
  enter?: number;
}
export interface SpeedProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
export interface CompiledSpeed {
  /** Content frame for each output frame 0..durationFrames (inclusive), increasing. */
  map: readonly number[];
  /** The baseline rate outside holds and ramps, in content frames per output frame. */
  rate: number;
  /** Each hold's span in output frames. */
  holds: ReadonlyArray<{ start: number; end: number; at: number }>;
  /** The output frame where the ramp up into the scene's end begins, when it has one (`exit`): a moment other motion can lead into. */
  rampUp?: number;
}

/** How much faster the ends run when they ramp into or out of a cut. */
export const SPEED_CUT_BOOST = 2.5;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
/** Smooth plateau: 0 outside, 1 for `hold` frames centred at `c`, ramping over `ramp` frames each side. */
const plateau = (t: number, c: number, hold: number, ramp: number) => {
  const a = c - hold / 2, b = c + hold / 2;
  return t < a ? smooth((t - (a - ramp)) / ramp) : t > b ? 1 - smooth((t - b) / ramp) : 1;
};

/** The time map for one scene. `moment` resolves a hold named by a moment to its content frame. */
export function compileSpeed(speed: FilmSpeed, durationFrames: number, fps: number, moment: (id: string) => number | undefined): { speed?: CompiledSpeed; problems: SpeedProblem[] } {
  const problems: SpeedProblem[] = [], report = (severity: SpeedProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const D = durationFrames, S = speed.source, slow = Math.min(.9, Math.max(0, speed.slow ?? .08)), ramp = Math.max(1, speed.ramp ?? 8);
  if (!(Number.isFinite(S) && S >= 1)) { report("error", "speed-source", "/source", "A speed ramp needs the content's length in frames."); return { problems }; }
  const holds: Array<{ at: number; frames: number }> = [];
  (speed.holds ?? []).forEach((hold, i) => {
    const at = typeof hold.at === "number" ? hold.at : moment(hold.at);
    if (at === undefined) { report("error", "speed-hold-moment", `/holds/${i}/at`, `"${hold.at}" is not one of this scene's moments.`); return; }
    if (!(at > 0 && at < S)) { report("error", "speed-hold-range", `/holds/${i}/at`, `A hold at content frame ${at} is outside the content (0 to ${S}).`); return; }
    if (!(hold.frames > 0)) { report("error", "speed-hold-frames", `/holds/${i}/frames`, "A hold needs a positive number of frames."); return; }
    if (hold.frames < fps) report("warning", "speed-hold-short", `/holds/${i}/frames`, `A ${(hold.frames / fps).toFixed(1)} s hold is too short for the moment to register.`, "Hold near-still for about 1.5 s.");
    holds.push({ at, frames: hold.frames });
  });
  holds.sort((a, b) => a.at - b.at);
  const enter = Math.max(0, speed.enter ?? 0), exit = Math.max(0, speed.exit ?? 0);
  // Content per output frame at time t, for a baseline rate and hold centres.
  const velocity = (t: number, rate: number, centres: readonly number[]) => {
    let v = rate;
    centres.forEach((c, i) => { v -= (rate - rate * slow) * plateau(t, c, holds[i].frames, ramp); });
    if (enter) v *= 1 + (SPEED_CUT_BOOST - 1) * (1 - smooth(t / enter));
    if (exit) v *= 1 + (SPEED_CUT_BOOST - 1) * smooth((t - (D - exit)) / exit);
    return v;
  };
  const integrate = (rate: number, centres: readonly number[], until = D) => {
    const map = [0];
    for (let k = 0; k < Math.ceil(until); k += 1) map.push(map[k] + velocity(k + .5, rate, centres));
    return map;
  };
  const at = (map: readonly number[], t: number) => { const i = Math.min(map.length - 2, Math.max(0, Math.floor(t))); return map[i] + (map[i + 1] - map[i]) * (t - i); };
  // For a rate, place each hold so the content is at its moment at the hold's centre.
  const place = (rate: number) => {
    const centres: number[] = [];
    for (const [i, hold] of holds.entries()) {
      let lo = (centres[i - 1] ?? 0) + (holds[i - 1]?.frames ?? 0) / 2 + hold.frames / 2, hi = D - hold.frames / 2;
      if (lo > hi) return undefined;
      for (let k = 0; k < 40; k += 1) { const mid = (lo + hi) / 2, map = integrate(rate, [...centres, mid], mid + 1); if (at(map, mid) < hold.at) lo = mid; else hi = mid; }
      centres.push((lo + hi) / 2);
    }
    return centres;
  };
  let lo = 1e-3, hi = 50, centres: number[] | undefined;
  for (let k = 0; k < 50; k += 1) {
    const mid = (lo + hi) / 2, placed = place(mid);
    if (!placed) { lo = mid; continue; }
    if (integrate(mid, placed)[D] < S) lo = mid; else { hi = mid; centres = placed; }
  }
  const rate = hi;
  centres = centres ?? place(rate);
  // Past about 12× nothing reads as motion: the holds have left no time to play the content.
  if (!centres || rate > 12) { report("error", "speed-impossible", "/holds", "The holds leave no time to play the content.", "Shorten the holds, or lengthen the scene."); return { problems }; }
  const raw = integrate(rate, centres), scale = S / raw[D], map = raw.map(v => v * scale);
  const placedHolds = centres.map((c, i) => ({ start: Math.max(0, c - holds[i].frames / 2), end: Math.min(D, c + holds[i].frames / 2), at: holds[i].at }));
  placedHolds.forEach((hold, i) => { if (Math.abs(at(map, (hold.start + hold.end) / 2) - hold.at) > 1.5) report("error", "speed-hold-placement", `/holds/${i}`, "This hold cannot be centred on its moment; it overlaps another hold or an end of the scene."); });
  if (rate > 4) report("warning", "speed-fast", "/source", `Outside the holds the content plays at ${rate.toFixed(1)}×. Past about 4× motion stops reading as motion.`, "Give the scene more frames, or hold less.");
  return { speed: { map, rate, holds: placedHolds, ...exit ? { rampUp: D - exit } : {} }, problems };
}

/** The content frame shown at an output frame. Under reduced motion the content plays at an even speed: no ramps and no holds. */
export function speedSource(speed: CompiledSpeed, frame: number, reducedMotion = false): number {
  const D = speed.map.length - 1, S = speed.map[D], first = speed.map[0];
  // Even speed from the map's first content frame to its last: from 0 for a ramp, from `from` for a scene that plays a stretch.
  if (reducedMotion) return Math.min(S, Math.max(first, first + frame * (S - first) / D));
  const t = Math.min(D, Math.max(0, frame)), i = Math.min(D - 1, Math.floor(t));
  return speed.map[i] + (speed.map[i + 1] - speed.map[i]) * (t - i);
}
/** The output frame at which the content reaches `source`: where a content moment lands in the film, to the nearest frame. */
export function speedOutput(speed: CompiledSpeed, source: number): number {
  const D = speed.map.length - 1;
  return source <= 0 ? 0 : source >= speed.map[D] ? D : Math.round(speedFilmFrame(speed, source));
}
/** The exact, fractional output frame at which the content reaches `source`, carried on at the end speeds past either end, so a
 * shot can keep some motion in film time through the ramp. */
export function speedFilmFrame(speed: CompiledSpeed, source: number): number {
  const map = speed.map, D = map.length - 1;
  if (source <= map[0]) return (source - map[0]) / ((map[1] - map[0]) || 1);
  if (source >= map[D]) return D + (source - map[D]) / ((map[D] - map[D - 1]) || 1);
  let lo = 0, hi = D;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (map[mid] < source) lo = mid; else hi = mid; }
  return lo + (source - map[lo]) / ((map[hi] - map[lo]) || 1);
}
/** The scene's clock through the ramp, for shots that keep part of their motion in film time. One per ramp, so it can be compared. */
const clocks = new WeakMap<CompiledSpeed, { durationFrames: number; rampUp?: number; contentAt(filmFrame: number): number; filmAt(contentFrame: number): number }>();
export function speedClock(speed: CompiledSpeed) {
  let clock = clocks.get(speed);
  if (!clock) clocks.set(speed, clock = { durationFrames: speed.map.length - 1, rampUp: speed.rampUp, contentAt: frame => speedSource(speed, frame), filmAt: source => speedFilmFrame(speed, source) });
  return clock;
}
