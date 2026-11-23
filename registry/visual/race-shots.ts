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
    /** A dolly zoom, for a camera locked to the car (`follow`): the lens moves from `fov` to `to` degrees while the
     * camera slides along its line to the car, so the car keeps its size and the track and mountains behind stretch (a wider lens, closer)
     * or squeeze (a longer lens, farther). From content frame `start` to `end` (default the whole shot), eased in and out. */
    dollyZoom?: { to: number; start?: number; end?: number };
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

/** A car's body, metres: length along the track, width across it, height from the road. `outline` is points on the body's surface in the
 * car's own frame (x along the track from its centre, y up from the road, z across), x, y and z in turn: a dolly zoom holds the size they
 * cover on screen. Without it, a rounded box of the body's size stands in. */
export interface CarBody { length: number; width: number; height: number; outline?: Float32Array }
/** A sports car's size, for a camera that has not measured its car. */
export const CAR_BODY: CarBody = { length: 4.6, width: 1.95, height: 1.25 };

export function trackPassState(spec: TrackPassSpec, frame: number, fps: number, wheelRadius = .34, clock?: FilmClock, body: CarBody = CAR_BODY): TrackPassState {
  const v = spec.speed ?? 58, t = (frame - spec.passFrame) / fps, carX = v * t, travelled = v * frame / fps;
  const mode = spec.camera?.mode ?? "trackside", chase = mode === "chase", moving = mode !== "trackside";
  const side = spec.camera?.side ?? (chase ? .8 : 8), height = spec.camera?.height ?? (chase ? 1.2 : .55), lead = spec.camera?.lead ?? (chase ? 0 : .8);
  // Trackside, the operator pans to keep the car's body centred, aiming a little behind its nose; following, the camera car keeps pace.
  const target: Vec3 = [carX - lead, .7, 0];
  // A camera car shakes a little on the road: a few millimetres to a centimetre, from the distance it has travelled.
  const shake = spec.camera?.shake ?? (moving ? .012 : 0), d = chase ? chaseX(spec, frame, fps, clock) : travelled;
  const jitter = (k: number) => shake * (.6 * Math.sin(d * 3.1 + k) + .4 * Math.sin(d * 7.7 + 2 * k));
  const x = chase ? d : mode === "follow" ? carX + (spec.camera?.along ?? 2) : 0, fov = spec.camera?.fov ?? (chase ? 13 : 26);
  // A dolly zoom keeps the car's size: the camera slides along its line to the car to where the car's outline, through the changing lens,
  // covers what it would through the starting lens. A plane held instead misses: side-on from 3.7 m, holding the car's centre line made
  // it look 13 % smaller at 11 m, and holding its near side 18 % larger, because the rounded body's outline lies between them.
  const zoom = mode === "follow" ? dollyZoomAt(spec, frame, fov) : { fov, scale: 1 };
  const base: Vec3 = [x, riseHeight(spec, height, frame, clock), side], toward = base.map((value, k) => value - target[k]) as unknown as Vec3;
  const reach = Math.hypot(...toward), u = toward.map(value => value / reach) as unknown as Vec3;
  let distance = reach;
  if (zoom.scale !== 1) {
    const outline = body.outline ?? roundedOutline(body), size = outlineSize(outline, carX, base, target, fov);
    distance = holdDistance(outline, carX, target, u, zoom.fov, size, bodyExit(target, u, carX, body) + .05);
  }
  const offset = target.map((value, k) => value + u[k] * distance) as unknown as Vec3;
  const pose: ShotPose = { fov: zoom.fov, position: [offset[0] + (moving ? jitter(1) : 0), offset[1] + jitter(2), offset[2] + jitter(3)], target };
  return { carX, travelled, wheelTurn: travelled / wheelRadius, ride: { lift: .004 * road(travelled), pitch: .12 * road(travelled * .7 + 3) }, pose };
}

/** How far from `from`, along the unit direction `u`, a ray leaves the car's body box: no camera on that ray comes closer. */
function bodyExit(from: Vec3, u: Vec3, carX: number, body: CarBody): number {
  const lo = [carX - body.length / 2, 0, -body.width / 2], hi = [carX + body.length / 2, body.height, body.width / 2];
  let exit = Infinity;
  for (let k = 0; k < 3; k++) if (Math.abs(u[k]) > 1e-9) exit = Math.min(exit, ((u[k] > 0 ? hi[k] : lo[k]) - from[k]) / u[k]);
  return Number.isFinite(exit) ? Math.max(0, exit) : 0;
}
const ROUNDED = new Map<string, Float32Array>();
/** Points on a rounded box of the body's size (a superellipsoid with square-root profiles): a stand-in for a car's outline. */
function roundedOutline(body: CarBody): Float32Array {
  const key = `${body.length}x${body.width}x${body.height}`, root = (v: number) => Math.sign(v) * Math.sqrt(Math.abs(v)), n = 40;
  let points = ROUNDED.get(key);
  if (!points) {
    const out: number[] = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) {
      const a = Math.PI * i / n - Math.PI / 2, b = 2 * Math.PI * j / n - Math.PI;
      out.push(body.length / 2 * root(Math.cos(a)) * root(Math.cos(b)), body.height / 2 * (1 + root(Math.sin(a))), body.width / 2 * root(Math.cos(a)) * root(Math.sin(b)));
    }
    ROUNDED.set(key, points = Float32Array.from(out));
  }
  return points;
}
/** The car's size on screen from a camera at `eye` aiming at `target` through a lens of `fov` degrees: the square root of the width times
 * the height its outline covers, in frame heights. A point at or behind the camera makes it endless. */
