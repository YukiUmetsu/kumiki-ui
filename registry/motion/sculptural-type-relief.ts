/**
 * Sculptural typography — relief shading in 2D (registry item `sculptural-type`).
 *
 * The same glyph fields that build the 3D solids can be shaded straight into pixels, for title cards and print looks
 * that live on a flat ground: letters cut from card and laid on a table, letterpress pressed into paper, foil embossed
 * out of it, and letters V-cut into stone. A unit's height field comes from its relief profile; its normal from the
 * field gradient; light from one direction (top left by default).
 *
 * - Raised styles (`cut-card`, `embossed`) return the letter face, opaque, over a soft cast shadow.
 * - Incised styles (`letterpress`, `chiselled`) return only what the cut changes: darkening, lighting and ink, as
 *   colour with alpha, so the paper or stone texture under them shows through.
 *
 * `amount` (0–1) animates the relief: a card being set down, an impression deepening, foil rising, a cut opening.
 */

import type { GlyphRaster, ReliefProfile } from "./sculptural-type-field";
import { resolveProfile, smoothField, thickestStroke } from "./sculptural-type-field";

export type ReliefStyleKind = "cut-card" | "letterpress" | "embossed" | "chiselled";

export interface ReliefStyle {
  kind: ReliefStyleKind;
  /** Card, ink, foil or gilding colour as `#rrggbb`. Default per style. */
  color?: string;
  /** Relief depth, or a card's thickness, in em. Default per style. */
  depth?: number;
  /** Override the face profile. Default per style. */
  profile?: ReliefProfile;
  /** Light direction: azimuth in degrees (0 from the right, 90 from the top), elevation in degrees. @default 135, 42 */
  light?: { azimuth?: number; elevation?: number };
  /** How far a lifted card's shadow falls and how soft it is, in em. @default 0.035 */
  shadow?: number;
}

export interface ReliefPixels {
  /** Straight-alpha RGBA, row-major. */
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  /** Block position of the top-left pixel, as in the unit's raster. */
  left: number;
  top: number;
}

interface StyleDefaults {
  color: string;
  depth: number;
  profile: ReliefProfile;
  raised: boolean;
}

const DEFAULTS: Record<ReliefStyleKind, StyleDefaults> = {
  "cut-card": { color: "#1b1a17", depth: 0.02, profile: { kind: "round", width: 0.008, height: 0.004 }, raised: true },
  letterpress: { color: "#2a2724", depth: 0.022, profile: { kind: "round", width: 0.022, height: 0.022 }, raised: false },
  embossed: { color: "#c9a54a", depth: 0.03, profile: { kind: "round", width: 0.03, height: 0.03 }, raised: true },
  chiselled: { color: "#3b3631", depth: 0.05, profile: { kind: "chisel", angle: 42 }, raised: false },
};

function hexColour(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new RangeError(`Relief colour "${hex}" must be #rrggbb.`);
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Separable box blur, applied twice (close to a Gaussian), in place on a single channel. */
function blur(channel: Float32Array, width: number, height: number, radius: number): void {
  if (radius < 1) return;
  const r = Math.round(radius);
  const tmp = new Float32Array(channel.length);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) sum += channel[y * width + Math.min(width - 1, Math.max(0, x))];
      for (let x = 0; x < width; x += 1) {
        tmp[y * width + x] = sum / (2 * r + 1);
        sum += channel[y * width + Math.min(width - 1, x + r + 1)] - channel[y * width + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
      for (let y = 0; y < height; y += 1) {
        channel[y * width + x] = sum / (2 * r + 1);
        sum += tmp[Math.min(height - 1, y + r + 1) * width + x] - tmp[Math.max(0, y - r) * width + x];
      }
    }
  }
}

/**
 * Shade one unit. `size` is pixels per em of the raster; `amount` animates the relief from 0 (flat, or a card held
 * above the table) to 1 (finished). `lift` raises a card above the table in em, for a card still being set down.
 */
