import type { Meta, StoryObj } from "@storybook/react-vite";
import { InfographicGalleryPage } from "./infographic-gallery";

const meta = {
  title: "Pages/Infographic gallery",
  component: InfographicGalleryPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof InfographicGalleryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: () => (
    <div className="mx-auto w-80">
      <InfographicGalleryPage />
    </div>
  ),
};
