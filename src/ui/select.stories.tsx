import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./select";
import type { SelectOption, SelectSearchInputRenderProps } from "./select";

const fruits: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragon fruit" },
  { value: "elderberry", label: "Elderberry" },
];

const meta = {
  title: "Components/Select",
  component: Select,
  args: {
    label: "Fruit",
    options: fruits,
    placeholder: "Select a fruit",
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: "cherry" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "apple" },
};

export const WithDisabledOption: Story = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana", disabled: true },
      { value: "cherry", label: "Cherry" },
    ],
  },
};

export const Searchable: Story = {
  args: {
    searchable: true,
    searchPlaceholder: "Filter fruit…",
    options: [
      ...fruits,
      { value: "fig", label: "Fig" },
      { value: "grape", label: "Grape" },
      { value: "kiwi", label: "Kiwi" },
      { value: "lemon", label: "Lemon" },
    ],
  },
};

export const CustomSearchInput: Story = {
  args: {
    searchable: true,
    options: fruits,
    searchInput: (props: SelectSearchInputRenderProps) => (
      <input
        id={props.id}
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        aria-label={props["aria-label"]}
        autoComplete="off"
        onChange={(event) => props.onValueChange(event.target.value)}
        className="mb-1 w-full rounded-control border border-input bg-surface px-2 py-1.5 text-[length:var(--km-type-size-sm)] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    ),
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "配送方法の選択",
    options: [
      { value: "standard", label: "Standard delivery within five business days" },
      { value: "express", label: "翌日配送（午前中指定可能）" },
      {
        value: "international",
        label: "https://example.com/shipping/restricted-destinations-and-customs",
      },
    ],
  },
};

export const ManyOptions: Story = {
  args: {
    searchable: true,
    searchPlaceholder: "Filter fruit…",
    options: Array.from({ length: 30 }, (_, index) => ({
      value: `item-${index + 1}`,
      label: `Item ${index + 1}`,
    })),
  },
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [value, setValue] = useState<string | null>("banana");
      return (
        <div className="flex flex-col items-start gap-2">
          <span className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
            Selected: {value ?? "none"}
          </span>
          <Select
            label="Fruit"
            options={fruits}
            placeholder="Select a fruit"
            value={value}
            onValueChange={setValue}
          />
        </div>
      );
    }
    return <Example />;
  },
};
