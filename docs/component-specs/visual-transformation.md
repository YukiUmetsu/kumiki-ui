# Visual Transformation — VT1

Status: implemented; see the [verification report](../verification/2026-10-17-visual-transformation.md) for measured acceptance. A 2D authoring fragment that
compiles into the existing MG1 timeline. No additional clock or simulation.

Scenes contain semantic elements, ordered paint, intrinsic geometry, layout,
local/world transforms, group parents and inherited clip chains. Correspondence
is explicit (one-to-one, merge, split, grouped pairs), or unique semantic IDs are
matched. Missing elements enter/exit; ambiguous identities and invalid references
are actionable errors. Every source and destination has exactly one owner.

Selection prefers compatible geometric morphs, then shared representations;
changed text and opaque SVG path strings use explicit crossfade. Mask reveal and
bounded seeded particle transport are opt-in. SVG topology is validated by the
existing morph kernel. Singular/mirrored transform changes crossfade endpoint
poses rather than interpolate a discontinuous signed scale. Contour ordering and
point correspondence remain author responsibilities; no automatic SVG parser,
text shaping, mathematical equivalence or 3D projection is claimed.

Frames are integers at rational FPS, ranges end-exclusive. The first handoff
frame is exactly the source; the first frame after the range is exactly the
destination. All channels use MG1 tracks. Geometry, masks, affine composition and
semantic handoff reuse existing kernels. Sampling never mutates authored data.

Retargeting captures actual painted layers, including partially revealed mattes,
colors, opacity and particles. It appends an immutable segment; earlier frames
remain seekable. The contract is C0 position/appearance continuity. Velocity
continuity is not promised. Callers own playback, reduced-motion frame selection,
captions, fonts and canvas dimensions. The SVG adapter provides a reduced-motion
destination option and forwards native SVG props/ref; custom layer rendering is
an explicit **stateless geometry** slot. Representation instances can remount at
scene boundaries; semanticId and lineage persist, not arbitrary React state.

Paint uses MG1 sRGB colors (RGB 0–255, alpha 0–1). Convert linear-light/HDR
colors before authoring this SVG fragment. Ancestor opacity is sampled in local
channels then multiplied parent-first. Unpaired parent clips and frozen
interruption mattes use a diagnostic endpoint-pose crossfade. Equal corresponding
clip owners follow the sampled hierarchy. Changed stacking order dissolves
ordered source/target passes; unchanged order keeps one morph/shared layer.

Recipes cover shape, diagram, equation, code, assembly, layout and shared-scene
correspondence using this same compiler. They do not infer semantic equivalence.

Acceptance: targeted boundary/topology/ownership/hierarchy/interruption/random
seek tests; all seven recipe examples; connected reference film with at least five
handoffs; browser rendering and visual inspection; source registry dependency
closure and clean install compilation. Record actual evidence separately.

## Consumer usage

Install the `visual-transformation` registry item with its dependency closure.
No new npm dependency or renderer account is required. Existing MotionScrubber
can drive frame; deterministic renderers can request frames in any order.

```tsx
import { compileVisualTransformation } from "./components/motion/visual-transformation";
import { VisualTransformation } from "./components/motion/visual-transformation-react";
import { createSharedSceneTransformation } from "./components/motion/transformation-recipes";
import type { VisualScene } from "./components/motion/visual-transformation-types";

const from: VisualScene = { id: "intro", elements: [{
  id: "label-a", semanticId: "idea",
  content: { kind: "text", text: "One idea", fontSize: 32,
    bounds: { x: 20, y: 20, width: 300, height: 60 } },
}] };
const to: VisualScene = { id: "next", elements: [{ ...from.elements[0],
  id: "label-b", transform: { a: 1, b: 0, c: 0, d: 1, e: 300, f: 100 },
}] };
const transition = compileVisualTransformation(createSharedSceneTransformation({
  id: "idea-handoff", fps: { num: 30, den: 1 }, durationFrames: 121,
  range: { startFrame: 20, endFrame: 100 }, from, to,
  shared: [{ from: "label-a", to: "label-b", semanticId: "idea" }],
}));
// In a React render:
<VisualTransformation transformation={transition} frame={60}
  width={1280} height={720} label="The idea moves into the next scene" />;
```

`createVisualTransformationProgram(specs)` accepts ordered, nonoverlapping global
handoff ranges with exact linked snapshots. `evaluateVisualTransformationProgram`
samples it. `retargetVisualTransformation(program, { frame, to, durationFrames })`
returns a new program, preserving frames before the event. The event frame equals
the painted snapshot. Repeated retargeting truncates only superseded future
segments. Splits/merges retain lineage; the mapping semanticId names the continuing
identity. One mapping owns each source/destination; duplicates are rejected.

`serializeVisualTransformation` validates and saves a VT1 fragment;
`parseVisualTransformation` validates and recompiles it. Compiled data is also
JSON-safe, but authoring fragments are the persistence boundary. Canonical assets,
fonts, dimensions and export profiles remain in the [scene document](../11-rendering-quality.md).

Seven builders accept timing/easing/fallback parameters and explicit scenes or
layouts: `createShapeTransformation` (contour pairs), `createDiagramTransformation`
(nodes/connectors), `createDiagramEquationTransformation` (aggregate terms),
`createEquationCodeTransformation` (authored symbols), `createAssemblyTransformation`
(assembled/separated layouts and direction), `createLayoutTransformation` (new
bounds), and `createSharedSceneTransformation` (named scene elements).

The 42-second reference source is `src/motion/visual-transformation-reference.ts`.
At `#/storyboard/transformation`: playback, seeking, shot navigation, authored
16:9/9:16 layouts, two themes and semantic accent override. Stories include all
seven recipe midpoints and reduced motion. No video encoding, font loading,
automatic equation/code equivalence, SVG topology inference or 3D handoff is claimed.
