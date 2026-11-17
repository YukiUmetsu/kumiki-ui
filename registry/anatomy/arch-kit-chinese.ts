/**
 * ARCH1 Chinese kit: reusable parts of Chinese imperial, temple, garden and vernacular building, at real size.
 *
 * - `chineseRoof`: the curved roof in its four forms — hip (wudian, the highest rank), hip-and-gable (xieshan), gable
 *   (xuanshan) and polygonal (zanjian, for pavilions) — with a concave slope (steep at the ridge, flattening to the
 *   eaves), eaves that sweep up toward the corners, glazed tube tiles in the rank's colour (yellow imperial, green
 *   princely and temple, blue for heaven, grey for houses), a main ridge with chiwen ends, and hip ridges with a file of
 *   beasts led by a rider (more beasts for a more important hall, in odd numbers).
 * - `bracketBand`: dougong sets in caihua polychrome between the columns and the eaves.
 * - `chineseHall`: a hall on a stone or marble terrace with balustrades, red columns, lattice door bays, a bracket band
 *   and one or two eaves (double eaves for the highest halls).
 * - `roundHall`: a round hall of stacked conical roofs over drums, as the Hall of Prayer for Good Harvests.
 * - `pavilion`, `pagoda`, `paifang` (archway), `gardenWall` (with moon, vase and lattice openings), `horseHeadWall`
 *   (Huizhou stepped gables), `humpBridge`, `latticeScreen`, `marbleTerrace`, `redLantern`.
 *
 * Proportions come from the photographs and sources listed in
 * `docs/research/architecture-storybook-reference-study-2026-11-17.md` (module section).
 */
import type { Node } from "./arch-sdf";
import { boxDistance, leaf } from "./arch-sdf";
import { worley } from "./foundation-raster";
import type { SceneBuilder } from "./arch-kit";
import { boxAt, capsule, coneY, cut, cylY, cylZ, ellipsoid, opening, repeatAround, repeatX, repeatZ, revolve, sphere } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";

export type TileRank = "yellow" | "green" | "blue" | "grey" | "black";
const TILE: Record<TileRank, SurfaceSpec> = {
  yellow: { kind: "glazed-tube", colour: "#d6a52a" }, green: { kind: "glazed-tube", colour: "#2f8a6c" }, blue: { kind: "glazed-tube", colour: "#24408c" },
  grey: { kind: "pantile", colour: "#5e6163", unit: 0.18, age: 0.5, moss: 0.25 }, black: { kind: "pantile", colour: "#3a3c3e", unit: 0.16, age: 0.5, moss: 0.2 },
};
const RIDGE: Record<TileRank, SurfaceSpec> = { yellow: { kind: "glazed-tube", colour: "#c48f1c" }, green: { kind: "glazed-tube", colour: "#256f58" }, blue: { kind: "glazed-tube", colour: "#1c3373" }, grey: { kind: "plain", colour: "#55585a" }, black: { kind: "plain", colour: "#2e3032" } };
export const CN = {
  red: { kind: "painted-wood", colour: "#8e2a1f", flake: 0.06 } as SurfaceSpec,
  poly: { kind: "polychrome" } as SurfaceSpec,
  marble: { kind: "marble", colour: "#ece7dc" } as SurfaceSpec,
  stone: { kind: "ashlar", colour: "#a9a59b", course: 0.35, age: 0.6, moss: 0.25 } as SurfaceSpec,
  white: { kind: "limewash", colour: "#f1eee6", flake: 0.12, under: "brick", age: 0.5 } as SurfaceSpec,
  greyBrick: { kind: "brick", colour: "#7d7c78", colour2: "#c7c2b8", age: 0.6, moss: 0.3 } as SurfaceSpec,
  screen: { kind: "chinese-screen" } as SurfaceSpec,
  gold: { kind: "gold" } as SurfaceSpec,
  lattice: { kind: "painted-wood", colour: "#6a3f28", flake: 0.05 } as SurfaceSpec,
};

// ---- The curved roof ----------------------------------------------------------------------------------------------------

export interface ChineseRoofSpec {
  /** Half sizes of the eave line (x along the ridge, z across), metres; for `pyramid`, `hx` is the eave's circumradius and `sides` the plan's sides. */
  hx: number; hz: number;
  /** Height of the eave line and the rise to the ridge (or apex). */
  y: number; rise: number;
  kind: "hip" | "hip-gable" | "gable" | "pyramid";
  sides?: number;
  /** How far the corners sweep up, metres. */
  lift?: number;
  tiles?: TileRank;
  /** Ridge beasts on each hip (odd: 1, 3, 5, 7, 9). */
  beasts?: number;
  /** Roof thickness at the eave (the dark fascia). */
  t?: number;
  /** Leave the middle open (an eave ring under the storey above), radius. */
  open?: number;
  /** Ridge ends: chiwen (halls) or a small upturned curl (walls, houses, gates). */
  ends?: "chiwen" | "curl";
}
const concave = (t: number) => Math.pow(Math.min(1, Math.max(0, t)), 1.55);

