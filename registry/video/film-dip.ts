/** Dips and fades: the picture goes to a flat colour and comes back.
 *
 * - **Dip** (`{ "kind": "dip" }` on a transition): the outgoing scene fades to a colour, the colour holds, and the incoming scene fades up
 *   out of it. A dip can carry one line of text on its hold ("Three days later"). It marks a jump in time or place, a chapter, or a
 *   breath before the next beat, where a dissolve would blend two pictures that have nothing to do with each other.
 * - **Fade** (`"fade"` on the film): the film opens from a colour and ends on one.
 *
 * Practice (doc 34, T1): 14% of the frames sampled from fifteen measured trailers are black; ten open on black, fourteen end on black,
 * and every one has black frames inside it. Kumiki had no way to make any of them.
 *
 * Fades are worked out in linear light. A black veil of opacity `a` over sRGB pixels darkens mid-tones faster than highlights, so a
 * picture goes muddy on its way down. Light falls off evenly when the veil's opacity follows `1 - (1 - t)^(1/2.2)`.
 */

export interface FilmDipSpec {
  /** The colour the picture dips through. @default "#000000" */
  color?: string;
  /** Frames the colour holds at full strength, between the fade out and the fade in. @default 6, or the line's reading time */
  holdFrames?: number;
  /** One short line, set on the colour while it holds. */
  text?: string;
}
export interface FilmFade {
  /** Frames the film takes to come up from the colour. */
  in?: number;
  /** Frames the film takes to go down to the colour at its end. */
  out?: number;
  /** @default "#000000" */
  color?: string;
}
/** A dip as the stage draws it, by incoming scene ID. */
export interface FilmDip { color: string; hold: number; text?: string; ink: string }
export interface CompiledFade { in: number; out: number; color: string }
export interface DipProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** Default length of a dip without text: eight frames down, six held, eight up, at 30 fps. */
export const DIP_FRAMES = 22;
const DIP_HOLD = 6;
const COLOR = /^#[0-9a-f]{6}$/i;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** The same reading time as the cards: 0.8 s to find the line, then three words a second. */
const readingSeconds = (text: string) => .8 + words(text) / 3;

/** Relative luminance of a `#rrggbb` colour, 0 (black) to 1 (white). */
export function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
/** Text colour for a line set on `color`: near-white on a dark colour, near-black on a light one. */
export const inkFor = (color: string) => luminance(color) > .32 ? "#101418" : "#f6f4ef";

/** Opacity of a flat veil that lets light fall off evenly as `t` goes from 0 (no veil) to 1 (all colour). */
export const veilOpacity = (t: number) => { const v = Math.min(1, Math.max(0, t)); return 1 - (1 - v) ** (1 / 2.2); };
const ease = (t: number) => { const v = Math.min(1, Math.max(0, t)); return v * v * (3 - 2 * v); };

/** Default hold of a dip: six frames, or the line's reading time. */
export function dipHoldFrames(spec: FilmDipSpec, rate: number): number {
  return spec.holdFrames ?? (spec.text ? Math.ceil(readingSeconds(spec.text) * rate) : DIP_HOLD);
}
/** Default length of a dip: its hold plus eight frames each way. */
export function dipFrames(spec: FilmDipSpec, rate: number): number {
  return dipHoldFrames(spec, rate) + 16;
}

/** A dip `frames` long at `progress` (0 on its first frame, 1 on its last). `veil` is the colour's opacity; `incoming` says which scene
 * shows under it; `text` is the line's opacity. The fade out ends on full colour, the hold stays there, and the fade in ends one step
 * short of clear, so the next frame, the incoming scene alone, continues it. */
export function dipFrame(dip: Pick<FilmDip, "hold">, progress: number, frames: number): { veil: number; incoming: boolean; text: number } {
  const i = Math.round(Math.min(1, Math.max(0, progress)) * (frames - 1)), hold = Math.min(dip.hold, frames);
  const down = Math.floor((frames - hold) / 2), up = frames - hold - down;
  if (i < down) return { veil: veilOpacity(ease((i + 1) / down)), incoming: false, text: 0 };
  if (i >= down + hold) return { veil: veilOpacity(ease((frames - i) / (up + 1))), incoming: true, text: 0 };
  // The line comes up and goes down over a quarter of the hold, at most four frames, so the picture never cuts it off.
  const into = i - down, edge = Math.min(4, Math.max(1, hold / 4));
  return { veil: 1, incoming: into >= hold / 2, text: Math.min(1, (into + 1) / edge, (hold - into) / edge) };
}
/** Frames at the start of the incoming scene that the dip keeps under full colour: anything that happens there is never seen. */
export function dipHiddenFrames(dip: Pick<FilmDip, "hold">, frames: number): number {
  const hold = Math.min(dip.hold, frames);
  return Math.floor((frames - hold) / 2) + hold;
}
/** The film's fade veil at an absolute frame: rising from the colour over `in` frames, falling to it over the last `out`. */
export function fadeVeil(fade: CompiledFade, frame: number, durationFrames: number): number {
  const up = fade.in > 0 && frame < fade.in ? 1 - frame / fade.in : 0;
  const down = fade.out > 0 && frame >= durationFrames - fade.out ? (frame - (durationFrames - fade.out) + 1) / fade.out : 0;
  return veilOpacity(ease(Math.max(up, down)));
}

