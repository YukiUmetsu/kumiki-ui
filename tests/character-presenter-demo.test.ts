import { describe, expect, it } from "vitest";
import { evaluateCharacter } from "../registry/character/evaluate";
import { validateCharacterDefinition } from "../registry/character/validate";
import {
  actionFrames, approachScale, DEMO_LOOP_FRAMES, forwardWalkCues, loopOpacity,
  QUILL_BEAK_STAGES, quillBeakSweep, showcaseCues,
} from "../src/character/character-presenter-demo";
import { doctorQuillCharacter } from "../src/character/fixtures/doctor-quill";
import { pipCharacter } from "../src/character/fixtures/pip";
import type { CharacterInstance } from "../registry/character/definition";

const quill: CharacterInstance = { instanceId: "owl", characterId: "doctor-quill", revision: "r2", seed: 11, reducedMotion: true };
const pip: CharacterInstance = { instanceId: "squirrel", characterId: "pip", revision: "r1", seed: 27, reducedMotion: true };

describe("Character Presenter animation demonstrations", () => {
  it("drives all 25 registered Quill beak shapes without painting a second beak", () => {
    expect(QUILL_BEAK_STAGES).toHaveLength(25);
    expect(new Set(QUILL_BEAK_STAGES).size).toBe(25);
    const cues = quillBeakSweep(quill.instanceId);
    expect(cues).toHaveLength(49);
    for (const [index, variant] of QUILL_BEAK_STAGES.entries()) {
      const frame = index * 2;
      const state = evaluateCharacter(doctorQuillCharacter, quill, cues, frame);
      expect(state.diagnostics, `Quill frame ${frame}`).toEqual([]);
      expect(state.parts.head.variant).toBe("beakless");
      expect(state.parts.beak.variant).toBe(variant);
    }
    expect(evaluateCharacter(doctorQuillCharacter, quill, cues, 98).parts.head.variant).toBe("neutral");
    expect(evaluateCharacter(doctorQuillCharacter, quill, cues, 98).parts.beak.variant).toBe("hidden");
  });

  it("uses matched footfall and body-bob durations for both rigs", () => {
    for (const [definition, instance] of [[doctorQuillCharacter, quill], [pipCharacter, pip]] as const) {
      expect(actionFrames(definition, "walk")).toBe(24);
      expect(actionFrames(definition, "bob")).toBe(24);
      const cues = forwardWalkCues(definition, instance.instanceId, 10, 3);
      expect(cues).toHaveLength(6);
      expect(cues.map(c => c.kind === "action" ? c.name : null)).toEqual(["walk", "walk", "walk", "bob", "bob", "bob"]);
      for (const frame of [10, 16, 34, 58, 81]) {
        const state = evaluateCharacter(definition, instance, cues, frame);
        expect(state.diagnostics, `${definition.characterId} frame ${frame}`).toEqual([]);
        expect(evaluateCharacter(definition, instance, cues, frame)).toEqual(state);
      }
    }
  });

  it("keeps the single-paw question pose separate from a two-paw cheer", () => {
    expect(validateCharacterDefinition(pipCharacter).filter(issue => issue.severity === "error")).toEqual([]);
    const question = [{ id: "question", instanceId: pip.instanceId, kind: "action" as const, name: "question", startFrame: 0 }];
    const cheer = [{ id: "cheer", instanceId: pip.instanceId, kind: "action" as const, name: "cheer", startFrame: 0 }];
    const idle = evaluateCharacter(pipCharacter, pip, [], 24);
    const asking = evaluateCharacter(pipCharacter, pip, question, 24);
    const cheering = evaluateCharacter(pipCharacter, pip, cheer, 24);
    expect(asking.parts["arm-right"].variant).toBe("point");
    expect(asking.parts["arm-left"]).toEqual(idle.parts["arm-left"]);
    expect(cheering.parts["arm-left"].variant).toBe("hold-up");
    expect(cheering.parts["arm-right"].variant).toBe("spread");
  });

  it("plays each loop with valid cues, safe bounds and a frontal perspective approach", () => {
    for (const [definition, instance, character] of [
      [doctorQuillCharacter, quill, "quill"],
      [pipCharacter, pip, "pip"],
    ] as const) {
      const cues = showcaseCues(definition, character);
      const ids = cues.map(cue => cue.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (let frame = 0; frame < DEMO_LOOP_FRAMES; frame++) {
        const state = evaluateCharacter(definition, instance, cues, frame);
        expect(state.diagnostics, `${character} frame ${frame}`).toEqual([]);
        if (frame % 17 === 0) expect(evaluateCharacter(definition, instance, cues, frame)).toEqual(state);
      }
      const samples = Array.from({ length: DEMO_LOOP_FRAMES }, (_, frame) => approachScale(character, frame));
      expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.82);
      expect(Math.max(...samples)).toBeLessThanOrEqual(1);
      expect(samples.every((value, index) => index === 0 || value >= samples[index - 1])).toBe(true);
    }
    expect(loopOpacity(0)).toBe(0);
    expect(loopOpacity(20)).toBe(1);
    expect(loopOpacity(DEMO_LOOP_FRAMES - 1)).toBeLessThan(0.1);
  });
});
