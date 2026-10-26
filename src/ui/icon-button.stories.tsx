import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "./icon-button";

const meta = {
  title: "Actions/Icon Button", id: "components-icon-button",
  component: IconButton,
  args: { "aria-label": "Add item", children: "+" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "subtle", "outline", "destructive"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full">
      <path d="m12 2 2.9 6.26 6.6.6-5 4.36 1.5 6.45L12 16.9 6 19.67l1.5-6.45-5-4.36 6.6-.6Z" />
    </svg>
  );
}

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Subtle: Story = { args: { variant: "subtle" } };

export const Outline: Story = { args: { variant: "outline" } };

export const Destructive: Story = { args: { variant: "destructive", "aria-label": "Delete" } };

export const Loading: Story = { args: { isLoading: true, loadingLabel: "Adding item" } };

export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = {
  args: { "aria-label": "Favourite", children: <StarIcon /> },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton size="sm" aria-label="Add item">
        +
      </IconButton>
      <IconButton size="md" aria-label="Add item">
        +
      </IconButton>
      <IconButton size="lg" aria-label="Add item">
        +
      </IconButton>
    </div>
  ),
};
