import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { SearchableResults } from "../ui/searchable-results";
import type { SearchableResult } from "../ui/searchable-results";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { Surface } from "../ui/surface-card";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** One selectable value inside a filter. */
export interface SearchFilterOption {
  /** Value recorded in `activeFilters[filter.id]`. Must be unique within its filter. */
  value: string;
  /** Visible option text. */
  label: string;
}

/**
 * A single-choice filter rendered with `Select`. At most one value is active at
 * a time, so `activeFilters[id]` holds zero or one entry.
 */
export interface SearchSelectFilter {
  /** Stable identity; the key used in `activeFilters`. */
  id: string;
  /** Visible label for the filter, used as the select's accessible name. */
  label: string;
  /** Discriminator selecting the single-choice treatment. */
  type: "select";
  /** Options offered by the select, in order. */
  options: SearchFilterOption[];
  /**
   * Text of the clearing option that removes the filter. It is prepended to
   * `options` with the reserved value `""`. @default "All"
   */
  placeholder?: string;
}

/**
 * A multi-choice filter rendered as a group of `Checkbox`es sharing one legend.
 * `activeFilters[id]` holds every checked value.
 */
export interface SearchCheckboxFilter {
  /** Stable identity; the key used in `activeFilters`. */
  id: string;
  /** Group legend for the checkbox set. */
  label: string;
  /** Discriminator selecting the multi-choice treatment. */
  type: "checkbox";
  /** Options offered by the group, in order. */
  options: SearchFilterOption[];
}

/** A filter definition: single-choice (`select`) or multi-choice (`checkbox`). */
export type SearchFilter = SearchSelectFilter | SearchCheckboxFilter;

export interface SearchAndResultsProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "onChange" | "onSelect" | "results"
  > {
  /** Controlled query. The consumer owns the value and the filtering. */
  query: string;
  /** Called with the next query on every keystroke. */
  onQueryChange: (query: string) => void;
  /** Results to present, in order. `id` must be unique and stable. */
  results: SearchableResult[];
  /**
   * Zero or more filters. A single filter may be passed directly instead of an
   * array. Rendered as `Select` (single-choice) or a `Checkbox` group.
   */
  filters?: SearchFilter | SearchFilter[];
  /**
   * Controlled active filter values keyed by filter id. A `select` filter holds
   * at most one value; a `checkbox` filter holds every checked value.
   * @default {}
   */
  activeFilters?: Record<string, string[]>;
  /** Called with the complete next filter state whenever a filter changes. */
  onFiltersChange?: (next: Record<string, string[]>) => void;
  /**
   * Report an in-flight request. Shows the loading state and never renders the
   * previous result set. @default false
   */
  loading?: boolean;
  /**
   * Recoverable error. Renders an `Alert variant="danger"` with a Retry action
   * in place of the result set; the search field stays editable. `null` clears
   * it. @default null
   */
  error?: ReactNode | null;
  /** Called by the Retry button in the error notice. Re-run the current query. */
  onRetry?: () => void;
  /** Called when the user asks for the next page. Enables "Load more". */
  onLoadMore?: () => void;
  /** Whether more results are available. @default false */
  hasMore?: boolean;
  /**
   * Called when a result row is activated by click; rows carrying `href` still
   * navigate. Omit to leave rows purely navigational.
   */
  onSelect?: (result: SearchableResult) => void;
  /**
   * Copy shown when nothing matches. Defaults to a neutral no-results message,
   * which gains a "Try removing a filter." hint while filters are active.
   */
  emptyMessage?: ReactNode;
  /** Visible label for the search field. @default "Search" */
  label?: string;
  /** Extra classes merged onto the root surface (consumer classes win). */
  className?: string;
}

interface ActiveFilterChip {
  key: string;
  filterId: string;
  filterLabel: string;
  value: string;
  optionLabel: string;
}

const EMPTY_FILTERS: Record<string, string[]> = {};

const DEFAULT_LABEL = "Search";
const DEFAULT_EMPTY = "No items found.";
const DEFAULT_EMPTY_WITH_FILTERS = "No items found. Try removing a filter.";
const DEFAULT_ALL_LABEL = "All";
const DEFAULT_ERROR_TITLE = "Could not load results";
const SEARCH_INPUT_SELECTOR = 'input[type="search"]';

const CONTENT_CLASSES = "flex flex-col gap-4";

const FILTERS_CLASSES = "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end";

const SELECT_WRAPPER_CLASSES = "w-full sm:w-56";

