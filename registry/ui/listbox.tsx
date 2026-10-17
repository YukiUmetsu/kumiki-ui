import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  MutableRefObject,
  ReactNode,
} from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Selection contract of a listbox. */
export type ListboxSelectionMode = "single" | "multiple";

/** One selectable row. `value` must be unique within the list. */
export interface ListboxOption {
  /** Value reported to `onValueChange`. Keep it stable and unique. */
  value: string;
  /** Visible option text; also the text used for type-ahead. */
  label: ReactNode;
  /**
   * Secondary line shown beneath the label. It is part of the option's
   * accessible name, so a screen reader reads label and description together. */
  description?: ReactNode;
  /** Ignore user interaction and skip the option while navigating. @default false */
  disabled?: boolean;
  /**
   * Group heading. Consecutive options sharing a group render together inside a
   * named `role="group"`; option order is otherwise preserved. */
  group?: string;
}

interface ListboxBaseProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "defaultValue" | "onChange" | "value"
  > {
  /** Options to render, in order. Values must be unique. */
  options: ListboxOption[];
  /** Single choice (radio-like) or a togglable set of choices. @default "single" */
  selectionMode?: ListboxSelectionMode;
  /** Ignore user interaction for the whole listbox. @default false */
  disabled?: boolean;
  /** Visible label; also the accessible name through `aria-labelledby`. */
  label?: ReactNode;
  /** Extra classes for the listbox element itself (not the label wrapper). */
  className?: string;
}

export interface ListboxSingleProps extends ListboxBaseProps {
  /** @default "single" */
  selectionMode?: "single";
  /** Controlled selected value. Use `defaultValue` for uncontrolled use. */
  value?: string | null;
  /** Initially selected value when uncontrolled. @default null */
  defaultValue?: string | null;
  /** Called with the next selected value, or `null` when nothing is selected. */
  onValueChange?: (value: string | null) => void;
}

export interface ListboxMultipleProps extends ListboxBaseProps {
  selectionMode: "multiple";
  /** Controlled selected values. Use `defaultValue` for uncontrolled use. */
  value?: string[];
  /** Initially selected values when uncontrolled. @default [] */
  defaultValue?: string[];
  /** Called with the complete next selection, in the order values were added. */
  onValueChange?: (value: string[]) => void;
}

/** Listbox props. The value types narrow from `selectionMode`. */
export type ListboxProps = ListboxSingleProps | ListboxMultipleProps;

interface RenderedOption {
  option: ListboxOption;
  index: number;
  id: string;
}

interface RenderedSection {
  group?: string;
  options: RenderedOption[];
}

const LISTBOX_CLASSES = joinClasses(
  "relative flex max-h-80 w-full flex-col gap-1 overflow-y-auto",
  "rounded-surface border border-input bg-surface p-1",
  "text-base text-foreground",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "data-[disabled]:cursor-not-allowed data-[disabled]:bg-surface-subtle data-[disabled]:text-muted-foreground"
);

const OPTION_CLASSES = joinClasses(
  "flex w-full cursor-default select-none items-start gap-2 rounded-control px-2 py-2",
  "text-sm text-foreground outline-none",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity"
);

const TYPEAHEAD_TIMEOUT = 600;

/** Flattens the string content of a label so type-ahead can match it. */
function reactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  return "";
}

/**
 * Standalone single- or multiple-select listbox with optional group headings.
 *
 * The root is a real `role="listbox"` element and keeps **DOM focus** while the
 * active option is advertised with `aria-activedescendant` (one tab stop for
 * the whole list). Options expose `role="option"`, `aria-selected` and
 * `aria-disabled`, and are named by their content (label + description) so the
 * accessible name always matches the visible text; a visible check glyph carries
 * selection so it is never colour-only. Labelled sections render as
 * `role="group"` with `aria-labelledby` pointing at the visible heading.
 *
 * Keyboard: ArrowUp/ArrowDown move the active option (disabled options are
 * skipped, movement clamps at the ends), Home/End jump to the first/last
 * enabled option, Enter selects in single mode and toggles in multiple mode,
 * Space does the same, and printable characters run type-ahead over string
 * labels (repeating one character cycles through its matches). Disabled
 * options never activate and never fire `onValueChange`.
 *
 * Base UI has no standalone listbox primitive, so the ARIA wiring and keyboard
 * model are implemented here directly; there is no menu or combobox coupling.
 * `className` lands on the listbox itself so consumers can size or scroll it;
 * the label wrapper is internal.
 */
