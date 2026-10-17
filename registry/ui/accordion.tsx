import { forwardRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Axis the accordion is laid out on. Both arrow pairs move focus. */
export type AccordionOrientation = "horizontal" | "vertical";

const ROOT_CLASSES = joinClasses(
  "overflow-hidden rounded-surface border border-border bg-surface text-foreground",
  "divide-y divide-border"
);

const TRIGGER_CLASSES = joinClasses(
  // `group` lets the chevron react to the trigger's own open state.
  "group flex w-full items-center justify-between gap-3",
  "min-h-[var(--km-control-height)] px-[var(--km-control-space-x)] py-3",
  "text-start text-base font-medium text-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "hover:bg-surface-subtle active:bg-surface-inset",
  // The inset ring stays visible inside the card's clipped corners.
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
  "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground data-[disabled]:hover:bg-transparent"
);

const PANEL_CLASSES = joinClasses(
  "h-[var(--accordion-panel-height)] overflow-hidden",
  "text-sm text-muted-foreground",
  "transition-[height] duration-[var(--km-duration-short)] ease-continuity",
  "data-[starting-style]:h-0 data-[ending-style]:h-0",
  // Without motion the panel opens and closes immediately; no content depends on it.
  "motion-reduce:transition-none"
);

const CHEVRON_CLASSES = joinClasses(
  "size-4 shrink-0 text-muted-foreground",
  "transition-transform duration-[var(--km-duration-short)] ease-continuity",
  "motion-reduce:transition-none",
  "group-data-[panel-open]:rotate-180"
);

export interface AccordionProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Allow more than one panel to stay open at once.
   * @default false
   */
  openMultiple?: boolean;
  /** Controlled list of open item values. */
  value?: string[];
  /** Open item values when uncontrolled. @default [] */
  defaultValue?: string[];
  /** Called with the complete next list of open item values. */
  onValueChange?: (value: string[]) => void;
  /** Ignore all interaction for the whole accordion. @default false */
  disabled?: boolean;
  /** Layout axis; both arrow pairs move focus regardless. @default "vertical" */
  orientation?: AccordionOrientation;
  /** Extra classes for the root element; consumer classes win. */
  className?: string;
}

export interface AccordionItemProps extends ComponentPropsWithoutRef<"div"> {
  /** Unique value identifying this item; used by `value` and `defaultValue`. */
  value: string;
  /** Ignore interaction for this item only. @default false */
  disabled?: boolean;
  /** Extra classes for the item wrapper; consumer classes win. */
  className?: string;
}

export interface AccordionHeaderProps extends ComponentPropsWithoutRef<"h3"> {
  /** Extra classes for the heading; consumer classes win. */
  className?: string;
  children?: ReactNode;
}

export interface AccordionTriggerProps extends ComponentPropsWithoutRef<"button"> {
  /** Extra classes for the trigger button; consumer classes win. */
  className?: string;
  children?: ReactNode;
}

export interface AccordionPanelProps extends ComponentPropsWithoutRef<"div"> {
  /** Extra classes for the panel; consumer classes win. */
  className?: string;
  children?: ReactNode;
}

/**
 * Information-dense disclosure list built on Base UI's Accordion primitive.
 *
 * Each item pairs a real `<h3>` heading with a native `<button>` trigger; Base UI
 * wires `aria-expanded`, `aria-controls` and the panel's `role="region"` plus
 * `aria-labelledby` back to that trigger. Enter and Space toggle from the
 * platform. Arrow keys, Home and End move focus between enabled triggers (both
 * arrow pairs work), wrapping at the ends; disabled items are skipped and
 * announced as disabled.
 *
 * The panel animates from its measured height using
 * `--accordion-panel-height`, so long and CJK content is never clipped after it
 * opens. The motion is a tokenised transition that disappears under
 * `prefers-reduced-motion: reduce`, leaving an instantly open panel.
 */
