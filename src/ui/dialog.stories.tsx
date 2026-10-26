import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "./dialog";
import { Button } from "./button";

const meta = {
  title: "Overlays and notifications/Dialog", id: "components-dialog",
  component: Dialog,
  args: {
    open: true,
    title: "Confirm action",
    description: "This action cannot be undone.",
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    placement: { control: "select", options: ["top", "center", "bottom"] },
    open: { control: "boolean" },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <p>Dialog body content.</p>,
  },
};

export const WithActions: Story = {
  args: {
    children: (
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    ),
  },
};

export const LongContent: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 40 }, (_, index) => (
          <p key={index}>Scrollable line {index + 1}</p>
        ))}
      </div>
    ),
  },
};
