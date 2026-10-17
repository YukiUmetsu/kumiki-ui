import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Alignment of the popup along its anchor edge. */
export type DropdownMenuAlign = "start" | "center" | "end";

/**
 * One row in a dropdown menu. A row is either an interactive action, a nested
 * submenu trigger (when `items` is provided) or a separator (when
 * `separator` is `true`).
 */
export interface DropdownMenuEntry {
  /** Stable identity; the array index is used when omitted. */
  id?: string;
  /** Visible content, and the text used for type-ahead navigation. */
  label?: ReactNode;
  /**
   * Called when the entry is activated by click, Enter or Space. Ignored for
   * disabled entries, submenu triggers and separators.
   */
  onSelect?: () => void;
  /** Ignore user interaction for this entry. @default false */
  disabled?: boolean;
  /** Render with destructive emphasis (danger color and matching highlight). @default false */
  destructive?: boolean;
  /** Trailing hint such as a shortcut. `aria-hidden`, so never the only label. */
  shortcut?: ReactNode;
  /**
   * Render this entry as a non-interactive separator rule instead of an item.
   * `label`, `onSelect` and `items` are ignored when set. @default false
   */
  separator?: boolean;
  /**
   * Nested entries. When present the row becomes a submenu trigger that opens a
   * child menu on click or the Right arrow key.
   */
  items?: DropdownMenuEntry[];
}

export interface DropdownMenuProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called whenever the open state changes (selection, outside press, Escape). */
  onOpenChange?: (open: boolean) => void;
  /**
   * The anchor element the menu is attached to. Render a native element or a
   * Kumiki control that forwards DOM props and refs — Base UI merges the trigger
   * behavior onto it, exactly like `Tooltip`'s anchor. It must keep its own
   * accessible name (e.g. `aria-label`) because the menu never labels the trigger.
   */
  children: ReactElement;
  /** Entries to render, in order. Separators and submenus are declared inline. */
  items: DropdownMenuEntry[];
  /**
   * Draw a separating rule beneath the optional `label` header, before the first
   * item. Independent of the inline `{ separator: true }` entries. @default false
   */
  separator?: boolean;
  /**
   * Ignore user interaction for the whole menu: the trigger and every item become
   * non-interactive. Individual entries can still be disabled on their own.
   * @default false
   */
  disabled?: boolean;
  /** Whether Escape closes the menu. When `false`, Escape is left to the page. @default true */
  closeOnEscape?: boolean;
  /** Alignment of the popup along the bottom edge of the anchor. @default "start" */
  align?: DropdownMenuAlign;
  /** Gap between the anchor and the popup, in pixels. @default 4 */
  sideOffset?: number;
  /**
   * Accessible name for the menu, and an optional visible header shown above the
   * items. Provide a string when the menu has no other label (for example an
   * icon-only trigger).
   */
  label?: ReactNode;
  /** Extra classes merged onto the popup surface. */
  className?: string;
}

const ITEM_BASE = [
  "relative flex cursor-default select-none items-center gap-2 rounded-control px-2 py-2",
  "text-sm outline-none",
  "transition-colors duration-[var(--km-duration-short)]",
  "data-[highlighted]:bg-surface-subtle active:bg-surface-inset",
  "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground data-[disabled]:bg-transparent",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-floating",
].join(" ");

function itemClasses(destructive?: boolean): string {
  return joinClasses(ITEM_BASE, destructive ? "text-destructive" : "text-foreground");
}

const POPUP_CLASSES = [
  "z-50 min-w-48 max-h-[var(--available-height)] overflow-y-auto rounded-surface border border-border bg-surface-floating p-1",
  "text-foreground shadow-lg",
  "origin-[var(--transform-origin)]",
].join(" ");

const SUBMENU_POPUP_CLASSES = [
  POPUP_CLASSES,
  "transition-[transform,opacity] duration-[var(--km-duration-short)] ease-enter data-[ending-style]:ease-exit",
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
  "data-[starting-style]:[transform:scale(0.97)] data-[ending-style]:[transform:scale(0.97)]",
].join(" ");

const SEPARATOR_CLASSES = "my-1 h-px shrink-0 bg-border/70";

const MotionPopup = motion.create(MenuPrimitive.Popup);

