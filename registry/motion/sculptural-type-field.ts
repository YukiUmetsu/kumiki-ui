/**
 * Sculptural typography — glyph fields (registry item `sculptural-type`).
 *
 * Each grapheme (or word) of a string becomes its own object. This module draws every unit with any font that the
 * page can render, at a known resolution, and turns its antialiased coverage into a signed distance field (SDF). The
 * SDF drives every relief profile: flat, chamfered, rounded, pillowed and chiselled letters all come from one field.
 *
 * The distance transform is the exact linear-time Euclidean method of Felzenszwalb and Huttenlocher ("Distance
 * Transforms of Sampled Functions", Theory of Computing 8, 2012). Edge pixels seed it with their coverage, so the
 * zero level runs through the 50 % coverage line with sub-pixel accuracy.
 *
 * Units: rasters and fields are in pixels; one em is `size` pixels (the px size in `font`).
 */

import { segmentText } from "./kinetic-text";
import type { MorphTextCanvas, MorphTextContext } from "./advanced-morph-text";

/* ------------------------------------------------------------------ *
 * Layout and rasters
 * ------------------------------------------------------------------ */

export interface GlyphLayoutOptions {
  /** CSS font shorthand with a pixel size, for example `"700 160px Geist"`. The size is the resolution of one em. */
  font: string;
  /** Sculpt each grapheme, or each word. Use `word` for scripts whose letters join (Arabic, Devanagari conjuncts). @default "grapheme" */
  unit?: "grapheme" | "word";
  /** Line height as a multiple of the font size. @default 1.15 */
  lineHeight?: number;
  /** Horizontal alignment of lines. @default "center" */
  align?: "start" | "center" | "end";
  /** CSS letter spacing, for example `"0.02em"`, where the canvas supports it. */
  letterSpacing?: string;
  /** Empty pixels around each raster, so bevels and fields have room. @default 8 % of the size plus 3 */
  pad?: number;
  /** Canvas factory for workers or servers. Default: `OffscreenCanvas`, then a DOM canvas. */
  createCanvas?: (width: number, height: number) => MorphTextCanvas;
}

export interface GlyphRaster {
  /** Order in the string (0-based), counting every unit including spaces. */
  index: number;
  text: string;
  line: number;
  /** Word index across the whole string; spaces belong to no word (-1). */
  word: number;
  /** Pen position (left end of the baseline) in pixels inside the text block. */
  penX: number;
  penY: number;
  advance: number;
  /** True when the unit has no ink (a space). Blank units keep their place but build no geometry. */
  blank: boolean;
  /** Raster size and the block position of its top-left pixel corner. */
  width: number;
  height: number;
  left: number;
  top: number;
  /** Coverage per pixel, 0–255, row-major. */
  alpha: Uint8ClampedArray;
}

export interface GlyphLayout {
  units: GlyphRaster[];
  /** Pixels per em. */
  size: number;
  /** Text block size in pixels. */
  width: number;
  height: number;
  /** Baseline of the first line, in pixels from the top of the block. */
  baseline: number;
  lineHeight: number;
}

const MAX_RASTER_PIXELS = 4_194_304;

function defaultCanvas(width: number, height: number): MorphTextCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height) as unknown as MorphTextCanvas;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas as unknown as MorphTextCanvas;
  }
  throw new Error("Sculptural type needs a canvas to draw glyphs. Pass options.createCanvas outside a browser or worker.");
}

export function fontPixelSize(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  if (!match || !(Number(match[1]) > 0)) throw new RangeError(`Font "${font}" must state a positive size in px, for example "700 160px Geist".`);
  return Number(match[1]);
}

function context(canvas: MorphTextCanvas, options: GlyphLayoutOptions): MorphTextContext {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Sculptural type could not get a 2D canvas context.");
  ctx.font = options.font;
  if (options.letterSpacing !== undefined && "letterSpacing" in ctx) ctx.letterSpacing = options.letterSpacing;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  return ctx;
}

/** Units of one line with their character offsets, so pen positions come from measured prefixes (kerning included). */
function lineUnits(line: string, unit: "grapheme" | "word"): { text: string; offset: number; isWord: boolean }[] {
  const out: { text: string; offset: number; isWord: boolean }[] = [];
  if (unit === "grapheme") {
    let offset = 0;
    for (const grapheme of segmentText(line, "grapheme")) {
      out.push({ text: grapheme, offset, isWord: /[\p{L}\p{N}\p{M}\p{S}\p{P}]/u.test(grapheme) });
      offset += grapheme.length;
    }
    return out;
  }
  const pattern = /\S+/gu;
  for (let match = pattern.exec(line); match; match = pattern.exec(line)) out.push({ text: match[0], offset: match.index, isWord: true });
  return out;
}

