import { createContext, forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef } from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Sort state announced for a column. `"none"` marks a sortable column that is
 * not currently the sorted one; `aria-sort` is only emitted for the sorted
 * column, as required for a single-sort table.
 */
export type TableSortDirection = "ascending" | "descending" | "none";

const TableStickyContext = createContext(false);

const CONTAINER_CLASSES = "w-full max-w-full overflow-x-auto overflow-y-auto";

const TABLE_CLASSES = "w-full border-collapse bg-surface text-start text-sm text-foreground";

const CAPTION_CLASSES = "px-4 pb-4 text-start text-sm text-muted-foreground";

const HEADER_CLASSES = "bg-surface-subtle text-sm text-muted-foreground";
const HEADER_STICKY_CLASSES = "sticky top-0 z-10";

const FOOTER_CLASSES = "bg-surface-subtle";

/**
 * Row separators live on the row so a full-width empty-state cell or a row of
 * skeleton cells still reads as one row. Hover is opt-in (`interactive`) and
 * selection is a background change, never colour alone.
 */
const ROW_CLASSES = [
  "border-b border-border transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "last:border-b-0",
  "data-[interactive]:hover:bg-surface-subtle",
  "data-[selected]:relative data-[selected]:bg-surface-subtle",
  "data-[selected]:before:absolute data-[selected]:before:inset-y-2 data-[selected]:before:start-0 data-[selected]:before:z-10 data-[selected]:before:w-0.5 data-[selected]:before:rounded-full data-[selected]:before:bg-checked",
].join(" ");

const HEAD_BASE_CLASSES = [
  "border-b border-border bg-surface-subtle text-start align-middle",
  "text-sm font-medium text-muted-foreground",
].join(" ");
const HEAD_PLAIN_CLASSES = "px-4 py-4";

/** The button fills the header cell so the whole column label is the hit area. */
const SORT_BUTTON_CLASSES = [
  "flex w-full items-center gap-2 px-4 py-4 text-start",
  "text-sm font-medium text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle",
].join(" ");

const CELL_CLASSES = "px-4 py-4 align-middle";

export interface TableProps extends ComponentPropsWithoutRef<"table"> {
  /**
   * Keep the header row pinned while the table body scrolls. The header is only
   * sticky inside the table's own scroll area, so bound it with `maxHeight`
   * (or the table only ever sticks while its own area scrolls).
   * @default false
   */
  stickyHeader?: boolean;
  /**
   * Maximum height of the scroll area, as a pixel number or any CSS length.
   * Pair it with `stickyHeader` to pin the header over a long body.
   */
  maxHeight?: number | string;
  /** Extra classes merged onto the `<table>` (consumer classes win). */
  className?: string;
}

export type TableCaptionProps = ComponentPropsWithoutRef<"caption">;
export type TableHeaderProps = ComponentPropsWithoutRef<"thead">;
export type TableBodyProps = ComponentPropsWithoutRef<"tbody">;
export type TableFooterProps = ComponentPropsWithoutRef<"tfoot">;

export interface TableRowProps extends ComponentPropsWithoutRef<"tr"> {
  /**
   * Selected-row visual hook. Sets `data-selected` and a subtle background; it
   * does not add `aria-selected` because that is invalid on a native table row.
   * @default false
   */
  selected?: boolean;
  /**
   * Hover visual hook for rows that lead somewhere. Sets `data-interactive`;
   * it does not make the row clickable or keyboard operable — wire the actual
   * action in a cell control.
   * @default false
   */
  interactive?: boolean;
}

export interface TableHeadProps extends ComponentPropsWithoutRef<"th"> {
  /**
   * Cell scope. Defaults to `"col"`; pass `"row"` for a row header.
   * @default "col"
   */
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  /**
   * Current sort state. `"ascending"`/`"descending"` emit `aria-sort` on the
   * `<th>`; `"none"` (or omitting it) leaves the attribute off. Sorting is
   * controlled: the consumer stores the direction and updates it in
   * `onSortChange`.
   */
  sortDirection?: TableSortDirection;
  /**
   * Called when the sort control is activated. Supplying it turns the header
   * into a sortable column with a native `<button>`; without it the cell is a
   * plain `th` and no button is rendered.
   */
  onSortChange?: () => void;
}

export type TableCellProps = ComponentPropsWithoutRef<"td">;

const TableRoot = forwardRef<HTMLTableElement, TableProps>(function Table(
  { stickyHeader = false, maxHeight, className, children, ...props },
  ref
) {
  const containerStyle =
    maxHeight == null
      ? undefined
      : { maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight };

  return (
    <div data-km-table="container" className={CONTAINER_CLASSES} style={containerStyle}>
      <TableStickyContext.Provider value={stickyHeader}>
        <table
          ref={ref}
          data-km-table="root"
          className={joinClasses(TABLE_CLASSES, className)}
          {...props}
        >
          {children}
        </table>
      </TableStickyContext.Provider>
    </div>
  );
});

TableRoot.displayName = "Table";

