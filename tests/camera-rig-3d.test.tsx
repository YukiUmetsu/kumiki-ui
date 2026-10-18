/**
 * `camera-rig-3d` — renderer-independent spherical camera choreography — plus
 * the optional Three.js `camera-viewport-3d` boundary.
 *
 * The pure half pins channel compilation, orbit/dolly spherical math, validation
 * and frame clamping. The React half mocks only the WebGL renderer (three.js has
 * no context in jsdom) so the accessible canvas, resolved frame, WebGL failure
 * recovery and input validation can be asserted without a GPU.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  createCameraRig3D,
  evaluateCameraRig3D,
} from "../registry/motion/camera-rig-3d";
import type { CameraOrbitKeyframe3D, CameraPoint3D } from "../registry/motion/camera-rig-3d";
import { CameraViewport3D } from "../registry/motion/camera-viewport-3d";
import type { MotionTimeline } from "../registry/motion/types";
import type { Scene } from "three";

const threeState = vi.hoisted(() => ({ failRenderer: false }));

vi.mock("three", () => {
  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 1;
    shadowMap = { enabled: false };
    constructor(options: { canvas: HTMLCanvasElement }) {
      if (threeState.failRenderer) throw new Error("WebGL unavailable");
      this.domElement = options.canvas;
    }
    getPixelRatio() { return 1; }
    setPixelRatio() { /* noop */ }
    setSize() { /* noop */ }
    render() { /* noop */ }
    dispose() { /* noop */ }
  }
  class MockPerspectiveCamera {
    aspect = 1;
    fov = 50;
    near = 0.1;
    far = 100;
    position = { set: () => {} };
    up = { set: () => {} };
    lookAt() { /* noop */ }
    rotateZ() { /* noop */ }
    updateProjectionMatrix() { /* noop */ }
  }
  return {
    WebGLRenderer: MockWebGLRenderer,
    PerspectiveCamera: MockPerspectiveCamera,
    ACESFilmicToneMapping: 1,
    SRGBColorSpace: "srgb",
  };
});

class ResizeObserverStub {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
}

const FPS = { num: 30, den: 1 };

const KEYFRAMES: readonly CameraOrbitKeyframe3D[] = [
  { frame: 0, target: [0, 0, 0], distance: 10, azimuth: 0, elevation: 0 },
  { frame: 30, target: [0, 0, 0], distance: 10, azimuth: 90, elevation: 30, fov: 50, roll: 5 },
];

function rigTimeline(): MotionTimeline {
  return createCameraRig3D({ id: "rig", fps: FPS, durationFrames: 60, keyframes: KEYFRAMES });
}

function createScene() {
  return { scene: {} as Scene, dispose: () => {} };
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() {},
  }));
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  threeState.failRenderer = false;
});
afterEach(() => vi.unstubAllGlobals());

describe("createCameraRig3D — channel compilation and validation", () => {
  it("compiles one numeric track per orbit channel", () => {
    const timeline = rigTimeline();
    expect(timeline.nodes).toHaveLength(8);
    expect(timeline.nodes.map((node) => node.id)).toEqual([
      "camera3d-targetX", "camera3d-targetY", "camera3d-targetZ",
      "camera3d-distance", "camera3d-azimuth", "camera3d-elevation",
      "camera3d-fov", "camera3d-roll",
    ]);
    const fov = timeline.nodes.find((node) => node.id === "camera3d-fov");
    if (fov?.kind !== "track") throw new Error("expected fov track");
    // The default fov is materialized on every keyframe, not left undefined.
    expect(fov.track.keyframes[0].value).toBe(40);
    expect(fov.track.keyframes[1].value).toBe(50);
  });

  it("rejects invalid ids, timing and poses", () => {
    const base = { fps: FPS, durationFrames: 60, keyframes: KEYFRAMES };
    expect(() => createCameraRig3D({ id: " ", ...base })).toThrow(/Cannot create 3D camera rig/);
    expect(() => createCameraRig3D({ id: "x", ...base, durationFrames: 0 })).toThrow(/positive integer duration/);
    expect(() => createCameraRig3D({ id: "x", ...base, fps: { num: 30, den: 0 } })).toThrow(/positive integer rational FPS/);
    expect(() => createCameraRig3D({ id: "x", ...base, keyframes: [{ ...KEYFRAMES[1], frame: 5 }] })).toThrow(/initial pose at frame 0/);
    expect(() => createCameraRig3D({
      id: "x", ...base,
      keyframes: [
        { frame: 0, target: [0, 0, 0], distance: 10, azimuth: 0, elevation: 0 },
        { frame: 0, target: [0, 0, 0], distance: 10, azimuth: 10, elevation: 0 },
      ],
    })).toThrow(/Invalid pose/);
    expect(() => createCameraRig3D({
      id: "x", ...base,
      keyframes: [{ frame: 0, target: [0, 0] as unknown as CameraPoint3D, distance: 10, azimuth: 0, elevation: 0 }],
    })).toThrow(/Invalid pose/);
    expect(() => createCameraRig3D({
      id: "x", ...base,
      keyframes: [{ frame: 0, target: [0, 0, 0], distance: 0, azimuth: 0, elevation: 0 }],
    })).toThrow(/Invalid pose/);
    expect(() => createCameraRig3D({
      id: "x", ...base,
      keyframes: [{ frame: 0, target: [0, 0, 0], distance: 10, azimuth: 0, elevation: 90 }],
    })).toThrow(/Invalid pose/);
    expect(() => createCameraRig3D({
      id: "x", ...base,
      keyframes: [{ frame: 0, target: [0, 0, 0], distance: 10, azimuth: 0, elevation: 0, fov: 4 }],
    })).toThrow(/Invalid pose/);
  });
});