/**
 * Lay out `text` and draw each unit into its own raster. Pen positions come from measuring each prefix of the line,
 * so kerning between units is kept; ligatures are not, because each unit is its own object. Load the font first.
 */
export function layoutGlyphs(text: string, options: GlyphLayoutOptions): GlyphLayout {
  const size = fontPixelSize(options.font);
  const unit = options.unit ?? "grapheme";
  const createCanvas = options.createCanvas ?? defaultCanvas;
  const probe = context(createCanvas(4, 4), options);
  const lineHeight = size * (options.lineHeight ?? 1.15);
  const pad = Math.ceil(options.pad ?? size * 0.08 + 3);
  const lines = text.split("\n");
  const widths = lines.map((line) => probe.measureText(line).width);
  const blockWidth = Math.max(1, ...widths);
  const ascent = size * 0.8;
  const units: GlyphRaster[] = [];
  let index = 0;
  let word = 0;
  lines.forEach((line, lineIndex) => {
    const free = blockWidth - widths[lineIndex];
    const align = options.align ?? "center";
    const lineX = align === "start" ? 0 : align === "end" ? free : free / 2;
    const baseline = ascent + lineIndex * lineHeight;
    for (const part of lineUnits(line, unit)) {
      const penX = lineX + probe.measureText(line.slice(0, part.offset)).width;
      const metrics = probe.measureText(part.text);
      const advance = probe.measureText(line.slice(0, part.offset + part.text.length)).width - (penX - lineX);
      const inkLeft = metrics.actualBoundingBoxLeft || 0;
      const inkRight = metrics.actualBoundingBoxRight || metrics.width;
      const inkUp = metrics.actualBoundingBoxAscent || 0;
      const inkDown = metrics.actualBoundingBoxDescent || 0;
      const blank = !part.isWord || inkRight + inkLeft <= 0 || inkUp + inkDown <= 0;
      const width = blank ? 0 : Math.ceil(inkLeft + inkRight) + 2 * pad;
      const height = blank ? 0 : Math.ceil(inkUp + inkDown) + 2 * pad;
      if (width * height > MAX_RASTER_PIXELS) throw new RangeError(`A glyph raster of ${width} × ${height} pixels is too large; use a smaller font size.`);
      let alpha = new Uint8ClampedArray(0);
      const left = Math.floor(penX - inkLeft) - pad;
      const top = Math.floor(baseline - inkUp) - pad;
      if (!blank) {
        const canvas = createCanvas(width, height);
        canvas.width = width;
        canvas.height = height;
        const ctx = context(canvas, options);
        ctx.fillText(part.text, penX - left, baseline - top);
        const image = ctx.getImageData(0, 0, width, height).data;
        alpha = new Uint8ClampedArray(width * height);
        for (let i = 0; i < alpha.length; i += 1) alpha[i] = image[4 * i + 3];
      }
      units.push({
        index, text: part.text, line: lineIndex, word: part.isWord ? word : -1, penX, penY: baseline, advance,
        blank, width, height, left, top, alpha,
      });
      index += 1;
      if (part.isWord && unit === "word") word += 1;
    }
    if (unit === "grapheme") word += 1;
  });
  // Grapheme units share a word index until a space; renumber so words count across lines.
  if (unit === "grapheme") {
    let current = -1;
    let inWord = false;
    for (const glyph of units) {
      if (glyph.blank || /\s/u.test(glyph.text)) {
        inWord = false;
        glyph.word = -1;
        continue;
      }
      if (!inWord) current += 1;
      inWord = true;
      glyph.word = current;
    }
  }
  return { units, size, width: blockWidth, height: ascent + size * 0.25 + (lines.length - 1) * lineHeight, baseline: ascent, lineHeight };
}

/* ------------------------------------------------------------------ *
 * Signed distance field
 * ------------------------------------------------------------------ */

const FAR = 1e20;

/** One-dimensional squared distance transform of `f` (Felzenszwalb–Huttenlocher), in place. */
function transform1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -FAR;
  z[1] = FAR;
  for (let q = 1; q < n; q += 1) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k -= 1;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Two-dimensional squared Euclidean distance transform of a grid, in place. */
function transform2d(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = grid[y * width + x];
    transform1d(f, height, d, v, z);
    for (let y = 0; y < height; y += 1) grid[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = grid[y * width + x];
    transform1d(f, width, d, v, z);
    for (let x = 0; x < width; x += 1) grid[y * width + x] = d[x];
  }
}

