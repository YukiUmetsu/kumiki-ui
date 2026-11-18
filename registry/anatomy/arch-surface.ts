/**
 * ARCH1 storybook scenes, part 2: what buildings are made of, at real size.
 *
 * Each surface is a function of (u, v) in metres on the face (u along the face, v up the wall or up the slope) that
 * writes albedo (linear RGB), relief (`h`, metres, for bump shading), cavity (joints and gaps that ambient light does
 * not reach), roughness, a specular weight and an emission. Sizes come from building practice (see
 * `docs/research/architecture-storybook-reference-study-2026-11-17.md`):
 *
 * - ashlar courses 0.25–0.45 m with 3–10 mm joints; random rubble 0.15–0.4 m stones in 10–30 mm mortar, moss in the
 *   joints where it stays damp; Cotswold coursed rubble in thin honey-coloured beds;
 * - brick 215 × 65 mm with 10 mm joints in English or Flemish bond, each brick fired a little differently;
 * - limewash that flakes where salts and damp push it off, showing the brick or stone below;
 * - oak frames proud of their infill, with pegs at the joints; close studding, square panels, St Andrew's crosses;
 * - slates in courses about 0.2 m deep, stone slates diminishing from about 0.4 m at the eaves to 0.1 m at the ridge,
 *   plain tiles at a 100 mm gauge, Roman coppi in ribs about 0.2 m apart, thatch, scalloped shingles, copper turning
 *   to verdigris in streaks, Paris zinc with standing seams;
 * - cobbles and setts, flagstones, grass, water, foliage, firewood, books, jars and bread for the lived-in details.
 *
 * Painters choose the colours; these keep the sizes and the structure.
 */
import { fbm, fbm3, gradNoise, hash2, linearOf, worley } from "./foundation-raster";

export type SurfaceKind =
  | "ashlar" | "rubble" | "coursed-rubble" | "brick" | "limewash" | "plaster" | "timber-frame" | "log" | "boards" | "mudbrick" | "zellige" | "rustication" | "marble" | "flint" | "turf-wall"
  | "slate" | "stone-slate" | "plain-tile" | "pantile" | "thatch" | "shingle" | "copper" | "zinc" | "lead" | "glazed-tile" | "turf"
  | "oak" | "painted-wood" | "iron" | "gold" | "brass" | "glass" | "leaded" | "stained" | "greenhouse"
  | "cobbles" | "setts" | "flags" | "gravel" | "grass" | "dirt" | "water" | "sand" | "rock" | "snow"
  | "foliage" | "firewood" | "books" | "jars" | "bread" | "fabric" | "hay" | "fire" | "flame" | "floorboards" | "tile-floor" | "drawers" | "plain"
  | "parchment" | "polychrome" | "glazed-tube" | "board-concrete" | "travertine" | "titanium" | "steel" | "curtain" | "chinese-screen"
  | "cane" | "leather" | "velvet" | "rug" | "tatami-mat" | "veneer"
  | "rush" | "gold-leaf" | "washi" | "earth" | "enamel" | "canvas" | "jute" | "furrows";

/** One surface in a scene. Colours are sRGB hex; sizes are metres. */
export interface SurfaceSpec {
  kind: SurfaceKind;
  /** Main colour (stone, paint, paint over flakes, tiles). */
  colour?: string;
  /** Second colour (mortar, timber of a frame, stripe of fabric, under-paint). */
  colour2?: string;
  /** Course or unit height (ashlar, logs, slates), metres. */
  course?: number;
  /** Unit length (blocks, bricks), metres. */
  unit?: number;
  /** Weathering 0–1: darkening, streaks, worn arrises. */
  age?: number;
  /** Moss 0–1, in joints and on surfaces that face up or stay damp. */
  moss?: number;
  /** Limewash or paint lost 0–1, showing `under`. */
  flake?: number;
  /** What a flaking coat shows beneath it. */
  under?: SurfaceKind;
  /** Timber-frame pattern. */
  pattern?: "close" | "square" | "cross" | "colombage" | "fachwerk" | "herringbone" | "english" | "flemish" | "diamond" | "fish" | "star" | "medallion" | "rose" | "byobu" | "fusuma" | "plain" | "check" | "globe" | "text" | "ablaq";
  /** Storey height for a frame's rails, and the sill height of its middle rail. */
  storey?: number;
  sill?: number;
  /** Post spacing for frames. */
  spacing?: number;
  /** Emission strength (fire, lit windows) as a multiple of the sun's diffuse light. */
  emit?: number;
  /** Soot: darken toward the top of this height (chimneys). */
  soot?: number;
  /** Diminishing courses (stone slates): the heights of the eaves and the ridge, metres (local). */
  eave?: number;
  ridge?: number;
  /** Clear glass: how much of what lies behind a pane shows through it (0–1). */
  clear?: number;
  /** A quarter turn of the pattern (a mat laid the other way). */
  turn?: boolean;
  /** Added to (u, v) before painting: carries one picture across separate pieces (the panels of a screen, a painting's centre). */
  offset?: readonly [number, number];
}

/** What a surface writes at one point (reused; no allocation per pixel). */
export interface SurfOut {
  r: number; g: number; b: number;
  /** Relief, metres (bump shading). */
  h: number;
  /** Cavity 0–1: 1 open face, 0 deep in a joint. */
  cav: number;
  rough: number;
  /** Specular weight 0–1 (glass and water near 1, wet stone a little). */
  spec: number;
  metal: number;
  /** Emission, linear RGB. */
  er: number; eg: number; eb: number;
  /** How porous (darkens when wet) 0–1. */
  porous: number;
  /** Glass: 1 shows reflections and what lies behind (night glow). */
  glass: number;
  /** Clear glass: how much of what lies behind shows through (glasshouses), 0–1. */
  clear: number;
}
export const newSurfOut = (): SurfOut => ({ r: 0.5, g: 0.5, b: 0.5, h: 0, cav: 1, rough: 0.8, spec: 0.04, metal: 0, er: 0, eg: 0, eb: 0, porous: 0.5, glass: 0, clear: 0 });

/** Inputs besides (u, v): the piece tone (0–1), the pixel footprint (m), the normal's up component, the height. */
export interface SurfIn { tone: number; fw: number; ny: number; y: number; seed: number; /** World position (for solid textures on large rough masses). */ wx: number; wy: number; wz: number }
export type SurfFn = (u: number, v: number, i: SurfIn, o: SurfOut) => void;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** How much of a pattern of period `scale` (m) a pixel `fw` metres wide can show: 1 when well resolved, 0 when finer than about two pixels (the pattern fades to its average instead of aliasing). */
const resolve = (fw: number, scale: number) => clamp01(1.6 - (fw * 3.2) / scale);
const sst = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const set = (o: SurfOut, c: readonly number[], k = 1) => { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; };
const mixInto = (o: SurfOut, c: readonly number[], t: number) => { o.r += (c[0] - o.r) * t; o.g += (c[1] - o.g) * t; o.b += (c[2] - o.b) * t; };
const tint = (c: readonly number[], k: readonly number[]) => [c[0] * k[0], c[1] * k[1], c[2] * k[2]];
/** A colour varied per piece: brightness ±`v`, and a little hue drift (warmer or cooler). */
const vary = (c: readonly number[], h: number, v: number, warm = 0.06): number[] => { const k = 1 + (h - 0.5) * 2 * v, w = (hash2(911, Math.floor(h * 1e6), 7) - 0.5) * warm; return [c[0] * k * (1 + w), c[1] * k, c[2] * k * (1 - w)]; };
const ABLAQ_DARK = linearOf("#3e3b38"), ABLAQ_OCHRE = linearOf("#c99a62");
const MOSS = linearOf("#6b7536"), MOSS_DARK = linearOf("#3f4a22"), LICHEN = linearOf("#b7b08a"), SOOT = linearOf("#1d1916");

/** Rows of units with staggered joints: returns the unit's id, the distance to the nearest joint (m) and the row. */
function courses(u: number, v: number, rowH: number, unitL: number, seed: number, jitterL = 0.35, stagger = 0.5) {
  const row = Math.floor(v / rowH), fy = v - row * rowH;
  const off = (row % 2 ? stagger : 0) * unitL + hash2(seed, row, 3) * unitL * 0.3;
  const uu = u + off;
  // units of varied length: walk from a cell of fixed size and jitter the joint inside it
  const cell = Math.floor(uu / unitL), j0 = (hash2(seed, cell, row) - 0.5) * jitterL * unitL, j1 = (hash2(seed, cell + 1, row) - 0.5) * jitterL * unitL;
  const x0 = cell * unitL + j0, x1 = (cell + 1) * unitL + j1;
  const inFirst = uu < x0, id = inFirst ? cell - 1 : uu > x1 ? cell + 1 : cell;
  const left = inFirst ? (cell - 1) * unitL + (hash2(seed, cell - 1, row) - 0.5) * jitterL * unitL : uu > x1 ? x1 : x0;
  const right = inFirst ? x0 : uu > x1 ? (cell + 2) * unitL + (hash2(seed, cell + 2, row) - 0.5) * jitterL * unitL : x1;
  const dj = Math.min(uu - left, right - uu, fy, rowH - fy);
  return { id: hash2(seed + 5, id, row), dj, row, fy, fx: (uu - left) / Math.max(1e-6, right - left) };
}

/** Moss and lichen over any masonry: in the joints and laps (`inJoint` 1), on what faces up, near the damp ground, in patches. */
function mossOver(o: SurfOut, u: number, v: number, amount: number, i: SurfIn, inJoint: number) {
  if (amount <= 0) return;
  const n = fbm(i.seed + 71, u * 1.7, v * 1.7, 3), fine = gradNoise(i.seed + 73, u * 23, v * 23);
  const where = amount * (0.6 * inJoint + 0.45 * Math.max(0, i.ny) + 0.35 * sst(1.5, 0, i.y) + 0.3 * n) - 0.42 + 0.12 * fine;
  const m = sst(0, 0.25, where);
  if (m > 0) { mixInto(o, fine > 0.2 ? MOSS : MOSS_DARK, m * 0.9); o.h += m * 0.006; o.rough = Math.max(o.rough, 0.95); }
  const lich = sst(0.62, 0.7, n * 0.5 + 0.5 + fine * 0.1) * amount * 0.6;
  if (lich > 0 && m < 0.3) mixInto(o, LICHEN, lich * 0.5);
}

/** Age: grime that gathers at the bottom and runs down from ledges in streaks; worn arrises. */
function grime(o: SurfOut, u: number, v: number, age: number, i: SurfIn) {
  if (age <= 0) return;
  const streak = sst(0.15, 0.9, fbm(i.seed + 31, u * 6, v * 0.35, 3) * 0.5 + 0.5) * age * 0.35;
  const damp = sst(0.9, 0.05, i.y) * age * 0.35 * (0.7 + 0.3 * fbm(i.seed + 33, u * 2, v * 2, 2));
  const k = 1 - streak - damp;
  o.r *= k; o.g *= k * 1.0; o.b *= k * 0.98;
}

/**
 * Flat-sawn wood figure in a board's own coordinates (`a` across the grain from the board's centre line, `l` along it):
 * growth rings cut by the face at a slight angle make the arched "cathedral" figure; latewood bands are darker; ring-porous
 * oak shows its earlywood pores as fine dashes and its rays as short pale flecks. Each board (`board`, 0–1) has its own
 * pith offset, depth, tilt and growth rate. Where a pixel covers several rings the figure fades to its average.
 */
function woodGrain(a: number, l: number, seed: number, board: number, fw: number, oak = true) {
  const bi = Math.floor(board * 1e6), h = (k: number) => hash2(seed + 40 + k, bi, k);
  const pith = (h(1) - 0.5) * 0.3, depth = 0.03 + h(2) * 0.22, tilt = (h(3) - 0.5) * 0.08, sp = 0.0022 + 0.0045 * h(4);
  const wob = fbm(seed + 44, l * 0.7 + bi, a * 5, 3) * 0.005 + gradNoise(seed + 45, l * 3, a * 25) * 0.0012;
  const f = frac((Math.hypot(a - pith, depth + tilt * l) + wob) / sp);
  const late = sst(0.55, 0.85, f) * (1 - sst(0.93, 1.0, f)), rr = resolve(fw, sp * 2.2);
  let k = (1 - 0.3 * (late * rr + 0.33 * (1 - rr))) * (0.93 + 0.14 * (fbm(seed + 46, l * 0.25 + bi, a * 2, 2) * 0.5 + 0.5));
  let pore = 0;
  if (oak) {
    pore = sst(0.6, 0.82, gradNoise(seed + 47, a * 700, l * 45)) * (1 - sst(0.06, 0.25, f)) * resolve(fw, 0.0016);
    k *= 1 + 0.14 * sst(0.72, 0.92, gradNoise(seed + 48, a * 320, l * 22)) * resolve(fw, 0.0025);
  }
  k *= 1 - 0.3 * pore;
  return { k, h: 0.00025 * (late - 0.33) * rr - 0.00015 * pore };
}

// ---- The surfaces -------------------------------------------------------------------------------------------------------------

const SG = { blue: linearOf("#2a52b0"), deep: linearOf("#1c3480"), ruby: linearOf("#a8162a"), gold: linearOf("#e0a52e"), green: linearOf("#2f8a46"), white: linearOf("#c9cdb8"), purple: linearOf("#7a3080"), flesh: linearOf("#d9a888") };
const frac = (x: number) => x - Math.floor(x);
/**
 * Chartres-type stained glass, in a panel's own coordinates (u across from its centre line, v up from its sill; a rose
 * is centred on its middle). A lancet holds medallions (circles and quatrefoils, each with a pearl fillet and a ruby
 * band round a robed figure with a haloed head) on a blue mosaic ground with a ruby trellis, inside a border of ruby and
 * blue pieces with gold lozenges; a rose has a ruby centre, twelve petals of alternating blue and ruby each with a
 * roundel, and a jewelled rim. Returns the glass colour, the distance to the nearest lead (`edge`) and iron bar (`iron`),
 * how much grisaille paint darkens it and a piece id.
 */
