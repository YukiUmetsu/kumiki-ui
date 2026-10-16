import { forwardRef, useId } from "react";
import type { ReactNode } from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export interface CheckboxProps {
  /** Id applied to the hidden input; generated when omitted. */
  id?: string;
  /** Form field name. */
  name?: string;
  /** Controlled checked state. Use `defaultChecked` for uncontrolled use. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. @default false */
  defaultChecked?: boolean;
  /** Called with the next checked value. */
  onCheckedChange?: (checked: boolean) => void;
  /** Render the mixed state: neither checked nor unchecked. @default false */
  indeterminate?: boolean;
  /** Ignore user interaction. @default false */
  disabled?: boolean;
  /** Require the box to be checked before form submission. @default false */
  required?: boolean;
  /** Prevent the user from changing the value. @default false */
  readOnly?: boolean;
  /** Value submitted with the form when checked. */
  value?: string;
  /** Visible label; also provides the accessible name. */
  label?: ReactNode;
  /** Optional supporting description shown beneath the label. */
  description?: ReactNode;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Checkbox with checked, unchecked and indeterminate states.
 *
 * Built on Base UI's Checkbox: the whole `<label>` is clickable, Space toggles
 * the control, and the hidden input participates in native form submission.
 * A native wrapping `<label>` supplies the accessible name; `aria-label` wins
 * when provided. Selected state is never conveyed by color alone (a check or
 * dash glyph is always drawn).
 */
const Checkbox = forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  { id, label, description, className, disabled, indeterminate, onCheckedChange, ...props },
  ref
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = `${checkboxId}-description`;

  return (
    <div className={joinClasses("flex flex-col gap-0.5", className)}>
      <label htmlFor={checkboxId} className="inline-flex items-start gap-2">
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          disabled={disabled}
          indeterminate={indeterminate}
          aria-describedby={description != null ? descriptionId : undefined}
          onCheckedChange={(checked) => onCheckedChange?.(checked)}
          className={joinClasses(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-surface text-primary-foreground",
            "transition-colors duration-[var(--km-duration-short)] ease-continuity",
            "data-[unchecked]:hover:bg-surface-subtle",
            "data-[checked]:border-primary data-[checked]:bg-primary",
            "data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="group flex items-center justify-center">
            <CheckIcon className="size-4 group-data-[indeterminate]:hidden" />
            <MinusIcon className="hidden size-4 group-data-[indeterminate]:block" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label != null ? (
          <span className="text-base text-foreground">
            {label}
          </span>
        ) : null}
      </label>
      {description != null ? (
        <span
          id={descriptionId}
          className="ps-7 text-sm text-muted-foreground"
        >
          {description}
        </span>
      ) : null}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M6 12h12" />
    </svg>
  );
}

export { Checkbox };
export default Checkbox;
