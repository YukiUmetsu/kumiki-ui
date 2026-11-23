/**
 * RIG1 ink look: any rigged subject painted in Chinese ink on xuan paper, with the style's own engines.
 *
 *   wash    each part is laid in as a pale wash on its exact silhouette, then painted with side-brush strokes planned
 *           along its long axis and deposited by the INK1 wet-paper engine (`sampleWetInk`): pigment pressed into a
 *           paper-fibre field, a capillary halo, pooled sides, bristle channels when the brush runs dry
 *   line    INK1 brush polygons (`inkOutline`): lost-and-found contours with pressure along a part's long sides,
 *           pressure-swelled strokes for drawn lines, dark ink (焦墨) for eyes, hooves and shoes
 *   colour  ink tone from the palette's value; a light traditional pigment (赭石, 花青, 朱砂…) from its hue
 *   paper   INK1 xuan grain (`inkPaperGrain`) with sizing mottle; the ground is brushed per world tile
 *
 * Everything a part shows is computed once, in the part's own bone space, and cached by its shape: the brushwork rides
 * with the part as it moves and never boils or swims. A figure is one wash layer: a front part covers the parts behind
 * it (it does not darken at every joint), and the whole figure multiplies into the paper so its fibres show through.
 */
import { useId, useMemo } from "react";
import { matrixAttr, shapePath } from "./rig-evaluate";
import type { RigPartFrame } from "./rig-evaluate";
import type { RigRole, RigSpec } from "./rig-spec";
import { flattenPath } from "../video/collage/collage-geometry";
import { inkHash, inkNoise1, inkOutline, inkPaperGrain } from "../video/ink-wash";
import type { InkPoint, InkStroke } from "../video/ink-wash";
import { sampleWetInk, wetInkPngDataUri } from "../video/ink-wet-paper";
import type { InkBrushNode, InkBrushSpec, InkBrushStroke } from "../video/ink-brush";

type Pt = [number, number];
type Rgb = readonly [number, number, number];

// ---- Ink and pigment -----------------------------------------------------------------------------------------------------------

/** Pine-soot ink, a little warm. */
export const RIG_INK = "#211f1c";
/** Unsized xuan paper. */
export const RIG_XUAN = "#f2ecdf";
/** Traditional light colours laid over ink (淡彩), picked by hue. */
export const RIG_INK_PIGMENTS: readonly { name: string; hue: number; color: string }[] = [
  { name: "vermilion 朱砂", hue: 6, color: "#b5402c" },
  { name: "ochre 赭石", hue: 26, color: "#9a5a30" },
  { name: "gamboge 藤黄", hue: 48, color: "#cc9b2b" },
  { name: "malachite 石绿", hue: 140, color: "#3f8466" },
  { name: "indigo 花青", hue: 208, color: "#2f4e6c" },
  { name: "azurite 石青", hue: 228, color: "#2d5791" },
  { name: "rouge 胭脂", hue: 338, color: "#952f43" },
];
const rgbOf = (hex: string): Rgb => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hexOf = (c: Rgb) => "#" + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE: Rgb = [255, 255, 255];
const INK_RGB = rgbOf(RIG_INK);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const f2 = (v: number) => (Math.round(v * 100) / 100).toString();

function hueSat(c: Rgb): { hue: number; sat: number; value: number } {
  const [r, g, b] = c.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d > 1e-6) hue = max === r ? ((g - b) / d + 6) % 6 * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return { hue, sat: max ? d / max : 0, value: .299 * r + .587 * g + .114 * b };
}
function pigmentFor(hue: number): Rgb {
  let best = RIG_INK_PIGMENTS[0], gap = 360;
  for (const p of RIG_INK_PIGMENTS) { const g = Math.min(Math.abs(p.hue - hue), 360 - Math.abs(p.hue - hue)); if (g < gap) { gap = g; best = p; } }
  return rgbOf(best.color);
}

// ---- Media per material role ---------------------------------------------------------------------------------------------------

/**
 * How each material is painted. `water` wets the brush (halo, softer edges), `dry` splits the bristles, `contour` is
 * the weight of the lost-and-found outline, `tint` how much of the colour survives as a light pigment, `base` the share
 * of the tone laid as the flat first wash under the brush strokes.
 */
