/**
 * INK-FILM1 lettering: words in any script as brush ink, and seals.
 *
 * The letters come from a font (or from any mask); the ink is ours: the edge bleeds into the paper, a stroke starts loaded and runs dry, ink
 * pools at the rim. Letters are parts in reading order, so `enter: { kind: "paint" }` writes the line, left to right or down the column.
 */
import { inkFbm2, inkNoise2 } from "../ink-riso-press";
import type { InkRisoPen } from "../ink-riso-pen";
import { inkRandom } from "./ink-brush-kit";
import type { InkPart, InkSubject } from "./ink-cel";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
/** A glyph as coverage 0–1 on a grid of `unit` page units, its top left corner relative to the cell of the letter. */
export interface InkGlyph { w: number; h: number; unit: number; x: number; y: number; advance: number; cover: Float32Array }
export type InkGlyphs = (text: string, size: number, font: string) => InkGlyph;
/** Glyphs from the browser's own fonts. Wait for `document.fonts.load(font)` first. */
export const inkGlyphsFromCanvas: InkGlyphs = (text, size, font) => {
  const unit = Math.max(0.5, size / 320), px = size / unit, pad = Math.ceil(px * 0.25), make = (w: number, h: number) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const probe = make(8, 8).getContext("2d") as CanvasRenderingContext2D | null; if (!probe) throw new Error("Lettering needs a 2d canvas.");
  const face = `${font.includes("{px}") ? font.replace("{px}", `${px}px`) : `${px}px ${font}`}`;
  probe.font = face; const advance = probe.measureText(text).width, w = Math.ceil(advance) + pad * 2, h = Math.ceil(px * 1.25) + pad * 2, c = make(w, h).getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  c.font = face; c.textBaseline = "alphabetic"; c.fillStyle = "#000"; c.fillText(text, pad, pad + px * 0.95);
  const d = c.getImageData(0, 0, w, h).data, cover = new Float32Array(w * h); for (let i = 0; i < cover.length; i++) cover[i] = d[i * 4 + 3] / 255;
  return { w, h, unit, x: -pad * unit, y: -(pad + px * 0.95) * unit, advance: advance * unit, cover };
};
/** Signed distance to the edge of a mask, grid steps, inside above 0: two passes are exact enough for ink. */
function distance(g: InkGlyph): Float32Array {
  const { w, h, cover } = g, far = 1e6, run = (want: boolean) => {
    const d = new Float32Array(w * h); for (let i = 0; i < d.length; i++) d[i] = (cover[i] > 0.5) === want ? 0 : far;
    const pass = (x: number, y: number, dx: number, dy: number, k: number) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) return; const v = d[Y * w + X] + k; if (v < d[y * w + x]) d[y * w + x] = v; };
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { pass(x, y, -1, 0, 1); pass(x, y, 0, -1, 1); pass(x, y, -1, -1, 1.414); pass(x, y, 1, -1, 1.414); } for (let x = w - 1; x >= 0; x--) pass(x, y, 1, 0, 1); }
    for (let y = h - 1; y >= 0; y--) { for (let x = w - 1; x >= 0; x--) { pass(x, y, 1, 0, 1); pass(x, y, 0, 1, 1); pass(x, y, 1, 1, 1.414); pass(x, y, -1, 1, 1.414); } for (let x = 0; x < w; x++) pass(x, y, -1, 0, 1); }
    return d;
  };
  const out = run(false), into = run(true), s = new Float32Array(w * h);
  for (let i = 0; i < s.length; i++) s[i] = out[i] > 0 ? out[i] - 0.5 + (cover[i] - 0.5) * (out[i] < 1.5 ? 1 : 0) : -(into[i] - 0.5);
  return s;
}
/** Bristle marks that run along the strokes of a letter: noise drawn out along the stroke's own direction, which is across the steepest way to its edge. Values stand round 0.5. */
function bristles(g: InkGlyph, d: Float32Array, seed: number): Float32Array {
  const { w, h } = g, n = w * h, xx = new Float32Array(n), xy = new Float32Array(n), yy = new Float32Array(n), out = new Float32Array(n).fill(0.5), R = Math.max(3, Math.round(h / 60));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (d[i] < -R) continue; const gx = (d[i + 1] - d[i - 1]) / 2, gy = (d[i + w] - d[i - w]) / 2; xx[i] = gx * gx; xy[i] = gx * gy; yy[i] = gy * gy; }
  const blur = (a: Float32Array) => { const b = new Float32Array(n); for (let y = 0; y < h; y++) { let s = 0; for (let x = -R; x < w; x++) { if (x + R < w) s += a[y * w + x + R]; if (x - R - 1 >= 0) s -= a[y * w + x - R - 1]; if (x >= 0) b[y * w + x] = s; } } for (let x = 0; x < w; x++) { let s = 0; for (let y = -R; y < h; y++) { if (y + R < h) s += b[(y + R) * w + x]; if (y - R - 1 >= 0) s -= b[(y - R - 1) * w + x]; if (y >= 0) a[y * w + x] = s; } } };
  for (const a of [xx, xy, yy]) { blur(a); blur(a); }
  const noise = (x: number, y: number) => inkNoise2(seed, x / 1.7, y / 1.7), half = Math.round(h / 26);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (d[i] < -1) continue;
    let sum = noise(x, y), m = 1;
    for (const way of [1, -1]) {
      let X = x, Y = y, dx = 0, dy = 0;
      for (let k = 0; k < half; k++) {
        const q = Math.round(Y) * w + Math.round(X), a = 0.5 * Math.atan2(2 * xy[q], xx[q] - yy[q]) + Math.PI / 2; let vx = Math.cos(a), vy = Math.sin(a);
        if (k === 0 ? vx * way < 0 || (vx === 0 && vy * way < 0) : vx * dx + vy * dy < 0) { vx = -vx; vy = -vy; }
        dx = vx; dy = vy; X += vx * 1.6; Y += vy * 1.6; if (X < 1 || Y < 1 || X > w - 2 || Y > h - 2) break;
        sum += noise(X, Y); m++;
      }
    }
    out[i] = 0.5 + (sum / m - 0.5) * 2.7;
  }
  return out;
}
export interface InkLetteringOptions {
  seed?: number; pigment?: InkPigment;
  /** Letter height, page units. */ size?: number;
  /** A CSS font family, or a whole font with `{px}` where its size goes. */ font?: string;
  /** Down the page, columns from right to left. */ vertical?: boolean;
  /** Space between letters and between lines, shares of the size. */ track?: number; leading?: number;
  /** Strength, 0–1; how dry the brush gets, 0–1; how far the edge creeps into the paper, 0–1.5. */ ink?: number; dry?: number; bleed?: number;
  /** Letters that stand apart by hand: turn and height, 0–1. */ hand?: number;
  glyphs?: InkGlyphs;
}
/** A line (or lines, split at line breaks) of brush lettering. */
export function inkLettering(text: string, o: InkLetteringOptions = {}): InkSubject {
  const size = o.size ?? 200, font = o.font ?? "'Noto Serif JP Variable', 'Noto Serif CJK SC', 'Songti SC', 'STKaiti', serif", seed = o.seed ?? 1, plate = o.pigment ?? "ink", track = (o.track ?? 0.04) * size, leading = (o.leading ?? (o.vertical ? 1.25 : 1.3)) * size, ink = o.ink ?? 0.97, dry = o.dry ?? 0.35, bleed = o.bleed ?? 0.5, hand = o.hand ?? 0.3, make = o.glyphs ?? inkGlyphsFromCanvas, r = inkRandom(seed);
  const lines = text.split("\n").map(l => Array.from(l)), cache = new Map<string, { g: InkGlyph; d: Float32Array; b?: Float32Array } | null>();
  const glyph = (ch: string) => { let v = cache.get(ch); if (v === undefined) { if (!ch.trim()) v = null; else { const g = make(ch, size, font); v = { g, d: distance(g) }; } cache.set(ch, v); } return v; };
  const space = size * 0.34, pad = size * 0.3, set: { ch: string; x: number; y: number; turn: number }[] = [];
  let W = 0, H = 0;
  if (o.vertical) {
    const cols = lines.length; W = pad * 2 + leading * (cols - 1) + size; lines.forEach((l, c) => { let y = pad; for (const ch of l) { const g = glyph(ch), adv = g ? g.g.advance : 0; if (g) set.push({ ch, x: W - pad - leading * c - size / 2 - adv / 2, y: y + size * 0.88, turn: 0 }); y += (g ? size : space) + track; } H = Math.max(H, y + pad - track); });
  } else {
    const widths = lines.map(l => l.reduce((a, ch) => a + (glyph(ch)?.g.advance ?? space) + track, -track)); W = pad * 2 + Math.max(...widths); H = pad * 2 + leading * (lines.length - 1) + size * 1.08;
    lines.forEach((l, i) => { let x = (W - widths[i]) / 2; for (const ch of l) { const g = glyph(ch); if (g) set.push({ ch, x, y: pad + size * 0.88 + leading * i, turn: 0 }); x += (g?.g.advance ?? space) + track; } });
  }
  for (const s of set) { s.turn = (r.next() - 0.5) * 0.06 * hand; s.y += (r.next() - 0.5) * 0.05 * hand * size; s.x += (r.next() - 0.5) * 0.02 * hand * size; }
  const draw = (p: InkRisoPen, s: (typeof set)[number], k: number) => {
    const face = glyph(s.ch)!, { g, d } = face, b = (face.b ??= bristles(g, d, seed * 5 + 1)), sheet = p.sheet, S = sheet.spec.scale, sd = seed * 13 + k, c = Math.cos(s.turn), n = Math.sin(s.turn), half = size * 0.45, pl = sheet.plates[plate], L = sheet.layer, u = size / 200;
    const [X0, Y0] = p.at(s.x + g.x, s.y + g.y), [X1, Y1] = p.at(s.x + g.x + g.w * g.unit, s.y + g.y + g.h * g.unit), m = size * 0.05, x0 = Math.max(0, Math.floor((Math.min(X0, X1) - m) * S)), x1 = Math.min(sheet.w - 1, Math.ceil((Math.max(X0, X1) + m) * S)), y0 = Math.max(0, Math.floor((Math.min(Y0, Y1) - m) * S)), y1 = Math.min(sheet.h - 1, Math.ceil((Math.max(Y0, Y1) + m) * S)), mark = L ? L.marks.length : 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const [px, py] = p.local((x + 0.5) / S, (y + 0.5) / S), ox = px - s.x - half, oy = py - s.y + half, lx = ox * c + oy * n + half - g.x, ly = -ox * n + oy * c - half - g.y, gx = lx / g.unit - 0.5, gy = ly / g.unit - 0.5, i = Math.floor(gx), j = Math.floor(gy);
      if (i < 0 || j < 0 || i >= g.w - 1 || j >= g.h - 1) continue;
      const f = gx - i, q = gy - j, a = j * g.w + i, dist = ((d[a] * (1 - f) + d[a + 1] * f) * (1 - q) + (d[a + g.w] * (1 - f) + d[a + g.w + 1] * f) * q) * g.unit;
      if (dist < -7 * u) continue;
      const fibre = inkNoise2(sd + 1, px / (2.6 * u), py / (2.6 * u)) * 0.6 + inkNoise2(sd + 2, px / (1.2 * u), py / (1.2 * u)) * 0.4, wob = (inkFbm2(sd + 3, px / (16 * u), py / (16 * u), 2) - 0.5) * 2.6 * u, e = dist + wob * bleed + (fibre - 0.5) * 3 * u * bleed;
      let v = ss(-0.7 * u, 0.9 * u, e);
      // ink creeps out where the brush was wettest
      const wet = inkFbm2(sd + 4, px / (size * 0.4), py / (size * 0.4), 2); v = Math.max(v, 0.34 * bleed * ss(-6 * u * bleed, 0, e) * ss(0.45, 0.7, wet) * (0.5 + fibre));
      if (v < 0.01) continue;
      // dry: the bristles part along the stroke, in patches, most of all toward the end of the letter and in the heart of the stroke
      const along = clamp((oy + half) / size * 0.8 + (ox + half) / (size * 4)), patch = inkFbm2(sd + 5, px / (size * 0.3), py / (size * 0.3), 2), D = dry * (0.06 + 1.1 * along) * ss(0.4, 0.66, patch), streak = (b[a] * (1 - f) + b[a + 1] * f) * (1 - q) + (b[a + g.w] * (1 - f) + b[a + g.w + 1] * f) * q, gap = ss(0.78 - 0.42 * D, 0.83 - 0.42 * D, streak + 0.05 * (fibre - 0.5)) * Math.min(1, D * 2.6) * ss(0, 4 * u, dist);
      const tone = clamp(v * ink * (0.95 + 0.09 * wet) * (1 - gap)), z = y * sheet.w + x;
      pl.solid[z] = Math.max(pl.solid[z], tone);
      if (L && tone > 0.02) L.when[z] = mark + clamp(((ox + half) / size) * 0.45 + ((oy + half) / size) * 0.55, 0.001, 0.999);
    }
    if (L) L.marks.push(size * 4);
  };
  const box = (s: (typeof set)[number]): [number, number, number, number] => { const g = glyph(s.ch)!.g, m = size * 0.1, x = Math.max(0, s.x + g.x - m), y = Math.max(0, s.y + g.y - m); return [x, y, Math.min(W, s.x + g.x + g.w * g.unit + m) - x, Math.min(H, s.y + g.y + g.h * g.unit + m) - y]; };
  return { id: `lettering-${seed}-${text}`, label: text.replace(/\n/g, " "), page: { width: W, height: H }, plates: inkPlates(plate === "ink" ? ["ink"] : [plate, "ink"]), seed, parts: set.map((s, k): InkPart => ({ id: `letter-${k}`, box: box(s), draw: c => draw(c.page, s, k) })) };
}

