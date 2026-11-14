import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import { evaluatePencilMark, hatchPencilRegion, inspectPencilDrawing } from "../registry/video/colored-pencil";
import { ColoredPencilSciencePlate, coloredPencilExample, PENCIL_TEXT_ZONES } from "../src/video/colored-pencil-science";
import { compileFilm } from "../registry/video/film-document";
import { COLOR_PENCIL_FILM } from "../src/video/colored-pencil-film";
import portableFilm from "../examples/film/colored-pencil-science.film.json";

describe("material-native colour-pencil science art", () => {
  it("is pure under out-of-order frame seeking and supports an immediate reduced-motion end state", () => {
    const at = (frame: number) => evaluatePencilMark(frame, { startFrame: 40, durationFrames: 90 });
    expect(at(0)).toBe(0);
    expect(at(40)).toBe(0);
    expect(at(85)).toBeCloseTo(.5);
    expect(at(130)).toBe(1);
    expect(at(300)).toBe(1);
    at(300); at(5); at(120);
    expect(at(85)).toBeCloseTo(.5);
    expect(evaluatePencilMark(0, { startFrame: 40, durationFrames: 90 }, true)).toBe(1);
  });

  it("creates bounded directional pigment strokes with stable seed and pressure variation", () => {
    const region = coloredPencilExample("leaf", "landscape").regions[0];
    const first = hatchPencilRegion(region, region.layers[0]);
    expect(first.length).toBeGreaterThan(20);
    expect(first).toEqual(hatchPencilRegion(region, region.layers[0]));
    expect(new Set(first.map(mark => mark.width.toFixed(3))).size).toBeGreaterThan(4);
    expect(first.every(mark => Number.isFinite(mark.width) && mark.width > 0 && mark.path.startsWith("M"))).toBe(true);
    expect(first.some(mark => (mark.path.match(/M/g) ?? []).length >= 5)).toBe(true);
    expect(first.every(mark => mark.path.length < 5500 && !/NaN|Infinity/.test(mark.path))).toBe(true);
    // Geometry stays in local paper coordinates; the SVG compositor rotates each pass.
    expect(hatchPencilRegion(region, { ...region.layers[0], angle: region.layers[0].angle + 65 }))
      .toEqual(first);
  });

  it("renders physically bounded curvature and tonal value independent of seek order", () => {
    const drawing = coloredPencilExample("leaf", "landscape");
    const region = drawing.regions[0], layer = {...region.layers[0], flow: 32, tone: "core" as const};
    expect(inspectPencilDrawing({ ...drawing, regions: [{
      ...region, layers: [layer],
    }] })).toEqual([]);
    const marks = hatchPencilRegion(region, layer);
    expect(marks[0].angleOffset).toBeCloseTo(-32);
    expect(marks[marks.length - 1].angleOffset).toBeCloseTo(32);
    const edge = marks.slice(0, 10).reduce((sum, mark) => sum + mark.opacity, 0) / 10;
    const midpoint = Math.floor(marks.length / 2);
    const core = marks.slice(midpoint - 5, midpoint + 5).reduce((sum, mark) => sum + mark.opacity, 0) / 10;
    expect(core).toBeGreaterThan(edge);
    expect(marks).toEqual(hatchPencilRegion(region, layer));
    expect(inspectPencilDrawing({ ...drawing, regions: [{
      ...region, layers: [{ ...layer, flow: 61 }],
    }] })).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [{
      ...region, layers: [{ ...layer, tone: "unbounded" as "core" }],
    }] })).not.toEqual([]);
  });

  it("supports deterministic paper-native fibre and stipple marks, not just parallel hatch strokes", () => {
    const drawing = coloredPencilExample("leaf", "landscape");
    const region = drawing.regions[0], base = region.layers[0];
    const results = (["hatch", "fiber", "stipple"] as const).map(texture => {
      const layer = { ...base, texture };
      expect(inspectPencilDrawing({ ...drawing, regions: [{ ...region, layers: [layer] }] })).toEqual([]);
      const marks = hatchPencilRegion(region, layer);
      expect(marks).toEqual(hatchPencilRegion(region, layer));
      expect(marks.length).toBeGreaterThan(10);
      expect(marks.every(mark => mark.path.length < 5500 &&
        !/NaN|Infinity/.test(mark.path) && mark.startFrame >= 0)).toBe(true);
      return marks;
    });
    expect(results[0][0].path).not.toBe(results[1][0].path);
    expect(results[1][0].path).not.toBe(results[2][0].path);
    expect(results[2][0].path).toContain(" l");
    expect(inspectPencilDrawing({ ...drawing, regions: [{ ...region,
      layers: [{ ...base, texture: "spray" as "hatch" }],
    }] })).not.toEqual([]);
  });

  it("never reveals an unpainted specimen silhouette before the pencil arrives", () => {
    const blank = renderToStaticMarkup(<ColoredPencilSciencePlate aspect="landscape" subject="leaf" frame={0}/>);
    const painted = renderToStaticMarkup(<ColoredPencilSciencePlate aspect="landscape" subject="leaf" frame={260}/>);
    expect(blank).not.toContain("data-km-pencil-underpaint");
    expect(painted).toContain("data-km-pencil-underpaint");
  });

  it("rejects bad frames, geometry, missing regions and unbounded paint density", () => {
    const drawing = coloredPencilExample("leaf", "landscape");
    expect(inspectPencilDrawing(drawing)).toEqual([]);
    const shade = drawing.regions[0];
    expect(shade.underpaintOpacity).toBeGreaterThan(.2);
    expect(inspectPencilDrawing({...drawing, regions: [{
      ...shade, underpaintOpacity: 1.3,
    }]})).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [] })).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [{ ...drawing.regions[0], bounds: [0, 0, -1, 100] }] })).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [{ ...drawing.regions[0], bounds: [0, 0, 4000, 4000] }] })).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [{ ...drawing.regions[0],
      layers: [{ ...drawing.regions[0].layers[0], spacing: .001 }] }] })).not.toEqual([]);
    expect(() => evaluatePencilMark(-1, { startFrame: 0, durationFrames: 10 })).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<PencilDrawing drawing={{ ...drawing, seed: -3 }} frame={100}/>)).toThrow(/Invalid pencil/);
  });

  for (const aspect of ["landscape", "portrait"] as const) {
    for (const subject of ["leaf", "crystal"] as const) {
      it("renders original " + subject + " pencil work for " + aspect + " with distinct graphite and pigmented strokes", () => {
        const drawing = coloredPencilExample(subject, aspect);
        expect(inspectPencilDrawing(drawing)).toEqual([]);
        const at = (frame: number, reducedMotion = false) =>
          renderToStaticMarkup(<ColoredPencilSciencePlate aspect={aspect} subject={subject}
            frame={frame} reducedMotion={reducedMotion}/>);
        const start = at(0), middle = at(125), completed = at(275);
        expect(start).toContain('data-km-colored-pencil=""');
        expect(completed).toContain('data-km-pigment-layer=');
        expect(completed).toContain('data-km-graphite=');
        expect(completed).toContain("clipPath");
        expect(completed).toContain("stroke-dasharray");
        expect(completed).toContain('width="1024" height="1024"');
        expect(completed).not.toContain('width="140" height="140"');
        expect(completed).toContain("FIELD NOTES");
        expect(completed).toContain(subject === "leaf" ? "VEIN" : "FACET");
        expect(completed).toContain(aspect === "landscape" ? 'viewBox="0 0 960 540"' : 'viewBox="0 0 540 960"');
        expect(start).not.toEqual(middle);
        expect(middle).not.toEqual(completed);
        expect(at(275)).toBe(completed);
        expect(at(0, true)).toContain("FIELD NOTES");
        expect(PENCIL_TEXT_ZONES[aspect].footer.y + PENCIL_TEXT_ZONES[aspect].footer.height)
          .toBeLessThanOrEqual(drawing.height);
      });
    }
  }

  it("compiles the portable FD1 film with independent scene frames in both aspect ratios", () => {
    expect(portableFilm).toEqual(COLOR_PENCIL_FILM);
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(portableFilm, { outputId });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.film.durationFrames).toBe(353);
      expect(result.film.scenes.every(scene => scene.kind === "slot")).toBe(true);
    }
  });
});
