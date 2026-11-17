# CP-F1 × FLORA1 — Rose inner-petal overlap, off-axis whorl and centre-knot reprofile

**2026-11-17 | Experimental / ART HOLD.** This is a structural correction to the optional central rose study, not a production default or an accepted botanical likeness. The previous native 1× and 2.15× screenshots showed a central motif made of repeated pale arcs and concentric C-shaped outlines. More pencil strokes would have amplified the wrong silhouette. The task is to make the centre read as several independently overlapping petals.

## Primary morphology references and permissions

These are source photographs, not a cultivar-matched multi-view capture. Their contours are not traced or projected into the drawing.

1. **Nebula Alchemist, P1.1.2014.jpg** — 3,264 × 2,448 px, original photograph, 1 January 2014, author-uploaded CC0 1.0. https://commons.wikimedia.org/wiki/File:P1.1.2014.jpg  
   Best structural comparison for a compact double-flower centre: the central curl is off-axis; its small curled lamina sits against an irregular dark recess; the surrounding petal shoulders differ in height and direction. The full photograph includes foliage and some calyx context, but is oblique and not the same pose as this artwork.
2. **Pramila Murugan, Flower Rosse.jpg** — 960 × 1,280 px, original photograph, 20 November 2023, author-uploaded CC0 1.0. https://commons.wikimedia.org/wiki/File:Flower_Rosse.jpg  
   Useful front/three-quarter comparison: the centre reads as a small rounded lower petal plus a separate angular upper flap, with a dark occlusion wedge between them. This is a different cultivar and has no full pedicel/calyx registration view.
3. **Wozart, Rose (fleur).jpg** — 2,076 × 2,293 px, original photograph, 8 May 2026, author-uploaded CC0 1.0. https://commons.wikimedia.org/wiki/File:Rose_(fleur).jpg  
   Best whole-bloom companion: the upper flower shows a nonconcentric, off-axis central whorl, uneven outer shoulders and overlapping front laminae; the lower bloom exposes green sepal/calyx and foliage context. It is an oblique two-flower composition, not a same-pose measurement plate, and the cultivar is unidentified.
4. **Vatadoshu Phyto, Red rose close-up.jpg** — 2,160 × 1,440 px, original photograph, 18 September 2003, author-uploaded CC0 1.0. https://commons.wikimedia.org/wiki/File:Red_rose_close-up.jpg  
   Negative morphology control: an open single rose exposes stamens instead of a compact double-flower whorl. It prevents treating every red-rose centre as the same spiral motif; it is not a geometry target for this double rose.

The Commons file pages state CC0 1.0 for all four source photographs. Artist names, original dimensions and license pages are retained above. No reference pixels, masks, crops, textures, color samples, SVG paths or derivatives are committed. No source-image download is part of the runtime package.

## Native visual diagnosis

The earlier center study had six named surfaces and a separate scroll reverse, but the six shapes shared nearly the same central point and several long contour traces followed similar arcs. On the full 960×540 plate those pale arcs collapsed into a small spiral stamp. At 2.15× the centre still read as concentric rings, despite correct physical region count and opaque support.

**Root cause:** the topology was wrong before the pencil material was applied. The renderer correctly deposited too many continuous curved traces over a cluster of similar radial shapes. The solution is not stronger contrast, more noise, a blur, or additional outline density.

**FLORA1 lookup:** the current `registry/anatomy/plant-species.ts` has no `Rosa` entry. This isolated object study therefore uses generic, unidentified garden-rose morphology only; it makes no species, cultivar, regional bloom-calendar or measured botanical-size claim. A future whole-plant rose study must add a properly sourced FLORA1 record before using the species-specific plant generator.

## Reconstructed topology

