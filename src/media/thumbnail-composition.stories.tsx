import type { Meta, StoryObj } from "@storybook/react-vite";
import { inspectThumbnail } from "../../registry/media/thumbnail-preflight";
import { ExportPreview } from "./export-preview";
import { thumbnailShowcaseCases } from "./thumbnail-fixtures";

function ThumbnailCase({ id }: { id: string }) {
  const entry = thumbnailShowcaseCases.find((candidate) => candidate.id === id);
  if (!entry) return <p role="alert">Unknown thumbnail example: {id}</p>;
  const issues = inspectThumbnail(entry.result, { availableFontFamilies: ["Geist Variable"] });
  const risks = issues.filter((issue) => issue.code.startsWith("thumbnail-"));
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">{entry.label}</h2>
        <p className="text-sm text-muted-foreground">
          {entry.imageKind === "generated-placeholder"
            ? "Layout reference with generated abstract imagery. Replace with a reviewed focal asset before publication."
            : "Built from Kumiki's actual HouseSection2D technical cutaway assets. Not a photorealistic hero render."}
        </p>
        {risks.length > 0 ? <p role="status" className="text-sm text-muted-foreground">
          {risks.length} thumbnail-specific composition advisory{risks.length === 1 ? "" : "ies"} below the exported image.
        </p> : null}
      </header>
      <ExportPreview document={entry.result.document} availableFontFamilies={["Geist Variable"]}
        inspectionSizes={[320, 160, 96]} titleAs="h3" />
      {risks.length ? <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
        {risks.map((issue, index) => <li key={`${issue.code}-${issue.layerId ?? index}`}>{issue.message}</li>)}
      </ul> : null}
    </section>
  );
}

function ThumbnailGallery({ group }: { group: "recipe" | "educational-demo" }) {
  return <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
    {thumbnailShowcaseCases.filter((entry) => entry.group === group)
      .map((entry) => <ThumbnailCase key={entry.id} id={entry.id} />)}
  </div>;
}

const meta = {
  title: "Media/Thumbnail Compositions",
  component: ThumbnailCase,
  parameters: { layout: "fullscreen" },
  args: { id: "hero" },
} satisfies Meta<typeof ThumbnailCase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeroFact: Story = { args: { id: "hero" } };
export const Comparison: Story = { args: { id: "compare" } };
export const HiddenMechanism: Story = { args: { id: "mechanism" } };
export const BeforeAfter: Story = { args: { id: "states" } };
export const ScaleSurprise: Story = { args: { id: "magnitude" } };
export const RoofCutaway: Story = { args: { id: "roof-layers" } };
export const HouseComparison: Story = { args: { id: "house-comparison" } };
export const HouseSystems: Story = { args: { id: "house-systems" } };

export const FiveRecipes: Story = { render: () => <ThumbnailGallery group="recipe" /> };
export const EducationalExamples: Story = { render: () => <ThumbnailGallery group="educational-demo" /> };
