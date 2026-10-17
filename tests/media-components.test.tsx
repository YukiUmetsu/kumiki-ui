import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Artboard } from "../src/media/artboard";
import { LayerList, LayerStack } from "../src/media/layer-stack";
import { EditableText } from "../src/media/editable-text";
import { MediaFrame } from "../src/media/media-frame";
import {
  ALIGNMENT_GUIDES_EXPORTABLE,
  AlignmentGuides,
  useAlignmentGuides,
} from "../src/media/alignment-guides";
import {
  FIXTURE_ASSETS,
  FIXTURE_FONTS,
  editorialSpreadDocument,
  wideHeroDocument,
} from "../src/media/fixtures";
import type {
  GroupLayer,
  Layer,
  LayerBase,
  MediaSpec,
  ShapeLayer,
  ShapeSpec,
  Size,
  TextSpec,
} from "../src/media/document";

// Artboard with `fit="contain"` (and ExportPreview) observe their container;
// jsdom has no ResizeObserver, so install the repo's local no-op stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

/** Deterministic stub measurer: 10 design px per character, independent of the font. */
const stubMeasure = (_font: string, text: string): number => text.length * 10;

interface RectInput {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseOptions {
  z?: number;
  parentId?: string | null;
  visible?: boolean;
  locked?: boolean;
  clip?: boolean;
  summary?: string;
}

function baseFields(
  id: string,
  name: string,
  kind: Layer["kind"],
  rect: RectInput,
  options: BaseOptions
): LayerBase {
  return {
    id,
    name,
    kind,
    semanticId: id,
    parentId: options.parentId ?? null,
    transform: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    z: options.z ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    opacity: 1,
    blend: "normal",
    clip: options.clip ?? false,
    summary: options.summary,
  };
}

function shapeLayer(
  id: string,
  name: string,
  rect: RectInput,
  shape: ShapeSpec,
  options: BaseOptions = {}
): ShapeLayer {
  return { ...baseFields(id, name, "shape", rect, options), kind: "shape", shape };
}

function groupLayer(id: string, name: string, rect: RectInput, options: BaseOptions = {}): GroupLayer {
  return { ...baseFields(id, name, "group", rect, options), kind: "group" };
}

/** Minimal text layer for the heading-semantics tests; the caller owns both spec and array. */
function textLayer(id: string, name: string, rect: RectInput, text: TextSpec): Layer {
  return { ...baseFields(id, name, "text", rect, {}), kind: "text", text };
}

/** Full `TextSpec` with a single span, so a test can pin exactly one `as` tag. */
function singleSpanText(as: TextSpec["as"], content: string): TextSpec {
  return {
    spans: [{ text: content }],
    fontId: "font-sans",
    size: 32,
    lineHeight: 1.25,
    letterSpacing: 0,
    align: "start",
    direction: "auto",
    fit: "wrap",
    as,
  };
}

function dispatchKey(element: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}

/* ------------------------------------------------------------------ *
 * Artboard
 * ------------------------------------------------------------------ */

describe("Artboard", () => {
  it("renders the design frame with its declared dimensions and design px", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} />);

    const root = container.querySelector<HTMLElement>('[data-km-artboard="root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("data-km-artboard", "root");
    expect(root).toHaveAttribute("data-km-artboard-dimensions", "1280x720");
    // The root's inline box is the exact design size, not a scaled one.
    expect(root).toHaveStyle({ width: "1280px", height: "720px" });
  });

  it("renders authoring overlays only when enabled, above the artwork", () => {
    const artwork = (
      <div data-testid="artwork" style={{ position: "absolute", zIndex: 1000 }} />
    );
    const { container, rerender } = render(
      <Artboard artboard={wideHeroDocument.artboard}>{artwork}</Artboard>
    );

    expect(container.querySelector('[data-km-artboard="safe-region"]')).toBeNull();
    expect(container.querySelector('[data-km-artboard="bleed"]')).toBeNull();
    expect(container.querySelector('[data-km-artboard="crop"]')).toBeNull();

    rerender(
      <Artboard artboard={wideHeroDocument.artboard} showSafeRegion showBleed showCrop>
        {artwork}
      </Artboard>
    );

    const safe = container.querySelector<HTMLElement>('[data-km-artboard="safe-region"]')!;
    const bleed = container.querySelector<HTMLElement>('[data-km-artboard="bleed"]')!;
    const crop = container.querySelector<HTMLElement>('[data-km-artboard="crop"]')!;

    expect(safe).not.toBeNull();
    expect(bleed).not.toBeNull();
    expect(crop).not.toBeNull();

    // Authoring chrome must out-stack the artwork: layers are free to set their
    // own z-index, which previously painted over the guides (a real defect).
    for (const overlay of [safe, bleed, crop]) {
      expect(overlay).toHaveAttribute("aria-hidden", "true");
      expect(Number(overlay.style.zIndex)).toBeGreaterThan(1000);
    }
  });

