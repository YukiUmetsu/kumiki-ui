import type { Meta, StoryObj } from "@storybook/react-vite";
import { inspectThumbnail } from "../../registry/media/thumbnail-preflight";
import { ExportPreview } from "./export-preview";
import { thumbnailShowcaseCases } from "./thumbnail-fixtures";
import { editorialShowcaseCases } from "./thumbnail-editorial-fixtures";

const showcase = [...thumbnailShowcaseCases, ...editorialShowcaseCases];

function ThumbnailCase({ id }: { id: string }) {
  const entry = showcase.find((candidate) => candidate.id === id);
  if (!entry) return <p role="alert">Unknown thumbnail example: {id}</p>;
  const issues = inspectThumbnail(entry.result, {
    ...("inspection" in entry ? entry.inspection : {}),
    availableFontFamilies: ["Geist Variable", "Arial"],
  });
  const risks = issues.filter((issue) => issue.code.startsWith("thumbnail-"));
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">{entry.label}</h2>
        <p className="text-sm text-muted-foreground">
          {entry.imageKind === "generated-placeholder"
            ? "Layout reference with generated abstract imagery. Replace with a reviewed focal asset before publication."
            : entry.imageKind === "home-cutaway-2d"
              ? "Built from Kumiki's HouseSection2D technical cutaway assets, not photorealistic imagery."
              : "Photographic source layers are AI-generated without baked typography. The background, subjects and text remain independently editable."}
        </p>
        {risks.length > 0 ? <p role="status" className="text-sm text-muted-foreground">
          {risks.length} thumbnail-specific composition advisory{risks.length === 1 ? "" : "ies"} below the exported image.
        </p> : null}
      </header>
      <ExportPreview document={entry.result.document} availableFontFamilies={["Geist Variable", "Arial"]}
        inspectionSizes={[320, 160, 96]} titleAs="h3" />
      {risks.length ? <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
        {risks.map((issue, index) => <li key={`${issue.code}-${issue.layerId ?? index}`}>{issue.message}</li>)}
      </ul> : null}
    </section>
  );
}

function ThumbnailGallery({ group }: { group: "recipe" | "educational-demo" | "editorial-demo" }) {
  return <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
    {showcase.filter((entry) => entry.group === group)
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
export const HouseMathRealCost: Story = { args: { id: "house-cost-editorial" } };
export const HouseMathHvac: Story = { args: { id: "hvac-editorial" } };
export const HouseMathRentVsBuy: Story = { args: { id: "rent-buy-editorial" } };

export const FiveRecipes: Story = { render: () => <ThumbnailGallery group="recipe" /> };
export const EducationalExamples: Story = { render: () => <ThumbnailGallery group="educational-demo" /> };
export const HouseMathEditorialExamples: Story = { render: () => <ThumbnailGallery group="editorial-demo" /> };
