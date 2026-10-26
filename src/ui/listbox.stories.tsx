import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Listbox } from "./listbox";
import type { ListboxOption } from "./listbox";

const fruits: ListboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragon fruit" },
  { value: "elderberry", label: "Elderberry" },
];

const grouped: ListboxOption[] = [
  { value: "apple", label: "Apple", group: "Orchard fruit" },
  { value: "pear", label: "Pear", group: "Orchard fruit" },
  { value: "cherry", label: "Cherry", group: "Stone fruit" },
  { value: "plum", label: "Plum", group: "Stone fruit" },
  { value: "lemon", label: "Lemon", group: "Citrus" },
  { value: "lime", label: "Lime", group: "Citrus" },
];

const meta = {
  title: "Form fields/Listbox", id: "components-listbox",
  component: Listbox,
  parameters: { layout: "centered" },
  args: {
    label: "Fruit",
    options: fruits,
  },
} satisfies Meta<typeof Listbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const Multiple: Story = {
  args: {
    label: "Fruit for the basket",
    selectionMode: "multiple",
    defaultValue: ["apple", "cherry"],
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const WithGroups: Story = {
  args: {
    label: "Fruit by family",
    options: grouped,
    selectionMode: "multiple",
    defaultValue: ["cherry"],
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const WithDisabledOption: Story = {
  args: {
    label: "Fruit",
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana", disabled: true },
      { value: "cherry", label: "Cherry" },
      { value: "dragonfruit", label: "Dragon fruit" },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const WithDescription: Story = {
  args: {
    label: "Delivery speed",
    options: [
      {
        value: "standard",
        label: "Standard",
        description: "Arrives in three to five business days.",
      },
      {
        value: "express",
        label: "Express",
        description: "Arrives the next business day before noon.",
      },
      {
        value: "pickup",
        label: "Collect in store",
        description: "Ready within two hours at the nearest location.",
      },
    ],
    defaultValue: "express",
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: "Fruit",
    disabled: true,
    defaultValue: "apple",
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "配送方法の選択",
    options: [
      {
        value: "standard",
        label: "Standard delivery within five business days",
        description: "Available for every destination in the domestic network.",
        group: "国内配送",
      },
      {
        value: "express",
        label: "翌日配送（午前中指定可能）",
        description: "午前中の時間帯を指定できます。",
        group: "国内配送",
      },
      {
        value: "international",
        label: "https://example.com/shipping/restricted-destinations-and-customs",
        description: "International shipping is subject to customs review.",
        group: "International",
      },
    ],
    defaultValue: "express",
  },
  render: (args) => (
    <div className="w-80">
      <Listbox {...args} />
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [value, setValue] = useState<string | null>("banana");
      return (
        <div className="flex w-80 flex-col items-start gap-2">
          <span data-testid="listbox-value" className="text-sm text-muted-foreground">
            Selected: {value ?? "none"}
          </span>
          <Listbox
            label="Fruit"
            options={fruits}
            value={value}
            onValueChange={setValue}
          />
        </div>
      );
    }
    return <Example />;
  },
};