export function shadeRelief(unit: GlyphRaster, field: Float32Array, style: ReliefStyle, size: number, amount = 1, lift = 0): ReliefPixels {
  const W = unit.width;
  const H = unit.height;
  const data = new Uint8ClampedArray(W * H * 4);
  const out: ReliefPixels = { data, width: W, height: H, left: unit.left, top: unit.top };
  if (unit.blank || W === 0) return out;
  const defaults = DEFAULTS[style.kind];
  const [cr, cg, cb] = hexColour(style.color ?? defaults.color);
  const t = Math.min(1, Math.max(0, amount));
  const profile = resolveProfile(style.profile ?? defaults.profile, size, thickestStroke(field));
  const depthPx = (style.depth ?? defaults.depth) * size;
  const scale = profile.peak > 0 ? (depthPx / profile.peak) * t : 0;
  const azimuth = ((style.light?.azimuth ?? 135) * Math.PI) / 180;
  const elevation = ((style.light?.elevation ?? 42) * Math.PI) / 180;
  // Raster y points down, so a light from the top has a negative y component.
  const lx = Math.cos(azimuth) * Math.cos(elevation);
  const ly = -Math.sin(azimuth) * Math.cos(elevation);
  const lz = Math.sin(elevation);
  // Gradients from a lightly smoothed field: shading without the distance transform's directional ripples.
  const smooth = smoothField(field, W, H, 1);
  const sample = (x: number, y: number) => smooth[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const sign = defaults.raised ? 1 : -1;
  const shade = new Float32Array(W * H);
  const coverage = new Float32Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const d = field[i];
      coverage[i] = Math.min(1, Math.max(0, d + 0.5));
      if (d < -1) continue;
      const slope = sign * profile.slope(Math.max(d, 0)) * scale;
      const gx = (sample(x + 1, y) - sample(x - 1, y)) / 2;
      const gy = (sample(x, y + 1) - sample(x, y - 1)) / 2;
      const nx = -slope * gx;
      const ny = -slope * gy;
      const length = Math.hypot(nx, ny, 1);
      shade[i] = (nx * lx + ny * ly + lz) / length - lz;
    }
  }
  if (defaults.raised) {
    // A soft shadow cast away from the light, offset by the card's height above the table.
    const reach = ((style.shadow ?? 0.035) + lift) * size;
    const shadow = new Float32Array(W * H);
    const ox = Math.round(-lx / Math.cos(elevation) * reach * 0.7);
    const oy = Math.round(-ly / Math.cos(elevation) * reach * 0.7);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const sx = x - ox;
        const sy = y - oy;
        shadow[y * W + x] = sx >= 0 && sy >= 0 && sx < W && sy < H ? coverage[sy * W + sx] : 0;
      }
    }
    blur(shadow, W, H, Math.max(1, reach * 0.45));
    const shadowStrength = 0.42 / (1 + lift * 6);
    const metal = style.kind === "embossed";
    for (let i = 0; i < W * H; i += 1) {
      const a = coverage[i];
      const s = shade[i];
      let r = cr;
      let g = cg;
      let b = cb;
      if (metal) {
        // Foil: dark where it faces away, a bright tight highlight where it faces the light.
        const light = Math.max(0, 0.72 + 1.6 * s);
        const glint = Math.pow(Math.max(0, s + 0.12) / 0.6, 6) * 140;
        r = cr * light + glint;
        g = cg * light + glint;
        b = cb * light + glint * 0.85;
      } else {
        const light = 1 + 0.9 * s;
        r = cr * light + 18 * Math.max(0, s);
        g = cg * light + 18 * Math.max(0, s);
        b = cb * light + 18 * Math.max(0, s);
      }
      const sa = shadow[i] * shadowStrength * (1 - a);
      const alpha = a + sa;
      const o = 4 * i;
      if (alpha <= 0) continue;
      data[o] = (r * a) / alpha;
      data[o + 1] = (g * a) / alpha;
      data[o + 2] = (b * a) / alpha;
      data[o + 3] = Math.round(Math.min(1, alpha) * 255);
    }
    return out;
  }
  // Incised: ink or gilding in the cut, plus the light and dark the walls catch, over whatever ground is below.
  const ink = style.kind === "letterpress" ? 0.8 * t : 0.25 * t;
  for (let i = 0; i < W * H; i += 1) {
    const a = coverage[i];
    if (a <= 0 && field[i] < -1) continue;
    // Each wall of a cut is a plane: its tone is even, and the strokes' centre lines are crisp where the walls meet.
    const s = shade[i] * (style.kind === "letterpress" ? 3 : 2.2);
    const dark = Math.max(0, -s);
    const light = Math.max(0, s);
    // Layer ink, then darkening, then lightening, into one straight-alpha colour.
    let r = 0;
    let g = 0;
    let b = 0;
    let alpha = 0;
    const over = (sr: number, sg: number, sb: number, sa: number) => {
      const next = sa + alpha * (1 - sa);
      if (next <= 0) return;
      r = (sr * sa + r * alpha * (1 - sa)) / next;
      g = (sg * sa + g * alpha * (1 - sa)) / next;
      b = (sb * sa + b * alpha * (1 - sa)) / next;
      alpha = next;
    };
    over(cr, cg, cb, ink * a);
    over(20, 16, 12, Math.min(0.85, dark * a));
    over(255, 250, 240, Math.min(0.6, light * a));
    const o = 4 * i;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = Math.round(Math.min(1, alpha) * 255);
  }
  return out;
}
