/**
 * UKIYO1 drawing primitives. Motifs, figures and blocks all compile to this small set; the renderer turns it into
 * SVG and assigns colour fills to printing impressions. Prims are plain data so they can be cached and tested.
 */
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";

/** Traditional repeat patterns, printed as their own block over a fill. */
export type UkiyoePatternType = "seigaiha" | "asanoha" | "ichimatsu" | "shima" | "kanoko" | "kikko" | "yagasuri" | "uroko" | "nami" | "sakura" | "tora";
export const UKIYOE_PATTERNS: readonly UkiyoePatternType[] = ["seigaiha", "asanoha", "ichimatsu", "shima", "kanoko", "kikko", "yagasuri", "uroko", "nami", "sakura", "tora"];
export interface UkiyoePattern { type: UkiyoePatternType; color: UkiyoePaint; scale?: number; angle?: number; opacity?: number }

export type Prim =
  /** A colour block. `outline` adds a key-block stroke of that width on top. `grain` shows wood grain in the impression. */
  | { t: "fill"; d: string; fill: UkiyoeFill; outline?: number; outlineColor?: UkiyoePaint; grain?: number; pattern?: UkiyoePattern; opacity?: number; emboss?: boolean; noPrint?: boolean;
      /** Draw the outline under the fill in one pass: overlapping sub-shapes of `d` read as one outlined union. */
      union?: boolean }
  /** A carved key line: an already-widened ribbon path filled with ink. */
  | { t: "line"; d: string; color?: UkiyoePaint; opacity?: number }
  /** A thin uniform stroke (rain, ribs, rigging, hatching). */
  | { t: "stroke"; d: string; color: UkiyoePaint; width: number; opacity?: number; cap?: "round" | "butt"; dash?: string }
  /** Many dots as one path of circles. */
  | { t: "dots"; d: string; color: UkiyoePaint; opacity?: number }
  /** Atenashi (undefined-edge) glow — light from a lantern, moon or firework. */
  | { t: "glow"; cx: number; cy: number; r: number; color: UkiyoePaint; opacity?: number }
  /** Transformed group. */
  | { t: "group"; transform?: string; opacity?: number; prims: Prim[] }
  /**
   * One shape painted as a sandwich: its outline, then `between` (what the outline should disappear under), then its
   * fill. The path is emitted once and referenced twice. Used for foam whose lines must vanish where it meets other
   * white, without duplicating a large path.
   */
  | { t: "sandwich"; d: string; fill: UkiyoePaint; line: UkiyoePaint; lineWidth: number; between: Prim[]; key: string }
  /** Group clipped to a path (stripes inside a wave, pattern inside a robe). */
  /** `union`: every subpath of `d` clips on its own, so overlapping sub-shapes always add (never cancel by winding). */
  | { t: "clip"; d: string; prims: Prim[]; key: string; union?: boolean };

/** Circle as a path segment, for `dots`. */
export const circleD = (x: number, y: number, r: number) => {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
};
export const ellipseD = (cx: number, cy: number, rx: number, ry: number) => {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
};
export const rectD = (x: number, y: number, w: number, h: number) => {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
};
export const tf = (x: number, y: number, rotate = 0, sx = 1, sy = sx) => {
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
  return `translate(${f(x)} ${f(y)})` + (rotate ? ` rotate(${f(rotate)})` : "") + (sx !== 1 || sy !== 1 ? ` scale(${f(sx)} ${f(sy)})` : "");
};
