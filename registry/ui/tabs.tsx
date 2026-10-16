import { createContext, forwardRef, useContext, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Axis the tab list is laid out on and navigated with. */
export type TabsOrientation = "horizontal" | "vertical";

interface TabsConfig {
  label?: string;
  orientation: TabsOrientation;
}

const TabsConfigContext = createContext<TabsConfig>({ orientation: "horizontal" });

export interface TabsProps {
  /** Controlled active tab index. `null` means no tab is active. */
  activeIndex?: number | null;
  /** Initial active index when uncontrolled. @default 0 */
  defaultActiveIndex?: number | null;
  /** Called with the next active index (`null` when cleared with Escape). */
  onChange?: (index: number | null) => void;
  /**
   * Layout and navigation axis. `"vertical"` stacks the tabs and wires the
   * Up/Down arrows; `"horizontal"` rows them and wires Left/Right.
   * @default "horizontal"
   */
  orientation?: TabsOrientation;
  /**
   * Move focus with the perpendicular arrow pair instead of the one implied by
   * `orientation`. `orientation` still drives layout and `aria-orientation`, so
   * the accessible axis never disagrees with what is shown.
   * @default false
   */
  orientationSwap?: boolean;
  /**
   * Pressing Escape while focus is inside the tabs clears the selection and
   * calls `onChange(null)`. Off by default because Escape is often owned by an
   * enclosing overlay.
   * @default false
   */
  closeOnEscape?: boolean;
  /** Accessible name for the tab list (`aria-label`). */
  label?: string;
  /** Extra classes for the root wrapper. */
  className?: string;
  /** `Tabs.List`, `Tabs.Tab` and `Tabs.Panel` parts. */
  children?: ReactNode;
  /** Extra key handler, called after the built-in Escape handling. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Index-based tab set with roving focus, honest selected state and overflow.
 *
 * Layout, selection, arrow-key focus and the `role="tablist"` / `role="tab"` /
 * `role="tabpanel"` wiring come from Base UI's Tabs primitive. This wrapper
 * renames the root contract to an index model (`activeIndex` /
 * `defaultActiveIndex` / `onChange`), adds an opt-in Escape-to-clear behavior
 * and keeps the list scrollable when it no longer fits its container.
 *
 * The active tab is never signalled by color alone: it also carries a filled
 * surface and an accent rule along the list axis. All colors, radii and motion
 * come from semantic tokens.
 */
const TabsRoot = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    activeIndex,
    defaultActiveIndex = 0,
    onChange,
    orientation = "horizontal",
    orientationSwap = false,
    closeOnEscape = false,
    label,
    className,
    children,
    onKeyDown,
    ...props
  },
  ref
) {
  const [uncontrolledIndex, setUncontrolledIndex] = useState<number | null>(defaultActiveIndex);
  const isControlled = activeIndex !== undefined;
  const value = isControlled ? activeIndex : uncontrolledIndex;

  // Base UI reads `orientation` to pick the arrow-key pair. Swapping only that
  // value (never the visual/labelled orientation) keeps keyboard and ARIA in
  // sync with the layout a consumer actually renders.
  const navigationOrientation: TabsOrientation = orientationSwap
    ? orientation === "horizontal"
      ? "vertical"
      : "horizontal"
    : orientation;

  function handleValueChange(next: number | null) {
    if (!isControlled) setUncontrolledIndex(next);
    onChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (closeOnEscape && event.key === "Escape" && value !== null) {
      event.preventDefault();
      handleValueChange(null);
    }
    onKeyDown?.(event);
  }

  const config = useMemo<TabsConfig>(() => ({ label, orientation }), [label, orientation]);

  return (
    <TabsConfigContext.Provider value={config}>
      <TabsPrimitive.Root
        ref={ref}
        value={value}
        orientation={navigationOrientation}
        onValueChange={(next) => handleValueChange(next as number | null)}
        data-km-tabs="root"
        {...props}
        onKeyDown={handleKeyDown}
        className={joinClasses(className)}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsConfigContext.Provider>
  );
});

