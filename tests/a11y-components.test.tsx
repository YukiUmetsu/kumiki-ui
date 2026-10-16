import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IconButton } from "../src/ui/icon-button";
import { TextareaField } from "../src/ui/textarea";
import { Checkbox } from "../src/ui/checkbox";
import { Switch } from "../src/ui/switch";
import { Tooltip } from "../src/ui/tooltip";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

// jsdom cannot compute rendered colors/layout, so document-level and contrast
// rules are disabled; component semantics (names, roles, associations) stay on.
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
  const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
  expect(problems).toEqual([]);
}

describe("accessibility of new components (axe)", () => {
  it("IconButton has no detectable violations", async () => {
    const { container } = render(
      <div>
        <IconButton aria-label="Add item">+</IconButton>
        <IconButton variant="outline" aria-label="Remove" />
        <IconButton aria-label="Saving" isLoading />
      </div>
    );
    await expectNoViolations(container);
  });

  it("TextareaField has no detectable violations in normal and error states", async () => {
    const { container } = render(
      <div>
        <TextareaField label="Message" hint="Markdown is supported" />
        <TextareaField label="Notes" error="Notes are required" maxLength={40} />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Checkbox has no detectable violations across states", async () => {
    const { container } = render(
      <div>
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Mixed" indeterminate />
        <Checkbox label="Disabled" disabled />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Switch has no detectable violations", async () => {
    const { container } = render(
      <div>
        <Switch label="Notifications" />
        <Switch label="Auto-save" defaultChecked description="While you type" />
        <Switch label="Locked" disabled />
      </div>
    );
    await expectNoViolations(container);
  });

  it("open Tooltip has no detectable violations", async () => {
    render(
      <Tooltip delay={0} content="Add an item">
        <IconButton aria-label="Add item">+</IconButton>
      </Tooltip>
    );
    const trigger = document.querySelector<HTMLButtonElement>("button")!;
    await userEvent.hover(trigger);
    await expectNoViolations(document.body);
  });
});
