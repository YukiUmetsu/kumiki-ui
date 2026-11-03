import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ACESFilmicToneMapping, Group, LinearToneMapping, NoToneMapping, Scene } from "three";
import { CameraViewport3D } from "../registry/motion/camera-viewport-3d";
import { createCameraRig3D } from "../registry/motion/camera-rig-3d";
import { HeroAssetViewer } from "../registry/craft/hero-viewer";
import { DEFAULT_CAMERA_LIGHTING_PRESET } from "../registry/motion/camera-lighting-preset";
import { CameraLightingPreviewContext } from "../registry/motion/camera-lighting-preview";
import type { HeroAsset } from "../registry/craft/hero-asset";

const captures = vi.hoisted(() => ({ frames: [] as Array<{ cameraType: string; aspect: number; lights: number; exposure: number;
  fov?: number; rollZ: number; silhouette: boolean; studioVisible: boolean | undefined; backgroundBlack: boolean; toneMapping: number }> }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class TestRenderer {
    domElement: HTMLCanvasElement;
    localClippingEnabled = false;
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 1;
    shadowMap = { enabled: false, type: 0 };
    constructor({ canvas }: { canvas: HTMLCanvasElement }) { this.domElement = canvas; }
    getPixelRatio() { return 1; }
    setPixelRatio() { /* GPU-free boundary */ }
    setSize() { /* GPU-free boundary */ }
    render(scene: Scene, camera: import("three").PerspectiveCamera | import("three").OrthographicCamera) {
      const group = scene.getObjectByName("kumiki-camera-lighting-preset") as Group | undefined;
      captures.frames.push({ cameraType: camera.type, exposure: this.toneMappingExposure, toneMapping: this.toneMapping,
        aspect: camera instanceof actual.OrthographicCamera
          ? (camera.right - camera.left) / (camera.top - camera.bottom)
          : camera.aspect,
        fov: camera instanceof actual.PerspectiveCamera ? camera.fov : undefined,
        rollZ: camera.quaternion.z,
        silhouette: scene.overrideMaterial instanceof actual.MeshBasicMaterial && scene.overrideMaterial.color.getHex() === 0xffffff,
        studioVisible: scene.getObjectByName("kumiki-hero-studio")?.visible,
        backgroundBlack: scene.background instanceof actual.Color && scene.background.getHex() === 0,
        lights: group?.children.filter(item => (item as import("three").Light).isLight).length ?? 0 });
    }
    dispose() { /* GPU-free boundary */ }
  }
  return { ...actual, WebGLRenderer: TestRenderer };
});

class ResizeObserverStub { observe() {} disconnect() {} }

const bounds = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
const timeline = createCameraRig3D({ id: "preview", fps: { num: 30, den: 1 }, durationFrames: 2, keyframes: [
  { frame: 0, target: [0, 0, 0], distance: 8, azimuth: 0, elevation: 0, fov: 45, roll: 20 },
] });
const createScene = () => { const scene = new Scene(); return { scene, dispose() { scene.clear(); } }; };
const createAsset = (): HeroAsset => ({
  id: "fixture", group: new Group(), bounds,
  parts: new Map(), tier: "hero", metersPerUnit: 1,
  craft: { materials: ["fixture"], details: ["bounds"] }, dispose() {},
});
const lastFrame = () => captures.frames[captures.frames.length - 1];

