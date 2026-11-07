import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { audioMixFfmpegArgs, bakedContactsToSoundEvents } from "../registry/video/audio-visual-cue";
import { compileAmbience, compileSoundDesign, contactProfiles, findSounds, inspectSoundDesign, soundDesignEvent, soundVariant, takeDetuneCents } from "../registry/video/sound-design";
import type { SoundDesignSpec } from "../registry/video/sound-design";
import { inspectMix, inspectMixChannel, inspectMixChannels, limitingDb, loopSeamDb, masterFilter, masterGainDb } from "../registry/video/sound-mastering";
import type { SoundCatalog } from "../registry/video/sound-catalog";

const catalog = JSON.parse(readFileSync("assets/sound/catalog.json", "utf8")) as SoundCatalog;
const locate = (sound: { path: string }) => "/sounds/" + sound.path;
const fps = { num: 30, den: 1 };
const recipe = (over: Partial<SoundDesignSpec> = {}): SoundDesignSpec => ({ id: "drop", layers: [{ sound: "drop-water-full" }], ...over });

describe("local sound search", () => {
  it("ranks a material and its action first, and repeats exactly", () => {
    const first = findSounds(catalog, "glass touch")[0];
    expect(first.sound.id).toBe("foley-glass-touch");
    expect(findSounds(catalog, "glass touch").map(item => item.sound.id)).toEqual(findSounds(catalog, "glass touch").map(item => item.sound.id));
  });
  it("filters by origin and never returns a record that fails a rights check", () => {
    expect(findSounds(catalog, "water", { origin: "recorded" }).every(item => item.sound.origin === "recorded")).toBe(true);
    const bad = { ...catalog, sounds: catalog.sounds.map(sound => sound.id === "foley-glass-touch" ? { ...sound, licenseId: "CC-BY-NC-4.0" } : sound) };
    expect(findSounds(bad, "glass touch").some(item => item.sound.id === "foley-glass-touch")).toBe(false);
  });
  it("treats a material's adjective as the material", () => expect(findSounds(catalog, "wooden knock")[0].sound.material).toBe("wood"));
  it("returns nothing for words the catalog does not hold", () => expect(findSounds(catalog, "zzzqq")).toEqual([]));
});

describe("takes", () => {
  it("gives the same take for the same seed and place", () => {
    const pool = ["a", "b", "c", "d"];
    expect(Array.from({ length: 12 }, (_, i) => soundVariant(pool, 5, i))).toEqual(Array.from({ length: 12 }, (_, i) => soundVariant(pool, 5, i)));
    expect(Array.from({ length: 12 }, (_, i) => soundVariant(pool, 5, i))).not.toEqual(Array.from({ length: 12 }, (_, i) => soundVariant(pool, 6, i)));
  });
  it("uses every take in a pass and never repeats a take across a pass boundary", () => {
    const pool = ["a", "b", "c", "d"];
    for (let seed = 0; seed < 50; seed += 1) {
      const run = Array.from({ length: 40 }, (_, i) => soundVariant(pool, seed, i));
      expect(new Set(run.slice(0, 4)).size).toBe(4);
      run.forEach((take, i) => { if (i) expect(take).not.toBe(run[i - 1]); });
    }
  });
  it("keeps detuning small", () => {
    for (let i = 0; i < 100; i += 1) expect(Math.abs(takeDetuneCents(3, i))).toBeLessThanOrEqual(35);
  });
  it("lets a caller choose how contacts rotate through takes", () => {
    const profiles = { glass: { assetRef: "a.wav", variants: ["b.wav", "c.wav"] } };
    const contacts = Array.from({ length: 6 }, (_, i) => ({ frame: i * 10, target: "x", speedMps: 2, material: "glass" }));
    const events = bakedContactsToSoundEvents(contacts, { profiles, fps, durationFrames: 100, pick: (pool, take) => soundVariant(pool, 9, take) });
    expect(events.map(item => item.assetRef)).toEqual(contacts.map((_, i) => soundVariant(["a.wav", "b.wav", "c.wav"], 9, i)));
  });
});

describe("material contacts", () => {
  it("offers only materials with a sound, and a louder intensity raises them", () => {
    const quiet = contactProfiles(catalog, { intensity: "subtle" }), loud = contactProfiles(catalog, { intensity: "cinematic" });
    expect(Object.keys(quiet)).toContain("glass");
    expect(Object.keys(quiet)).toContain("water");
    expect(quiet.rubber).toBeUndefined();
    expect(loud.glass.gainDb!).toBeGreaterThan(quiet.glass.gainDb!);
    expect(quiet.water.variants!.length).toBeGreaterThan(1);
    expect(quiet["stone-step"].variants!.length).toBeGreaterThan(1);
    expect(quiet["stone-step"].assetRef).toContain("recorded/step-stone");
  });
});

