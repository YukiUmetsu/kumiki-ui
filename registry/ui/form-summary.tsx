import { forwardRef, useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";

/** Live-region urgency for the summary container. `off` stays silent. */
export type FormSummaryLive = "off" | "polite" | "assertive";

/** One validation failure, pointing at the field that owns it. */
export interface FormSummaryError {
  /** `id` of the field element the entry navigates to. */
  fieldId: string;
  /** Visible label of that field. */
  label: string;
  /** Validation message shown for that field. */
  message: string;
}

export interface FormSummaryProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Validation failures to list, in display order. An empty array renders
   * nothing at all.
   */
  errors: FormSummaryError[];
  /**
   * Heading that labels the summary. Pass `null` to omit the heading (the
   * container then loses its `aria-labelledby`).
   * @default "Please fix the following errors"
   */
  title?: ReactNode;
  /**
   * Called with the field's id when an entry is activated. When supplied, the
   * consumer owns moving focus to the field; without it the summary focuses
   * `document.getElementById(fieldId)` itself.
   */
  onNavigate?: (fieldId: string) => void;
  /**
   * Live-region urgency. `polite` renders `role="status"`, `assertive` renders
   * `role="alert"`, `off` renders no live role. Only one role is ever applied.
   * @default "polite"
   */
  live?: FormSummaryLive;
}

const DEFAULT_TITLE = "Please fix the following errors";

const BASE_CLASSES = [
  "relative flex w-full flex-col gap-2 overflow-hidden rounded-surface border border-border",
  "bg-surface p-4 text-foreground",
].join(" ");

const ACCENT_CLASSES = "absolute inset-y-0 start-0 w-1 bg-status-danger";
const TITLE_CLASSES = "text-sm font-medium leading-5 text-foreground";
const LIST_CLASSES = "flex list-none flex-col gap-1.5 ps-1";
const LINK_CLASSES = [
  "flex min-w-0 flex-col gap-0.5 rounded-sm px-1 py-1 -mx-1 text-sm leading-5",
  "break-words transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-subtle",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
].join(" ");
const LABEL_CLASSES = "font-medium text-danger underline underline-offset-2";
const MESSAGE_CLASSES = "text-muted-foreground";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Focuses the field named by `fieldId`, if the document and the field exist.
 * The guard keeps server rendering and consumers who unmount the field safe.
 */
function focusField(fieldId: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(fieldId)?.focus();
}

/**
 * Accessible summary of validation failures that links back to each field.
 *
 * Renders nothing when `errors` is empty, so it can stay mounted for the whole
 * lifetime of a form. Every entry is a link whose accessible name contains both
 * the field label and its message; activating it delegates to `onNavigate` or,
 * by default, focuses the element whose `id` matches `fieldId`.
 *
 * `live="polite"` (the default) renders `role="status"` and `live="assertive"`
 * renders `role="alert"` — exactly one role, never both — with `aria-atomic` so
 * the whole list is announced once. The heading is referenced through
 * `aria-labelledby` to state the intent of the announcement. Colours, radii and
 * motion come from semantic tokens; long and CJK messages wrap instead of
 * clipping.
 */
const FormSummary = forwardRef<HTMLDivElement, FormSummaryProps>(function FormSummary(
  {
    errors,
    title = DEFAULT_TITLE,
    onNavigate,
    live = "polite",
    className,
    ...props
  },
  ref
) {
  const headingId = useId();
  const hasTitle = title != null && title !== "";

  if (errors.length === 0) return null;

  const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;

  function handleNavigate(fieldId: string): void {
    if (onNavigate) {
      onNavigate(fieldId);
      return;
    }
    focusField(fieldId);
  }

  return (
    <div
      ref={ref}
      role={role}
      aria-atomic={live === "off" ? undefined : true}
      aria-labelledby={hasTitle ? headingId : undefined}
      data-km-form-summary=""
      data-live={live}
      className={joinClasses(BASE_CLASSES, className)}
      {...props}
    >
      <span data-part="accent" aria-hidden="true" className={ACCENT_CLASSES} />
      {hasTitle ? (
        <h2 data-part="title" id={headingId} className={TITLE_CLASSES}>
          {title}
        </h2>
      ) : null}
      <ul data-part="list" className={LIST_CLASSES}>
        {errors.map((error, index) => (
          <li
            key={`${error.fieldId}-${index}`}
            data-part="item"
            data-field-id={error.fieldId}
          >
            <a
              data-part="link"
              href={`#${error.fieldId}`}
              // No aria-label: the accessible name is the visible text itself
              // (label + message), so the two can never drift apart (WCAG 2.5.3).
              onClick={(event) => {
                // Navigation is explicit: the default hash jump neither focuses
                // the field nor lets the consumer own scrolling and focus order.
                event.preventDefault();
                handleNavigate(error.fieldId);
              }}
              className={LINK_CLASSES}
            >
              <span data-part="label" className={LABEL_CLASSES}>
                {`${error.label}: `}
              </span>
              <span data-part="message" className={MESSAGE_CLASSES}>
                {error.message}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

FormSummary.displayName = "FormSummary";

export { FormSummary };
export default FormSummary;
