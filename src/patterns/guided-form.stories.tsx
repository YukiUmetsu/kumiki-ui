import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GuidedForm } from "./guided-form";
import type {
  GuidedFormError,
  GuidedFormProps,
  GuidedFormStep,
  GuidedFormStepApi,
} from "./guided-form";
import { Field } from "../ui/field-input";
import { TextareaField } from "../ui/textarea";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";

const steps: GuidedFormStep[] = [
  { id: "details", label: "Details", description: "Name and contact details." },
  { id: "preferences", label: "Preferences", description: "Language and notifications." },
  { id: "review", label: "Review", description: "Check everything before submitting." },
];

function validate(stepId: string, values: Record<string, unknown>): GuidedFormError[] {
  const errors: GuidedFormError[] = [];
  if (stepId === "details") {
    if (!values.name) {
      errors.push({ fieldId: "name", label: "Name", message: "Enter a value." });
    }
    if (!values.email) {
      errors.push({ fieldId: "email", label: "Email", message: "Enter a value." });
    }
  }
  if (stepId === "preferences" && !values.language) {
    errors.push({ fieldId: "language", label: "Language", message: "Choose an option." });
  }
  return errors;
}

function renderStep(step: GuidedFormStep, api: GuidedFormStepApi) {
  if (step.id === "details") {
    return (
      <div className="flex flex-col gap-4">
        <Field
          id="name"
          label="Name"
          value={String(api.values.name ?? "")}
          onChange={(event) => api.setValue("name", event.target.value)}
          error={api.errorFor("name")}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          value={String(api.values.email ?? "")}
          onChange={(event) => api.setValue("email", event.target.value)}
          error={api.errorFor("email")}
        />
      </div>
    );
  }

  if (step.id === "preferences") {
    return (
      <div className="flex flex-col gap-4">
        <Select
          label="Language"
          placeholder="Choose a language"
          value={(api.values.language as string | undefined) ?? null}
          onValueChange={(value) => api.setValue("language", value)}
          options={[
            { value: "en", label: "English" },
            { value: "ja", label: "日本語" },
          ]}
        />
        <Switch
          label="Email digest"
          description="Send a summary of changes."
          checked={Boolean(api.values.digest)}
          onCheckedChange={(checked) => api.setValue("digest", checked)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TextareaField
        label="Notes"
        value={String(api.values.notes ?? "")}
        onChange={(event) => api.setValue("notes", event.target.value)}
      />
    </div>
  );
}

interface HarnessProps {
  steps?: GuidedFormStep[];
  validate?: GuidedFormProps["validate"];
  renderStep?: GuidedFormProps["renderStep"];
  labels?: GuidedFormProps["labels"];
  storageKey?: string;
  onRestoreDraft?: GuidedFormProps["onRestoreDraft"];
  onSaveDraft?: GuidedFormProps["onSaveDraft"];
  initialValues?: Record<string, unknown>;
  initialStep?: number;
  submitDelay?: number;
  rejectSubmit?: boolean;
}

/** Keeps the controlled props in local state so the pattern is runnable. */
function Harness({
  steps: stepsProp = steps,
  validate: validateProp = validate,
  renderStep: renderStepProp = renderStep,
  labels,
  storageKey,
  onRestoreDraft,
  onSaveDraft,
  initialValues = {},
  initialStep = 0,
  submitDelay = 0,
  rejectSubmit = false,
}: HarnessProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  return (
    <GuidedForm
      steps={stepsProp}
      validate={validateProp}
      renderStep={renderStepProp}
      labels={labels}
      storageKey={storageKey}
      onRestoreDraft={onRestoreDraft}
      onSaveDraft={onSaveDraft}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      values={values}
      onChange={setValues}
      onSubmit={async () => {
        if (submitDelay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, submitDelay));
        }
        if (rejectSubmit) {
          throw new Error("The server rejected this submission.");
        }
      }}
    />
  );
}

type GuidedFormStoryProps = Partial<GuidedFormProps> & {
  initialValues?: Record<string, unknown>;
  initialStep?: number;
  submitDelay?: number;
  rejectSubmit?: boolean;
};

const DRAFT_STORAGE_KEY = "km-guided-form-story";

if (typeof window !== "undefined") {
  window.localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({ name: "Draft name", email: "draft@example.com" })
  );
}

const meta = {
  title: "Application patterns/Guided Form", id: "patterns-guided-form",
  component: GuidedForm,
  parameters: { layout: "centered" },
  args: { steps, validate, renderStep },
  render: (args) => (
    <div className="w-[36rem] max-w-full">
      <Harness {...args} />
    </div>
  ),
} satisfies Meta<typeof GuidedForm>;

export default meta;
type Story = StoryObj<GuidedFormStoryProps>;

export const Default: Story = {};

export const Prefilled: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-full">
      <Harness
        {...args}
        initialValues={{ name: "Alex Rivera", email: "alex@example.com", language: "en" }}
      />
    </div>
  ),
};

export const DraftRestored: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-full">
      <Harness {...args} storageKey={DRAFT_STORAGE_KEY} />
    </div>
  ),
};

export const SubmitError: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-full">
      <Harness
        {...args}
        initialStep={2}
        initialValues={{ name: "Alex Rivera", email: "alex@example.com", language: "en" }}
        rejectSubmit
      />
    </div>
  ),
};

export const PendingSubmit: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-full">
      <Harness
        {...args}
        initialStep={2}
        initialValues={{ name: "Alex Rivera", email: "alex@example.com", language: "en" }}
        submitDelay={2500}
      />
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  args: {
    steps: [
      { id: "details", label: "お客様の詳細情報", description: "氏名と連絡先を入力してください。" },
      { id: "preferences", label: "設定", description: "言語と通知を選択します。" },
      { id: "review", label: "確認", description: "送信する前に内容を確認してください。" },
    ],
    labels: {
      previous: "戻る",
      next: "次へ",
      submit: "送信",
      saveDraft: "下書きを保存",
      completed: "完了しました。",
      draftRestored: "下書きを復元しました。",
    },
  },
  render: (args) => (
    <div className="w-72 max-w-full">
      <Harness
        {...args}
        initialValues={{
          name: "非常に長い名前がここに入り、複数行に折り返されることを確認します very long name",
          email: "an.extremely.long.address@example.com",
        }}
      />
    </div>
  ),
};
