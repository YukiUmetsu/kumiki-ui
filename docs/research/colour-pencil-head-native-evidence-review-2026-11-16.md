# ArtCraft CP-F1 — verify real source/native head evidence before the first eye

**November 16, 2026 · new Human #01, Stage 1 head-only.**
**ART QUALITY: REJECTED / HOLD** — this is a measurement-review improvement,
not an approved character and not an excuse to add facial details.

## What actual browser art shows

The current native CP-F1 head, inspected via the merged [#485 Storybook
artifacts](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43864510402),
still reads as a *lightly scratched, vertically stretched bald silhouette*
in a 2.15× crop. Above/below the crop is outside the visible canvas; do not
judge the head from a magnification screenshot alone. The five drawn ANAT1
light categories and strokes do not establish photographic likeness.
Do not densify uniform hatch, blur the paper or insert hair/eyes to hide a
wrong cranium. Confirm source contour, actual native value planes and photo
perspective **first**.

## Rights-verified photographic candidate independently inspected

- **Candidate**: [Wikimedia Commons, *Pavel Richter (2025).jpg*](https://commons.wikimedia.org/wiki/File:Pavel_Richter_(2025).jpg).
  Source page credits **Schreibvieh**, lists the image as self-photographed
  April 2, 2025, and gives **CC0 1.0**. Original is
  **3022×3515 JPEG**, not the 960-pixel Commons preview. Original bytes
  and raw SHA-256 have **not** been downloaded into the repository.
- **Observed cranial topology**: the photographed upper skull remains
  unobscured and smoothly convex; the left-side-of-image ear/temple is
  visible, the opposite side narrows across the brow and cheek, and the
  chin connects into a visibly asymmetric lower jaw. This is genuine
  original photographic form, not a geometry generated from ANAT1.
- **Candidate weaknesses**: facial yaw is limited and camera pitch/
  smiling pose complicates an independent stable 3/4 geometry comparison;
  glasses overlap the eyebrow/temporal transition, and far-ear visibility
  is weak. The softly lit face may not offer a distinct **reflected-light**
  region separate from the light and halftone. Treat this as a **source
  candidate for close inspection**, not an 18+5-approved reference and
  never as a pixel source embedded into library artwork.
- **No license extrapolation**: source metadata and original photographic
  pixels have to be inspected together. A Commons page stating CC0
  does not prove that this angle/pitch fits the requested blank head.
  Attribution is kept in the research record. The source photo was not
  copied, traced, transformed or distributed in a character asset.

### Five ArtCraft axes

| Axis | Source observation | What the next head pass must reconstruct |
| --- | --- | --- |
| Connected form | Crown flows into frontal/temporal arches; cheek changes toward asymmetric jaw. | A coherent 3D cranium and facial mask, not screen ellipse spots. |
| Vector flow | Cranial arcs align with bony dome; cheek pigments should follow changing surface tangents. | Plane-conditioned pencil pressure and frequency, including true tooth. |
| Edge hierarchy | Scalp silhouette is firm where dark against background; cheek plane edges are soft, ear silhouette more complex. | Continuous outer perimeter, nonuniform local sharpness; no stamp-shaped cheek marks. |
| Light depth | Real photo has warm hue changes and several broad, softly diffused skin planes. | Separate original-native highlight, light, halftone, shadow core, reflected light if visibly present. |
| Temporal continuity | Stage-1 350-frame reveal constructs contour before pigment, without facial features. | Check f0/52/106/168/254/335, 16:9 and 9:16, native 1× and inspected macro. |

Technique-only sources: [Elena Pancorbo portraits](https://www.elenapancorbo.com/)
for connected planes, [Janie Gildow's pencil pressure guide](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf)
for layered pressure/dry tooth, and [Caran d'Ache pigment layering](https://www.carandache.com/gb/en/blending-colours-with-coloured-pencils)
for multi-hue deposition. No copied artist shape, pigment pixels or textures.

## Exact original image / original-native measurement workflow

1. Acquire an approved, uncropped, rights-reviewed **full 3/4 head JPEG**
   with honest capture resolution, visible forehead, both temporal sides,
   zygions, mandibular curves and chin. If the candidate above does not
   expose all 18 points and five distinct values, reject it and choose
   another original. Never fill missing source points with ANAT1 guesses.
2. Export **actual 1×** native CP-F1 Human #01 at the final 960×540 or
   540×960 film aspect, **without inspection overlays**.
3. In the one existing Storybook **Colour-pencil → Source/native head
   contour + five-tone annotation**, load both original local files.
   Place the 18+18 bony head points, then draw five nonoverlapping real
   original/native tonal rectangles. Inspect at Fit/2×/4×/8× and nudge
   at original-pixel precision; independently review every mark.
4. Save a SHA-256-bound private checkpoint; export **annotations-only**
   JSON. This does not encode images or fictional luminance.
5. Run the real Chromium image decoder + SHA256 + ROI average capture:

   ```bash
   node scripts/pencil-head-native-proof-capture.mjs \
     --source /originals/verified-head.jpg \
     --render /renders/actual-native-head.png \
     --annotations /reviews/independent-points-and-tones.json \
     > /reviews/measured-head-evidence.json
   ```

6. **New:** import `measured-head-evidence.json` into the same atlas.
   The browser checks the imported source and native image dimensions,
   SHA-256 digests, source credit/license/URL, exact current 18-point
   coordinates and all ten original ROI rectangles against its *actual
   currently loaded local images*. Swapped files, stale annotations,
   made-up extra properties and malformed sRGB fail closed. It then
   presents genuine native RGB numbers, normalized geometric RMS,
   mean five-tone luma difference and explicit error codes from
   `evaluatePencilHeadFidelity`.
7. A `measurement-ready` result **does not approve artwork**. Review
   side-by-side full head plus 3× crops and normal-speed draw, then
   correct original authored Stage-1 skull curves until the artists
   accept the actual material. **Only afterward** proceed to an eye.

### Untrusted proof JSON caveat

A user can always manually fabricate RGB or JSON values matching actual
hashes. This module is a strict *consistency validator*, **not a signed
measurement recorder**. Source/color evidence still needs the actual
native screenshot, exact-byte CLI output, independently observed marks
and an artist who has seen both. The UI never saves a proof as confirmed
approval or uploads real photo pixels to the library.

## Focused regression requirements

- New pure negative tests: reject swapped/stale SHA256, dimensions,
  annotations, out-of-date original-native ROIs, malformed/injected
  source metadata and RGB; never return `artistApproved: true`.
- Existing native Storybook E2E: upload test-only solid PNG files,
  independently place points/rectangles, import synthetic CLI-shaped
  measurements, confirm **SOURCE_RENDER_SAME_HASH** and collapsed
  source/render value range stay blocked, and confirm a 1px correction
  invalidates the previous measurement immediately.
- Scoped CP-F1 CI typecheck/unit/Chromium continues to test the original
  photo-to-pencil animation, Storybook single folder and original
  16:9/9:16 film contracts. Passing code tests does not establish visual
  realism or source integrity.
