import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** One selectable option. Values stay consumer-owned; the array index is never used. */
export interface SelectOption<Value = string> {
  /** Value reported to `onValueChange` and submitted with the form. Must be unique. */
  value: Value;
  /** Visible option text; also the text used for type-ahead and filtering. */
  label: ReactNode;
  /** Ignore user interaction for this option. @default false */
  disabled?: boolean;
}

/**
 * Props handed to a custom `searchInput` slot. Spread them onto your own input so
 * filtering, focus and the accessible name keep working.
 */
export interface SelectSearchInputRenderProps {
  /** Current filter text. */
  value: string;
  /** Update the filter text. */
  onValueChange: (value: string) => void;
  /** Placeholder forwarded from `searchPlaceholder`. */
  placeholder?: string;
  /** Accessible name for the search field. Always set it on your element. */
  "aria-label": string;
  /** Id to apply to the field so it stays associated with the listbox. */
  id: string;
}

export interface SelectProps<Value = string> {
  /** Visible label, associated with the trigger as its accessible name. */
  label?: ReactNode;
  /** Options to render, in order. */
  options: SelectOption<Value>[];
  /** Controlled selected value. Use `defaultValue` for uncontrolled use. */
  value?: Value | null;
  /** Initial selected value when uncontrolled. */
  defaultValue?: Value | null;
  /** Called with the next selected value, or `null` when cleared. */
  onValueChange?: (value: Value | null) => void;
  /** Trigger text while nothing is selected. */
  placeholder?: string;
  /** Ignore user interaction for the whole control. @default false */
  disabled?: boolean;
  /**
   * Render a filter field above the list so long option sets stay findable.
   * The filter is client-side text matching only — no async/remote loading. @default false
   */
  searchable?: boolean;
  /** Placeholder for the built-in search field. */
  searchPlaceholder?: string;
  /**
   * Replace the built-in search field. Receives the controlled filter state;
   * render your own `<input>` with the provided props. Only used when
   * `searchable` is `true`.
   */
  searchInput?: (props: SelectSearchInputRenderProps) => ReactNode;
  /** Form field name; enables native form submission through a hidden input. */
  name?: string;
  /** Id applied to the trigger; generated when omitted. */
  id?: string;
  /** Require a value before form submission. @default false */
  required?: boolean;
  /**
   * Accessible name for the trigger when no visible `label` is rendered.
   * Ignored when `label` is provided.
   */
  "aria-label"?: string;
  /** Extra classes for the wrapping element. */
  className?: string;
}

const TRIGGER_CLASSES = joinClasses(
  "group flex h-[var(--km-control-height)] w-full items-center justify-between gap-2",
  "rounded-control border border-input bg-surface ps-[var(--km-control-space-x)] pe-3",
  "text-base text-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  // Match the field hover: strengthen the boundary for an enabled trigger only.
  "not-data-[disabled]:hover:border-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
);

const POPUP_CLASSES = joinClasses(
  "z-50 min-w-48 max-h-[var(--available-height)] w-[var(--anchor-width)] overflow-y-auto",
  "rounded-surface border border-border bg-surface-floating p-1 text-foreground shadow-lg",
  "origin-[var(--transform-origin)] transition-[transform,opacity] duration-[var(--km-duration-short)] ease-enter data-[ending-style]:ease-exit",
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
  "data-[starting-style]:[transform:scale(0.97)] data-[ending-style]:[transform:scale(0.97)]"
);

const ITEM_CLASSES = joinClasses(
  "relative flex cursor-default select-none items-center gap-2 rounded-control px-2 py-2 pe-8",
  "text-sm text-foreground outline-none",
  "data-[highlighted]:bg-surface-subtle",
  "data-[selected]:font-medium",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
);

