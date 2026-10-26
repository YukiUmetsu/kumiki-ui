import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Combobox } from "./combobox";
import type { ComboboxMultipleProps, ComboboxOption } from "./combobox";

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragon fruit" },
  { value: "elderberry", label: "Elderberry" },
  { value: "fig", label: "Fig" },
  { value: "grape", label: "Grape" },
  { value: "kiwi", label: "Kiwi" },
  { value: "lemon", label: "Lemon" },
  { value: "mango", label: "Mango" },
];

const grouped: ComboboxOption[] = [
  { value: "apple", label: "Apple", group: "Orchard fruit" },
  { value: "pear", label: "Pear", group: "Orchard fruit" },
  { value: "cherry", label: "Cherry", group: "Stone fruit" },
  { value: "plum", label: "Plum", group: "Stone fruit" },
  { value: "lemon", label: "Lemon", group: "Citrus" },
  { value: "lime", label: "Lime", group: "Citrus" },
];

const languages: ComboboxOption[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "ruby", label: "Ruby" },
];

const meta = {
  title: "Form fields/Combobox", id: "components-combobox",
  component: Combobox,
  parameters: { layout: "centered" },
  args: {
    options: fruits,
    placeholder: "Search fruit",
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { "aria-label": "Fruit" },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  args: { label: "Fruit" },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const Multiple: Story = {
  args: {
    label: "Languages",
    options: languages,
    placeholder: "Add a language",
  },
  render: (args) => (
    <div className="w-96">
      <Combobox
        {...(args as ComboboxMultipleProps)}
        multiple
        defaultValue={["typescript", "rust"]}
      />
    </div>
  ),
};

export const WithGroups: Story = {
  args: {
    label: "Produce",
    options: grouped,
    placeholder: "Search produce",
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const WithDisabledOption: Story = {
  args: {
    label: "Fruit",
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana", description: "Temporarily unavailable", disabled: true },
      { value: "cherry", label: "Cherry" },
      { value: "dragonfruit", label: "Dragon fruit" },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    label: "Assignee",
    options: [],
    loading: true,
    placeholder: "Search people",
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const EmptyResult: Story = {
  args: {
    label: "Fruit",
    options: [],
    emptyMessage: "No matching options",
    placeholder: "Search fruit",
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [value, setValue] = useState<string | null>("cherry");
      return (
        <div className="flex w-80 flex-col items-start gap-2">
          <span
            data-testid="combobox-value"
            className="text-sm text-muted-foreground"
          >
            Selected: {value ?? "none"}
          </span>
          <Combobox
            label="Fruit"
            options={fruits}
            placeholder="Search fruit"
            value={value}
            onValueChange={setValue}
          />
        </div>
      );
    }
    return <Example />;
  },
};

export const ManyOptions: Story = {
  args: {
    label: "Item",
    options: Array.from({ length: 40 }, (_, index) => ({
      value: `item-${index + 1}`,
      label: `Item ${index + 1}`,
    })),
    placeholder: "Search items",
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "配送方法の選択",
    placeholder: "配送方法を検索",
    options: [
      {
        value: "standard",
        label: "Standard delivery within five business days",
        description: "Includes tracking for every destination",
      },
      {
        value: "express",
        label: "翌日配送（午前中指定可能・離島を除く）",
        description: "追加料金が発生します",
      },
      {
        value: "international",
        label: "https://example.com/shipping/restricted-destinations-and-customs",
      },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <Combobox {...args} />
    </div>
  ),
};
