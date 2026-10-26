import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup } from "./radio-group";

const meta = {
  title: "Form fields/Radio Group", id: "components-radio-group",
  component: RadioGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup label="Billing period" className="w-72">
      <RadioGroup.Item value="monthly" label="Monthly" />
      <RadioGroup.Item value="yearly" label="Yearly" />
      <RadioGroup.Item value="lifetime" label="Lifetime" />
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup label="Contact preference" orientation="horizontal" defaultValue="email">
      <RadioGroup.Item value="email" label="Email" />
      <RadioGroup.Item value="phone" label="Phone" />
      <RadioGroup.Item value="post" label="Post" />
    </RadioGroup>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <RadioGroup
      label="Billing period"
      description="You can change this later in account settings."
      defaultValue="yearly"
      className="w-80"
    >
      <RadioGroup.Item
        value="monthly"
        label="Monthly"
        description="Billed every month. Cancel at any time."
      />
      <RadioGroup.Item
        value="yearly"
        label="Yearly"
        description="Billed once a year at a lower monthly rate."
      />
    </RadioGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <RadioGroup
      label="Billing period"
      description="Choose the period that matches your invoice."
      error="Select a billing period to continue."
      className="w-80"
    >
      <RadioGroup.Item value="monthly" label="Monthly" />
      <RadioGroup.Item value="yearly" label="Yearly" />
    </RadioGroup>
  ),
};

export const DisabledGroup: Story = {
  render: () => (
    <RadioGroup label="Billing period" disabled defaultValue="yearly" className="w-72">
      <RadioGroup.Item value="monthly" label="Monthly" />
      <RadioGroup.Item value="yearly" label="Yearly" />
      <RadioGroup.Item value="lifetime" label="Lifetime" />
    </RadioGroup>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <RadioGroup label="Billing period" defaultValue="monthly" className="w-72">
      <RadioGroup.Item value="monthly" label="Monthly" />
      <RadioGroup.Item value="yearly" label="Yearly" disabled description="Not available on this plan." />
      <RadioGroup.Item value="lifetime" label="Lifetime" />
    </RadioGroup>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [period, setPeriod] = useState("monthly");
      return (
        <div className="flex flex-col gap-3">
          <RadioGroup
            label="Billing period"
            value={period}
            onValueChange={setPeriod}
            className="w-72"
          >
            <RadioGroup.Item value="monthly" label="Monthly" />
            <RadioGroup.Item value="yearly" label="Yearly" />
            <RadioGroup.Item value="lifetime" label="Lifetime" />
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Selected: <span data-testid="selected-value">{period}</span>
          </p>
        </div>
      );
    }
    return <Example />;
  },
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <RadioGroup
      label="請求サイクルと支払い方法の選択"
      description="選択内容はいつでもアカウント設定から変更できます。"
      defaultValue="monthly"
      className="w-80 max-w-full"
    >
      <RadioGroup.Item
        value="monthly"
        label="毎月の請求（クレジットカードまたは銀行振込）"
        description="毎月末日に自動で請求されます。解約は次回の請求日の前日まで可能です。"
      />
      <RadioGroup.Item
        value="yearly"
        label="年次請求 — Annual billing with a single invoice for the whole year"
        description="請求書は年末に一度だけ発行され、月額換算で割引が適用されます。"
      />
      <RadioGroup.Item
        value="purchase-order"
        label="Purchase order / 発注書によるお支払い（承認フローが必要な場合）"
        description="https://example.com/billing/purchase-orders/very-long-reference-path"
      />
    </RadioGroup>
  ),
};
