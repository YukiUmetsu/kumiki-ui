import { describe, expect, it } from "vitest";
import { FURNITURE_TYPES, checkFurniture } from "../registry/anatomy/furn-data";
import { BUILT_FURNITURE } from "../registry/anatomy/furn-construct";
import { ROOMS, pieceScene, roomScene } from "../registry/anatomy/furn-library";

describe("INTERIOR1 interiors and furniture", () => {
  it("builds every furniture type at a sensible seat or table height", () => {
    expect(new Set(FURNITURE_TYPES.map(t => t.id)).size).toBe(FURNITURE_TYPES.length);
    for (const t of FURNITURE_TYPES) {
      expect(BUILT_FURNITURE, t.id).toContain(t.id);
      for (const c of checkFurniture(t)) expect(c.ok, `${t.id}: ${c.note}`).toBe(true);
      expect(pieceScene(t.id).mood, t.id).toBe("studio");
    }
  });
  it("paints every room as a lit interior", () => {
    for (const r of ROOMS) { const s = roomScene(r.id); expect(s.interior, r.id).toBe(true); expect(s.surfaces.length, r.id).toBeGreaterThan(3); }
  });
});
