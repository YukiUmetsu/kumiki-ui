import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Button" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "subtle", "destructive", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Subtle: Story = { args: { variant: "subtle" } };

export const Outline: Story = { args: { variant: "outline" } };

export const Destructive: Story = { args: { variant: "destructive", children: "Delete" } };

export const Loading: Story = { args: { isLoading: true, loadingLabel: "Saving…" } };

export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const IconOnly: Story = {
  args: { size: "icon", children: "+", "aria-label": "Add item" },
};