beforeEach(() => {
  captures.frames.length = 0;
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

describe("camera lighting host integration (real Three scene graph, no GPU)", () => {
  it("keeps an MG1 perspective camera while toggling baked-image lights on a mounted viewport", () => {
    const offset = { ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset" as const,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "orthographic" as const, scale: 3 },
        azimuthDeg: 0, elevationDeg: 0, distanceFactor: 1 } };
    const props = { timeline, frame: 0, width: 320, height: 180, createScene,
      cameraLightingPreset: offset, cameraLightingBounds: bounds };
    const { rerender } = render(<CameraViewport3D {...props} cameraLightingPhysicalLights />);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 2 });
    expect(lastFrame().rollZ).toBeCloseTo(Math.sin(20 * Math.PI / 360));
    rerender(<CameraViewport3D {...props} cameraLightingPhysicalLights={false} />);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 0 });
    rerender(<CameraViewport3D {...props} cameraLightingPhysicalLights />);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 2 });
    rerender(<CameraViewport3D {...props} width={180} height={320} cameraLightingPhysicalLights />);
    expect(lastFrame().fov).toBeGreaterThan(60);
  });

  it("preserves default ACES and applies linear photographic exposure while paused without rebuilding the scene", () => {
    const factory = vi.fn(createScene);
    const props = { timeline, frame: 0, width: 320, height: 180, createScene: factory, cameraLightingPhysicalLights: false };
    const { rerender } = render(<CameraViewport3D {...props} />);
    expect(lastFrame()).toMatchObject({ toneMapping: ACESFilmicToneMapping, exposure: 1 });
    rerender(<CameraViewport3D {...props} toneMapping="linear" exposure={0.5} />);
    expect(lastFrame()).toMatchObject({ toneMapping: LinearToneMapping, exposure: 0.5, lights: 0 });
    expect(factory).toHaveBeenCalledTimes(1);
    rerender(<CameraViewport3D {...props} toneMapping="aces" exposure={1.4} />);
    expect(lastFrame()).toMatchObject({ toneMapping: ACESFilmicToneMapping, exposure: 1.4 });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("updates orthographic aspect on one mounted HeroAssetViewer across 16:9 and 9:16", () => {
    const preset = { ...DEFAULT_CAMERA_LIGHTING_PRESET, camera: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "orthographic" as const, scale: 3 },
    } };
    const { rerender } = render(<HeroAssetViewer createAsset={createAsset} width={160} height={90} cameraLightingPreset={preset} />);
    expect(lastFrame()).toMatchObject({ cameraType: "OrthographicCamera" });
    expect(lastFrame().aspect).toBeCloseTo(16 / 9);
    rerender(<HeroAssetViewer createAsset={createAsset} width={90} height={160} cameraLightingPreset={preset} />);
    expect(lastFrame().aspect).toBeCloseTo(9 / 16);
  });

  it("applies Storybook QA to a timeline viewport without requiring production bounds", () => {
    const qa = { ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset" as const,
      camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, distanceFactor: 1 },
      lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, exposure: 1.5 } };
    const props = { timeline, frame: 0, width: 320, height: 180, createScene, exposure: 1.4 };
    const { rerender } = render(<CameraLightingPreviewContext.Provider value={qa}>
      <CameraViewport3D {...props} />
    </CameraLightingPreviewContext.Provider>);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 2 });
    expect(lastFrame().exposure).toBeCloseTo(2.1);
    rerender(<CameraLightingPreviewContext.Provider value={null}><CameraViewport3D {...props} /></CameraLightingPreviewContext.Provider>);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 0, exposure: 1.4 });
  });

  it("keeps an explicit shot preset authoritative over the optional QA provider", () => {
    const qa = { ...DEFAULT_CAMERA_LIGHTING_PRESET, camera: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "orthographic" as const, scale: 2 },
    } };
    const explicit = { ...DEFAULT_CAMERA_LIGHTING_PRESET, camera: {
      ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, projection: { kind: "perspective" as const, fovDeg: 45 },
    } };
    render(<CameraLightingPreviewContext.Provider value={qa}>
      <HeroAssetViewer createAsset={createAsset} width={160} height={90} cameraLightingPreset={explicit} />
    </CameraLightingPreviewContext.Provider>);
    expect(lastFrame()).toMatchObject({ cameraType: "PerspectiveCamera", lights: 2 });
  });

  it("switches to a neutral silhouette without changing normal Storybook lighting", () => {
    const { rerender, unmount } = render(<HeroAssetViewer createAsset={createAsset} width={160} height={90}
      cameraLightingPreset={DEFAULT_CAMERA_LIGHTING_PRESET} visualQaMode="silhouette" />);
    expect(lastFrame()).toMatchObject({ silhouette: true, studioVisible: false, backgroundBlack: true, toneMapping: NoToneMapping });
    rerender(<HeroAssetViewer createAsset={createAsset} width={160} height={90}
      cameraLightingPreset={DEFAULT_CAMERA_LIGHTING_PRESET} />);
    expect(lastFrame()).toMatchObject({ silhouette: false, studioVisible: true });
    unmount();
  });
});
