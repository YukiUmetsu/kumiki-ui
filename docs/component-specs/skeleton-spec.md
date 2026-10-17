# Component: Skeleton

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Loading is unavoidable, and every product re-invents the same grey blocks
with inconsistent shapes, jittering layout and animations that ignore users who ask for
reduced motion. One decorative placeholder with text/rect/circle shapes, explicit sizing
and a reduced-motion-safe sweep removes that duplication while staying honest: it never
fakes content or fabricated progress. Alternatives considered: a skeleton that accepts
arbitrary children (rejected — it would become a layout component and invite fake copy)
and a shimmer that is the only signal (rejected — meaning must survive with animation off).

**Source:** [`registry/ui/skeleton.tsx`](../registry/ui/skeleton.tsx) (canonical).
[`src/ui/skeleton.tsx`](../src/ui/skeleton.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use while real content is loading to hold its approximate shape and
  prevent layout shift. Do not use it as an empty state, an error state, or to imply
  progress that is not measured (use `Progress`), and never place meaningful text inside
  it — the placeholder is hidden from assistive technology.
- **Public API:**
  - `shape?: "text" | "rect" | "circle"` — default `"text"`.
  - `width?: number | string` — numbers are pixels, strings are CSS lengths. For `text` it
    sizes the line container; bars fill it.
  - `height?: number | string` — numbers are pixels, strings are CSS lengths. For `text` it
    applies to every bar.
  - `lines?: number` — default `1`; stacked bars for `shape="text"` with an `8px` gap.
    Values below 1 or non-finite values render a single bar and other shapes ignore it.
  - `className?: string` — merged onto the root (consumer classes win).
  - all `HTMLAttributes<HTMLDivElement>` except `children`; `ref` forwards to the root.
  - exports: `Skeleton` (named + default), `SkeletonProps`, `SkeletonShape`.
- **Composition:** a root `<div>` plus one `data-part="line"` `<div>` per text line. There
  are no slots and no children API; `rect` and `circle` are drawn by the root itself.
- **Semantics:** the root is `aria-hidden="true"` by default, so screen readers skip the
  placeholder entirely, and it carries no role, no tab stop and no handlers. Meaning must
  come from the surrounding region: pair it with the real loading status or label
  (for example a `role="status"` region) rather than trying to name the skeleton. The root
  exposes `data-km-skeleton`, `data-shape` and `data-lines`; each text bar exposes
  `data-part="line"`.
- **Keyboard/focus:** not focusable and not interactive; it adds no tab stop, no pressed
  state and no key handling.
- **Visual states:** `text` bars use `rounded-control` and a `14px` token height; `rect`
  uses `rounded-control` at a media-sized default; `circle` uses `rounded-full` at a
  48px default. Every shape uses the `bg-track` token. The shimmer is a
  component-scoped CSS keyframe sweep layered over that fill, timed with
  `--km-duration-long` and eased with `--km-ease-continuity`. Under
  `prefers-reduced-motion: reduce` the sweep is removed (`animation: none;
  background-image: none`) and the static placeholder stays fully legible, so no
  information depends on the animation. Consumer `className` is composed last.
- **Customization:** `shape`, `width`, `height`, `lines`, `className` and the semantic
  tokens consumed by the Tailwind bridge (`bg-track`, `rounded-control`,
  `rounded-full`, `--km-type-scale-body-sm`, `--km-duration-long`, `--km-ease-continuity`).
  Density and appearance come from the token layer; sizing is explicit per instance.
- **Dependencies:** `react` only. No Base UI primitive and no new package.
- **Limits:** all text lines share one width (no "last line is shorter" variant); a
  `circle` given one numeric dimension mirrors it to stay round, but a single *percentage*
  dimension can still distort (pass both for percentage sizing); the shimmer injects one
  shared `<style id="km-skeleton-styles">` node per document rather than editing a global
  stylesheet; the component deliberately has no built-in status or accessible name — the
  consumer owns announcing that content is loading.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/skeleton.test.tsx`
  → 1 file, 10 tests passed (default text placeholder, stacked lines, line-count
  normalization, `lines` ignored for other shapes, shape treatments, explicit sizing,
  circular mirroring, ref/`className`/prop forwarding, animation-independent meaning, axe
  run). The component has no keyboard behavior to test.
- [ ] **axe-core output and manual a11y checks recorded** — axe runs inside the test file
  above (0 violations on `document.body`); manual browser/screen-reader checks were
  **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/skeleton.stories.tsx` (Default, TextLines, Shapes, CustomSize,
  PlaceholderForAList, NarrowContainer, LongAndLocalizedText); `npm run build-storybook`
  → exit 0, all stories compile. Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — gallery-level browser review performed by the coordinator (see
  coordinator report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  per-component browser verification **not run**; only the gallery-level pass applies
  (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no
  dependency added; the item depends only on `react` (MIT). Bundle impact was not
  separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

## Evidence (verified)

- `npx vitest run tests/skeleton.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 10 passed (10)`.
- `npx tsc --noEmit` → exit 0.
- `npm run lint` → exit 0.
- `npm run build` → exit 0.
- `npm run build-storybook` → exit 0 (all stories compile).
- `npm run registry:validate` → "OK — 32 item(s) valid".
- `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)".
- `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- `npm run test:e2e` → 8 passed, 2 failed. Both failures are pre-existing and unrelated:
  (a) axe `label-content-name-mismatch` on the Button loading state rendered by the
  Phase-0 demo page (`src/main.tsx:62`, `registry/ui/button.tsx` — both untouched by this
  work); (b) a visual-baseline pixel drift on that same Phase-0 page. The e2e target page
  does not render any of these 16 components (the gallery is a Storybook page), so these
  failures are not attributable to this component.
- Browser screenshot review of the gallery Storybook page (light + dark, 1440px; all six
  tabs) was performed by the coordinator; the outcome is recorded in the coordinator
  report. Per-component pixel/screen-reader review: **not run**.

**Links to evidence:** `tests/skeleton.test.tsx`, `src/ui/skeleton.stories.tsx`,
`registry/ui/skeleton.tsx`, and the *Evidence (verified)* section above.
