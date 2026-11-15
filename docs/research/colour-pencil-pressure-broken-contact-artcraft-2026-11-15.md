# ArtCraft v11 · pressure-broken coloured-pencil contact on continuous facial fibres

Date: 2026-11-15. **Experimental, not artist-approved**.

## Reference-first observations and deconstruction

**Anatomy/value benchmark:** [Christopher Campbell, *Brunette woman portrait*, CC0 / Wikimedia](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), already displayed beside the independently drawn real-browser 540×600 plate inside the existing Colour Pencil Reference Atelier. No reference raster is underpainted into the plate. Its face silhouette, eye/lip details, hair masses, 25 feature guides and photo-verified light/shadow reserve are retained.

**Technique-only references, never imported or traced:**
- [Elena Pancorbo original portraits](https://www.elenapancorbo.com/) — densely layered smooth cheek volumes coexist with restrained sharp eyelash, lip and hair fibres. The most important discontinuity is *material contact*, not merely additional random noise; broad skin passages must not look like equal-pressure vector scratches.
- [Ann Kullberg's first-party coloured-pencil FAQ](https://annkullberg.com/pages/faq) — light-pressure sharp-point circular/elliptical scumbling, slightly overlapping as a means to build subtle gradations; heavy burnishing hides the paper tooth, which is **not** appropriate for the present dry pencil study.
- [Janie Gildow, *How to Color with Colored Pencils*, Arizona-Sonora Desert Museum](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf) — stroke width, point condition, grip/pressure and dry paper relief govern whether pigment enters valleys or skims raised tooth. Reference studied for process only; no imagery copied.

**Actual preceding quality failure:** PRs #369 and #377 restored luminous skin and dark cheek/jaw contact, but the 1×/3× proof remained conspicuously *uniform diagonal scratches*, because `paintMarkRange` drew every generated quadratic stroke as a completely smooth, constant-alpha, constant-width vector line. True dry pencil varies deposition **along each individual stroke** rather than merely between separate strokes. This is independent of anatomic shape/colour fidelity.

## Exact implementation rules

New pure `buildColoredPencilDryContact(mark,tooth,seed)` derives **one softened, full-curve initial pigment deposit and 2–4 shorter, pressure-modulated original-quadratic subcurves**. An exact quadratic subcurve preserves its parent tangent and curvature; no faceted straight chord substitutes for the artist's direction. Length- and seeded-position-dependent raised-tooth pigment interruptions prevent an even ruled screen. Each short contact retains the **original sampled pigment color, pass and paper-space coordinates**. Underpaint/blur/raster masks and random frame-clock jitter are prohibited.

- Tooth 0 returns the exact original stroke object unchanged; 1 exposes maximum dry-contact breaks; all intermediate settings blend the build. A stable per-stroke hash uses the actual geometrical coordinates, not the current index, so changing drawing phase, page aspect, playback order or motion does not scramble fibre pattern.
- Selectively applied to `face-value`, `face-chroma`, `face-form` and `face-scumble`. Eyelid lashes, mouth vermilion, source-traced feature details, fine hair, dark hair contact and garden background all retain their prior specialized marks. This is a renderer-level refinement, not a smoothing/simplifying reconstruction.
- The existing Reference Atelier Storybook section adds one **Dry pencil contact 0–100%** slider and native side-by-side source comparisons for both landscape/portrait. Both the full-size dry plate and all four sequential paper-only storyboard stages use the **same** physical dry-contact function. Main photo/video exports remain unchanged until artistic approval.
- Unit tests guard source stroke immutability, exact Bézier subsegments (point start/end/midpoint), valid pressure/tooth ranges, seed and phase determinism, fine-feature exclusions and bounded mark budget. Focused Chromium proof captures 0% legacy and 100% dry-contact images with original CC0 source in 16:9 and 9:16; tests verify no source-pixel underpaint or unintended change to the film export.

## Acceptance criteria and remaining work

**Technical:** source registered photometric negative gates must still pass on the new final image (not just on the legacy 0% screenshot), along with four-stage chronology, browser alpha/geometry checks, type safety and focused material tests. Inspect the resulting actual screenshots at 1× and 3× to look for darkened sandpaper speckling, too-obvious contacts or lost luminosity.

**Artistic:** still **NOT** production-character approval. The portrait retains known jaw/alignment and human feature problems; independent 18-landmark actual-source-vs-output measurement and a senior artist's 1×/3× material critique remain necessary. More dry marks must not be mistaken for a correction of wrong facial geometry.
