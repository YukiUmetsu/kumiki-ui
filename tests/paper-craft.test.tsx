import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileFilm } from "../registry/video/film-document";
import { evaluatePaperCraft, inspectPaperCraft, PAPER_STYLES, paperHash } from "../registry/video/paper-craft";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { paperCraftExampleSpec } from "../src/video/paper-craft-demo";
import { PAPER_CRAFT_FILM } from "../src/video/paper-craft-film";
import portable from "../examples/film/paper-craft-garden.film.json";
import { loadFilmSlots } from "../src/film/film-slots";

describe("PAPER1 native paper cut, fold, light and puppet", () => {
  it("keeps the portable FD1 document identical to the typed production film", () => {
    expect(portable).toEqual(PAPER_CRAFT_FILM);
    for (const outputId of ["landscape", "portrait"]) {
      const compiled = compileFilm(portable, { outputId });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.scenes).toHaveLength(5);
      expect(compiled.film.scenes.every(s => s.kind === "slot")).toBe(true);
    }
  });
  for (const medium of PAPER_STYLES) {
    for (const aspect of ["landscape", "portrait"] as const) {
      it(`${medium} ${aspect}: validates and renders actual separate cut-out masks`, () => {
        const spec = paperCraftExampleSpec(medium, aspect);
        expect(inspectPaperCraft(spec)).toEqual([]);
        expect(spec.layers.length).toBeGreaterThan(7);
        expect(spec.layers.some(l => l.holes?.length)).toBe(true);
        expect(spec.layers.some(l => l.motion === "swing" && l.pivot)).toBe(true);
        const html = renderToStaticMarkup(React.createElement(PaperCraftStage, {
          spec, frame:182, "aria-label": "Paper garden scene" }));
        expect(html).toContain('data-km-paper-style="' + medium + '"');
        expect(html).toContain('data-km-paper-layer="bird-wing"');
        expect(html).toContain("<clipPath");
        expect(html).toContain('clip-rule="evenodd"');
        expect(html).toContain("<path");
        expect(html).toContain("Paper garden scene");
        expect((html.match(/data-km-paper-layer=/g) || []).length).toBe(spec.layers.length);
      });
    }
  }
  it("is pure under shuffled seeking and repeats a final dry paper hold exactly", () => {
    const s = paperCraftExampleSpec("lightbox");
    const final = evaluatePaperCraft(s, 172);
    evaluatePaperCraft(s, 0);
    evaluatePaperCraft(s, 73);
    evaluatePaperCraft(s, 19);
    expect(evaluatePaperCraft(s, 172)).toEqual(final);
    expect(evaluatePaperCraft(s, 190).layers.map(x=>x.progress)).toEqual(final.layers.map(x=>x.progress));
    expect(paperHash(s.seed,12,7)).toBe(paperHash(s.seed,12,7));
    expect(paperHash(s.seed,12,7)).not.toBe(paperHash(s.seed,13,7));
  });
  it("honours reduced motion and validates hostile boundary inputs", () => {
    const s = paperCraftExampleSpec("kirigami");
    expect(evaluatePaperCraft(s, 0, true).layers.every(x => x.progress === 1)).toBe(true);
    expect(evaluatePaperCraft(s, 0).layers.every(x => x.progress === 0)).toBe(true);
    expect(() => evaluatePaperCraft(s, -1)).toThrow(RangeError);
    expect(() => evaluatePaperCraft(s, .5)).toThrow(RangeError);
    expect(inspectPaperCraft({...s, layers:[s.layers[0],s.layers[0]]}).some(x => x.path.endsWith(".id"))).toBe(true);
    expect(inspectPaperCraft({...s, layers:[{...s.layers[0],color:"url(javascript:evil)"}]}).length).toBeGreaterThan(0);
  });
  it("constrains hinge rotation, independent folds and material-specific illumination", () => {
    const base = paperCraftExampleSpec("kirigami");
    const fold = evaluatePaperCraft(base, 30).layers.find(x => x.id === "moon-disc")!;
    expect(fold.scaleX).toBeGreaterThan(0);
    expect(fold.scaleX).toBeLessThan(1);
    const puppet = evaluatePaperCraft(paperCraftExampleSpec("shadow-puppet"), 120);
    expect(Math.abs(puppet.layers.find(x => x.id === "bird-wing")!.rotation)).toBeLessThanOrEqual(18);
    const html = renderToStaticMarkup(React.createElement(PaperCraftStage, {
      spec:paperCraftExampleSpec("shadow-puppet"),frame:140 }));
    expect(html).toContain('data-km-paper-style="shadow-puppet"');
    expect(html).toContain("<circle");
    expect(html).toContain("radialGradient");
  });
  it("runs every paper medium through the actual film:render slot loader", async () => {
    const result = compileFilm(portable, { outputId:"landscape" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const renderSlot = await loadFilmSlots(result.film);
    for (const medium of PAPER_STYLES) {
      const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
        renderSlot({slot:"paper-craft-study",label:"Paper garden",props:{medium}},{
          frame:150, fps:{num:30,den:1},durationFrames:174,
          width:960,height:540,reducedMotion:false })));
      expect(html).toContain("data-km-paper-style");
      expect(html).toContain(medium);
    }
  });
});