const AccordionRoot = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    openMultiple = false,
    value,
    defaultValue,
    onValueChange,
    disabled = false,
    orientation = "vertical",
    className,
    children,
    ...props
  },
  ref
) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(defaultValue ?? []);
  const openValue = isControlled ? value : uncontrolledValue;

  function handleValueChange(next: string[]) {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  return (
    <AccordionPrimitive.Root
      ref={ref}
      value={openValue}
      onValueChange={handleValueChange}
      multiple={openMultiple}
      disabled={disabled}
      orientation={orientation}
      data-km-accordion="root"
      {...props}
      className={joinClasses(ROOT_CLASSES, className)}
    >
      {children}
    </AccordionPrimitive.Root>
  );
});

AccordionRoot.displayName = "Accordion";

/** One disclosure item; groups a header/trigger with its panel. */
const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, disabled = false, className, children, ...props },
  ref
) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      value={value}
      disabled={disabled}
      data-km-accordion="item"
      {...props}
      className={joinClasses("min-w-0", className)}
    >
      {children}
    </AccordionPrimitive.Item>
  );
});

AccordionItem.displayName = "Accordion.Item";

/** Heading that labels the trigger and its panel (`<h3>` by default). */
const AccordionHeader = forwardRef<HTMLHeadingElement, AccordionHeaderProps>(
  function AccordionHeader({ className, children, ...props }, ref) {
    return (
      <AccordionPrimitive.Header
        ref={ref}
        data-km-accordion="header"
        {...props}
        className={joinClasses("m-0", className)}
      >
        {children}
      </AccordionPrimitive.Header>
    );
  }
);

AccordionHeader.displayName = "Accordion.Header";

/** Native button that expands or collapses the item's panel. */
const AccordionTrigger = forwardRef<HTMLElement, AccordionTriggerProps>(
  function AccordionTrigger({ className, children, onKeyDown, ...props }, ref) {
    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      const root = event.currentTarget.closest<HTMLElement>('[data-km-accordion="root"]');
      if (!root) return;

      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>(
          '[data-km-accordion="trigger"]:not([disabled]):not([data-disabled])'
        )
      ).filter((trigger) => trigger.closest('[data-km-accordion="root"]') === root);
      if (triggers.length === 0) return;

      const current = triggers.indexOf(event.currentTarget);
      let nextIndex: number;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = triggers.length - 1;
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = current < 0 ? 0 : (current + 1) % triggers.length;
      } else {
        nextIndex = current < 0 ? triggers.length - 1 : (current - 1 + triggers.length) % triggers.length;
      }

      event.preventDefault();
      triggers[nextIndex]?.focus();
    }

    return (
      <AccordionPrimitive.Trigger
        ref={ref}
        data-km-accordion="trigger"
        {...props}
        onKeyDown={(event) => {
          handleKeyDown(event);
          onKeyDown?.(event);
        }}
        className={joinClasses(TRIGGER_CLASSES, className)}
      >
        <span className="min-w-0 flex-1 break-words">{children}</span>
        <ChevronIcon className={CHEVRON_CLASSES} />
      </AccordionPrimitive.Trigger>
    );
  }
);

AccordionTrigger.displayName = "Accordion.Trigger";

/**
 * Region that holds the item content. Height is driven by Base UI's measured
 * `--accordion-panel-height`; inner padding lives on a child so the panel can
 * truly collapse to zero.
 */
const AccordionPanel = forwardRef<HTMLDivElement, AccordionPanelProps>(function AccordionPanel(
  { className, children, ...props },
  ref
) {
  return (
    <AccordionPrimitive.Panel
      ref={ref}
      data-km-accordion="panel"
      {...props}
      className={joinClasses(PANEL_CLASSES, className)}
    >
      <div className="break-words px-[var(--km-control-space-x)] pb-4">{children}</div>
    </AccordionPrimitive.Panel>
  );
});

AccordionPanel.displayName = "Accordion.Panel";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * `Accordion` with its `Item`, `Header`, `Trigger` and `Panel` parts attached,
 * mirroring Base UI's compound shape. The parts are also named exports.
 */
const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
});

export { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel };
export default Accordion;
