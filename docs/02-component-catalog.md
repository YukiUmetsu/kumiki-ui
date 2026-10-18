# 02 — Component Catalog and Initial Scope

**This is the authoritative inventory.** Do not infer release scope from examples, patterns, or attractive third-party libraries. Complete each vertical slice—including API, all applicable states, screenshots and registry installation—before starting another component.

**Status (2026-10-17):** the v0.1 and v0.2 inventories below are now implemented. `registry.json` lists **64** installable items — 32 UI primitives, 6 application patterns, 7 media, 2 infographic and 17 motion — each with stories and unit tests, though expanded QA and visual acceptance for the newest media/motion/infographic slices are **deferred, not passed**. The sequences below remain the authoritative *scope and boundary* record, not a claim that every acceptance gate has passed.

## v0.1 — Initial component set (15 components)

| Order | Component | Must cover / boundaries |
|---:|---|---|
| 1 | **Button** | Primary, secondary, subtle, destructive; size, loading, disabled, icons; stable width |
| 2 | **Icon Button** | Accessible label, tooltip guidance, optical alignment, hit area, focus |
| 3 | **Field + Input** | Associated label/help/error, validation, controlled/uncontrolled, IME, long value |
| 4 | **Textarea** | Multiline, optional autosize, character limits only when needed, error messaging |
| 5 | **Checkbox** | Checked/unchecked/indeterminate, label click, keyboard, form behavior |
| 6 | **Switch** | Clear on/off meaning, keyboard, disabled, optional descriptions; not a checkbox substitute |
| 7 | **Dialog** | Focus trap/restore, Escape, scroll lock, sizing, nested overlay edge cases |
| 8 | **Tooltip** | Mouse/keyboard triggers, delay, placement/collision, not sole accessible label |
| 9 | **Popover** | Anchoring, dismissal, focus, viewport collision, long content |
| 10 | **Dropdown Menu** | Keyboard/ARIA navigation, separators, disabled/destructive items, submenus as needed |
| 11 | **Tabs** | Keyboard roving focus, selected state, orientation, responsive overflow |
| 12 | **Surface / Card** | Tokenized base surface, optional header/footer/interactive mode; no nested-card sprawl |
| 13 | **Progress** | Determinate/indeterminate, truthful labeling and announcements, async consistency |
| 14 | **Toast / Notification** | Severity, dismiss, timeout, action, focus discipline, deduplication |
| 15 | **Select** | Accessible single selection; avoid forcing advanced async combobox features into v0.1 |

**Build sequence:** Phase 0: Button → Field/Input → Dialog. Phase 1: remaining 12, one by one. The set above defines **v0.1 scope**, not a single large implementation prompt. Variant extensions count toward the same component, not separate “component milestones.”

## v0.2 — High-value components (after v0.1 is verified)

**16 components.** Build in the order below (grouped by risk: foundational/feedback and structure first, then form, navigation, data). Every entry is a full vertical slice: spec, implementation, stories, tests, screenshots and a clean registry install. Group headers record *why* the group earns a place; the inventory records the boundary each component must cover.

### Build order 1 — Structure & feedback foundations

| Order | Component | Must cover / boundaries |
|---:|---|---|
| 1 | **Separator** | Horizontal/vertical orientation; decorative (`role="none"`/presentational) vs semantic (`separator` role); tokenized color; spacing owned by the consumer, not baked in |
| 2 | **Skeleton** | Text/rect/circle shapes; width/height/line-count props; reduced-motion-safe shimmer; honest loading only (never fake content or fabricated progress) |
| 3 | **Badge / status indicator** | Neutral/info/success/warning/danger variants; size; optional dot or icon; meaning never conveyed by color alone; removable/badge-with-button boundary documented |
| 4 | **Alert / inline notice** | Info/success/warning/danger; title + description; optional action and dismiss; correct live-region semantics (`role="status"` polite vs `role="alert"` assertive) chosen deliberately, not both |
| 5 | **Accordion** | Single vs multiple open; up/down/Home/End keyboard; correct `aria-expanded`/`aria-controls` wiring; animated height with reduced-motion fallback; disabled items; controlled/uncontrolled |
| 6 | **Resizable split pane** | Two-pane divider with drag **and** a keyboard alternative (arrow/Home/End resize); min/max sizes and optional collapse; honest pointer capture; responsive stacking below a breakpoint; size persistence left to the consumer |

### Build order 2 — Form polish

| Order | Component | Must cover / boundaries |
|---:|---|---|
| 7 | **Radio Group** | Roving keyboard (arrows wrap, orientation), native `<input type="radio">` semantics, label + description, disabled group/disabled item, inline error, form submission |
| 8 | **Slider** | Single and range thumb; keyboard (arrows/Home/End/PageUp-Down), step/min/max, optional marks/ticks, value label (`aria-valuetext`), disabled, horizontal first (vertical documented or deferred) |
| 9 | **Combobox / Autocomplete** | Text input + listbox; client (and documented async) filtering; keyboard open/navigate/select/clear; empty and loading states; IME/CJK; single selection in v0.2 (multi deferred) |
| 10 | **Form summary** | Collects declared field errors for a form; jumps focus to the offending field; live update on revalidation; blocks submit; `role="alert"`/polite announcement; no fabricated errors |

