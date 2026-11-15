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

## Actual R3 frame review and second face pass

First R3 artifacts are from [Paper Craft visual film proof #43690958235](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43690958235). The native act-three 960×540 frame shows substantially shortened exposed neck segments, no floating head, and consistently reattached crowns/eyes. **This is a genuine structural improvement, not a final facial-art approval.**

At 4× face crops, however, the princess's eye still reads like a generic white wedge and her lipstick projects beyond the nasal–chin contour. The prince's iris and eyebrow also appear like a mechanical dot under a thick horizontal stripe; the nasal tip and lip remain too exaggerated, and the side profile lacks a real ear silhouette.

Second contour correction on the same PR head: add a separate tapered princess brow, tighten sclera and pupil, recede both lips inside the closed facial outline, smooth both nasal tips, place a prince ear helix behind the sideburn, and re-register every new component to the face hinge. These are original stylized papercut contours. All are structural topology changes, not artificial microtexture or whole-frame filters.

**R3b evidence pending:** inspect new exact-head 3× royal faces and a normal-speed act transition after focused tests; withhold any high-fidelity/source-matched claim until actual licensed source bytes, source/candidate hashes, 18 individual landmarks, and the independent ArtCraft v7 portrait gate can be supplied.

## R4 continuity/gesture pass — source-led costume anatomy (2026-11-15)

Study sources from this pass, **craftsmanship only**; do not reproduce these people's likenesses or copy third-party character outlines:

- [The Golden Touch paper puppet pair, Nathaniel Devarie](https://natedevarie.com/artwork/4323978-The%20Kings%20Conflict%2C%20Paper%20Puppet%20for%20the%20shadow%20puppet%20show%20The%20Golden%20Touch%20%20%20.html): the two royal figures have hand-to-hand contact, shaped sleeves, narrow waist silhouettes and human-scaled wrist/hand hierarchy; not generic wrist circles.
- [BFI archive: Lotte Reiniger's physical Cinderella puppets](https://www.bfi.org.uk/inside-the-archive/features/object-week-lotte-reiniger-cut-out-figures-backgrounds-cinderella): observed small separate mechanical paper cutouts and deliberate costume negative space.
- [BFI/Sight and Sound: Reiniger describing original paper-film construction](https://www.bfi.org.uk/sight-and-sound/features/scissors-make-films-lotte-reiniger-creating-her-magical-animations/): real stiff limb components connected at joints, with natural motion studied frame-by-frame; avoid transparent morphs.

### Critique → structural correction matrix

| Anatomical region | Defect in actual R3b frames | R4 edit | Review criterion |
| --- | --- | --- | --- |
| Hands | Four mitten-like skin wedges with unarticulated fingers | Opposed thumbs, integrated palm silhouette, individual curved fingertip inflections; new princess left hand under cuff | Both hands have continuous sleeve attachment and distinct digit silhouette at 3× |
| Shoulder/collar | Visible vertical neckline line and broad crescent resembling a bib | Recut folded lace collar with scalloped clavicle overlaps; custom cut filigree stock follows the collar, not a shader | Neck remains shorter than head; no floating cuff or unsupported collar tip |
| Torso | Prince jacket has overly narrow shoulder roots and no tailoring line; princess waist feels unstructured | Broader coat clavicle cut, attached seam strips and bodice-to-skirt folded waist/pleats | Silhouette remains readable at final stage size |
| Narrative gesture | The royals stand too far apart to convincingly raise the central lantern | Reduce only final landscape pair's base distance from 132 to 120 paper units, retaining existing synced animation | Each extended hand reaches the lantern region without two actors passing through each other |
| QA | Previous browser captures only recorded full-stage videos, too small for facial inspection | On the **same** Storybook page, add stage/princess/prince zoom mode that magnifies the real full-resolution stage by 3× with no alternate face renderer | Browser captures two full-size facial view crops per aspect; stage mode restores unchanged native render |

**Portrait hard stop is unchanged.** The linked public domain photography under [Library of Congress profile woman 1900](https://www.loc.gov/item/2004676295/) and [male profile photograph 1905](https://www.loc.gov/pictures/item/00651810/) provide candidate anatomical study, but we cannot claim a measured high-fidelity source/candidate reconstruction without locally available unchanged photographs, both hashes, independently annotated 18-landmark sets, tested tonal regions, and independent human review. Therefore this PR stays **experimental and unmerged** if this evidence cannot be produced. The R4 hand/costume improvements are separately testable and do not substitute for approved face details.

**Render review required on latest head:** FilmStage 130/370/610 landscape and portrait, plus new loupe PNGs for princess and prince at act 3. Inspect hand-lantern overlap at 0/120/239 absolute shot frames, panel opacity, face detail and portrait cropping; technical CI pass alone is not artistic sign-off.
