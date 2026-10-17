# 08 — Motion Graphics & Art Direction

**Purpose:** a renderer-neutral vocabulary for premium, code-authored motion. **Depends on:** [07 foundation](07-media-foundation.md). **Normative time/serialization:** [11 rendering contract](11-rendering-quality.md). These are reusable *motion descriptions*, not browser-specific CSS animations.

## 1. Motion as communication

Every animation must answer at least one question: **What changed? Where should the viewer look? What persists? How are two ideas related?** If it answers none, remove it. Prefer **spatial continuity** to slide-by-slide effects. Use cuts when a transition communicates nothing. Favor controlled acceleration, clear holds and deliberate negative space over persistent movement.

| Principle | Implementable rule | Common failure |
|---|---|---|
| Staging | One dominant changing focal region per beat; other layers support or hold | Everything moves simultaneously |
| Anticipation | Short setup movement before major action when it clarifies cause | Unmotivated bounce |
| Follow-through | Secondary motion trails primary action, with bounded overshoot | Endless wobble |
| Overlap | Related elements begin before earlier movements fully finish | Mechanical one-after-another reveals |
| Continuity | Shared objects preserve `semanticId` and mapped position/scale across shots | Object pops to unrelated location |
| Readability | Hold information long enough to perceive; avoid animating during dense reading | Constant title movement |
| Restraint | Effects have semantic roles; accents are rare by default | Every object glows, spins and scales |
| Physical plausibility | Use coherent inertia, depth, perspective and light cues where applicable | Camera/objects move with inconsistent physics |

## 2. Motion primitives — canonical behaviors

| Primitive | Inputs | Semantics / validation |
|---|---|---|
| `tween` | Typed from/to, duration, easing | Pure interpolation; zero duration becomes discrete cut; out-of-range evaluation clamps or explicitly loops |
| `spring` | Start/end, stiffness, damping, mass or named preset | Deterministically sampled at requested frame; configurable settling limit; no wall-clock integration |
| `stagger` | Ordered IDs, offset frames, schedule | Explicit order (never map iteration order); can overlap, reverse or group |
| `sequence` / `parallel` | Child tracks, cue anchors | Namespaced timeline; computes duration and collision windows; no implicit padding |
| `motion-path` | Cubic path/arc, progress, orientation mode | Arc-length parameterization optional; tangent orientation and stable path coordinates |
| `shape-morph` | Source/target vector paths, correspondence | Validate winding, contour count and point topology or explicit remapping; unsupported morph uses a documented cross-dissolve |
| `trim-path` | Path ID, start/end percentage, direction | Real stroke-reveal on vector; no alteration of source geometry |
| `mask-reveal` | Content, mask path, matte mode, transform | Typed alpha/luma mode; well-defined clipping and edge behavior |
| `transform-group` | Parent ID, children, transforms | Deterministic matrix composition and inheritance; local/world coordinate conversion |
| `shared-element` | `semanticId`, source/target anchors, handoff range | Maintains visual identity across overlapping scenes; validates incompatible asset/geometry types |
| `property-track` | Layer ID, typed property, keyframes | Sorted unique frame keys; explicit duplicate/conflict rules; each property has one final value per frame |
| `motion-preset` | Named preset + parameters | Semantic behavior; versioned, theme-overridable, no hard-coded brand appearance |

Supported interpolated types: scalar, length, angle (shortest/full-turn mode), 2D vector, scale, opacity, 2D affine transform, color (documented color space), gradient stops with compatible topology, compatible path geometry. **Never** interpolate arbitrary strings or untyped JSON. Discrete values (assetRef, visibility, text content) switch at explicit frames. Font-size animation requires recomputing text layout or a documented frozen-layout policy.

### Conflicts and timeline behavior

