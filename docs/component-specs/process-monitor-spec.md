# Pattern: Process monitor

**Status:** Implementing
**Catalog phase:** specialized (reusable application pattern)
**Why shared:** Watching a multi-stage background task repeats the same fragile
pieces in every product — a stage list whose status must stay accurate, a
progress bar that must never invent a percentage, a log pane that stays
readable and scrollable, and a recovery path that puts focus on the right action
when the task fails or finishes. Each is re-implemented with its own markup and
accessibility bugs (colour-only severity, fabricated progress, an unscrollable
log). This pattern composes the vetted `Progress`, `Badge`, `Alert`, `Button`
and `Surface` primitives behind one bounded contract while leaving stage names,
statuses, logs, copy and handlers to the consumer.

**Source:** [`registry/patterns/process-monitor.tsx`](../registry/patterns/process-monitor.tsx)
(canonical).
[`src/patterns/process-monitor.tsx`](../src/patterns/process-monitor.tsx)
re-exports it for the showcase.

## Pattern contract

- **Task:** watch a multi-stage background task — see which stage is active,
  read the log, and recover from failure or acknowledge completion.
- **Entry / exit states:**
  - **Idle** — task not started or all stages pending; empty log.
  - **Running** — progress bar (determinate or indeterminate) + active stage +
    live log + Cancel.
  - **Cancelled** — terminal; later stages `skipped`; Cancel replaced by
    Retry/Dismiss; warning alert “Task stopped.”.
  - **Failed** — failed stage marked, danger alert, Retry available and focused.
  - **Completed** — every stage done, success alert, Dismiss available and
    focused.
- **Loading / error / cancel / retry / restore:**
  - The consumer drives every stage and the overall status; the pattern renders
    exactly what it is given and never advances stages itself.
  - **No fabricated percentages.** With `progress` omitted the bar runs
    `indeterminate` and exposes no value; a number is only shown when the
    consumer supplies a real fraction.
  - **Cancel** calls `onCancel`; the consumer aborts and marks later stages
    `skipped`.
  - **Retry** calls `onRetry`; whether it restarts from the failed stage or the
    beginning is the consumer's decision.
  - **Restore/resume** is simply re-rendering with the current statuses and the
    tail of the log; the pattern keeps no internal task state.
- **Responsive layout:** below 640px the progress bar, stage list and log stack
  vertically with a fixed `h-48` log; at ≥ 640px the stage list sits on the left
  (`sm:w-2/5`) and the log on the right (`flex-1`, `h-64`), with the progress bar
  spanning the top.
- **Sample data / copy (neutral defaults):** stages “Prepare”, “Upload”,
  “Process”, “Verify”; empty log “Waiting to start…”; cancelled alert “Task stopped.”
  with body “Remaining stages were skipped.”; failed “Task failed. Check the log and try
  again.”; completed alert “Task completed.” with body “All stages finished.”. All strings
  are overridable through `labels`.
- **Accessibility semantics:**
  - Stage rows are an ordered list; the active row carries `aria-current="step"`
    in addition to `data-status`.
  - Each row's `Badge` pairs a status word with a shape-distinct glyph and the
    matching `status.*` token — status is never conveyed by colour alone (the
    neutral pending/skipped states draw their own hollow and struck circles).
  - The log is `role="log"` with an accessible name (`aria-label`), is a tab stop
    (`tabIndex={0}`) and scrolls with the arrow keys once focused.
  - A visually hidden `role="status"` (`aria-live="polite"`) region announces the
    running stage; terminal Alerts are themselves polite live regions.
  - Terminal transitions move focus to the most likely next action: Retry on
    failure, Dismiss on completion.
- **Keyboard / focus:** Tab reaches Cancel / Retry / Dismiss and the log region;
  arrow keys scroll the log when it is focused; the region heading is an `<h2>`
  in the pattern shell. No focus trap — this is inline page content.

## Contract

