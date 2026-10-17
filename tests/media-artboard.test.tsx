import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Artboard } from "../src/media/artboard";
import { createArtboard } from "../src/media/document";
import { wideHeroDocument } from "../src/media/fixtures";

// `fit="contain"` observes its container; jsdom has no ResizeObserver, so
// install the repo's local no-op stub (same per-file pattern as
// tests/media-components.test.tsx and tests/media-a11y.test.tsx).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

function viewportOf(container: HTMLElement): HTMLElement {
  const viewport = container.querySelector<HTMLElement>('[data-km-artboard="viewport"]');
  if (!viewport) throw new Error("Artboard viewport was not rendered");
  return viewport;
}

function rootOf(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-km-artboard="root"]');
  if (!root) throw new Error("Artboard frame was not rendered");
  return root;
}

function dispatchKey(
  element: HTMLElement,
  key: string,
  init: KeyboardEventInit = {}
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}

/* ------------------------------------------------------------------ *
 * Viewport containment contract (class-level)
 * ------------------------------------------------------------------ */

/**
 * jsdom has no layout engine, so these are explicitly *class-contract*
 * assertions: they pin the utilities that make the browser containment hold
 * (an oversized artboard scrolls inside the viewport instead of widening the
 * page). They cannot prove the rendered geometry. The page-width guarantee
 * itself is verified by the real-browser e2e overflow probe in
 * `tests/e2e/media-compositions.spec.ts`.
 */
