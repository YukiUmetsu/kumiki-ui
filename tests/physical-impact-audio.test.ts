import { describe, expect, it } from "vitest";
import { bakedContactsToSoundEvents, audioMixFfmpegArgs, createAudioMixManifest, resolveAudioCues } from "../registry/video/audio-visual-cue";
import { validateBakedPhysicalActions } from "../registry/motion/baked-physical-motion";
import type { BakedContactEvent } from "../registry/motion/baked-physical-motion";
import realShot from "../src/craft/fixtures/blender-desk-lamp-physics/baked-actions.json";

const FPS = { num: 30, den: 1 };
const PROFILE = { "metal-on-floor": { assetRef: "licensed/fastener-hit.wav", gainDb: -10 } };
const options = { profiles: PROFILE, fps: FPS, durationFrames: 120 };
const contact = (frame: number, speedMps = 2, material?: string, target = "kumiki:fastener:1"): BakedContactEvent =>
  ({ frame, timeSeconds: frame / 30, speedMps, target, ...(material ? { material } : {}) });

describe("physics contact → production audio cue bridge", () => {
  it("turns real Blender Bullet contact estimates into precisely timed mix cues", () => {
    const [action] = validateBakedPhysicalActions(realShot);
    const events = (action.contacts ?? []).map(c => ({ ...c, timeSeconds: c.frame / 30 }));
    expect(events.length).toBe(6);
    const sounds = bakedContactsToSoundEvents(events, options);
    expect(sounds).toHaveLength(6);
    expect(sounds.every(s => s.assetRef === "licensed/fastener-hit.wav" && s.laneId === "sfx")).toBe(true);
    expect(new Set(sounds.map(s => s.id)).size).toBe(6);
    const sheet = { id: "real-physics", fps: FPS, durationFrames: 120,
      lanes: [{ id: "sfx", kind: "sfx" as const, startFrame: 0 }], sounds };
    expect(resolveAudioCues(sheet).diagnostics).toEqual([]);
    const mix = createAudioMixManifest(sheet);
    mix.inputs.forEach((input, i) => expect(input.startSeconds).toBeCloseTo(events[i].frame / 30, 6));
    const args = audioMixFfmpegArgs(mix, "scene-audio.wav").join(" ");
    expect(args).toContain("amix=inputs=6");
    expect(args).toContain(`adelay=${Math.round(mix.inputs[0].startSeconds * 1000)}:all=1`);
  });

  it("preserves sub-frame time at 60 fps, and leaves unlicensed materials silent", () => {
    const event = contact(15.375, 2, "metal-on-floor");
    const sounds = bakedContactsToSoundEvents([event, contact(17, 3, "wood"), contact(18, 3)], {
      profiles: PROFILE, fps: { num: 60, den: 1 }, durationFrames: 240,
    });
    expect(sounds).toHaveLength(1);
    expect(sounds[0]).toMatchObject({ frame: 30, subframeOffset: .75, gainDb: -10 });
    const manifest = createAudioMixManifest({ id: "s", fps: { num: 60, den: 1 }, durationFrames: 240,
      lanes: [{ id: "sfx", kind: "sfx", startFrame: 0 }], sounds });
    expect(manifest.inputs[0].startSeconds).toBeCloseTo(15.375 / 30, 8);
  });

  it("gates tiny impacts, debounces the same body, keeps independent bodies, clamps gain", () => {
    const events = [contact(10, .1, "metal-on-floor"), contact(12, 4, "metal-on-floor"),
      contact(12.5, 5, "metal-on-floor"), contact(12.5, 3, "metal-on-floor", "kumiki:fastener:2"),
      contact(16, 100, "metal-on-floor")];
    const sounds = bakedContactsToSoundEvents(events, options);
    expect(sounds).toHaveLength(3);
    expect(sounds.map(s => s.id)).toEqual(["impact-2", "impact-4", "impact-5"]);
    expect(sounds[sounds.length - 1]?.gainDb).toBe(3);
    expect(events[1].frame).toBe(12); // no mutation
  });

  it("rejects invalid timing/profile settings instead of fabricating assets", () => {
    expect(() => bakedContactsToSoundEvents([contact(-1, 1, "metal-on-floor")], options)).toThrow(/Invalid measured impact/);
    expect(() => bakedContactsToSoundEvents([contact(20, 2, "metal-on-floor")], { ...options, fps: { num: 0, den: 1 } })).toThrow(/FPS/);
    expect(() => bakedContactsToSoundEvents([contact(20, 2, "metal-on-floor")], { ...options,
      profiles: { "metal-on-floor": { assetRef: "" } } })).toThrow(/assetRef/);
    expect(() => bakedContactsToSoundEvents([contact(120, 2, "metal-on-floor")], options)).not.toThrow();
    expect(bakedContactsToSoundEvents([contact(120, 2, "metal-on-floor")], options)).toEqual([]);
    const sheet = { id: "bad", fps: FPS, durationFrames: 120, lanes: [{ id: "sfx", kind: "sfx" as const, startFrame: 0 }],
      sounds: [{ id: "bad", laneId: "sfx", frame: 10, subframeOffset: 1, assetRef: "hit.wav" }] };
    expect(resolveAudioCues(sheet).diagnostics.map(d => d.code)).toContain("audio-subframe-invalid");
  });
});
