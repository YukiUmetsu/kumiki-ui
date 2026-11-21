import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import { bedBeats } from "../registry/video/film-hits";
import { compileSpeed, velocityWeight } from "../registry/video/film-speed";
import type { FilmSpeed } from "../registry/video/film-speed";

const kicks = bedBeats({ bpm: 110 }, 30, 263).filter((_, n) => n % 2 === 0);
const velocity = (beats: FilmSpeed["beats"], extra: Partial<FilmSpeed> = {}) => compileSpeed({ source: 315, beats, ...extra }, 262, 30, () => undefined, kicks);
const steps = (map: readonly number[]) => map.slice(1).map((v, k) => v - map[k]);

describe("velocity edit", () => {
  it("shapes the speed between beats: slow on the beat, fast where each shape puts it", () => {
    expect(velocityWeight("dip", 0, 8)).toBe(1);
    expect(velocityWeight("dip", .5, 8)).toBe(8);
    expect(velocityWeight("rush", 0, 8)).toBe(1);
    expect(velocityWeight("rush", .99, 8)).toBeGreaterThan(7.8);
    expect(velocityWeight("burst", 0, 8)).toBe(8);
    expect(velocityWeight("burst", 1, 8)).toBe(1);
    expect(velocityWeight("freeze", 0, 8)).toBe(.25);
  });

  it("fits the content exactly, slowest on the beats and fastest just before them (rush)", () => {
    const { speed, problems } = velocity({ bed: "drums", every: 2, shape: "rush" });
    expect(problems).toEqual([]);
    expect(speed!.map[262]).toBeCloseTo(315, 6);
    const v = steps(speed!.map), slowest = Math.min(...v), fastest = Math.max(...v);
    expect(slowest).toBeCloseTo(.4, 2);
    expect(fastest).toBeCloseTo(3.1, 1);
    // Every frame that starts on a kick plays at the slow speed; the frame before it is the fastest of its stretch.
    for (const beat of kicks.filter(beat => beat > 0 && beat < 262)) {
      expect(v[beat]).toBeLessThan(.45);
      expect(v[beat - 1]).toBeGreaterThan(2.5);
    }
    expect(speed!.rate).toBeCloseTo(315 / 262, 6);
  });

  it("refuses what cannot follow the beat", () => {
    const codes = (beats: FilmSpeed["beats"], extra: Partial<FilmSpeed> = {}, grid = kicks) =>
      compileSpeed({ source: 315, beats, ...extra }, 262, 30, () => undefined, grid).problems.map(item => item.code);
    expect(codes({ bed: "drums", shape: "wobble" as never })).toContain("speed-beats-shape");
    expect(codes({ bed: "drums", contrast: 40 })).toContain("speed-beats-contrast");
    expect(codes({ bed: "drums" }, { holds: [{ at: 10, frames: 30 }] })).toContain("speed-beats-holds");
    expect(codes({ bed: "drums" }, {}, [100])).toContain("speed-beats-few");
    // Too little content for the scene: even the beats play near full speed, so nothing reads as slow motion.
    expect(compileSpeed({ source: 600, beats: { bed: "drums", contrast: 2 } }, 262, 30, () => undefined, kicks).problems.map(item => item.code)).toContain("speed-beats-flat");
    expect(compileSpeed({ source: 2000, beats: { bed: "drums" } }, 262, 30, () => undefined, kicks).problems.map(item => item.code)).toContain("speed-fast");
  });

  it("compiles the example: the kicks land on slow motion, and a bed without a tempo is refused", () => {
    const doc = JSON.parse(readFileSync("examples/film/velocity-edit.film.json", "utf8")) as FilmDocument;
    const result = compileFilm(doc);
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const scene = result.film.scenes[0], v = steps(scene.speed!.map);
    for (const hit of scene.hits![0].frames) expect(v[hit]).toBeLessThan(.45);
    const codes = (change: (doc: FilmDocument) => FilmDocument) => compileFilm(change(doc)).diagnostics.map(item => item.code);
    expect(codes(d => ({ ...d, audio: { ...d.audio!, beds: d.audio!.beds!.map(bed => ({ ...bed, bpm: undefined })) } }))).toContain("speed-beats-tempo");
    expect(codes(d => ({ ...d, scenes: d.scenes.map(s => ({ ...s, speed: { ...s.speed!, beats: { bed: "nope" } } })) } as FilmDocument))).toContain("speed-beats-bed");
  });
});
