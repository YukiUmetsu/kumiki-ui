/** Race shots: a car at speed on a track, as pure functions of the frame. The first is the trackside pass, the classic shot of a car
 * film: a low camera at the edge of the track on a long lens pans with the car as it approaches, passes level with the lens, and
 * races away. Paired with a speed ramp, it holds near-still at the pass.
 *
 * The car moves at a real speed in metres; its wheels turn by distance over radius, and its body rides a little on the road, so a
 * speed ramp slows every part of the motion together.
 */
import type { ShotPose, TextBeat, Vec3 } from "./studio-shots";

export interface TrackPassSpec {
  durationFrames: number;
  /** The car's speed in metres a second. @default 58 (about 210 km/h) */
  speed?: number;
  /** The frame the car is level with the camera. */
  passFrame: number;
  /** The camera. `trackside` stands still beside the track and pans with the car. `follow` is locked to the car, `along` metres ahead
   * (+) or behind (−), so the car holds its place in frame and the track streams past. `chase` is a camera car driving behind at the
   * car's speed in the shot's first frame, in film time: a speed ramp does not speed it up. When the ramp slows the car it brakes to
   * stay behind, and when the ramp speeds up the car races away. `side` is metres from the car's line (negative for the far side),
   * then height, lens (vertical field of view, degrees), and how far behind the nose it aims, in metres.
   * @default trackside 8, .55, 26, .8; chase .8, 1.2, 13 (a long lens, as camera cars use), 0 */
  camera?: { mode?: "trackside" | "follow" | "chase"; along?: number; side?: number; height?: number; fov?: number; lead?: number;
    /** A camera car's vibration, metres. @default .012 following or chasing, 0 trackside */
    shake?: number;
    /** A chasing camera's speed in metres a second of film time. @default the car's speed on screen in the shot's first frame */
    speed?: number;
    /** How far a chasing camera starts behind the car's centre, metres. @default 24 */
    gap?: number;
    /** The closest a chasing camera brakes to behind the car's centre when a ramp slows the car, metres. @default 14 */
    closest?: number;
    /** A crane up: the camera rises to `height` metres over `frames` film frames (default 20), arriving at film frame `end`, or by
     * default just as the scene's speed ramp starts to speed up, so the higher view shows the track ahead as the car surges into it.
     * It keeps aiming at the car. */
    rise?: { height: number; frames?: number; end?: number } };
  /** The film camera's shutter: how much of each frame it is open (degrees) and how many moments inside it are averaged into one frame.
   * Motion blur streams the track past a following camera and smears a trackside pan; 1 sample turns it off. Trackside and chasing
   * default to a shorter 90°, as sports operators shoot: near the lens the car turns several degrees toward the camera in half a frame,
   * and a chasing camera closes on the car through a hold; either would smear the car at the moment that matters.
   * @default 90 trackside and chasing, 180 locked following; 6 samples */
  shutter?: { angle?: number; samples?: number };
  title?: TextBeat;
  /** A race livery over the car's own finish: paint colours (on materials named `Paint 1` and `Paint 2`), a race number in roundels on
   * both doors and the bonnet, and twin stripes over the top from nose to tail. Decals are projected onto the car, so they read the
   * right way round on both sides. */
  livery?: RaceLivery;
}
export interface RaceLivery { body?: string; accent?: string; number?: string; stripes?: boolean | string }

/** A scene's clock through a speed ramp: its film frames against the content frames a shot is timed in. A chasing camera drives in
 * film time, so the ramp changes the car's motion and not the camera's. Without one, film and content frames are the same. */
export interface FilmClock { durationFrames: number; contentAt(filmFrame: number): number; filmAt(contentFrame: number): number;
  /** The film frame where the ramp up into the scene's end begins, if it has one. */ rampUp?: number }
/** Whether the camera stands beside the track: the pass, and its craft rules, belong to that camera only. */
export const isTrackside = (spec: Pick<TrackPassSpec, "camera">) => (spec.camera?.mode ?? "trackside") === "trackside";

export interface TrackPassState {
  /** The car's position along the track (metres, 0 level with the camera), and its distance travelled since frame 0. */
  carX: number;
  travelled: number;
  /** How far the wheels have turned, radians. */
  wheelTurn: number;
  /** The body riding on the road: metres up and degrees of pitch. */
  ride: { lift: number; pitch: number };
  pose: ShotPose;
}