/**
 * Accessible dropdown menu built on Base UI's Menu primitive, driven by an
 * `items` array.
 *
 * Keyboard and ARIA behavior come from the composite: the popup is `role="menu"`,
 * items are `role="menuitem"`, focus is roving with arrow keys (Up/Down wrap
 * through entries, Home/End jump to the first/last, typed characters move to a
 * matching item), Right/Left arrow keys open and close submenus, and Escape
 * dismisses the menu and returns focus to the anchor. Disabled entries are
 * skipped by keyboard navigation and never activate; destructive entries are
 * distinguished by color **and** by their label, never by color alone.
 *
 * Position and collision handling use the same anchor machinery as `Tooltip`:
 * the popup flips and shifts to stay inside the viewport, and the anchor is the
 * element passed as `children`.
 *
 * The main menu popup enters and exits with a spring-driven fade + subtle scale,
 * wrapped in `AnimatePresence` and suppressed under reduced motion.
 */
export function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  children,
  items,
  separator = false,
  disabled = false,
  closeOnEscape = true,
  align = "start",
  sideOffset = 4,
  label,
  className,
}: DropdownMenuProps) {
  const reducedMotion = useReducedMotion();
  const [innerOpen, setInnerOpen] = useState(open ?? defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : innerOpen;

  useEffect(() => {
    if (isControlled) setInnerOpen(open);
  }, [isControlled, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setInnerOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  const transition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 400, damping: 30 };

  return (
    <MenuPrimitive.Root
      open={isOpen}
      defaultOpen={!isControlled ? defaultOpen : undefined}
      onOpenChange={(nextOpen, details) => {
        // `closeOnEscape={false}` opts out of Escape dismissal: cancel the close
        // Base UI requested for the escape key and leave the event to the page.
        if (!nextOpen && !closeOnEscape && details.reason === "escape-key") {
          details.cancel();
          return;
        }
        handleOpenChange(nextOpen);
      }}
      disabled={disabled}
    >
      <MenuPrimitive.Trigger render={children} disabled={disabled} />
      <AnimatePresence>
        {isOpen && (
          <MenuPrimitive.Portal key="dropdown-portal">
            <MenuPrimitive.Positioner
              side="bottom"
              align={align}
              sideOffset={sideOffset}
              data-km-align={align}
              className="z-50"
            >
              <MotionPopup
                aria-label={typeof label === "string" ? label : undefined}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={transition}
                className={joinClasses(POPUP_CLASSES, className)}
              >
                {label != null ? (
                  <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                ) : null}
                {separator ? <MenuPrimitive.Separator className={SEPARATOR_CLASSES} /> : null}
                <EntryList items={items} />
              </MotionPopup>
            </MenuPrimitive.Positioner>
          </MenuPrimitive.Portal>
        )}
      </AnimatePresence>
    </MenuPrimitive.Root>
  );
}

function EntryList({ items }: { items: DropdownMenuEntry[] }) {
  return (
    <>
      {items.map((entry, index) => (
        <Entry key={entry.id ?? index} entry={entry} />
      ))}
    </>
  );
}

function Entry({ entry }: { entry: DropdownMenuEntry }) {
  if (entry.separator) {
    return <MenuPrimitive.Separator className={SEPARATOR_CLASSES} />;
  }

  const textLabel = typeof entry.label === "string" ? entry.label : undefined;

  if (entry.items && entry.items.length > 0) {
    return (
      <MenuPrimitive.SubmenuRoot>
        <MenuPrimitive.SubmenuTrigger
          label={textLabel}
          disabled={entry.disabled}
          className={itemClasses(entry.destructive)}
        >
          <span className="flex-1">{entry.label}</span>
          {entry.shortcut != null ? (
            <span aria-hidden="true" className="text-muted-foreground">
              {entry.shortcut}
            </span>
          ) : null}
          <span aria-hidden="true" className="ps-2 text-muted-foreground">
            ›
          </span>
        </MenuPrimitive.SubmenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Positioner side="inline-end" align="start" sideOffset={2} className="z-50">
            <MenuPrimitive.Popup className={SUBMENU_POPUP_CLASSES}>
              <EntryList items={entry.items} />
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
      </MenuPrimitive.SubmenuRoot>
    );
  }

  return (
    <MenuPrimitive.Item
      label={textLabel}
      disabled={entry.disabled}
      onClick={entry.disabled ? undefined : entry.onSelect}
      className={itemClasses(entry.destructive)}
    >
      <span className="flex-1">{entry.label}</span>
      {entry.shortcut != null ? (
        <span aria-hidden="true" className="text-muted-foreground">
          {entry.shortcut}
        </span>
      ) : null}
    </MenuPrimitive.Item>
  );
}

export default DropdownMenu;
