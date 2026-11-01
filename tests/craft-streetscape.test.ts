import { describe, expect, it, vi } from "vitest";
import { ExtrudeGeometry, Matrix4, Mesh, Vector3 } from "three";
import { createCraftStreetscape, validateCraftStreetscape } from "../registry/craft/streetscape";

describe("procedural streetscape detail", () => {
  const spec = { schemaVersion: 1 as const, id: "sample-street", seed: 35,
    length: 48, roadWidth: 8, sidewalkWidth: 5, sidewalkSide: "both" as const,
    drainsPerSide: 3, crosswalkAt: [6] as const };

  it("creates construction-aligned road, shaped curbs, paving joints, paint and drainage", () => {
    const kit = createCraftStreetscape(spec);
    const names = kit.group.children.map(child => child.name);
    for (const name of ["asphalt-road", "negative-sidewalk", "positive-sidewalk", "negative-curb",
      "positive-curb", "road-paint", "sidewalk-saw-joints", "drainage-wells", "drainage-grille-bars"])
      expect(names).toContain(name);
    expect(kit.group.userData.partRole).toBe("procedural-streetscape");
    expect(kit.group.userData.drainCount).toBe(6);
    expect(kit.group.userData.crosswalkCount).toBe(1);
    expect(kit.drawObjectCount).toBe(9);
    const pavement = kit.group.getObjectByName("negative-sidewalk") as Mesh;
    expect(pavement.position.z).toBe(-6.5);
    expect(pavement.position.y + .11).toBeCloseTo(.06);
    const curb = kit.group.getObjectByName("negative-curb") as Mesh;
    expect(curb.geometry).toBeInstanceOf(ExtrudeGeometry);
    expect(curb.position.z).toBe(-4);
    expect(kit.markings!.count).toBeGreaterThan(8);
    expect(kit.joints!.count).toBeGreaterThan(20);
    expect(kit.grates!.count).toBe(42);
    const well = new Matrix4(), bars = new Matrix4();
    kit.grateWells!.getMatrixAt(0, well);
    kit.grates!.getMatrixAt(0, bars);
    expect(bars.elements[13]).toBeGreaterThan(well.elements[13]);
    const dispose = vi.fn();
    curb.geometry.addEventListener("dispose", dispose);
    const materialDispose = vi.fn();
    kit.materials.paint.addEventListener("dispose", materialDispose);
    kit.dispose(); kit.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(kit.group.children).toHaveLength(0);
  });

  it("is deterministic per seed, with visibly varied painted-marking colors and joint phase", () => {
    const first = createCraftStreetscape(spec), repeated = createCraftStreetscape(spec);
    const different = createCraftStreetscape({ ...spec, seed: 36 });
    expect(Array.from(first.markings!.instanceMatrix.array))
      .toEqual(Array.from(repeated.markings!.instanceMatrix.array));
    expect(Array.from(first.markings!.instanceColor!.array))
      .toEqual(Array.from(repeated.markings!.instanceColor!.array));
    expect(Array.from(first.markings!.instanceColor!.array))
      .not.toEqual(Array.from(different.markings!.instanceColor!.array));
    const firstJoint = new Matrix4(), otherJoint = new Matrix4();
    first.joints!.getMatrixAt(0, firstJoint);
    different.joints!.getMatrixAt(0, otherJoint);
    expect(firstJoint.elements[12]).not.toBe(otherJoint.elements[12]);
    first.group.position.set(3, 0, -5);
    first.group.updateWorldMatrix(true, true);
    expect(first.road.getWorldPosition(new Vector3()).x).toBeCloseTo(3);
    first.dispose(); repeated.dispose(); different.dispose();
  });

  it("builds road-only variants without allocating absent details", () => {
    const road = createCraftStreetscape({ schemaVersion: 1, id: "quiet-road", seed: 1,
      length: 24, roadWidth: 7, sidewalkSide: "none", centerline: false,
      drainsPerSide: 0 });
    expect(road.drawObjectCount).toBe(1);
    expect(road.markings).toBeUndefined();
    expect(road.joints).toBeUndefined();
    expect(road.grates).toBeUndefined();
    road.dispose();
  });

  it("does not place drain wells inside a zebra crossing", () => {
    const centerCrosswalk = createCraftStreetscape({ ...spec, crosswalkAt: [0] });
    const matrix = new Matrix4();
    for (let i = 0; i < centerCrosswalk.grateWells!.count; i++) {
      centerCrosswalk.grateWells!.getMatrixAt(i, matrix);
      expect(Math.abs(matrix.elements[12])).toBeGreaterThanOrEqual(3);
    }
    centerCrosswalk.dispose();
  });

  it("rejects impossible and overlapping layouts before geometry construction", () => {
    expect(() => validateCraftStreetscape({ ...spec, roadWidth: 2 })).toThrow(/roadWidth/);
    expect(() => validateCraftStreetscape({ ...spec, sidewalkWidth: 0 })).toThrow(/Sidewalk/);
    expect(() => validateCraftStreetscape({ ...spec, drainsPerSide: 100 })).toThrow(/drainsPerSide/);
    expect(() => validateCraftStreetscape({ ...spec, crosswalkAt: [0, 2] })).toThrow(/Crosswalks/);
    expect(() => validateCraftStreetscape({ ...spec, colors: { paint: 0x1000000 } })).toThrow(/RGB/);
  });
});