/** A Chinese roof with concave slopes, upturned corners, ridges, chiwen and ridge beasts. Returns the ridge height. */
export function chineseRoof(b: SceneBuilder, r: ChineseRoofSpec): number {
  const tiles = b.mat(TILE[r.tiles ?? "yellow"]), ridgeM = b.mat(RIDGE[r.tiles ?? "yellow"]), t = r.t ?? 0.35, lift = r.lift ?? r.rise * 0.18, k = 0.55;
  const top = r.y + r.rise;
  if (r.kind === "pyramid") {
    const n = r.sides ?? 4, R = r.hx, ap = R * Math.cos(Math.PI / n), step = (Math.PI * 2) / n;
    b.add(leaf((x, y, z) => {
      const a = Math.atan2(z, x), sec = Math.round((a - step / 2) / step) * step + step / 2, q = x * Math.cos(sec) + z * Math.sin(sec), d = ap - q;
      const frac = (((a - sec) / step) + 0.5) % 1, near = Math.abs(frac - 0.5) * 2, tt = d / ap;
      const Y = r.y + r.rise * concave(tt) + lift * Math.pow(near, 4) * (1 - Math.min(1, tt * 3));
      const ring = r.open ? r.open - Math.hypot(x, z) : -1e9;
      return Math.max((y - Y) * k, (Y - t - y) * k, -d, ring);
    }, [-R - 0.5, r.y - t - 0.2, -R - 0.5], [R + 0.5, top + lift + 0.2, R + 0.5], tiles));
    // hip ridges to each corner and a finial
    for (let i = 0; i < n; i++) {
      const a = i * step, cx = Math.cos(a) * R, cz = Math.sin(a) * R;
      const pts = [0, 0.25, 0.5, 0.75, 0.92, 1].map(s => { const tt = 1 - s, Y = r.y + r.rise * concave(tt) + lift * Math.pow(s, 4) * (s > 0.66 ? 1 : 0.5); return [cx * s, Y + 0.12, cz * s] as const; });
      for (let j = 1; j < pts.length; j++) b.add(capsule(...pts[j - 1], ...pts[j], 0.11, ridgeM));
    }
    if (!r.open) b.add(revolve(0, 0, top - 0.1, top + 1.2, s => 0.22 * Math.sin(Math.PI * Math.min(1, s * 1.5)) ** 0.7 + 0.04, 0.26, b.mat(CN.gold), 0, 2));
    return top;
  }
  const ex = r.hx, ez = r.hz, dmax = Math.min(ex, ez), gable = r.kind === "gable", hipGable = r.kind === "hip-gable";
  const Yhip = (x: number, z: number) => {
    const dx = ex - Math.abs(x), dz = ez - Math.abs(z), d = gable ? dz : Math.min(dx, dz), tt = d / (gable ? ez : dmax);
    const along = Math.max(Math.pow(Math.abs(x) / ex, 4) * (dz < dx ? 1 : 0.4), Math.pow(Math.abs(z) / ez, 4) * (dx < dz ? 1 : 0.4));
    return r.y + r.rise * concave(tt) + (gable ? 0 : lift * along * (1 - Math.min(1, tt * 2.5)));
  };
  const xg = ex - dmax * 0.55, riseG = r.rise * 1.08;
  b.add(leaf((x, y, z) => {
    const Y = Yhip(x, z);
    let d = Math.max((y - Y) * k, (Y - t - y) * k, Math.abs(x) - ex, Math.abs(z) - ez);
    if (hipGable) {
      // the upper gable stands inside the hip skirt; its triangular ends are vertical
      const Yg = r.y + riseG * concave((ez - Math.abs(z)) / ez);
      d = Math.min(d, Math.max((y - Yg) * k, (Yg - t - y) * k, Math.abs(x) - xg, Math.abs(z) - ez, r.y + r.rise * 0.35 - y));
    }
    return d;
  }, [-ex, r.y - t - 0.3, -ez], [ex, top + lift + r.rise * 0.1 + 0.4, ez], tiles));
  // the main ridge with chiwen at its ends
  const ridgeY = hipGable ? r.y + riseG : top, rx = gable ? ex : hipGable ? xg : ex - dmax;
  b.add(boxAt(-rx - 0.1, ridgeY - 0.1, -0.22, rx + 0.1, ridgeY + 0.45, 0.22, ridgeM));
  const sc = Math.min(1, Math.max(0.35, r.rise / 2.5));
  for (const s of [-1, 1]) {
    const x0 = s * (rx + 0.05);
    if ((r.ends ?? "chiwen") === "chiwen") b.add(ellipsoid(x0, ridgeY + 0.6 * sc, 0, 0.28 * sc, 0.55 * sc, 0.2 * sc, ridgeM), capsule(x0 - s * 0.05 * sc, ridgeY + 1.05 * sc, 0, x0 + s * 0.35 * sc, ridgeY + 1.25 * sc, 0, 0.12 * sc, ridgeM), sphere(x0 + s * 0.38 * sc, ridgeY + 1.12 * sc, 0, 0.1 * sc, ridgeM));
    else b.add(capsule(x0 - s * 0.1, ridgeY + 0.2, 0, x0 + s * 0.3, ridgeY + 0.5, 0, 0.09, ridgeM));
  }
  // the hip-and-gable's triangular gable ends, red boards under the upper roof
  if (hipGable) for (const s of [-1, 1]) b.add(leaf((x, y, z) => { const Yg = r.y + riseG * concave((ez - Math.abs(z)) / ez); return Math.max(Math.abs(x - s * xg) - 0.06, (y - (Yg - 0.2)) * 0.6, r.y + r.rise * 0.3 - y, Math.abs(z) - ez * 0.88); }, [s * xg - 0.1, r.y, -ez], [s * xg + 0.1, r.y + riseG, ez], b.mat(CN.red)));
  // hip ridges with the beasts on their lower ends
  if (!gable) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x1 = sx * rx, sAt = (u: number): [number, number, number] => { const x = x1 + (sx * ex - x1) * u, z = sz * ez * u * 0.999; return [x, Yhip(x, z) + 0.14, z]; };
    const start = hipGable ? 0.45 : 0;
    for (let i = 0; i < 10; i++) { const u0 = start + ((1 - start) * i) / 10, u1 = start + ((1 - start) * (i + 1)) / 10; b.add(capsule(...sAt(u0), ...sAt(u1), 0.12, ridgeM)); }
    const nb = r.beasts ?? 5;
    for (let i = 0; i < nb; i++) { const [x, y, z] = sAt(0.93 - i * 0.055); b.add(ellipsoid(x, y + 0.16, z, 0.09, 0.12, 0.09, ridgeM), sphere(x + sx * 0.04, y + 0.32, z + sz * 0.04, 0.065, ridgeM)); if (i === 0) b.add(coneY(x, z, y + 0.36, y + 0.52, 0.045, 0.01, ridgeM)); }
  }
  return ridgeY;
}

