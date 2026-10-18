import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";
import { createThreeCameraTargets } from "../registry/motion/camera-targets-three";
import { prepareCameraPath, interpolateCameraPose, projectCameraBounds } from "../registry/motion/camera-spatial";
import { compileCinematicCamera, parseCameraSequence, serializeCameraSequence } from "../registry/motion/cinematic-camera-director";
import { evaluateCameraPose3D } from "../registry/motion/camera-pose-3d";
import type { CameraSequenceSpec, CinematicCameraPose } from "../registry/motion/cinematic-camera-types";
import { createCameraReference } from "../src/motion/cinematic-camera-scene";
import { CAMERA_SHOT_RECIPES } from "../registry/motion/camera-shot-recipes";

const bounds = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
const targets = () => createCameraTargetRegistry({ revision: "test-1", targets: [{ id: "subject", frames: [{ frame: 0, bounds }] }] });
const sequence = (overrides: Partial<CameraSequenceSpec> = {}): CameraSequenceSpec => ({
  schemaVersion: 1, id: "study", title: "A subject", fps: { num: 30, den: 1 }, durationFrames: 60,
  output: { width: 1280, height: 720 }, shots: [{ id: "wide", type: "establish", target: "subject", durationFrames: 60 }], ...overrides,
});
const pose: CinematicCameraPose = { position: [0, 0, 8], orientation: [0, 0, 0, 1], focus: [0, 0, 0], projection: { kind: "perspective", fov: 40 }, near: 0.05, far: 200, focusDistance: 8 };

describe("camera targets and trajectory math", () => {
  it("retains exact target matrices and interpolates scale and quaternion rotation", () => {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .8);
    const matrix = new Matrix4().compose(new Vector3(2, 3, 4), rotation, new Vector3(2, 3, 4)).toArray();
    const registry = createCameraTargetRegistry({ revision: "trs", targets: [{ id: "subject", frames: [{ frame: 0, bounds, worldMatrix: matrix }, { frame: 10, bounds, worldMatrix: matrix }] }] });
    expect(registry.sample("subject", 10).worldMatrix).toEqual(matrix);
    registry.sample("subject", 5).worldMatrix.forEach((v, i) => expect(v).toBeCloseTo(matrix[i], 10));
    expect(registry.sample("subject", 5).orientation[1]).toBeCloseTo(rotation.y);
  });
  it("casts projection-correct parallel visibility rays for orthographic cameras", () => {
    const root = new Group(), geometry = new BoxGeometry(2, 2, 2), blockerGeometry = new BoxGeometry(.2, 4, .2), material = new MeshBasicMaterial();
    const subject = new Mesh(geometry, material), blocker = new Mesh(blockerGeometry, material); blocker.position.set(1, 0, 5); root.add(subject, blocker);
    const registry = createThreeCameraTargets({ revision: "visibility", root, targets: [{ id: "subject", object: subject }], updateFrame() {}, occluders: [blocker] });
    const camera = { ...pose, position: [0, 0, 10] as const, projection: { kind: "orthographic" as const, scale: 4 } };
    expect(registry.visibility!(camera, registry.sample("subject", 0), 0)).toBeCloseTo(5 / 9);
    geometry.dispose(); blockerGeometry.dispose(); material.dispose();
  });
  it("samples moving world bounds in arbitrary order and rejects duplicate IDs", () => {
    const registry = createCameraTargetRegistry({ revision: "moving", targets: [{ id: "subject", frames: [{ frame: 0, bounds }, { frame: 10, bounds: { min: [9, -1, -1], max: [11, 1, 1] } }] }] });
    const middle = registry.sample("subject", 5);
    expect(middle.focus).toEqual([5, 0, 0]);
    registry.sample("subject", 9);
    expect(registry.sample("subject", 5)).toEqual(middle);
    expect(() => registry.sample("absent", 0)).toThrow(/absent/);
    expect(() => createCameraTargetRegistry({ revision: "x", targets: [{ id: "a", frames: [{ frame: 0, bounds }] }, { id: "a", frames: [{ frame: 0, bounds }] }] })).toThrow(/unique/);
  });
  it("resolves actual Three world bounds after an absolute-frame parent update", () => {
    const root = new Group(), parent = new Group();
    const geometry = new BoxGeometry(2, 2, 2), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    parent.add(mesh); root.add(parent);
    const registry = createThreeCameraTargets({ revision: "world", root, targets: [{ id: "subject", object: mesh }], updateFrame: frame => { parent.position.x = frame; } });
    expect(registry.sample("subject", 12).bounds.min[0]).toBeCloseTo(11);
    expect(registry.sample("subject", 3).focus[0]).toBeCloseTo(3);
    geometry.dispose(); material.dispose();
  });
  it("uses quaternion shortest-arc interpolation, including antipodes", () => {
    const next = { ...pose, orientation: [0, 1, 0, 0] as const };
    const middle = interpolateCameraPose(pose, next, 0.5);
    expect(Math.hypot(...middle.orientation)).toBeCloseTo(1, 10);
    expect(Math.abs(middle.orientation[1])).toBeCloseTo(Math.SQRT1_2, 8);
    expect(interpolateCameraPose(pose, { ...pose, orientation: [0, 0, 0, -1] }, 0.5).orientation).toEqual(pose.orientation);
  });
  it("samples cubic and Catmull-Rom paths with arc-length traversal", () => {
    for (const kind of ["bezier", "catmull-rom"] as const) {
      const path = prepareCameraPath({ kind, points: [[0, 0, 0], [0, 2, 0], [2, 2, 0], [2, 0, 0]], arcLength: true });
      expect(path.point(0)).toEqual([0, 0, 0]);
      expect(path.point(1)[0]).toBeCloseTo(2);
      expect(path.point(0.5).every(Number.isFinite)).toBe(true);
    }
  });
});

