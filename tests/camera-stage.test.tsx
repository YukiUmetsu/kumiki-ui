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
import { compileCutPlan, evaluateCutPlan, projectCutSubject } from "../registry/motion/cut-director";
import type { CutPlanSpec, CutScene } from "../registry/motion/cut-director";
import { CutStage } from "../registry/motion/cut-stage";
import { inspectSeekParity } from "../registry/visual/explainer-principles";

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

describe("CutDirector — shot plans with checked identity", () => {
  const output = { width: 900, height: 1600 };
  const scenes: CutScene[] = [
    { id: "street", subjects: { car: { x: 100, y: 100, width: 200, height: 200 }, sign: { x: 100, y: 500, width: 200, height: 120 } } },
    { id: "garage", subjects: { car: { x: 600, y: 300, width: 200, height: 200 }, tool: { x: 600, y: 700, width: 160, height: 160 } } },
  ];
  const fit = (scene: number, id: string, padding = 0.1) => frameCameraSubject(scenes[scene].subjects[id], output, { padding });
  const spec = (overrides: Partial<CutPlanSpec> = {}): CutPlanSpec => ({
    id: "plan", fps: FPS, output, scenes,
    shots: [
      { id: "wide", sceneId: "street", durationFrames: 60, subjectIds: ["car", "sign"], camera: { start: frameCameraSubject({ x: 100, y: 100, width: 200, height: 520 }, output) } },
      { id: "car-close", sceneId: "street", durationFrames: 40, subjectIds: ["car"], camera: { start: fit(0, "car") } },
      { id: "garage-car", sceneId: "garage", durationFrames: 50, subjectIds: ["car"], camera: { start: fit(1, "car"), end: frameCameraSubject({ x: 600, y: 300, width: 200, height: 560 }, output) } },
      { id: "tool", sceneId: "garage", durationFrames: 40, subjectIds: ["tool"], camera: { start: fit(1, "tool") } },
    ],
    transitions: [{ kind: "punch-in", durationFrames: 12 }, { kind: "match-cut", matchSubjectId: "car" }, { kind: "wipe", durationFrames: 10, axis: "left-to-right", reducedMotion: "dissolve" }],
    ...overrides,
  });

  it("compiles, lands a match cut exactly and evaluates any frame in any order", () => {
    const result = compileCutPlan(spec());
    expect(result.diagnostics).toEqual([]);
    if (!result.ok) return;
    const { plan } = result;
    expect(plan.durationFrames).toBe(190);
    expect(plan.transitions.map(t => [t.kind, t.startFrame, t.endFrame])).toEqual([["punch-in", 48, 60], ["match-cut", 100, 100], ["wipe", 150, 160]]);
    const before = evaluateCutPlan(plan, 99).layers[0], after = evaluateCutPlan(plan, 100).layers[0];
    expect(projectCutSubject(plan, after, "car")).toEqual(projectCutSubject(plan, before, "car"));
    // The punch-in arrives exactly at the incoming shot's framing.
    expect(evaluateCutPlan(plan, 60).layers[0].pose).toEqual(evaluateCutPlan(plan, 60, { transitions: "cuts" }).layers[0].pose);
    const wipe = evaluateCutPlan(plan, 155);
    expect(wipe.layers.map(l => [l.shotId, l.localFrame])).toEqual([["garage-car", 49], ["tool", 5]]);
    expect(wipe.layers[1].mask?.rect.width).toBeGreaterThan(0);
    for (const options of [{}, { transitions: "cuts" as const }, { reducedMotion: true }])
      expect(inspectSeekParity(() => f => evaluateCutPlan(plan, f, options), { durationFrames: 190, sampleCount: 50, seed: 2 }).ok).toBe(true);
  });

  it("disables transitions cleanly and applies reduced-motion fallbacks without changing timing", () => {
    const result = compileCutPlan(spec());
    if (!result.ok) throw new Error("plan should compile");
    const cuts = evaluateCutPlan(result.plan, 155, { transitions: "cuts" });
    expect(cuts.layers.map(l => l.shotId)).toEqual(["tool"]);
    expect(cuts.transition).toMatchObject({ kind: "cut", authoredKind: "wipe" });
    const reduced = evaluateCutPlan(result.plan, 155, { reducedMotion: true });
    expect(reduced.transition?.kind).toBe("dissolve");
    expect(reduced.layers[1].mask).toBeUndefined();
    expect(evaluateCutPlan(result.plan, 52, { reducedMotion: true }).transition?.kind).toBe("cut");
    // Reduced motion holds each shot's final framing: no camera movement inside a shot.
    expect(evaluateCutPlan(result.plan, 100, { reducedMotion: true }).layers[0].pose).toEqual(evaluateCutPlan(result.plan, 149, { reducedMotion: true }).layers[0].pose);
  });

  it("rejects identity jumps, misaligned matches, cropped subjects and overlong transitions", () => {
    const codes = (s: CutPlanSpec) => compileCutPlan(s).diagnostics.map(d => d.code);
    const base = spec();
    expect(codes({ ...base, transitions: [base.transitions[0], { kind: "punch-in", durationFrames: 8 }, base.transitions[2]] })).toContain("cut-identity-scene-change");
    expect(codes({ ...base, transitions: [base.transitions[0], { kind: "hold", durationFrames: 6 }, base.transitions[2]] })).toContain("cut-identity-scene-change");
    expect(codes({ ...base, shots: base.shots.map(s => s.id === "garage-car" ? { ...s, camera: { start: fit(1, "car", 0.3) } } : s) })).toContain("cut-match-misaligned");
    expect(codes({ ...base, transitions: [base.transitions[0], { kind: "match-cut" }, base.transitions[2]] })).toContain("cut-match-missing");
    expect(codes({ ...base, shots: base.shots.map(s => s.id === "car-close" ? { ...s, subjectIds: ["car", "sign"] } : s) })).toContain("cut-subject-unframed");
    expect(codes({ ...base, transitions: [base.transitions[0], base.transitions[1], { kind: "wipe", durationFrames: 45 }] })).toContain("cut-transition-too-long");
    expect(codes({ ...base, transitions: [{ kind: "cut", durationFrames: 4 }, base.transitions[1], base.transitions[2]] })).toContain("cut-transition-invalid");
  });

  it("renders layers, masks and the foreground occluder in CutStage", () => {
    const result = compileCutPlan(spec({ transitions: [{ kind: "punch-in", durationFrames: 12 }, { kind: "match-cut", matchSubjectId: "car" },
      { kind: "wipe", durationFrames: 10, foreground: { subjectId: "tool", widthFraction: 0.1 } }] }));
    if (!result.ok) throw new Error("plan should compile");
    const { container } = render(<CutStage plan={result.plan} frame={155} ariaLabel="Cuts" reducedMotion={false}
      renderScene={(sceneId, { localFrame }) => <text>{`${sceneId}@${localFrame}`}</text>}
      renderForeground={(id, rect) => <rect data-occluder={id} width={rect.width} height={rect.height} />} />);
    const svg = screen.getByRole("img", { name: "Cuts" });
    expect(svg).toHaveAttribute("data-cut-shot", "tool");
    expect(svg).toHaveAttribute("data-cut-transition", "wipe");
    expect([...container.querySelectorAll("[data-cut-layer]")].map(l => l.getAttribute("data-cut-layer"))).toEqual(["garage-car", "tool"]);
    expect(container.querySelector("clipPath")).not.toBeNull();
    expect(container.querySelector("[data-occluder=tool]")).not.toBeNull();
    expect(screen.getByText("garage@49")).toBeInTheDocument();
  });
});
