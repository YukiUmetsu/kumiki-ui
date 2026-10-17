import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaCompositionsPage } from "./media-compositions";

const meta = {
  title: "Pages/Media compositions",
  component: MediaCompositionsPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MediaCompositionsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: () => (
    <div className="mx-auto w-80">
      <MediaCompositionsPage />
    </div>
  ),
};
