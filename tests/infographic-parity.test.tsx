import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { InfographicView } from "../src/infographic/react";
import { layoutToSvg } from "../src/infographic/svg";
import { buildInfographicPages } from "../src/infographic/layout";
import type { InfographicLayout, InfographicPrimitive } from "../src/infographic";
import { PHASE2_EXAMPLES } from "../src/infographic/fixtures";

/**
 * Preview/export parity for stroked primitives.
 *
 * Both backends route their dash geometry and cap/join rule through the single
 * `strokeDashArray` helper in `registry/infographic/primitives.ts`, so rendering
 * the same `InfographicLayout` through `<InfographicView>` and serializing it
 * with `layoutToSvg` must agree on `stroke-dasharray`, `stroke-linecap` and
 * `stroke-linejoin` for every primitive. A regression names the primitive whose
 * two backends drifted apart rather than hiding behind a snapshot.
 *
 * `InfographicView` observes nothing, so no ResizeObserver is strictly required;
 * the stub is installed for parity with the rest of the jsdom component suites.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

function pagesFor(example: (typeof PHASE2_EXAMPLES)[number]): InfographicLayout[] {
  const pages = buildInfographicPages(example.source, {
    template: example.template,
    artDirection: example.artDirection,
    profile: example.output,
  });
  expect(pages.length, `${example.id} has pages`).toBeGreaterThan(0);
  return pages;
}

/** Every primitive that carries a non-solid dash (dashed or dotted). */
function dashedPrimitives(layout: InfographicLayout): InfographicPrimitive[] {
  return layout.primitives.filter((primitive) => {
    const dash = (primitive as { dash?: string }).dash;
    return dash === "dashed" || dash === "dotted";
  });
}

describe("InfographicView / layoutToSvg stroke parity", () => {
  const layouts: Array<{ id: string; layout: InfographicLayout }> = [];
  for (const example of PHASE2_EXAMPLES) {
    pagesFor(example).forEach((layout, index) => {
      layouts.push({ id: `${example.id}#page-${index + 1}`, layout });
    });
  }

  it("agrees on stroke-dasharray, stroke-linecap and stroke-linejoin for every dashed primitive", () => {
    let compared = 0;

    for (const { id, layout } of layouts) {
      const dashed = dashedPrimitives(layout);
      if (dashed.length === 0) continue;

      const { container } = render(<InfographicView layout={layout} />);
      const exporter = new DOMParser().parseFromString(layoutToSvg(layout).svg, "image/svg+xml");

      for (const primitive of dashed) {
        const exported = exporter.querySelector(`[id="${primitive.id}"]`);
        expect(exported, `${id}: exporter emits "${primitive.id}"`).not.toBeNull();

        // The exporter puts the id directly on the painted shape; the preview
        // wraps each painted shape in `<g id=…>`, so read the group's child.
        const group = container.querySelector(`[id="${primitive.id}"]`);
        expect(group, `${id}: preview emits "${primitive.id}"`).not.toBeNull();
        const painted = group?.firstElementChild ?? group;

        expect(
          painted?.getAttribute("stroke-dasharray"),
          `${id}: "${primitive.id}" stroke-dasharray`
        ).toBe(exported?.getAttribute("stroke-dasharray"));
        expect(
          painted?.getAttribute("stroke-linecap"),
          `${id}: "${primitive.id}" stroke-linecap`
        ).toBe(exported?.getAttribute("stroke-linecap"));
        expect(
          painted?.getAttribute("stroke-linejoin"),
          `${id}: "${primitive.id}" stroke-linejoin`
        ).toBe(exported?.getAttribute("stroke-linejoin"));

        compared += 1;
      }
    }

    expect(compared, "the fixtures exercise at least one dashed primitive").toBeGreaterThan(0);
  });

  it('never renders an <svg> with height="auto"', () => {
    for (const { id, layout } of layouts) {
      const { container, unmount } = render(<InfographicView layout={layout} />);
      for (const svg of Array.from(container.querySelectorAll("svg"))) {
        expect(svg.getAttribute("height"), `${id}: svg height attribute`).not.toBe("auto");
      }
      unmount();
    }

    // `fit="none"` keeps the numeric design-pixel height; other fits omit it.
    const { container } = render(<InfographicView layout={layouts[0].layout} fit="none" />);
    for (const svg of Array.from(container.querySelectorAll("svg"))) {
      expect(svg.getAttribute("height")).not.toBe("auto");
    }
  });
});
