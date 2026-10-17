import { createContext, forwardRef, useContext, useId, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Layout and arrow-key axis of a radio group. */
export type RadioGroupOrientation = "vertical" | "horizontal";

export interface RadioGroupProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue" | "value"> {
  /** Controlled selected value. Use `defaultValue` for uncontrolled use. */
  value?: string;
  /** Initially selected value when uncontrolled. */
  defaultValue?: string;
  /** Called with the next selected value. Fires once per committed change. */
  onValueChange?: (value: string) => void;
  /**
   * Stack the items vertically or lay them out in a wrapping row. Also sets
   * `aria-orientation` and the arrow-key axis. @default "vertical"
   */
  orientation?: RadioGroupOrientation;
  /** Ignore user interaction for every item in the group. @default false */
  disabled?: boolean;
  /** Visible group label; also the accessible name of the group. */
  label?: ReactNode;
  /** Supporting text shown beneath the group and associated with it. */
  description?: ReactNode;
  /**
   * Validation message. Marks the group invalid, associates the message
   * through `aria-describedby` and announces it with `role="alert"`.
   */
  error?: ReactNode;
  /** Form field name; enables native form submission for the selected item. */
  name?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** `RadioGroup.Item` children. */
  children?: ReactNode;
}

export interface RadioGroupItemProps
  extends Omit<ComponentPropsWithoutRef<"span">, "onChange" | "children" | "value"> {
  /** Unique value submitted with the form and reported to `onValueChange`. */
  value: string;
  /** Visible item label; also the accessible name of the radio. */
  label: ReactNode;
  /** Optional supporting text shown beneath the label. */
  description?: ReactNode;
  /** Ignore user interaction for this item. @default false */
  disabled?: boolean;
  /** Extra classes for the item wrapper (not the circular control). */
  className?: string;
}

const RadioGroupDisabledContext = createContext(false);

const CONTROL_CLASSES = joinClasses(
  "mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
  "border border-input bg-field text-checked-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  // Hover only strengthens the boundary of an enabled, unselected control.
  "not-data-[disabled]:data-[unchecked]:hover:border-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "data-[checked]:border-checked data-[checked]:bg-checked",
  "data-[disabled]:cursor-not-allowed",
  "data-[disabled]:border-border-subtle data-[disabled]:bg-surface-subtle",
  "data-[disabled]:data-[checked]:border-transparent data-[disabled]:data-[checked]:bg-disabled data-[disabled]:data-[checked]:text-disabled-foreground"
);

/**
 * Single-choice selection with a required visible label per item.
 *
 * Built on Base UI's Radio Group: the root is a `role="radiogroup"` element and
 * every item renders a native `<input type="radio">`, so form submission,
 * `name`/`value` pairing and radio semantics come from the platform. A wrapping
 * `<label>` makes the whole row clickable, arrow keys move focus and selection
 * with wrapping, and disabled items are skipped. Selection is drawn with a
 * filled dot inside the control, so it never depends on colour alone.
 *
 * `className` lands on the outer field wrapper; per-item `className` lands on
 * that item's wrapper. The circular control keeps its own token-driven classes.
 */
const RadioGroupRoot = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    value,
    defaultValue,
    onValueChange,
    orientation = "vertical",
    disabled = false,
    label,
    description,
    error,
    name,
    className,
    children,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const [innerValue, setInnerValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : innerValue;

  const hasLabel = label != null && label !== "";
  const hasDescription = description != null && description !== "";
  const hasError = error != null && error !== "";

  const {
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...groupProps
  } = props;

  function handleValueChange(next: string) {
    if (!isControlled) setInnerValue(next);
    onValueChange?.(next);
  }

  // A persistent description stays associated in every state; the error is
  // appended last so it is read after the description when it appears.
  const describedBy = [
    ariaDescribedBy,
    hasDescription ? descriptionId : undefined,
    hasError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={joinClasses("flex flex-col gap-2", className)}>
      {hasLabel ? (
        <div
          id={labelId}
          className={joinClasses(
            "text-sm font-medium",
            disabled ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {label}
        </div>
      ) : null}
      <RadioGroupPrimitive
        ref={ref}
        value={selectedValue}
        onValueChange={(next) => handleValueChange(next)}
        disabled={disabled}
        name={name}
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-describedby={describedBy || undefined}
        aria-invalid={ariaInvalid ?? (hasError || undefined)}
        aria-orientation={orientation}
        data-km-radio-group=""
        className={joinClasses(
          "group flex w-full",
          orientation === "horizontal"
            ? "flex-row flex-wrap items-start gap-x-6 gap-y-2"
            : "flex-col gap-2"
        )}
        {...groupProps}
      >
        <RadioGroupDisabledContext.Provider value={disabled}>
          {children}
        </RadioGroupDisabledContext.Provider>
      </RadioGroupPrimitive>
      {hasDescription ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

RadioGroupRoot.displayName = "RadioGroup";

const RadioGroupItem = forwardRef<HTMLElement, RadioGroupItemProps>(function RadioGroupItem(
  { value, label, description, disabled = false, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const itemId = id ?? generatedId;
  const descriptionId = `${itemId}-description`;
  const groupDisabled = useContext(RadioGroupDisabledContext);
  const isDisabled = groupDisabled || disabled;
  const hasDescription = description != null && description !== "";

  const { "aria-describedby": ariaDescribedBy, ...itemProps } = props;
  const describedBy = [ariaDescribedBy, hasDescription ? descriptionId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-part="item-field"
      className={joinClasses("flex flex-col gap-1", className)}
    >
      <label
        className={joinClasses(
          "inline-flex items-start gap-2",
          isDisabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <RadioPrimitive.Root
          ref={ref}
          id={itemId}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
          data-part="item"
          className={CONTROL_CLASSES}
          {...itemProps}
        >
          <RadioPrimitive.Indicator data-part="indicator" className="flex items-center justify-center">
            {/* The filled dot carries the selected state; colour is a reinforcement only. */}
            <span aria-hidden="true" className="size-2 rounded-full bg-current" />
          </RadioPrimitive.Indicator>
        </RadioPrimitive.Root>
        <span
          className={joinClasses(
            "text-sm font-medium text-foreground",
            isDisabled && "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </label>
      {hasDescription ? (
        <span id={descriptionId} className="ps-7 text-sm text-muted-foreground">
          {description}
        </span>
      ) : null}
    </div>
  );
});

RadioGroupItem.displayName = "RadioGroup.Item";

/**
 * `RadioGroup` with its `Item` part attached, mirroring Base UI's compound
 * shape. The parts are also available as named exports.
 */
const RadioGroup = Object.assign(RadioGroupRoot, { Item: RadioGroupItem });

export { RadioGroup, RadioGroupItem };
export default RadioGroup;
