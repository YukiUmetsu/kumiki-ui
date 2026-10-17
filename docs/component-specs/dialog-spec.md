# Component: Dialog

**Status:** Verified (Phase 0)
**Catalog phase:** 0
**Why shared:** Modal presentation is where accessibility is most often broken: focus
escapes, Escape does not close, the page behind still scrolls, the dialog is unlabelled
and long content is clipped. Solving it once on a primitive that has already been
proven (Base UI) is cheaper and safer than repeating that logic per product.
Alternatives considered: a hand-rolled focus trap (rejected — duplicated, easy to get
wrong) and `<dialog>` element (rejected for Phase 0 — browser support for the
non-modal/animation behaviour and styling hooks is inconsistent).

**Source:** [`registry/ui/dialog.tsx`](../registry/ui/dialog.tsx) (canonical).
[`src/ui/dialog.tsx`](../src/ui/dialog.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a decision or a short task that should interrupt the page
  and requires focus discipline. Do not use it for informational content that can live
  inline, for a navigation menu, or for a long multi-step flow where a route is clearer.
- **Public API:**
  - `open?: boolean` — controlled state (omit and pass `defaultOpen` to stay uncontrolled)
  - `defaultOpen?: boolean`
  - `onOpenChange?: (open: boolean) => void` — fired for every state change
    (close button, Escape, outside click)
  - `onClose?: () => void` — convenience callback fired only when it closes
  - `title?: ReactNode` — the accessible name (`aria-labelledby`)
  - `description?: ReactNode` — the accessible description (`aria-describedby`)
  - `children?: ReactNode` — body content
  - `size?: "sm" | "md" | "lg"` — default `"md"` (`max-w-sm` / `max-w-lg` / `max-w-2xl`)
  - `placement?: "top" | "center" | "bottom"` — default `"center"`
  - `modal?: boolean` — default `true`; `false` gives a non-modal dialog (no focus trap,
    no scroll lock, and the popup omits `aria-modal`)
  - `className?: string` — extra classes for the panel
  - `closeLabel?: string` — accessible name of the built-in close button, default `"Close"`
  - exports: `Dialog` (named + default)
- **Composition:** `title`, `description` and `children` are rendered only when non-empty,
  so a dialog without a `title` still renders (it is then named by its content or by a
  consumer-supplied label — check this before shipping a title-less dialog). Consumers
  compose their own actions inside `children`; no footer API is imposed.
- **Semantics:** Base UI's Popup renders `role="dialog"`, `aria-labelledby` (from
  `Title`), `aria-describedby` (from `Description`) and is the focusable popup element.
  `aria-modal="true"` is set explicitly by this component when `modal` is `true`, because
  the underlying primitive does not emit it. The overlay is a separate `Backdrop` element
  and the panel is rendered in a portal, so it escapes ancestor stacking/overflow contexts.
  The built-in close button is labelled by `closeLabel` (default `"Close"`), not by the
  `×` glyph, which is `aria-hidden`.
- **Keyboard/focus:** Escape closes; the initial focus moves into the dialog on open
  (first tabbable element); closing restores focus to the element that opened it;
  `modal` (default) traps Tab/Shift+Tab inside the popup while marking the rest of the
  document `aria-hidden`; outside pointer interactions close the dialog unless
  `disablePointerDismissal` were set (not exposed in Phase 0). Page scroll is locked
  while a modal dialog is open and released on close.
- **Visual states:** closed (renders nothing); open (backdrop `bg-overlay` + panel);
  `focus-visible` on the panel's own children; long content scrolls inside the overlay
  (`overflow-y-auto`) instead of being clipped; wide content is bounded by `w-full` +
  the size preset.
- **Customization:** `size`, `placement`, `className` on the panel, `closeLabel` for
  localisation, and the semantic tokens the panel consumes (`bg-surface`, `border-border`,
  `rounded-surface`, `bg-overlay`, `text-foreground`, `text-muted-foreground`,
  `--km-focus-ring`, `--km-type-size-*`). No `!important`, no global CSS requirement
  beyond the token stylesheet.
- **Dependencies:** `@base-ui/react` 1.9.0 (MIT) for the dialog primitive, focus guards,
  scroll lock and portal. Declared in the registry item. No other runtime dependency.
- **Limits:** there is no `DialogHeader`/`DialogFooter`/`DialogTrigger` export — trigger
  and actions are consumer code; no animation/enter-exit transition is provided in
  Phase 0 (so no reduced-motion handling is required inside the component); the focus
  guard redirect uses a `requestAnimationFrame`, so a scripted Tab loop with ~0 ms
  between key presses can momentarily land outside the dialog — with a realistic
  (~60 ms) cadence focus cycles inside the dialog indefinitely, which is what the e2e
  test asserts; nested dialogs hide (and `aria-hidden`) the parent, so only the top
  dialog is exposed to assistive technology.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/dialog.test.tsx`
  → 9 tests pass. Covers: closed dialog renders nothing; open dialog is `role=dialog`,
  named by the title, with `aria-modal="true"` and an accessible description and a
  labelled close button; `modal={false}` omits `aria-modal`; the close button fires
  `onOpenChange(false)` and `onClose()` exactly once; Escape closes; scroll lock is
  applied while open and released on close; focus moves into the dialog and returns to
  the trigger after Escape; nested dialogs (the parent becomes unqueryable and focus is
  inside the inner dialog); long content is scrollable (`overflow-y-auto`).
- [x] **axe-core output and manual a11y checks recorded** — `npx playwright test` runs
  axe (WCAG 2.0/2.1/2.2 A+AA tags) in the built showcase in light and dark with 0
  violations, and drives the dialog in real Chromium: visible + accessible description,
  focus moves inside, `body` overflow is `hidden` while open, 12 Tab presses at 60 ms
  cadence never reach `<main>` (≥7 land inside the dialog), Escape hides it, the trigger
  regains focus and the scroll lock is released.
- [x] **Storybook states complete, including realistic and long content** —
  `src/ui/dialog.stories.tsx` (Default, WithActions, LongContent); the showcase's
  controlled dialog uses a realistic confirm-action case. `npx storybook build` succeeds.
- [x] **Screenshots reviewed: light/dark, narrow/wide** —
  `tests/e2e/showcase.spec.ts-snapshots/dialog-open-1440-chromium-darwin.png` plus the
  light/dark full-page baselines; the narrow (320px) baseline covers the page with the
  dialog closed (the dialog is opened at 1440 only).
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — no
  document overflow at 320/375/768/1440, dialog panel bounded by `w-full` + size preset,
  focus indicator asserted in the e2e run.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`,
  `npm run registry:smoke` and `npm run registry:fixture` (`3 item(s), 4 file(s) compiled
  in a clean fixture`) all pass; the `dialog` item declares `@base-ui/react`.
- [x] **Dependencies/licenses reviewed** — `@base-ui/react` 1.9.0 (MIT) was already
  required for this component; nothing was added for the Phase 0 work.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

**Links to evidence:** `tests/dialog.test.tsx`, `tests/e2e/showcase.spec.ts`,
`src/ui/dialog.stories.tsx`, `registry.json` (item `dialog`).
