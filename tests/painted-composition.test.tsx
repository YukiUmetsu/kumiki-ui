import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PaintedComposition } from "../registry/video/painted-composition-react";
import { inspectPaintedComposition, evaluatePaintWash, samplePigmentGrains,
  PAINTED_PALETTES } from "../registry/video/painted-composition";
import type { PaintWash, PaintedCompositionSpec } from "../registry/video/painted-composition";
import { paintedCameraAt, paintedDemoSpec, PAINTED_GENRES } from "../src/video/painted-composition-demo";
import { PAINTED_WORLDS_FILM } from "../src/video/painted-composition-film";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/painted-worlds.film.json";

describe("WM2 independently authored painterly compositions", () => {
  for (const output of ["landscape", "portrait"] as const) {
    for (const genre of PAINTED_GENRES) {
      it("preflights and SSR-renders " + output + "/" + genre + " subject on shared paper", () => {
        const spec = paintedDemoSpec(genre, output);
        expect(inspectPaintedComposition(spec)).toEqual([]);
        const html = renderToStaticMarkup(<PaintedComposition spec={spec} frame={280} />);
        expect(html).toContain("data-km-painted-composition");
        expect(html).toContain("data-km-paint-wash");
        expect(html).toContain("data-km-wash-pigment");
        expect(html).toContain("data-km-composition-paper");
        expect(html).toContain("mix-blend-mode:multiply");
        expect(html).toContain("feDisplacementMap");
        expect(html).toContain("clipPath");
        expect(html).toContain(output === "landscape" ? "0 0 960 540" : "0 0 540 960");
        const reduced = renderToStaticMarkup(<PaintedComposition spec={spec} frame={0} reducedMotion />);
        expect(reduced).toContain('data-km-wash-phase="dry"');
        const inkOnly = renderToStaticMarkup(<PaintedComposition spec={spec} frame={280} transparentPaper />);
        expect(inkOnly).not.toContain("data-km-composition-paper");
      });
    }
  }
  it("uses correct pigment phases and remains fixed after drying", () => {
    const spec = paintedDemoSpec("architecture", "landscape");
    const layer = spec.layers.find(l => l.kind === "wash") as PaintWash;
    const early = evaluatePaintWash(layer, 0);
    const middle = evaluatePaintWash(layer, layer.startFrame + Math.round(layer.paintFrames * .55));
    const drying = evaluatePaintWash(layer, layer.startFrame + layer.paintFrames + 20);
    const dry = evaluatePaintWash(layer, layer.startFrame + layer.paintFrames + 400);
    expect(early.deposit).toBe(0);
    expect(middle.deposit).toBeGreaterThan(0);
    expect(middle.deposit).toBeLessThan(1);
    expect(drying.spread).toBeGreaterThan(0);
    expect(dry).toEqual({deposit:1, spread:1, absorption:1, wetness:0, settled:true});
    expect(evaluatePaintWash(layer, layer.startFrame + layer.paintFrames + 999)).toEqual(dry);
    expect(evaluatePaintWash(layer, 0, true)).toEqual(dry);
    expect(() => evaluatePaintWash(layer, -1)).toThrow(RangeError);
  });
  it("has paper-locked pigment sampling and fixed-seed deterministic result", () => {
    const spec = paintedDemoSpec("science", "portrait");
    const wash = spec.layers.find(l => l.kind === "wash") as PaintWash;
    const a = samplePigmentGrains(wash, 99);
    expect(a.length).toBeGreaterThan(15);
    expect(samplePigmentGrains(wash, 99)).toEqual(a);
    expect(samplePigmentGrains(wash, 100)).not.toEqual(a);
    for (const g of a) {
      expect(g.x).toBeGreaterThanOrEqual(wash.bounds[0]);
      expect(g.y).toBeGreaterThanOrEqual(wash.bounds[1]);
      expect(g.x).toBeLessThanOrEqual(wash.bounds[0] + wash.bounds[2]);
      expect(g.y).toBeLessThanOrEqual(wash.bounds[1] + wash.bounds[3]);
    }
    const cam = paintedCameraAt(210);
    paintedCameraAt(0); paintedCameraAt(310);
    expect(paintedCameraAt(210)).toEqual(cam);
    expect(paintedCameraAt(210, true)).toEqual({x:0,y:0,zoom:1});
  });
  it("rejects unsupported colors, malformed paths, unbounded assets, no brush gestures, and leaking images", () => {
    const spec = paintedDemoSpec("nature", "landscape");
    const first = spec.layers.find(l => l.kind === "wash") as PaintWash;
    const broken: PaintedCompositionSpec = { ...spec, layers: [{
      ...first, pigment: "red", bounds: [-1, 2, 300, 200], path: "<script>alert(1)</script>",
      brushPath: undefined, brushWidth: undefined,
    }] };
    const errors = inspectPaintedComposition(broken).map(x => x.path);
    expect(errors).toEqual(expect.arrayContaining([
      "/layers/0/path","/layers/0/pigment","/layers/0/bounds","/layers/0/brushPath",
    ]));
    const image: PaintedCompositionSpec = { ...spec, layers: [{
      kind:"image", id:"bad-image", href:"javascript:alert('XSS')", opacity:1,
      bounds:[0,0,100,100], silhouettePath:"M0 0 L100 0 L100 100 L0 100 Z",
    }] };
    expect(inspectPaintedComposition(image).map(x => x.code)).toContain("image-href");
    const good = { ...image, layers: [{
      ...image.layers[0], href:"./assets/original-photo.png",
    }] };
    expect(inspectPaintedComposition(good)).toEqual([]);
    const imgHtml = renderToStaticMarkup(<PaintedComposition spec={good} frame={10}/>);
    expect(imgHtml).toContain("data-km-source-image");
  });
  it("preserves the complete pigment silhouette at draw completion", () => {
    const spec = paintedDemoSpec("product", "landscape");
    const w = spec.layers.find(l => l.kind === "wash" && l.paintFrames > 0) as PaintWash;
    const earlySpec: PaintedCompositionSpec = { ...spec, layers: [w] };
    const half = renderToStaticMarkup(<PaintedComposition spec={earlySpec}
      frame={w.startFrame + Math.round(w.paintFrames * .5)}/>);
    const finish = renderToStaticMarkup(<PaintedComposition spec={earlySpec}
      frame={w.startFrame + w.paintFrames}/>);
    expect(half).toContain("stroke-dasharray");
    // A painted shape is complete at 100%; a partial brush gesture must not leave permanent missing corners.
    expect(finish).not.toContain("stroke-dasharray");
    expect(finish).toContain("data-km-wash-pigment");
  });
  it("compiles the exact four-scene portable film with the production resolver", async () => {
    expect(portable).toEqual(PAINTED_WORLDS_FILM);
    for (const outputId of ["landscape","portrait"] as const) {
      const compiled = compileFilm(portable, { outputId });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(1280);
      const slot = await loadFilmSlots(compiled.film);
      const html = renderToStaticMarkup(<>{slot(
        { slot: "painted-composition", label: "Product", props: { genre:"product" } },
        { frame:255, fps:{num:30,den:1}, durationFrames:320,
          width:compiled.film.width,height:compiled.film.height,reducedMotion:false },
      )}</>);
      expect(html).toContain("data-km-painted-composition");
      expect(html).toContain("Object");
    }
  });
  it("offers multiple neutral palette domains and rejects illegal camera inputs", () => {
    expect(PAINTED_PALETTES.botanical).toHaveLength(3);
    expect(PAINTED_PALETTES.science).toHaveLength(3);
    const spec = paintedDemoSpec("nature","landscape");
    expect(() => renderToStaticMarkup(<PaintedComposition spec={spec} frame={0}
      camera={{x:0,y:0,zoom:0}}/>)).toThrow(RangeError);
  });
});
