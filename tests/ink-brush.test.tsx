import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { compileFilm } from "../registry/video/film-document";
import { InkBrushCanvas } from "../registry/video/ink-brush-react";
import { evaluateInkBrush, inspectInkBrush, inkHash, INK_DENSITIES } from "../registry/video/ink-brush";
import type { InkBrushSpec } from "../registry/video/ink-brush";
import { inkPosterSpec, InkBrushPoster } from "../src/video/ink-brush-demo";
import { INK_BRUSH_FILM } from "../src/video/ink-brush-film";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/ink-brush-studies.film.json";

describe("INK1 authored material-native brush deposition", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    for (const subject of ["delta", "branch"] as const) {
      it("validates " + aspect + " / " + subject + " with authored geometry", () => {
        const spec = inkPosterSpec(aspect, subject);
        expect(inspectInkBrush(spec)).toEqual([]);
        expect(spec.strokes.length).toBeGreaterThanOrEqual(10);
        expect(new Set(spec.strokes.map(s => s.id)).size).toBe(spec.strokes.length);
        expect(spec.strokes.every(s => s.points.every(p => p.x >= 0 && p.x <= spec.width &&
          p.y >= 0 && p.y <= spec.height))).toBe(true);
        expect(evaluateInkBrush(spec, 0).every(g => g.outline === "")).toBe(true);
        expect(evaluateInkBrush(spec, 280).every(g => g.outline.length > 0 && g.progress === 1)).toBe(true);
        const html = renderToStaticMarkup(createElement(InkBrushPoster,
          { aspect, subject, frame: 180, paperTooth: .48 }));
        expect(html).toContain('data-km-ink-brush=""');
        expect(html).toContain("data-km-ink-poster-text");
        expect(html).toContain("data-km-ink-stroke=");
        expect(html).toContain(subject === "delta" ? "DELTA" : "BRANCH");
      });
    }
  }

  it("has five meaningful density values and doesn't synthesize a missing brush", () => {
    expect(INK_DENSITIES).toHaveLength(5);
    expect(new Set(INK_DENSITIES).size).toBe(5);
    expect(new Set(inkPosterSpec("landscape", "delta").strokes.map(s => s.tone)).size).toBe(5);
    expect(inspectInkBrush({ ...inkPosterSpec("landscape", "delta"), strokes: [] })
      .map(i => i.path)).toContain("/strokes");
  });

  it("is seek exact after arbitrary frame order, stable at final hold, and reduced-motion safe", () => {
    const spec = inkPosterSpec("portrait", "branch", 91);
    const at = (n: number) => evaluateInkBrush(spec, n);
    const a = at(190), b = at(240), hold = at(300);
    at(0); at(5); at(230); at(11); at(300);
    expect(at(190)).toEqual(a);
    expect(at(240)).toEqual(b);
    expect(at(350)).toEqual(hold);
    expect(evaluateInkBrush(spec, 0, true).map(g => g.outline))
      .toEqual(hold.map(g => g.outline));
    expect(inkHash(91, 15, 8)).toBe(inkHash(91, 15, 8));
    expect(inkHash(91, 15, 8)).not.toBe(inkHash(92, 15, 8));
  });

  it("pressure, pace, load, and dry-brush splitting change the *mark*, not a full-screen filter", () => {
    const spec = inkPosterSpec("landscape", "delta");
    const mark = spec.strokes[0];
    const changedPressure = { ...spec, strokes: [
      { ...mark, points: mark.points.map((p, i) => ({ ...p, pressure: i === 2 ? .15 : p.pressure })) },
      ...spec.strokes.slice(1),
    ] };
    const changedPace = { ...spec, strokes: [
      { ...mark, points: mark.points.map((p, i) => ({ ...p, pace: i === 2 ? 3 : p.pace })) },
      ...spec.strokes.slice(1),
    ] };
    const noDry = { ...spec, strokes: [{ ...mark, dryness: 0 }, ...spec.strokes.slice(1)] };
    const full = evaluateInkBrush(spec, 40)[0];
    expect(full.outline).not.toBe(evaluateInkBrush(changedPressure, 40)[0].outline);
    expect(full.outline).not.toBe(evaluateInkBrush(changedPace, 40)[0].outline);
    expect(full.gaps.length).toBeGreaterThan(0);
    expect(evaluateInkBrush(noDry, 40)[0].gaps).toEqual([]);
    expect(evaluateInkBrush({ ...spec, strokes: [{ ...mark, load: .1 }, ...spec.strokes.slice(1)] }, 40)[0].opacity)
      .toBeLessThan(full.opacity);
    expect(evaluateInkBrush({ ...spec, seed: 11 }, 40)[0].outline).not.toBe(full.outline);
  });

  it("rejects malformed strokes with field paths, invalid frames, and unsupported output settings", () => {
    const spec = inkPosterSpec("landscape", "branch");
    const first = spec.strokes[0];
    const invalid: InkBrushSpec = { ...spec, strokes: [
      { ...first, points: [{ x: -10, y: 80, pressure: 5, pace: 0 },
        ...first.points.slice(1)], dryness: 3, width: -1 },
      ...spec.strokes.slice(1),
    ] };
    const paths = inspectInkBrush(invalid).map(i => i.path);
    expect(paths).toContain("/strokes/0/width");
    expect(paths).toContain("/strokes/0/dryness");
    expect(paths).toContain("/strokes/0/points/0");
    expect(paths).toContain("/strokes/0/points/0/pressure");
    expect(paths).toContain("/strokes/0/points/0/pace");
    expect(() => evaluateInkBrush(invalid, 45)).toThrow(/strokes\/0/);
    expect(() => evaluateInkBrush(spec, -1)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(InkBrushCanvas,
      { spec, frame: 1, paperTooth: 3 }))).toThrow(/paperTooth/);
    expect(() => inkPosterSpec("landscape", "delta", 17, 9)).toThrow(/widthScale/);
  });

  it("ships a portable film and resolves six original shots through production FilmStage slots", async () => {
    expect(portable).toEqual(INK_BRUSH_FILM);
    for (const aspect of ["landscape", "portrait"] as const) {
      const compiled = compileFilm(portable, { outputId: aspect });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(600);
      expect(compiled.film.scenes).toHaveLength(6);
      const render = await loadFilmSlots(compiled.film);
      for (const subject of ["delta", "branch"] as const) {
        const element = render(
          { slot: "ink-brush-study", label: "An original brush mark",
            props: { subject, offsetFrame: 100 } },
          { frame: 50, fps: { num: 30, den: 1 }, durationFrames: 115,
            width: compiled.film.width, height: compiled.film.height, reducedMotion: false },
        );
        const html = renderToStaticMarkup(createElement("div", null, element));
        expect(html).toContain('data-km-ink-brush=""');
        expect(html).toContain('data-km-ink-frame="150"');
      }
    }
  });
});
