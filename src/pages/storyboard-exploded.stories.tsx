import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryboardExplodedPage } from "./storyboard-exploded";

const meta = { title: "Asset motion and states/Exploded Assembly", id: "motion-exploded-assembly", component: StoryboardExplodedPage, parameters: { layout: "fullscreen" } } satisfies Meta<typeof StoryboardExplodedPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
