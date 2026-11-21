import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import type { SoundLevels } from "../registry/video/film-drive";
import { bedBeats, compileHits, HIT_RANGE, hitAt, hitsAt, hitsReach } from "../registry/video/film-hits";
import type { FilmHitsSpec } from "../registry/video/film-hits";
import { coverScale, HitFilter, zoomMaps } from "../registry/video/film-hits-react";
import levels from "../assets/sound/levels.json";

const drums = { sound: "bed-drums-hiphop-110", bpm: 110 };
const ctx = (extra: Partial<Parameters<typeof compileHits>[1]> = {}): Parameters<typeof compileHits>[1] => ({
  path: "/scenes/0/hits", durationFrames: 131, contentFrames: 131, fps: 30, filmStart: 0, filmFrames: 524,
  moment: id => id === "landed" ? 40 : undefined, output: content => content, beds: new Map([["drums", drums]]), ...extra,
});
const codes = (spec: FilmHitsSpec, extra?: Partial<Parameters<typeof compileHits>[1]>) => compileHits(spec, ctx(extra)).problems.map(item => item.code);

describe("beat hits", () => {
  it("puts a bed's beats on film frames from its tempo, offset and place", () => {
    expect(bedBeats({ bpm: 110 }, 30, 140).slice(0, 9)).toEqual([0, 16, 33, 49, 65, 82, 98, 115, 131]);
    expect(bedBeats({ bpm: 120, beatOffset: .5, startFrame: 30, durationFrames: 60 }, 30, 300)).toEqual([45, 60, 75]);
    expect(bedBeats({ bpm: 120, reverse: true }, 30, 300)).toEqual([]);
  });

  it("lands hits on every nth beat, a phase of the group, and leads them", () => {
    const backbeat = compileHits({ kind: "shake", beats: { bed: "drums", every: 2, phase: 1 } }, ctx()).hits!;
    expect(backbeat.frames).toEqual([16, 49, 82, 115]);
    // A scene later in the film counts its hits from its own first frame.
    // A hit led past the cut lands on the cut.
    expect(compileHits({ beats: { bed: "drums", every: 4 }, lead: 1 }, ctx({ filmStart: 131 })).hits!.frames).toEqual([0, 64]);
    expect(compileHits({ at: [10, "landed"] }, ctx({ output: content => content * 2 })).hits!.frames).toEqual([20, 40]);
  });

  it("finds a bed's loud onsets from its measured levels, the first frame's included", () => {
    const hits = compileHits({ onsets: { bed: "drums" } }, ctx({ durationFrames: 262, contentFrames: 262, levels: levels as SoundLevels })).hits!;
    // The loop's kicks, snares and accented hats: its syncopation too, so onsets fall on eighths as well as on beats.
    expect(hits.frames[0]).toBe(0);
    expect(hits.frames.length).toBeGreaterThanOrEqual(15);
    const beats = bedBeats({ bpm: 110 }, 30, 262), near = beats.filter(beat => hits.frames.some(frame => Math.abs(frame - beat) <= 2));
    expect(near.length / beats.length).toBeGreaterThanOrEqual(.6);
  });

  it("peaks on the hit frame, settles in its frames, and swings the shake from side to side", () => {
    const hits = compileHits({ kind: ["punch", "shake", "split", "blur"], beats: { bed: "drums", every: 8 }, amount: .5, frames: 6, direction: 0 }, ctx()).hits!;
    const at = (frame: number) => hitAt(hits, frame, 30);
    expect(at(0).scale).toBeCloseTo(1 + HIT_RANGE.punch * .5, 5);
    expect(at(0).blur).toBeCloseTo(HIT_RANGE.blur * .5, 5);
    expect(at(0).splitX).toBeCloseTo(HIT_RANGE.split * .5, 5);
    // At 30 fps each frame swings to the other side, smaller each time.
    const swings = [0, 1, 2, 3, 4, 5].map(frame => at(frame).x);
    swings.slice(1).forEach((x, i) => { expect(Math.sign(x)).toBe(-Math.sign(swings[i])); expect(Math.abs(x)).toBeLessThan(Math.abs(swings[i])); });
    expect(at(6)).toEqual({ scale: 1, x: 0, y: 0, rotate: 0, splitX: 0, splitY: 0, blur: 0, flash: 0 });
    expect(hitAt(hits, 0, 30, true).scale).toBe(1);
    // At 60 fps a swing lasts two frames, so the shake keeps the same speed in seconds.
    expect(Math.sign(hitAt(hits, 1, 60).x)).toBe(Math.sign(hitAt(hits, 0, 60).x));
  });

  it("combines patterns: scales multiply and moves add", () => {
    const punch = compileHits({ kind: "punch", at: [0] }, ctx()).hits!, shake = compileHits({ kind: "shake", at: [0], direction: 0 }, ctx()).hits!;
    const both = hitsAt([punch, shake], 0, 30);
    expect(both.scale).toBeCloseTo(hitAt(punch, 0, 30).scale, 6);
    expect(both.x).toBeCloseTo(hitAt(shake, 0, 30).x, 6);
  });

  it("refuses what cannot be drawn safely, and warns what reads badly", () => {
    expect(codes({ kind: "punch" })).toContain("hits-source");
    expect(codes({ at: [1], beats: { bed: "drums" } })).toContain("hits-source");
    expect(codes({ beats: { bed: "none" } })).toContain("hits-bed");
    expect(codes({ beats: { bed: "tick" } }, { beds: new Map([["tick", { sound: "bed-pulse-tick" }]]) })).toContain("hits-no-tempo");
    expect(codes({ beats: { bed: "drums", every: 3 } })).toContain("hits-every");
    expect(codes({ at: ["missing"] })).toContain("hits-moment");
    expect(codes({ kind: "wobble" as never, at: [0] })).toContain("hits-kind");
    expect(codes({ at: [0], amount: 2 })).toContain("hits-amount");
    // 110 bpm is 1.8 beats a second: a flash on every beat is fine, on every half beat it is not.
    expect(codes({ kind: "flash", beats: { bed: "drums" } })).not.toContain("hits-flash-rate");
    expect(codes({ kind: "flash", beats: { bed: "fast" } }, { beds: new Map([["fast", { sound: "x", bpm: 220 }]]) })).toContain("hits-flash-rate");
    expect(codes({ kind: "punch", at: [0, 5, 10, 15, 20, 25] })).toContain("hits-busy");
    expect(codes({ kind: "split", at: [0], amount: .8 }, { textHeavy: true })).toContain("hits-split-text");
    expect(codes({ kind: "split", at: [0], amount: .5, frames: 5 }, { textHeavy: true })).not.toContain("hits-split-text");
  });

  it("enlarges a shaken scene once, by its strongest hits, so its zoom does not pump with each swing", () => {
    const shake = compileHits({ kind: "shake", at: [0], amount: .5 }, ctx()).hits!, split = compileHits({ kind: ["punch", "split"], at: [0], amount: .5 }, ctx()).hits!;
    expect(hitsReach([shake, split])).toEqual({ move: HIT_RANGE.shake * .5, turn: HIT_RANGE.rotate * .5, split: HIT_RANGE.split * .5 });
    // The reach covers every swing: no frame of the shake moves or turns the picture further than it.
    const reach = hitsReach([shake]);
    for (let frame = 0; frame < shake.settle; frame++) {
      const state = hitAt(shake, frame, 30);
      expect(Math.hypot(state.x, state.y)).toBeLessThanOrEqual(reach.move + 1e-9);
      expect(Math.abs(state.rotate)).toBeLessThanOrEqual(reach.turn + 1e-9);
    }
  });

  it("keeps the frame covered while the picture moves and turns", () => {
    const width = 1920, height = 1080, dx = 20, dy = 8, rotate = 1, scale = coverScale(width, height, dx, dy, rotate), r = rotate * Math.PI / 180;
    // Every corner of the frame, mapped back into the moved picture, stays inside it.
    for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height]]) {
      const px = x - width / 2 - dx, py = y - height / 2 - dy, ux = (Math.cos(r) * px + Math.sin(r) * py) / scale, uy = (-Math.sin(r) * px + Math.cos(r) * py) / scale;
      expect(Math.abs(ux)).toBeLessThanOrEqual(width / 2 + 1e-6);
      expect(Math.abs(uy)).toBeLessThanOrEqual(height / 2 + 1e-6);
    }
  });

  it("draws the zoom blur as two averaged passes about the centre, and the split as moved channels", () => {
    const maps = zoomMaps({ x: .5, y: .5 }, 1920, 1080);
    expect(maps.m).toBe(960);
    const markup = renderToStaticMarkup(<HitFilter id="f" hit={{ scale: 1, x: 0, y: 0, rotate: 0, splitX: .01, splitY: 0, blur: .06, flash: 0 }} centre={{ x: .5, y: .5 }} width={1920} height={1080} />);
    expect(markup.match(/<feDisplacementMap/g)).toHaveLength(10);
    expect(markup.match(/<feOffset/g)).toHaveLength(2);
    expect(markup).toContain('dx="10.80"');
    // The map images are in the page, so an export waits for them to decode.
    expect(markup.match(/data-km-film-warp-map/g)).toHaveLength(2);
    expect(renderToStaticMarkup(<HitFilter id="f" hit={{ scale: 1.1, x: 0, y: 0, rotate: 0, splitX: 0, splitY: 0, blur: 0, flash: 0 }} centre={{ x: .5, y: .5 }} width={1920} height={1080} />)).toBe("");
  });

  it("compiles the example: hits on the loop's beats, after each scene's cut", () => {
    const doc = JSON.parse(readFileSync("examples/film/beat-hits.film.json", "utf8")) as FilmDocument;
    const result = compileFilm(doc, { soundLevels: levels as SoundLevels });
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.diagnostics).toEqual([]);
    const scenes = result.film.scenes, beats = bedBeats({ bpm: 110 }, 30, result.film.durationFrames);
    for (const scene of scenes) for (const hits of scene.hits!) for (const frame of hits.frames) expect(beats).toContain(scene.startFrame + frame);
    const kickSnare = scenes.find(scene => scene.id === "kick-snare")!;
    expect(kickSnare.hits!.map(hits => hits.frames[0])).toEqual([0, 16]);
    // A sound on every hit lands on the accent lane.
    const kit = { sounds: { hit: { file: "hit.wav", peakSeconds: .01 } } };
    const sounded = compileFilm({ ...doc, audio: { ...doc.audio!, accents: { kit: "kit" } }, scenes: doc.scenes.map(scene => scene.id === "punch" ? { ...scene, hits: { kind: "punch", beats: { bed: "drums", every: 4 }, sound: "hit" } } : scene) } as FilmDocument,
      { soundLevels: levels as SoundLevels, accentKit: kit });
    if (!sounded.ok) throw new Error(sounded.diagnostics.map(item => item.message).join("\n"));
    expect((sounded.film.audio!.sounds ?? []).filter(sound => sound.id.startsWith("hit/punch/")).map(sound => sound.frame)).toEqual([0, 65]);
  });
});
