import { describe, expect, it, vi } from "vitest";
import { FrontSide, NoColorSpace, RepeatWrapping } from "three";
import type { DataTexture } from "three";
import { createCraftGlassMaterial, validateCraftGlassMaterial } from "../registry/craft/glass-materials";

const spec = { schemaVersion: 1 as const, id: "test-glazing", seed: 19,
  kind: "ribbed" as const, repeat: [2, 3] as const };
const pixels = (texture: DataTexture) => {
  const data = texture.image.data;
  if (!data) throw new Error("Glass texture data missing.");
  return data;
};

describe("physical glass material finishes", () => {
  it("uses actual transmission, absorption and IOR, without fake transparent alpha", () => {
    for (const kind of ["clear", "smoked", "amber", "frosted", "ribbed", "rain-streaked"] as const) {
      const surface = createCraftGlassMaterial({ ...spec, kind });
      expect(surface.material.transmission).toBe(1);
      expect(surface.material.ior).toBe(1.52);
      expect(surface.material.metalness).toBe(0);
      expect(surface.material.side).toBe(FrontSide);
      expect(surface.material.opacity).toBe(1);
      expect(surface.material.thickness).toBeGreaterThan(0);
      if (["clear", "smoked", "amber"].includes(kind)) {
        expect(surface.normalMap).toBeNull();
        expect(surface.roughnessMap).toBeNull();
      } else {
        expect(pixels(surface.normalMap!)).toHaveLength(256 * 256 * 4);
        expect(pixels(surface.roughnessMap!)).toHaveLength(256 * 256 * 4);
        expect(surface.normalMap!.wrapS).toBe(RepeatWrapping);
        expect(surface.normalMap!.colorSpace).toBe(NoColorSpace);
        expect(surface.normalMap!.repeat.toArray()).toEqual([2, 3]);
        expect(new Set(pixels(surface.normalMap!)).size).toBeGreaterThan(15);
      }
      surface.dispose();
    }
  });

  it("recreates seeded texture bytes and exposes bounded 512px close-up finish", () => {
    const a = createCraftGlassMaterial({ ...spec, resolution: 512 });
    const b = createCraftGlassMaterial({ ...spec, resolution: 512 });
    expect(a.width).toBe(512);
    expect(pixels(a.normalMap!)).toEqual(pixels(b.normalMap!));
    const other = createCraftGlassMaterial({ ...spec, seed: 20, resolution: 512 });
    expect(Array.from(pixels(other.normalMap!).slice(0, 50)))
      .not.toEqual(Array.from(pixels(a.normalMap!).slice(0, 50)));
    a.dispose(); b.dispose(); other.dispose();
  }, 15000); // Three deterministic 512px normal maps can exceed 5s on shared CI CPUs.

  it("validates physics and disposes only its own resources, idempotently", () => {
    const glass = createCraftGlassMaterial({ ...spec, thickness: .35, ior: 1.4,
      attenuationDistance: 2.5, tint: 0xf2b779 });
    expect(glass.material.ior).toBe(1.4);
    expect(glass.material.thickness).toBe(.35);
    expect(glass.material.attenuationDistance).toBe(2.5);
    const matDispose = vi.fn(), texDispose = vi.fn();
    glass.material.addEventListener("dispose", matDispose);
    glass.normalMap!.addEventListener("dispose", texDispose);
    glass.dispose(); glass.dispose();
    expect(matDispose).toHaveBeenCalledTimes(1);
    expect(texDispose).toHaveBeenCalledTimes(1);
    for (const bad of [
      { ...spec, kind: "beer" }, { ...spec, seed: 1.2 },
      { ...spec, repeat: [0, 2] }, { ...spec, repeat: [1, 34] },
      { ...spec, thickness: 0 }, { ...spec, ior: 9 },
      { ...spec, attenuationDistance: Infinity }, { ...spec, resolution: 1024 },
      { ...spec, tint: -1 },
    ]) expect(() => validateCraftGlassMaterial(bad as never)).toThrow();
  });
});
