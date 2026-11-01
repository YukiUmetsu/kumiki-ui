import { describe, expect, it, vi } from "vitest";
import { Matrix4 } from "three";
import { createCraftScatter } from "../registry/craft/scatter-placement";
import { createCraftMineralDebris, validateCraftMineralDebris } from "../registry/craft/mineral-debris";

const places = () => createCraftScatter({ schemaVersion: 1, id: "chip-distribution", seed: 41,
  mode: "path", points: [[-1, 0, 0], [1, 0, 0]], count: 36, randomYaw: true,
  scale: [.7, 1.1] });

describe("instanced ground mineral debris", () => {
  it("constructs individually varied seeded sand and rock chips in one draw per family", () => {
    for (const kind of ["sand-grains", "rock-chips"] as const) {
      const spec = { schemaVersion: 1 as const, id: `grains-${kind}`, seed: 9, kind };
      const a = createCraftMineralDebris(spec, places());
      const b = createCraftMineralDebris(spec, places());
      expect(a.count).toBe(36);
      expect(a.mesh.count).toBe(36);
      expect(a.mesh.material).toBe(a.material);
      expect(a.mesh.geometry).toBe(a.geometry);
      expect(a.mesh.instanceColor).toBeDefined();
      expect(a.geometry.getAttribute("position").count).toBeGreaterThan(40);
      expect(a.geometry.getAttribute("normal").array.every(Number.isFinite)).toBe(true);
      expect(Array.from(a.mesh.instanceColor!.array)).toEqual(Array.from(b.mesh.instanceColor!.array));
      expect(Array.from(a.geometry.getAttribute("position").array))
        .toEqual(Array.from(b.geometry.getAttribute("position").array));
      a.dispose(); b.dispose();
    }
  });

  it("uses a lower triangle budget in background and disposes owned resources", () => {
    const spec = { schemaVersion: 1 as const, id: "stones", seed: 9,
      kind: "rock-chips" as const };
    const high = createCraftMineralDebris(spec, places());
    const low = createCraftMineralDebris({ ...spec, detail: "background" }, places());
    expect(low.geometry.getAttribute("position").count)
      .toBeLessThan(high.geometry.getAttribute("position").count);
    const dispose = vi.fn();
    high.material.addEventListener("dispose", dispose);
    high.dispose(); high.dispose(); low.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid bounds and placement matrices", () => {
    const spec = { schemaVersion: 1 as const, id: "stones", seed: 9,
      kind: "rock-chips" as const };
    for (const bad of [{ ...spec, radius: -1 }, { ...spec, kind: "dust" },
      { ...spec, color: 0x1000000 }, { ...spec, detail: "hero" }])
      expect(() => validateCraftMineralDebris(bad as never)).toThrow();
    expect(() => createCraftMineralDebris(spec, [])).toThrow(/1–2500/);
    const dup = places(); dup[1].id = dup[0].id;
    expect(() => createCraftMineralDebris(spec, dup)).toThrow(/distinct/);
    const invalid = places(); invalid[0].matrix = new Matrix4().makeScale(Infinity, 1, 1);
    expect(() => createCraftMineralDebris(spec, invalid)).toThrow(/finite/);
  });
});
