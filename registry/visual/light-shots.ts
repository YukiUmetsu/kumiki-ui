/** Pure maths for the light recipes: water surfaces as a function of the frame, and the timing rules for showing light through things.
 * Nothing here reads a clock or a random source, so a surface, and the caustics it focuses, are the same at a frame in any order.
 */
import type { OrbitView, TextBeat } from "./studio-shots";

/** A long, low swell travelling across the surface. Several with different directions make calm water look alive. */
export interface Swell { direction: number; wavelength: number; amplitude: number; speed: number; phase?: number }
/** A drop landing: rings spread from the impact point at `speed`, fade with time and distance, and leave a train of smaller rings. */
export interface DropImpact { x: number; z: number; frame: number; amplitude?: number; speed?: number; wavelength?: number }
export interface WaterSurfaceSpec { swells: readonly Swell[]; drops?: readonly DropImpact[] }

/** Default swells for a sunlit pool: six crossing ripple trains a few millimetres high, at unrelated angles and wavelengths so the
 * pattern never repeats into a grid. Caustics come from curvature, not height: a
 * ripple focuses light at about 1 / ((n - 1) · amplitude · k²) below the surface, so these short, steep ripples bring the focus near a
 * half-metre floor, where the light gathers into the familiar web. Long, low swells focus metres too deep and leave the floor flat. */
export const CALM_POOL: readonly Swell[] = [
  { direction: 18, wavelength: .37, amplitude: .0038, speed: .2 },
  { direction: 77, wavelength: .29, amplitude: .0026, speed: .18, phase: 2.3 },
  { direction: 131, wavelength: .23, amplitude: .0022, speed: .16, phase: 1.1 },
  { direction: 197, wavelength: .19, amplitude: .0016, speed: .15, phase: 4.1 },
  { direction: 251, wavelength: .15, amplitude: .0011, speed: .13, phase: 5.6 },
  { direction: 318, wavelength: .127, amplitude: .0008, speed: .12, phase: .7 },
];

/** Surface height above rest at a point, at a time in seconds. */
export function waterHeight(spec: WaterSurfaceSpec, x: number, z: number, seconds: number, fps = 30): number {
  let h = 0;
  for (const s of spec.swells) {
    const a = s.direction * Math.PI / 180, k = 2 * Math.PI / s.wavelength;
    h += s.amplitude * Math.sin(k * (x * Math.cos(a) + z * Math.sin(a)) - k * s.speed * seconds + (s.phase ?? 0));
  }
  for (const d of spec.drops ?? []) {
    const t = seconds - d.frame / fps;
    if (t <= 0) continue;
    const speed = d.speed ?? .32, wavelength = d.wavelength ?? .11, r = Math.hypot(x - d.x, z - d.z), front = r - speed * t;
    // A packet of rings behind the leading front; it spreads and weakens as it travels, like a real ripple.
    const width = .1 + .18 * t, envelope = Math.exp(-(((front + width * .6) / width) ** 2));
    const amp = (d.amplitude ?? .012) * Math.exp(-t * .55) / (1 + r * 2.2);
    h += amp * envelope * Math.cos(2 * Math.PI * front / wavelength);
  }
  return h;
}

/** Recipe 6: light through water. A drop lands on calm water and the rings it sends out focus the light into moving lines on the floor. */
export interface LightThroughSpec {
  durationFrames: number;
  /** The drop's landing frame and point on the surface. Omit for calm water only. */
  drop?: { frame: number; x: number; z: number };
  /** Calm-water swells. @default CALM_POOL */
  swells?: readonly Swell[];
  /** Camera around the floor's centre. */
  view: OrbitView;
  /** Degrees the camera drifts through the shot. @default 6 */
  orbit?: number;
  title?: TextBeat;
}

export interface LightShotProblem { code: string; severity: "error" | "warning"; message: string }
/** Checks a light shot: the drop must land early enough for its rings to be seen, and text must wait for the light to arrive. */
export function inspectLightShot(spec: LightThroughSpec, fps = 30): LightShotProblem[] {
  const problems: LightShotProblem[] = [];
  if (spec.drop && (spec.durationFrames - spec.drop.frame) / fps < 2.5) problems.push({ code: "light-rings-short", severity: "error", message: "The rings need about 2.5 s after the drop lands to spread across the floor; land the drop earlier or lengthen the shot." });
  if (spec.drop && spec.drop.frame / fps < .4) problems.push({ code: "light-drop-early", severity: "warning", message: "A drop that lands in the first 0.4 s is missed: let the calm surface and its light register first." });
  if (spec.title && spec.drop && spec.title.enter < spec.drop.frame + 20) problems.push({ code: "light-text-early", severity: "error", message: "The title enters before the rings have reached the floor. Text should name what the viewer has just seen." });
  if (Math.abs(spec.orbit ?? 6) > 15) problems.push({ code: "light-orbit-busy", severity: "warning", message: "More than 15° of camera drift competes with the moving light. Keep the camera nearly still and let the caustics move." });
  return problems;
}
