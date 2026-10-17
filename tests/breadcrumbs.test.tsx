import { createRef } from "react";
import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Breadcrumbs } from "../src/ui/breadcrumbs";
import type { BreadcrumbItem } from "../src/ui/breadcrumbs";

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

const trail: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Kumiki UI", href: "/projects/kumiki-ui" },
  { label: "Components" },
];

describe("Breadcrumbs", () => {
  it("renders a labelled navigation landmark containing an ordered list", () => {
    const { container } = render(<Breadcrumbs items={trail} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("data-km-breadcrumbs", "");

    const list = nav.firstElementChild;
    expect(list?.tagName).toBe("OL");
    expect(list?.getAttribute("data-part")).toBe("list");

    const listItems = within(nav).getAllByRole("listitem");
    expect(listItems).toHaveLength(trail.length);
    expect(listItems.every((item) => item.tagName === "LI")).toBe(true);
    expect(container.querySelectorAll("ol > li")).toHaveLength(trail.length);
  });

  it("accepts a custom accessible name for the landmark", () => {
    render(<Breadcrumbs items={trail} aria-label="You are here" />);

    expect(screen.getByRole("navigation", { name: "You are here" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });

  it("marks the last crumb as the current page without a link", () => {
    render(<Breadcrumbs items={trail} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const current = screen.getByText("Components");

    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).toBe("SPAN");
    expect(within(nav).getAllByRole("link")).toHaveLength(trail.length - 1);

    const currentItem = current.closest("li");
    expect(currentItem).toHaveAttribute("data-part", "item");
    expect(currentItem).toHaveAttribute("data-current", "");
  });

  it("renders href crumbs as links and href-less crumbs as plain text", async () => {
    const onClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/", onClick },
      { label: "Mid section" },
      { label: "Current page" },
    ];
    render(<Breadcrumbs items={items} />);

    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/");

    await userEvent.click(home);
    expect(onClick).toHaveBeenCalledTimes(1);

    // No href means no link and no click target, even if a handler is passed.
    const mid = screen.getByText("Mid section");
    expect(mid.tagName).toBe("SPAN");
    expect(mid.closest("a")).toBeNull();
    expect(screen.queryByRole("link", { name: "Mid section" })).toBeNull();
  });

  it("honours an explicit current flag on a non-last crumb", () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Settings", href: "/settings", current: true },
      { label: "Billing", href: "/billing" },
    ];
    render(<Breadcrumbs items={items} />);

    const settings = screen.getByText("Settings");
    expect(settings).toHaveAttribute("aria-current", "page");
    expect(settings.closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/billing");
  });

  it("keeps the current crumb visible when a collapsed trail has a middle current item", () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Workspace", href: "/workspace" },
      { label: "Engineering", href: "/workspace/engineering", current: true },
      { label: "Design systems", href: "/workspace/design-systems" },
      { label: "Kumiki UI", href: "/workspace/design-systems/kumiki-ui" },
      { label: "Registry", href: "/workspace/design-systems/kumiki-ui/packages/registry" },
    ];
    const { container } = render(<Breadcrumbs items={items} maxItems={3} />);

    // The current page is never dropped by collapsing, and is announced exactly once.
    const current = screen.getByText("Engineering");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registry" })).toBeInTheDocument();
    expect(screen.queryByText("Design systems")).toBeNull();
    // Each gap collapses to its own decorative ellipsis.
    expect(container.querySelectorAll('[data-part="ellipsis"]')).toHaveLength(2);
  });

  it("collapses a long trail to the first and last crumb behind a decorative ellipsis", () => {
    const longTrail: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Workspace", href: "/workspace" },
      { label: "Engineering", href: "/workspace/engineering" },
      { label: "Design systems", href: "/workspace/design-systems" },
      { label: "Kumiki UI", href: "/workspace/design-systems/kumiki-ui" },
      { label: "Packages", href: "/workspace/design-systems/kumiki-ui/packages" },
      { label: "Registry", href: "/workspace/design-systems/kumiki-ui/packages/registry" },
      { label: "Breadcrumbs" },
    ];
    const { container } = render(<Breadcrumbs items={longTrail} maxItems={4} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
    // The ellipsis is decorative, so only two crumbs enter the accessibility tree.
    expect(within(nav).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Breadcrumbs")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Workspace")).toBeNull();
    expect(screen.queryByText("Registry")).toBeNull();

    const ellipsis = container.querySelector<HTMLElement>('[data-part="ellipsis"]');
    expect(ellipsis).not.toBeNull();
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(ellipsis).toHaveAttribute("data-hidden-items", "6");
    expect(ellipsis?.textContent).toContain("…");
  });

  it("keeps the full trail when it fits within maxItems", () => {
    const { container } = render(<Breadcrumbs items={trail} maxItems={4} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(within(nav).getAllByRole("listitem")).toHaveLength(4);
    expect(container.querySelector('[data-part="ellipsis"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
  });

  it("renders the default and custom separators as decorative", () => {
    const { container, rerender } = render(<Breadcrumbs items={trail} />);
    let separators = container.querySelectorAll<HTMLElement>('[data-part="separator"]');

    expect(separators).toHaveLength(trail.length - 1);
    separators.forEach((separator) => {
      expect(separator).toHaveAttribute("aria-hidden", "true");
      expect(separator.textContent).toBe("/");
    });

    rerender(<Breadcrumbs items={trail} separator={<span data-testid="chevron">›</span>} />);
    separators = container.querySelectorAll<HTMLElement>('[data-part="separator"]');
    expect(separators).toHaveLength(trail.length - 1);
    separators.forEach((separator) => {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    });
    expect(screen.getAllByTestId("chevron")).toHaveLength(trail.length - 1);
  });

  it("wraps long and CJK labels instead of clipping the landmark", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "ワークスペース設定とアクセス権限の管理", href: "/workspace/settings" },
          { label: "https://example.com/workspace/settings/members/roles-and-permissions" },
        ]}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const current = screen.getByText(
      "https://example.com/workspace/settings/members/roles-and-permissions"
    );

    expect(current).toHaveClass("break-words");
    expect(nav.firstElementChild).toHaveClass("flex-wrap");
    expect(screen.getByText("ワークスペース設定とアクセス権限の管理")).toBeInTheDocument();
  });

  it("forwards the ref, className and arbitrary nav props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Breadcrumbs
        ref={ref}
        items={trail}
        className="custom-trail"
        data-testid="trail"
        id="page-trail"
      />
    );
    const nav = screen.getByTestId("trail");

    expect(ref.current).toBe(nav);
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveClass("custom-trail");
    expect(nav).toHaveClass("min-w-0");
    expect(nav).toHaveAttribute("id", "page-trail");
  });

  it("has no detectable accessibility violations in a long collapsed trail", async () => {
    render(
      <main>
        <h1>Registry</h1>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Workspace", href: "/workspace" },
            { label: "Engineering", href: "/workspace/engineering" },
            { label: "Design systems", href: "/workspace/design-systems" },
            { label: "Kumiki UI", href: "/workspace/design-systems/kumiki-ui" },
            { label: "Registry" },
          ]}
          maxItems={3}
          separator="›"
        />
        <p>Component sources and documentation.</p>
      </main>
    );

    await expectNoViolations(document.body);
  });
});