describe("Artboard viewport containment contract (class-level)", () => {
  it("carries a shrink floor, a full-width cap and scrolls its own content", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} fit="none" />);
    const classes = viewportOf(container).className.split(/\s+/);

    // Shrink floor: without `min-w-0` an oversized frame stretches its column.
    expect(classes).toContain("min-w-0");
    // Cap: the viewport is never wider than the space it is given.
    expect(classes).toContain("max-w-full");
    // Scrolls its own content instead of expanding the page.
    expect(classes).toContain("overflow-auto");
    expect(classes).not.toContain("overflow-hidden");
  });

  it("stays a focusable authoring surface with a visible focus ring", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} />);
    const viewport = viewportOf(container);

    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport.className).toContain("focus-visible:ring-2");
    expect(viewport.className).toContain("focus-visible:ring-ring");
    // No ARIA role: it is a generic, keyboard-reachable scroll region.
    expect(viewport).not.toHaveAttribute("role");
  });

  it("merges a consumer className last so it can override the contract", () => {
    const { container } = render(
      <Artboard artboard={wideHeroDocument.artboard} className="custom-viewport-marker" />
    );
    const viewport = viewportOf(container);

    expect(viewport.className.endsWith("custom-viewport-marker")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Keyboard model (unchanged by the containment fix)
 * ------------------------------------------------------------------ */

describe("Artboard keyboard model", () => {
  it("focuses the viewport and pans/zooms through the documented shortcuts", () => {
    const onZoomChange = vi.fn();
    const onPanChange = vi.fn();
    const { container } = render(
      <Artboard
        artboard={wideHeroDocument.artboard}
        zoom={1}
        onZoomChange={onZoomChange}
        onPanChange={onPanChange}
      />
    );
    const viewport = viewportOf(container);

    viewport.focus();
    expect(document.activeElement).toBe(viewport);

    // Pan: 8 design px per arrow press at scale 1.
    const right = dispatchKey(viewport, "ArrowRight");
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 8, y: 0 });
    expect(right.defaultPrevented).toBe(true);
    dispatchKey(viewport, "ArrowDown");
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: 8 });

    // Shift pans 40 design px.
    dispatchKey(viewport, "ArrowDown", { shiftKey: true });
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: 40 });

    // `0` resets zoom to 1 and pan to the origin.
    dispatchKey(viewport, "0");
    expect(onZoomChange).toHaveBeenLastCalledWith(1);
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it("steps the fixed zoom ladder through the `+`/`=`/`-`/`_` keys", () => {
    const onZoomChange = vi.fn();
    const { container, rerender } = render(
      <Artboard artboard={wideHeroDocument.artboard} zoom={1} onZoomChange={onZoomChange} />
    );
    const viewport = viewportOf(container);

    dispatchKey(viewport, "+");
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);
    dispatchKey(viewport, "-");
    expect(onZoomChange).toHaveBeenLastCalledWith(0.75);

    rerender(
      <Artboard artboard={wideHeroDocument.artboard} zoom={2} onZoomChange={onZoomChange} />
    );
    dispatchKey(viewport, "_");
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);

    // The ladder clamps at both ends instead of drifting past it.
    rerender(
      <Artboard artboard={wideHeroDocument.artboard} zoom={4} onZoomChange={onZoomChange} />
    );
    dispatchKey(viewport, "=");
    expect(onZoomChange).toHaveBeenLastCalledWith(4);

    rerender(
      <Artboard artboard={wideHeroDocument.artboard} zoom={0.25} onZoomChange={onZoomChange} />
    );
    dispatchKey(viewport, "-");
    expect(onZoomChange).toHaveBeenLastCalledWith(0.25);
  });

  it("leaves every shortcut to the page when no handler is supplied", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} />);
    const viewport = viewportOf(container);

    for (const key of ["+", "=", "-", "_", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      expect(dispatchKey(viewport, key).defaultPrevented, key).toBe(false);
    }
  });

  it("only consumes the keys whose handler is present", () => {
    // Pan handler only: arrows and `0` are ours, zoom keys stay with the page.
    const onPanChange = vi.fn();
    const withPan = render(
      <Artboard artboard={wideHeroDocument.artboard} onPanChange={onPanChange} />
    );
    const panViewport = viewportOf(withPan.container);
    expect(dispatchKey(panViewport, "+").defaultPrevented).toBe(false);
    expect(dispatchKey(panViewport, "-").defaultPrevented).toBe(false);
    expect(dispatchKey(panViewport, "0").defaultPrevented).toBe(true);
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(dispatchKey(panViewport, "ArrowRight").defaultPrevented).toBe(true);
    withPan.unmount();

    // Zoom handler only: zoom keys are ours, the arrow keys stay with the page.
    const onZoomChange = vi.fn();
    const withZoom = render(
      <Artboard artboard={wideHeroDocument.artboard} onZoomChange={onZoomChange} />
    );
    const zoomViewport = viewportOf(withZoom.container);
    expect(dispatchKey(zoomViewport, "ArrowRight").defaultPrevented).toBe(false);
    expect(dispatchKey(zoomViewport, "+").defaultPrevented).toBe(true);
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);
  });

  it("runs a consumer onKeyDown first and honours its preventDefault", () => {
    const onZoomChange = vi.fn();
    const onKeyDown = vi.fn((event: ReactKeyboardEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    const { container } = render(
      <Artboard
        artboard={wideHeroDocument.artboard}
        zoom={1}
        onZoomChange={onZoomChange}
        onKeyDown={onKeyDown}
      />
    );

    dispatchKey(viewportOf(container), "+");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onZoomChange).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ *
 * Fit modes
 * ------------------------------------------------------------------ */

describe("Artboard fit modes", () => {
  it("forces a 1:1 effective scale for `actual` and exposes the mode on the frame", () => {
    const { container } = render(
      <Artboard artboard={wideHeroDocument.artboard} fit="actual" zoom={3} />
    );
    const root = rootOf(container);

    expect(root).toHaveAttribute("data-km-artboard-fit", "actual");
    // `actual` ignores both `zoom` and the container: exactly one design px per
    // CSS px.
    expect(root.parentElement!.style.transform).toBe("scale(1)");
  });

  it("keeps the raw zoom for `none` so the frame may overflow (and now scroll)", () => {
    const { container } = render(
      <Artboard artboard={wideHeroDocument.artboard} fit="none" zoom={2} />
    );
    const root = rootOf(container);

    expect(root).toHaveAttribute("data-km-artboard-fit", "none");
    expect(root.parentElement!.style.transform).toBe("scale(2)");
  });

  it("measures the content box for `contain` (excluding its own padding and border)", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        top: 0,
        left: 0,
        right: 600,
        bottom: 400,
        toJSON: () => ({}),
      }) as DOMRect;
    try {
      const artboard = createArtboard({ id: "square", width: 1000, height: 1000 });
      const { container } = render(
        <Artboard
          artboard={artboard}
          fit="contain"
          style={{ padding: 25, borderWidth: 5, borderStyle: "solid" }}
        />
      );
      const root = rootOf(container);

      // 600×400 border box minus 25px padding and 5px border per edge →
      // 540×340 content box → min(1, 540/1000, 340/1000) = 0.34. Measuring the
      // border box instead would report 0.4 and overflow the viewport.
      expect(root.parentElement!.style.transform).toBe("scale(0.34)");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });
});

/* ------------------------------------------------------------------ *
 * Overlay placement (guards the earlier bleed-clipping regression)
 * ------------------------------------------------------------------ */

describe("Artboard authoring overlays", () => {
  it("renders overlays as aria-hidden siblings of the frame, never inside it", () => {
    const { container } = render(
      <Artboard artboard={wideHeroDocument.artboard} showSafeRegion showBleed showCrop>
        <div data-testid="artwork" />
      </Artboard>
    );
    const root = rootOf(container);
    const wrapper = root.parentElement!;

    // The frame is the clipping box; the scale wrapper must not clip, or the
    // bleed outline would be cut off at the trim.
    expect(root.className).toContain("relative");
    expect(root.className).toContain("overflow-hidden");
    expect(wrapper.className).not.toContain("overflow-hidden");

    for (const kind of ["bleed", "crop", "safe-region"] as const) {
      const overlay = container.querySelector<HTMLElement>(`[data-km-artboard="${kind}"]`);
      expect(overlay, `${kind} overlay`).not.toBeNull();

      // Authoring chrome is invisible to assistive technology.
      expect(overlay).toHaveAttribute("aria-hidden", "true");
      // A sibling of the frame inside the non-clipping wrapper, so it can draw
      // outside the trim — never a descendant of the clipping frame.
      expect(root.contains(overlay!)).toBe(false);
      expect(overlay!.parentElement).toBe(wrapper);
      expect(Number(overlay!.style.zIndex)).toBeGreaterThan(1000);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Centring contract: auto margins on the child (class-level)
 * ------------------------------------------------------------------ */

/**
 * jsdom has no layout engine, so — like the containment block above — these are
 * explicitly *class-contract* assertions: they pin the utilities that produce the
 * intended browser behaviour. They cannot prove the rendered geometry. That the
 * oversized frame's top-left origin (and, where the frame leaves slack, the
 * leading bleed) is actually reachable by scrolling is verified by the
 * real-browser e2e overflow probe in `tests/e2e/media-compositions.spec.ts`.
 */
describe("Artboard centring contract (class-level)", () => {
  it("centres through auto margins on the scale wrapper, not the viewport's own alignment", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} fit="none" />);
    const viewport = viewportOf(container);
    const wrapper = rootOf(container).parentElement!;

    // Centring lives on the child as auto margins: positive free space splits
    // evenly (centred, as before); negative free space collapses to zero, so the
    // oversized frame sits at the scroll origin instead of a negative offset it
    // could never be scrolled back to.
    expect(wrapper.className.split(/\s+/)).toContain("m-auto");

    // The viewport no longer aligns its own child...
    expect(viewport.className).not.toContain("items-center");
    expect(viewport.className).not.toContain("justify-center");
    // ...but stays a flex container so the child's auto margins can centre on
    // both axes.
    expect(viewport.className.split(/\s+/)).toContain("flex");
  });

  it("keeps the containment contract so the earlier overflow fix does not regress", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} fit="none" />);
    const classes = viewportOf(container).className.split(/\s+/);

    expect(classes).toContain("min-w-0");
    expect(classes).toContain("max-w-full");
    expect(classes).toContain("overflow-auto");
  });

  it("keeps the keyboard model reachable and firing after the centring change", () => {
    const onZoomChange = vi.fn();
    const onPanChange = vi.fn();
    const { container } = render(
      <Artboard
        artboard={wideHeroDocument.artboard}
        zoom={1}
        onZoomChange={onZoomChange}
        onPanChange={onPanChange}
      />
    );
    const viewport = viewportOf(container);

    viewport.focus();
    expect(document.activeElement).toBe(viewport);

    dispatchKey(viewport, "+");
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);
    dispatchKey(viewport, "ArrowRight");
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 8, y: 0 });
  });
});
