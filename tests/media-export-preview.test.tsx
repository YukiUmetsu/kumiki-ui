import { describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportPreview, useExportPreview } from "../src/media/export-preview";
import {
  danglingReferenceDocument,
  emptyDocument,
  multilingualDocument,
  wideHeroDocument,
} from "../src/media/fixtures";
import * as svgExport from "../registry/media/svg-export";
import type { PngExportResult } from "../registry/media/svg-export";

// `documentToPng` is stubbed at the module boundary so a PNG export can be held
// "in flight" long enough to observe the control's busy state; jsdom cannot
// rasterise SVG, so a real export always settles (fails fast) before the state
// can be read. The default implementation delegates to the real exporter, so
// every other test in this file still exercises the real SVG string and the real
// jsdom failure path.
vi.mock("../registry/media/svg-export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../registry/media/svg-export")>();
  return { ...actual, documentToPng: vi.fn(actual.documentToPng) };
});

// ExportPreview paints a real Artboard with `fit="contain"`, which observes its
// container; jsdom has no ResizeObserver, so install the repo's local no-op stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

function decodedDataUri(src: string): string {
  const comma = src.indexOf(",");
  return decodeURIComponent(src.slice(comma + 1));
}

describe("ExportPreview", () => {
  it("renders the document through the real Artboard and LayerStack", () => {
    const { container } = render(<ExportPreview document={wideHeroDocument} />);

    const preview = container.querySelector<HTMLElement>('[data-km-export="preview"]')!;
    expect(preview.querySelector('[data-km-artboard="root"]')).not.toBeNull();
    expect(preview.querySelector('[data-layer-id="hero-field"]')).not.toBeNull();
    expect(preview.querySelector('[data-km-layer-stack="root"]')).not.toBeNull();
  });

  it("renders one small-format preview per size from the same SVG the download uses", () => {
    const { result } = renderHook(() => useExportPreview(wideHeroDocument));
    render(<ExportPreview document={wideHeroDocument} inspectionSizes={[320, 160]} />);

    const list = screen.getByRole("list", { name: "Small-format previews" });
    const images = within(list).getAllByRole("img");
    expect(images).toHaveLength(2);

    const widths = [320, 160];
    images.forEach((image, index) => {
      expect(image).toHaveAttribute("width", String(widths[index]));
      expect(image.getAttribute("height")).toBe(String(widths[index] / (1280 / 720)));
      expect(image.getAttribute("alt")).toContain(`${widths[index]}px`);

      const src = image.getAttribute("src") ?? "";
      expect(src.startsWith("data:image/svg+xml")).toBe(true);
      // The payload is byte-identical to the exported SVG, viewBox included.
      expect(decodedDataUri(src)).toBe(result.current.svg);
    });

    expect(result.current.svg).toContain('viewBox="0 0 1280 720"');
  });

  it("disables downloads and explains why for a document with blocking errors", () => {
    const { container } = render(<ExportPreview document={danglingReferenceDocument} />);

    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
    expect(container.querySelector('[data-status="blocking"]')).not.toBeNull();
    expect(screen.getByText(/Small-format preview unavailable/)).toBeInTheDocument();

    // The strip degrades to an unavailable state rather than emptying out.
    const list = screen.getByRole("list", { name: "Small-format previews" });
    expect(within(list).getAllByRole("img").length).toBeGreaterThan(0);

    const diagnostics = container.querySelector<HTMLElement>('[data-km-export="diagnostics"]')!;
    expect(within(diagnostics).getByText("media-asset-missing")).toBeInTheDocument();
  });

  it("reports a clean, exportable document", () => {
    const { result } = renderHook(() => useExportPreview(wideHeroDocument));

    expect(result.current.canExport).toBe(true);
    expect(result.current.blocking).toEqual([]);
  });

  it("surfaces the unpinned-font warning in the rendered diagnostics", () => {
    const { container } = render(<ExportPreview document={multilingualDocument} />);

    const diagnostics = container.querySelector<HTMLElement>('[data-km-export="diagnostics"]')!;
    const items = within(diagnostics).getAllByRole("listitem");
    const unpinned = items.find((item) => item.textContent?.includes("Unpinned Grotesk"));

    expect(unpinned).toBeDefined();
    expect(unpinned?.textContent).toContain("export-font-unavailable");
  });

  it("downloads an SVG through a released object URL", async () => {
    const user = userEvent.setup();
    const urlRecord = URL as unknown as {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    const originalCreate = urlRecord.createObjectURL;
    const originalRevoke = urlRecord.revokeObjectURL;
    const createObjectURL = vi.fn(() => "blob:km-export");
    const revokeObjectURL = vi.fn();
    urlRecord.createObjectURL = createObjectURL;
    urlRecord.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    try {
      render(<ExportPreview document={wideHeroDocument} />);
      await user.click(screen.getByRole("button", { name: "Download SVG" }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      // No leaked object URLs: the URL is revoked after it is created.
      expect(revokeObjectURL.mock.invocationCallOrder[0]).toBeGreaterThan(
        createObjectURL.mock.invocationCallOrder[0]
      );
    } finally {
      urlRecord.createObjectURL = originalCreate;
      urlRecord.revokeObjectURL = originalRevoke;
      clickSpy.mockRestore();
    }
  });

  it("surfaces a PNG failure as a visible, actionable error line", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExportPreview document={wideHeroDocument} />);

    await user.click(screen.getByRole("button", { name: "Download PNG" }));

    const errorRegion = await screen.findByText(/PNG export failed/);
    expect(errorRegion).toBeInTheDocument();

    // The reason is rendered in the DOM, not only logged to the console.
    const region = container.querySelector<HTMLElement>('[data-km-export="error"]');
    expect(region).not.toBeNull();
    expect(region?.textContent ?? "").toMatch(/PNG export needs/);
  });

  it("advertises an outputSize whose aspect cannot be honoured", () => {
    // wideHeroDocument is 1280×720 (16:9); a 1:1 request cannot produce a 1000px
    // height because the exporter scales uniformly from the requested width.
    const { container } = render(
      <ExportPreview document={wideHeroDocument} outputSize={{ width: 1000, height: 1000 }} />
    );

    const diagnostics = container.querySelector<HTMLElement>('[data-km-export="diagnostics"]')!;
    const code = within(diagnostics).getByText("output-size-aspect-mismatch");
    expect(code).toBeInTheDocument();

    const item = code.closest("li");
    expect(item?.getAttribute("data-severity")).toBe("warning");
    // Both the requested and the actual exported size are named.
    expect(item?.textContent).toContain("1000 × 1000");
    expect(item?.textContent).toContain("1000 × 562.5");
  });

  it("renders no aspect advisory when the requested output matches the artboard", () => {
    const { container } = render(
      <ExportPreview document={wideHeroDocument} outputSize={{ width: 640, height: 360 }} />
    );

    const diagnostics = container.querySelector<HTMLElement>('[data-km-export="diagnostics"]')!;
    expect(within(diagnostics).queryByText("output-size-aspect-mismatch")).toBeNull();
  });

  it("renders the title as an h2 by default and honours titleAs without changing its look", () => {
    const { container, rerender } = render(<ExportPreview document={wideHeroDocument} />);
    const header = () => container.querySelector<HTMLElement>('[data-km-export="header"]')!;

    // Default: an h2, and the header introduces no other heading level.
    const defaultTitle = header().querySelector<HTMLElement>("h2")!;
    expect(defaultTitle).not.toBeNull();
    expect(defaultTitle).toHaveTextContent("Wide hero");
    expect(header().querySelector("h1")).toBeNull();
    expect(header().querySelector("h3")).toBeNull();

    // h3: the title joins the host outline one level below a section heading.
    rerender(<ExportPreview document={wideHeroDocument} titleAs="h3" />);
    expect(header().querySelector("h3")).not.toBeNull();
    expect(header().querySelector("h2")).toBeNull();

    // div: no heading semantics at all, but the identical typographic classes.
    rerender(<ExportPreview document={wideHeroDocument} titleAs="div" />);
    expect(header().querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    const divTitle = header().querySelector<HTMLElement>("div.text-heading-sm")!;
    expect(divTitle).not.toBeNull();
    expect(divTitle).toHaveTextContent("Wide hero");
    expect(divTitle.className).toBe(defaultTitle.className);
  });

  it("announces and disables the PNG control while an export is in flight", async () => {
    const user = userEvent.setup();
    const documentToPngMock = vi.mocked(svgExport.documentToPng);

    let resolveExport!: (result: PngExportResult) => void;
    const inFlight = new Promise<PngExportResult>((resolve) => {
      resolveExport = resolve;
    });
    documentToPngMock.mockImplementationOnce(() => inFlight);

    // `onExport` returning false cancels the download once the export settles, so
    // the test never needs a real object URL or rasteriser.
    render(<ExportPreview document={wideHeroDocument} onExport={() => false} />);
    const png = screen.getByRole("button", { name: "Download PNG" });

    await user.click(png);

    // Pending: announced to assistive technology, non-interactive, and the visible
    // label still carries the "Exporting PNG…" copy.
    expect(png).toHaveAttribute("aria-busy", "true");
    expect(png).toHaveAccessibleName("Exporting PNG…");
    expect(png).toBeDisabled();
    expect(within(png).getByText("Exporting PNG…")).toBeInTheDocument();

    await act(async () => {
      resolveExport({
        blob: new Blob(["png"]),
        size: { width: 1280, height: 720 },
        diagnostics: [],
        svg: "",
      });
    });

    // Settled: the busy announcement and the disabled state are both cleared.
    await waitFor(() => expect(png).not.toHaveAttribute("aria-busy"));
    expect(png).toBeEnabled();
    expect(png).toHaveAccessibleName("Download PNG");
  });

  it("distinguishes the ready and warning chip states by more than colour", () => {
    const ready = render(<ExportPreview document={emptyDocument} />);
    const readyChip = ready.container.querySelector<HTMLElement>("[data-status]")!;
    expect(readyChip).toHaveAttribute("data-status", "ready");
    expect(readyChip).toHaveTextContent("Ready to export");
    expect(readyChip.className).toContain("status-success");
    // A decorative glyph is the non-colour cue; meaning never rides on hue alone.
    expect(readyChip.querySelector("svg")).not.toBeNull();
    const readyClasses = readyChip.className;
    ready.unmount();

    const warning = render(<ExportPreview document={wideHeroDocument} />);
    const warningChip = warning.container.querySelector<HTMLElement>("[data-status]")!;
    expect(warningChip).toHaveAttribute("data-status", "warning");
    expect(warningChip.className).toContain("status-warning");
    expect(warningChip.querySelector("svg")).not.toBeNull();

    // The states no longer share one token treatment.
    expect(readyClasses).not.toBe(warningChip.className);
  });

  it("labels the status chip with foreground on an opaque surface, not a status colour", () => {
    const ready = render(<ExportPreview document={emptyDocument} />);
    const readyChip = ready.container.querySelector<HTMLElement>("[data-status]")!;
    // The visible word is unchanged.
    expect(readyChip).toHaveTextContent("Ready to export");

    const readyClasses = readyChip.className.split(/\s+/);
    expect(readyClasses).toContain("text-foreground");
    expect(readyClasses).toContain("bg-surface");
    // The label never rides a status hue; severity is the word plus the accent.
    expect(readyChip.className).not.toMatch(/text-status-/);
    ready.unmount();

    const warning = render(<ExportPreview document={wideHeroDocument} />);
    const warningChip = warning.container.querySelector<HTMLElement>("[data-status]")!;
    expect(warningChip).toHaveTextContent(/\d+ warning/);

    const warningClasses = warningChip.className.split(/\s+/);
    expect(warningClasses).toContain("text-foreground");
    expect(warningClasses).toContain("bg-surface");
    expect(warningChip.className).not.toMatch(/text-status-/);
    // Severity is still carried by a decorative left-border accent using the token.
    expect(warningChip.className).toContain("border-l-status-warning");
  });

  it("keeps the status chip in agreement with the rendered diagnostics list", () => {
    // The exporter sees no problems in an empty artboard, so the only rendered
    // issue is the local output-size-aspect-mismatch advisory: a 1:1 artboard
    // scaled to a 2:1 request cannot honour the requested height. Counting the
    // raw exporter output here would leave the chip saying "Ready to export"
    // while the list below shows a warning.
    const { container } = render(
      <ExportPreview document={emptyDocument} outputSize={{ width: 1000, height: 500 }} />
    );

    const chip = container.querySelector<HTMLElement>("[data-status]")!;
    const diagnostics = container.querySelector<HTMLElement>('[data-km-export="diagnostics"]')!;
    const items = within(diagnostics).getAllByRole("listitem");

    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("data-severity", "warning");
    expect(within(diagnostics).getByText("output-size-aspect-mismatch")).toBeInTheDocument();

    const errors = items.filter((item) => item.getAttribute("data-severity") === "error").length;
    const warnings = items.filter((item) => item.getAttribute("data-severity") === "warning").length;
    const expected =
      errors > 0
        ? `${errors} blocking issue${errors === 1 ? "" : "s"}`
        : warnings > 0
          ? `${warnings} warning${warnings === 1 ? "" : "s"}`
          : "Ready to export";

    // The chip counts exactly what the list shows — it cannot contradict it.
    expect(chip).not.toHaveTextContent("Ready to export");
    expect(chip.textContent).toBe(expected);
    expect(chip).toHaveAttribute(
      "data-status",
      errors > 0 ? "blocking" : warnings > 0 ? "warning" : "ready"
    );
  });

  it("keeps the inspection strip inside its container and discloses a scaled preview", () => {
    // Simulate a narrow strip (e.g. a 320px viewport): the widest requested
    // preview cannot be shown at its full width.
    const rect = {
      width: 200,
      height: 120,
      top: 0,
      left: 0,
      right: 200,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as unknown as DOMRect;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(rect);

    try {
      const { container } = render(
        <ExportPreview document={wideHeroDocument} inspectionSizes={[320, 96]} />
      );

      const inspection = container.querySelector<HTMLElement>('[data-km-export="inspection"]')!;
      expect(inspection.className).toContain("min-w-0");

      const list = within(inspection).getByRole("list", { name: "Small-format previews" });
      // The row wraps within itself and can shrink, so it never widens the page.
      expect(list.className).toContain("min-w-0");
      expect(list.className).toContain("max-w-full");
      expect(list.className).toContain("flex-wrap");

      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(2);

      for (const item of items) {
        // Each item is capped to the strip width rather than pinned to a fixed
        // pixel box, and its box clips instead of overflowing.
        expect(item.className).toContain("min-w-0");
        expect(item.getAttribute("style") ?? "").toContain("min(100%");
        const box = item.firstElementChild as HTMLElement;
        expect(box.className).toContain("max-w-full");
        expect(box.className).toContain("overflow-hidden");
      }

      // 320 requested > 200 available: the label still states the represented
      // width and honestly discloses the smaller shown width.
      expect(items[0].textContent).toContain("320px");
      expect(items[0].textContent).toContain("shown at 200px");
      // 96 requested fits: no false disclosure.
      expect(items[1].textContent).toContain("96px");
      expect(items[1].textContent).not.toContain("shown at");
    } finally {
      rectSpy.mockRestore();
    }
  });
});
