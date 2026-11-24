/**
 * INK-FILM1 terrain: the landform under a painted mountain. A height field with summits, spurs and gullies, seen from the side, gives for
 * every place on the page what a painter would know of it: which face it is, how steep, how deep in a hollow, how far off, and whether a
 * nearer ridge hides it. Nothing here makes a mark; `ink-land` paints with it.
 */
import { inkFbm2 } from "../ink-riso-press";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
export type InkLandKind = "crag" | "pillar" | "hill" | "karst";
/** A summit: where along the page and how deep in it (0 near, 1 far), how high and how wide, page units. */
export interface InkSummit { x: number; z: number; height: number; width: number }
export interface InkTerrainOptions { width: number; height: number; /** Page y of the nearest ground. */ foot: number; /** Page units the far ground stands above the near ground. */ rise: number; /** Depth of the ground, page units. */ depth: number; kind: InkLandKind; summits: readonly InkSummit[]; /** Spurs and gullies, 0–1.5. */ rough: number; seed: number; /** Page units per cell. */ cell?: number }
export interface InkTerrain {
  readonly cell: number; readonly nx: number; readonly ny: number;
  /** Depth of what is seen at a cell, page units; −1 is sky. */ readonly z: Float32Array;
  /** Height over the ground, page units. */ readonly h: Float32Array;
  height(x: number, z: number): number;
  /** Slope, page units per page unit, downhill is negative. */ slope(x: number, z: number): [number, number];
  /** Curvature: above 0 a hollow, under 0 a ridge. */ bend(x: number, z: number): number;
  project(x: number, z: number): [number, number];
  /** Depth seen at a page place; −1 is sky. */ depthAt(x: number, y: number): number;
  /** Ridges that hide something: runs of page places, each with how much they hide and its slope across the page. */
  readonly ridges: readonly (readonly { x: number; y: number; z: number; jump: number; face: number; h: number }[])[];
}
const TOP: Record<InkLandKind, (d: number) => number> = {
  crag: d => (1 - d) ** 1.25,
  pillar: d => 1 - 0.24 * Math.min(1, d / 0.34) - 0.66 * ss(0.3, 0.86, d) - 0.1 * d,
  hill: d => Math.exp(-d * d * 3.2) * ss(1, 0.6, d),
  karst: d => Math.sqrt(Math.max(0, 1 - d * d * 1.02)) * ss(1, 0.9, d),
};
export function createInkTerrain(o: InkTerrainOptions): InkTerrain {
  const cell = o.cell ?? 2.5, { seed, kind, rough } = o, nx = Math.ceil(o.width / cell), ny = Math.ceil(o.height / cell), D = o.depth, nz = Math.round(D / cell);
  const fbm = (k: number, x: number, y: number, n: number) => inkFbm2(seed * 17 + k, x, y, n), ridge = (k: number, x: number, y: number, n: number) => { const v = 1 - Math.abs(2 * fbm(k, x, y, n) - 1); return v * v; };
  const spur = kind === "hill" ? 0.34 : kind === "karst" ? 0.1 : kind === "pillar" ? 0.62 : 0.8;
  const height = (x: number, z: number) => {
    const wx = x + (fbm(1, x / 190, z / 190, 3) - 0.5) * 70, wz = z + (fbm(2, x / 190 + 7, z / 190, 3) - 0.5) * 70;
    // a first pass finds how high the place is; the second bends the spurs by that height, so that no gully falls straight as a curtain
    let best = cone(wx, wz);
    if (best <= 0) return 0;
    const sway = kind === "hill" ? 34 : kind === "karst" ? 9 : kind === "pillar" ? 56 : 46, b1 = best / 130, b2 = best / 44;
    best = cone(wx + rough * sway * (fbm(3, x / 150, b1, 3) - 0.5) * 2 + rough * sway * 0.4 * (fbm(4, x / 60, b2, 2) - 0.5), wz + rough * sway * (fbm(5, x / 150 + 9, b1, 3) - 0.5) * 1.6);
    if (best <= 0) return 0;
    const k = ss(0, 90, best), hard = kind === "hill" ? 0.3 : kind === "karst" ? 0.1 : kind === "pillar" ? 1 : 0.62;
    let h = best + rough * hard * k * (best * 0.12 + 22) * (ridge(70, x / 92, z / 92 + best / 150, 4) - 0.42) + rough * hard * k * 22 * (ridge(71, x / 34, z / 34 + best / 52, 3) - 0.4);
    if (kind === "crag" || kind === "pillar") { const st = (kind === "pillar" ? 66 : 58) + 60 * fbm(72, x / 260, z / 260, 2), q = h / st + (fbm(73, x / 70, z / 70, 2) - 0.5) * 0.9, f = q - Math.floor(q); h += rough * st * (kind === "pillar" ? 0.62 : 0.42) * (ss(0.1, 0.92, f) - f); }
    return Math.max(0, h);
  };
  function cone(wx: number, wz: number) {
    let best = 0;
    for (let i = 0; i < o.summits.length; i++) {
      const s = o.summits[i], R = s.width / 2, dx = wx - s.x, dz = (wz - s.z * D) * (kind === "pillar" || kind === "karst" ? 1 : 1.15), r = Math.hypot(dx, dz) / R;
      if (r > 1.5) continue;
      // spurs run down from the summit and fork
      const a = Math.atan2(dz, dx), n1 = ridge(10 + i, Math.cos(a) * 2.1 + i, Math.sin(a) * 2.1 + r * 0.7, 2), n2 = ridge(30 + i, Math.cos(a) * 5.2 + r * 1.1, Math.sin(a) * 5.2 + i, 2);
      const d = clamp(r * (1 + rough * spur * ss(0.02, 0.5, r) * (0.62 - 0.85 * n1 - 0.4 * (n2 - 0.4))));
      const v = s.height * TOP[kind](d), k = 26;
      // summits join in a saddle, not in a crease
      best = v > best ? v + Math.max(0, k - (v - best)) ** 2 / (k * 4) * Math.min(1, best / 40) : best + Math.max(0, k - (best - v)) ** 2 / (k * 4) * Math.min(1, v / 40);
    }
    return best;
  }
  // sampled once; everything after reads the grid
  const gx = nx + 3, G = new Float32Array(gx * (nz + 3));
  for (let j = 0; j < nz + 3; j++) for (let i = 0; i < gx; i++) G[j * gx + i] = height((i - 1) * cell, (j - 1) * cell);
  const at = (x: number, z: number) => { const u = clamp(x / cell + 1, 0, gx - 1.001), v = clamp(z / cell + 1, 0, nz + 1.999), i = Math.floor(u), j = Math.floor(v), f = u - i, g = v - j, q = j * gx + i; return (G[q] * (1 - f) + G[q + 1] * f) * (1 - g) + (G[q + gx] * (1 - f) + G[q + gx + 1] * f) * g; };
  const slope = (x: number, z: number): [number, number] => { const e = cell * 1.6; return [(at(x + e, z) - at(x - e, z)) / (2 * e), (at(x, z + e) - at(x, z - e)) / (2 * e)]; };
  const bend = (x: number, z: number) => { const e = 11; return (at(x + e, z) + at(x - e, z) + at(x, z + e) + at(x, z - e) - 4 * at(x, z)) / e; };
  const ky = o.rise / D, project = (x: number, z: number): [number, number] => [x, o.foot - at(x, z) - z * ky];
  const Z = new Float32Array(nx * ny).fill(-1), H = new Float32Array(nx * ny);
  const runs: { x: number; y: number; z: number; jump: number; face: number; h: number }[][] = [];
  let open: { x: number; y: number; z: number; jump: number; face: number; h: number }[][] = [];
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell, marks: { x: number; y: number; z: number; jump: number; face: number; h: number }[] = [];
    let top = o.foot / cell, last = o.foot, hidden = false, crest = -1;
    for (let j = 0; j <= nz; j++) {
      const z = j * cell, h = at(x, z), y = o.foot - h - z * ky, row = y / cell;
      if (row < top) {
        if (hidden && crest >= 0) { const c = crest * cell, hh = at(x, c), jump = z - c; if (jump > cell * 4 && hh > 6) marks.push({ x, y: o.foot - hh - c * ky, z: c, jump, face: slope(x, c)[0], h: hh }); hidden = false; }
        for (let k = Math.max(0, Math.ceil(row - 0.5)); k < Math.min(ny, Math.ceil(top - 0.5)); k++) { const f = clamp((last - (k + 0.5) * cell) / (last - y || 1)), zz = Math.max(0, z - cell + f * cell); Z[k * nx + i] = zz; H[k * nx + i] = at(x, zz); }
        top = row; crest = j; last = y;
      } else if (row > top + 0.4) hidden = true;
    }
    if (crest >= 0) { const c = crest * cell, hh = at(x, c); if (hh > 6) marks.push({ x, y: o.foot - hh - c * ky, z: c, jump: 999, face: slope(x, c)[0], h: hh }); }
    // join to the runs of the column before: the nearest place of like depth
    const next: typeof open = [], used = new Set<number>();
    for (const run of open) {
      const e = run[run.length - 1]; let b = -1, bd = 1e9;
      marks.forEach((m, q) => { if (used.has(q)) return; const dy = Math.abs(m.y - e.y), dz = Math.abs(m.z - e.z); if (dy < 150 && dz < 40 + dy * 0.6) { const s = dy + dz * 0.5; if (s < bd) { bd = s; b = q; } } });
      if (b >= 0) { used.add(b); const m = marks[b], n = Math.floor(Math.abs(m.y - e.y) / 14); for (let k = 1; k <= n; k++) { const f = k / (n + 1); run.push({ x: e.x + (m.x - e.x) * f, y: e.y + (m.y - e.y) * f, z: e.z + (m.z - e.z) * f, jump: e.jump, face: e.face + (m.face - e.face) * f, h: e.h + (m.h - e.h) * f }); } run.push(m); next.push(run); } else if (run.length > 5) runs.push(run);
    }
    marks.forEach((m, q) => { if (!used.has(q)) next.push([m]); });
    open = next;
  }
  for (const run of open) if (run.length > 5) runs.push(run);
  return { cell, nx, ny, z: Z, h: H, height: at, slope, bend, project, ridges: runs, depthAt: (x, y) => { const i = Math.floor(x / cell), j = Math.floor(y / cell); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : Z[j * nx + i]; } };
}
