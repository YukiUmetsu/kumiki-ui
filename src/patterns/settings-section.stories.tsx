import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsSection } from "./settings-section";
import type { SettingsField, SettingsSectionProps } from "./settings-section";

const baseFields: SettingsField[] = [
  {
    id: "displayName",
    label: "Display name",
    type: "text",
    description: "This is how you appear to others.",
    placeholder: "Your name",
    required: true,
  },
  {
    id: "language",
    label: "Language",
    type: "select",
    placeholder: "Choose a language",
    options: [
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
      { value: "es", label: "Español" },
    ],
  },
  {
    id: "timezone",
    label: "Timezone",
    type: "select",
    options: [
      { value: "utc", label: "UTC" },
      { value: "jst", label: "Japan Standard Time" },
      { value: "est", label: "Eastern Time" },
    ],
  },
  {
    id: "emailDigest",
    label: "Email digest",
    type: "switch",
    description: "A weekly summary of activity.",
  },
  {
    id: "showStatus",
    label: "Show online status",
    type: "checkbox",
    description: "Let others see when you are active.",
  },
];

const baseValues: Record<string, unknown> = {
  displayName: "Alex Morgan",
  language: "en",
  timezone: "utc",
  emailDigest: true,
  showStatus: false,
};

type DemoProps = Omit<SettingsSectionProps, "values" | "onChange" | "onSave" | "onReset"> & {
  initialValues?: Record<string, unknown>;
  /** Resolve or reject the save to exercise the pending/saved/error states. */
  save?: (values: Record<string, unknown>) => Promise<void> | void;
};

/**
 * Controlled harness: the pattern is fully controlled, so the story owns the
 * value state and the save lifecycle the same way a consumer would.
 */
function SettingsDemo({ initialValues = baseValues, save, ...rest }: DemoProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  return (
    <div className="w-[36rem] max-w-full p-4">
      <SettingsSection
        {...rest}
        values={values}
        onChange={(next) => setValues(next)}
        onSave={save ?? (() => {})}
        onReset={() => setValues(initialValues)}
      />
    </div>
  );
}

const meta = {
  title: "Patterns/Settings Section",
  component: SettingsSection,
  parameters: { layout: "centered" },
  args: {
    title: "Workspace settings",
    description: "Manage the preferences for this workspace.",
    fields: baseFields,
  },
  render: (args) => <SettingsDemo {...args} />,
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<DemoProps>;

export const Default: Story = {};

export const Pending: Story = {
  args: { pending: true },
};

export const Saved: Story = {
  args: {
    save: () => new Promise((resolve) => window.setTimeout(resolve, 600)),
  },
  render: (args) => <SettingsDemo {...args} />,
};

export const WithValidationErrors: Story = {
  args: {
    errors: {
      displayName: "Display name is required.",
      language: "Choose a language.",
    },
  },
};

export const WithSectionError: Story = {
  args: {
    error: "The server rejected the request. Your changes are still here.",
    save: () => Promise.reject(new Error("network")),
  },
  render: (args) => <SettingsDemo {...args} />,
};

export const Empty: Story = {
  args: { fields: [], initialValues: {} },
};

export const LongAndLocalizedText: Story = {
  args: {
    title: "ワークスペースの設定",
    description:
      "このワークスペースの設定を管理します。変更内容は保存されるまで反映されません。",
    fields: [
      {
        id: "displayName",
        label: "表示名",
        type: "text",
        description:
          "This description is deliberately long so the layout is verified against wrapping copy that must never clip or overflow its container.",
        hint: "他の利用者に表示される名前です。",
        placeholder: "名前を入力",
      },
      {
        id: "notes",
        label: "メモ",
        type: "textarea",
        hint: "長いメモも折り返して表示されます。",
        placeholder: "メモを入力",
      },
      {
        id: "language",
        label: "言語",
        type: "select",
        options: [
          { value: "ja", label: "日本語" },
          { value: "en", label: "English" },
          { value: "de", label: "Deutsch mit einem sehr langen Optionsnamen" },
        ],
      },
      {
        id: "emailDigest",
        label: "メール通知",
        type: "switch",
        description: "週に一度、アクティビティの概要をメールで受け取ります。",
      },
    ],
    initialValues: {
      displayName: "山田 太郎",
      notes: "",
      language: "ja",
      emailDigest: true,
    },
  },
};
