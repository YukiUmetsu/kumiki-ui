import { describe, expect, it } from "vitest";
import { evaluateCharacter } from "../registry/character/evaluate";
import { insertPoseCorrection } from "../registry/character/authoring";
import { pipCharacter } from "../src/character/fixtures/pip";
import type { CharacterDefinition, CharacterInstance } from "../registry/character/definition";

const instance: CharacterInstance = { instanceId: "pip-1", characterId: "pip", revision: "r1", seed: 42, reducedMotion: true };

describe("frame correction playback", () => {
  it("applies only the selected part's local additive correction at the absolute frame", () => {
    const previous = evaluateCharacter(pipCharacter, instance, [], 10);
    const corrections = insertPoseCorrection({}, "arm-left", 10, { x: 18, rotation: 20 }, 5);
    const after = evaluateCharacter(pipCharacter, { ...instance, corrections }, [], 10);
    expect(after.parts["arm-left"].x - previous.parts["arm-left"].x).toBeCloseTo(18);
    expect(after.parts["arm-left"].rotation - previous.parts["arm-left"].rotation).toBeCloseTo(20);
    expect(after.parts["arm-right"]).toEqual(previous.parts["arm-right"]);
    expect(evaluateCharacter(pipCharacter, { ...instance, corrections }, [], 5).parts["arm-left"].x).toBe(previous.parts["arm-left"].x);
  });

  it("seeks deterministically even when intermediate frames are visited in reverse order", () => {
    const edited = { ...instance, corrections: insertPoseCorrection({}, "tail", 12, { rotation: 35 }, 8) };
    const at11 = evaluateCharacter(pipCharacter, edited, [], 11);
    evaluateCharacter(pipCharacter, edited, [], 20);
    evaluateCharacter(pipCharacter, edited, [], 0);
    expect(evaluateCharacter(pipCharacter, edited, [], 11)).toEqual(at11);
  });

  it("applies safety limits after editing rather than letting a drag override them", () => {
    const definition: CharacterDefinition = { ...pipCharacter, parts: pipCharacter.parts.map(part => part.id === "arm-left"
      ? { ...part, limits: { translate: { min: { x: -100, y: -100 }, max: { x: 30, y: 30 } } } }
      : part) };
    const edited = { ...instance, corrections: insertPoseCorrection({}, "arm-left", 10, { x: 1000 }, 5) };
    expect(evaluateCharacter(definition, edited, [], 10).parts["arm-left"].x).toBe(30);
  });

  it("diagnoses unknown and malformed tracks and leaves unaffected output finite", () => {
    const corrupted = { ...instance, corrections: { "missing-ear": [{ frame: 8, pose: { x: 3 } }], "arm-left": [{ frame: 8, pose: { rotation: NaN } }] } };
    const result = evaluateCharacter(pipCharacter, corrupted, [], 8);
    expect(result.diagnostics.map(item => item.code)).toContain("unknown-correction-part");
    expect(result.diagnostics.map(item => item.code)).toContain("invalid-correction-track");
    expect(Number.isFinite(result.parts["arm-left"].rotation)).toBe(true);
  });
});
