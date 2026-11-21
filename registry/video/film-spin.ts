/** Spin and zoom-blur cuts: two short-form transitions that hide the cut inside one fast move, blurred along that move (VE1.3).
 *
 * - **Spin** (`{ "kind": "spin" }`): the picture turns about the frame's centre, faster and faster, and cuts at the fastest point; the
 *   next scene finishes the turn and settles. Each scene is enlarged just enough to keep the frame covered at its angle, so the move
 *   swells as it turns. `turn` is the whole turn in degrees (default 180, half in each scene); `direction` "right" turns clockwise.
 * - **Zoom blur** (`{ "kind": "zoom-blur" }`): the outgoing scene pushes in, faster and faster, and cuts at the fastest point; the
 *   incoming scene starts pushed in and pulls back to rest. `zoom` is the scale at the cut (default 1.8).
 *
 * Both are blurred by how far the picture moves in half a frame (a 180° shutter): a turn smears along circles about the centre, a zoom
 * along rays from it (`film-blur-react.tsx`). Practice: spin and zoom transitions with radial or rotational blur are stock transitions in
 * short-form editors and in velocity edits ([CapCut](https://www.capcut.com/resource/how-to-do-velocity-on-capcut)). Reduced motion
 * plays a dissolve instead.
 */

export const SPIN_FRAMES = 14, ZOOM_BLUR_FRAMES = 10;
export interface FilmSpinCut { kind: "spin" | "zoom-blur"; turn: number; zoom: number; clockwise: boolean }
export interface SpinMatrix { a: number; b: number; c: number; d: number; e: number; f: number }
/** One frame of a spin or zoom-blur cut: each scene's transform, which one shows, and the blur (a turn in radians, a zoom fraction). */
export interface SpinCutFrame { outgoing: SpinMatrix; incoming: SpinMatrix; showIncoming: boolean; spin: number; zoom: number }
export interface SpinProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** The most blur a frame takes: past these the smear is a wash, and a turn's first-order blur shrinks the picture. */
const MAX_TURN_BLUR = 24 * Math.PI / 180, MAX_ZOOM_BLUR = .25;
const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeSlope = (t: number) => t < .5 ? 12 * t * t : 12 * (1 - t) * (1 - t);

/** The scale that keeps a `width` × `height` frame covered by the picture turned by `degrees` about its centre. */
export function turnCover(width: number, height: number, degrees: number): number {
  const r = degrees * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return Math.max((width * c + height * s) / width, (width * s + height * c) / height);
}
/** A scale and turn about the frame's centre, as a CSS matrix. */
function about(width: number, height: number, scale: number, degrees: number): SpinMatrix {
  const r = degrees * Math.PI / 180, a = scale * Math.cos(r), b = scale * Math.sin(r), cx = width / 2, cy = height / 2;
  return { a, b, c: -b, d: a, e: cx - (a * cx - b * cy), f: cy - (b * cx + a * cy) };
}

/** A cut's frame at `progress` (0 to 1) over `frames` frames. */
export function spinCutFrame(cut: FilmSpinCut, progress: number, frames: number, width: number, height: number): SpinCutFrame {
  const t = Math.min(1, Math.max(0, progress)), showIncoming = t >= .5, perFrame = easeSlope(t) / Math.max(1, frames);
  if (cut.kind === "spin") {
    const sign = cut.clockwise ? 1 : -1, angle = sign * cut.turn * ease(t), shown = showIncoming ? angle - sign * cut.turn : angle;
    // Half a frame of turn, the 180° shutter; the picture is enlarged to cover the frame across the whole smear.
    const blur = Math.min(MAX_TURN_BLUR, .5 * cut.turn * perFrame * Math.PI / 180), half = blur * 90 / Math.PI;
    const scale = Math.max(turnCover(width, height, shown - half), turnCover(width, height, shown), turnCover(width, height, shown + half));
    const matrix = about(width, height, scale, shown);
    return { outgoing: matrix, incoming: matrix, showIncoming, spin: blur, zoom: 0 };
  }
  // The outgoing scene pushes in, accelerating into the cut; the incoming one starts pushed in and settles back, decelerating.
  const scale = showIncoming ? 1 + (cut.zoom - 1) * (2 - 2 * t) ** 3 : 1 + (cut.zoom - 1) * (2 * t) ** 3;
  const speed = (cut.zoom - 1) * 3 * (showIncoming ? (2 - 2 * t) ** 2 : (2 * t) ** 2) * 2 / Math.max(1, frames);
  const matrix = about(width, height, scale, 0);
  return { outgoing: matrix, incoming: matrix, showIncoming, spin: 0, zoom: Math.min(MAX_ZOOM_BLUR, .5 * speed / scale) };
}

/** Checks a spin or zoom-blur transition and resolves its defaults. */
export function inspectSpinCut(transition: { kind: "spin" | "zoom-blur"; turn?: number; zoom?: number; direction?: string; durationFrames?: number }, fps: number, path: string): { cut?: FilmSpinCut; problems: SpinProblem[] } {
  const problems: SpinProblem[] = [], say = (severity: SpinProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const turn = transition.turn ?? 180, zoom = transition.zoom ?? 1.8, frames = transition.durationFrames ?? (transition.kind === "spin" ? SPIN_FRAMES : ZOOM_BLUR_FRAMES);
  if (transition.kind === "spin" && !(turn >= 90 && turn <= 720)) say("error", "spin-turn", "/turn", "A spin turns 90 to 720 degrees.");
  if (transition.kind === "zoom-blur" && !(zoom >= 1.2 && zoom <= 4)) say("error", "zoom-blur-zoom", "/zoom", "A zoom-blur cut zooms to 1.2 to 4 times at the cut.");
  if (transition.direction !== undefined && transition.direction !== "left" && transition.direction !== "right") say("error", "spin-direction", "/direction", "A spin turns \"left\" (anticlockwise) or \"right\" (clockwise).");
  // Shorter than about a fifth of a second is a jump; longer than a second stops reading as one move.
  if (frames < Math.round(fps * .2) || frames > Math.round(fps)) say("warning", "spin-length", "/durationFrames", `A ${transition.kind} cut of ${frames} frames reads best between ${Math.round(fps * .2)} and ${Math.round(fps)} frames.`);
  if (problems.some(item => item.severity === "error")) return { problems };
  return { cut: { kind: transition.kind, turn, zoom, clockwise: transition.direction !== "left" }, problems };
}
