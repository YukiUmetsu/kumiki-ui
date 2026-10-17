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
  KeyboardEvent,
  MutableRefObject,
  ReactNode,
} from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * One runnable command in a `CommandPalette`. Commands are consumer data; the
 * palette never invents labels, shortcuts or actions.
 */
export interface CommandPaletteCommand {
  /** Stable, unique identity used to keep the highlight across filtering. */
  id: string;
  /** Visible command text. Also the primary filtering target. */
  label: string;
  /**
   * Optional heading. Consecutive commands sharing a group are rendered
   * together under one visible, programmatically associated label.
   */
  group?: string;
  /**
   * Extra search terms (synonyms, translations, aliases) matched in addition to
   * `label`. Matching is case-insensitive.
   */
  keywords?: string[];
  /**
   * Trailing hint such as `⌘K`. Rendered `aria-hidden`, so it is never the only
   * accessible name of the command.
   */
  shortcut?: ReactNode;
  /** Keep the command visible but non-runnable and skipped by keyboard navigation. @default false */
  disabled?: boolean;
  /** Called exactly once when the command is chosen, before the palette closes. */
  onSelect: () => void;
}

export interface CommandPaletteProps {
  /** Whether the modal palette is visible. The component is controlled. */
  open: boolean;
  /** Called with `false` after a command runs, on Escape, close button or outside press. */
  onOpenChange: (open: boolean) => void;
  /** Commands to search and run, in display order. `id` values must be unique. */
  commands: CommandPaletteCommand[];
  /** Placeholder for the search field. @default "Search commands…" */
  placeholder?: string;
  /** Content shown when no command matches the query. @default "No commands found." */
  emptyMessage?: ReactNode;
  /**
   * Show a truthful loading state instead of stale results. While `true` the
   * result list is not rendered and the palette is marked `aria-busy`.
   * @default false
   */
  loading?: boolean;
  /** Accessible name of the dialog and the search field. @default "Command palette" */
  label?: string;
  /** Accessible name of the close button, so it can be localised. @default "Close" */
  closeLabel?: string;
  /** Extra classes merged onto the palette panel. */
  className?: string;
}

interface PaletteEntry {
  command: CommandPaletteCommand;
  /** Index in the incoming `commands` array, used for a stable DOM id. */
  index: number;
  id: string;
}

interface PaletteSection {
  group?: string;
  entries: PaletteEntry[];
}

const PANEL_CLASSES = joinClasses(
  "fixed inset-x-4 top-24 z-50 mx-auto flex max-h-[calc(100dvh-8rem)] max-w-xl flex-col overflow-hidden",
  "rounded-surface border border-border bg-surface-floating text-foreground shadow",
  "focus:outline-none"
);

const OPTION_CLASSES = joinClasses(
  "flex w-full cursor-default select-none items-center gap-2 rounded-control px-2 py-2",
  "text-sm text-foreground outline-none",
  "transition-colors duration-[var(--km-duration-short)] ease-continuity"
);

const MotionBackdrop = motion.create(DialogPrimitive.Backdrop);
const MotionPanel = motion.create(DialogPrimitive.Popup);

/**
 * Keyboard-first command launcher built on Base UI's Dialog primitive.
 *
 * The palette is a modal dialog (focus trapped, scroll locked, Escape and
 * outside press dismiss) whose single text field is a `role="combobox"` that
 * filters `commands` case-insensitively by `label` and `keywords`. The active
 * option is advertised with `aria-activedescendant` while DOM focus stays in
 * the input, so typing, IME composition and screen reader announcements are not
 * interrupted. Results keep their declared order and are separated into
 * `role="group"` sections with visible headings.
 *
 * Keyboard: ArrowDown/ArrowUp move the highlight and skip disabled commands,
 * Home/End jump to the first/last runnable command, Enter runs the highlighted
 * command, Escape closes and returns focus to the previously focused element.
 * A disabled command is never runnable by pointer or keyboard. Selecting a
 * command fires its `onSelect` exactly once and then asks the consumer to close.
 *
 * The panel enters and exits with a short fade + rise, wrapped in
 * `AnimatePresence` and neutralised under `prefers-reduced-motion: reduce`.
 *
 * A ref is forwarded to the search input, which is the only tab stop inside
 * the palette. `className` lands on the panel surface, not on the field.
 */
