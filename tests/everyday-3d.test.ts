import { describe, expect, it } from "vitest";
import { createEverydayObject } from "../registry/craft/everyday-objects-3d";
import { evaluateEverydayInteraction } from "../registry/craft/everyday-interactions";

describe("everyday objects", () => {
  it.each(["paper", "invoice", "folder", "pen"] as const)("builds a grounded, named %s at physical centimeter scale", kind => {
    const asset = createEverydayObject(kind, { id: `test-${kind}` });
    try {
      expect(asset.id).toBe(`test-${kind}`);
      expect(asset.metersPerUnit).toBe(.01);
      expect(asset.bounds.min[1]).toBeGreaterThanOrEqual(0);
      expect(asset.bounds.max[0] - asset.bounds.min[0]).toBeGreaterThan(1);
      expect(asset.parts.size).toBeGreaterThanOrEqual(3);
      expect(asset.craft.materials.length).toBeGreaterThanOrEqual(2);
      expect(asset.group.children.length).toBeGreaterThan(0);
    } finally { asset.dispose(); }
  });

  it("opens a folder to the same absolute pose after seeking backwards", () => {
    const asset = createEverydayObject("folder");
    try {
      const flap = asset.parts.get("folder-front-flap");
      expect(flap).toBeDefined();
      asset.pose?.({ id: "open", frame: 45, fps: 30 });
      const opened = flap!.rotation.x;
      expect(Math.abs(opened)).toBeGreaterThan(.7);
      asset.pose?.({ id: "open", frame: 2, fps: 30 });
      expect(Math.abs(flap!.rotation.x)).toBeLessThan(.1);
      asset.pose?.({ id: "open", frame: 45, fps: 30 });
      expect(flap!.rotation.x).toBeCloseTo(opened, 7);
    } finally { asset.dispose(); }
  });

  it("lifts paper above the surface rather than intersecting the desk", () => {
    const asset = createEverydayObject("invoice");
    try {
      asset.pose?.({ id: "lift", frame: 30, fps: 30 });
      expect(asset.group.position.y).toBeGreaterThan(1.5);
      asset.pose?.({ id: "lift", frame: 0, fps: 30 });
      expect(asset.group.position.y).toBeCloseTo(0);
    } finally { asset.dispose(); }
  });

  it("rejects missing finite time information and preserves deterministic handoff endpoints", () => {
    const spec = { from: [0, 0, 0], to: [10, 0, -4], startFrame: 10, endFrame: 70, clearance: 5 } as const;
    expect(evaluateEverydayInteraction(spec, 10).position).toEqual([0, 0, 0]);
    expect(evaluateEverydayInteraction(spec, 70).position).toEqual([10, 0, -4]);
    const middle = evaluateEverydayInteraction(spec, 40);
    expect(middle.position[1]).toBeGreaterThanOrEqual(4.9);
    expect(evaluateEverydayInteraction(spec, 40)).toEqual(middle);
    expect(() => evaluateEverydayInteraction({ ...spec, endFrame: 9 }, 20)).toThrow(/endFrame/);
    expect(() => evaluateEverydayInteraction(spec, Number.NaN)).toThrow(/finite/);
  });
});
