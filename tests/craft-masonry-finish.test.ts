import { describe, expect, it, vi } from "vitest";
import { MeshStandardMaterial } from "three";
import type { WebGLProgramParametersWithUniforms } from "three";
import { applySurfaceDetail } from "../registry/craft/surface-detail";
import { createCraftFacade } from "../registry/craft/environment-generator";
import { applyCraftMasonryFinish, validateCraftMasonryFinish } from "../registry/craft/masonry-finish";

function minimalShader() {
  return { uniforms: {}, vertexShader: "#include <common>\n#include <begin_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>" } as WebGLProgramParametersWithUniforms;
}

describe("UV-independent WebGL masonry finishing", () => {
  it("adds object-space running bond, pixel-aware mortar, PBR roughness and subtle joint depth", () => {
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: .91 });
    const initialKey = material.customProgramCacheKey();
    const finished = applyCraftMasonryFinish(material, { seed: 35, colorVariation: .08 });
    expect(finished).toBe(material);
    expect(material.vertexColors).toBe(true);
    expect(material.userData.craftMasonryFinish.brickLength).toBe(.6);
    expect(material.customProgramCacheKey()).toContain("km-brick-bond-v1");
    expect(material.customProgramCacheKey()).not.toBe(initialKey);
    const shader = minimalShader();
    material.onBeforeCompile(shader, {} as never);
    expect(shader.vertexShader).toContain("vKmBrickPos = position;");
    expect(shader.vertexShader).toContain("vKmBrickNormal = normal;");
    expect(shader.fragmentShader).toContain("mod(row, 2.0) * .5");
    expect(shader.fragmentShader).toContain("kmBrickMortarColor");
    expect(shader.fragmentShader).toContain("fwidth(cell)");
    expect(shader.fragmentShader).toContain("jointScale = .5 * vec2(kmBrickJointWidth");
    expect(shader.fragmentShader).toContain("kmBrickJoint * .14");
    expect(shader.fragmentShader).toContain("kmMortarDepth");
    expect(shader.fragmentShader).toContain("smoothstep(.58, .87");
    expect(shader.uniforms.kmBrickLength.value).toBe(.6);
    expect(shader.uniforms.kmBrickHeight.value).toBe(.3);
    expect(shader.uniforms.kmBrickSeed.value).toBe(35);
    material.dispose();
  });

  it("composes with the already-approved surface-detail hook instead of deleting its shader changes", () => {
    const material = new MeshStandardMaterial();
    applyCraftMasonryFinish(material, { jointWidth: .02, seed: 12 });
    applySurfaceDetail(material, { kind: "stone", frequency: 15, strength: .0017 });
    const shader = minimalShader();
    material.onBeforeCompile(shader, {} as never);
    expect(shader.vertexShader).toContain("vKmBrickPos = position");
    expect(shader.vertexShader).toContain("vKmPos = position");
    expect(shader.fragmentShader).toContain("kmApplyBrickFinish(diffuseColor.rgb)");
    expect(shader.fragmentShader).toContain("kmDetailHeight(vKmPos)");
    expect(shader.fragmentShader).toContain("kmMortarDepth");
    expect(shader.fragmentShader).toContain("kmHeight = kmH");
    expect(shader.fragmentShader).toContain("(kmH - .5) * 2.0 * kmFade");
    expect(material.customProgramCacheKey()).toContain("km-detail");
    material.dispose();
  });

  it("is opt-out on native facades; no new draw calls, geometry or texture assets", () => {
    const spec = { schemaVersion: 1 as const, id: "material-facade", seed: 28,
      height: 27, footprint: { width: 12, depth: 11 } };
    const normal = createCraftFacade(spec);
    const flat = createCraftFacade({ ...spec, masonry: false });
    expect(normal.material.userData.craftMasonryFinish).toBeDefined();
    expect(flat.material.userData.craftMasonryFinish).toBeUndefined();
    expect(normal.vertexCount).toBe(flat.vertexCount);
    expect(normal.geometry.groups).toEqual(flat.geometry.groups);
    expect(normal.materials).toHaveLength(6);
    expect(normal.material.map).toBeNull();
    const normalShader = minimalShader(), flatShader = minimalShader();
    normal.material.onBeforeCompile(normalShader, {} as never);
    flat.material.onBeforeCompile(flatShader, {} as never);
    expect(normalShader.fragmentShader).toContain("kmBrickJoint");
    expect(flatShader.fragmentShader).not.toContain("kmBrickJoint");
    const dispose = vi.fn();
    normal.material.addEventListener("dispose", dispose);
    normal.dispose(); normal.dispose(); flat.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid scale, RGB and unsafe values before modifying any shader", () => {
    for (const options of [
      { brickLength: 0 }, { brickHeight: 2 }, { jointWidth: .1 },
      { mortarColor: 0x1000000 }, { colorVariation: .5 }, { relief: -1 },
      { seed: 1.5 }, null,
    ]) expect(() => validateCraftMasonryFinish(options as never)).toThrow();
    const material = new MeshStandardMaterial();
    expect(() => applyCraftMasonryFinish(material, { brickHeight: 0 })).toThrow(/brick/);
    expect(material.userData.craftMasonryFinish).toBeUndefined();
    applyCraftMasonryFinish(material);
    expect(() => applyCraftMasonryFinish(material)).toThrow(/already/);
    material.dispose();
  });
});