// ---- Brackets, screens, terraces ----------------------------------------------------------------------------------------

/** A band of dougong between `x0` and `x1` along a front at z = `zf` (facing +z), from `y` up `h`. */
export function bracketBand(b: SceneBuilder, x0: number, x1: number, zf: number, y: number, h = 0.9, pitch = 0.75) {
  const p = b.mat(CN.poly), blk = b.mat({ kind: "polychrome", colour: "#9b2f22", unit: 0.3 }), n = Math.max(1, Math.floor((x1 - x0) / pitch));
  b.add(boxAt(x0, y, zf - 0.5, x1, y + 0.35, zf, p));
  const set = (cx: number): Node[] => [boxAt(cx - 0.16, y + 0.35, zf - 0.3, cx + 0.16, y + 0.5, zf, blk), boxAt(cx - 0.32, y + 0.5, zf - 0.2, cx + 0.32, y + 0.64, zf + 0.12, p), boxAt(cx - 0.08, y + 0.5, zf - 0.3, cx + 0.08, y + 0.64, zf + 0.35, p),
    boxAt(cx - 0.42, y + 0.64, zf - 0.1, cx + 0.42, y + 0.76, zf + 0.25, p), boxAt(cx - 0.08, y + 0.64, zf - 0.3, cx + 0.08, y + h, zf + 0.6, p)];
  for (const node of set(x0 + (x1 - x0) / (2 * n))) b.add(repeatX(node, (x1 - x0) / n, n));
}
/** A lattice screen (window or leak window) in the plane z = `zc`: square-and-diagonal bars `bar` thick on a `cell` grid. */
export function latticeScreen(x0: number, y0: number, x1: number, y1: number, zc: number, cell: number, bar: number, t: number, mat: number): Node {
  return leaf((px, py, pz) => {
    const u = px - x0, v = py - y0, a = (u + v) / cell, c = (u - v) / cell;
    const sq = Math.min(Math.abs(u / cell - Math.round(u / cell)), Math.abs(v / cell - Math.round(v / cell))) * cell;
    const dg = Math.min(Math.abs(a - Math.round(a)), Math.abs(c - Math.round(c))) * cell * 0.7071;
    return Math.max(Math.min(sq, dg) - bar / 2, Math.abs(pz - zc) - t / 2, boxDistance([x0, y0, zc - t], [x1, y1, zc + t], px, py, pz));
  }, [x0, y0, zc - t], [x1, y1, zc + t], mat);
}
/** A stone terrace with a balustrade round its edge: posts with rounded heads, a rail and pierced panels; steps on the front. */
export function marbleTerrace(b: SceneBuilder, hx: number, hz: number, h: number, s: SurfaceSpec = CN.marble, steps = true) {
  const m = b.mat(s);
  b.add(boxAt(-hx, 0, -hz, hx, h, hz, m), boxAt(-hx - 0.12, h - 0.18, -hz - 0.12, hx + 0.12, h, hz + 0.12, m));
  const post = (x: number, z: number) => [boxAt(x - 0.1, h, z - 0.1, x + 0.1, h + 1.0, z + 0.1, m), revolve(x, z, h + 1.0, h + 1.3, t => 0.12 * Math.sin(0.5 + t * 2.4) + 0.02, 0.14, m, 0, 2)];
  const nx = Math.max(2, Math.round((2 * hx) / 1.4)), nz = Math.max(2, Math.round((2 * hz) / 1.4)), sx = (2 * hx) / nx, gap = steps ? 1.8 : 0;
  for (const zz of [-hz + 0.1, hz - 0.1]) { for (const node of post(-hx + 0.1, zz)) b.add(repeatX(node, (2 * hx - 0.2) / nx, nx + 1)); }
  for (const xx of [-hx + 0.1, hx - 0.1]) { for (const node of post(xx, -hz + 0.1)) b.add(repeatZ(node, (2 * hz - 0.2) / nz, nz + 1)); }
  for (const zz of [-hz + 0.1, hz - 0.1]) b.add(cut(boxAt(-hx, h + 0.15, zz - 0.06, hx, h + 0.8, zz + 0.06, m), [repeatX(opening(-hx + sx / 2, h + 0.3, sx * 0.5, 0.25, "round", zz - 0.2, zz + 0.2), sx, nx), ...(zz > 0 && gap ? [boxAt(-gap, h, zz - 0.3, gap, h + 2, zz + 0.3, 0)] : [])]));
  for (const xx of [-hx + 0.1, hx - 0.1]) b.add(boxAt(xx - 0.06, h + 0.15, -hz, xx + 0.06, h + 0.8, hz, m));
  if (steps) { const n = Math.ceil(h / 0.16); for (let i = 0; i < n; i++) b.add(boxAt(-gap + 0.1, 0, hz + i * 0.3, gap - 0.1, h - (i + 1) * (h / n) + h / n, hz + (i + 1) * 0.3, m)); b.add(boxAt(-0.5, 0, hz, 0.5, h + 0.02, hz + n * 0.3, b.mat({ kind: "marble", colour: "#e4ddce", age: 0.4 }))); }
}

