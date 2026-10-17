import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { Breadcrumbs } from "../ui/breadcrumbs";
import { Input } from "../ui/field-input";
import { DropdownMenu } from "../ui/dropdown-menu";
import type { DropdownMenuEntry } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Badge } from "../ui/badge";
import { Alert } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * One node in the explorer hierarchy. The consumer owns the tree and every
 * action; the pattern renders the rows, keyboard model and states.
 */
export interface ResourceItem {
  /** Stable, unique identity. Used as the React key and to match selection. */
  id: string;
  /** Visible row text. Also the type-ahead target and the accessible name. */
  label: string;
  /** Optional leading glyph. Rendered `aria-hidden`, never the row's name. */
  icon?: ReactNode;
  /** Child nodes. Presence (non-empty) makes the row an expandable parent. */
  children?: ResourceItem[];
  /** Keep the row visible but non-selectable and skipped by keyboard navigation. @default false */
  disabled?: boolean;
}

/** Direction of a keyboard reorder request (the drag-and-drop alternative). */
export type ResourceMoveDirection = "up" | "down" | "top" | "bottom";

/**
 * Localisable copy and messages. Every field is optional; the defaults are
 * neutral and domain-free.
 */
export interface ResourceExplorerLabels {
  /** Accessible name of the `role="tree"` region. @default "Items" */
  tree?: string;
  /** Accessible name of the filter field. @default "Filter items" */
  filter?: string;
  /** Placeholder for the filter field. @default "Filter items…" */
  filterPlaceholder?: string;
  /** Label of the button that clears an active filter. @default "Clear filter" */
  clearFilter?: string;
  /** Label of the toolbar create action. @default "New item" */
  create?: string;
  /** Prefix for a row action trigger's accessible name. @default "More actions" */
  moreActions?: string;
  /** Header of the per-row actions menu. @default "Actions" */
  actions?: string;
  /** Label of the rename menu item. @default "Rename" */
  rename?: string;
  /** Accessible name of the inline rename field (prefixed with the old label). @default "Rename" */
  renameField?: string;
  /** Label of the move-up action. @default "Move up" */
  moveUp?: string;
  /** Label of the move-down action. @default "Move down" */
  moveDown?: string;
  /** Label of the move-to-top action. @default "Move to top" */
  moveToTop?: string;
  /** Label of the move-to-bottom action. @default "Move to bottom" */
  moveToBottom?: string;
  /** Label of the create-child action. @default "New item inside" */
  newChild?: string;
  /** Label of the delete action. @default "Delete" */
  delete?: string;
  /** Label of the undo affordance. @default "Undo" */
  undo?: string;
  /** Accessible name of the undo-dismiss button. @default "Dismiss" */
  undoDismiss?: string;
  /** Copy shown when the root has no items. @default "No items found." */
  emptyRoot?: ReactNode;
  /** Copy shown when a filter matches nothing. @default "No items found. Try removing a filter." */
  noMatch?: ReactNode;
  /** Text announced while loading. @default "Loading items…" */
  loadingText?: string;
  /** Label of the retry action on error. @default "Retry" */
  retry?: string;
  /** Message prefix after a keyboard reorder. @default "Moved" */
  movedPrefix?: string;
  /** Message prefix after a delete. @default "Deleted" */
  deletedPrefix?: string;
}

