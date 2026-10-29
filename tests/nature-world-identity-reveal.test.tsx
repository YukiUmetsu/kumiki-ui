import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NatureWorldIdentityRevealScene } from "../registry/video/recipes/nature-world-identity-reveal";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { dollyCameraAtFrame, projectDepthPlane } from "../registry/video/environment-parallax";

const img = (id: string) => ({ id, src: `/${id}.png`, alt: id, width: 400, height: 400 });
const spec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "nature",
  fps: { num: 24, den: 1 }, durationFrames: 200, width: 960, height: 540, cueFrames: [80, 100, 140],
  content: { environment: { ...img("clearing"), width: 1600, height: 1200 }, mark: img("mark"), name: "Placeholder", tagline: "A line",
    placement: { x: .5, y: .66, height: .25 }, layers: [{ image: img("near-tree"), depth: 1.3, x: .45, y: .5, height: 1.2 }] },
};
const q = (c: HTMLElement, s: string) => c.querySelector<HTMLElement>(s);

describe("nature-world identity reveal", () => {
  it("walks one camera z through the planes: the near tree grows, then leaves the frame before arrival", () => {
    const { container, rerender } = render(<NatureWorldIdentityRevealScene spec={spec} frame={0}/>);
    expect(q(container, '[data-km-depth-layer="near-tree"]')).toBeTruthy();
    rerender(<NatureWorldIdentityRevealScene spec={spec} frame={8}/>);
    // Moving within the first frames.
    expect(Number(q(container, "[data-km-nature-camera]")!.getAttribute("data-km-camera-z"))).toBeGreaterThan(.01);
    rerender(<NatureWorldIdentityRevealScene spec={spec} frame={79}/>);
    expect(q(container, '[data-km-depth-layer="near-tree"]')).toBeNull();
  });

  it("projects nearer planes faster than far ones, and settles at the end of the walk", () => {
    const path = { distance: 1.5, start: 0, end: 80 };
    const mid = dollyCameraAtFrame(40, path), end = dollyCameraAtFrame(80, path), after = dollyCameraAtFrame(120, path);
    const near = projectDepthPlane({ x: .3, y: .5, width: .2, height: .2, depth: 2 }, mid, { x: .5, y: .5 });
    const far = projectDepthPlane({ x: .3, y: .5, width: .2, height: .2, depth: 10 }, mid, { x: .5, y: .5 });
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.x).toBeLessThan(far.x);
    expect(end.z).toBeCloseTo(1.5, 5); expect(after.z).toBe(end.z); expect(end.speed).toBeLessThan(.02);
  });

  it("keeps the mark in shade until the shaft lands, then lifts it; the name follows on resolve", () => {
    const { container, rerender } = render(<NatureWorldIdentityRevealScene spec={spec} frame={90}/>);
    expect(q(container, "[data-km-identity-mark]")!.getAttribute("data-km-mark-lit")).toBe("0.0000");
    expect(q(container, "[data-km-nature-shaft]")).toBeNull();
    rerender(<NatureWorldIdentityRevealScene spec={spec} frame={150}/>);
    expect(q(container, "[data-km-identity-mark]")!.getAttribute("data-km-mark-lit")).toBe("1.0000");
    expect(q(container, "[data-km-nature-shaft]")).toBeTruthy();
  });

  it("pulls focus from the hero plane to the clearing as the walk passes it", () => {
    const focused = { ...spec, content: { ...spec.content, walk: { distance: 5, environmentDepth: 20 }, focus: { from: 6, to: 20, rack: [.3, .8] as [number, number] } } };
    const { container, rerender } = render(<NatureWorldIdentityRevealScene spec={focused} frame={0}/>);
    const plate = () => q(container, '[data-km-nature-plate="clearing"]')!;
    // Frame 0: focused on the hero at depth 6, so the far plate is defocused.
    expect(plate().getAttribute("data-km-focus-distance")).toBe("6.000");
    expect(plate().style.filter).not.toBe("blur(0em)");
    rerender(<NatureWorldIdentityRevealScene spec={focused} frame={80}/>);
    // Arrival: focus has racked to the clearing (20 − 5 travelled), and the plate is sharp.
    expect(plate().getAttribute("data-km-focus-distance")).toBe("15.000");
    expect(plate().style.filter).toBe("blur(0em)");
  });

  it("cuts the walk and the light under reduced motion", () => {
    const { container, rerender } = render(<NatureWorldIdentityRevealScene spec={spec} frame={40} reducedMotion/>);
    expect(q(container, "[data-km-nature-camera]")!.getAttribute("data-km-camera-z")).toBe("0.0000");
    expect(container.querySelector("[data-km-foreground-form]")).toBeNull();
    rerender(<NatureWorldIdentityRevealScene spec={spec} frame={100} reducedMotion/>);
    expect(q(container, "[data-km-identity-mark]")!.getAttribute("data-km-mark-lit")).toBe("1.0000");
  });

  it("rejects layers without intrinsic size and walks outside the supported range", () => {
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, layers: [{ image: { id: "x", src: "/x.png", alt: "x" }, depth: 2, x: .5, y: .5, height: 1 }] } })).toThrow(/intrinsic/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, walk: { distance: 20 } } })).toThrow(/walk/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, focus: { rack: [.8, .4] } } })).toThrow(/focus/);
  });
});