describe("cinematic planning through MG1", () => {
  it("never lets diagnostic truncation conceal hard failures", () => {
    const registry = { ...targets(), diagnostics: Array.from({ length: 256 }, () => ({ code: "warning", severity: "warning" as const, message: "A supplied warning" })) };
    const source = sequence({ shots: [{ id: "impossible", type: "establish", target: "subject", durationFrames: 60, constraints: [{ id: "far-away", kind: "distance", strength: "hard", priority: 100, min: 1000, max: 1001 }] }] });
    const result = compileCinematicCamera(source, registry);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.severity === "error")).toBe(true);
  });
  it("rejects aspect-key injection, timing cycles and overlapping shots", () => {
    const source = sequence();
    const injected = { ...source, shots: [{ ...source.shots[0], aspects: { "16:9": { transition: { kind: "continuous", durationFrames: 0 } } } }] };
    expect(compileCinematicCamera(injected, targets()).ok).toBe(false);
    for (const shots of [
      [{ id: "a", type: "establish" as const, target: "subject", durationFrames: 30, at: { ref: "b" } }, { id: "b", type: "orbit" as const, target: "subject", durationFrames: 30, at: { ref: "a" } }],
      [{ id: "a", type: "establish" as const, target: "subject", durationFrames: 40 }, { id: "b", type: "orbit" as const, target: "subject", durationFrames: 40, at: 20 }],
    ]) expect(compileCinematicCamera(sequence({ shots }), targets()).ok).toBe(false);
  });
  it("selects consistent shot-wide corrections and respects soft priorities", () => {
    const registry = { ...targets(), visibility: (camera: CinematicCameraPose, _target: unknown, frame: number) => frame < 30 || Math.hypot(...camera.position) > 11 ? 1 : 0 };
    const source = sequence({ shots: [{ id: "hold", type: "establish", target: "subject", movement: "hold", durationFrames: 60, constraints: [
      { id: "visible", kind: "occlusion", strength: "soft", priority: 100, minimumVisible: 1 },
      { id: "close", kind: "distance", strength: "soft", priority: 1, min: 0, max: 9 },
    ] }] });
    const result = compileCinematicCamera(source, registry);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(evaluateCameraPose3D(result.plan.timeline, 0).position).toEqual(evaluateCameraPose3D(result.plan.timeline, 59).position);
    expect(Math.hypot(...evaluateCameraPose3D(result.plan.timeline, 30).position)).toBeGreaterThan(11);
    expect(result.diagnostics.some(d => d.constraintId === "close")).toBe(true);
  });
  it("fails swept collision paths and unavailable C1 instead of claiming safety", () => {
    const registry = { ...targets(), obstacles: () => [{ id: "wall", bounds: { min: [-10, -10, 6] as const, max: [10, 10, 7] as const } }] };
    const source = sequence({ shots: [{ id: "travel", type: "dolly", target: "subject", durationFrames: 60, overrides: { position: [0, 0, 12], endPosition: [0, 0, 5] } }] });
    const result = compileCinematicCamera(source, registry);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.message.includes("obstacle"))).toBe(true);
    const c1 = compileCinematicCamera(sequence({ shots: [{ id: "a", type: "orbit", target: "subject", durationFrames: 30, holdFrames: 0 }, { id: "b", type: "inspect", target: "subject", durationFrames: 30, transition: { kind: "continuous", continuity: "C1" } }] }), targets());
    expect(c1.ok).toBe(false);
    expect(c1.diagnostics.some(d => d.code === "camera-c1-unavailable")).toBe(true);
  });
  it("compiles every recipe, and supports end-only optical and spatial overrides", () => {
    for (const type of CAMERA_SHOT_RECIPES) {
      const result = compileCinematicCamera(sequence({ shots: [{ id: type, type, target: "subject", durationFrames: 60, path: type === "fly-through" ? { kind: "linear", points: [[0, 3, 12], [0, 3, 8]] } : undefined, orientAlongPath: false }] }), targets());
      expect(result.ok, `${type}: ${JSON.stringify(result.diagnostics)}`).toBe(true);
    }
    const result = compileCinematicCamera(sequence({ shots: [{ id: "partial", type: "dolly", target: "subject", durationFrames: 60, overrides: { endPosition: [0, 0, 10], endFov: 55, endFocusDistance: 3 } }] }), targets());
    expect(result.ok).toBe(true);
    if (result.ok) expect(evaluateCameraPose3D(result.plan.timeline, 59)).toMatchObject({ position: [0, 0, 10], projection: { fov: 55 }, focusDistance: 3 });
  });
  it("compiles the full reference through MotionDirector in three aspect ratios", () => {
    for (const aspect of ["landscape", "portrait", "square"] as const) {
      const result = createCameraReference(aspect);
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (result.ok) console.info(aspect, Math.round(result.compilationMs), result.plan.stats, result.diagnostics.length);
    }
  }, 30_000);
  it("frames the actual projected box in landscape and portrait", () => {
    for (const output of [{ width: 1280, height: 720 }, { width: 720, height: 1280 }, { width: 800, height: 800 }]) {
      const result = compileCinematicCamera(sequence({ output }), targets());
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) return;
      const camera = evaluateCameraPose3D(result.plan.timeline, 30);
      const projected = projectCameraBounds(camera, bounds, output.width / output.height);
      expect(projected.rect.x).toBeGreaterThanOrEqual(0.075);
      expect(projected.rect.y).toBeGreaterThanOrEqual(0.075);
      expect(projected.rect.x + projected.rect.width).toBeLessThanOrEqual(0.925);
      expect(projected.rect.y + projected.rect.height).toBeLessThanOrEqual(0.925);
    }
  });
  it("tracks a moving subject and retains exact continuous boundary poses", () => {
    const registry = createCameraTargetRegistry({ revision: "moving", targets: [{ id: "subject", frames: [{ frame: 0, bounds }, { frame: 59, bounds: { min: [5, -1, -1], max: [7, 1, 1] } }] }] });
    const result = compileCinematicCamera(sequence({ shots: [
      { id: "a", type: "follow", target: "subject", durationFrames: 30 },
      { id: "b", type: "orbit", target: "subject", durationFrames: 30, transition: { kind: "continuous", durationFrames: 8, allowPartialFraming: true } },
    ] }), registry);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(evaluateCameraPose3D(result.plan.timeline, 29)).toEqual(evaluateCameraPose3D(result.plan.timeline, 30));
    expect(evaluateCameraPose3D(result.plan.timeline, 20).focus[0]).toBeGreaterThan(evaluateCameraPose3D(result.plan.timeline, 0).focus[0]);
    const values = [0, 12, 29, 30, 31, 45, 59].map(f => evaluateCameraPose3D(result.plan.timeline, f));
    [59, 45, 31, 30, 29, 12, 0].forEach((f, i) => expect(evaluateCameraPose3D(result.plan.timeline, f)).toEqual(values[values.length - i - 1]));
  });
  it("honors orthographic projection and serializable manual overrides", () => {
    const source = sequence({ shots: [{ id: "ortho", type: "establish", target: "subject", durationFrames: 60, projection: "orthographic", overrides: { position: [0, 0, 10], orientation: [0, 0, 0, 1], orthographicScale: 5 } }] });
    const restored = parseCameraSequence(serializeCameraSequence(source));
    expect(restored.ok).toBe(true);
    const result = compileCinematicCamera(source, targets());
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (result.ok) expect(evaluateCameraPose3D(result.plan.timeline, 25)).toMatchObject({ position: [0, 0, 10], projection: { kind: "orthographic", scale: 5 } });
  });
  it("fails missing targets, impossible manual framing and invalid schemas", () => {
    expect(compileCinematicCamera(sequence({ shots: [{ id: "a", type: "orbit", target: "absent", durationFrames: 60 }] }), targets()).ok).toBe(false);
    expect(compileCinematicCamera(sequence({ shots: [{ id: "a", type: "inspect", target: "subject", durationFrames: 60, overrides: { position: [0, 0, 0] } }] }), targets()).ok).toBe(false);
    expect(compileCinematicCamera({ schemaVersion: 7 }, targets()).ok).toBe(false);
  });
});
