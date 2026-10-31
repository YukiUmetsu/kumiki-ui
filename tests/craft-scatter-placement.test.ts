import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three";
import { createCraftScatter, createCraftScatterInstances, validateCraftScatterSpec } from "../registry/craft/scatter-placement";

describe("deterministic placement factory", () => {
  it("places repeatable volume instances with a real minimum separation", () => {
    const spec = { schemaVersion: 1 as const, id: "plants", seed: 37, mode: "volume" as const,
      count: 75, min: [-8, 0, -8] as const, max: [8, .1, 8] as const, minDistance: .65,
      scale: [.75, 1.3] as const, randomYaw: true };
    const a = createCraftScatter(spec), b = createCraftScatter(spec);
    expect(a.map(point => point.matrix.toArray())).toEqual(b.map(point => point.matrix.toArray()));
    expect(createCraftScatter({ ...spec, seed: 38 })[0].position.toArray()).not.toEqual(a[0].position.toArray());
    expect(a[0].id).toBe("plants-0000");
    for (let i = 0; i < a.length; i++) {
      expect(a[i].scale).toBeGreaterThanOrEqual(.75);
      expect(a[i].scale).toBeLessThanOrEqual(1.3);
      for (let j = 0; j < i; j++)
        expect(a[i].position.distanceTo(a[j].position)).toBeGreaterThanOrEqual(.65 - 1e-8);
    }
  });

  it("samples a world-transformed mesh with a normal filter and approved weight attribute", () => {
    const sourceGeometry = new PlaneGeometry(4, 4, 3, 3);
    sourceGeometry.rotateX(-Math.PI / 2);
    const sourceMaterial = new MeshStandardMaterial();
    const mesh = new Mesh(sourceGeometry, sourceMaterial);
    mesh.position.set(2, 3, -1);
    mesh.rotation.y = Math.PI / 5;
    const normalSpec = { schemaVersion: 1 as const, id: "flowers", seed: 3, count: 24,
      mode: "surface" as const, minUpDot: .9, surfaceNormal: true, normalOffset: .25 };
    const placements = createCraftScatter(normalSpec, mesh);
    expect(placements).toHaveLength(24);
    for (const placed of placements) {
      expect(placed.position.y).toBeCloseTo(3.25, 5);
      expect(placed.normal.y).toBeCloseTo(1, 5);
      expect(placed.position.x).toBeGreaterThan(-1);
      expect(placed.rotation).toBeDefined();
    }
    sourceGeometry.setAttribute("density", new Float32BufferAttribute(
      new Float32Array(sourceGeometry.getAttribute("position").count).fill(1), 1));
    const weighted = createCraftScatter({ ...normalSpec, weightAttribute: "density" }, mesh);
    expect(weighted).toHaveLength(24);
    sourceGeometry.getAttribute("density").setX(0, -2);
    expect(() => createCraftScatter({ ...normalSpec, weightAttribute: "density" }, mesh))
      .toThrow(/nonnegative/);
    sourceGeometry.dispose(); sourceMaterial.dispose();
  });

  it("follows a path at uniform progress and faces its travel tangent", () => {
    const p = createCraftScatter({ schemaVersion: 1, id: "lights", seed: 17, mode: "path", count: 5,
      points: [[0, 0, 0], [0, 0, 10]], tangentFacing: true });
    expect(p.map(item => Number(item.position.z.toFixed(2)))).toEqual([1, 3, 5, 7, 9]);
    const forward = new Vector3(0, 0, 1).applyQuaternion(p[0].rotation);
    expect(forward.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-8);
  });

  it("refuses impossible counts instead of quietly dropping instances", () => {
    expect(() => createCraftScatter({ schemaVersion: 1, id: "collision", seed: 1,
      mode: "volume", count: 15, min: [0, 0, 0], max: [1, 1, 1], minDistance: 3 }))
      .toThrow(/only \d+\/15/);
  });

  it("retains caller ownership of instanced source geometry and material", () => {
    const points = createCraftScatter({ schemaVersion: 1, id: "hedge", seed: 9,
      mode: "volume", count: 4, min: [-1, 0, -1], max: [1, .2, 1] });
    const geo = new BoxGeometry(.2, .2, .2);
    const mat = new MeshStandardMaterial();
    const geoDispose = vi.fn(), matDispose = vi.fn();
    geo.addEventListener("dispose", geoDispose); mat.addEventListener("dispose", matDispose);
    const instanced = createCraftScatterInstances(points, geo, mat);
    expect(instanced.mesh.count).toBe(4);
    expect(instanced.mesh.userData.placementIds).toHaveLength(4);
    instanced.dispose(); instanced.dispose();
    expect(geoDispose).not.toHaveBeenCalled();
    expect(matDispose).not.toHaveBeenCalled();
    geo.dispose(); mat.dispose();
  });

  it("rejects malformed recipes and missing input surface", () => {
    expect(() => validateCraftScatterSpec({ schemaVersion: 1, id: "fail", seed: 1, mode: "volume", count: 0,
      min: [0, 0, 0], max: [1, 1, 1] })).toThrow(/count/);
    expect(() => validateCraftScatterSpec({ schemaVersion: 1, id: "fail", seed: 1, mode: "path", count: 4,
      points: [[0, 0, 0], [0, 0, 0]] })).toThrow(/nonzero/);
    expect(() => createCraftScatter({ schemaVersion: 1, id: "fail", seed: 1, mode: "surface", count: 4 }))
      .toThrow(/source mesh/);
  });
});