/**
 * Signed distance in pixels to the 50 % coverage line: positive inside the ink, negative outside. Partly covered
 * pixels seed both transforms with their sub-pixel offset, as in Mapbox's TinySDF.
 */
export function signedDistanceField(alpha: ArrayLike<number>, width: number, height: number): Float32Array {
  const count = width * height;
  const toInk = new Float64Array(count);
  const toPaper = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const a = alpha[i] / 255;
    if (a >= 1) {
      toInk[i] = 0;
      toPaper[i] = FAR;
    } else if (a <= 0) {
      toInk[i] = FAR;
      toPaper[i] = 0;
    } else {
      const offset = 0.5 - a;
      toInk[i] = offset > 0 ? offset * offset : 0;
      toPaper[i] = offset < 0 ? offset * offset : 0;
    }
  }
  transform2d(toInk, width, height);
  transform2d(toPaper, width, height);
  const field = new Float32Array(count);
  for (let i = 0; i < count; i += 1) field[i] = Math.sqrt(toPaper[i]) - Math.sqrt(toInk[i]);
  return field;
}

/* ------------------------------------------------------------------ *
 * Relief profiles
 * ------------------------------------------------------------------ */

/**
 * The cross-section of a letter's face, as height over distance from its edge. Widths and heights are in em.
 * - `flat`: a flat face with a square edge (a plain extrusion).
 * - `chamfer`: a straight bevel of `width` rising `height`, then a flat plateau.
 * - `round`: a quarter-round bevel of `width` and `height`, then a plateau.
 * - `pillow`: an inflated, balloon-like face; every stroke rounds over its own thickest point. `height` is the
 *   peak height of the thickest stroke.
 * - `chisel`: a V-cut prism; both walls rise at `angle` degrees from the face plane and meet in a ridge along the
 *   middle of each stroke, as in letters cut in stone. An optional `height` caps the ridge with a flat.
 */
export type ReliefProfile =
  | { kind: "flat" }
  | { kind: "chamfer"; width: number; height: number }
  | { kind: "round"; width: number; height: number }
  | { kind: "pillow"; height: number }
  | { kind: "chisel"; angle: number; height?: number };

export interface ResolvedProfile {
  /** Height in pixels at distance `d` pixels inside the edge. */
  height(d: number): number;
  /** dh/dd: how steeply the face rises at `d`. */
  slope(d: number): number;
  /** Highest point, in pixels. */
  peak: number;
}

/**
 * Steepest face slope a rounded profile reports (about 76°). A true quarter-round starts vertical, which a pixel grid
 * cannot sample along a diagonal edge without beading; the cap keeps the start steep but samplable.
 */
const MAX_SLOPE = 4;

/**
 * Resolve a profile for one field. `size` is pixels per em; `thickest` is the field's largest inside distance
 * (half the thickest stroke), which a pillow rounds over.
 */
export function resolveProfile(profile: ReliefProfile, size: number, thickest: number): ResolvedProfile {
  switch (profile.kind) {
    case "flat":
      return { height: () => 0, slope: () => 0, peak: 0 };
    case "chamfer": {
      const w = Math.max(profile.width * size, 1e-6);
      const h = profile.height * size;
      return { height: (d) => h * Math.min(Math.max(d, 0) / w, 1), slope: (d) => (d < w ? h / w : 0), peak: h };
    }
    case "round":
    case "pillow": {
      const w = profile.kind === "round" ? Math.max(profile.width * size, 1e-6) : Math.max(thickest, 1e-6);
      const h = profile.height * size;
      const height = (d: number) => {
        const t = Math.min(Math.max(d, 0) / w, 1);
        return h * Math.sqrt(1 - (1 - t) * (1 - t));
      };
      const slope = (d: number) => {
        const t = Math.min(Math.max(d, 0) / w, 1);
        if (t >= 1) return 0;
        const root = Math.sqrt(1 - (1 - t) * (1 - t));
        return root > 0 ? Math.min((h * (1 - t)) / (w * root), MAX_SLOPE) : MAX_SLOPE;
      };
      return { height, slope, peak: h };
    }
    case "chisel": {
      const rise = Math.tan((Math.min(Math.max(profile.angle, 1), 80) * Math.PI) / 180);
      const cap = profile.height !== undefined ? profile.height * size : Infinity;
      return {
        height: (d) => Math.min(Math.max(d, 0) * rise, cap),
        slope: (d) => (Math.max(d, 0) * rise < cap ? rise : 0),
        peak: Math.min(thickest * rise, cap),
      };
    }
  }
}

