import { forwardRef, useCallback, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** One selectable option. Values stay consumer-owned; the array index is never used. */
export interface ComboboxOption {
  /** Value reported to `onValueChange`. Must be unique within the list. */
  value: string;
  /** Visible option text; also the text used for filtering unless `filter` overrides it. */
  label: string;
  /** Secondary line shown beneath the label. It is visible only: the option's accessible name is its `label`. */
  description?: string;
  /** Ignore user interaction and skip the option while navigating. @default false */
  disabled?: boolean;
  /**
   * Group heading. Consecutive options sharing a group render together inside a
   * named `role="group"`; option order is otherwise preserved.
   */
  group?: string;
}

interface ComboboxBaseProps
  extends Omit<
    ComponentPropsWithoutRef<"input">,
    | "children"
    | "className"
    | "defaultValue"
    | "disabled"
    | "id"
    | "multiple"
    | "name"
    | "onChange"
    | "placeholder"
    | "required"
    | "size"
    | "type"
    | "value"
  > {
  /** Options to render and filter, in order. Values must be unique. */
  options: ComboboxOption[];
  /** Visible label, associated with the text field as its accessible name. */
  label?: ReactNode;
  /** Text-field placeholder, shown while the query is empty. */
  placeholder?: string;
  /** Ignore user interaction for the whole control. @default false */
  disabled?: boolean;
  /**
   * Show an honest pending state instead of options. While `true` the list is
   * empty, no option is offered or selectable, and the popup announces that
   * options are loading. @default false
   */
  loading?: boolean;
  /** Copy shown when the current query matches nothing. @default "No options found" */
  emptyMessage?: ReactNode;
  /**
   * Custom match test. Receives one option and the trimmed query.
   * @default case-insensitive substring match on `option.label`
   */
  filter?: (option: ComboboxOption, query: string) => boolean;
  /** Extra classes for the wrapping element; the field keeps its own classes. */
  className?: string;
  /** Form field name; enables native form submission through a hidden input. */
  name?: string;
  /** Require a value before form submission. @default false */
  required?: boolean;
  /** Id applied to the text field; generated when omitted. */
  id?: string;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  /** @default false */
  multiple?: false;
  /** Controlled selected value. Use `defaultValue` for uncontrolled use. */
  value?: string | null;
  /** Initial selected value when uncontrolled. */
  defaultValue?: string | null;
  /** Called with the next selected value when one is chosen. */
  onValueChange?: (value: string) => void;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  /** Allow several selections; selected values render as removable chips. */
  multiple: true;
  /** Controlled selected values. Use `defaultValue` for uncontrolled use. */
  value?: string[];
  /** Initially selected values when uncontrolled. @default [] */
  defaultValue?: string[];
  /** Called with the complete next selection, in the order values were added. */
  onValueChange?: (value: string[]) => void;
}

/** Combobox props. The value types narrow from `multiple`. */
export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

const FIELD_CLASSES = joinClasses(
  "group flex min-h-[var(--km-control-height)] w-full items-center gap-2",
  "rounded-control border border-input bg-field ps-[var(--km-control-space-x)] pe-2",
  "text-base text-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  // Match the field hover: strengthen the boundary for an enabled field only.
  "not-data-[disabled]:hover:border-foreground",
  "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-surface",
  "data-[disabled]:cursor-not-allowed data-[disabled]:bg-surface-subtle data-[disabled]:text-muted-foreground data-[disabled]:border-border-subtle"
);

const INPUT_CLASSES = joinClasses(
  "h-[calc(var(--km-control-height)-2px)] min-w-0 flex-1 border-0 bg-transparent p-0",
  "text-base text-foreground outline-none",
  "placeholder:text-muted-foreground",
  "disabled:cursor-not-allowed"
);

const CHIPS_CLASSES = joinClasses(
  "flex min-w-0 flex-1 flex-wrap items-center gap-1"
);

const CHIP_CLASSES = joinClasses(
  "inline-flex max-w-full items-center gap-1 rounded-control border border-border",
  "bg-surface-subtle px-2 py-1 text-sm text-foreground"
);

const CHIP_REMOVE_CLASSES = joinClasses(
  // size-6 (24px) keeps the hit target at the documented 24x24 minimum; the
  // glyph inside stays size-3, so the chip keeps its 24px footprint.
  "inline-flex size-6 shrink-0 items-center justify-center rounded-sm",
  "text-muted-foreground",
  "hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

const POPUP_CLASSES = joinClasses(
  "z-50 min-w-48 max-h-[var(--available-height)] w-[var(--anchor-width)] overflow-y-auto",
  "rounded-surface border border-border bg-surface-floating p-2 text-foreground shadow",
  "origin-[var(--transform-origin)] transition-[transform,opacity] duration-[var(--km-duration-short)] ease-enter data-[ending-style]:ease-exit",
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
  "data-[starting-style]:[transform:scale(0.97)] data-[ending-style]:[transform:scale(0.97)]"
);

const ITEM_CLASSES = joinClasses(
  "group grid cursor-default select-none grid-cols-[1rem_1fr] items-start gap-2",
  "rounded-control px-2 py-2 text-sm text-foreground outline-none",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "data-[highlighted]:bg-surface-subtle",
  "data-[selected]:font-medium",
  "data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground"
);

const GROUP_LABEL_CLASSES = joinClasses(
  "px-2 py-2 text-caption font-medium text-muted-foreground"
);

const STATUS_CLASSES = joinClasses(
  "px-2 py-4 text-center text-sm text-muted-foreground"
);

interface ComboboxGroupData {
  value: string;
  items: ComboboxOption[];
}

/** Case-insensitive substring match on the option label. */
function defaultFilter(option: ComboboxOption, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return true;
  return option.label.toLocaleLowerCase().includes(needle);
}

/**
 * Filterable single- or multiple-select combobox built on Base UI's Combobox.
 *
 * The text field is a native `<input>` exposed as `role="combobox"` with
 * `aria-expanded`, `aria-controls` and `aria-activedescendant`; the popup is a
 * `role="listbox"` whose options expose `role="option"` and `aria-selected`.
 * Typing filters the list locally (case-insensitive substring on the label by
 * default, or a consumer `filter`). ArrowUp/ArrowDown move the highlight,
 * Home/End jump to the ends, Enter selects the highlighted option, Escape
 * closes and leaves focus in the field, and disabled options are never selected.
 * Selected options carry a check glyph, so selection is never conveyed by
 * color alone.
 *
 * Single selection fills the field with the chosen label. Multiple selection
 * renders removable chips and keeps the popup open for further choices.
 * `loading` deliberately empties the list, marks the field busy and announces a
 * pending message instead of offering options that cannot be chosen yet.
 *
 * Colors, radii, motion and control sizing come from semantic tokens.
 * `className` lands on the wrapping element; the field keeps its own classes
 * and the forwarded `ref` resolves to the text input.
 */
const ComboboxRoot = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  props,
  ref
) {
  const {
    options,
    label,
    placeholder,
    disabled = false,
    loading = false,
    emptyMessage = "No options found",
    filter,
    className,
    multiple,
    value,
    defaultValue,
    onValueChange,
    name,
    required = false,
    id,
    ...inputProps
  } = props;

  const isMultiple = multiple === true;
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const hasLabel = label != null && label !== "";
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Base UI deliberately leaves Home/End to the text caret in a typeable
  // combobox. While the popup is open we translate them to list navigation so
  // the documented first/last-option keys work; the guard keeps the synthetic
  // navigation events from reaching consumer handlers.
  const navigatingRef = useRef(false);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  const { onKeyDown: inputOnKeyDown, ...restInputProps } = inputProps;

  const hasGroups = useMemo(
    () => options.some((option) => option.group != null && option.group !== ""),
    [options]
  );

  const groups = useMemo<ComboboxGroupData[]>(() => {
    const result: ComboboxGroupData[] = [];
    for (const option of options) {
      const groupName = option.group ?? "";
      const last = result[result.length - 1];
      if (last && last.value === groupName) last.items.push(option);
      else result.push({ value: groupName, items: [option] });
    }
    return result;
  }, [options]);

  const flatCollection = useMemo(
    () =>
      ComboboxPrimitive.createItems(loading ? undefined : options, {
        getValue: (option: ComboboxOption) => option.value,
        getLabel: (option: ComboboxOption) => option.label,
      }),
    [loading, options]
  );

  const groupedCollection = useMemo(
    () =>
      ComboboxPrimitive.createItems(loading ? undefined : groups, {
        getValue: (option: ComboboxOption) => option.value,
        getLabel: (option: ComboboxOption) => option.label,
      }),
    [groups, loading]
  );

  const items = hasGroups ? groupedCollection : flatCollection;

  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options]
  );

  function handleSelectionChange(next: unknown) {
    if (isMultiple) {
      const values = Array.isArray(next)
        ? next.filter((entry): entry is string => typeof entry === "string")
        : [];
      (onValueChange as ((value: string[]) => void) | undefined)?.(values);
      return;
    }
    if (typeof next === "string") {
      (onValueChange as ((value: string) => void) | undefined)?.(next);
    }
  }

  function moveHighlightToEdge(edge: "first" | "last") {
    const inputElement = inputRef.current;
    const listId = inputElement?.getAttribute("aria-controls");
    const list = listId ? document.getElementById(listId) : null;
    if (!inputElement || !list) return;

    const allOptions = Array.from(
      list.querySelectorAll<HTMLElement>('[role="option"]')
    );
    const enabled = allOptions.filter(
      (option) => option.getAttribute("aria-disabled") !== "true"
    );
    if (enabled.length === 0) return;

    const activeIndex = allOptions.findIndex((option) =>
      option.hasAttribute("data-highlighted")
    );
    let lastEnabledIndex = -1;
    allOptions.forEach((option, index) => {
      if (option.getAttribute("aria-disabled") !== "true") lastEnabledIndex = index;
    });
    const firstEnabledIndex = allOptions.findIndex(
      (option) => option.getAttribute("aria-disabled") !== "true"
    );
    if (edge === "first" && activeIndex === firstEnabledIndex) return;
    if (edge === "last" && activeIndex === lastEnabledIndex) return;

    // ArrowUp/ArrowDown are Base UI's own navigation keys, so replaying them
    // keeps the highlight, aria-activedescendant and scroll-into-view in sync.
    // Arrow keys intentionally leave the list at its end (returning focus to the
    // field), so "first" walks up and "last" walks down from the current row.
    const keys: Array<"ArrowDown" | "ArrowUp"> = [];
    if (edge === "first") {
      if (activeIndex === -1) keys.push("ArrowDown");
      else for (let step = 0; step < activeIndex; step += 1) keys.push("ArrowUp");
    } else if (activeIndex === -1) {
      for (let step = 0; step < enabled.length; step += 1) keys.push("ArrowDown");
    } else {
      const remaining = allOptions.filter(
        (option, index) =>
          index > activeIndex && option.getAttribute("aria-disabled") !== "true"
      ).length;
      if (remaining > 0) {
        for (let step = 0; step < remaining; step += 1) keys.push("ArrowDown");
      } else if (lastEnabledIndex !== -1 && activeIndex > lastEnabledIndex) {
        for (
          let step = 0;
          step < activeIndex - lastEnabledIndex;
          step += 1
        ) {
          keys.push("ArrowUp");
        }
      }
    }
    if (keys.length === 0) return;

    // Each replayed key must commit before the next one starts: Base UI's list
    // navigation reads the committed active index, so scheduling the remaining
    // steps on microtasks keeps a multi-step jump from reusing a stale value.
    navigatingRef.current = true;
    let cursor = 0;
    const step = () => {
      const key = keys[cursor];
      cursor += 1;
      navigatingRef.current = true;
      inputElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        })
      );
      if (cursor < keys.length) queueMicrotask(step);
      else {
        navigatingRef.current = false;
        // A leading/trailing run of disabled options can leave the edge jump on
        // one of them; continue in the jump's direction until an enabled row.
        skipDisabledHighlight(edge === "first" ? "down" : "up");
      }
    };
    step();
  }

  function skipDisabledHighlight(direction: "down" | "up", budget?: number) {
    // Base UI navigates the rendered item order, including disabled rows. When
    // an arrow key lands on a disabled option, step past it in the same
    // direction until an enabled option (or the field itself) is reached.
    queueMicrotask(() => {
      if (navigatingRef.current) return;
      const inputElement = inputRef.current;
      const listId = inputElement?.getAttribute("aria-controls");
      const list = listId ? document.getElementById(listId) : null;
      const highlighted = list?.querySelector<HTMLElement>(
        '[role="option"][data-highlighted]'
      );
      if (
        !inputElement ||
        !list ||
        !highlighted ||
        highlighted.getAttribute("aria-disabled") !== "true"
      ) {
        return;
      }

      const remaining =
        budget ?? list.querySelectorAll('[role="option"]').length + 1;
      if (remaining <= 0) return;

      navigatingRef.current = true;
      inputElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: direction === "down" ? "ArrowDown" : "ArrowUp",
          bubbles: true,
          cancelable: true,
        })
      );
      navigatingRef.current = false;
      skipDisabledHighlight(direction, remaining - 1);
    });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (navigatingRef.current) return;

    if (
      open &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key === "Home" || event.key === "End")
    ) {
      moveHighlightToEdge(event.key === "Home" ? "first" : "last");
    } else if (
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key === "ArrowDown" || event.key === "ArrowUp")
    ) {
      skipDisabledHighlight(event.key === "ArrowDown" ? "down" : "up");
    }

    inputOnKeyDown?.(event);
  }

  function renderOption(option: ComboboxOption) {
    return (
      <ComboboxPrimitive.Item
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        data-km-combobox-option=""
        className={ITEM_CLASSES}
      >
        <span
          aria-hidden="true"
          data-km-combobox-check=""
          className="mt-1 inline-flex size-4 shrink-0 items-center justify-center text-checked invisible group-data-[selected]:visible"
        >
          <CheckIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate" title={option.label}>
            {option.label}
          </span>
          {option.description != null && option.description !== "" ? (
            <span
              data-part="option-description"
              className="mt-1 block truncate text-caption text-muted-foreground"
              title={option.description}
            >
              {option.description}
            </span>
          ) : null}
        </span>
      </ComboboxPrimitive.Item>
    );
  }

  const input = (effectivePlaceholder?: string) => (
    <ComboboxPrimitive.Input
      {...restInputProps}
      ref={setInputRef}
      id={inputId}
      type="text"
      placeholder={effectivePlaceholder}
      disabled={disabled}
      onKeyDown={handleInputKeyDown}
      aria-label={hasLabel ? undefined : inputProps["aria-label"]}
      aria-labelledby={
        hasLabel ? labelId : inputProps["aria-labelledby"]
      }
      aria-busy={loading || undefined}
      data-km-combobox-input=""
      className={INPUT_CLASSES}
    />
  );

  return (
    <div
      data-km-combobox=""
      data-loading={loading ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={joinClasses("flex flex-col gap-1.5", className)}
    >
      <ComboboxPrimitive.Root
        items={items}
        multiple={isMultiple}
        value={value as string | string[] | null | undefined}
        defaultValue={defaultValue as string | string[] | null | undefined}
        onValueChange={handleSelectionChange}
        onOpenChange={setOpen}
        disabled={disabled}
        required={required}
        name={name}
        filter={(option: ComboboxOption, query: string) =>
          (filter ?? defaultFilter)(option, query)
        }
      >
        {hasLabel ? (
          <label
            id={labelId}
            htmlFor={inputId}
            data-part="label"
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        ) : null}
        <ComboboxPrimitive.InputGroup
          data-km-combobox-field=""
          className={FIELD_CLASSES}
        >
          {isMultiple ? (
            <ComboboxPrimitive.Value>
              {(selected: string[]) => (
                <ComboboxPrimitive.Chips className={CHIPS_CLASSES}>
                  {selected.map((selectedValue) => {
                    const option = optionByValue.get(selectedValue);
                    const text = option?.label ?? selectedValue;
                    return (
                      <ComboboxPrimitive.Chip
                        key={selectedValue}
                        className={CHIP_CLASSES}
                      >
                        <span className="min-w-0 truncate" title={text}>
                          {text}
                        </span>
                        <ComboboxPrimitive.ChipRemove
                          aria-label={`Remove ${text}`}
                          className={CHIP_REMOVE_CLASSES}
                        >
                          <XIcon className="size-3" />
                        </ComboboxPrimitive.ChipRemove>
                      </ComboboxPrimitive.Chip>
                    );
                  })}
                  {input(selected.length > 0 ? undefined : placeholder)}
                </ComboboxPrimitive.Chips>
              )}
            </ComboboxPrimitive.Value>
          ) : (
            input(placeholder)
          )}
          <ChevronIcon
            className={joinClasses(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--km-duration-short)] ease-continuity",
              open && "rotate-180"
            )}
          />
        </ComboboxPrimitive.InputGroup>
        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-50 max-w-[var(--available-width)]"
          >
            <ComboboxPrimitive.Popup
              data-km-combobox-popup=""
              data-loading={loading ? "" : undefined}
              className={POPUP_CLASSES}
            >
              <ComboboxPrimitive.Status
                className={loading ? STATUS_CLASSES : undefined}
              >
                {loading ? "Loading options…" : ""}
              </ComboboxPrimitive.Status>
              <ComboboxPrimitive.Empty>
                {loading ? null : (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </ComboboxPrimitive.Empty>
              <ComboboxPrimitive.List data-km-combobox-list="">
                {hasGroups
                  ? (group: ComboboxGroupData) => (
                      <ComboboxPrimitive.Group
                        key={`group-${group.value}`}
                        items={group.items}
                        className="py-1 first:pt-0 last:pb-0"
                      >
                        {group.value !== "" ? (
                          <ComboboxPrimitive.GroupLabel
                            className={GROUP_LABEL_CLASSES}
                          >
                            {group.value}
                          </ComboboxPrimitive.GroupLabel>
                        ) : null}
                        <ComboboxPrimitive.Collection>
                          {(option: ComboboxOption) => renderOption(option)}
                        </ComboboxPrimitive.Collection>
                      </ComboboxPrimitive.Group>
                    )
                  : (option: ComboboxOption) => renderOption(option)}
              </ComboboxPrimitive.List>
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
    </div>
  );
});

ComboboxRoot.displayName = "Combobox";

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

function XIcon({ className }: { className?: string }) {
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
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export { ComboboxRoot as Combobox };
export default ComboboxRoot;
