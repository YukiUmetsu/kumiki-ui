/**
 * FLORA2 spatial layout: where plants stand. A hero specimen, crop rows (pitch, spacing, stagger, organic jitter and
 * gaps), a grove of clumps (a Thomas cluster process with a minimum spacing) or ground cover (Poisson-disc sampling,
 * Bridson 2007). Positions are metres on the ground plane; each placement names which built specimen it shows, so a
 * field of hundreds of plants draws a few specimens many times.
 */
import { seeded } from "./foundation-shapes";
import type { SpeciesMorphologyProfile } from "./flora-profile";

export type FloraLayout =
  | { mode: "hero" }
  | { mode: "rows"; rowCount: number; plantsPerRow: number; rowPitch?: number; plantSpacing?: number; staggerOffset?: number; organicJitter?: number }
  | { mode: "grove"; count: number; clumpRadius?: number; clumps?: number; organicJitter?: number }
  | { mode: "ground-cover"; width: number; depth: number; density?: number; organicJitter?: number };

export interface FloraPlacement { x: number; z: number; rotation: number; scale: number; specimen: number }

/** Places plants for one species, from the profile's layout defaults. */
export class SpatialLayoutManager {
  constructor(readonly defaults: SpeciesMorphologyProfile["layout"]) {}

  place(layout: FloraLayout, seed: number, specimens: number): FloraPlacement[] {
    const rng = seeded(seed ^ 0x5f3759df), d = this.defaults, out: FloraPlacement[] = [];
    const pick = (i: number) => (i + Math.floor(rng() * specimens)) % Math.max(1, specimens);
    if (layout.mode === "hero") return [{ x: 0, z: 0, rotation: 0, scale: 1, specimen: 0 }];
    if (layout.mode === "rows") {
      const pitch = layout.rowPitch ?? d.rowPitch ?? d.spacing * 1.6, step = layout.plantSpacing ?? d.spacing, jitter = layout.organicJitter ?? 0.25, stagger = layout.staggerOffset ?? 0;
      for (let r = 0; r < layout.rowCount; r++) for (let i = 0; i < layout.plantsPerRow; i++) {
        if (rng() < jitter * 0.06) continue;
        const x = (i - (layout.plantsPerRow - 1) / 2) * step + (r % 2 ? stagger * step : 0) + (rng() - 0.5) * jitter * step;
        const z = (r - (layout.rowCount - 1) / 2) * pitch + (rng() - 0.5) * jitter * 0.25 * step;
        out.push({ x, z, rotation: rng() * Math.PI * 2, scale: 1 + (rng() - 0.5) * 0.24 * jitter, specimen: pick(out.length) });
      }
      return out;
    }
    if (layout.mode === "grove") {
      const jitter = layout.organicJitter ?? 0.3, clumps = Math.max(1, layout.clumps ?? Math.ceil(layout.count / 5));
      const clumpR = layout.clumpRadius ?? d.clumpRadius ?? d.spacing * 1.2, area = Math.sqrt(layout.count) * d.spacing * 1.1, minGap = d.spacing * 0.55;
      const centres = Array.from({ length: clumps }, () => { const a = rng() * Math.PI * 2, r = area * Math.sqrt(rng()); return [Math.cos(a) * r, Math.sin(a) * r] as const; });
      for (let i = 0; i < layout.count; i++) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const c = centres[i % clumps], g = gauss(rng), h = gauss(rng), x = c[0] + g * clumpR, z = c[1] + h * clumpR;
          if (out.some(p => Math.hypot(p.x - x, p.z - z) < minGap)) continue;
          out.push({ x, z, rotation: rng() * Math.PI * 2, scale: 1 + (rng() - 0.5) * 0.4 * jitter, specimen: pick(i) });
          break;
        }
      }
      return out;
    }
    // Ground cover: Bridson's Poisson-disc sampling.
    const density = layout.density ?? d.density ?? 1 / (d.spacing * d.spacing), r = 0.9 / Math.sqrt(density), jitter = layout.organicJitter ?? 0.3;
    const cell = r / Math.SQRT2, gw = Math.ceil(layout.width / cell), gd = Math.ceil(layout.depth / cell), grid = new Int32Array(gw * gd).fill(-1);
    const pts: [number, number][] = [], active: number[] = [];
    const add = (x: number, z: number) => { pts.push([x, z]); active.push(pts.length - 1); grid[Math.floor(z / cell) * gw + Math.floor(x / cell)] = pts.length - 1; };
    add(layout.width * rng(), layout.depth * rng());
    while (active.length && pts.length < 20000) {
      const k = Math.floor(rng() * active.length), [px, pz] = pts[active[k]];
      let found = false;
      for (let t = 0; t < 24 && !found; t++) {
        const a = rng() * Math.PI * 2, rr = r * (1 + rng()), x = px + Math.cos(a) * rr, z = pz + Math.sin(a) * rr;
        if (x < 0 || z < 0 || x >= layout.width || z >= layout.depth) continue;
        const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
        let ok = true;
        for (let j = Math.max(0, gz - 2); j <= Math.min(gd - 1, gz + 2) && ok; j++) for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2) && ok; i++) {
          const q = grid[j * gw + i];
          if (q >= 0 && Math.hypot(pts[q][0] - x, pts[q][1] - z) < r) ok = false;
        }
        if (ok) { add(x, z); found = true; }
      }
      if (!found) active.splice(k, 1);
    }
    return pts.map(([x, z], i) => ({ x: x - layout.width / 2, z: z - layout.depth / 2, rotation: rng() * Math.PI * 2, scale: 1 + (rng() - 0.5) * 0.5 * jitter, specimen: pick(i) }));
  }
}

const gauss = (rng: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng());
