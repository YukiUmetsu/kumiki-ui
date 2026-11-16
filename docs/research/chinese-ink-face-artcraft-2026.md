# Chinese Ink figure faces — ArtCraft reference study (2026-11-14)

Status: **Original source-guided reconstruction in PR #194. Technical and visual acceptance separate.** The user's river-scholar teacher painting remains the **identity and pose reference**. The museum studies below are craft benchmarks, not substitute character identities.

## Curated primary-source artwork and techniques

| Reference | Access / rights | Specific lesson for code |
| --- | --- | --- |
| [Twenty-five bust portraits of famous scholars, Ming period, Met 55.37](https://www.metmuseum.org/art/collection/search/51810) | Met collection; verify download rights on work | Distinct face shapes across adults; complex non-mirrored eye-to-nose relationship; no generic single doll template |
| [Portrait of a Scholar, 17th–18th c., Met 48941](https://www.metmuseum.org/art/collection/search/48941) | Met object page labels image public domain | Mature scholar brow, downcast eyes and textured forehead; subtle 3/4 face volumes |
| [Ruan Zude, Portrait of Yizhai, dated 1561 or 1621, Met 59.49.1](https://www.metmuseum.org/art/collection/search/36081) | Historic work; check object page | Thoughtful gaze, cheekbone/nose continuity, gently pursed lips, individuality rather than stylized face icons |
| [Qiu Ying (attributed), The Sixteen Luohans, Met 1989.235.3](https://www.metmuseum.org/art/collection/search/44592) | Historic scroll; inspect object page | High-frequency expressive variable-pressure face and garment lines; extraordinary differentiation among facial types |
| [Shitao, The Sixteen Luohans, dated 1667, Met 1985.227.1](https://www.metmuseum.org/art/collection/search/49170) | Historic scroll; inspect object page | Descriptive human expressions at small scale, controlled dry black lines and subtle washes |
| [Portrait of a man in court robes, late 18th–early 19th c., Met 2021.324](https://www.metmuseum.org/art/collection/search/854220) | Historic portrait; object page may restrict photo | Eyelid thickness, iris/sclera contrast, believable nasal planes, skin modeling; note European-influenced convention, not automatically appropriate to earlier scholar |
| [Jiang Yun, Portrait of a Man, 19th c., Met 52.177.8](https://www.metmuseum.org/art/collection/search/51783) | Met labels image public domain | Individual eyebrow hairs, age and nasolabial rhythm, natural asymmetry |
| [Portrait of Huang Jianyuan, late 19th c., Met 894760](https://www.metmuseum.org/art/collection/search/894760) | Historic portrait; inspect rights | Cheek and nose tonal hierarchy, subtle lighting while maintaining an ink-and-brush appearance |
| [Ming/Qing portrait collection exhibition, National Museum of China](https://www2.chnmuseum.cn/exhibition/exhibition_series/temporary_exhibitions/classical_art_exhibitions/202204/t20220429_256191.html) | Museum research; don't embed without permission | Traditional line construction vs later highly modeled facial surfaces; chronology matters |
| [Admonitions Scroll, British Museum image 901936001](https://www.britishmuseum.org/collection/image/901936001) | Museum-held image; restricted reproduction uncertain | Earlier gestural, economical figure-face strokes; avoid over-rendering every plane as photographic realism |
| [Met, What's in a Face?](https://www.metmuseum.org/pt/perspectives/whats-in-a-face) | Museum commentary | Facial texture and small asymmetries matter for psychological specificity, not just added hatch count |
| [Met, Group Portrait in the Bamboo Grove, Luo Ping exhibition](https://www.metmuseum.org/exhibitions/listings/2009/luo-ping/photo-gallery) | Museum research | Gaze direction and subtly turned heads convey relationships; avoid static front-facing pupil placement |

Do not insert source pictures or traced paths into `registry/`. Research URLs are links only. A source's historical date does not automatically make its digital reproduction freely licensed.

## ArtCraft visual diagnosis of native Storybook baseline

Native baseline: `reader-face-three-quarter-rest.png` from Shanshui browser evidence, cropped to a 91×125 teacher/rig portrait design view and enlarged to a 376×470 Storybook panel.

- **Eye:** two hairline slits with almost no space for iris, tear duct, tarsal crease or the lower orbital edge. "Open" visually reads closed.
- **Nose:** a weak curved S without nasal-tip/alar-wing structural volume; line unrelated to subtle cheek plane.
- **Mouth:** thin arbitrary scratch, no asymmetric lip corners or philtrum, mouth states do not have consistent material relief.
- **Ear:** a spiral inside a single oval, no separate helix, tragus/concha and projecting lobe.
- **Brow and face:** near/far eyes almost symmetrical; brow lacks hair/pressure structure; face is a mostly flat fill. These gaps are visibly disproportionate to the deeply layered crown.
- **Film scale:** the face is small; high-frequency details must survive antialiasing. Do not add unrelated random skin speckles or deep wrinkles to a young reader merely to maximize feature count.

## Feature-to-construction map

| Region | Construction in original head-space, 260×340 | Macro/micro gate |
| --- | --- | --- |
| Near orbit | Opaque warm paper-tone almond opening, gently weighted upper lid, independent lower edge and medial corner; center around x126–127/y105–107 | Clearly open in **open** state, not a horizontal slash; upper iris remains under eyelid visually |
| Far orbit | Shorter, more foreshortened aperture x149–164; smaller iris; distinct upper and lower crease | Near eye visibly wider than far eye; no cartoon mirror copies |
| Nasal ridge | Tapered connecting bridge with translucent side-plane wash, actual tip, two asymmetric alar strokes, nostril tint | No detached double-S line, no face-disconnected nostril |
| Malar / chin | Three restrained cheek/jaw ink planes with little highlight reserve | 3/4 volume without deep geometric cheek blocks or transparent head |
| Ear | Helix root, concha, tragus, antihelix and curved lobe layers, all attached to existing exposed left ear | Distinct from circular swirl; remains in front of sideburn |
| Brows | Staggered follicle-length tapered strokes along nonmatching near/far arcs | Not thick rectangular parallel eyebrow decals |
| Lips | Light upper/lower relief and asymmetric corners compatible with all five speaking cels | Visemes stay individually readable; mouth doesn't float |
| Rig | All face/crown paths authored in same head-local coordinates; existing eye, pupil and viseme part IDs and pivots | Full `InkShanshuiFilm` expression cues + reduced-motion behavior survive |

**Implementation:** `src/video/ink-shanshui-reader-anatomy.ts` exports explicit semantic groups and a bounded, deterministic `readerFaceAnatomy(detail)`. `src/video/ink-shanshui-reader-face.ts` integrates the groups into existing assets, preserving the separate eyelid, pupil, mouth and ear parts. Existing body and garment assets remain untouched. Reader Face Studio adds a 6× cropped **live** face-anatomy panel within the same Storybook folder. Targeted unit + Playwright tests check structural contracts and render open/closed eye evidence.

## Acceptance criteria and known limitations

Compare rendered before/after screenshots under **the same scene, frame, face crop, color and final dimensions**. Extra path count is a guard against a blank mockup, **not** an art score. A style-guided original scene should not be assessed with unaligned pixel SSIM versus a different museum work. Review natural gaze direction, soft line pressure, junctions, eyebrow expression, nostril/ear placement and the face's visual age, both at enlarged crop and native 960×540 film size.

Still open even after the reader passes: the hermit and mountain walker have distinct older face plates that require separate identity-preserving craft studies, the production actor may have little facial screen area at wide landscape shots, and head-turn animation needs view-specific artwork rather than just rotating a single planar face. Do not merge based solely on typecheck/CI success.


## First actual browser proof and second artistic correction

Initial scoped run `43661553129` completed the portrait Storybook tests,
including explicit iris visibility during open/closed eyelids and the normal
960×540 film exporter. The actual screenshots
`reader-face-three-quarter-rest.png` and
`reader-artcraft-eye-nose-lips-open.png` were inspected at their native
delivered pixel sizes. This is not a self-reported generator score.

**Observed:** The new eye apertures and curved irises read much better than
the previous hairline slits; nostril/alar distinction is visible and the
cheek has more depth. However, the macro-crop was improperly centered and
cut across the upper face while leaving excessive blank area. The mouth
still curved upward toward the far corner, incorrectly suggesting a smile
in a quiet reading pose.

**Correction:** Adjust the actual face microcamera to a tight
`112 71 48 34` head-space viewBox (266px tall) to account for the
source-fitted head-rest transform. Flatten the closed **rest** mouth's far
corner and rebalance its tinted relief; preserve a separate expressive
smile cel, its visemes and head rig. The reader model revision is
incremented to v9 for downstream asset identity.

**Unresolved:** the original teacher painting and external museum works
have different scales/compositions, so neither pixel similarity nor the
test's path counts prove source-fidelity. Reassess expression and eye
detail at both the corrected close-up and at 960×540; the scholar's head
occupies only a small fraction of a panoramic composition. A genuinely
cinematic figure shot still requires camera reframing, body-and-head turn
cel variants and tailored acting, not just extra paths.


## Second rendered art critique: no line-count vanity

The native browser proof from Shanshui CI `43662340858` confirmed that
the corrected microcamera now frames the entire face. The new open eyes
and gaze-dependent iris parts are visible. The reference-driven approach
is an improvement over the former near-closed slits, but an independent
art check still rejects the portrayal as fully resolved.

**What still read falsely:** The nose tip had several overlapping closed
arcs, forming an almost oval ring; two strong, long jaw-tracing marks
made a young scholar's cheeks look artificially scarred or aged; the
resting lip line still rose on the far side after the fitted -4° head
rotation.

**Third code pass (v10):** retain the painted single solid jaw contour,
remove the duplicate interior jaw pressure marks, replace the nose's
looped line with a shorter open bridge-to-alar stroke, lighten the old
underside shadow and flatten the rest lip to compensate for the actual
head's fitted rotation. The deliberately smiling viseme remains
separate; no head pivots, blink controls or garment geometry change.

This does **not** make the scholar museum-grade. Further high-return
work should be a canonical still comparison against the user's own
teacher painting, larger figure close-up shots in the film so the
features are actually visible, view-dependent facial cels for turns,
and full bespoke studies for hermit and mountain traveler.


## Figure identity pass and single-folder Storybook audit (November 14, 2026)

Additional museum-based craft reference:
[Zeng Jing, *Portrait of Pan Qintai* (1621), University of Michigan Museum
of Art](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/).
Its museum description identifies individualized deep-set eyes, subtly
layered transparent ink washes, and distinct nose/forehead volumes. This is
a **technique** reference for Zeng-style modeling, not the young reader's
identity or a source for tracing/embedding pixels. The original teacher
figure remains the source for proportion and facing direction.

### Corrective art direction

- The first v10 face macro proved richer apertures and lip structure but
  exposed a strong angular outline and eyebrows that read as schematic
  strokes at presentation scale. The reader now has a continuous 12-cubic
  contour through cheek/chin with thinner ink border, softer malar wash,
  and narrow pressure-tapered brows. The chin still respects the original
  source-fitted pivot and anchor.
- The original **old hermit** and **mountain traveler** previously received
  nearly identical generic fine-detail overlays despite different painting
  sources. New `shanshuiOtherFaceCraft(scene,detail)` treats the faces
  separately: elderly orbital volume, age-specific nasal/cheek folds, and
  leaner traveler windward temple, brow and iris art. No reader asset,
  mouth state, body proportion or hair/crown shape is shared by reference.
- At `detail=0`, these optional refinement layers disappear, and low/high
  detail remains deterministic. No temporary rectangles/circles are drawn
  as eyes or pupils.
- Each face now appears in a **three-portrait identity review** inside the
  existing reader-face Storybook studio. The screenshot proof uses the
  same head, eyebrow, eyelid, pupil and mouth transforms as production.
  A separate close-up and live blink review preserve the original
  individual-region controls.

### Folder architecture

All Chinese Ink stories now live as direct leaves under a **single**
Storybook sidebar folder `Video production/Film Looks/Chinese Ink`.
Shanshui Film Gallery, Shanshui Proportion Studio and Shanshui Reader Face
Studio are flat leaf titles, not a nested `Shanshui` folder. Their
pre-existing Storybook IDs are kept stable so deep links and video exports
do not break. A browser navigation test checks all Chinese Ink titles
have exactly four slash-separated components.

### Review and outstanding concerns

The visual contract is not met just by passing the new unit checks. Use
native browser evidence `shanshui-three-portrait-identity-review.png`,
`shanshui-three-portrait-blink-review.png` and the original film MP4.
Inspect nose–mouth connections, soft eye sockets, face silhouette and
natural differences in age. Do not mistake higher path count for genuine
brushwork. The characters still need more faithful full-figure acting,
close-up camera choreography, and view-dependent head-turn artwork.
Keep this PR draft until both the film and the figure studies are approved.


## Second native ArtCraft critique — beard and scale (2026-11-14)

The three-face Storybook evidence from successful Shanshui run
`43671039470` showed distinct facial designs, but also revealed two
specific failures at presentation scale:

1. **Old hermit:** the beard was a rigid dark triangle with repeated
   whisker strokes converging at one sharp tip. This was geometry, not a
   shading problem. The base silhouette now has eight continuously
   connected cubic sections across cheek, jaw and diverging tufts,
   and secondary hairs use unequal release coordinates and weights.
   The darker beard stays part of the head-art hierarchy.
2. **Reader comparison:** the source-projected reader head is much smaller
   than the elder. Equal, fixed `viewBox` coordinates distorted the
   apparent complexity comparison. The studio's **inspection-only**
   window now incorporates each head's production `scaleX/scaleY`
   and translated anchor. It does **not** stretch or replace the actual
   model, so all three can be compared at equivalent apparent scale.
   An e2e assertion guards the different camera windows.

This revised beard and camera need another image/animation audit.
The source-derived ArtCraft standard is not satisfied by passing tests
or increasing the number of line segments. Remaining blockers include
rigid crown geometry, limited view-dependent acting and inconsistent
paint character at close/medium scene scales.


## Three-identity face study and ink-bone tonal layering

A further ArtCraft comparison now uses the museum-described technique of
**thin successive ink deposits** rather than adding arbitrary dark contour
lines to every character. Zeng Jing's *Portrait of Pan Qintai* (University
of Michigan Museum of Art, 1621) uses subtly graduated washes around the
eye sockets, nose, and forehead to model a distinctive sitter:
https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/

Separate original bone-less tint passes now describe the **older hermit's**
sunken eye wells, medial nose/cheek turn and upper malar structure, and the
**adult traveler's** shallower windward sockets. The distributions are
asymmetric and distinct; neither receives the young reader's cheek shape.
Ink deposits are transparent over an *opaque* base skin plane. Model identity,
pupil/eyelid/mouth acting channels and source-fitted head pivots are retained.

The existing Shanshui Reader Face Studio now includes a
**Three figure faces · ArtCraft comparison** story. Its three live
production-cel portraits use the same detail slider, eyelid state, and five
mouth visemes. It is in the **same Chinese Ink Storybook folder** as
the film, texture studio, and other character studies.

A Storybook navigation audit also found the Chinese Ink ensemble stranded
in the Film Looks root. Its title is now
`Video production/Film Looks/Chinese Ink/Ensemble`, with the existing
stable ID preserved.

**Review:** Compare full face and 6× cropped open/closed eyes for all three.
Accept only if these new layers improve the face at film resolution; adding
transparent polygons can create muddy eye sockets, even when unit tests pass.
The original baseline and screenshots serve as qualitative evidence, not
a numeric equivalence score to Zeng Jing's painting.


## Character Director source-led quality follow-up — PR #350

Inspected actual `Ink Character Director Proof` browser frames
from run `43610096133`: original wide scenes at 0/85/135/235/310/419,
in both 16:9 and 9:16. The character was consistently grounded but
the costume/face read as flat vector puppet art; full landscape
framing also concealed the artist's medium-scale facial detail.

This is an **asset-level consistency defect**, not proof that an extra
screen-space texture filter would solve visual quality. The existing
classical master figure already has authored orchid-leaf dark volumes,
broken-reed hem strokes, cheek and nasal planes, hair and beard accents
in `INK_MASTER_CLASSICAL_ACCENTS`. The Director omitted all of these
by applying only `INK_TRAVELLER_FOLDS`. It now calls the same
`makeClassicalInkFigure` artist module as Ensemble on the
**original segmented-legged walker**. Hip/knee pivots, material ownership,
idle acting and gaze stay unchanged. Tests check incremental genuine
face/hair/beard geometry as well as the shared definition revision.

The existing Character Director Storybook laboratory adds a choice
between the complete film and an **actor-tracking close-up**, both
using the exact same production `InkDirectorFilm`, frame and rig.
No new Storybook folder, substitute viewport actor or animation
timeline is introduced. The close-up lets reviewers inspect
silk-thread folds, eyes and contact while the full-film framing
still checks continuity. Actual new Chromium crops and film review
remain artistic release gates; more paths alone do not establish
faithful Chinese ink figure painting.


## EXPR1 action-unit ↔ ink anatomy experiment (2026-11-16)

**Scope:** only the *young three-quarter scroll reader*. This does not alter the independently authored hermit/traveler or declare the broader Fuchun landscape historically faithful. The experiment adds `src/video/ink-shanshui-reader-expression.ts` and a dedicated story **EXPR1 expression atelier** to the existing Chinese Ink / Shanshui Reader Face Studio directory.

### Source deconstruction before deformation

- [Shanghai Museum · Zeng Jing, Portrait of Li Zhaoheng](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/CI00004164): refined oval head in ink and colour, near-transparent cheek model and projecting nose with a clear jaw/ear seam. Continuous silhouette carries the bone; brows/lips are subordinate to facial value. **Borrow the value hierarchy, not the sitter's geometry.**
- [Met · Portrait of a Scholar, 29.20.1](https://www.metmuseum.org/art/collection/search/48941): a separate, public-domain historical scholar image. Compare head turn, individual brow angles, nasal and lower eyelid masses, and understated lip asymmetry at matching head crop; no museum image is bundled.
- [Met · Twenty-five bust portraits, 55.37](https://www.metmuseum.org/art/collection/search/51810): clearly different noses, eyes, hair and face silhouettes among a group. Never transplant the reader's proportional face onto the older film characters.
- [Met · Ren Xun, Scholar in the Wind, 1986.267.45](https://www.metmuseum.org/art/collection/search/49460): especially inspect kinetic ink contour flow in relation to the physical material and moving figure. Ink pressure follows an anatomical change rather than uniformly shifted decoration.
- Shared ANAT1 3/4 anchors are the near and far canthi, sellion/pronasale, zygion, mouth corners, chin/menton and exposed ear. EXPR1 muscle units are **a guide to displacement**, not an image generator or guaranteed emotional interpretation.

### Implementation contract

1. Neutral emotion and zero intensity return exactly the original source-fitted ink assets. Never lose base face opacity, 12+ eyebrow follicle marks, full crown hierarchy, independently rigged lids, pupils or five visemes.
2. `expressEmotion` and `expressionFeatures` supply scaled inner/outer eyebrow lift, brow knit, cheek raise and lip-corner displacement. The original near/far brow paths and each of their pressure-loaded polygon vertices are deformed *in place*, retaining dry edges and source contour topology. The far eye has a shorter foreshortened span, never a mirror copy.
3. `expressionMarks` activates discrete named material strokes: AU 6 crow's feet and quiet under-eye malar lift; AU 4 short glabella knots; AU 1/2 faint forehead-relief traces; AU 12 soft nasolabial contact. Opacity stays low for a young reader so the expression does not add decades of false age.
4. Original eyelid cels and AA/OH/MM/smile/rest visemes remain separate. The atelier's **automatic** choices are a pose suggestion only: an authored scene can override lids for blinks and mouth for speech. The five-keyframe strip currently exposes sampled static expression poses; it does not claim temporal interpolation or full film expression cue integration.
5. Storybook must expose a full head, source-fitted microcamera, 0/25/50/75/100% expression poses, detail/intensity and eyelid/viseme overrides, plus the actual EXPR1 numerical features. Browser screenshots are evidence to *inspect*, never visual acceptance by themselves.

### Art release blockers

- Judge brows at native film resolution: the individual follicles must bend with the brow mass without turning into a second parallel ink band or appearing pasted on. Compare source image and generated crop at equal head scale.
- Check cheek and mouth continuity for smile, sadness, anger and surprise **between** keyframes; no popping cels. Distinguish still-pose prototypes from a continuous cinematic acting system.
- Full visual approval requires the referenced painting's actual crop and the same-camera final 960×540 animation. Code checks alone are insufficient.
- Existing Fuchun **mountain positive geology, fibre rhythm and old pine structure** remain independent, unresolved ART HOLD items of PR #466; this face experiment does not authorize merging it.

Checks are wired in `tests/ink-shanshui-reader-expression.test.tsx`,
`tests/e2e-storybook/ink-shanshui-reader-expression.spec.ts`, and
`.github/workflows/ink-shanshui-qa.yml`.


## EXPR1 24-fps temporal facial study · November 16, 2026

**Status: opt-in Storybook facial motion, not production portrait approval.**
Follow-up to the ANAT1 source-fitted eye, malar, brow and lip pass. Five
still-pose intensities previously did not permit inspection of how the
reader's facial changes actually flow in time and recover to neutral.

### Historical ArtCraft reference and edge contract

The original teacher figure's head, asymmetrical 3/4 gaze, ear, cap and five
visemes remain the identity reference. Historic technique comparisons:

- [Zeng Jing, Portrait of Pan Qintai, UMMA](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/):
  layered translucent cheek and periocular modelling. AU6 eye narrowing must
  move original local relief, not place a new dark eye sticker.
- [Met scholar portrait](https://www.metmuseum.org/art/collection/search/48941):
  quiet uneven brow, downcast upper lid, mouth-corner recession. Preserve
  near/far perspective and the original broken dry edges.
- [SOAS survey of Chinese figure-painting line modes](https://eprints.soas.ac.uk/12775/1/McCausland%20Figure%20Painting.3.19.14%20FINAL%20EDIT.pdf):
  continuous silken/iron-wire/orchid-leaf contours are material gestures,
  not CSS curves with lost pressure detail.

These are studies of method, not authority to trace or bundle museum pixels.

### Cue construction

The pure readerInkCueWeight(frame) and
inkReaderCueFrame(emotion,peakIntensity,frame,detail) sampler lives in
src/video/ink-shanshui-expression-cue.ts.

- 24 fps; 96 source frames; ease-in 0–12, sustained hold 12–60,
  ease-out 60–84, neutral recovery 84–96.
- Cubic smoothstep ensures zero velocity at segment boundaries. At frames
  0,6,12,72,84,96 the activation is 0%,50%,100%,50%,0%,0%.
- Drives the original EXPR1 malar, asymmetric brow, eyelid and lip geometry.
  Crown, ear, pupil, independent speaking assets and head pivot stay intact.
- Reader Face Studio now exposes an accessible film-frame slider, Play/Pause,
  Reset, seven native source-frame reference poses and numeric ease readout.
  Playback is disabled when reduced motion is preferred; manual scrubbing
  stays available. Storybook does not autoplay.
- Unit tests and native Chromium tests check deterministic continuity and
  exact recovery to neutral source shapes.

**Unresolved artistic gate:** inspect native 1×/macro crops at frames
0/6/12/60/72/84/96 and the full 960×540 sequence against the original
teacher painting; check continuity at 0→1,12→13,83→84, independent blink
and speech overrides. A passing CI run is not human visual approval.
The existing Fuchun rock/pima/pine hold still prevents merging PR #466.


## Source-fitted reader ear: antihelix Y, concha recess and baimiao pressure · November 16, 2026

**Status: source-led anatomy refinement, artistic hold pending same-camera browser review.**
The previous full-resolution Storybook ear crop `reader-ear-ANAT1-helix-concha-full.png`
still showed *nested, circular, same-spacing cartilage*, visually closer to a
decorative snail than an individual young scholar's ear. Passing topology
assertions did not mean an anatomically credible silhouette.

### Checked references and discriminating observations

1. [National Museum of China — Ming and Qing portraits](https://www2.chnmuseum.cn/exhibition/exhibition_series/temporary_exhibitions/classical_art_exhibitions/202204/t20220429_256191.html):
   traditional likeness joins wash depth to sparse, carefully weighted ink contours.
2. [University of Michigan Museum of Art — Zeng Jing, *Portrait of Pan Qintai*](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/):
   a credible individual head comes from fine contours plus subtly layered tonal
   washes, especially around the eyes and nose, rather than uniform thick rings.
3. [NIH — standardized external ear anatomy](https://elementsofmorphology.nih.gov/anatomy-ear.shtml):
   the antihelix is a genuine Y with distinct superior/inferior crura; the
   scapha lies between helix and antihelix, and the soft lobule lacks cartilage.
   This is the structural reference, *not* a visual style source.

### Topological changes (source coordinates, no imported pixels)

- Keep original near-ear head pivot, over-hair layer, landmark names and all
  ear-part source asset IDs. Preserve the four original main path slots.
- Replace the oval pointed lobule with a graduated return to the face and
  an outer stroke of varied visual weight, retaining negative paper.
- Align the Y's three own-path subpaths to a shared hinge at (114.45, 106.7).
  Use separate arc directions for the superior and inferior crura; no nested U.
- Separate the small tragal lip and antitragus/soft lobule. Shade the concha
  with a translucent *asymmetric* wash; add independent meatal recess accents,
  pale scapha ridge and ochre dry-glaze, all behind delicate contour lines.
- High detail increases source-anatomy marks instead of simplifying the drawing.
  Existing EXPR1 cue and film rig do not deform the ear, preventing expression
  transitions from collapsing the cartilage.

**Visual sign-off remains pending:** compare 1× and 2.4× native source-fitted ear
Storybook captures against the above references. Avoid a plastic circular
cartilage stamp, unbroken 1px vector lines, oversized concha shadow or detached
lobule. Run ANAT1, EXPR1, browser/Storybook and original Shanshui film checks.
Fuchun landscape geology/fibre and old-pine quality still independently block
PR #466 merge.


## Source-fitted near/far gaze and occluded ink iris (2026-11-16)

**Reference deconstruction.** Historical Zeng Jing scholar portraits model deep
orbital sockets with nearly transparent accumulated pigment rather than a
single photographic specular circle ([UMMA, Portrait of Pan Qintai, 1621](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)).
At small production scale, the upper lid's dry edge and warm paper eye
opening should occlude most of the downcast iris. A black pupil placed on top
of the lid reads as a pasted decal, even when it passes structural tests.
The [Met 29.20.1 scholar portrait](https://www.metmuseum.org/art/collection/search/48941)
is a complementary reference for asymmetric downcast gaze and individual
eyebrow pressure: not an identity target or redistributed source image.

**Topology and vector flow.** The existing young reader has a 17.1-px near
canthus span vs a foreshortened 14.7-px far span. The original near iris is a
multi-stroke pressure/fill cluster (not a circle); the far iris includes
relative-path lash geometry. Therefore moving all source ink paths by a
single source-coordinate transform is safer than rewriting their cubic
control points or truncating paths. Horizontal limits use .14 near eye width
and .115 far eye width; vertical limits use .145 of each original palpebral
height. This preserves the stronger near-eye parallax. The zero/zero target
must be an exact no-op at every expression intensity and fine-detail setting.

**Edge and layering.** Source eye apertures are the **actual first two
$paper closed paths** from the independently authored open/soft eyelid cels,
including EXPR1-deformed source paths. Storybook wraps near and far pupils in
unique SVG user-space clip windows transformed with the eyes' original
rest pose. Each pupil retains its own rest pose and translated all-stroke
vector geometry. During a full blink both pupils and clip windows disappear.
No invented oval masks, flattened textures, new skin color or changed film
visemes. This is a **non-destructive Storybook diagnostic**, not yet the
production renderer's full iris-occlusion integration.

**Review:** Inspect exact 1× and 3× native captures for straight/down/right,
the four EXPR1 expressions, soft/open/closed eyes and 96-frame cue extremes.
Check pupil containment, white paper opening, original upper lash contact,
far-eye foreshortening and corresponding expression response. Geometry
bounds/tests and browser artifacts alone cannot certify the resulting
historical portrait or true teacher-painting fidelity. This PR remains draft
under the independent Fuchun landscape art hold.