/** Checks a dip on the transition into a scene. `frames` is the transition's length. */
export function inspectDip(spec: FilmDipSpec, frames: number, rate: number, path: string): { dip?: FilmDip; problems: DipProblem[] } {
  const problems: DipProblem[] = [], say = (severity: DipProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const color = spec.color ?? "#000000", hold = dipHoldFrames(spec, rate);
  if (!COLOR.test(color)) say("error", "dip-color", "/color", "A dip's colour is a #rrggbb colour.");
  if (!(Number.isSafeInteger(hold) && hold >= 0)) say("error", "dip-hold", "/holdFrames", "A dip holds a whole number of frames, 0 or more.");
  if (spec.text !== undefined && !spec.text.trim()) say("error", "dip-text", "/text", "A dip's line is empty.", "Leave `text` out for a plain dip.");
  if (problems.some(item => item.severity === "error")) return { problems };
  const side = (frames - hold) / 2;
  if (side < 2) {
    say("error", "dip-frames", "/durationFrames", `A ${frames}-frame dip that holds ${hold} frames has no time to fade.`, `Give it at least ${hold + 4} frames, or hold less.`);
    return { problems };
  }
  if (side < rate * .13 || side > rate * .6)
    say("warning", "dip-timing", "/durationFrames", `Each fade of this dip takes ${(side / rate).toFixed(2)} s.`, side < rate * .13 ? "Under about 4 frames, it reads as a flash of colour, not a dip." : "Over 0.6 s, the picture lingers half-dark; the viewer waits.");
  const light = luminance(color) > .8, seconds = hold / rate;
  if (spec.text) {
    const need = readingSeconds(spec.text);
    if (seconds < need) say("warning", "dip-text-time", "/holdFrames", `"${spec.text}" holds ${seconds.toFixed(1)} s and needs about ${need.toFixed(1)} s to read.`, `Hold it ${Math.ceil(need * rate)} frames, or leave holdFrames out.`);
    else if (seconds > need + 1.5) say("warning", "dip-hold-long", "/holdFrames", `The line holds ${seconds.toFixed(1)} s, well past its ${need.toFixed(1)} s reading time.`);
    if (words(spec.text) > 8) say("warning", "dip-text-long", "/text", "A dip carries one short line: a time, a place or a title.", "Move the rest into the next scene.");
  } else if (seconds > 1.5) say("warning", "dip-hold-long", "/holdFrames", `The colour holds ${seconds.toFixed(1)} s with nothing on it.`, "Over 1.5 s of an empty frame, the viewer wonders whether the film has stopped.");
  if (light && seconds > .5) say("warning", "dip-white-long", "/holdFrames", `A dip to a light colour holds ${seconds.toFixed(1)} s.`, "A bright frame tires the eye; hold a light dip 2 to 15 frames.");
  return { dip: { color, hold, text: spec.text?.trim(), ink: inkFor(color) }, problems };
}

/** Checks the film's fade. */
export function inspectFade(fade: FilmFade, durationFrames: number, rate: number, loops: boolean): { fade?: CompiledFade; problems: DipProblem[] } {
  const problems: DipProblem[] = [], say = (severity: DipProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: "/fade" + at, message, hint });
  const color = fade.color ?? "#000000", up = fade.in ?? 0, down = fade.out ?? 0;
  if (!COLOR.test(color)) say("error", "fade-color", "/color", "A fade's colour is a #rrggbb colour.");
  for (const [key, value] of [["in", up], ["out", down]] as const)
    if (!(Number.isSafeInteger(value) && value >= 0 && value <= rate * 4)) say("error", "fade-frames", "/" + key, `A fade ${key} runs 0 to ${Math.round(rate * 4)} frames (4 s).`);
  if (up + down > durationFrames) say("error", "fade-frames", "", "The fades in and out are longer than the film.");
  if (problems.length) return { problems };
  if (loops && down) say("warning", "fade-loop", "/out", "A looping film ends on its first frame, so a fade out leaves a dark frame in the replay.", "Drop `fade.out`, or the loop.");
  for (const [key, value] of [["in", up], ["out", down]] as const)
    if (value && value < rate * .2) say("warning", "fade-short", "/" + key, `A ${(value / rate).toFixed(2)} s fade ${key} reads as a flicker.`, "Fade over 0.3 to 1.5 s.");
  return { fade: { in: up, out: down, color }, problems };
}