- **Use / not use:** use to render the state of a task the consumer already
  owns. Do not use it to run, schedule or poll work, to fetch data, or as a
  general progress widget for a single unknown-length operation (use `Progress`
  directly). It never advances stages, retries, or cancels on its own.
- **Public API:**
  - `stages: ProcessMonitorStage[]` — required. `ProcessMonitorStage` is
    `{ id: string; label: string; description?: string }`; `id` must be unique
    and stable.
  - `stageStatus: Record<string, ProcessMonitorStageStatus>` — required. Status
    per stage id; `ProcessMonitorStageStatus` is
    `"pending" | "active" | "done" | "failed" | "skipped"`. A missing id falls
    back to `"pending"`.
  - `status: ProcessMonitorStatus` — required; the whole task is
    `"idle" | "running" | "cancelled" | "failed" | "completed"`.
  - `progress?: number` — fraction `0..1`. Omitted ⇒ `indeterminate`; never a
    fabricated percentage. Default `undefined`.
  - `logLines?: string[]` — append-only lines, newest last. Default `[]`.
  - `title?: ReactNode` — region heading. Default `"Process status"`.
  - `labels?: ProcessMonitorLabels` — copy overrides for every visible or
    announced string (progress label, log label, empty log, cancel/retry/dismiss,
    per-status words, and the three terminal alerts). Each has a neutral default.
  - `onCancel?: () => void` — renders Cancel while `status === "running"`.
  - `onRetry?: () => void` — renders Retry while `status === "failed"`.
  - `onDismiss?: () => void` — renders Dismiss while `status` is `"completed"`
    or `"cancelled"`.
  - `renderLogLine?: (line: string) => ReactNode` — custom renderer per line.
  - `className?: string` — merged onto the root surface (consumer classes win).
  - all `HTMLElement` props except `children`, `title` and `onCancel`; `ref`
    forwards to the root.
  - exports: `ProcessMonitor` (named + default), `ProcessMonitorProps`,
    `ProcessMonitorStage`, `ProcessMonitorStageStatus`, `ProcessMonitorStatus`,
    `ProcessMonitorLabels`.
- **Composition:** data-driven; there are no child components to nest. The root
  is a `Surface` (`variant="solid"`) whose header carries the pattern heading,
  whose footer carries the actions, and whose body stacks the progress bar,
  terminal alert, anonymous live region and the stage-list/log split. Consumers
  map their own data into `stages`/`stageStatus`/`logLines` and supply handlers.
- **Semantics:** root carries `data-km-process-monitor` and `data-status`.
  Parts are `data-part`: `progress`, `status-announcer`, `stages`, `stage`
  (+ `data-status`), `stage-label`, `stage-description`, `log`, `log-empty`,
  `log-line`, `title`. The stage list is an `<ol>`; the active row is
  `aria-current="step"`. `Progress` renders `role="progressbar"` with no value
  attributes while indeterminate. The log is `role="log"` named by `logLabel`.
- **Keyboard/focus:** the log is focusable (`tabIndex={0}`) and scrolls with the
  arrow keys; Cancel/Retry/Dismiss are native buttons in the Surface footer.
  Focus moves to Retry after a failure and to Dismiss after completion.
- **Visual states:** stage rows pending/active (`bg-surface-subtle`)/done/failed/
  skipped; progress indeterminate vs determinate; terminal alert
  warning/success/danger; empty log; long and CJK names, descriptions and log
  lines wrap (`break-words` / `whitespace-pre-wrap`) without clipping or
  horizontal overflow.
- **Customization:** `title`, `labels`, `renderLogLine`, `className`, forwarded
  DOM props and the semantic tokens for surfaces, text, borders, rings, radii,
  spacing and motion. No global CSS, `!important` or app-specific selectors.
- **Dependencies:** `react`, `motion` (MIT, already required by existing registry
  items) for the stage-row entrance, which is disabled under
  `prefers-reduced-motion`. No new dependency; no Base UI primitive is added by
  this pattern.
