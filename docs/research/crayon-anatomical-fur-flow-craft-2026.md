# CRAYON1 / Anatomical fur flow and pigment layering — visual craft audit

Date: 2026-11-14. Scope: editable original CRAYON1 SVG and the original
naturalistic hare performance (8s, both aspect ratios).

## What the references actually show

The aim is to reproduce **principles**, not trace or import another artist's
image. Important material distinction: oil pastel, wax crayon and dry pastel
have different binder and abrasion behavior.

| Reference | Specific visible mark behavior | Prior engine deficit | Implemented art direction |
|---|---|---|---|
| [Nadezhda Kokorina, *Portrait of a Hare in Oil Pastel*](https://www.saatchiart.com/en-pr/art/Drawing-Portrait-of-a-hare-painting-animal-art-oil-pastel-rabbit-art/296362/9862769/view) | Ear ribs vary in width and terminate irregularly. Warm cheek hairs sweep in curved bundles; pale highlights are clustered, not evenly distributed. Eye has dark concentric/lateral iris structure and off-axis catchlight. | Single-hue, single-angle uniform ellipse hatch, flat iris, smooth edge. | Separate guided cheek/ear fields, multitone root-to-tip strata, radial irregular pigment in eye and asymmetrical highlights. |
| [Renu Bourne, *I See You*](https://www.renubourneart.com/) | Compact, curved fur directions wrap the orbital ridge with distinct upper/lower flow. The glossy eye is surrounded by dark value structures and fewer brilliant accents. | Fur could pass across the eyelid and was not constrained by the changing face silhouette. | Animated-parent clipping, separate forehead/temple/cheek guides, concentrated amber/dark iris pigment and a small secondary glint. |
| [Richard Hull wax-crayon drawings](https://westernexhibitions.com/exhibition/5488/) | Heavy wax deposition is layered and physically scratched back, giving rhythmically linked marks with color underneath. | The engine's generic surface scratching does not respond to hand-authored anatomy. | Purposeful nested dark/midtone/light passes and sparse connected fork marks. **True material removal is not yet implemented** and must not be claimed. |
| [Lara Scouller on hare drawing](https://www.artistsandillustrators.co.uk/how-to/animals-wildlife/quick-tips-sketch-a-hare/) | Structural proportions and shadow masses are established first; marks change direction with fur. Delicate light strands are the final, selective pass. | A cosmetic pass of roughly equal-value random hairs flattened the form. | Existing opaque anatomical planes stay first; dark root, warm fiber and sparse high-value passes follow. |
| [Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) | Wax crayon has cohesive viscous deposit, with uneven puttying and clumping. | Decorative isolated flecks confused genuine deposit with generic digital grain. | Reuse longer nib deposits, shared paper relief and silhouette-bound flow strokes; surface-height and true clumping remain future research. |

## Delivered engineering work

1. New reusable `crayonFurFlow` accepts a **cubic anatomical guide**
   (four landmark coordinates), a physically meaningful lateral spread,
   count, average contact length, curvature and bounded connected fork rate.
   Each hair samples a different point and offset on the guide; the nib
   direction follows its **changing local tangent** rather than a constant
   vector. No stateful randomness: independent seed channels and absolute
   frame geometry.
2. `CrayonContourElement.clipToParent` clips contour strokes to the actual
   **wax-parent drawing** at the evaluated held source frame. The mask sits
   in the same local anatomical coordinate frame as the moving parent.
   Strict validator rejects any non-wax/missing parent or an independently
   transformed clipped child. Character base opacity is never masked.
3. The original hare now uses 21 dedicated curved fur zones: deep roots,
   warm interleaves and sparse highlights across forehead, cheek, temple,
   muzzle, throat, shoulder and each ear. The roots start before the
   midtone, then fine light filaments appear last in the film.
4. New reusable `crayonIrisFlecks` draws seeded, elliptical radial
   striations in two pigment temperatures inside the animated amber iris
   wax parent; retained dark pupil, dual off-axis catchlights and limbal
   contour values emphasize anatomical depth.
5. Storybook gains full-resolution native-renderer macro inspections:
   **Wildlife Hare Eye Macro** and **Wildlife Hare Fur Macro**.
   `wildlifeCrop` selects composition, eye or fur and applies an
   inspection camera while retaining source-art material and timing.
6. Focused tests cover curvature, reproducibility, stroke limits,
   malformed guides, clipping when a wax parent changes drawings,
   opaque underpainting, eye pigment, and detail-density invariance in
   both 16:9 and 9:16.

## Painterly silhouettes rather than cartoon-shaped stickers

Reviewing the previous source-art roughs exposed a separate *shape-language*
problem: thick, even outlines on every small facial wax patch made a flat
vector collage, no matter how many fur strokes were added. The original
subject also had an overly oval head and a rounded projecting muzzle.

This pass adds validated `CrayonWaxElement.outlineOpacity: 0..1` that
controls *only* the dark drawing outline, **never** underpaint opacity.
The native renderer defaults to 1 for backward compatibility. On the wildlife
hare the main outer head/shoulder shape retains a legible drawn edge, while
internal warm/cool light planes become mostly edge-free. The forehead-to-nose
and jaw contour is now more tapered; the muzzle narrows toward the nose.
Textured pigment remains opaque and form-following, not translucent.

The eye is the highest-definition region: dark rim, pigment in two nested
temperatures, small pupil, uneven limbal light and unequal off-axis
catchlights. Its iris flecks are clipped to the amber shape rather than
lying over the whole skull.

## Avoid confusing texture density with artistry

*Silhouette* must read without any hatching. Shadow masses must have
correct volume before fine fur. At the 30-fps final-frame scale, the
eye should remain the highest-contrast focal point; the neck ruff
should use fewer but longer strokes than the eyebrow. Fine whiskers
may escape a silhouette, but **internal** pigmented fur must not.

`detail=0` vs `detail=1` changes hair density only; the original anatomy,
motion, iris, lighting and opacity remain fixed. This makes art-direction
reviews honest rather than comparing two different characters.

## Remaining high-priority QA and research

- Visually inspect rendered **actual** Storybook frames in wide, eye
  macro, neck macro, normal-speed 16:9 and 9:16 movie export. Passing a
  snapshot/string test is not aesthetic acceptance.
- True wax **sgraffito** should remove upper wax in selected tracks
  revealing a contrasting buried pigment layer, not just paint white
  lines over the surface.
- Build 3/4 and profile redraws of the head with measured eye, nose,
  ear and neck landmarks. Rigid SVG transforms alone cannot provide
  convincing head turns and changing occlusion.
- Consider calibrated paper relief and pressure transfer at different
  zoom levels, with relative wax pigment roughness held consistent.
- Inspect figure/ground separation, silhouette edge accents and the
  limits of unnatural 2D uniform shadow surfaces.

All reference art is used for independent craft study. No reference
image is bundled, copied, traced or used as an unlicensed texture.
