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
  | "parchment" | "polychrome" | "glazed-tube" | "board-concrete" | "travertine" | "titanium" | "steel" | "curtain";

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
  pattern?: "close" | "square" | "cross" | "colombage" | "fachwerk" | "herringbone" | "english" | "flemish" | "diamond" | "fish" | "star";
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

// ---- The surfaces -------------------------------------------------------------------------------------------------------------

/** Build the function that paints one surface (every field starts from its default, so no pixel inherits the last one's). */
export function surfaceFn(s: SurfaceSpec, seed = 1): SurfFn {
  const f = surfaceBody(s, seed), glow = s.kind !== "fire" && s.kind !== "flame" ? s.emit ?? 0 : 0;
  return (u, v, i, o) => {
    o.h = 0; o.cav = 1; o.rough = 0.8; o.spec = 0.04; o.metal = 0; o.er = 0; o.eg = 0; o.eb = 0; o.porous = 0.5; o.glass = 0; o.clear = 0;
    f(u, v, i, o);
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
        const col = vary(stone, c.id, s.kind === "marble" ? 0.04 : 0.09);
        const grain = fbm(seed + 3, u * 9, v * 9, 3), pits = gradNoise(seed + 9, u * 60, v * 60);
        set(o, col, 1 + grain * 0.06 + pits * 0.02);
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
        // limewash is translucent where thin: a hint of the joints below
        o.h = 0.0015 * trowel; o.cav = 1; o.rough = 0.92; o.spec = 0.02; o.porous = 0.75;
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
        const grain = Math.sin(a * 220 + fbm(seed + 2, b * 0.5, a * 4 + row, 3) * 12) * 0.5 + 0.5, gr2 = fbm(seed + 3, b * 0.8, a * 14, 3);
        set(o, col, 0.84 + grain * 0.18 + gr2 * 0.06);
        const rnd = vertical ? sst(0, 0.012, Math.min(f, H - f)) : Math.sqrt(clamp01(1 - ((f / H) * 2 - 1) ** 2));
        o.h = vertical ? 0.006 * rnd : 0.04 * rnd + 0.002 * grain; o.cav = vertical ? 0.55 + 0.45 * rnd : 0.35 + 0.65 * rnd;
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
        const g = v + fbm(seed + 1, u * 0.7, v * 0.3, 2) * 0.1, grain = Math.sin(u * 160 + fbm(seed + 2, u * 2, g * 0.8, 3) * 10) * 0.5 + 0.5;
        set(o, wood, 0.86 + 0.16 * grain);
        o.h = 0.0015 * grain; o.cav = 1; o.rough = s.kind === "oak" ? 0.75 : 0.55; o.spec = s.kind === "oak" ? 0.03 : 0.06; o.porous = 0.4;
        if (flake > 0) {
          const lose = fbm(seed + 4, u * 4, v * 9, 4) * 0.5 + 0.5 + 0.15 * gradNoise(seed + 5, u * 40, v * 12) - (1 - flake) * 0.8;
          const bare = sst(0.18, 0.2, lose);
          if (bare > 0) { mixInto(o, tint(under, [0.9 + grain * 0.2, 0.9 + grain * 0.2, 0.9 + grain * 0.2]), bare); o.h -= 0.0008 * bare; o.rough = 0.85; }
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
      return (u, v, i, o) => {
        set(o, tintC); o.h = 0; o.cav = 1; o.rough = 0.05; o.spec = 1; o.metal = 0; o.porous = 0; o.glass = 1;
        let came = 0;
        if (s.kind === "leaded") {
          // diamond quarries about 0.1 × 0.15 m in 6 mm cames
          const a = u / 0.1 + v / 0.15, b = u / 0.1 - v / 0.15, fa = a - Math.floor(a), fb = b - Math.floor(b);
          came = sst(0.06, 0.03, Math.min(fa, 1 - fa, fb, 1 - fb)) * resolve(i.fw, 0.1) + 0.25 * (1 - resolve(i.fw, 0.1));
          const wave = gradNoise(seed, Math.floor(a) * 3.1, Math.floor(b) * 2.3); o.r *= 1 + wave * 0.25; o.g *= 1 + wave * 0.25; o.b *= 1 + wave * 0.25;
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
        if (rock) { const strata = 0.5 + 0.35 * fbm3(seed + 4, i.wx * 0.12, i.wy * 0.6, i.wz * 0.12, 2), crack = sst(0.08, 0, Math.abs(fbm3(seed + 3, i.wx * 0.9, i.wy * 0.25, i.wz * 0.9, 2))); o.r *= 0.86 + 0.14 * strata - 0.3 * crack; o.g *= 0.86 + 0.14 * strata - 0.3 * crack; o.b *= 0.88 + 0.12 * strata - 0.28 * crack; const veg = sst(0.55, 0.8, i.ny + 0.3 * n) * 0.8; mixInto(o, [0.2, 0.25, 0.1], veg); }
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
      return (u, v, _i, o) => {
        const n = fbm(seed, u * 0.8, v * 2.2, 4), r1 = gradNoise(seed + 1, u * 4, v * 9);
        set(o, deep); o.h = 0.03 * n + 0.01 * r1; o.cav = 1; o.rough = 0.04; o.spec = 1; o.porous = 0; o.glass = 0.5;
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
      const a = C(s.colour, "#9b3a2e"), b = C(s.colour2, "#e9dfc8");
      return (u, _v, _i, o) => { const st = Math.floor(u / 0.18) % 2 === 0; set(o, st ? a : b); const fold = Math.sin(u * 18) * 0.5 + 0.5; o.r *= 0.85 + 0.15 * fold; o.g *= 0.85 + 0.15 * fold; o.b *= 0.85 + 0.15 * fold; o.h = 0.01 * fold; o.cav = 1; o.rough = 0.9; o.spec = 0.02; o.porous = 0.6; };
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
      return (u, v, _i, o) => {
        const P = 0.18, row = Math.floor(u / P), fu = u - row * P, L = 2.4, off = hash2(seed, row, 1) * L, seg = Math.floor((v + off) / L), fv = (v + off) - seg * L;
        const col = vary(wood, hash2(seed + 1, row, seg), 0.14, 0.08), grain = Math.sin(u * 300 + fbm(seed + 2, v * 0.6, u * 8, 3) * 8) * 0.5 + 0.5;
        set(o, col, 0.85 + 0.18 * grain);
        const gap = sst(0.004, 0.001, Math.min(fu, P - fu, fv, L - fv));
        o.r *= 1 - 0.6 * gap; o.g *= 1 - 0.6 * gap; o.b *= 1 - 0.6 * gap;
        o.h = 0.001 * grain - 0.002 * gap; o.cav = 1 - 0.5 * gap; o.rough = 0.55; o.spec = 0.06; o.porous = 0.3;
        const worn = sst(0.6, 1, fbm(seed + 3, u * 0.5, v * 0.5, 2) * 0.5 + 0.5); mixInto(o, tint(col, [1.25, 1.2, 1.1]), worn * 0.3);
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
      const paper = C(s.colour, "#eee7d9");
      return (u, v, _i, o) => {
        const m = fbm(seed, u * 0.05, v * 0.05, 3), fib = fbm(seed + 1, u * 3, v * 0.6, 2), tooth = gradNoise(seed + 2, u * 40, v * 40);
        set(o, paper, 1 + 0.035 * m + 0.012 * fib + 0.008 * tooth); mixInto(o, [0.72, 0.6, 0.42], sst(0.3, 0.9, m) * 0.06);
        o.h = 0.0003 * tooth; o.rough = 0.95; o.spec = 0.01; o.porous = 0.3;
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