  it("forwards its ref to the viewport", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Artboard ref={ref} artboard={wideHeroDocument.artboard} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current).toHaveAttribute("data-km-artboard", "viewport");
  });

  it("measures its container and scales the wrapper when fitting", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 640,
        height: 360,
        top: 0,
        left: 0,
        right: 640,
        bottom: 360,
        toJSON: () => ({}),
      }) as DOMRect;
    try {
      const { container } = render(
        <Artboard artboard={wideHeroDocument.artboard} fit="contain" />
      );
      const root = container.querySelector<HTMLElement>('[data-km-artboard="root"]')!;
      const wrapper = root.parentElement!;
      // 640/1280 and 360/720 both give 0.5.
      expect(wrapper.style.transform).toBe("scale(0.5)");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });

  it("reports zoom and pan from the keyboard shortcuts", () => {
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
    const viewport = container.querySelector<HTMLElement>('[data-km-artboard="viewport"]')!;

    dispatchKey(viewport, "+");
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);
    dispatchKey(viewport, "-");
    expect(onZoomChange).toHaveBeenLastCalledWith(0.75);
    dispatchKey(viewport, "0");
    expect(onZoomChange).toHaveBeenLastCalledWith(1);
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    dispatchKey(viewport, "ArrowRight");
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 8, y: 0 });
    dispatchKey(viewport, "ArrowUp");
    expect(onPanChange).toHaveBeenLastCalledWith({ x: 0, y: -8 });
    dispatchKey(viewport, "ArrowLeft", { shiftKey: true });
    expect(onPanChange).toHaveBeenLastCalledWith({ x: -40, y: 0 });
  });

  it("leaves the zoom and arrow keys to the page when no handlers are supplied", () => {
    const { container } = render(<Artboard artboard={wideHeroDocument.artboard} />);
    const viewport = container.querySelector<HTMLElement>('[data-km-artboard="viewport"]')!;

    for (const key of ["+", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      const event = dispatchKey(viewport, key);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it("distinguishes the three fit modes and reflects the mode on the frame", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 640,
        height: 360,
        top: 0,
        left: 0,
        right: 640,
        bottom: 360,
        toJSON: () => ({}),
      }) as DOMRect;
    try {
      const scaleFor = (fit: "none" | "contain" | "actual", zoom: number) => {
        const { container, unmount } = render(
          <Artboard artboard={wideHeroDocument.artboard} fit={fit} zoom={zoom} />
        );
        const root = container.querySelector<HTMLElement>('[data-km-artboard="root"]')!;
        expect(root).toHaveAttribute("data-km-artboard-fit", fit);
        const transform = root.parentElement!.style.transform;
        unmount();
        return transform;
      };

      // Same zoom and same stubbed container: `none` keeps the raw zoom while
      // `contain` fits (640x360 into 1280x720 → 0.5).
      expect(scaleFor("none", 1)).toBe("scale(1)");
      expect(scaleFor("contain", 1)).toBe("scale(0.5)");
      expect(scaleFor("none", 1)).not.toBe(scaleFor("contain", 1));

      // `actual` is always 1:1, ignoring both the zoom and the container.
      expect(scaleFor("actual", 1)).toBe("scale(1)");
      expect(scaleFor("actual", 3)).toBe("scale(1)");
      expect(scaleFor("actual", 0.25)).toBe("scale(1)");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });
});

/* ------------------------------------------------------------------ *
 * LayerStack
 * ------------------------------------------------------------------ */

