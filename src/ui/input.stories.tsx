import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, Input } from "./input";

const meta = {
  // Distinct title (and id) from field-input.stories.tsx so both files can
  // coexist: Storybook derives story ids from title + export name, so two
  // files sharing "Components/Field" collide. Per-story `id` props are not
  // part of CSF — only the meta accepts `id`.
  title: "Components/Input",
  id: "components-input",
  component: Field,
  args: { label: "Email" },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "you@example.com" } };

export const WithHint: Story = {
  args: { hint: "We never share your address.", placeholder: "you@example.com" },
};

export const WithError: Story = {
  args: { error: "Email is required.", defaultValue: "" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "readonly@example.com" },
};

export const LongCJKValue: Story = {
  args: { label: "名前", defaultValue: "山田太郎・非常に長い名前のテスト用の値" },
};

export const BareInput: Story = {
  render: () => <Input aria-label="Bare input" placeholder="Bare input" />,
};
