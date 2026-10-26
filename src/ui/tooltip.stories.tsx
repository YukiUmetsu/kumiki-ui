import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip, TooltipProvider } from "./tooltip";
import { IconButton } from "./icon-button";

const meta = {
  title: "Overlays and notifications/Tooltip", id: "components-tooltip",
  component: Tooltip,
  args: {
    content: "Add an item to the list",
    children: <IconButton aria-label="Add item">+</IconButton>,
  },
  argTypes: {
    side: { control: "select", options: ["top", "right", "bottom", "left"] },
    align: { control: "select", options: ["start", "center", "end"] },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6 p-12">
      <Tooltip side="top" content="Top">
        <IconButton variant="outline" aria-label="Top">
          ↑
        </IconButton>
      </Tooltip>
      <Tooltip side="right" content="Right">
        <IconButton variant="outline" aria-label="Right">
          →
        </IconButton>
      </Tooltip>
      <Tooltip side="bottom" content="Bottom">
        <IconButton variant="outline" aria-label="Bottom">
          ↓
        </IconButton>
      </Tooltip>
      <Tooltip side="left" content="Left">
        <IconButton variant="outline" aria-label="Left">
          ←
        </IconButton>
      </Tooltip>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    content: "Save the current draft and keep editing. This action can be undone.",
    children: <IconButton variant="secondary" aria-label="Save draft" />,
  },
};

export const Grouped: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip content="Bold">
          <IconButton variant="outline" aria-label="Bold">
            B
          </IconButton>
        </Tooltip>
        <Tooltip content="Italic">
          <IconButton variant="outline" aria-label="Italic">
            I
          </IconButton>
        </Tooltip>
        <Tooltip content="Underline">
          <IconButton variant="outline" aria-label="Underline">
            U
          </IconButton>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};