export interface InkSealOptions { seed?: number; size?: number; pigment?: InkPigment; font?: string; /** Letters of paper in a field of cinnabar 白文, or cinnabar letters in a frame 朱文. */ kind?: "white" | "red"; round?: boolean; glyphs?: InkGlyphs }
/** A seal of one to four characters (or a short word), pressed a little unevenly. */
export function inkSeal(text: string, o: InkSealOptions = {}): InkSubject {
  const s = o.size ?? 160, seed = o.seed ?? 1, kind = o.kind ?? "white", plate = o.pigment ?? "cinnabar", chars = Array.from(text.replace(/\s/g, "")), latin = Array.from(text).every(c => c.codePointAt(0)! < 0x250), cols = latin ? Math.max(...text.split(/\s+/).map(w => w.length)) : chars.length > 2 ? 2 : 1, rows = latin ? text.split(/\s+/).length : Math.ceil(chars.length / cols), W = s * (cols > rows ? Math.min(2.4, cols / rows / (latin ? 1.6 : 1)) : 1), H = s * (rows > cols ? rows / cols : 1), pad = s * 0.12, edge = s * 0.09, make = o.glyphs ?? inkGlyphsFromCanvas, font = o.font ?? "'Noto Serif JP Variable', 'Noto Serif CJK SC', 'Songti SC', serif";
  const words = latin ? text.split(/\s+/) : null, cw = (W - edge * 2) / cols, ch = (H - edge * 2) / rows, cells = latin ? words!.flatMap((w, j) => Array.from(w).map((c, i) => ({ c, x: edge + (W - edge * 2) * ((i + 0.5) / w.length), y: edge + ch * (j + 0.5), w: (W - edge * 2) / w.length, h: ch }))) : chars.map((c, i) => { const col = Math.floor(i / rows), n = Math.min(rows, chars.length - col * rows), h = (H - edge * 2) / n; return { c, x: W - edge - cw * (col + 0.5), y: edge + h * ((i % rows) + 0.5), w: cw, h }; });
  return { id: `seal-${seed}-${text}`, label: `Seal: ${text}`, page: { width: W + pad * 2, height: H + pad * 2 }, plates: inkPlates([plate, "ink"]), seed, parts: [{ id: "seal", draw: ({ page: p }) => {
    // every letter fills its cell, as a cutter draws it out to
    const glyphs = cells.map(c => { const g = make(c.c, Math.min(c.h, c.w) * 1.2, font); let l = g.w, r = 0, top = g.h, foot = 0; for (let i = 0; i < g.cover.length; i++) if (g.cover[i] > 0.4) { const x = i % g.w, y = Math.floor(i / g.w); if (x < l) l = x; if (x > r) r = x; if (y < top) top = y; if (y > foot) foot = y; } return { ...c, g, l, r: r + 1, top, foot: foot + 1 }; });
    if (latin) { const top = Math.min(...glyphs.map(q => q.top)), foot = Math.max(...glyphs.map(q => q.foot)); for (const q of glyphs) { q.top = top; q.foot = foot; } }
    const sheet = p.sheet, S = sheet.spec.scale, pl = sheet.plates[plate], L = sheet.layer, gapX = chars.length === 1 ? 0.8 : 0.88;
    const letter = (x: number, y: number) => { let v = 0; for (const q of glyphs) { const bw = Math.max(1, q.r - q.l), bh = Math.max(1, q.foot - q.top), kx = (q.w * gapX) / bw, ky = (q.h * gapX) / bh, k = Math.min(kx, ky), sx = Math.min(kx, k * 1.4), sy = Math.min(ky, k * 1.7), i = Math.floor((x - q.x) / sx + (q.l + q.r) / 2), j = Math.floor((y - q.y) / sy + (q.top + q.foot) / 2); if (i >= q.l && j >= q.top && i < q.r && j < q.foot) v = Math.max(v, q.g.cover[j * q.g.w + i]); } return v; };
    const x0 = 0, y0 = 0;
    for (let y = y0; y < sheet.h; y++) for (let x = x0; x < sheet.w; x++) {
      const [px, py] = p.local((x + 0.5) / S, (y + 0.5) / S), u = px - pad + (inkNoise2(seed + 7, px / 9, py / 9) - 0.5) * s * 0.012, v = py - pad + (inkNoise2(seed + 8, px / 9, py / 9) - 0.5) * s * 0.012, rr = s * (o.round ? 0.5 : 0.06), dx = Math.max(Math.abs(u - W / 2) - W / 2 + rr, 0), dy = Math.max(Math.abs(v - H / 2) - H / 2 + rr, 0), d = rr - Math.hypot(dx, dy) - Math.max(0, inkFbm2(seed + 9, px / (s * 0.1), py / (s * 0.1), 3) - 0.6) * s * 0.16 * ss(s * 0.1, 0, rr - Math.hypot(dx, dy));
      const field = ss(-0.6, 0.8, d), l = letter(u, v), a = kind === "white" ? field * (1 - ss(0.35, 0.65, l)) : Math.max(field * ss(edge * 0.62, edge * 0.42, d), ss(0.35, 0.65, l) * field);
      if (a < 0.02) continue;
      const press = 0.82 + 0.3 * inkFbm2(seed + 3, px / (s * 0.5), py / (s * 0.5), 2), grain = ss(0.2, 0.5, inkNoise2(seed + 4, px / 2.4, py / 2.4) * 0.6 + inkNoise2(seed + 5, px / 6, py / 6) * 0.4 + 0.34 * press - 0.1), z = y * sheet.w + x;
      pl.solid[z] = Math.max(pl.solid[z], clamp(a * press * (0.72 + 0.28 * grain) * (0.86 + 0.14 * grain)));
      if (L) L.when[z] = L.marks.length + 0.5;
    }
    if (L) L.marks.push(40);
  } }] };
}
