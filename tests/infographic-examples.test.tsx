import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { InfographicView } from "../src/infographic/react";
import { buildInfographicPages } from "../src/infographic/layout";
import type { InfographicLayout } from "../src/infographic";
import { PHASE2_EXAMPLES, type Phase2Example } from "../src/infographic/fixtures";

/**
 * Preview contract for every phase-two specimen: the DOM renderer must expose
 * the same facts the layout engine produced. Behaviour is asserted through
 * roles and `data-*` attributes — no snapshots — so a regression surfaces as a
 * named failure rather than a pixel diff.
 *
 * `InfographicView` itself observes nothing, so this suite needs no
 * ResizeObserver to render; the local stub is still installed for parity with
 * the rest of the jsdom component suites, which do.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

function firstPage(example: Phase2Example): InfographicLayout {
  const pages = buildInfographicPages(example.source, {
    template: example.template,
    artDirection: example.artDirection,
    profile: example.output,
  });
  expect(pages.length).toBeGreaterThan(0);
  return pages[0];
}

describe("InfographicView preview contract — phase-two examples", () => {
  for (const example of PHASE2_EXAMPLES) {
    it(`renders ${example.id} with an accessible title/description and authored provenance`, () => {
      const layout = firstPage(example);
      const { container } = render(<InfographicView layout={layout} />);

      // The wrapper advertises the renderer that produced it.
      const wrapper = container.querySelector('[data-km-infographic="view"]');
      expect(wrapper, "wrapper carries data-km-infographic=view").not.toBeNull();

      // The artwork is a single, labelled image.
      const svg = screen.getByRole("img");
      expect(svg.tagName.toLowerCase()).toBe("svg");

      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      expect(title, "svg exposes a <title>").not.toBeNull();
      expect(desc, "svg exposes a <desc>").not.toBeNull();
      expect(title?.textContent?.trim().length, "title is non-empty").toBeGreaterThan(0);
      expect(desc?.textContent?.trim().length, "description is non-empty").toBeGreaterThan(0);

      // The `<title>` reflects the layout metadata; the `<desc>` the summary.
      expect(title?.textContent).toBe(layout.metadata?.title ?? layout.sourceId);
      expect(desc?.textContent).toBe(layout.summary);

      // Provenance is published as attributes on the artwork.
      expect(svg.getAttribute("data-km-infographic-template")).toBe(example.template);
      expect(svg.getAttribute("data-km-infographic-art-direction")).toBe(example.artDirection);
    });
  }

  it("omits the accessible title/description when accessible={false}", () => {
    const layout = firstPage(PHASE2_EXAMPLES[0]);
    const { container } = render(<InfographicView layout={layout} accessible={false} />);

    // `react.tsx` renders no <title>/<desc> and marks the svg aria-hidden; the
    // svg is therefore removed from the accessibility tree entirely.
    expect(screen.queryByRole("img")).toBeNull();

    const svg = container.querySelector("svg");
    expect(svg, "the svg is still painted").not.toBeNull();
    expect(svg?.querySelector("title")).toBeNull();
    expect(svg?.querySelector("desc")).toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("aria-labelledby")).toBeNull();
  });
});
