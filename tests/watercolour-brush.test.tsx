import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WatercolourSurface } from "../registry/video/watercolour-brush-react";
import { buildBrushRibbon, evaluatePaintStroke, inspectPaintSurface, paintHash,
  samplePaintCoverage, sampleBrushCenterline } from "../registry/video/watercolour-brush";
import { compileFilm } from "../registry/video/film-document";
import { paintExampleSpec } from "../src/video/watercolour-brush-demo";
import { WATERCOLOUR_BRUSH_FILM } from "../src/video/watercolour-brush-film";
import portable from "../examples/film/watercolour-brush-study.film.json";
import { loadFilmSlots } from "../src/film/film-slots";

describe("WM1 watercolour and physical brush surfaces", () => {
  const original = paintExampleSpec("landscape", "wild-iris");

  it("validates the authored paper, pressure, palette and absolute frame contract", () => {
    expect(inspectPaintSurface(original)).toEqual([]);
    const invalid = { ...original, strokes: [{ ...original.strokes[0],
      points: [{ x: -1, y: 1, pressure: 1 }, { x: 30, y: 2, pressure: 4 }],
      water: 1.5, tone: 8, drawFrames: 0 }] } as unknown as typeof original;
    expect(inspectPaintSurface(invalid).map(x => x.path)).toEqual(expect.arrayContaining([
      "/strokes/0/points/0", "/strokes/0/points/1/pressure",
      "/strokes/0/water", "/strokes/0/tone", "/strokes/0/drawFrames",
    ]));
    expect(() => evaluatePaintStroke(original.strokes[0], -1)).toThrow(RangeError);
  });

  it("constructs stable tapered filled ribbons with a real pressure profile", () => {
    const stroke = original.strokes[4];
    const samples = sampleBrushCenterline(stroke);
    expect(samples.length).toBeGreaterThan(stroke.points.length);
    expect(Math.max(...samples.map(s => s.radius))).toBeGreaterThan(Math.min(...samples.map(s => s.radius)));
    expect(buildBrushRibbon(stroke, 0)).toEqual({ path: "", centerline: [] });
    const half = buildBrushRibbon(stroke, .5, 0, original.seed);
    const full = buildBrushRibbon(stroke, 1, 0, original.seed);
    expect(half.path.startsWith("M")).toBe(true);
    expect(half.path.endsWith("Z")).toBe(true);
    expect(full.centerline.length).toBeGreaterThan(half.centerline.length);
    expect(full.path).not.toEqual(half.path);
    expect(buildBrushRibbon(stroke, 1, 0, original.seed)).toEqual(full);
  });

  it("models deposition, spread, absorption and then a permanent dry hold", () => {
    const s = original.strokes[3];
    const begin = evaluatePaintStroke(s, s.startFrame);
    const paint = evaluatePaintStroke(s, s.startFrame + Math.ceil(s.drawFrames * .7));
    const depositEnd = evaluatePaintStroke(s, s.startFrame + s.drawFrames);
    const spread = evaluatePaintStroke(s, s.startFrame + s.drawFrames + 20);
    const dry = evaluatePaintStroke(s, s.startFrame + s.drawFrames + 120);
    expect(begin.deposit).toBe(0);
    expect(paint.deposit).toBeGreaterThan(0);
    expect(depositEnd.deposit).toBe(1);
    expect(depositEnd.spread).toBe(0);
    expect(spread.spread).toBeGreaterThan(0);
    expect(spread.absorption).toBeGreaterThan(0);
    expect(spread.wetness).toBeGreaterThan(0);
    expect(dry).toEqual({ id: s.id, deposit: 1, spread: 1, absorption: 1, wetness: 0, settled: true });
    expect(evaluatePaintStroke(s, s.startFrame + s.drawFrames + 300)).toEqual(dry);
    expect(evaluatePaintStroke(s, 0, true)).toEqual(dry);
  });

  it("is exactly seek-safe at the CPU surface and gives a bounded pigment coverage", () => {
    const inspect = (f: number) => original.strokes.map(stroke =>
      evaluatePaintStroke(stroke, f));
    const mid = inspect(170);
    const sample = samplePaintCoverage(original, 170, 700, 260);
    inspect(390); inspect(0); inspect(210);
    expect(inspect(170)).toEqual(mid);
    expect(samplePaintCoverage(original, 170, 700, 260)).toBe(sample);
    expect(sample).toBeGreaterThanOrEqual(0);
    expect(sample).toBeLessThanOrEqual(1);
    expect(paintHash(31, 700, 260)).toBe(paintHash(31, 700, 260));
    expect(paintHash(31, 701, 260)).not.toBe(paintHash(31, 700, 260));
    expect(samplePaintCoverage(original, 0, 700, 260)).toBe(0);
  });

  it("preserves the paper and illustration across portrait, alternative subject and reduced motion", () => {
    for (const aspect of ["landscape", "portrait"] as const) {
      for (const subject of ["wild-iris", "coastal-dawn"] as const) {
        const spec = paintExampleSpec(aspect, subject);
        expect(inspectPaintSurface(spec)).toEqual([]);
        const html = renderToStaticMarkup(<WatercolourSurface spec={spec} frame={350}/>);
        expect(html).toContain('data-km-watercolour=""');
        expect(html).toContain('data-km-paper-tooth=""');
        expect(html).toContain('data-km-wet-spread=""');
        expect(html).toContain('data-km-deposition=""');
        expect(html).toContain('data-km-brush-stroke="');
        expect(html).toContain("feDisplacementMap");
        expect(html).toContain("maskUnits");
        const reduced = renderToStaticMarkup(<WatercolourSurface spec={spec} frame={0} reducedMotion/>);
        expect(reduced).toContain('data-km-paint-phase="dry"');
        expect(reduced).toContain('data-km-brush-stroke="');
        const inkOnly = renderToStaticMarkup(<WatercolourSurface spec={spec} frame={350} transparentPaper/>);
        expect(inkOnly).not.toContain('data-km-paper-tooth=""');
      }
    }
    expect(paintExampleSpec("portrait", "wild-iris").width).toBe(540);
    expect(paintExampleSpec("landscape", "coastal-dawn").width).toBe(960);
  });

  it("compiles both unrelated painted scenes into the existing FilmStage timeline", () => {
    for (const outputId of ["landscape", "portrait"]) {
      const compiled = compileFilm(WATERCOLOUR_BRUSH_FILM, { outputId });
      expect(compiled.ok).toBe(true);
      if (compiled.ok) {
        expect(compiled.film.scenes).toHaveLength(2);
        expect(compiled.film.durationFrames).toBe(820);
        expect(compiled.film.scenes.map(s => s.id)).toEqual(["iris-painting", "coastal-painting"]);
      }
    }
  });

  it("exports the exact portable FD1 document through the production slot resolver", async () => {
    expect(portable).toEqual(WATERCOLOUR_BRUSH_FILM);
    for (const outputId of ["landscape", "portrait"] as const) {
      const compiled = compileFilm(portable, { outputId });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      const slot = await loadFilmSlots(compiled.film);
      const html = renderToStaticMarkup(<>{slot({ slot: "watercolour-brush", label: "Iris", props: { subject: "wild-iris" } },
        { frame: 350, fps: { num: 30, den: 1 }, durationFrames: 410,
          width: compiled.film.width, height: compiled.film.height, reducedMotion: false })}</>);
      expect(html).toContain("data-km-watercolour");
      expect(html).toContain("The quiet");
      expect(html).toContain("ILLUSTRATION STUDY");
    }
  });

  it("rejects an invalid absolute frame rather than rendering an untracked state", () => {
    expect(() => renderToStaticMarkup(<WatercolourSurface spec={original} frame={-1}/>)).toThrow(RangeError);
  });
});
