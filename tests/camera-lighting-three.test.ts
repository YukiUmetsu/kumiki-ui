import { describe, expect, it } from "vitest";
import { DirectionalLight, Group, OrthographicCamera, PerspectiveCamera, Scene } from "three";
import { createCameraLightingThreeController, setOrthographicCameraAspect } from "../registry/craft/camera-lighting-three";
import { DEFAULT_CAMERA_LIGHTING_PRESET, type CameraLightingPreset } from "../registry/motion/camera-lighting-preset";

const bounds = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
const preset = (overrides: Partial<CameraLightingPreset> = {}): CameraLightingPreset => ({ ...DEFAULT_CAMERA_LIGHTING_PRESET, ...overrides });

describe("Three camera/light adapter", () => {
  it("applies a camera pose and reuses an owned light group across slider edits", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const controller = createCameraLightingThreeController(scene);
    controller.apply(camera, preset(), bounds);
    const group = scene.getObjectByName("kumiki-camera-lighting-preset") as Group;
    expect(camera.position.length()).toBeGreaterThan(1);
    expect(camera.fov).toBe(32);
    expect(group.children.filter(item => item instanceof DirectionalLight)).toHaveLength(2);
    const key = group.getObjectByName("preset-key");
    const edited = preset({ lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting,
      lights: [{ ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting.lights[0], intensity: 3 }],
    } });
    controller.apply(camera, edited, bounds);
    expect(scene.getObjectByName("kumiki-camera-lighting-preset")).toBe(group);
    expect(group.getObjectByName("preset-key")).toBe(key);
    expect((key as DirectionalLight).intensity).toBe(3);
    expect(group.children.filter(item => item instanceof DirectionalLight)).toHaveLength(1);
    controller.dispose();
    expect(scene.getObjectByName("kumiki-camera-lighting-preset")).toBeUndefined();
  });

  it("replaces named studio lights but retains unrelated authored lights and restores state", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const studio = new Group(); studio.name = "kumiki-hero-studio";
    const key = new DirectionalLight(); key.name = "hero-key"; studio.add(key); scene.add(studio);
    const authored = new DirectionalLight(); authored.name = "art-directed-sun"; scene.add(authored);
    const controller = createCameraLightingThreeController(scene, { managedLights: [key] });
    controller.apply(camera, preset(), bounds);
    expect(key.visible).toBe(false);
    expect(authored.visible).toBe(true);
    controller.apply(camera, preset({ lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, mode: "augment" } }), bounds);
    expect(key.visible).toBe(true);
    controller.dispose();
    expect(key.visible).toBe(true);
    expect(authored.parent).toBe(scene);
  });

  it("keeps the authored frame pose and applies reversible preview offsets", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const controller = createCameraLightingThreeController(scene);
    const offset = preset({ mode: "preview-offset", camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera,
      azimuthDeg: 90, elevationDeg: 0, heightOffset: 0, distanceFactor: 0.5,
    } });
    const frame = { position: [0, 0, 10] as const, target: [0, 0, 0] as const, fov: 55 };
    controller.apply(camera, offset, bounds, frame);
    expect(camera.position.x).toBeCloseTo(5);
    expect(camera.position.z).toBeCloseTo(0);
    expect(camera.fov).toBe(55);
    expect(frame.position).toEqual([0, 0, 10]);
    controller.dispose();
  });

  it("preserves a CC1 authored quaternion when preview offsets are neutral", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const controller = createCameraLightingThreeController(scene);
    const neutral = preset({ mode: "preview-offset", camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera,
      azimuthDeg: 0, elevationDeg: 0, heightOffset: 0, distanceFactor: 1, rollDeg: 0,
    } });
    controller.apply(camera, neutral, bounds, {
      position: [0, 0, 10], target: [0, 0, 0], fov: 45,
      orientation: [0, 0, Math.sin(Math.PI / 12), Math.cos(Math.PI / 12)],
    });
    expect(camera.quaternion.z).toBeCloseTo(Math.sin(Math.PI / 12));
    expect(camera.quaternion.w).toBeCloseTo(Math.cos(Math.PI / 12));
    controller.dispose();
  });

  it("preserves an MG1 authored roll in a neutral preview offset", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const controller = createCameraLightingThreeController(scene);
    controller.apply(camera, preset({ mode: "preview-offset", camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera,
      azimuthDeg: 0, elevationDeg: 0, heightOffset: 0, distanceFactor: 1, rollDeg: 0,
    } }), bounds, { position: [0, 0, 10], target: [0, 0, 0], fov: 42, rollDeg: 30 });
    expect(camera.quaternion.z).toBeCloseTo(Math.sin(Math.PI / 12));
    expect(camera.quaternion.w).toBeCloseTo(Math.cos(Math.PI / 12));
    controller.dispose();
  });

  it("removes physical lights if a host switches to a baked 2.5D mode", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const controller = createCameraLightingThreeController(scene);
    controller.apply(camera, preset(), bounds);
    expect((scene.getObjectByName("kumiki-camera-lighting-preset") as Group).children.filter(obj => obj instanceof DirectionalLight)).toHaveLength(2);
    controller.apply(camera, preset(), bounds, undefined, { physicalLights: false });
    expect((scene.getObjectByName("kumiki-camera-lighting-preset") as Group).children.filter(obj => obj instanceof DirectionalLight)).toHaveLength(0);
    controller.dispose();
  });

  it("recomputes orthographic aspect when an existing asset changes between landscape and portrait", () => {
    const camera = new OrthographicCamera();
    setOrthographicCameraAspect(camera, 16 / 9);
    expect((camera.right - camera.left) / (camera.top - camera.bottom)).toBeCloseTo(16 / 9);
    setOrthographicCameraAspect(camera, 9 / 16);
    expect((camera.right - camera.left) / (camera.top - camera.bottom)).toBeCloseTo(9 / 16);
  });

  it("does not hide an HDR environment without an explicit policy, then restores it", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const original = { isTexture: true } as never; scene.environment = original;
    const controller = createCameraLightingThreeController(scene);
    controller.apply(camera, preset({ lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, environment: "keep" } }), bounds);
    expect(scene.environment).toBe(original);
    controller.apply(camera, preset(), bounds);
    expect(scene.environment).toBeNull();
    controller.dispose();
    expect(scene.environment).toBe(original);
  });
});