// ---- Halls -------------------------------------------------------------------------------------------------------------

export interface ChineseHallSpec {
  bays: number; bayW?: number; depth: number; colH?: number;
  roof: "hip" | "hip-gable" | "gable";
  tiles?: TileRank; beasts?: number;
  /** Double eaves (the highest halls). */
  double?: boolean;
  terrace?: number;
  terraceSurface?: SurfaceSpec;
}
/** A hall: terrace, red columns, lattice door bays, bracket band, one or two curved eaves. Front faces +z. Returns the ridge height. */
export function chineseHall(b: SceneBuilder, s: ChineseHallSpec): number {
  const bw = s.bayW ?? 3.6, W = s.bays * bw, D = s.depth, ch = s.colH ?? 4.2, T = s.terrace ?? 1.6, red = b.mat(CN.red), scr = b.mat({ ...CN.screen, unit: bw, course: ch });
  marbleTerrace(b, W / 2 + 2.2, D / 2 + 2.2, T, s.terraceSurface ?? CN.marble);
  b.add(boxAt(-W / 2 + 0.2, T, -D / 2 + 0.2, W / 2 - 0.2, T + ch, D / 2 - 0.9, b.mat(CN.red)), boxAt(-W / 2 + 0.25, T, D / 2 - 0.95, W / 2 - 0.25, T + ch, D / 2 - 0.9, scr));
  for (let i = 0; i <= s.bays; i++) for (const z of [D / 2 - 0.3, -D / 2 + 0.3]) b.add(cylY(-W / 2 + i * bw, z, T, T + ch, 0.3, red));
  bracketBand(b, -W / 2 - 0.3, W / 2 + 0.3, D / 2 - 0.1, T + ch, 1.0, bw / 4);
  let y = T + ch + 1.0, ridge = y;
  if (s.double) {
    chineseRoof(b, { kind: "hip", hx: W / 2 + 2.6, hz: D / 2 + 2.6, y, rise: 1.6, lift: 0.7, tiles: s.tiles, beasts: s.beasts, t: 0.4 });
    b.add(boxAt(-W / 2 + 1.2, y + 0.8, -D / 2 + 1.2, W / 2 - 1.2, y + 2.8, D / 2 - 1.2, b.mat(CN.red)));
    bracketBand(b, -W / 2 + 1.1, W / 2 - 1.1, D / 2 - 1.1, y + 2.4, 0.9, bw / 4);
    y += 3.3;
  }
  ridge = chineseRoof(b, { kind: s.roof, hx: W / 2 + (s.double ? 1.6 : 2.6), hz: D / 2 + (s.double ? 1.6 : 2.6), y, rise: Math.min(W, D) * 0.33, lift: 0.8, tiles: s.tiles, beasts: s.beasts, t: 0.4 });
  return ridge;
}

