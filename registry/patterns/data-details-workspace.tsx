import {
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { SplitPane } from "../ui/split-pane";
import { Table } from "../ui/table";

function joinClasses(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * One record shown as a table row and (optionally) rendered in the detail pane.
 * `id` must be unique and stable within `rows`.
 */
export type DataDetailsRow = { id: string; [key: string]: unknown };

/** Sort state of a column, mirroring the `Table.Head` contract. */
export type DataDetailsSortDirection = "ascending" | "descending" | "none";

/** Controlled single-column sort state. The consumer owns and updates it. */
export interface DataDetailsSort {
  /** `DataDetailsColumn.key` of the sorted column. */
  key: string;
  /** Current direction. `"none"` leaves the column unsorted until it is chosen. */
  direction: DataDetailsSortDirection;
}

/** Declarative description of one table column. */
export interface DataDetailsColumn {
  /** Stable identity; also the key looked up on each row for a default cell. */
  key: string;
  /** Visible column heading; also the sort control's accessible name. */
  header: ReactNode;
  /**
   * Offer a sort control in this column's header. Sorting only becomes
   * interactive when the workspace also receives `onSortChange`; without a
   * handler the header stays plain rather than rendering a dead button.
   * @default false
   */
  sortable?: boolean;
  /**
   * Custom cell renderer. When omitted the raw `row[column.key]` is rendered for
   * string/number/boolean/element values and left blank otherwise (pass a
   * renderer for anything structured).
   */
  render?: (row: DataDetailsRow) => ReactNode;
}

/** Consumer-overridable copy for built-in regions and statuses. */
export interface DataDetailsWorkspaceLabels {
  /** Accessible name of the table. @default "Items" */
  list?: string;
  /** Accessible name of the detail region. @default "Details" */
  detail?: string;
  /** Accessible name of the pane divider. @default "Resize list and details" */
  resize?: string;
  /** Polite message announced while `loading`. @default "Loading items…" */
  loading?: string;
  /** Retry action label inside the error alert. @default "Retry" */
  retry?: ReactNode;
  /** Title of the error alert. @default "Could not load items" */
  errorTitle?: ReactNode;
  /** Message shown in the detail pane with no selection. @default "Select an item to view details." */
  emptyDetail?: ReactNode;
  /** Message shown in the table body when there are no rows. @default "No items found." */
  emptyList?: ReactNode;
  /**
   * Accessible name of each row's selection control. `{label}` is replaced with
   * the row's first plain-text column value, so the control is announced as, for
   * example, "Select Item 01". @default "Select {label}"
   */
  selectRow?: string;
}

export interface DataDetailsWorkspaceProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "title"> {
  /** Region heading. Rendered as a serif page/region title when present. */
  title?: ReactNode;
  /** Optional supporting sentence shown beneath the heading. */
  description?: ReactNode;
  /** Columns to render, in order. The consumer owns the catalogue. */
  columns: DataDetailsColumn[];
  /** Rows to render, in order. The consumer owns the data and its ordering. */
  rows: DataDetailsRow[];
  /** Controlled sort state. Omit for a table that is not sorted. */
  sort?: DataDetailsSort | null;
  /**
   * Called with a column's `key` when its sort control is activated. Sorting is
   * controlled: the consumer updates `sort` in response.
   */
  onSortChange?: (key: string) => void;
  /**
   * `id` of the selected row. Selection is controlled and survives pane resize
   * and orientation changes because it never lives inside this component.
   */
  selectedId?: string;
  /** Called with the full row when it is selected by pointer or by its radio. */
  onSelect?: (row: DataDetailsRow) => void;
  /** Controlled size of the list pane, in percent. */
  primarySize?: number;
  /** Called with the next clamped size whenever the divider moves. */
  onPrimarySizeChange?: (size: number) => void;
  /** Smallest list-pane size, in percent. @default 20 */
  primaryMinSize?: number;
  /** Largest list-pane size, in percent. @default 80 */
  primaryMaxSize?: number;
  /**
   * Render the detail pane for the selected row. When omitted the pane shows the
   * empty-detail state even if a row is selected.
   */
  renderDetail?: (row: DataDetailsRow) => ReactNode;
  /** Replace the default empty-detail message. */
  renderEmptyDetail?: () => ReactNode;
  /**
   * Report an in-flight fetch. Replaces the table body with skeleton rows, marks
   * the table `aria-busy` and announces through a polite status region. Stale
   * rows are never shown while loading. @default false
   */
  loading?: boolean;
  /** Failure message. Rendered in a danger `Alert` with a retry action. */
  error?: ReactNode | null;
  /** Called when the error alert's retry action is pressed. */
  onRetry?: () => void;
  /** Message shown in the table body when there are no rows. */
  emptyMessage?: ReactNode;
  /**
   * Max height of the table's own scroll area, as a pixel number or CSS length.
   * Pair with the auto sticky header by giving the workspace a bounded height.
   * @default "100%"
   */
  maxHeight?: number | string;
  /**
   * Force the pane layout. Omit to stack vertically below 768px automatically.
   */
  orientation?: "horizontal" | "vertical";
  /** Consumer-overridable copy. */
  labels?: DataDetailsWorkspaceLabels;
  /** Extra classes merged onto the root element (consumer classes win). */
  className?: string;
}

const ROOT_CLASSES =
  "flex h-full min-h-0 w-full min-w-0 flex-col text-base text-foreground";

const HEADER_CLASSES = "mb-8 flex flex-col gap-1";
const TITLE_CLASSES = "font-serif text-heading font-normal tracking-heading text-foreground";
const DESCRIPTION_CLASSES =
  "max-w-prose font-sans text-body text-muted-foreground";

const SPLIT_CLASSES = "min-h-0 flex-1 rounded-surface border border-border";

const LIST_PANE_CLASSES = "min-h-0 min-w-0";
const DETAIL_PANE_CLASSES =
  "flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-auto p-4";

const DETAIL_EMPTY_CLASSES =
  "flex h-full min-h-0 items-center justify-center rounded-surface bg-surface-subtle p-6 text-center";

const DETAIL_BODY_CLASSES = "flex min-h-0 min-w-0 flex-col gap-4";

const DEFAULT_LIST_LABEL = "Items";
const DEFAULT_DETAIL_LABEL = "Details";
const DEFAULT_RESIZE_LABEL = "Resize list and details";
const DEFAULT_LOADING_LABEL = "Loading items…";
const DEFAULT_RETRY_LABEL = "Retry";
const DEFAULT_ERROR_TITLE = "Could not load items";
const DEFAULT_EMPTY_DETAIL = "Select an item to view details.";
const DEFAULT_EMPTY_LIST = "No items found.";
const DEFAULT_SELECT_ROW = "Select {label}";
const DEFAULT_PRIMARY_SIZE = 40;
const DEFAULT_PRIMARY_MIN = 20;
const DEFAULT_PRIMARY_MAX = 80;
const STACK_BREAKPOINT = 768;
const SKELETON_ROWS = 3;

/**
 * Track a viewport breakpoint with `matchMedia`. Returns `false` when the API is
 * unavailable (for example under jsdom), so the layout degrades to the wide
 * horizontal arrangement instead of throwing.
 */
function useIsBelow(breakpoint: number): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [breakpoint]);

  return matches;
}

