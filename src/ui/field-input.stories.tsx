import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, Input } from "./field-input";

const meta = {
  title: "Form fields/Field",
  // Component id is derived from the title, but pinning it keeps permalinks
  // stable if the title is ever reworded. `id` is only valid on the meta
  // (ComponentAnnotations); per-story `id` props are not part of CSF.
  id: "components-field",
  component: Field,
  args: { label: "Email" },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "Email" } };
export const WithHint: Story = { args: { hint: "We never share your address.", placeholder: "you@example.com" } };
export const WithError: Story = { args: { error: "Email is required.", defaultValue: "" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "apple@example.com" } };
export const AutoResize: Story = { args: { autoResize: true, defaultValue: "Grows with its value", containerClassName: "w-fit" } };
export const Disabled2: Story = { args: { disabled: true, defaultValue: "readonly@example.com" } };
export const LongCJKValue: Story = { args: { label: "名前", defaultValue: "山田太郎・非常に長い名前のテスト用の値" } };
export const BareInput: Story = { render: () => <Input aria-label="Bare input" placeholder="Bare input" /> };
