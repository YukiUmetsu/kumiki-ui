import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import axe from "axe-core";
import { Artboard } from "../src/media/artboard";
import { LayerList, LayerStack } from "../src/media/layer-stack";
import { EditableText } from "../src/media/editable-text";
import { MediaFrame } from "../src/media/media-frame";
import { AlignmentGuides } from "../src/media/alignment-guides";
import { ExportPreview } from "../src/media/export-preview";
import {
  FIXTURE_ASSETS,
  FIXTURE_FONTS,
  squarePromoDocument,
  wideHeroDocument,
} from "../src/media/fixtures";
import type { TextSpec } from "../src/media/document";

// Artboard / ExportPreview measure their container; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles) stay on.
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
  const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
  expect(problems).toEqual([]);
}

const sampleText: TextSpec = {
  spans: [{ text: "Compose once, render anywhere" }],
  fontId: "font-sans",
  size: 24,
  lineHeight: 1.3,
  letterSpacing: 0,
  align: "start",
  direction: "auto",
  fit: "wrap",
  as: "p",
};

describe("media component accessibility (axe)", () => {
  it("Artboard has no detectable violations", async () => {
    const { container } = render(
      <Artboard artboard={wideHeroDocument.artboard} showSafeRegion showBleed showCrop>
        <LayerStack
          layers={wideHeroDocument.layers}
          fonts={wideHeroDocument.fonts}
          assets={wideHeroDocument.assets}
        />
      </Artboard>
    );
    await expectNoViolations(container);
  });

  it("LayerStack and LayerList have no detectable violations", async () => {
    const { container } = render(
      <div>
        <LayerStack
          layers={wideHeroDocument.layers}
          fonts={wideHeroDocument.fonts}
          assets={wideHeroDocument.assets}
          onSelect={() => {}}
        />
        <LayerList
          layers={wideHeroDocument.layers}
          selectedIds={["hero-title"]}
          onSelect={() => {}}
          onVisibilityChange={() => {}}
          onLockChange={() => {}}
          onReorder={() => {}}
        />
      </div>
    );
    await expectNoViolations(container);
  });

  it("EditableText in read-only and editable modes has no detectable violations", async () => {
    const { container } = render(
      <div>
        <EditableText
          text={sampleText}
          fonts={FIXTURE_FONTS}
          box={{ width: 400, height: 200 }}
        />
        <EditableText
          text={sampleText}
          fonts={FIXTURE_FONTS}
          box={{ width: 400, height: 200 }}
          editable
          aria-label="Headline"
        />
      </div>
    );
    await expectNoViolations(container);
  });

  it("MediaFrame has no detectable violations", async () => {
    const { container } = render(
      <MediaFrame
        media={{
          assetId: "asset-landscape",
          fit: "cover",
          focalPoint: { x: 0.5, y: 0.5 },
          mask: { kind: "rounded", radius: 8 },
          alt: "Abstract landscape gradient",
        }}
        asset={FIXTURE_ASSETS["asset-landscape"]}
      />
    );
    await expectNoViolations(container);
  });

  it("AlignmentGuides has no detectable violations", async () => {
    const { container } = render(
      <div style={{ position: "relative", width: 320, height: 180 }}>
        <AlignmentGuides
          showSafeRegion
          showCenterAxes
          guides={[{ id: "guide-x", axis: "x", position: 100 }]}
          measurements={[{ id: "m1", rect: { x: 10, y: 10, width: 100, height: 50 } }]}
          activeSnaps={[
            {
              axis: "x",
              position: 100,
              delta: 0,
              target: { axis: "x", position: 100, kind: "artboard-edge" },
            },
          ]}
        />
      </div>
    );
    await expectNoViolations(container);
  });

  it("ExportPreview has no detectable violations", async () => {
    const { container } = render(<ExportPreview document={squarePromoDocument} />);
    await expectNoViolations(container);
  });

  it("ExportPreview with an h1 composition has no detectable violations", async () => {
    const { container } = render(<ExportPreview document={wideHeroDocument} />);
    await expectNoViolations(container);
  });

  it("ExportPreview scopes a composition's headings out of the host outline", () => {
    const { container } = render(<ExportPreview document={wideHeroDocument} />);

    const preview = container.querySelector<HTMLElement>('[data-km-export="preview"]')!;
    const scope = preview.querySelector<HTMLElement>('[data-km-export="preview-scope"]')!;
    expect(scope).not.toBeNull();

    // The composition's own <h1> must not join the page outline from the preview.
    expect(scope.querySelectorAll("h1,h2,h3,h4,h5,h6")).toHaveLength(0);

    // The preview scope exposes exactly one accessible image representation.
    expect(scope).toHaveAttribute("role", "img");
    expect(scope).toHaveAccessibleName("Preview of Wide hero");
    expect(within(preview).getAllByRole("img", { name: "Preview of Wide hero" })).toEqual([scope]);
  });
});
