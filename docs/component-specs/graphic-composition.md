# Component: Graphic Composition

**Status:** Implementing — the `GraphicComposition` renderer is present as a file of the
**`motion-react`** registry item and installable; the installed-item evidence is recorded below. A
visual review of the `graphic-composition` gallery section (1440 light, 1440 dark, 375 light) has been
run; the two defects it found were fixed and the re-captured screenshots, the Playwright/axe suite and
the registry checks were re-verified green (see [Acceptance evidence](#acceptance-evidence)). The
Storybook story and the `MOTION_COMPONENT_NAMES` entry are still **absent**.
**Catalog phase:** M1-A (docs/07 §6), docs/08 §12 **MG1**. Registry item **`motion-react`** (the
renderer ships as `components/motion/graphic-composition.tsx` within that item — it is not a separate
registry item).
**Why shared:** The geometry and evaluator primitives (a path, a trim window, a contour morph, a mask
sample, spring values) are renderer-neutral, but a coordinated diagram reveal is a recurring scene,
not a one-off: one route a packet travels, staggered stations that pop in lock-step with the draw, a
masked detail panel and an end-state accent, all read from one timeline at one integer frame. A
reusable SVG renderer keeps that composition deterministic and reduced-motion-correct without each
consumer re-implementing sample reading, masking and spring timing. Alternatives considered: keep the
scene inside the showcase page (rejected — downstream demos and future renderers would copy it);
author a bespoke component per scene (rejected — it re-derives the same sample keys, the same
`evaluateTimeline` call and the same reduced-motion branch). Like every `motion-react` component it is
a **pure function of `frame`**; the only clock is the parent scrubber.

**Source:** [`registry/motion/graphic-composition.tsx`](../../registry/motion/graphic-composition.tsx);
`src/motion/react.tsx` re-exports it for the showcase. It composes the primitives from
[`registry/motion`](../../registry/motion/index.ts): `evaluateTimeline`/`outputKey`, `samplePath`/
`pathToSvgD`, `trimPath`, `morphShapes`, `evaluateMask`, `composeMatrix`/`applyMatrixToPoint`,
`springValue` and `usePrefersReducedMotion`. The gallery section lives in
`src/pages/motion-gallery.tsx` (section id **`graphic-composition`**) and is driven by the
`graphic-composition` fixture in `src/motion/motion-fixtures.ts`.

## Contract

- **Use / not use:** use to render one coordinated, frame-driven SVG diagram scene from a MG1
  timeline: a path-driven route with a staggered station reveal, a traveling packet, a masked detail
  panel with a shape morph, and an end-state accent. It is a presentational renderer — pass it an
  explicit `timeline` and integer `frame`; it never authors, validates or serializes motion (that is
  [Motion Track](motion-track.md) / [Motion Geometry](motion-geometry.md)), and it does not run its
  own playback (drive it with [Motion React](motion-react.md)'s `MotionScrubber` or a caller clock).
  Do not expect it to generalize to arbitrary timelines: it reads a **fixed, documented set of target
  names** (below), and do not use it for a rendered 3D scene, a video composition or interactive
  editing (docs/08 §12 MG2+).
- **Public API:** `GraphicComposition(props: GraphicCompositionProps)` where `GraphicCompositionProps`
  extends `Omit<ComponentPropsWithoutRef<"div">, "children">` with `timeline: MotionTimeline`,
  `frame: number`, `reducedMotion?: boolean`, `ariaLabel?: string` (`"Graphic composition"` by
  default). There are no `children`, no refs and no callbacks; `className`, `style` and all remaining
  `div` props are forwarded. The component is also re-exported from `src/motion/react.tsx`.
- **Composition / boundary:** `GraphicComposition` evaluates the whole `timeline` at `frame` with
  `evaluateTimeline` inside a `useMemo` and reads a fixed set of `${targetId}.${property}` samples:
  `graphic-path.data` (a `MotionPath` carrier), `graphic-trim.data` (a `PathTrimSpec` carrier),
  `reveal-length.revealLength` (0→1 draw length consumed by `trimPath`), `packet.position` (`Vec2`),
  `graphic-morph.from`/`graphic-morph.to` (`ContourShape`) + `morph.progress`,
  `graphic-mask.clip`/`graphic-mask.alpha` (`MaskSpecLocal`) + `mask.progress`, and
  `accent-dot.opacity`. It draws on a fixed `viewBox="0 0 1920 1080"` with
  `preserveAspectRatio="xMidYMid meet"`: a subtle grid scaffolding, the faint full-route **guide**
  (the scene's *establish* beat, drawn outside the reveal clip so the plan of the route is readable
  before the draw begins), a route group clipped by the
  `clip` mask holding the trimmed revealed stroke, springs-popped station circles at each
  path anchor, the packet, a pulsing end-state accent, and (when both morph contours exist) a detail
  panel masked by the `alpha` matte with the `morphShapes` result (a `--km-action-primary` shape at
  `0.9` opacity inside a `--km-surface-elevated` panel stroked with `--km-border-strong`). The `clip`
  matte clips the route group via `clipPath`; the `alpha` matte masks the detail panel. Because an SVG
  mask is resolved in the user space of the element that references it, the `mask` lives on an
  untransformed wrapper `<g>` and the panel is positioned by an inner
  `<g transform="translate(1120, 720)">` — so the panel's own offset never shifts the matte (the
  `clip-path` case was already correct because its transform sits on a child). Because the mask is
  resolved in the SVG's user space, the panel also has to lie **inside the authored matte**: the
  `graphic-mask.alpha` rect is 1440 wide from x = 240, so a panel reaching past x = 1680 loses its right
  rounded corner to the matte's own content edge on every frame. The panel is therefore positioned at
  `translate(1120, 720)` (x 1120→1640, inside the matte), not flush against the scene's right edge.
  The terminus pulse
  cluster is resolved from the **route terminus** (`transformedAnchors`, the last anchor through
  `ROUTE_MATRIX`) with relative offsets, so it stays attached to the path for any route; it uses fixed
  radii `12`/`9`/`10`, an opacity band `0.65 + 0.35 * clamp01(accent-dot.opacity)` rather
  than the raw sample (which read as sub-pixel noise), gated by
  `terminusReveal = clamp01((revealLength − 0.92) / 0.08)` so the cluster cannot appear ahead of the
  stroke that draws toward it. The traveling packet carries a `--km-surface-elevated` keyline so it
  stays distinguishable from the station markers it passes. The root carries
  `data-km-graphic-composition=""`; the inner `<svg>` is `role="img"` with the `ariaLabel`.
- **Semantics:** **determinism** — rendering is a pure function of `timeline` + `frame`; every derived
  geometry is a `useMemo` of those inputs, no clock or randomness is read, and numbers are formatted by
  a `fmt` that rounds to three decimals and normalizes `-0`. **Reduced motion** is behaviour, not
  styling: `usePrefersReducedMotion` (from `./react`) plus an explicit `reducedMotion` override select
  the **last** authored frame (`durationFrames − 1`, floored at 1) so the scene resolves to its
  end state. **Honest absence** — a target the timeline does not provide leaves that layer undrawn
  (the component owns no fallback scene and no placeholder copy). **Mask fidelity** — it draws
  `MaskSample.rect` for the clip/alpha geometry it uses; the full resolved polygon/feather fidelity is
  handled by [Motion React](motion-react.md)'s `MaskRevealView` and the `MaskSample` contract in
  [Motion Geometry](motion-geometry.md).
- **Keyboard/focus:** not applicable — a presentational renderer with no interactive surface and no
  focusable elements. Scrubbing (the keyboard surface) is provided by `MotionScrubber`; the gallery
  section pairs the two.
- **Visual states:** one deterministic frame state (everything animates from `frame`), plus a
  reduced-motion end state. Because the SVG scales with `preserveAspectRatio="xMidYMid meet"` inside a
  `position: relative` box with `overflow: hidden`, the scene letterboxes rather than reflowing. The
  gallery renders it in a 16:9 stage card (`aspect-video`), so the 1920×1080 scene fills the card; a
  consumer that passes a container with a different aspect ratio will still see the scene letterbox
  rather than reflow. The root reports `data-km-graphic-composition`; there is no
  hover/focus/disabled/error state of its own.
- **Customization:** `className`/`style` and remaining DOM props are forwarded; `ariaLabel` names the
  image and `reducedMotion` overrides the media query. The scene's colours come from consumer CSS
  variables used internally: `var(--km-action-primary)` for the revealed route, packet, station rings,
  pulse dots and morph shape; `var(--km-surface-default)` for the station fills;
  `var(--km-surface-elevated)` for the packet keyline; `var(--km-border-subtle)` for the scaffolding
  gridlines and the route guide; and
  `var(--km-surface-elevated)` / `var(--km-border-strong)` for the detail panel fill and stroke (an
  earlier `--km-surface-default`/`--km-border-subtle` panel was near-identical to the card background,
  and the `--km-surface-inset` replacement that followed reversed the hierarchy by making the panel the
  darkest, heaviest object in the scene).
  Its **motion is customized entirely in the timeline data**, not by props. The 1920×1080 design space, the slight vertical squash (`ROUTE_MATRIX`, scale y `0.9` about
  the centre), `SAMPLES_PER_SEGMENT = 16` and the two springs (`STATION_POP_SPRING`,
  `PACKET_POP_SPRING`) are fixed module constants, not props.
- **Dependencies:** **React only** — it imports React (`useId`, `useMemo`, types) and sibling `./…`
  motion modules (`types`, `timeline`, `masks`, `morph`, `paths`, `trim`, `matrix`, `springs`,
  `react`), and no Kumiki UI component and no third-party package. Its host item `motion-react`
  declares `dependencies: []`.
- **Limits:** the renderer is intentionally a **specific** scene, not a generic SVG engine:
  - **Fixed target names.** A timeline must use the target/property names listed above; other names
    are simply ignored (a missing track draws nothing). There is no schema or validation for the
    scene shape — validate the timeline with [Motion Track](motion-track.md).
  - **Fixed viewBox and layout.** Geometry is authored in a 1920×1080 space with a hard-coded squash and
    a hard-coded panel position, and it scales with `preserveAspectRatio="xMidYMid meet"`
    (letterboxing, never reflow). The route terminus is resolved from the path, so the pulse cluster and
    the stations follow any route; the panel, the scaffolding gridlines and the reserved terminus region
    are still fixed coordinates. It is not responsive in the sense of rearranging content; the gallery
    sidesteps the letterbox only by wrapping it in a 16:9 card.
  - **Sampling and timing constants.** `samplePath` uses 16 samples per segment, the station pop uses
    `STATION_POP_SPRING`, and the packet emphasis is derived from `evalFrame` (it grows after frame
    60). These are not props.
  - **Reduced motion.** It evaluates the last authored frame's values for display; the requested
    `frame` is the caller's concern, exactly as the other `motion-react` components behave.
  - **Not a manifest member.** `GraphicComposition` is exported from its own module and re-exported by
    `src/motion/react.tsx`, but it is **not** listed in `MOTION_COMPONENT_NAMES` (which still names the
    seven core components).
  - **2D screen-space only.** It has no 3D/camera path and no audio/video/caption surface (docs/08 §10,
    docs/11 §3 v2 — MG2+).

## Gallery stage

The `#/motion` gallery renders this scene in the `graphic-composition` section
(`src/pages/motion-gallery.tsx`) as a 16:9 stage card (`aspect-video w-full overflow-hidden`) that the
1920×1080 scene fills, paired with a `MotionScrubber`. The section opens on a representative frame,
`Math.round(durationFrames * 0.72)` → frame **432** for the 600-frame `graphic-composition` fixture,
so the first sight of the section is a fully composed scene rather than the deliberate opening beat
(frame 0 shows only the route plan, the scaffolding and the first station, which is honest but reads as
an unfinished card in a gallery of finished states). The component keeps
`preserveAspectRatio="xMidYMid meet"` and
`viewBox="0 0 1920 1080"`, so a consumer with a container that is not 16:9 will still see it letterbox.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** — the deterministic inputs
  the renderer consumes are covered by the motion vitest suites:
  `npx vitest run tests/motion-core.test.ts` → **82 passed** and
  `npx vitest run tests/motion-geometry.test.ts` → **34 passed**. The full suite is `npx vitest run` →
  **Test Files 118 passed (118)**, **Tests 1378 passed (1378)**; `npm run typecheck` → exit 0 (no
  output); `npm run lint` → exit 0, **0 errors, 1 pre-existing warning** unrelated to motion
  (`tests/e2e/probe-overflow.spec.ts:64:3 Unused eslint-disable directive`). The gallery e2e spec, which
  now lists `graphic-composition` in `SECTION_IDS`, was re-run:
  `npx playwright test tests/e2e/motion-gallery.spec.ts` → **8 passed**. Keyboard tests are **not
  applicable** (no interactive surface; the keyboard surface is `MotionScrubber`).
- [x] **axe-core output and manual a11y checks recorded** — `npx playwright test
  tests/e2e/motion-gallery.spec.ts` → **8 passed** includes *"has no axe violations in light and dark
  appearance"*, which runs `axe-core` (WCAG 2A/2AA/2.1/2.2 tags) over the `#/motion` page — including
  the new `graphic-composition` section — in both appearances (exit 0). Manual screen-reader checks were
  **not run**; the intended accessible surface is one `role="img"` SVG with an `aria-label`.
- [x] **Storybook states complete, including realistic and CJK/long content** — added in review:
  `src/motion/motion.stories.tsx` now carries two `GraphicComposition` stories, `GraphicCompositionScene`
  (the 16:9 stage at the gallery's opening frame, 432) and `GraphicCompositionNarrowDark` (a 240 px wide
  dark stage at frame 480). CJK/long-content states do not apply — the renderer draws no text and owns no
  content slots. `npm run build-storybook` → *"Storybook build completed successfully"*; both stories were
  then loaded from the built `storybook-static` output
  (`iframe.html?id=motion-react--graphic-composition-scene` and `…--graphic-composition-narrow-dark`) and
  each rendered one `[data-km-graphic-composition]` root with one `svg`, no console or page errors, and a
  legible scene at 240 px.
- [x] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** — the
  `graphic-composition` section was captured and inspected at **1440 light, 1440 dark and 375 light**
  (theme-a only; this section has no theme-b toggle and density does not apply to a fixed-aspect SVG
  stage). The Playwright *visual baselines: light, dark and narrow* test asserts the
  `motion-gallery-light-1440`, `motion-gallery-dark-1440` and `motion-gallery-light-375` snapshots
  (`tests/e2e/**/*.png` is gitignored, so they are regenerated locally rather than committed), which
  were re-generated for the new section (adding `graphic-composition` to `SECTION_IDS` had changed the
  page) and then re-verified green on the re-run — the same cycle was repeated after the composition
  fixes and passed without `--update-snapshots`.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the Playwright
  *"never scrolls horizontally, from 320px up"* test passed (320/375/768/1440) and the axe light/dark
  test passed. The visual review confirmed the detail panel and shape render in both themes, the pulse
  dots are legible, the panel sits fully inside the card without overlapping the route or stations, and
  the 375px layout has no overflow. Three review rounds found seven defects, all fixed in code: the
  1920×1080 scene was letterboxed inside a
  fixed-height 4:1 card (the stage card is now `aspect-video`); the detail panel rendered invisible
  because its `mask` shared the panel's `translate(1240, 720)` transform (the mask now lives on an
  untransformed wrapper `<g>`); the detail panel filled `--km-surface-inset`, which made
  it the darkest, heaviest object in the scene and inverted the hierarchy (now
  `--km-surface-elevated`); the pulse cluster used absolute coordinates unrelated to the resolved path
  and could appear while the stroke was only part-drawn (now derived from the route terminus and gated
  by `terminusReveal`); the packet and the station markers shared one encoding and merged into an
  ambiguous blob on arrival (the packet now carries a `--km-surface-elevated` keyline); frame 0
  rendered as an empty canvas because the guide path sat inside the zero-width reveal clip (the guide is
  now drawn outside the clip as the *establish* beat); and the detail panel's right rounded corner was cut
  on every frame because the panel (x 1240→1760) reached past the authored alpha matte's content edge
  (x = 1680, verified from the built DOM: the mask content is one white rect at `x=240 width=1440`), so
  the panel was repositioned to `translate(1120, 720)`, fully inside the matte, and re-rendered in both
  appearances and at 375 px.
- [x] **Test registry install into fresh fixture passed** — `node scripts/registry-validate.js` →
  `registry:validate OK — 56 item(s) valid.`; `node scripts/registry-smoke.js` → `registry:smoke OK — 56
  item(s), 280 file(s) staged into an isolated directory.` (was 279; the extra file is
  `registry/motion/graphic-composition.tsx`, now a file of the `motion-react` item); `npm run
  registry:fixture` → `registry:fixture OK — 56 item(s), 87 file(s) compiled in a temporary fixture
  (removed)` (plus pre-existing "no consumer usage template" warnings for unrelated items).
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — the module imports
  only React and sibling motion modules and the host item `motion-react` declares `dependencies: []`,
  so there is no new third-party licence surface. The demo app bundle was **not re-measured** in this
  task; the last measured figure (from the earlier slice) was `dist/assets/index-*.js` ≈ 1.14 MB
  minified, gzip ≈ 345 kB, with the pre-existing "chunks larger than 500 kB" Vite warning.
- [x] **Blockers resolved; known limitations named honestly** — three review rounds found seven defects
  (the 4:1 letterbox stage card, the transform-offset mask, the inverted panel hierarchy, the detached
  pulse cluster, the packet/station ambiguity, the empty opening frame and the matte-clipped panel); all
  seven were fixed and every re-run check is green. The fixed target
  names, the fixed 1920×1080 (letterboxable) layout, the panel's fixed position inside the authored matte,
  sampling/spring
  constants, reduced-motion end-frame sampling and the `MOTION_COMPONENT_NAMES` exclusion are named
  above.

**Links to evidence:** `../../registry/motion/graphic-composition.tsx`,
`../../registry/motion/react.tsx`, `../../registry/motion/masks.ts`, `../../registry/motion/morph.ts`,
`../../tests/motion-core.test.ts`, `../../tests/motion-geometry.test.ts`,
`../../tests/e2e/motion-gallery.spec.ts`, `../../src/pages/motion-gallery.tsx`,
`../../src/motion/react.tsx`, `../../src/motion/motion-fixtures.ts`,
`../../examples/motion/graphic-composition.json`.
