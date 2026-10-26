import type { Meta, StoryObj } from "@storybook/react-vite";
import { VisualTransformationDemo } from "./visual-transformation-demo";

const meta = {
  title: "Motion engine/Visual Transformation", id: "motion-visual-transformation",
  component: VisualTransformationDemo,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="min-h-screen bg-canvas p-6 text-foreground"><Story /></div>],
} satisfies Meta<typeof VisualTransformationDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReferenceFilm: Story = {};
export const Portrait: Story = { args: { initialAspect: "portrait", initialFrame: 720 } };
export const AlternativeTheme: Story = { args: { initialTheme: "theme-b", initialFrame: 870 } };
export const GeometricMorph: Story = { args: { initialFrame: 120 } };
export const MaskReveal: Story = { args: { initialShapeStrategy: "mask-reveal", initialFrame: 120 } };
export const ParticleTransport: Story = { args: { initialShapeStrategy: "particle-handoff", initialFrame: 120 } };
export const DiagramHandoff: Story = { args: { initialFrame: 270 } };
export const DiagramToEquation: Story = { args: { initialFrame: 420 } };
export const EquationToCode: Story = { args: { initialFrame: 570 } };
export const SharedScene: Story = { args: { initialFrame: 720 } };
export const Disassembly: Story = { args: { initialFrame: 870 } };
export const LayoutRearrangement: Story = { args: { initialFrame: 1020 } };
export const ReducedMotion: Story = { args: { reducedMotion: true } };
