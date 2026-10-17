import { forwardRef, useId, useState } from "react";
import type { ReactNode } from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
 *
 * The check mark draws itself on check via path-length animation. Motion is
 * gated by `prefers-reduced-motion` so the essential state change remains
 * instant for users who need it.
 */
const Checkbox = forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  {
    id,
    label,
    description,
    className,
    disabled,
    indeterminate,
    checked,
    defaultChecked,
    onCheckedChange,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = `${checkboxId}-description`;
  const reducedMotion = useReducedMotion();

  const [innerChecked, setInnerChecked] = useState(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : innerChecked;
  const showIndicator = isChecked || indeterminate;

  function handleCheckedChange(next: boolean) {
    if (!isControlled) setInnerChecked(next);
    onCheckedChange?.(next);
  }

  return (
    <div className={joinClasses("flex flex-col gap-1", className)}>
      <label htmlFor={checkboxId} className="inline-flex items-start gap-2">
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          disabled={disabled}
          indeterminate={indeterminate}
          checked={isChecked}
          aria-describedby={description != null ? descriptionId : undefined}
          onCheckedChange={(next) => handleCheckedChange(next)}
          className={joinClasses(
            "mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-field text-checked-foreground",
            "transition-colors duration-[var(--km-duration-short)] ease-continuity",
            "data-[unchecked]:hover:bg-surface-subtle",
            "data-[checked]:border-checked data-[checked]:bg-checked",
            "data-[indeterminate]:border-checked data-[indeterminate]:bg-checked",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "data-[disabled]:cursor-not-allowed",
            "data-[disabled]:data-[unchecked]:border-border-subtle data-[disabled]:data-[unchecked]:bg-surface-subtle data-[disabled]:data-[unchecked]:text-muted-foreground",
            "data-[disabled]:data-[checked]:border-transparent data-[disabled]:data-[checked]:bg-disabled data-[disabled]:data-[checked]:text-disabled-foreground",
            "data-[disabled]:data-[indeterminate]:border-transparent data-[disabled]:data-[indeterminate]:bg-disabled data-[disabled]:data-[indeterminate]:text-disabled-foreground"
          )}
          {...props}
        >
          <span aria-hidden className="flex items-center justify-center">
            <AnimatePresence initial={false}>
              {showIndicator && (
                <motion.svg
                  key="indicator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.12 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  {!indeterminate ? (
                    <motion.path
                      d="M20 6 9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ pathLength: 0 }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
                    />
                  ) : (
                    <motion.path
                      d="M6 12h12"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ pathLength: 0 }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
                    />
                  )}
                </motion.svg>
              )}
            </AnimatePresence>
          </span>
        </CheckboxPrimitive.Root>
        {label != null ? (
          <span
            className={joinClasses(
              "text-sm font-medium text-foreground",
              disabled && "text-muted-foreground"
            )}
          >
            {label}
          </span>
        ) : null}
      </label>
      {description != null ? (
        <span id={descriptionId} className="ps-7 text-sm text-muted-foreground">
          {description}
        </span>
      ) : null}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };
export default Checkbox;
