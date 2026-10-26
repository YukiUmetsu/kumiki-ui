import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryboardCameraPage } from "./storyboard-camera";

const meta = { title: "Cameras/Camera Storyboard", id: "motion-camera-storyboard", component: StoryboardCameraPage, parameters: { layout: "fullscreen" } } satisfies Meta<typeof StoryboardCameraPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
