/**
 * GEO1 terrain: heightfields for the landforms in `geo-data.ts`, worn by water and gravity.
 *
 * - `terrainHeightfield({ kind, seed, relief, span })` builds the land (heights in metres on a square grid): ridged
 *   fold ranges, concave stratovolcanoes with radial gullies, shields, cinder cones, mesas with a cap rock over talus,
 *   transverse dunes with gentle backs and slip faces at the angle of repose, rolling hills, U- and V-valleys, a
 *   cliffed coast.
 * - **Hydraulic erosion** (`erode`): tens of thousands of raindrops run downhill, picking up sediment where they speed
 *   up and dropping it where they slow (the droplet model widely used for terrain, after Beyer 2015, "Implementation
 *   of a method for hydraulic erosion"). It cuts branching gullies and lays fans at the foot of slopes.
 * - **Thermal erosion** (`settle`): loose material steeper than its angle of repose slides down (scree under cliffs).
 * - `terrainHeightAt` reads the field anywhere (bilinear), with distant ranges beyond its edge so a horizon never
 *   ends in a cut.
 *
 * Deterministic for a seed.
 */
import { fbm, ridged, warpedFbm } from "../anatomy/foundation-raster";
import type { TerrainKind } from "./geo-data";

export interface Heightfield {
  /** Grid points per side. */
  n: number;
  /** Side length, m (the grid spans 0 … span in x and z). */
  span: number;
  /** Heights, m, row by row (z rows of x). */
  h: Float32Array;
  kind: TerrainKind;
  seed: number;
  /** Lowest and highest heights, m. */
  min: number; max: number;
  /** Sea level when the land meets water (coast), else -Infinity. */
  sea: number;
  ms: number;
}

export interface TerrainOptions {
  kind?: TerrainKind;
  seed?: number;
  /** Grid points per side (default 256). */
  n?: number;
  /** Side length, m (default by kind: 12 km for a range, 1.5 km for a cinder cone, 1.2 km for dunes). */
  span?: number;
  /** Relief (top above the foot), m; default by kind. */
  relief?: number;
  /** The foot's height above sea level, m (default by kind). */
  base?: number;
  /** Raindrops per grid point for hydraulic erosion (default by kind; 0 to skip). */
  rain?: number;
}

const SPAN: Record<TerrainKind, number> = { alpine: 12000, volcano: 14000, shield: 30000, cinder: 1500, mesa: 6000, dunes: 1200, hills: 6000, "u-valley": 8000, "v-valley": 6000, coast: 3000 };
const RELIEF: Record<TerrainKind, number> = { alpine: 3000, volcano: 2700, shield: 1800, cinder: 220, mesa: 380, dunes: 34, hills: 260, "u-valley": 1500, "v-valley": 900, coast: 120 };
const BASE: Record<TerrainKind, number> = { alpine: 1300, volcano: 900, shield: 300, cinder: 1400, mesa: 1500, dunes: 300, hills: 120, "u-valley": 900, "v-valley": 400, coast: 0 };
const RAIN: Record<TerrainKind, number> = { alpine: 1.1, volcano: 0.8, shield: 0.3, cinder: 0.25, mesa: 0.12, dunes: 0, hills: 0.4, "u-valley": 0.7, "v-valley": 1.0, coast: 0 };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Build a terrain heightfield for a landform kind (heights in metres). */
export function terrainHeightfield(o: TerrainOptions = {}): Heightfield {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const kind = o.kind ?? "alpine", seed = o.seed ?? 1, n = o.n ?? (kind === "dunes" ? 384 : 256), span = o.span ?? SPAN[kind], relief = o.relief ?? RELIEF[kind], base = o.base ?? BASE[kind];
  const h = new Float32Array(n * n);
  // work in a unit square (u, v in 0 … 1), heights 0 … 1, then scale
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = i / (n - 1), v = j / (n - 1);
    h[j * n + i] = shape(kind, seed, u, v);
  }
  const rain = o.rain ?? RAIN[kind];
  if (rain > 0) erode(h, n, seed, Math.round(rain * n * n));
  // loose material settles to its angle of repose (tan 35° ≈ 0.7); a mesa's cap rock and cliffs stand (no settling)
  if (kind === "dunes") settle(h, n, Math.tan((33 * Math.PI) / 180), (relief / span) * (n - 1), 30);
  else if (kind !== "mesa" && kind !== "coast") settle(h, n, 0.75, (relief / span) * (n - 1), 20);
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < h.length; k++) { h[k] = base + h[k] * relief; min = Math.min(min, h[k]); max = Math.max(max, h[k]); }
  return { n, span, h, kind, seed, min, max, sea: kind === "coast" ? 0 : -Infinity, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 };
}

