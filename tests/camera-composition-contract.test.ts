import { describe, expect, it } from "vitest";
import { compileCinematicCamera } from "../registry/motion/cinematic-camera-director";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";
import type { CameraSequenceSpec } from "../registry/motion/cinematic-camera-types";

const bounds = (x: number) => ({ min: [x - .1, -.1, -.1] as const, max: [x + .1, .1, .1] as const });
const registry = createCameraTargetRegistry({ revision: "moving", targets: [
  { id: "pulse", frames: [{ frame: 0, bounds: bounds(0) }, { frame: 29, bounds: bounds(10) }] },
  { id: "start", frames: [{ frame: 0, bounds: bounds(2) }] },
  { id: "end", frames: [{ frame: 0, bounds: bounds(8) }] },
] });
const sequence: CameraSequenceSpec = { schemaVersion: 1, id: "composition", title: "Composition", fps: { num: 30, den: 1 }, durationFrames: 30,
  output: { width: 1280, height: 720 }, shots: [{ id: "follow", type: "follow", target: "pulse", durationFrames: 30 }] };
const critical = { id: "visible", targetIds: ["pulse"], startFrame: 0, endFrame: 30 };
const tracking = { shotId: "follow", movingId: "pulse", fromId: "start", toId: "end", searchStart: 0, searchEnd: 30, proximity: .4, leadFrames: 2, tailFrames: 2 };
describe("CC1 composition contract integration", () => {
  it("keeps the existing two-argument compilation unchanged", () => {
    expect(compileCinematicCamera(sequence, registry).ok).toBe(true);
  });
  it("automatically checks every critical frame and the actual moving trajectory", () => {
    const result = compileCinematicCamera(sequence, registry, { criticalSubjects: [critical], tracking: [tracking] });
    expect(result.ok).toBe(true);
  });
  it("rejects an otherwise valid plan when critical subjects leave their safe region", () => {
    const result = compileCinematicCamera(sequence, registry, { criticalSubjects: [{ ...critical, safeRegion: { x: .9, y: .9, width: .05, height: .05 } }] });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.code === "target-outside-safe-area" && d.frame === 0)).toBe(true);
  });
  it("rejects missing critical IDs and invalid guard configuration as diagnostics", () => {
    expect(compileCinematicCamera(sequence, registry, { criticalSubjects: [{ ...critical, targetIds: ["missing"] }] }).ok).toBe(false);
    expect(compileCinematicCamera(sequence, registry, { criticalSubjects: [{ ...critical, safeRegion: { x: NaN, y: 0, width: 1, height: 1 } }] }).ok).toBe(false);
  });
  it("rejects a named shot which does not follow the moving semantic subject", () => {
    const wrong = { ...sequence, shots: [{ ...sequence.shots[0], type: "establish" as const, target: "start" }] };
    const result = compileCinematicCamera(wrong, registry, { tracking: [tracking] });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.code === "camera-tracking-unsatisfied")).toBe(true);
  });
  it("rejects uncovered tracking windows after a choreography timing change", () => {
    const late: CameraSequenceSpec = { ...sequence, shots: [
      { id: "opening", type: "establish", target: "start", durationFrames: 10 },
      { ...sequence.shots[0], durationFrames: 20 },
    ] };
    expect(compileCinematicCamera(late, registry, { tracking: [tracking] }).ok).toBe(false);
  });
});

it("rejects stale geometry before a guarded precompiled plan is previewed", async () => {
  const { inspectCameraComposition } = await import("../registry/visual/camera-composition");
  const result = compileCinematicCamera(sequence, registry);
  if (!result.ok) throw new Error("Expected a valid baseline camera");
  expect(inspectCameraComposition(result.plan, { ...registry, revision: "changed" }, {})).toMatchObject([{ code: "camera-target-revision" }]);
});

it("includes the destination arrival frame when the tracking tail is zero", async () => {
  const { deriveSemanticTrackingWindow } = await import("../registry/visual/camera-constraints");
  const window = deriveSemanticTrackingWindow(registry, { ...tracking, tailFrames: 0 });
  expect(window.ok).toBe(true);
  if (window.ok) expect(window.endFrame).toBeGreaterThan(window.toArrival);
});
