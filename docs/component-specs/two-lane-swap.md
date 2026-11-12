# Two-Lane Swap Choreography

**Registry installation:** `two-lane-swap`.
**Source:** `registry/motion/two-lane-swap.ts` (renderer-neutral compiler/evaluator) and
`registry/motion/two-lane-swap-react.tsx` (accessible SVG adapter).
**Storybook:** `Motion engine / Two Lane Swap` with Crossing, Establish,
Final Hold, Portrait, and Reduced Motion variants.

## Purpose

Two original authored visual subjects exchange horizontal lanes in a
controlled cinematic beat, along **separate upper/lower curved paths**.
Unlike a generic pair of independent move tracks, one plan validates
both subjects together before allowing rendering: no sampled-frame
collision or movement beyond the safe viewport. Use it for comparison
animations, rearranging two independent concepts, or passing visual
attention between zones.

The inspiration was a **source-grounded motion-geometry proposal** in
`kumiki-reference-lab` (`originalMotionMechanicIdeas`), not an inferred
actor identity or a reproduction of any observed film. Authors supply
their own artwork, staging, story context and timing.

## Authoring contract

```tsx
import { compileTwoLaneSwap } from './registry/motion/two-lane-swap';
import { TwoLaneSwapSvg } from './registry/motion/two-lane-swap-react';

const result = compileTwoLaneSwap({
  schemaVersion: 1,
  id: 'visual-exchange',
  stage: { width: 1200, height: 680 },
  subjectA: { id: 'idea-a', radiusPx: 116 },
  subjectB: { id: 'idea-b', radiusPx: 116 },
  left: { x: 292, y: 382 },
  right: { x: 908, y: 382 },
  startFrame: 0,
  durationFrames: 120,
  staggerFrames: 6,
  arcHeightPx: 140,
  anticipationPx: 10,
  overshootPx: 8,
  maxTiltDeg: 5,
  depthScaleDip: 0.04,
  clearancePx: 22,
  safeMarginPx: 30,
});
if (!result.ok) throw new Error(result.diagnostics[0].message);

// The asset SVG paths are independent ORIGINAL artwork centered on (0,0).
const output = (frame: number) => (
  <TwoLaneSwapSvg plan={result.plan} frame={frame}
    subjectA={<path d='M-50 0L0-50L50 0Z' fill='#e5ad69' />}
    subjectB={<circle r='55' fill='#5ed2bf' />}
    ariaLabel='Two original shapes exchange places' />
);
```

The compiler normalizes optional values into a **plain serializable spec**
and returns `ok:false` diagnostics for invalid dimensions, IDs, timing,
viewport clipping or sampled circle clearance. Never silently clip or
allow an unsafe scene to continue.

Each subject's `radiusPx` is the conservative radius of its **full visual
bounding circle**, including decoration, text, tilt and ornaments. You
must measure your original artwork before selecting it. The validator
checks these declared circles for all *integer* frames; it does not
claim continuous sub-frame collision detection or infer 3D contact.

## Motion phases and controls

- **Anticipate:** a short reverse move (default 12 px).
- **Travel:** cubic eased horizontal swap; subject A follows the upper
  image arc, B the lower. Optional mild tilt and scale dip.
- **Stagger:** B begins later and finishes later; A holds its finished
  placement. Both use the same travel duration.
- **Settle:** a symmetric, zero-endpoint-velocity gentle overshoot.
- **Hold:** exact final lane centers, no accumulated velocity or drift.
- **Reduced motion:** the final readable composition from any frame,
  also respecting the system reduced-motion preference in the SVG adapter.

Coordinates are in 2D design pixels with top-left origin. The subject
artwork is authored relative to the object's own center `(0,0)`.
`frame` is an absolute integer frame, and the clip samples
`[startFrame, startFrame + durationFrames)`; seeking backwards and
replaying produces identical values. The SVG accepts normal SVG props,
`ref`, `background`, `overlay`, `subjectA`, `subjectB`, and `ariaLabel`,
and scales uniformly for responsive output.

All numeric knobs have explicit finite-value and budget checks. The
compiler validates every integer frame against `safeMarginPx` and
`clearancePx`. Unlike independent tracks, a too-small `arcHeightPx`
or too-large subject radius produces a **collision diagnostic** instead
of a misleading view. A too-large arc or overshoot produces a
**bounds diagnostic**.

## Rendering and craftsmanship

The Storybook scene contains original small SVG artworks, distinct
warm/cool visual hierarchies, a subtle stage grid and curved path guides,
a protected title zone, readable caption zone, and an explicit
frame scrubber for crossing and settle inspection. Both portrait and
landscape layouts are authored separately and validated as safe.

Structural tests are not a substitute for actually viewing the artwork.
Before release, capture representative start, anticipation, crossing,
settle and hold frames in both aspects; confirm visual rhythm, layering,
readability, and intended assets with a human visual review. Browser
screenshots and full visual approval are independent release gates.

## Testing

```bash
npx vitest run --project unit tests/two-lane-swap.test.tsx
npm run typecheck
npm run registry:validate
npm run registry:smoke
```

Run the dedicated Storybook browser geometry/screenshot checks via the
manual scene QA workflow, or locally with Playwright after Storybook is
running. Unit tests cover all authored frames, source mutation, seek
order, exact finish, coarse speed bound, viewport and circle clearance,
invalid inputs, portrait geometry, static SVG markup, paint order and
reduced motion.

## Explicit limitations

This recipe neither identifies source-film characters nor infers speech,
walking, physical collision, gaze, social intent, a film camera path,
or source keyframes. Its compositing layer order is an authored design
decision, not a recovered occlusion relationship. It does not implement
3D actor rigging, object exchange, semantic handoff or automated video
download; other library tools own those purposes.
