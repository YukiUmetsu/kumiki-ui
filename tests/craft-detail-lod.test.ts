import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Line, BufferGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
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

  it("crossfades adjacent PBR tiers in a finite pixel band without leaking shared material state", () => {
    const geometry = new BoxGeometry();
    const source = new MeshStandardMaterial({ roughness: .37 });
    const shaderHook = vi.fn();
    source.onBeforeCompile = shaderHook;
    source.customProgramCacheKey = () => "author-surface-detail";
    const parts = { hero: new Mesh(geometry, source), supporting: new Mesh(geometry, source),
      background: new Mesh(geometry, source) };
    const lod = createCraftDetailLOD({ ...spec, transitionPixels: 24 }, parts);
    const mats = [parts.hero.material, parts.supporting.material, parts.background.material];
    expect(new Set(mats).size).toBe(3);
    for (const mat of mats) {
      expect(mat).not.toBe(source);
      expect(mat.alphaHash).toBe(true);
      expect(mat.transparent).toBe(false);
      expect(mat.onBeforeCompile).toBe(shaderHook);
      expect(mat.customProgramCacheKey()).toBe("author-surface-detail");
      expect(mat.roughness).toBe(.37);
    }
    // Pick the exact diameter via a perspective-camera distance. Each
    // transition frame must be reproducible after unrelated camera updates.
    const atPixels = (pixels: number) => {
      const focal = 900 / (2 * Math.tan(50 * Math.PI / 360));
      return view(2 * spec.radius * focal / pixels);
    };
    const halfwayHero = lod.updateCamera(atPixels(280));
    expect(halfwayHero.transition).toEqual({ from: "supporting", to: "hero", progress: .5 });
    expect(halfwayHero.level).toBe("hero");
    expect([parts.hero.visible, parts.supporting.visible, parts.background.visible]).toEqual([true, true, false]);
    expect(mats.map(mat => mat.opacity)).toEqual([.5, .5, 0]);
    expect(source.opacity).toBe(1);
    lod.updateCamera(atPixels(1000));
    lod.updateCamera(atPixels(10));
    expect(lod.updateCamera(atPixels(280)).transition).toEqual(halfwayHero.transition);
    expect(mats.map(mat => mat.opacity)).toEqual([.5, .5, 0]);
    const halfwaySupporting = lod.updateCamera(atPixels(90));
    expect(halfwaySupporting.transition).toMatchObject({ from: "background", to: "supporting" });
    expect(halfwaySupporting.transition?.progress).toBeCloseTo(.5);
    expect([parts.hero.visible, parts.supporting.visible, parts.background.visible]).toEqual([false, true, true]);
    expect(mats[0].opacity).toBe(0);
    expect(mats[1].opacity).toBeCloseTo(.5);
    expect(mats[2].opacity).toBeCloseTo(.5);
    const cloneDisposes = mats.map(mat => {
      const dispose = vi.fn(); mat.addEventListener("dispose", dispose); return dispose;
    });
    const sourceDispose = vi.fn(); source.addEventListener("dispose", sourceDispose);
    lod.dispose(); lod.dispose();
    expect(parts.hero.material).toBe(source);
    expect(parts.supporting.material).toBe(source);
    expect(parts.background.material).toBe(source);
    cloneDisposes.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(sourceDispose).not.toHaveBeenCalled();
    geometry.dispose(); source.dispose();
  });

  it("rejects unsafe crossfade materials and overlapping transition bands", () => {
    expect(() => validateCraftDetailLOD({ ...spec, transitionPixels: NaN })).toThrow(/transitionPixels/);
    expect(() => validateCraftDetailLOD({ ...spec, transitionPixels: 200 })).toThrow(/transitionPixels/);
    const geometry = new BoxGeometry();
    const transparent = new MeshStandardMaterial({ transparent: true });
    const a = new Mesh(geometry, transparent), b = new Mesh(geometry, transparent), c = new Mesh(geometry, transparent);
    expect(() => createCraftDetailLOD({ ...spec, transitionPixels: 20 },
      { hero: a, supporting: b, background: c })).toThrow(/opaque/);
    expect([a.material, b.material, c.material]).toEqual([transparent, transparent, transparent]);
    const line = new Line(new BufferGeometry(), transparent);
    expect(() => createCraftDetailLOD({ ...spec, transitionPixels: 20 },
      { hero: line, supporting: new Group(), background: new Group() })).toThrow(/lines/);
    geometry.dispose(); transparent.dispose(); line.geometry.dispose();
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
