import type { Meta, StoryObj } from "@storybook/react-vite";
import { MotionDirectorDemo } from "./director-demo";
import { lazy, Suspense } from "react";

const SpatialDemo = lazy(() => import("./director-3d-demo").then(module => ({ default: module.Director3DDemo })));

const meta = { title: "Motion/Motion Director", component: MotionDirectorDemo,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="min-h-screen bg-canvas"><Story /></div>],
} satisfies Meta<typeof MotionDirectorDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReferenceProduction: Story = {};
export const Opening: Story = { args: { initialFrame: 45 } };
export const SequentialFlow: Story = { args: { initialFrame: 365 } };
export const DiagramConstruction: Story = { args: { initialFrame: 650 } };
export const ConcurrentGroups: Story = { args: { initialFrame: 920 } };
export const VisualContinuity: Story = { args: { initialFrame: 1050 } };
export const CinematicReveal: Story = { args: { initialFrame: 1190 } };
export const Portrait: Story = { args: { initialAspect: "portrait", initialFrame: 365 } };
export const AlternativeTheme: Story = { args: { initialTheme: "theme-b", initialFrame: 1190 } };
export const ReducedMotion: Story = { args: { reducedMotion: true } };
export const Optional3DAdapter: Story = { render: () => <Suspense fallback={<p className="p-6 text-body">Loading optional 3D preview…</p>}><SpatialDemo /></Suspense> };