function stainedDesign(u: number, v: number, W: number, rose: boolean, seed: number): { c: readonly number[]; edge: number; iron: number; paint: number; id: number } {
  let c: readonly number[] = SG.blue, edge = 1, iron = 1, paint = 0, id = 0.5;
  const pieces = (sc: number, k: number) => { const w = worley(seed + k, u / sc, v / sc, 0.9); id = w.id; return { id: w.id, e: (w.f2 - w.f1) * sc * 0.5 }; };
  if (rose) {
    const R = W / 2, q = Math.hypot(u, v), a = (Math.atan2(v, u) / (Math.PI * 2)) * 12, ai = ((Math.floor(a) % 12) + 12) % 12, fa = frac(a), spoke = Math.min(fa, 1 - fa) * ((Math.PI * 2) / 12) * q;
    iron = Math.min(spoke, Math.abs(q - 0.3 * R), Math.abs(q - 0.84 * R));
    if (q < 0.3 * R) { const p = pieces(0.06, 1); c = p.id < 0.5 ? SG.ruby : p.id < 0.75 ? SG.gold : p.id < 0.9 ? SG.white : SG.green; edge = p.e; iron = Math.min(iron, Math.abs(q - 0.3 * R)); }
    else if (q < 0.84 * R) {
      const an = ((ai + 0.5) / 12) * Math.PI * 2, cx = Math.cos(an) * 0.57 * R, cy = Math.sin(an) * 0.57 * R, dr = Math.hypot(u - cx, v - cy), rr = 0.15 * R;
      if (dr < rr) { const p = pieces(0.045, 2 + ai); c = p.id < 0.35 ? SG.gold : p.id < 0.6 ? SG.green : p.id < 0.8 ? SG.white : SG.flesh; edge = Math.min(p.e, rr - dr); paint = 0.35 * (1 - dr / rr); }
      else { const p = pieces(0.09, 20); c = ai % 2 ? SG.ruby : SG.blue; edge = Math.min(dr - rr, p.e * 2); }
    } else if (q < R) { const pr = Math.hypot(q - 0.92 * R, frac((Math.atan2(v, u) / (Math.PI * 2)) * 36) * ((Math.PI * 2 * q) / 36) - (Math.PI * q) / 36); c = pr < 0.035 ? SG.white : SG.deep; edge = Math.min(Math.abs(pr - 0.035), Math.abs(q - 0.84 * R)); }
    return { c, edge, iron, paint, id };
  }
  const bw = Math.min(0.17, W * 0.12), au = Math.abs(u), inner = W / 2 - bw;
  if (au > inner) {
    // the border: a white pearl fillet, then ruby and blue pieces each holding a gold lozenge
    const fil = au - inner, k = Math.floor(v / 0.16), fv = v - k * 0.16 - 0.08;
    if (fil < 0.025) { c = SG.white; edge = Math.min(fil, 0.025 - fil, 0.08 - Math.abs(fv)); }
    else { const du = au - (inner + 0.025 + (bw - 0.025) / 2), dl = Math.abs(du) + Math.abs(fv) * 0.9, lz = bw * 0.3; c = dl < lz ? SG.gold : k % 2 ? SG.ruby : SG.blue; edge = Math.min(Math.abs(dl - lz), 0.08 - Math.abs(fv), fil - 0.025, W / 2 - au); }
    id = frac(k * 0.618);
    return { c, edge, iron: Math.min(W / 2 - au + 0.01, iron), paint, id };
  }
  const Pm = W * 1.12, m = Math.floor(v / Pm), dv = v - (m + 0.5) * Pm, Rm = Math.min(inner * 0.94, W * 0.36);
  iron = Math.abs(v - Math.round(v / Pm) * Pm);
  let dS: number;
  if (m % 2 === 0) dS = Math.hypot(u, dv) - Rm;
  else { const lr = Rm * 0.56, lo = Rm * 0.44; dS = Math.min(Math.hypot(u - lo, dv), Math.hypot(u + lo, dv), Math.hypot(u, dv - lo), Math.hypot(u, dv + lo)) - lr; }
  if (dS < 0) {
    if (dS > -0.022) { c = SG.white; edge = Math.min(-dS, dS + 0.022); }
    else if (dS > -0.06) { c = SG.ruby; edge = Math.min(-dS - 0.022, dS + 0.06); }
    else {
      // a robed figure with a haloed head standing on green ground, against blue (or ruby) by turns
      const head = Math.hypot(u, dv - Rm * 0.42), halo = head < Rm * 0.2, body = Math.abs(u) < Rm * (0.16 + 0.22 * clamp01((Rm * 0.3 - dv) / (Rm * 0.9))) && dv < Rm * 0.3 && dv > -Rm * 0.62;
      const p = pieces(0.07, 3 + m);
      if (head < Rm * 0.12) { c = SG.flesh; edge = Rm * 0.12 - head; paint = 0.25; }
      else if (halo) { c = SG.gold; edge = Math.min(head - Rm * 0.12, Rm * 0.2 - head); }
      else if (body) { c = p.id < 0.4 ? SG.white : p.id < 0.65 ? SG.green : p.id < 0.85 ? SG.purple : SG.gold; edge = p.e; paint = 0.5 * sst(0.25, 0.0, Math.abs(Math.sin(u * 55 + gradNoise(seed, u * 6, v * 6) * 3))); }
      else if (dv < -Rm * 0.62) { c = SG.green; edge = Math.min(p.e, Math.abs(dv + Rm * 0.62)); }
      else { c = m % 4 === 0 ? SG.blue : SG.ruby; edge = p.e * 1.6; }
      edge = Math.min(edge, -dS - 0.06);
    }
  } else {
    // the mosaic ground: small blue squares in a ruby trellis
    const a = (u + v) / 0.13, b2 = (u - v) / 0.13, ld = Math.min(frac(a), 1 - frac(a), frac(b2), 1 - frac(b2)) * 0.092;
    c = ld < 0.009 ? SG.ruby : frac(Math.floor(a) * 0.37 + Math.floor(b2) * 0.61) < 0.5 ? SG.blue : SG.deep; edge = Math.min(Math.abs(ld - 0.009), dS, inner - au);
    id = frac(Math.floor(a) * 0.37 + Math.floor(b2) * 0.61);
  }
  return { c, edge, iron, paint, id };
}

/** Build the function that paints one surface (every field starts from its default, so no pixel inherits the last one's). */
export function surfaceFn(s: SurfaceSpec, seed = 1): SurfFn {
  const f = surfaceBody(s, seed), glow = s.kind !== "fire" && s.kind !== "flame" ? s.emit ?? 0 : 0, ou = s.offset?.[0] ?? 0, ov = s.offset?.[1] ?? 0;
  return (u, v, i, o) => {
    o.h = 0; o.cav = 1; o.rough = 0.8; o.spec = 0.04; o.metal = 0; o.er = 0; o.eg = 0; o.eb = 0; o.porous = 0.5; o.glass = 0; o.clear = 0;
    f(u + ou, v + ov, i, o);
    // a surface lit from behind (stained glass in a dark church, a paper lantern) glows in its own colour
    if (glow > 0) { o.er = o.r * glow; o.eg = o.g * glow; o.eb = o.b * glow; }
  };
}