/** Optional table caption; it is also the table's accessible name. */
const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
  { className, children, ...props },
  ref
) {
  return (
    <caption
      ref={ref}
      data-part="caption"
      className={joinClasses(CAPTION_CLASSES, className)}
      {...props}
    >
      {children}
    </caption>
  );
});

TableCaption.displayName = "Table.Caption";

/** `<thead>` row group; pinned above the body when the table is `stickyHeader`. */
const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(function TableHeader(
  { className, children, ...props },
  ref
) {
  const stickyHeader = useContext(TableStickyContext);

  return (
    <thead
      ref={ref}
      data-part="header"
      data-sticky={stickyHeader ? "" : undefined}
      className={joinClasses(
        HEADER_CLASSES,
        stickyHeader && HEADER_STICKY_CLASSES,
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
});

TableHeader.displayName = "Table.Header";

/** `<tbody>` row group. */
const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody(
  { className, children, ...props },
  ref
) {
  return (
    <tbody
      ref={ref}
      data-part="body"
      className={className}
      {...props}
    >
      {children}
    </tbody>
  );
});

TableBody.displayName = "Table.Body";

/** `<tfoot>` row group for totals or summaries. */
const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(function TableFooter(
  { className, children, ...props },
  ref
) {
  return (
    <tfoot
      ref={ref}
      data-part="footer"
      className={joinClasses(FOOTER_CLASSES, className)}
      {...props}
    >
      {children}
    </tfoot>
  );
});

TableFooter.displayName = "Table.Footer";

/** Table row with optional selected/interactive visual hooks. */
const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected = false, interactive = false, className, children, ...props },
  ref
) {
  return (
    <tr
      ref={ref}
      data-part="row"
      data-selected={selected ? "" : undefined}
      data-interactive={interactive ? "" : undefined}
      className={joinClasses(ROW_CLASSES, className)}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = "Table.Row";

/**
 * Arrow indicating the active sort direction. The neutral double arrow marks a
 * sortable column that is not currently sorted. It is decorative: `aria-sort`
 * on the header cell carries the state for assistive technology.
 */
function SortIcon({ direction }: { direction?: TableSortDirection }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 12"
      className="size-3 shrink-0"
      fill="currentColor"
    >
      {direction === "ascending" ? (
        <path d="M6 1.5 10 7H2Z" />
      ) : direction === "descending" ? (
        <path d="M6 10.5 2 5h8Z" />
      ) : (
        <>
          <path d="M6 1.5 8.8 5H3.2Z" />
          <path d="M6 10.5 3.2 7h5.6Z" />
        </>
      )}
    </svg>
  );
}

/**
 * Header cell. Defaults to `scope="col"`; pass `scope="row"` for a row header.
 * Providing `onSortChange` renders a native sort button and exposes
 * `aria-sort` only while the column is the sorted one.
 */
const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { scope = "col", sortDirection, onSortChange, className, children, ...props },
  ref
) {
  const isSortable = onSortChange !== undefined;
  const isSorted = sortDirection === "ascending" || sortDirection === "descending";

  return (
    <th
      ref={ref}
      scope={scope}
      aria-sort={isSortable && isSorted ? sortDirection : undefined}
      data-part="head"
      data-sortable={isSortable ? "" : undefined}
      data-sort-direction={isSortable && isSorted ? sortDirection : undefined}
      className={joinClasses(
        HEAD_BASE_CLASSES,
        isSortable ? "p-0" : HEAD_PLAIN_CLASSES,
        className
      )}
      {...props}
    >
      {isSortable ? (
        <button
          type="button"
          onClick={onSortChange}
          data-part="sort-button"
          className={joinClasses(SORT_BUTTON_CLASSES, isSorted && "text-foreground")}
        >
          <span>{children}</span>
          <SortIcon direction={sortDirection} />
        </button>
      ) : (
        children
      )}
    </th>
  );
});

TableHead.displayName = "Table.Head";

/** Standard data cell. */
const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, children, ...props },
  ref
) {
  return (
    <td
      ref={ref}
      data-part="cell"
      className={joinClasses(CELL_CLASSES, className)}
      {...props}
    >
      {children}
    </td>
  );
});

TableCell.displayName = "Table.Cell";

/**
 * Semantic table foundation.
 *
 * Renders a real `<table>` inside a horizontally scrollable container, so wide
 * content (long identifiers, CJK, many columns) scrolls instead of clipping,
 * even at 320px. Column headers default to `scope="col"`; supplying
 * `onSortChange` on a `Table.Head` turns it into a native sort button with
 * `aria-sort` on the sorted column. `stickyHeader` pins the header inside the
 * table's own scroll area, bounded by `maxHeight`.
 *
 * Empty and loading states are composed, not hidden: render one full-width row
 * (`<Table.Cell colSpan={…}>`) for an empty table, and skeleton rows marked
 * `aria-busy` for loading. See `docs/component-specs/table-spec.md`.
 */
const Table = Object.assign(TableRoot, {
  Caption: TableCaption,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
});

export {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
};
export default Table;
