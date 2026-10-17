# Component: Media Frame

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** Placing a referenced image/video/vector in a composition needs an explicit fit, focal
point, mask, source-space crop and alt description — all as view transforms that never mutate the
source. Without a shared frame, every product re-derives `object-fit`/`object-position`/crop maths
and loses the "never mutate the asset" guarantee. Alternatives considered: a raw `<img>` with
consumer styles (rejected — no honest missing/failed state, no deterministic crop) and baking crops
into the bitmap (rejected — destroys the source).

**Source:** [`registry/media/media-frame.tsx`](../../registry/media/media-frame.tsx) (canonical).
`src/media/media-frame.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** use to place a `MediaSpec` against an `ImageAsset` (optionally with a resolved
  `src`). Do not use it to resize or re-encode the source — every control here is a view transform.
  Do not use it as an interactive video player: it renders a static authoring frame.
- **Public API:**
  - `media: MediaSpec` — required: `fit`, `focalPoint`, `mask` and optional
    `crop`/`alt`/`decorative`/`poster`.
  - `asset?: ImageAsset` — metadata; when omitted the frame renders an honest "missing asset" state.
  - `src?: string` — resolved src overriding `asset.uri` (e.g. an object URL or optimised rendition).
  - `alt?: string` — resolution order is `media.alt` > `alt` > `asset.alt`.
  - `loading?: "eager" | "lazy"` — default `"lazy"`; forwarded to `<img>`.
  - `crossOrigin?: "anonymous" | "use-credentials"`; `fallback?: ReactNode`; `showPlaceholder?:
    boolean` default `true`; `onLoadStateChange?: (state: MediaLoadState) => void`.
  - extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`; `ref` forwards to the root `<div>`.
    exports `MediaFrame` (named + default), `MediaFrameProps`, `MediaLoadState = "idle" | "loading" |
    "loaded" | "error"`.
- **Composition:** root `data-km-media-frame="root"` with `data-km-media-state` and
  `data-km-media-asset`; body is `data-km-media="image" | "video"`, optionally wrapped by a
  `data-km-media="crop"` box, with a `data-km-media="skeleton"` overlay while loading, or a
  `data-km-media="message"` / `fallback` when missing or failed.
- **Semantics:** the `<img>` carries `alt`; a `video/*` asset renders a muted, non-autoplaying,
  control-free `<video role="img" aria-label={altText}>`. `decorative` sets `alt=""` and
  `aria-hidden="true"` on both, and the skeleton is `aria-hidden`. The referenced asset id is exposed
  only as the `data-km-media-asset` attribute, never as user-visible text.
- **Keyboard/focus:** not interactive — no tab stop and no key handling. A `video/*` frame has no
  controls, so keyboard playback is intentionally absent.
- **Visual states:** `idle`/`loading` (non-reflowing skeleton, `animate-pulse` with
  `motion-reduce:animate-none`), `loaded`, `error`. `fit` maps to `object-fit`
  (`cover`/`contain`/`fill`/`none`); the clamped focal point maps to `object-position` (`fit: "none"`
  centres). Masks (`rounded`/`circle`/`inset`/`none`) are applied to the frame; a source-space crop
  enlarges an inner box inside an `overflow: hidden` frame (fractions clamped to ≤ 0.98 and dropped if
  they would remove the whole source on an axis). A missing/failed asset renders `fallback`, else an
  honest static message ("Missing asset" / "Asset failed to load").
- **Customization:** fit, focal point, mask and crop are all document data; `className` merges onto
  the frame; `fallback` replaces the default message.
- **Dependencies:** `react` only (plus local `./document`).
- **Limits:** there is **no retry affordance** — a failed load shows the error state or `fallback`,
  because the component has no way to retry. `mask.kind: "circle"` does not force `aspect-ratio: 1`,
  so on a non-square frame it yields an ellipse (the honest result of the requested mask). The frame
  never mutates `asset.width`/`asset.height`; crop and mask are pure view transforms.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-components.test.tsx` → passed. Covers `object-fit` + `object-position`
  mapping, the four mask styles, source-space crop geometry, the no-mutation guarantee, decorative
  alt/`aria-hidden`, alt resolution order, the missing-asset error state, a supplied `fallback`, and
  the `loading` → `loaded` transition.
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for a rounded `MediaFrame` with alt (document/contrast rules
  disabled in jsdom). A manual browser/screen-reader pass was **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/media-frame.stories.tsx` (Fits, FocalPoints, Masks, Crop, Decorative, MissingAsset,
  Fallback, VideoAsset). `npm run build-storybook` **not run (owned by the integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**; jsdom cannot judge geometry.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. The skeleton does not reflow the frame. Bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — the missing retry affordance and the
  non-square `circle` behaviour are named above.

**Links to evidence:** `../../tests/media-components.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/media-frame.stories.tsx`, `../../src/pages/media-compositions.tsx`.
