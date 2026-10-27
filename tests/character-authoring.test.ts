import { describe, expect, it } from "vitest";
import { applyMatrixToPoint, multiplyMatrix, rotationMatrix, scaleMatrix } from "../registry/motion/matrix";
import { partLocalMatrix } from "../registry/character/evaluate";
import { insertPoseCorrection, moveCharacterJoint, moveCharacterRest, samplePoseCorrection, worldDragToParentDelta } from "../registry/character/authoring";
import type { CharacterPart } from "../registry/character/definition";

const arm: CharacterPart = { id: "arm", channel: "arms", asset: "arm", pivot: { x: 0, y: 0 }, rest: { x: 20, y: 5, rotation: 90, scaleX: 1, scaleY: 1 }, z: 5 };

describe("character rig authoring", () => {
  it("relocates a rotated shoulder pivot without jumping the source art", () => {
    const changed = moveCharacterJoint(arm, { x: 10, y: 0 });
    const before = partLocalMatrix(arm, { x: 20, y: 5, rotation: 90, scaleX: 1, scaleY: 1 });
    const after = partLocalMatrix(changed, { x: changed.rest!.x!, y: changed.rest!.y!, rotation: 90, scaleX: 1, scaleY: 1 });
    expect(applyMatrixToPoint(after, { x: 30, y: 12 })).toEqual(applyMatrixToPoint(before, { x: 30, y: 12 }));
    expect(changed.pivot).toEqual({ x: 10, y: 0 });
    expect(changed.rest).toMatchObject({ x: 10, y: 15 });
    expect(arm.pivot).toEqual({ x: 0, y: 0 });
  });

  it("moves a part rest without modifying its joint or source definition", () => {
    expect(moveCharacterRest(arm, { x: 31, y: 18 }).rest).toMatchObject({ x: 31, y: 18, rotation: 90 });
    expect(arm.rest!.x).toBe(20);
  });

  it("converts world dragging through a rotated and scaled parent", () => {
    const parent = multiplyMatrix(scaleMatrix(2, 2), rotationMatrix(Math.PI / 2));
    const local = worldDragToParentDelta({ x: 0, y: 20 }, parent);
    expect(local.x).toBeCloseTo(10);
    expect(local.y).toBeCloseTo(0);
  });

  it("rejects a collapsed parent transform rather than moving the joint unpredictably", () => {
    expect(() => worldDragToParentDelta({ x: 10, y: 0 }, scaleMatrix(0, 1))).toThrow(/singular/i);
  });
});

describe("pose correction tracks", () => {
  it("blends smoothly into an edited frame and back out at the influence boundary", () => {
    const tracks = insertPoseCorrection({}, "arm", 10, { x: 20, rotation: 60 }, 5);
    expect(samplePoseCorrection(tracks, "arm", 5)).toEqual({ x: 0, rotation: 0 });
    expect(samplePoseCorrection(tracks, "arm", 10)).toEqual({ x: 20, rotation: 60 });
    expect(samplePoseCorrection(tracks, "arm", 15)).toEqual({ x: 0, rotation: 0 });
    expect(samplePoseCorrection(tracks, "arm", 7.5).x).toBe(10);
    expect(samplePoseCorrection(tracks, "arm", 3).x).toBe(0);
    expect(samplePoseCorrection(tracks, "arm", 18).x).toBe(0);
  });

  it("keeps frame zero valid and replaces an existing key without duplicate frames", () => {
    const first = insertPoseCorrection({}, "arm", 0, { rotation: 10 }, 4);
    const revised = insertPoseCorrection(first, "arm", 0, { rotation: 22 }, 4);
    expect(revised.arm.map(key => key.frame)).toEqual([0, 4]);
    expect(samplePoseCorrection(revised, "arm", 0).rotation).toBe(22);
    expect(first.arm[0].pose.rotation).toBe(10);
  });

  it("preserves older edits outside a new influence window", () => {
    const old = insertPoseCorrection({}, "arm", 10, { x: 20 }, 5);
    const newer = insertPoseCorrection(old, "arm", 30, { x: 40 }, 5);
    expect(samplePoseCorrection(newer, "arm", 10).x).toBe(20);
    expect(samplePoseCorrection(newer, "arm", 20).x).toBe(0);
    expect(samplePoseCorrection(newer, "arm", 30).x).toBe(40);
  });

  it("rejects non-finite values and invalid frame windows", () => {
    expect(() => insertPoseCorrection({}, "arm", NaN, { x: 10 }, 3)).toThrow(/frame/i);
    expect(() => insertPoseCorrection({}, "arm", 3, { x: Infinity }, 3)).toThrow(/finite/i);
    expect(() => insertPoseCorrection({}, "arm", 3, { x: 1 }, 0)).toThrow(/radius/i);
  });
});
