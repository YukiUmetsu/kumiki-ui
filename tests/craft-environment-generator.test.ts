import { describe, expect, it, vi } from "vitest";
import { Matrix4, MeshPhysicalMaterial } from "three";
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
    expect(a.interiors).toBeUndefined();
    expect(a.mesh.children).toHaveLength(0);
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

  it("places deduplicated room pockets behind native panes while suppressing opaque backing", () => {
    const spec = { schemaVersion: 1 as const, id: "interior-facade", seed: 41,
      height: 27, footprint: { width: 13, depth: 11 },
      interiors: { depth: 1.85, litFraction: .4 } };
    const first = createCraftFacade(spec), second = createCraftFacade(spec);
    expect(first.interiors).toBeDefined();
    expect(first.mesh.children).toContain(first.interiors!.group);
    expect(first.interiors!.roomCount).toBeGreaterThan(8);
    expect(first.interiors!.roomCount).toBeLessThan(400);
    const part = first.geometry.getAttribute("partId");
    let glassVertices = 0;
    for (let index = 0; index < part.count; index++)
      if ([4, 6].includes(Math.round(part.getX(index)))) glassVertices++;
    expect(first.interiors!.roomCount).toBeLessThan(glassVertices / 6);
    expect(first.interiors!.roomParts.count).toBe(first.interiors!.roomCount * 8);
    expect(first.interiors!.litRoomCount).toBeGreaterThan(0);
    expect(first.interiors!.litRoomCount).toBe(first.interiors!.lightParts?.count);
    expect(first.interiors!.group.userData.partRole).toBe("procedural-window-interiors");
    expect(first.geometry.groups.some(group => group.materialIndex === 2)).toBe(true);
    expect(first.geometry.groups.some(group => group.materialIndex === 5)).toBe(false);
    expect(first.geometry.groups.reduce((sum, group) => sum + group.count, 0))
      .toBeLessThan(first.vertexCount);
    const a = new Matrix4(), b = new Matrix4();
    first.interiors!.roomParts.getMatrixAt(7, a);
    second.interiors!.roomParts.getMatrixAt(7, b);
    expect(Array.from(a.elements)).toEqual(Array.from(b.elements));
    expect(Array.from(first.interiors!.roomParts.instanceColor!.array))
      .toEqual(Array.from(second.interiors!.roomParts.instanceColor!.array));
    const dispose = vi.fn();
    first.interiors!.roomParts.geometry.addEventListener("dispose", dispose);
    first.dispose(); first.dispose(); second.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("lets a facade have no emissive fixtures or all lit fixtures deterministically", () => {
    for (const fraction of [0, 1]) {
      const facade = createCraftFacade({ schemaVersion: 1, id: `lighting-${fraction}`, seed: 9,
        height: 18, footprint: { width: 10, depth: 11 },
        interiors: { litFraction: fraction } });
      expect(facade.interiors!.litRoomCount).toBe(fraction * facade.interiors!.roomCount);
      expect(!!facade.interiors!.lightParts).toBe(fraction === 1);
      facade.dispose();
    }
  });

  it("keeps optional room pockets finite and attached under different native facade profiles", () => {
    for (const seed of [1, 18, 41, 99]) {
      const facade = createCraftFacade({ schemaVersion: 1, id: `room-profile-${seed}`,
        seed, height: seed % 2 ? 22 : 37,
        footprint: { width: 10 + seed % 7, depth: 10 + seed % 4 },
        interiors: { depth: 1.2, litFraction: .35 } });
      expect(facade.interiors!.roomCount).toBeGreaterThan(0);
      expect(facade.interiors!.roomParts.instanceMatrix.array.every(Number.isFinite)).toBe(true);
      expect(facade.interiors!.group.parent).toBe(facade.mesh);
      facade.mesh.position.set(4, 0, -7);
      facade.mesh.updateWorldMatrix(true, true);
      expect(facade.interiors!.roomParts.matrixWorld.elements[12]).toBe(4);
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

  it("generates distinct, deterministic oak, birch and pine silhouettes and foliage geometry", () => {
    const bounds: number[] = [];
    for (const species of ["oak", "birch", "pine"] as const) {
      const spec = { schemaVersion: 1 as const, id: `species-${species}`, seed: 73,
        species, trunkLength: 4.6, trunkRadius: .16, leafCount: 175 };
      const first = createCraftTree(spec), second = createCraftTree(spec);
      const geometry = first.foliage!.geometry;
      expect(first.group.userData.species).toBe(species);
      expect(first.foliage?.count).toBe(175);
      expect(first.vertexCount).toBeLessThan(130000);
      expect(geometry.getAttribute("color").count).toBe(geometry.getAttribute("position").count);
      expect(first.foliage?.instanceColor?.count).toBe(175);
      expect(Array.from(first.foliage!.instanceMatrix.array)).toEqual(Array.from(second.foliage!.instanceMatrix.array));
      expect(Array.from(first.foliage!.instanceColor!.array)).toEqual(Array.from(second.foliage!.instanceColor!.array));
      // A pine uses 24 individual 3D needles per twig, unlike indexed broadleaf faces.
      if (species === "pine") {
        expect(geometry.index).toBeNull();
        expect(geometry.getAttribute("position").count).toBe(75);
      } else {
        expect(geometry.index?.count).toBe(144);
        expect(geometry.getAttribute("position").count).toBe(39);
      }
      first.branches.geometry.computeBoundingBox();
      const box = first.branches.geometry.boundingBox!;
      bounds.push(box.max.x - box.min.x);
      first.dispose(); second.dispose();
    }
    expect(new Set(bounds.map(value => value.toFixed(3))).size).toBe(3);
  });

  it("rejects impossible dimensions and invalid colors", () => {
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 140,
      footprint: { width: 20, depth: 20 } })).toThrow(/height/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, colors: { glass: 0x1000000 } })).toThrow(/RGB/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, glass: { opacity: .05 } })).toThrow(/glass/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, interiors: { depth: 5 } })).toThrow(/interior/);
    expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4, height: 20,
      footprint: { width: 12, depth: 12 }, interiors: { litFraction: -1 } })).toThrow(/interior/);
    expect(() => validateCraftTreeSpec({ schemaVersion: 1, id: "bad", seed: 4, trunkLength: 3,
      trunkRadius: .14, crown: "broad", leafCount: 901 })).toThrow(/leafCount/);
    expect(() => validateCraftTreeSpec({ schemaVersion: 1, id: "bad", seed: 4, trunkLength: 3,
      trunkRadius: .14, species: "spruce" as "pine", leafCount: 200 })).toThrow(/species/);
  });
});
