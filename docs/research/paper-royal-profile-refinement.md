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

## R5 preview-derived facial silhouette study — **unapproved prototype**

The latest 512px web-visible photographic previews suggest a specific proportional failure in the R3b face crops: the actress-like princess's lip and nose advance correctly, but her chin retreats almost to the neck line, whereas the female profile photo shows a more forward chin in front of the ear root. The prince has the same issue, with different reference-specific chin projection. Both eye apertures are oversized wedge cuts for a right-facing profile.

- Source female: [Library of Congress photograph of a woman facing right, circa 1900](https://www.loc.gov/item/99472203/), as surfaced in a 512×512 copy. Rights advisory: no known restrictions on publication; use only abstract anatomy, not person likeness. Estimated preview landmarks: ear root (236,246), eye center (316,230), nasal tip (354,258), mouth center (343,286), chin (330,319). **These are approximate eyeballed coordinates from a scaled online preview, not annotated evidence from original source bytes.**
- Source male: [Library of Congress Warren G. Harding side-profile photograph, 1920](https://www.loc.gov/item/2006691556/), mirrored conceptually to the fairy-tale prince's right-facing profile. Estimated preview landmarks: ear root (326,180), eye (181,174), nose tip (123,239), mouth (149,282), chin (180,335). These also are *rough visual estimates only* and require source inspection.
- Candidate R5: increase anatomical chin projection relative to the rear ear and nose tip, reduce the overly long horizontal sclera wedge, align the iris with the new aperture, and author small ear cartilage/nostril cuts *on existing cheek stock* to avoid more oversize sheet counts. This is a study of **shape proportions**, not a traced likeness.
- The source photographer's full-resolution image bytes and checksum are still unavailable within this tool environment. The **18-source-landmark immutable-photo ArtCraft v7 portrait gate is not satisfied**. This PR remains unmerged until actual image/hash, independent per-region source/candidate measures and independent artistic review are available. Zero acceptance is inferred from green TypeScript, layer-budget or browser tests.

R5 reference-to-geometry notes are recorded as a non-release preview atlas in [paper-royal-profile-preview-geometry.json](paper-royal-profile-preview-geometry.json); it must **never** be mislabeled as a validated portrait_fidelity_gate.json.

## Portrait deer framing correction — visual work remains open

The exact-head native frame 610 showed the deer's head cut off at the right edge and its body obscured by the foreground tree. The portrait placement now moves the deer inward without changing its cut paths or landscape position. A browser regression checks the rendered deer body, head and antler path bounds at the chapter buttons’ selected preview frames. A native portrait frame 610 was rendered and inspected: the head is within the stage, but the tree still crosses the antlers and the animal overlaps the prince/fox grouping. This is a partial framing correction, not an accepted composition or a completed motion review. Inspect all beats and stress frames, improve overlaps, and retain the portrait fidelity and independent review gates.
## R5 native-vs-Storybook image audit — unexpected film-curtain occlusion

Actual GitHub Actions browser PNGs from [run #43693882898](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43693882898) exposed a long-lived false positive: Storybook browser captures for the second and third chapters showed only pale solid paper even though native FilmStage frames 130/370/610 contained the correct actors. The Storybook controls sought directly to the new shot's **local frame 0**, during PAPER-D2's **intentional, fully opaque 12-frame opening paper curtain**. The browser tests verified SVG DOM layers and screenshotted the curtain, so they never proved that the visible scene was present. The 3× loupe screenshots inherited the curtain; screenshotting the transformed element rather than its fixed-size outer film viewport yielded off-target white margins.

**Fix the preview, not the production curtain:** clicking chapter 2 or 3 opens at local frame **18**, after the 12-frame curtain reveal; scrubbing and restart still allow seeking exact frame zero. Browser tests assert the exact local frame and no active `[data-km-paper-curtain]` before capturing the actual scene and the loupe's fixed viewport. This is an explicit visual acceptance requirement, not just DOM existence. Older Storybook screenshot proofs for chapters 2/3 are invalid as artwork evidence; native FilmStage proofs remain valid.

## Rejected foreground-fox experiment

A portrait-only trial moved the fox down 105 sheet units and placed its layers above the foreground bank to separate it from the prince's boots. A browser bounding-box assertion passed, but the first native portrait frame 610 hid the fox behind the bank; raising its stock above the bank made the fox look isolated and unsupported on a large empty field. Both candidates were discarded. This is an art-review failure despite the passing geometry assertion. The original overlap remains; investigate grounded staging, coherent foreground construction and motion in both aspects before another change. Neither candidate nor its assertion was retained.

## Portrait fox staging iteration

The second tested portrait placement brings the fox to the left foreground, near the existing bank, and keeps its opaque paper layers above that bank. The original paths and landscape placement remain unchanged. Native portrait frames 130, 370 and 610 were rendered and inspected: the fox no longer covers the prince's boots, and the body, head and tail remain within frame in those samples. The fox still overlaps the princess's skirt, while the deer overlaps the prince in the earlier scenes; this is a partial improvement, not a passed artistic or full-motion review. Browser checks cover these three frames and the fox body/boot rectangles, not every animal outline or frame. Source-based portrait evaluation and independent review remain open.

## Rejected deer-spacing trials

At portrait frame 130, scaling and lifting the deer hid most of its body behind the prince and tree; moving it farther right and placing the tree behind it exposed an animal that appeared unsupported above the ground. A separate trial shifted the prince inward in the first two acts: a 70-unit shift cleared a deer-body/coat bounding-box check, but at frame 370 the prince's face and hand crowded the lantern and rabbit. All three trials and their candidate assertions were discarded. Fixing the deer requires a coordinated scene layout and ground-plane study, not merely satisfying a rectangle test; the current deer remains partly obscured in early acts.