interface Medium { kind: "wash" | "dark" | "ruled" | "vapour"; water: number; dry: number; contour: number; tint: number; base: number }
const wash = (water: number, dry: number, contour: number, tint: number, base = .45): Medium => ({ kind: "wash", water, dry, contour, tint, base });
const DARK: Medium = { kind: "dark", water: .1, dry: .2, contour: 0, tint: .1, base: 1 };
const RULED: Medium = { kind: "ruled", water: .25, dry: .1, contour: .8, tint: .25, base: .7 };
const VAPOUR: Medium = { kind: "vapour", water: 1, dry: 0, contour: 0, tint: .5, base: 1 };
const MEDIA: Record<RigRole, Medium> = {
  skin: wash(.45, .06, .75, .5), face: wash(.45, .06, .75, .5), hair: wash(.22, .78, .45, .1, .45),
  cloth: wash(.7, .08, .8, .26), "cloth-dark": wash(.62, .12, .8, .22), shoe: DARK, eye: DARK, mouth: DARK, detail: DARK,
  fur: wash(.58, .07, .8, .22), "fur-dark": wash(.45, .2, .8, .18), scale: wash(.52, .06, .85, .24), "scale-dark": wash(.45, .1, .85, .22),
  belly: wash(.78, .04, .55, .4), horn: wash(.2, .4, 1, .2, .55), membrane: wash(.85, .05, .6, .35, .4), feather: wash(.35, .5, .7, .28),
  beak: wash(.25, .2, 1, .5, .55), fin: wash(.82, .26, .5, .4), sail: wash(.7, .08, .6, .2),
  metal: RULED, "metal-dark": RULED, brass: RULED, wood: RULED, glass: RULED, rubber: RULED, paint: RULED, "paint-dark": RULED, rope: RULED,
  smoke: VAPOUR, light: VAPOUR, accent: wash(.62, .06, .45, .85),
};

// ---- Geometry helpers ----------------------------------------------------------------------------------------------------------

/**
 * Closed outline loops of a part, resampled to an even spacing along straight edges as well as curves (a polygon's
 * edge must wander and break like any other, not stay a ruled line between two corners).
 */
function loopsOf(d: string, spacing: number): Pt[][] {
  return flattenPath(d, spacing).map(s => {
    const src = s.points, out: Pt[] = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const n = Math.max(1, Math.round(L / spacing));
      for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }).filter(l => l.length > 2);
}
const areaOf = (l: Pt[]) => { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
/** Outward unit normal at each vertex of a closed loop. */
function normals(l: Pt[]): Pt[] {
  const s = areaOf(l) > 0 ? 1 : -1;
  return l.map((_, i) => {
    const a = l[(i - 1 + l.length) % l.length], b = l[(i + 1) % l.length], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    return [s * ty / L, -s * tx / L] as Pt;
  });
}
const loopD = (l: Pt[]) => "M" + l.map(p => f2(p[0]) + " " + f2(p[1])).join("L") + "Z";
/**
 * The edge of a wash on paper wanders a little: displace a loop along its normals by smooth noise over arc length. It
 * only ever spreads outward (wet ink creeps into the paper), so two parts that abut never open a sliver of paper.
 */
function wander(l: Pt[], amp: number, seed: number): Pt[] {
  const n = normals(l);
  let arc = 0;
  return l.map((p, i) => {
    if (i) arc += Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]);
    const k = inkNoise1(seed, arc / 9, 3) * 1.6 * amp + inkNoise1(seed, arc / 3.2, 5) * amp * .4;
    return [p[0] + n[i][0] * k, p[1] + n[i][1] * k];
  });
}

/** Principal axes of a part (its long axis is the brush's direction), and the shape's chords across it. */
interface Frame { cx: number; cy: number; ux: number; uy: number; smin: number; smax: number; mmin: number; mmax: number }
function principal(loops: Pt[][]): Frame {
  const pts = loops.flat(), n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  let xx = 0, xy = 0, yy = 0;
  for (const [x, y] of pts) { xx += (x - cx) ** 2; xy += (x - cx) * (y - cy); yy += (y - cy) ** 2; }
  const a = .5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(a), uy = Math.sin(a);
  let smin = Infinity, smax = -Infinity, mmin = Infinity, mmax = -Infinity;
  for (const [x, y] of pts) {
    const s = (x - cx) * ux + (y - cy) * uy, m = -(x - cx) * uy + (y - cy) * ux;
    smin = Math.min(smin, s); smax = Math.max(smax, s); mmin = Math.min(mmin, m); mmax = Math.max(mmax, m);
  }
  return { cx, cy, ux, uy, smin, smax, mmin, mmax };
}
const toXY = (f: Frame, s: number, m: number): Pt => [f.cx + s * f.ux - m * f.uy, f.cy + s * f.uy + m * f.ux];
/** Where the line across the long axis at `s` crosses the outline, sorted (inside between pairs, even-odd). */
function crossings(f: Frame, loops: Pt[][], s: number): number[] {
  const out: number[] = [];
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const p = l[i], q = l[(i + 1) % l.length];
    const sp = (p[0] - f.cx) * f.ux + (p[1] - f.cy) * f.uy, sq = (q[0] - f.cx) * f.ux + (q[1] - f.cy) * f.uy;
    if ((sp > s) === (sq > s)) continue;
    const mp = -(p[0] - f.cx) * f.uy + (p[1] - f.cy) * f.ux, mq = -(q[0] - f.cx) * f.uy + (q[1] - f.cy) * f.ux;
    out.push(mp + (mq - mp) * (s - sp) / (sq - sp));
  }
  return out.sort((a, b) => a - b);
}
const insideAt = (xs: number[], m: number) => xs.filter(x => x < m).length % 2 === 1;

