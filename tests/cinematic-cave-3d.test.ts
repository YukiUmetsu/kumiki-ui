import { describe, expect, it } from "vitest";
import { Mesh, Group } from "three";
import { caveCameraAtFrame, caveSignPoseAtFrame, createCaveSignModel } from "../registry/video/cinematic-cave-3d-scene";

describe("Cinematic cave logo 3D", () => {
  it("lowers a hanging sign from outside the shot, then settles with diminishing swing", () => {
    const first = caveSignPoseAtFrame(0);
    const arriving = caveSignPoseAtFrame(95);
    const settled = caveSignPoseAtFrame(220);
    expect(first.y).toBeGreaterThan(arriving.y + 3);
    expect(arriving.y).toBeGreaterThan(settled.y);
    expect(Math.abs(settled.swing)).toBeLessThan(Math.abs(caveSignPoseAtFrame(135).swing));
    expect(caveSignPoseAtFrame(220)).toEqual(settled);
  });

  it("has a real camera push with finite poses even when seeking out of order", () => {
    const opening = caveCameraAtFrame(0);
    const ending = caveCameraAtFrame(260);
    expect(opening.position[2]).toBeGreaterThan(ending.position[2]);
    expect(caveCameraAtFrame(260)).toEqual(ending);
    expect([...ending.position, ...ending.target].every(Number.isFinite)).toBe(true);
  });

  it("assembles distinct solid wood slats, metal fittings and two suspension ropes", () => {
    const model = createCaveSignModel();
    try {
      const slats = model.getObjectByName("wood-slats") as Group;
      expect(slats.children.filter(part => part instanceof Mesh)).toHaveLength(4);
      expect(model.getObjectByName("suspension-left")).toBeInstanceOf(Mesh);
      expect(model.getObjectByName("suspension-right")).toBeInstanceOf(Mesh);
      expect(model.getObjectByName("brass-bolts")).toBeInstanceOf(Group);
    } finally {
      model.traverse(object => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
    }
  });
});