describe("sound recipes", () => {
  const codes = (spec: SoundDesignSpec) => inspectSoundDesign(spec, catalog).map(item => item.code);
  it("refuses unknown sounds, rooms and out-of-range settings", () => {
    expect(codes(recipe({ layers: [{ sound: "nope" }] }))).toEqual(["sound-design-unknown"]);
    expect(codes(recipe({ room: "volcano" as never }))).toEqual(["sound-design-unknown"]);
    expect(codes(recipe({ layers: [{ sound: "drop-water-full", gainDb: 40 }] }))).toEqual(["sound-design-range"]);
    expect(codes(recipe({ position: { pan: 3 } }))).toEqual(["sound-design-range"]);
    expect(codes(recipe({ layers: [] }))).toEqual(["sound-design-range"]);
  });
  it("cannot carry text into the filter graph", () => {
    expect(() => compileSoundDesign(recipe({ layers: [{ sound: "x;amovie=/etc/passwd" }] }), catalog, locate)).toThrow(/no sound/);
    expect(() => compileSoundDesign(recipe({ id: "a;b" }), catalog, locate)).toThrow(/plain ID/);
    expect(() => compileSoundDesign(recipe({ layers: [{ sound: "drop-water-full", gainDb: "0dB,amovie=x" as never }] }), catalog, locate)).toThrow();
    const graph = compileSoundDesign(recipe({ room: "cave", position: { pan: .4, distance: 8 } }), catalog, locate).ffmpegArgs.join(" ");
    expect(graph).not.toMatch(/amovie|sendcmd/);
  });
  it("keeps the first layer's peak as the sync point, through pitch and offset layers", () => {
    const flat = compileSoundDesign(recipe(), catalog, locate).peakSeconds, down = compileSoundDesign(recipe({ layers: [{ sound: "drop-water-full", pitchCents: -1200 }] }), catalog, locate).peakSeconds;
    expect(down).toBeCloseTo(flat * 2);
  });
  it("adds a room's tail to the length, and a room to the key", () => {
    const dry = compileSoundDesign(recipe(), catalog, locate), cave = compileSoundDesign(recipe({ room: "cave" }), catalog, locate);
    expect(cave.durationSeconds - dry.durationSeconds).toBeCloseTo(2.3);
    expect(cave.key).not.toBe(dry.key);
  });
  it("keys on the file's hash, so a changed sound bakes again", () => {
    const changed = { ...catalog, sounds: catalog.sounds.map(sound => sound.id === "drop-water-full" ? { ...sound, sha256: "0".repeat(64) } : sound) };
    expect(compileSoundDesign(recipe(), changed, locate).key).not.toBe(compileSoundDesign(recipe(), catalog, locate).key);
  });
  it("carries rights with the result", () => {
    expect(compileSoundDesign(recipe(), catalog, locate).sources[0]).toMatchObject({ id: "drop-water-full", licenseId: "CC0-1.0" });
  });
  it("lands the peak on the frame at a fractional frame rate", () => {
    const ntsc = { num: 30000, den: 1001 }, event = soundDesignEvent({ peakSeconds: .5 }, { id: "a", frame: 100, assetRef: "x.wav" }, ntsc);
    expect(event.frame + (event.subframeOffset ?? 0) + .5 * 30000 / 1001).toBeCloseTo(100);
    expect(soundDesignEvent({ peakSeconds: 5 }, { id: "b", frame: 3, assetRef: "x.wav" }, fps).frame).toBe(0);
  });
  it("can muffle or reverse a bed", () => {
    const graph = compileAmbience({ sound: "bed-river-fast", durationSeconds: 30, lowpassHz: 500, reverse: true }, catalog, locate).ffmpegArgs.join(" ");
    expect(graph).toContain("lowpass=f=500");
    expect(graph).toContain("areverse");
  });
  it("builds beds only from seamless loops", () => {
    expect(compileAmbience({ sound: "bed-river-fast", durationSeconds: 30 }, catalog, locate).ffmpegArgs.join(" ")).toContain("-stream_loop");
    expect(() => compileAmbience({ sound: "drop-water-full", durationSeconds: 30 }, catalog, locate)).toThrow(/seamless/);
  });
});

