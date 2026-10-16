# 03 — Component API, Behavior and Craftsmanship Contract

**One contract per component.** Start from the [template](../templates/component-spec.md). Don't invent props, tokens, DOM structures or dependencies before documenting the actual interaction.

## Required spec

1. **Purpose:** problem solved, use cases and misuses, why composition of existing components is insufficient.
2. **Public API:** typed props, defaults, variants/sizes, controlled/uncontrolled behavior, callbacks, standard DOM props, refs, slots, semantic token hooks.
3. **States:** identify applicable combinations—not every state applies to every widget. Include disabled/loading/error/empty/retry only when meaningful.
4. **Behavior:** keyboard, pointer/touch, focus lifecycle, dismiss/cancel, validation, async transitions, IME and assistive technology.
5. **Customization:** theme/density/appearance, `className`/`style`, semantic roles and permitted overrides, no hardcoded palette.
6. **Performance/ownership:** dependencies, portal effects, cleanup, SSR/hydration assumptions, event listeners, virtualization if warranted.
7. **Evidence:** story matrix, tests, screenshots, use examples, limits, version and license provenance.

## Component APIs that remain predictable

- Preserve native semantics and HTML props. Prefer a native `<button>` for a button and native `<input>` for text input; use Base UI when interaction complexity requires an accessible composite.
- Choose meaningful, bounded `variant` values (e.g. `primary | secondary | subtle | danger`) and `size` values; do not encode exact colors or arbitrary margins in variants.
- Forward refs and event handlers appropriately; document event ordering and whether `onOpenChange` / `onValueChange` are controlled.
- Use compound parts or slots for genuinely variable structure, rather than `leadingText`, `footerText`, `paddingTop`, `headerPaddingLeft` sprawl.
- Do not couple controls to network, domain state, navigation/router, date library or a global app shell unless the component explicitly provides that behavior.
- Keep component behavior stable under theme switching, density changes and local overrides. Consumers own styling flexibility; Kumiki owns accessible defaults and contracts.
- Never silently truncate essential information. Provide wrapping, expandable text, or accessible full-value affordances as appropriate.

## Canonical state checklist

| State | Examples / acceptance |
|---|---|
| Default | Purpose and action obvious; proper spacing, contrast, typographic hierarchy |
| Hover / pressed | Visually distinct and stable; not sole feedback mode |
| Focus-visible | High-contrast visible ring; keyboard-only navigation preserved |
| Disabled | Semantically and behaviorally disabled; reason available where important |
| Pending / loading | Stable layout, optional cancel, honest progress; repeated triggers prevented |
| Invalid / error | Clear explanation, associated semantics, recoverable when possible |
| Success / selected / open | Accurate state conveyed without color alone |
| Empty / overflow | No fake data, unexpected clipping, misplaced controls |
| Long / localized text | English/Japanese, long URLs/filenames, browser zoom, IME preserved |
| Reduced motion | Equivalent access to state changes without essential animation |

Test combinations that can conflict: `loading + disabled`, `open + route change`, `error + long content`, `focus + theme switch`, `nested popover + dialog`. Specify valid and invalid combinations instead of generating every possible permutation.

## Three concrete examples

**Button:** `variant`, `size`, native submit/reset/button semantics, `disabled`, `loading` (with `aria-busy` where useful), `aria-label` for icon-only use, and stable label width under spinner. Avoid `aria-disabled` without interaction guards.

**Dialog:** title/description association, initial/return focus, modal vs non-modal semantics, Escape and outside-click policy, scroll locking, portals, long content and viewport constraints. Nested overlays are an explicit test case.

**Tree:** support selection, expand/collapse, item descriptions, keyboard navigation and predictable DnD semantics. For drag reordering provide a keyboard-accessible alternative. Use a specialized accessible library (e.g. React Aria Tree) only as an isolated, justified dependency; benchmark large collections.

## Motion is part of the interaction contract

Use CSS transitions for inexpensive basic feedback; add Motion for interruptible gestures and shared-layout relationships. Specify duration, easing, keyframes, cancellation, focus effects, reduced-motion fallback, and whether layout geometry changes. Animations cannot postpone a frequent action just to look elegant. Avoid layout shifts and heavy blur/backdrop filters as a default.

## Review blockers

Do not mark complete if a component looks good only in one screenshot, loses focus, has unreadable labels, jumps while pending, traps keyboard users, fails under localization/zoom, requires undocumented CSS hacks, or ships without truthful test results. For exact release evidence see [quality and testing](04-quality-and-testing.md).
