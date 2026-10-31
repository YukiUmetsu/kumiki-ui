import { describe, expect, it } from "vitest";
import { DataTexture, Mesh, RGBAFormat, ShaderMaterial, UnsignedByteType } from "three";
import {
  createDepthComposite, validateDepthComposite,
} from "../registry/craft/depth-composite";
import type { DepthCompositeAssets, DepthCompositeSpec } from "../registry/craft/depth-composite";

const map = () => new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
const depth = { width: 2, height: 2, rgba: new Uint8Array([
  127, 127, 127, 255, 127, 127, 127, 255,
  127, 127, 127, 255, 127, 127, 127, 255,
]) };

const spec: DepthCompositeSpec = {
  schemaVersion: 1, id: "composite-test",
  layers: [
    { id: "clean-background", width: 4, height: 2, at: [0, 0, -1], depthScale: .12,
      segmentsX: 8, segmentsY: 4 },
    { id: "foreground-object", width: 1.4, height: 1.4, at: [.3, -.1, 0], depthScale: .18,
      segmentsX: 6, segmentsY: 6,
      shadow: { receiverId: "clean-background", offset: [.09, -.12], softness: .024, opacity: .37 },
    },
  ],
};

function fixtures(): DepthCompositeAssets {
  return {
    "clean-background": { depth, color: map() },
    "foreground-object": { depth, color: map(), alpha: map() },
  };
}

function release(assets: DepthCompositeAssets) {
  for (const asset of Object.values(assets)) { asset.color.dispose(); asset.alpha?.dispose(); }
}

