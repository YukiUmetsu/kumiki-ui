# Component: Stepper

**Status:** Implementing — visual review and browser evidence pending (see Acceptance evidence)  
**Catalog phase:** v0.1 navigation (extension)  
**Why shared:** A workflow bar with per-step states, animated completion and transition hooks. Breadcrumbs show a location, Tabs switch panels, and Progress reports one fraction. None of them can show an ordered process whose steps are complete, started, current or stale, or run a hook when a step changes.

## Contract

- **Use / not use:** Use for ordered workflows where the user moves through steps or where progress must be visible (setup wizards, content pipelines, approval flows). Do not use for hierarchical location (use Breadcrumbs), for switching panels in place (use Tabs), or for a single measured fraction (use Progress).
- **Public API:**
  - `steps: StepperStep[]` — `{ id, label, status?, icon?, href?, disabled? }`. `status` defaults to `"not-started"`.
  - `states?: Partial<Record<status, Partial<StepperStateDefinition>>>` — overrides merged over `DEFAULT_STEPPER_STATES`. Keys may be custom.
  - `StepperStateDefinition` — `{ label, tone?, mark?, indicator?, current?, onEnter? }`.
  - `currentStepId?: string` — highlights one step with `aria-current="step"`. Without it, the first state with `current: true` (built-in `active`) is used.
  - `orientation?: "horizontal" | "vertical"` (default horizontal), `size?: "sm" | "md"`, `connectors?: boolean` (default: on for vertical), `animate?: boolean` (default true), `showStateText?: boolean` (default false: state labels are visually hidden and still read by assistive technology).
  - `onStepSelect?(step, index, event)` — makes enabled steps buttons (links when `href` is set).
  - `onStatusChange?({ step, index, status, previousStatus })` — fires after a change, never on first render.
  - Standard `<nav>` props, `className`, `style` and a forwarded ref.
  - Exports: `Stepper`, `StepperCheckMark`, `useStepperItem()`, `DEFAULT_STEPPER_STATES`, and the types above.
- **States:** built-in `not-started` (Not started, neutral), `started` (Started, info), `active` (Active, accent, current), `complete` (Complete, success, animated check). Any other key is a custom state; an undefined key renders its own text.
- **Composition:** A custom `mark` or `indicator` is any ReactNode. Inside it, `useStepperItem()` returns `{ step, index, count, status, state, isCurrent, transitions, motion }`, so a custom mark can animate on the same transitions as the built-in one.
- **Semantics:** `<nav aria-label="Progress">` → `<ol>` → `<li>`. Each step is named by its visible label plus a visually hidden "Step N of M:" prefix, and its status text is part of the content. The current step carries `aria-current="step"`. Indicators and marks are `aria-hidden`. A polite `role="status"` region announces each change ("Script: Complete").
- **Keyboard / focus:** Interactive steps are native buttons or links, reached in document order with Tab. Disabled steps are native disabled buttons. The scroll region becomes a tab stop only when it scrolls and no step is interactive. Focus rings use the `ring` token with a ring offset.
- **Visual states:** default, current, each built-in state, custom state, interactive hover, disabled, long and CJK labels (wrapping, never truncating), overflow in either orientation (edge fade plus scroll-into-view of the current step). State labels, when shown, use the caption size and muted colour so they stay secondary to the step title.
- **Customization:** The current step is green by default (`--km-status-success`). Override it with `--km-stepper-current` (fill and border) and `--km-stepper-current-foreground` (number) on the Stepper. Otherwise, semantic tokens only: `surface.elevated`, `surface.subtle`, `border`, `checked` / `checked-foreground`, `status.*`, `ring`, `canvas`. Tones (`neutral | info | accent | success | warning | danger`) choose a colour role, never a hex value. Light, dark and custom themes apply without overrides. Constrain the bar's height or width through `className` to make it scroll.
- **Motion:** Transitions play two effects by default (`animate` is true), each expressed through `motion`: the indicator springs from 0.8 scale, and the built-in check draws its path. Both run only when a status changes, never on first render, and are skipped under `prefers-reduced-motion` or with `animate={false}`. Scrolling the current step into view glides, or is instant under reduced motion. Colour changes use `--km-duration-medium` with `motion-reduce:transition-none`.
- **Hooks and sound:** `state.onEnter` runs once when a step enters that state. `onStatusChange` runs after it for every change. Sound is not bundled: browsers require a user gesture before playing audio, so the consumer plays it from `onEnter`.
- **Dependencies:** `motion` (already in the registry for Progress). No other runtime package. The check mark is inline SVG.
- **Limits:**
  - Step ids must be unique; a duplicate id breaks transition tracking.
  - Transitions are detected by comparing a step's `status` across renders, so a step that is removed and re-added with the same status is not reported as a change.
  - Changes that happen during the first render are not reported (the baseline is recorded then).
  - The horizontal bar gives each step a minimum width of 10rem before it scrolls. Shorter labels do not wrap into smaller steps.
  - Vertical bars scroll only when the container constrains their height.
  - Keyboard arrow navigation between steps is not implemented; steps use the normal tab order.

