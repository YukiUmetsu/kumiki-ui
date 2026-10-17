import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import TableDefault, {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/ui/table";

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

function SimpleTable() {
  return (
    <Table aria-label="Invoices">
      <TableCaption>Invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">INV-1</TableHead>
          <TableCell>$12.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>1 invoice</TableCell>
          <TableCell>$12.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe("Table", () => {
  it("renders a real table with row groups, headers, rows and cells", () => {
    const { container } = render(<SimpleTable />);

    const table = screen.getByRole("table", { name: "Invoices" });
    expect(table.tagName).toBe("TABLE");
    expect(table).toHaveAttribute("data-km-table", "root");
    expect(container.querySelector('[data-km-table="container"]')).toContainElement(table);

    expect(screen.getAllByRole("rowgroup")).toHaveLength(3);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("cell")).toHaveLength(3);
    expect(screen.getByRole("rowheader", { name: "INV-1" })).toBeInTheDocument();
    expect(screen.getByText("1 invoice")).toBeInTheDocument();
  });

  it("defaults header scope to col and allows row headers", () => {
    render(<SimpleTable />);

    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).toHaveAttribute("scope", "col");
    }
    expect(screen.getByRole("rowheader", { name: "INV-1" })).toHaveAttribute("scope", "row");
  });

  it("renders sortable headers as buttons and announces only the sorted column", async () => {
    const user = userEvent.setup();
    const onAccountSort = vi.fn();

    function Harness({ direction }: { direction: "ascending" | "descending" | "none" }) {
      return (
        <Table aria-label="Invoices">
          <TableHeader>
            <TableRow>
              <TableHead
                sortDirection={direction}
                onSortChange={onAccountSort}
              >
                Account
              </TableHead>
              <TableHead sortDirection="none" onSortChange={() => {}}>
                Total
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Northwind</TableCell>
              <TableCell>$1,240.00</TableCell>
              <TableCell>Paid</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    const { rerender } = render(<Harness direction="ascending" />);

    const accountHeader = screen.getByRole("columnheader", { name: /Account/ });
    const totalHeader = screen.getByRole("columnheader", { name: /Total/ });
    const statusHeader = screen.getByRole("columnheader", { name: "Status" });

    expect(accountHeader).toHaveAttribute("aria-sort", "ascending");
    expect(totalHeader).not.toHaveAttribute("aria-sort");
    expect(statusHeader).not.toHaveAttribute("aria-sort");

    // Only sortable headers get a button; plain headers stay plain.
    expect(within(statusHeader).queryByRole("button")).toBeNull();
    expect(within(accountHeader).getByRole("button", { name: /Account/ })).toBeInTheDocument();

    await user.click(within(accountHeader).getByRole("button", { name: /Account/ }));
    expect(onAccountSort).toHaveBeenCalledTimes(1);

    rerender(<Harness direction="descending" />);
    expect(screen.getByRole("columnheader", { name: /Account/ })).toHaveAttribute(
      "aria-sort",
      "descending"
    );

    rerender(<Harness direction="none" />);
    expect(screen.getByRole("columnheader", { name: /Account/ })).not.toHaveAttribute("aria-sort");
  });

  it("activates the sort control from the keyboard", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(
      <Table aria-label="Invoices">
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="none" onSortChange={onSortChange}>
              Account
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const button = screen.getByRole("button", { name: /Account/ });
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSortChange).toHaveBeenCalledTimes(2);
  });

  it("pins the header only when stickyHeader is enabled", () => {
    const { container, rerender } = render(
      <Table aria-label="Invoices">
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const plainHeader = container.querySelector("thead");
    expect(plainHeader).not.toBeNull();
    expect(plainHeader!.className).not.toContain("sticky");
    expect(plainHeader).not.toHaveAttribute("data-sticky");

    rerender(
      <Table aria-label="Invoices" stickyHeader maxHeight={240}>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const stickyHeader = container.querySelector("thead");
    expect(stickyHeader!.className).toContain("sticky");
    expect(stickyHeader!.className).toContain("bg-surface-subtle");
    expect(stickyHeader).toHaveAttribute("data-sticky");
    expect(container.querySelector('[data-km-table="container"]')).toHaveStyle({
      maxHeight: "240px",
    });
  });

  it("renders an empty state as one full-width row", () => {
    render(
      <Table aria-label="Invoices">
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}>No invoices yet.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const body = screen.getAllByRole("rowgroup")[1];
    expect(within(body).getAllByRole("row")).toHaveLength(1);

    const emptyCell = screen.getByRole("cell", { name: "No invoices yet." });
    expect(emptyCell).toHaveAttribute("colspan", "2");
  });

  it("forwards ref, className and table props to the table element", () => {
    const ref = createRef<HTMLTableElement>();

    render(
      <Table
        ref={ref}
        aria-label="Forwarded table"
        className="my-table"
        data-testid="table"
        id="invoices"
      >
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole("table", { name: "Forwarded table" });
    expect(ref.current).toBe(table);
    expect(table.className).toContain("my-table");
    expect(table.className).toContain("bg-surface");
    expect(table).toHaveAttribute("data-testid", "table");
    expect(table).toHaveAttribute("id", "invoices");
  });

  it("exposes selected and interactive row hooks without changing row semantics", () => {
    render(
      <Table aria-label="Invoices">
        <TableBody>
          <TableRow selected interactive>
            <TableCell>Selected</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Plain</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const selectedRow = screen.getByRole("row", { name: "Selected" });
    expect(selectedRow).toHaveAttribute("data-selected");
    expect(selectedRow).toHaveAttribute("data-interactive");
    // Native table rows must not claim aria-selected.
    expect(selectedRow).not.toHaveAttribute("aria-selected");

    const plainRow = screen.getByRole("row", { name: "Plain" });
    expect(plainRow).not.toHaveAttribute("data-selected");
    expect(plainRow).not.toHaveAttribute("data-interactive");
  });

  it("attaches every part to the compound export and named exports", () => {
    expect(TableDefault).toBe(Table);
    expect(Table.Caption).toBe(TableCaption);
    expect(Table.Header).toBe(TableHeader);
    expect(Table.Body).toBe(TableBody);
    expect(Table.Footer).toBe(TableFooter);
    expect(Table.Row).toBe(TableRow);
    expect(Table.Head).toBe(TableHead);
    expect(Table.Cell).toBe(TableCell);
  });

  it("supports long and CJK content", () => {
    render(
      <Table>
        <TableCaption>メンバー一覧</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>メンバー</TableHead>
            <TableHead>プロフィール</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableHead scope="row">山田 太郎</TableHead>
            <TableCell>
              https://example.com/people/taro-yamada-with-a-very-long-profile-slug
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("table", { name: "メンバー一覧" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "山田 太郎" })).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/people/taro-yamada-with-a-very-long-profile-slug")
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <Table stickyHeader maxHeight={240}>
        <TableCaption>Invoices, newest first</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="ascending" onSortChange={() => {}}>
              Account
            </TableHead>
            <TableHead sortDirection="none" onSortChange={() => {}}>
              Total
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow selected interactive>
            <TableHead scope="row">Northwind Studio</TableHead>
            <TableCell>$1,240.00</TableCell>
            <TableCell>Paid</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope="row">Lumen Works</TableHead>
            <TableCell>$320.00</TableCell>
            <TableCell>Pending</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>2 invoices</TableCell>
            <TableCell>$1,560.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    const results = await axe.run(container, AXE_OPTIONS);
    const problems = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(problems).toEqual([]);
  });
});
