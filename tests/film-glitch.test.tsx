import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import { glitchBands, inspectGlitch } from "../registry/video/film-glitch";
import { GlitchFilter } from "../registry/video/film-glitch-react";

const cut = { seed: 42, intensity: .7 };

describe("glitch cut", () => {
  it("cuts the frame into bands that cover it exactly once", () => {
    for (const progress of [0, .3, .5, .8, 1]) {
      const bands = glitchBands(cut, progress, 8, 960, 540);
      expect(bands[0].y).toBe(0);
      bands.slice(1).forEach((band, i) => expect(band.y).toBe(bands[i].y + bands[i].height));
      expect(bands[bands.length - 1].y + bands[bands.length - 1].height).toBe(540);
    }
  });

  it("starts and ends clean, tears hardest in the middle, and hands every band to the next scene", () => {
    const start = glitchBands(cut, 0, 8, 960, 540), middle = glitchBands(cut, .5, 8, 960, 540), end = glitchBands(cut, 1, 8, 960, 540);
    expect(start.every(band => !band.incoming && band.dx === 0 && band.split === 0)).toBe(true);
    expect(end.every(band => band.incoming && band.dx === 0)).toBe(true);
    expect(Math.max(...middle.map(band => Math.abs(band.dx)))).toBeGreaterThan(20);
    expect(middle.some(band => band.split > 0)).toBe(true);
    // The same seed tears the same way; the layout holds for two frames, then changes.
    expect(glitchBands(cut, .5, 8, 960, 540)).toEqual(middle);
    expect(glitchBands(cut, 3 / 7, 8, 960, 540)).not.toEqual(glitchBands(cut, 5 / 7, 8, 960, 540));
    expect(inspectGlitch({ intensity: 3 }, 1, "").problems.map(item => item.code)).toEqual(["glitch-intensity"]);
  });

  it("draws every band on the outgoing layer and only its own bands on the incoming one", () => {
    const bands = glitchBands(cut, .5, 8, 960, 540), taken = bands.filter(band => band.incoming).length;
    const out = renderToStaticMarkup(<GlitchFilter id="g" bands={bands} incoming={false} width={960} height={540} />);
    const into = renderToStaticMarkup(<GlitchFilter id="g" bands={bands} incoming width={960} height={540} />);
    expect(out.match(/<feMergeNode/g)).toHaveLength(bands.length + 1);
    expect(into.match(/<feMergeNode/g)).toHaveLength(taken + 1);
  });

  it("compiles the example's glitch cuts and plays dissolves in their place for reduced motion", () => {
    const doc = JSON.parse(readFileSync("examples/film/glitch.film.json", "utf8")) as FilmDocument, result = compileFilm(doc);
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(Object.keys(result.film.glitches)).toEqual(["found", "hard", "mosh"]);
    expect(result.film.cut.transitions.map(item => item.kind)).toEqual(["dissolve", "dissolve", "dissolve"]);
  });
});
