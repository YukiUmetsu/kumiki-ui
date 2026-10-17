import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Badge" },
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "info", "success", "warning", "danger"],
    },
    size: { control: "select", options: ["sm", "md"] },
    dot: { control: "boolean" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Neutral: Story = { args: { variant: "neutral", children: "Draft" } };

export const Info: Story = { args: { variant: "info", children: "In review" } };

export const Success: Story = { args: { variant: "success", children: "Published" } };

export const Warning: Story = { args: { variant: "warning", children: "Expiring soon" } };

export const Danger: Story = { args: { variant: "danger", children: "Failed" } };

export const WithDot: Story = {
  args: { variant: "success", dot: true, children: "Active" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge size="sm" variant="info">
        Small
      </Badge>
      <Badge size="md" variant="info">
        Medium
      </Badge>
    </div>
  ),
};

export const StatusVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="neutral">Unknown</Badge>
      <Badge variant="info">Information</Badge>
      <Badge variant="success">Completed</Badge>
      <Badge variant="warning">Needs review</Badge>
      <Badge variant="danger">Unavailable</Badge>
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col items-start gap-2">
      <Badge variant="warning" className="max-w-full">
        アップロードに失敗しました。もう一度お試しください
      </Badge>
      <Badge variant="info" dot className="max-w-full">
        https://example.com/workspaces/9f2c/reports/quarterly-summary?period=2026-q3
      </Badge>
    </div>
  ),
};
