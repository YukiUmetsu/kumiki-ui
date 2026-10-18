import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppPatternsPage } from "./app-patterns";

const meta = {
  title: "Pages/App Patterns",
  component: AppPatternsPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppPatternsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