/** The landform's shape at (u, v) in the unit square, 0 … 1 (before erosion). */
function shape(kind: TerrainKind, seed: number, u: number, v: number): number {
  const x = u - 0.5, z = v - 0.5;
  switch (kind) {
    case "alpine": {
      // ridged noise (sharp crests, branching valleys), domain-warped so ridges wander; a massif in the middle distance
      const w = warpedFbm(seed + 3, u * 2.2, v * 2.2, 0.6, 4);
      const rg = ridged(seed, u * 3.1 + w * 0.5, v * 3.1 - w * 0.4, 6, 2.05, 0.52);
      const mass = 0.55 + 0.45 * Math.exp(-((x * 1.1) ** 2 + ((z - 0.12) * 1.6) ** 2) * 3.2);
      return Math.max(0, Math.pow(rg, 1.6) * mass + 0.06 * fbm(seed + 7, u * 9, v * 9, 3));
    }
    case "volcano": case "cinder": case "shield": {
      const r = Math.hypot(x, z) * 2, a = Math.atan2(z, x);
      if (kind === "shield") return Math.max(0, 1 - r * r * 0.9) * (0.92 + 0.08 * fbm(seed, u * 6, v * 6, 4)) + 0.05 * fbm(seed + 2, u * 3, v * 3, 3);
      const R = kind === "cinder" ? 0.55 : 0.95;
      // concave flanks (steep near the top), a summit crater, radial gullies cut by the noise along the angle
      let hh = Math.max(0, 1 - Math.pow(Math.min(1.4, r / R), kind === "cinder" ? 1 : 0.62));
      const crater = kind === "cinder" ? 0.16 : 0.05, rim = kind === "cinder" ? 0.14 : 0.07;
      if (r < crater) hh -= (rim) * (1 - (r / crater) ** 2);
      const gully = kind === "cinder" ? 0 : 0.035 * Math.max(0, r - 0.12) * ridged(seed + 5, a * 6, r * 4, 3, 2, 0.5);
      return Math.max(0, hh - gully + 0.04 * fbm(seed + 9, u * 4, v * 4, 4) * smooth(0.1, 0.6, r));
    }
    case "mesa": {
      // A hard cap rock over softer layers: broad flat tables (a couple of km across) where a low-frequency field is
      // high; at the table's edge a near-vertical cliff band (the cap and the layer below it), then a talus apron at
      // about 33° falling to the plain. Distance to the edge from the field and its gradient.
      const fq = 2.3, f = fbm(seed, u * fq, v * fq, 4) * 0.5 + 0.5, e = 0.004;
      const gx = ((fbm(seed, (u + e) * fq, v * fq, 4) - fbm(seed, (u - e) * fq, v * fq, 4)) * 0.5) / (2 * e), gy = ((fbm(seed, u * fq, (v + e) * fq, 4) - fbm(seed, u * fq, (v - e) * fq, 4)) * 0.5) / (2 * e);
      const edge = 0.6, dist = (edge - f) / Math.max(0.05, Math.hypot(gx, gy));
      const cap = 0.96 + 0.02 * fbm(seed + 4, u * 14, v * 14, 2), cliffDrop = 0.38, cliffW = 0.0035;
      // talus: 33° in unit heights per unit distance (span / relief, about 6000 / 380)
      const talus = Math.tan((33 * Math.PI) / 180) * (6000 / 380), floor = 0.06 + 0.04 * fbm(seed + 6, u * 3, v * 3, 3);
      if (dist <= 0) return cap;
      if (dist < cliffW) return cap - cliffDrop * smooth(0, cliffW, dist) - 0.01 * fbm(seed + 8, u * 40, v * 40, 2);
      const apron = cap - cliffDrop - (dist - cliffW) * talus + 0.015 * fbm(seed + 9, u * 30, v * 30, 2);
      return Math.max(floor, apron);
    }
    case "dunes": {
      // transverse dunes across a wind from -z to +z: a gentle back (about 70% of the wavelength) and a slip face
      // (the wind blows toward -z, so the slip faces look toward a camera on the south side)
      const lambda = 0.1, w = fbm(seed, u * 3, v * 3, 3) * 0.6, s = ((v + w * lambda * 2 + 0.15 * fbm(seed + 1, u * 6, 0.5, 2)) / lambda) % 1, ph = 1 - (s < 0 ? s + 1 : s);
      const saw = ph < 0.86 ? ph / 0.86 : 1 - (ph - 0.86) / 0.14;
      const crest = Math.pow(Math.max(0, saw), 1.3) * (0.7 + 0.3 * fbm(seed + 2, u * 5, v * 2, 3));
      return 0.15 + 0.7 * crest + 0.1 * fbm(seed + 3, u * 2, v * 2, 3);
    }
    case "hills":
      return 0.5 + 0.5 * fbm(seed, u * 2.6, v * 2.6, 5, 2, 0.45);
    case "u-valley": case "v-valley": {
      // mountains either side of a valley running along z; U: a flat floor and steep walls; V: straight sides
      const walls = Math.pow(ridged(seed, u * 2.5, v * 2.5, 5, 2, 0.5), 1.4) * 0.6 + 0.4;
      const meander = 0.06 * Math.sin(v * 7 + fbm(seed + 1, v * 2, 0.3, 2) * 2), d = Math.abs(x - meander) * 2;
      const prof = kind === "u-valley" ? Math.pow(smooth(0.08, 0.55, d), 1.15) : Math.min(1, d / 0.75);
      return walls * prof + 0.04 * fbm(seed + 2, u * 8, v * 8, 3) * prof + (kind === "v-valley" ? 0.02 : 0.03) * (1 - v);
    }
    case "coast": {
      // land to the north (+z) ending in cliffs above the sea; headlands and coves along the line
      const line = 0.42 + 0.08 * fbm(seed, u * 3, 0.2, 4), land = smooth(line - 0.004, line + 0.004, v);
      return land * (0.75 + 0.25 * fbm(seed + 2, u * 4, v * 4, 4) * smooth(line, 1, v)) - (1 - land) * (0.35 + 0.4 * smooth(line - 0.02, line - 0.3, v));
    }
  }
  return 0;
}

