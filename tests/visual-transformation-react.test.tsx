import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisualTransformation } from "../registry/motion/visual-transformation-react";
import { compileVisualTransformation } from "../registry/motion/visual-transformation";
import type { VisualTransformationSpec } from "../registry/motion/visual-transformation-types";

const bounds = { x: 0, y: 0, width: 300, height: 140 };
const input: VisualTransformationSpec = { schemaVersion: 1, id: "text", fps: { num: 30, den: 1 }, durationFrames: 101, range: { startFrame: 0, endFrame: 100 }, from: { id: "a", elements: [{ id: "a", semanticId: "idea", content: { kind: "text", bounds, text: "長い文章\nfirst", fontSize: 26 } }] }, to: { id: "b", elements: [{ id: "b", semanticId: "idea", content: { kind: "text", bounds, text: "مرحبا\nlast", direction: "rtl", fontSize: 26 } }] }, strategy: "mask-reveal" };
beforeEach(() => { vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))); });
describe("VisualTransformation SVG adapter", () => {
  it("provides accessible static semantics, refs, props, multiline CJK/RTL, and native SVG masks", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(<VisualTransformation transformation={compileVisualTransformation(input)} frame={50} width={400} height={200} label="An idea becomes a program" description="The same identity persists." ref={ref} className="custom" data-testid="film" />);
    expect(screen.getByRole("img", { name: "An idea becomes a program" })).toBe(ref.current);
    expect(screen.getByTestId("film")).toHaveClass("custom");
    expect(container.querySelectorAll("clipPath")).toHaveLength(2);
    expect(container.querySelector('[direction="rtl"]')).toBeTruthy();
    expect(container.querySelectorAll("tspan")).toHaveLength(4);
  });
  it("honors reduced motion and renders only the destination", () => {
    const { container } = render(<VisualTransformation transformation={compileVisualTransformation(input)} frame={50} width={400} height={200} label="Film" reducedMotion />);
    expect(container.querySelector("svg")).toHaveAttribute("data-frame", "100");
    expect(container.querySelectorAll("[data-visual-layer]")).toHaveLength(1);
    expect(container.textContent).toContain("last");
    expect(container.textContent).not.toContain("first");
  });
  it("isolates mask IDs between instances and offers a geometry slot", () => {
    const compiled = compileVisualTransformation(input);
    const { container } = render(<><VisualTransformation transformation={compiled} frame={50} width={400} height={200} label="One" renderLayer={layer => <circle data-slot={layer.semanticId} r="20" />} /><VisualTransformation transformation={compiled} frame={50} width={400} height={200} label="Two" /></>);
    const ids = [...container.querySelectorAll("[id]")].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelectorAll("[data-slot]")).toHaveLength(2);
  });
});
