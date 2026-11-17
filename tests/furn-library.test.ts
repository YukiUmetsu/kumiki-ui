import { describe, expect, it } from "vitest";
import { FURNITURE_TYPES, checkFurniture } from "../registry/anatomy/furn-data";
import { BUILT_FURNITURE } from "../registry/anatomy/furn-construct";
import { ROOMS, pieceScene, roomScene } from "../registry/anatomy/furn-library";
import { TATAMI_LAYOUTS } from "../registry/anatomy/arch-kit-japan";
import { archRise } from "../registry/anatomy/arch-kit-civic";

describe("INTERIOR1 interiors and furniture", () => {
  it("builds every furniture type at a sensible seat or table height", () => {
    expect(new Set(FURNITURE_TYPES.map(t => t.id)).size).toBe(FURNITURE_TYPES.length);
    for (const t of FURNITURE_TYPES) {
      expect(BUILT_FURNITURE, t.id).toContain(t.id);
      for (const c of checkFurniture(t)) expect(c.ok, `${t.id}: ${c.note}`).toBe(true);
      expect(pieceScene(t.id).mood, t.id).toBe("studio");
    }
  });
  it("lays tatami so the mats fill the room and no four corners meet", () => {
    for (const [name, layout] of Object.entries(TATAMI_LAYOUTS)) {
      const W = Math.max(...layout.map(m => m[0] + m[2])), H = Math.max(...layout.map(m => m[1] + m[3])), grid: number[][] = Array.from({ length: H }, () => Array(W).fill(-1));
      layout.forEach(([x, z, w, h], k) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { expect(grid[z + j][x + i], name).toBe(-1); grid[z + j][x + i] = k; } });
      expect(grid.flat().every(v => v >= 0), name).toBe(true);
      for (let z = 1; z < H; z++) for (let x = 1; x < W; x++) expect(new Set([grid[z - 1][x - 1], grid[z - 1][x], grid[z][x - 1], grid[z][x]]).size, `${name} at ${x},${z}`).toBeLessThan(4);
      expect(layout.reduce((a, [, , w, h]) => a + (w * h) / 2, 0), name).toBe(Number(name));
    }
  });
  it("vaults with the cross cell stretched so the groins fall on the diagonals", () => {
    const S = 12, B = 6.8;
    expect(archRise(S / 2, S)).toBeCloseTo(0, 6);
    expect(archRise(0, S, 1)).toBeCloseTo(S * Math.sqrt(0.75), 6);
    expect(archRise(0, S, 0.5)).toBeCloseTo(S / 2, 6);
    // on the diagonal the main tunnel and the stretched cross tunnel stand at the same height
    for (const f of [0.1, 0.4, 0.7, 0.95]) expect(archRise((f * S) / 2, S)).toBeCloseTo(archRise(((f * B) / 2) * (S / B), S), 9);
  });
  it("paints every room as a lit interior", () => {
    for (const r of ROOMS) { const s = roomScene(r.id); expect(s.interior, r.id).toBe(true); expect(s.surfaces.length, r.id).toBeGreaterThan(3); }
  });
});
