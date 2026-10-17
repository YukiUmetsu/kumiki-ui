import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

/** Severity of an inline notice. */
export type AlertVariant = "info" | "success" | "warning" | "danger";

/** Live-region urgency. `off` keeps the notice silent until focused. */
export type AlertLive = "off" | "polite" | "assertive";

const BASE_CLASSES = [
  "relative flex w-full items-start gap-3 overflow-hidden rounded-surface border border-border",
  "bg-surface p-4 text-foreground",
].join(" ");

const accentClasses: Record<AlertVariant, string> = {
  info: "bg-status-info",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

const iconColorClasses: Record<AlertVariant, string> = {
  info: "text-status-info",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

const TITLE_CLASSES = "text-sm font-medium leading-5 text-foreground";
const DESCRIPTION_CLASSES = "text-sm leading-5 text-muted-foreground";
const ACTION_CLASSES = "mt-2 flex flex-wrap items-center gap-2";
const DISMISS_CLASSES = [
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-subtle hover:text-foreground active:bg-surface-inset",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
].join(" ");

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Default per-variant glyph. Each shape is distinct at a glance, so severity is
 * never communicated by colour alone; the text next to it carries the meaning
 * for assistive technology.
 */
function VariantIcon({ variant }: { variant: AlertVariant }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      {variant === "info" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v4" />
          <path d="M8 4.75h.01" />
        </>
      ) : null}
      {variant === "success" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.25 8.25 1.9 1.9 3.6-4.1" />
        </>
      ) : null}
      {variant === "warning" ? (
        <>
          <path d="M8 2.5 14 13H2Z" />
          <path d="M8 6.5v3" />
          <path d="M8 11.4h.01" />
        </>
      ) : null}
      {variant === "danger" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.5 5.5 5 5" />
          <path d="m10.5 5.5-5 5" />
        </>
      ) : null}
    </svg>
  );
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  /** Severity of the notice. @default "info" */
  variant?: AlertVariant;
  /** Short heading that labels the notice. */
  title?: ReactNode;
  /** Supporting description. Omit only when `title` alone is self-explanatory. */
  children?: ReactNode;
  /**
   * Leading glyph. Defaults to a per-variant icon. A custom node is treated as
   * decorative: it is wrapped `aria-hidden`, so put any necessary meaning in
   * `title`/`children`.
   */
  icon?: ReactNode;
  /** Optional action slot (for example a retry button), rendered below the description. */
  action?: ReactNode;
  /** Show a dismiss button. The consumer owns visibility and should hide the alert from `onDismiss`. @default false */
  dismissible?: boolean;
  /** Called when the dismiss button is pressed. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button, so it can be localised. @default "Dismiss" */
  dismissLabel?: string;
  /**
   * Live-region urgency. `polite` renders `role="status"`, `assertive` renders
   * `role="alert"`, `off` renders no live role. Only one role is ever applied.
   * @default "off"
   */
  live?: AlertLive;
}

/**
 * Inline notice for a persistent message inside page content.
 *
 * Severity is conveyed by a shape-distinct leading icon, the accent rule and the
 * visible text — never by colour alone. The root is a plain `<div>` by default;
 * `live` opts into exactly one live region (`status` or `alert`), which is
 * appropriate when the notice appears in response to an async event. For
 * transient messages prefer a toast.
 *
 * Composition is prop-based (`title`, `children`, `action`, `icon`) rather than
 * compound parts: an alert has one bounded region and one optional action, so
 * parts would add ceremony without enabling new layouts. Arbitrary DOM props and
 * `className` merge onto the root, and `ref` forwards to it.
 */
const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant = "info",
    title,
    children,
    icon,
    action,
    dismissible = false,
    onDismiss,
    dismissLabel = "Dismiss",
    live = "off",
    className,
    ...props
  },
  ref
) {
  const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;
  const hasTitle = title != null && title !== "";
  const hasDescription = children != null && children !== "";

  return (
    <div
      ref={ref}
      role={role}
      aria-atomic={live === "off" ? undefined : true}
      data-km-alert=""
      data-variant={variant}
      data-live={live}
      className={joinClasses(BASE_CLASSES, className)}
      {...props}
    >
      <span
        data-part="accent"
        aria-hidden="true"
        className={joinClasses("absolute inset-y-0 start-0 w-1", accentClasses[variant])}
      />
      <span
        data-part="icon"
        aria-hidden="true"
        className={joinClasses("mt-0.5 inline-flex shrink-0 items-center", iconColorClasses[variant])}
      >
        {icon ?? <VariantIcon variant={variant} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {hasTitle ? (
          <p data-part="title" className={TITLE_CLASSES}>
            {title}
          </p>
        ) : null}
        {hasDescription ? (
          <div data-part="description" className={DESCRIPTION_CLASSES}>
            {children}
          </div>
        ) : null}
        {action != null ? (
          <div data-part="action" className={ACTION_CLASSES}>
            {action}
          </div>
        ) : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          data-part="dismiss"
          aria-label={dismissLabel}
          onClick={() => onDismiss?.()}
          className={DISMISS_CLASSES}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="size-4"
          >
            <path d="m4.5 4.5 7 7" />
            <path d="m11.5 4.5-7 7" />
          </svg>
        </button>
      ) : null}
    </div>
  );
});

Alert.displayName = "Alert";

export { Alert };
export default Alert;
