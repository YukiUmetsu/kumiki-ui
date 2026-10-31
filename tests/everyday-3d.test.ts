import { describe, expect, it } from "vitest";
import { createEverydayObject } from "../registry/craft/everyday-objects-3d";
import { evaluateEverydayInteraction } from "../registry/craft/everyday-interactions";
import { createLaptop } from "../registry/domains/technology-3d";
import type { Mesh, MeshPhysicalMaterial } from "three";

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

  it("highlights a selected document row without losing seek determinism", () => {
    const asset = createEverydayObject("invoice", { highlightRow: 1,
      document: { rows: [{ label: "First", value: "100" }, { label: "Second", value: "200" }] } });
    try {
      const marker = asset.parts.get("document-highlight-region")!;
      expect(marker).toBeDefined();
      expect(asset.actions?.some(a => a.id === "highlight")).toBe(true);
      expect(marker.visible).toBe(false);
      asset.pose?.({ id: "highlight", frame: 27, fps: 30 });
      const width = marker.scale.x;
      expect(marker.visible).toBe(true);
      expect(width).toBeGreaterThan(.5);
      asset.pose?.({ id: "lift", frame: 20, fps: 30 });
      expect(marker.visible).toBe(false);
      asset.pose?.({ id: "highlight", frame: 27, fps: 30 });
      expect(marker.scale.x).toBe(width);
      expect(marker.position.z).toBeCloseTo(-29.7 / 2 + (490 + 135) / 1800 * 29.7);
      asset.pose?.({ id: "highlight", frame: 0, fps: 30 });
      expect(marker.visible).toBe(false);
    } finally { asset.dispose(); }
    expect(() => createEverydayObject("invoice", { highlightRow: 8 })).toThrow(/highlightRow/);
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

  it("does not mark a document received until the arrival beat, even after backwards seeking", () => {
    const laptop = createLaptop({ screenBefore: { title: "Intake", status: "Awaiting", view: "document-record" },
      screen: { title: "Received", status: "Saved", view: "document-record", confirmed: true,
        record: { reference: "AC-194", total: "$580" } } });
    try {
      const display = laptop.parts.get("laptop-display") as Mesh;
      const material = display.material as MeshPhysicalMaterial;
      expect(material.specularIntensity).toBeLessThan(.1);
      expect(material.clearcoat).toBeLessThan(.05);
      laptop.pose?.({ id: "open-and-process", frame: 110, fps: 30 });
      const awaiting = material.emissiveMap;
      laptop.pose?.({ id: "open-and-process", frame: 140, fps: 30 });
      const received = material.emissiveMap;
      expect(received).toBeDefined();
      expect(received).not.toBe(awaiting);
      laptop.pose?.({ id: "open-and-process", frame: 110, fps: 30 });
      expect(material.emissiveMap).toBe(awaiting);
      laptop.pose?.({ id: "open-and-process", frame: 140, fps: 30 });
      expect(material.emissiveMap).toBe(received);
      laptop.pose?.({ id: null, frame: 0, fps: 30 });
      expect(material.emissiveMap).toBe(received);
    } finally { laptop.dispose(); }
  });
});
