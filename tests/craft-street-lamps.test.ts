import { describe, expect, it, vi } from "vitest";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import {
  createCraftStreetLamps, planCraftStreetLamps, validateCraftStreetLampSpec,
} from "../registry/craft/street-lamps";
import { createCraftStreetscape } from "../registry/craft/streetscape";

describe("constructed and instanced urban street lighting", () => {
  const spec = { schemaVersion: 1 as const, id: "test-lights", seed: 21,
    length: 49, roadWidth: 8, sidewalkWidth: 6, sidewalkSide: "negative" as const,
    lampsPerSide: 2, crosswalkAt: [1.5] as const };

  it("builds distinct manufactured subassemblies with consistent placement and only three draws", () => {
    const kit = createCraftStreetLamps(spec);
    expect(kit.group.userData.partRole).toBe("procedural-street-lamps");
    expect(kit.group.userData.lampCount).toBe(2);
    expect(kit.drawObjectCount).toBe(3);
    expect(kit.group.children.map(child => child.name)).toEqual([
      "cast-post-gooseneck-shade", "machined-rim-collar-bolts", "glazed-lantern",
    ]);
    for (const child of kit.group.children) {
      const mesh = child as InstancedMesh;
      expect(mesh).toBeInstanceOf(InstancedMesh);
      expect(mesh.count).toBe(2);
      expect(mesh.geometry.getAttribute("position").count).toBeGreaterThan(500);
      expect(mesh.geometry.boundingSphere).not.toBeNull();
    }
    kit.geometries[0].computeBoundingBox();
    kit.geometries[2].computeBoundingBox();
    const shellBounds = kit.geometries[0].boundingBox!;
    const lensBounds = kit.geometries[2].boundingBox!;
    expect(shellBounds.min.y).toBeGreaterThanOrEqual(.059);
    expect(shellBounds.max.y).toBeGreaterThan(4.5);
    expect(shellBounds.max.z).toBeGreaterThan(.99);
    expect(lensBounds.min.y).toBeGreaterThan(3.8);
    expect(lensBounds.min.z).toBeGreaterThan(.75);
    for (const position of kit.placements) {
      expect(Math.abs(position.x - 1.5)).toBeGreaterThanOrEqual(3.15);
      expect(position.z).toBeCloseTo(-8.68);
    }
    expect(kit.materials[0].metalness).toBeGreaterThan(.5);
    expect(kit.materials[2].roughness).toBeLessThan(.3);
    const dispose = vi.fn();
    kit.geometries[0].addEventListener("dispose", dispose);
    kit.dispose(); kit.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(kit.group.children).toHaveLength(0);
  });

  it("is seeded, avoids zebra crossings and faces the road from both sides", () => {
    const both = createCraftStreetLamps({ ...spec, sidewalkSide: "both" });
    const repeat = createCraftStreetLamps({ ...spec, sidewalkSide: "both" });
    const variant = createCraftStreetLamps({ ...spec, sidewalkSide: "both", seed: 99 });
    expect(both.placements).toEqual(repeat.placements);
    expect(variant.placements).not.toEqual(both.placements);
    expect(both.placements).toHaveLength(4);
    const matrix = new Matrix4();
    for (const [index, placement] of both.placements.entries()) {
      (both.group.children[0] as InstancedMesh).getMatrixAt(index, matrix);
      const origin = new Vector3(0, 0, 0).applyMatrix4(matrix);
      const tip = new Vector3(0, 0, 1).applyMatrix4(matrix);
      expect(origin.x).toBeCloseTo(placement.x);
      expect(origin.z).toBeCloseTo(placement.z);
      expect((tip.z - origin.z) * placement.side).toBeLessThan(0);
      expect(Math.abs(placement.x - 1.5)).toBeGreaterThanOrEqual(3.15);
    }
    both.dispose(); repeat.dispose(); variant.dispose();
  });

  it("skips impossible locations, creates no geometry for zero lamps, validates bounds", () => {
    const dense = { ...spec, length: 12, lampsPerSide: 6, crosswalkAt: [0] };
    const planned = planCraftStreetLamps(dense);
    expect(planned.length).toBeLessThan(6);
    expect(planned.every(p => Math.abs(p.x) >= 3.15)).toBe(true);
    const none = createCraftStreetLamps({ ...spec, sidewalkSide: "none", lampsPerSide: 4 });
    expect(none.drawObjectCount).toBe(0);
    expect(none.geometries).toHaveLength(0);
    none.dispose(); none.dispose();
    expect(() => validateCraftStreetLampSpec({ ...spec, height: 12 })).toThrow(/height/);
    expect(() => validateCraftStreetLampSpec({ ...spec, reach: -1 })).toThrow(/reach/);
    expect(() => validateCraftStreetLampSpec({ ...spec, lampsPerSide: 7 })).toThrow(/lampsPerSide/);
    expect(() => validateCraftStreetLampSpec({ ...spec, seed: 1.2 })).toThrow(/seed/);
  });

  it("installs and releases optional lighting within the existing streetscape pack", () => {
    const street = createCraftStreetscape(spec);
    expect(street.lamps).toBeDefined();
    expect(street.group.userData.lampCount).toBe(2);
    expect(street.group.getObjectByName("test-lights-streetlights")).toBe(street.lamps!.group);
    expect(street.drawObjectCount).toBe(8); // road, walk, curb, four pavement/paint/grille draws and lamp group
    const dispose = vi.fn();
    street.lamps!.geometries[0].addEventListener("dispose", dispose);
    street.dispose(); street.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(street.group.children).toHaveLength(0);
    expect(() => createCraftStreetscape({ ...spec, sidewalkSide: "none" })).toThrow(/lampsPerSide/);
  });
});