const ListboxRoot = forwardRef<HTMLDivElement, ListboxProps>(function Listbox(
  {
    options,
    selectionMode = "single",
    value,
    defaultValue,
    onValueChange,
    disabled = false,
    label,
    className,
    onKeyDown,
    tabIndex,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const isMultiple = selectionMode === "multiple";
  const isControlled = value !== undefined;
  const hasLabel = label != null && label !== "";

  const [innerSingle, setInnerSingle] = useState<string | null>(() =>
    selectionMode === "multiple"
      ? null
      : ((defaultValue as string | null | undefined) ?? null)
  );
  const [innerMultiple, setInnerMultiple] = useState<string[]>(() =>
    selectionMode === "multiple" ? ((defaultValue as string[] | undefined) ?? []) : []
  );

  const selectedSingle = isControlled && !isMultiple
    ? ((value as string | null | undefined) ?? null)
    : innerSingle;
  const selectedMultiple = isControlled && isMultiple
    ? ((value as string[] | undefined) ?? [])
    : innerMultiple;

  const sections = useMemo<RenderedSection[]>(() => {
    const result: RenderedSection[] = [];
    let index = 0;

    for (const option of options) {
      const group =
        option.group == null || option.group === "" ? undefined : option.group;
      const optionIndex = index++;
      const entry: RenderedOption = {
        option,
        index: optionIndex,
        id: `${generatedId}-option-${optionIndex}`,
      };
      const last = result[result.length - 1];
      if (last && last.group === group) last.options.push(entry);
      else result.push({ group, options: [entry] });
    }

    return result;
  }, [options, generatedId]);

  const renderedOptions = useMemo(
    () => sections.flatMap((section) => section.options),
    [sections]
  );

  const enabledOptions = useMemo(
    () => renderedOptions.filter((option) => !option.option.disabled),
    [renderedOptions]
  );

  const initialSelected = value !== undefined ? value : defaultValue;

  const [activeValue, setActiveValue] = useState<string | null>(() => {
    const firstSelected = selectionMode === "multiple"
      ? ((initialSelected as string[] | undefined)?.[0] ?? null)
      : ((initialSelected as string | null | undefined) ?? null);
    const selectedOption = options.find(
      (option) => option.value === firstSelected && !option.disabled
    );
    return (
      selectedOption?.value ??
      options.find((option) => !option.disabled)?.value ??
      null
    );
  });

  // The rendered active option is derived, so a stale value (removed, newly
  // disabled or reordered option) can never point `aria-activedescendant` at a
  // missing element.
  const activeOption = useMemo(() => {
    if (disabled) return null;
    return (
      renderedOptions.find(
        (entry) => entry.option.value === activeValue && !entry.option.disabled
      ) ??
      enabledOptions[0] ??
      null
    );
  }, [activeValue, disabled, enabledOptions, renderedOptions]);

  const focusListbox = useCallback(() => {
    listRef.current?.focus({ preventScroll: true });
  }, []);

  function commit(next: string | string[] | null) {
    if (isMultiple) {
      const nextValues = Array.isArray(next) ? next : [];
      if (!isControlled) setInnerMultiple(nextValues);
      (onValueChange as ((value: string[]) => void) | undefined)?.(nextValues);
      return;
    }
    const nextValue = typeof next === "string" ? next : null;
    if (!isControlled) setInnerSingle(nextValue);
    (onValueChange as ((value: string | null) => void) | undefined)?.(nextValue);
  }

  function isSelected(optionValue: string) {
    return isMultiple ? selectedMultiple.includes(optionValue) : selectedSingle === optionValue;
  }

  function activate(entry: RenderedOption) {
    if (disabled || entry.option.disabled) return;
    setActiveValue(entry.option.value);

    if (isMultiple) {
      const next = selectedMultiple.includes(entry.option.value)
        ? selectedMultiple.filter((current) => current !== entry.option.value)
        : [...selectedMultiple, entry.option.value];
      commit(next);
      return;
    }

    commit(entry.option.value);
  }

  function moveActive(direction: 1 | -1) {
    if (enabledOptions.length === 0) return;
    const currentIndex = activeOption
      ? enabledOptions.findIndex(
          (entry) => entry.option.value === activeOption.option.value
        )
      : -1;
    if (currentIndex === -1) {
      setActiveValue(enabledOptions[0].option.value);
      return;
    }
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      enabledOptions.length - 1
    );
    setActiveValue(enabledOptions[nextIndex].option.value);
  }

  function moveToEdge(edge: "first" | "last") {
    if (enabledOptions.length === 0) return;
    const target = edge === "first" ? enabledOptions[0] : enabledOptions[enabledOptions.length - 1];
    setActiveValue(target.option.value);
  }

  const typeahead = useRef<{
    buffer: string;
    lastChar: string;
    at: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ buffer: "", lastChar: "", at: 0, timer: null });

  useEffect(() => {
    const state = typeahead.current;
    return () => {
      if (state.timer) clearTimeout(state.timer);
    };
  }, []);

  function scheduleTypeaheadReset() {
    const state = typeahead.current;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.buffer = "";
      state.lastChar = "";
      state.at = 0;
      state.timer = null;
    }, TYPEAHEAD_TIMEOUT);
  }

  function handleTypeahead(key: string) {
    const state = typeahead.current;
    const now = Date.now();
    const withinWindow = now - state.at < TYPEAHEAD_TIMEOUT;
    const buffer = withinWindow ? state.buffer + key : key;

    state.buffer = buffer;
    state.lastChar = key;
    state.at = now;
    scheduleTypeaheadReset();

    const lowerKey = key.toLowerCase();
    const repeated = buffer.length > 1 && Array.from(buffer.toLowerCase()).every(
      (character) => character === lowerKey
    );
    const query = repeated ? lowerKey : buffer.toLowerCase();

    const matches = enabledOptions.filter((entry) =>
      reactNodeText(entry.option.label).toLowerCase().startsWith(query)
    );
    if (matches.length === 0) return;

    if (repeated) {
      const currentIndex = activeOption
        ? enabledOptions.findIndex(
            (entry) => entry.option.value === activeOption.option.value
          )
        : -1;
      const next =
        matches.find(
          (entry) =>
            enabledOptions.findIndex(
              (candidate) => candidate.option.value === entry.option.value
            ) > currentIndex
        ) ?? matches[0];
      setActiveValue(next.option.value);
      return;
    }

    setActiveValue(matches[0].option.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    const nativeEvent = event.nativeEvent;
    if (nativeEvent.isComposing || event.key === "Process") return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        event.preventDefault();
        moveToEdge("first");
        break;
      case "End":
        event.preventDefault();
        moveToEdge("last");
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeOption) activate(activeOption);
        break;
      default:
        if (
          event.key.length === 1 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          handleTypeahead(event.key);
        }
    }

    onKeyDown?.(event);
  }

  const listRef = useRef<HTMLDivElement | null>(null);
  const setListRef = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  const labelledBy =
    [hasLabel ? labelId : undefined, ariaLabelledBy].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {hasLabel ? (
        <div
          id={labelId}
          data-part="label"
          className={joinClasses(
            "text-sm font-medium",
            disabled ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {label}
        </div>
      ) : null}
      <div
        ref={setListRef}
        role="listbox"
        aria-multiselectable={isMultiple || undefined}
        aria-labelledby={labelledBy}
        aria-label={hasLabel ? undefined : ariaLabel}
        aria-disabled={disabled || undefined}
        aria-activedescendant={activeOption?.id}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        data-km-listbox=""
        data-selection-mode={selectionMode}
        data-disabled={disabled ? "" : undefined}
        className={joinClasses(LISTBOX_CLASSES, className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {sections.map((section, sectionIndex) => {
          const rendered = section.options.map((entry) => {
            const selected = isSelected(entry.option.value);
            const optionDisabled = disabled || entry.option.disabled === true;
            const active = activeOption?.index === entry.index;
            const description = entry.option.description;

            return (
              <div
                key={entry.id}
                id={entry.id}
                role="option"
                aria-selected={selected}
                aria-disabled={optionDisabled || undefined}
                // No aria-label/aria-labelledby override: the option is named by
                // its content (label + description), which keeps the accessible
                // name identical to the visible text (WCAG 2.5.3).
                data-km-listbox-option=""
                data-part="option"
                data-selected={selected ? "" : undefined}
                data-active={active ? "" : undefined}
                data-disabled={optionDisabled ? "" : undefined}
                className={joinClasses(
                  OPTION_CLASSES,
                  optionDisabled && "cursor-not-allowed text-muted-foreground",
                  selected
                    ? "bg-surface-subtle font-medium"
                    : active
                      ? "bg-surface-subtle"
                      : !optionDisabled && "hover:bg-surface-subtle"
                )}
                onClick={() => {
                  if (disabled || entry.option.disabled) return;
                  activate(entry);
                  focusListbox();
                }}
              >
                <span
                  aria-hidden="true"
                  className={joinClasses(
                    "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center",
                    selected ? "text-checked" : "invisible"
                  )}
                >
                  <CheckIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words">
                    {entry.option.label}
                  </span>
                  {description != null && description !== "" ? (
                    <span className="mt-0.5 block break-words text-sm text-muted-foreground">
                      {description}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          });

          if (section.group == null) {
            return <Fragment key={`ungrouped-${sectionIndex}`}>{rendered}</Fragment>;
          }

          const groupId = `${generatedId}-group-${sectionIndex}`;
          return (
            <div
              key={`group-${sectionIndex}-${section.group}`}
              role="group"
              aria-labelledby={groupId}
              data-km-listbox-group=""
              data-part="group"
              className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0"
            >
              <div
                id={groupId}
                data-part="group-label"
                className="px-2 py-2 text-caption font-medium text-muted-foreground"
              >
                {section.group}
              </div>
              {rendered}
            </div>
          );
        })}
      </div>
    </div>
  );
});

ListboxRoot.displayName = "Listbox";

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

export { ListboxRoot as Listbox };
export default ListboxRoot;