/** Default cell text for a column without a custom `render`. */
function renderCellValue(value: unknown): ReactNode {
  if (value == null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (isValidElement(value)) return value;
  return null;
}

/**
 * Best-effort human label for a row's selection control: the first column that
 * renders raw text. Falls back to the row id when every column uses a renderer.
 */
function deriveRowLabel(row: DataDetailsRow, columns: DataDetailsColumn[]): string {
  for (const column of columns) {
    if (column.render) continue;
    const value = row[column.key];
    if (typeof value === "string" && value.trim() !== "") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return row.id;
}

/** Token-driven styling for the per-row radio that makes selection keyboard-operable. */
const ROW_SELECT_CLASSES = joinClasses(
  "size-4 shrink-0 cursor-pointer accent-primary align-middle",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
);

/**
 * Sortable list + detail workspace.
 *
 * The list is the canonical `Table` (semantic `<table>`, sticky header, its own
 * horizontal/vertical overflow) placed in the primary pane of a `SplitPane`, so
 * the divider keeps its built-in pointer **and** keyboard resizing. The detail
 * pane renders whatever `renderDetail` returns for the selected row, or a
 * centred empty state. Because selection is controlled through `selectedId`, it
 * is never lost when the divider moves or the layout stacks on a narrow
 * viewport. Every selectable row also renders a radio input, so the same
 * selection is reachable and committed entirely by keyboard, and the selected
 * row stays marked by a heavier weight and the checked radio dot rather than by
 * colour alone.
 *
 * Both panes keep `min-h-0 min-w-0 overflow-auto`, so long identifiers, CJK
 * values and narrow widths scroll instead of clipping. While `loading` the body
 * is replaced by skeleton rows and the table is marked `aria-busy`, and a polite
 * status region announces progress — a new request never shows stale rows. An
 * `error` renders a danger `Alert` with an optional retry action in place of the
 * rows. All colours, radii, spacing and motion come from semantic tokens, and
 * the detail pane's entrance fade is suppressed under reduced motion. `ref`,
 * `className` and arbitrary div props are forwarded to the root.
 */
const DataDetailsWorkspace = forwardRef<HTMLDivElement, DataDetailsWorkspaceProps>(
  function DataDetailsWorkspace(
    {
      title,
      description,
      columns,
      rows,
      sort = null,
      onSortChange,
      selectedId,
      onSelect,
      primarySize,
      onPrimarySizeChange,
      primaryMinSize,
      primaryMaxSize,
      renderDetail,
      renderEmptyDetail,
      loading = false,
      error = null,
      onRetry,
      emptyMessage,
      maxHeight = "100%",
      orientation,
      labels,
      className,
      ...props
    },
    ref
  ) {
    const titleId = useId();
    const selectionName = useId();
    const reducedMotion = useReducedMotion();
    const stacked = useIsBelow(STACK_BREAKPOINT);

    const effectiveOrientation =
      orientation ?? (stacked ? "vertical" : "horizontal");

    const listLabel = labels?.list ?? DEFAULT_LIST_LABEL;
    const detailLabel = labels?.detail ?? DEFAULT_DETAIL_LABEL;
    const resizeLabel = labels?.resize ?? DEFAULT_RESIZE_LABEL;
    const loadingLabel = labels?.loading ?? DEFAULT_LOADING_LABEL;
    const retryLabel = labels?.retry ?? DEFAULT_RETRY_LABEL;
    const errorTitle = labels?.errorTitle ?? DEFAULT_ERROR_TITLE;
    const emptyDetailLabel = labels?.emptyDetail ?? DEFAULT_EMPTY_DETAIL;
    const emptyListLabel = labels?.emptyList ?? DEFAULT_EMPTY_LIST;
    const selectRowTemplate = labels?.selectRow ?? DEFAULT_SELECT_ROW;

    const hasHeader = title != null || description != null;
    const hasError = error != null && error !== "";
    const isSelectable = onSelect != null;
    const columnCount = Math.max(columns.length, 1);

    const selectedRow = useMemo(
      () => (selectedId == null ? undefined : rows.find((row) => row.id === selectedId)),
      [rows, selectedId]
    );

    const handleRowSelect = useCallback(
      (row: DataDetailsRow) => {
        onSelect?.(row);
      },
      [onSelect]
    );

    const detailContent =
      selectedRow != null && renderDetail != null ? renderDetail(selectedRow) : null;
    const hasDetail = selectedRow != null && renderDetail != null;

    const listPane = (
      <div data-part="list" className={LIST_PANE_CLASSES}>
        <Table
          aria-label={listLabel}
          aria-busy={loading || undefined}
          stickyHeader
          maxHeight={maxHeight}
        >
          <Table.Header>
            <Table.Row>
              {columns.map((column) => {
                const isSortedColumn =
                  sort?.key === column.key && sort.direction !== "none";
                const sortable = column.sortable === true && onSortChange != null;
                return (
                  <Table.Head
                    key={column.key}
                    sortDirection={
                      sortable
                        ? isSortedColumn
                          ? sort.direction
                          : "none"
                        : undefined
                    }
                    onSortChange={
                      sortable ? () => onSortChange?.(column.key) : undefined
                    }
                  >
                    {column.header}
                  </Table.Head>
                );
              })}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {hasError ? (
              <Table.Row>
                <Table.Cell colSpan={columnCount} data-part="error">
                  <Alert
                    variant="danger"
                    live="polite"
                    title={errorTitle}
                    action={
                      onRetry ? (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                          {retryLabel}
                        </Button>
                      ) : undefined
                    }
                  >
                    {error}
                  </Alert>
                </Table.Cell>
              </Table.Row>
            ) : loading ? (
              Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <Table.Row key={`skeleton-${index}`} data-part="skeleton-row">
                  {columns.map((column) => (
                    <Table.Cell key={column.key} data-part="skeleton-cell">
                      <Skeleton shape="text" />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={columnCount} data-part="empty">
                  {emptyMessage ?? emptyListLabel}
                </Table.Cell>
              </Table.Row>
            ) : (
              rows.map((row) => {
                const selected = row.id === selectedId;
                const rowLabel = deriveRowLabel(row, columns);
                return (
                  <Table.Row
                    key={row.id}
                    selected={selected}
                    interactive={isSelectable}
                    data-row-id={row.id}
                    className={selected ? "font-medium" : undefined}
                    onClick={
                      isSelectable ? () => handleRowSelect(row) : undefined
                    }
                  >
                    {columns.map((column, columnIndex) => (
                      <Table.Cell key={column.key} data-part="cell">
                        <span
                          data-part="cell-value"
                          className="flex items-center gap-2"
                        >
                          {isSelectable && columnIndex === 0 ? (
                            <input
                              type="radio"
                              data-part="select"
                              name={selectionName}
                              value={row.id}
                              checked={selected}
                              onChange={() => handleRowSelect(row)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={selectRowTemplate.replace(
                                "{label}",
                                rowLabel
                              )}
                              className={ROW_SELECT_CLASSES}
                            />
                          ) : null}
                          <span className="min-w-0 break-words">
                            {renderCellValue(
                              column.render ? column.render(row) : row[column.key]
                            )}
                          </span>
                        </span>
                      </Table.Cell>
                    ))}
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>
      </div>
    );

    const detailPane = (
      <section
        data-part="detail"
        aria-label={detailLabel}
        tabIndex={-1}
        className={DETAIL_PANE_CLASSES}
      >
        {hasDetail ? (
          <motion.div
            key={selectedRow.id}
            data-part="detail-body"
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={DETAIL_BODY_CLASSES}
          >
            {detailContent}
          </motion.div>
        ) : (
          <div data-part="detail-empty" className={DETAIL_EMPTY_CLASSES}>
            {renderEmptyDetail ? (
              renderEmptyDetail()
            ) : (
              <p className="text-body-sm text-muted-foreground">{emptyDetailLabel}</p>
            )}
          </div>
        )}
      </section>
    );

    return (
      <div
        ref={ref}
        data-km-data-details-workspace=""
        data-loading={loading ? "" : undefined}
        data-error={hasError ? "" : undefined}
        data-orientation={effectiveOrientation}
        data-has-selection={selectedRow != null ? "" : undefined}
        className={joinClasses(ROOT_CLASSES, className)}
        {...props}
      >
        <div role="status" aria-live="polite" className="sr-only">
          {loading ? loadingLabel : ""}
        </div>

        {hasHeader ? (
          <div data-part="header" className={HEADER_CLASSES}>
            {title != null ? (
              <h2 id={titleId} data-part="title" className={TITLE_CLASSES}>
                {title}
              </h2>
            ) : null}
            {description != null ? (
              <p data-part="description" className={DESCRIPTION_CLASSES}>
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <SplitPane
          className={SPLIT_CLASSES}
          aria-label={resizeLabel}
          orientation={effectiveOrientation}
          unit="percent"
          primarySize={primarySize}
          defaultPrimarySize={DEFAULT_PRIMARY_SIZE}
          onPrimarySizeChange={onPrimarySizeChange}
          minPrimarySize={primaryMinSize ?? DEFAULT_PRIMARY_MIN}
          maxPrimarySize={primaryMaxSize ?? DEFAULT_PRIMARY_MAX}
          primary={listPane}
          secondary={detailPane}
        />
      </div>
    );
  }
);

DataDetailsWorkspace.displayName = "DataDetailsWorkspace";

export { DataDetailsWorkspace };
export default DataDetailsWorkspace;
