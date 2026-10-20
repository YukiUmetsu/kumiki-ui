import { createRef, useState } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SettingsSection } from "../src/patterns/settings-section";
import type { SettingsField } from "../src/patterns/settings-section";

const fields: SettingsField[] = [
  {
    id: "displayName",
    label: "Display name",
    type: "text",
    description: "This is how you appear to others.",
  },
  {
    id: "language",
    label: "Language",
    type: "select",
    options: [
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
    ],
  },
  {
    id: "emailDigest",
    label: "Email digest",
    type: "switch",
    description: "A weekly summary of activity.",
  },
];

const initialValues: Record<string, unknown> = {
  displayName: "Alex Morgan",
  language: "en",
  emailDigest: true,
};

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

type SectionProps = ComponentProps<typeof SettingsSection>;

/** Controlled harness mirroring how a consumer owns the value state. */
function Harness({
  onSave = () => {},
  onChange,
  onReset,
  values: controlledValues,
  ...rest
}: Partial<SectionProps> & { onSave?: SectionProps["onSave"] }) {
  const [values, setValues] = useState<Record<string, unknown>>(
    controlledValues ?? initialValues
  );
  return (
    <SettingsSection
      title="Workspace settings"
      description="Manage the preferences for this workspace."
      fields={fields}
      values={values}
      onChange={(next, dirty) => {
        setValues(next);
        onChange?.(next, dirty);
      }}
      onSave={onSave}
      onReset={() => {
        setValues(initialValues);
        onReset?.();
      }}
      {...rest}
    />
  );
}

describe("SettingsSection", () => {
  it("renders the section header and every declared field", () => {
    render(<Harness />);

    expect(
      screen.getByRole("heading", { name: "Workspace settings" })
    ).toBeInTheDocument();
    expect(screen.getByText("Manage the preferences for this workspace.")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Morgan");
    expect(screen.getByRole("switch", { name: /Email digest/ })).toBeChecked();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("This is how you appear to others.")).toBeInTheDocument();
  });

  it("starts pristine with Save and Reset disabled", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-state",
      "pristine"
    );
  });

  it("marks the section dirty and enables Save and Reset after an edit", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Jordan Lee");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ displayName: "Jordan Lee" }),
      true
    );

    const root = document.querySelector("[data-km-settings-section]");
    expect(root).toHaveAttribute("data-state", "dirty");
    expect(root).toHaveAttribute("data-dirty", "true");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
  });

  it("marks the section dirty when a switch is toggled", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("switch", { name: /Email digest/ }));

    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-dirty",
      "true"
    );
  });

  it("calls onSave with the current values and shows the saved state", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Jordan Lee");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      displayName: "Jordan Lee",
      language: "en",
      emailDigest: true,
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Settings saved.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-state",
      "saved"
    );
  });

  it("disables every control and shows the primary action loading while pending", () => {
    render(<Harness pending />);

    expect(screen.getByLabelText("Display name")).toBeDisabled();
    expect(screen.getByRole("switch", { name: /Email digest/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    const save = screen.getByRole("button", { name: "Saving…" });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-state",
      "pending"
    );
  });

  it("surfaces a per-field validation error inline", () => {
    render(<Harness errors={{ displayName: "Display name is required." }} />);

    const input = screen.getByLabelText("Display name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Display name is required.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Display name is required.");
  });

  it("shows a section error alert and retries through the save path", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        error="The server rejected the request."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole("status");
    expect(alert).toHaveTextContent("Settings could not be saved.");
    expect(alert).toHaveTextContent("The server rejected the request.");

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-state",
      "error"
    );
  });

  it("restores the last-saved values when Reset is pressed", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<Harness onReset={onReset} />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Changed");
    expect(input).toHaveValue("Changed");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Morgan");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(document.querySelector("[data-km-settings-section]")).toHaveAttribute(
      "data-state",
      "pristine"
    );
  });

  it("forwards the ref, merges className and passes arbitrary form props", () => {
    const ref = createRef<HTMLFormElement>();
    render(
      <SettingsSection
        ref={ref}
        title="Workspace settings"
        fields={fields}
        values={initialValues}
        onChange={() => {}}
        onSave={() => {}}
        onReset={() => {}}
        className="custom-settings"
        data-testid="settings-root"
      />
    );

    const root = screen.getByTestId("settings-root");
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("FORM");
    expect(root).toHaveAttribute("data-km-settings-section");
    expect(root).toHaveClass("custom-settings");
  });

  it("registers a beforeunload guard only while dirty", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);

    expect(addSpy.mock.calls.map(([type]) => String(type))).not.toContain("beforeunload");

    const input = screen.getByLabelText("Display name");
    await user.type(input, "x");
    expect(addSpy.mock.calls.map(([type]) => String(type))).toContain("beforeunload");

    addSpy.mockRestore();
    unmount();
  });

  it("has no detectable accessibility violations in a dirty state", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Display name");
    await userEvent.setup().type(input, "!");

    await expectNoViolations(document.body);
  });
});