const SEARCH_INPUT_CLASSES = joinClasses(
  "mb-1 w-full rounded-control border border-input bg-surface px-2 py-1.5",
  "text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "transition-colors duration-[var(--km-duration-short)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

/**
 * Accessible single-selection select built on Base UI's Select primitive.
 *
 * The trigger is a native `<button>` exposed as `role="combobox"`; the popup is
 * a `role="listbox"` whose options expose `role="option"` with `aria-selected`.
 * Keyboard behavior comes
 * from the composite: Enter/Space/ArrowDown open the list, arrows move the
 * highlight, Home/End jump to the ends, typed characters jump to a matching
 * option and Escape closes and returns focus to the trigger. Selected state is
 * drawn with a check glyph, never by color alone. When `searchable`, a text
 * field above the list filters options locally by their label.
 *
 * Colors, radii, motion and control sizing all come from semantic tokens, so
 * appearance, density and reduced-motion preferences are handled centrally.
 * `className` lands on the wrapping element; the trigger keeps its own classes.
 */
export function Select<Value = string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled = false,
  searchable = false,
  searchPlaceholder,
  searchInput,
  name,
  id,
  required = false,
  "aria-label": ariaLabel,
  className,
}: SelectProps<Value>) {
  const generatedId = useId();
  const rootId = id ?? generatedId;
  const searchId = `${rootId}-search`;
  const listId = `${rootId}-list`;

  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!searchable || query === "") return options;
    return options.filter((option) =>
      typeof option.label === "string" ? option.label.toLowerCase().includes(query) : true
    );
  }, [options, searchable, search]);

  const empty = searchable && filteredOptions.length === 0;

  function handleValueChange(next: Value | null) {
    onValueChange?.(next);
  }

  function focusOption(edge: "first" | "last") {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])')
    );
    if (items.length === 0) return;
    const target = edge === "first" ? items[0] : items[items.length - 1];
    target?.focus();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Let Escape close the popup and Tab leave the field. Everything else stays
    // inside the search field so Base UI's type-ahead never swallows keystrokes.
    if (event.key === "Escape" || event.key === "Tab") return;
    event.stopPropagation();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption("last");
    }
  }

  const searchAriaLabel =
    typeof label === "string" ? `Search ${label}` : "Search options";

  const searchProps: SelectSearchInputRenderProps = {
    value: search,
    onValueChange: setSearch,
    placeholder: searchPlaceholder,
    "aria-label": searchAriaLabel,
    id: searchId,
  };

  return (
    <div className={joinClasses("flex flex-col gap-1.5", className)}>
      <SelectPrimitive.Root<Value>
        id={rootId}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => handleValueChange(next)}
        onOpenChange={(open) => {
          if (!open) setSearch("");
        }}
        disabled={disabled}
        required={required}
        items={options}
      >
        {label != null && label !== "" ? (
          <SelectPrimitive.Label className="mb-0.5 text-sm font-medium text-foreground">
            {label}
          </SelectPrimitive.Label>
        ) : null}
        <SelectPrimitive.Trigger
          className={TRIGGER_CLASSES}
          disabled={disabled}
          aria-label={label == null || label === "" ? ariaLabel : undefined}
        >
          <SelectPrimitive.Value
            data-km-select-value=""
            placeholder={placeholder}
            className="flex-1 truncate text-start data-[placeholder]:text-muted-foreground"
          />
          <SelectPrimitive.Icon className="inline-flex shrink-0 items-center text-muted-foreground">
            <ChevronIcon className="size-4 transition-transform duration-[var(--km-duration-short)] group-data-[popup-open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            side="bottom"
            align="start"
            sideOffset={4}
            alignItemWithTrigger={false}
            className="z-50 max-w-[var(--available-width)]"
          >
            <SelectPrimitive.Popup data-km-select-popup="" className={POPUP_CLASSES}>
              {searchable ? (
                <div className="p-1 pb-0" onKeyDown={handleSearchKeyDown}>
                  {searchInput ? (
                    searchInput(searchProps)
                  ) : (
                    <input
                      id={searchProps.id}
                      type="text"
                      value={search}
                      placeholder={searchPlaceholder}
                      aria-label={searchProps["aria-label"]}
                      aria-controls={listId}
                      autoComplete="off"
                      onChange={(event) => setSearch(event.target.value)}
                      className={SEARCH_INPUT_CLASSES}
                    />
                  )}
                </div>
              ) : null}
              <SelectPrimitive.List ref={listRef} id={listId} data-km-select-list="">
                {filteredOptions.map((option) => (
                  <SelectPrimitive.Item
                    key={String(option.value)}
                    value={option.value}
                    disabled={option.disabled}
                    label={typeof option.label === "string" ? option.label : undefined}
                    className={ITEM_CLASSES}
                  >
                    <SelectPrimitive.ItemIndicator className="absolute end-2 inline-flex items-center text-primary">
                      <CheckIcon className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText className="flex-1 truncate">
                      {option.label}
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
              {empty ? (
                <div
                  role="presentation"
                  className="px-2 py-3 text-center text-sm text-muted-foreground"
                >
                  No options found
                </div>
              ) : null}
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default Select;