export interface ResourceExplorerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  /** The hierarchy to render. The consumer owns order, nesting and mutations. */
  items: ResourceItem[];
  /**
   * Controlled selected row id. Omit to let the explorer keep the selection
   * internally while still reporting it through `onSelect`.
   * @default undefined
   */
  selectedId?: string | null;
  /**
   * Controlled set of expanded row ids. Omit to let the explorer keep expansion
   * internally while still reporting toggles through `onToggle`.
   * @default undefined
   */
  expandedIds?: string[];
  /** Called with the activated row. Selection and expansion are independent. */
  onSelect?: (item: ResourceItem) => void;
  /** Called with the row whose expansion was toggled by pointer or keyboard. */
  onToggle?: (item: ResourceItem) => void;
  /** Called with the row and its next label after an inline rename commits. */
  onRename?: (item: ResourceItem, newLabel: string) => void;
  /** Called with a keyboard reorder request for a row. */
  onMove?: (item: ResourceItem, direction: ResourceMoveDirection) => void;
  /** Called when the delete action runs for a row. */
  onDelete?: (item: ResourceItem) => void;
  /** Called with the parent id (or `null` for the root) of a create request. */
  onCreate?: (parentId: string | null) => void;
  /** Called when the undo affordance for the last reorder/delete is used. */
  onUndo?: () => void;
  /**
   * Controlled filter text. Omit to let the explorer keep the query internally
   * while still reporting every change through `onFilterChange`.
   * @default undefined
   */
  filter?: string;
  /** Called with the next filter value on every keystroke. */
  onFilterChange?: (filter: string) => void;
  /**
   * Show honest skeleton rows instead of stale content and announce via a
   * polite status region. @default false
   */
  loading?: boolean;
  /**
   * Recoverable load/action error. Rendered inside a danger `Alert`; pair with
   * `onRetry` to offer recovery. @default null
   */
  error?: ReactNode | null;
  /** Called when the error Retry action is pressed. */
  onRetry?: () => void;
  /** Localisable copy. Unspecified fields fall back to neutral defaults. */
  labels?: ResourceExplorerLabels;
  /** Extra classes merged onto the root element (consumer classes win). */
  className?: string;
}

interface FlatNode {
  item: ResourceItem;
  /** Zero-based depth; rendered as `aria-level` at 1-based value. */
  level: number;
  parentId: string | null;
}

interface PendingUndo {
  kind: "move" | "delete";
  label: string;
}

const DEFAULT_LABELS = {
  tree: "Items",
  filter: "Filter items",
  filterPlaceholder: "Filter items…",
  clearFilter: "Clear filter",
  create: "New item",
  moreActions: "More actions",
  actions: "Actions",
  rename: "Rename",
  renameField: "Rename",
  moveUp: "Move up",
  moveDown: "Move down",
  moveToTop: "Move to top",
  moveToBottom: "Move to bottom",
  newChild: "New item inside",
  delete: "Delete",
  undo: "Undo",
  undoDismiss: "Dismiss",
  emptyRoot: "No items found.",
  noMatch: "No items found. Try removing a filter.",
  loadingText: "Loading items…",
  retry: "Retry",
  movedPrefix: "Moved",
  deletedPrefix: "Deleted",
} satisfies Required<ResourceExplorerLabels>;

const TYPEAHEAD_TIMEOUT = 600;
const SKELETON_WIDTHS = ["72%", "56%", "64%", "48%"];

const MOTION_TRANSITION: Transition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] };
const NO_MOTION_TRANSITION: Transition = { duration: 0 };

/**
 * Flatten the hierarchy into the list of currently visible rows, honouring the
 * expansion predicate. `forceExpand` is used while a filter is active so every
 * kept ancestor of a match is open.
 */
function flattenTree(
  items: ResourceItem[],
  isExpanded: (id: string) => boolean,
  forceExpand: boolean,
  level = 0,
  parentId: string | null = null,
  out: FlatNode[] = []
): FlatNode[] {
  for (const item of items) {
    out.push({ item, level, parentId });
    const hasChildren = item.children != null && item.children.length > 0;
    if (hasChildren && (forceExpand || isExpanded(item.id))) {
      flattenTree(
        item.children as ResourceItem[],
        isExpanded,
        forceExpand,
        level + 1,
        item.id,
        out
      );
    }
  }
  return out;
}

/**
 * Keep a node when it matches, or when any descendant matches; a kept ancestor
 * keeps only the matching branches, so the filtered view never shows noise.
 */
function pruneTree(items: ResourceItem[], needle: string): ResourceItem[] {
  const out: ResourceItem[] = [];
  for (const item of items) {
    const children = item.children ? pruneTree(item.children, needle) : [];
    const selfMatch = item.label.toLowerCase().includes(needle);
    if (selfMatch || children.length > 0) {
      out.push({ ...item, children: children.length > 0 ? children : undefined });
    }
  }
  return out;
}

