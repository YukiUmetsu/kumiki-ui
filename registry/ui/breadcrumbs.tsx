import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** A single crumb in the trail. */
export interface BreadcrumbItem {
  /** Visible label. Any inline content: text, CJK, an icon next to text. */
  label: ReactNode;
  /**
   * Target URL. When set the crumb renders an `<a>`; when omitted it renders
   * plain text, so a crumb can never look interactive without being one.
   */
  href?: string;
  /**
   * Click handler for the rendered link. Ignored when `href` is omitted,
   * because plain-text crumbs are not interactive.
   */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Marks this crumb as the current page: it renders with `aria-current="page"`
   * and never as a link, even when `href` is set. Defaults to the last item.
   */
  current?: boolean;
}

export interface BreadcrumbsProps
  extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  /** Ordered trail from the highest ancestor to the current page. */
  items: BreadcrumbItem[];
  /**
   * Presentational glyph rendered between crumbs. Always wrapped in an
   * `aria-hidden` span, so it is never announced. @default "/"
   */
  separator?: ReactNode;
  /**
   * Accessible name for the navigation landmark. Keep it short and distinct
   * when a page has several `<nav>` regions. @default "Breadcrumb"
   */
  "aria-label"?: string;
  /**
   * Maximum number of crumbs to render. When the trail is longer, the middle
   * items collapse behind decorative `…` markers; the first, last and current
   * crumbs always stay visible, so the current page is never hidden. Values
   * below 2 and `undefined` disable collapsing.
   * @default undefined
   */
  maxItems?: number;
  /** Extra classes for the root `<nav>`. Consumer classes are composed last. */
  className?: string;
}

type VisibleCrumb =
  | { kind: "item"; item: BreadcrumbItem; index: number }
  | { kind: "ellipsis"; hiddenCount: number };

/**
 * Resolve which crumbs are visible. The first and last crumb always survive a
 * collapse, and the current crumb is never dropped: when the current page sits
 * between them the trail renders `first … current … last`, so `aria-current` is
 * always present exactly once and the current page is never hidden by collapsing.
 * Each gap is represented by one decorative ellipsis.
 */
function getVisibleCrumbs(
  items: BreadcrumbItem[],
  currentIndex: number,
  maxItems?: number
): VisibleCrumb[] {
  const all: VisibleCrumb[] = items.map((item, index) => ({ kind: "item", item, index }));

  if (maxItems === undefined || maxItems < 2 || items.length <= maxItems) {
    return all;
  }

  const lastIndex = items.length - 1;

  // The current crumb is already an end of the trail: one ellipsis is enough.
  if (currentIndex <= 0 || currentIndex >= lastIndex) {
    return [
      all[0],
      { kind: "ellipsis", hiddenCount: items.length - 2 },
      all[lastIndex],
    ];
  }

  // Current crumb in the middle: keep it, collapsing the gaps on both sides.
  const visible: VisibleCrumb[] = [all[0]];
  const hiddenBefore = currentIndex - 1;
  if (hiddenBefore > 0) {
    visible.push({ kind: "ellipsis", hiddenCount: hiddenBefore });
  }
  visible.push(all[currentIndex]);
  const hiddenAfter = lastIndex - currentIndex - 1;
  if (hiddenAfter > 0) {
    visible.push({ kind: "ellipsis", hiddenCount: hiddenAfter });
  }
  visible.push(all[lastIndex]);
  return visible;
}

function CrumbSeparator({ children }: { children: ReactNode }) {
  return (
    <span
      data-part="separator"
      aria-hidden="true"
      className="shrink-0 select-none text-muted-foreground"
    >
      {children}
    </span>
  );
}

const LINK_CLASSES = [
  // `py-1` only grows the inline hit box (19px -> 27px, meeting the 24x24
  // minimum target size); it never moves the glyphs or the line box.
  "min-w-0 break-words py-1 rounded-sm text-muted-foreground underline-offset-4",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:text-foreground hover:underline",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
].join(" ");

/**
 * Navigation trail from the highest ancestor to the current page.
 *
 * Renders a real `<nav>` landmark (named `aria-label`, default "Breadcrumb")
 * containing an ordered list, so assistive technology hears a list of crumbs
 * in order. The current page is marked with `aria-current="page"` and is never
 * a link; separators are presentational (`aria-hidden`) and add no tab stop.
 *
 * `maxItems` collapses a long trail to its first and last crumb with a
 * decorative ellipsis, always keeping the current crumb visible (and marking it
 * `aria-current="page"`) even when it sits in the middle, so the visible list
 * stays short at narrow widths without hiding where the user is. Labels
 * wrap (`break-words`) instead of clipping, so long and CJK text never breaks
 * the landmark. Colours come from semantic tokens: muted foreground for links
 * and separators, full foreground for the current page.
 */
const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  {
    items,
    separator = "/",
    "aria-label": ariaLabel = "Breadcrumb",
    maxItems,
    className,
    ...props
  },
  ref
) {
  const lastIndex = items.length - 1;
  // An explicit `current` flag wins over the "last crumb" default, so a trail
  // can mark a page that is not the final entry without producing two
  // `aria-current="page"` elements.
  const explicitCurrentIndex = items.findIndex((item) => item.current === true);
  const currentIndex = explicitCurrentIndex === -1 ? lastIndex : explicitCurrentIndex;
  const visible = getVisibleCrumbs(items, currentIndex, maxItems);
  const lastVisiblePosition = visible.length - 1;

  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      data-km-breadcrumbs=""
      className={joinClasses("min-w-0 max-w-full", className)}
      {...props}
    >
      <ol
        data-part="list"
        className="flex min-w-0 list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 text-sm"
      >
        {visible.map((entry, position) => {
          const isLast = position === lastVisiblePosition;

          if (entry.kind === "ellipsis") {
            return (
              <li
                key={`ellipsis-${position}`}
                data-part="ellipsis"
                data-hidden-items={entry.hiddenCount}
                aria-hidden="true"
                className="inline-flex min-w-0 items-center gap-x-1"
              >
                <span className="select-none px-1 text-muted-foreground">…</span>
                {isLast ? null : <CrumbSeparator>{separator}</CrumbSeparator>}
              </li>
            );
          }

          const { item, index } = entry;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={`${index}-${item.href ?? "text"}`}
              data-part="item"
              data-current={isCurrent ? "" : undefined}
              className="inline-flex min-w-0 max-w-full items-center gap-x-1"
            >
              {isCurrent ? (
                <span
                  data-part="current"
                  aria-current="page"
                  className="min-w-0 break-words font-medium text-foreground"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <a
                  data-part="link"
                  href={item.href}
                  onClick={item.onClick}
                  className={LINK_CLASSES}
                >
                  {item.label}
                </a>
              ) : (
                <span data-part="text" className="min-w-0 break-words text-muted-foreground">
                  {item.label}
                </span>
              )}
              {isLast ? null : <CrumbSeparator>{separator}</CrumbSeparator>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

Breadcrumbs.displayName = "Breadcrumbs";

export { Breadcrumbs };
export default Breadcrumbs;
