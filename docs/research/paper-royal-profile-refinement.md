# ArtCraft PAPER-R3 — Royal character proportion and face reconstruction

**Working branch:** `art/paper-royal-anatomy-r3-20261115`  
**Status:** structural, source-led prototype; artistic approval pending independent source/render portrait gate.

## Why R2 failed

The actual R2 native FilmStage 16:9 render at act 3, frame 610, showed a pronounced vertical neck cylinder. The prince's visible neck extended from roughly the underside of the jaw to the lapel for almost a whole head-height; the princess's chin floated above the scalloped collar. Both had oversized cheek "stickers" and simplified childlike skull-to-torso scale. Source file: `src/video/paper-royal-story.ts`. No CSS filter or texture changes will solve these contour problems.

## Reference-led anatomy

These **rights-cleared geometric references** are for observing facial anatomy, not for copying a recognizable person's appearance.

1. [Public-domain 1900 right-profile female photograph, Library of Congress / Commons](https://commons.wikimedia.org/wiki/File:Young_woman,_facing_right,_head-and-shoulders_profile_portrait_LCCN2004676318.jpg), photographer attributed in Commons to Frances Benjamin Johnston collection. Visual observations: forehead eases into orbital recession, nose tip forms a rounded projection, upper lip sits below the alar base, chin returns beneath the cheek and joins a sloping neck. A small neck-to-chin gap is appropriate; the R2 cylindrical vertical exposed strip is not. Public domain status confirmed on Commons; the photograph itself is **not committed**.
2. [Library of Congress, c. 1899–1900 head-and-shoulders male portrait](https://www.loc.gov/pictures/item/99472193/) — side/three-quarter profile provides temple, brow, nose-lip and coat-collar connection. Photographic study, not traced as an actor or used to depict the model. Reuse rights must be confirmed before redistributing images; no image bytes copied to repo.
3. [Lotte Reiniger's account of cut-paper puppet construction (1936)](https://www.bfi.org.uk/sight-and-sound/features/scissors-make-films-lotte-reiniger-creating-her-magical-animations/) — each limb is a separately hinged silhouette, and natural gesture rather than elastic stretching makes movement intelligible. Our geometry changes preserve named PAPER-D2 `parentId` head/joint relations.
4. [Lotte Reiniger silhouette figures and costume composition](https://animationresources.org/filmography-reinigers-prince-achmed-the-first-animated-feature/) — source for solid-profile readability and intricate paper ornament, not character likeness.

**Rights/measurement limitation:** we inspected the sources at available web-preview scale; local source-image download and unchanged SHA-256 evidence are unavailable in this editing environment. Exact 18-landmark source→candidate photo comparison and tonal/portrait-fidelity scores **cannot truthfully be claimed**. Do **not** declare this a passed ArtCraft v7 portrait gate or world-class portrait yet.

## Structural reconstruction

| Part | R2 visible issue | R3 construction | Acceptance proxy |
| --- | --- | --- | --- |
| Adult cranial scale | Skull/hair/crown take too much vertical space | One `pen.sub()` mapping for each actor head (scale 0.84 around local cranial root y=−185) | Head/neck/gown or coat remain in a single figure silhouette |
| Neck and collar | Neck appears 0.8–1.0 head-height in visible frame | Head and facial sheets translated down +20 princess / +23 prince, neck contours shortened and tucked behind shoulder clothing | Exposed vertical gap smaller than half the head; no open seam across frame motion |
| Profile forehead/nose | Triangular noses and pointy sticker faces | Sculpt continuous forehead → nasal bridge → softened nasal tip → philtrum → lip → tapered chin, all within same closed skin sheet | Anatomical profile reads at native shot scale |
| Cheek | High-chroma unshaped white patch | Narrow low-contrast orbital and malar paper cuts tracing the jaw surface; remove giant floating cheek panel | No independent rectangular or round decal |
| Eyes/mouth/crown | Separate details drift when root moves | Every head, eyebrow/eyelid, mouth, hair and crown shares one sub-pen world mapping and `parentId` head hinge | Stable joint attachment under frame seeks, both aspects |

Character system is **original 2.5D papercut illustration**, not photorealistic portrait painting or frame-wise lip sync. A profile photo can inform proportions, but a human actor must remain an original non-identifying fairy-tale character.

## Review and release rule

1. Run focused PAPER1 / royal story Vitest and strict typecheck on the exact PR head.
2. Capture native FilmStage frame 610 and frame 370 in landscape and portrait; inspect both full compositions and 3× crops of the prince and princess at neck, eye, nose and mouth.
3. Check neutral and act-2/act-3 moving frames and the paper-curtain cut; reject detached head/neck pieces or clothing overlaps.
4. For a **portrait-quality** release, obtain a rights-cleared image, save its unmodified bytes and SHA, annotate 18 visible landmarks and tonal crops for source/candidate, run `portrait_fidelity_gate.py`, inspect overlay, and obtain independent review. Automated PAPER1/Storybook success is not a portrait-quality substitute.

**Remaining art priorities:** facial light-shape modeling, small hand anatomy, foot-contact/leg perspective, profile views from both directions, expression variation, and full-speed character gesture critique. 
