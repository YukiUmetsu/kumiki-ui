import { describe, expect, it, vi } from "vitest";
import { Matrix4, MeshPhysicalMaterial, Vector3 } from "three";
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
    expect(first.interiors!.treatmentRoomCount).toBeGreaterThan(0);
    expect(first.interiors!.treatmentRoomCount).toBeLessThan(first.interiors!.roomCount);
    expect(first.interiors!.treatmentParts?.count).toBe(first.interiors!.treatmentPieceCount);
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
    expect(Array.from(first.interiors!.treatmentParts!.instanceMatrix.array))
      .toEqual(Array.from(second.interiors!.treatmentParts!.instanceMatrix.array));
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

  it("batches seeded roller shades and folded curtains behind glass in one optional draw", () => {
    const base = { schemaVersion: 1 as const, id: "dressed-pockets", seed: 17,
      height: 19, footprint: { width: 11, depth: 12 } };
    for (const style of ["roller", "curtains", "mixed"] as const) {
      const facade = createCraftFacade({ ...base, interiors: {
        depth: 1.9, litFraction: .3, windowTreatments: { coverage: 1, style } } });
      const pockets = facade.interiors!;
      expect(pockets.treatmentRoomCount).toBe(pockets.roomCount);
      expect(pockets.treatmentParts).toBeDefined();
      expect(pockets.group.children).toContain(pockets.treatmentParts);
      expect(pockets.treatmentParts!.material).toHaveProperty("roughness", .92);
      expect(pockets.treatmentParts!.instanceColor).toBeDefined();
      expect(pockets.treatmentParts!.instanceMatrix.array.every(Number.isFinite)).toBe(true);
      expect(pockets.treatmentPieceCount).toBe(pockets.treatmentParts!.count);
      expect(pockets.treatmentPieceCount).toBeGreaterThanOrEqual(pockets.roomCount * 2);
      expect(pockets.treatmentPieceCount).toBeLessThanOrEqual(pockets.roomCount * 7);
      if (style === "roller") {
        expect(pockets.treatmentPieceCount).toBe(pockets.roomCount * 2);
        const part = facade.geometry.getAttribute("partId");
        const center = facade.geometry.getAttribute("roomCenter");
        const normals = facade.geometry.getAttribute("normal");
        let firstPane = -1;
        for (let i = 0; i < part.count; i++) if ([4, 6].includes(Math.round(part.getX(i)))) {
          firstPane = i; break;
        }
        expect(firstPane).toBeGreaterThanOrEqual(0);
        const paneCenter = new Vector3(center.getX(firstPane), center.getY(firstPane), center.getZ(firstPane));
        const outward = new Vector3(normals.getX(firstPane), 0, normals.getZ(firstPane)).normalize();
        const pose = new Matrix4();
        pockets.treatmentParts!.getMatrixAt(0, pose);
        const panelCenter = new Vector3().setFromMatrixPosition(pose);
        const recessedDepth = panelCenter.sub(paneCenter).dot(outward);
        expect(recessedDepth).toBeCloseTo(-.21, 2);
      }
      if (style === "curtains") expect(pockets.treatmentPieceCount).toBe(pockets.roomCount * 7);
      const dispose = vi.fn();
      pockets.treatmentParts!.addEventListener("dispose", dispose);
      facade.dispose(); facade.dispose();
      expect(dispose).toHaveBeenCalledTimes(1);
    }
    for (const treatment of [false, { coverage: 0 }] as const) {
      const facade = createCraftFacade({ ...base, interiors: { windowTreatments: treatment } });
      expect(facade.interiors!.treatmentRoomCount).toBe(0);
      expect(facade.interiors!.treatmentParts).toBeUndefined();
      expect(facade.interiors!.group.children.length).toBeLessThanOrEqual(2);
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
    expect(a.branches.material).toHaveProperty("vertexColors", true);
    const bark = a.branches.geometry.getAttribute("color");
    expect(bark.count).toBe(a.branches.geometry.getAttribute("position").count);
    expect(new Set(Array.from(bark.array).map(value => value.toFixed(3))).size).toBeGreaterThan(10);
    expect(Array.from(bark.array)).toEqual(Array.from(b.branches.geometry.getAttribute("color").array));
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
      expect(first.group.userData.foliageAttachment).toBe("terminal-twig-centerline");
      expect(first.group.userData.terminalTwigCount).toBeGreaterThan(30);
      expect(Array.from(first.foliage!.instanceMatrix.array)).toEqual(Array.from(second.foliage!.instanceMatrix.array));
      expect(Array.from(first.foliage!.instanceColor!.array)).toEqual(Array.from(second.foliage!.instanceColor!.array));
      // Pine uses 24 individual needles; broadleaf instances each carry a
      // joined stem and multiple alternate leaves, not repeated single cards.
      if (species === "pine") {
        expect(geometry.index).toBeNull();
        expect(geometry.getAttribute("position").count).toBe(75);
        expect(first.group.userData.leafletsPerSpray).toBe(24);
      } else {
        const leaflets = species === "oak" ? 3 : 4;
        expect(first.group.userData.leafletsPerSpray).toBe(leaflets);
        expect(geometry.userData.leafletsPerSpray).toBe(leaflets);
        expect(geometry.index?.count).toBe(144 + leaflets * 192);
        expect(geometry.getAttribute("position").count).toBe(30 + leaflets * 51);
        const position = geometry.getAttribute("position");
        // The stem is real tapered tube geometry. Later leaves connect to it
        // via shared local origin, not floating billboard planes.
        expect(Math.hypot(position.getX(0), position.getZ(0))).toBeGreaterThan(
          Math.hypot(position.getX(24), position.getZ(24)));
        expect(geometry.getAttribute("normal").getX(0)).toBeGreaterThan(0);
      }
      expect(Array.from(first.branches.geometry.getAttribute("color").array))
        .toEqual(Array.from(second.branches.geometry.getAttribute("color").array));
      first.branches.geometry.computeBoundingBox();
      const box = first.branches.geometry.boundingBox!;
      bounds.push(box.max.x - box.min.x);
      first.dispose(); second.dispose();
    }
    expect(new Set(bounds.map(value => value.toFixed(3))).size).toBe(3);
  });

  it("points birch terminal foliage downward more often than oak and never scatters on the bole", () => {
    const averageOrientation = (species: "oak" | "birch") => {
      const tree = createCraftTree({ schemaVersion: 1, id: `growth-${species}`,
        seed: 33, species, trunkLength: 4.5, trunkRadius: .16, leafCount: 260 });
      const matrix = new Matrix4(), position = new Vector3();
      let averageUp = 0, farFromTrunk = 0;
      for (let index = 0; index < tree.foliage!.count; index++) {
        tree.foliage!.getMatrixAt(index, matrix);
        const direction = new Vector3(0, 1, 0).transformDirection(matrix);
        averageUp += direction.y;
        position.setFromMatrixPosition(matrix);
        if (Math.hypot(position.x, position.z) > .36) farFromTrunk++;
      }
      const outcome = { averageUp: averageUp / tree.foliage!.count,
        outerShare: farFromTrunk / tree.foliage!.count };
      tree.dispose();
      return outcome;
    };
    const oak = averageOrientation("oak"), birch = averageOrientation("birch");
    expect(birch.averageUp).toBeLessThan(oak.averageUp - .18);
    expect(oak.outerShare).toBeGreaterThan(.7);
    expect(birch.outerShare).toBeGreaterThan(.7);
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
    for (const treatment of [{ coverage: -1 }, { coverage: 1.1 }, { style: "plastic" }, null, []])
      expect(() => validateCraftFacadeSpec({ schemaVersion: 1, id: "bad", seed: 4,
        height: 20, footprint: { width: 12, depth: 12 },
        interiors: { windowTreatments: treatment as never } })).toThrow(/windowTreatments/);
    expect(() => validateCraftTreeSpec({ schemaVersion: 1, id: "bad", seed: 4, trunkLength: 3,
      trunkRadius: .14, crown: "broad", leafCount: 901 })).toThrow(/leafCount/);
    expect(() => validateCraftTreeSpec({ schemaVersion: 1, id: "bad", seed: 4, trunkLength: 3,
      trunkRadius: .14, species: "spruce" as "pine", leafCount: 200 })).toThrow(/species/);
  });
});