| Surface | New morphological role | Geometry / material change |
|---|---|---|
| `inner-fold` | Uneven rear crown behind the whorl | Six irregular shoulder rises, unequal left/right extents and a pinched lower return. The old long top arc is replaced by two short, local contacts. |
| `rose-whorl-recess` | Deep off-axis occlusion pocket | A small asymmetric dark wedge with an uneven lower edge, not a centered oval ring. |
| `rose-whorl-left` | Narrow lifted inner wall | Tall, oblique lamina with a distinct upper tip and a lower return that turns toward the centre. |
| `rose-whorl-right` | Broader tucked shoulder | Wider right-facing petal with a different crest height and an interrupted inner fold. |
| `heart` | Foreground convex lamina | Unequal shoulders and a flattened, offset lower return. The old long crease is re-authored into two short local contacts. |
| `rose-whorl-scroll` | Foremost curled petal | A compact, off-axis convex lamina with a distinct turned reverse; no closed inner spiral. |
| `rose-center-scroll-underturn` | Physical abaxial reverse | Separate opaque sidewall shares the exact first cubic hinge with the front scroll and remains visible outside it. |

The four legacy whorl organs keep their four existing timed pencil contacts, but those contacts are re-authored as short source-local marks aligned with their new silhouettes. Four additional dry-pencil contacts are appended to each of the six central surfaces. The two old base strokes on `inner-fold` and `heart` are replaced by two shorter source-local contacts each rather than being drawn over the new petal topology.

## Implementation and safeguards

- Existing `roseInnerWhorlStudy` and `roseCenterKnotStudy` flags remain opt-in; default artwork and other subjects are unchanged.
- Six semantic region IDs and the 3-layer CP-F1 material model are retained. One separate opaque scroll underside remains the only added center region.
- The existing source-coordinate system, stable material seeds, original layer order and absolute frame clock are preserved.
- New Storybook inspection foci expose the left wall, right shoulder, foreground lamina and rear crown independently.
- Browser evidence captures the **clipped parent paper viewport** at 2.15×. A screenshot of the enlarged SVG alone is not accepted as a true macro crop.
- Unit and native browser tests cover 16:9 and 9:16, 15→16 central regions, 44→45 complete anatomy, the shared underside hinge, deterministic frame seeking, non-rose isolation and byte-identical restoration with the option OFF. Chromium also samples each new whorl dry-contact trace against its own opaque SVG support so detached, clipped-away pencil marks fail the proof.
- No new dependency, raster image, blur, foreignObject, filter, CSS overlay or generated bitmap is introduced.

## Native overlap correction after first Chromium audit

The first full native run rejected two of the five contact-shadow axes: the old left-cup axis sampled no filled overlap with the reprofiled left wall, and the old heart axis sat above the actual foreground-scroll/heart boundary. The test was correct; the shadow must follow real intersecting opaque supports, not a visually plausible guessed curve.

- The left wall now has an extended lower heel, contained by bounds `[212,135,55,57]`, crossing the recess lower edge. Its contact axis is `(251,179) → (269,180)`.
- The foreground scroll now has a convex lower-right return, contained by bounds `[226,143,40,45]`, that physically covers the heart's lower-left shoulder. Its contact axis is `(246,178) → (265,179)`.
- The same path and bounds are kept byte-identical between the four-organ whorl definition and six-surface center definition. The scroll's first cubic and the separate underturn hinge remain identical.
- Chromium emits the actual five source-pair `isPointInFill` exposure/coverage counts for both aspect ratios. The native proof must show both exposed lower-petal pigment and upper-petal coverage for every field; no assertion threshold was reduced.

This correction changes the silhouette and painterly contact, not the CP-F1 material contract or the production default. It is not yet an artistic approval.

## Acceptance gate

Passing source and browser tests proves deterministic geometry and material integration, not artistic realism. Inspect the actual full-frame 1×, all 4 directional macro crops and complete 45-region plate. Reject the result if the centre still reads as a radial fan, a screw, a button pasted on top, a set of outlined tubes, or a flat dark hole.

**ART HOLD remains:** the photographs are qualitative morphology references, not a same-pose measured registration set. The flower still lacks independently measured landmarks, validated cultivar identity, multi-view petal normals and accepted natural-motion behaviour. Keep both studies OFF by default until a separate visual review approves them.
