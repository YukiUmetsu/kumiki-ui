# WM1 pigment sediment granulation — optional real-brush treatment

**Observed problem (WC20 native browser captures):** even with pressure-controlled watercolor ribbons and physically transported WM4 pigment, broad WM1 watercolor washes still had **uniform fill density**. Their many transparent layers stacked into smooth geometric bands. Enlarged human-eye crops exhibited rounded circular flecks, not natural fine paper-bound granulation.

## Implemented and scoped

`PaintSurfaceSpec.pigmentGranulation?: number` (0..1) is an **opt-in** local treatment. When greater than zero:

1. The *actual pressure-brush deposition path* has its pigment alpha modulated by a deterministic, paper-scale, seeded fractal field. It is never a full-frame watercolor filter: it applies only to WM1 filled brush ribbons, not paper, captions, outlines or UI.
2. The original pigment `stroke.color`, pressure width, wet diffusion, absorption, drying and WM1 paper-white reserves are preserved.
3. Sediment granulation strength controls the microvariation of the pigment coat. Fine dry lines/lashes remain crisply painted rather than blurred into the wash.
4. Pigment flecks become genuinely fine (0.2–1.4px) instead of **3–4px opaque circular confetti** across painted human skin.
5. Radial circular blooms are reserved for genuinely broad, very wet washes; they are excluded from small/medium eye/pupil/eyebrow strokes so their marks do not look like sticker circles.

### Legacy safety

`pigmentGranulation` omitted or `0` preserves **all existing WM1 authored paintings** and their source behavior. WM1 still uses pure absolute-frame geometry and deterministic seed. The additional material pass is opt-in precisely because existing art may prefer strong clean-edged pen/ink watercolor.

### Validation

`tests/watercolour-brush-pigment-granulation.test.tsx` tests negative-control inputs, no changes without opt-in, fine sediment inside WM1 painting, and coexistence with paper-white masking.

**Art acceptance is separate:** this feature does not guarantee a convincing watercolor face. It must be inspected in a real 1× and 3× Chromium screenshot of the actual WC20 eye. The [watercolor synthesis reference](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) explains that drybrush, sediment granulation and edge darkening are independent physical effects, so a final frame still requires localized edge and glaze critique.
