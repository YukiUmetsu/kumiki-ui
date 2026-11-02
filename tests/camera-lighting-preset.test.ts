import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA_LIGHTING_PRESET,
  resolveCameraLightingPreset,
  selectCameraLightingProjection,
  serializeCameraLightingPreset,
  validateCameraLightingPreset,
} from "../registry/motion/camera-lighting-preset";

const bounds = { min: [-2, -1, -1] as const, max: [2, 1, 1] as const };

describe("portable camera and lighting presets", () => {
  it("validates and round-trips a copyable, versioned preset", () => {
    const json = serializeCameraLightingPreset(DEFAULT_CAMERA_LIGHTING_PRESET);
    expect(validateCameraLightingPreset(JSON.parse(json))).toEqual(DEFAULT_CAMERA_LIGHTING_PRESET);
    expect(serializeCameraLightingPreset(JSON.parse(json))).toBe(json);
  });

  it("rejects invalid versions and malformed, duplicate or excessive lights", () => {
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, schemaVersion: 2 })).toThrow(/schemaVersion/);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: [DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0], DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0]],
    } })).toThrow(/duplicate/i);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: Array.from({ length: 9 }, (_, i) => ({ ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0], id: `l${i}` })),
    } })).toThrow(/8/);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: Array.from({ length: 3 }, (_, i) => ({ ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0], id: `l${i}`, castShadow: true })),
    } })).toThrow(/shadow/i);
  });

  it("rejects unbounded and ambiguous values before an import changes state", () => {
    const sample = DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0];
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, distanceFactor: Number.POSITIVE_INFINITY } })).toThrow(/distanceFactor/);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: [{ ...sample, position: [1, "bad", 3] }],
    } })).toThrow(/position/);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: [{ ...sample, temperatureK: 5000 }],
    } })).toThrow(/color.*temperatureK/i);
    expect(() => validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, lighting: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: [{ ...sample, color: undefined, temperatureK: 300 }],
    } })).toThrow(/temperatureK/);
  });

  it("scales relative camera and light placement to the subject radius", () => {
    const preset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, azimuthDeg: 0, elevationDeg: 0, distanceFactor: 2, heightOffset: 1 },
      lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, lights: [{ id: "key", type: "point", enabled: true, position: [1, 0, 0], color: "#ffffff", intensity: 2, castShadow: false }] },
    });
    const radius = Math.sqrt(6);
    const result = resolveCameraLightingPreset(preset, bounds);
    expect(result.camera.target).toEqual([0, 0, 0]);
    expect(result.camera.position[1]).toBeCloseTo(radius);
    expect(result.camera.position[2]).toBeCloseTo(radius * 2);
    expect(result.lights[0].position[0]).toBeCloseTo(radius);
  });

  it("uses explicit world coordinates and rejects degenerate bounds", () => {
    const preset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, space: "world", target: [4, 5, 6], azimuthDeg: 0, elevationDeg: 0, distanceFactor: 10, heightOffset: 2 },
    });
    expect(resolveCameraLightingPreset(preset, bounds).camera.position).toEqual([4, 7, 16]);
    expect(() => resolveCameraLightingPreset(DEFAULT_CAMERA_LIGHTING_PRESET, { min: [0, 0, 0], max: [0, 0, 0] })).toThrow(/bounds/i);
  });

  it("resolves a custom subject-relative look-at target from the asset center", () => {
    const preset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, target: [1, 0, 0] },
    });
    expect(resolveCameraLightingPreset(preset, bounds).camera.target[0]).toBeCloseTo(Math.sqrt(6));
  });

  it("only offsets the authored frame when preview-offset mode is selected", () => {
    const authored = { position: [0, 0, 10] as const, target: [0, 0, 0] as const, fov: 50 };
    const offset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset", camera: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, azimuthDeg: 90, elevationDeg: 0, heightOffset: 0, distanceFactor: 0.5,
    } });
    const result = resolveCameraLightingPreset(offset, bounds, authored);
    expect(result.camera.position[0]).toBeCloseTo(5);
    expect(result.camera.position[2]).toBeCloseTo(0);
    expect(result.camera.fov).toBe(50);
    const replace = resolveCameraLightingPreset({ ...offset, mode: "replace-shot" }, bounds, authored);
    expect(replace.camera.position[0]).not.toBeCloseTo(5);
  });

  it("keeps orthographic projection and scale separate from distance", () => {
    const preset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "orthographic", scale: 3 } },
    });
    expect(resolveCameraLightingPreset(preset, bounds).camera.projection).toEqual({ kind: "orthographic", scale: 3 * Math.sqrt(6) });
  });

  it("selects the authored projection in preview-offset mode, including MG1 perspective shots", () => {
    const offset = { ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset" as const,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "orthographic" as const, scale: 3 } } };
    expect(selectCameraLightingProjection(offset, "perspective")).toBe("perspective");
    expect(selectCameraLightingProjection(offset, "orthographic")).toBe("orthographic");
    expect(selectCameraLightingProjection({ ...offset, mode: "replace-shot" }, "perspective")).toBe("orthographic");
  });

  it("makes preview-offset zoom change authored orthographic magnification", () => {
    const offset = validateCameraLightingPreset({ ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset",
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, distanceFactor: .5 },
    });
    const resolved = resolveCameraLightingPreset(offset, bounds, { position: [0, 0, 10], target: [0, 0, 0],
      projection: { kind: "orthographic", scale: 4 } });
    expect(resolved.camera.projection).toEqual({ kind: "orthographic", scale: 2 });
  });
});
