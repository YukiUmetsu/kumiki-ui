import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox";

const meta = {
  title: "Form fields/Checkbox", id: "components-checkbox",
  component: Checkbox,
  args: { label: "Accept terms" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Indeterminate: Story = { args: { indeterminate: true, label: "Select all" } };

export const WithDescription: Story = {
  args: { label: "Email notifications", description: "We never share your address." },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true, label: "Disabled option" },
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
          label={checked ? "Checked" : "Unchecked"}
        />
      );
    }
    return <Example />;
  },
};