describe("depth-aware image compositing", () => {
  it("uses genuine z-buffer geometry order and a shadow bound to the receiver's relief", () => {
    const assets = fixtures();
    const composite = createDepthComposite(spec, assets);
    expect(composite.group.children.length).toBe(3);
    const back = composite.layers.get("clean-background")!;
    const front = composite.layers.get("foreground-object")!;
    expect(front.mesh.position.z).toBeGreaterThan(back.mesh.position.z);
    expect(front.mesh.userData.compositeLayerId).toBe("foreground-object");
    expect(front.mesh.userData.partRole).toBe("image-relief");
    expect(front.mesh.material.depthTest).toBe(true);
    expect(front.mesh.material.alphaMap).toBe(assets["foreground-object"].alpha);
    const shadow = composite.shadows.get("foreground-object")!;
    expect(shadow).toBeInstanceOf(Mesh);
    expect(shadow.geometry).toBe(back.geometry); // conforms to the receiver's displaced geometry
    expect(shadow.position.z - back.mesh.position.z).toBeCloseTo(.002);
    expect(shadow.userData.partRole).toBe("projected-matte-shadow");
    expect(shadow.material).toBeInstanceOf(ShaderMaterial);
    const material = shadow.material as ShaderMaterial;
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.uniforms.shadowSoftness.value).toBe(.024);
    expect(material.uniforms.shadowOffset.value.x).toBeCloseTo(.09);
    expect(material.uniforms.shadowOpacity.value).toBe(.37);
    // Geometry remains identical under deterministic rebuilds.
    const firstGeometry = [...front.geometry.getAttribute("position").array];
    composite.dispose();
    const again = createDepthComposite(spec, assets);
    expect([...again.layers.get("foreground-object")!.geometry.getAttribute("position").array]).toEqual(firstGeometry);
    again.dispose(); release(assets);
  });

  it("preserves consumer-owned image/matte textures and disposes its own resources exactly once", () => {
    const assets = fixtures();
    const tex = assets["foreground-object"].color;
    let textureDisposed = 0;
    tex.addEventListener("dispose", () => textureDisposed++);
    const composite = createDepthComposite(spec, assets);
    const shadow = composite.shadows.get("foreground-object")!;
    const receiver = composite.layers.get("clean-background")!;
    let geometryDisposed = 0, shaderDisposed = 0;
    receiver.geometry.addEventListener("dispose", () => geometryDisposed++);
    (shadow.material as ShaderMaterial).addEventListener("dispose", () => shaderDisposed++);
    composite.dispose(); composite.dispose();
    expect(geometryDisposed).toBe(1);
    expect(shaderDisposed).toBe(1);
    expect(textureDisposed).toBe(0);
    expect(composite.group.children).toHaveLength(0);
    tex.dispose(); expect(textureDisposed).toBe(1);
    release(assets);
  });

  it("does not require shadows or alpha when layering opaque plates", () => {
    const assets = fixtures();
    const plain = { ...spec, layers: spec.layers.map(layer => ({ ...layer, shadow: undefined })) };
    expect(() => validateDepthComposite(plain, assets)).not.toThrow();
    const composite = createDepthComposite(plain, assets);
    expect(composite.shadows.size).toBe(0);
    expect(composite.group.children).toHaveLength(2);
    composite.dispose(); release(assets);
  });

  it("rejects incorrect depth order, intersecting intervals and duplicate semantic IDs", () => {
    const assets = fixtures();
    expect(() => validateDepthComposite({ ...spec, layers: [...spec.layers].reverse() }, assets)).toThrow(/shadow receiver|order/);
    expect(() => validateDepthComposite({ ...spec, layers: [spec.layers[0], { ...spec.layers[1], at: [0, 0, -.97] }] }, assets))
      .toThrow(/overlap/);
    expect(() => validateDepthComposite({ ...spec, layers: [spec.layers[0], { ...spec.layers[1], id: spec.layers[0].id }] }, assets))
      .toThrow(/unique/);
    expect(() => validateDepthComposite({ ...spec, layers: [] }, assets)).toThrow(/1–12/);
    expect(() => validateDepthComposite({ ...spec, layers: spec.layers.map(layer => ({ ...layer, at: [0, NaN, 0] as const })) }, assets))
      .toThrow(/XYZ/);
    release(assets);
  });

  it("requires a real alpha matte for shadows and an earlier receiver", () => {
    const assets = fixtures();
    delete assets["foreground-object"].alpha;
    expect(() => validateDepthComposite(spec, assets)).toThrow(/cutout alpha/);
    assets["foreground-object"].alpha = map();
    const unknownReceiver = { ...spec, layers: [spec.layers[0], { ...spec.layers[1], shadow: { receiverId: "unknown" } }] };
    expect(() => validateDepthComposite(unknownReceiver, assets)).toThrow(/earlier layer/);
    release(assets);
  });

  it("enforces penumbra, brightness, bias and color limits", () => {
    const assets = fixtures();
    const bad = (shadow: NonNullable<DepthCompositeSpec["layers"][number]["shadow"]>) =>
      ({ ...spec, layers: [spec.layers[0], { ...spec.layers[1], shadow }] });
    expect(() => validateDepthComposite(bad({ receiverId: "clean-background", softness: .6 }), assets)).toThrow(/invalid shadow/);
    expect(() => validateDepthComposite(bad({ receiverId: "clean-background", opacity: 1 }), assets)).toThrow(/invalid shadow/);
    expect(() => validateDepthComposite(bad({ receiverId: "clean-background", surfaceBias: 0 }), assets)).toThrow(/invalid shadow/);
    expect(() => validateDepthComposite(bad({ receiverId: "clean-background", color: "banana" }), assets)).toThrow(/hex/);
    expect(() => validateDepthComposite(bad({ receiverId: "clean-background", offset: [Infinity, 0] }), assets)).toThrow(/offset/);
    release(assets);
  });

  it("counts extra receiver draws from shadows towards a bounded scene budget", () => {
    const assets = fixtures();
    const oversized: DepthCompositeSpec = { ...spec, layers: [
      { ...spec.layers[0], segmentsX: 500, segmentsY: 500 },
      { ...spec.layers[1], segmentsX: 500, segmentsY: 500 },
    ] };
    expect(() => validateDepthComposite(oversized, assets)).toThrow(/rendered-vertex budget/);
    release(assets);
  });
});