/** The siblings of a row (including itself) at any depth, or `null` if absent. */
function findSiblings(items: ResourceItem[], id: string): ResourceItem[] | null {
  if (items.some((item) => item.id === id)) return items;
  for (const item of items) {
    if (item.children) {
      const found = findSiblings(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** The ancestor trail from a root down to `id`, or `null` when not found. */
function findPath(
  items: ResourceItem[],
  id: string,
  trail: ResourceItem[] = []
): ResourceItem[] | null {
  for (const item of items) {
    const next = [...trail, item];
    if (item.id === id) return next;
    if (item.children) {
      const found = findPath(item.children, id, next);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Hierarchical browser for a tree of consumer-owned items.
 *
 * Kumiki has no tree primitive and drag-and-drop is deferred by the catalog, so
 * this pattern implements the accessibility model itself and offers a keyboard
 * **alternative** to dragging. The container is a real `role="tree"` carrying an
 * accessible name; every row is a `role="treeitem"` with `aria-level`,
 * `aria-selected` and, for parents, `aria-expanded`. Focus uses a roving
 * `tabindex`: exactly one red row is tabbable at a time.
 *
 * Keyboard: Up/Down move between visible, enabled rows; Right expands a
 * collapsed parent (or moves into its first child); Left collapses an expanded
 * parent (or moves to its parent); Home/End jump to the first/last row; Enter
 * selects; F2 starts an inline rename; Shift+F10 / the Menu key opens the row's
 * actions menu; printable characters run type-ahead over labels.
 *
 * Reordering is exposed as four actions — Move up / Move down / Move to top /
 * Move to bottom — in each row's `DropdownMenu`, with edge actions disabled at
 * the ends. After a reorder or delete an inline Undo affordance appears (role
 * `status`) and calls `onUndo`; the consumer remains the single source of truth
 * for the data.
 *
 * States are honest: `loading` swaps in `Skeleton` rows and announces politely
 * instead of showing stale data; an empty root offers a create action; a filter
 * with no matches offers a clear-filter action; `error` renders a danger
 * `Alert` with an optional retry. The filter keeps every ancestor of a match
 * visible and expands it, so hierarchy context survives filtering.
 *
 * Data, copy and actions are supplied entirely by the consumer through props and
 * `labels`; the pattern never fabricates items, counts of items it does not
 * have, or progress.
 */
const ResourceExplorerRoot = forwardRef<HTMLDivElement, ResourceExplorerProps>(
  function ResourceExplorer(
    {
      items,
      selectedId,
      expandedIds,
      onSelect,
      onToggle,
      onRename,
      onMove,
      onDelete,
      onCreate,
      onUndo,
      filter,
      onFilterChange,
      loading = false,
      error = null,
      onRetry,
      labels,
      className,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) {
    const reducedMotion = useReducedMotion();
    const generatedId = useId();
    const copy = { ...DEFAULT_LABELS, ...labels };
    const transition = reducedMotion ? NO_MOTION_TRANSITION : MOTION_TRANSITION;

    const [internalSelected, setInternalSelected] = useState<string | null>(null);
    const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
      () => new Set()
    );
    const [internalFilter, setInternalFilter] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [menuItemId, setMenuItemId] = useState<string | null>(null);
    const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

    const selected = selectedId !== undefined ? selectedId : internalSelected;
    const filterValue = filter !== undefined ? filter : internalFilter;
    const trimmedFilter = filterValue.trim();
    const filterActive = trimmedFilter !== "";
    const needle = trimmedFilter.toLowerCase();

    const isItemExpanded = useCallback(
      (id: string): boolean =>
        expandedIds !== undefined
          ? expandedIds.includes(id)
          : internalExpanded.has(id),
      [expandedIds, internalExpanded]
    );

    const visibleItems = useMemo(() => {
      const tree = filterActive ? pruneTree(items, needle) : items;
      return flattenTree(tree, isItemExpanded, filterActive);
      // `isItemExpanded` is memoized on `expandedIds`/`internalExpanded`, so a
      // change to either re-flattens the visible list.
    }, [items, filterActive, needle, isItemExpanded]);

    const enabledVisible = useMemo(
      () => visibleItems.filter((node) => !node.item.disabled),
      [visibleItems]
    );

    const activeNode = useMemo(
      () =>
        enabledVisible.find((node) => node.item.id === activeId) ??
        enabledVisible[0] ??
        null,
      [enabledVisible, activeId]
    );
    const activeItemId = activeNode?.item.id ?? null;

    const selectedPath = useMemo(
      () => (selected != null ? findPath(items, selected) : null),
      [items, selected]
    );

    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const filterRef = useRef<HTMLInputElement | null>(null);
    const renameInputRef = useRef<HTMLInputElement | null>(null);
    const returnFocusRef = useRef<string | null>(null);
    const activeRenameRef = useRef<string | null>(null);
    const typeahead = useRef<{
      buffer: string;
      at: number;
      timer: ReturnType<typeof setTimeout> | null;
    }>({ buffer: "", at: 0, timer: null });

    useEffect(() => {
      const state = typeahead.current;
      return () => {
        if (state.timer) clearTimeout(state.timer);
      };
    }, []);

    useEffect(() => {
      if (renamingId && renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, [renamingId]);

    useEffect(() => {
      if (renamingId === null && returnFocusRef.current) {
        const id = returnFocusRef.current;
        returnFocusRef.current = null;
        const node = itemRefs.current.get(id);
        node?.focus();
      }
    }, [renamingId]);

    function focusNode(id: string): void {
      setActiveId(id);
      itemRefs.current.get(id)?.focus();
    }

    function toggleExpand(item: ResourceItem): void {
      if (item.disabled) return;
      setInternalExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      onToggle?.(item);
    }

    function selectItem(item: ResourceItem): void {
      if (item.disabled) return;
      if (selectedId === undefined) setInternalSelected(item.id);
      onSelect?.(item);
    }

    function startRename(item: ResourceItem): void {
      if (item.disabled || !onRename) return;
      activeRenameRef.current = item.id;
      setActiveId(item.id);
      setRenameValue(item.label);
      setRenamingId(item.id);
    }

    function commitRename(item: ResourceItem): void {
      if (activeRenameRef.current !== item.id) return;
      activeRenameRef.current = null;
      const next = renameValue.trim();
      returnFocusRef.current = item.id;
      setRenamingId(null);
      if (next !== "" && next !== item.label) onRename?.(item, next);
    }

    function cancelRename(item: ResourceItem): void {
      activeRenameRef.current = null;
      returnFocusRef.current = item.id;
      setRenamingId(null);
    }

    function moveItem(item: ResourceItem, direction: ResourceMoveDirection): void {
      onMove?.(item, direction);
      setPendingUndo({ kind: "move", label: item.label });
    }

    function removeItem(item: ResourceItem): void {
      onDelete?.(item);
      setPendingUndo({ kind: "delete", label: item.label });
    }

    function handleFilterChange(value: string): void {
      if (filter === undefined) setInternalFilter(value);
      onFilterChange?.(value);
    }

    function clearFilter(): void {
      if (filter === undefined) setInternalFilter("");
      onFilterChange?.("");
      filterRef.current?.focus();
    }

    function moveActiveBy(step: 1 | -1): void {
      if (enabledVisible.length === 0) return;
      const currentIndex = activeNode
        ? enabledVisible.findIndex((node) => node.item.id === activeNode.item.id)
        : -1;
      const nextIndex =
        currentIndex === -1
          ? step === 1
            ? 0
            : enabledVisible.length - 1
          : Math.min(Math.max(currentIndex + step, 0), enabledVisible.length - 1);
      focusNode(enabledVisible[nextIndex].item.id);
    }

    function moveToEdge(edge: "first" | "last"): void {
      if (enabledVisible.length === 0) return;
      const target =
        edge === "first"
          ? enabledVisible[0]
          : enabledVisible[enabledVisible.length - 1];
      focusNode(target.item.id);
    }

    function handleTypeahead(key: string): void {
      const state = typeahead.current;
      const now = Date.now();
      const withinWindow = now - state.at < TYPEAHEAD_TIMEOUT;
      const buffer = withinWindow ? state.buffer + key : key;
      state.buffer = buffer;
      state.at = now;
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.buffer = "";
        state.at = 0;
        state.timer = null;
      }, TYPEAHEAD_TIMEOUT);

      const query = buffer.toLowerCase();
      const matches = enabledVisible.filter((node) =>
        node.item.label.toLowerCase().startsWith(query)
      );
      if (matches.length === 0) return;
      const currentIndex = activeNode
        ? enabledVisible.findIndex((node) => node.item.id === activeNode.item.id)
        : -1;
      const next =
        matches.find(
          (node) =>
            enabledVisible.findIndex(
              (candidate) => candidate.item.id === node.item.id
            ) > currentIndex
        ) ?? matches[0];
      focusNode(next.item.id);
    }

    function handleTreeKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
      if (renamingId !== null) return;
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      const nativeEvent = event.nativeEvent;
      if (nativeEvent.isComposing || event.key === "Process") return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActiveBy(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActiveBy(-1);
          break;
        case "Home":
          event.preventDefault();
          moveToEdge("first");
          break;
        case "End":
          event.preventDefault();
          moveToEdge("last");
          break;
        case "ArrowRight": {
          event.preventDefault();
          const node = activeNode;
          if (node === null) break;
          const hasChildren =
            node.item.children != null && node.item.children.length > 0;
          const expandedNow =
            hasChildren && (filterActive || isItemExpanded(node.item.id));
          if (hasChildren && !expandedNow) {
            toggleExpand(node.item);
          } else if (hasChildren) {
            const firstChild = enabledVisible.find(
              (candidate) => candidate.parentId === node.item.id
            );
            if (firstChild) focusNode(firstChild.item.id);
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          const node = activeNode;
          if (node === null) break;
          const hasChildren =
            node.item.children != null && node.item.children.length > 0;
          const expandedNow =
            hasChildren && (filterActive || isItemExpanded(node.item.id));
          if (hasChildren && expandedNow && !filterActive) {
            toggleExpand(node.item);
          } else if (node.parentId) {
            focusNode(node.parentId);
          }
          break;
        }
        case "Enter":
          event.preventDefault();
          if (activeNode) selectItem(activeNode.item);
          break;
        case "F2":
          event.preventDefault();
          if (activeNode) startRename(activeNode.item);
          break;
        case "ContextMenu":
        case "F10": {
          if (event.key === "F10" && !event.shiftKey) break;
          if (activeNode) {
            event.preventDefault();
            setMenuItemId(activeNode.item.id);
          }
          break;
        }
        default:
          if (
            event.key.length === 1 &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            event.preventDefault();
            handleTypeahead(event.key);
          }
      }
    }

    const hasActions =
      onRename !== undefined ||
      onMove !== undefined ||
      onCreate !== undefined ||
      onDelete !== undefined;

    function menuEntries(item: ResourceItem): DropdownMenuEntry[] {
      const siblings = findSiblings(items, item.id) ?? [];
      const index = siblings.findIndex((sibling) => sibling.id === item.id);
      const atTop = index <= 0;
      const atBottom = index === siblings.length - 1;
      const entries: DropdownMenuEntry[] = [];

      if (onRename) {
        entries.push({
          id: "rename",
          label: copy.rename,
          onSelect: () => startRename(item),
        });
      }
      if (onMove) {
        entries.push({ id: "move-separator", separator: true });
        entries.push({
          id: "move-up",
          label: copy.moveUp,
          disabled: atTop,
          onSelect: () => moveItem(item, "up"),
        });
        entries.push({
          id: "move-down",
          label: copy.moveDown,
          disabled: atBottom,
          onSelect: () => moveItem(item, "down"),
        });
        entries.push({
          id: "move-top",
          label: copy.moveToTop,
          disabled: atTop,
          onSelect: () => moveItem(item, "top"),
        });
        entries.push({
          id: "move-bottom",
          label: copy.moveToBottom,
          disabled: atBottom,
          onSelect: () => moveItem(item, "bottom"),
        });
      }
      if (onCreate || onDelete) {
        entries.push({ id: "lifecycle-separator", separator: true });
        if (onCreate) {
          entries.push({
            id: "create-child",
            label: copy.newChild,
            onSelect: () => onCreate(item.id),
          });
        }
        if (onDelete) {
          entries.push({
            id: "delete",
            label: copy.delete,
            destructive: true,
            onSelect: () => removeItem(item),
          });
        }
      }
      return entries;
    }

    const showEmptyRoot =
      error == null && !loading && items.length === 0;

    const showTree =
      error == null &&
      !loading &&
      items.length > 0 &&
      visibleItems.length > 0;

    const undoMessage =
      pendingUndo == null
        ? ""
        : `${pendingUndo.kind === "move" ? copy.movedPrefix : copy.deletedPrefix} “${pendingUndo.label}”`;

    return (
      <div
        ref={ref}
        data-km-resource-explorer=""
        data-loading={loading ? "" : undefined}
        aria-busy={loading || undefined}
        className={joinClasses(
          "flex w-full min-w-0 flex-col gap-4 text-base text-foreground",
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-col gap-3">
          {selectedPath ? (
            <Breadcrumbs
              data-part="breadcrumbs"
              items={selectedPath.map((node) => ({ label: node.label }))}
              maxItems={4}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={filterRef}
              id={`${generatedId}-filter`}
              type="search"
              data-part="filter"
              aria-label={copy.filter}
              placeholder={copy.filterPlaceholder}
              autoComplete="off"
              value={filterValue}
              onChange={(event) => handleFilterChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && filterValue !== "") {
                  event.preventDefault();
                  clearFilter();
                }
              }}
              className="min-w-0 flex-1 sm:max-w-xs"
            />
            {onCreate && !showEmptyRoot ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-part="create"
                icon={<PlusIcon className="size-4" />}
                onClick={() => onCreate(null)}
              >
                {copy.create}
              </Button>
            ) : null}
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          data-part="loading-status"
          className="sr-only"
        >
          {loading ? copy.loadingText : ""}
        </div>

        {error != null ? (
          <Alert
            variant="danger"
            live="polite"
            data-part="error"
            action={
              onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                >
                  {copy.retry}
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div
            data-part="skeleton"
            aria-hidden="true"
            className="flex flex-col gap-1 rounded-surface border border-border bg-surface p-2"
          >
            {SKELETON_WIDTHS.map((width, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex items-center gap-2 px-2 py-2"
                style={{ paddingInlineStart: `${8 + (index % 2) * 20}px` }}
              >
                <Skeleton shape="circle" width={16} height={16} />
                <Skeleton shape="text" width={width} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            data-part="empty"
            className="flex flex-col items-center gap-3 rounded-surface border border-border bg-surface-subtle p-6 text-center"
          >
            <p className="text-sm font-medium text-foreground">{copy.emptyRoot}</p>
            {onCreate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<PlusIcon className="size-4" />}
                onClick={() => onCreate(null)}
              >
                {copy.create}
              </Button>
            ) : null}
          </div>
        ) : visibleItems.length === 0 ? (
          <div
            data-part="no-match"
            className="flex flex-col items-center gap-3 rounded-surface border border-border bg-surface-subtle p-6 text-center"
          >
            <p className="text-sm text-muted-foreground">{copy.noMatch}</p>
            <Button type="button" variant="outline" size="sm" onClick={clearFilter}>
              {copy.clearFilter}
            </Button>
          </div>
        ) : null}

        {showTree ? (
          <div
            role="tree"
            aria-label={ariaLabel ?? copy.tree}
            data-part="tree"
            onKeyDown={handleTreeKeyDown}
            className="flex min-h-0 flex-col gap-0.5 rounded-surface border border-border bg-surface p-1 outline-none"
          >
            {visibleItems.map((node) => {
              const item = node.item;
              const hasChildren =
                item.children != null && item.children.length > 0;
              const expandedNow =
                hasChildren && (filterActive || isItemExpanded(item.id));
              const isSelected = selected === item.id;
              const isActive = activeItemId === item.id;
              const isRenaming = renamingId === item.id;
              const childCount = item.children?.length ?? 0;

              return (
                <motion.div
                  key={item.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(item.id, element);
                    else itemRefs.current.delete(item.id);
                  }}
                  role="treeitem"
                  aria-level={node.level + 1}
                  aria-expanded={hasChildren ? expandedNow : undefined}
                  aria-selected={isSelected}
                  aria-disabled={item.disabled || undefined}
                  aria-label={
                    isRenaming ? `${copy.renameField}: ${item.label}` : undefined
                  }
                  tabIndex={isActive ? 0 : -1}
                  data-km-resource-explorer-item=""
                  data-part="item"
                  data-selected={isSelected ? "" : undefined}
                  data-active={isActive ? "" : undefined}
                  data-disabled={item.disabled ? "" : undefined}
                  data-level={node.level + 1}
                  layout={!reducedMotion}
                  transition={transition}
                  style={{ paddingInlineStart: `calc(0.25rem + ${node.level * 1.25}rem)` }}
                  className={joinClasses(
                    "group relative flex min-w-0 items-center gap-1 rounded-control py-1 pe-1 outline-none",
                    "transition-colors duration-[var(--km-duration-short)] ease-continuity",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    isSelected && "bg-surface-subtle font-medium",
                    !isSelected && isActive && "bg-surface-subtle",
                    item.disabled
                      ? "cursor-not-allowed text-muted-foreground"
                      : "cursor-default text-foreground"
                  )}
                  onClick={() => {
                    if (isRenaming || item.disabled) return;
                    focusNode(item.id);
                    selectItem(item);
                  }}
                  onFocus={() => setActiveId(item.id)}
                >
                  {isSelected ? (
                    <span
                      data-part="indicator"
                      aria-hidden="true"
                      className="absolute inset-y-1 start-0 w-1 rounded-full bg-foreground"
                    />
                  ) : null}

                  {hasChildren ? (
                    <motion.span
                      data-part="chevron"
                      aria-hidden="true"
                      animate={{ rotate: expandedNow ? 90 : 0 }}
                      transition={transition}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpand(item);
                      }}
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-control text-muted-foreground"
                    >
                      <ChevronIcon className="size-4" />
                    </motion.span>
                  ) : (
                    <span
                      data-part="chevron-placeholder"
                      aria-hidden="true"
                      className="inline-flex size-5 shrink-0"
                    />
                  )}

                  <span
                    data-part="icon"
                    aria-hidden="true"
                    className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground"
                  >
                    {item.icon ??
                      (hasChildren ? (
                        <FolderIcon className="size-4" />
                      ) : (
                        <FileIcon className="size-4" />
                      ))}
                  </span>

                  {isRenaming ? (
                    <Input
                      ref={renameInputRef}
                      type="text"
                      data-part="rename"
                      aria-label={`${copy.renameField}: ${item.label}`}
                      autoComplete="off"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          commitRename(item);
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          event.stopPropagation();
                          cancelRename(item);
                        }
                      }}
                      onBlur={() => {
                        if (activeRenameRef.current === item.id) commitRename(item);
                      }}
                      className="h-8 min-w-0 flex-1 text-sm"
                    />
                  ) : (
                    <span data-part="label" className="min-w-0 flex-1 break-words">
                      {item.label}
                    </span>
                  )}

                  {hasChildren && !isRenaming && !filterActive ? (
                    <Badge
                      size="sm"
                      variant="neutral"
                      data-part="count"
                      className="shrink-0 tabular-nums"
                    >
                      {childCount}
                    </Badge>
                  ) : null}

                  {hasActions && !isRenaming ? (
                    <DropdownMenu
                      open={menuItemId === item.id}
                      onOpenChange={(open) =>
                        setMenuItemId(open ? item.id : null)
                      }
                      items={menuEntries(item)}
                      label={copy.actions}
                      align="end"
                    >
                      <IconButton
                        type="button"
                        variant="outline"
                        size="sm"
                        tabIndex={-1}
                        data-part="actions"
                        aria-label={`${copy.moreActions}: ${item.label}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreIcon className="size-4" />
                      </IconButton>
                    </DropdownMenu>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        ) : null}

        {pendingUndo ? (
          <div
            data-part="undo"
            className="flex flex-wrap items-center gap-2 rounded-surface border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <span
              role="status"
              aria-live="polite"
              data-part="undo-message"
              className="min-w-0 flex-1 break-words"
            >
              {undoMessage}
            </span>
            {onUndo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<UndoIcon className="size-4" />}
                onClick={() => {
                  onUndo();
                  setPendingUndo(null);
                }}
              >
                {copy.undo}
              </Button>
            ) : null}
            <IconButton
              type="button"
              variant="outline"
              size="sm"
              aria-label={copy.undoDismiss}
              onClick={() => setPendingUndo(null)}
            >
              <CloseIcon className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>
    );
  }
);

ResourceExplorerRoot.displayName = "ResourceExplorer";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1.75 4.25a1 1 0 0 1 1-1h3l1.5 1.75h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 1.75H4.5a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5.25Z" />
      <path d="M9 1.75v3.5h3.5" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 8h7a3 3 0 0 1 0 6H7" />
      <path d="M5.5 5.5 3 8l2.5 2.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="m4.5 4.5 7 7" />
      <path d="m11.5 4.5-7 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 3.5v9" />
      <path d="M3.5 8h9" />
    </svg>
  );
}

export { ResourceExplorerRoot as ResourceExplorer };
export default ResourceExplorerRoot;
