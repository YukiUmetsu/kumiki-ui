import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IllustratedBookIntoLivingWorldScene } from "../registry/video/recipes/illustrated-book-into-living-world";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { leafStrips } from "../registry/video/stages/illustrated-book-stage";

const art = (id: string, width = 1500, height = 1000) => ({ id, src: `/${id}.jpg`, alt: id, width, height });
const spec: SceneTemplateSpec<"illustrated-book-into-living-world"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "illustrated-book-into-living-world", id: "book",
  fps: { num: 24, den: 1 }, durationFrames: 240, width: 960, height: 540, cueFrames: [30, 120, 180],
  content: { spreads: [{ id: "a", heading: "First", art: art("art-a") }, { id: "b", heading: "Second", text: "Body", art: art("art-b") }],
    world: art("world", 3000, 2000), title: "Placeholder title", line: "A line" },
};
const q = (c: HTMLElement, s: string) => c.querySelector<HTMLElement>(s);

describe("illustrated book into living world", () => {
  it("bends the leaf mid-turn and lays it flat at both ends", () => {
    const flat0 = leafStrips(0), mid = leafStrips(.5), flat1 = leafStrips(1);
    expect(flat0.every(s => s.phi === 0)).toBe(true);
    expect(flat1.every(s => Math.abs(s.phi - Math.PI) < 1e-9)).toBe(true);
    // Mid-turn the free edge lags the spine: a curved sheet, not a rigid door.
    expect(mid[0].phi - mid[mid.length - 1].phi).toBeGreaterThan(.4);
  });

  it("turns from the first spread to the portal spread, then pushes into its art and wakes the world", () => {
    const { container, rerender } = render(<IllustratedBookIntoLivingWorldScene spec={spec} frame={10}/>);
    expect(q(container, '[data-km-book-page="a-art"]')).toBeTruthy();
    expect(q(container, "[data-km-book-leaf]")).toBeNull();
    rerender(<IllustratedBookIntoLivingWorldScene spec={spec} frame={50}/>);
    expect(q(container, "[data-km-book-leaf]")).toBeTruthy();
    expect(container.querySelectorAll("[data-km-leaf-strip]").length).toBe(24);
    rerender(<IllustratedBookIntoLivingWorldScene spec={spec} frame={110}/>);
    expect(q(container, '[data-km-book-page="b-art"]')).toBeTruthy();
    expect(q(container, "[data-km-book-world]")).toBeNull();
    rerender(<IllustratedBookIntoLivingWorldScene spec={spec} frame={200}/>);
    expect(q(container, "[data-km-book-camera]")!.getAttribute("data-km-book-camera")).toBe("1.0000");
    expect(q(container, "[data-km-book-world]")!.getAttribute("data-km-book-world")).toBe("1.000");
  });

  it("cuts the turn and the push under reduced motion", () => {
    const { container, rerender } = render(<IllustratedBookIntoLivingWorldScene spec={spec} frame={50} reducedMotion/>);
    expect(q(container, "[data-km-book-leaf]")).toBeNull();
    expect(q(container, '[data-km-book-page="b-art"]')).toBeTruthy();
    rerender(<IllustratedBookIntoLivingWorldScene spec={spec} frame={120} reducedMotion/>);
    expect(q(container, "[data-km-book-camera]")!.getAttribute("data-km-book-camera")).toBe("1.0000");
  });

  it("requires the portal art and the world to share an aspect", () => {
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, world: art("world", 3000, 3000) } })).toThrow(/same aspect/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, spreads: [spec.content.spreads[0]] } })).toThrow(/two to four/);
  });
});
