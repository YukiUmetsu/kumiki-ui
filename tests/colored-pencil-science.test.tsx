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
    // Geometry stays in local paper coordinates; the SVG compositor rotates each pass.
    expect(hatchPencilRegion(region, { ...region.layers[0], angle: region.layers[0].angle + 65 }))
      .toEqual(first);
  });

  it("rejects bad frames, geometry, missing regions and unbounded paint density", () => {
    const drawing = coloredPencilExample("leaf", "landscape");
    expect(inspectPencilDrawing(drawing)).toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [] })).not.toEqual([]);
    expect(inspectPencilDrawing({ ...drawing, regions: [{ ...drawing.regions[0], bounds: [0, 0, -1, 100] }] })).not.toEqual([]);
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
