import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./slider";

const meta = {
  title: "Form fields/Slider", id: "components-slider",
  component: Slider,
  args: {
    label: "Volume",
    defaultValue: 40,
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Range: Story = {
  args: {
    label: "Range",
    defaultValue: [20, 80],
    showValue: true,
  },
};

export const WithStep: Story = {
  args: {
    label: "Opacity",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
    showValue: true,
    formatValue: (value) => `${Math.round(value * 100)}%`,
  },
};

export const WithLabelAndValue: Story = {
  args: {
    label: "Volume",
    defaultValue: 40,
    showValue: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Volume",
    defaultValue: 40,
    showValue: true,
    disabled: true,
  },
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [value, setValue] = useState(35);
      return (
        <div className="flex max-w-sm flex-col gap-2">
          <Slider
            label="Volume"
            value={value}
            onValueChange={(next) => {
              if (typeof next === "number") setValue(next);
            }}
            showValue
          />
          <span data-testid="slider-value" className="text-sm text-muted-foreground">
            {value}
          </span>
        </div>
      );
    }
    return <Example />;
  },
};

export const Vertical: Story = {
  args: {
    label: "Volume",
    defaultValue: 40,
    orientation: "vertical",
    showValue: true,
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "許容するファイルサイズの上限を設定してください",
    min: 0,
    max: 2000,
    step: 50,
    defaultValue: 750,
    showValue: true,
    formatValue: (value) =>
      `${value.toLocaleString("ja-JP")} メガバイト（1日の上限）`,
  },
};