/** A repeatable bump profile from distance: a few overlapping waves, so the ride never loops visibly. */
const road = (x: number) => .5 * Math.sin(x * 1.7) + .3 * Math.sin(x * 4.3 + 1.1) + .2 * Math.sin(x * 9.1 + 2.3);

export function trackPassState(spec: TrackPassSpec, frame: number, fps: number, wheelRadius = .34, clock?: FilmClock): TrackPassState {
  const v = spec.speed ?? 58, t = (frame - spec.passFrame) / fps, carX = v * t, travelled = v * frame / fps;
  const mode = spec.camera?.mode ?? "trackside", chase = mode === "chase", moving = mode !== "trackside";
  const side = spec.camera?.side ?? (chase ? .8 : 8), height = spec.camera?.height ?? (chase ? 1.2 : .55), lead = spec.camera?.lead ?? (chase ? 0 : .8);
  // Trackside, the operator pans to keep the car's body centred, aiming a little behind its nose; following, the camera car keeps pace.
  const target: Vec3 = [carX - lead, .7, 0];
  // A camera car shakes a little on the road: a few millimetres to a centimetre, from the distance it has travelled.
  const shake = spec.camera?.shake ?? (moving ? .012 : 0), d = chase ? chaseX(spec, frame, fps, clock) : travelled;
  const jitter = (k: number) => shake * (.6 * Math.sin(d * 3.1 + k) + .4 * Math.sin(d * 7.7 + 2 * k));
  const x = chase ? d : mode === "follow" ? carX + (spec.camera?.along ?? 2) : 0;
  const pose: ShotPose = { fov: spec.camera?.fov ?? (chase ? 13 : 26), position: [x + (moving ? jitter(1) : 0), riseHeight(spec, height, frame, clock) + jitter(2), side + jitter(3)], target };
  return { carX, travelled, wheelTurn: travelled / wheelRadius, ride: { lift: .004 * road(travelled), pitch: .12 * road(travelled * .7 + 3) }, pose };
}

/** The camera's height through a crane up, in film time: eased in and out, so it lifts off and settles without a jolt. */
function riseHeight(spec: TrackPassSpec, height: number, frame: number, clock?: FilmClock): number {
  const rise = spec.camera?.rise, end = rise?.end ?? clock?.rampUp;
  if (!rise || end === undefined) return height;
  const frames = Math.max(1, rise.frames ?? 20), t = Math.min(1, Math.max(0, ((clock ? clock.filmAt(frame) : frame) - (end - frames)) / frames));
  return height + (rise.height - height) * t * t * t * (t * (6 * t - 15) + 10);
}

/** A chasing camera's place on the track at a content frame. It is a camera car that starts `gap` metres behind the car at the car's
 * speed on screen in the shot's first frame, and keeps that speed in film time. When a speed ramp slows the car, it brakes smoothly,
 * looking half a second ahead, to stay `closest` metres behind; it never speeds up again, so when the ramp speeds up the car races away. */
function chaseX(spec: TrackPassSpec, frame: number, fps: number, clock?: FilmClock): number {
  const v = spec.speed ?? 58, gap = spec.camera?.gap ?? 24, closest = Math.min(gap, spec.camera?.closest ?? 14), carAt = (film: number) => v * ((clock ? contentAt(clock, film) : film) - spec.passFrame) / fps;
  if (!clock) return carAt(frame) - gap;
  const path = chasePath(spec, fps, clock, v, gap, closest, carAt), at = clock.filmAt(frame) * CHASE_STEPS;
  // Before the first frame and past the last (a shutter's moments), the camera carries on at its end speeds.
  const i = Math.min(path.length - 2, Math.max(0, Math.floor(at)));
  return path[i] + (path[i + 1] - path[i]) * (at - i);
}
/** The content frame at a film frame, carried on at the end speeds past either end, where a driver looking ahead would see it. */
function contentAt(clock: FilmClock, film: number): number {
  const D = clock.durationFrames, end = (at: number, step: number) => clock.contentAt(at) + (clock.contentAt(at) - clock.contentAt(at - step)) * (film - at) / step;
  return film < 0 ? end(0, -1) : film > D ? end(D, 1) : clock.contentAt(film);
}
const CHASE_STEPS = 4, chasePaths = new WeakMap<FilmClock, Map<string, number[]>>();
/** The chasing camera's place at every quarter film frame: driven forward step by step, so it is the same in any frame order. */
function chasePath(spec: TrackPassSpec, fps: number, clock: FilmClock, v: number, gap: number, closest: number, carAt: (film: number) => number): number[] {
  const key = JSON.stringify([v, gap, closest, spec.passFrame, spec.camera?.speed, fps]), cache = chasePaths.get(clock) ?? new Map<string, number[]>();
  chasePaths.set(clock, cache);
  const known = cache.get(key);
  if (known) return known;
  const dt = 1 / CHASE_STEPS / fps, ahead = Math.round(.5 * fps);
  let x = carAt(0) - gap, u = spec.camera?.speed ?? (carAt(1) - carAt(0)) * fps;
  const path = [x];
  for (let k = 1; k <= clock.durationFrames * CHASE_STEPS; k += 1) {
    const f = k / CHASE_STEPS, car = carAt(f);
    // The driver looks half a second ahead: seeing the car slow, they ease off smoothly so the gap shrinks to `closest` and no
    // further, and they never speed up again.
    u = Math.max(0, Math.min(u, (carAt(f + ahead) - closest - x) * fps / ahead));
    const next = Math.min(x + u * dt, car - closest);
    u = Math.min(u, (next - x) / dt);
    x = next;
    path.push(x);
  }
  cache.set(key, path);
  return path;
}

