/**
 * `camera-stage` — the 2D SVG camera choreography (`camera.ts`) and its frame-
 * driven adapter (`camera-stage.tsx`).
 *
 * The pure half pins timeline validation, rational/degree conversion, subject
 * fitting and the deterministic affine projection (including reversed roll).
 * The React half pins the accessible SVG viewport, the world transform, the
 * screen-space overlay and reduced-motion resolution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  createCameraTimeline,
  evaluateCamera,
  frameCameraSubject,
} from "../registry/motion/camera";
import type { CameraKeyframe } from "../registry/motion/camera";
import { CameraStage } from "../registry/motion/camera-stage";
import type { MotionTimeline } from "../registry/motion/types";

const FPS = { num: 30, den: 1 };
const VIEWPORT = { width: 200, height: 100 };

const KEYFRAMES: readonly CameraKeyframe[] = [
  { frame: 0, center: { x: 0, y: 0 }, zoom: 1 },
  { frame: 30, center: { x: 100, y: 50 }, zoom: 2, roll: 90 },
  { frame: 59, center: { x: 100, y: 50 }, zoom: 2, roll: 90 },
];

function cameraTimeline(): MotionTimeline {
  return createCameraTimeline({ id: "camera-study", fps: FPS, durationFrames: 60, keyframes: KEYFRAMES });
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("createCameraTimeline — compilation and validation", () => {
  it("compiles center, zoom and roll tracks and converts degrees to radians", () => {
    const timeline = cameraTimeline();
    expect(timeline.nodes.map((node) => node.id)).toEqual(["camera-center", "camera-zoom", "camera-roll"]);
    const roll = timeline.nodes.find((node) => node.id === "camera-roll");
    if (roll?.kind !== "track") throw new Error("expected roll track");
    expect(roll.track.valueType).toBe("angle");
    expect(roll.track.keyframes[1].value).toBeCloseTo(Math.PI / 2, 9);
  });

  it("marks cut keyframes as step-end", () => {
    const timeline = createCameraTimeline({
      id: "cut", fps: FPS, durationFrames: 30,
      keyframes: [
        { frame: 0, center: { x: 0, y: 0 }, zoom: 1 },
        { frame: 10, center: { x: 5, y: 5 }, zoom: 1, cut: true },
      ],
    });
    const center = timeline.nodes.find((node) => node.id === "camera-center");
    if (center?.kind !== "track") throw new Error("expected center track");
    expect(center.track.keyframes[1].easing).toBe("step-end");
  });

  it("rejects invalid duration, fps and keyframe sequences", () => {
    const kf = KEYFRAMES;
    expect(() => createCameraTimeline({ id: "x", fps: FPS, durationFrames: 0, keyframes: kf })).toThrow(/positive integer durationFrames/);
    expect(() => createCameraTimeline({ id: "x", fps: { num: 0, den: 1 }, durationFrames: 60, keyframes: kf })).toThrow(/positive integer fps/);
    expect(() => createCameraTimeline({ id: "x", fps: FPS, durationFrames: 60, keyframes: [] })).toThrow(/initial keyframe at frame 0/);
    expect(() => createCameraTimeline({
      id: "x", fps: FPS, durationFrames: 60,
      keyframes: [{ frame: 5, center: { x: 0, y: 0 }, zoom: 1 }],
    })).toThrow(/initial keyframe at frame 0/);
    expect(() => createCameraTimeline({
      id: "x", fps: FPS, durationFrames: 60,
      keyframes: [
        { frame: 0, center: { x: 0, y: 0 }, zoom: 1 },
        { frame: 0, center: { x: 1, y: 1 }, zoom: 1 },
      ],
    })).toThrow(/invalid frame/);
    expect(() => createCameraTimeline({
      id: "x", fps: FPS, durationFrames: 60,
      keyframes: [{ frame: 0, center: { x: 0, y: 0 }, zoom: 0 }],
    })).toThrow(/zoom greater than zero/);
    expect(() => createCameraTimeline({
      id: "x", fps: FPS, durationFrames: 60,
      keyframes: [{ frame: 0, center: { x: Number.NaN, y: 0 }, zoom: 1 }],
    })).toThrow(/finite center/);
  });
});

describe("frameCameraSubject — fitting", () => {
  const subject = { x: 0, y: 0, width: 100, height: 50 };

  it("fits the subject with a safe inset and reports its center", () => {
    const pose = frameCameraSubject(subject, VIEWPORT, { padding: 0.1 });
    expect(pose.center).toEqual({ x: 50, y: 25 });
    expect(pose.zoom).toBeCloseTo(1.6, 9);
    expect(pose.roll).toBe(0);
  });

  it("accounts for roll when computing the fit", () => {
    const pose = frameCameraSubject(subject, VIEWPORT, { padding: 0.1, roll: 90 });
    // A rolled 100x50 subject needs a 50x100 bounding box, so height limits the fit.
    expect(pose.zoom).toBeCloseTo(0.8, 9);
    expect(pose.roll).toBe(90);
  });

  it("rejects invalid dimensions and padding", () => {
    expect(() => frameCameraSubject(subject, VIEWPORT, { padding: 0.5 })).toThrow(/padding from 0/);
    expect(() => frameCameraSubject({ ...subject, width: 0 }, VIEWPORT)).toThrow(/finite positive subject/);
    expect(() => frameCameraSubject(subject, { width: 200, height: 0 })).toThrow(/finite positive subject/);
  });
});

describe("evaluateCamera — deterministic projection", () => {
  it("projects the world center to the output center at frame 0", () => {
    const { pose, matrix } = evaluateCamera(cameraTimeline(), 0, VIEWPORT);
    expect(pose).toEqual({ center: { x: 0, y: 0 }, zoom: 1, roll: 0 });
    expect(matrix.a).toBeCloseTo(1, 9);
    expect(matrix.b).toBeCloseTo(0, 9);
    expect(matrix.d).toBeCloseTo(1, 9);
    expect(matrix.e).toBeCloseTo(100, 9);
    expect(matrix.f).toBeCloseTo(50, 9);
  });

  it("reverses camera roll in the world transform", () => {
    const { pose, matrix } = evaluateCamera(cameraTimeline(), 30, VIEWPORT);
    expect(pose.roll).toBeCloseTo(90, 9);
    expect(matrix.a).toBeCloseTo(0, 6);
    expect(matrix.b).toBeCloseTo(-2, 6);
    expect(matrix.c).toBeCloseTo(2, 6);
    expect(matrix.d).toBeCloseTo(0, 6);
    expect(matrix.e).toBeCloseTo(0, 6);
    expect(matrix.f).toBeCloseTo(250, 6);
  });

  it("clamps out-of-range frames and rejects invalid inputs", () => {
    expect(evaluateCamera(cameraTimeline(), 999, VIEWPORT).pose).toEqual(evaluateCamera(cameraTimeline(), 59, VIEWPORT).pose);
    expect(evaluateCamera(cameraTimeline(), -5, VIEWPORT).pose).toEqual(evaluateCamera(cameraTimeline(), 0, VIEWPORT).pose);
    expect(() => evaluateCamera(cameraTimeline(), 1.5, VIEWPORT)).toThrow(/finite integer frame/);
    expect(() => evaluateCamera(cameraTimeline(), 0, { width: 0, height: 100 })).toThrow(/positive finite output/);
  });

  it("throws when the pose channels are absent", () => {
    const empty: MotionTimeline = { schemaVersion: 1, id: "empty", fps: FPS, durationFrames: 10, nodes: [] };
    expect(() => evaluateCamera(empty, 0, VIEWPORT)).toThrow(/cannot resolve its pose/);
  });
});

describe("CameraStage — accessible SVG viewport", () => {
  it("applies the world transform and exposes the resolved frame", () => {
    const { container } = render(
      <CameraStage timeline={cameraTimeline()} frame={0} width={200} height={100} ariaLabel="Camera scene">
        <rect width={10} height={10} />
      </CameraStage>,
    );
    const svg = screen.getByRole("img", { name: "Camera scene" });
    expect(svg).toHaveAttribute("viewBox", "0 0 200 100");
    expect(svg).toHaveAttribute("data-camera-frame", "0");
    const world = container.querySelector("[data-km-camera-world]");
    expect(world).toHaveAttribute("transform", "matrix(1 0 0 1 100 50)");
    expect(container.querySelector("[data-km-camera-overlay]")).toBeNull();
  });

  it("renders a screen-space overlay when supplied", () => {
    const { container } = render(
      <CameraStage
        timeline={cameraTimeline()}
        frame={30}
        width={200}
        height={100}
        ariaLabel="Camera scene"
        overlay={<text>Fixed</text>}
      />,
    );
    expect(container.querySelector("[data-km-camera-overlay]")).not.toBeNull();
    expect(screen.getByText("Fixed")).toBeInTheDocument();
  });

  it("resolves reduced motion to the final frame", () => {
    render(
      <CameraStage timeline={cameraTimeline()} frame={0} width={200} height={100} reducedMotion ariaLabel="Camera scene" />,
    );
    expect(screen.getByRole("img", { name: "Camera scene" })).toHaveAttribute("data-camera-frame", "59");
  });
});
