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
   * (+) or behind (−), so the car holds its place in frame and the track streams past. `chase` is a camera car driving behind the car
   * at its own steady speed in film time, which a speed ramp does not change: the car pulls away while the ramp runs fast, and the
   * camera closes in while it holds. `side` is metres from the car's line (negative for the far side), then height, lens (vertical
   * field of view, degrees), and how far behind the nose it aims, in metres.
   * @default trackside 8, .55, 26, .8; chase .8, 1.2, 13 (a long lens, as camera cars use), 0 */
  camera?: { mode?: "trackside" | "follow" | "chase"; along?: number; side?: number; height?: number; fov?: number; lead?: number;
    /** A camera car's vibration, metres. @default .012 following or chasing, 0 trackside */
    shake?: number;
    /** A chasing camera's speed in metres a second of film time. @default the car's own speed, the pace a camera car keeps */
    speed?: number;
    /** How close a chasing camera comes behind the car's centre, metres: its distance at the closest moment of the scene. @default 16 */
    gap?: number };
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
export interface FilmClock { durationFrames: number; contentAt(filmFrame: number): number; filmAt(contentFrame: number): number }
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
  const pose: ShotPose = { fov: spec.camera?.fov ?? (chase ? 13 : 26), position: [x + (moving ? jitter(1) : 0), height + jitter(2), side + jitter(3)], target };
  return { carX, travelled, wheelTurn: travelled / wheelRadius, ride: { lift: .004 * road(travelled), pitch: .12 * road(travelled * .7 + 3) }, pose };
}

/** A chasing camera's place on the track at a content frame. It drives at a steady speed in film time, placed so that at the closest
 * moment of the scene it is `gap` metres behind the car's centre. */
function chaseX(spec: TrackPassSpec, frame: number, fps: number, clock?: FilmClock): number {
  const v = spec.speed ?? 58, u = spec.camera?.speed ?? v, gap = spec.camera?.gap ?? 16;
  const film = clock ? clock.filmAt(frame) : frame, frames = clock?.durationFrames ?? spec.durationFrames;
  // The car's lead over a camera that set off from the same place: the smallest is where the camera comes closest.
  let closest = Infinity;
  for (let f = 0; f <= frames; f += 1) closest = Math.min(closest, v * (clock ? clock.contentAt(f) : f) / fps - u * f / fps);
  return u * film / fps + closest - gap - v * spec.passFrame / fps;
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
