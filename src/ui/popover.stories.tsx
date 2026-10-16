import type { Meta, StoryObj } from "@storybook/react-vite";
import { Popover } from "./popover";
import { IconButton } from "./icon-button";
import { Button } from "./button";

const meta = {
  title: "Components/Popover",
  component: Popover,
  args: {
    content: "Anchored popover content.",
    children: <Button variant="outline">Open popover</Button>,
    side: "bottom",
    align: "center",
  },
  argTypes: {
    side: { control: "select", options: ["top", "center", "bottom"] },
    align: { control: "select", options: ["start", "center", "end"] },
    open: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6 p-24">
      <Popover side="top" content="Placed above the anchor">
        <Button variant="outline">Top</Button>
      </Popover>
      <Popover side="center" content="Centered on the anchor">
        <Button variant="outline">Center</Button>
      </Popover>
      <Popover side="bottom" content="Placed below the anchor">
        <Button variant="outline">Bottom</Button>
      </Popover>
    </div>
  ),
};

export const Alignment: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6 p-12">
      <Popover align="start" content="Aligned to the start edge">
        <Button variant="outline">Start</Button>
      </Popover>
      <Popover align="center" content="Centered">
        <Button variant="outline">Center</Button>
      </Popover>
      <Popover align="end" content="Aligned to the end edge">
        <Button variant="outline">End</Button>
      </Popover>
    </div>
  ),
};

export const HoverOpen: Story = {
  args: {
    delay: 150,
    content: "Opens on hover after a short delay.",
    children: <IconButton variant="outline" aria-label="More information" />,
  },
};

export const LongContent: Story = {
  args: {
    label: "Terms and conditions",
    content: (
      <div className="flex w-64 flex-col gap-2">
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index}>Scrollable line {index + 1}. Long content scrolls inside the popup.</p>
        ))}
      </div>
    ),
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
