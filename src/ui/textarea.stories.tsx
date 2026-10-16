import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextareaField } from "./textarea";

const meta = {
  title: "Components/Textarea",
  component: TextareaField,
  args: { label: "Message" },
} satisfies Meta<typeof TextareaField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Write a message…" },
};

export const WithHint: Story = {
  args: { hint: "Markdown is supported.", placeholder: "Write a message…" },
};

export const WithError: Story = {
  args: { error: "A message is required.", defaultValue: "" },
};

export const AutoResize: Story = {
  args: { autoResize: true, minRows: 2, maxRows: 6, placeholder: "Grows as you type" },
};

export const WithLimit: Story = {
  args: { maxLength: 120, hint: "Keep it short.", defaultValue: "" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Read only" },
};

export const LongCJKValue: Story = {
  args: { label: "メッセージ", defaultValue: "非常に長い日本語のテキストをここに入力して折り返しを確認します。" },
};