describe("LayerStack", () => {
  it("paints in z order and assigns z-index from paint order", () => {
    const { container } = render(<LayerStack layers={wideHeroDocument.layers} />);

    const ids = Array.from(container.querySelectorAll<HTMLElement>("[data-layer-id]")).map((el) =>
      el.getAttribute("data-layer-id")
    );
    expect(ids).toEqual([
      "hero-field",
      "hero-visual",
      "hero-accent",
      "hero-title",
      "hero-caption",
    ]);

    ids.forEach((id, index) => {
      const element = container.querySelector<HTMLElement>(`[data-layer-id="${id}"]`)!;
      expect(element.style.zIndex).toBe(String(index));
    });
  });

  it("omits invisible layers and hidden group branches", () => {
    const layers: Layer[] = [
      shapeLayer("visible-box", "Visible box", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 0 }),
      shapeLayer("hidden-box", "Hidden box", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 1, visible: false }),
      groupLayer("hidden-group", "Hidden group", { x: 0, y: 0, width: 40, height: 40 }, { z: 2, visible: false }),
      shapeLayer("nested-child", "Nested child", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 3, parentId: "hidden-group" }),
    ];

    const { container } = render(<LayerStack layers={layers} />);

    expect(container.querySelector('[data-layer-id="visible-box"]')).not.toBeNull();
    expect(container.querySelector('[data-layer-id="hidden-box"]')).toBeNull();
    expect(container.querySelector('[data-layer-id="hidden-group"]')).toBeNull();
    expect(container.querySelector('[data-layer-id="nested-child"]')).toBeNull();
  });

  it("exposes layer identity, kind and lock state as data attributes", () => {
    const { container } = render(<LayerStack layers={wideHeroDocument.layers} />);

    const field = container.querySelector<HTMLElement>('[data-layer-id="hero-field"]')!;
    expect(field).toHaveAttribute("data-layer-id", "hero-field");
    expect(field).toHaveAttribute("data-layer-kind", "shape");
    expect(field).toHaveAttribute("data-layer-locked", "true");

    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    expect(visual).toHaveAttribute("data-layer-kind", "media");
    expect(visual).toHaveAttribute("data-layer-locked", "false");
  });

  it("selects a layer on click, clears on background click and skips locked layers", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <LayerStack layers={wideHeroDocument.layers} onSelect={onSelect} />
    );

    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    fireEvent.click(visual);
    expect(onSelect).toHaveBeenCalledWith("hero-visual");

    onSelect.mockClear();
    const field = container.querySelector<HTMLElement>('[data-layer-id="hero-field"]')!;
    expect(field).not.toHaveAttribute("role");
    fireEvent.click(field);
    expect(onSelect).not.toHaveBeenCalled();

    onSelect.mockClear();
    fireEvent.click(container.querySelector<HTMLElement>('[data-km-layer-stack="root"]')!);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("removes layers named in excludeIds", () => {
    const { container } = render(
      <LayerStack layers={wideHeroDocument.layers} excludeIds={["hero-accent"]} />
    );

    expect(container.querySelector('[data-layer-id="hero-accent"]')).toBeNull();
    expect(container.querySelector('[data-layer-id="hero-title"]')).not.toBeNull();
  });

  it("nests group children inside the group wrapper and clips when requested", () => {
    const { container } = render(<LayerStack layers={editorialSpreadDocument.layers} />);

    const group = container.querySelector<HTMLElement>('[data-layer-id="band"]')!;
    expect(group).toHaveAttribute("data-km-layer", "group");

    const child = container.querySelector<HTMLElement>('[data-layer-id="band-left"]')!;
    expect(group.contains(child)).toBe(true);
    expect(group.style.overflow).toBe("hidden");
  });

  it("paints ellipse and line shapes as stretched SVG", () => {
    const layers: Layer[] = [
      shapeLayer("ellipse", "Ellipse", { x: 0, y: 0, width: 100, height: 50 }, { kind: "ellipse", fill: "#101418" }, { z: 0 }),
      shapeLayer("line", "Line", { x: 0, y: 0, width: 100, height: 50 }, { kind: "line", stroke: "#101418", strokeWidth: 2 }, { z: 1 }),
    ];

    const { container } = render(<LayerStack layers={layers} />);

    const ellipse = container.querySelector('[data-km-shape="ellipse"]')!;
    expect(ellipse.tagName.toLowerCase()).toBe("svg");
    expect(ellipse).toHaveAttribute("preserveAspectRatio", "none");

    const line = container.querySelector('[data-km-shape="line"]')!;
    expect(line.tagName.toLowerCase()).toBe("svg");
    expect(line).toHaveAttribute("preserveAspectRatio", "none");
  });

  it("reports exactly one id per click and no selection change when multiSelect is off", () => {
    const onSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <LayerStack
        layers={wideHeroDocument.layers}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(container.querySelector('[data-km-layer-stack="root"]')).toHaveAttribute(
      "data-km-layer-stack-multiselect",
      "false"
    );

    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    fireEvent.click(visual, { shiftKey: true });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");

    onSelect.mockClear();
    fireEvent.click(visual, { ctrlKey: true });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");

    // Single-select mode never computes or reports a resulting selection.
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("toggles a layer in and out of the selection with Ctrl/Cmd when multiSelect is on", () => {
    const onSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const layers = wideHeroDocument.layers;
    const { container, rerender } = render(
      <LayerStack
        layers={layers}
        selectedIds={[]}
        multiSelect
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(container.querySelector('[data-km-layer-stack="root"]')).toHaveAttribute(
      "data-km-layer-stack-multiselect",
      "true"
    );

    const accent = container.querySelector<HTMLElement>('[data-layer-id="hero-accent"]')!;
    fireEvent.click(accent, { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["hero-accent"]);
    expect(onSelect).toHaveBeenLastCalledWith("hero-accent");

    // The consumer applied the toggle; a second Ctrl click removes it again.
    rerender(
      <LayerStack
        layers={layers}
        selectedIds={["hero-accent"]}
        multiSelect
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );
    fireEvent.click(accent, { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(onSelect).toHaveBeenLastCalledWith("hero-accent");
  });

  it("keeps an already-selected layer's selection on a plain click when multiSelect is on", () => {
    const onSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <LayerStack
        layers={wideHeroDocument.layers}
        selectedIds={["hero-visual", "hero-accent"]}
        multiSelect
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );

    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    fireEvent.click(visual);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["hero-visual", "hero-accent"]);
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");
  });

  it("selects the paint-order range from the anchor on Shift+click and still reports onSelect", () => {
    const onSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <LayerStack
        layers={wideHeroDocument.layers}
        selectedIds={["hero-visual"]}
        multiSelect
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );

    // A plain click anchors the range at the clicked layer.
    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    fireEvent.click(visual);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["hero-visual"]);

    const caption = container.querySelector<HTMLElement>('[data-layer-id="hero-caption"]')!;
    fireEvent.click(caption, { shiftKey: true });
    // Every visible layer between index 1 (hero-visual) and 4 (hero-caption),
    // inclusive, in paint order — the locked hero-field below the anchor is out.
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      "hero-visual",
      "hero-accent",
      "hero-title",
      "hero-caption",
    ]);
    // A range reports the anchor id so existing toggle-by-id consumers keep working.
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");
  });

  it("honours keyboard modifiers and clears on a background click when multiSelect is on", () => {
    const onSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <LayerStack
        layers={wideHeroDocument.layers}
        selectedIds={["hero-visual"]}
        multiSelect
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />
    );

    const visual = container.querySelector<HTMLElement>('[data-layer-id="hero-visual"]')!;
    fireEvent.keyDown(visual, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["hero-visual"]);

    const caption = container.querySelector<HTMLElement>('[data-layer-id="hero-caption"]')!;
    fireEvent.keyDown(caption, { key: "Enter", shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      "hero-visual",
      "hero-accent",
      "hero-title",
      "hero-caption",
    ]);
    expect(onSelect).toHaveBeenLastCalledWith("hero-visual");

    fireEvent.click(container.querySelector<HTMLElement>('[data-km-layer-stack="root"]')!);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
  it("labels a selectable layer as a group, not a button, so its subtree keeps its semantics", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <LayerStack layers={wideHeroDocument.layers} onSelect={onSelect} />
    );

    // `hero-title` is an unlocked text layer: selectable, but its subtree holds an
    // authored heading, so a `button` role would be invalid and misleading.
    const title = container.querySelector<HTMLElement>('[data-layer-id="hero-title"]')!;
    expect(title).toHaveAttribute("role", "group");
    expect(title).toHaveAttribute("aria-label", "Primary heading");
    expect(title).not.toHaveAttribute("aria-pressed");
    expect(title).toHaveAttribute("tabindex", "0");
    expect(title.querySelector("h1")).not.toBeNull();

    // Keyboard activation is preserved.
    fireEvent.keyDown(title, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("hero-title");

    // A locked layer stays unselectable and role-less.
    const field = container.querySelector<HTMLElement>('[data-layer-id="hero-field"]')!;
    expect(field).not.toHaveAttribute("role");
  });

  it("renders heading-tagged text without a heading role when headingSemantics is neutral", () => {
    const layers: Layer[] = [
      textLayer("heading", "Heading", { x: 0, y: 0, width: 640, height: 120 }, singleSpanText("h1", "Compose once")),
      textLayer("body", "Body", { x: 0, y: 200, width: 640, height: 120 }, singleSpanText("p", "Supporting copy")),
    ];

    const authored = render(<LayerStack layers={layers} headingSemantics="authored" />);
    const neutral = render(<LayerStack layers={layers} headingSemantics="neutral" />);

    // `"neutral"` keeps the previewed composition out of the host document outline,
    // while the text itself is still painted.
    const neutralHeading = neutral.container.querySelector<HTMLElement>('[data-layer-id="heading"]')!;
    expect(within(neutralHeading).queryByRole("heading")).toBeNull();
    expect(neutralHeading).toHaveTextContent("Compose once");

    // Visual parity, not just a tag swap: the painted line block keeps the exact class
    // list and inline style the default (authored) painter produces for the same spec.
    const authoredLine = authored.container.querySelector<HTMLElement>(
      '[data-layer-id="heading"] [data-km-text="line"]'
    )!;
    const neutralLine = neutral.container.querySelector<HTMLElement>(
      '[data-layer-id="heading"] [data-km-text="line"]'
    )!;
    expect(authoredLine.tagName.toLowerCase()).toBe("h1");
    expect(neutralLine.tagName.toLowerCase()).toBe("div");
    expect(neutralLine.className).toBe(authoredLine.className);
    expect(neutralLine.getAttribute("style")).toBe(authoredLine.getAttribute("style"));
  });

  it("keeps the authored heading by default and when headingSemantics is authored", () => {
    const layers: Layer[] = [
      textLayer("section", "Section", { x: 0, y: 0, width: 640, height: 120 }, singleSpanText("h2", "Section")),
    ];

    const byDefault = render(<LayerStack layers={layers} />);
    expect(within(byDefault.container).getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(0);

    const authored = render(<LayerStack layers={layers} headingSemantics="authored" />);
    expect(within(authored.container).getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(0);
  });

  it("never mutates the caller's document when neutralising headings", () => {
    const original = singleSpanText("h1", "Compose once");
    const layers: Layer[] = [
      textLayer("heading", "Heading", { x: 0, y: 0, width: 640, height: 120 }, original),
    ];

    render(<LayerStack layers={layers} headingSemantics="neutral" />);

    // The authored tag survives in the caller's array and the spec identity is intact:
    // the remap copies the spec, it never rewrites the document in place.
    const layer = layers[0];
    if (layer.kind !== "text") throw new Error("expected a text layer");
    expect(layer.text).toBe(original);
    expect(layer.text.as).toBe("h1");
    expect(original.as).toBe("h1");
  });

  it("leaves non-heading text layers untouched in both modes", () => {
    const layers: Layer[] = [
      textLayer("body", "Body", { x: 0, y: 0, width: 640, height: 120 }, singleSpanText("p", "Supporting copy")),
    ];

    const authored = render(<LayerStack layers={layers} headingSemantics="authored" />);
    const neutral = render(<LayerStack layers={layers} headingSemantics="neutral" />);

    for (const view of [authored, neutral]) {
      const line = view.container.querySelector<HTMLElement>(
        '[data-layer-id="body"] [data-km-text="line"]'
      )!;
      expect(line.tagName.toLowerCase()).toBe("p");
      expect(line).toHaveTextContent("Supporting copy");
    }
  });
});

