import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Sidebar } from "../src/ui/sidebar";
import type { SidebarProps } from "../src/ui/sidebar";

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
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

function Glyph() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" />;
}

function Demo(props: Partial<SidebarProps> = {}) {
  return (
    <Sidebar {...props}>
      <Sidebar.Header>
        <span>Kumiki</span>
        <Sidebar.Toggle />
      </Sidebar.Header>
      <Sidebar.Nav>
        <Sidebar.Item href="/overview" icon={<Glyph />}>
          Overview
        </Sidebar.Item>
        <Sidebar.Item href="/reports" active icon={<Glyph />}>
          Reports
        </Sidebar.Item>
        <Sidebar.Item href="/settings" disabled icon={<Glyph />}>
          Settings
        </Sidebar.Item>
      </Sidebar.Nav>
      <Sidebar.Footer>
        <li>Signed in as A. Rivera</li>
      </Sidebar.Footer>
    </Sidebar>
  );
}

describe("Sidebar", () => {
  it("renders a labelled navigation landmark", () => {
    render(<Demo />);
    const nav = screen.getByRole("navigation", { name: "Sidebar" });
    expect(nav).toHaveAttribute("data-km-sidebar", "root");
    const navList = nav.querySelector<HTMLElement>('[data-km-sidebar="nav"]');
    expect(navList).not.toBeNull();
    expect(nav).toContainElement(navList);
    expect(within(navList!).getAllByRole("listitem")).toHaveLength(3);
  });

  it("accepts a custom landmark label", () => {
    render(<Demo aria-label="Project navigation" />);
    expect(screen.getByRole("navigation", { name: "Project navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Sidebar" })).not.toBeInTheDocument();
  });

  it("marks the active item with aria-current=page", () => {
    render(<Demo />);
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Settings" })).not.toHaveAttribute("aria-current");
  });

  it("toggles the uncontrolled rail and reports the next state", async () => {
    const onCollapsedChange = vi.fn();
    render(<Demo onCollapsedChange={onCollapsedChange} />);
    const nav = screen.getByRole("navigation");
    expect(nav).not.toHaveAttribute("data-collapsed");

    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(nav).toHaveAttribute("data-collapsed");
    expect(nav.className).toContain("w-16");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(nav).not.toHaveAttribute("data-collapsed");
    expect(nav.className).toContain("w-64");
  });

  it("lets the parent own the collapsed state when controlled", async () => {
    const onCollapsedChange = vi.fn();
    function Controlled() {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <div>
          <span data-testid="readout">{String(collapsed)}</span>
          <Sidebar
            collapsed={collapsed}
            onCollapsedChange={(next) => {
              onCollapsedChange(next);
              setCollapsed(next);
            }}
          >
            <Sidebar.Header>
              <Sidebar.Toggle />
            </Sidebar.Header>
            <Sidebar.Nav>
              <Sidebar.Item href="/overview">Overview</Sidebar.Item>
            </Sidebar.Nav>
          </Sidebar>
        </div>
      );
    }

    render(<Controlled />);
    const nav = screen.getByRole("navigation");
    expect(screen.getByTestId("readout")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId("readout")).toHaveTextContent("true");
    expect(nav).toHaveAttribute("data-collapsed");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId("readout")).toHaveTextContent("false");
    expect(nav).not.toHaveAttribute("data-collapsed");
  });

  it("does not change a controlled rail on its own", async () => {
    const onCollapsedChange = vi.fn();
    render(
      <Sidebar collapsed={false} onCollapsedChange={onCollapsedChange}>
        <Sidebar.Header>
          <Sidebar.Toggle />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/overview">Overview</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>
    );

    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("navigation")).not.toHaveAttribute("data-collapsed");
  });

  it("keeps every accessible name when collapsed", () => {
    render(<Demo defaultCollapsed />);
    expect(screen.getByRole("navigation", { name: "Sidebar" })).toHaveAttribute("data-collapsed");

    const reports = screen.getByRole("link", { name: "Reports" });
    expect(reports).toHaveAccessibleName("Reports");
    const label = reports.querySelector('[data-km-sidebar="label"]');
    expect(label).not.toBeNull();
    expect(label).toHaveClass("sr-only");
    expect(label).toHaveTextContent("Reports");

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("keeps items in native tab order and skips disabled ones", async () => {
    render(<Demo />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Reports" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Settings" })).not.toHaveFocus();
  });

  it("groups items under a list named by the group label", async () => {
    render(
      <Sidebar>
        <Sidebar.Header>
          <Sidebar.Toggle />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Group label="Workspace">
            <Sidebar.Item href="/overview">Overview</Sidebar.Item>
            <Sidebar.Item href="/projects">Projects</Sidebar.Item>
          </Sidebar.Group>
          <Sidebar.Group label="Account">
            <Sidebar.Item href="/settings">Settings</Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
      </Sidebar>
    );

    const workspace = screen.getByRole("list", { name: "Workspace" });
    const label = screen.getByText("Workspace");
    expect(workspace).toHaveAttribute("aria-labelledby", label.id);
    expect(within(workspace).getAllByRole("listitem")).toHaveLength(2);
    expect(within(workspace).getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(label.closest('[data-km-sidebar="group"]')).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(label).toHaveClass("sr-only");
    expect(screen.getByRole("list", { name: "Workspace" })).toBeInTheDocument();
  });

  it("forwards the root ref, className and DOM props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Sidebar ref={ref} className="custom-rail" data-testid="rail" aria-describedby="hint">
        <Sidebar.Nav>
          <Sidebar.Item href="/overview">Overview</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>
    );
    const nav = screen.getByTestId("rail");
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass("custom-rail");
    expect(nav).toHaveAttribute("aria-describedby", "hint");
  });

  it("forwards an item ref to the list item", () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <Sidebar>
        <Sidebar.Nav>
          <Sidebar.Item ref={ref} href="/overview">
            Overview
          </Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current).toHaveAttribute("data-km-sidebar", "item");
  });

  it("renders a disabled item as inert and suppresses its click handler", async () => {
    const onClick = vi.fn();
    render(
      <Sidebar>
        <Sidebar.Nav>
          <Sidebar.Item href="/audit" disabled onClick={onClick}>
            Audit log
          </Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>
    );

    const item = screen.getByRole("link", { name: "Audit log" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveAttribute("tabindex", "-1");
    expect(item).not.toHaveAttribute("href");

    await userEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Audit log" })).toHaveAccessibleName("Audit log");
  });

  it("accepts a consumer-rendered anchor and applies current/active state", () => {
    render(
      <Sidebar>
        <Sidebar.Nav>
          <Sidebar.Item active>
            <a href="/custom" className="custom-link">
              Custom destination
            </a>
          </Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>
    );

    const link = screen.getByRole("link", { name: "Custom destination" });
    expect(link).toHaveAttribute("href", "/custom");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("data-km-sidebar", "item-link");
    expect(link).toHaveClass("custom-link");
  });

  it("has no detectable accessibility violations when collapsed", async () => {
    render(
      <Sidebar defaultCollapsed>
        <Sidebar.Header>
          <span>Kumiki</span>
          <Sidebar.Toggle />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Group label="Workspace">
            <Sidebar.Item href="/overview" active icon={<Glyph />}>
              Overview
            </Sidebar.Item>
            <Sidebar.Item href="/settings" disabled icon={<Glyph />}>
              Settings
            </Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li>Signed in as A. Rivera</li>
        </Sidebar.Footer>
      </Sidebar>
    );
    await expectNoViolations(document.body);
  });
});
