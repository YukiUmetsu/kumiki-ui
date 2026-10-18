import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Artboard } from "./artboard";
import { LayerList, LayerStack } from "./layer-stack";
import type { Layer } from "./document";
import { editorialSpreadDocument, emptyDocument, wideHeroDocument } from "./fixtures";

const meta = {
  title: "Media/Layer Stack",
  component: LayerStack,
  parameters: { layout: "fullscreen" },
  args: { layers: wideHeroDocument.layers },
} satisfies Meta<typeof LayerStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A bounded preview frame so a 1280×720 or 1600×1000 artboard is legible, not clipped. */
function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-[26rem] w-[42rem] max-w-full rounded-surface border border-border">{children}</div>
  );
}

/**
 * Hidden layers are skipped while painting but still listed; locked layers paint
 * but stop intercepting selection. Derived from `wideHeroDocument`, whose field
 * layer is already locked, so the fixture itself stays untouched.
 */
const hiddenAndLockedLayers: Layer[] = wideHeroDocument.layers.map((layer) => {
  if (layer.id === "hero-title") return { ...layer, locked: true };
  if (layer.id === "hero-caption") return { ...layer, visible: false };
  return layer;
});

function HeroStack({ layers }: { layers: readonly Layer[] }) {
  return (
    <Artboard artboard={wideHeroDocument.artboard} fit="contain" className="h-full w-full">
      <LayerStack layers={layers} fonts={wideHeroDocument.fonts} assets={wideHeroDocument.assets} />
    </Artboard>
  );
}

export const PaintOrder: Story = {
  render: () => (
    <div className="flex min-h-screen flex-col gap-6 bg-canvas p-6 text-foreground lg:flex-row">
      <PreviewFrame>
        <Artboard artboard={editorialSpreadDocument.artboard} fit="contain" className="h-full w-full">
          <LayerStack
            layers={editorialSpreadDocument.layers}
            fonts={editorialSpreadDocument.fonts}
            assets={editorialSpreadDocument.assets}
          />
        </Artboard>
      </PreviewFrame>
      <div className="h-[26rem] w-72 max-w-full">
        <LayerList
          layers={editorialSpreadDocument.layers}
          aria-label="Editorial spread layers"
          className="h-full"
        />
      </div>
    </div>
  ),
};

export const HiddenAndLocked: Story = {
  render: () => (
    <div className="flex min-h-screen flex-col gap-6 bg-canvas p-6 text-foreground lg:flex-row">
      <PreviewFrame>
        <HeroStack layers={hiddenAndLockedLayers} />
      </PreviewFrame>
      <div className="h-[26rem] w-72 max-w-full">
        <LayerList
          layers={hiddenAndLockedLayers}
          aria-label="Layers with hidden and locked entries"
          className="h-full"
        />
      </div>
    </div>
  ),
};

export const ExcludedLayers: Story = {
  render: () => (
    <div className="flex min-h-screen flex-wrap gap-6 bg-canvas p-6 text-foreground">
      {[
        { title: "All layers", excludeIds: undefined },
        { title: 'excludeIds={["hero-visual"]}', excludeIds: ["hero-visual"] },
      ].map((panel) => (
        <figure key={panel.title} className="m-0 flex flex-col gap-2">
          <figcaption className="text-caption text-muted-foreground">{panel.title}</figcaption>
          <div className="h-64 w-96 max-w-full rounded-surface border border-border">
            <Artboard artboard={wideHeroDocument.artboard} fit="contain" className="h-full w-full">
              <LayerStack
                layers={wideHeroDocument.layers}
                fonts={wideHeroDocument.fonts}
                assets={wideHeroDocument.assets}
                excludeIds={panel.excludeIds}
              />
            </Artboard>
          </div>
        </figure>
      ))}
    </div>
  ),
};

export const CustomRenderLayer: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="h-[26rem] w-[42rem] max-w-full rounded-surface border border-border">
        <Artboard artboard={wideHeroDocument.artboard} fit="contain" className="h-full w-full">
          <LayerStack
            layers={wideHeroDocument.layers}
            fonts={wideHeroDocument.fonts}
            assets={wideHeroDocument.assets}
            renderLayer={(layer) => (
              <div className="flex h-full w-full items-center justify-center border border-dashed border-status-info bg-surface-floating/70 p-1 text-center text-caption text-foreground">
                <span className="truncate">
                  {layer.name} · {layer.kind}
                </span>
              </div>
            )}
          />
        </Artboard>
      </div>
    </div>
  ),
};

export const EmptyDocument: Story = {
  render: () => (
    <div className="flex min-h-screen flex-wrap items-start gap-6 bg-canvas p-6 text-foreground">
      <div className="h-64 w-64 rounded-surface border border-border">
        <Artboard artboard={emptyDocument.artboard} fit="contain" className="h-full w-full">
          <LayerStack
            layers={emptyDocument.layers}
            fonts={emptyDocument.fonts}
            assets={emptyDocument.assets}
          />
        </Artboard>
      </div>
      <div className="h-64 w-72 max-w-full">
        <LayerList layers={emptyDocument.layers} aria-label="Empty document layers" className="h-full" />
      </div>
    </div>
  ),
};
