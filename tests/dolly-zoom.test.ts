import { describe, expect, it } from "vitest";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";
import { compileCinematicCamera } from "../registry/motion/cinematic-camera-director";
import { evaluateCameraPose3D } from "../registry/motion/camera-pose-3d";
import { projectCameraBounds } from "../registry/motion/camera-spatial";
import type { CameraSequenceSpec } from "../registry/motion/cinematic-camera-types";
import { CAR_BODY, dollyZoomAt, inspectTrackPass, trackPassState } from "../registry/visual/race-shots";
import type { TrackPassSpec } from "../registry/visual/race-shots";

type Vec3 = readonly [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
/** The square root of the width × height that `points` cover through a pinhole camera at `pose`, as a share of the frame's height. */
function outlineCover(pose: { position: Vec3; target: Vec3; fov: number }, points: Vec3[]): number {
  const f = unit(sub(pose.target, pose.position)), r = unit(cross(f, [0, 1, 0])), u = cross(r, f);
  const xs = points.map(p => dot(sub(p, pose.position), r) / dot(sub(p, pose.position), f)), ys = points.map(p => dot(sub(p, pose.position), u) / dot(sub(p, pose.position), f));
  return Math.sqrt((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (2 * Math.tan(pose.fov * Math.PI / 360));
}

const bounds = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
const registry = () => createCameraTargetRegistry({ revision: "dz", targets: [{ id: "subject", frames: [{ frame: 0, bounds }] }] });
const sequence = (shot: Partial<CameraSequenceSpec["shots"][number]> = {}): CameraSequenceSpec => ({ schemaVersion: 1, id: "dz", title: "Dolly zoom", fps: { num: 30, den: 1 }, durationFrames: 60,
  output: { width: 1280, height: 720 }, shots: [{ id: "pull-back", type: "dolly-zoom", target: "subject", durationFrames: 60, holdFrames: 0, ...shot }] });

describe("dolly zoom", () => {
  it("sweeps the lens and moves the camera so the subject keeps its size (cinematic camera)", () => {
    const result = compileCinematicCamera(sequence(), registry());
    if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n"));
    const start = evaluateCameraPose3D(result.plan.timeline, 0), end = evaluateCameraPose3D(result.plan.timeline, 59);
    expect(start.projection).toMatchObject({ fov: 20 });
    expect(end.projection).toMatchObject({ fov: 60 });
    // A wider lens, much closer: the distance falls by about tan(10°) / tan(30°).
    const distance = (p: typeof start) => Math.hypot(...p.position);
    expect(distance(end) / distance(start)).toBeLessThan(.45);
    const height = (p: typeof start) => { const r = projectCameraBounds(p, bounds, 1280 / 720).rect; return r.height; };
    expect(height(end) / height(start)).toBeGreaterThan(.92);
    expect(height(end) / height(start)).toBeLessThan(1.08);
  });

  it("checks the lens sweep", () => {
    const codes = (shot: Partial<CameraSequenceSpec["shots"][number]>) => { const r = compileCinematicCamera(sequence(shot), registry()); return r.diagnostics.map(d => d.path ?? d.code); };
    expect(codes({ dollyZoom: { from: 20, to: 22 } }).some(p => String(p).includes("dollyZoom"))).toBe(true);
    expect(codes({ type: "establish", dollyZoom: { from: 20, to: 60 } }).some(p => String(p).includes("dollyZoom"))).toBe(true);
  });

  it("keeps the race car's outline the same size on screen while the follow camera's lens changes", () => {
    const spec: TrackPassSpec = { durationFrames: 90, passFrame: 45, camera: { mode: "follow", along: .6, side: 3.6, height: 1, fov: 60, lead: 0, shake: 0, dollyZoom: { to: 22 } } };
    expect(trackPassState(spec, 0, 30).pose.fov).toBe(60);
    expect(trackPassState(spec, 89, 30).pose.fov).toBeCloseTo(22, 6);
    // An outline given as a box's eight corners, measured here by its own projection: the square root of the width × height it covers.
    const corners: Vec3[] = [];
    for (const x of [-2.3, 2.3]) for (const y of [0, 1.25]) for (const z of [-.975, .975]) corners.push([x, y, z]);
    const body = { ...CAR_BODY, outline: Float32Array.from(corners.flat()) };
    const size = (frame: number) => { const s = trackPassState(spec, frame, 30, .34, undefined, body), points = corners.map(([x, y, z]) => [x + s.carX, y, z] as Vec3);
      return outlineCover(s.pose, points); };
    for (const frame of [30, 60, 89]) expect(Math.abs(size(frame) / size(0) - 1)).toBeLessThan(.002);
    expect(dollyZoomAt(spec, 89, 60).scale).toBeCloseTo(Math.tan(Math.PI / 6) / Math.tan(11 * Math.PI / 180), 6);
    expect(dollyZoomAt({ durationFrames: 90 }, 40, 26)).toEqual({ fov: 26, scale: 1 });
  });

  it("refuses a dolly zoom the race camera cannot hold", () => {
    const codes = (camera: TrackPassSpec["camera"]) => inspectTrackPass({ durationFrames: 90, passFrame: 45, camera }).map(p => p.code);
    expect(codes({ mode: "trackside", dollyZoom: { to: 14 } })).toContain("race-dolly-zoom-mode");
    expect(codes({ mode: "follow", fov: 30, dollyZoom: { to: 120 } })).toContain("race-dolly-zoom-lens");
    expect(codes({ mode: "follow", fov: 30, dollyZoom: { to: 14, start: 80, end: 85 } })).toContain("race-dolly-zoom-frames");
    expect(codes({ mode: "follow", fov: 30, dollyZoom: { to: 28 } })).toContain("race-dolly-zoom-small");
  });
});