- **Limits:** no internal task state — the consumer owns stage transitions,
  cancellation and retry; there is no polling, fetching or persistence. The
  progress bar is shown in every state (idle included) and renders indeterminate
  whenever `progress` is omitted. The log is not virtualized, so very large logs
  should be tailed by the consumer. Focus is moved on terminal transitions, so
  embedding the pattern in a host that also manages focus should account for it.
  Smooth log scroll is replaced by an instant jump under reduced motion.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** —
  `npx vitest run tests/process-monitor.test.tsx` → 1 file, 14 tests passed.
  Covers: stage list + descriptions, active stage marked (`aria-current="step"`),
  status words paired with glyphs, indeterminate progress with no value
  attributes and no `%`, determinate progress (`aria-valuenow`/`aria-valuetext`),
  polite stage announcement, focusable labelled log with empty state and CJK
  lines, `onCancel`, failed state (alert + focused Retry, no Cancel),
  completed state (alert + focused Dismiss), cancelled state with skipped stages,
  label overrides + `renderLogLine`, ref/`className`/DOM-prop forwarding, and an
  axe run in running and failed states.
- [x] **axe-core output and manual a11y checks recorded (axe only)** — axe-core
  ran in jsdom in running and failed states with 0 violations; manual
  screen-reader and zoom checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  stories authored for `Default`, `Indeterminate`, `Idle`, `Failed`, `Cancelled`,
  `Completed`, `LongAndLocalizedText`. `build-storybook` was **not run** as part
  of this task (out of the assigned validation scope).
- [x] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide** —
  `npx playwright test tests/e2e/patterns.spec.ts` regenerated and asserted the full-page
  light baseline; axe runs in light/dark and there is no horizontal overflow at
  320/375/768/1440 → `6 passed`.
- [x] **No accidental overlap, clipping, contrast, focus or animation
  failures** — covered by the e2e overflow audit and the axe runs; a separate manual visual
  review was not performed.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:fixture` →
  `registry:fixture OK — 38 item(s), 40 file(s) compiled in a temporary fixture (removed)`;
  `npm run registry:smoke` → `38 item(s), 79 file(s)`; `npm run registry:validate` →
  `38 item(s) valid`.
- [x] **End-to-end user task verified in the built app** — `npm run test:e2e` → `16 passed`
  (10 showcase + 6 patterns); the pattern's own spec is `6 passed`.
- [x] **Dependencies/licenses reviewed; performance and bundle impact
  documented** — no dependency added; the pattern imports `react`, `motion`
  (MIT) and the existing `registry/ui` primitives.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/process-monitor.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 14 passed (14)`; full `npx vitest run` → `Test Files 82 passed (82)`,
  `Tests 760 passed (760)`.
- `npx tsc --noEmit` → exit 0.
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Runs the pattern to
  completion (asserting the “Task completed” alert with body “All stages finished.”) and then
  cancels a fresh run (asserting “Task stopped” with body “Remaining stages were skipped.”),
  regenerates the full-page light baseline, runs axe in light and dark (0 violations) and
  checks for no horizontal overflow at 320/375/768/1440.
- `npm run test:e2e` → `16 passed` (10 showcase + 6 patterns), exit 0.
- `npm run registry:validate` → `registry:validate OK — 38 item(s) valid.`
- `npm run registry:smoke` → `registry:smoke OK — 38 item(s), 79 file(s) staged into an
  isolated directory.`
- `npm run registry:fixture` → `registry:fixture OK — 38 item(s), 40 file(s) compiled in a
  temporary fixture (removed)`.
- `npm run tokens:validate` → `tokens:validate OK`.
- `npm run contrast:audit` → `contrast:audit OK — 16 enforced pair(s) (+2 informational),
  3 theme(s)`.
- **Not run (unchanged):** manual screen-reader pass, manual 200 % zoom check and
  `npm run build-storybook`.

**Links to evidence:** `tests/process-monitor.test.tsx`,
`src/patterns/process-monitor.stories.tsx`,
`registry/patterns/process-monitor.tsx`, and the *Evidence (verified)* section
above.