/** Hydraulic erosion by `drops` raindrops on a unit-height field `h` (n × n; cell = 1). */
export function erode(h: Float32Array, n: number, seed: number, drops: number): void {
  const inertia = 0.05, capacityK = 4, minCap = 0.01, depositK = 0.3, erodeK = 0.3, evaporate = 0.015, gravity = 4, life = 40, R = 3;
  // the erosion brush: weights of cells within R of a point (relative offsets)
  const brush: { dx: number; dy: number; w: number }[] = [];
  let ws = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dy); if (d <= R) { const w = 1 - d / R; brush.push({ dx, dy, w }); ws += w; } }
  for (const b of brush) b.w /= ws;
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const sample = (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, k = j * n + i;
    const a = h[k], b = h[k + 1], c = h[k + n], d = h[k + n + 1];
    return { h: a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v, gx: (b - a) * (1 - v) + (d - c) * v, gy: (c - a) * (1 - u) + (d - b) * u };
  };
  for (let q = 0; q < drops; q++) {
    let x = rnd() * (n - 2), y = rnd() * (n - 2), dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
    for (let step = 0; step < life; step++) {
      const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, here = sample(x, y);
      dx = dx * inertia - here.gx * (1 - inertia); dy = dy * inertia - here.gy * (1 - inertia);
      const l = Math.hypot(dx, dy);
      if (l < 1e-9) break;
      dx /= l; dy /= l; x += dx; y += dy;
      if (x < 1 || y < 1 || x >= n - 2 || y >= n - 2) break;
      const dh = sample(x, y).h - here.h, cap = Math.max(-dh * speed * water * capacityK, minCap * 0.01);
      const k = j * n + i;
      if (sed > cap || dh > 0) {
        // drop sediment (all of what fills the pit when going uphill), shared over the four corners
        const drop = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depositK;
        sed -= drop;
        h[k] += drop * (1 - u) * (1 - v); h[k + 1] += drop * u * (1 - v); h[k + n] += drop * (1 - u) * v; h[k + n + 1] += drop * u * v;
      } else {
        // take sediment over the brush, never more than the fall
        const take = Math.min((cap - sed) * erodeK, -dh);
        for (const b of brush) {
          const ii = i + b.dx, jj = j + b.dy;
          if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          const kk = jj * n + ii, w = take * b.w, got = Math.min(h[kk], w);
          h[kk] -= got; sed += got;
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed + dh * -gravity * 0.05 * n / 64));
      water *= 1 - evaporate;
    }
  }
}