- Tracks are pure functions of frame, parameters and pinned assets. A seek directly to frame 900 yields the same output as playback from frame 0.
- Keyframes use global composition frames after resolving local clip/scene offsets. Each clip has explicit start, duration and trim; end is **exclusive**.
- Parent/child transform composition is defined (parent before child). Multiple writers to the same property are **errors** unless an explicit blend mode/priority is declared.
- Use named timeline anchors (`questionSpoken`, `nodeReached`, `headlineSettled`) rather than opaque numeric offsets throughout a template. Resolve anchors to absolute frames before serialization.
- A loop declares its repeat count/segment bounds. Procedural randomness uses an explicit seed derived from composition + layer ID; never `Math.random()` during rendering.
- Spring behavior must be closed-form or sampled into a deterministic cache with pinned solver settings. Frame seeking cannot depend on prior simulation state.

```ts
// Illustrative builder syntax only; 11 defines serialized track records.
const intro = sequence(
  animate('title', 'opacity', { from: 0, to: 1, frames: 12, ease: 'ease-out-cubic' }),
  parallel(
    moveOnPath('query', { pathRef: 'query-arc', frames: 24, orient: 'tangent' }),
    stagger(['node-a', 'node-b', 'node-c'], { everyFrames: 5, preset: 'focus-in' }),
  ),
  hold(18),
);
```

## 3. Editorial choreography and visual rhythm

Design **beats**, not a bag of entrance animations. A beat contains: *visual objective → dominant action → supporting action → readable hold → handoff*. Storyboards from [09](09-explainer-components.md) should expose those five fields. Useful grammar:

| Beat | Timing relationship | Suitable use |
|---|---|---|
| Establish | Camera/layout settles before key text | New concept, context |
| Reveal | Primary object enters; labels trail slightly | Introducing architecture or term |
| Transform | Object retains identity while changing form | Explaining equivalence or derivation |
| Contrast | One side holds while the other changes | Before/after and trade-offs |
| Follow | Camera tracks an object or flow along path | Pipelines, journeys |
| Resolve | Motion finishes; readable composition rests | Conclusions and takeaways |

**Art-directable parameters**: duration, delay, ease, travel distance, overlap, overshoot, visual weight, entrance direction, clipping shape, depth, camera follow, hold duration. Defaults are starting points, not rigid timing laws. Avoid full-sentence character-by-character typing unless typing itself is the subject; prefer line/word emphasis for narration. Segment at Unicode grapheme clusters; CJK and RTL require language-aware boundaries and direction-specific testing.

### Motion personality — configurable token profiles

| Profile | Default behavior | Anti-pattern |
|---|---|---|
| `editorial` | Crisp cuts, measured masks, typography-led movement | Gratuitous elastic motion |
| `technical` | Straightforward paths, exact alignment, stable diagrams | Rapid camera spins |
| `cinematic` | Deliberate camera movement, depth, light, long purposeful holds | Excess blur obscuring information |
| `expressive` | Elastic secondary action, energetic stagger, stronger transitions | Uncontrolled competing effects |

Profiles resolve to **versioned numeric token values**, not opaque labels: durations (frames), cubic easing control points, max travel (design pixels), stagger offsets (frames), overshoot bound, blur budget and effect strengths. Consumer themes can replace any value; profiles never change component semantics.

## 4. Kinetic typography and vector design

| Technique | Contract |
|---|---|
| Word/line reveal | Stable line boxes and baseline before animation; mask must not clip descenders/diacritics |
| Emphasis | Animate weight, underline, color, scale or tracking only where glyph shaping remains correct |
| Highlight sweep | Align to measured glyph-run bounds; never estimate from character count |
| Text transformation | Map unchanged token IDs across text changes; additions/deletions use explicit fade/morph fallback |
| Variable font motion | Axis limits and licensed font file pinned; layout policy explicit |
| SVG drawing | Stroke trim supports caps/joins, dash, path direction and high-DPI output |
| Diagram morph | Preserve graph node/edge identity, animate layout without crossing essential labels |

Use legible static fallback for subtitles and dense explanations. Text remains semantically editable even if a renderer rasterizes a glyph run at export; warn when exact font shaping cannot be reproduced.

