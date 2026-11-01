import { describe, expect, it } from "vitest";
import { MeshStandardMaterial, Raycaster, Vector3 } from "three";
import { createCraftSolidCuts, validateCraftSolidCutSpec } from "../registry/craft/solid-cut";
import type { CraftSolidCutSpec, SolidCutFace } from "../registry/craft/solid-cut";

const base: CraftSolidCutSpec = {
  schemaVersion: 1, id: "panel-solid",
  body: { width: 4, height: 3, depth: .6 },
  apertures: [{ id: "window", face: "front", at: [0, 0], shape: "rectangle",
    width: 1.1, height: 1.4, through: true }],
};

const hits = (mesh: ReturnType<typeof createCraftSolidCuts>["mesh"],
  origin: readonly [number, number, number], direction: readonly [number, number, number]) =>
  new Raycaster(new Vector3(...origin), new Vector3(...direction)).intersectObject(mesh);

describe("3D solid boolean aperture kit", () => {
  it("creates a real through-window in a host wall, not a false dark decoration", () => {
    const result = createCraftSolidCuts(base);
    expect(result.mesh.name).toBe("panel-solid");
    expect(result.mesh.castShadow).toBe(true);
    expect(result.mesh.userData.cutIds).toEqual(["window"]);
    expect(result.geometry.getAttribute("normal").count).toBeGreaterThan(0);
    expect(result.geometry.getAttribute("uv").count).toBeGreaterThan(0);
    expect(hits(result.mesh, [0, 0, 2], [0, 0, -1])).toHaveLength(0);
    expect(hits(result.mesh, [1.5, 0, 2], [0, 0, -1]).length).toBeGreaterThan(0);
    expect(result.anchors.get("window")?.normal.toArray()).toEqual([0, 0, 1]);
    result.dispose();
  });

  it("creates a blind circular recess with a physical back wall", () => {
    const spec: CraftSolidCutSpec = { ...base, apertures: [{ id: "socket", face: "front", at: [0, 0],
      shape: "round", radius: .36, depth: .21 }] };
    const result = createCraftSolidCuts(spec);
    const pocketHits = hits(result.mesh, [0, 0, 2], [0, 0, -1]);
    const wallHits = hits(result.mesh, [1, 0, 2], [0, 0, -1]);
    expect(pocketHits.length).toBeGreaterThan(0);
    expect(wallHits.length).toBeGreaterThan(0);
    expect(pocketHits[0].distance).toBeGreaterThan(wallHits[0].distance + .12);
    result.dispose();
  });

  it("resolves all six face axes and aperture anchors without mirrored normals", () => {
    const axes: Record<SolidCutFace, readonly [number, number, number]> = {
      front: [0, 0, 1], back: [0, 0, -1], top: [0, 1, 0],
      bottom: [0, -1, 0], left: [-1, 0, 0], right: [1, 0, 0],
    };
    for (const face of Object.keys(axes) as SolidCutFace[]) {
      const result = createCraftSolidCuts({ ...base, apertures: [{ id: face, face, at: [0, 0],
        shape: "round", radius: .1, through: true }], quality: "supporting" });
      const anchor = result.anchors.get(face)!;
      expect(anchor.normal.toArray()).toEqual([...axes[face]]);
      const start = anchor.position.clone().addScaledVector(anchor.normal, 2);
      const cast = new Raycaster(start, anchor.normal.clone().negate());
      expect(cast.intersectObject(result.mesh).length).toBe(0);
      result.dispose();
    }
  });

  it("keeps supplied PBR materials owned by the caller and disposes only generated geometry", () => {
    const material = new MeshStandardMaterial({ roughness: .42, metalness: .2 });
    let materialDisposed = 0, geometryDisposed = 0;
    material.addEventListener("dispose", () => materialDisposed++);
    const result = createCraftSolidCuts(base, { material });
    result.geometry.addEventListener("dispose", () => geometryDisposed++);
    expect(result.mesh.material).toBe(material);
    result.dispose(); result.dispose();
    expect(geometryDisposed).toBe(1);
    expect(materialDisposed).toBe(0);
    material.dispose();
    expect(materialDisposed).toBe(1);
  });

  it("rejects invalid CSG geometry and pathological authoring before allocation", () => {
    expect(() => validateCraftSolidCutSpec(base)).not.toThrow();
    expect(() => validateCraftSolidCutSpec({ ...base, apertures: [] })).toThrow(/1–16/);
    expect(() => validateCraftSolidCutSpec({ ...base, apertures: [base.apertures[0], base.apertures[0]] }))
      .toThrow(/unique/);
    expect(() => validateCraftSolidCutSpec({ ...base, body: { width: 0, height: 3, depth: .6 } }))
      .toThrow(/positive/);
    expect(() => validateCraftSolidCutSpec({ ...base, apertures: [{ ...base.apertures[0], at: [.5, 0] }] }))
      .toThrow(/fit inside/);
    expect(() => validateCraftSolidCutSpec({ ...base, apertures: [{ ...base.apertures[0], through: false, depth: .6 }] }))
      .toThrow(/blind cut/);
    expect(() => validateCraftSolidCutSpec({ ...base, apertures: [{ ...base.apertures[0], through: true, depth: .2 }] }))
      .toThrow(/cannot also/);
  });
});
