import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceShapedImageRevealScene } from "../registry/video/recipes/place-shaped-image-reveal";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { placeSilhouette } from "../registry/video/place-silhouette";
import { annotationFraming } from "../registry/video/subject-annotations";

const ring: [number, number][] = [[-20, 63], [-14, 64], [-15, 66.3], [-22, 66.2], [-24, 65], [-20, 63]];
const spec: SceneTemplateSpec<"place-shaped-image-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "place-shaped-image-reveal", id: "place",
  fps: { num: 24, den: 1 }, durationFrames: 120, width: 960, height: 540, cueFrames: [30, 60, 90],
  content: { name: "Island", context: "Context line.", compositeNote: "Photographs framed by the outline. Not an aerial view.",
    boundary: { rings: [ring], source: "Test outline" },
    imagery: [
      { image: { id: "a", src: "/a.jpg", alt: "First photo" }, caption: "Falls", latitude: 63.6, longitude: -19.9 },
      { image: { id: "b", src: "/b.jpg", alt: "Second photo" }, caption: "Lagoon", latitude: 64.05, longitude: -16.2 },
    ] },
};
const q = (c: HTMLElement, s: string) => c.querySelector<HTMLElement>(s);

describe("place-shaped image reveal", () => {
  it("traces the outline first, floods it with imagery on dock, then hands over to the next photograph", () => {
    const { container, rerender } = render(<PlaceShapedImageRevealScene spec={spec} frame={10}/>);
    const trace = Number(q(container, "[data-km-place-outline]")!.getAttribute("data-km-place-outline"));
    expect(trace).toBeGreaterThan(0); expect(trace).toBeLessThan(1);
    expect(q(container, "[data-km-place-imagery]")!.style.visibility).toBe("hidden");
    rerender(<PlaceShapedImageRevealScene spec={spec} frame={58}/>);
    expect(q(container, "[data-km-place-imagery]")!.style.visibility).toBe("visible");
    expect(q(container, '[data-km-place-image="a"]')).toBeTruthy();
    expect(q(container, '[data-km-annotation="pin-0"]')).toBeTruthy();
    rerender(<PlaceShapedImageRevealScene spec={spec} frame={110}/>);
    expect(q(container, '[data-km-place-image="a"]')).toBeNull();
    expect(q(container, "[data-km-place-imagery]")!.getAttribute("data-km-place-imagery")).toBe("b");
    expect(q(container, '[data-km-annotation-label="pin-label-1"]')!.textContent).toBe("Lagoon");
  });

  it("always discloses the composite and holds context from the reveal", () => {
    const { container, rerender } = render(<PlaceShapedImageRevealScene spec={spec} frame={40}/>);
    expect(q(container, "[data-km-place-disclosure]")!.textContent).toMatch(/Not an aerial view/);
    expect(Number(q(container, '[data-km-rise="place-context"]')!.style.opacity)).toBe(0);
    rerender(<PlaceShapedImageRevealScene spec={spec} frame={100}/>);
    expect(Number(q(container, '[data-km-rise="place-context"]')!.style.opacity)).toBe(1);
  });

  it("settles beats on their frames under reduced motion", () => {
    const { container, rerender } = render(<PlaceShapedImageRevealScene spec={spec} frame={0} reducedMotion/>);
    expect(q(container, "[data-km-place-outline]")!.getAttribute("data-km-place-outline")).toBe("1.0000");
    expect(q(container, "[data-km-place-camera]")!.getAttribute("data-km-camera-zoom")).toBe("1.0000");
    expect(q(container, "[data-km-place-imagery]")!.style.visibility).toBe("hidden");
    expect(container.querySelector('[data-km-annotation="locator"]')).toBeNull();
    rerender(<PlaceShapedImageRevealScene spec={spec} frame={30} reducedMotion/>);
    expect(q(container, "[data-km-place-imagery]")!.getAttribute("data-km-place-wipe")).toBe("1.0000");
  });

  it("rejects missing disclosure, half coordinates and boundaries too wide to keep their shape", () => {
    const content = spec.content;
    expect(() => validateSceneTemplate({ ...spec, content: { ...content, compositeNote: " " } })).toThrow(/disclosure/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...content, imagery: [{ ...content.imagery[0], longitude: undefined }] } })).toThrow(/both latitude/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...content, boundary: { source: "x", rings: [[[-170, 0], [10, 10], [100, 60], [-170, 0]]] } } })).toThrow(/60°/);
  });

  it("keeps photograph pins inside both 16:9 and 9:16 frames", () => {
    for (const [w, h] of [[960, 540], [540, 960]]) {
      const geo = placeSilhouette([ring], w, h);
      const pins = spec.content.imagery.map((item, i) => { const p = geo.toStage({ latitude: item.latitude!, longitude: item.longitude! });
        return { id: "pin-" + i, kind: "ring" as const, center: { x: p.x / w, y: p.y / h }, radius: .014, space: "stage" as const, timing: { at: 0 } }; });
      expect(annotationFraming(pins, {}, w, h)).toEqual([]);
    }
  });
});
