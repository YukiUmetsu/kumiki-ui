import { describe, expect, it } from "vitest";
import { DataTexture, MeshBasicMaterial, MeshStandardMaterial, RGBAFormat, UnsignedByteType } from "three";
import { createImageRelief, createImageReliefFromSources, createImageReliefGeometry, validateImageRelief } from "../registry/craft/image-relief";
import type { ImageReliefSpec, ReliefDepthPixels } from "../registry/craft/image-relief";

const spec: ImageReliefSpec = {
  schemaVersion: 1, id: "sample", width: 4, height: 2, depthScale: .4,
  segmentsX: 2, segmentsY: 2, edgeFeather: 0, depthChannel: "red",
};

const pixels = (width: number, height: number, samples: number[]): ReliefDepthPixels => ({
  width, height,
  rgba: Uint8Array.from(samples.flatMap(value => [value, value, value, 255])),
});

describe("image relief geometry", () => {
  it("maps decoded top-left pixels to the correct UV and gives white pixels positive depth", () => {
    const input = pixels(2, 2, [255, 0, 0, 0]);
    const { geometry, minZ, maxZ, vertices } = createImageReliefGeometry(spec, input);
    const position = geometry.getAttribute("position");
    // PlaneGeometry starts at top-left, whose UV is (0, 1).
    expect(position.getZ(0)).toBeCloseTo(.2);
    expect(position.getZ(2)).toBeCloseTo(-.2);
    expect(position.getZ(6)).toBeCloseTo(-.2);
    expect(minZ).toBeCloseTo(-.2);
    expect(maxZ).toBeCloseTo(.2);
    expect(vertices).toBe(9);
    expect(geometry.getAttribute("normal").count).toBe(vertices);
    geometry.dispose();
  });

  it("bilinearly samples the image and produces repeatable vertex positions", () => {
    const input = pixels(2, 2, [255, 0, 0, 0]);
    const a = createImageReliefGeometry(spec, input).geometry;
    const b = createImageReliefGeometry(spec, input).geometry;
    const az = a.getAttribute("position").array;
    expect([...az]).toEqual([...b.getAttribute("position").array]);
    expect(a.getAttribute("position").getZ(4)).toBeCloseTo(-.1);
    a.dispose(); b.dispose();
  });

  it("supports inversion, channel selection, smoothing and feathered flat photo edges", () => {
    const input: ReliefDepthPixels = { width: 2, height: 2,
      rgba: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 255]) };
    const alternate = { ...spec, segmentsX: 8, segmentsY: 8, nearIsWhite: false, depthChannel: "green" as const,
      smoothRadius: 1, edgeFeather: .2 };
    const { geometry } = createImageReliefGeometry(alternate, input);
    const positions = geometry.getAttribute("position");
    expect(positions.getZ(0)).toBe(0);
    expect(positions.getZ(8)).toBe(0);
    expect(positions.getZ(80)).toBe(0);
    expect(positions.getZ(40)).not.toBe(0);
    geometry.dispose();
  });

  it("rejects missing data and unbounded geometry before allocation", () => {
    const valid = pixels(2, 2, [0, 0, 0, 0]);
    expect(() => validateImageRelief(spec, valid)).not.toThrow();
    expect(() => createImageReliefGeometry({ ...spec, segmentsX: 512, segmentsY: 512 }, valid)).toThrow(/vertices/);
    expect(() => createImageReliefGeometry({ ...spec, depthScale: 2 }, valid)).toThrow(/depthScale/);
    expect(() => createImageReliefGeometry({ ...spec, segmentsX: 0 }, valid)).toThrow(/tessellation/);
    expect(() => createImageReliefGeometry({ ...spec, edgeFeather: .7 }, valid)).toThrow(/edge feather/);
    expect(() => createImageReliefGeometry(spec, { ...valid, rgba: [] })).toThrow(/RGBA/);
    expect(() => createImageReliefGeometry(spec, { ...valid, width: 1 })).toThrow(/RGBA/);
    expect(() => createImageReliefGeometry(spec, {
      ...valid, rgba: [NaN, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255],
    })).toThrow(/8-bit RGBA/);
    expect(() => createImageReliefGeometry(spec, {
      ...valid, rgba: [256, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255],
    })).toThrow(/8-bit RGBA/);
  });

  it("keeps caller-owned texture alive when disposing the mesh", () => {
    const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
    let disposed = 0;
    texture.addEventListener("dispose", () => disposed++);
    const relief = createImageRelief(spec, pixels(2, 2, [0, 255, 128, 192]), { color: texture });
    expect(relief.material).toBeInstanceOf(MeshBasicMaterial);
    expect(relief.mesh.name).toBe("sample");
    expect(relief.mesh.castShadow).toBe(false);
    relief.dispose();
    expect(disposed).toBe(0);
    const relit = createImageRelief(spec, pixels(2, 2, [0, 255, 128, 192]), { color: texture, lighting: "relight" });
    expect(relit.material).toBeInstanceOf(MeshStandardMaterial);
    expect(relit.mesh.castShadow).toBe(true);
    relit.dispose();
    texture.dispose();
    expect(disposed).toBe(1);
  });

  it("rejects invalid browser URLs and a pre-aborted load without trying to build geometry", async () => {
    await expect(createImageReliefFromSources(spec, { colorSrc: "", depthSrc: "" })).rejects.toThrow(/nonempty/);
    const controller = new AbortController();
    controller.abort();
    await expect(createImageReliefFromSources(spec, {
      colorSrc: "/approved/color.png", depthSrc: "/approved/depth.png",
    }, {}, controller.signal)).rejects.toThrow(/cancelled/);
  });
});
