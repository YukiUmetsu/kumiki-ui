import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { createCraftDetailLOD, estimateCraftProjectedDiameter, validateCraftDetailLOD } from "../registry/craft/detail-lod";

const variants = () => ({ hero: new Group(), supporting: new Group(), background: new Group() });
const spec = { schemaVersion: 1 as const, id: "tree-detail", radius: 2,
  heroMinPixels: 280, supportingMinPixels: 90 };
const view = (z: number) => ({ cameraPosition: [0, 0, z] as const,
  viewportHeight: 900, projection: { kind: "perspective" as const, fov: 50 } });

describe("camera-aware authored detail tier", () => {
  it("selects exactly one tier based on projected screen pixels, independently of history", () => {
    const parts = variants(), lod = createCraftDetailLOD(spec, parts);
    expect(lod.updateCamera(view(4)).level).toBe("hero");
    expect([parts.hero.visible, parts.supporting.visible, parts.background.visible]).toEqual([true, false, false]);
    expect(lod.updateCamera(view(20)).level).toBe("supporting");
    expect([parts.hero.visible, parts.supporting.visible, parts.background.visible]).toEqual([false, true, false]);
    expect(lod.updateCamera(view(80)).level).toBe("background");
    expect([parts.hero.visible, parts.supporting.visible, parts.background.visible]).toEqual([false, false, true]);
    expect(lod.updateCamera(view(4)).level).toBe("hero");
    lod.dispose();
  });

  it("uses actual transformed world radius and supports orthographic views", () => {
    const lod = createCraftDetailLOD({ ...spec, center: [0, 2, 0] }, variants());
    lod.group.position.set(10, 0, 0);
    lod.group.scale.setScalar(2);
    const result = lod.updateCamera({ cameraPosition: [10, 4, 30], viewportHeight: 1000,
      projection: { kind: "orthographic", verticalSpan: 20 } });
    expect(result.projectedDiameterPixels).toBeCloseTo(400);
    expect(result.level).toBe("hero");
    expect(result.distance).toBeCloseTo(30);
    lod.dispose();
  });

  it("never disposes caller-owned geometry or material", () => {
    const geometry = new BoxGeometry(), material = new MeshStandardMaterial();
    const geoDispose = vi.fn(), matDispose = vi.fn();
    geometry.addEventListener("dispose", geoDispose); material.addEventListener("dispose", matDispose);
    const a = new Mesh(geometry, material), b = a.clone(), c = a.clone();
    const lod = createCraftDetailLOD(spec, { hero: a, supporting: b, background: c });
    lod.dispose(); lod.dispose();
    expect(geoDispose).not.toHaveBeenCalled(); expect(matDispose).not.toHaveBeenCalled();
    expect(lod.group.children).toHaveLength(0);
    expect(() => lod.updateCamera(view(20))).toThrow(/disposed/);
    geometry.dispose(); material.dispose();
  });

  it("rejects unsafe thresholds, projections and reused instances", () => {
    expect(() => validateCraftDetailLOD({ ...spec, heroMinPixels: 80 })).toThrow(/thresholds/);
    expect(() => estimateCraftProjectedDiameter(1, -1, view(10))).toThrow(/distance/);
    expect(() => estimateCraftProjectedDiameter(1, 10, { ...view(10), viewportHeight: 0 })).toThrow(/view/);
    const a = new Group(), b = new Group();
    expect(() => createCraftDetailLOD(spec, { hero: a, supporting: a, background: b })).toThrow(/distinct/);
    expect(() => createCraftDetailLOD(spec, { hero: a, supporting: b, background: new Vector3() as never })).toThrow(/objects/);
  });
});