/**
 * A copy of a field smoothed by a separable box filter, applied twice (close to a Gaussian). A raster distance
 * transform carries small directional ripples; gradients taken from the smoothed copy shade without hatching, while
 * heights still come from the exact field.
 */
export function smoothField(field: ArrayLike<number>, width: number, height: number, radius: number): Float32Array {
  const out = Float32Array.from(field);
  const r = Math.round(radius);
  if (r < 1) return out;
  const tmp = new Float32Array(out.length);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) sum += out[y * width + Math.min(width - 1, Math.max(0, x))];
      for (let x = 0; x < width; x += 1) {
        tmp[y * width + x] = sum / (2 * r + 1);
        sum += out[y * width + Math.min(width - 1, x + r + 1)] - out[y * width + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
      for (let y = 0; y < height; y += 1) {
        out[y * width + x] = sum / (2 * r + 1);
        sum += tmp[Math.min(height - 1, y + r + 1) * width + x] - tmp[Math.max(0, y - r) * width + x];
      }
    }
  }
  return out;
}

/**
 * A field placed in a shared pixel frame: its pixel (i, j) has its centre at (originX + i + 0.5, originY + j + 0.5).
 * Morphs place both glyphs' fields in one frame anchored at each glyph's ink centre on the baseline.
 */
export interface PlacedField {
  field: Float32Array;
  width: number;
  height: number;
  originX: number;
  originY: number;
  /** Shared-frame pixels per field pixel, for fields drawn at another font size. @default 1 */
  scale?: number;
}

/**
 * The field's value at (x, y) in the shared frame, bilinearly interpolated. Beyond the raster it continues as the edge
 * value minus the distance past the edge, which is exact far outside and close enough near it.
 */
export function sampleField(placed: PlacedField, x: number, y: number): number {
  const { field, width, height } = placed;
  const k = placed.scale ?? 1;
  const fx = (x - placed.originX) / k - 0.5;
  const fy = (y - placed.originY) / k - 0.5;
  const cx = Math.min(width - 1, Math.max(0, fx));
  const cy = Math.min(height - 1, Math.max(0, fy));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0;
  const ty = cy - y0;
  const top = field[y0 * width + x0] * (1 - tx) + field[y0 * width + x1] * tx;
  const bottom = field[y1 * width + x0] * (1 - tx) + field[y1 * width + x1] * tx;
  return (top * (1 - ty) + bottom * ty - Math.hypot(fx - cx, fy - cy)) * k;
}

/**
 * Blend two placed fields: (1 − t) · a + t · b on a grid covering both. The zero line moves smoothly from one outline to
 * the other; strokes thin, thicken, join and split, and counters open or close, with no correspondence to author. A
 * missing side (a letter that appears or vanishes) is an empty field `emptyDepth` pixels outside everywhere, so the
 * other glyph erodes away or grows in.
 */
export function blendFields(a: PlacedField | null, b: PlacedField | null, t: number, emptyDepth: number): PlacedField {
  const first = a ?? b;
  if (!first) return { field: new Float32Array(1).fill(-emptyDepth), width: 1, height: 1, originX: 0, originY: 0 };
  const minX = Math.floor(Math.min(a?.originX ?? Infinity, b?.originX ?? Infinity));
  const minY = Math.floor(Math.min(a?.originY ?? Infinity, b?.originY ?? Infinity));
  const maxX = Math.ceil(Math.max(a ? a.originX + a.width * (a.scale ?? 1) : -Infinity, b ? b.originX + b.width * (b.scale ?? 1) : -Infinity));
  const maxY = Math.ceil(Math.max(a ? a.originY + a.height * (a.scale ?? 1) : -Infinity, b ? b.originY + b.height * (b.scale ?? 1) : -Infinity));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const field = new Float32Array(width * height);
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const x = minX + i + 0.5;
      const y = minY + j + 0.5;
      const va = a ? sampleField(a, x, y) : -emptyDepth;
      const vb = b ? sampleField(b, x, y) : -emptyDepth;
      field[j * width + i] = va + (vb - va) * t;
    }
  }
  return { field, width, height, originX: minX, originY: minY };
}

/** Largest inside distance of a field: half the thickest stroke, in pixels. */
export function thickestStroke(field: ArrayLike<number>): number {
  let best = 0;
  for (let i = 0; i < field.length; i += 1) if (field[i] > best) best = field[i];
  return best;
}
