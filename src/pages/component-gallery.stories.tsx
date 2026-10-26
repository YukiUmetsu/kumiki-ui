import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentGalleryPage } from "./component-gallery";
import { ToastProvider } from "../ui/toast";

const meta = {
  title: "Showcases/Component gallery", id: "pages-component-gallery",
  component: ComponentGalleryPage,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ToastProvider position="top-end" timeout={5000}>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ComponentGalleryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
