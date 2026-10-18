import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  ART_DIRECTIONS,
  buildInfographicPages,
  InfographicView,
  type ArtDirectionId,
} from "../infographic";
import { GALLERY_ART_DIRECTIONS, LINKEDIN_CAROUSEL } from "../infographic/fixtures";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographic/Art directions",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="Infographic preview — scroll horizontally to pan"
      className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[320px]">{children}</div>
    </div>
  );
}

function ArtDirectionCard({ artDirection }: { artDirection: ArtDirectionId }) {
  const pages = useMemo(
    () =>
      buildInfographicPages(LINKEDIN_CAROUSEL, {
        artDirection,
        profile: "social-portrait",
      }),
    [artDirection]
  );

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-serif text-subheading font-normal tracking-subheading text-foreground break-words">
          {ART_DIRECTIONS[artDirection].name}
        </h2>
        <p className="max-w-prose text-body-sm text-muted-foreground">
          Same source and output profile, different visual recipe.
        </p>
        <span className="w-fit rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </span>
      </div>
      <Surface>
        <div className="flex min-w-0 flex-col gap-4">
          {pages.map((layout, index) => (
            <div
              key={`${artDirection}-page-${index + 1}`}
              className="flex min-w-0 flex-col gap-2"
            >
              {pages.length > 1 ? (
                <p className="text-caption text-muted-foreground">
                  Page {index + 1} of {pages.length}
                </p>
              ) : null}
              <Preview>
                <InfographicView layout={layout} fit="contain" />
              </Preview>
            </div>
          ))}
        </div>
      </Surface>
    </section>
  );
}

export const Gallery: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex min-w-0 flex-col gap-1">
          <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
            Art directions
          </h1>
          <p className="max-w-prose text-body text-muted-foreground">
            The same source through every art direction. Only the visual recipe
            changes; the facts and their structure stay the same.
          </p>
        </header>
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min">
          {GALLERY_ART_DIRECTIONS.map((artDirection) => (
            <ArtDirectionCard key={artDirection} artDirection={artDirection} />
          ))}
        </div>
      </div>
    </div>
  ),
};