/* ------------------------------------------------------------------ *
 * LayerList
 * ------------------------------------------------------------------ */

const listLayers: Layer[] = [
  shapeLayer("alpha", "Alpha", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 0 }),
  shapeLayer("beta", "Beta", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 1 }),
  shapeLayer("gamma", "Gamma", { x: 0, y: 0, width: 10, height: 10 }, { kind: "rect", fill: "#101418" }, { z: 2, locked: true }),
];

describe("LayerList", () => {
  it("renders an accessible tree with levels, selection and top-most first", () => {
    const { container } = render(<LayerList layers={listLayers} selectedIds={["beta"]} />);

    expect(screen.getByRole("tree", { name: "Layers" })).toBeInTheDocument();

    const items = screen.getAllByRole("treeitem");
    expect(items.map((item) => item.getAttribute("data-layer-id"))).toEqual([
      "gamma",
      "beta",
      "alpha",
    ]);
    for (const item of items) {
      expect(item).toHaveAttribute("aria-level", "1");
    }

    const selected = screen.getByRole("treeitem", { selected: true });
    expect(selected).toHaveAttribute("data-layer-id", "beta");
    expect(container.querySelector('[data-layer-id="alpha"]')).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("toggles visibility and lock through named, pressed controls", () => {
    const onVisibilityChange = vi.fn();
    const onLockChange = vi.fn();
    render(
      <LayerList
        layers={listLayers}
        onVisibilityChange={onVisibilityChange}
        onLockChange={onLockChange}
      />
    );

    const hideAlpha = screen.getByRole("button", { name: 'Hide "Alpha"' });
    expect(hideAlpha).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(hideAlpha);
    expect(onVisibilityChange).toHaveBeenCalledWith("alpha", false);

    const lockAlpha = screen.getByRole("button", { name: 'Lock "Alpha"' });
    expect(lockAlpha).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(lockAlpha);
    expect(onLockChange).toHaveBeenCalledWith("alpha", true);

    const unlockGamma = screen.getByRole("button", { name: 'Unlock "Gamma"' });
    expect(unlockGamma).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(unlockGamma);
    expect(onLockChange).toHaveBeenCalledWith("gamma", false);
  });

  it("requests a reorder with Alt+ArrowUp", () => {
    const onReorder = vi.fn();
    const { container } = render(<LayerList layers={listLayers} onReorder={onReorder} />);

    const beta = container.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    fireEvent.keyDown(beta, { key: "ArrowUp", altKey: true });
    expect(onReorder).toHaveBeenCalledWith("beta", "up");
  });

  it("disables controls for disabled ids", () => {
    render(
      <LayerList
        layers={listLayers}
        disabledIds={["alpha"]}
        onVisibilityChange={() => {}}
        onLockChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: 'Hide "Alpha"' })).toBeDisabled();
    expect(screen.getByRole("button", { name: 'Lock "Alpha"' })).toBeDisabled();
    expect(screen.getByRole("button", { name: 'Hide "Beta"' })).not.toBeDisabled();
  });

  it("renders the empty state when there are no layers", () => {
    const { container } = render(<LayerList layers={[]} />);

    expect(
      screen.getByText("No layers yet. Add a layer to start composing.")
    ).toBeInTheDocument();
    expect(container.querySelector('[data-km-layer-list="empty"]')).not.toBeNull();
    expect(screen.queryAllByRole("treeitem")).toHaveLength(0);
  });

  it("wraps a parent's children in a non-focusable group and keeps aria-level nesting", () => {
    const { container } = render(<LayerList layers={editorialSpreadDocument.layers} />);
    const root = container.querySelector<HTMLElement>('[data-km-layer-list="root"]')!;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    expect(items.length).toBeGreaterThan(0);

    // Every treeitem is a direct child of the tree or of a group — never bare.
    for (const item of items) {
      const parent = item.parentElement!;
      const parentRole = parent.getAttribute("role");
      expect(parent === root || parentRole === "group").toBe(true);
    }

    // The groups are structural only: no tab stop.
    const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-km-layer-group]'));
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.getAttribute("role")).toBe("group");
      const tabIndex = group.getAttribute("tabindex");
      expect(tabIndex === null || tabIndex === "-1").toBe(true);
    }

    // aria-level still equals the nesting depth for a nested document.
    for (const item of items) {
      let depth = 0;
      let ancestor: HTMLElement | null = item.parentElement;
      while (ancestor && ancestor !== root) {
        if (ancestor.getAttribute("role") === "group") depth += 1;
        ancestor = ancestor.parentElement;
      }
      expect(Number(item.getAttribute("aria-level"))).toBe(depth + 1);
    }

    // Concrete spot check: `band` is a root parent, its children sit in the group
    // that follows it, indentation is unchanged and the group holds the subtree.
    const band = root.querySelector<HTMLElement>('[data-layer-id="band"]')!;
    const bandLeft = root.querySelector<HTMLElement>('[data-layer-id="band-left"]')!;
    expect(band).toHaveAttribute("aria-level", "1");
    expect(bandLeft).toHaveAttribute("aria-level", "2");
    const group = band.nextElementSibling as HTMLElement;
    expect(group).toHaveAttribute("data-km-layer-group");
    expect(group).toHaveAttribute("role", "group");
    expect(group.contains(bandLeft)).toBe(true);
    // Depth still drives the existing visual indentation.
    expect(band.style.paddingInlineStart).toBe("8px");
    expect(bandLeft.style.paddingInlineStart).toBe("24px");
  });
  it("marks selected rows with a non-colour indicator, not colour alone", () => {
    const { container } = render(<LayerList layers={listLayers} selectedIds={["beta"]} />);

    const indicators = container.querySelectorAll<HTMLElement>(
      "[data-km-layer-selected-indicator]"
    );
    expect(indicators).toHaveLength(1);
    // The bar is a real, absolutely positioned element pinned to the inline-start
    // edge — it cannot shift layout and does not rely on colour alone.
    expect(indicators[0].className).toContain("absolute");
    expect(indicators[0].className).toContain("start-0");
    expect(indicators[0].className).toContain("bg-checked");
    expect(indicators[0]).toHaveAttribute("aria-hidden", "true");

    const beta = container.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    expect(beta.contains(indicators[0])).toBe(true);

    // No selection -> no indicator anywhere.
    const { container: none } = render(<LayerList layers={listLayers} />);
    expect(none.querySelectorAll("[data-km-layer-selected-indicator]")).toHaveLength(0);
  });

  it("renders one indicator per selected row in a multi-selection", () => {
    const { container } = render(
      <LayerList layers={listLayers} selectedIds={["alpha", "gamma"]} />
    );

    expect(
      container.querySelectorAll("[data-km-layer-selected-indicator]")
    ).toHaveLength(2);
    expect(
      container
        .querySelector<HTMLElement>('[data-layer-id="alpha"]')!
        .querySelector("[data-km-layer-selected-indicator]")
    ).not.toBeNull();
    expect(
      container
        .querySelector<HTMLElement>('[data-layer-id="gamma"]')!
        .querySelector("[data-km-layer-selected-indicator]")
    ).not.toBeNull();
  });

  it("uses a roving tabindex so the tree is a single tab stop", () => {
    const { container } = render(<LayerList layers={listLayers} onSelect={() => {}} />);

    const beta = container.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    const alpha = container.querySelector<HTMLElement>('[data-layer-id="alpha"]')!;
    const gamma = container.querySelector<HTMLElement>('[data-layer-id="gamma"]')!;

    // `gamma` is locked and stays out of the roving set; `beta` is the first
    // operable row and owns the single tab stop.
    expect(beta).toHaveAttribute("tabindex", "0");
    expect(alpha).toHaveAttribute("tabindex", "-1");
    expect(gamma).not.toHaveAttribute("tabindex");

    const tabStops = Array.from(
      container.querySelectorAll<HTMLElement>('[role="treeitem"]')
    ).filter((row) => row.getAttribute("tabindex") === "0");
    expect(tabStops).toHaveLength(1);
  });

  it("moves the active row with the arrow keys and keeps focus and selection in agreement", () => {
    const onSelect = vi.fn();
    const { container } = render(<LayerList layers={listLayers} onSelect={onSelect} />);

    const beta = container.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    const alpha = container.querySelector<HTMLElement>('[data-layer-id="alpha"]')!;

    beta.focus();
    fireEvent.keyDown(beta, { key: "ArrowDown" });

    expect(document.activeElement).toBe(alpha);
    expect(alpha).toHaveAttribute("tabindex", "0");
    expect(beta).toHaveAttribute("tabindex", "-1");
    expect(onSelect).toHaveBeenLastCalledWith("alpha");

    // Home/End jump to the first/last operable row.
    fireEvent.keyDown(alpha, { key: "Home" });
    expect(document.activeElement).toBe(beta);
    expect(onSelect).toHaveBeenLastCalledWith("beta");
    fireEvent.keyDown(beta, { key: "End" });
    expect(document.activeElement).toBe(alpha);
    expect(onSelect).toHaveBeenLastCalledWith("alpha");
  });

  it("keeps Alt+Arrow reorder from moving focus or the active row", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <LayerList layers={listLayers} onSelect={onSelect} onReorder={onReorder} />
    );

    const beta = container.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    beta.focus();

    fireEvent.keyDown(beta, { key: "ArrowDown", altKey: true });
    expect(onReorder).toHaveBeenCalledWith("beta", "down");
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(beta);
    expect(beta).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(beta, { key: "End", altKey: true });
    expect(onReorder).toHaveBeenLastCalledWith("beta", "top");
    expect(document.activeElement).toBe(beta);
  });

  it("reaches the row's controls with ArrowRight and returns with ArrowLeft/Escape", () => {
    render(
      <LayerList
        layers={listLayers}
        onSelect={() => {}}
        onVisibilityChange={() => {}}
        onLockChange={() => {}}
        onReorder={() => {}}
      />
    );

    const beta = document.querySelector<HTMLElement>('[data-layer-id="beta"]')!;
    const hideBeta = screen.getByRole("button", { name: 'Hide "Beta"' });

    // Controls are not tab stops of their own; they are reached from the row.
    expect(hideBeta).toHaveAttribute("tabindex", "-1");

    beta.focus();
    fireEvent.keyDown(beta, { key: "ArrowRight" });
    expect(document.activeElement).toBe(hideBeta);

    fireEvent.keyDown(hideBeta, { key: "Escape" });
    expect(document.activeElement).toBe(beta);

    fireEvent.keyDown(beta, { key: "ArrowRight" });
    fireEvent.keyDown(hideBeta, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(beta);
  });

  it("renders density-aware row controls at or above the 32px target floor", () => {
    render(<LayerList layers={listLayers} onVisibilityChange={() => {}} />);

    // The square target follows `--km-control-height` (40px default), above the
    // previous 24px `size-6` and near the ~44px touch guidance.
    const control = screen.getByRole("button", { name: 'Hide "Alpha"' });
    expect(control.className).toContain("size-[var(--km-control-height)]");
    expect(control.className).not.toContain("size-6");
  });
});