/** Thermal erosion: material steeper than `talus` (rise per cell in unit heights, scaled by `unit`) slides down. */
export function settle(h: Float32Array, n: number, talus: number, unit: number, passes: number): void {
  const lim = talus / Math.max(1e-6, unit);
  for (let p = 0; p < passes; p++) for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const k = j * n + i;
    let best = -1, dmax = 0;
    for (const o of [-1, 1, -n, n]) { const d = h[k] - h[k + o]; if (d > dmax) { dmax = d; best = k + o; } }
    if (best >= 0 && dmax > lim) { const m = (dmax - lim) * 0.25; h[k] -= m; h[best] += m; }
  }
}

/**
 * The height at (x, z) in metres (bilinear), anywhere: past the field's edge the land continues as distant ranges
 * (unwormed ridged noise) so a horizon never ends in a cut.
 */
export function terrainHeightAt(f: Heightfield, x: number, z: number): number {
  const n = f.n, gx = (x / f.span) * (n - 1), gz = (z / f.span) * (n - 1);
  const inside = gx >= 0 && gz >= 0 && gx <= n - 1 && gz <= n - 1;
  let hIn = 0;
  if (inside || (gx > -n * 0.1 && gz > -n * 0.1 && gx < n * 1.1 && gz < n * 1.1)) {
    const cx = Math.min(n - 1.001, Math.max(0, gx)), cz = Math.min(n - 1.001, Math.max(0, gz)), i = Math.floor(cx), j = Math.floor(cz), u = cx - i, v = cz - j, k = j * n + i;
    hIn = f.h[k] * (1 - u) * (1 - v) + f.h[k + 1] * u * (1 - v) + f.h[k + n] * (1 - u) * v + f.h[k + n + 1] * u * v;
    if (inside) return hIn;
  }
  // beyond: distant ranges as tall as the field, blended in over a tenth of the span
  const out = Math.max(-gx, -gz, gx - (n - 1), gz - (n - 1)) / (n * 0.1), w = Math.min(1, Math.max(0, out));
  // mountain kinds continue as ranges; volcanoes, mesas, dunes and hills stand on a plain (with low swells)
  const ranges = f.kind === "alpine" || f.kind === "u-valley" || f.kind === "v-valley";
  const far = f.kind === "coast" ? f.sea - 40
    : ranges ? f.min + (f.max - f.min) * (0.15 + 0.85 * Math.pow(ridged(f.seed + 101, x / 9000, z / 9000, 5, 2, 0.5), 1.5))
      : f.min + (f.max - f.min) * (f.kind === "dunes" ? 0.4 : 0.03) * (0.5 + 0.5 * fbm(f.seed + 103, x / (f.span * 0.4), z / (f.span * 0.4), 4));
  return hIn * (1 - w) + far * w;
}
