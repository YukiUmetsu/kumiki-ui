import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FontAsset, Size, TextFit, TextLayer, TextSpec } from "./document";
import { collectTextLayers } from "./document";
import { EditableText } from "./editable-text";
import { FIXTURE_FONTS, multilingualDocument } from "./fixtures";

/** Long enough that no 320 px box shows it on one line, so the fit policy has to do work. */
const LONG_COPY =
  "Long copy that cannot fit on one line: the fit policy decides whether to wrap further, shrink, clip, or overflow and report it.";

const FIT_BOX: Size = { width: 320, height: 120 };

function textSpec(fit: TextFit, overrides: Partial<TextSpec> = {}): TextSpec {
  return {
    spans: [{ text: LONG_COPY, color: "#101418" }],
    fontId: "font-sans",
    size: 30,
    lineHeight: 1.3,
    letterSpacing: 0,
    align: "start",
    direction: "auto",
    fit,
    as: "p",
    ...overrides,
  };
}

function fitOverrides(fit: TextFit): Partial<TextSpec> {
  if (fit === "wrap") return { maxLines: 2 };
  if (fit === "clip") return { maxLines: 4 };
  if (fit === "shrink") return { minSize: 12, maxSize: 30, maxLines: 4 };
  return {};
}

const meta = {
  title: "Media/Editable Text",
  component: EditableText,
  parameters: { layout: "padded" },
  args: { text: textSpec("wrap"), fonts: FIXTURE_FONTS },
} satisfies Meta<typeof EditableText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One sample per policy. The dashed box is the declared layout box: `wrap` and
 * `none` are free to paint past it, `clip` trims to it and `shrink` reflows
 * inside it, which is exactly the difference the fixtures guard.
 */
function FitSample({ fit }: { fit: TextFit }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-caption text-muted-foreground">
        <code className="font-mono">fit=&quot;{fit}&quot;</code>
      </figcaption>
      <div className="relative" style={{ width: FIT_BOX.width }}>
        <div
          aria-hidden="true"
          data-km-box="declared"
          className="pointer-events-none absolute inset-x-0 top-0 rounded-sm border border-dashed border-input"
          style={{ height: FIT_BOX.height }}
        />
        <EditableText text={textSpec(fit, fitOverrides(fit))} fonts={FIXTURE_FONTS} box={FIT_BOX} className="relative" />
      </div>
    </figure>
  );
}

export const FitPolicies: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <FitSample fit="wrap" />
      <FitSample fit="shrink" />
      <FitSample fit="clip" />
      <FitSample fit="none" />
    </div>
  ),
};

export const FitWrap: Story = {
  render: () => <FitSample fit="wrap" />,
};

export const FitShrink: Story = {
  render: () => <FitSample fit="shrink" />,
};

export const FitClip: Story = {
  render: () => <FitSample fit="clip" />,
};

export const FitNone: Story = {
  render: () => <FitSample fit="none" />,
};

export const MultiSpan: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <EditableText
        text={{
          ...textSpec("wrap", { maxLines: 4 }),
          spans: [
            { text: "Runs keep their own styling across ", color: "#5c6360" },
            { text: "measured", italic: true, color: "#2f6f4f" },
            { text: " line breaks ", color: "#5c6360" },
            { text: "without flattening", weight: 600, color: "#101418" },
            { text: " the paragraph.", color: "#5c6360" },
          ],
        }}
        fonts={FIXTURE_FONTS}
        box={{ width: 320, height: 120 }}
      />
    </div>
  ),
};

/**
 * Controlled editing: the component reports the next spec and this story owns it,
 * so typing updates the readout below. The browser keeps the caret, selection and
 * IME while the spec stays the source of truth.
 */
export const Editable: Story = {
  render: () => {
    function EditableExample() {
      const [spec, setSpec] = useState<TextSpec>(() =>
        textSpec("wrap", {
          maxLines: 4,
          spans: [
            { text: "Edit this line in place — the caret, selection and IME stay native.", color: "#101418" },
          ],
        })
      );

      return (
        <div className="flex flex-col gap-2" style={{ width: 320 }}>
          <div className="rounded-surface border border-border bg-surface p-3">
            <EditableText
              text={spec}
              fonts={FIXTURE_FONTS}
              box={{ width: 300, height: 120 }}
              editable
              placeholder="Type something…"
              onChange={setSpec}
            />
          </div>
          <p data-testid="editable-readout" className="text-caption text-muted-foreground">
            {spec.spans[0]?.text}
          </p>
        </div>
      );
    }

    return <EditableExample />;
  },
};

/**
 * `font-unpinned` is declared with `availability: "unknown"` and deliberately
 * cannot be pinned. Here the registry omits it, so the layout substitutes its
 * fallback chain and surfaces the honest `font-missing` diagnostic inline.
 */
const fontsWithoutUnpinned: Record<string, FontAsset> = Object.fromEntries(
  Object.entries(FIXTURE_FONTS).filter(([id]) => id !== "font-unpinned")
);

export const MissingFont: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <EditableText
        text={textSpec("wrap", {
          fontId: "font-unpinned",
          maxLines: 3,
          spans: [{ text: "Set in a face the environment may not provide.", color: "#101418" }],
        })}
        fonts={fontsWithoutUnpinned}
        box={{ width: 320, height: 120 }}
      />
    </div>
  ),
};

const ML_SCALE = 0.42;

/**
 * The document boxes are up to 936 design px wide, so each layer is laid out at
 * its true size and then scaled down for display: the wrapping is honest because
 * the measurement box is untouched.
 */
function ScaledLocalizedText({ layer }: { layer: TextLayer }) {
  const width = layer.transform.width;
  const height = layer.transform.height;
  return (
    <div style={{ width: width * ML_SCALE, height: height * ML_SCALE }}>
      <div style={{ width, height, transform: `scale(${ML_SCALE})`, transformOrigin: "top left" }}>
        <EditableText text={layer.text} fonts={multilingualDocument.fonts} box={{ width, height }} />
      </div>
    </div>
  );
}

/**
 * Required by the repo's quality gates: one composition mixing a long Japanese
 * heading, right-to-left Arabic, an emoji/flag/combining-mark run and an
 * unbreakable URL, all rendered through the multilingual fixture's own layers.
 */
export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 bg-canvas p-6">
      {collectTextLayers(multilingualDocument.layers).map((layer) => (
        <figure key={layer.id} className="m-0 flex flex-col gap-1">
          <figcaption className="text-caption text-muted-foreground">{layer.name}</figcaption>
          <ScaledLocalizedText layer={layer} />
        </figure>
      ))}
    </div>
  ),
};
