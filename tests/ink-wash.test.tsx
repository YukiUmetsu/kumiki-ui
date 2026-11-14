import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import { InkWash } from "../registry/video/ink-wash-react";
import {
  INK_TONES, evaluateInkStroke, evaluateInkWash, flyingWhite, inkHash,
  inkHoldFrame, inkOutline, inkSamples, inspectInkWash,
} from "../registry/video/ink-wash";
import { inkExampleSpec, INK_READING_ZONE } from "../src/video/ink-wash-demo";
import { INK_WASH_FILM } from "../src/video/ink-wash-film";

describe("INK1 pressure-shaped paper pigment engine", () => {
  const spec = inkExampleSpec("landscape", "landscape");
  it("exposes five calibrated values and retains distinct pressure/brush moisture inputs", () => {
    expect(Object.values(INK_TONES)).toHaveLength(5);
    expect(Object.values(INK_TONES)).toEqual([.16, .31, .5, .73, 1]);
    expect(spec.strokes.some(s => s.water < .3)).toBe(true);
    expect(spec.strokes.some(s => s.water > .9)).toBe(true);
    expect(spec.strokes.some(s => s.points[0].pressure !== s.points[1].pressure)).toBe(true);
  });
  it.each(["landscape", "portrait"] as const)("validates original mountain and bamboo examples in %s", aspect => {
    for (const subject of ["landscape", "bamboo"] as const) {
      const art = inkExampleSpec(subject, aspect);
      expect(inspectInkWash(art)).toEqual([]);
      expect(art.strokes.length).toBeGreaterThan(25);
      expect(art.strokes.some(s => s.accent)).toBe(true);
      expect(art.strokes.every(s => s.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true);
      expect(INK_READING_ZONE[aspect].y + INK_READING_ZONE[aspect].height)
        .toBeLessThan(Math.min(...art.strokes.flatMap(s => s.points.map(p => p.y))) + 5);
    }
  });
  it("rejects duplicate ids, invalid tone, nonfinite control points, missing accent and bad timelines", () => {
    const a = spec.strokes[0];
    const broken = {
      ...spec, accent: undefined,
      strokes: [a, { ...a, tone: 2, points: [{ ...a.points[0], x: Number.NaN }, a.points[1]],
        drawFrames: 0, accent: true }],
    };
    const codes = inspectInkWash(broken).map(i => i.code);
    expect(codes).toEqual(expect.arrayContaining(["stroke-id", "brush-tone", "point", "timing", "accent"]));
    expect(inspectInkWash({ ...spec, seed: -1 }).map(p => p.code)).toContain("seed");
  });
  it("separates deposition, capillary spread, absorption and drying on one seekable frame axis", () => {
    const s = spec.strokes[0];
    const before = evaluateInkStroke(s, 0);
    expect(before.deposit).toBe(0);
    expect(before.spread).toBe(0);
    expect(before.absorbed).toBe(0);
    expect(before.dry).toBe(0);
    const drawing = evaluateInkStroke(s, s.startFrame + Math.floor(s.drawFrames * .7));
    expect(drawing.deposit).toBeGreaterThan(0);
    expect(drawing.deposit).toBeLessThan(1);
    expect(drawing.dry).toBe(0);
    const finished = evaluateInkStroke(s, inkHoldFrame(spec));
    expect(finished).toMatchObject({ deposit: 1, spread: 1, absorbed: 1, dry: 1 });
    const future = evaluateInkWash(spec, inkHoldFrame(spec) + 70);
    evaluateInkWash(spec, 42);
    evaluateInkWash(spec, 1);
    expect(evaluateInkWash(spec, inkHoldFrame(spec) + 70)).toEqual(future);
    expect(evaluateInkWash(spec, 0, true).every(state => state.dry === 1)).toBe(true);
    expect(() => evaluateInkWash(spec, -1)).toThrow(RangeError);
  });
  it("samples curved centerlines with pressure, tapered ends and fixed seeded fibers", () => {
    const s = spec.strokes.find(stroke => stroke.id === "pine-trunk")!;
    const full = inkSamples(s, 1), half = inkSamples(s, .5);
    expect(full.length).toBeGreaterThan(half.length);
    expect(full[0].x).toBeCloseTo(s.points[0].x);
    expect(full[full.length - 1].y).toBeCloseTo(s.points[s.points.length - 1].y);
    expect(inkOutline(s, 23, 1)).toMatch(/^M/);
    expect(inkOutline(s, 23, 0)).toBe("");
    expect(inkOutline(s, 23, 1)).toBe(inkOutline(s, 23, 1));
    expect(inkOutline(s, 23, 1)).not.toEqual(inkOutline(s, 23, .5));
    expect(inkOutline(s, 23, 1)).not.toMatch(/NaN|Infinity/);
    expect(inkHash(29, 10, 4)).toBe(inkHash(29, 10, 4));
    expect(inkHash(29, 10, 4)).not.toBe(inkHash(29, 11, 4));
  });
  it("produces flying-white split in dry brush, not in water-loaded strokes", () => {
    const dry = spec.strokes.find(stroke => stroke.id === "pine-trunk")!;
    const wet = spec.strokes.find(stroke => stroke.id === "remote-spine-c")!;
    expect(flyingWhite(dry, 47, 1).length).toBeGreaterThan(0);
    expect(flyingWhite(wet, 47, 1)).toEqual([]);
  });
  it("renders actual paper, separate pigment shapes and a reproducible final SVG with an accessible label", () => {
    const paint = (frame: number, reducedMotion = false) =>
      renderToStaticMarkup(createElement(InkWash, {
        spec, frame, reducedMotion, label: "Ink wash mountain and pine",
      }));
    const started = paint(0), complete = paint(420);
    expect(started).toContain('data-km-ink-wash=""');
    expect(started).not.toContain("data-km-ink-stroke=");
    expect(complete).toContain("Ink wash mountain and pine");
    expect(complete).toContain("mix-blend-mode:multiply");
    expect(complete).toContain("data-km-ink-paper=");
    expect(complete).toContain("data-km-ink-stroke=");
    expect(complete).toContain("<mask");
    expect(complete).toContain("data-km-ink-spread=");
    expect(complete).toBe(paint(420));
    expect(paint(0, true)).toContain("data-km-ink-stroke=");
    expect(() => renderToStaticMarkup(createElement(InkWash, { spec, frame: 40, grain: -1 })))
      .toThrow(RangeError);
    expect(renderToStaticMarkup(createElement(InkWash, {
      spec, frame: 420, transparentPaper: true,
    }))).not.toContain('fill="#F4F0E5"');
  });
  it("uses the existing FD1 slot and FilmStage outputs for both aspect ratios", () => {
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(INK_WASH_FILM, { outputId });
      expect(result.ok).toBe(true);
      expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
      if (!result.ok) continue;
      expect(result.film.durationFrames).toBe(420);
      expect(result.film.scenes).toHaveLength(3);
      expect(result.film.scenes.every(scene => scene.kind === "slot")).toBe(true);
    }
  });
});