/** A round hall of stacked conical roofs over drums, on a three-tier marble terrace (after the Hall of Prayer for Good Harvests). */
export function roundHall(b: SceneBuilder, o: { R?: number; tiles?: TileRank; tiers?: number } = {}) {
  const R = o.R ?? 12, tiers = o.tiers ?? 3, red = b.mat(CN.red), p = b.mat(CN.poly), mar = b.mat(CN.marble), gold = b.mat(CN.gold);
  const scr = b.mat({ ...CN.screen, unit: 2.4, course: 5.4 }), band = b.mat({ kind: "chinese-screen", colour: "#2f6f78", colour2: "#c9a24a", unit: 1.6, course: 2.2 });
  // the terrace: three marble tiers, each ringed by balusters and a rail
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const r = R * (1.6 - i * 0.24), h = 1.4;
    b.add(cylY(0, 0, y, y + h, r, mar), cylY(0, 0, y + h - 0.15, y + h, r + 0.12, mar));
    b.add(repeatAround(boxAt(r - 0.22, y + h, -0.09, r - 0.04, y + h + 1.0, 0.09, mar), 0, 0, Math.round(r * 2.4), r + 0.2), repeatAround(sphere(r - 0.13, y + h + 1.08, 0, 0.11, mar), 0, 0, Math.round(r * 2.4), r + 0.2));
    b.add(cut(cylY(0, 0, y + h + 0.75, y + h + 0.85, r - 0.06, mar), [cylY(0, 0, y + h, y + h + 2, r - 0.2, 0)]));
    // steps up the front, cut through the rail
    b.add(boxAt(-1.4, y, r - 0.6, 1.4, y + h, r + 1.6, mar), boxAt(-0.5, y, r - 0.6, 0.5, y + h + 0.05, r + 1.65, b.mat({ kind: "marble", colour: "#ddd5c4", age: 0.4 })));
    y += h;
  }
  // the hall: a red lower wall of lattice doors behind red columns, then drums and roofs
  const base = y, rWall = R * 0.78;
  b.add(cylY(0, 0, base, base + 5.4, rWall, scr), repeatAround(cylY(R * 0.86, 0, base, base + 5.6, 0.32, red), 0, 0, 24, R * 0.9));
  let yE = base + 5.6;
  const radii = [R, R * 0.79, R * 0.64].slice(0, tiers);
  radii.forEach((re, k) => {
    const last = k === tiers - 1, ri = last ? 0 : radii[k + 1] * 0.82, rise = last ? re * 0.58 : re * 0.27;
    // the bracket band and rafter ends under the eave
    b.add(cylY(0, 0, yE - 1.0, yE, re - 1.2, p), repeatAround(boxAt(re - 1.25, yE - 0.95, -0.12, re - 0.6, yE - 0.15, 0.12, p), 0, 0, Math.round(re * 4.5), re));
    b.add(repeatAround(cylY(re - 0.45, 0, yE - 0.12, yE, 0.07, p), 0, 0, Math.round(re * 9), re));
    chineseRoof(b, { kind: "pyramid", sides: 48, hx: re + 0.4, hz: 0, y: yE, rise, lift: 0.05, tiles: o.tiles ?? "blue", t: 0.45, open: last ? undefined : ri });
    if (!last) {
      // the next drum: a band of lattice windows in turquoise and gold
      const dTop = yE + rise + 2.4;
      b.add(cylY(0, 0, yE + rise * 0.6, dTop, ri, band), cylY(0, 0, dTop - 0.5, dTop, ri + 0.12, p));
      yE = dTop + 0.6;
    } else {
      b.add(cylY(0, 0, yE + rise - 0.3, yE + rise + 0.5, 0.5, gold), sphere(0, yE + rise + 1.2, 0, 0.9, gold), coneY(0, 0, yE + rise + 2.0, yE + rise + 2.6, 0.25, 0.02, gold));
    }
  });
}

