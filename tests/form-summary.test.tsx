import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { FormSummary } from "../src/ui/form-summary";

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles) stay on.
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

describe("FormSummary", () => {
  it("renders nothing when there are no errors", () => {
    const { container } = render(<FormSummary errors={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector("[data-km-form-summary]")).toBeNull();
  });

  it("lists every error with its field label and message in the accessible name", () => {
    render(
      <FormSummary
        errors={[
          { fieldId: "email", label: "Email address", message: "Enter a valid email address." },
          { fieldId: "password", label: "Password", message: "Use at least 12 characters." },
        ]}
      />
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);

    expect(links[0]).toHaveAccessibleName(/Email address/);
    expect(links[0]).toHaveAccessibleName(/Enter a valid email address\./);
    expect(links[1]).toHaveAccessibleName(/Password/);
    expect(links[1]).toHaveAccessibleName(/Use at least 12 characters\./);

    expect(screen.getByText(/Email address/)).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("calls onNavigate with the field id and leaves focus to the consumer", async () => {
    const onNavigate = vi.fn();
    render(
      <div>
        <FormSummary
          errors={[{ fieldId: "account-email", label: "Email", message: "Required." }]}
          onNavigate={onNavigate}
        />
        <input id="account-email" aria-label="Email" />
      </div>
    );

    await userEvent.click(screen.getByRole("link", { name: /Email:\s*Required\./ }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("account-email");
    expect(screen.getByRole("textbox", { name: "Email" })).not.toHaveFocus();
  });

  it("focuses the field by id when no onNavigate is supplied", async () => {
    render(
      <div>
        <FormSummary
          errors={[{ fieldId: "fallback-field", label: "Display name", message: "Required." }]}
        />
        <input id="fallback-field" aria-label="Display name" />
      </div>
    );

    await userEvent.click(screen.getByRole("link", { name: /Display name:\s*Required\./ }));

    expect(screen.getByRole("textbox", { name: "Display name" })).toHaveFocus();
  });

  it("maps live to exactly one role and drops the live attributes when off", () => {
    const { rerender } = render(
      <FormSummary
        live="polite"
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );

    const polite = screen.getByRole("status");
    expect(polite).toHaveAttribute("data-km-form-summary");
    expect(polite).toHaveAttribute("data-live", "polite");
    expect(polite).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(
      <FormSummary
        live="assertive"
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );

    const assertive = screen.getByRole("alert");
    expect(assertive).toHaveAttribute("role", "alert");
    expect(assertive).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <FormSummary
        live="off"
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );

    const off = document.querySelector<HTMLElement>("[data-km-form-summary]")!;
    expect(off).not.toHaveAttribute("role");
    expect(off).not.toHaveAttribute("aria-atomic");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("labels the summary with a default heading and supports a custom or omitted title", () => {
    const { rerender } = render(
      <FormSummary errors={[{ fieldId: "email", label: "Email", message: "Required." }]} />
    );

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Please fix the following errors",
    });
    const summary = document.querySelector<HTMLElement>("[data-km-form-summary]")!;
    expect(summary).toHaveAttribute("aria-labelledby", heading.id);

    rerender(
      <FormSummary
        title="Check these fields"
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Check these fields" })).toBeInTheDocument();

    rerender(
      <FormSummary
        title={null}
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(document.querySelector<HTMLElement>("[data-km-form-summary]")).not.toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("forwards its ref, merges className and passes DOM props through", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FormSummary
        ref={ref}
        className="my-summary"
        data-analytics="validation-summary"
        errors={[{ fieldId: "email", label: "Email", message: "Required." }]}
      />
    );
    const summary = document.querySelector<HTMLElement>("[data-km-form-summary]")!;

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(summary);
    expect(summary).toHaveClass("my-summary");
    expect(summary).toHaveAttribute("data-analytics", "validation-summary");
  });

  it("keeps long CJK messages and URLs in the list", () => {
    const message =
      "https://example.com/help/account-settings?source=workspace&code=INVALID_URL_FORMAT の手順に従って、完全なURLを入力してください。";
    render(
      <FormSummary
        title="次のエラーを修正してください"
        errors={[{ fieldId: "website", label: "Web サイトのURL", message }]}
      />
    );

    expect(screen.getByText("次のエラーを修正してください")).toBeInTheDocument();
    expect(screen.getByText(/Web サイトのURL/)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("has no detectable accessibility violations when populated", async () => {
    const { container } = render(
      <div>
        <FormSummary
          live="assertive"
          title="Please fix the following errors"
          errors={[
            { fieldId: "axe-email", label: "Email address", message: "Enter a valid email address." },
            { fieldId: "axe-password", label: "Password", message: "Use at least 12 characters." },
          ]}
        />
        <p>
          <label htmlFor="axe-email">Email address</label>
          <input id="axe-email" aria-invalid="true" aria-describedby="axe-email-error" />
          <span id="axe-email-error">Enter a valid email address.</span>
        </p>
        <p>
          <label htmlFor="axe-password">Password</label>
          <input id="axe-password" aria-invalid="true" aria-describedby="axe-password-error" />
          <span id="axe-password-error">Use at least 12 characters.</span>
        </p>
      </div>
    );

    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