const CHECKBOX_GROUP_CLASSES = "flex flex-col gap-2";
const LEGEND_CLASSES = "mb-0.5 text-sm font-medium text-foreground";
const CHECKBOX_ROW_CLASSES = "flex flex-wrap gap-x-4 gap-y-2";

const CHIPS_CLASSES = "flex flex-wrap items-center gap-2";

const CHIP_DISMISS_CLASSES = joinClasses(
  "inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-inset hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-subtle"
);

const HINT_ROW_CLASSES = "flex w-full flex-wrap items-center justify-between gap-2";
const HINT_TEXT_CLASSES = "flex items-center gap-1.5 text-xs text-muted-foreground";

const KBD_CLASSES = joinClasses(
  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border",
  "bg-surface-subtle px-1 text-xs text-foreground"
);

const FOCUS_SEARCH_HINT = "Focus search";

/**
 * A complete search view: a search field, a filter layer and an honest results
 * region.
 *
 * Composes `SearchableResults` (the field, result rows, loading/empty states and
 * pagination) with `Select`/`Checkbox` filters, dismissible `Badge` chips and a
 * danger `Alert` for recoverable errors. The consumer owns the query, the filter
 * state and the data: this pattern never fetches, filters or invents results — it
 * renders exactly the `results` it is given and reports every intent through a
 * callback.
 *
 * Keyboard: pressing `/` anywhere outside a text field moves focus to the search
 * field. Inside the field, `Escape` clears a non-empty query first and blurs the
 * field on a second press. Filters and chips are ordinary tab stops.
 *
 * Truthful states: while `loading`, the previous result set is withheld (never
 * shown as current) and the polite status region announces progress. An `error`
 * replaces the results with a danger alert whose Retry action calls `onRetry`;
 * the search field remains editable throughout.
 *
 * Every colour, radius, spacing and motion comes from semantic tokens. Filters
 * stack full-width below 640px and wrap above it; results stay a single column
 * and long or CJK text wraps instead of clipping. The pattern is wrapped in a
 * `Surface` so it owns its own chrome. `ref`, arbitrary DOM props and `className`
 * are forwarded to the root surface.
 */
