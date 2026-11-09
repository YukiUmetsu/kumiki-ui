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
  /** The camera. `trackside` stands still beside the track and pans with the car; `follow` rides alongside it, `along` metres ahead
   * (+) or behind (−), so the car holds its place in frame and the track streams past. `side` is metres from the car's line (negative
   * for the far side), then height, lens (vertical field of view, degrees), and how far behind the nose it aims, in metres.
   * @default trackside, 8, .55, 26, .8 */
  camera?: { mode?: "trackside" | "follow"; along?: number; side?: number; height?: number; fov?: number; lead?: number };
  title?: TextBeat;
}

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

export function trackPassState(spec: TrackPassSpec, frame: number, fps: number, wheelRadius = .34): TrackPassState {
  const v = spec.speed ?? 58, t = (frame - spec.passFrame) / fps, carX = v * t, travelled = v * frame / fps;
  const side = spec.camera?.side ?? 8, height = spec.camera?.height ?? .55, lead = spec.camera?.lead ?? .8, follow = spec.camera?.mode === "follow";
  // Trackside, the operator pans to keep the car's body centred, aiming a little behind its nose; following, the camera car keeps pace.
  const target: Vec3 = [carX - lead, .7, 0];
  const pose: ShotPose = { fov: spec.camera?.fov ?? 26, position: [follow ? carX + (spec.camera?.along ?? 2) : 0, height, side], target };
  return { carX, travelled, wheelTurn: travelled / wheelRadius, ride: { lift: .004 * road(travelled), pitch: .12 * road(travelled * .7 + 3) }, pose };
}

export interface RaceProblem { code: string; severity: "error" | "warning"; message: string }
/** Craft rules for a trackside pass. */
export function inspectTrackPass(spec: TrackPassSpec, fps = 30): RaceProblem[] {
  const problems: RaceProblem[] = [], v = spec.speed ?? 58, trackside = spec.camera?.mode !== "follow";
  if (trackside && !(spec.passFrame > 0 && spec.passFrame < spec.durationFrames)) problems.push({ code: "race-pass-outside", severity: "error", message: `The pass at frame ${spec.passFrame} is outside the shot. The pass is the point of the shot; put it inside.` });
  if (trackside && spec.passFrame / fps < .8) problems.push({ code: "race-approach-short", severity: "warning", message: "The car reaches the camera in under 0.8 s: there is no approach to anticipate." });
  if (trackside && (spec.durationFrames - spec.passFrame) / fps < .6) problems.push({ code: "race-exit-short", severity: "warning", message: "The shot ends within 0.6 s of the pass, so the car never leaves; let it race away." });
  if (v < 10 || v > 100) problems.push({ code: "race-speed", severity: "warning", message: `${v} m/s (${Math.round(v * 3.6)} km/h) is outside a race car's range of about 10 to 100 m/s.` });
  if (Math.abs(spec.camera?.side ?? 8) < 4) problems.push({ code: "race-camera-close", severity: "warning", message: "The camera stands under 4 m from the car's line; a trackside camera that close would be inside the kerb." });
  if (spec.title) {
    if (trackside && Math.abs(spec.title.enter - spec.passFrame) < fps * .5) problems.push({ code: "race-title-at-pass", severity: "warning", message: "The title enters at the pass, where the eye is on the car. Bring it in before the approach or after the car has gone." });
    const words = spec.title.text.split(/\s+/).filter(Boolean).length + (spec.title.sub?.split(/\s+/).filter(Boolean).length ?? 0);
    if (((spec.title.exit ?? spec.durationFrames) - spec.title.enter) / fps < words / 3 + .8) problems.push({ code: "race-title-short", severity: "error", message: "The title is not on screen long enough to read." });
  }
  return problems;
}
