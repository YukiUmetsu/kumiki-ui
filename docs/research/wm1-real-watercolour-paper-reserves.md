# WM1 — Real unpainted-paper reserves for watercolor pressure brushes

**Status:** engine feature, not a new portrait. This is a standalone change that can be safely merged without importing the rejected WC19 experimental artwork.

## Observed gap

The WM4 wet-pigment engine already supports `reservePaths`, preserving the unpainted paper under an actual wet wash. The WM1 pressure-brush engine did **not** respect those reserves. When an artist painted a luminous iris highlight with a WM4 paper mask, subsequent WM1 iris/pupil brushstrokes painted directly over it. Simulated white "highlight" patches did not solve the physical paint problem.

## New behavior

`PaintSurfaceSpec.reservePaths?: readonly string[]` accepts original-paper SVG path descriptions (0–32 safe path strings). The `WatercolourSurface` adapter creates a single *subtractive mask* for all actual WM1 deposition, bloom, spread and dry-bristle marks, leaving the paper and paper-fiber layer untouched. It is no longer necessary to paint an opaque white shape over the pupil.

This is a genuine material behavior: paper is reserved **before** the paint touches it. WM1 and WM4 can use identical source-space reserve paths and paper dimensions, so a catchlight survives under both brush and pigment passes.

Example:

```ts
const paper = {color:"#F7F0E5",tooth:.84};
const brightCatchlight = "M416 226 Q421 221 425 226 Q426 233 419 234 Z";
const brush: PaintSurfaceSpec = {
  version:1,medium:"watercolour",width:640,height:480,seed:83,paper,
  strokes:handAuthoredEyeStrokes,
  reservePaths:[brightCatchlight],
};
const wet: WetPaperSpec = {
  version:1,width:640,height:480,seed:83,paper,
  cellSize:14,flow:.72,granulation:.81,dryFrames:170,
  drops:wetBrushDeposits,
  reservePaths:[brightCatchlight],
};
```

The snippet demonstrates coordinated configuration, not a complete valid art example: artists must supply valid WM1 strokes and WM4 drops.

## Guardrails and limits

- Values validated by `inspectPaintSurface`: finite budget, safe SVG path alphabet/starts, no script/URL/attribute injection.
- Mask applies only to actual pigment layers. It does not subtract the underlying paper color or paper tooth/fibers, and does not change frame/drying behavior.
- No reserve mask is created for legacy specs with no `reservePaths`: existing artwork retains its previous material behavior.
- Does **not** improve human facial anatomy, watercolor naturalism, iris geometry or artistically approve portrait illustrations.
- Localized paper glints need correct source-observed position and shape. A rectangular or mechanically circular reserve remains a visual failure even if the mask works.
- Standalone regression tests: `tests/watercolour-brush-reserves.test.tsx`.

## Release policy

This WM1 engine feature is technically useful for plants, landscape lights, eye glints, pottery highlights and scientific watercolor art. The **WC19 hand-authored eye study remains a separate draft PR (#303)** because its actual native Chromium screenshot still falls short of world-class watercolor facial craftsmanship.