const SearchAndResults = forwardRef<HTMLElement, SearchAndResultsProps>(
  function SearchAndResults(
    {
      query,
      onQueryChange,
      results,
      filters,
      activeFilters = EMPTY_FILTERS,
      onFiltersChange,
      loading = false,
      error = null,
      onRetry,
      onLoadMore,
      hasMore = false,
      onSelect,
      emptyMessage,
      label = DEFAULT_LABEL,
      className,
      ...props
    },
    ref
  ) {
    const reducedMotion = useReducedMotion();
    const resultsRef = useRef<HTMLDivElement | null>(null);

    const filterList = useMemo<SearchFilter[]>(
      () => (filters == null ? [] : Array.isArray(filters) ? filters : [filters]),
      [filters]
    );

    const activeChips = useMemo<ActiveFilterChip[]>(() => {
      const chips: ActiveFilterChip[] = [];
      for (const filter of filterList) {
        for (const value of activeFilters[filter.id] ?? []) {
          const option = filter.options.find((candidate) => candidate.value === value);
          chips.push({
            key: `${filter.id}:${value}`,
            filterId: filter.id,
            filterLabel: filter.label,
            value,
            optionLabel: option?.label ?? value,
          });
        }
      }
      return chips;
    }, [filterList, activeFilters]);

    const hasActiveFilters = activeChips.length > 0;

    const setFilterValues = useCallback(
      (filterId: string, values: string[]) => {
        if (!onFiltersChange) return;
        const next: Record<string, string[]> = { ...activeFilters };
        if (values.length === 0) delete next[filterId];
        else next[filterId] = values;
        onFiltersChange(next);
      },
      [activeFilters, onFiltersChange]
    );

    const focusSearch = useCallback(() => {
      resultsRef.current?.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR)?.focus();
    }, []);

    // `/` is a global affordance: it focuses the search field from anywhere
    // outside a text field, never stealing a keystroke the user is typing.
    useEffect(() => {
      function handleShortcut(event: globalThis.KeyboardEvent) {
        if (event.defaultPrevented || event.isComposing) return;
        if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          if (target.isContentEditable) return;
        }
        event.preventDefault();
        focusSearch();
      }
      document.addEventListener("keydown", handleShortcut);
      return () => document.removeEventListener("keydown", handleShortcut);
    }, [focusSearch]);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "search") return;
      event.preventDefault();
      if (query !== "") onQueryChange("");
      else target.blur();
    }

    // `SearchableResults` owns row markup, so selection is read back from the
    // activated row. Rows are only ever rendered in `results` order, so the DOM
    // index maps back to the result the consumer supplied.
    function handleClick(event: MouseEvent<HTMLDivElement>) {
      if (!onSelect) return;
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-part="result"]'
      );
      if (!element || element.hasAttribute("data-disabled")) return;
      const container = resultsRef.current;
      if (!container) return;
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>('[data-part="result"]')
      );
      const index = rows.indexOf(element);
      const result = index === -1 ? undefined : results[index];
      if (result) onSelect(result);
    }

    const showError = !loading && error != null && error !== false && error !== "";
    const visibleResults = loading || showError ? [] : results;

    const resolvedEmptyMessage =
      emptyMessage ?? (hasActiveFilters ? DEFAULT_EMPTY_WITH_FILTERS : DEFAULT_EMPTY);

    const errorNotice = (
      <Alert
        variant="danger"
        live="polite"
        title={DEFAULT_ERROR_TITLE}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      >
        {error}
      </Alert>
    );

    function renderSelect(filter: SearchSelectFilter) {
      const value = activeFilters[filter.id]?.[0] ?? "";
      return (
        <div
          key={filter.id}
          data-part="filter"
          data-filter-type="select"
          className={SELECT_WRAPPER_CLASSES}
        >
          <Select
            label={filter.label}
            value={value}
            onValueChange={(next) => {
              setFilterValues(filter.id, next == null || next === "" ? [] : [next]);
            }}
            options={[
              { value: "", label: filter.placeholder ?? DEFAULT_ALL_LABEL },
              ...filter.options,
            ]}
          />
        </div>
      );
    }

    function renderCheckboxGroup(filter: SearchCheckboxFilter) {
      const selected = activeFilters[filter.id] ?? [];
      return (
        <fieldset
          key={filter.id}
          data-part="filter"
          data-filter-type="checkbox"
          className={CHECKBOX_GROUP_CLASSES}
        >
          <legend className={LEGEND_CLASSES}>{filter.label}</legend>
          <div className={CHECKBOX_ROW_CLASSES}>
            {filter.options.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) => {
                  const current = activeFilters[filter.id] ?? [];
                  setFilterValues(
                    filter.id,
                    checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value)
                  );
                }}
              />
            ))}
          </div>
        </fieldset>
      );
    }

    return (
      <Surface
        ref={ref}
        data-km-search-and-results=""
        data-loading={loading ? "" : undefined}
        data-error={showError ? "" : undefined}
        className={className}
        {...props}
      >
        <motion.div
          data-part="content"
          className={CONTENT_CLASSES}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
          }
          onKeyDown={handleKeyDown}
          onClick={onSelect ? handleClick : undefined}
        >
          {filterList.length > 0 ? (
            <div data-part="filters" className={FILTERS_CLASSES}>
              {filterList.map((filter) =>
                filter.type === "select"
                  ? renderSelect(filter)
                  : renderCheckboxGroup(filter)
              )}
            </div>
          ) : null}

          {hasActiveFilters ? (
            <ul data-part="active-filters" className={CHIPS_CLASSES}>
              {activeChips.map((chip) => (
                <li key={chip.key} className="min-w-0">
                  <Badge variant="neutral" size="sm">
                    <span className="sr-only">{chip.filterLabel}: </span>
                    {chip.optionLabel}
                    <button
                      type="button"
                      data-part="chip-dismiss"
                      aria-label={`Remove ${chip.filterLabel}: ${chip.optionLabel}`}
                      onClick={() => {
                        const current = activeFilters[chip.filterId] ?? [];
                        setFilterValues(
                          chip.filterId,
                          current.filter((value) => value !== chip.value)
                        );
                      }}
                      className={CHIP_DISMISS_CLASSES}
                    >
                      <CloseIcon className="size-3" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <p data-part="shortcut-hint" className={HINT_ROW_CLASSES}>
              <span className={HINT_TEXT_CLASSES}>
                <kbd className={KBD_CLASSES}>/</kbd>
                <span>{FOCUS_SEARCH_HINT}</span>
              </span>
            </p>
            <SearchableResults
              ref={resultsRef}
              query={query}
              onQueryChange={onQueryChange}
              results={visibleResults}
              loading={loading}
              emptyMessage={showError ? errorNotice : resolvedEmptyMessage}
              onLoadMore={onLoadMore}
              hasMore={hasMore}
              label={label}
            />
          </div>
        </motion.div>
      </Surface>
    );
  }
);

SearchAndResults.displayName = "SearchAndResults";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
    >
      <path d="m4.5 4.5 7 7" />
      <path d="m11.5 4.5-7 7" />
    </svg>
  );
}

export { SearchAndResults };
export default SearchAndResults;
