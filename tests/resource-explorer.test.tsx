import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { ResourceExplorer } from "../src/patterns/resource-explorer";
import type { ResourceItem } from "../src/patterns/resource-explorer";

// floating-ui (used by the row actions menu) observes element sizes; jsdom has
// no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

const items: ResourceItem[] = [
  {
    id: "documents",
    label: "Documents",
    children: [
      { id: "reports", label: "Reports" },
      { id: "notes", label: "Meeting notes" },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    children: [{ id: "archive-2023", label: "2023" }],
  },
  { id: "drafts", label: "Drafts" },
];

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
  expect(
    results.violations.map((violation) => `${violation.id}: ${violation.help}`)
  ).toEqual([]);
}

function basic(props: Partial<ComponentProps<typeof ResourceExplorer>> = {}) {
  return <ResourceExplorer items={items} {...props} />;
}

function treeItem(name: string) {
  return screen.getByRole("treeitem", { name: new RegExp(escapeRegExp(name)) });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("ResourceExplorer", () => {
  it("renders a named tree of treeitems with levels and expansion state", () => {
    const { container } = render(basic());

    expect(container.querySelector("[data-km-resource-explorer]")).not.toBeNull();
    const tree = screen.getByRole("tree", { name: "Items" });

    const documents = treeItem("Documents");
    expect(documents).toHaveAttribute("role", "treeitem");
    expect(documents).toHaveAttribute("aria-level", "1");
    expect(documents).toHaveAttribute("aria-expanded", "false");
    // Collapsed: only the three roots are visible.
    expect(within(tree).getAllByRole("treeitem")).toHaveLength(3);
  });

  it("gives each treeitem an accessible name containing its visible text", () => {
    render(basic());

    // A parent renders a visible child-count Badge, so the accessible name must
    // include that count (WCAG 2.5.3 label-content-name-mismatch). It is derived
    // from the content rather than an author aria-label that omits the count.
    const documents = treeItem("Documents");
    expect(documents).not.toHaveAttribute("aria-label");
    expect(documents).toHaveTextContent("Documents");
    expect(documents).toHaveTextContent("2");
    expect(documents).toHaveAccessibleName(/Documents\s*2/);

    // Leaves have no count, but still keep their visible label in the name.
    const drafts = treeItem("Drafts");
    expect(drafts).not.toHaveAttribute("aria-label");
    expect(drafts).toHaveAccessibleName(/Drafts/);
  });

  it("expands a collapsed parent with ArrowRight and collapses it with ArrowLeft", async () => {
    const user = userEvent.setup();
    render(basic());

    treeItem("Documents").focus();
    await user.keyboard("{ArrowRight}");

    expect(treeItem("Documents")).toHaveAttribute("aria-expanded", "true");
    expect(treeItem("Reports")).toHaveAttribute("aria-level", "2");
    expect(screen.getAllByRole("treeitem")).toHaveLength(5);

    await user.keyboard("{ArrowLeft}");
    expect(treeItem("Documents")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: "Reports" })).toBeNull();
  });

  it("moves into the first child with ArrowRight and back to the parent with ArrowLeft", async () => {
    const user = userEvent.setup();
    render(basic());

    const documents = treeItem("Documents");
    documents.focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");

    expect(treeItem("Reports")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(documents).toHaveFocus();
  });

  it("selects the active row on Enter and reports it to onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(basic({ onSelect }));

    treeItem("Archive").focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "archive", label: "Archive" })
    );
    expect(treeItem("Archive")).toHaveAttribute("aria-selected", "true");

    // Selection surfaces the path through the Breadcrumbs composition.
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Archive"
    );
  });

  it("starts an inline rename on F2 and commits the new label on Enter", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(basic({ onRename }));

    treeItem("Drafts").focus();
    await user.keyboard("{F2}");

    const field = screen.getByRole("textbox", { name: "Rename: Drafts" });
    expect(field).toHaveValue("Drafts");

    await user.clear(field);
    await user.type(field, "Specs");
    await user.keyboard("{Enter}");

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith(
      expect.objectContaining({ id: "drafts" }),
      "Specs"
    );

    // Focus returns to the row after the rename ends.
    await waitFor(() => expect(treeItem("Drafts")).toHaveFocus());
  });

  it("reverts an inline rename on Escape", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(basic({ onRename }));

    treeItem("Drafts").focus();
    await user.keyboard("{F2}");

    const field = screen.getByRole("textbox", { name: "Rename: Drafts" });
    await user.clear(field);
    await user.type(field, "Changed");
    await user.keyboard("{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    await waitFor(() => expect(treeItem("Drafts")).toHaveFocus());
  });

  it("triggers keyboard reorder through the per-item actions menu and offers Undo", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const onUndo = vi.fn();
    render(basic({ onMove, onDelete: () => {}, onRename: () => {}, onUndo }));

    await user.click(
      screen.getByRole("button", { name: "More actions: Documents" })
    );
    const menu = await screen.findByRole("menu", { name: "Actions" });

    // Documents is first, so moving up is not possible and stays disabled.
    expect(within(menu).getByRole("menuitem", { name: "Move up" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    await user.click(within(menu).getByRole("menuitem", { name: "Move down" }));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "documents" }),
      "down"
    );

    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
    );
  });

  it("shows a no-match state with a clear-filter action", async () => {
    const user = userEvent.setup();
    render(basic());

    const filter = screen.getByRole("searchbox", { name: "Filter items" });
    await user.type(filter, "zzz");

    expect(screen.queryByRole("tree")).toBeNull();
    expect(
      screen.getByText("No items found. Try removing a filter.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filter" }));

    expect(screen.getByRole("tree", { name: "Items" })).toBeInTheDocument();
    expect(screen.getAllByRole("treeitem")).toHaveLength(3);
    expect(filter).toHaveValue("");
  });

  it("filters to matching rows while keeping ancestor context", async () => {
    const user = userEvent.setup();
    render(basic());

    await user.type(screen.getByRole("searchbox", { name: "Filter items" }), "2023");

    expect(treeItem("Archive")).toHaveAttribute("aria-expanded", "true");
    expect(treeItem("2023")).toHaveAttribute("aria-level", "2");
  });

  it("renders skeleton rows and announces loading without stale content", () => {
    const { container } = render(basic({ loading: true }));

    const root = container.querySelector("[data-km-resource-explorer]");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-part="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("tree")).toBeNull();
    expect(screen.getByText("Loading items…")).toBeInTheDocument();
  });

  it("renders an error alert and recovers through Retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      basic({ error: "Could not load the folder.", onRetry })
    );

    expect(screen.getByText("Could not load the folder.")).toBeInTheDocument();
    expect(screen.queryByRole("tree")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers a create action in the empty root state", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<ResourceExplorer items={[]} onCreate={onCreate} />);

    expect(screen.getByText("No items found.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New item" }));
    expect(onCreate).toHaveBeenCalledWith(null);
  });

  it("has no detectable accessibility violations in a selected, expanded state", async () => {
    render(basic({ selectedId: "documents", expandedIds: ["documents"] }));

    expect(treeItem("Reports")).toBeInTheDocument();
    await expectNoViolations(document.body);
  });
});