/* ------------------------------------------------------------------ *
 * EditableText
 * ------------------------------------------------------------------ */

const wrapSpec: TextSpec = {
  spans: [{ text: "alpha beta gamma" }],
  fontId: "font-sans",
  size: 10,
  lineHeight: 1.2,
  letterSpacing: 0,
  align: "start",
  direction: "auto",
  fit: "wrap",
  as: "p",
};

const wrapBox: Size = { width: 100, height: 1000 };

describe("EditableText", () => {
  it("lays wrapping text out as one block per produced line with the exact text", () => {
    const { container } = render(
      <EditableText text={wrapSpec} fonts={FIXTURE_FONTS} box={wrapBox} measure={stubMeasure} />
    );

    const lines = container.querySelectorAll<HTMLElement>('[data-km-text="line"]');
    expect(lines).toHaveLength(2);
    expect(Array.from(lines).map((line) => line.textContent)).toEqual(["alpha beta", "gamma"]);
    expect(container.querySelector('[data-km-text="root"]')).toHaveAttribute(
      "data-km-text-fit",
      "wrap"
    );
  });

  it("flags and clips a clip spec whose text exceeds its budget", () => {
    const clipSpec: TextSpec = {
      ...wrapSpec,
      spans: [{ text: "alpha beta gamma delta" }],
      fit: "clip",
      maxLines: 1,
    };
    const { container } = render(
      <EditableText
        text={clipSpec}
        fonts={FIXTURE_FONTS}
        box={{ width: 100, height: 20 }}
        measure={stubMeasure}
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).toHaveAttribute("data-km-text-truncated");
    expect(container.querySelector('[data-km-text-diagnostic="truncated"]')).not.toBeNull();

    const content = container.querySelector<HTMLElement>('[data-km-text="content"]')!;
    expect(content.className).toContain("overflow-hidden");
  });

  it("reports overflow without clipping a wrap spec", () => {
    const overflowSpec: TextSpec = {
      ...wrapSpec,
      spans: [{ text: "alpha beta gamma delta epsilon" }],
    };
    const { container } = render(
      <EditableText
        text={overflowSpec}
        fonts={FIXTURE_FONTS}
        box={{ width: 100, height: 20 }}
        measure={stubMeasure}
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).toHaveAttribute("data-km-text-overflow");
    expect(container.querySelector('[data-km-text-diagnostic="overflow"]')).not.toBeNull();

    const content = container.querySelector<HTMLElement>('[data-km-text="content"]')!;
    expect(content.style.overflow).not.toBe("hidden");
    expect(content.className).not.toContain("overflow-hidden");
  });

  it("selects the element named by text.as", () => {
    const heading: TextSpec = { ...wrapSpec, as: "h1", spans: [{ text: "Title" }] };
    const { container } = render(
      <EditableText
        text={heading}
        fonts={FIXTURE_FONTS}
        box={{ width: 1000, height: 1000 }}
        measure={stubMeasure}
      />
    );

    const line = container.querySelector("h1");
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute("data-km-text", "line");
    expect(line?.textContent).toBe("Title");
  });

  it("flags a font that is not registered", () => {
    const spec: TextSpec = { ...wrapSpec, fontId: "font-missing" };
    const { container } = render(
      <EditableText
        text={spec}
        fonts={FIXTURE_FONTS}
        box={{ width: 1000, height: 1000 }}
        measure={stubMeasure}
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).toHaveAttribute("data-km-text-font-missing", "font-missing");
    expect(container.querySelector('[data-km-text-diagnostic="font-missing"]')).not.toBeNull();
  });

  it("accepts an edit once and ignores a no-op edit", () => {
    const onChange = vi.fn();
    const spec: TextSpec = { ...wrapSpec, spans: [{ text: "Hi" }] };
    const { container } = render(
      <EditableText
        text={spec}
        fonts={FIXTURE_FONTS}
        box={{ width: 1000, height: 1000 }}
        measure={stubMeasure}
        editable
        aria-label="Body"
        onChange={onChange}
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(editor).toHaveAttribute("role", "textbox");

    // A no-op input event (text unchanged from the spec) reports nothing.
    fireEvent.input(editor);
    expect(onChange).not.toHaveBeenCalled();

    editor.textContent = "Hix";
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as TextSpec;
    expect(next.spans[0].text).toBe("Hix");
  });

  it("keeps typed text in the DOM while editable", async () => {
    const user = userEvent.setup();
    const spec: TextSpec = { ...wrapSpec, spans: [{ text: "Hi" }] };
    const { container } = render(
      <EditableText
        text={spec}
        fonts={FIXTURE_FONTS}
        box={{ width: 1000, height: 1000 }}
        measure={stubMeasure}
        editable
        aria-label="Body"
        onChange={() => {}}
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    await user.type(editor, "x");
    expect(editor.textContent ?? "").toContain("x");
  });

  it("reports its measured layout", () => {
    const onLayoutChange = vi.fn();
    render(
      <EditableText
        text={wrapSpec}
        fonts={FIXTURE_FONTS}
        box={wrapBox}
        measure={stubMeasure}
        onLayoutChange={onLayoutChange}
      />
    );

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    const result = onLayoutChange.mock.calls[0][0] as { lineCount: number; lines: unknown[] };
    expect(result.lineCount).toBe(2);
    expect(result.lines).toHaveLength(2);
  });

  it("collapses a multi-span edit to the surviving span with no empty spans", () => {
    const onChange = vi.fn();
    const spec: TextSpec = {
      ...wrapSpec,
      spans: [
        { text: "Hello ", color: "#101418" },
        { text: "world", weight: 700, italic: true, color: "#8a5a2b", underline: true },
      ],
    };
    const { container } = render(
      <EditableText
        text={spec}
        fonts={FIXTURE_FONTS}
        box={{ width: 1000, height: 1000 }}
        measure={stubMeasure}
        editable
        aria-label="Body"
        onChange={onChange}
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    editor.textContent = "Hello world!";
    fireEvent.input(editor);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as TextSpec;

    // No dead entries: every surviving span actually carries text.
    expect(next.spans.length).toBeGreaterThan(0);
    for (const span of next.spans) {
      expect(span.text.length).toBeGreaterThan(0);
    }

    // The surviving run keeps its own style for the whole edited string.
    expect(next.spans[0].text).toBe("Hello world!");
    expect(next.spans[0].color).toBe("#101418");

    // The loss is disclosed machine-readably on the root, not as visible copy.
    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root.getAttribute("data-km-text-diagnostic")).toContain("spans-collapsed");
  });
});

/* ------------------------------------------------------------------ *
 * MediaFrame
 * ------------------------------------------------------------------ */

const assetLandscape = FIXTURE_ASSETS["asset-landscape"];
const mediaBase: MediaSpec = {
  assetId: "asset-landscape",
  fit: "cover",
  focalPoint: { x: 0.5, y: 0.5 },
  mask: { kind: "none" },
};

describe("MediaFrame", () => {
  it("applies object-fit and maps the focal point to object-position", () => {
    const { container } = render(
      <MediaFrame
        media={{ ...mediaBase, fit: "cover", focalPoint: { x: 0.25, y: 0.75 } }}
        asset={assetLandscape}
      />
    );

    const img = container.querySelector<HTMLImageElement>('[data-km-media="image"]')!;
    expect(img.style.objectFit).toBe("cover");
    expect(img.style.objectPosition).toBe("25% 75%");
  });

  it("renders the documented mask styles", () => {
    const { container, rerender } = render(
      <MediaFrame media={{ ...mediaBase, mask: { kind: "rounded", radius: 12 } }} asset={assetLandscape} />
    );
    const frame = () => container.querySelector<HTMLElement>('[data-km-media-frame="root"]')!;
    expect(frame().style.borderRadius).toBe("12px");

    rerender(<MediaFrame media={{ ...mediaBase, mask: { kind: "circle" } }} asset={assetLandscape} />);
    expect(frame().style.borderRadius).toBe("50%");

    rerender(
      <MediaFrame
        media={{
          ...mediaBase,
          mask: { kind: "inset", inset: { top: 4, right: 8, bottom: 12, left: 16 } },
        }}
        asset={assetLandscape}
      />
    );
    expect(frame().style.clipPath).toBe("inset(4px 8px 12px 16px)");
  });

  it("enlarges and offsets an inner box for a source-space crop", () => {
    const { container } = render(
      <MediaFrame
        media={{ ...mediaBase, crop: { top: 0, right: 0, bottom: 0, left: 0.5 } }}
        asset={assetLandscape}
      />
    );

    const crop = container.querySelector<HTMLElement>('[data-km-media="crop"]')!;
    expect(crop.style.position).toBe("absolute");
    expect(crop.style.top).toBe("0%");
    expect(crop.style.left).toBe("-100%");
    expect(crop.style.width).toBe("200%");
    expect(crop.style.height).toBe("100%");
  });

  it("never mutates the asset's intrinsic size", () => {
    const before = { width: assetLandscape.width, height: assetLandscape.height };

    render(
      <MediaFrame
        media={{ ...mediaBase, crop: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 } }}
        asset={assetLandscape}
      />
    );

    expect(assetLandscape.width).toBe(before.width);
    expect(assetLandscape.height).toBe(before.height);
  });

  it("renders decorative media with an empty alt and hidden from assistive tech", () => {
    const { container } = render(
      <MediaFrame media={{ ...mediaBase, decorative: true }} asset={assetLandscape} />
    );

    const img = container.querySelector<HTMLImageElement>('[data-km-media="image"]')!;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("resolves alt as media.alt > prop > asset.alt", () => {
    const { container, rerender } = render(
      <MediaFrame media={{ ...mediaBase, alt: "Media alt" }} asset={assetLandscape} alt="Prop alt" />
    );
    const img = () => container.querySelector<HTMLImageElement>('[data-km-media="image"]')!;
    expect(img().alt).toBe("Media alt");

    rerender(<MediaFrame media={mediaBase} asset={assetLandscape} alt="Prop alt" />);
    expect(img().alt).toBe("Prop alt");

    rerender(<MediaFrame media={mediaBase} asset={assetLandscape} />);
    expect(img().alt).toBe(assetLandscape.alt ?? "");
  });

  it("renders an honest error state when the asset is missing", () => {
    const { container } = render(<MediaFrame media={mediaBase} />);

    const frame = container.querySelector<HTMLElement>('[data-km-media-frame="root"]')!;
    expect(frame).toHaveAttribute("data-km-media-state", "error");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('img[src="undefined"]')).toBeNull();
    expect(screen.getByText("Missing asset")).toBeInTheDocument();
  });

  it("renders a provided fallback in place of the default message", () => {
    render(<MediaFrame media={mediaBase} fallback={<span>No picture</span>} />);

    expect(screen.getByText("No picture")).toBeInTheDocument();
    expect(screen.queryByText("Missing asset")).toBeNull();
  });

  it("marks the frame loaded after the image loads", () => {
    const { container } = render(<MediaFrame media={mediaBase} asset={assetLandscape} />);
    const frame = () => container.querySelector<HTMLElement>('[data-km-media-frame="root"]')!;
    expect(frame()).toHaveAttribute("data-km-media-state", "loading");

    fireEvent.load(container.querySelector('[data-km-media="image"]')!);
    expect(frame()).toHaveAttribute("data-km-media-state", "loaded");
  });
});

/* ------------------------------------------------------------------ *
 * AlignmentGuides
 * ------------------------------------------------------------------ */

describe("AlignmentGuides", () => {
  it("is non-exporting authoring chrome", () => {
    expect(ALIGNMENT_GUIDES_EXPORTABLE).toBe(false);

    const { container } = render(<AlignmentGuides />);
    const root = container.querySelector<HTMLElement>('[data-km-guides="root"]')!;
    expect(root).toHaveAttribute("data-km-guides-exportable", "false");
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("renders nothing when hidden or below the minimum scale", () => {
    const { container, rerender } = render(<AlignmentGuides visible={false} />);
    expect(container.querySelector('[data-km-guides="root"]')).toBeNull();

    rerender(
      <Artboard artboard={wideHeroDocument.artboard} zoom={0.25}>
        <AlignmentGuides minimumScale={0.5} />
      </Artboard>
    );
    expect(container.querySelector('[data-km-guides="root"]')).toBeNull();
  });

  it("draws one line per guide with its id", () => {
    const { container } = render(
      <AlignmentGuides
        guides={[
          { id: "guide-x", axis: "x", position: 100 },
          { id: "guide-y", axis: "y", position: 200 },
        ]}
      />
    );

    expect(container.querySelectorAll('[data-km-guides="guide"]')).toHaveLength(2);
    expect(container.querySelector('[data-km-guide-id="guide-x"]')).not.toBeNull();
    expect(container.querySelector('[data-km-guide-id="guide-y"]')).not.toBeNull();
  });

  it("renders safe region, centre axes, measurements and snaps only under their flags", () => {
    const { container, rerender } = render(<AlignmentGuides />);
    expect(container.querySelector('[data-km-guides="safe-region"]')).toBeNull();
    expect(container.querySelector('[data-km-guides="center-axis"]')).toBeNull();
    expect(container.querySelector('[data-km-guides="measurement"]')).toBeNull();
    expect(container.querySelector('[data-km-guides="snap"]')).toBeNull();

    rerender(<AlignmentGuides showSafeRegion showCenterAxes />);
    expect(container.querySelectorAll('[data-km-guides="safe-region"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-km-guides="center-axis"]')).toHaveLength(2);

    rerender(
      <AlignmentGuides measurements={[{ id: "m1", rect: { x: 10, y: 10, width: 100, height: 50 } }]} />
    );
    expect(container.querySelector('[data-km-measurement-id="m1"]')).not.toBeNull();

    rerender(
      <AlignmentGuides
        measurements={[{ id: "m1", rect: { x: 10, y: 10, width: 100, height: 50 } }]}
        showMeasurements={false}
      />
    );
    expect(container.querySelector('[data-km-guides="measurement"]')).toBeNull();

    rerender(
      <AlignmentGuides
        activeSnaps={[
          {
            axis: "x",
            position: 100,
            delta: 0,
            target: { axis: "x", position: 100, kind: "artboard-edge" },
          },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-km-guides="snap"]')).toHaveLength(1);
  });

  it("exposes targets and snaps a near miss onto a real target", () => {
    const layers: Layer[] = [
      shapeLayer("box", "Box", { x: 100, y: 100, width: 100, height: 100 }, { kind: "rect", fill: "#101418" }, { z: 0 }),
    ];

    const { result } = renderHook(() => useAlignmentGuides(layers));
    expect(result.current.targets.length).toBeGreaterThan(0);

    const snapped = result.current.snap({ x: 98, y: 0, width: 10, height: 10 });
    expect(snapped.rect.x).toBe(100);

    const hit = snapped.hits.find((entry) => entry.axis === "x");
    expect(hit).toBeDefined();
    expect(hit?.position).toBe(100);
    expect(hit?.target.kind).toBe("layer-edge");
  });
});
