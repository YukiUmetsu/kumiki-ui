import { describe, expect, it } from "vitest";
import { ExtrudeGeometry, InstancedMesh, Mesh, Raycaster, Vector3 } from "three";
import { createCraftDetailKit, validateCraftDetailSpec } from "../registry/craft/detail-kit";
import { createCraftMaterialKit } from "../registry/craft/material-kit";
import type { CraftDetailSpec } from "../registry/craft/detail-kit";

const fixture: CraftDetailSpec = {
  schemaVersion: 1, id: "detail-reference",
  body: { width: 4, height: 2, depth: 3 },
  features: [
    { kind: "fastener", id: "front-screw", face: "front", at: [-.38, .36], radius: .08, drive: "cross" },
    { kind: "vent-bank", id: "front-vent", face: "front", at: [0, 0], width: 2, height: .5, slots: 8 },
    { kind: "ribbed-grip", id: "top-grip", face: "top", at: [0, 0], width: 2.4, height: 1.4, count: 24 },
    { kind: "seam-frame", id: "back-seal", face: "back", at: [0, 0], width: 3.2, height: 1.5, thickness: .06 },
  ],
};

describe("declarative craft detail kit", () => {
  it("creates semantic face-attached details and moves top/back normals correctly", () => {
    const detail = createCraftDetailKit(fixture);
    expect(detail.parts.size).toBe(4);
    const front = detail.getPart("front-screw")!;
    expect(front.position.z).toBeCloseTo(1.5);
    expect(front.position.x).toBeCloseTo(-1.52);
    const top = detail.getPart("top-grip")!;
    expect(top.position.y).toBeCloseTo(1);
    const topNormal = new Vector3(0, 0, 1).applyQuaternion(top.quaternion);
    expect(topNormal.x).toBeCloseTo(0);
    expect(topNormal.y).toBeCloseTo(1);
    expect(topNormal.z).toBeCloseTo(0);
    const back = detail.getPart("back-seal")!;
    expect(back.position.z).toBeCloseTo(-1.5);
    expect(new Vector3(0, 0, 1).applyQuaternion(back.quaternion).z).toBeCloseTo(-1);
    expect(detail.getPart("missing")).toBeUndefined();
    detail.dispose();
  });

  it("orients construction details outward on all six host faces", () => {
    const normals = {
      front: [0, 0, 1], back: [0, 0, -1],
      top: [0, 1, 0], bottom: [0, -1, 0],
      left: [-1, 0, 0], right: [1, 0, 0],
    } as const;
    const details = createCraftDetailKit({ ...fixture, features: Object.entries(normals).map(([face]) => ({
      id: face, kind: "fastener" as const, face: face as keyof typeof normals,
      at: [0, 0] as const, radius: .05,
    })) });
    for (const [face, expected] of Object.entries(normals)) {
      const normal = new Vector3(0, 0, 1).applyQuaternion(details.getPart(face)!.quaternion);
      expected.forEach((value, index) => expect(normal.getComponent(index)).toBeCloseTo(value));
    }
    details.dispose();
  });

  it("cuts actual openings in the separate vent plate and screw head, with dark backing below", () => {
    const detail = createCraftDetailKit(fixture);
    const vent = detail.getPart("front-vent")!;
    const plate = vent.children.find(c => c.name.endsWith("perforated-faceplate")) as Mesh<ExtrudeGeometry>;
    expect(plate.geometry.parameters.shapes).toBeInstanceOf(Object);
    const shape = plate.geometry.parameters.shapes;
    const contours = Array.isArray(shape) ? shape : [shape];
    expect(contours[0].holes).toHaveLength(8);
    expect(vent.children.some(c => c.name.endsWith("cavity-backing"))).toBe(true);
    const ray = new Raycaster(new Vector3(-.82775, 0, 3), new Vector3(0, 0, -1));
    plate.updateWorldMatrix(true, true);
    expect(ray.intersectObject(plate)).toHaveLength(0);
    ray.set(new Vector3(0, 0, 3), new Vector3(0, 0, -1));
    expect(ray.intersectObject(plate).length).toBeGreaterThan(0);

    const screw = detail.getPart("front-screw")!;
    const head = screw.children.find(c => c.name.endsWith("head")) as Mesh<ExtrudeGeometry>;
    const headShape = head.geometry.parameters.shapes;
    const headContours = Array.isArray(headShape) ? headShape : [headShape];
    expect(headContours[0].holes).toHaveLength(1);
    expect(screw.children.some(c => c.name.endsWith("socket"))).toBe(true);
    detail.dispose();
  });

  it("uses an instanced mesh for repeated rib details instead of a mesh per rib", () => {
    const detail = createCraftDetailKit(fixture, {});
    const grip = detail.getPart("top-grip")!;
    const ribs = grip.children[0];
    expect(ribs).toBeInstanceOf(InstancedMesh);
    expect((ribs as InstancedMesh).count).toBe(24);
    expect(grip.children).toHaveLength(1);
    detail.dispose();
  });

  it("reuses screw geometry across semantically distinct fasteners without double disposal", () => {
    const spec: CraftDetailSpec = { ...fixture, features: [
      { kind: "fastener", id: "a", face: "front", at: [-.35, 0], radius: .08, drive: "hex" },
      { kind: "fastener", id: "b", face: "front", at: [.35, 0], radius: .08, drive: "hex" },
    ] };
    const kit = createCraftDetailKit(spec);
    const head = (id: string) => kit.getPart(id)!.children.find(c => c.name.endsWith("head")) as Mesh;
    expect(head("a")).not.toBe(head("b"));
    expect(head("a").geometry).toBe(head("b").geometry);
    let released = 0;
    head("a").geometry.addEventListener("dispose", () => released++);
    kit.dispose();
    expect(released).toBe(1);
  });

  it("rejects malformed, duplicated, impossible or out-of-frame details", () => {
    expect(() => validateCraftDetailSpec(fixture)).not.toThrow();
    expect(() => validateCraftDetailSpec({ ...fixture, body: { width: 0, height: 2, depth: 3 } })).toThrow(/dimensions/);
    expect(() => validateCraftDetailSpec({ ...fixture, features: [fixture.features[0], fixture.features[0]] })).toThrow(/unique/);
    expect(() => validateCraftDetailSpec({ ...fixture, features: [{ kind: "vent-bank", id: "bad", face: "front", at: [0, 0], width: 2, height: .5, slots: 900 }] })).toThrow(/invalid/);
    expect(() => validateCraftDetailSpec({ ...fixture, features: [{ kind: "fastener", id: "outside", face: "front", at: [.49, 0], radius: .2 }] })).toThrow(/beyond/);
    expect(() => validateCraftDetailSpec({ ...fixture, features: [{ kind: "seam-frame", id: "bad", face: "back", at: [0, 0], width: 1, height: 1, thickness: .51 }] })).toThrow(/invalid/);
  });

  it("does not dispose a shared material kit; does release owned geometries", () => {
    const materials = createCraftMaterialKit();
    let disposedMaterial = 0, disposedGeometry = 0;
    materials.materials["brushed-metal"].addEventListener("dispose", () => disposedMaterial++);
    const detail = createCraftDetailKit(fixture, { materials });
    const head = detail.getPart("front-screw")!.children.find(c => c.name.endsWith("head")) as Mesh;
    head.geometry.addEventListener("dispose", () => disposedGeometry++);
    detail.dispose();
    expect(disposedMaterial).toBe(0);
    expect(disposedGeometry).toBe(1);
    materials.dispose();
    expect(disposedMaterial).toBe(1);
  });
});