// ---- The wet brush body (INK1 wet paper) ---------------------------------------------------------------------------------------

interface Raster { href: string; x: number; y: number; width: number; height: number }
/**
 * Side-brush strokes along the part's long axis, one per band across it, each broken where the band leaves the shape
 * (a forked tail stays forked), pressed to the local width so the strokes fill the part with tapered starts and lifts.
 * Deposited by `sampleWetInk` in the part's own space, dried, recoloured to the part's ink and kept inside the part's
 * wash (`clip`): a stroke's wet fringe spilling over the part next to it drew a dark seam between two masses that a
 * painter lays as one.
 */
function brushBody(loops: Pt[][], m: Medium, seed: number, color: Rgb, density: number, clip: Pt[][]): Raster | undefined {
  const f = principal(loops), len = f.smax - f.smin, wid = f.mmax - f.mmin;
  if (len < 4 || wid < 2.5) return undefined;
  const xs = loops.flat().map(p => p[0]), ys = loops.flat().map(p => p[1]);
  const margin = 8 + m.water * 10, x0 = Math.min(...xs) - margin, y0 = Math.min(...ys) - margin;
  const W = Math.max(240, Math.ceil(Math.max(...xs) - x0 + margin)), H = Math.max(240, Math.ceil(Math.max(...ys) - y0 + margin));
  if (W > 4096 || H > 4096) return undefined;
  const bands = Math.max(1, Math.min(5, Math.round(wid / 22)));
  // Strokes start and lift beyond the part's two ends (the overrun is clipped away), so the part is evenly inked to its
  // edge: a taper inside it left a pale band where it meets the next part.
  const over = Math.min(len * .35, wid / bands * .9), from = f.smin - over, span = len + 2 * over;
  const stations = Math.max(6, Math.min(40, Math.round(span / 6)));
  const chords = Array.from({ length: stations }, (_, k) => {
    const s = from + span * (k + .5) / stations, xsec = crossings(f, loops, clamp(s, f.smin + .4, f.smax - .4));
    return { s, xsec, lo: xsec[0], hi: xsec[xsec.length - 1] };
  });
  const loaded = inkHash(seed, 1, 7) > .5 ? 0 : bands - 1;
  const strokes: InkBrushStroke[] = [];
  for (let j = 0; j < bands; j++) {
    const flip = inkHash(seed, j, 11) > .5;
    let run: { x: number; y: number; r: number }[] = [];
    const flush = () => {
      if (run.length >= 2 && strokes.length < 72) {
        const pts = run.length > 20 ? Array.from({ length: 20 }, (_, i) => run[Math.round(i * (run.length - 1) / 19)]) : run;
        const width = Math.min(120, Math.max(1.2, 2 * Math.max(...pts.map(p => p.r))));
        const nodes: InkBrushNode[] = pts.map((p, i) => ({
          x: clamp(p.x - x0, 0, W), y: clamp(p.y - y0, 0, H),
          pressure: clamp((2 * p.r / width - .075) / .925),
          pace: .7 + (.3 + m.dry) * inkHash(seed + j, i, 13),
        }));
        const travel = nodes.slice(1).reduce((t, n, i) => t + Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y), 0);
        if (travel > 1) strokes.push({
          id: "b" + strokes.length, points: flip ? nodes.reverse() : nodes, width,
          load: j === loaded ? 1 : .72 + .2 * inkHash(seed, j, 17), dryness: clamp(m.dry * (.8 + .4 * inkHash(seed, j, 19))),
          tone: 1, startFrame: 0, durationFrames: 12,
        });
      }
      run = [];
    };
    for (const c of chords) {
      if (c.xsec.length < 2) { flush(); continue; }
      const span = c.hi - c.lo, half = span / bands / 2;
      const mid = c.lo + span * (j + .5) / bands + (inkNoise1(seed + j * 7, c.s / 14, 23) - .5) * half * .5;
      if (!insideAt(c.xsec, mid)) { flush(); continue; }
      // Pressed a little wider than the band: the pigment pooled along a stroke's two sides falls outside the part and
      // is clipped, instead of drawing a grey seam along the part's edge.
      const [x, y] = toXY(f, c.s, mid);
      run.push({ x, y, r: Math.max(.6, half * 1.35) });
    }
    flush();
  }
  if (!strokes.length) return undefined;
  const spec: InkBrushSpec = { version: 1, width: W, height: H, paper: "#ffffff", seed: seed % 2147483647, strokes };
  let wet;
  try { wet = sampleWetInk(spec, 0, { scale: Math.min(1, Math.sqrt(2.1e6 / (W * H))), bleed: m.water, reducedMotion: true }); } catch { return undefined; }
  // Recolour to this part's ink and crop to the pigment: the engine's alpha is the deposit, the colour is ours.
  const k = wet.width / W;
  let cx0 = wet.width, cy0 = wet.height, cx1 = -1, cy1 = -1;
  for (let y = 0; y < wet.height; y++) for (let x = 0; x < wet.width; x++) if (wet.rgba[(y * wet.width + x) * 4 + 3] > 2) {
    cx0 = Math.min(cx0, x); cy0 = Math.min(cy0, y); cx1 = Math.max(cx1, x); cy1 = Math.max(cy1, y);
  }
  if (cx1 < 0) return undefined;
  const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1, rgba = new Uint8Array(cw * ch * 4);
  // A wet wash never runs dry at the part's edge (a pale rim there drew every joint); a dry brush keeps its white (飞白).
  let sum = 0, inked = 0;
  for (let i = 3; i < wet.rgba.length; i += 4) if (wet.rgba[i] > 2) { sum += wet.rgba[i]; inked++; }
  const least = sum / Math.max(1, inked) * clamp(.95 - 2 * m.dry);
  for (let y = 0; y < ch; y++) {
    // Scanline of the wash outline at this row (even-odd), in the part's units.
    const Y = y0 + (cy0 + y + .5) / k, xsec: number[] = [];
    for (const l of clip) for (let i = 0; i < l.length; i++) {
      const p = l[i], q = l[(i + 1) % l.length];
      if ((p[1] > Y) !== (q[1] > Y)) xsec.push(p[0] + (q[0] - p[0]) * (Y - p[1]) / (q[1] - p[1]));
    }
    for (let x = 0; x < cw; x++) {
      const X = x0 + (cx0 + x + .5) / k;
      if (xsec.filter(v => v < X).length % 2 === 0) continue;
      const a = Math.max(least, wet.rgba[((y + cy0) * wet.width + x + cx0) * 4 + 3]), o = (y * cw + x) * 4;
      rgba[o] = color[0]; rgba[o + 1] = color[1]; rgba[o + 2] = color[2]; rgba[o + 3] = Math.round(a * density);
    }
  }
  return { href: wetInkPngDataUri({ ...wet, width: cw, height: ch, rgba }), x: x0 + cx0 / k, y: y0 + cy0 / k, width: cw / k, height: ch / k };
}

