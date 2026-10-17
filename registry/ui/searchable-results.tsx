import { forwardRef, Fragment, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** One result row. `id` must be unique and stable within the list. */
export interface SearchableResult {
  /** Stable, unique identity; used as the React key and never as a fallback index. */
  id: string;
  /** Primary line. A plain string is eligible for query highlighting. */
  title: ReactNode;
  /** Optional secondary line rendered beneath the title. */
  subtitle?: ReactNode;
  /**
   * Group heading. Consecutive results sharing a group render together inside a
   * named `role="group"`; result order is otherwise preserved.
   */
  group?: string;
  /**
   * Destination when the row is operable. With `href` the row renders as a real
   * `<a>`; without it (or when disabled) it renders as inert text.
   */
  href?: string;
  /**
   * Render the row as inert text instead of a link. Disabled rows are never
   * focusable and never navigate. @default false
   */
  disabled?: boolean;
}

export interface SearchableResultsProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange" | "results"> {
  /** Controlled query value. The consumer owns the state and passes it back. */
  query: string;
  /** Called with the next query on every keystroke. */
  onQueryChange: (query: string) => void;
  /** Results to render, in order. The consumer owns filtering. */
  results: SearchableResult[];
  /**
   * Wrap query matches inside string `title`s in a `<mark>` element.
   * @default true
   */
  highlightQuery?: boolean;
  /**
   * Report that a result fetch is in flight. Shows placeholder rows, sets
   * `aria-busy` on the results region and announces through a polite status
   * region. @default false
   */
  loading?: boolean;
  /** Message shown when there are no results. A clear default is used when omitted. */
  emptyMessage?: ReactNode;
  /** Called when the user asks for the next page. Enables the "Load more" button. */
  onLoadMore?: () => void;
  /** Whether more results are available behind "Load more". @default false */
  hasMore?: boolean;
  /** Visible label for the search field. @default "Search" */
  label?: string;
  /** Extra classes merged onto the root element (consumer classes win). */
  className?: string;
}

interface RenderedSection {
  group?: string;
  results: SearchableResult[];
}

const ROOT_CLASSES = "flex w-full flex-col gap-3 text-base text-foreground";

const LABEL_CLASSES = "text-sm font-medium text-foreground";

const INPUT_CLASSES = joinClasses(
  "flex w-full rounded-control border border-input bg-field px-[var(--km-control-space-x)]",
  "h-[var(--km-control-height)] text-base text-foreground",
  "placeholder:text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:border-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
);

const RESULTS_CLASSES = "flex flex-col gap-1";

const ITEM_INTERACTIVE_CLASSES = joinClasses(
  "flex w-full min-w-0 rounded-control border border-transparent px-2 py-2 no-underline",
  "text-sm text-foreground outline-none",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-subtle active:bg-surface-inset",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
);

const ITEM_STATIC_CLASSES = "flex w-full min-w-0 rounded-control px-2 py-2 text-sm";

const GROUP_LABEL_CLASSES = "px-2 text-caption font-medium text-muted-foreground";

const MARK_CLASSES =
  "rounded-sm bg-surface-subtle px-1 font-medium text-foreground";

const EMPTY_CLASSES = joinClasses(
  "break-words rounded-control border border-border bg-surface-subtle px-4 py-4",
  "text-sm text-muted-foreground"
);

const LOAD_MORE_CLASSES = joinClasses(
  "inline-flex items-center justify-center rounded-control border border-input bg-surface",
  "h-[var(--km-control-height)] px-[var(--km-control-space-x)] text-sm text-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-subtle active:bg-surface-inset",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted-foreground"
);

// Uses the same placeholder fill as `Skeleton` so both loading treatments read
// as one language (see registry/ui/skeleton.tsx for why this is `track`).
const SKELETON_BAR_CLASSES = "h-3 rounded-control bg-track animate-pulse";

const DEFAULT_LABEL = "Search";
const DEFAULT_EMPTY_MESSAGE = "No results found.";
const SKELETON_ROWS = 3;

/**
 * Split `text` on case-insensitive occurrences of `query` and wrap each match in
 * a `<mark>`. Returns the original string when the query is blank or absent so
 * no empty element is emitted.
 */
