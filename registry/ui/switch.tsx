import { forwardRef, useId } from "react";
import type { ReactNode } from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

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

/**
 * On/off switch for a single boolean setting.
 *
 * Built on Base UI's Switch: renders `role="switch"` with `aria-checked`, toggles
 * on click, Space and Enter, and submits through a hidden input. The moving thumb
 * plus track color together communicate state, so on/off is never conveyed by
 * color alone. Use a Checkbox for selection, not settings — do not substitute
 * this control for a checkbox.
 */
const Switch = forwardRef<HTMLElement, SwitchProps>(function Switch(
  { id, label, description, className, disabled, onCheckedChange, ...props },
  ref
) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = `${switchId}-description`;

  return (
    <div className={joinClasses("flex flex-col gap-0.5", className)}>
      <label htmlFor={switchId} className="inline-flex items-start gap-3">
        <SwitchPrimitive.Root
          ref={ref}
          id={switchId}
          disabled={disabled}
          aria-describedby={description != null ? descriptionId : undefined}
          onCheckedChange={(checked) => onCheckedChange?.(checked)}
          className={joinClasses(
            "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-surface-inset p-0.5",
            "transition-colors duration-[var(--km-duration-short)] ease-continuity",
            "data-[checked]:bg-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
          )}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={joinClasses(
              "size-5 rounded-full bg-surface shadow-xs",
              "transition-transform duration-[var(--km-duration-short)] ease-continuity",
              "data-[checked]:translate-x-5"
            )}
          />
        </SwitchPrimitive.Root>
        {label != null ? (
          <span className="text-base text-foreground">
            {label}
          </span>
        ) : null}
      </label>
      {description != null ? (
        <span
          id={descriptionId}
          className="ps-14 text-sm text-muted-foreground"
        >
          {description}
        </span>
      ) : null}
    </div>
  );
});

Switch.displayName = "Switch";

export { Switch };
export default Switch;
