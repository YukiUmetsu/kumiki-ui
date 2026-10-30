import { createRef } from "react";
import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { CaveIdentityRevealScene } from "../registry/video/recipes/cave-identity-reveal";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
const image = { id: "cave", src: "/cave.jpg", alt: "Cave", width: 1600, height: 900 };
const spec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "cave-test",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  content: { environment: image, mark: image, name: "Deepfield", placement: { x: .5, y: .5, height: .2 },
    layers: [{ image, depth: 3, x: .05, y: .5, height: 1.2, sway: 0 }] },
};
it("reuses cinematic depth projection and forwards consumer DOM customization", () => {
  const ref = createRef<HTMLDivElement>();
  const { container, rerender } = render(<CaveIdentityRevealScene spec={spec} frame={0} ref={ref} aria-label="Cave entrance" className="consumer"/>);
  expect(ref.current?.className).toBe("consumer");
  expect(ref.current?.getAttribute("aria-label")).toBe("Cave entrance");
  expect(container.querySelector('[data-km-nature-renderer="cinematic"]')).toBeTruthy();
  expect(container.querySelector('[data-km-cinematic-leaf="cave"]')).toBeTruthy();
  rerender(<CaveIdentityRevealScene spec={spec} frame={335} ref={ref}/>);
  expect(container.querySelector('[data-km-cinematic-leaf="cave"]')).toBeNull();
  expect(container.querySelector<HTMLElement>('[data-km-identity-name]')?.style.opacity).toBe("1");
});
