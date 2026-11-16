# ArtCraft F1 — measured eye and midface; wax geometry reconstruction, native negative controls

**2026-11-15. Status:** experimental, **not artist approved**. Continue [draft PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281); stay `!dev`. The native CRAYON1 scene is *hand-authored pigment*, not an image filter, photo recolor, tracing artifact or reusable approved portrait.

## Grounded reference and rights

- Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photographed 21 Oct 2015, released before the Unsplash license change, Wikimedia Commons confirms CC0 1.0.
- **Verified source photograph in the exact comparison camera:** `608×1082` RGB screenshot from [GitHub Actions 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), stored with full SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. It is a **browser crop**, not the original full-size JPEG. Never compare with a differently cropped/rescaled image and call it identity fidelity.
- Medium evidence: [Philadelphia Museum of Art (2014), wax-crayon clumping](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), page 44; [Rudolf et al., *Bidirectional Deposition Model of Wax Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x). Source photos and external work inform craft only; no third-party pixels are embedded in the SVG draw.

## Source photography: independent original-pixel study

Coordinates below use the actual SHA-locked image pixels, not generic anatomy. Inspected both whole face and 3× source crops **before the second geometry pass**. Pixel boundaries are approximate annotations; semantics, not rectangle-fitted segmentation, control the source part graph.

| Part | Observed x/y, 608×1082 | High-impact failed legacy output | Source-authored revision |
| --- | --- | --- | --- |
| Near exposed eye | canthi (216,557) and (316,544); upper lid peaks ~ (267,533); pupil near x253–266/y542–558 | uniformly bright almond/sclera, large outlined pupil, evenly spaced upright lash ticks | asymmetric sclera, slightly broader brown iris with smaller dark pupil, 16 nonuniform short rooted curved CRAYON1 fibres, two interior pigmented sidewall deposits |
| Far eye | x405–469/y501–534; hair occludes right x462 onward | pale eye with separate circular iris | widened dark under-occluded iris, narrow visible sclera, non-mirrored lid and eight rooted fibers |
| Near nostril & wing | dark concave undercut about x387–419/y621–648, physically linked to the soft alar bulb | two perfectly separated free-floating dark spots on a flat nasal face | dark bent recessed air-space, pressure/glaze wing in the same source space, adjacent tip bridge / cartilage, correct draw order |
| Far nostril | x447–461/y616–639, narrow oblique contour | isolated upright ellipse | tighter parent-connected undercut, nearly foreshortened, with its own local alar shading |
| Upper lip & teeth | oblique x351–487/y695–747, teeth x390–458/y713–739 partly shadowed | thin straight purple slit, three disconnected rectangular white/gray teeth | multistation asymmetric Cupid bow, wax upper lip, continuous buried dental arch + three **irregular** low-value enamel contacts clipped by mouth aperture |
| Lower lip | plump soft turn x355–488/y743–775 | faded straight color band with almost no lip-body volume | separate pressure-graded lower red-brown vermilion, curved reflected wax flecks and soft overlapping core |

### Five ArtCraft axes

1. **Topology:** all source-visible eyes/lids/iris nested to original face parents; brow/lash contact lives on lid rim and stays under hair. Nostrils rest *in* the alar root; dental wax attaches to `mouth-aperture-depth`, then individual occluded tooth contacts. The old "two nostril islands" and disconnected "white teeth" remain visible as the **negative controls**, not approved structures.
2. **Vector flow:** unequal short lash fibres bend with the upper-lid tangent; asymmetrical nose wing and lower lip follow curved volume from near cheek to far hair. A long straight lip wedge or evenly spaced cartoon lashes is a failure.
3. **Edge character:** opaque solid anatomical masses, open pressure wax around muscle planes; blurs apply to the **mask of the contact pigment** without smoothing individual wax grains. No global gaussian photo blur or translucency-through-skin.
4. **Pressure/width rhythm:** named near/far pressure values and 16/8 intentionally irregular rooted groups; no uniform eyelashes, circular irises, identical nostril sizes, or disconnected tooth stamps. Hard pupil/nostril wax still catches paper grain and burnishes on top of opaque mass.
5. **Microtexture:** all patches use native `stroke-built` pigmented CRAYON1 wax and paper-height tooth. At final resolution the texture must look like deposited binder, not random pencil-screen scratches or sprayed blur.

## Code + tests and framing

- Native source modules: `src/video/crayon-artcraft-f1-ocular-geometry.ts` and `src/video/crayon-artcraft-f1-midface-geometry.ts`; the original assets and semantic IDs remain.
- Two **independent** options on `crayonCc0FaceStudy()`: `eyeContact: "baseline" | "source-shade"` and `midfaceForm: "baseline" | "source-volume"`. All four combinations preserve exactly the same 608×1082 camera, 300-frame timeline, seed 441501, face/hair/neck originals. The **baseline/baseline** combination is the previous untouched face; no newly authored artistic data is copied into it.
- Storybook: existing **Crayon / ArtCraft Adult Face Lab** with eye and nose/lip source/baseline dropdowns, full/near/far/nose/mouth/jaw zooms, photograph comparison and time scrubbing. No new Storybook folders.
- Focused Vitest: exact untouched-element equality outside named source changes; connected root graph, draw order, source bounds, distinct original vs candidate, parser, pressure bounds, paint-mask count, invalid option rejection and reduced detail.
- Playwright: exact 608×1082 CRAYON1 F1 full-face; 2.95× and 3× eye macros, nose/lip 2.65×; new A/B source-eye and midface PNG pairs at frame 299. Includes DOM paint tests, bounded masks and negative controls. Browser screenshots are visual evidence, *not* aesthetic signoff.

## Mandatory independent release gate (not waived by CI)

The before/after A/B comparison is **not** a promise of better likeness. Inspect **real GitHub Actions PNGs** against the exact SHA-locked source and baseline at 1× and 3×. Evaluate source-aligned (a) canthus/iris root contours, (b) nostril/jaw mass boundaries, (c) lip-arch/teeth articulation, (d) pressure/stroke clumps and paper-tooth realism, and (e) hair/neck attachment. Quantitative SSIM, Canny edge mismatch, RGB histogram correlation and fine-frequency energy should be logged by identical region; photo-to-wax metrics measure differences but cannot certify artistic superiority. Use an independent human visual review.

**Previous eye-only V7 proof:** exact-head Chromium, types, unit tests and CRAYON1 grammar passed. Full-face eye-only screenshot was still graphically flat. Near-eye source crop SSIM **0.4753 → 0.4746**, edge mismatch ratio **1.707 → 1.659**; far-eye SSIM **0.3993 → 0.4218**, edge mismatch ratio **1.637 → 1.620**. Metrics do not justify promotion: near SSIM even declined slightly. Full 608×1082 photo identity and authentic crayon texture still **FAIL**.

**Next:** complete midface native proof and compare; iterate high-impact jaw/neck and real wax clump density, then validate extreme frames/full-speed film and non-portrait scenes. **Keep PR draft, no merge** without actual-pixel and motion approval.
