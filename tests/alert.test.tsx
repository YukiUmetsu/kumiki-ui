import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Alert } from "../src/ui/alert";
import { Button } from "../src/ui/button";

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

describe("Alert", () => {
  it("renders a non-live container by default with title and description", () => {
    const { container } = render(
      <Alert title="Heads up">This workspace will switch to read-only mode.</Alert>
    );
    const alert = container.querySelector<HTMLElement>("[data-km-alert]");

    expect(alert).not.toBeNull();
    expect(alert).toHaveAttribute("data-variant", "info");
    expect(alert).toHaveAttribute("data-live", "off");
    expect(alert).not.toHaveAttribute("role");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(
      screen.getByText("This workspace will switch to read-only mode.")
    ).toBeInTheDocument();
  });

  it("renders a decorative per-variant icon by default", () => {
    const { container } = render(<Alert variant="danger" title="Failed" />);
    const icon = container.querySelector('[data-part="icon"]');

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon!.querySelector("svg")).not.toBeNull();
    expect(icon).toHaveClass("text-status-danger");
  });

  it("accepts a custom icon and keeps it decorative", () => {
    const { container } = render(
      <Alert icon={<span data-testid="custom-icon">!</span>} title="Custom" />
    );
    const icon = container.querySelector('[data-part="icon"]');

    expect(container.querySelector('[data-testid="custom-icon"]')).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the status accent and icon color for every variant", () => {
    const variants = ["info", "success", "warning", "danger"] as const;
    const { container } = render(
      <div>
        {variants.map((variant) => (
          <Alert key={variant} variant={variant} title={variant} />
        ))}
      </div>
    );
    const alerts = Array.from(container.querySelectorAll<HTMLElement>("[data-km-alert]"));

    variants.forEach((variant, index) => {
      const alert = alerts[index];
      const accent = alert.querySelector('[data-part="accent"]');
      const icon = alert.querySelector('[data-part="icon"]');

      expect(alert).toHaveAttribute("data-variant", variant);
      expect(accent).toHaveClass(`bg-status-${variant}`);
      expect(accent).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveClass(`text-status-${variant}`);
      expect(alert).toHaveTextContent(variant);
    });
  });

  it("renders role=status for a polite live region and nothing for off", () => {
    const { rerender } = render(
      <Alert live="polite" variant="success" title="Draft saved">
        Stored locally.
      </Alert>
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-km-alert");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(
      <Alert live="off" variant="success" title="Draft saved">
        Stored locally.
      </Alert>
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders role=alert for an assertive live region and never both roles", async () => {
    const { container } = render(
      <Alert live="assertive" variant="danger" title="Connection lost">
        Changes cannot be saved.
      </Alert>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("status")).toBeNull();

    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("renders an action slot below the description", () => {
    const { container } = render(
      <Alert
        variant="danger"
        title="Import failed"
        action={<Button size="sm">Retry</Button>}
      >
        The file contains unsupported rows.
      </Alert>
    );

    const action = container.querySelector('[data-part="action"]');
    expect(action).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows a named dismiss button only when dismissible and calls onDismiss", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Alert title="Notice">Body</Alert>);

    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();

    rerender(
      <Alert title="Notice" dismissible onDismiss={onDismiss}>
        Body
      </Alert>
    );
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    await userEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("merges a consumer className and forwards DOM props", () => {
    render(
      <Alert className="my-alert" data-analytics="notice" title="Notice">
        Body
      </Alert>
    );
    const alert = document.querySelector("[data-km-alert]")!;

    expect(alert).toHaveClass("my-alert");
    expect(alert).toHaveAttribute("data-analytics", "notice");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Alert ref={ref} title="Ref">
        Body
      </Alert>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(container.querySelector("[data-km-alert]"));
  });

  it("keeps long CJK text and URLs in the description", () => {
    const title = "同期できませんでした。ネットワークを確認してください";
    const body =
      "詳細: https://example.com/help/sync-errors?source=workspace&code=NETWORK_UNAVAILABLE の手順に従って設定を確認してください。";
    render(
      <Alert variant="warning" title={title}>
        {body}
      </Alert>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
  });

  it("has no detectable accessibility violations in a complex state", async () => {
    const { container } = render(
      <div>
        <Alert
          live="assertive"
          variant="danger"
          title="Could not connect"
          dismissible
          onDismiss={() => {}}
          action={<Button size="sm">Retry</Button>}
        >
          Check your network connection and try again.
        </Alert>
        <Alert live="polite" variant="success" title="Saved" icon={<span>ok</span>}>
          Your changes were stored.
        </Alert>
      </div>
    );

    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
