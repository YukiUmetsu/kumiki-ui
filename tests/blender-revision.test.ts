import { describe, expect, it } from "vitest";
import {
  parseBlenderRevisionManifest,
  resolveBlenderModelUrl,
  verifyBlenderModelBytes,
} from "../registry/craft/blender-revision";

const sample = () => ({
  schema_version: 1,
  asset_id: "desk-lamp",
  generator: "kumiki-blender/component-composer-v2",
  units: "meters",
  native_axes: "Blender Z-up; GLB exported with glTF-compatible axes",
  provenance: "Original declarative component geometry",
  bounds_m: [[-0.3, -0.2, 0], [0.3, 0.2, 0.8]],
  named_parts: { "solid.box": 2 },
  files: { source: "source.blend", model: "model.glb", preview: "preview.png", quality_views: ["preview.png"] },
  output_bytes: { "source.blend": 1024, "model.glb": 64, "preview.png": 2048 },
  glb_audit: { meshes: 2, nodes: 3, materials: 1, semantic_nodes: 2, external_references: 0, bytes: 64 },
});

describe("Blender revision manifest", () => {
  it("accepts real producer fields and preserves source provenance", () => {
    const parsed = parseBlenderRevisionManifest(sample());
    expect(parsed.asset_id).toBe("desk-lamp");
    expect(parsed.provenance).toBe("Original declarative component geometry");
    expect(parsed.glb_audit.semantic_nodes).toBe(2);
  });

  it("rejects unknown version, units and absent semantic nodes", () => {
    expect(() => parseBlenderRevisionManifest({ ...sample(), schema_version: 2 })).toThrow(/schema_version/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), units: "centimeters" })).toThrow(/units/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), glb_audit: { ...sample().glb_audit, semantic_nodes: 0 } })).toThrow(/semantic_nodes/);
  });

  it("rejects unsafe model paths and malformed bounds", () => {
    for (const model of ["../private/model.glb", "/tmp/model.glb", "https://evil.example/model.glb", "models\\x.glb", "model.gltf", "a//b.glb", "./model.glb"]) {
      expect(() => parseBlenderRevisionManifest({ ...sample(), files: { ...sample().files, model } })).toThrow(/model/i);
    }
    expect(() => parseBlenderRevisionManifest({ ...sample(), bounds_m: [[0, 0, 1], [1, 1, 0]] })).toThrow(/bounds_m/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), bounds_m: [[0, 0, Number.POSITIVE_INFINITY], [1, 1, 1]] })).toThrow(/bounds_m/);
  });

  it("rejects inconsistent output bytes and audit counts", () => {
    expect(() => parseBlenderRevisionManifest({ ...sample(), glb_audit: { ...sample().glb_audit, bytes: 63 } })).toThrow(/bytes/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), glb_audit: { ...sample().glb_audit, semantic_nodes: 4 } })).toThrow(/semantic_nodes/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), output_bytes: { ...sample().output_bytes, "model.glb": -1 } })).toThrow(/output_bytes/);
    expect(() => parseBlenderRevisionManifest({ ...sample(), named_parts: { assembly: -1 } })).toThrow(/named_parts/);
    const oversized = 512 * 1024 * 1024 + 1;
    expect(() => parseBlenderRevisionManifest({ ...sample(), output_bytes: { ...sample().output_bytes, "model.glb": oversized },
      glb_audit: { ...sample().glb_audit, bytes: oversized } })).toThrow(/512 MiB/);
  });

  it("resolves a contained model URL relative to the manifest", () => {
    const parsed = parseBlenderRevisionManifest(sample());
    expect(resolveBlenderModelUrl("https://assets.example/revisions/desk/r01/manifest.json", parsed))
      .toBe("https://assets.example/revisions/desk/r01/model.glb");
    expect(() => resolveBlenderModelUrl("https://assets.example/revisions/desk/r01/file.json", parsed)).toThrow(/manifest.json/);
  });

  it("checks the fetched GLB byte length before parsing", () => {
    const parsed = parseBlenderRevisionManifest(sample());
    expect(() => verifyBlenderModelBytes(new ArrayBuffer(63), parsed)).toThrow(/64/);
    expect(() => verifyBlenderModelBytes(new ArrayBuffer(64), parsed)).not.toThrow();
  });
});
