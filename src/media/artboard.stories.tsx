import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Artboard } from "./artboard";
import { LayerStack } from "./layer-stack";
import { insetsFromRatio } from "./document";
import { verticalStoryDocument, wideHeroDocument } from "./fixtures";

const meta = {
  title: "Media/Artboard",
  component: Artboard,
  parameters: { layout: "fullscreen" },
  args: { artboard: wideHeroDocument.artboard },
} satisfies Meta<typeof Artboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The `wide-hero` artboard carries a zero bleed and crop, so the overlay story
 * derives a copy with real insets rather than pretending a zero-width outline is
 * an overlay. Everything else comes from the fixture unchanged.
 */
const overlayArtboard = {
  ...wideHeroDocument.artboard,
  bleed: insetsFromRatio(0.03, wideHeroDocument.artboard),
  crop: insetsFromRatio(0.02, wideHeroDocument.artboard),
};

function HeroLayers() {
  return (
    <LayerStack
      layers={wideHeroDocument.layers}
      fonts={wideHeroDocument.fonts}
      assets={wideHeroDocument.assets}
    />
  );
}

export const Default: Story = {
  render: () => (
    <Artboard artboard={wideHeroDocument.artboard} className="h-[80vh] w-full">
      <HeroLayers />
    </Artboard>
  ),
};

export const WithOverlays: Story = {
  render: () => (
    <Artboard
      artboard={overlayArtboard}
      showSafeRegion
      showBleed
      showCrop
      className="h-[80vh] w-full"
    >
      <HeroLayers />
    </Artboard>
  ),
};

export const Contained: Story = {
  render: () => (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="h-72 w-[28rem] max-w-full rounded-surface border border-border">
        <Artboard artboard={wideHeroDocument.artboard} fit="contain" className="h-full w-full">
          <HeroLayers />
        </Artboard>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Artboard artboard={verticalStoryDocument.artboard} className="h-[90vh] w-full">
      <LayerStack
        layers={verticalStoryDocument.layers}
        fonts={verticalStoryDocument.fonts}
        assets={verticalStoryDocument.assets}
      />
    </Artboard>
  ),
};

/**
 * Zoom and pan are controlled: the artboard reports intent through
 * `onZoomChange`/`onPanChange` and this story owns the state, so the toolbar
 * buttons *and* the in-frame keyboard shortcuts (`+`, `-`, arrows, `0`) both
 * re-render the frame.
 */
export const ControlledZoomPan: Story = {
  render: () => {
    function ControlledArtboard() {
      const [zoom, setZoom] = useState(0.5);
      const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

      return (
        <div className="flex min-h-screen flex-col gap-3 bg-canvas p-6 text-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-body-sm"
              onClick={() => setZoom((current) => Math.min(4, current * 1.25))}
            >
              Zoom in
            </button>
            <button
              type="button"
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-body-sm"
              onClick={() => setZoom((current) => Math.max(0.25, current / 1.25))}
            >
              Zoom out
            </button>
            <button
              type="button"
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-body-sm"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </button>
            <output data-testid="zoom-pan-readout" className="font-mono text-caption text-muted-foreground">
              zoom {zoom.toFixed(2)} · pan {pan.x}, {pan.y}
            </output>
          </div>
          <div className="h-[68vh] w-full">
            <Artboard
              artboard={wideHeroDocument.artboard}
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              fit="contain"
              className="h-full w-full"
            >
              <HeroLayers />
            </Artboard>
          </div>
          <p className="text-caption text-muted-foreground">
            Focus the artboard and use <code className="font-mono">+</code> /{" "}
            <code className="font-mono">-</code> to zoom, the arrow keys to pan, and{" "}
            <code className="font-mono">0</code> to reset.
          </p>
        </div>
      );
    }

    return <ControlledArtboard />;
  },
};