function surfaceBody(s: SurfaceSpec, seed: number): SurfFn {
  const C = (hex: string | undefined, dflt: string) => linearOf(hex ?? dflt);
  const age = s.age ?? 0.4, moss = s.moss ?? 0;
  switch (s.kind) {
    case "ashlar": case "rustication": case "marble": {
      const stone = C(s.colour, s.kind === "marble" ? "#e9e4da" : "#d6c39b"), mortar = C(s.colour2, "#cdbf9f"), H = s.course ?? (s.kind === "rustication" ? 0.5 : 0.36), L = s.unit ?? H * 2.1;
      const joint = s.kind === "rustication" ? 0.045 : s.kind === "marble" ? 0.003 : 0.008, rust = s.kind === "rustication";
      return (u, v, i, o) => {
        const c = courses(u, v, H, L, seed, 0.3);
        // each block cut from its own part of the bed: brighter or duller, warmer (iron-stained) or greyer
        // ablaq (Syria, Egypt): courses of black basalt and pale limestone by turns, every third pale course a warm ochre
        const base = s.pattern === "ablaq" ? (c.row % 2 ? ABLAQ_DARK : c.row % 6 === 2 ? ABLAQ_OCHRE : stone) : stone;
        const col = vary(base, c.id, s.kind === "marble" ? 0.04 : 0.11, s.kind === "marble" ? 0.03 : 0.18);
        const grain = fbm(seed + 3, u * 9, v * 9, 3), pits = gradNoise(seed + 9, u * 60, v * 60);
        set(o, col, 1 + grain * 0.06 + pits * 0.02);
        if (!rust && s.kind !== "marble") {
          // bedding layers through the block, shell fragments and voids in the limestone, the mason's tooling, chipped arrises
          const bed = Math.sin(v * 95 + c.id * 40 + fbm(seed + 11, u * 2, v * 14, 2) * 2.5) * resolve(i.fw, 0.012);
          const sh = worley(seed + 12, u / 0.006, v / 0.006, 0.9), rs = resolve(i.fw, 0.008), shell = sh.f1 < 0.32 ? (sh.id > 0.9 ? -0.22 : sh.id < 0.06 ? 0.14 : 0) : 0;
          const tool = Math.sin((u * 0.6 + v) * 700 + gradNoise(seed + 13, u * 8, v * 8) * 4) * resolve(i.fw, 0.0025);
          const chip = sst(0.62, 0.8, gradNoise(seed + 14, u * 30, v * 30)) * sst(0.025, 0.004, c.dj);
          const k = 1 + 0.025 * bed + shell * rs + 0.012 * tool - 0.12 * chip;
          o.r *= k; o.g *= k; o.b *= k * 0.995;
          o.h += 0.0003 * tool - 0.004 * chip - (shell < 0 ? 0.0008 * rs : 0);
        }
        const inJoint = sst(joint, joint * 0.4, c.dj) * resolve(i.fw, H * 0.5);
        // rusticated blocks have chamfered, deep channels; ashlar arrises are a little worn
        const edge = rust ? sst(0, 0.07, c.dj) : sst(0, 0.012, c.dj);
        o.h = rust ? 0.05 * edge + 0.004 * grain : 0.002 * edge + 0.0015 * grain + 0.0005 * pits;
        if (inJoint > 0) { mixInto(o, mortar, inJoint * 0.85); o.h -= 0.004 * inJoint; }
        o.cav = 1 - (rust ? 0.55 : 0.35) * inJoint - (rust ? 0.25 * (1 - edge) : 0);
        o.rough = s.kind === "marble" ? 0.35 : 0.85; o.spec = s.kind === "marble" ? 0.06 : 0.03; o.porous = s.kind === "marble" ? 0.15 : 0.6;
        grime(o, u, v, age, i); mossOver(o, u, v, moss, i, inJoint);
      };
    }
    case "rubble": case "coursed-rubble": case "flint": {
      const stone = C(s.colour, s.kind === "flint" ? "#4a4a4c" : "#a99c84"), mortar = C(s.colour2, "#bcb19a"), coursed = s.kind === "coursed-rubble", flint = s.kind === "flint";
      const H = s.course ?? (coursed ? 0.13 : 0.24), L = s.unit ?? (coursed ? 0.42 : 0.3);
      return (u, v, i, o) => {
        let id: number, dj: number;
        if (coursed) { const bend = 0.035 * gradNoise(seed + 13, u * 0.4, 0) , w = worley(seed, u / L * 1.2, (v + bend) / H, 0.8); id = w.id; dj = (w.f2 - w.f1) * H * 0.55; }
        else { const w = worley(seed, u / L * 1.15, v / H * 1.0, 0.95); id = w.id; dj = (w.f2 - w.f1) * Math.min(L, H) * 0.42; }
        const col = vary(stone, id, flint ? 0.25 : 0.16, 0.1);
        const tex = fbm(seed + 3, u * 7, v * 7, 3);
        set(o, col, 1 + tex * 0.08);
        if (flint) { const glint = sst(0.5, 0.9, gradNoise(seed + 4, u * 40, v * 40)); mixInto(o, [0.18, 0.18, 0.2], glint * 0.4); }
        const jw = coursed ? 0.012 : 0.022, inJoint = sst(jw, jw * 0.3, dj);
        // each stone domed a little: higher in its middle, falling to the mortar
        o.h = 0.018 * sst(0, 0.05, dj) + 0.004 * tex;
        if (inJoint > 0) { mixInto(o, mortar, inJoint * 0.9); o.h -= 0.008 * inJoint; }
        o.cav = 1 - 0.55 * inJoint; o.rough = 0.9; o.spec = flint ? 0.08 : 0.03; o.porous = 0.65;
        grime(o, u, v, age, i); mossOver(o, u, v, moss, i, inJoint);
      };
    }
    case "brick": {
      const red = C(s.colour, "#9b4f37"), mortar = C(s.colour2, "#c9bda5"), H = 0.075, L = 0.225, flemish = s.pattern === "flemish";
      return (u, v, i, o) => {
        const row = Math.floor(v / H), fy = v - row * H, header = flemish ? false : row % 2 === 1;
        const unit = header ? L / 2 : L, off = flemish ? (row % 2) * L * 0.75 : 0, uu = u + off;
        let cell: number, fx: number, w: number;
        if (flemish) { const pair = L * 1.5, k = Math.floor(uu / pair), f = uu - k * pair; if (f < L) { cell = k * 2; fx = f; w = L; } else { cell = k * 2 + 1; fx = f - L; w = L / 2; } }
        else { cell = Math.floor(uu / unit); fx = uu - cell * unit; w = unit; }
        const id = hash2(seed, cell, row), dj = Math.min(fx, w - fx, fy, H - fy);
        let col = vary(red, id, 0.16, 0.12);
        if (flemish && w < L && hash2(seed + 2, cell, row) > 0.4) col = tint(col, [0.62, 0.6, 0.66]); // burnt headers
        const tex = fbm(seed + 3, u * 30, v * 30, 2);
        set(o, col, 1 + tex * 0.08);
        const rb = resolve(i.fw, H), inJoint = sst(0.009, 0.004, dj) * rb;
        // below two pixels a brick's own colour (and the headers' chequer) would alias: fade to the wall's average, with a soft mottle
        if (rb < 1) { const k = 1 - rb, mot = 1 + 0.06 * fbm(seed + 8, u * 0.8, v * 0.8, 2); o.r += (red[0] * 0.9 * mot - o.r) * k; o.g += (red[1] * 0.9 * mot - o.g) * k; o.b += (red[2] * 0.92 * mot - o.b) * k; }
        o.h = 0.003 * sst(0, 0.01, dj) * rb + 0.0006 * tex;
        if (inJoint > 0) { mixInto(o, mortar, inJoint * 0.9); o.h -= 0.004 * inJoint; }
        o.cav = 1 - 0.4 * inJoint; o.rough = 0.88; o.spec = 0.03; o.porous = 0.7;
        grime(o, u, v, age, i); mossOver(o, u, v, moss, i, inJoint);
      };
    }
    case "limewash": case "plaster": {
      const coat = C(s.colour, s.kind === "limewash" ? "#efe8d8" : "#d9a66c"), flake = s.flake ?? (s.kind === "limewash" ? 0.25 : 0.12);
      const under = surfaceFn({ kind: s.under ?? "brick", colour: s.colour2, age: age * 0.5, moss: moss * 0.5 }, seed + 1);
      const tmp = newSurfOut();
      return (u, v, i, o) => {
        // flakes gather near the ground and where water runs: a noise field biased low
        const n = fbm(seed + 21, u * 1.3, v * 1.3, 4), fine = fbm(seed + 22, u * 9, v * 9, 3);
        const lose = n * 0.5 + 0.5 + fine * 0.12 + 0.35 * sst(1.6, 0.1, i.y) - (1 - flake) * 0.9;
        const bare = sst(0.0, 0.015, lose - 0.42);
        const trowel = fbm(seed + 23, u * 2.5 + v * 0.8, v * 2.2, 3);
        set(o, coat, 1 + trowel * 0.05 + fine * 0.025);
        // hairline cracks where the plaster has moved, a few patches made good in a slightly different tint
        const cw = worley(seed + 30, u / 0.5, v / 0.5, 1), crack = sst(0.0014, 0.0004, (cw.f2 - cw.f1) * 0.25 + 0.0008 * gradNoise(seed + 32, u * 70, v * 70)) * sst(0.6, 0.78, fbm(seed + 31, u * 1.1, v * 1.1, 2) * 0.5 + 0.5) * resolve(i.fw, 0.003) * clamp01(flake * 4);
        const patch = sst(0.72, 0.74, hash2(seed + 33, Math.floor(u / 0.7 + 0.3 * Math.floor(v / 0.5)), Math.floor(v / 0.5))) * 0.04 * clamp01(flake * 6);
        o.r *= 1 - 0.4 * crack + patch; o.g *= 1 - 0.4 * crack + patch * 0.8; o.b *= 1 - 0.38 * crack + patch * 0.5;
        // limewash is translucent where thin: a hint of the joints below
        o.h = 0.0015 * trowel - 0.0006 * crack; o.cav = 1 - 0.4 * crack; o.rough = 0.92; o.spec = 0.02; o.porous = 0.75;
        if (s.kind === "limewash") { under(u, v, i, tmp); mixInto(o, [tmp.r, tmp.g, tmp.b], 0.08 * (1 - tmp.cav) + 0.03); }
        if (bare > 0) {
          under(u, v, i, tmp);
          o.r += (tmp.r - o.r) * bare; o.g += (tmp.g - o.g) * bare; o.b += (tmp.b - o.b) * bare;
          o.h = o.h * (1 - bare) + (tmp.h - 0.004) * bare; o.cav = o.cav * (1 - bare) + tmp.cav * bare;
          // the coat's broken edge throws a thin dark line
          const rim = sst(0.0, 0.006, lose - 0.42) * (1 - sst(0.006, 0.02, lose - 0.42));
          o.r *= 1 - rim * 0.25; o.g *= 1 - rim * 0.25; o.b *= 1 - rim * 0.25;
        }
        grime(o, u, v, age, i); mossOver(o, u, v, moss, i, 0.3);
      };
    }
    case "timber-frame": {
      const infill = C(s.colour, "#e8dcc2"), oak = C(s.colour2, "#4a3a2c"), storey = s.storey ?? 2.8, sill = s.sill ?? 0.9, sp = s.spacing ?? 0.55, pat = s.pattern ?? "close", W = 0.2;
      return (u, v, i, o) => {
        const sv = ((v % storey) + storey) % storey, k = Math.floor(v / storey);
        const pu = ((u % sp) + sp) % sp;
        // the members of one storey: sole plate, top rail, middle rail, posts or studs, braces
        let d = Math.min(sv, storey - sv) - W * 0.6; // plates
        let dir = 0; // 0 horizontal grain, 1 vertical, 2 diagonal
        if (pat === "close" || pat === "colombage") { const dp = Math.min(pu, sp - pu) - W * 0.5; if (dp < d) { d = dp; dir = 1; } if (pat === "colombage") { const dr = Math.abs(sv - sill) - W * 0.4; if (dr < d) { d = dr; dir = 0; } } }
        else {
          const wide = sp * 2, pw = ((u % wide) + wide) % wide, dp = Math.min(pw, wide - pw) - W * 0.55;
          if (dp < d) { d = dp; dir = 1; }
          const dr = Math.abs(sv - sill) - W * 0.45; if (dr < d) { d = dr; dir = 0; }
          if (pat === "cross" || pat === "fachwerk") {
            // St Andrew's cross below the middle rail; a curved brace above
            if (sv < sill) { const a = pw / wide, b = sv / sill, dx = Math.min(Math.abs(a - b), Math.abs(a - (1 - b))) * Math.min(wide, sill) * 0.75 - W * 0.4; if (dx < d) { d = dx; dir = 2; } }
            else if (pat === "fachwerk") { const t = (sv - sill) / (storey - sill), cu = pw / wide; const br = Math.abs(cu - 0.5 * (1 - t) ** 1.5) * wide * 0.6 - W * 0.35; if (br < d && cu < 0.5) { d = br; dir = 2; } }
          }
          if (pat === "square") { const a = pw / wide, b = (sv - sill) / (storey - sill); if (b > 0 && b < 0.45 && a < 0.35) { const dx = Math.abs(a / 0.35 - (1 - b / 0.45)) * 0.3 - W * 0.4; if (dx < d) { d = dx; dir = 2; } } }
        }
        const tim = sst(0.004, -0.004, d);
        const tex = fbm(seed + 4, u * 7, v * 7, 3);
        set(o, infill, 1 + tex * 0.05);
        o.h = 0.0015 * tex; o.cav = 1; o.rough = 0.9; o.porous = 0.75; o.spec = 0.02;
        if (tim > 0) {
          const g = dir === 1 ? u : dir === 0 ? v : u + v, along = dir === 1 ? v : dir === 0 ? u : u - v;
          const grain = Math.sin(g * 140 + fbm(seed + 5, along * 0.6, g * 3, 3) * 9) * 0.5 + 0.5, ck = sst(0.92, 0.98, gradNoise(seed + 6, along * 1.2, g * 30) * 0.5 + 0.5);
          const col = vary(oak, hash2(seed, k, Math.floor(u / sp)), 0.12, 0.08);
          o.r = col[0] * (0.85 + grain * 0.22 - ck * 0.4); o.g = col[1] * (0.85 + grain * 0.22 - ck * 0.4); o.b = col[2] * (0.85 + grain * 0.2 - ck * 0.4);
          o.h = 0.025 * tim + 0.002 * grain - 0.004 * ck; o.rough = 0.8; o.porous = 0.5;
          // oak pegs where members meet
          const pegU = ((u + sp / 2) % sp + sp) % sp - sp / 2, pegV = Math.min(Math.abs(sv - 0.1), Math.abs(sv - storey + 0.1), Math.abs(sv - sill));
          if (Math.hypot(pegU, pegV) < 0.022) { o.r *= 0.62; o.g *= 0.6; o.b *= 0.58; o.h -= 0.002; }
        }
        const edge = sst(0.02, 0, Math.abs(d)); o.cav = 1 - 0.3 * edge * (1 - tim);
        grime(o, u, v, age * 0.8, i); mossOver(o, u, v, moss, i, 0.3);
      };
    }
    case "log": case "boards": {
      const wood = C(s.colour, s.kind === "log" ? "#8a6a48" : "#6d5640"), H = s.course ?? (s.kind === "log" ? 0.2 : 0.18), vertical = s.kind === "boards";
      return (u, v, i, o) => {
        const a = vertical ? u : v, b = vertical ? v : u, row = Math.floor(a / H), f = a - row * H;
        const id = hash2(seed, row, 1), col = vary(wood, id, 0.12, 0.1);
        const g = woodGrain(f - H / 2, b, seed, id, i.fw, false), grain = g.k;
        set(o, col, g.k * (1 + 0.04 * fbm(seed + 3, b * 0.8, a * 14, 3)));
        const rnd = vertical ? sst(0, 0.012, Math.min(f, H - f)) : Math.sqrt(clamp01(1 - ((f / H) * 2 - 1) ** 2));
        o.h = vertical ? 0.006 * rnd + g.h : 0.04 * rnd + 0.002 * grain; o.cav = vertical ? 0.55 + 0.45 * rnd : 0.35 + 0.65 * rnd;
        // weathered silver on the outside of old wood
        const silver = (s.age ?? 0.4) * 0.5 * (0.6 + 0.4 * fbm(seed + 4, b * 0.4, a * 0.4, 2));
        mixInto(o, [0.32, 0.3, 0.28], silver);
        o.rough = 0.85; o.porous = 0.55; o.spec = 0.02;
        grime(o, u, v, age * 0.6, i); mossOver(o, u, v, moss, i, 1 - rnd);
      };
    }
    case "mudbrick": case "turf-wall": {
      const earth = C(s.colour, s.kind === "turf-wall" ? "#6a6040" : "#b98a5e");
      return (u, v, i, o) => {
        const lift = 0.7, row = Math.floor(v / lift), f = v - row * lift;
        const n = fbm(seed + 3, u * 3, v * 3, 4), fine = gradNoise(seed + 4, u * 40, v * 40);
        set(o, vary(earth, hash2(seed, row, 2), 0.06), 1 + n * 0.08 + fine * 0.03);
        // rammed-earth lifts show as faint horizontal lines and a row of putlog holes
        const seam = sst(0.012, 0, Math.min(f, lift - f)), hu = ((u % 1.4) + 1.4) % 1.4 - 0.7, hole = sst(0.06, 0.045, Math.hypot(hu, f - 0.05));
        o.r *= 1 - 0.12 * seam - 0.5 * hole; o.g *= 1 - 0.12 * seam - 0.5 * hole; o.b *= 1 - 0.12 * seam - 0.5 * hole;
        o.h = 0.01 * n + 0.002 * fine - 0.01 * hole; o.cav = 1 - 0.7 * hole - 0.1 * seam; o.rough = 0.95; o.porous = 0.8; o.spec = 0.02;
        if (s.kind === "turf-wall") { const g = sst(-0.1, 0.4, n + 0.2 * fine); mixInto(o, linearOf("#56693a"), g * 0.6); }
        grime(o, u, v, age * 0.5, i);
      };
    }
    case "zellige": case "glazed-tile": {
      const a = C(s.colour, "#2f6f73"), b = C(s.colour2, "#efe7d3"), T = s.unit ?? 0.1, star = s.pattern === "star";
      const third = linearOf("#b8892f"), fourth = linearOf("#2c3f6e");
      return (u, v, i, o) => {
        const cu = Math.floor(u / T), cv = Math.floor(v / T), fu = u / T - cu - 0.5, fv = v / T - cv - 0.5;
        // an eight-pointed star in each cell, crosses between
        const r = Math.hypot(fu, fv), ang = Math.atan2(fv, fu), starR = 0.3 + 0.12 * Math.cos(ang * 8);
        const inStar = star ? r < starR : Math.abs(fu) + Math.abs(fv) < 0.42;
        const pick = hash2(seed, cu, cv);
        const col = inStar ? (pick < 0.5 ? a : pick < 0.8 ? fourth : third) : b;
        set(o, vary(col, hash2(seed + 3, cu * 2 + (inStar ? 1 : 0), cv), 0.08));
        const grout = Math.min(0.5 - Math.abs(fu), 0.5 - Math.abs(fv)), edgeS = Math.abs(r - starR);
        const j = sst(0.04, 0.015, Math.min(grout, star ? edgeS : Math.abs(Math.abs(fu) + Math.abs(fv) - 0.42))) * resolve(i.fw, T);
        mixInto(o, [0.55, 0.52, 0.47], j * 0.8);
        o.h = -0.0015 * j; o.cav = 1 - 0.3 * j; o.rough = 0.12; o.spec = 0.6 * (1 - j); o.porous = 0.05;
      };
    }
    // ---- roofs ----
    case "slate": case "stone-slate": case "plain-tile": case "shingle": {
      const dflt = s.kind === "slate" ? "#4b4f57" : s.kind === "stone-slate" ? "#9a8c6e" : s.kind === "plain-tile" ? "#9c5034" : "#7a6248";
      const base = C(s.colour, dflt), stone = s.kind === "stone-slate", shingle = s.kind === "shingle", scallop = shingle && s.pattern === "fish";
      const gauge0 = s.course ?? (s.kind === "slate" ? 0.2 : s.kind === "plain-tile" ? 0.1 : shingle ? 0.13 : 0.32), W0 = s.unit ?? (s.kind === "slate" ? 0.25 : s.kind === "plain-tile" ? 0.165 : shingle ? 0.11 : 0.3);
      const ridge = s.ridge ?? 8;
      return (u, v, i, o) => {
        // stone slates diminish toward the ridge: the course depth shrinks with height
        let row: number, fv: number, gauge = gauge0;
        if (stone) {
          // courses shrink from the eaves to the ridge: count them by integrating 1 / gauge up the slope
          const ye = s.eave ?? 0, Hr = Math.max(0.5, ridge - ye), sp = Math.sqrt(Math.max(0.05, 1 - i.ny * i.ny)), t = clamp01((i.y - ye) / Hr);
          const nCourse = -(Hr / (0.65 * gauge0 * sp)) * Math.log(1 - 0.65 * t);
          row = Math.floor(nCourse); fv = (nCourse - row) * gauge0 * (1 - 0.65 * t); gauge = gauge0 * (1 - 0.65 * t);
        } else { row = Math.floor(v / gauge); fv = v - row * gauge; }
        const W = stone ? W0 * (0.7 + 0.6 * hash2(seed, row, 5)) : W0;
        const uu = u + (row % 2) * W * 0.5 + hash2(seed, row, 8) * (stone ? W : 0), cell = Math.floor(uu / W), fu = uu - cell * W;
        const id = hash2(seed + 1, cell, row);
        const col = vary(base, id, stone ? 0.18 : shingle ? 0.15 : 0.1, s.kind === "plain-tile" ? 0.12 : 0.05);
        const tex = fbm(seed + 2, u * 12, v * 12, 2);
        set(o, col, 1 + tex * 0.06);
        // each unit lies tilted: its butt (the bottom of the course) stands proud, and the course below sits in its shadow
        const lip = fv / gauge, gap = Math.min(fu, W - fu);
        const rv = resolve(i.fw, gauge);
        o.h = ((stone ? 0.03 : 0.014) * (1 - lip) + (s.kind === "plain-tile" ? 0.004 * Math.sin((fu / W) * Math.PI) : 0)) * rv + 0.0015 * tex;
        let cav = 1 - rv * (1 - (0.42 + 0.58 * sst(1, 0.7, lip) * (0.75 + 0.25 * sst(0, 0.12, lip)))) - (1 - rv) * 0.25;
        const gapK = sst(stone ? 0.012 : 0.006, 0, gap) * resolve(i.fw, W);
        cav *= 1 - 0.45 * gapK;
        if (scallop) { const sc = Math.hypot(fu / W - 0.5, (lip - 0.05) * 0.9); if (lip < 0.45 && sc > 0.5) cav *= 0.55; }
        o.r *= 0.6 + 0.4 * cav; o.g *= 0.6 + 0.4 * cav; o.b *= 0.62 + 0.38 * cav;
        o.cav = cav; o.rough = s.kind === "slate" ? 0.55 : 0.85; o.spec = s.kind === "slate" ? 0.12 : 0.03; o.porous = s.kind === "slate" ? 0.25 : 0.65;
        if (s.kind === "slate") { const sheen = gradNoise(seed + 9, u * 3, v * 3); o.r *= 1 + sheen * 0.05; o.b *= 1 + sheen * 0.07; }
        grime(o, u, v, age * 0.5, i); mossOver(o, u, v, moss, { ...i, ny: Math.max(i.ny, 0.6) }, gapK);
      };
    }
    case "pantile": {
      const base = C(s.colour, "#b0603a"), P = s.unit ?? 0.2, L = s.course ?? 0.36;
      return (u, v, i, o) => {
        // coppi: covering tiles in convex ribs down the slope, channels between; rows overlap every L
        const cu = Math.floor(u / P), fu = u / P - cu, row = Math.floor(v / L), fv = v / L - row;
        const rp = resolve(i.fw, P), ribTop = 0.6 + (Math.cos((fu - 0.5) * Math.PI) - 0.6) * rp; // 1 on the rib, 0 in the channel
        const id = hash2(seed, cu, row), col = vary(base, id, 0.17, 0.14);
        const tex = fbm(seed + 2, u * 14, v * 14, 2), lich = sst(0.5, 0.8, fbm(seed + 5, u * 2, v * 2, 3) * 0.5 + 0.5) * (s.age ?? 0.4);
        set(o, col, 0.9 + 0.12 * ribTop + tex * 0.06);
        mixInto(o, [0.55, 0.52, 0.42], lich * 0.45);
        o.h = (0.05 * ribTop + 0.012 * fv) * rp + 0.002 * tex;
        o.cav = 0.45 + 0.55 * (ribTop * 0.6 + 0.4 * sst(0, 0.25, fv)); o.rough = 0.85; o.spec = 0.03; o.porous = 0.7;
        grime(o, u, v, age * 0.4, i); mossOver(o, u, v, moss, { ...i, ny: Math.max(i.ny, 0.6) }, 1 - ribTop);
      };
    }
    case "thatch": {
      const straw = C(s.colour, "#a88b55");
      return (u, v, i, o) => {
        const n = fbm(seed + 1, u * 1.5, v * 1.5, 3), streak = fbm(seed + 2, u * 28, v * 2.2, 3), cut = gradNoise(seed + 3, u * 60, v * 8);
        set(o, straw, 0.78 + 0.25 * (streak * 0.5 + 0.5) + n * 0.08);
        // older thatch greys and greens; the stalk ends make a fine stippled texture
        mixInto(o, [0.2, 0.19, 0.14], clamp01((s.age ?? 0.4) * 0.6 + n * 0.25));
        const rs = resolve(i.fw, 0.05);
        o.h = (0.012 * streak + 0.006 * cut) * rs + 0.008 * n; o.cav = 0.7 + 0.3 * (streak * 0.5 + 0.5) * rs + 0.15 * (1 - rs); o.rough = 1; o.spec = 0; o.porous = 0.8;
        mossOver(o, u, v, moss, { ...i, ny: Math.max(i.ny, 0.6) }, 0.5);
      };
    }
    case "copper": case "zinc": case "lead": {
      const copper = s.kind === "copper", base = C(s.colour, copper ? "#6fa595" : s.kind === "zinc" ? "#7d8790" : "#6f7378"), seamP = s.unit ?? (copper ? 0.5 : 0.6);
      const metalC = linearOf("#a0603a"), brown = linearOf("#5e4a3a");
      return (u, v, _i, o) => {
        const fu = ((u % seamP) + seamP) % seamP, seam = sst(0.025, 0.008, Math.min(fu, seamP - fu));
        const streak = fbm(seed + 1, u * 5, v * 0.6, 3), blot = fbm(seed + 2, u * 1.2, v * 1.2, 3);
        set(o, base, 0.92 + 0.1 * streak);
        if (copper) {
          // verdigris runs down in streaks from where water gathers; brown copper survives under ledges and on seams
          const green = clamp01((s.age ?? 0.7) + 0.35 * blot + 0.25 * streak - 0.2);
          o.r = brown[0] + (o.r - brown[0]) * green; o.g = brown[1] + (o.g - brown[1]) * green; o.b = brown[2] + (o.b - brown[2]) * green;
          mixInto(o, metalC, seam * (1 - green) * 0.5);
          o.metal = 0.6 * (1 - green); o.spec = 0.08 + 0.4 * (1 - green); o.rough = 0.45 + 0.4 * green;
        } else { o.metal = 0.5; o.spec = 0.2; o.rough = 0.5 + 0.2 * blot; }
        o.h = 0.02 * seam + 0.001 * streak; o.cav = 1 - 0.2 * seam; o.porous = 0.05;
      };
    }
    case "turf": {
      const grass = C(s.colour, "#5d6e33");
      return (u, v, _i, o) => {
        const n = fbm(seed + 1, u * 1.4, v * 1.4, 4), tufts = worley(seed + 2, u * 5, v * 5, 1);
        set(o, grass, 0.8 + 0.3 * (n * 0.5 + 0.5)); mixInto(o, [0.32, 0.27, 0.15], sst(0.3, 0.8, n * 0.5 + 0.5) * 0.4);
        o.h = 0.04 * (1 - tufts.f1) + 0.03 * n; o.cav = 0.6 + 0.4 * (1 - tufts.f1); o.rough = 1; o.spec = 0; o.porous = 0.6;
        const flowers = hash2(seed + 3, Math.floor(u * 9), Math.floor(v * 9));
        if (flowers > 0.985) set(o, flowers > 0.993 ? [0.8, 0.75, 0.3] : [0.85, 0.85, 0.82]);
      };
    }
    // ---- wood, metal, glass ----
    case "oak": case "painted-wood": {
      const wood = C(s.colour, s.kind === "oak" ? "#6d5440" : "#3f5b66"), under = linearOf("#7a6650"), flake = s.flake ?? (s.kind === "painted-wood" ? 0.3 : 0);
      return (u, v, i, o) => {
        // boards about 16 cm wide, each with its own figure and tone; paint shows the grain and its brush strokes through
        const bw = 0.16, bi = Math.floor(u / bw), board = hash2(seed + 3, bi, 9), g = woodGrain(u - (bi + 0.5) * bw, v, seed, board, i.fw, s.kind === "oak");
        const grain = g.k;
        if (s.kind === "oak") { set(o, vary(wood, board, 0.07, 0.08), g.k); o.h = g.h; o.rough = 0.5; o.spec = 0.06; }
        else { const brush = fbm(seed + 6, u * 6, v * 70, 2) * resolve(i.fw, 0.004); set(o, wood, 0.97 + 0.04 * (g.k - 0.9) + 0.03 * brush); o.h = 0.4 * g.h + 0.0002 * brush; o.rough = 0.5; o.spec = 0.07; }
        o.cav = 1; o.porous = 0.4;
        if (flake > 0) {
          const lose = fbm(seed + 4, u * 4, v * 9, 4) * 0.5 + 0.5 + 0.15 * gradNoise(seed + 5, u * 40, v * 12) - (1 - flake) * 0.8;
          const bare = sst(0.18, 0.2, lose);
          if (bare > 0) { mixInto(o, tint(under, [0.75 + grain * 0.3, 0.75 + grain * 0.3, 0.75 + grain * 0.3]), bare); o.h -= 0.0008 * bare; o.rough = 0.85; }
        }
        grime(o, u, v, age * 0.5, i);
      };
    }
    case "iron": case "gold": case "brass": {
      const base = C(s.colour, s.kind === "iron" ? "#24221f" : s.kind === "gold" ? "#d8a84a" : "#b08a45");
      return (u, v, _i, o) => {
        const n = fbm(seed, u * 8, v * 8, 2); set(o, base, 0.9 + 0.15 * n);
        if (s.kind === "iron") { const rust = sst(0.35, 0.7, fbm(seed + 1, u * 5, v * 5, 3) * 0.5 + 0.5) * (s.age ?? 0.4); mixInto(o, [0.22, 0.09, 0.04], rust * 0.6); o.metal = 0.3; o.spec = 0.08; o.rough = 0.6; }
        else { o.metal = 1; o.spec = 0.7; o.rough = 0.3 + 0.2 * n; }
        o.h = 0.0005 * n; o.cav = 1; o.porous = 0;
      };
    }
    case "glass": case "leaded": case "stained": case "greenhouse": {
      const lead = linearOf("#2b2a29"), tintC = C(s.colour, s.kind === "greenhouse" ? "#9fb3a8" : "#202831");
      const palette = [linearOf("#a32b2b"), linearOf("#2d4a9a"), linearOf("#d9a930"), linearOf("#3d7a46"), linearOf("#6b3a8a"), linearOf("#c8c2b0")];
      const starPal = [linearOf("#c8862a"), linearOf("#a32030"), linearOf("#2f7a5a"), linearOf("#e0b84a"), linearOf("#1f4a8a"), linearOf("#235a6a")];
      return (u, v, i, o) => {
        set(o, tintC); o.h = 0; o.cav = 1; o.rough = 0.05; o.spec = 1; o.metal = 0; o.porous = 0; o.glass = 1; o.clear = s.clear ?? 0;
        let came = 0;
        if (s.kind === "leaded") {
          // diamond quarries about 0.1 × 0.15 m in 6 mm cames
          const a = u / 0.1 + v / 0.15, b = u / 0.1 - v / 0.15, fa = a - Math.floor(a), fb = b - Math.floor(b);
          came = sst(0.06, 0.03, Math.min(fa, 1 - fa, fb, 1 - fb)) * resolve(i.fw, 0.1) + 0.25 * (1 - resolve(i.fw, 0.1));
          const wave = gradNoise(seed, Math.floor(a) * 3.1, Math.floor(b) * 2.3); o.r *= 1 + wave * 0.25; o.g *= 1 + wave * 0.25; o.b *= 1 + wave * 0.25;
        } else if (s.kind === "stained" && (s.pattern === "medallion" || s.pattern === "rose")) {
          const g = stainedDesign(u, v, s.unit ?? 1.5, s.pattern === "rose", seed);
          const streak = 0.78 + 0.4 * fbm(seed + 5, u * 3, v * 9, 2), piece = 0.86 + 0.28 * g.id;
          set(o, g.c, 0.55 * streak * piece * (1 - 0.55 * g.paint));
          const rl = resolve(i.fw, 0.05), ri = resolve(i.fw, 0.25);
          came = clamp01(Math.max(sst(0.012, 0.006, g.edge) * rl + 0.16 * (1 - rl), sst(0.024, 0.016, g.iron) * ri + 0.06 * (1 - ri)));
          o.glass = 0.6;
        } else if (s.kind === "stained" && s.pattern === "star") {
          // geometric glass of the Islamic world: eight-point stars (two squares, one turned 45°) on a ground of crosses, in leads
          const P = s.unit ?? 0.13, cu = Math.floor(u / P), cv = Math.floor(v / P), x = (frac(u / P) - 0.5) * P, y = (frac(v / P) - 0.5) * P, a = P * 0.3;
          const star = Math.min(Math.max(Math.abs(x), Math.abs(y)) - a, (Math.abs(x) + Math.abs(y)) * Math.SQRT1_2 - a), core = Math.hypot(x, y) - a * 0.42;
          set(o, star < 0 ? (core < 0 ? starPal[3] : starPal[(((cu * 3 + cv) % 3) + 3) % 3]) : starPal[4 + (((cu + cv) % 2) + 2) % 2], 0.55);
          const rl = resolve(i.fw, 0.03);
          came = sst(0.006, 0.002, Math.min(Math.abs(star), Math.abs(core), P / 2 - Math.max(Math.abs(x), Math.abs(y)))) * rl + 0.2 * (1 - rl); o.glass = 0.6;
        } else if (s.kind === "stained") {
          const w = worley(seed, u * 7, v * 5, 0.9), k = Math.floor(w.id * palette.length);
          set(o, palette[k], 0.55); came = sst(0.08, 0.03, w.f2 - w.f1); o.glass = 0.6;
        } else if (s.kind === "greenhouse") {
          o.clear = 0.75;
          const P = 0.6, fu = ((u % P) + P) % P, fv = ((v % 0.45) + 0.45) % 0.45; came = sst(0.025, 0.01, Math.min(fu, P - fu)) + 0.6 * sst(0.012, 0.004, Math.min(fv, 0.45 - fv));
          came = clamp01(came);
        }
        if (came > 0) { mixInto(o, lead, came); o.spec *= 1 - came; o.glass *= 1 - came; o.clear *= 1 - came; o.rough = 0.5; o.h = 0.003 * came; }
      };
    }
    // ---- ground ----
    case "cobbles": case "setts": case "flags": case "gravel": {
      const stone = C(s.colour, s.kind === "flags" ? "#8d877b" : "#7b7468"), joint = C(s.colour2, "#4d473e");
      const size = s.unit ?? (s.kind === "cobbles" ? 0.16 : s.kind === "setts" ? 0.14 : s.kind === "gravel" ? 0.03 : 0.7);
      return (u, v, i, o) => {
        let id: number, dj: number, dome: number;
        if (s.kind === "setts" || s.kind === "flags") { const c = courses(v, u, size * (s.kind === "setts" ? 1 : 0.8), size * (s.kind === "setts" ? 1.5 : 1.1), seed, 0.5); id = c.id; dj = c.dj; dome = sst(0, size * 0.3, dj); }
        else { const w = worley(seed, u / size, v / size, 0.9); id = w.id; dj = (w.f2 - w.f1) * size * 0.5; dome = Math.sqrt(clamp01(1 - (w.f1 / 0.62) ** 2)); }
        const col = vary(stone, id, 0.22, 0.12), tex = fbm(seed + 2, u * 20, v * 20, 2);
        set(o, col, 1 + tex * 0.1);
        const gap = sst(size * 0.07, size * 0.02, dj) * resolve(i.fw, size);
        // worn tops polish, the gaps fill with dark grit (and moss on quiet lanes)
        o.h = (s.kind === "flags" ? 0.004 : size * 0.18) * dome * resolve(i.fw, size) + 0.002 * tex;
        if (gap > 0) { mixInto(o, joint, gap * 0.85); o.h -= 0.006 * gap; }
        o.cav = 1 - 0.6 * gap; o.rough = 0.65 - 0.2 * dome; o.spec = 0.05 + 0.04 * dome; o.porous = 0.45;
        mossOver(o, u, v, moss, { ...i, ny: 0 }, gap);
      };
    }
    case "grass": case "dirt": case "sand": case "rock": case "snow": {
      const base = C(s.colour, s.kind === "grass" ? "#6b7a3c" : s.kind === "dirt" ? "#7d6a50" : s.kind === "sand" ? "#cdb88e" : s.kind === "snow" ? "#eef1f4" : "#857e74");
      const rock = s.kind === "rock";
      return (u, v, i, o) => {
        const n = rock ? fbm3(seed + 1, i.wx * 0.35, i.wy * 0.5, i.wz * 0.35, 4) : fbm(seed + 1, u * 0.6, v * 0.6, 4), fine = rock ? fbm3(seed + 2, i.wx * 3, i.wy * 3, i.wz * 3, 2) : fbm(seed + 2, u * 7, v * 7, 3);
        set(o, base, 0.85 + 0.18 * (n * 0.5 + 0.5) + 0.08 * fine);
        if (rock) {
          const strata = 0.5 + 0.35 * fbm3(seed + 4, i.wx * 0.12, i.wy * 0.6, i.wz * 0.12, 2), crack = sst(0.08, 0, Math.abs(fbm3(seed + 3, i.wx * 0.9, i.wy * 0.25, i.wz * 0.9, 2)));
          // bedding planes: thin dark partings every few decimetres, gently warped; dark streaks where water runs down the face
          const bed = sst(0.035, 0.0, Math.abs(frac(i.wy / 0.55 + 0.4 * fbm3(seed + 5, i.wx * 0.05, 0, i.wz * 0.05, 2)) - 0.5) - 0.46) * resolve(i.fw, 0.1) * (1 - Math.abs(i.ny));
          const streak = sst(0.15, 0.6, fbm3(seed + 6, i.wx * 1.4, i.wy * 0.06, i.wz * 1.4, 2)) * (1 - Math.abs(i.ny)) * 0.22;
          const k = (0.86 + 0.14 * strata) * (1 - 0.3 * crack - 0.28 * bed - streak);
          o.r *= k; o.g *= k; o.b *= k * 1.01;
          const lichen = sst(0.6, 0.75, fbm3(seed + 7, i.wx * 0.8, i.wy * 0.8, i.wz * 0.8, 2)) * 0.25; mixInto(o, [0.62, 0.62, 0.5], lichen);
          // plants hold only where soil gathers: on ledges, and there in patches, not as a stripe along every one
          const veg = sst(0.55, 0.8, i.ny + 0.3 * n) * sst(0.1, 0.45, fbm3(seed + 8, i.wx * 0.25, i.wy * 0.25, i.wz * 0.25, 2)) * 0.8; mixInto(o, [0.2, 0.25, 0.1], veg);
        }
        if (s.kind === "grass") {
          // a meadow: drifts of lighter and darker green, sun-dried patches, and flowers where it is near enough to see them
          const drift = fbm(seed + 5, u * 0.12, v * 0.12, 3);
          mixInto(o, [0.42, 0.42, 0.18], sst(0.2, 0.8, n * 0.5 + 0.5) * 0.3); mixInto(o, [0.16, 0.26, 0.08], sst(0.1, 0.8, drift * 0.5 + 0.5) * 0.35); mixInto(o, [0.2, 0.28, 0.1], sst(0.4, 0.9, fine * 0.5 + 0.5) * 0.25);
          if (i.fw < 0.04) { const fl = hash2(seed + 6, Math.floor(u * 7), Math.floor(v * 7)); if (fl > 0.975) set(o, fl > 0.99 ? [0.85, 0.72, 0.2] : fl > 0.982 ? [0.86, 0.86, 0.82] : [0.7, 0.3, 0.45]); }
        }
        if (s.kind === "dirt") { const rut = sst(0.25, 0.0, Math.abs(Math.abs(u) - 0.75)); o.r *= 1 - 0.12 * rut; o.g *= 1 - 0.12 * rut; o.b *= 1 - 0.1 * rut; }
        o.h = 0.02 * fine + 0.05 * n; o.cav = 0.85 + 0.15 * fine; o.rough = s.kind === "snow" ? 0.6 : 0.95; o.spec = s.kind === "snow" ? 0.08 : 0.01; o.porous = s.kind === "rock" ? 0.4 : 0.8;
        if (s.kind === "rock") grime(o, u, v, age, i);
      };
    }
    case "water": {
      const deep = C(s.colour, "#2c4a4f");
      return (u, v, i, o) => {
        // ripples fade out once a pixel covers several of them (they would scatter the reflection into speckle), leaving the long swell
        // each band fades at its own finest wavelength (the swell's is about 1.4 m, the wavelets' 0.23 m, the ripples' 0.11 m)
        const swell = fbm(seed + 2, u * 0.07, v * 0.18, 3), wav = fbm(seed, u * 0.8, v * 2.2, 2), r1 = gradNoise(seed + 1, u * 4, v * 9);
        set(o, deep); o.h = 0.12 * swell * resolve(i.fw, 1.4) + 0.03 * wav * resolve(i.fw, 0.23) + 0.01 * r1 * resolve(i.fw, 0.11); o.cav = 1; o.rough = 0.04; o.spec = 1; o.porous = 0; o.glass = 0.5;
      };
    }
    // ---- nature and lived-in details ----
    case "foliage": {
      const leaf = C(s.colour, "#3f5a2c"), light = linearOf("#7a8f3e");
      return (u, v, _i, o) => {
        const w = worley(seed, u * 9, v * 9, 1), big = fbm(seed + 1, u * 1.1, v * 1.1, 3);
        const lit = w.id;
        set(o, leaf, 0.75 + 0.4 * lit); mixInto(o, light, sst(0.55, 1, lit) * 0.45 * (big * 0.5 + 0.6));
        const gapK = sst(0.06, 0.25, w.f2 - w.f1);
        o.h = 0.03 * (1 - w.f1) + 0.08 * big; o.cav = 0.35 + 0.65 * gapK * (big * 0.3 + 0.7); o.rough = 0.8; o.spec = 0.04; o.porous = 0.2;
        o.r *= 0.6 + 0.4 * gapK; o.g *= 0.6 + 0.4 * gapK; o.b *= 0.6 + 0.4 * gapK;
      };
    }
    case "firewood": {
      const bark = linearOf("#4b3a2b"), endc = C(s.colour, "#b08455");
      return (u, v, _i, o) => {
        // a stack seen end-on: round log ends in the face, bark between
        const w = worley(seed, u / 0.12, v / 0.12, 0.6), r = w.f1;
        const ring = Math.sin(r * 60) * 0.5 + 0.5, isEnd = r < 0.42;
        if (isEnd) { set(o, vary(endc, w.id, 0.2), 0.8 + 0.2 * ring); const crack = sst(0.02, 0, Math.abs(Math.sin(Math.atan2(w.dy, w.dx) * 2 + w.id * 6)) * r); o.r *= 1 - 0.4 * crack; o.g *= 1 - 0.4 * crack; o.b *= 1 - 0.4 * crack; }
        else set(o, bark, 0.7 + 0.3 * w.id);
        o.h = isEnd ? 0.01 : -0.02; o.cav = isEnd ? 1 : 0.35; o.rough = 0.9; o.spec = 0.01; o.porous = 0.6;
      };
    }
    case "books": case "jars": case "drawers": case "bread": {
      const book = [linearOf("#6e2a22"), linearOf("#2c3f5a"), linearOf("#4c5a2a"), linearOf("#7a5a2a"), linearOf("#3a2a22"), linearOf("#8a6a40")];
      const shelf = s.course ?? 0.36, wood = linearOf("#3c2c20");
      return (u, v, _i, o) => {
        const row = Math.floor(v / shelf), fv = v - row * shelf;
        o.rough = 0.8; o.spec = 0.03; o.porous = 0.3; o.h = 0; o.cav = 1; o.glass = 0;
        if (fv < 0.03) { set(o, wood, 0.9); o.h = 0.01; return; }
        if (s.kind === "books") {
          // spines about 35 mm wide, each its own height and colour
          const cell = Math.floor(u / 0.035), k = cell, f = u / 0.035 - cell;
          const hgt = 0.2 + 0.12 * hash2(seed, k, row), wcol = book[Math.floor(hash2(seed + 1, k, row) * book.length)];
          if (fv - 0.03 > hgt) { set(o, [0.04, 0.03, 0.025]); o.cav = 0.2; o.h = -0.1; return; }
          set(o, wcol, 0.75 + 0.35 * hash2(seed + 2, k, row));
          const band = Math.abs(((fv - 0.03) / hgt) - 0.82) < 0.03 || Math.abs(((fv - 0.03) / hgt) - 0.15) < 0.025;
          if (band) set(o, [0.55, 0.42, 0.18]);
          o.h = 0.004 * Math.sin(f * Math.PI); o.cav = 0.4 + 0.6 * Math.sin(f * Math.PI);
        } else if (s.kind === "jars") {
          const cell = Math.floor(u / 0.11), f = u / 0.11 - cell - 0.5, hgt = 0.16 + 0.1 * hash2(seed, cell, row);
          const r = Math.abs(f), body = r < 0.38 && fv - 0.03 < hgt;
          if (!body) { set(o, [0.05, 0.04, 0.03]); o.cav = 0.25; o.h = -0.1; return; }
          const kind = hash2(seed + 4, cell, row), glassC = kind < 0.35 ? [0.25, 0.45, 0.35] : kind < 0.6 ? [0.55, 0.32, 0.12] : kind < 0.85 ? [0.85, 0.82, 0.75] : [0.2, 0.25, 0.45];
          set(o, glassC); const label = Math.abs((fv - 0.03) / hgt - 0.45) < 0.17 && r < 0.3; if (label) set(o, [0.85, 0.8, 0.66]);
          o.spec = label ? 0.03 : 0.5; o.rough = label ? 0.8 : 0.15; o.h = 0.01 * Math.cos(f * Math.PI); o.cav = 0.5 + 0.5 * Math.cos(r * Math.PI);
        } else if (s.kind === "drawers") {
          const cu = ((u % 0.22) + 0.22) % 0.22, cv = ((v % 0.16) + 0.16) % 0.16, d = Math.min(cu, 0.22 - cu, cv, 0.16 - cv);
          set(o, vary(linearOf(s.colour ?? "#6a4a30"), hash2(seed, Math.floor(u / 0.22), Math.floor(v / 0.16)), 0.08));
          const knob = Math.hypot(cu - 0.11, cv - 0.08) < 0.012, lbl = Math.abs(cu - 0.11) < 0.045 && Math.abs(cv - 0.11) < 0.015;
          if (lbl) set(o, [0.85, 0.8, 0.62]); if (knob) { set(o, [0.6, 0.45, 0.2]); o.spec = 0.4; }
          o.h = 0.004 * sst(0, 0.01, d); o.cav = 0.5 + 0.5 * sst(0, 0.008, d);
        } else {
          const cell = Math.floor(u / 0.26), f = u / 0.26 - cell - 0.5, loaf = Math.abs(f) < 0.42 && fv - 0.03 < 0.12 * Math.sqrt(clamp01(1 - (f / 0.42) ** 2));
          if (!loaf) { set(o, [0.12, 0.08, 0.05]); o.cav = 0.3; o.h = -0.05; return; }
          const crust = linearOf("#a8662c"), score = Math.abs(Math.sin((u * 30 + v * 12))) < 0.15;
          set(o, crust, 0.85 + 0.3 * hash2(seed, cell, row)); if (score) set(o, [0.85, 0.7, 0.45]);
          o.h = 0.01; o.cav = 0.7; o.spec = 0.06; o.rough = 0.6;
        }
      };
    }
    case "fabric": {
      // woven cloth: warp and weft threads (seen up close), soft irregular folds; stripes by default, or "plain" or "check"
      const a = C(s.colour, "#9b3a2e"), b = C(s.colour2, "#e9dfc8"), P = s.unit ?? 0.18, pat = s.pattern;
      return (u, v, i, o) => {
        const st = pat === "plain" ? true : pat === "check" ? (Math.floor(u / P) + Math.floor(v / P)) % 2 === 0 : Math.floor(u / P) % 2 === 0;
        set(o, st ? a : b);
        if (pat === "check" && Math.floor(u / P) % 2 !== Math.floor(v / P) % 2) mixInto(o, a, 0.45);
        const T = 0.0016, rr = resolve(i.fw, T * 3), wv = (Math.floor(u / T) + Math.floor(v / T)) % 2 === 0 ? Math.sin(frac(u / T) * Math.PI) : Math.sin(frac(v / T) * Math.PI);
        const fold = fbm(seed, u * 2.2 + v * 0.4, v * 1.1, 3), slub = fbm(seed + 1, u * 3, v * 140, 2) * 0.04;
        const k = 0.86 + 0.16 * (0.5 + 0.5 * fold) + 0.08 * wv * rr + slub;
        o.r *= k; o.g *= k; o.b *= k; o.h = 0.006 * fold + 0.0003 * wv * rr; o.cav = 1; o.rough = 0.92; o.spec = 0.02; o.porous = 0.6;
      };
    }
    case "rush": {
      // a rush seat: twisted rush wound from the corners toward the middle, so four triangles of strands meet on the diagonals
      const c = C(s.colour, "#b49a5a"), sx = s.unit ?? 1e6, sz = s.course ?? 1e6;
      return (u, v, i, o) => {
        const du = u - Math.round(u / sx) * sx, dv = v - Math.round(v / sz) * sz, au = Math.abs(du), av = Math.abs(dv), q = Math.max(au, av), along = au > av ? dv : du;
        const rr = resolve(i.fw, 0.02), twist = Math.abs(frac((q + along * 0.3) / 0.009) - 0.5), coil = Math.abs(frac(q / 0.009) - 0.5), seam = sst(0.005, 0.0, Math.abs(au - av)) * resolve(i.fw, 0.012);
        set(o, c, (0.82 + 0.26 * sst(0.45, 0.1, twist) * rr + 0.13 * (1 - rr)) * (1 + 0.06 * fbm(seed, u * 25, v * 25, 2)) * (1 - 0.45 * seam));
        o.h = 0.0015 * (0.5 - coil) * rr - 0.002 * seam; o.cav = 1 - 0.45 * seam - 0.2 * coil * rr; o.rough = 0.7; o.spec = 0.06; o.porous = 0.4;
      };
    }
    case "gold-leaf": {
      // gold leaf laid in squares of about 11 cm with seams where they overlap; pattern "byobu" paints over it in mineral colours:
      // green hills, an azurite stream, a pine, and bands of raised gold cloud (unit × course is the whole unfolded picture)
      const gold = C(s.colour, "#c9a44a"), W = s.unit ?? 3.6, H = s.course ?? 1.7;
      const mal = linearOf("#3d6b46"), malD = linearOf("#284a33"), azu = linearOf("#2d4f86"), bark = linearOf("#4a3a2c"), needle = linearOf("#1f3a28"), shell = linearOf("#e8e0cc");
      const clumps: readonly (readonly [number, number, number, number])[] = [[0.36, 0.7, 0.11, 0.07], [0.47, 0.6, 0.12, 0.06], [0.26, 0.56, 0.1, 0.055], [0.53, 0.76, 0.09, 0.05], [0.4, 0.84, 0.08, 0.05], [0.31, 0.43, 0.07, 0.045]];
      return (u, v, i, o) => {
        const P = 0.109, cu = Math.floor(u / P), cv = Math.floor(v / P), seam = Math.max(sst(0.05, 0.0, frac(u / P)), sst(0.05, 0.0, frac(v / P))) * resolve(i.fw, P);
        set(o, vary(gold, hash2(seed, cu, cv), 0.07, 0.03), 1 - 0.14 * seam); o.metal = 1; o.spec = 0.55; o.rough = 0.32 + 0.16 * hash2(seed + 1, cu, cv); o.h = 0.0002 * seam; o.porous = 0;
        if (s.pattern !== "byobu") return;
        const x = u / W, y = v / H, rough = fbm(seed + 4, u * 6, v * 6, 3) * 0.012;
        // clouds of raised gold (moriage) float in front of everything
        const cloud = (yc: number, x0: number, x1: number, t: number) => { const tt = t * (1 + 0.35 * Math.sin(x * 23 + yc * 9)); return Math.max(Math.abs(y - yc - 0.015 * Math.sin(x * 11)) - tt, x0 - x, x - x1) < rough * 0.5; };
        if (cloud(0.9, 0.05, 0.62, 0.035) || cloud(0.5, 0.55, 0.98, 0.04) || cloud(0.22, -0.1, 0.35, 0.03)) { o.h = 0.0008; mixInto(o, linearOf("#e3c26a"), 0.25); return; }
        let paint: readonly number[] | null = null, pk = 0;
        const hill = 0.3 + 0.08 * Math.sin(x * 9 + 1) + 0.05 * Math.sin(x * 23) + rough * 3, stream = 0.12 + 0.05 * Math.sin(x * 7 + 0.5);
        if (Math.abs(y - stream) < 0.035 + 0.01 * Math.sin(x * 40)) { paint = azu; pk = 0.95; if (Math.abs(frac((u + Math.sin(v * 40) * 0.01) / 0.05) - 0.5) < 0.06) paint = shell; }
        else if (y < hill) { paint = y > hill - 0.03 ? malD : mal; pk = 0.92; }
        // the pine: a leaning trunk with branches, needle clumps in dark malachite
        const tx = 0.3 + 0.12 * Math.pow(clamp01((y - 0.2) / 0.65), 1.4) + 0.012 * Math.sin(y * 30), tw = 0.018 * (1.2 - y);
        if (y > 0.2 && y < 0.85 && Math.abs(x - tx) < tw * (H / W) * 2) { paint = bark; pk = 0.95; }
        for (const [cx, cy, rx, ry] of clumps) { const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + rough * 8; if (d < 1) { paint = needle; pk = 0.95 * (0.85 + 0.15 * Math.abs(Math.sin(Math.atan2(y - cy, x - cx) * 30 + u * 40))); } }
        if (paint) { mixInto(o, paint, pk); o.metal = 0; o.spec = 0.03; o.rough = 0.9; }
      };
    }
    case "washi": {
      // handmade kozo paper: long fibres in a pale sheet; pattern "fusuma" paints mountains rising out of mist in ink wash
      const paper = C(s.colour, "#eee7d4"), ink = linearOf("#2b2b2a"), W = s.unit ?? 3.6, H = s.course ?? 1.8;
      return (u, v, i, o) => {
        const fib = fbm(seed, u * 9, v * 90, 2) * 0.5 + 0.5, fl = fbm(seed + 3, u * 2, v * 2, 2);
        set(o, paper, 0.94 + 0.05 * fib * resolve(i.fw, 0.01) + 0.02 * fl); o.rough = 0.95; o.spec = 0.01; o.porous = 0.6; o.h = 0.0002 * fib;
        if (s.pattern !== "fusuma") return;
        const x = u / W, y = v / H;
        let tone = 0;
        for (let k = 0; k < 3; k++) {
          const ridge = 0.78 - k * 0.17 + (0.12 - k * 0.02) * (fbm(seed + 10 + k, x * (2.2 + k), k, 4) + 0.35 * Math.sin(x * (5 + k * 3) + k)), depth = 0.16 + k * 0.03;
          if (y < ridge && y > ridge - depth) { const t = (0.28 + k * 0.22) * sst(ridge - depth, ridge - 0.01, y) * (0.85 + 0.15 * fbm(seed + 20, u * 30, v * 4, 2)); tone = Math.max(tone, t); }
          // pines dotted along the nearest ridge
          if (k === 2 && Math.abs(y - ridge) < 0.04 && hash2(seed + 30, Math.floor(u / 0.05), 0) > 0.6 && Math.abs(frac(u / 0.05) - 0.5) < 0.12) tone = Math.max(tone, 0.85 * sst(ridge + 0.04, ridge, y));
        }
        if (tone > 0) mixInto(o, ink, tone);
      };
    }
    case "earth": {
      // a clay wall finished with fine sand and chopped straw (juraku and tsuchikabe): warm, soft, flecked
      const clay = C(s.colour, "#b39668"), straw = linearOf("#d9c48e");
      return (u, v, i, o) => {
        const n = fbm(seed, u * 3, v * 3, 3), g = fbm(seed + 2, u * 70, v * 70, 2);
        set(o, clay, 0.9 + 0.08 * n + 0.05 * g * resolve(i.fw, 0.02));
        const C2 = 0.03, cu = Math.floor(u / C2), cv = Math.floor(v / C2), hA = hash2(seed + 5, cu, cv), a = hA * Math.PI, ox = (cu + 0.5) * C2 + (hash2(seed + 6, cu, cv) - 0.5) * C2 * 0.6, oy = (cv + 0.5) * C2 + (hash2(seed + 7, cu, cv) - 0.5) * C2 * 0.6;
        const px = u - ox, py = v - oy, al = px * Math.cos(a) + py * Math.sin(a), pe = -px * Math.sin(a) + py * Math.cos(a);
        if (hA < 0.7 && Math.abs(al) < 0.012 && Math.abs(pe) < 0.0008) mixInto(o, straw, 0.7 * resolve(i.fw, 0.006));
        o.h = 0.0006 * g + 0.001 * n; o.rough = 0.97; o.spec = 0.01; o.porous = 0.8;
      };
    }
    case "enamel": {
      // vitreous enamel or glazed ceramic: a smooth glossy coat with a faint ripple
      const c = C(s.colour, "#ece3cc");
      return (u, v, _i, o) => { set(o, c, 0.97 + 0.03 * fbm(seed, u * 4, v * 4, 2)); o.rough = 0.1; o.spec = 0.5; o.porous = 0; o.h = 0.00005 * fbm(seed + 1, u * 30, v * 30, 2); };
    }
    case "canvas": {
      // pattern "globe": an antique terrestrial globe, varnish-yellowed seas, buff land with brown coasts, a graticule
      if (s.pattern === "globe") {
        const sea = linearOf("#a9ad86"), land = linearOf("#d2bb8a"), coast = linearOf("#6a4a2a");
        return (u, v, i, o) => {
          const n = fbm(seed, u * 5, v * 5, 4), grat = Math.min(Math.abs(frac(u / 0.06) - 0.5), Math.abs(frac(v / 0.06) - 0.5)) * resolve(i.fw, 0.02);
          set(o, n > 0.08 ? land : sea, 0.92 + 0.08 * fbm(seed + 1, u * 20, v * 20, 2)); if (Math.abs(n - 0.08) < 0.012) mixInto(o, coast, 0.7);
          if (grat < 0.03) mixInto(o, coast, 0.35); o.rough = 0.3; o.spec = 0.25; o.porous = 0; o.h = 0;
        };
      }
      // an oil landscape (unit × course, centred on u = 0 and v = 0): a pale sky, blue distance, a dark tree mass and a lit field, in brush strokes
      const W = s.unit ?? 0.8, H = s.course ?? 0.6, sky = linearOf("#c9d2d0"), skyT = linearOf("#8fa3b2"), far = linearOf("#7d8ea0"), tree = linearOf("#2f3b26"), field = linearOf("#b49a56"), shadow = linearOf("#5e5a3a");
      return (u, v, i, o) => {
        const x = u / W + 0.5, y = v / H + 0.5, br = fbm(seed, u * 30 + v * 8, v * 30, 2), stroke = Math.sin((u * 0.8 + v * 0.3) * 260 + br * 6) * 0.5 + 0.5;
        let c: readonly number[] = sky; const hz = 0.42 + 0.05 * Math.sin(x * 6), tr = 0.5 + 0.18 * Math.sin(x * 4 + 1) * Math.exp(-((x - 0.65) ** 2) / 0.04) + 0.06 * br;
        if (y > 0.6) c = y > 0.85 ? skyT : sky; else if (y > hz) c = y < tr && x > 0.45 && x < 0.9 ? tree : far; else c = y < 0.18 ? shadow : field;
        set(o, c, 0.9 + 0.12 * stroke * resolve(i.fw, 0.006) + 0.05 * br);
        o.h = 0.0006 * stroke; o.rough = 0.4; o.spec = 0.12; o.porous = 0.1;
      };
    }
    case "jute": {
      // a chunky woven jute or sisal rug: a basket weave of twisted fibre bundles
      const c = C(s.colour, "#b39a6e"), P = s.unit ?? 0.022;
      return (u, v, i, o) => {
        const cu = Math.floor(u / P), cv = Math.floor(v / P), over = (Math.floor(cu / 2) + Math.floor(cv / 2)) % 2 === 0, bump = over ? Math.sin(frac(u / P) * Math.PI) : Math.sin(frac(v / P) * Math.PI), rr = resolve(i.fw, P);
        set(o, c, (0.78 + 0.28 * bump * rr + 0.14 * (1 - rr)) * (1 + 0.08 * fbm(seed, u * 4, v * 4, 2) + 0.06 * hash2(seed, cu, cv)));
        o.h = 0.003 * bump * rr; o.cav = 0.7 + 0.3 * bump; o.rough = 1; o.spec = 0.01; o.porous = 0.7;
      };
    }
    case "furrows": {
      // a field in rows (a ploughed field, standing wheat, a vegetable crop): ridges every `unit` m along v, a little
      // wavering, the furrow bottoms darker (colour2); a field edge headland where the plough turned; fades to its average far off
      const ridge = C(s.colour, "#8a6a48"), furrow = C(s.colour2, "#5a4430"), P = s.unit ?? 0.7;
      return (u, v, i, o) => {
        const a = u + 0.4 * gradNoise(seed, v * 0.02, 0) + 0.06 * gradNoise(seed + 1, v * 0.3, u * 0.1), f = Math.abs(frac(a / P) - 0.5) * 2, rr = resolve(i.fw, P);
        set(o, ridge); mixInto(o, furrow, (sst(0.35, 0.95, f) * rr + 0.45 * (1 - rr)) * 0.9);
        const n = fbm(seed + 2, u * 0.08, v * 0.08, 3), clod = fbm(seed + 3, u * 6, v * 6, 2);
        o.r *= 0.92 + 0.12 * n + 0.05 * clod; o.g *= 0.92 + 0.12 * n + 0.05 * clod; o.b *= 0.93 + 0.1 * n;
        o.h = 0.05 * (1 - f) * rr + 0.004 * clod; o.cav = 1 - 0.4 * f * rr; o.rough = 0.95; o.spec = 0.01; o.porous = 0.8;
      };
    }
    case "hay": {
      const straw = C(s.colour, "#c2a25a");
      return (u, v, _i, o) => { const st = fbm(seed, u * 30, v * 4, 3), n = fbm(seed + 1, u * 2, v * 2, 3); set(o, straw, 0.75 + 0.3 * (st * 0.5 + 0.5) + 0.1 * n); o.h = 0.01 * st; o.cav = 0.75 + 0.25 * st; o.rough = 1; o.spec = 0; o.porous = 0.8; };
    }
    case "fire": case "flame": {
      const hot = [1.0, 0.62, 0.25], emit = s.emit ?? 6;
      return (u, v, _i, o) => {
        const n = fbm(seed, u * 6, v * 4 - 0.5, 3) * 0.5 + 0.5, k = emit * (0.5 + n);
        set(o, [0.05, 0.03, 0.02]); o.er = hot[0] * k; o.eg = hot[1] * k * (0.7 + 0.3 * n); o.eb = hot[2] * k * 0.6; o.cav = 1; o.rough = 1; o.spec = 0; o.h = 0; o.porous = 0;
      };
    }
    case "floorboards": {
      const wood = C(s.colour, "#6e5038");
      return (u, v, i, o) => {
        // boards 18 cm wide in staggered lengths, each with its own figure, cupped a little, face-nailed at the ends
        const P = 0.18, row = Math.floor(u / P), fu = u - row * P, L = 2.4, off = hash2(seed, row, 1) * L, seg = Math.floor((v + off) / L), fv = (v + off) - seg * L;
        const board = hash2(seed + 1, row, seg), col = vary(wood, board, 0.12, 0.1), g = woodGrain(fu - P / 2, fv, seed, board, i.fw);
        set(o, col, g.k);
        const gap = sst(0.003, 0.0008, Math.min(fu, P - fu, fv, L - fv)) * resolve(i.fw, 0.01) + 0.15 * (1 - resolve(i.fw, 0.01)) * sst(0.02, 0, Math.min(fu, P - fu));
        let nail = 0; for (const ny of [0.04, L - 0.04]) for (const nx of [P * 0.28, P * 0.72]) nail = Math.max(nail, sst(0.004, 0.002, Math.hypot(fu - nx, fv - ny)));
        nail *= resolve(i.fw, 0.008);
        o.r *= 1 - 0.65 * gap - 0.6 * nail; o.g *= 1 - 0.65 * gap - 0.6 * nail; o.b *= 1 - 0.65 * gap - 0.55 * nail;
        o.h = g.h + 0.0012 * (1 - ((fu / P) * 2 - 1) ** 2) - 0.002 * gap; o.cav = 1 - 0.5 * gap; o.porous = 0.3;
        // traffic wears the finish off along paths: paler, matt; the edges keep their polish
        const worn = sst(0.6, 1, fbm(seed + 3, u * 0.5, v * 0.5, 2) * 0.5 + 0.5); mixInto(o, tint(col, [1.25, 1.2, 1.1]), worn * 0.25);
        o.rough = 0.38 + 0.35 * worn; o.spec = 0.09 - 0.05 * worn;
      };
    }
    case "tile-floor": {
      const a = C(s.colour, "#a8512f"), b = C(s.colour2, "#d9cdb4"), T = s.unit ?? 0.3;
      return (u, v, _i, o) => {
        const cu = Math.floor(u / T), cv = Math.floor(v / T), fu = u / T - cu, fv = v / T - cv, d = Math.min(fu, 1 - fu, fv, 1 - fv) * T;
        set(o, vary((cu + cv) % 2 ? a : b, hash2(seed, cu, cv), 0.1)); const g = sst(0.008, 0.003, d); mixInto(o, [0.35, 0.32, 0.28], g * 0.8);
        o.h = -0.002 * g; o.cav = 1 - 0.4 * g; o.rough = 0.5; o.spec = 0.08; o.porous = 0.3;
      };
    }
    // ---- the module showcase: studio paper, Chinese and modern materials ----
    case "parchment": {
      // pattern "text": a written page (unit wide, centred on u = 0): two columns of script in brown-black ink, paragraphs
      // opened by red and blue initials (a manuscript, a ledger, an open book)
      const paper = C(s.colour, "#eee7d9"), inkC = linearOf("#2a1e16"), red = linearOf("#a8241e"), blue = linearOf("#22408a"), W = s.unit ?? 0.3;
      return (u, v, i, o) => {
        const m = fbm(seed, u * 0.05, v * 0.05, 3), fib = fbm(seed + 1, u * 3, v * 0.6, 2), tooth = gradNoise(seed + 2, u * 40, v * 40);
        set(o, paper, 1 + 0.035 * m + 0.012 * fib + 0.008 * tooth); mixInto(o, [0.72, 0.6, 0.42], sst(0.3, 0.9, m) * 0.06);
        o.h = 0.0003 * tooth; o.rough = 0.95; o.spec = 0.01; o.porous = 0.3;
        if (s.pattern !== "text") return;
        const au = Math.abs(u), edge = W / 2 - W * 0.12;
        if (au < W * 0.03 || au > edge) return;
        const rr = resolve(i.fw, 0.006), para = Math.floor(v / 0.085), pv = v - para * 0.085, lv = v / 0.0105, row = Math.floor(lv), fr = lv - row;
        const colStart = u < 0 ? -edge : W * 0.03, initial = pv > 0.012 && pv < 0.036 && u - colStart < 0.024 && u - colStart > 0;
        if (initial) { mixInto(o, hash2(seed, para, u < 0 ? 1 : 2) > 0.5 ? red : blue, 0.85); return; }
        const word = hash2(seed + 3, Math.floor((u + row * 0.37) / 0.02), row), lineEnd = hash2(seed + 4, row, para) * 0.6;
        const written = pv > 0.012 && fr > 0.28 && fr < 0.72 && word > 0.2 && !(Math.floor((v + 0.0105) / 0.085) !== para && (u - colStart) / (edge - W * 0.03) > lineEnd);
        const letters = 0.55 + 0.45 * Math.abs(Math.sin(u * 900 + row));
        mixInto(o, inkC, written ? 0.8 * letters * rr + 0.3 * (1 - rr) : 0.12 * (1 - rr));
      };
    }
    case "polychrome": {
      // caihua: blue and green bands along each member, red ground, gold and white lines, a medallion in each panel
      const blue = linearOf("#2d5d8c"), green = linearOf("#3d7a5c"), red = C(s.colour, "#9b2f22"), gold = linearOf("#c9a24a"), white = linearOf("#e9e2d0");
      const P = s.unit ?? 0.5;
      return (u, v, _i, o) => {
        const k = Math.floor(u / P), f = u / P - k, band = Math.floor(((v % 0.36) + 0.36) % 0.36 / 0.12);
        set(o, (k + band) % 2 ? blue : green, 0.95 + 0.1 * hash2(seed, k, band));
        const line = Math.min(Math.abs(f - 0.06), Math.abs(f - 0.94)) < 0.025, rim = Math.abs(((v % 0.12) + 0.12) % 0.12 - 0.06) > 0.052;
        if (rim) set(o, white); if (line) set(o, gold, 1.1);
        const med = Math.hypot((f - 0.5) * P, ((((v % 0.36) + 0.36) % 0.36) - 0.18)) < 0.06;
        if (med && k % 2) set(o, gold, 1.15); else if (med) set(o, red);
        o.h = line ? 0.0015 : 0; o.rough = 0.6; o.spec = 0.06; o.porous = 0.2;
      };
    }
    case "chinese-screen": {
      // a bay of lattice doors between columns: a solid lower panel, a fine lattice above set in a frame, gilt beads at the joints
      const red = C(s.colour, "#962a1e"), lat = C(s.colour2, "#b2873c"), B = s.unit ?? 1.6, H = s.course ?? 3.2;
      return (u, v, i, o) => {
        const bay = Math.floor(u / B), fu = u / B - bay, fv = ((v % H) + H) % H / H, rr = resolve(i.fw, 0.06);
        set(o, red, 0.95 + 0.08 * hash2(seed, bay, 1)); o.rough = 0.45; o.spec = 0.12; o.porous = 0.2;
        const inFrame = Math.abs(fu - 0.5) < 0.43 && fv > 0.08 && fv < 0.94, panel = fv < 0.34;
        if (inFrame && !panel) {
          const gx = (u * 14) % 1, gy = (v * 14) % 1, d = Math.min(Math.abs(gx - 0.5), Math.abs(gy - 0.5), Math.abs(((gx + gy) % 1) - 0.5) * 0.7);
          const bar = sst(0.12, 0.06, d) * rr; o.r = o.r * (1 - bar) * 0.35 + lat[0] * bar * 0.9 + o.r * 0.12; o.g = o.g * (1 - bar) * 0.35 + lat[1] * bar * 0.9 + o.g * 0.12; o.b = o.b * (1 - bar) * 0.35 + lat[2] * bar * 0.9 + o.b * 0.12;
          o.h = 0.006 * bar; o.cav = 0.55 + 0.45 * bar;
        } else if (inFrame && panel) { const edge = Math.min(Math.abs(fu - 0.5) - 0.36, Math.abs(fv - 0.21) - 0.1); o.h = edge < 0 ? -0.004 : 0; o.cav = edge < 0 ? 0.85 : 1; }
        if (Math.abs(Math.abs(fu - 0.5) - 0.43) < 0.012 || Math.abs(fv - 0.34) < 0.008) set(o, lat, 1.05);
      };
    }
    // ---- furniture and rooms ----
    case "cane": {
      // hand-caned seat: the six-way weave, strands crossing in three directions round octagonal holes
      const c = C(s.colour, "#c9a46a");
      return (u, v, i, o) => {
        const P = 0.012, rr = resolve(i.fw, P * 2), a = Math.abs(((u / P) % 1 + 1) % 1 - 0.5), b2 = Math.abs(((v / P) % 1 + 1) % 1 - 0.5), d1 = Math.abs((((u + v) / P / 1.41) % 1 + 1) % 1 - 0.5);
        const strand = Math.max(sst(0.22, 0.1, a), sst(0.22, 0.1, b2), sst(0.18, 0.08, d1)), hole = 1 - strand;
        set(o, c, 0.9 + 0.12 * strand); o.r *= 1 - 0.75 * hole * rr; o.g *= 1 - 0.75 * hole * rr; o.b *= 1 - 0.75 * hole * rr;
        o.h = 0.0008 * strand * rr; o.cav = 1 - 0.5 * hole * rr; o.rough = 0.45; o.spec = 0.15; o.porous = 0.2;
      };
    }
    case "leather": case "velvet": {
      // leather: pebbled grain, a sheen, deep buttons in a diamond grid (pattern "diamond"); velvet: a soft pile that brightens at grazing light
      const c = C(s.colour, s.kind === "leather" ? "#6a2e1e" : "#5a1f2e"), buttons = s.pattern === "diamond", P = s.unit ?? 0.16;
      return (u, v, i, o) => {
        const g = fbm(seed, u * 120, v * 120, 2), w = fbm(seed + 1, u * 3, v * 3, 3);
        set(o, c, 0.92 + 0.06 * g + 0.08 * w); o.rough = s.kind === "leather" ? 0.45 : 0.95; o.spec = s.kind === "leather" ? 0.18 : 0.02; o.porous = 0.3; o.h = 0.0006 * g;
        if (buttons) {
          const a = (u + v) / P, b2 = (u - v) / P, fa = a - Math.round(a), fb = b2 - Math.round(b2), r = Math.hypot(fa, fb) * P * 0.7;
          const tuft = Math.exp(-r * r / (P * P * 0.05)), crease = sst(0.008, 0, Math.min(Math.abs(fa), Math.abs(fb)) * P * 0.7) * (1 - tuft);
          o.h += 0.02 * (1 - tuft) - 0.004 * crease; o.cav = 1 - 0.5 * tuft - 0.3 * crease; o.r *= 1 - 0.4 * tuft; o.g *= 1 - 0.4 * tuft; o.b *= 1 - 0.4 * tuft;
        }
        if (s.kind === "velvet") { const pile = 0.85 + 0.3 * Math.max(0, 1 - Math.abs(i.ny)) ; o.r *= pile; o.g *= pile; o.b *= pile; }
      };
    }
    case "rug": {
      // a hand-knotted rug (unit × course, centred on u = v = 0): a field of small rosettes on a diamond lattice with an
      // eight-lobed medallion and pendants, corner spandrels, a main border of rosettes on a vine between guard stripes;
      // colours drift in bands along the length (abrash), every knot a little different, the middle worn paler
      const field = C(s.colour, "#8e2a22"), ink = C(s.colour2, "#1f2c4a"), cream = linearOf("#e2d3ae"), gold = linearOf("#c9993e"), rose = linearOf("#b8584a"), green = linearOf("#4d6a52");
      const W = s.unit ?? 2.4, L = s.course ?? 3.4;
      return (u, v, i, o) => {
        const bx = W / 2 - Math.abs(u), by = L / 2 - Math.abs(v), edge = Math.min(bx, by), rr = resolve(i.fw, 0.03);
        let col: readonly number[] = field;
        if (edge < 0.025) col = cream; else if (edge < 0.05) col = ink; else if (edge < 0.065) col = gold;
        else if (edge < 0.29) {
          // the main border: rosettes every 22 cm on a meandering vine, on dark ground
          const t = bx < by ? v : u, P = 0.22, al = (frac(t / P) - 0.5) * P, ac = edge - 0.178, r = Math.hypot(al, ac), th = Math.atan2(ac, al);
          col = ink;
          if (Math.abs(ac - 0.06 * Math.sin((t / P) * Math.PI * 2)) < 0.009) col = cream;
          if (r < 0.068 * (0.72 + 0.28 * Math.cos(th * 6))) col = r < 0.024 ? gold : r < 0.04 ? cream : rose;
        } else if (edge < 0.31) col = gold; else if (edge < 0.33) col = ink;
        else {
          const fx = u, fy = v, me = Math.hypot(fx / (W * 0.2), fy / (L * 0.17)), th = Math.atan2(fy / L, fx / W), lobe = 1 + 0.13 * Math.cos(th * 8);
          const corner = Math.hypot((W / 2 - 0.33 - Math.abs(fx)) / (W * 0.16), (L / 2 - 0.33 - Math.abs(fy)) / (L * 0.12));
          const pend = Math.abs(fx) / 0.09 + Math.abs(Math.abs(fy) - L * 0.17 * 1.32) / 0.13;
          if (me < lobe) col = me < 0.22 ? gold : me < 0.42 ? field : me < 0.86 * lobe ? ink : gold;
          else if (pend < 1) col = pend < 0.45 ? gold : ink;
          else if (corner < 1) col = corner > 0.88 ? gold : ink;
          else {
            const a = (fx + fy) / 0.2, b2 = (fx - fy) / 0.2, la = frac(a) - 0.5, lb = frac(b2) - 0.5, line = Math.min(Math.abs(la), Math.abs(lb)) * 0.2, node = Math.hypot(la, lb) * 0.2, mid = Math.hypot(Math.abs(la) - 0.5, Math.abs(lb) - 0.5) * 0.2;
            if (node < 0.03) col = node < 0.012 ? gold : cream; else if (mid < 0.022) col = green; else if (line < 0.005) col = ink;
          }
          // the medallion's ring holds eight palmettes and a ring of small dots; the spandrels a scatter of small flowers
          if (me < lobe && me > 0.46 && me < 0.84 * lobe) { const pal = Math.cos(th * 8) * (1 - Math.abs(me - 0.64) * 3.2); if (pal > 0.62) col = pal > 0.86 ? rose : cream; else if (Math.cos(th * 16 + Math.PI) > 0.9 && Math.abs(me - 0.58) < 0.035) col = gold; }
          if (corner < 0.88 && Math.hypot(frac(fx * 7) - 0.5, frac(fy * 7) - 0.5) < 0.16) col = cream;
        }
        const abrash = 0.9 + 0.16 * (fbm(seed, 0.3, v * 1.8, 2) * 0.5 + 0.5), knot = hash2(seed, Math.floor(u * 250), Math.floor(v * 250));
        set(o, col, (abrash * (0.9 + 0.14 * knot)) * rr + (1 - rr) * abrash);
        const wear = sst(0.35, 0.95, fbm(seed + 3, u * 1.2, v * 1.2, 2) * 0.5 + 0.5) * sst(0.2, 0.6, Math.min(bx, by)) * 0.3; mixInto(o, [0.55, 0.46, 0.36], wear);
        o.h = 0.0015 * knot * rr; o.rough = 0.95; o.spec = 0.01; o.porous = 0.7;
      };
    }
    case "tatami-mat": {
      // mats about 0.9 × 1.8 m in a staggered layout, rush wales along the long side, cloth borders on the long edges;
      // pattern "plain" is one mat's face alone (its borders built separately), wales along v (along u when `turn`)
      const rush = C(s.colour, "#b8a86a"), border = C(s.colour2, "#2a2f2a");
      if (s.pattern === "plain") return (u, v, i, o) => {
        const a = s.turn ? v : u, along = s.turn ? u : v, wale = sst(0.32, 0.12, Math.abs(frac(a / 0.0155) - 0.5)) * resolve(i.fw, 0.03), stitch = sst(0.06, 0.0, Math.abs(frac(a / 0.093) - 0.5) - 0.44) * resolve(i.fw, 0.02);
        const fade = fbm(seed, u * 0.8, v * 0.8, 2), streak = fbm(seed + 2, a * 40, along * 0.6, 2);
        set(o, rush, 0.9 + 0.1 * wale + 0.05 * fade + 0.04 * streak); o.r *= 1 - 0.18 * stitch; o.g *= 1 - 0.18 * stitch; o.b *= 1 - 0.18 * stitch;
        o.h = 0.0007 * wale; o.rough = 0.72; o.spec = 0.06; o.porous = 0.5;
      };
      return (u, v, i, o) => {
        const rowW = 1.82, row = Math.floor(v / 0.91), off = (row % 2) * 0.91, cu = ((u + off) % rowW + rowW) % rowW, fv = v - row * 0.91;
        const wale = sst(0.3, 0.1, Math.abs(((cu / 0.015) % 1) - 0.5)) * resolve(i.fw, 0.03), edgeV = Math.min(fv, 0.91 - fv), edgeU = Math.min(cu, rowW - cu);
        set(o, rush, 0.92 + 0.1 * wale + 0.05 * fbm(seed, u * 2, v * 2, 2)); o.h = 0.0006 * wale; o.rough = 0.8; o.spec = 0.04; o.porous = 0.5;
        if (edgeV < 0.03) set(o, border, 0.9); if (edgeU < 0.004 || edgeV < 0.003) { o.r *= 0.5; o.g *= 0.5; o.b *= 0.5; o.cav = 0.6; }
      };
    }
    case "veneer": {
      // figured veneer: book-matched leaves mirrored about a centre line (a sunburst when pattern "star")
      const c = C(s.colour, "#7a4a2a"), star = s.pattern === "star";
      return (u, v, _i, o) => {
        const a = star ? Math.atan2(v, u) * 6 : Math.abs(u) * 30, r = star ? Math.hypot(u, v) * 30 : v * 4;
        const fig = Math.sin(a + fbm(seed, Math.abs(u) * 2, v * 0.6, 3) * 4 + Math.sin(r) * 0.3) * 0.5 + 0.5;
        set(o, c, 0.8 + 0.3 * fig); o.rough = 0.2; o.spec = 0.35; o.porous = 0.1; o.h = 0;
      };
    }
    case "glazed-tube": {
      // imperial glazed tiles: convex covering tiles in ribs down the slope, a round end tile at each eave, glossy
      const base = C(s.colour, "#d4a52a"), P = s.unit ?? 0.22, L = s.course ?? 0.32;
      return (u, v, i, o) => {
        const cu = Math.floor(u / P), fu = u / P - cu, row = Math.floor(v / L), fv = v / L - row, rp = resolve(i.fw, P);
        const rib = 0.6 + (Math.cos((fu - 0.5) * Math.PI) - 0.6) * rp;
        set(o, vary(base, hash2(seed, cu, row), 0.07, 0.04), 0.8 + 0.25 * rib);
        o.h = (0.045 * rib + 0.01 * fv) * rp; o.cav = 0.5 + 0.5 * rib; o.rough = 0.18; o.spec = 0.55; o.porous = 0.05;
      };
    }
    case "board-concrete": {
      // béton brut: each board's grain printed in the concrete, joints between boards, form-tie holes, water stains and moss below ledges
      const cg = C(s.colour, "#9b978f"), H = s.course ?? 0.15;
      return (u, v, i, o) => {
        const row = Math.floor(v / H), fv = v / H - row, off = hash2(seed, row, 1) * 3, seg = Math.floor((u + off) / 2.4);
        const grain = Math.sin((u + off) * 30 + fbm(seed + 2, u * 0.5, v * 6 + row, 3) * 9) * 0.5 + 0.5, joint = sst(0.06, 0.0, Math.min(fv, 1 - fv)) * resolve(i.fw, H);
        set(o, cg, 0.9 + 0.12 * hash2(seed + 3, row, seg) + 0.05 * grain * resolve(i.fw, 0.03));
        const tu = ((u % 0.6) + 0.6) % 0.6 - 0.3, tv = ((v % 0.9) + 0.9) % 0.9 - 0.45, tie = sst(0.018, 0.01, Math.hypot(tu, tv));
        const stain = sst(0.1, 0.8, fbm(seed + 4, u * 1.4, v * 0.18, 3) * 0.5 + 0.5) * (s.age ?? 0.6) * 0.35;
        o.r *= 1 - 0.18 * joint - 0.45 * tie - stain; o.g *= 1 - 0.18 * joint - 0.45 * tie - stain; o.b *= 1 - 0.16 * joint - 0.42 * tie - stain * 0.9;
        o.h = 0.002 * grain - 0.004 * joint - 0.01 * tie; o.cav = 1 - 0.4 * joint - 0.6 * tie; o.rough = 0.92; o.spec = 0.02; o.porous = 0.6;
        mossOver(o, u, v, moss, i, joint);
      };
    }
    case "travertine": {
      const st = C(s.colour, "#e0d3b6"), H = s.course ?? 0.4;
      return (u, v, i, o) => {
        const c = courses(u, v, H, H * 2.2, seed, 0.25), band = Math.sin(v * 28 + fbm(seed + 1, u * 0.8, v * 2, 3) * 4) * 0.5 + 0.5;
        const pit = worley(seed + 2, u * 22, v * 40, 1), hole = pit.id < 0.18 ? sst(0.32, 0.15, pit.f1) : 0;
        set(o, vary(st, c.id, 0.06), 0.94 + 0.08 * band); o.r *= 1 - 0.45 * hole; o.g *= 1 - 0.47 * hole; o.b *= 1 - 0.5 * hole;
        const j = sst(0.006, 0.002, c.dj) * resolve(i.fw, H);
        o.h = -0.004 * hole - 0.002 * j; o.cav = 1 - 0.5 * hole - 0.3 * j; o.rough = 0.7; o.spec = 0.04; o.porous = 0.5;
        grime(o, u, v, age * 0.5, i);
      };
    }
    case "titanium": case "steel": case "curtain": {
      const ti = s.kind === "titanium", glass = s.kind === "curtain", base = C(s.colour, ti ? "#b5b2ac" : glass ? "#3d5566" : "#c9ccd0");
      const PW = s.unit ?? (ti ? 0.7 : 1.5), PH = s.course ?? (ti ? 1.0 : 1.2), mull = linearOf(s.colour2 ?? "#2a2c2e");
      return (u, v, i, o) => {
        const row = Math.floor(v / PH), uu = u + (ti ? (row % 2) * PW * 0.5 : 0), col = Math.floor(uu / PW), fu = uu / PW - col, fv = v / PH - row;
        const id = hash2(seed, col, row), d = Math.min(fu, 1 - fu, fv, 1 - fv) * Math.min(PW, PH), rr = resolve(i.fw, Math.min(PW, PH));
        set(o, base, (ti ? 0.88 + 0.22 * id : 1) + (s.kind === "steel" ? 0.05 * fbm(seed, u * 30, v * 2, 2) : 0));
        o.metal = glass ? 0 : 1; o.rough = ti ? 0.28 + 0.12 * id : glass ? 0.05 : 0.14; o.spec = glass ? 1 : 0.9; o.glass = glass ? 1 : 0; o.porous = 0;
        // titanium panels pillow a little between their seams; curtain glass sits in dark mullions
        o.h = ti ? 0.004 * Math.sin(fu * Math.PI) * Math.sin(fv * Math.PI) * rr : 0;
        if (glass || ti) { const seam = sst(glass ? 0.04 : 0.008, 0, d) * rr; if (glass) { mixInto(o, mull, seam); o.glass *= 1 - seam; o.metal = seam * 0.6; } else { o.r *= 1 - 0.3 * seam; o.g *= 1 - 0.3 * seam; o.b *= 1 - 0.3 * seam; } o.cav = 1 - 0.3 * seam; }
      };
    }
    default: {
      const c = C(s.colour, "#9a9288");
      return (u, v, i, o) => { const n = fbm(seed, u * 3, v * 3, 3); set(o, c, 1 + n * 0.06); o.h = 0.002 * n; o.cav = 1; o.rough = 0.8; o.spec = 0.03; o.porous = 0.5; grime(o, u, v, age, i); mossOver(o, u, v, moss, i, 0.3); };
    }
  }
}

