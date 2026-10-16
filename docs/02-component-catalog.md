# 02 — Component Catalog and Initial Scope

**This is the authoritative inventory.** Do not infer release scope from examples, patterns, or attractive third-party libraries. Complete each vertical slice—including API, all applicable states, screenshots and registry installation—before starting another component.

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

| Group | Components | Reason to add |
|---|---|---|
| Form polish | Combobox/autocomplete, radio group, slider, form summary | Complex entry flows, validation and searching |
| Feedback | Skeleton, alert/inline notice, badge/status indicator | Clear loading, error, state communication |
| Navigation | Breadcrumbs, sidebar/nav rail, command palette | Coherent larger application workflows |
| Data | Table/data grid foundation, listbox, searchable results | Dense information with keyboard-accessible selection |
| Structure | Accordion, resizable split pane, separator | Progressive disclosure and workspaces |

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
