/** Sound-driven motion: a bed's loudness moves a scene, frame by frame (doc 34, A11).
 *
 * - **Scale.** The scene grows a little on each loud moment and settles back: the "bump" a promo gives its picture on every beat.
 * - **Glow.** A soft light rises from the scene's middle on each loud moment and fades.
 *
 * Practice: audio-reactive motion links a property to a sound's amplitude (After Effects' "Convert Audio to Keyframes"); it is smoothed
 * so it follows the sound's shape rather than every wave, rising fast and falling slowly, like a meter's ballistics. Kept small, it makes
 * the picture feel cut to the sound; large, it shakes the text the viewer is reading, so the amount is bounded.
 *
 * The browser cannot read a bed's audio while a film is drawn frame by frame, so `npm run sound:levels` measures each catalog bed ahead of
 * time (`assets/sound/levels.json`) and the compiler turns the levels into one value per frame. Pure: the same levels give the same motion.
 */

/** Each bed's level every `1 / rate` seconds, as whole numbers from 0 (its quiet floor) to 100 (its loud peaks). */
export interface SoundLevels { rate: number; sounds: Readonly<Record<string, readonly number[]>> }
export type DriveProperty = "scale" | "glow";
export interface FilmDriveSpec {
  /** The ID of the bed (in `audio.beds`) that drives the scene. */
  bed: string;
  /** @default "scale" */
  property?: DriveProperty;
  /** How far the loudest moment moves the scene: extra scale (0.005 to 0.06, default 0.025) or glow strength (0.05 to 0.45, default 0.25). */
  amount?: number;
  /** The glow's colour. @default the brand colour, else white */
  color?: string;
}
/** A compiled drive: the property, and its strength (0 to 1) at each of the scene's frames. */
export interface FilmDrive { property: DriveProperty; amount: number; color?: string; values: readonly number[] }
export interface DriveProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

export const DRIVE_AMOUNTS: Record<DriveProperty, { low: number; high: number; fallback: number }> = { scale: { low: .005, high: .06, fallback: .025 }, glow: { low: .05, high: .45, fallback: .25 } };
/** Frames for a loud moment to fall to about a third: slow enough to read as a settle, fast enough that a 90 bpm pulse reads as beats. */
const RELEASE_FRAMES = 6;

/** A bed's level at each film frame from `from` to `to` (0 to 1), as it plays: from its start, looping (or backwards when reversed), and
 * silent outside it and in the film's air gaps. The loudest of the level steps a frame covers, eased so quiet passages stay still. */
export function bedLevels(levels: readonly number[], rate: number, fps: number, bed: { startFrame: number; durationFrames: number; reverse?: boolean },
  from: number, to: number, silent: (frame: number) => boolean = () => false): number[] {
  const out: number[] = [], length = levels.length;
  for (let frame = from; frame < to; frame++) {
    const local = frame - bed.startFrame;
    if (!length || local < 0 || local >= bed.durationFrames || silent(frame)) { out.push(0); continue; }
    // The steps this frame covers, in the bed's own time.
    const t0 = (bed.reverse ? bed.durationFrames - local - 1 : local) / fps, first = Math.floor(t0 * rate), steps = Math.max(1, Math.round(rate / fps));
    let peak = 0;
    for (let k = 0; k < steps; k++) peak = Math.max(peak, levels[(((first + k) % length) + length) % length]);
    const x = peak / 100;
    out.push(x * x);
  }
  return out;
}
/** Smooth a level per frame like a meter: it rises at once and falls by about two thirds every `RELEASE_FRAMES`. */
export function follow(values: readonly number[], release = RELEASE_FRAMES): number[] {
  const keep = Math.exp(-1 / release), out: number[] = [];
  values.forEach((value, i) => out.push(Math.max(value, (out[i - 1] ?? 0) * keep)));
  return out.map(value => Math.round(value * 1000) / 1000);
}

/** The most rises a drive makes in any one second: each time it climbs more than 0.3 above its lowest point since the last rise. Each is a
 * bump or a pulse of light, even when the meter has not settled between them. */
export function peakRisesPerSecond(values: readonly number[], fps: number): number {
  const rises: number[] = [];
  let trough = values[0] ?? 0;
  values.forEach((value, frame) => { if (value - trough > .3) { rises.push(frame); trough = value; } else trough = Math.min(trough, value); });
  const window = Math.round(fps);
  return rises.reduce((most, frame, i) => Math.max(most, rises.slice(i).filter(other => other < frame + window).length), 0);
}

/** Checks a scene's drive. `beds` are the film's beds by ID; `levels` is what `sound:levels` measured, if the compile was given it. */
export function inspectDrive(spec: FilmDriveSpec, path: string, beds: ReadonlyMap<string, { sound: string }>, levels: SoundLevels | undefined): DriveProblem[] {
  const problems: DriveProblem[] = [], say = (severity: DriveProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const property = spec.property ?? "scale", range = DRIVE_AMOUNTS[property];
  if (!range) { say("error", "drive-property", "/property", `"${spec.property}" is not a property a sound can drive.`, "Properties: scale, glow."); return problems; }
  const bed = beds.get(spec.bed);
  if (!bed) say("error", "drive-bed", "/bed", `The film has no bed "${spec.bed}".`, "Name a bed in audio.beds.");
  if (spec.amount !== undefined && !(spec.amount >= range.low && spec.amount <= range.high)) say("error", "drive-amount", "/amount", `A ${property} drive runs from ${range.low} to ${range.high}.`, property === "scale" ? "More shakes the text the viewer is reading." : "More reads as a flash.");
  if (bed && levels && !levels.sounds[bed.sound]) say("error", "drive-levels", "/bed", `No levels were measured for "${bed.sound}".`, "Run npm run sound:levels.");
  if (bed && !levels) say("warning", "drive-no-levels", "", "This compile was given no bed levels, so the scene does not move with its sound.", "Pass soundLevels (assets/sound/levels.json) to compileFilm.");
  return problems;
}
