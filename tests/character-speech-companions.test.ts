import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateCharacter } from "../registry/character/evaluate";
import { validateCharacterDefinition } from "../registry/character/validate";
import { doctorQuillCharacter, doctorQuillAssetFiles } from "../src/character/fixtures/doctor-quill";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../registry/character/definition";

const instance: CharacterInstance = {
  instanceId: "quill-speaking", characterId: "doctor-quill", revision: "r2", seed: 11,
};
const speak: CharacterCue[] = [{
  id: "open-beak", instanceId: "quill-speaking", kind: "viseme", viseme: "wide",
  startFrame: 5, endFrame: 15, precision: "exact",
}];

describe("speech companion artwork", () => {
  it("switches to a clean face only while speech is active; no duplicate painted beak", () => {
    const before = evaluateCharacter(doctorQuillCharacter, instance, speak, 4);
    const during = evaluateCharacter(doctorQuillCharacter, instance, speak, 10);
    const after = evaluateCharacter(doctorQuillCharacter, instance, speak, 16);
    expect(before.parts.head.variant).toBe("neutral");
    expect(before.parts.beak.variant).toBe("hidden");
    expect(during.parts.head.variant).toBe("beakless");
    expect(during.parts.beak.variant).toBe("open_6");
    expect(after.parts.head.variant).toBe("neutral");
    expect(after.parts.beak.variant).toBe("hidden");
    expect(evaluateCharacter(doctorQuillCharacter, instance, speak, 10)).toEqual(during);
  });

  it("keeps the clean head through overlapping expression and blink cues", () => {
    const alwaysBlink = {
      ...doctorQuillCharacter,
      blink: { parts: ["head"], variant: "blink", intervalFrames: { min: 1, max: 1 }, durationFrames: 20 },
    } satisfies CharacterDefinition;
    const cues: CharacterCue[] = [...speak, {
      id: "surprised", instanceId: instance.instanceId, kind: "expression", name: "surprised",
      startFrame: 0, endFrame: 20,
    }];
    expect(evaluateCharacter(alwaysBlink, instance, cues, 10).parts.head.variant).toBe("beakless");
    expect(evaluateCharacter(alwaysBlink, instance, cues, 16).parts.head.variant).toBe("blink");
  });

  it("rejects broken companion swaps and mouth overrides", () => {
    const invalid: CharacterDefinition = {
      ...doctorQuillCharacter,
      speech: { ...doctorQuillCharacter.speech!, activeVariants: { head: "unknown", beak: "closed" } },
    };
    expect(validateCharacterDefinition(invalid).filter(item => item.code === "speech-companion")).toHaveLength(2);
    expect(validateCharacterDefinition(doctorQuillCharacter).filter(item => item.severity === "error")).toEqual([]);
  });

  it("references real registered beak frames and corrected talon assets", () => {
    const mouth = doctorQuillCharacter.parts.find(part => part.id === "beak")!;
    expect(Object.keys(mouth.variants ?? {})).toHaveLength(26); // hidden + 25 aligned mouth frames
    expect(doctorQuillCharacter.parts.find(part => part.id === "leg-left")?.asset).toBe("leg-right");
    expect(doctorQuillCharacter.parts.find(part => part.id === "leg-right")?.asset).toBe("leg-left");
    for (const asset of Object.values(doctorQuillAssetFiles)) {
      expect(existsSync(resolve(process.cwd(), "src/character/fixtures", asset)), asset).toBe(true);
    }
  });
});