// ---- Brush lines (INK1 pressure polygons) --------------------------------------------------------------------------------------

const stroke = (id: string, points: InkPoint[], width: number, water: number, brush: "upright" | "oblique" = "upright", drag = .3): InkStroke =>
  ({ id, points, width, tone: 1, water, load: .9, brush, drag, startFrame: 0, drawFrames: 1, spreadFrames: 0, dryFrames: 1 });
/** Every `n`-th point of a run, keeping its last point. */
const thin = <T,>(pts: T[], max: number) => pts.length <= max ? pts : Array.from({ length: max }, (_, i) => pts[Math.round(i * (pts.length - 1) / (max - 1))]);

/**
 * Lost-and-found contour: runs of the outline lying along the part's long axis (not across the ends, where parts join),
 * each a pressure-swelling brush line set just inside the edge; some runs left out. Ruled work (vehicles, 界画) keeps
 * the whole outline at an even pressure.
 */
function contours(l: Pt[], f: Frame, m: Medium, seed: number, width: number): { d: string; probe: Pt[] }[] {
  const n = normals(l), round = (f.smax - f.smin) < (f.mmax - f.mmin) * 1.35, ruled = m.kind === "ruled";
  const along = l.map((p, i) => {
    const q = l[(i + 1) % l.length], tx = q[0] - p[0], ty = q[1] - p[1], L = Math.hypot(tx, ty) || 1;
    return ruled || round || Math.abs((tx * f.ux + ty * f.uy) / L) > .55;
  });
  let start = along.findIndex(a => !a);
  if (start < 0) start = Math.floor(inkHash(seed, 3, 29) * l.length);
  const runs: number[][] = [];
  let run: number[] = [];
  for (let k = 0; k <= l.length; k++) {
    const i = (start + k) % l.length;
    if (along[i] && k < l.length) run.push(i);
    else { if (run.length >= 3) runs.push(run); run = []; }
  }
  const out: { d: string; probe: Pt[] }[] = [];
  runs.forEach((r, ri) => {
    // A run is laid as several touches of the brush (about 40-60 px each, so a seam and a silhouette sharing one run are
    // judged apart); a few touches are left out altogether (the edge found by the wash alone).
    const pieces = Math.max(1, Math.round(r.length / (18 + 8 * inkHash(seed, ri, 31))));
    for (let pc = 0; pc < pieces; pc++) {
      const a = Math.floor(r.length * pc / pieces), b = Math.floor(r.length * (pc + 1) / pieces) - (pc < pieces - 1 ? 2 : 0);
      const seg = r.slice(a, b);
      if (seg.length < 3 || (!ruled && inkHash(seed, ri * 7 + pc, 37) < .2)) continue;
      const inset = width * .32;
      let arc = 0;
      const pts: InkPoint[] = seg.map((i, k) => {
        if (k) arc += Math.hypot(l[i][0] - l[seg[k - 1]][0], l[i][1] - l[seg[k - 1]][1]);
        const pressure = ruled ? .55 : clamp(.18 + .78 * inkNoise1(seed + ri * 13 + pc, arc / 26, 41));
        return { x: l[i][0] - n[i][0] * inset, y: l[i][1] - n[i][1] * inset, pressure };
      });
      const d = inkOutline(stroke("c", thin(pts, 60), width, ruled ? .2 : .35, "upright", .2), seed + ri * 17 + pc, 1);
      // Probes just outside the edge: if another part of the figure lies there, this edge is a seam, not silhouette.
      const reach = inset + 1.6 + width * .3;
      if (d) out.push({ d, probe: thin(seg, 5).map(i => [l[i][0] + n[i][0] * reach, l[i][1] + n[i][1] * reach] as Pt) });
    }
  });
  return out;
}

