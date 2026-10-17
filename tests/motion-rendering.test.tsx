import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphicComposition } from "../registry/motion/graphic-composition";
import { MaskRevealView } from "../registry/motion/react";
import type { MaskSpecLocal } from "../registry/motion/masks";
import type { MotionTimeline, MotionValue } from "../registry/motion/types";

// jsdom lacks media queries and CSS feature detection; keep React/evaluation real.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => true,
  }));
  vi.stubGlobal("CSS", { supports: () => true });
});
afterEach(() => vi.unstubAllGlobals());

const transformedMask: MaskSpecLocal = {
  kind: "clip",
  rect: { x: 10, y: 20, width: 100, height: 80 },
  transform: { a: 0, b: 1, c: -1, d: 0, e: 200, f: 0 },
};

function compositionTimeline(mask: MaskSpecLocal, target: "clip" | "alpha" = "clip"): MotionTimeline {
  return {
    schemaVersion: 1,
    id: "transformed-composition",
    fps: { num: 30, den: 1 },
    durationFrames: 60,
    nodes: [
      {
        kind: "track", id: "mask-spec",
        track: {
          id: "mask-spec", targetId: "graphic-mask", property: target, valueType: "discrete",
          keyframes: [{ frame: 0, value: mask as unknown as MotionValue }],
        },
      },
      {
        kind: "track", id: "mask-progress",
        track: {
          id: "mask-progress", targetId: "mask", property: "progress", valueType: "number",
          keyframes: [{ frame: 0, value: 0.5 }, { frame: 59, value: 1 }],
        },
      },
    ],
  };
}

describe("Motion renderer mask fidelity", () => {
  // Ignoring the evaluator's resolved polygon loses authored rotation/skew.
  it("clips the composition to the transformed sweep rather than the original rectangle", () => {
    const { container } = render(
      <GraphicComposition timeline={compositionTimeline(transformedMask)} frame={0} reducedMotion={false} />,
    );
    expect(container.querySelector("clipPath polygon")).toHaveAttribute(
      "points", "180,10 180,60 100,60 100,10",
    );
  });

  // A hard clip cannot produce a soft edge; it must become an alpha matte.
  it("composites a feathered clip through a bounded alpha mask", () => {
    const { container } = render(
      <GraphicComposition
        timeline={compositionTimeline({ ...transformedMask, feather: 8 })}
        frame={0}
        reducedMotion={false}
      />,
    );
    const mask = container.querySelector("mask");
    expect(mask).toHaveStyle({ maskType: "alpha" });
    expect(mask).toHaveAttribute("x", "76");
    expect(mask).toHaveAttribute("y", "-14");
    expect(mask).toHaveAttribute("width", "128");
    expect(mask).toHaveAttribute("height", "98");
    expect(mask?.querySelector("polygon")).toHaveAttribute("opacity", "1");
    expect(mask?.querySelector("feGaussianBlur")).toHaveAttribute("stdDeviation", "4");
    expect(container.querySelector("g[mask]")).not.toBeNull();
    expect(container.querySelector("g[clip-path]")).toBeNull();
  });

  it.each(["alpha", "luma"] as const)("preserves transformed %s geometry and opacity", (kind) => {
    const { container } = render(
      <GraphicComposition
        timeline={compositionTimeline({ ...transformedMask, kind }, "alpha")}
        frame={0}
        reducedMotion={false}
      />,
    );
    const mask = container.querySelector("mask");
    expect(mask).toHaveStyle({ maskType: kind === "luma" ? "luminance" : "alpha" });
    expect(mask?.querySelector("polygon")).toHaveAttribute("points", "180,10 180,60 100,60 100,10");
    expect(mask?.querySelector("polygon")).toHaveAttribute("opacity", "0.5");
  });

  it("resolves reduced motion to the final mask geometry", () => {
    const { container } = render(
      <GraphicComposition timeline={compositionTimeline(transformedMask)} frame={0} reducedMotion />,
    );
    expect(container.querySelector("clipPath polygon")).toHaveAttribute(
      "points", "180,10 180,110 100,110 100,10",
    );
  });

  it("uses a native CSS mask type in the standalone reveal and keeps content accessible", () => {
    const { container } = render(
      <MaskRevealView spec={{ ...transformedMask, kind: "alpha", feather: 8 }} progress={0.5} reducedMotion={false}>
        <p>Visible meaning</p>
      </MaskRevealView>,
    );
    expect(screen.getByText("Visible meaning")).toBeVisible();
    const mask = container.querySelector("mask");
    expect(mask).toHaveStyle({ maskType: "alpha" });
    expect(mask).not.toHaveAttribute("maskType");
  });
});
