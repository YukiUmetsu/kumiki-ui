import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateCameraLightingPreset } from "../registry/motion/camera-lighting-preset";
import plan from "../src/craft/fixtures/blender-rotational-impacts/visual-parity-plan.json";
import baked from "../src/craft/fixtures/blender-rotational-impacts/baked-actions.json";

describe("portable Blender/WebGL visual parity plan", () => {
  it("is tied to the tracked, audited GLB and a real baked action", () => {
    const glb = readFileSync(resolve("src/craft/fixtures/blender-rotational-impacts/model.glb"));
    expect(createHash("sha256").update(glb).digest("hex")).toBe(plan.model_sha256);
    expect(baked.some(action => action.id === plan.action_id)).toBe(true);
    expect(plan.frames).toEqual([0, 10, 17, 50, 99]);
  });

  it("reuses the validated, world-space Storybook camera preset", () => {
    const preset = validateCameraLightingPreset(plan.camera_preset);
    expect(preset.mode).toBe("replace-shot");
    expect(preset.camera.space).toBe("world");
    expect(preset.camera.projection.kind).toBe("perspective");
  });
});
