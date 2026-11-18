# RISO81 — Interleaved printed-paper slat reveal

**Status:** implementation and browser proof in progress  
**Registry item:** \`riso-print\`  
**Source:** \`registry/video/riso-slat-reveal.ts\`, \`registry/video/riso-slat-reveal-react.tsx\`  
**Storybook:** Video production → Film Looks → Risograph → **Interleaved Paper Slat Reveal**

## Reference study

### Primary conservation reference — University of Michigan Library

Amy Crist, guest post by Shaoyi Qian, *Get Those Books Moving: Part 1* (16 December 2021):

- Article: https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-1
- Reverse-side mechanism photograph: https://blogs.lib.umich.edu/sites/default/files/blogs/readingroom/copy_of_img_0010.jpg
- Pull-strip and original slat construction: https://blogs.lib.umich.edu/sites/default/files/blogs/readingroom/copy_of_img_8757.jpg

The conservation account identifies two image sets: one printed on the page and another printed on slats attached to a pull strip. The strip and slats are laced through horizontal slits in the page. The photographs expose the actual back-side construction rather than only the finished optical effect. The article also documents worn pull strips and torn slits, so the model must keep travel bounded and avoid slat-order inversion. The article states that content is CC BY 4.0 unless otherwise noted; the reference images are studied, not bundled as production artwork.

### Museum reference — Smithsonian Institution Libraries

*Paper Engineering: Fold, Pull, Pop & Turn* (2010):

- Exhibition brochure: https://www.sil.si.edu/pdf/fppt_brochure.pdf
- Page 9 documents Dean & Son's *New Book of Dissolving Views* (1860), with a WAR/PEACE transformation.
- The brochure describes dissolving images as pictures printed on horizontal, vertical or circular sections that slide over one another.

This supports both row and column orientations. The transition is a physical interchange of printed sections, not an opacity crossfade or a generic wipe.

### Mechanism taxonomy — University of Virginia

*Pop Goes the Page: Flat Slats, Tabs, and Folded Cards*:

- https://explore.lib.virginia.edu/exhibits/show/popgoesthepage/walkthrough/flatslats

The jalousie/flat-slat description explains the two-image transformation: separately printed sheets are cut into strips and shifted relative to each other. At intermediate positions the two images become visually interleaved. The reference informs the strip order and the importance of a clean midpoint.

## Visual and mechanical deconstruction

1. **Two original print masters.** The stationary cover and moving insert remain complete independent spot-ink masters. No screenshot, raster crop or post-render RGB replacement is introduced.
2. **Source-locked slats.** Each moving strip is clipped from the full insert artwork in source-sheet coordinates. At the end stop, the strips reconstruct the original insert without changing its ink paths or plate registration.
3. **Rigid pull comb.** Every strip shares one absolute translation. Slot order therefore remains monotonic under forward playback, reverse seek and arbitrary frame sampling.
4. **Alternating depth lanes.** Adjacent strips alternate between two paper-depth lanes. A bounded edge lap can close hairline seams without coplanar overlap.
5. **Measured slot and travel contract.** Slot width is derived from stock caliper plus clearance. Travel must fully retract the slats and is capped against excessive overrun. The edge lap is bounded by both a physical millimetre limit and a fraction of local pitch.
6. **Material cues.** Each strip keeps the original Risograph paper grain and spot-ink screen. Cut-edge bevels, directional contact shadows and deterministic cellulose microfibres follow the strip's physical edge. They are not blurred screenshot effects.
7. **Two orientations.** Horizontal rows travel left/right; vertical columns travel up/down. Each strip moves along its long axis through its own parallel guide slot.

## Geometry contract

- Paper bounds: 240–8192 source units per dimension.
- Slat count: 4–24, equal source pitch, stable top-to-bottom or left-to-right order.
- Overlap: 0–0.7 mm and no more than 12% of the local pitch.
- Stock caliper: 0.08–1.2 mm.
- Slot clearance: 0.02–0.6 mm.
- Alternating lane depth must be at least stock caliper plus slot clearance; same-lane separation must remain positive after overlap and slot width.
- Retraction distance must be at least one full page span plus the edge lap, and no more than 1.12× the span.
- One global 24fps pull state drives a bounded per-slot stagger (0–45%). Each slat moves only along its own long axis; no strip crosses another strip's guide lane, and all strips reach an exact zero-offset end stop.
- Absolute FilmStage frames are integer 24fps samples; reduced motion resolves to the completed print.

## Limits

This is a deterministic 2.5D SVG paper-engineering model. It does not claim to simulate paper friction, bending stiffness, fatigue, tearing force, glue failure, or a manufacturable die-cut template. The historical images are reference material only; the Storybook scene uses original vector Risograph artwork.
