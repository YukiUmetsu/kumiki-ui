/** Speed ramps for film scenes: a time map from the scene's output frames to the frames of its content, so a 3D shot, a card, a screen
 * demo or any recipe can play fast, slow to near-stillness on the moment that matters ("ramp and hold"), and speed back up; and so a
 * scene can ramp up into a cut and the next ramp down out of it, which hides the join inside one fast move.
 *
 * Practice (doc 32, §7): fast, slow, fast, with about 1.5 s of near-stillness so the product registers; ramps also hide a cut inside
 * one fast move. Every Kumiki scene is a pure function of its frame, so remapping time is exact in any frame order.
 *
 * The speed profile is a baseline rate with smooth dips for holds and smooth boosts at the ends. The baseline and each hold's place in
 * output time are solved so the content fits the scene exactly and each hold is centred on its moment.
 *
 * **Velocity edit** (`beats`, VE1.2): the speed follows the beats of a bed with a declared tempo, the short-form "velocity" edit. Between
 * beats the content races; on each beat it drops to slow motion, so every hit of the music lands on a slowed, readable moment. Four
 * shapes: `dip` slows on each beat and races between; `rush` races into the beat and drops to slow motion on it (the classic velocity
 * edit); `burst` bursts out of the beat and slows into the next; `freeze` almost stops on each beat. `contrast` is the fast speed over the
 * slow one. The curve is scaled so the content fits the scene exactly. Practice: editors draw speed points on the beats and drag them
 * up to speed up and down to slow down, 0.1× to 10× ([CapCut](https://www.capcut.com/resource/how-to-do-velocity-on-capcut)).
 */

export interface FilmSpeed {
  /** Frames of content the scene plays: what its recipe is timed in, its moments and its checks. */
  source: number;
  /** Moments to slow to near-stillness: a content frame, or the name of one of the scene's moments, and output frames to hold it. */
  holds?: ReadonlyArray<{ at: number | string; frames: number; /** `tape-stop`: the film's sound slows and drops in pitch to a stop as the
   * picture slows into the hold, holds silent, and spins up when it moves again (doc 34, S6). */ sound?: "tape-stop" }>;
  /** Speed during a hold, as a fraction of normal. @default .08 */
  slow?: number;
  /** Output frames to ramp between fast and slow. @default 8 */
  ramp?: number;
  /** Ramp up into the cut over this many output frames at the end, and come down out of the cut over `enter` at the start. Pair with
   * a cut or a whip. */
  exit?: number;
  enter?: number;
  /** A velocity edit: the speed follows the beats of a bed that declares `bpm`, slow on each beat and fast between. Takes the place of
   * `holds`. `every` and `phase` pick the beats as for hits. */
  beats?: { bed: string; every?: number; phase?: number; shape?: VelocityShape; /** Fast speed over slow speed, 2 to 20. @default 8 */ contrast?: number };
}
export const VELOCITY_SHAPES = ["dip", "rush", "burst", "freeze"] as const;
export type VelocityShape = typeof VELOCITY_SHAPES[number];
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
  /** Content frame for each output frame under reduced motion, when an even speed would be wrong (a rewind holds its last frame instead). */
  reducedMap?: readonly number[];
}

/** How much faster the ends run when they ramp into or out of a cut. */
export const SPEED_CUT_BOOST = 2.5;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
/** Smooth plateau: 0 outside, 1 for `hold` frames centred at `c`, ramping over `ramp` frames each side. */
const plateau = (t: number, c: number, hold: number, ramp: number) => {
  const a = c - hold / 2, b = c + hold / 2;
  return t < a ? smooth((t - (a - ramp)) / ramp) : t > b ? 1 - smooth((t - b) / ramp) : 1;
};

/** A velocity curve's relative speed at phase `u` (0 on a beat, 1 at the next), from slow (1) to fast (`contrast`). */
export function velocityWeight(shape: VelocityShape, u: number, contrast: number): number {
  const x = Math.min(1, Math.max(0, u)), mid = Math.min(x, 1 - x) * 2;
  switch (shape) {
    case "dip": return 1 + (contrast - 1) * smooth(mid);
    // Races into the beat and drops to slow motion on it: the speed climbs as the beat nears.
    case "rush": return 1 + (contrast - 1) * x ** 2.5;
    case "burst": return 1 + (contrast - 1) * (1 - x) ** 2.5;
    // Near-stillness on the beat: a narrow, deep dip, a quarter of the slow speed at its floor.
    case "freeze": return .25 + (contrast - .25) * smooth(mid / .45);
  }
}

