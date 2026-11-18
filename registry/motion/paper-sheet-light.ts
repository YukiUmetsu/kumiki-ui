/**
 * Physical paper — light, view and shadows (registry item `paper-sheet`).
 *
 * Renderer-neutral: these functions turn sheet facets into a view projection, shading factors and shadow
 * polygons. The SVG renderer uses them, and any other renderer can.
 *
 * - **Light** is a key light of real angular size, a sky (hemisphere) and light bounced from the surface below.
 *   A facet turned from the key receives the key through the paper, scaled by the stock's transmittance, so a
 *   lifted thin sheet glows on its dark side and a back-lit sheet glows from behind.
 * - **Shading** is relative to the flat sheet: a sheet lying flat looks exactly as its artwork is drawn.
 * - **Shadows** are the facets projected along the light onto a plane. Their penumbra grows with height by the
 *   light's angular size, so a crease casts a sharp contact shadow and a high flap a soft one. Light that passes
 *   through the paper lightens and tints its shadow by the paper's colour; a sky shadow (ambient occlusion)
 *   darkens softly under anything lifted.
 */

import type { PaperFacet, PaperVec3 } from "./paper-sheet";

export interface PaperLight {
  /** Direction toward the key light (x right, y down, z toward the viewer). */
  direction: PaperVec3;
  /** Angular diameter of the key light, degrees: the sun is 0.5, a desk lamp about 10, a softbox 40–70. */
  size: number;
  /** Intensity of the key light. */
  key: number;
  /** Intensity of the sky / fill. */
  ambient: number;
  /** Fraction of light the surface below throws back onto undersides. */
  bounce: number;
  /** The sky's up direction. @default [0, 0, 1] (a table seen from above) */
  up?: PaperVec3;
}

export const PAPER_LIGHTS = {
  /** A table by a window: soft key from the upper left. */
  table: { direction: [-0.42, -0.55, 0.72], size: 28, key: 0.72, ambient: 0.6, bounce: 0.35 },
  /** A small lamp close by: hard key, crisp shadows. */
  lamp: { direction: [-0.5, -0.45, 0.74], size: 8, key: 1, ambient: 0.22, bounce: 0.25 },
  /** Overcast or a large softbox: very soft. */
  soft: { direction: [-0.2, -0.35, 0.92], size: 70, key: 0.6, ambient: 0.5, bounce: 0.35 },
  /** Low raking light that shows every curve. */
  raking: { direction: [-0.86, -0.2, 0.46], size: 6, key: 1, ambient: 0.18, bounce: 0.2 },
  /** Light from behind the sheet: paper glows by what it transmits. */
  backlit: { direction: [0.1, -0.15, -0.98], size: 40, key: 1.1, ambient: 0.28, bounce: 0 },
} as const satisfies Record<string, PaperLight>;

export type PaperLightName = keyof typeof PAPER_LIGHTS;

export function resolvePaperLight(light: PaperLight | PaperLightName | undefined): PaperLight {
  if (light === undefined) return PAPER_LIGHTS.table;
  return typeof light === "string" ? PAPER_LIGHTS[light] : light;
}

/** Orthographic view: `tilt` swings the camera toward the bottom of the frame, `turn` around the vertical. */
export interface PaperView {
  /** Degrees. 0 looks straight at the sheet; 60 looks across a table. @default 0 */
  tilt?: number;
  /** Degrees around the screen's vertical axis. @default 0 */
  turn?: number;
  /** Screen point the camera turns about (on the sheet's rest plane). @default [0, 0] */
  center?: readonly [number, number];
}

type V3 = [number, number, number];

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: ArrayLike<number>): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * The view as 12 numbers: rows for screen X, screen Y and depth toward the viewer (each a world direction),
 * then the offsets that keep `center` fixed.
 */
export function paperViewMatrix(view: PaperView | undefined): Float64Array {
  const tilt = ((view?.tilt ?? 0) * Math.PI) / 180;
  const turn = ((view?.turn ?? 0) * Math.PI) / 180;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cp = Math.cos(turn);
  const sp = Math.sin(turn);
  const cx = view?.center?.[0] ?? 0;
  const cy = view?.center?.[1] ?? 0;
  // Tilt about x (heights rise up the screen), then turn about the screen's vertical.
  const m = [
    cp, sp * st, sp * ct, // screen X
    0, ct, -st, // screen Y
    -sp, cp * st, cp * ct, // depth toward the viewer
  ];
  return Float64Array.from([...m, cx - (m[0] * cx + m[1] * cy), cy - (m[3] * cx + m[4] * cy), -(m[6] * cx + m[7] * cy)]);
}

