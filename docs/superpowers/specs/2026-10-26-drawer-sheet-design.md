# Drawer and Sheet — approved design

## Intent

Provide polished, source-distributed edge panels for React apps. `Sheet` serves secondary desktop work (properties, filters, editors); `Drawer` adds touch/swipe and snap-point behavior for responsive navigation and mobile tasks. Both must feel coherent with Kumiki's token system, preserve keyboard access, and let consumers tune motion without replacing the component.

## Approaches

1. **Selected:** separate Base UI `Dialog` and `Drawer` primitives, with one shared visual treatment and motion contract. This keeps native gesture behavior out of an ordinary editor sheet.
2. One Drawer implementation aliased as Sheet: less code, but unwanted swipe semantics and coupled APIs.
3. Fully custom overlays: maximum control, but reinvents focus, scroll lock, stacking, gesture and accessibility logic.

## Scope and behavior

- `Sheet` and `Drawer` are compound APIs (`Root`, `Trigger`, `Content`, `Header`, `Body`, `Footer`, `Title`, `Description`, `Close`), with sensible defaults and independently overridable DOM classes/props. `Sheet` additionally exposes a keyboard-operable optional resize handle. `Drawer` exposes Base UI gesture and snap capabilities.
- `Root` controls direction (`right` default for Sheet, `bottom` for Drawer), `open`/`defaultOpen`/`onOpenChange`, modality, and a motion preset/config. `Content` controls width/height, edge inset, backdrop appearance, and the panel's scrollable structure.
- Motion presets: `subtle`, `smooth` (default), `spring`, `snappy`, `none`. Custom settings expose travel distance, transition duration/easing, backdrop duration/opacity, with spring stiffness/damping on Motion-driven transitions when applicable. Defaults are intentionally quiet; no ornamental stagger. Config can be overridden per instance.
- The entry/exit direction matches the edge; during touch drag the Drawer follows the finger, not an independently animated child. Rapid open/close must not strand an overlay or expose invisible interactive content. Reduced motion removes spatial movement.
- Four edges; sizes responsive with `min(100vw, …)` / `min(100dvh, …)`, overflow confined to body, action footer stays visible, header and close button remain reachable. Support long/CJK labels, dark theme and browser zoom.
- Base UI owns Escape/outside dismissal, initial/return focus, scroll lock, nesting and ARIA relationships. Drawer gestures should not dismiss when interacting with marked swipe-ignore content. No custom global keyboard listener.
- Consumers supply content; no product copy, business logic, routing, analytics, theme switch or external assets.

## Visual system

Use Kumiki's existing `surface-elevated`, `foreground`, `muted-foreground`, `border`, `overlay`, `rounded-surface` and focus tokens. Desktop panels max at roughly 28rem by default, with 20px–24px interior padding and 12px–16px content grouping. The backdrop dims without opaque theatrics; optional subtle border/shadow separates non-modal panels. Touch panels retain comfortable hit targets and an optional drag indicator.

Motion references: [Base UI Drawer](https://base-ui.com/react/components/drawer), [Base UI Dialog](https://base-ui.com/react/components/dialog), [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Animate UI Sheet](https://animate-ui.com/docs/primitives/base-ui/sheet), [Animate UI Drawer](https://animate-ui.com/docs/primitives/base-ui/drawer). Inspiration only; no restricted third-party component source is copied.

## Non-goals / risks

- No replacement or breaking rewrite of existing `Dialog` or `Sidebar`.
- No additional production dependency unless a specific verified gap requires it (Base UI 1.9 and Motion are already installed).
- Drawer swipe/snap animation is governed by Base UI's gesture CSS variables; custom tuning must not fight its transforms. Screen reader and keyboard checks are mandatory, while manual device swipe QA remains separately reported if not run.
- Resize is optional for desktop Sheet; not a promise of arbitrary multi-pane docking or persistence.

## Acceptance

1. Tests prove modal/non-modal semantics, controlled/uncontrolled changes, Escape/close, focus restoration, long-body scrolling, all directions, custom styles/motion, reduced motion, and keyboard resize clamping.
2. Drawer tests cover configured direction, snap points and swipe-ignore integration; browser gesture checks if available.
3. Storybook offers interactive trigger examples, side/motion variants, desktop editing, mobile snap drawer, long/CJK content, dark/reduced-motion states.
4. Registry entries install cleanly; source reexports, component catalog, per-component specs and documentation index are updated.
5. Run typecheck, lint, focused/full tests, registry validations and Storybook build; perform adversarial React/accessibility review and fix demonstrated regressions before the PR.