## 5. Camera and 2.5D cinematography

`camera-stage` is a transformable **view into a scene**, not a complete 3D renderer. Minimum shot model: target/focal point, framing bounds, scale/zoom, pan, rotation, optional perspective/parallax depth, easing and focus-safe region. Shots: **establish → inspect → track → reframe → resolve**. A `followTarget` uses stable object identity; a camera cut never silently relocates a tracked object.

- Separate **object motion** from **camera motion** so either can be reused independently.
- Pin virtual camera transforms to design dimensions; for 9:16 adapt the framing, not the underlying geometry.
- Use depth/parallax only where layers have declared depth and consistent scale behavior; use foreground/midground/background explicitly.
- Reserve zoom-in for gaining detail; zoom-out for context. Don't continually zoom merely to simulate activity.
- Avoid rapid pans over code, equations or captions. Cap motion based on readability and motion-reduction preference.

## 6. Compositing and procedural effects

| Category | Initial support | Renderer boundary / guardrail |
|---|---|---|
| Masks/mattes | Vector clip, alpha matte, ordered mask stack | Capability negotiation for luma matte or feathering |
| Layer effects | Opacity, shadow, blur, glow, gradient overlay, grain | Effects compose in documented order; never assume CSS parity |
| Blend modes | Normal, multiply, screen, overlay where supported | Unsupported mode must be reported, not treated as normal silently |
| Procedural | Seeded gradients, waves, paths, patterns, simple particles | Function of time+seed or precomputed baked trajectory |
| Motion blur | Optional subframe supersampling/shutter interval | Explicitly limited by adapter; off by default in preview |
| Lighting/3D | Optional 3D/depth adapter | Not core, and not needed for standard text/diagram previews |

**Performance strategy:** vector first for text/path/diagrams; cache immutable shapes/text metrics; precompute complex layout/physics; restrict large blur kernels, huge particle counts and multi-pass effects. Apply effects to semantic groups rather than duplicating them per glyph. A still fallback should be visually coherent when an optional effect is absent, with a warning in diagnostics.

## 7. Transition decisions

| Relationship between scenes | Prefer | Avoid |
|---|---|---|
| Same object, new interpretation | Shared-element transform / shape morph | Full scene replacement |
| Same layout, new information | Progressive reveal / mask | Unnecessary camera move |
| New chapter or dramatic contrast | Cut or brief spatial transition | Long decorative wipe |
| Cause travels between systems | Motion path + tracked camera | Multiple unrelated arrows |
| Significant time/topic jump | Distinct establishing shot | Implying false physical continuity |

For a shared element, provide **source/target bounds, semantic ID, transform mapping, hold/handoff overlap**, and a source/target opacity policy. If identities cannot be reconciled, an intentional crossfade is valid; **do not invent a morph** between unrelated objects.

## 8. Quality gates and demonstration fixture

A motion primitive is done when it has a typed builder, reproducible serialized fixture, reduced-motion behavior, browser preview, negative tests and renderer capability notes.

**Golden motion fixture (at least 30 s at 30 fps):** headline reveal → neural-network diagram → zoom to one node → node morphs into equation → equation resolves into code → cut to a summary. Requirements:

- Object continuity is explicit across **at least two** scene boundaries.
- Frames 0, each keyframe, transition boundaries and representative tweens are repeatable after random-order seeks.
- No animated text clips after CJK/RTL font fallback; graphic remains understandable with reduced motion.
- Deliberate holds after dense visual transformations; soundtrack alignment tested under [10](10-character-audio.md).
- Unsupported path morph/motion blur/3D effect produces a structured warning or a declared fallback, never a silently altered result.
- 16:9 and 9:16 versions have separately authored framing constraints and pass visual QA under [11](11-rendering-quality.md).

**Avoid:** automatic spring on every entrance, page-long per-character typing, arbitrary shadows/glows, persistent parallax behind dense text, or synchronized entrance of every layer. Motion quality is judged by **causal clarity and continuity**, not effect count.