/** SVG `matrix(a b c d e f)` from material space to the screen for a facet. */
export function paperFacetMatrix(facet: Pick<PaperFacet, "frame">, view: Float64Array): [number, number, number, number, number, number] {
  const f = facet.frame;
  const row = (r: number, c: number) => view[3 * r] * f[3 * c] + view[3 * r + 1] * f[3 * c + 1] + view[3 * r + 2] * f[3 * c + 2];
  return [row(0, 0), row(1, 0), row(0, 1), row(1, 1), row(0, 3) + view[9], row(1, 3) + view[10]];
}

/** Screen position and depth of a world point. */
export function paperProject(view: Float64Array, p: ArrayLike<number>): V3 {
  return [dot(view, p) + view[9], view[3] * p[0] + view[4] * p[1] + view[5] * p[2] + view[10], view[6] * p[0] + view[7] * p[1] + view[8] * p[2] + view[11]];
}

function framePoint(f: Float64Array, u: number, v: number, h: number): V3 {
  return [f[0] * u + f[3] * v + f[6] * h + f[9], f[1] * u + f[4] * v + f[7] * h + f[10], f[2] * u + f[5] * v + f[8] * h + f[11]];
}

/** +1 when the front of the facet faces the viewer, -1 for the back. */
export function paperFacing(facet: Pick<PaperFacet, "frame">, view: Float64Array): 1 | -1 {
  const f = facet.frame;
  return view[6] * f[6] + view[7] * f[7] + view[8] * f[8] >= 0 ? 1 : -1;
}

/** Mean depth toward the viewer of a facet's outline, for painter's ordering. */
export function paperFacetDepth(facet: Pick<PaperFacet, "frame" | "rings">, view: Float64Array): number {
  const r = facet.rings[0];
  const f = facet.frame;
  let sum = 0;
  const n = r.length >> 1;
  for (let i = 0; i < n; i += 1) {
    const p = framePoint(f, r[2 * i], r[2 * i + 1], 0);
    sum += view[6] * p[0] + view[7] * p[1] + view[8] * p[2];
  }
  return sum / Math.max(n, 1);
}

function irradiance(normal: ArrayLike<number>, light: PaperLight, transmittance: number): number {
  const l = unit(light.direction);
  const up = unit(light.up ?? [0, 0, 1]);
  const n = unit(normal);
  const nl = dot(n, l);
  // Light from behind reaches the visible side through the paper.
  const direct = nl >= 0 ? nl : -nl * transmittance;
  const nu = dot(n, up);
  const sky = (1 + nu) / 2;
  const ground = (1 - nu) / 2;
  const groundLight = light.bounce * (light.key * Math.max(0, dot(l, up)) + light.ambient);
  return light.key * direct + light.ambient * sky + groundLight * ground;
}

/**
 * Brightness of a surface with this visible normal relative to the flat sheet (front normal `rest`): 1 looks as
 * drawn, below 1 darker, above 1 brighter.
 */
export function paperShade(normal: ArrayLike<number>, light: PaperLight, transmittance: number, rest: ArrayLike<number> = [0, 0, 1]): number {
  const reference = irradiance(rest, light, transmittance);
  return reference > 1e-9 ? irradiance(normal, light, transmittance) / reference : 1;
}

/** Specular sheen (0–1, to add as white) for a visible normal, a view direction and the stock's gloss. */
export function paperSheen(normal: ArrayLike<number>, light: PaperLight, viewDirection: ArrayLike<number>, gloss: number): number {
  if (gloss <= 0) return 0;
  const l = unit(light.direction);
  const h = unit([l[0] + viewDirection[0], l[1] + viewDirection[1], l[2] + viewDirection[2]]);
  const n = unit(normal);
  const nh = Math.max(0, dot(n, h));
  const exponent = 6 + gloss * 160;
  // The flat sheet's own sheen is part of its drawn colour; only the excess shows.
  const rest = Math.max(0, h[2]) ** exponent;
  return Math.max(0, gloss * light.key * (nh ** exponent - rest));
}

/** Penumbra blur (Gaussian σ, px) of a shadow cast from `height` px above the receiver. */
export function paperPenumbra(height: number, light: PaperLight): number {
  const width = 2 * Math.max(0, height) * Math.tan(((light.size / 2) * Math.PI) / 180);
  return width / 3;
}

const decode = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encode = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** `#rrggbb` → linear RGB. */
export function paperLinear(hex: string): V3 {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [decode(((n >> 16) & 255) / 255), decode(((n >> 8) & 255) / 255), decode((n & 255) / 255)];
}

/** Linear RGB → `#rrggbb`. */
export function paperHex(rgb: ArrayLike<number>): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, encode(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, "0");
  return "#" + c(rgb[0]) + c(rgb[1]) + c(rgb[2]);
}

