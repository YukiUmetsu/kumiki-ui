import { describe, expect, it } from "vitest";
import { parseImageSceneManifest, validateCaptureSet } from "../registry/craft/image-scene-manifest";

const hash = "a".repeat(64);
const capture = () => ({ schemaVersion: 1, id: "subject-a", mode: "camera-orbit", rights: { license: "CC0-1.0", source: "https://example.org/capture" },
  views: [{ id: "a", image: "/photos/a.jpg" }, { id: "b", image: "/photos/b.jpg" }, { id: "c", image: "/photos/c.jpg" }] });
const manifest = () => ({ schemaVersion: 1, id: "subject-a", representation: "photographic-mesh", lighting: "baked",
  scale: { kind: "relative" }, rights: capture().rights,
  model: { path: "subject.glb", sha256: hash, bytes: 100 },
  bounds: { min: [-1, 0, -1], max: [1, 2, 1] },
  sourceViews: [{ id: "a", sha256: hash, width: 2000, height: 1600 }, { id: "b", sha256: "b".repeat(64), width: 2000, height: 1600 }],
  backend: { id: "apple-object-capture", revision: "macOS-test", inputsHash: hash },
  cameraEnvelope: { yaw: [-180, 180], pitch: [-60, 60], minimumDistanceFactor: 2.5, evidence: "reviewed capture coverage; not a per-triangle visibility certificate" },
  shot: { preset: "push-in", durationFrames: 180, fps: { num: 30, den: 1 }, width: 1920, height: 1080 },
  review: { status: "pending" }, diagnostics: [] });

describe("image scene capture and bundle contracts", () => {
  it("accepts real-view capture requests and preserves manual mask/depth overrides", () => {
    const request = { ...capture(), views: [{ id: "a", image: "/photos/a.jpg", mask: "/masks/a.png", depth: { path: "/depth/a.exr", encoding: "camera-z-meters-f32" } }, ...capture().views.slice(1)] };
    expect(validateCaptureSet(request).views[0].depth?.encoding).toBe("camera-z-meters-f32");
  });
  it("rejects unsupported schema, modes, duplicate observations and missing rights", () => {
    for (const request of [ { ...capture(), schemaVersion: 2 }, { ...capture(), mode: "guess" }, { ...capture(), views: [capture().views[0]] },
      { ...capture(), views: [capture().views[0], capture().views[0]] }, { ...capture(), rights: {} },
      { ...capture(), views: [{ id: "a", image: "same.jpg" }, { id: "b", image: "same.jpg" }] } ]) {
      expect(() => validateCaptureSet(request)).toThrow(/capture|view|rights|license|mode|schema/i);
    }
  });
  it("accepts explicit object rotation only with subject segmentation enabled", () => {
    expect(validateCaptureSet({ ...capture(), mode: "object-rotation", segmentation: "automatic" }).mode).toBe("object-rotation");
    expect(() => validateCaptureSet({ ...capture(), mode: "object-rotation", segmentation: "none" })).toThrow(/mask|segment/i);
  });
  it("rejects nonfinite calibration and depth with unknown conventions", () => {
    expect(() => validateCaptureSet({ ...capture(), views: [{ ...capture().views[0], calibration: { width: 20, height: 20, fx: NaN, fy: 20, cx: 10, cy: 10, cameraToWorld: Array(16).fill(0) } }, ...capture().views.slice(1)] })).toThrow(/calibration/i);
    expect(() => validateCaptureSet({ ...capture(), views: [{ ...capture().views[0], depth: { path: "depth.png", encoding: "brightness" } }, ...capture().views.slice(1)] })).toThrow(/depth/i);
  });
  it("round-trips a valid baked bundle with relative scale and rational timing", () => {
    expect(parseImageSceneManifest(JSON.parse(JSON.stringify(manifest())))).toEqual(manifest());
  });
  it("rejects traversal, external model URLs, bad digests and unbounded sizes", () => {
    for (const model of [{ path: "../escape.glb", sha256: hash, bytes: 10 }, { path: "https://evil.test/model.glb", sha256: hash, bytes: 10 },
      { path: "nested/%2e%2e/model.glb", sha256: hash, bytes: 10 }, { path: "model.glb", sha256: "bad", bytes: 10 }, { path: "model.glb", sha256: hash, bytes: 2 ** 40 }]) {
      expect(() => parseImageSceneManifest({ ...manifest(), model })).toThrow(/model|path|digest|byte|hash/i);
    }
  });
  it("rejects invalid bounds, lens envelope, output timing and metric scale", () => {
    for (const value of [{ ...manifest(), bounds: { min: [1, 1, 1], max: [0, 0, 0] } }, { ...manifest(), cameraEnvelope: { ...manifest().cameraEnvelope, yaw: [10, -10] } },
      { ...manifest(), shot: { ...manifest().shot, fps: { num: 0, den: 1 } } }, { ...manifest(), scale: { kind: "metric", metersPerUnit: 0, evidence: "" } }]) {
      expect(() => parseImageSceneManifest(value)).toThrow(/bounds|camera|timing|fps|scale/i);
    }
  });
  it("does not allow generated data to claim unrecorded human approval or physical relighting", () => {
    expect(() => parseImageSceneManifest({ ...manifest(), lighting: "relight" })).toThrow(/baked|light/i);
    expect(() => parseImageSceneManifest({ ...manifest(), review: { status: "approved" } })).toThrow(/review|approval/i);
  });
});
