import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Separator } from "../src/ui/separator";

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
  const results = await axe.run(node, AXE_OPTIONS);
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

function getRule(container: HTMLElement): HTMLElement {
  const rule = container.querySelector<HTMLElement>("[data-km-separator]");
  if (!rule) throw new Error("separator root not found");
  return rule;
}

describe("Separator", () => {
  it("renders a decorative horizontal rule by default", () => {
    const { container } = render(<Separator />);
    const rule = getRule(container);

    expect(rule).toHaveAttribute("aria-hidden", "true");
    expect(rule).toHaveAttribute("data-orientation", "horizontal");
    expect(rule).toHaveAttribute("data-decorative", "true");
    expect(rule).toHaveClass("h-px", "w-full", "bg-border");
    // A decorative rule must not expose a separator landmark.
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("exposes a semantic separator when decorative is false", () => {
    render(<Separator decorative={false} />);
    const rule = screen.getByRole("separator");

    expect(rule).toHaveAttribute("aria-orientation", "horizontal");
    expect(rule).toHaveAttribute("data-decorative", "false");
    expect(rule).not.toHaveAttribute("aria-hidden");
  });

  it("reports vertical orientation with a stretch height", () => {
    render(<Separator orientation="vertical" decorative={false} />);
    const rule = screen.getByRole("separator");

    expect(rule).toHaveAttribute("aria-orientation", "vertical");
    expect(rule).toHaveAttribute("data-orientation", "vertical");
    expect(rule).toHaveClass("w-px", "self-stretch");
  });

  it("does not bake outer spacing into the rule", () => {
    const { container } = render(<Separator />);
    const utilities = getRule(container).className.split(/\s+/);

    expect(utilities.some((utility) => /^(?:-?m[trblxy]?|space-[xy])-/.test(utility))).toBe(false);
  });

  it("forwards the ref, className and DOM props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Separator ref={ref} className="custom-rule" data-testid="rule" />);
    const rule = screen.getByTestId("rule");

    expect(ref.current).toBe(rule);
    expect(rule).toHaveClass("custom-rule");
  });

  it("has no detectable accessibility violations in a mixed composition", async () => {
    render(
      <main>
        <h1>Workspace settings</h1>
        <p>Profile, email and password.</p>
        <Separator decorative={false} />
        <h2>Billing</h2>
        <p>Invoices and payment method.</p>
        <Separator />
        <div className="flex h-12 items-center gap-3">
          <span>Overview</span>
          <Separator orientation="vertical" />
          <span>Activity</span>
        </div>
      </main>
    );

    await expectNoViolations(document.body);
  });
});