const CommandPaletteRoot = forwardRef<HTMLInputElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onOpenChange,
      commands,
      placeholder = "Search commands…",
      emptyMessage = "No commands found.",
      loading = false,
      label = "Command palette",
      closeLabel = "Close",
      className,
    },
    ref
  ) {
    const reducedMotion = useReducedMotion();
    const generatedId = useId();
    const listId = `${generatedId}-listbox`;
    const [query, setQuery] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    // A fresh session every time the palette opens.
    useEffect(() => {
      if (!open) {
        setQuery("");
        setActiveId(null);
      }
    }, [open]);

    const entries = useMemo<PaletteEntry[]>(
      () =>
        commands.map((command, index) => ({
          command,
          index,
          id: `${generatedId}-option-${index}`,
        })),
      [commands, generatedId]
    );

    const filteredEntries = useMemo(() => {
      const needle = query.trim().toLowerCase();
      if (needle === "") return entries;
      return entries.filter((entry) => {
        if (entry.command.label.toLowerCase().includes(needle)) return true;
        return (entry.command.keywords ?? []).some((keyword) =>
          keyword.toLowerCase().includes(needle)
        );
      });
    }, [entries, query]);

    const sections = useMemo<PaletteSection[]>(() => {
      const result: PaletteSection[] = [];
      for (const entry of filteredEntries) {
        const group =
          entry.command.group == null || entry.command.group === ""
            ? undefined
            : entry.command.group;
        const last = result[result.length - 1];
        if (last && last.group === group) last.entries.push(entry);
        else result.push({ group, entries: [entry] });
      }
      return result;
    }, [filteredEntries]);

    const enabledEntries = useMemo(
      () => filteredEntries.filter((entry) => !entry.command.disabled),
      [filteredEntries]
    );

    // Deriving the active entry (instead of storing an index) means a filter
    // change, a removed command or a newly disabled command can never leave the
    // highlight on an option that is not rendered or not runnable.
    const activeEntry = useMemo(
      () => enabledEntries.find((entry) => entry.id === activeId) ?? enabledEntries[0] ?? null,
      [activeId, enabledEntries]
    );

    useEffect(() => {
      if (!open || activeEntry === null) return;
      const node = document.getElementById(activeEntry.id);
      node?.scrollIntoView?.({ block: "nearest" });
    }, [activeEntry, open]);

    const moveActive = useCallback(
      (step: 1 | -1) => {
        if (enabledEntries.length === 0) return;
        const currentIndex = activeEntry
          ? enabledEntries.findIndex((entry) => entry.id === activeEntry.id)
          : -1;
        const nextIndex =
          currentIndex === -1
            ? step === 1
              ? 0
              : enabledEntries.length - 1
            : Math.min(Math.max(currentIndex + step, 0), enabledEntries.length - 1);
        setActiveId(enabledEntries[nextIndex].id);
      },
      [activeEntry, enabledEntries]
    );

    const moveToEdge = useCallback(
      (edge: "first" | "last") => {
        if (enabledEntries.length === 0) return;
        const target =
          edge === "first" ? enabledEntries[0] : enabledEntries[enabledEntries.length - 1];
        setActiveId(target.id);
      },
      [enabledEntries]
    );

    const runCommand = useCallback(
      (entry: PaletteEntry | null) => {
        if (entry === null || entry.command.disabled) return;
        entry.command.onSelect();
        onOpenChange(false);
      },
      [onOpenChange]
    );

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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
          if (enabledEntries.length === 0) break;
          event.preventDefault();
          moveToEdge("first");
          break;
        case "End":
          if (enabledEntries.length === 0) break;
          event.preventDefault();
          moveToEdge("last");
          break;
        case "Enter":
          if (activeEntry === null) break;
          event.preventDefault();
          runCommand(activeEntry);
          break;
        default:
          break;
      }
    }

    const hasResults = filteredEntries.length > 0;
    // While loading, the list is intentionally absent; every ARIA reference to
    // it must be omitted so the combobox never points at a missing element.
    const showResults = hasResults && !loading;
    const panelTransition: Transition = reducedMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 400, damping: 32 };

    return (
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(nextOpen) => onOpenChange(nextOpen)}
        modal
      >
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Portal key="command-palette-portal">
              <MotionBackdrop
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.18 }}
                className="fixed inset-0 z-50 bg-overlay"
              />
              <MotionPanel
                data-km-command-palette=""
                aria-modal={true}
                aria-busy={loading || undefined}
                initialFocus={inputRef}
                initial={{ opacity: 0, y: -8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={panelTransition}
                className={joinClasses(PANEL_CLASSES, className)}
              >
                <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
                <div
                  data-part="search"
                  className="flex shrink-0 items-center gap-2 border-b border-border px-2"
                >
                  <SearchIcon className="ms-1 size-4 shrink-0 text-muted-foreground" />
                  <input
                    ref={setInputRef}
                    type="text"
                    role="combobox"
                    aria-label={label}
                    aria-expanded={showResults}
                    aria-controls={showResults ? listId : undefined}
                    aria-activedescendant={showResults ? activeEntry?.id : undefined}
                    aria-autocomplete="list"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={placeholder}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    data-part="input"
                    className={joinClasses(
                      "h-[var(--km-control-height)] w-full min-w-0 bg-transparent text-base text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none"
                    )}
                  />
                  <DialogPrimitive.Close
                    aria-label={closeLabel}
                    data-part="close"
                    className={joinClasses(
                      "me-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground",
                      "transition-colors duration-[var(--km-duration-short)]",
                      "hover:bg-surface-subtle active:bg-surface-inset",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-floating"
                    )}
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      ×
                    </span>
                  </DialogPrimitive.Close>
                </div>

                <div
                  data-part="results"
                  className="max-h-80 min-h-0 overflow-y-auto overscroll-contain p-2"
                >
                  {loading ? (
                    <div
                      role="status"
                      data-part="loading"
                      className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className={joinClasses(
                          "size-4 shrink-0 animate-spin rounded-full border-2 border-border",
                          "border-t-foreground motion-reduce:animate-none"
                        )}
                      />
                      Loading commands…
                    </div>
                  ) : showResults ? (
                    <div
                      id={listId}
                      role="listbox"
                      data-part="list"
                      className="flex flex-col gap-0.5"
                    >
                      {sections.map((section, sectionIndex) => {
                        const rendered = section.entries.map((entry) => {
                          const command = entry.command;
                          const active = activeEntry?.id === entry.id;
                          return (
                            <div
                              key={entry.id}
                              id={entry.id}
                              role="option"
                              aria-selected={active}
                              aria-disabled={command.disabled || undefined}
                              data-km-command-palette-option=""
                              data-part="option"
                              data-active={active ? "" : undefined}
                              data-disabled={command.disabled ? "" : undefined}
                              className={joinClasses(
                                OPTION_CLASSES,
                                command.disabled
                                  ? "cursor-not-allowed text-muted-foreground"
                                  : active
                                    ? "bg-surface-subtle font-medium"
                                    : "hover:bg-surface-subtle"
                              )}
                              onMouseDown={(event) => {
                                // Keep DOM focus in the search field so the
                                // dialog's focus-out dismissal never fires while
                                // a pointer chooses an option.
                                event.preventDefault();
                              }}
                              onMouseMove={() => {
                                if (command.disabled) return;
                                setActiveId(entry.id);
                              }}
                              onClick={() => runCommand(entry)}
                            >
                              <span className="min-w-0 flex-1 break-words">{command.label}</span>
                              {command.shortcut != null ? (
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 ps-2 text-caption text-muted-foreground"
                                >
                                  {command.shortcut}
                                </span>
                              ) : null}
                            </div>
                          );
                        });

                        if (section.group == null) {
                          return (
                            <Fragment key={`ungrouped-${sectionIndex}`}>{rendered}</Fragment>
                          );
                        }

                        const groupId = `${generatedId}-group-${sectionIndex}`;
                        return (
                          <div
                            key={`group-${sectionIndex}-${section.group}`}
                            role="group"
                            aria-labelledby={groupId}
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
                  ) : (
                    <div
                      role="status"
                      data-part="empty"
                      className="px-2 py-6 text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </div>
                  )}
                </div>
              </MotionPanel>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    );
  }
);

CommandPaletteRoot.displayName = "CommandPalette";

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export { CommandPaletteRoot as CommandPalette };
export default CommandPaletteRoot;
