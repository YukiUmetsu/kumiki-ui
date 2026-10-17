import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

/** Semantic meaning of a badge. */
export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

/** Compact (`sm`) or regular (`md`) badge footprint. */
export type BadgeSize = "sm" | "md";

const BASE_CLASSES = [
  "inline-flex max-w-full items-center rounded-control border border-border bg-surface-subtle",
  "font-medium leading-none",
].join(" ");

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "text-foreground",
  info: "text-status-info",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-status-info",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "gap-1 px-2 py-1 text-caption",
  md: "gap-2 px-3 py-1 text-sm",
};

/**
 * Shape-distinct glyphs for the status variants. Severity is recognizable
 * without colour: a circled "i", a check, a warning triangle and a cross.
 */
function StatusGlyph({ variant }: { variant: Exclude<BadgeVariant, "neutral"> }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0"
    >
      {variant === "info" ? (
        <>
          <circle cx="6" cy="6" r="4.6" />
          <path d="M6 5.4v2.9" />
          <path d="M6 3.6h.01" />
        </>
      ) : null}
      {variant === "success" ? (
        <>
          <circle cx="6" cy="6" r="4.6" />
          <path d="m3.9 6.1 1.5 1.5 2.8-3.2" />
        </>
      ) : null}
      {variant === "warning" ? (
        <>
          <path d="M6 1.6 11 10.4H1Z" />
          <path d="M6 4.7v2.4" />
          <path d="M6 8.8h.01" />
        </>
      ) : null}
      {variant === "danger" ? (
        <>
          <circle cx="6" cy="6" r="4.6" />
          <path d="m4.2 4.2 3.6 3.6" />
          <path d="m7.8 4.2-3.6 3.6" />
        </>
      ) : null}
    </svg>
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic meaning. Status variants also render a shape-distinct glyph. @default "neutral" */
  variant?: BadgeVariant;
  /** Compact or regular footprint. @default "md" */
  size?: BadgeSize;
  /**
   * Render a small status dot before the children. Dot colour follows the
   * variant; neutral badges use the muted foreground. When `false`, status
   * variants still render a status glyph, so meaning never depends on colour
   * alone. @default false
   */
  dot?: boolean;
}

/**
 * Compact status/label pill.
 *
 * Renders a `<span>` so it can sit inside headings, links and table cells
 * without changing their semantics. The visible children carry the label; the
 * `variant` adds a status glyph (info/success/warning/danger) or, with `dot`, a
 * small colour-matched dot, so a badge is never distinguishable by colour only.
 * Consumers who need an announcement can pass `role="status"` or
 * `aria-label`; the component itself adds no live-region behaviour.
 *
 * Colours, radius and typography come from semantic tokens, so appearance and
 * density switching stay centralized. Long labels wrap inside the pill instead
 * of overflowing their container.
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "neutral", size = "md", dot = false, className, children, ...props },
  ref
) {
  const showGlyph = !dot && variant !== "neutral";

  return (
    <span
      ref={ref}
      data-km-badge=""
      data-variant={variant}
      data-dot={dot ? "" : undefined}
      className={[BASE_CLASSES, variantClasses[variant], sizeClasses[size], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot ? (
        <span
          data-part="dot"
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${dotClasses[variant]}`}
        />
      ) : null}
      {showGlyph ? (
        <span data-part="icon" aria-hidden="true" className="inline-flex shrink-0 items-center">
          <StatusGlyph variant={variant} />
        </span>
      ) : null}
      <span data-part="label" className="min-w-0 break-words">
        {children}
      </span>
    </span>
  );
});

Badge.displayName = "Badge";

export { Badge };
export default Badge;
