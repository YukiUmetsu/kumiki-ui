import { describe, expect, it, vi } from "vitest";
import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";
import type { DataTexture } from "three";
import { createCraftNaturalMaterial, validateCraftNaturalMaterial } from "../registry/craft/natural-materials";

const spec = { schemaVersion: 1 as const, id: "ground-material", seed: 17,
  kind: "forest-soil" as const, repeat: [3, 4] as const };
const pixels = (texture: DataTexture) => {
  const data = texture.image.data;
  if (!data) throw new Error("Expected populated generated texture.");
  return data;
};

describe("seeded natural PBR surfaces", () => {
  it("creates tileable sRGB albedo and linear roughness/normal maps with bounded resolution", () => {
    const finish = createCraftNaturalMaterial(spec);
    expect(finish.width).toBe(256);
    expect(finish.height).toBe(256);
    expect(finish.material.map).toBe(finish.map);
    expect(finish.material.normalMap).toBe(finish.normalMap);
    expect(finish.material.roughnessMap).toBe(finish.roughnessMap);
    expect(finish.map.colorSpace).toBe(SRGBColorSpace);
    expect(finish.normalMap.colorSpace).toBe(NoColorSpace);
    expect(finish.roughnessMap.colorSpace).toBe(NoColorSpace);
    expect(finish.map.wrapS).toBe(RepeatWrapping);
    expect(finish.map.wrapT).toBe(RepeatWrapping);
    expect(finish.map.magFilter).toBe(LinearFilter);
    expect(finish.map.minFilter).toBe(LinearMipmapLinearFilter);
    expect(finish.map.generateMipmaps).toBe(true);
    expect(finish.map.anisotropy).toBe(4);
    expect(finish.map.repeat.toArray()).toEqual([3, 4]);
    expect(finish.material.metalness).toBe(0);
    for (const texture of [finish.map, finish.roughnessMap, finish.normalMap]) {
      expect(pixels(texture)).toHaveLength(256 * 256 * 4);
      expect(pixels(texture).every(Number.isFinite)).toBe(true);
    }
    const firstPixel = [...pixels(finish.map).slice(0, 4)];
    expect(firstPixel[3]).toBe(255);
    const duplicate = createCraftNaturalMaterial(spec);
    expect(Array.from(pixels(finish.map))).toEqual(Array.from(pixels(duplicate.map)));
    expect(Array.from(pixels(finish.normalMap))).toEqual(Array.from(pixels(duplicate.normalMap)));
    duplicate.dispose(); finish.dispose();
  });

  it("produces distinct material families and a darker, less rough wet variant", () => {
    const kinds = ["forest-soil", "moss", "weathered-stone", "granite", "basalt",
      "sandstone", "limestone", "river-pebble", "dry-sand", "wet-sand", "red-sand", "bark", "leaf"] as const;
    const finishes = kinds.map(kind => createCraftNaturalMaterial({ ...spec, kind }));
    expect(new Set(finishes.map(f => [...pixels(f.map).slice(0, 3)].join("-"))).size).toBe(kinds.length);
    const wet = createCraftNaturalMaterial({ ...spec, wetness: 1 });
    expect(pixels(wet.map)[0]).toBeLessThan(pixels(finishes[0].map)[0]);
    expect(pixels(wet.roughnessMap)[1]).toBeLessThan(pixels(finishes[0].roughnessMap)[1]);
    const differentlySeeded = createCraftNaturalMaterial({ ...spec, seed: 99 });
    expect(Array.from(pixels(differentlySeeded.map).slice(0, 64)))
      .not.toEqual(Array.from(pixels(finishes[0].map).slice(0, 64)));
    finishes.forEach(f => f.dispose()); wet.dispose(); differentlySeeded.dispose();
  });

  it("exposes bounded close-up resolution and distinct material-specific structure", () => {
    const coarse = createCraftNaturalMaterial({ ...spec, resolution: 128 });
    const close = createCraftNaturalMaterial({ ...spec, resolution: 512 });
    expect(coarse.map.image.width).toBe(128);
    expect(close.map.image.width).toBe(512);
    // The normal map is not a flat fill: the relief actually responds to raking light.
    const normals = pixels(close.normalMap);
    expect(new Set(Array.from(normals.filter((_, i) => i % 4 === 0))).size).toBeGreaterThan(20);
    coarse.dispose(); close.dispose();
  });

  it("owns only the generated textures and material, and validates all bounds", () => {
    const finish = createCraftNaturalMaterial(spec);
    const dispose = vi.fn(), materialDispose = vi.fn();
    finish.map.addEventListener("dispose", dispose);
    finish.material.addEventListener("dispose", materialDispose);
    finish.dispose(); finish.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    for (const invalid of [
      { ...spec, seed: Number.NaN }, { ...spec, kind: "cloud" },
      { ...spec, repeat: [1, 0] }, { ...spec, repeat: [1, 65] },
      { ...spec, wetness: 1.1 }, { ...spec, wetness: Number.NaN },
      { ...spec, tint: -1 }, { ...spec, tint: 0x1000000 },
      { ...spec, resolution: 1024 }, { ...spec, resolution: 0 },
    ]) expect(() => validateCraftNaturalMaterial(invalid as never)).toThrow();
  });
});
