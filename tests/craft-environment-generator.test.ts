import { describe, expect, it, vi } from "vitest";
import { MeshPhysicalMaterial } from "three";
import { createCraftFacade, createCraftTree, validateCraftFacadeSpec, validateCraftTreeSpec } from "../registry/craft/environment-generator";

describe("native Three.js craft environments", () => {
  it("builds a façade with meaningful construction zones and WebGL PBR colors", () => {
    const spec = { schemaVersion: 1 as const, id: "background-block", seed: 41, height: 27,
      footprint: { width: 12, depth: 11 }, colors: { masonry: 0x957d6c, trim: 0xdfcbb4,
        glass: 0x1b3d51, metal: 0x6a7478 } };
    const a = createCraftFacade(spec), b = createCraftFacade(spec);
    expect(a.vertexCount).toBeGreaterThan(1000);
    expect(a.vertexCount).toBeLessThan(240000);
    expect(a.material.isMeshStandardMaterial).toBe(true);
    expect(a.material.vertexColors).toBe(true);
    expect(a.materials).toHaveLength(6);
    expect(a.materials[2]).toBeInstanceOf(MeshPhysicalMaterial);
    expect((a.materials[2] as MeshPhysicalMaterial).transmission).toBeGreaterThan(0);
    expect((a.materials[2] as MeshPhysicalMaterial).depthWrite).toBe(false);
    expect(a.geometry.groups.length).toBeGreaterThanOrEqual(7);
    expect(a.geometry.groups[a.geometry.groups.length - 1]?.materialIndex).toBe(5);
    expect(a.geometry.groups.reduce((sum, group) => sum + group.count, 0)).toBe(a.vertexCount);
    expect(a.geometry.getAttribute("partId").count).toBe(a.vertexCount);
    expect(a.geometry.getAttribute("color").count).toBe(a.vertexCount);
    expect(Array.from(a.geometry.getAttribute("color").array).slice(0, 100))
      .toEqual(Array.from(b.geometry.getAttribute("color").array).slice(0, 100));
    const unique = new Set<number>();
    const partId = a.geometry.getAttribute("partId");
    for (let i = 0; i < partId.count; i++) unique.add(partId.getX(i));
    expect(unique.size).toBeGreaterThan(3);
    expect(a.geometry.boundingBox?.max.y).toBeGreaterThan(20);
    const glassDispose = vi.fn();
    a.materials[2].addEventListener("dispose", glassDispose);
    a.dispose(); b.dispose();
    expect(glassDispose).toHaveBeenCalledTimes(1);
  });

  it("keeps glass/interior group mapping valid across different facade seeds and profiles", () => {
    for (const seed of [1, 7, 18, 41, 99]) {
      const facade = createCraftFacade({ schemaVersion: 1, id: `facade-${seed}`, seed,
        height: seed % 2 ? 18 : 35,
        footprint: { width: 10 + seed % 7, depth: 9 + seed % 5 },
        glass: { transmission: .45, opacity: .76, roughness: .16 } });
      const groups = facade.geometry.groups;
      expect(groups[groups.length - 1]?.materialIndex).toBe(5);
      expect(groups.some(group => group.materialIndex === 2)).toBe(true);
      expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(facade.vertexCount);
      facade.dispose();
    }
  });

  it("generates a deterministic branched tree with separate folded leaf instances", () => {
    const spec = { schemaVersion: 1 as const, id: "canopy", seed: 81, trunkLength: 4,
      trunkRadius: .16, crown: "broad" as const, leafCount: 115 };
    const a = createCraftTree(spec), b = createCraftTree(spec);
    expect(a.vertexCount).toBeGreaterThan(100);
    expect(a.foliage?.count).toBe(115);
    expect(a.group.userData.partIds).toEqual(["canopy-branches", "canopy-leaves"]);
    expect(a.foliage?.geometry.getAttribute("normal")).toBeDefined();
    expect(a.foliage?.geometry.getAttribute("color")).toBeDefined();
    expect(Array.from(a.foliage!.instanceMatrix.array)).toEqual(Array.from(b.foliage!.instanceMatrix.array));
    const aDispose = vi.fn(), bDispose = vi.fn();
    a.branches.geometry.addEventListener("dispose", aDispose);
    a.foliage!.geometry.addEventListener("dispose", bDispose);
    a.dispose(); a.dispose(); b.dispose();
    expect(aDispose).toHaveBeenCalledTimes(1);
    expect(bDispose).toHaveBeenCalledTimes(1);
  });

  it("supports a leafless branch silhouette without allocating foliage", () => {
    const tree = createCraftTree({ schemaVersion: 1, id: "winter-tree", seed: 5,
      trunkLength: 4, trunkRadius: .13, crown: "slender", leafCount: 0 });
    expect(tree.foliage).toBeUndefined();
    expect(tree.group.children).toHaveLength(1);
    tree.dispose();
  });

  it("rejects impossible dimensions and invalid colors", () => {
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 140,
      footprint: { width: 20, depth: 20 } })).toThrow(/height/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, colors: { glass: 0x1000000 } })).toThrow(/RGB/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, glass: { opacity: .05 } })).toThrow(/glass/);
    expect(() => validateCraftTreeSpec({ schemaVersion: 1, id: "bad", seed: 4, trunkLength: 3,
      trunkRadius: .14, crown: "broad", leafCount: 901 })).toThrow(/leafCount/);
  });
});
