import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileSpeed, SPEED_CUT_BOOST, speedOutput, speedSource } from "../registry/video/film-speed";
import type { FilmSpeed } from "../registry/video/film-speed";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";

const none = () => undefined;
const solve = (speed: FilmSpeed, frames = 96, moment: (id: string) => number | undefined = none) => compileSpeed(speed, frames, 30, moment);

describe("speed ramps", () => {
  it("fits the content into the scene exactly, never running backwards", () => {
    const { speed, problems } = solve({ source: 150, holds: [{ at: 75, frames: 45 }] });
    expect(problems).toEqual([]);
    expect(speed!.map[0]).toBe(0);
    expect(speed!.map[96]).toBeCloseTo(150, 6);
    expect(speed!.map.every((v, i) => !i || v > speed!.map[i - 1])).toBe(true);
  });
  it("centres each hold on its moment and slows to near-stillness through it", () => {
    const { speed } = solve({ source: 150, holds: [{ at: 75, frames: 45 }] }), hold = speed!.holds[0], mid = (hold.start + hold.end) / 2;
    expect(speedSource(speed!, mid)).toBeCloseTo(75, 0);
    const v = (f: number) => speedSource(speed!, f + 1) - speedSource(speed!, f);
    expect(v(mid)).toBeLessThan(speed!.rate * .1);
    expect(v(2)).toBeCloseTo(speed!.rate, 1);
    expect(hold.end - hold.start).toBe(45);
  });
  it("places two holds in order, each on its own moment", () => {
    const { speed, problems } = solve({ source: 300, holds: [{ at: 90, frames: 30 }, { at: 220, frames: 30 }] }, 160);
    expect(problems.filter(p => p.severity === "error")).toEqual([]);
    for (const hold of speed!.holds) expect(speedSource(speed!, (hold.start + hold.end) / 2)).toBeCloseTo(hold.at, 0);
  });
  it("runs fast into and out of a cut", () => {
    const { speed } = solve({ source: 150, enter: 12, exit: 12 }, 120), v = (f: number) => speedSource(speed!, f + 1) - speedSource(speed!, f);
    expect(v(0)).toBeGreaterThan(speed!.rate * (SPEED_CUT_BOOST - .4));
    expect(v(118)).toBeGreaterThan(speed!.rate * (SPEED_CUT_BOOST - .4));
    expect(v(60)).toBeCloseTo(speed!.rate, 2);
  });
  it("finds where a content moment lands, and plays evenly under reduced motion", () => {
    const { speed } = solve({ source: 150, holds: [{ at: 75, frames: 45 }] });
    for (const content of [10, 75, 140]) expect(speedSource(speed!, speedOutput(speed!, content))).toBeCloseTo(content, -1);
    expect(speedSource(speed!, 48, true)).toBeCloseTo(75);
  });
  it("names holds by moment, and reports what cannot work", () => {
    expect(solve({ source: 150, holds: [{ at: "settle", frames: 40 }] }, 96, id => id === "settle" ? 70 : undefined).speed!.holds[0].at).toBe(70);
    const codes = (speed: FilmSpeed, frames = 96) => solve(speed, frames).problems.map(p => p.code);
    expect(codes({ source: 150, holds: [{ at: "nowhere", frames: 40 }] })).toContain("speed-hold-moment");
    expect(codes({ source: 150, holds: [{ at: 300, frames: 40 }] })).toContain("speed-hold-range");
    expect(codes({ source: 150, holds: [{ at: 75, frames: 20 }] })).toContain("speed-hold-short");
    expect(codes({ source: 150, holds: [{ at: 75, frames: 95 }] })).toContain("speed-impossible");
    expect(codes({ source: 600 }, 90)).toContain("speed-fast");
    expect(codes({ source: 0 })).toContain("speed-source");
  });
});

describe("speed ramps in a film", () => {
  const example = JSON.parse(readFileSync("examples/film/speed-ramp-3d.film.json", "utf8")) as FilmDocument;
  it("compiles the example: content at its own length, moments where the ramp puts them", () => {
    const result = compileFilm(example, { outputId: "draft" });
    expect(result.diagnostics.filter(d => d.severity === "error" || d.code.startsWith("speed-"))).toEqual([]);
    if (!result.ok) return;
    const [pass, follow] = result.film.scenes;
    // The pass's hold is named by its moment: the car level with the lens. The moment lands at the hold's centre.
    const cue = pass.cues.find(item => item.id === "pass")!, hold = pass.speed!.holds[0];
    expect(hold.at).toBe(75);
    expect(Math.abs(cue.frame - pass.startFrame - (hold.start + hold.end) / 2)).toBeLessThanOrEqual(1);
    expect(result.film.reviewFrames.find(frame => frame.label === "pass")!.frame).toBe(cue.frame);
    // The follow shot comes out of the cut fast, then settles to its baseline.
    const v = (f: number) => speedSource(follow.speed!, f + 1) - speedSource(follow.speed!, f);
    expect(v(0)).toBeGreaterThan(v(60) * 2);
  });
  it("warns when a ramp leaves text too little time, or speeds up words and interfaces", () => {
    const withTitle = structuredClone(example) as unknown as { scenes: Array<{ content: { spec: Record<string, unknown> } }> };
    withTitle.scenes[0].content.spec.title = { text: "Every corner, faster", enter: 84 };
    expect(compileFilm(withTitle).diagnostics.map(d => d.code)).toContain("speed-text-short");
    const card: FilmDocument = { schemaVersion: 1, id: "c", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 640, height: 360 }],
      scenes: [{ id: "card", recipeId: "card", durationFrames: 60, speed: { source: 120 }, content: { card: "headline", text: "Fast words" } }] };
    expect(compileFilm(card).diagnostics.map(d => d.code)).toContain("speed-on-text");
  });
  it("checks the content at its own length, not the scene's", () => {
    // A hero turn whose settle (frame 100) lies past the scene's 90 output frames is fine when it plays 160 frames of content.
    const doc: FilmDocument = { schemaVersion: 1, id: "t", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 640, height: 360 }],
      scenes: [{ id: "turn", recipeId: "shot-3d", durationFrames: 90, speed: { source: 160 }, content: { shot: "hero-turn", subject: "phone", label: "A phone turns.", spec: { yawFrom: -60, yawTo: -30, settleFrame: 100 } } }] };
    expect(compileFilm(doc).diagnostics.filter(d => d.severity === "error")).toEqual([]);
  });
});
