# RISO17 — source-authored finger / paper occlusion study

**ArtCraft v7 source → construction, 2026-11-15.** Target: a 24fps, stage-coordinate 16:9 / 9:16 original Risograph scene. The source identity is the existing Courier + Paper Artist, not a third-party illustrator's character. This work addresses **physical occlusion**, not a new body or face. Character portraits are unchanged and do not inherit artistic approval from this material pass.

## Observed primary visual sources

| Source, rights status | Specific visible contact / print features | Source-to-code rule |
| --- | --- | --- |
| [Studio Tampopo — *Botanical Garden* A3 Risograph print](https://studiotampopo.com/products/botanical-garden-riso-print), original product photograph, **third-party reference only; redistribution not authorized** | Two hands curl their fingers over the **upper paper corners**; knuckle/curl contours and thumb create small independent shapes; the poster covers the hands' palms and body behind it. The large white paper margin remains opaque, and blue and pink ink stop inside it. | Draw each complete actor behind an opaque letter, then allow only the four real posed digits and delicate joint engravings to overprint. Preserve the original blue/red press masters, don't overpaint a giant synthetic hand. |
| [Calverts — Risograph workshops image](https://www.calverts.coop/workshops/), original workplace photograph, **third-party reference only; redistribution not authorized** | A diagonally held white sheet is grasped at distinct edges. Bold blue and red motifs remain separate; each contact has a different palm orientation, and the paper is unambiguously in front of the supporting arms. | Support hand-to-hand sloping paper with independent actor anatomy, nonuniform grip placement and final depth ordering. Paper must occlude the forearms behind it. |
| [MICA — Risograph image making and printing](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/), university technical guide | Master artwork is tonal grayscale; ink layer determines the color; registration discrepancies are normal, especially at intersecting shapes. | No RGB-image overlay, transparent skin or duplicate unified color layer; reprint the selected fingers **per registered spot plate**. |
| [University of Utah Marriott Library Risograph guide](https://lib.utah.edu/collections/book-arts/risograph.php), university technical guide | Real feed and paper registration variability; heavy full-flood inks are difficult and screened fills are often preferable. | Keep existing deterministic RisoPrint paper and sparse screen marks, not a heavy digital filter across the actor. |

**Evidence limitations.** Product and workshop photographs are small in-browser references, not rights-cleared image files with semantic contour masks. They support the visible pose/occlusion rules above, **not** pixel-accurate reproduction, anatomical measurements or visual approval. No third-party art/image is embedded in the library. The installed ArtCraft v7 PDF-like source-to-output contracts were read from the user's actual v7 ZIP; v7 stage-gate scores must not be claimed without render crops and exact hashes.

## Topology / material analysis

1. **Outer topology.** Fully evaluated, joint-posed body with 7 selected contact parts per hand: `glove-index`, `glove-middle`, `glove-ring`, `glove-thumb`, `finger-joint-lines`, `glove-detail`, `glove-thumb-fold`. These are existing SVG contours, not circle/ellipse masks. Their scene coordinates come from the same actor IK and film frame as the main figure.
2. **Flow.** Original moving finger joints keep their parent palm orientation, each with separate joint-local rotation. Paper remains the RISO16 unified longitudinal surface; its edges follow evaluated right-hand and left-hand world contacts even as poses change.
3. **Pressure/edge.** Opaque paper knockout is **subset geometry of the actual fingers**, spread by 1.25 stage units for print trapping. Red glove solids and blue knuckle/cloth contours print afterward with original source-specified thickness. No new skin opacity or global white circle.
4. **Rhythm.** Left/right contacts are asymmetric: Courier right hand engages when paper grows from zero; Paper Artist left hand overlays only once advancing paper reaches at least 94% of its chord. Four independent digits and three irregular internal marks preserve nonuniform line density.
5. **Microtexture/depth.** Stage order must be **Courier fully opaque → Paper Artist fully opaque → printed white sheet + independent colored masters → Courier fingertips → Paper Artist fingertips**. Independent RisoPrint paper tooth, separate spot masters and bounded misregistration remain untouched. Neither the palm nor sleeve is redundantly repainted over the letter.

## Implementation / regression graph

| Region | Source / parent | Production artifact | Rejection test |
| --- | --- | --- | --- |
| Left/right gripping digits | Existing author-defined `RisoCharacterSpec.parts` and `RisoJoint` subtrees | `RisoCharacterInk({onlyPartIds})`, `RisoCharacterKnockout({onlyPartIds})` | Incorrect full-character mask or anonymous ellipse |
| Ink engraving | Source `finger-joint-lines`, `glove-detail`, `glove-thumb-fold` | Separate blue spot pass over selected red glove solids | Loss of either plate or unintended coat paint in front |
| Actor-paper depth | Existing native `RisoForegroundLayer` contract | Order of five ordered layers (or four before receiver arrives) | Paper behind coat/palm, transparent skin or recipient clipping before contact |
| Exposure / contact cues | Film frame + absolute progress and original paper outline | Contact appears only when an actual sheet is present | Fingers hovering on a nonexistent sheet; frame-history-dependent rendering |
| Artist review | Photo and full rendered scene, both ratios / contact frames | Needs a future aligned screenshot contact sheet and independent 1×/3× critique | Code tests claimed to establish professional drawing quality |

**Controls:** Existing Risograph Storybook location gains a native `Anatomical fingertip occlusion` checkbox to compare geometric overprint with the intentionally incorrect all-paper-front negative control. No new Storybook folder; original print-sheet, registration, fold, film frame and aspect controls remain. The part selection validator rejects empty, duplicate, unknown and excessive ID sets; the full default render is unchanged.

**Still open:** True geometric contact/squeeze simulation and paper deformation in finger gaps; source-driven 3/4 and profile portraits (subject to ArtCraft v7 strict face-gate); reference-relative face/finger mesh masks; physically measured dot gain; full narrative movie with normal-speed manual review.