## Optional enhancements

All are off by default except `glideCurrent`, which is on. Each option leaves the default look and behaviour unchanged when omitted.

| Option | Effect | Notes |
|---|---|---|
| `glideCurrent` (default **on**) | The current highlight slides from the old step to the new one (about 280 ms). | Shared-layout animation. Static under reduced motion. Set `false` to swap instantly. |
| `fillConnectors` | The connector after a completed step fills from left to right, or top to bottom. | Fill runs only on change, not on first render. |
| `arrowKeys` | Left and Right (Up and Down when vertical) move focus between enabled steps; Home and End go to the ends. | Right-to-left reverses the horizontal arrows. Tab still works. |
| `showSummary` | A readout such as "3 of 8 complete" with a track. | `summaryPosition` places it: `bottom` (default), `top`, or beside the row at `start` or `end` (follows text direction). Above or below the row, `summaryAlign` sets its horizontal alignment: `center` (default), `start` or `end`. `summaryLabel(completed, total)` and `finishedLabel` set the text. A step counts when its state sets `complete: true`. |
| `calmFinish` | When every step is complete, the highlight clears, every connector fills, and the bar gets `data-finished`. | Pairs with `showSummary` for the finished readout. |
| `step.hint` | Short text shown inside the current step. | Text only. The step is a button, so interactive content belongs in a panel that follows `currentStepId`. |
| `createCompletionChime(options)` | Returns an `onEnter` function that plays one soft sine tone through the Web Audio API. | Opt-in. Browsers allow audio only after a user gesture, so it works when a click completes a step. Silent where audio is unavailable. |

Customisation for the current step's colour: `--km-stepper-current` (fill and border) and `--km-stepper-current-foreground` (number), both defaulting to the success token.

## Usage (for people and AI agents)

```tsx
import { Stepper } from "@/components/ui/stepper";

<Stepper
  steps={[
    { id: "setup", label: "Setup", status: "complete" },
    { id: "script", label: "Script", status: "active" },
    { id: "export", label: "Export" }, // not-started by default
  ]}
  states={{
    complete: { onEnter: () => playChime() }, // hook on completion
    stale: { label: "Stale", tone: "warning" }, // custom state
  }}
  onStepSelect={(step) => router.push(`/workflow/${step.id}`)}
  onStatusChange={({ step, status, previousStatus }) => save(step.id, status)}
/>;
```

Discover it with `npm run catalog:find -- --query="step by step workflow" --type=pack` and read its props with `npm run catalog:api -- --id=stepper --format=json`.

## Acceptance evidence

- [x] Typecheck: `npx tsc --noEmit` — passed.
- [x] Lint: `npx eslint` on the stepper sources and `tests/a11y-components.test.tsx` — no findings. Repository-wide `npm run lint` reports 0 errors and 11 pre-existing warnings, none in these files.
- [x] Accessibility (jsdom axe): one case added to the existing `tests/a11y-components.test.tsx` (horizontal and vertical). `npx vitest run` on the three related suites — 40 passed.
- [x] Catalog: `npm run catalog:check` — OK, 327 entries. `catalog:find` returns `pack:stepper` for "step by step workflow" and "wizard"; `catalog:api --id=stepper` reports verified props from source.
- [x] Registry: `npm run registry:validate` — 157 items valid; `npm run registry:smoke` — 157 items staged.
- [x] Browser render (headless Chromium via Storybook dev server, not human review): default light and dark, vertical, vertical scrolling (height-constrained, fade mask, tab stop), long horizontal scrolling, custom states and marks, localized Japanese text with wrapping. Measured: no clipped labels, the current step carries `aria-current="step"` exactly once, scroll regions scroll only when content overflows.
- [x] Behaviour in browser: the interactive story transitions statuses, logs each change through `onStatusChange`, updates the live region, and draws one check per completed step.
- [x] Reduced motion: glide and connector fill fall back to the static look (checked in the browser).
- [ ] Human visual review in light, dark and a second anonymous theme — pending. Screenshots are not a visual approval.
- [ ] Clean registry-install fixture with TypeScript compile of a consumer — `npm run registry:fixture` not yet run (requires network).
- [ ] Full `npm test` — started; result recorded below when complete.
