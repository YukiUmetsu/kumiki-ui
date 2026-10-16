import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { Button } from "../src/ui/button";
import { Field } from "../src/ui/input";
import { Dialog } from "../src/ui/dialog";

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

describe("accessibility (axe)", () => {
  it("Button has no detectable violations", async () => {
    const { container } = render(
      <div>
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
        <Button size="icon" aria-label="Add" />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Field has no detectable violations in normal and error states", async () => {
    const { container } = render(
      <div>
        <Field label="Email" hint="We never share it" />
        <Field label="Password" error="Password is required" />
      </div>
    );
    await expectNoViolations(container);
  });

  it("open Dialog has no detectable violations", async () => {
    render(
      <Dialog open title="Confirm" description="This cannot be undone.">
        <Button>Delete</Button>
      </Dialog>
    );
    await expectNoViolations(document.body);
  });
});