// ---- Garden and vernacular -----------------------------------------------------------------------------------------------

/** A pavilion (ting): `sides` red columns on a stone base, bench rails between them, a pyramidal roof with sweeping corners. */
export function pavilion(b: SceneBuilder, o: { sides?: number; R?: number; h?: number; tiles?: TileRank } = {}) {
  const n = o.sides ?? 6, R = o.R ?? 2.6, h = o.h ?? 3.2, red = b.mat(CN.red), st = b.mat(CN.stone), p = b.mat(CN.poly);
  b.add(revolve(0, 0, 0, 0.6, () => R + 0.7, R + 0.7, st, 0, 0.1));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R, a2 = ((i + 1) / n) * Math.PI * 2, x2 = Math.cos(a2) * R, z2 = Math.sin(a2) * R;
    b.add(cylY(x, z, 0.6, 0.6 + h, 0.16, red));
    if (i !== 0) b.add(capsule(x, 1.05, z, x2, 1.05, z2, 0.07, red), capsule(x, 0.6 + h - 0.35, z, x2, 0.6 + h - 0.35, z2, 0.09, p));
    else b.add(capsule(x, 0.6 + h - 0.35, z, x2, 0.6 + h - 0.35, z2, 0.09, p)); }
  chineseRoof(b, { kind: "pyramid", sides: n, hx: R + 1.2, hz: 0, y: 0.6 + h, rise: R * 0.9, lift: 0.7, tiles: o.tiles ?? "grey", t: 0.25 });
}
/** A pagoda of `storeys` octagonal storeys, each under its own eave, narrowing upward, with a finial of rings. */
export function pagoda(b: SceneBuilder, o: { storeys?: number; R?: number; wall?: SurfaceSpec; tiles?: TileRank } = {}) {
  const n = o.storeys ?? 7, R0 = o.R ?? 4, wall = b.mat(o.wall ?? CN.white), red = b.mat(CN.red), st = b.mat(CN.stone);
  b.add(revolve(0, 0, 0, 1.2, () => R0 + 1.2, R0 + 1.2, st, 0, 0.1));
  let y = 1.2;
  for (let k = 0; k < n; k++) {
    const R = R0 * (1 - k * 0.07), h = k === 0 ? 4.2 : 2.6, y0 = y;
    b.add(leaf((x, py, z) => { const s = Math.PI / 4, a = Math.atan2(z, x), q = x * Math.cos(Math.round(a / s) * s) + z * Math.sin(Math.round(a / s) * s); return Math.max(q - R, y0 - py, py - y0 - h); }, [-R * 1.09, y0, -R * 1.09], [R * 1.09, y0 + h, R * 1.09], wall));
    b.add(cut(cylZ(0, y + h * 0.55, R - 0.4, R + 0.05, 0.42, red), [cylZ(0, y + h * 0.55, R - 1, R + 1, 0.3, 0)]));
    chineseRoof(b, { kind: "pyramid", sides: 8, hx: R + 1.3, hz: 0, y: y + h, rise: 0.9, lift: 0.45, tiles: o.tiles ?? "grey", t: 0.3, open: k < n - 1 ? R * 0.9 : undefined });
    y += h + 0.6;
  }
  for (let i = 0; i < 6; i++) b.add(cylY(0, 0, y + i * 0.45, y + i * 0.45 + 0.12, 0.5 - i * 0.05, b.mat(CN.gold)));
  b.add(cylY(0, 0, y - 0.6, y + 3.2, 0.08, b.mat(CN.gold)), sphere(0, y + 3.3, 0, 0.25, b.mat(CN.gold)));
}
/** A memorial archway (paifang): four posts, three bays, painted beams, a small curved roof over each bay (the middle highest). */
export function paifang(b: SceneBuilder, o: { W?: number; H?: number; tiles?: TileRank } = {}) {
  const W = o.W ?? 12, H = o.H ?? 6.5, red = b.mat(CN.red), p = b.mat(CN.poly), st = b.mat(CN.stone), xs = [-W / 2, -W / 6, W / 6, W / 2];
  for (const x of xs) b.add(cylY(x, 0, 0, H + (Math.abs(x) < W / 3 ? 1.2 : 0), 0.32, red), boxAt(x - 0.55, 0, -0.55, x + 0.55, 1.1, 0.55, st), boxAt(x - 0.12, 0, -1.1, x + 0.12, 2.2, 1.1, st));
  b.add(boxAt(-W / 2, H - 1.4, -0.25, W / 2, H - 0.8, 0.25, p), boxAt(-W / 6, H + 0.2, -0.25, W / 6, H + 1.2, 0.25, p), boxAt(-W / 6 + 0.6, H - 0.8, -0.18, W / 6 - 0.6, H + 0.2, 0.18, b.mat({ kind: "painted-wood", colour: "#1f3d6a" })));
  for (const [cx, w, y] of [[0, W / 3 + 1.6, H + 1.2], [-W / 3, W / 3 + 0.8, H], [W / 3, W / 3 + 0.8, H]] as const) {
    bracketBand(b, -w / 2 + 0.6, w / 2 - 0.6, 0.3, y - 0.05, 0.55, 0.6);
    chineseRoof(b, { kind: "hip", hx: w / 2, hz: 1.3, y: y + 0.5, rise: 1.1, lift: 0.45, tiles: o.tiles ?? "green", beasts: 3, t: 0.25 });
    // roofs are built at the origin: shift by placing each as its own group
    b.place({ x: cx });
  }
}
/** A whitewashed garden wall under grey tile coping, pierced by a moon gate, a vase doorway and lattice leak windows. */
export function gardenWall(b: SceneBuilder, o: { L?: number; H?: number } = {}) {
  const L = o.L ?? 16, H = o.H ?? 3.6, wall = b.mat(CN.white), st = b.mat({ kind: "ashlar", colour: "#9b978e", course: 0.3 }), lat = b.mat({ kind: "painted-wood", colour: "#4a4a48" });
  const vase = (cx: number): Node => ({ lo: [cx - 1, 0, -1], hi: [cx + 1, 3, 1], f: (x, y, z) => { const yy = y - 0.05, r = yy < 1.5 ? 0.62 - 0.1 * Math.cos(yy * 2.1) : 0.75 * Math.sqrt(Math.max(0, 1 - ((yy - 1.9) / 0.85) ** 2)); return Math.max(Math.abs(x - cx) - r, -yy, yy - 2.75, Math.abs(z) - 1); } });
  b.add(cut(boxAt(-L / 2, 0, -0.22, L / 2, H, 0.22, wall), [cylZ(-L / 4, 1.55, -1, 1, 1.35, 0), vase(L / 4), boxAt(-0.6, 1.4, -1, 0.6, 2.6, 1, 0), boxAt(L / 2 - 1.8, 1.4, -1, L / 2 - 0.6, 2.6, 1, 0)]));
  b.add(cut(cylZ(-L / 4, 1.55, -0.25, 0.25, 1.48, st), [cylZ(-L / 4, 1.55, -1, 1, 1.35, 0)]));
  for (const cx of [0, L / 2 - 1.2]) b.add(latticeScreen(cx - 0.6, 1.4, cx + 0.6, 2.6, 0, 0.2, 0.03, 0.08, lat));
  chineseRoof(b, { kind: "gable", hx: L / 2 + 0.2, hz: 0.5, y: H, rise: 0.35, tiles: "grey", t: 0.12, ends: "curl" });
}
/** Huizhou houses: tall white walls with stepped horse-head gables capped in black tiles, small windows, a stone doorway. */
export function horseHeadWall(b: SceneBuilder, o: { W?: number; D?: number; H?: number } = {}) {
  const W = o.W ?? 10, D = o.D ?? 9, H = o.H ?? 7, wall = b.mat(CN.white), st = b.mat({ kind: "ashlar", colour: "#8e8a82", course: 0.35 }), dark = b.mat({ kind: "plain", colour: "#2a2a2a" });
  b.add(cut(boxAt(-W / 2, 0, -D / 2, W / 2, H, D / 2, wall), [boxAt(-0.7, 0, D / 2 - 0.3, 0.7, 2.4, D / 2 + 0.2, 0), boxAt(-3.2, 4.6, D / 2 - 0.2, -2.4, 5.4, D / 2 + 0.2, 0), boxAt(2.4, 4.6, D / 2 - 0.2, 3.2, 5.4, D / 2 + 0.2, 0)]));
  b.add(boxAt(-0.95, 0, D / 2 - 0.05, 0.95, 2.7, D / 2 + 0.12, st), boxAt(-0.7, 0, D / 2 - 0.28, 0.7, 2.4, D / 2 - 0.2, b.mat({ kind: "boards", colour: "#3a3028" })), boxAt(-3.2, 4.6, D / 2 - 0.15, -2.4, 5.4, D / 2 - 0.1, dark), boxAt(2.4, 4.6, D / 2 - 0.15, 3.2, 5.4, D / 2 - 0.1, dark));
  b.place();
  chineseRoof(b, { kind: "gable", hx: 1.8, hz: 0.5, y: 2.8, rise: 0.4, tiles: "black", t: 0.12, ends: "curl" }); b.place({ z: D / 2 + 0.35 });
  // the stepped gable walls on each side, each step capped in black tiles that lift at the ends
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const y0 = H + k * 1.1, zz = D / 2 - k * (D / 6);
    b.add(boxAt(-0.25, H - 0.1, -zz, 0.25, y0 + 1.0, zz, wall));
    chineseRoof(b, { kind: "gable", hx: 0.45, hz: zz + 0.3, y: y0 + 1.0, rise: 0.25, tiles: "black", t: 0.12, ends: "curl" });
    b.place({ x: s * W / 2 });
  }
}
/** A humpbacked stone bridge with a near-semicircular arch (its reflection completes the circle) and low stone rails. */
export function humpBridge(b: SceneBuilder, o: { span?: number; W?: number } = {}) {
  const span = o.span ?? 7, W = o.W ?? 3.2, st = b.mat({ kind: "ashlar", colour: "#a8a49a", course: 0.35, age: 0.8, moss: 0.4 }), R = span / 2, top = R + 1.4, Rh = 9;
  const hump = (n: Node): Node => ({ lo: n.lo, hi: n.hi, f: (x, y, z) => Math.max(n.f(x, y, z), Math.hypot(x, y - (top - Rh)) - Rh) });
  b.add(hump(cut(boxAt(-span - 2, -2, -W / 2, span + 2, top, W / 2, st), [cylZ(0, 0, -W, W, R, 0)])));
  b.add(cut(cylZ(0, 0, -W / 2 - 0.05, W / 2 + 0.05, R + 0.45, st), [cylZ(0, 0, -W, W, R, 0), boxAt(-R - 1, -3, -W, R + 1, 0, W, 0)]));
  for (const z of [-W / 2 + 0.12, W / 2 - 0.12]) b.add(hump({ lo: [-span - 2, 0, z - 0.12], hi: [span + 2, top + 1, z + 0.12], f: (x, y, zz) => { const yTop = top - Rh + Math.sqrt(Math.max(0, Rh * Rh - x * x)); return Math.max(y - yTop - 0.7, yTop - 0.05 - y, Math.abs(zz - z) - 0.12, Math.abs(x) - span - 1.5) * 0.8; } }));
}
/** A red paper lantern hanging from a cord, glowing at dusk. */
export function redLantern(b: SceneBuilder, x: number, y: number, z: number, r = 0.35) {
  b.add(revolve(x, z, y - r * 1.2, y + r * 0.2, t => r * Math.sin(Math.PI * t) ** 0.8 + 0.03, r + 0.05, b.mat({ kind: "fabric", colour: "#b8261c", colour2: "#a3221a", emit: 0.25 }), 0, 2), cylY(x, z, y + r * 0.2, y + r * 0.35, r * 0.3, b.mat(CN.gold)), cylY(x, z, y + r * 0.35, y + 1.2, 0.012, b.mat({ kind: "iron" })));
  b.light({ x, y: y - r * 0.5, z, kelvin: 1900, power: 0.25, lamp: true });
}

