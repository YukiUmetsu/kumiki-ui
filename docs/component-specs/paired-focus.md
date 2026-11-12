# Paired Focus: Convergence, Divergence and Release

**Status:** Implementation and deterministic contract tests; independent browser screenshot review and aesthetic approval pending.
**Registry pack:** `paired-focus` (`motion-track` dependency).
**Sources:** `registry/motion/paired-focus.ts` and `registry/motion/paired-focus-react.tsx`.
**Storybook:** Motion engine / Paired Focus — Complete Sequence, Converge, Diverge, Portrait, Reduced Motion.

## Authoring intent

This is a reusable **specific cinematic animation mechanism**, not another general UI container. Two independently authored visual assets approach a shared image-space focus, remain arranged on either side of the focus for an optional explanatory pause, and can move back out into distinct comparison positions. The visual point of focus establishes an authored relationship; it does not imply real contact, dialogue, intent, or character identity.

The mechanics are inspired by measured screen-space distance changes in `kumiki-reference-lab`. A real source video does **not** supply component parameters or copyrighted keyframes. Authors provide original visual elements, meaning and choreography.

## Public API

```tsx
import { compilePairedFocus } from './registry/motion/paired-focus';
import { PairedFocusSvg } from './registry/motion/paired-focus-react';

const checked = compilePairedFocus({
  schemaVersion: 1,
  id: 'relationship-reveal',
  mode: 'converge-then-diverge', // also 'converge' or 'diverge'
  stage: { width: 1280, height: 720 },
  subjectA: { id: 'idea-a', radiusPx: 102 },
  subjectB: { id: 'idea-b', radiusPx: 102 },
  outerA: { x: 272, y: 386 },
  outerB: { x: 1008, y: 386 },
  focus: { x: 640, y: 386 },
  focusSeparationPx: 302,
  startFrame: 0,
  durationFrames: 160,
  focusHoldFrames: 28,
  staggerFrames: 4,
  curvePx: 64,
  anticipationPx: 7,
  overshootPx: 5,
  clearancePx: 20,
  safeMarginPx: 28,
});
if (!checked.ok) throw Error(checked.diagnostics[0].message);

const view = (frame: number) => <PairedFocusSvg
  plan={checked.plan} frame={frame}
  subjectA={<circle r={50} fill='#EFC18D'/>}
  subjectB={<circle r={50} fill='#80EDDA'/>}
  focusCue={<circle r={15} stroke='#B2FFF2' fill='none'/>}
  ariaLabel='Two ideas approach a focus and separate'/>;
```

All positions and radii are design pixels, using the top-left image origin. SVG art must be centered on its own `(0,0)` local origin. `subjectA.radiusPx` and `subjectB.radiusPx` are **conservative enclosing circles of the complete original artwork**, including text, glow, ornament and scaling. The compiler evaluates actual up-to-3.5% animated scale against both viewport margins and inter-subject clearance.

## Motion and mode semantics

- **Converge:** original outer anchors move toward the independently authored focus point, ending with two distinct centers separated by `focusSeparationPx` and an emphasized `focusCue`.
- **Diverge:** begin on those focus centers and separate into the two outer anchors; focus cue fades away.
- **Converge-then-diverge:** approach, maintain the focal arrangement for `focusHoldFrames`, then travel outward; optional `exitA` and `exitB` can author different final locations.
- **Anticipation and travel:** a brief reverse move gives each original object intent; cubic easing and upper/lower offset curves preserve a distinct visual lane. B may start `staggerFrames` later within each leg.
- **Focal hold:** the compiler returns `focusStrength: 1` during the author-defined pause; the renderer fades in the caller's original `focusCue`. No suggested real-world interaction is implied.
- **Settle and hold:** authored overshoot returns exactly to target coordinates with zero accumulated drift. Last and subsequent frames hold the declared final composition.
- **Reduced motion:** every requested frame resolves to the exact final static composition; system `prefers-reduced-motion` is honored unless explicitly overridden.

`startFrame` and `durationFrames` are integer-frame coordinates; active motion is `[startFrame, startFrame + durationFrames)` with the last frame reaching the final position. The evaluator is a pure function of the frame. Seeking out of order produces identical results. Source videos, sound, network calls, external libraries and user-identifying data are not loaded.

## Structural safety

The compiler checks every **integer output frame**, not continuous subframes. It returns a structured diagnostic instead of a plan if any sampled frame:

- Exceeds the stage's safe boundaries;
- Places two **scaled conservative bounding circles** closer than `clearancePx`;
- Includes nonfinite values, invalid IDs, unsupported mode, invalid timing or an impossible focus separation;
- Violates the bounded stage sizes, stagger or hold durations.

The minimum clearance is reported for inspection, but geometric safety does not certify compositional quality. True semantic contact, screen occlusion, production art polish, accessibility of textual assets, and uninterrupted sub-frame collision are outside this geometry proof.

## Rendering quality and review

The Storybook scene uses original wave/orbit SVG artwork, color-separated lanes, a restrained emphasis ring, measured title and footer zones, a frame scrubber and representative beat buttons. The landscape stage is 1280 × 720 and the portrait stage is 720 × 1080. Both must receive manual rendered screenshot review for animation timing, safe caption geometry, actual pixel overlap, visual hierarchy and reduced-motion behavior before visual certification.

## Verification

```bash
npm run typecheck
npx vitest run --project unit tests/paired-focus.test.tsx
npm run registry:validate
npm run registry:smoke
npm run catalog:check
```

Unit/SSR tests cover all 160 frames, portrait and landscape dimensions, all three modes, exact focus holds and endpoints, independent authored exits, out-of-order seeking, reduced-motion output, conservative scaled clearances, invalid inputs and original SVG slots. Full visual approval and Storybook screenshot capture are not inferred from unit tests or successful CI.
