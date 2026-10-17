import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { GuidedForm } from "../src/patterns/guided-form";
import type {
  GuidedFormError,
  GuidedFormProps,
  GuidedFormStep,
  GuidedFormStepApi,
} from "../src/patterns/guided-form";
import { Field } from "../src/ui/field-input";

const steps: GuidedFormStep[] = [
  { id: "details", label: "Details" },
  { id: "preferences", label: "Preferences" },
  { id: "review", label: "Review" },
];

function validate(stepId: string, values: Record<string, unknown>): GuidedFormError[] {
  const errors: GuidedFormError[] = [];
  if (stepId === "details") {
    if (!values.name) errors.push({ fieldId: "name", label: "Name", message: "Enter a value." });
    if (!values.email) errors.push({ fieldId: "email", label: "Email", message: "Enter a value." });
  }
  return errors;
}

function renderStep(step: GuidedFormStep, api: GuidedFormStepApi) {
  if (step.id === "details") {
    return (
      <>
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
          value={String(api.values.email ?? "")}
          onChange={(event) => api.setValue("email", event.target.value)}
          error={api.errorFor("email")}
        />
      </>
    );
  }
  if (step.id === "preferences") {
    return (
      <Field
        id="language"
        label="Language"
        value={String(api.values.language ?? "")}
        onChange={(event) => api.setValue("language", event.target.value)}
      />
    );
  }
  return (
    <Field
      id="notes"
      label="Notes"
      value={String(api.values.notes ?? "")}
      onChange={(event) => api.setValue("notes", event.target.value)}
    />
  );
}

interface HarnessProps {
  initialValues?: Record<string, unknown>;
  initialStep?: number;
  onSubmit?: GuidedFormProps["onSubmit"];
  storageKey?: string;
  onRestoreDraft?: GuidedFormProps["onRestoreDraft"];
  onSaveDraft?: GuidedFormProps["onSaveDraft"];
  labels?: GuidedFormProps["labels"];
}

function Harness({
  initialValues = {},
  initialStep = 0,
  onSubmit = vi.fn(async () => {}),
  storageKey,
  onRestoreDraft,
  onSaveDraft,
  labels,
}: HarnessProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  return (
    <GuidedForm
      steps={steps}
      validate={validate}
      renderStep={renderStep}
      storageKey={storageKey}
      onRestoreDraft={onRestoreDraft}
      onSaveDraft={onSaveDraft}
      labels={labels}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      values={values}
      onChange={setValues}
      onSubmit={onSubmit}
    />
  );
}

const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "page-has-heading-one": { enabled: false },
    "html-has-lang": { enabled: false },
    "document-title": { enabled: false },
  },
} as Parameters<typeof axe.run>[1];

async function expectNoViolations(node: HTMLElement) {
  const axeResults = await axe.run(node, AXE_OPTIONS);
  expect(
    axeResults.violations.map((violation) => `${violation.id}: ${violation.help}`)
  ).toEqual([]);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("GuidedForm", () => {
  it("renders the first step with labelled step navigation and only its fields", () => {
    render(<Harness />);

    expect(screen.getByRole("tablist")).toHaveAccessibleName("Steps");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Language")).toBeNull();
  });

  it("blocks Next when the step is invalid and shows a focused FormSummary", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    const summary = screen.getByRole("alert", { name: "Please fix the following errors" });
    expect(summary).toHaveTextContent("Enter a value.");
    expect(within(summary).getByRole("link", { name: /Name:\s*Enter a value\./ })).toBeInTheDocument();
    expect(within(summary).getByRole("link", { name: /Email:\s*Enter a value\./ })).toBeInTheDocument();
    expect(summary).toHaveFocus();
    // Still on the first step.
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Language")).toBeNull();
  });

  it("focuses the offending field when a FormSummary entry is activated", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    const summary = screen.getByRole("alert", { name: "Please fix the following errors" });
    await userEvent.click(within(summary).getByRole("link", { name: /Email:\s*Enter a value\./ }));

    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("advances to the next step when the current step is valid", async () => {
    render(<Harness />);

    await userEvent.type(screen.getByLabelText("Name"), "Alex");
    await userEvent.type(screen.getByLabelText("Email"), "alex@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preferences" })).toHaveFocus();
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  it("keeps hidden step panels out of the DOM and the tab order", async () => {
    const { container } = render(<Harness />);

    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(container.querySelector("#language")).toBeNull();
    expect(container.querySelector("#notes")).toBeNull();

    // A forward tab click is blocked while the current step is invalid.
    await userEvent.click(screen.getByRole("tab", { name: "Preferences" }));
    expect(screen.getByRole("alert", { name: "Please fix the following errors" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(container.querySelector("#language")).toBeNull();
  });

  it("shows a pending primary action and a success notice on submit", async () => {
    let resolveSubmit!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    render(<Harness initialStep={2} onSubmit={onSubmit} storageKey="km-test-draft" />);

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    const pending = screen.getByRole("button", { name: "Submitting…" });
    expect(pending).toBeDisabled();
    expect(document.querySelector("[data-km-guided-form]")).toHaveAttribute("aria-busy", "true");

    resolveSubmit();
    expect(await screen.findByText("Completed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
    // A successful submit clears the stored draft.
    expect(window.localStorage.getItem("km-test-draft")).toBeNull();
  });

  it("surfaces a submit error with retry while keeping fields editable", async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error("Server failed.")));
    render(<Harness initialStep={2} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not submit the form.");
    expect(alert).toHaveTextContent("Server failed.");
    expect(screen.getByLabelText("Notes")).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("restores a stored draft once on mount and notifies the consumer", () => {
    window.localStorage.setItem("km-test-draft", JSON.stringify({ name: "Restored" }));
    const onRestoreDraft = vi.fn();

    render(<Harness storageKey="km-test-draft" onRestoreDraft={onRestoreDraft} />);

    expect(onRestoreDraft).toHaveBeenCalledTimes(1);
    expect(onRestoreDraft).toHaveBeenCalledWith({ name: "Restored" });
    expect(screen.getByText("Your draft has been restored.")).toBeInTheDocument();
  });

  it("saves the draft when the consumer provides onSaveDraft", async () => {
    const onSaveDraft = vi.fn();
    render(<Harness storageKey="km-test-draft" onSaveDraft={onSaveDraft} />);

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("km-test-draft")).not.toBeNull();
    expect(screen.getByText("Draft saved.")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations on the first step", async () => {
    render(<Harness />);
    await expectNoViolations(document.body);
  });
});
