/**
 * Sculptural typography — looks (registry item `sculptural-type`).
 *
 * A look is everything about the letters that can be configured and animated: the text and font, the relief
 * profile, depth, width, height and tracking, and the colour (a solid colour or a gradient with any number of stops,
 * across the whole text or within each letter, with an optional separate colour for the sides and back).
 *
 * Colours interpolate in linear light, so a blend from red to green passes through a clean yellow-brown, not a muddy
 * grey. Gradients are evaluated per vertex.
 */

import type { ReliefProfile, ResolvedProfile } from "./sculptural-type-field";

export interface SculptGradientStop {
  /** Position along the gradient, 0–1. */
  at: number;
  /** `#rgb` or `#rrggbb`. */
  color: string;
}

export interface SculptGradient {
  /** @default "linear" */
  kind?: "linear" | "radial";
  stops: readonly SculptGradientStop[];
  /** Direction of a linear gradient in degrees: 0 runs left to right, 90 bottom to top. @default 90 */
  angle?: number;
  /** Spread the gradient across the whole text, or repeat it within each letter. @default "text" */
  space?: "text" | "letter";
}

export interface SculptLook {
  text: string;
  /** CSS font shorthand with a pixel size; the size is the resolution of one em. */
  font: string;
  profile: ReliefProfile;
  /** Depth behind the face edge, em. */
  depth: number;
  /** Horizontal scale of each letter (1 = as drawn); the spacing grows with it. */
  width: number;
  /** Vertical scale of each letter. */
  height: number;
  /** Extra space between units, em. */
  tracking: number;
  /** Face colour. */
  color: string;
  /** Colour of the walls and back. Default: the face colour or gradient. */
  sideColor?: string;
  /** Overrides `color` on the face (and on the sides unless `sideColor` is set). */
  gradient?: SculptGradient;
}

export type LinearRgb = [number, number, number];

const decode = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Parse `#rgb` or `#rrggbb` into linear-light RGB 0–1. */
export function parseColour(value: string): LinearRgb {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new RangeError(`Colour "${value}" must be #rgb or #rrggbb.`);
  const n = parseInt(full, 16);
  return [decode(((n >> 16) & 255) / 255), decode(((n >> 8) & 255) / 255), decode((n & 255) / 255)];
}

export interface Box2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Where (x, y) sits along a gradient laid over `box`: 0 at the start, 1 at the end (clamped). */
export function gradientParameter(gradient: SculptGradient, x: number, y: number, box: Box2): number {
  const w = Math.max(box.maxX - box.minX, 1e-9);
  const h = Math.max(box.maxY - box.minY, 1e-9);
  if (gradient.kind === "radial") {
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    return Math.min(1, Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2)) / Math.SQRT2);
  }
  const angle = ((gradient.angle ?? 90) * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // Project the box corners to find the gradient's extent along its direction.
  const corners = [[box.minX, box.minY], [box.maxX, box.minY], [box.minX, box.maxY], [box.maxX, box.maxY]].map(([cx, cy]) => cx * dx + cy * dy);
  const lo = Math.min(...corners);
  const hi = Math.max(...corners);
  return Math.min(1, Math.max(0, (x * dx + y * dy - lo) / Math.max(hi - lo, 1e-9)));
}

/** A gradient's colour at parameter `s`, interpolated between its stops in linear light. */
export function gradientColour(stops: readonly { at: number; rgb: LinearRgb }[], s: number, out: LinearRgb): LinearRgb {
  if (stops.length === 0) {
    out[0] = out[1] = out[2] = 1;
    return out;
  }
  if (s <= stops[0].at) return copy(stops[0].rgb, out);
  for (let i = 1; i < stops.length; i += 1) {
    if (s <= stops[i].at) {
      const a = stops[i - 1];
      const b = stops[i];
      const f = (s - a.at) / Math.max(b.at - a.at, 1e-9);
      out[0] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f;
      out[1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f;
      out[2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f;
      return out;
    }
  }
  return copy(stops[stops.length - 1].rgb, out);
}

function copy(a: LinearRgb, out: LinearRgb): LinearRgb {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

/** A look's colouring, parsed once: face stops (a solid colour is one stop) and optional side colour. */
export interface ResolvedColouring {
  stops: { at: number; rgb: LinearRgb }[];
  gradient?: SculptGradient;
  side?: LinearRgb;
}

export function resolveColouring(look: Pick<SculptLook, "color" | "gradient" | "sideColor">): ResolvedColouring {
  const stops = look.gradient && look.gradient.stops.length > 0
    ? [...look.gradient.stops].sort((a, b) => a.at - b.at).map((stop) => ({ at: Math.min(1, Math.max(0, stop.at)), rgb: parseColour(stop.color) }))
    : [{ at: 0, rgb: parseColour(look.color) }];
  return { stops, gradient: look.gradient && look.gradient.stops.length > 0 ? look.gradient : undefined, side: look.sideColor ? parseColour(look.sideColor) : undefined };
}

/** Colour of a point: on a side (walls, back) when `side` is true, in text and letter boxes for both gradient spaces. */
export function colouringAt(colouring: ResolvedColouring, x: number, y: number, side: boolean, textBox: Box2, letterBox: Box2, out: LinearRgb): LinearRgb {
  if (side && colouring.side) return copy(colouring.side, out);
  if (!colouring.gradient) return copy(colouring.stops[0].rgb, out);
  const box = colouring.gradient.space === "letter" ? letterBox : textBox;
  return gradientColour(colouring.stops, gradientParameter(colouring.gradient, x, y, box), out);
}

/** Two looks share geometry when their outlines would be identical. */
export function sameOutline(a: Pick<SculptLook, "text" | "font">, b: Pick<SculptLook, "text" | "font">): boolean {
  return a.text === b.text && a.font === b.font;
}

/** Profiles of the same kind and bevel width differ only in height, which a z scale can animate without re-meshing. */
export function sameProfileShape(a: ReliefProfile, b: ReliefProfile): boolean {
  if (a.kind !== b.kind) return false;
  if ((a.kind === "chamfer" || a.kind === "round") && (b.kind === "chamfer" || b.kind === "round")) return Math.abs(a.width - b.width) < 1e-9;
  if (a.kind === "chisel" && b.kind === "chisel") return Math.abs(a.angle - b.angle) < 1e-9 && a.height === b.height;
  return true;
}

/** Peak height of a profile in em, for height-only animation (chisel peaks depend on the field; 1 marks "unchanged"). */
export function profileHeight(profile: ReliefProfile): number {
  switch (profile.kind) {
    case "flat": return 0;
    case "chamfer": case "round": case "pillow": return profile.height;
    case "chisel": return 1;
  }
}

/** A profile that blends two resolved profiles: heights, slopes and peaks interpolate. */
export function blendProfiles(a: ResolvedProfile, b: ResolvedProfile, t: number): ResolvedProfile {
  return {
    height: (d) => a.height(d) + (b.height(d) - a.height(d)) * t,
    slope: (d) => a.slope(d) + (b.slope(d) - a.slope(d)) * t,
    peak: a.peak + (b.peak - a.peak) * t,
  };
}