/** A velocity edit's time map: the content plays at the shape's speed between the given beats (scene frames), scaled to fit `source`. */
function compileVelocity(speed: FilmSpeed, D: number, beats: readonly number[], report: (severity: SpeedProblem["severity"], code: string, path: string, message: string, hint?: string) => void): CompiledSpeed | undefined {
  const shape = speed.beats!.shape ?? "rush", contrast = speed.beats!.contrast ?? 8, S = speed.source;
  if (!(VELOCITY_SHAPES as readonly string[]).includes(shape)) { report("error", "speed-beats-shape", "/beats/shape", `"${shape}" is not a velocity shape.`, `Shapes: ${VELOCITY_SHAPES.join(", ")}.`); return undefined; }
  if (!(contrast >= 2 && contrast <= 20)) { report("error", "speed-beats-contrast", "/beats/contrast", "A velocity edit's contrast runs from 2 to 20."); return undefined; }
  if (speed.holds?.length) { report("error", "speed-beats-holds", "/holds", "A velocity edit slows on its beats; it takes no holds as well."); return undefined; }
  const inside = beats.filter(beat => beat >= 0 && beat <= D);
  if (inside.length < 2) { report("error", "speed-beats-few", "/beats", "A velocity edit needs at least two beats inside the scene.", "Lengthen the scene, or hit every beat."); return undefined; }
  const period = (inside[inside.length - 1] - inside[0]) / (inside.length - 1), enter = Math.max(0, speed.enter ?? 0), exit = Math.max(0, speed.exit ?? 0);
  // The phase of a frame between the beat before it and the beat after it; before the first and after the last, the grid carries on.
  const phase = (t: number) => {
    let i = 0;
    while (i < inside.length && inside[i] <= t) i++;
    const from = i ? inside[i - 1] : inside[0] - period * Math.ceil((inside[0] - t) / period), to = i < inside.length ? inside[i] : from + period;
    return (t - from) / Math.max(1e-6, to - from);
  };
  const raw = [0];
  for (let k = 0; k < D; k++) {
    let v = velocityWeight(shape, phase(k + .5), contrast);
    if (enter) v *= 1 + (SPEED_CUT_BOOST - 1) * (1 - smooth((k + .5) / enter));
    if (exit) v *= 1 + (SPEED_CUT_BOOST - 1) * smooth((k + .5 - (D - exit)) / exit);
    raw.push(raw[k] + v);
  }
  const scale = S / raw[D], map = raw.map(v => v * scale), steps = map.slice(1).map((v, k) => v - map[k]);
  const fastest = Math.max(...steps), slowest = Math.min(...steps);
  if (fastest > 10) report("warning", "speed-fast", "/source", `Between beats the content plays at up to ${fastest.toFixed(1)}×; past about 10× motion stops reading as motion.`, "Lower the contrast, give the content fewer frames, or the scene more.");
  if (shape !== "freeze" && slowest > .9) report("warning", "speed-beats-flat", "/source", `On the beats the content still plays at ${slowest.toFixed(2)}×, so nothing reads as slow motion.`, "Give the content more frames for its length, or lower the contrast.");
  return { map, rate: S / D, holds: [], ...exit ? { rampUp: D - exit } : {} };
}

/** The time map for one scene. `moment` resolves a hold named by a moment to its content frame. `beats` are the scene frames of the beats
 * a velocity edit (`speed.beats`) follows. */
export function compileSpeed(speed: FilmSpeed, durationFrames: number, fps: number, moment: (id: string) => number | undefined, beats: readonly number[] = []): { speed?: CompiledSpeed; problems: SpeedProblem[] } {
  const problems: SpeedProblem[] = [], report = (severity: SpeedProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const D = durationFrames, S = speed.source, slow = Math.min(.9, Math.max(0, speed.slow ?? .08)), ramp = Math.max(1, speed.ramp ?? 8);
  if (!(Number.isFinite(S) && S >= 1)) { report("error", "speed-source", "/source", "A speed ramp needs the content's length in frames."); return { problems }; }
  if (speed.beats) { const compiled = compileVelocity(speed, D, beats, report); return { ...compiled ? { speed: compiled } : {}, problems }; }
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
  if (reducedMotion && speed.reducedMap) return speed.reducedMap[Math.min(D, Math.max(0, Math.round(frame)))];
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
