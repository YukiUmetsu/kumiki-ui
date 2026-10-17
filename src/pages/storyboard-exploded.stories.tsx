import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryboardExplodedPage } from "./storyboard-exploded";

const meta = { title: "Motion/Exploded Assembly", component: StoryboardExplodedPage, parameters: { layout: "fullscreen" } } satisfies Meta<typeof StoryboardExplodedPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