function highlightMatches(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (needle === "") return text;

  const haystack = text.toLowerCase();
  const lowered = needle.toLowerCase();
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match = haystack.indexOf(lowered, cursor);

  if (match === -1) return text;

  let key = 0;
  while (match !== -1) {
    if (match > cursor) nodes.push(text.slice(cursor, match));
    nodes.push(
      <mark key={`highlight-${key++}`} className={MARK_CLASSES}>
        {text.slice(match, match + needle.length)}
      </mark>
    );
    cursor = match + needle.length;
    match = haystack.indexOf(lowered, cursor);
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/**
 * A results list for a search or filter view.
 *
 * The search field is a normal, labelled, **controlled** text input: the
 * consumer owns `query` and receives every change through `onQueryChange`, so
 * filtering, debouncing and URL sync stay outside the component. Results are
 * rendered as a list of real `<a>` rows when they carry `href`, and as inert
 * text otherwise (or when `disabled`); unavailable rows are never focusable.
 * Consecutive results that share a `group` render together under a named
 * `role="group"`, and rows are reachable in normal Tab order.
 *
 * With `highlightQuery` a plain-string `title` has each case-insensitive match
 * wrapped in a `<mark>` styled from semantic tokens, so emphasis never depends
 * on a raw colour. `loading` swaps the rows for placeholder bars, sets
 * `aria-busy` on the results region and announces progress from a polite status
 * region; an empty, non-loading list always shows a clear message instead of a
 * blank area. Any visible count is derived from `results.length` and is never
 * fabricated. `hasMore` plus `onLoadMore` render a "Load more" button that is
 * disabled while `loading`.
 *
 * All colours, radii, spacing and motion come from semantic tokens, so
 * appearance and density stay centralized. Long and CJK titles and subtitles
 * wrap with `break-words` instead of clipping. `ref`, arbitrary div props and
 * `className` are forwarded to the root.
 */
const SearchableResults = forwardRef<HTMLDivElement, SearchableResultsProps>(
  function SearchableResults(
    {
      query,
      onQueryChange,
      results,
      highlightQuery = true,
      loading = false,
      emptyMessage,
      onLoadMore,
      hasMore = false,
      label,
      className,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const labelId = `${generatedId}-label`;
    const inputId = `${generatedId}-input`;
    const hasVisibleLabel = label != null && label !== "";

    const sections = useMemo<RenderedSection[]>(() => {
      const out: RenderedSection[] = [];
      for (const result of results) {
        const group =
          result.group == null || result.group === "" ? undefined : result.group;
        const last = out[out.length - 1];
        if (last && last.group === group) last.results.push(result);
        else out.push({ group, results: [result] });
      }
      return out;
    }, [results]);

    const renderTitle = (result: SearchableResult): ReactNode => {
      if (highlightQuery && typeof result.title === "string") {
        return highlightMatches(result.title, query);
      }
      return result.title;
    };

    const renderRow = (result: SearchableResult): ReactNode => {
      const disabled = result.disabled === true;
      const body = (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="break-words font-medium">{renderTitle(result)}</span>
          {result.subtitle != null && result.subtitle !== "" ? (
            <span className="break-words text-sm text-muted-foreground">
              {result.subtitle}
            </span>
          ) : null}
        </span>
      );

      if (result.href && !disabled) {
        return (
          <li key={result.id} className="min-w-0">
            <a
              href={result.href}
              data-part="result"
              className={ITEM_INTERACTIVE_CLASSES}
            >
              {body}
            </a>
          </li>
        );
      }

      return (
        <li key={result.id} className="min-w-0">
          <span
            data-part="result"
            data-disabled={disabled ? "" : undefined}
            className={joinClasses(
              ITEM_STATIC_CLASSES,
              disabled ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {body}
          </span>
        </li>
      );
    };

    const showResults = !loading && results.length > 0;

    return (
      <div
        ref={ref}
        data-km-searchable-results=""
        data-loading={loading ? "" : undefined}
        className={joinClasses(ROOT_CLASSES, className)}
        {...props}
      >
        <div className="flex flex-col gap-2">
          {hasVisibleLabel ? (
            <label
              id={labelId}
              htmlFor={inputId}
              data-part="label"
              className={LABEL_CLASSES}
            >
              {label}
            </label>
          ) : null}
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            data-part="input"
            aria-label={hasVisibleLabel ? undefined : DEFAULT_LABEL}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className={INPUT_CLASSES}
          />
        </div>

        <div
          role="status"
          aria-live="polite"
          data-part="loading-status"
          className="sr-only"
        >
          {loading ? "Loading results…" : ""}
        </div>

        <div
          data-part="results"
          aria-busy={loading ? true : undefined}
          className={RESULTS_CLASSES}
        >
          {loading ? (
            <div
              aria-hidden="true"
              data-part="skeleton"
              className="flex flex-col gap-3 px-2 py-1"
            >
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <span key={`skeleton-${index}`} className="flex flex-col gap-2">
                  <span className={joinClasses(SKELETON_BAR_CLASSES, "w-3/5")} />
                  <span className={joinClasses(SKELETON_BAR_CLASSES, "w-2/5")} />
                </span>
              ))}
            </div>
          ) : null}

          {showResults
            ? sections.map((section, sectionIndex) => {
                const list = (
                  <ul className={RESULTS_CLASSES}>
                    {section.results.map(renderRow)}
                  </ul>
                );

                if (section.group == null) {
                  return (
                    <Fragment key={`ungrouped-${sectionIndex}`}>{list}</Fragment>
                  );
                }

                const groupId = `${generatedId}-group-${sectionIndex}`;
                return (
                  <div
                    key={`group-${sectionIndex}-${section.group}`}
                    role="group"
                    aria-labelledby={groupId}
                    data-part="group"
                    className="flex flex-col gap-1"
                  >
                    <div id={groupId} data-part="group-label" className={GROUP_LABEL_CLASSES}>
                      {section.group}
                    </div>
                    {list}
                  </div>
                );
              })
            : null}

          {!loading && results.length > 0 ? (
            <p data-part="count" className="px-2 text-caption text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
          ) : null}

          {!loading && results.length === 0 ? (
            <div data-part="empty" className={EMPTY_CLASSES}>
              {emptyMessage != null && emptyMessage !== ""
                ? emptyMessage
                : DEFAULT_EMPTY_MESSAGE}
            </div>
          ) : null}
        </div>

        {hasMore && onLoadMore ? (
          <div className="flex justify-start">
            <button
              type="button"
              data-part="load-more"
              disabled={loading}
              onClick={onLoadMore}
              className={LOAD_MORE_CLASSES}
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    );
  }
);

SearchableResults.displayName = "SearchableResults";

export { SearchableResults };
export default SearchableResults;