describe("evaluateCameraRig3D — spherical math", () => {
  it("resolves orbit, dolly and lens channels deterministically", () => {
    const timeline = rigTimeline();
    const start = evaluateCameraRig3D(timeline, 0);
    expect(start.target).toEqual([0, 0, 0]);
    expect(start.position.map((value) => Math.round(value * 1e6) / 1e6)).toEqual([0, 0, 10]);
    expect(start.fov).toBe(40);
    expect(start.roll).toBe(0);

    const moved = evaluateCameraRig3D(timeline, 30);
    expect(moved.position[0]).toBeCloseTo(10 * Math.cos(Math.PI / 6), 9);
    expect(moved.position[1]).toBeCloseTo(5, 9);
    expect(moved.position[2]).toBeCloseTo(0, 9);
    expect(moved.fov).toBe(50);
    expect(moved.roll).toBe(5);
  });

  it("clamps out-of-range frames and rejects invalid frames", () => {
    const timeline = rigTimeline();
    expect(evaluateCameraRig3D(timeline, -1)).toEqual(evaluateCameraRig3D(timeline, 0));
    expect(evaluateCameraRig3D(timeline, 100)).toEqual(evaluateCameraRig3D(timeline, 59));
    expect(() => evaluateCameraRig3D(timeline, 1.5)).toThrow(/finite integer frame/);
  });

  it("throws when the rig channels are absent", () => {
    const empty: MotionTimeline = { schemaVersion: 1, id: "empty", fps: FPS, durationFrames: 10, nodes: [] };
    expect(() => evaluateCameraRig3D(empty, 0)).toThrow(/missing or invalid channels/);
  });
});

describe("CameraViewport3D — mocked WebGL boundary", () => {
  it("renders an accessible canvas and reports the resolved frame", () => {
    const { container } = render(
      <CameraViewport3D timeline={rigTimeline()} frame={0} createScene={createScene} width={320} height={180} ariaLabel="Rig preview" />,
    );
    expect(screen.getByRole("img", { name: "Rig preview" })).toBeInTheDocument();
    expect(container.querySelector("[data-km-camera-viewport-3d]")).toHaveAttribute("data-camera-frame", "0");
  });

  it("resolves reduced motion to the final frame", () => {
    const { container } = render(
      <CameraViewport3D timeline={rigTimeline()} frame={0} createScene={createScene} width={320} height={180} reducedMotion ariaLabel="Rig preview" />,
    );
    expect(container.querySelector("[data-km-camera-viewport-3d]")).toHaveAttribute("data-camera-frame", "59");
  });

  it("surfaces a retryable error when the WebGL renderer cannot start", async () => {
    threeState.failRenderer = true;
    render(
      <CameraViewport3D timeline={rigTimeline()} frame={0} createScene={createScene} width={320} height={180} ariaLabel="Rig preview" />,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/3D preview unavailable/);
    expect(screen.getByRole("button", { name: "Retry 3D preview" })).toBeInTheDocument();
  });

  it("rejects invalid viewport dimensions before rendering", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<CameraViewport3D timeline={rigTimeline()} frame={0} createScene={createScene} width={0} height={180} ariaLabel="Rig preview" />),
    ).toThrow(/Invalid 3D viewport/);
    error.mockRestore();
  });
});
