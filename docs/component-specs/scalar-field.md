# ScalarFieldOverlay (V05) — supplied fields as calibrated color, contours and bands

**Scope:** Draws **supplied** scalar grids (temperature, moisture, relative pressure, concentration) on a 3D surface or a 2D plan. Kumiki never simulates heat flow or moisture, or derives a field from geometry.

## Install and inspect
- Registry items: `scalar-field` (plan, evaluator, sampler, contours, raster, `ScalarFieldSvg`, `ScalarFieldLegend`) and `scalar-field-three` (`createScalarFieldThree`).
- Storybook: **House Math → Scalar Field Overlay**, with three examples:
  - an exterior wall survey in 3D (warmer stud and plate lines, warm openings, an unscanned patch);
  - roof decking moisture over three surveys in 3D, with a 19% contour and a threshold band;
  - room air temperatures on the 2D floor plan, with 1 °C contours.

  A fixed/dynamic scale toggle shows how the two policies differ.

## Minimal usage
~~~ts
const plan = planScalarField({ id: "ir", label: "Surface temperature", unit: "°C", source: "IR survey 2026-01-12",
  surface: { origin, u, v: [0, 1, 0], size: [wallLength, wallHeight] }, domain: { mode: "fixed", range: [-2, 9] },
  keyframes: [{ frame: 0, grid }] });
const overlay = createScalarFieldThree(plan); asset.group.add(overlay.group); overlay.update(frame);
<ScalarFieldLegend plan={plan} frame={frame} />;
~~~

## Contracts
- **Inputs.** A grid (rows along the surface `v`, columns along `u`) per keyframe, all with the same dimensions and increasing frames. `unit` and `source` are required (errors otherwise). The surface is origin, `u`, `v` and size.
- **Scale policy.**
  - `fixed` keeps colors comparable across frames. Values outside it are clamped to the end colors and disclosed (`values-clipped`, with the share shown in the notes and as ▶/◀ on the legend).
  - `dynamic` rescales per frame and warns that colors are not comparable (`domain-dynamic`).
  - The default fixes the scale to the data's full range across all frames.
- **Missing is not zero.** `null` samples are hatched. Bilinear sampling never blends into missing data, and contours skip missing cells. Keyframe blending switches at the midpoint when either side is missing.
- **Contours and bands.** `contours` are levels traced with marching squares on a refined grid. `bands` print threshold meanings attributed to the source.
- **Notes.** The plan's `notes` always state the provenance ("Supplied data … Not simulated"), the scale policy, the interpolation and the missing count. The legend prints them.
- **Determinism.** Evaluation is pure per frame. The Three.js overlay writes a fixed-size data texture each update.

## Limitations
- Planar surfaces only (one overlay per wall or roof plane); curved surfaces need several overlays.
- The ramps are perceptual approximations, not color-managed calibration. Choose a ramp suited to the audience (`viridis` for color-vision safety).
