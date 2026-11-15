# ArtCraft v14 — Source-registered colored-pencil optical skin weaving

2026-11-15. Status: **EXPERIMENTAL / HUMAN LIKENESS NOT APPROVED**.

## Reference deconstruction before code

Licensed geometric/tonal source remains Christopher Campbell's [*Brunette woman portrait (Unsplash)*, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), projected with the same 25 explicitly measured feature landmarks. Reinspect earlier Chromium 285×318 colored-pencil complete head against source at 1× and 4–7×: the source cheeks and forehead have continuous subtle warm-cool optical form while prior code leaves a fairly regular coarse grain and empty paper between isolated diagonal marks; the near/far eyelid edges, pupil and lip seam **must not become softer** merely to blend skin.

Independent *craft technique, not artwork geometry*:
- [Janie Gildow, *How to Color with Colored Pencils*](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): build broad smooth tonal areas with **overlapping elongated loops**, growing several light-to-medium pressure layers before any optional burnish. A sharp point reaches paper tooth; a blunt tip makes it visible. Portrait skin needs varying nib width and local partial coverage.
- [Claudia Nice, Crayola *Colored Pencils Tips & Techniques*](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): light/medium optical layers remain drawable; hard wax saturation destroys visible paper tooth and makes subsequent fine detail impossible.
- [Ioanna Ladopoulou, portrait skin process](https://ioannaladopoulou.design/tutorial-drawing-skin-tones-with-colored-pencils/): observe lightly blended skin values while sculpting the detailed eye before concluding cheek and nose planes. No photo or copyrighted drawing from artists is traced/imported.

## Verified topology and mark families

New `createPencilSkinOpticalWeave` is **pure** and source-conditioned; two separately shifted (not row-ruled) jittered grids place short **quadratic, elongated scumbling loops** on the licensed face polygon, under iris/eyelid/nose/lip/hair sharpened strokes. Colour comes from a weighted source-neighbourhood optical sample. Pigment density and alpha follow source value (not an invented flat peach gradient), with intersecting warm and cool passes and finite, non-uniform width and curvature. Polygon containment is checked at BOTH nib ends. Cutout/reconstructed hair and the green garden are not inside the face polygon; no brush strokes may cross.

Negative gates: photographic near-paper bright glints Y > .918, source-observed sharp boundaries (contrast gradient > .085), near/far orbital regions (within .28 inter-eye span), parted lips (.24) and nostril detail (.14). They retain current high-frequency image anatomy; the new blender may not solve poor eye or lip shape by covering it with smooth wax.

No source raster, image, global CSS filter, gradient polygon fill, Gaussian blur, or even 1×1 bitmap texture. The "skin weave" is a standalone vector nib material zone `face-optical-weave` and may be set to **0% for exact v13 output**; set 100% only after comparing actual Chromium output against CC0 in landscape and portrait. Existing `skin coverage`, `dry-contact`, `fibre flow`, iris, eyelid and 4-shot controls remain in ONE Storybook Color Pencil Reference Atelier folder.

## Gates

Unit: a paper-white source must produce ZERO new artificial skin; corrupt pixels, bad landmarks, bad polygon/strength fail closed; source pixels are byte-identical; exact deterministic seed; every authored stroke remains within the legal photographed face and has finite width, pigment, alpha, curve; highlight and anatomical gates produce nonzero counts. Stage 1–4 maintain chronological material progression. Native Chromium: same actual CC0 source 0%/100% side-by-side, dark pupils/occlusion intact, exact normal video export unchanged, 16:9 and 9:16, dedicated screenshot artifact. Fine texture still needs independent **artist** acceptance; CI is necessary but not sufficient.