/** Soot above a fire: darken toward the top of a chimney (`top`, metres) and in streaks below it. */
export function sootOver(o: SurfOut, y: number, top: number, u: number, seed: number) {
  const k = sst(top - 0.9, top, y) * (0.6 + 0.4 * fbm(seed, u * 4, y * 2, 2));
  if (k > 0) mixInto(o, SOOT, k * 0.8);
}

/** Ivy on a wall: overlapping leaves with dark gaps, thinning at the edges of its patch (`edge` 0 inside … 1 outside). */
export function ivyOver(o: SurfOut, u: number, v: number, edge: number, seed: number) {
  const w = worley(seed + 41, u * 14, v * 14, 1), w2 = worley(seed + 43, u * 7 + 3, v * 7, 1);
  const cover = sst(0.75, 0.2, edge + 0.25 * (w2.f1 - 0.4));
  if (cover <= 0) return 0;
  const leafy = sst(0.45, 0.2, w.f1) * cover;
  if (leafy <= 0) return 0;
  const dark = linearOf("#22361c"), mid = linearOf("#3b5a2a"), lit = linearOf("#6d8a3b");
  const t = w.id, c = t < 0.4 ? dark : t < 0.8 ? mid : lit;
  o.r += (c[0] * (0.85 + 0.3 * w2.id) - o.r) * leafy; o.g += (c[1] * (0.85 + 0.3 * w2.id) - o.g) * leafy; o.b += (c[2] - o.b) * leafy;
  o.h += 0.04 * leafy * (1 - w.f1); o.cav = o.cav * (1 - leafy) + (0.35 + 0.65 * (1 - w.f1)) * leafy; o.rough = 0.7; o.spec = 0.05 * leafy + o.spec * (1 - leafy);
  return leafy;
}
