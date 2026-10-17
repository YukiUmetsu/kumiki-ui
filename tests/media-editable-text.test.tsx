import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { EditableText } from "../src/media/editable-text";
import { FIXTURE_FONTS } from "../src/media/fixtures";
import type { Size, TextSpec } from "../src/media/document";

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles, descriptions) stay on.
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

/** Deterministic stub measurer: 10 design px per character, independent of the font. */
const stubMeasure = (_font: string, text: string): number => text.length * 10;

const baseSpec: TextSpec = {
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

const fittingBox: Size = { width: 1000, height: 1000 };
const crampedBox: Size = { width: 100, height: 20 };

/* ------------------------------------------------------------------ *
 * Defect 1 — diagnostics are associated with the textbox
 * ------------------------------------------------------------------ */

describe("EditableText diagnostics description", () => {
  it("associates the textbox with the diagnostics region when a diagnostic is present", () => {
    const overflowSpec: TextSpec = {
      ...baseSpec,
      spans: [{ text: "alpha beta gamma delta epsilon" }],
    };
    const { container } = render(
      <EditableText
        text={overflowSpec}
        fonts={FIXTURE_FONTS}
        box={crampedBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    // The visible caption is untouched, marker and all.
    expect(container.querySelector('[data-km-text-diagnostic="overflow"]')).not.toBeNull();

    // The textbox now names the region that holds it.
    const describedBy = editor.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const region = container.querySelector<HTMLElement>(`[id="${describedBy}"]`);
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("data-km-text-diagnostics");
    expect(within(region as HTMLElement).getByText("Text overflows its box")).toBeInTheDocument();
  });

  it("does not write a dangling aria-describedby when there is no diagnostic", () => {
    const { container } = render(
      <EditableText
        text={baseSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    expect(editor).not.toHaveAttribute("aria-describedby");
    expect(container.querySelector("[data-km-text-diagnostics]")).toBeNull();
  });

  it("describes the diagnostics region without turning it into a live region", () => {
    const missingFontSpec: TextSpec = { ...baseSpec, fontId: "font-missing" };
    const { container } = render(
      <EditableText
        text={missingFontSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
      />
    );

    const region = container.querySelector<HTMLElement>("[data-km-text-diagnostics]")!;
    expect(region).not.toBeNull();
    expect(region).not.toHaveAttribute("aria-live");
    expect(region).not.toHaveAttribute("role");
  });
});

/* ------------------------------------------------------------------ *
 * Defect 2 — the placeholder is exposed to assistive technology
 * ------------------------------------------------------------------ */

const emptySpec: TextSpec = { ...baseSpec, spans: [{ text: "" }] };

describe("EditableText placeholder", () => {
  it("exposes the placeholder on the textbox while keeping the visual hint decorative", () => {
    const { container } = render(
      <EditableText
        text={emptySpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        placeholder="Write a headline"
        aria-label="Headline"
      />
    );

    const editor = screen.getByRole("textbox", { name: "Headline" });
    expect(editor).toHaveAttribute("aria-placeholder", "Write a headline");

    // The painted hint duplicates the accessible hint, so it stays hidden.
    const hint = container.querySelector<HTMLElement>('[data-km-text="placeholder"]')!;
    expect(hint).toHaveAttribute("aria-hidden", "true");
    expect(hint).toHaveTextContent("Write a headline");

    // ...and is never part of the editable field's own text content.
    expect(editor.textContent ?? "").not.toContain("Write a headline");
    expect(within(editor).queryByText("Write a headline")).toBeNull();
  });

  it("omits aria-placeholder with no placeholder and paints none in read-only mode", () => {
    const { container, rerender } = render(
      <EditableText
        text={emptySpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Headline"
      />
    );
    expect(container.querySelector<HTMLElement>('[data-km-text="editor"]')).not.toHaveAttribute(
      "aria-placeholder"
    );

    rerender(
      <EditableText
        text={emptySpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        placeholder="Write a headline"
      />
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container.querySelector('[data-km-text="placeholder"]')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Defect 3 — a non-editable root's label is actually exposed
 * ------------------------------------------------------------------ */

describe("EditableText root semantics", () => {
  it("gives a labelled non-editable root role=group so the label is announced", () => {
    const { container } = render(
      <EditableText
        text={baseSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        aria-label="Hero headline"
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).toHaveAttribute("role", "group");
    expect(root).toHaveAttribute("aria-label", "Hero headline");
    expect(screen.getByRole("group", { name: "Hero headline" })).toBe(root);
  });

  it("does not add role=group to an editable root; the textbox keeps the label", () => {
    const { container } = render(
      <EditableText
        text={baseSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Hero headline"
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("aria-label");

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    expect(editor).toHaveAttribute("role", "textbox");
    expect(editor).toHaveAttribute("aria-label", "Hero headline");
  });

  it("leaves an unlabelled non-editable root without a role", () => {
    const { container } = render(
      <EditableText
        text={baseSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
      />
    );

    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("aria-label");
  });
});

/* ------------------------------------------------------------------ *
 * axe — the associated diagnostics and placeholder states are clean
 * ------------------------------------------------------------------ */

describe("EditableText accessibility (axe)", () => {
  it("has no detectable violations across the placeholder and diagnostics states", async () => {
    const { container } = render(
      <div>
        <EditableText
          text={emptySpec}
          fonts={FIXTURE_FONTS}
          box={fittingBox}
          measure={stubMeasure}
          editable
          placeholder="Write a headline"
          aria-label="Headline"
        />
        <EditableText
          text={baseSpec}
          fonts={FIXTURE_FONTS}
          box={crampedBox}
          measure={stubMeasure}
          editable
          aria-label="Body copy"
        />
      </div>
    );

    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Defect 4 — a controlled multi-span editor must not desync React
 * ------------------------------------------------------------------ */

const multiSpanSpec: TextSpec = {
  ...baseSpec,
  spans: [
    { text: "alpha ", weight: 700 },
    { text: "beta", italic: true },
  ],
};

describe("EditableText editable content", () => {
  it("renders no React-managed element children and seeds the text imperatively", () => {
    const { container } = render(
      <EditableText
        text={multiSpanSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;
    // React owns no element children inside the editor: React therefore never
    // tries to remove children it did not create.
    expect(editor.children.length).toBe(0);
    // The content is a single bare text node the browser owns, written by the
    // component's effect rather than rendered by React.
    expect(editor.childNodes.length).toBe(1);
    expect(editor.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(editor.textContent).toBe("alpha beta");
  });

  it("does not throw while typing a multi-span spec and reports a single-span payload", () => {
    const onChange = vi.fn();
    const { container } = render(
      <EditableText
        text={multiSpanSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
        onChange={onChange}
      />
    );

    const editor = container.querySelector<HTMLElement>('[data-km-text="editor"]')!;

    // A realistic run of keystrokes: the browser mutates the text node and fires
    // `input` each time. This is the sequence that desynced React's child tree
    // and threw `NotFoundError: Failed to execute 'removeChild'`.
    const typed = ["alpha betaX", "alpha betaXY", "alpha betaXYZ"];
    expect(() => {
      for (const value of typed) {
        editor.textContent = value;
        fireEvent.input(editor);
      }
    }).not.toThrow();

    expect(onChange).toHaveBeenCalledTimes(typed.length);
    const last = onChange.mock.calls[typed.length - 1][0] as TextSpec;
    // The M0 flatten path ran: one span, keeping only the first run's style.
    expect(last.spans).toHaveLength(1);
    expect(last.spans[0].text).toBe("alpha betaXYZ");
    expect(last.spans[0].weight).toBe(700);
    expect(last.spans[0].italic).toBeUndefined();

    // The collapse is still disclosed through the existing machine-readable token.
    const root = container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root.getAttribute("data-km-text-diagnostic")).toContain("spans-collapsed");
  });

  it("survives a controlled parent feeding edited specs back into a multi-span editor", () => {
    function ControlledEditor({ initial }: { initial: TextSpec }) {
      const [spec, setSpec] = useState(initial);
      return (
        <EditableText
          text={spec}
          fonts={FIXTURE_FONTS}
          box={fittingBox}
          measure={stubMeasure}
          editable
          aria-label="Body"
          onChange={setSpec}
        />
      );
    }

    const { container } = render(<ControlledEditor initial={multiSpanSpec} />);
    const editor = () => container.querySelector<HTMLElement>('[data-km-text="editor"]')!;

    // The controlled loop (edit -> new spec -> re-render) is exactly where the
    // original crash surfaced; it must now reconcile cleanly.
    expect(() => {
      for (const value of ["alpha betaX", "alpha betaXY"]) {
        editor().textContent = value;
        fireEvent.input(editor());
      }
    }).not.toThrow();

    expect(editor().textContent).toBe("alpha betaXY");
    expect(editor().children.length).toBe(0);
  });

  it("renders the diagnostics caption on an opaque, bordered chip surface", () => {
    const { container } = render(
      <EditableText
        text={{ ...baseSpec, spans: [{ text: "alpha beta gamma delta epsilon" }] }}
        fonts={FIXTURE_FONTS}
        box={crampedBox}
        measure={stubMeasure}
        editable
        aria-label="Body"
      />
    );

    const region = container.querySelector<HTMLElement>("[data-km-text-diagnostics]")!;
    expect(region).not.toBeNull();

    const classes = region.className.split(/\s+/);
    // An opaque surface the component controls, so contrast never depends on the
    // artwork behind the layer.
    expect(classes.some((name) => name === "bg-surface" || name === "bg-surface-elevated")).toBe(
      true
    );
    expect(classes).toContain("border");
    // The caption keeps its danger colour and caption size on that surface.
    expect(classes).toContain("text-danger");
    expect(classes).toContain("text-caption");
    // The visible copy is byte-identical and stays outside the clipped content.
    expect(within(region).getByText("Text overflows its box")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Defect 5 — the reported layout must describe the editable render
 * ------------------------------------------------------------------ */

// jsdom has no real text engine, so these assert the reported-layout *contract*
// through an injected `measure` and the component's own markers, never painted
// geometry: `stubMeasure` wraps at a deterministic 10 design px per character, so
// a 100px box holds ~9 characters and no measurement depends on a real font.
const overBudgetSpec: TextSpec = {
  ...baseSpec,
  spans: [{ text: "alpha beta gamma delta epsilon zeta eta theta" }],
  fit: "wrap",
  maxLines: 3,
};

// Five wrapped lines at this width, two more than `maxLines` allows.
const threeLineBox: Size = { width: 100, height: 20 };

describe("EditableText reported layout while editing", () => {
  it("reports the rendered, untruncated layout while editable", () => {
    const onLayoutChange = vi.fn();
    render(
      <EditableText
        text={overBudgetSpec}
        fonts={FIXTURE_FONTS}
        box={threeLineBox}
        measure={stubMeasure}
        editable
        onLayoutChange={onLayoutChange}
      />
    );

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    const result = onLayoutChange.mock.calls[0][0] as {
      lineCount: number;
      truncated: boolean;
      size: number;
    };
    // The readout describes the block on screen: nothing is dropped, every
    // wrapped line is counted, and the size is never shrunk.
    expect(result.truncated).toBe(false);
    expect(result.lineCount).toBeGreaterThan(3);
    expect(result.size).toBe(overBudgetSpec.size);
  });

  it("still reports the fit policy's truncation when not editable", () => {
    const onLayoutChange = vi.fn();
    render(
      <EditableText
        text={overBudgetSpec}
        fonts={FIXTURE_FONTS}
        box={threeLineBox}
        measure={stubMeasure}
        onLayoutChange={onLayoutChange}
      />
    );

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    const result = onLayoutChange.mock.calls[0][0] as {
      lineCount: number;
      truncated: boolean;
    };
    // Read-only keeps `maxLines` and reports the dropped lines exactly as before.
    expect(result.truncated).toBe(true);
    expect(result.lineCount).toBe(3);
  });

  it("marks the root as editing only while editable", () => {
    const { container, rerender } = render(
      <EditableText
        text={baseSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
      />
    );
    const root = () => container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(root()).toHaveAttribute("data-km-text-editing", "true");

    rerender(
      <EditableText text={baseSpec} fonts={FIXTURE_FONTS} box={fittingBox} measure={stubMeasure} />
    );
    expect(root()).not.toHaveAttribute("data-km-text-editing");
  });

  it("discloses the suspended fit policy only when the two layouts differ", () => {
    // The over-budget spec would truncate read-only, so editing really does
    // suspend the policy; the root says so instead of reporting a phantom.
    const suspended = render(
      <EditableText
        text={overBudgetSpec}
        fonts={FIXTURE_FONTS}
        box={threeLineBox}
        measure={stubMeasure}
        editable
      />
    ).container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(suspended.getAttribute("data-km-text-diagnostic")).toContain("fit-suspended");

    // A short spec that already fits `maxLines` has no difference to disclose, so
    // the token is absent (the aggregated attribute is not written at all).
    const shortSpec: TextSpec = {
      ...baseSpec,
      spans: [{ text: "alpha beta" }],
      fit: "wrap",
      maxLines: 3,
    };
    const fits = render(
      <EditableText
        text={shortSpec}
        fonts={FIXTURE_FONTS}
        box={fittingBox}
        measure={stubMeasure}
        editable
      />
    ).container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(fits.getAttribute("data-km-text-diagnostic")).toBeNull();

    // Never while read-only: the policy is applied there, not suspended.
    const readOnly = render(
      <EditableText
        text={overBudgetSpec}
        fonts={FIXTURE_FONTS}
        box={threeLineBox}
        measure={stubMeasure}
      />
    ).container.querySelector<HTMLElement>('[data-km-text="root"]')!;
    expect(readOnly.getAttribute("data-km-text-diagnostic")).toBeNull();
  });
});
