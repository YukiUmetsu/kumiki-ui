/** INK-FILM1 reveals and transitions: how a picture comes onto the paper, leaves it, and gives way to the next. Names and timing only; the stage paints them. */
export const INK_REVEAL_KINDS = ["none", "paint", "bloom", "wipe", "mist", "develop"] as const;
/**
 * `paint`   the brush goes over the picture in the order it was painted
 * `bloom`   ink spreads from a place, wet at its edge
 * `wipe`    a broad dry brush passes over it
 * `mist`    it comes out of mist in patches
 * `develop` the palest water first, the darkest ink last, as a painter builds it up
 */
export type InkRevealKind = (typeof INK_REVEAL_KINDS)[number];
export const INK_TRANSITION_KINDS = ["cut", "dissolve", "blot", "mist", "brush", "scroll", "flood"] as const;
/**
 * `blot`   a drop falls and the next picture spreads inside it
 * `mist`   mist drifts over and takes the picture with it
 * `brush`  four loads of a flat brush paint the next one over
 * `scroll` a hand scroll rolls on
 * `flood`  ink floods the paper, then drains off the next picture
 */
export type InkTransitionKind = (typeof INK_TRANSITION_KINDS)[number];
export interface InkReveal {
  kind: InkRevealKind;
  /** Seconds from the start of the shot, and how long it takes. */
  at: number; seconds: number;
  /** Softness of the front, 0–1 (default: 0.06 for paint, 0.22 otherwise). */
  soft?: number;
  /** Where a bloom starts, page units of the subject (default: the middle). */
  from?: readonly [number, number];
  /** Where a wipe goes, degrees; 0 = to the right. */
  angle?: number;
  /** Seconds between one part and the next (default 0: the parts share the time in order for `paint`, and go together for the rest). */
  stagger?: number;
}
export interface InkLeave { at: number; seconds: number }
export interface InkTransition { kind: InkTransitionKind; seconds: number; /** Where a blot or a flood starts, shares of the picture. */ from?: readonly [number, number]; seed?: number }