/** A drawn line (mane strands, whiskers, rigging): one brush stroke per subpath, swelling in the middle, lifting at the end. */
function lineStrokes(d: string, width: number, seed: number): string[] {
  return flattenPath(d, 1.5).filter(s => s.points.length > 1).map((s, si) => {
    const pts = thin(s.points.map(p => [p[0], p[1]] as Pt), 40), n = pts.length - 1;
    return inkOutline(stroke("l", pts.map(([x, y], i) => ({ x, y, pressure: .12 + .8 * Math.pow(Math.sin(Math.PI * Math.min(1, (i / n) * 1.15)), .7) })),
      width, .3, "upright", .4), seed + si * 19, 1);
  }).filter(Boolean);
}

// ---- Part paint plan -----------------------------------------------------------------------------------------------------------

export interface InkPartPaint {
  /** First flat wash on the exact silhouette (opaque within the figure, so front parts cover back ones). */
  wash?: { d: string; fill: string };
  /** Vapour halos (smoke, light). */
  halos: { d: string; fill: string; opacity: number }[];
  /** The wet brush body. */
  raster?: Raster;
  /** Brush polygons drawn over it; a contour carries a few points along it to find whether it lies over another part. */
  lines: { d: string; fill: string; opacity: number; probe?: Pt[] }[];
  /** Coarse outline, for telling which contours of the parts in front lie over this one. */
  occluder?: Pt[][];
}
/** How far the brush body reaches past the edge of the first wash. */
const CLIP = .9;
const cache = new Map<string, InkPartPaint>();
const CACHE_LIMIT = 4000;
/** Brush bodies are images (data URLs): keep at most this many characters of them. */
const RASTER_LIMIT = 48e6;
let rasterSize = 0;
function hashKey(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

/**
 * The painted marks for one part in its own bone space: pure, cached by role, colour and outline, so the same outline is
 * painted the same way in every frame (and in every rig that shares it).
 */
export function inkPartPaint(role: RigRole, color: string, d: string, far: boolean, line: boolean, lineWidth = 1): InkPartPaint {
  const key = role + "|" + color + "|" + (far ? 1 : 0) + "|" + (line ? lineWidth : "") + "|" + d;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const paint = paintPart(role, color, d, far, line, lineWidth, hashKey(key) % 1000003);
  cache.set(key, paint);
  rasterSize += paint.raster?.href.length ?? 0;
  // The least recently used goes first; the newest always stays.
  for (const [old, p] of cache) {
    if (cache.size === 1 || (cache.size <= CACHE_LIMIT && rasterSize <= RASTER_LIMIT)) break;
    cache.delete(old);
    rasterSize -= p.raster?.href.length ?? 0;
  }
  return paint;
}

function paintPart(role: RigRole, color: string, d: string, far: boolean, line: boolean, lineWidth: number, seed: number): InkPartPaint {
  const m = MEDIA[role] ?? MEDIA.cloth, src = rgbOf(/^#[0-9a-f]{6}$/i.test(color) ? color : "#888888"), { hue, sat, value } = hueSat(src);
  // Ink tone from the colour's value (墨分五色: from pale water to scorched black), paler for far-side parts (远淡).
  const dark = 1 - value, farK = far ? .62 : 1;
  const tinted = mix(INK_RGB, pigmentFor(hue), clamp(sat * m.tint * 1.25) * clamp(.35 + value));
  const out: InkPartPaint = { halos: [], lines: [] };
  if (line) {
    const density = clamp(.5 + .55 * dark) * farK;
    for (const p of lineStrokes(d, Math.max(1.2, lineWidth * 2.6), seed)) out.lines.push({ d: p, fill: hexOf(mix(tinted, INK_RGB, .5)), opacity: r3(density) });
    return out;
  }
  const loops = loopsOf(d, 2.2);
  if (!loops.length) return out;
  if (m.kind !== "vapour") out.occluder = loopsOf(d, 7);
  const f = principal(loops), minDim = Math.min(f.smax - f.smin, f.mmax - f.mmin);
  // A pale eye or claw is a light wash with a firm outline, not a blot of dark ink.
  const md = m.kind === "dark" && value > .55 ? wash(.2, .2, 1, .4, .6) : m;
  if (md.kind === "dark") {
    // Scorched ink: dense and dry, the edge barely wandering.
    const fill = hexOf(mix(WHITE, mix(INK_RGB, tinted, .25), clamp(.7 + .28 * dark) * (far ? .8 : 1)));
    out.wash = { d: loops.map(l => loopD(wander(l, Math.min(.5, minDim * .06), seed))).join(""), fill };
    return out;
  }
  if (md.kind === "vapour") {
    const density = (.1 + .3 * dark) * farK, fill = hexOf(mix(WHITE, tinted, density));
    for (const [k, op] of [[1, .35], [2.2, .18]] as const)
      out.halos.push({ d: loops.map(l => loopD(wander(l.map((p, i) => { const n = normals(l)[i]; return [p[0] + n[0] * k * 3, p[1] + n[1] * k * 3] as Pt; }), 2.5, seed + k * 5))).join(""), fill, opacity: op });
    out.wash = { d: loops.map(l => loopD(wander(l, 1.5, seed))).join(""), fill };
    return out;
  }
  // Wash: a flat first wash, the wet brush body, then the line.
  const density = clamp(.08 + .84 * Math.pow(dark, 1.9)) * farK;
  const edge = Math.min(.9 + md.water * 1.3, minDim * .08);
  const walked = loops.map(l => wander(l, edge, seed));
  out.wash = { d: walked.map(loopD).join(""), fill: hexOf(mix(WHITE, tinted, density * md.base)) };
  if (md.kind === "wash") out.raster = brushBody(loops, md, seed, tinted, clamp(density * .85),
    // A raster pixel past the wash's edge, so the clip never leaves a hairline of the paler first wash between parts.
    walked.map(l => { const n = normals(l); return l.map((p, i) => [p[0] + n[i][0] * CLIP, p[1] + n[i][1] * CLIP] as Pt); }));
  if (md.contour > 0 && minDim > 3.5) {
    const width = clamp(minDim * .1, 1.2, 6) * (.7 + .3 * md.contour);
    const lineInk = hexOf(mix(tinted, INK_RGB, .55));
    const lineDensity = clamp((.5 + .55 * dark) * md.contour) * farK;
    for (const l of walked) for (const c of contours(l, f, md, seed, width)) out.lines.push({ d: c.d, fill: lineInk, opacity: r3(lineDensity), probe: c.probe });
  }
  return out;
}
const r3 = (v: number) => Math.round(v * 1000) / 1000;

// ---- Figure, paper, ground -----------------------------------------------------------------------------------------------------

export interface InkFigureProps {
  spec: RigSpec;
  /** Parts in paint order (with solid faces already added). */
  parts: readonly RigPartFrame[];
  /** Resolved colour of a part (palette, explicit colour or fallback). */
  colorOf: (p: RigPartFrame) => string;
}
type Affine = RigPartFrame["matrix"];
const apply = (m: Affine, [x, y]: Pt): Pt => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
/**
 * How much of each contour is a seam inside the figure rather than its silhouette (in this pose): another part lies just
 * outside it. A shoulder over the body, a head over the neck, one body segment against the next are one mass painted wet
 * into wet, so their seams fade out while the silhouette keeps its line. Measured at a few points fixed along each
 * contour, so it changes only as parts move.
 */
function seamWeights(parts: readonly RigPartFrame[], paints: InkPartPaint[]): number[][] {
  const occ = paints.map((paint, i) => {
    if (!paint.occluder) return undefined;
    const loops = paint.occluder.map(l => l.map(q => apply(parts[i].matrix, q)));
    const xs = loops.flat().map(q => q[0]), ys = loops.flat().map(q => q[1]);
    return { loops, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const inside = (loops: Pt[][], [x, y]: Pt) => {
    let hit = false;
    for (const l of loops) for (let i = 0, j = l.length - 1; i < l.length; j = i++)
      if ((l[i][1] > y) !== (l[j][1] > y) && x < (l[j][0] - l[i][0]) * (y - l[i][1]) / (l[j][1] - l[i][1]) + l[i][0]) hit = !hit;
    return hit;
  };
  return paints.map((paint, i) => paint.lines.map(line => {
    if (!line.probe) return 1;
    let covered = 0;
    for (const q0 of line.probe) {
      const q = apply(parts[i].matrix, q0);
      // Another part here fades the line. Two parts of one body form need no line at all; a limb in front of a body keeps some.
      let seam = 0;
      const mass = parts[i].mass;
      for (let j = 0; j < occ.length && seam < (mass ? 2 : 1); j++) {
        const o = j === i ? undefined : occ[j], other = parts[j].mass;
        if (o && q[0] >= o.x0 && q[0] <= o.x1 && q[1] >= o.y0 && q[1] <= o.y1 && inside(o.loops, q)) seam = Math.max(seam, !mass || !other ? 1 : mass === other ? 2 : .45);
      }
      covered += seam;
    }
    return Math.max(0, 1 - 1.4 * covered / line.probe.length);
  }));
}

/** One rigged figure painted in ink: a single wash layer multiplied into the paper. */
export function InkFigure({ parts, colorOf }: InkFigureProps) {
  const paints = parts.map(p => inkPartPaint(p.role, colorOf(p), shapePath(p.shape), !!p.far, !!p.line, p.lineWidth));
  const seams = seamWeights(parts, paints);
  return <g data-km-rig-ink="" style={{ mixBlendMode: "multiply" }}>
    {parts.map((p, pi) => {
      const paint = paints[pi];
      return <g key={p.id} data-km-rig-part={p.id} transform={matrixAttr(p.matrix)} opacity={p.opacity < 1 ? r3(p.opacity) : undefined}>
        {paint.halos.map((h, i) => <path key={"h" + i} d={h.d} fill={h.fill} opacity={h.opacity} />)}
        {/* In a body form the first wash reaches out under the edge of the brush body over it: the brush body of one part on that of
            the next doubled the ink along their joint. */}
        {paint.wash && <path d={paint.wash.d} fill={paint.wash.fill} fillRule="evenodd" {...(p.mass && paint.raster ? { stroke: paint.wash.fill, strokeWidth: 1.2 * CLIP, strokeLinejoin: "round" } : {})} />}
        {paint.raster && <image href={paint.raster.href} x={f2(paint.raster.x)} y={f2(paint.raster.y)} width={f2(paint.raster.width)}
          height={f2(paint.raster.height)} preserveAspectRatio="none" />}
        {paint.lines.map((l, i) => <path key={i} d={l.d} fill={l.fill} opacity={r3(l.opacity * seams[pi][i])} />)}
      </g>;
    })}
  </g>;
}

/** Xuan paper: warm unsized sheet, uneven sizing in broad soft clouds, fibres lying along and across it. */
export function InkPaper({ width, height, seed }: { width: number; height: number; seed: number }) {
  const raw = useId(), id = "rgx" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const { fibres, clouds, flecks } = useMemo(() => {
    const grain = inkPaperGrain(seed, width, height, Math.round(width * height / 950), 0);
    // One path per opacity step instead of a thousand elements.
    const steps: string[][] = [[], [], []];
    for (const g of grain.fibres) steps[Math.min(2, Math.floor((g.opacity - .1) / .08))].push("M" + f2(g.x) + " " + f2(g.y) + (g.horizontal ? "h" : "v") + f2(g.length));
    const clouds = Array.from({ length: 9 }, (_, i) => ({
      cx: inkHash(seed, i, 61) * width, cy: inkHash(seed, i, 67) * height,
      rx: width * (.12 + .2 * inkHash(seed, i, 71)), ry: height * (.1 + .22 * inkHash(seed, i, 73)), o: .05 + .07 * inkHash(seed, i, 79),
    }));
    const flecks = Array.from({ length: Math.round(width * height / 26000) }, (_, i) => {
      const x = inkHash(seed, i, 83) * width, y = inkHash(seed, i, 89) * height, a = inkHash(seed, i, 97) * Math.PI, L = 2 + 5 * inkHash(seed, i, 101);
      return `M${f2(x)} ${f2(y)}q${f2(Math.cos(a) * L * .5 + 1)} ${f2(Math.sin(a) * L * .5 - 1)} ${f2(Math.cos(a) * L)} ${f2(Math.sin(a) * L)}`;
    }).join("");
    return { fibres: steps.map(s => s.join("")), clouds, flecks };
  }, [width, height, seed]);
  return <g data-km-rig-paper="xuan" pointerEvents="none">
    <defs><radialGradient id={id + "-cloud"}><stop offset="0" stopColor="#d9ccb2" /><stop offset="1" stopColor="#d9ccb2" stopOpacity={0} /></radialGradient></defs>
    <rect width={width} height={height} fill={RIG_XUAN} />
    {clouds.map((c, i) => <ellipse key={i} cx={f2(c.cx)} cy={f2(c.cy)} rx={f2(c.rx)} ry={f2(c.ry)} fill={`url(#${id}-cloud)`} opacity={r3(c.o)} />)}
    <g stroke="#806d58" strokeWidth={.6} fill="none">{fibres.map((d, i) => d && <path key={i} d={d} opacity={.05 + i * .04} />)}</g>
    <path d={flecks} stroke="#5b4c3c" strokeWidth={.7} fill="none" opacity={.26} strokeLinecap="round" />
  </g>;
}

/** Distance from the ground stroke's centre line to its upper edge at full pressure. */
const GROUND_LEAN = 3;
/**
 * One world tile of ground, brushed: a broken dry ground stroke and a pale wash below it, a few grass tufts flicked up
 * (撇) and moss dots (点苔). Seeded by the tile index, so the ground is the same wherever the camera looks from.
 */
export function InkGroundTile({ k, tile, ground, seed }: { k: number; tile: number; ground: number; seed: number }) {
  const marks = useMemo(() => {
    const x0 = k * tile, x1 = x0 + tile, h = (i: number, c: number) => inkHash(seed + 7, k * 131 + i, c);
    const out: { d: string; opacity: number; fill?: string }[] = [];
    // Two overlapping ground strokes per tile, each tapering in and out, so the line breaks where a brush would lift.
    for (let s = 0; s < 2; s++) {
      const a = x0 + (s ? tile * .42 : -tile * .08) + h(s, 1) * 40, b = s ? x1 + tile * .06 + h(s, 2) * 30 : x0 + tile * .62 + h(s, 3) * 50;
      // The brush leans over the ground line, so the stroke's upper edge is the ground and only its lower edge wanders.
      const pts: InkPoint[] = Array.from({ length: 7 }, (_, i) => {
        const pressure = clamp(.2 + .7 * h(s * 10 + i, 7) * Math.sin(Math.PI * (i + .5) / 7));
        return { x: a + (b - a) * i / 6, y: ground + GROUND_LEAN * (.15 + .85 * pressure) + (h(s * 10 + i, 5) - .5) * 1.2, pressure };
      });
      out.push({ d: inkOutline(stroke("g", pts, 10, .3, "oblique", .7), seed + k * 17 + s, 1), opacity: .46 });
    }
    for (let t = 0; t < 3; t++) {
      const x = x0 + (t + .2 + .6 * h(t, 11)) * tile / 3, y = ground + 3 + h(t, 13) * 8, sz = 13 + 12 * h(t, 17);
      if (h(t, 19) < .35) {
        // Moss dots: a few short, loaded touches.
        for (let dI = 0; dI < 3; dI++) {
          const dx = x + (dI - 1) * 5 + h(t * 5 + dI, 23) * 3, dy = y - 1 + h(t * 5 + dI, 29) * 3;
          out.push({ d: inkOutline(stroke("d", [{ x: dx, y: dy, pressure: .7 }, { x: dx + 2.2, y: dy + 1.2, pressure: .9 }, { x: dx + 3, y: dy + 2.6, pressure: .2 }], 4.6, .25), seed + t * 7 + dI, 1), opacity: .78 });
        }
        continue;
      }
      for (let blade = 0; blade < 3; blade++) {
        const lean = (blade - 1) * .55 + (h(t * 3 + blade, 31) - .5) * .5, hgt = sz * (.65 + .5 * h(t * 3 + blade, 37));
        out.push({ d: inkOutline(stroke("t", [
          { x: x + blade * 3, y, pressure: .85 },
          { x: x + blade * 3 + lean * hgt * .35, y: y - hgt * .55, pressure: .45 },
          { x: x + blade * 3 + lean * hgt * .8, y: y - hgt, pressure: .02 },
        ], 4.2, .3, "upright", .5), seed + t * 11 + blade, 1), opacity: .66 });
      }
    }
    return out;
  }, [k, tile, ground, seed]);
  return <g data-km-rig-ink-ground={k}>{marks.map((m, i) => <path key={i} d={m.d} fill={m.fill ?? RIG_INK} opacity={m.opacity} />)}</g>;
}
