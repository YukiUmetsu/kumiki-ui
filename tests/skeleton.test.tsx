import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Skeleton } from "../src/ui/skeleton";

const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "page-has-heading-one": { enabled: false },
    "html-has-lang": { enabled: false },
    "document-title": { enabled: false },
  },
} as Parameters<typeof axe.run>[1];

async function expectNoViolations(node: HTMLElement) {
  const results = await axe.run(node, AXE_OPTIONS);
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

function getRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>("[data-km-skeleton]");
  if (!root) throw new Error("skeleton root not found");
  return root;
}

function lines(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-part="line"]'));
}

describe("Skeleton", () => {
  it("renders a decorative single text placeholder by default", () => {
    const { container } = render(<Skeleton />);
    const root = getRoot(container);
    const [line] = lines(container);

    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveAttribute("data-shape", "text");
    expect(root).toHaveAttribute("data-lines", "1");
    expect(lines(container)).toHaveLength(1);
    expect(line).toHaveClass("rounded-control", "bg-track");
    // No interactive affordance: no role, no tab stop, no handlers.
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("tabindex");
  });

  it("renders one stacked bar per requested line with a gap", () => {
    const { container } = render(<Skeleton lines={4} />);
    const root = getRoot(container);

    expect(lines(container)).toHaveLength(4);
    expect(root).toHaveAttribute("data-lines", "4");
    expect(root).toHaveClass("gap-2");
  });

  it("normalizes a non-finite or sub-one line count to a single bar", () => {
    const { container } = render(<Skeleton lines={0} />);

    expect(lines(container)).toHaveLength(1);
    expect(getRoot(container)).toHaveAttribute("data-lines", "1");
  });

  it("ignores lines for non-text shapes", () => {
    const { container } = render(<Skeleton shape="rect" lines={5} />);

    expect(lines(container)).toHaveLength(0);
    expect(getRoot(container)).toHaveAttribute("data-lines", "1");
  });

  it("applies rect and circle shape treatments", () => {
    const rect = render(<Skeleton shape="rect" width={240} height={120} />);
    const rectRoot = getRoot(rect.container);
    expect(rectRoot).toHaveClass("rounded-control", "bg-track");
    expect(rectRoot.style.width).toBe("240px");
    expect(rectRoot.style.height).toBe("120px");
    rect.unmount();

    const circle = render(<Skeleton shape="circle" />);
    expect(getRoot(circle.container)).toHaveClass("rounded-full", "bg-track");
  });

  it("sizes text lines from width and height", () => {
    const { container } = render(<Skeleton lines={2} width="80%" height={10} />);
    const root = getRoot(container);

    expect(root.style.width).toBe("80%");
    expect(root.style.height).toBe("");
    for (const line of lines(container)) {
      expect(line.style.height).toBe("10px");
      expect(line).toHaveClass("w-full");
    }
  });

  it("keeps a circle round when given a single numeric dimension", () => {
    const { container } = render(<Skeleton shape="circle" width={64} />);
    const root = getRoot(container);

    expect(root.style.width).toBe("64px");
    expect(root.style.height).toBe("64px");
  });

  it("forwards the ref, className and DOM props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} className="custom-skeleton" data-testid="skeleton" title="Loading" />);
    const root = screen.getByTestId("skeleton");

    expect(ref.current).toBe(root);
    expect(root).toHaveClass("custom-skeleton");
    expect(root).toHaveAttribute("title", "Loading");
  });

  it("carries meaning without the shimmer animation", () => {
    const { container } = render(<Skeleton />);
    const root = getRoot(container);
    const [line] = lines(container);

    // The static fill is what makes the placeholder legible, not the motion.
    expect(line).toHaveClass("bg-track");
    expect(root.getAttribute("style") ?? "").not.toContain("animation");

    const styleNode = document.getElementById("km-skeleton-styles");
    const css = styleNode?.textContent ?? "";
    expect(document.querySelectorAll("#km-skeleton-styles")).toHaveLength(1);
    expect(css).toContain("@keyframes km-skeleton-shimmer");
    expect(css).toContain("var(--km-duration-long)");
    expect(css).toContain("var(--km-ease-continuity)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none");
  });

  it("has no detectable accessibility violations while standing in for content", async () => {
    render(
      <main>
        <h1>Members</h1>
        <p>Loading members…</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" width={40} />
            <Skeleton shape="text" lines={2} width="100%" />
          </div>
          <Skeleton shape="rect" width="100%" height={96} />
        </div>
      </main>
    );

    await expectNoViolations(document.body);
  });
});
