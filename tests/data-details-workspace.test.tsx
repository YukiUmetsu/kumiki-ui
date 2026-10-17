import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { DataDetailsWorkspace } from "../src/patterns/data-details-workspace";
import type {
  DataDetailsColumn,
  DataDetailsRow,
  DataDetailsSort,
  DataDetailsWorkspaceProps,
} from "../src/patterns/data-details-workspace";

// SplitPane observes its own size and jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
  ResizeObserverStub;

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

const columns: DataDetailsColumn[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "updated", header: "Updated" },
];

const rows: DataDetailsRow[] = [
  { id: "item-01", name: "Item 01", status: "Active", updated: "2026-02-14" },
  { id: "item-02", name: "Item 02", status: "Draft", updated: "2026-02-11" },
];

function renderDetail(row: DataDetailsRow) {
  return <p>Details for {String(row.name)}</p>;
}

/** Selection and sort are controlled; the harness mirrors the consumer contract. */
function Harness({
  onSelect,
  initialSelectedId,
  initialSort = null,
  ...rest
}: Partial<DataDetailsWorkspaceProps> & {
  onSelect?: (row: DataDetailsRow) => void;
  initialSelectedId?: string;
  initialSort?: DataDetailsSort | null;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [sort, setSort] = useState<DataDetailsSort | null>(initialSort);

  return (
    <DataDetailsWorkspace
      title="Workspace"
      columns={columns}
      rows={rows}
      renderDetail={renderDetail}
      {...rest}
      sort={sort}
      onSortChange={(key) => setSort({ key, direction: "ascending" })}
      selectedId={selectedId}
      onSelect={(row) => {
        setSelectedId(row.id);
        onSelect?.(row);
      }}
    />
  );
}

describe("DataDetailsWorkspace", () => {
  it("renders the columns as headers and the rows as cells", () => {
    render(<Harness />);

    const table = screen.getByRole("table", { name: "Items" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Name",
      "Status",
      "Updated",
    ]);

    expect(within(table).getByRole("row", { name: /Item 01/ })).toBeInTheDocument();
    expect(within(table).getByText("Item 02")).toBeInTheDocument();
    expect(within(table).getByText("2026-02-14")).toBeInTheDocument();
  });

  it("renders a plain header (no dead button) when a sortable column has no handler", () => {
    render(
      <DataDetailsWorkspace
        columns={[
          { key: "name", header: "Name", sortable: true },
          { key: "status", header: "Status" },
        ]}
        rows={rows}
      />
    );

    const table = screen.getByRole("table", { name: "Items" });
    expect(within(table).queryByRole("button")).toBeNull();
  });

  it("calls onSortChange with the column key and reflects the controlled sort state", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    function SortHarness() {
      const [sort, setSort] = useState<DataDetailsSort | null>({
        key: "name",
        direction: "ascending",
      });
      return (
        <DataDetailsWorkspace
          columns={columns}
          rows={rows}
          sort={sort}
          onSortChange={(key) => {
            setSort({ key, direction: "descending" });
            onSortChange(key);
          }}
        />
      );
    }

    render(<SortHarness />);

    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    await user.click(within(nameHeader).getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name");

    const updatedNameHeader = screen.getByRole("columnheader", { name: /Name/ });
    expect(updatedNameHeader).toHaveAttribute("aria-sort", "descending");

    const statusHeader = screen.getByRole("columnheader", { name: /Status/ });
    expect(statusHeader).not.toHaveAttribute("aria-sort");
  });

  it("populates the detail panel when a row is selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Harness onSelect={onSelect} />);

    const detail = screen.getByRole("region", { name: "Details" });
    expect(detail).toHaveTextContent("Select an item to view details.");

    await user.click(screen.getByText("Item 01"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-01", name: "Item 01" })
    );
    expect(
      within(screen.getByRole("region", { name: "Details" })).getByText(
        "Details for Item 01"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Select an item to view details.")).toBeNull();

    await user.click(screen.getByText("Item 02"));
    expect(
      within(screen.getByRole("region", { name: "Details" })).getByText(
        "Details for Item 02"
      )
    ).toBeInTheDocument();
  });

  it("keeps typography identical between selected and unselected rows", () => {
    render(<Harness initialSelectedId="item-02" />);

    const selectedRow = screen.getByRole("row", { name: /Item 02/ });
    const unselectedRow = screen.getByRole("row", { name: /Item 01/ });

    // Selection is marked by a background, a start-edge indicator and the checked
    // radio — never by typography. A state-dependent font weight would re-measure
    // the auto-layout table and shift every column, so the two rows must carry the
    // exact same class list.
    expect(selectedRow).toHaveAttribute("data-selected");
    expect(unselectedRow).not.toHaveAttribute("data-selected");
    expect(selectedRow.className).toBe(unselectedRow.className);
    expect(selectedRow.className).not.toMatch(
      /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/
    );
  });

  it("shows the empty detail state and allows a custom empty renderer", () => {
    const { rerender } = render(<Harness />);

    expect(
      screen.getByRole("region", { name: "Details" })
    ).toHaveTextContent("Select an item to view details.");

    rerender(<Harness renderEmptyDetail={() => <p>Nothing selected.</p>} />);
    expect(
      screen.getByRole("region", { name: "Details" })
    ).toHaveTextContent("Nothing selected.");
    expect(screen.queryByText("Select an item to view details.")).toBeNull();
  });

  it("shows skeleton rows, aria-busy and a polite status while loading", () => {
    const { container } = render(<Harness loading />);

    const table = screen.getByRole("table", { name: "Items" });
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent(/loading items/i);

    // Stale rows are never shown while a request is in flight.
    expect(within(table).queryByText("Item 01")).toBeNull();
  });

  it("shows no skeleton rows when not loading", () => {
    const { container } = render(<Harness />);

    const table = screen.getByRole("table", { name: "Items" });
    expect(table).not.toHaveAttribute("aria-busy");
    expect(container.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(0);
  });

  it("renders an empty-table message when there are no rows", () => {
    render(<Harness rows={[]} />);

    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders an error alert with a working retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <Harness rows={[]} error="The list could not be loaded." onRetry={onRetry} />
    );

    expect(screen.getByText("The list could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByText("No items found.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("forwards the ref, merges className and honours a forced orientation", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DataDetailsWorkspace
        ref={ref}
        className="custom-workspace"
        data-testid="workspace-root"
        columns={columns}
        rows={rows}
        orientation="vertical"
      />
    );

    const root = screen.getByTestId("workspace-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-km-data-details-workspace");
    expect(root).toHaveAttribute("data-orientation", "vertical");
    expect(root).toHaveClass("custom-workspace");

    expect(screen.getByRole("separator", { name: "Resize list and details" })).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    );
  });

  it("has no detectable accessibility violations with a selected row", async () => {
    const { container } = render(
      <Harness initialSelectedId="item-02" initialSort={{ key: "name", direction: "ascending" }} />
    );

    await expectNoViolations(container);
  });
});
