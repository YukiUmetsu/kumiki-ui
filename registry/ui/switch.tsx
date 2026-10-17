import { forwardRef, useId, useState } from "react";
import type { ReactNode } from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { motion, useReducedMotion } from "motion/react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export interface SwitchProps {
  /** Id applied to the control; generated when omitted. */
  id?: string;
  /** Form field name. */
  name?: string;
  /** Controlled on/off state. Use `defaultChecked` for uncontrolled use. */
  checked?: boolean;
  /** Initial on/off state when uncontrolled. @default false */
  defaultChecked?: boolean;
  /** Called with the next on/off value. */
  onCheckedChange?: (checked: boolean) => void;
  /** Ignore user interaction. @default false */
  disabled?: boolean;
  /** Require the switch to be on before form submission. @default false */
  required?: boolean;
  /** Prevent the user from changing the value. @default false */
  readOnly?: boolean;
  /** Value submitted with the form when on. */
  value?: string;
  /** Visible label; also provides the accessible name. */
  label?: ReactNode;
  /** Optional supporting description shown beneath the label. */
  description?: ReactNode;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const MotionThumb = motion.create(SwitchPrimitive.Thumb);

/**
 * On/off switch for a single boolean setting.
 *
 * Built on Base UI's Switch: renders `role="switch"` with `aria-checked`, toggles
 * on click, Space and Enter, and submits through a hidden input. The moving thumb
 * plus track color together communicate state, so on/off is never conveyed by
 * color alone. Use a Checkbox for selection, not settings — do not substitute
 * this control for a checkbox.
 *
 * The thumb slides with a spring and the whole animation respects reduced-motion
 * preferences.
 */
const Switch = forwardRef<HTMLElement, SwitchProps>(function Switch(
  {
    id,
    label,
    description,
    className,
    disabled,
    checked,
    defaultChecked,
    onCheckedChange,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = `${switchId}-description`;
  const reducedMotion = useReducedMotion();

  const [innerChecked, setInnerChecked] = useState(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : innerChecked;

  function handleCheckedChange(next: boolean) {
    if (!isControlled) setInnerChecked(next);
    onCheckedChange?.(next);
  }

  return (
    <div className={joinClasses("flex flex-col gap-1", className)}>
      <label htmlFor={switchId} className="inline-flex items-start gap-3">
        <SwitchPrimitive.Root
          ref={ref}
          id={switchId}
          disabled={disabled}
          checked={isChecked}
          aria-describedby={description != null ? descriptionId : undefined}
          onCheckedChange={(next) => handleCheckedChange(next)}
          className={joinClasses(
            "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-track p-1",
            "transition-colors duration-[var(--km-duration-short)] ease-continuity",
            "data-[checked]:bg-checked",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "data-[disabled]:cursor-not-allowed",
            "data-[disabled]:data-[unchecked]:border-border-subtle data-[disabled]:data-[unchecked]:bg-surface-subtle",
            "data-[disabled]:data-[checked]:border-transparent data-[disabled]:data-[checked]:bg-disabled"
          )}
          {...props}
        >
          <MotionThumb
            animate={{ x: isChecked ? 20 : 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 500, damping: 30 }
            }
            className="size-5 rounded-full bg-surface shadow"
          />
        </SwitchPrimitive.Root>
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
        <span id={descriptionId} className="ps-14 text-sm text-muted-foreground">
          {description}
        </span>
      ) : null}
    </div>
  );
});

Switch.displayName = "Switch";

export { Switch };
export default Switch;
