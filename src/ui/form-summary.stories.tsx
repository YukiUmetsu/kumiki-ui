import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormSummary } from "./form-summary";
import type { FormSummaryError } from "./form-summary";
import { Field } from "./field-input";
import { Button } from "./button";

const defaultErrors: FormSummaryError[] = [
  {
    fieldId: "summary-email",
    label: "Email address",
    message: "Enter an email address in the format name@example.com.",
  },
  {
    fieldId: "summary-password",
    label: "Password",
    message: "Use at least 12 characters.",
  },
];

const meta = {
  title: "Components/Form Summary",
  component: FormSummary,
  args: {
    errors: defaultErrors,
  },
  argTypes: {
    live: { control: "select", options: ["off", "polite", "assertive"] },
  },
} satisfies Meta<typeof FormSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <FormSummary
        errors={[
          defaultErrors[0],
          {
            fieldId: "summary-confirm",
            label: "Confirm password",
            message: "The passwords do not match.",
          },
        ]}
      />
      <Field
        id="summary-email"
        label="Email address"
        defaultValue="not-an-email"
        error="Enter an email address in the format name@example.com."
      />
      <Field
        id="summary-confirm"
        label="Confirm password"
        type="password"
        error="The passwords do not match."
      />
      <Button type="submit">Create account</Button>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        An empty <code>errors</code> array renders nothing, so the summary can stay
        mounted for the whole lifetime of a form.
      </p>
      <FormSummary errors={[]} />
    </div>
  ),
};

export const LivePolite: Story = {
  args: {
    live: "polite",
    errors: defaultErrors,
  },
};

export const LiveAssertive: Story = {
  args: {
    live: "assertive",
    errors: defaultErrors,
  },
};

const manyErrors: FormSummaryError[] = [
  { fieldId: "many-name", label: "Full name", message: "This field is required." },
  { fieldId: "many-email", label: "Email address", message: "Enter a valid email address." },
  { fieldId: "many-phone", label: "Phone number", message: "Include the country code." },
  { fieldId: "many-role", label: "Role", message: "Choose one of the available roles." },
  { fieldId: "many-team", label: "Team", message: "Choose a team to continue." },
  { fieldId: "many-start", label: "Start date", message: "Choose a date in the future." },
  { fieldId: "many-timezone", label: "Time zone", message: "Select your local time zone." },
  { fieldId: "many-notes", label: "Notes", message: "Keep notes under 500 characters." },
  { fieldId: "many-terms", label: "Terms", message: "Accept the terms to continue." },
];

export const ManyErrors: Story = {
  args: { errors: manyErrors },
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="w-full max-w-sm">
      <FormSummary
        title="次のエラーを修正してください"
        errors={[
          {
            fieldId: "localized-email",
            label: "メールアドレス",
            message:
              "「name@example.com」の形式で入力してください。現在の値では確認メールを送信できません。",
          },
          {
            fieldId: "localized-url",
            label: "Web サイトのURL",
            message:
              "https://example.com/help/account-settings?source=workspace&code=INVALID_URL_FORMAT の手順に従って、完全なURLを入力してください。",
          },
          {
            fieldId: "localized-notes",
            label: "備考",
            message:
              "入力されたテキストが長すぎます。500文字以内に短縮してください。この文章は折り返され、カードの外にはみ出しません。",
          },
        ]}
      />
    </div>
  ),
};