/** The content-frame offsets, around a frame, of the moments a shutter averages: spread evenly across the open part of the frame, centred.
 * `rate` is content frames per film frame, so a speed ramp's hold shortens the smear as it slows time. */
/** The shutter's open angle in degrees, by camera. */
export const shutterAngle = (spec: Pick<TrackPassSpec, "shutter" | "camera">) => Math.min(360, Math.max(0, spec.shutter?.angle ?? (spec.camera?.mode === "follow" ? 180 : 90)));
export function shutterOffsets(spec: Pick<TrackPassSpec, "shutter" | "camera">, rate = 1): number[] {
  const samples = Math.max(1, Math.round(spec.shutter?.samples ?? 6)), open = shutterAngle(spec) / 360;
  return samples === 1 ? [0] : Array.from({ length: samples }, (_, k) => ((k + .5) / samples - .5) * open * rate);
}

export interface RaceProblem { code: string; severity: "error" | "warning"; message: string }
/** Craft rules for a trackside pass. */
export function inspectTrackPass(spec: TrackPassSpec, fps = 30): RaceProblem[] {
  const problems: RaceProblem[] = [], v = spec.speed ?? 58, trackside = isTrackside(spec);
  if (trackside && !(spec.passFrame > 0 && spec.passFrame < spec.durationFrames)) problems.push({ code: "race-pass-outside", severity: "error", message: `The pass at frame ${spec.passFrame} is outside the shot. The pass is the point of the shot; put it inside.` });
  if (trackside && spec.passFrame / fps < .8) problems.push({ code: "race-approach-short", severity: "warning", message: "The car reaches the camera in under 0.8 s: there is no approach to anticipate." });
  if (trackside && (spec.durationFrames - spec.passFrame) / fps < .6) problems.push({ code: "race-exit-short", severity: "warning", message: "The shot ends within 0.6 s of the pass, so the car never leaves; let it race away." });
  if (v < 10 || v > 100) problems.push({ code: "race-speed", severity: "warning", message: `${v} m/s (${Math.round(v * 3.6)} km/h) is outside a race car's range of about 10 to 100 m/s.` });
  if (trackside && Math.abs(spec.camera?.side ?? 8) < 4) problems.push({ code: "race-camera-close", severity: "warning", message: "The camera stands under 4 m from the car's line; a trackside camera that close would be inside the kerb." });
  if (spec.title) {
    if (trackside && Math.abs(spec.title.enter - spec.passFrame) < fps * .5) problems.push({ code: "race-title-at-pass", severity: "warning", message: "The title enters at the pass, where the eye is on the car. Bring it in before the approach or after the car has gone." });
    const words = spec.title.text.split(/\s+/).filter(Boolean).length + (spec.title.sub?.split(/\s+/).filter(Boolean).length ?? 0);
    if (((spec.title.exit ?? spec.durationFrames) - spec.title.enter) / fps < words / 3 + .8) problems.push({ code: "race-title-short", severity: "error", message: "The title is not on screen long enough to read." });
  }
  return problems;
}
