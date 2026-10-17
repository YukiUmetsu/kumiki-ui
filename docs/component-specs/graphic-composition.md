# Component: Graphic Composition

**Status:** Implemented within **`motion-react`**, with current automated verification recorded in
[the V1 report](../verification/2026-10-17-motion-v1.md). The interactive and narrow/dark stories
exist. Current visual approval is pending user review. `MOTION_COMPONENT_NAMES` still lists the seven exports of `react.tsx`;
this companion renderer has its own module.
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
  `MaskSample.polygon` in composition coordinates, including rotation/skew. The shared internal
  `svg-mask.tsx` adapter draws hard clips as polygons and promotes feathered clips to alpha mattes.
  Alpha/luma mattes retain evaluated opacity, use native CSS `mask-type`, and apply Gaussian blur
  with standard deviation `feather / 2`; explicit user-space mask/filter bounds include three
  feather widths of padding. The panel remains inside its untransformed masking wrapper. See the
  `MaskSample` contract in [Motion Geometry](motion-geometry.md).
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
  `react`, `svg-mask`), and no Kumiki UI component and no third-party package. Its host item `motion-react`
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

Current execution evidence is authoritative in the [2026-10-17 V1 report](../verification/2026-10-17-motion-v1.md).

- [x] Full suite: `npm test -- --reporter=dot` — **119 files / 1,387 tests passed**.
- [x] Renderer regressions: **6 passed**, after reproducing the original failures.
- [x] Motion browser suite: `npx playwright test tests/e2e/motion-gallery.spec.ts` — **9 passed**;
  light/dark axe, overflow, keyboard seeks, native mask styling, painted soft-edge alpha samples,
  arbitrary-frame seeks and live system reduced-motion changes included.
- [x] Typecheck, lint and diff whitespace checks passed; the existing unrelated lint warning remains.
- [x] Storybook build passed; composition scene, narrow/dark and transformed-feather stories exist.
- [x] Registry validation/staging passed: **56 items / 281 staged files**. Fresh `motion-react`
  consumer: **11 items / 26 compiled files**, including an explicit `GraphicComposition` import.
  Fresh `motion-track` and `scene-storyboard` consumers also compiled.
- [x] No new dependencies or lockfile changes; native SVG adapter shared by both rendering paths.
- [ ] Current visual inspection/approval — deferred to the user, per their stated preference.
  Existing light/dark/narrow screenshot comparisons passed; no baselines were updated. No manual
  screen-reader, WebKit, zoom or two-palette visual approval is claimed. See the V1 report for exact
  commands, failures, bundle measurement, limitations and next steps.
