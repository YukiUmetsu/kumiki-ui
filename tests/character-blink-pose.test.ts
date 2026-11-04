import { describe, expect, it } from "vitest";
import { blinkAmount, evaluateCharacter } from "../registry/character/evaluate";
import { validateCharacterDefinition } from "../registry/character/validate";
import type { CharacterDefinition, CharacterInstance } from "../registry/character/definition";

const shape = { kind: "shape" as const, d: "M0 0h10v10H0z", fill: "#000000", width: 10, height: 10 };
const definition = {
  schemaVersion: 1, characterId: "lids", revision: "r1", mode: "puppet-2.5d", design: { width: 100, height: 100 },
  channels: ["head"], palette: {}, assets: { face: shape, lid: shape },
  parts: [
    { id: "head", channel: "head", asset: "face", pivot: { x: 5, y: 5 }, z: 0 },
    { id: "lid", parent: "head", channel: "head", asset: "lid", pivot: { x: 5, y: 0 }, rest: { scaleY: .02 }, z: 1 },
  ],
  poses: { neutral: {} }, basePose: "neutral", actions: {}, expressions: { default: "neutral", sets: { neutral: {} } },
  blink: { pose: { lid: { scaleY: 50 } }, intervalFrames: { min: 10, max: 10 }, durationFrames: 8 },
  capabilities: [],
} as unknown as CharacterDefinition;
const instance: CharacterInstance = { instanceId: "a", characterId: "lids", revision: "r1", seed: 1 };
const lidScale = (frame: number) => evaluateCharacter(definition, instance, [], frame).parts.lid.scaleY;

describe("lid-sweep blink", () => {
  it("validates with a pose and no variant", () => {
    const codes = validateCharacterDefinition(definition).filter(item => item.severity === "error").map(item => item.code);
    expect(codes.filter(code => code.startsWith("blink") || code === "unknown-part" || code === "unknown-variant")).toEqual([]);
  });
  it("rejects a blink with neither pose nor variant, and an unknown pose part", () => {
    const empty = { ...definition, blink: { intervalFrames: { min: 1, max: 1 }, durationFrames: 1 } } as CharacterDefinition;
    expect(validateCharacterDefinition(empty).map(item => item.code)).toContain("blink-empty");
    const ghost = { ...definition, blink: { ...definition.blink, pose: { nope: { scaleY: 2 } } } } as CharacterDefinition;
    expect(validateCharacterDefinition(ghost).map(item => item.code)).toContain("unknown-part");
  });
  it("eases closed, holds, eases open", () => {
    expect(blinkAmount(0)).toBe(0);
    expect(blinkAmount(.175)).toBeCloseTo(.5, 6);
    expect(blinkAmount(.5)).toBe(1);
    expect(blinkAmount(.825)).toBeCloseTo(.5, 6);
    expect(blinkAmount(1)).toBe(0);
  });
  it("sweeps the lid down and back over the blink, and rests open otherwise", () => {
    const open = lidScale(0);
    expect(open).toBeCloseTo(.02, 6);
    const during = Array.from({ length: 8 }, (_, i) => lidScale(10 + i));
    expect(Math.max(...during)).toBeCloseTo(.02 * 50, 3);
    expect(during[0]).toBeGreaterThan(open);
    expect(during[0]).toBeLessThan(during[2]);
    expect(during[7]).toBeLessThan(during[5]);
    expect(lidScale(18)).toBeCloseTo(open, 6);
  });
  it("gives the same lid at the same frame in any seek order", () => {
    const linear = Array.from({ length: 40 }, (_, frame) => lidScale(frame));
    for (const frame of [13, 2, 13, 39, 11]) expect(lidScale(frame)).toBe(linear[frame]);
  });
  it("keeps the lids open under reduced motion", () => {
    expect(evaluateCharacter(definition, { ...instance, reducedMotion: true }, [], 12).parts.lid.scaleY).toBeCloseTo(.02, 6);
  });
});