TabsRoot.displayName = "Tabs";

export interface TabsListProps {
  /** Activate the focused tab as the arrow keys move. @default false */
  activateOnFocus?: boolean;
  /** Wrap focus from the last tab back to the first and vice versa. @default true */
  loopFocus?: boolean;
  /** Accessible name; overrides the `label` given to `Tabs`. */
  "aria-label"?: string;
  /** Extra classes for the tab list. */
  className?: string;
  /** `Tabs.Tab` children. */
  children?: ReactNode;
}

/**
 * `role="tablist"` for the tabs. Horizontally it scrolls instead of clipping
 * (`overflow-x-auto`); vertically it grows into a scroll container
 * (`overflow-y-auto`), so long or CJK labels never break the layout.
 */
const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { activateOnFocus, loopFocus, "aria-label": ariaLabel, className, children, ...props },
  ref
) {
  const { label, orientation } = useContext(TabsConfigContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      aria-label={ariaLabel ?? label}
      aria-orientation={orientation}
      activateOnFocus={activateOnFocus}
      loopFocus={loopFocus}
      data-km-tabs="list"
      className={joinClasses(
        "inline-flex max-w-full items-center gap-1 rounded-control bg-surface-subtle p-1",
        orientation === "vertical"
          ? "flex-col overflow-y-auto"
          : "flex-row overflow-x-auto",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
});

TabsList.displayName = "Tabs.List";

export interface TabsTabProps {
  /** Index of the tab; match it with the `Tabs.Panel` and `activeIndex`. */
  value: number;
  /** Ignore user interaction and skip the tab while navigating. @default false */
  disabled?: boolean;
  /** Extra classes for the tab button. */
  className?: string;
  /** Visible label; also the accessible name. */
  children?: ReactNode;
}

/** Individual `role="tab"` button. Selection is conveyed by surface + accent rule, not color alone. */
const TabsTab = forwardRef<HTMLElement, TabsTabProps>(function TabsTab(
  { value, className, children, ...props },
  ref
) {
  const { orientation } = useContext(TabsConfigContext);
  return (
    <TabsPrimitive.Tab
      ref={ref}
      value={value}
      data-km-tabs="tab"
      className={joinClasses(
        "relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[calc(var(--km-control-radius)-2px)] px-3",
        "text-[length:var(--km-type-size-sm)] font-medium text-muted-foreground",
        "transition-colors duration-[var(--km-duration-short)]",
        "hover:bg-surface/60 hover:text-foreground",
        "data-[active]:bg-surface data-[active]:text-foreground",
        orientation === "vertical"
          ? "data-[active]:shadow-[inset_2px_0_0_0_var(--km-action-primary)]"
          : "data-[active]:shadow-[inset_0_-2px_0_0_var(--km-action-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  );
});

TabsTab.displayName = "Tabs.Tab";

export interface TabsPanelProps {
  /** Index of the matching `Tabs.Tab`. */
  value: number;
  /** Keep the panel in the DOM while it is hidden. @default false */
  keepMounted?: boolean;
  /** Extra classes for the panel. */
  className?: string;
  children?: ReactNode;
}

/** `role="tabpanel"` for the active tab, labelled by its tab. */
const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(function TabsPanel(
  { className, children, ...props },
  ref
) {
  return (
    <TabsPrimitive.Panel
      ref={ref}
      data-km-tabs="panel"
      className={joinClasses(
        "mt-3 rounded-control text-[length:var(--km-type-size-base)] text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Panel>
  );
});

TabsPanel.displayName = "Tabs.Panel";

/**
 * `Tabs` with its `List`, `Tab` and `Panel` parts attached, mirroring Base UI's
 * compound shape. The parts are also available as named exports.
 */
const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});

export { Tabs, TabsList, TabsTab, TabsPanel };
export default Tabs;