### Build order 3 — Navigation

| Order | Component | Must cover / boundaries |
|---:|---|---|
| 11 | **Breadcrumbs** | `<nav>` landmark + label; `aria-current="page"` on the last crumb; custom separator; overflow/collapse for long trails; long/CJK labels; link vs current item |
| 12 | **Sidebar / nav rail** | Collapsible rail; active item; nested items; keyboard traversal; responsive/mobile fallback; no router coupling (consumer supplies links) |
| 13 | **Command palette** | Dialog + grouped commands; keyboard-first (filter, arrows, Enter, Escape); result grouping and empty state; shortcut display; no hidden focus; consumer supplies commands |

### Build order 4 — Data

| Order | Component | Must cover / boundaries |
|---:|---|---|
| 14 | **Listbox** | Standalone single/multiple selection list; keyboard (arrows/Home/End/typeahead); disabled options; groups/sections; no forced combobox coupling |
| 15 | **Table / data grid foundation** | Semantic `<table>`; header/body/caption; sortable columns with `aria-sort`; sticky header; empty and loading states; horizontal overflow at narrow widths; no virtualization (deferred) |
| 16 | **Searchable results** | Input + filter + results list composing Listbox; empty/loading/error states; keyboard result navigation; truthful query cancellation (no stale results presented as current) |

**Group rationale:** *Structure/feedback* components are dependency-light and unblock progressive disclosure and state communication; *form polish* serves complex entry flows, validation and searching; *navigation* enables coherent larger application workflows; *data* handles dense information with keyboard-accessible selection.

**Deferred beyond v0.2:** virtualized lists, calendar/date picker, file browser, sortable board, drag-and-drop editor, tree explorer, multi-select combobox, and general drag-and-drop reordering (require an explicit DnD/keyboard model and performance tests — see "Advanced composites" below). A `Collapsible` region primitive is only added if a real consumer needs one outside Accordion.

**Advanced composites (v0.3+):** accessible tree explorer (including keyboard reordering), virtualized large-list views, calendar/date picker, file/asset browser, sortable board, drag-and-drop editor. Add only with a demonstrable cross-project need, an explicit accessibility model, and performance tests. React Aria is a candidate for tree/collection interactions; do not duplicate Base UI primitives by default.

## Reusable application patterns (not primitives)

Patterns compose approved controls around a complete task, **without application-specific routes, data schemas or service dependencies**. Consumer code supplies data, copy and actions. Build these only after their underlying components are verified.

| Pattern | Building blocks | Key quality requirement |
|---|---|---|
| Search + results | Input, filters, list, empty/loading/error, keyboard shortcuts | Relevant results easy to scan; loading and query cancellation truthful |
| Settings section | Field, switch, select, descriptions, inline validation | Saves are predictable; dirty/pending/error states visible |
| Command palette | Dialog/popover, input, grouped commands, shortcuts | Keyboard-first, accessible result navigation, no hidden focus |
| Process monitor | Progress, stage list, log view, retry/cancel | Stage status accurate; no fabricated percentages |
| Resource explorer | Tree/list, menu, search, drag/drop, breadcrumb | Reorder/select/rename with keyboard alternative, undo when practical |
| Data + details workspace | Table/list, resizable pane, empty/detail view | Preserves selection, no clipped panels, responsive fallback |
| Guided form | Step navigation, validation, save/restore | Errors localized; progress and exits predictable |

### Pattern contract

Define task, entry/exit states, keyboard behavior, loading/error/cancel/restore, responsive layouts, exposed callbacks/slots, sample data and expected accessibility semantics. For each pattern include **one real end-to-end user task test** in an independent fixture app; component-unit tests alone aren't enough.

Patterns inherit tokens and themes. A consumer should be able to replace data, copy, media, icons, navigation and actions while preserving the underlying interaction quality. Default examples must be neutral: “Documents”, “Items”, “Task running”, not branded marketing copy.

**Avoid building complex patterns during initial primitive development.** Ship only after their base components pass [quality gates](04-quality-and-testing.md).


## A component is worth adding when

1. It solves a recurring interaction—not merely a new aesthetic variant.
2. Its public API can be independent of any single application's domain model.
3. Accessible behavior and quality can be validated in isolation and a clean consumer.
4. Expected value justifies dependency size, maintenance and migration cost.
5. An existing component cannot solve the problem cleanly through composition.

**Out of scope initially:** dozens of decorative landing-page widgets, application-specific dashboards, huge data-grid suites, dependency-heavy charting, bundled 3D/video engines, non-React native ports, and a general-purpose page builder.

**Definition of done for every inventory entry:** [component contract](03-component-standards.md) + [quality gates](04-quality-and-testing.md) + successful registry install, with verified evidence.