export type PaperShadowPass = "key" | "sky";

/**
 * Multiply colour of a shadow: the share of the receiver's light that the sheet blocks, less what passes
 * through it tinted by the paper's colour. `strength` scales it (0 none, 1 physical).
 */
export function paperShadowColor(pass: PaperShadowPass, light: PaperLight, transmittance: number, paper: string, strength: number): string {
  const l = unit(light.direction);
  // Shadows fall on planes facing the viewer (z = constant): the share is of that plane's light.
  const keyLight = light.key * Math.max(0, l[2]);
  const total = keyLight + light.ambient;
  const share = total > 0 ? (pass === "key" ? keyLight : light.ambient * 0.85) / total : 0;
  const tint = paperLinear(paper);
  const through = pass === "key" ? transmittance : transmittance * 0.5;
  return paperHex([0, 1, 2].map((i) => 1 - Math.min(1, strength) * share * (1 - through * tint[i])));
}

/** Keep the part of a polygon where nx·x + ny·y ≥ c (Sutherland–Hodgman). */
export function paperClipPolygon(pts: ArrayLike<number>, nx: number, ny: number, c: number): number[] {
  const out: number[] = [];
  const n = pts.length >> 1;
  if (n < 3) return out;
  let sx = pts[2 * (n - 1)];
  let sy = pts[2 * (n - 1) + 1];
  let sd = nx * sx + ny * sy - c;
  for (let i = 0; i < n; i += 1) {
    const ex = pts[2 * i];
    const ey = pts[2 * i + 1];
    const ed = nx * ex + ny * ey - c;
    if (sd >= 0 !== ed >= 0) {
      const t = sd / (sd - ed);
      out.push(sx + (ex - sx) * t, sy + (ey - sy) * t);
    }
    if (ed >= 0) out.push(ex, ey);
    sx = ex;
    sy = ey;
    sd = ed;
  }
  return out.length >= 6 ? out : [];
}

/** A shadow polygon on the screen with the height it was cast from. */
export interface PaperShadowSlice {
  /** Screen-space rings (interleaved). */
  rings: number[][];
  /** Mean height above the receiving plane, px. */
  height: number;
}

/**
 * Shadow of a facet on the plane z = `plane`, projected along `direction` (toward the light), cut into slices so
 * no slice spans more than `sliceHeight` px of height (each slice gets its own penumbra).
 */
export function paperShadowSlices(facet: Pick<PaperFacet, "frame" | "rings">, direction: ArrayLike<number>, plane: number, view: Float64Array, sliceHeight = 5): PaperShadowSlice[] {
  const l = unit(direction);
  if (l[2] < 0.05) return [];
  const f = facet.frame;
  // Height above the plane is affine in material space: h(u, v) = gu·u + gv·v + g0.
  const gu = f[2];
  const gv = f[5];
  const g0 = f[11] - plane;
  let lo = Infinity;
  let hi = -Infinity;
  for (const ring of facet.rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const h = gu * ring[i] + gv * ring[i + 1] + g0;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  if (!(hi > 0.05)) return [];
  // Paper below the plane casts nothing on it.
  const source = lo < 0 ? facet.rings.map((ring) => paperClipPolygon(ring, gu, gv, -g0)).filter((r) => r.length >= 6) : facet.rings.map((ring) => Array.from(ring));
  lo = Math.max(lo, 0);
  const slices = Math.max(1, Math.min(24, Math.ceil((hi - lo) / Math.max(sliceHeight, 0.5))));
  const out: PaperShadowSlice[] = [];
  for (let k = 0; k < slices; k += 1) {
    const a = lo + ((hi - lo) * k) / slices;
    const b = lo + ((hi - lo) * (k + 1)) / slices;
    const rings: number[][] = [];
    for (const ring of source) {
      let part = ring;
      // Keep a ≤ h ≤ b; the first slice keeps everything below, the last everything above.
      if (k > 0) part = paperClipPolygon(part, gu, gv, a - g0);
      if (part.length && k < slices - 1) part = paperClipPolygon(part, -gu, -gv, -(b - g0));
      if (part.length < 6) continue;
      const screen: number[] = [];
      for (let i = 0; i < part.length; i += 2) {
        const p = framePoint(f, part[i], part[i + 1], 0);
        const t = Math.max(0, p[2] - plane) / l[2];
        const q: V3 = [p[0] - l[0] * t, p[1] - l[1] * t, plane];
        const s = paperProject(view, q);
        screen.push(s[0], s[1]);
      }
      rings.push(screen);
    }
    if (rings.length) out.push({ rings, height: (a + b) / 2 });
  }
  return out;
}
