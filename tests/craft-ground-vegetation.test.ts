import { describe, expect, it, vi } from "vitest";
import { Matrix4 } from "three";
import { createCraftScatter } from "../registry/craft/scatter-placement";
import { createCraftGroundVegetation, validateCraftGroundVegetation } from "../registry/craft/ground-vegetation";

const placements = () => createCraftScatter({ schemaVersion: 1, id: "ground-patches", seed: 52,
  mode: "path", count: 24, points: [[-2, 0, 0], [2, 0, 0]], randomYaw: true, scale: [.8, 1.18] });

describe("batched geometry-backed ground vegetation", () => {
  it("builds three different, deterministic families without per-blade draw calls", () => {
    const counts: number[] = [];
    for (const kind of ["meadow-grass", "woodland-fern", "wildflower"] as const) {
      const spec = { schemaVersion: 1 as const, id: `plant-${kind}`, seed: 17, kind };
      const first = createCraftGroundVegetation(spec, placements());
      const second = createCraftGroundVegetation(spec, placements());
      expect(first.count).toBe(24);
      expect(first.mesh.count).toBe(24);
      expect(first.mesh.material).toBe(first.material);
      expect(first.mesh.geometry).toBe(first.geometry);
      expect(first.material.vertexColors).toBe(true);
      expect(first.material.metalness).toBe(0);
      expect(first.material.roughness).toBe(kind === "wildflower" ? .69 :
        kind === "woodland-fern" ? .76 : .86);
      expect(first.mesh.userData.vegetationKind).toBe(kind);
      expect(first.geometry.getAttribute("position").count).toBeGreaterThan(60);
      expect(first.geometry.index!.count % 3).toBe(0);
      expect(first.geometry.getAttribute("color").count)
        .toBe(first.geometry.getAttribute("position").count);
      expect(first.geometry.getAttribute("normal").array.every(Number.isFinite)).toBe(true);
      expect(first.mesh.instanceColor).toBeDefined();
      expect(Array.from(first.mesh.instanceMatrix.array)).toEqual(Array.from(second.mesh.instanceMatrix.array));
      expect(Array.from(first.mesh.instanceColor!.array)).toEqual(Array.from(second.mesh.instanceColor!.array));
      expect(Array.from(first.geometry.getAttribute("position").array))
        .toEqual(Array.from(second.geometry.getAttribute("position").array));
      expect(first.geometry.boundingSphere!.radius).toBeGreaterThan(.3);
      counts.push(first.geometry.getAttribute("position").count);
      first.dispose(); second.dispose();
    }
    expect(new Set(counts).size).toBe(3);
  });

  it("offers a bounded cheaper background geometry variant and owns its resources", () => {
    const spec = { schemaVersion: 1 as const, id: "fern-study", seed: 21,
      kind: "woodland-fern" as const };
    const supporting = createCraftGroundVegetation(spec, placements());
    const background = createCraftGroundVegetation({ ...spec, detail: "background" }, placements());
    expect(background.geometry.getAttribute("position").count)
      .toBeLessThan(supporting.geometry.getAttribute("position").count);
    const geoDispose = vi.fn(), matDispose = vi.fn();
    supporting.geometry.addEventListener("dispose", geoDispose);
    supporting.material.addEventListener("dispose", matDispose);
    supporting.dispose(); supporting.dispose(); background.dispose();
    expect(geoDispose).toHaveBeenCalledTimes(1);
    expect(matDispose).toHaveBeenCalledTimes(1);
  });

  it("keeps detail for the close-up tier and avoids unnecessary background geometry", () => {
    for (const kind of ["meadow-grass", "woodland-fern", "wildflower"] as const) {
      const base = { schemaVersion: 1 as const, seed: 43, id: `detail-${kind}`, kind };
      const high = createCraftGroundVegetation(base, placements());
      const low = createCraftGroundVegetation({ ...base, detail: "background" }, placements());
      expect(high.geometry.getAttribute("position").count)
        .toBeGreaterThan(low.geometry.getAttribute("position").count * 2);
      high.dispose(); low.dispose();
    }
  });

  it("rejects invalid material colors, seed, dimensions and untrusted placements", () => {
    const spec = { schemaVersion: 1 as const, id: "ground", seed: 4,
      kind: "wildflower" as const };
    for (const invalid of [
      { ...spec, kind: "palmtree" }, { ...spec, seed: Infinity },
      { ...spec, detail: "ultra" }, { ...spec, heightScale: 0 },
      { ...spec, colors: { bloom: 0x1000000 } },
    ]) expect(() => validateCraftGroundVegetation(invalid as never)).toThrow();
    expect(() => createCraftGroundVegetation(spec, [])).toThrow(/1–2500/);
    const points = placements();
    points[1].id = points[0].id;
    expect(() => createCraftGroundVegetation(spec, points)).toThrow(/distinct/);
    points[1].id = "new-id";
    points[1].matrix = new Matrix4().makeScale(Number.NaN, 1, 1);
    expect(() => createCraftGroundVegetation(spec, points)).toThrow(/finite/);
    const many = createCraftScatter({ schemaVersion: 1, id: "dense-fern", seed: 31,
      mode: "path", count: 1800, points: [[0, 0, 0], [10, 0, 0]] });
    expect(() => createCraftGroundVegetation({ ...spec, kind: "woodland-fern" }, many))
      .toThrow(/2.5M/);
  });
});
