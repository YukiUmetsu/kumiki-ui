import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RisoPrint } from "../registry/video/print-plates-react";
import { RisoCharacterKnockout } from "../registry/video/riso-character-react";
import { COURIER, PAPER_BIRD, RisoCharacterPerformance, risoPerformanceSpec } from "../src/video/riso-character-demo";

const html = (aspect: "landscape" | "portrait", frame = 46, visiblePlateIds?: string[]) =>
  renderToStaticMarkup(createElement(RisoCharacterPerformance, {
    aspect, frame, visiblePlateIds, grain: .45, misregistration: .3,
  }));
describe("Opaque RISO actor compositing", () => {
  it.each(["landscape","portrait"] as const)("clears all previously printed inks behind each moving actor in %s", aspect => {
    const svg = html(aspect);
    const blueBackdrop = svg.indexOf('data-km-riso-plate="blue"');
    const redBackdrop = svg.indexOf('data-km-riso-plate="red"');
    const courierCutout = svg.indexOf('data-km-riso-paper-knockout="courier"');
    const courierInk = svg.indexOf('data-km-riso-foreground-layer="courier"');
    const birdCutout = svg.indexOf('data-km-riso-paper-knockout="paper-bird"');
    const birdInk = svg.indexOf('data-km-riso-foreground-layer="paper-bird"');
    expect(blueBackdrop).toBeGreaterThan(0);
    expect(redBackdrop).toBeGreaterThan(blueBackdrop);
    expect(courierCutout).toBeGreaterThan(redBackdrop);
    expect(courierInk).toBeGreaterThan(courierCutout);
    expect(birdCutout).toBeGreaterThan(courierInk);
    expect(birdInk).toBeGreaterThan(birdCutout);
    expect(svg).toContain('data-km-riso-character-knockout="courier"');
    expect(svg).toContain('data-km-riso-character-knockout="paper-bird"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(svg).toContain('data-km-riso-character="courier"');
    expect(svg).toContain('data-km-riso-character="paper-bird"');
    expect(svg).toContain('data-km-riso-part="face-outline"');
    expect(svg).toContain('data-km-riso-part="satchel-buckle"');
  });
  it("retains paper matte even when the user isolates only one ink", () => {
    const red = html("landscape", 46, ["red"]);
    expect(red).not.toContain('data-km-riso-plate="blue"');
    expect(red).not.toContain('data-km-riso-foreground-plate="blue"');
    expect(red).toContain('data-km-riso-paper-knockout="courier"');
    expect(red).toContain('data-km-riso-foreground-plate="red"');
  });
  it("draws all base body parts without partially transparent character alpha", () => {
    for (const actor of [COURIER, PAPER_BIRD]) {
      expect(actor.parts.every(part => (part.opacity ?? 1) === 1)).toBe(true);
    }
    expect(COURIER.parts.find(p => p.id === "face")?.paint).toBe("screen");
    expect(PAPER_BIRD.parts.find(p => p.id === "body")?.paint).toBe("solid");
    expect(COURIER.parts.filter(p => p.id.includes("boot-detail"))).toHaveLength(2);
  });
  it("re-evaluates the complete physical knockout at the same rig frame as its inks", () => {
    const render = (frame: number) => renderToStaticMarkup(createElement(RisoCharacterKnockout, {
      spec: COURIER, frame, x: 50, y: 200, scale: 1.2,
    }));
    const first=render(46), second=render(100);
    expect(first).not.toBe(second);
    expect(first).toBe(render(46));
    expect(first).not.toMatch(/fill-opacity|opacity="0\./);
    expect(first).toContain('data-km-riso-knockout-frame="46"');
    expect(first).toContain('data-km-riso-knockout-part="left-thigh"');
    expect(() => renderToStaticMarkup(createElement(RisoCharacterKnockout, {
      spec: COURIER, frame: 10, spread: -1,
    }))).toThrow(/spread/);
  });
  it("validates layered paper knockouts and protects transparent film output", () => {
    const spec = risoPerformanceSpec("landscape");
    const artworks = { blue: () => null, red: () => null };
    const layer = { id:"foreground", knockout:createElement("circle",{r:8,cx:20,cy:20}), artworks };
    const render = (layers: typeof layer[], transparentPaper = false) =>
      renderToStaticMarkup(createElement(RisoPrint,{spec,frame:3,artworks,foregroundLayers:layers,transparentPaper}));
    expect(render([layer])).toContain('data-km-riso-paper-knockout="foreground"');
    expect(() => render([layer,layer])).toThrow(/unique slugs/);
    expect(() => render([layer],true)).toThrow(/incompatible/);
    expect(() => render([{ ...layer, artworks: {blue: () => null} } as unknown as typeof layer]))
      .toThrow(/every spot plate/);
  });
});
