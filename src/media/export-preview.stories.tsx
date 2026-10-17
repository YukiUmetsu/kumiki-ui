import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExportPreview } from "./export-preview";
import {
  danglingReferenceDocument,
  emptyDocument,
  multilingualDocument,
  wideHeroDocument,
} from "./fixtures";

const meta = {
  title: "Media/ExportPreview",
  component: ExportPreview,
  parameters: { layout: "padded" },
  args: { document: wideHeroDocument },
} satisfies Meta<typeof ExportPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CleanExport: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ExportPreview document={wideHeroDocument} />
    </div>
  ),
};

export const UnpinnedFontWarning: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ExportPreview document={multilingualDocument} />
    </div>
  ),
};

export const BlockingErrors: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ExportPreview document={danglingReferenceDocument} />
    </div>
  ),
};

export const EmptyDocument: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ExportPreview document={emptyDocument} />
    </div>
  ),
};

export const WidenedInspection: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ExportPreview document={wideHeroDocument} inspectionSizes={[960, 640, 480, 320, 160, 96]} />
    </div>
  ),
};