function outlineSize(outline: Float32Array, carX: number, eye: Vec3, target: Vec3, fov: number): number {
  const fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2], fl = Math.hypot(fx, fy, fz), f = [fx / fl, fy / fl, fz / fl];
  const rl = Math.hypot(f[2], f[0]), r = [-f[2] / rl, 0, f[0] / rl], up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < outline.length; i += 3) {
    const dx = outline[i] + carX - eye[0], dy = outline[i + 1] - eye[1], dz = outline[i + 2] - eye[2], depth = dx * f[0] + dy * f[1] + dz * f[2];
    if (depth <= 1e-3) return Infinity;
    const x = (dx * r[0] + dz * r[2]) / depth, y = (dx * up[0] + dy * up[1] + dz * up[2]) / depth;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return Math.sqrt((x1 - x0) * (y1 - y0)) / (2 * Math.tan(fov * Math.PI / 360));
}
/** The camera's distance from `target`, along the unit direction `u`, at which the car's outline through a lens of `fov` covers `size`. The
 * outline shrinks as the camera backs away, so a bisection from just outside the body finds it. */
function holdDistance(outline: Float32Array, carX: number, target: Vec3, u: Vec3, fov: number, size: number, near: number): number {
  const at = (distance: number) => outlineSize(outline, carX, target.map((value, k) => value + u[k] * distance) as unknown as Vec3, target, fov);
  let lo = near, hi = Math.max(1, 2 * near);
  while (at(hi) > size && hi < 1e5) hi *= 2;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (at(mid) > size) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** A dolly zoom's lens at a content frame, eased from `fov` to `to` over the zoom's frames, and tan(fov / 2) at the start over tan(fov / 2)
 * now: how far a flat subject's distance would grow to keep its size. */
export function dollyZoomAt(spec: Pick<TrackPassSpec, "camera" | "durationFrames">, frame: number, fov: number): { fov: number; scale: number } {
  const zoom = spec.camera?.dollyZoom;
  if (!zoom) return { fov, scale: 1 };
  const start = zoom.start ?? 0, end = zoom.end ?? spec.durationFrames - 1, x = Math.min(1, Math.max(0, (frame - start) / Math.max(1, end - start)));
  const e = x * x * (3 - 2 * x), now = fov + (zoom.to - fov) * e, half = (degrees: number) => Math.tan(degrees * Math.PI / 360);
  return { fov: now, scale: half(fov) / half(now) };
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
  const zoom = spec.camera?.dollyZoom;
  if (zoom) {
    if (spec.camera?.mode !== "follow") problems.push({ code: "race-dolly-zoom-mode", severity: "error", message: "A dolly zoom needs a camera locked to the car (\"mode\": \"follow\"), which keeps the car's size as the lens changes." });
    if (!(zoom.to >= 8 && zoom.to <= 90)) problems.push({ code: "race-dolly-zoom-lens", severity: "error", message: "A dolly zoom ends on a lens of 8 to 90 degrees." });
    const start = zoom.start ?? 0, end = zoom.end ?? spec.durationFrames - 1;
    if (!(Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end < spec.durationFrames && end - start >= Math.round(fps * .5)))
      problems.push({ code: "race-dolly-zoom-frames", severity: "error", message: "A dolly zoom runs at least 0.5 s, inside the shot." });
    const from = spec.camera?.fov ?? 26, ratio = Math.tan(from * Math.PI / 360) / Math.tan(zoom.to * Math.PI / 360);
    if (ratio > .8 && ratio < 1.25) problems.push({ code: "race-dolly-zoom-small", severity: "warning", message: `From ${from}° to ${zoom.to}° the camera moves only ${Math.round(Math.abs(1 - ratio) * 100)} %; the background barely changes.` });
  }
  if (spec.title) {
    if (trackside && Math.abs(spec.title.enter - spec.passFrame) < fps * .5) problems.push({ code: "race-title-at-pass", severity: "warning", message: "The title enters at the pass, where the eye is on the car. Bring it in before the approach or after the car has gone." });
    const words = spec.title.text.split(/\s+/).filter(Boolean).length + (spec.title.sub?.split(/\s+/).filter(Boolean).length ?? 0);
    if (((spec.title.exit ?? spec.durationFrames) - spec.title.enter) / fps < words / 3 + .8) problems.push({ code: "race-title-short", severity: "error", message: "The title is not on screen long enough to read." });
  }
  return problems;
}
