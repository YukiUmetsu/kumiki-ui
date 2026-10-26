import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IconButton } from "../src/ui/icon-button";
import { TextareaField } from "../src/ui/textarea";
import { Checkbox } from "../src/ui/checkbox";
import { Switch } from "../src/ui/switch";
import { Tooltip } from "../src/ui/tooltip";
import { Separator } from "../src/ui/separator";
import { Skeleton } from "../src/ui/skeleton";
import { Badge } from "../src/ui/badge";
import { Alert } from "../src/ui/alert";
import { Accordion } from "../src/ui/accordion";
import { RadioGroup } from "../src/ui/radio-group";
import { Slider } from "../src/ui/slider";
import { Breadcrumbs } from "../src/ui/breadcrumbs";
import { Stepper } from "../src/ui/stepper";
import { Listbox } from "../src/ui/listbox";
import { Table } from "../src/ui/table";
import { FormSummary } from "../src/ui/form-summary";
import { Sidebar } from "../src/ui/sidebar";
import { Combobox } from "../src/ui/combobox";
import { SearchableResults } from "../src/ui/searchable-results";
import { SplitPane } from "../src/ui/split-pane";

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

  it("Separator has no detectable violations", async () => {
    const { container } = render(
      <div>
        <Separator />
        <div className="flex h-8 items-stretch">
          <Separator orientation="vertical" />
        </div>
        <Separator decorative={false} />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Skeleton has no detectable violations across shapes", async () => {
    const { container } = render(
      <div>
        <Skeleton />
        <Skeleton shape="text" lines={3} />
        <Skeleton shape="rect" width={160} height={64} />
        <Skeleton shape="circle" width={48} />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Badge has no detectable violations across variants", async () => {
    const { container } = render(
      <div>
        <Badge>Neutral</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success">Saved</Badge>
        <Badge variant="warning" dot>
          Warning
        </Badge>
        <Badge variant="danger">Failed</Badge>
      </div>
    );
    await expectNoViolations(container);
  });

  it("Alert has no detectable violations across variants", async () => {
    const { container } = render(
      <div>
        <Alert title="Heads up" live="polite">
          Something changed.
        </Alert>
        <Alert variant="success" title="Saved" />
        <Alert variant="warning" title="Careful" dismissible />
        <Alert
          variant="danger"
          title="Failed"
          live="assertive"
          action={<button type="button">Retry</button>}
        >
          We could not save your changes.
        </Alert>
      </div>
    );
    await expectNoViolations(container);
  });

  it("Accordion has no detectable violations", async () => {
    const { container } = render(
      <Accordion defaultValue={["one"]}>
        <Accordion.Item value="one">
          <Accordion.Header>
            <Accordion.Trigger>First</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>First content</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="two">
          <Accordion.Header>
            <Accordion.Trigger>Second</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Second content</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
    await expectNoViolations(container);
  });

  it("RadioGroup has no detectable violations", async () => {
    const { container } = render(
      <RadioGroup label="Plan" defaultValue="basic" name="plan">
        <RadioGroup.Item value="basic" label="Basic" />
        <RadioGroup.Item value="pro" label="Pro" description="Everything in Basic" />
        <RadioGroup.Item value="locked" label="Locked" disabled />
      </RadioGroup>
    );
    await expectNoViolations(container);
  });

  it("Slider has no detectable violations for single and range values", async () => {
    const { container } = render(
      <div>
        <Slider label="Volume" defaultValue={40} showValue />
        <Slider label="Price range" defaultValue={[20, 80]} />
        <Slider aria-label="Disabled level" defaultValue={50} disabled />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Breadcrumbs has no detectable violations", async () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: "Current page" },
        ]}
      />
    );
    await expectNoViolations(container);
  });

  it("Stepper has no detectable violations in either orientation", async () => {
    const steps = [
      { id: "setup", label: "Setup", status: "complete" as const },
      { id: "script", label: "Script", status: "active" as const },
      { id: "export", label: "Export" },
    ];
    const { container } = render(
      <div>
        <Stepper steps={steps} aria-label="Workflow" />
        <Stepper steps={steps} orientation="vertical" onStepSelect={() => {}} />
      </div>
    );
    await expectNoViolations(container);
  });

  it("Listbox has no detectable violations", async () => {
    const { container } = render(
      <Listbox
        label="Fruit"
        defaultValue="apple"
        options={[
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana", description: "Ripe" },
          { value: "cherry", label: "Cherry", disabled: true },
        ]}
      />
    );
    await expectNoViolations(container);
  });

  it("Table has no detectable violations", async () => {
    const { container } = render(
      <Table stickyHeader maxHeight={320}>
        <Table.Caption>Invoices</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.Head sortDirection="ascending" onSortChange={() => {}}>
              Name
            </Table.Head>
            <Table.Head>Amount</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row interactive>
            <Table.Cell>Alpha</Table.Cell>
            <Table.Cell>$12.00</Table.Cell>
          </Table.Row>
          <Table.Row selected>
            <Table.Cell>Beta</Table.Cell>
            <Table.Cell>$8.00</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    await expectNoViolations(container);
  });

  it("FormSummary has no detectable violations", async () => {
    const { container } = render(
      <FormSummary
        errors={[
          { fieldId: "email", label: "Email", message: "Email is required" },
          { fieldId: "name", label: "Name", message: "Name is too short" },
        ]}
      />
    );
    await expectNoViolations(container);
  });

  it("Sidebar has no detectable violations", async () => {
    const { container } = render(
      <Sidebar>
        <Sidebar.Header>
          <Sidebar.Toggle />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Group label="Main">
            <Sidebar.Item href="/" active>
              Home
            </Sidebar.Item>
            <Sidebar.Item href="/reports">Reports</Sidebar.Item>
            <Sidebar.Item href="/settings" disabled>
              Settings
            </Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li>v0.2</li>
        </Sidebar.Footer>
      </Sidebar>
    );
    await expectNoViolations(container);
  });

  it("Combobox has no detectable violations", async () => {
    const { container } = render(
      <Combobox
        label="Assignee"
        options={[
          { value: "ada", label: "Ada" },
          { value: "linus", label: "Linus" },
        ]}
      />
    );
    await expectNoViolations(container);
  });

  it("SearchableResults has no detectable violations", async () => {
    const { container } = render(
      <SearchableResults
        query="rep"
        onQueryChange={() => {}}
        results={[
          { id: "1", title: "Reports", href: "/reports" },
          { id: "2", title: "Report settings", subtitle: "Configure", href: "/settings" },
          { id: "3", title: "Unavailable", disabled: true },
        ]}
        hasMore
        onLoadMore={() => {}}
      />
    );
    await expectNoViolations(container);
  });

  it("SplitPane has no detectable violations", async () => {
    const { container } = render(
      <div style={{ height: 320 }}>
        <SplitPane primary={<div>Primary</div>} secondary={<div>Secondary</div>} />
      </div>
    );
    await expectNoViolations(container);
  });
});