describe("narration first", () => {
  const manifest = { durationSeconds: 10, inputs: [{ id: "voice", kind: "narration" as const, assetRef: "v.wav", startSeconds: 0, gainDb: 0 }, { id: "bed", kind: "ambience" as const, assetRef: "b.wav", startSeconds: 0, gainDb: 0 }] };
  it("lets the voice push the bed down", () => {
    const graph = audioMixFfmpegArgs(manifest, "o.wav", { duckDb: 12 }).join(" ");
    expect(graph).toContain("sidechaincompress");
    expect(graph).toContain("apad[keya]");
  });
  it("leaves a film with no voice alone, and refuses a mad depth", () => {
    expect(audioMixFfmpegArgs({ ...manifest, inputs: [manifest.inputs[1]] }, "o.wav", { duckDb: 12 }).join(" ")).not.toContain("sidechaincompress");
    expect(() => audioMixFfmpegArgs(manifest, "o.wav", { duckDb: 99 })).toThrow(/Ducking/);
  });
});

describe("mix checks", () => {
  const rate = 48000, tone = (seconds: number, level = .3) => Float32Array.from({ length: seconds * rate }, (_, i) => level * Math.sin(i * .05));
  const clean = { dcOffset: 0, clippedSamples: 0, clicks: [] };
  const codes = (measure: { integratedLufs: number; truePeakDbtp: number }, signal = clean, sparse = false) => inspectMix(measure, signal, "youtube", { sparse }).map(item => `${item.severity}:${item.code}`);
  it("finds a click in a tone and none in a clean tone", () => {
    const clicked = tone(1); clicked[rate / 2] = .95;
    expect(inspectMixChannel(tone(1), rate).clicks).toEqual([]);
    expect(inspectMixChannel(clicked, rate).clicks[0]).toBeCloseTo(.5, 2);
  });
  it("finds DC and clipping", () => {
    expect(inspectMixChannel(tone(1).map(value => value + .1), rate).dcOffset).toBeCloseTo(.1, 2);
    expect(inspectMixChannel(tone(1, 2).map(value => Math.max(-1, Math.min(1, value))), rate).clippedSamples).toBeGreaterThan(1000);
  });
  it("judges each channel, so two loud channels do not count as clipping", () => {
    expect(inspectMixChannels([tone(1, .8), tone(1, .8)], rate).clippedSamples).toBe(0);
    expect(inspectMixChannels([tone(1), tone(1, 2).map(value => Math.max(-1, Math.min(1, value)))], rate).clippedSamples).toBeGreaterThan(1000);
  });
  it("measures a seam: a ramp jumps, and a closed cycle does not", () => {
    expect(loopSeamDb(Float32Array.from({ length: 1000 }, (_, i) => i / 1000 - .5))).toBeGreaterThan(0);
    expect(loopSeamDb(Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i * 2 * Math.PI / 1000)))).toBeLessThan(-30);
  });
  it("sets one gain, held back by the ceiling", () => {
    expect(masterGainDb({ integratedLufs: -20, truePeakDbtp: -12 }, "youtube")).toBe(6);
    expect(masterGainDb({ integratedLufs: -30, truePeakDbtp: -4 }, "youtube")).toBe(3);
    expect(masterGainDb({ integratedLufs: Number.NEGATIVE_INFINITY, truePeakDbtp: -70 }, "youtube")).toBe(0);
  });
  it("reaches the target with a limiter, and says how hard it works", () => {
    const hot = { integratedLufs: -21, truePeakDbtp: -2 };
    expect(masterGainDb(hot, "youtube", { limit: true })).toBe(7);
    expect(limitingDb(hot, 7, "youtube")).toBe(6);
    expect(masterFilter(7, "youtube", { limit: true })).toContain("latency=1");
    expect(masterFilter(7, "youtube")).not.toContain("alimiter");
  });
  it("stops a film with a bed that misses its target, and only warns for a sparse film", () => {
    expect(codes({ integratedLufs: -14, truePeakDbtp: -1 })).toEqual([]);
    expect(codes({ integratedLufs: -24, truePeakDbtp: -1 })).toEqual(["error:mix-loudness"]);
    expect(codes({ integratedLufs: -24, truePeakDbtp: -1 }, clean, true)).toEqual(["warning:mix-loudness"]);
  });
  it("stops true peak, DC, clipping and silence", () => {
    expect(codes({ integratedLufs: -14, truePeakDbtp: -.2 })).toEqual(["error:mix-true-peak"]);
    expect(codes({ integratedLufs: -14, truePeakDbtp: -1 }, { ...clean, dcOffset: .02 })).toEqual(["error:mix-dc"]);
    expect(codes({ integratedLufs: -14, truePeakDbtp: -1 }, { ...clean, clippedSamples: 9 })).toEqual(["error:mix-clipped"]);
    expect(codes({ integratedLufs: Number.NEGATIVE_INFINITY, truePeakDbtp: -70 })).toEqual(["error:mix-silent"]);
  });
});
