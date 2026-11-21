/** Freeze-frame intro (VE1.6): the picture stops on a moment, the world drains to grey while the subject keeps its colour, a name and a role
 * slam in beside it, and the picture plays on: the character introduction of short-form edits and heist films' "meet the crew".
 *
 * A freeze is a time map, like a stutter: the scene's content is compiled at its own length, and the scene runs `frames` longer, showing
 * content frame `at` throughout the hold. Moments after the freeze move later by the hold. The stage draws the look during the hold:
 * the grade (`mono` greys the picture, `dim` darkens it), one short flash as it stops, and the name card. On a footage scene with a
 * `subject` cutout only the background is graded, and the subject stands out in colour with a thin light edge.
 *
 * Practice: editors freeze the frame, add the name, and resume ([CapCut](https://www.capcut.com/resource/freeze-frame-final-cut-pro);
 * freeze-frame character intro templates: [Pippit](https://pippit.capcut.com/templates/freeze-effect-character-introduction-intro),
 * [FlexClip](https://www.flexclip.com/learn/character-introduction-freeze-effect-premiere-pro.html)).
 */
import type { CompiledSpeed } from "./film-speed";

export interface FilmFreezeSpec {
  /** The content frame to stop on, or one of the scene's moments. */
  at: number | string;
  /** Frames the picture holds. @default 1.6 s */
  frames?: number;
  /** The name on the card, and a short line under it. */
  name: string;
  role?: string;
  /** Where the card stands. @default "left" */
  side?: "left" | "right";
  /** How the held picture is graded. @default "mono" */
  grade?: "mono" | "dim" | "none";
  /** One short white flash as the picture stops. @default true */
  flash?: boolean;
  /** A sound as the picture stops: a kit sound, or `catalog:<id>`. Needs `audio.accents.kit`. */
  sound?: string;
}
/** A compiled freeze, in the scene's output frames. */
export interface FilmFreeze { start: number; end: number; name: string; role?: string; side: "left" | "right"; grade: "mono" | "dim" | "none"; flash: boolean; sound?: string }
export interface FreezeProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** Frames a freeze adds to its scene. */
export const freezeExtra = (freeze: Pick<FilmFreezeSpec, "frames">, fps: number) => freeze.frames ?? Math.round(fps * 1.6);
/** Frames for the card to slide in, and to leave. */
export const FREEZE_CARD_IN = 8, FREEZE_CARD_OUT = 5;

/** The time map of a frozen scene, the freeze window, and where each content frame lands. */
export function compileFreeze(spec: FilmFreezeSpec, durationFrames: number, fps: number, moment: (id: string) => number | undefined):
  { speed?: CompiledSpeed; output?: (content: number) => number; freeze?: FilmFreeze; problems: FreezeProblem[] } {
  const problems: FreezeProblem[] = [], say = (severity: FreezeProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const frames = freezeExtra(spec, fps), content = durationFrames - frames, at = typeof spec.at === "number" ? spec.at : moment(spec.at);
  if (!(Number.isSafeInteger(frames) && frames >= Math.round(fps * .6) && frames <= Math.round(fps * 4))) say("error", "freeze-frames", "/frames", `A freeze holds ${Math.round(fps * .6)} to ${Math.round(fps * 4)} frames (0.6 to 4 s).`, "Shorter and the name cannot be read; longer and the scene has stopped.");
  if (at === undefined) say("error", "freeze-moment", "/at", `"${spec.at}" is not one of this scene's moments.`);
  else if (!(Number.isSafeInteger(at) && at >= 0 && at < content)) say("error", "freeze-at", "/at", `The freeze stops on content frame ${at}, outside the scene's ${content} frames of content.`);
  if (!spec.name?.trim()) say("error", "freeze-name", "/name", "A freeze-frame intro names someone.");
  else if ([...spec.name].length > 28) say("warning", "freeze-name-long", "/name", "A name over 28 characters will not fit the card at its size.", "Use the name people call them.");
  if (spec.role !== undefined && [...spec.role].length > 40) say("warning", "freeze-role-long", "/role", "A role over 40 characters is a sentence; keep it to a few words.");
  if (spec.side !== undefined && spec.side !== "left" && spec.side !== "right") say("error", "freeze-side", "/side", "The card stands left or right.");
  if (spec.grade !== undefined && !["mono", "dim", "none"].includes(spec.grade)) say("error", "freeze-grade", "/grade", "The grade is mono, dim or none.");
  // The name, the role, and a moment to take them in.
  const words = `${spec.name} ${spec.role ?? ""}`.trim().split(/\s+/).length;
  if (problems.every(item => item.severity !== "error") && frames / fps < .5 + words / 3) say("warning", "freeze-short", "/frames", `The card is up for ${(frames / fps).toFixed(1)} s; its words need about ${(.5 + words / 3).toFixed(1)} s.`);
  if (problems.some(item => item.severity === "error")) return { problems };
  const end = at! + frames, map = Array.from({ length: durationFrames + 1 }, (_, o) => o < at! ? o : o < end ? at! : o - frames);
  return { speed: { map, rate: 1, holds: [{ start: at!, end, at: at! }] }, output: c => (c <= at! ? c : c + frames), problems,
    freeze: { start: at!, end, name: spec.name.trim(), ...spec.role?.trim() ? { role: spec.role.trim() } : {}, side: spec.side ?? "left", grade: spec.grade ?? "mono", flash: spec.flash !== false, ...spec.sound ? { sound: spec.sound } : {} } };
}

/** The freeze's state at a scene frame: whether the picture is held, how far graded (0 to 1), the card's entrance and exit (0 to 1), and the
 * flash's veil. The grade snaps in as the picture stops (over 2 frames) and snaps out as it moves again. Reduced motion keeps the grade
 * and the card and drops the flash and the slides. */
export function freezeAt(freeze: FilmFreeze, frame: number, reducedMotion = false): { held: boolean; grade: number; enter: number; leave: number; flash: number } {
  const held = frame >= freeze.start && frame < freeze.end, into = frame - freeze.start, left = freeze.end - frame;
  if (!held) return { held, grade: 0, enter: 0, leave: 0, flash: 0 };
  const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return 1 - (1 - x) ** 3; };
  return {
    held, grade: freeze.grade === "none" ? 0 : reducedMotion ? 1 : Math.min(1, (into + 1) / 2),
    enter: reducedMotion ? 1 : ease((into - 2) / FREEZE_CARD_IN), leave: reducedMotion ? 1 : ease(left / FREEZE_CARD_OUT),
    flash: freeze.flash && !reducedMotion && into < 4 ? [.7, .45, .2, .06][into] : 0,
  };
}
