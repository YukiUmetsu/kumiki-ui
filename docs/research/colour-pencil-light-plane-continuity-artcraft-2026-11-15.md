# ArtCraft · CP-F1 optical light-plane pencil continuity

Date: 2026-11-15  
Status: **experimental / human artistic approval withheld**  
Scope: existing `Video Production / Film Looks / Colour-pencil` Storybook and source-conditioned CC0 research renderer only.

## Source and material observation (before geometry)

**Licensed source for anatomical form and photo-derived pigment:** [Christopher Campbell, *Brunette woman portrait* (2015, CC0)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The original 25 registered landmarks, anatomical cutouts, and a deterministic head-crop geometry remain authoritative. No artist-owned finished drawing is traced, sampled, bundled, or reproduced.

**Technique-only coloured-pencil references (not artistic assets):**

1. [Janie Gildow, *How to Color with Colored Pencils*](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): quiet overlapping loops and several low/medium-pressure layers create continuous optical colour without erasing every paper fibre; a sharpened point accesses the valleys of paper tooth.
2. [Claudia Nice / Crayola, *Colored Pencils Tips & Techniques*](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): additive coloured-pencil layers, controlled pressure and retained edges; full burnishing is a separate, sometimes inappropriate final action.
3. [Elena Pancorbo, original portrait gallery](https://www.elenapancorbo.com/): use **only** to study location and hierarchy of sharp orbital/eyelash accents versus subtly modulated cheek and nose planes. No painting shape, bitmap or pigment is copied.

**Actual release-relevant prior defects** are recorded in [soft skin fibre research](colour-pencil-soft-skin-fibre-artcraft-2026-11-15.md) and [needlepoint skin audit](colour-pencil-needlepoint-skin-artcraft-2026-11-15.md). The original CC0 facial light areas are warmer/darker than unpainted paper; earlier dry result exposed a white malar tile and exaggerated high-frequency dry grain. Earlier improvements also could not pass a realistic-art judgment.

## ArtCraft five-axis deconstruction

| Axis | Required visual/physical topology | Current construction and rejection condition |
| --- | --- | --- |
| **Continuity** | A cheek fibre stays inside the photographed face; its **entire curved contact** must not overrun a brow, iris socket, lip seam, nostril or true paper reserve. | Sample each quadratic at 20/40/60/80%, not only start/end; reject the whole nib if it crosses facial polygon, anatomical exclusion zone or photographic high-contrast edge. |
| **Directional flow** | Fine fibres curve from cheek across nose to mandibular plane, rotating gradually rather than forming uniform screen-wide diagonals. | Retain the existing continuous cheek→jaw tangent and complementary interleaved crossing pass, with independently varied curvature. |
| **Weight** | Mid-light skin has touching quiet pigment; photographed actual highlights and eye glints stay unpigmented; hair roots and pupil stay sharply dark. | Source luminance supports a narrowly bounded additional pressure/fibre probability in the .67–.918 range; never fill >= .918 genuine paper highlights. |
| **Rhythm** | Several small unequal, overlapping scumbles should feel dry and layered rather than rendered as evenly repeating rows. | Seeded two-pass staggered jitter; each pigment arc varies in length, angle, bend, alpha and width; no raster wash or Gaussian blur. |
| **Texture** | Paper tooth is still readable after layering, but lit malar/nasal planes must not appear as a separate white polygon. | Small extra source-conditioned fibres only in observed light-colour range. Preserve independent needlepoint/paper-tooth passes and source-colour samples. |

## Implementation / where to look

- `src/video/colored-pencil-skin-weave.ts`: source-conditioned light-plane support, whole-curve contact rejection and inspectable counts `opticalLightFibres` / `protectedSpans`.
- `src/video/colored-pencil-full-head.ts`: propagates both counts without changing the cap, original source, colour regions, eye marks or normal film output.
- `src/video/colored-pencil-reference-atelier.tsx`: **existing** Storybook atelier exposes counts as DOM inspection attributes and alongside existing 0–100% optical-weave controls.
- `tests/colored-pencil-skin-weave.test.ts`: shape/colour/seed/paper reserve and full-quadratic topology negative tests; 0% remains a blank optional layer.
- `tests/e2e-storybook/colored-pencil-live-references.spec.ts`: native Chromium 16:9 and 9:16 real-photo proof includes 0%/100% light-fibre and crossing counters and existing source/dry screenshots.

**No flattening, smoothing, new Storybook folder, imported third-party painted pixels, photographic underpaint, or model-generated portrait replacement.** This is one regional material refinement to a source-measured but artistically unapproved face. Existing production CP-F1 composition, video export, hair/iris/lip contours and deterministic animation time are intentionally unchanged.

## Release conditions (must pass, not assumed)

1. Final-head TypeScript/type safety and focused pure tests; browser-native full-head proof in 16:9 and 9:16 at 0% and 100% from real rights-verified CC0 pixels, plus 1×/3× captures and output exports at multiple motion frames.
2. Quantify the actual light-plane residual vs the matched CC0 photo at fixed (114/285, 148/318) and (176/285, 142/318), plus skin highpass grain and protected eye/lip contrast. **Do not infer improvement from larger stroke counts.** Compare to the pre-change actual browser screenshot, not only theoretical expectations.
3. Run full ArtCraft source-aligned 18-landmark/5-tone and v9.1 anatomical gate with source hash and matched output; retain all failed scores. Human visual review must approve form, edge craft, surface quality and motion independently.
4. Re-check ordinary photo-to-pencil 16:9/9:16 export and absolute seek invariance; don't merge as high-fidelity portrait if the human likeness/material remains below reference.

**Current approval: NOT GRANTED.** This change establishes contact topology and instrumentation; screenshot artifact availability, live pixel critique and final independent visual judgment remain separate gates.
