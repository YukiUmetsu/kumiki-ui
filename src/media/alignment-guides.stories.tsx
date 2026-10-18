import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { MeasurementTarget } from "./alignment-guides";
import { AlignmentGuides } from "./alignment-guides";
import { Artboard } from "./artboard";
import { LayerStack } from "./layer-stack";
import type { SnapHit } from "./document";
import { applySnap, snapTargets } from "./document";
import { wideHeroDocument } from "./fixtures";

const meta = {
  title: "Media/Alignment Guides",
  component: AlignmentGuides,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AlignmentGuides>;

export default meta;
type Story = StoryObj<typeof meta>;

const targets = snapTargets(
  wideHeroDocument.layers,
  wideHeroDocument.artboard,
  wideHeroDocument.guides
);

/**
 * A moving box nudged just off the `guide-x-margin`/`guide-y-baseline` lines, so
 * `applySnap` reports real hits to highlight rather than an empty overlay. Pure
 * and computed once — the same call the drag handler would make per frame.
 */
const activeSnaps: SnapHit[] = applySnap({ x: 78, y: 94, width: 96, height: 88 }, targets, {
  threshold: 8,
}).hits;

const measurements: MeasurementTarget[] = [
  {
    id: "heading",
    rect: { x: 80, y: 168, width: 520, height: 220 },
    label: "Heading · 520 × 220",
  },
  {
    id: "visual",
    rect: { x: 640, y: 0, width: 640, height: 720 },
    label: "Visual · 640 × 720",
  },
];

function HeroArtboard({
  className,
  fit,
  children,
}: {
  className: string;
  fit?: "contain";
  children: ReactNode;
}) {
  return (
    <Artboard
      artboard={wideHeroDocument.artboard}
      guides={wideHeroDocument.guides}
      grid={wideHeroDocument.grid}
      fit={fit}
      className={className}
    >
      <LayerStack
        layers={wideHeroDocument.layers}
        fonts={wideHeroDocument.fonts}
        assets={wideHeroDocument.assets}
      />
      {children}
    </Artboard>
  );
}

export const Overlays: Story = {
  render: () => (
    <div className="flex h-screen w-full flex-col gap-2 bg-canvas p-4 text-foreground">
      <h1 className="text-body-sm font-medium">wide-hero · every authoring overlay</h1>
      <div className="min-h-0 flex-1">
        <HeroArtboard className="h-full w-full">
          <AlignmentGuides
            showGuides
            showGrid
            showSafeRegion
            showCenterAxes
            measurements={measurements}
            activeSnaps={activeSnaps}
          />
        </HeroArtboard>
      </div>
    </div>
  ),
};

export const Hidden: Story = {
  render: () => (
    <div className="flex h-screen w-full flex-col gap-2 bg-canvas p-4 text-foreground">
      <h1 className="text-body-sm font-medium">visible=false · the overlay is not mounted</h1>
      <div className="min-h-0 flex-1">
        <HeroArtboard className="h-full w-full">
          <AlignmentGuides visible={false} showGuides showGrid showSafeRegion showCenterAxes />
        </HeroArtboard>
      </div>
    </div>
  ),
};

export const BelowMinimumScale: Story = {
  render: () => (
    <div className="flex h-screen w-full flex-col gap-2 bg-canvas p-4 text-foreground">
      <h1 className="text-body-sm font-medium">
        scale below minimumScale · the overlay is suppressed rather than turning into noise
      </h1>
      <div className="h-72 w-[24rem] max-w-full rounded-surface border border-border">
        <HeroArtboard className="h-full w-full" fit="contain">
          <AlignmentGuides showGuides showGrid showSafeRegion showCenterAxes minimumScale={0.5} />
        </HeroArtboard>
      </div>
    </div>
  ),
};
