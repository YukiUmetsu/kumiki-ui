import type { Meta, StoryObj } from "@storybook/react-vite";
import { MotionGalleryPage } from "./motion-gallery";

const meta = {
  title: "Showcases/Motion gallery", id: "pages-motion-gallery",
  component: MotionGalleryPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MotionGalleryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: () => (
    <div className="mx-auto w-80">
      <MotionGalleryPage />
    </div>
  ),
};