/**
 * A round moon window set into the face of a wall that faces x (`xFace`, `face` = the direction into the room): a moulded
 * ring holding an ice-ray lattice (bingliewen), straight bars meeting at odd angles like cracks in thawing ice, with
 * paper behind them that glows (centre `cz`, `cy`, radius R).
 */
export function moonWindow(b: SceneBuilder, xFace: number, cz: number, cy: number, R: number, face: 1 | -1, wood: SurfaceSpec = CN.lattice, paper: SurfaceSpec = { kind: "washi", colour: "#f1e8d2", emit: 0.45 }): Node[] {
  const w = b.mat(wood), p = b.mat(paper), cell = R * 0.42, xl = xFace + face * 0.05;
  const lattice = leaf((x, y, z) => {
    const r = Math.hypot(z - cz, y - cy), wv = worley(17, (z - cz) / cell, (y - cy) / cell, 0.85), edge = (wv.f2 - wv.f1) * 0.5 * cell;
    return Math.max(Math.min(edge - 0.02, Math.abs(r - R) - 0.07), r - R - 0.07, Math.abs(x - xl) - 0.025) * 0.9;
  }, [xl - 0.03, cy - R - 0.08, cz - R - 0.08], [xl + 0.03, cy + R + 0.08, cz + R + 0.08], w);
  const sheet = leaf((x, y, z) => Math.max(Math.hypot(z - cz, y - cy) - R, Math.abs(x - (xFace + face * 0.01)) - 0.004), [xFace - 0.02, cy - R, cz - R], [xFace + 0.02, cy + R, cz + R], p);
  return [lattice, sheet];
}
