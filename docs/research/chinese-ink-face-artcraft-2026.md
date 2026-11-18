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


## Late-Ming portrait multilayer wash study: source-anchored nose/cheek volume (2026-11-16)

**Observed problem at genuine native Chromium 1×/macro:** the young reader was
still too graphic in the cheeks and the bridge-to-nostril plane. In the
pre-change actual source-fitted close-up, hard-edged broad tan bars across
the malar region and an acute dark nasal slash made a nearly two-tone
mask even though all ANAT1 and EXPR1 geometry tests passed. This is not a
photoreal likeness; it is a material hierarchy and visual legibility issue.

**External historical references, rather than commercial vector presets:**
- [University of Michigan Museum of Art, Zeng Jing, *Portrait of Pan Qintai*
  (1621, 1966/1.110)](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/):
  near-transparent washes suggest the actual deep-set eye, forehead and
  curved nose in conjunction with faint light-line drawing.
- [Staatliche Museen zu Berlin, *Faces of China*, object 9.8 (Zeng Jing /
  Huang Shiyuan, *Two Portraits of Ge Yilong*)](https://www.smb.museum/fileadmin/website/Presse/Pressematerial/2017/10/04_AKU_171010_Faces_of_China_Site_Plan_Lower_Level.pdf):
  specifically describes volumetric eye socket/nostril work and successive
  red/ochre pigment layers in a Jiangnan-mode portrait.
- [Scholarly historical account of Bochen portrait methods](https://fphil.uniba.sk/fileadmin/fif/katedry_pracoviska/kvas/SOS_10_2/02_39breuer-form120520.pdf):
  distinguishes ink-first layered modeling (*mogu aotufa*) from
  fine-contour-and-wash (*goule tiancai fa*) practice. These sources are
  **process references**, not permission to copy a historical sitter's
  likeness into the existing teacher-observed youthful reader.

**Implementation, without simplification:**
\`src/video/ink-shanshui-reader-glazes.ts\` supplies six independent named
source-space painting strata: near and far orbital shadow, convex side of
nose, near and far malar transition and sublabial/chin relief. They use
ANAT1's actual inner canthi, zygions, sellion, nose tip and menton; each
pass is a distinct continuous cubic contour with its own opacity. The
non-uniform near/far eye hierarchy is important because the actual
painting is in three-quarter projection. At high detail, several fine
source-aligned dry remnants make the edges tactile rather than smearing
flat paint or introducing random grain.

\`readerFaceAnatomy()\` **retains every existing face plane, eye cel, iris,
ear, mouth viseme, jaw contour and pressure stroke** and appends the
new glaze shapes. The previously acute nasal bridge plane gets a *more
curved* existing four-cubic route and lighter value, not a reduced or
blanked shape. Existing ink lines retain their own separate topological
parts, and the two other Shanshui figures are not modified.

**Storybook/QA:** \`Shanshui Reader Face Studio → Reader face · anatomy
and eyelid/viseme study\` now includes a side-by-side original structural
ANAT1 vs layered-source-glaze comparator, with live "Face glaze region"
filter across all six regions. The original form, overall detail, eye/lid
and five viseme controls drive both versions. Unit checks cover the 260×340
source coordinate bounds, opacity, deterministic layering, detail tiers,
unmodified visemes, and continuity of the source anatomy. Native Chromium
captures cover the full 1× montage, isolated nose relief, and lowest-detail
closed-eye / OH-viseme case.

**Visual acceptance is still open.** Green CI and a valid six-region
comparison do not establish that face reads as a Zeng Jing-quality
historical portrait at 960×540 film scale. Inspect BOTH 1× and macro
browser imagery and the film's native animated face. Reject if any region
reads as striped cheek hatching, a cut-out nasal triangle, unnatural
outer-eye pooling, a heavy lip chin crease, or the original near/far
gaze becomes obscured. The larger Fuchun mountain/pima/pine draft hold
also remains independent.


### Positive anatomy correction after native portrait comparison · 2026-11-16

The six-region translucent glazing pass was useful but could not repair
the **underlying** near-cheek stripe and front-face angular nose silhouette
in actual 1× Storybook captures. The next ArtCraft correction changes
the originating geometry, not merely alpha on added paint layers:

- The original near zygomatic value now rises from the source
  zygion.R toward the orbital cheek and curls back **before**
  reaching the upper lip. Its retained four cubic segments describe
  a convex malar dome and unpainted inner paper, not a diagonal ribbon.
  A second original masseter region bends beneath the cheek into the
  rounded chin (four cubic turns); the fine mandibular pressure ink
  remains independent.
- The far malar region retains the much narrower volume appropriate
  to a true three-quarter face. Its interior contour now follows the
  far zygoma instead of closing as a straight, long triangular wedge.
- The nose begins at the original ANAT1 sellion, but the independently
  pressure-painted dorsal and secondary edge now turn into the
  pronasale with a small rounded exit; the near alar pigment plane
  is a short oval bend. The attached nostril and reflected paper-light
  strokes stay present, thin, and independently editable.
- Pigment alpha on these modified structural shapes **decreases**,
  while all previous individual micro-elements, positive head,
  ear, pupil, lid variants, five visemes, expression morphs and
  added Bochen multi-pass glazes remain preserved.

Authentic benchmark:
[Zeng Jing's 1621 *Portrait of Pan Qintai* at UMMA](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
describes individual eye-socket, nose and forehead volume built in ink
wash instead of a flat mask; the
[Bochen school process research](https://fphil.uniba.sk/fileadmin/fif/katedry_pracoviska/kvas/SOS_10_2/02_39breuer-form120520.pdf)
distinguishes accumulated ink/colour from light contour plus glaze.
This student-style young scroll reader is **not** Pan Qintai and must
not appropriate or trace the historical sitter's image.

**Review gate:** compare the actual screen-space face crop and the
960×540 animated film before claiming quality. At macro level the
malar return must read as a convex form, the far cheek as a short
receding plane, and nasal tip as attached to (not hanging from) the
sellion. At 1× the revised underpaint must neither create new sharp
folds nor vanish beneath the opaque head; independently inspect open,
soft and closed eyelids and OH/AA/rest mouth. The earlier unchanged
Fuchun landscape ArtCraft hold remains in force.


### 1× browser rejection: parallel malar ribbons → nested Bochen convex mass (2026-11-16)

**Inspected actual Chromium artifact**, not just serialized SVG:
[Chinese Ink Shanshui Film Quality, pass 43996000759](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43996000759).
Screenshots checked: reader-malar-nose-rounded-positive-ink-1x.png,
reader-artcraft-eye-nose-lips-open.png,
reader-face-ANAT1-soft-wash-planes.png,
reader-source-Ming-ink-glazes-all-1x.png and
reader-face-three-quarter-rest.png. All were drawn at the actual
same fitted source/face camera.

**Visual finding:** despite passing the prior technical and browser
checks, the face still resembled a simple stylized mask. The near
zygomatic material was three or more approximately parallel tan
diagonal bands, a long paper-bright sliver crossed their center and
the nose's dark alar strokes closed as an S-hook. These errors were
*visible* in the 1× render, so path presence and valid transforms are
insufficient visual evidence.

**New geometry technique:** in
src/video/ink-shanshui-reader-glazes.ts the near zygion defines a
wide curved, tear-shaped mass that expands inferiorly and turns under
the high cheek before the buccal/lip region. There are now three
separate closed, transparent pigment passes at the lowest level, a
fourth turn on the middle detail tier and a fifth original pencil-dry
ink remnant at high detail. This *increases*, rather than removes,
independently editable painting topology. No gaussian blur, stock
circle shading, gradient, or raster texture is used. The old
heavy ribbon received a new broad original contour; the paper-bright
core shrinks into a three-turn small oval, and the source nasal
pressure line and secondary tip cartilage remain separate but
less hook-like. Existing first-plane topology, independent underwash,
historical far-cheek foreshortening and the visemes are retained.

**Native browser gate:** the first malar SVG path must have
vertical rendered extent >45% of its real browser bounding-box width
and actual width >14 original portrait units, in addition to the
source-ANAT1 coordinate/opacity/band bounds and a real rendered
pixel difference against the unchanged-source panel. A narrow
ruler-shaped band or disconnected flat decoration must fail.

**Art quality remains DRAFT:** the strengthened gate proves a
broad curved cheek volume exists, NOT that this synthetic portrait
has source-photograph fidelity. In particular the original uploaded
teacher image has not been reproduced/compared with an audited
source SHA-256 in this pass; the ArtCraft v7 18-landmark/5-value
source-fidelity review cannot honestly be marked as passing.
Further manual 1×, 3×, 960×540, and motion review is required;
the independent Fuchun landscape brush and old-pine holds persist.

Technique verification references:
- [UMMA, Zeng Jing, Portrait of Pan Qintai, 1621](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/):
  painterly volume derives from the lightest semitransparent
  ink washes, especially around eyes, nose and forehead.
- [China Daily 2024, account of Zeng's multi-stage portrait practice](https://en.chinaculture.org/a/202406/13/WS666a2500a31082fc043cc2ab_2.html):
  lightly outlined structure with ultra-thin colored ink washes
  that leave the underlying shaded face perceptible.


## ANAT1/EXPR1 native Storybook expression atlas (2026-11-16)

A source-preserving five-pose inspection row now lives in the existing
**Shanshui Reader Face Studio → EXPR1 expression atelier** Storybook entry.
Neutral, smile, sorrow, anger and surprise are rendered from the **same**
original three-quarter reader paths at the **same** fitted head camera,
ink detail and selectable intensity. Clicking a card selects that emotion in
the full-size timeline study without changing its source identity. Each card
prints the *actual* EXPR1 brow, lid, cheek and lip feature magnitudes, rather
than inventing a text description of a finished visual result.

The optional **ANAT1 measured facial anchors** overlay places named
endocanthia, sellion, pronasale, zygions, stomion, menton and other original
points in the *production head's fitted transform*, not the raw asset
coordinates. This is an inspection guide only. It is off by default and
does not alter, mirror, simplify or export into the authored portrait.
Original head outline, fine brow fibres, pressure variations, hair,
ear, separate pupil paths, open/soft aperture masks, expression glazes,
five speech visemes and motion keyframes remain source-backed.

**Authentic visual benchmarks** (technique references, not source art to
copy or redistribute):

- [Zeng Jing, *Portrait of Pan Qintai* (1621), UMMA](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/):
  near-transparent layered wash shapes orbital depth, forehead and nose;
  individualized drawing depends on relationships between face parts.
- [Ruan Zude, *Portrait of Yizhai* (1561 or 1621), Met 59.49.1](https://www.metmuseum.org/art/collection/search/36081):
  high cheekbone, asymmetric lip corners and quiet gaze read as a coherent
  expression, rather than independently moving stickers.

**Chromium contract:** five uniquely identified original-source SVG panels;
head/ear/hair present and equal where invariant; emotion-dependent brows;
source-specific near/far pupil clipping; button-to-editor interaction;
more than twenty independently named ANAT1 landmarks with reversible
overlay, with exported screenshots for an independent visual review.
The atlas is a **diagnostic**, not evidence of historical facial likeness.
Actual 1×/3× teacher-photo and 960×540 frame/film comparisons, malar/nose
pigment quality, and the independent Fuchun rock/pine/hemp art holds still
block merging PR #466.

## Source-integrity iris/eyelid ArtCraft continuation · native Chromium visual review (2026-11-16)

I inspected the **actual native Chromium outputs** in [successful workflow
44011028256](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44011028256),
[artifact 14296588765](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44011028256/artifacts/14296588765),
especially `reader-EXPR1-five-emotion-native-source-atlas.png`,
`reader-EXPR1-sad-face-micro.png`, `reader-EXPR1-smile-face-micro.png`,
`reader-malar-nose-rounded-positive-ink-1x.png`, and the isolated
`reader-source-Ming-ink-glazes-all-1x.png`.

**Visible rejection, not a code failure:** the reader's flat upper face and
strongly directional cheek bands remain too graphic for the individual
wet-ink modeling of the cited Zeng Jing portraits. Although all five
emotions are technically different, at native atlas scale anger/sorrow
are under-articulated; a smile is mostly indicated by the lips, and
the face/ear line weight is still heavy. On the near pupil, the original
last hard ink stroke appears as a separate dark bead to the right of the
iris, reading as **two pupils**; the smaller far iris also has a detached
dark dash. Historical comparison: [UMMA Zeng Jing, *Portrait of Pan
Qintai*, 1621](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
uses individually observed, translucent orbital/nasal volume, not
alternating diagonal face stickers. [Bochen-school technical
analysis](https://fphil.uniba.sk/fileadmin/fif/katedry_pracoviska/kvas/SOS_10_2/02_39breuer-form120520.pdf)
documents light-ink multi-stage wash modeling as a discrete historical
method. These are **process references**; they are not licensed assets
or likeness templates for the original young sitter.

**This bounded iris correction:** preserve all original near/far iris
positive shapes, scleral reserves, pressure fibres, separate pupil rig,
two different eyelid clips and the five visemes, but reproject the final
dark microstroke *inside each existing anatomically measured iris oval*.
The near stroke now follows the far-side limbus at x128.02–128.34 and
the far stroke at x157.92–158.20, within the original source ink
envelopes. Each remains a separate fine brush line, not a deleted
detail, newly mirrored pupil, circle or opacity mask.

**Storybook:** the EXPR1 atelier now provides **near and far iris
microscopes** with native head-transform-corrected viewboxes. They show
the same live source face at two zoom positions; motion frame, gaze,
eyelids and detail stay connected. The new Chromium test uses the
actual SVG path geometry's `isPointInFill` at nineteen samples to
catch future dark microstrokes that detach from the original iris, and
saves both eye closeups for true visual QA. No new Storybook folder.

**Further artistic priorities:** (1) evaluate the new exact-head
microscope screenshots at 1×/macro and approve/reject the pupil
contact; (2) rework the existing hard geometric malar/nasal pigment
planes against the teacher image without hiding or dropping their
original fibre evidence; (3) improve the small-scale
emotion-specific brow/lid/cheek articulation and 960×540 production
readability; (4) independently inspect native film and Fuchun's
still-synthetic rock/hemp/pine geography. This is a **DRAFT / ART HOLD**:
no source-relative visual approval or merge on CI green alone.


## ANAT1 malar/nasal positive-ink repaint — original source geometry (2026-11-16)

**Source reference and topology deconstruction:**
[Zeng Jing, *Portrait of Pan Qintai* (1621), UMMA](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
describes subtle ink gradations defining the actual eye sockets, forehead
and nose with delicately drawn light contours. The [Bochen-school account of
mogu aotufa and goule tiancai fa](https://fphil.uniba.sk/fileadmin/fif/katedry_pracoviska/kvas/SOS_10_2/02_39breuer-form120520.pdf)
distinguishes ink-wash accumulation and thin-line-plus-wash methods.
**Observed visual topology:** the zygomatic eminence is a convex pigment
mass *under* the concave lower eyelid; the distant cheek recedes toward
the alar fold; reflected paper remains inside the convex plane; nose
light turns around the dorsum into rounded pronasale and alar cartilage,
not a thick S stroke. Tactile hierarchy comes from near-transparent
wet passes over soft paper support and localized dry remnants, not
parallel painted ribbons. Museum images are study references only;
no licensed image has been embedded, traced, or redistributed.

**Actual rendered rejection:** 57/58 native Storybook tests passed in
[run 44014134040](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44014134040)
but screenshots still visibly contained *several horizontal cheek bands
and an angular distal nose*: code checks are not an artistic verdict.
The one failing Playwright test was a diagnostics-only implementation
error: SVG `getBBox()` returned a native SVGRect whose numeric fields
became undefined when sent through browser evaluation. Fix: explicitly
serialize `{x,y,width,height}` and retain both 19-point
`isPointInFill` iris-enclosure measurements.

**Bounded surgical repaint (no shape deletion or style simplification):**
- Reconstruct the existing second, third and high-detail near-malar
  pigment passes into distinct CLOSED cubic convex cheek volumes instead
  of nested diagonal ribbons; rotate the original dry edge remnant
  across the malar curvature. Preserve the original primary cheek
  positive-volume path, paper lift, ANAT1 anchor and each separate pass.
- Resculpt the original far cheek into a foreshortened, multi-cubic
  receding bulb with its own smaller undertone. The far side is not
  mirrored from the wider near plane.
- Curve the two existing nasal-shadow glazes into a sellion→dorsum→tip
  volume, preserving the source ANAT1 tip coordinates, unpainted dorsal
  relief and independent hand-tapered dry stroke.
- Recurve the existing distal nasal ink contour to lose the abrupt
  S-turn; expand the original alar-bulb closed ink mass to three
  continuous cubics with an optically lighter end. Original nostril
  accents, ear cartilage, eyebrows, pupil occluders and five visemes
  remain separate and animated.

**Storybook:** original Shanshui Reader Face Studio now includes 3
**film-transform-accurate malar/nasal close-ups** displaying the actual
full source face in cropped near-cheek, far-cheek and bridge-to-alar
windows. Detail, eyes and visemes work on the same source render.
The existing before/after glazing panel and six-region selector remain.
Unit tests guard against narrow secondary cheek strips; native
Chromium captures all three live regions and low-detail speaking state.

**Visual sign-off outstanding:** these are source-code changes, not
verified successful pigment paintings. Do not merge PR #466 until
actual same-frame 1×/3× browser captures, teacher reference and 960×540
moving-film face + Fuchun geology/pine/hemp have been reviewed and
accepted independently.


### Exact-head native browser review of source-mass repaint (2026-11-17)

[Chinese Ink Storybook + 96-frame film, run 44026671883](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44026671883)
completed successfully after typecheck, unit, registry and 58 browser
checks. Its [native visual evidence, artifact 14303418718](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44026671883/artifacts/14303418718)
was opened at rendered pixel scale. Technical success is **not**
ArtCraft approval:

- **Near/far malar and nose:** the extra convex glazes soften their
  narrow diagonal predecessor, but the actual source face is still
  highly graphic with several horizontal cheek terraces and overly
  flat warm-tone skin. At 1× it does not yet equal the individually
  graduated wet-on-paper pigment of the historical source.
- **Iris microscope visual failure despite green tests:** the near
  microscope showed mostly ear/cheek and the far microscope showed
  nasal/cheek washes rather than visible irises. All pupil assets and
  clip paths were present but their **facialRest y offsets** were omitted
  when building the inspection viewboxes. Updated near and far crop
  cameras use the actual fitted pupil-part displacement. New Chromium
  test maps the iris's rendered midpoint via native `getScreenCTM()`
  to the SVG viewport and rejects offscreen microscopes; exact-head
  rerender and screenshot review still required.
- **Speech cel:** low-detail OH appears as a conspicuous dark floating
  oval in very tight cheek/nasal crops. This may reflect a full-figure
  scale/material issue or unusual clipping; do not claim a final
  dialogue-acting pass without the original 960×540 film and the
  teacher painting side by side.

The prior source geometry, all hair/microtexture, expressions and
native frame clock remain. **ART HOLD continues** independently of CI.


## ANAT1 mouth-cel ink relief / final native reader study (November 17, 2026)

**Reference method.** The [UMMA Zeng Jing portrait](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
describes light contour work and transparent accumulative washes
localized to facial features. The Berlin *Faces of China* collection
describes contours and red/ochre pigments being modulated around nostrils
and lips in Bochen technique; these paintings are historical method
references, not copied source artwork.

**Native evidence:** [successful original-film Storybook run
44028544967](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44028544967),
[PNG evidence 14304383375](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44028544967/artifacts/14304383375).
The fixed pupil microscopes now **truly show their different original
near and far irises**, with separate partial limbal fibres attached
below the lids; the exact-head original film and 1× cheek paintings
still exhibit simplistic pale ochre skin terraces. The existing
low-detail OH screenshot, in particular, shows a disproportionate
opaque-dark lozenge against the cheek, with no layered lip contact.
That is an *artistic failure*, despite all TypeScript and browser
checks being green.

**Bounded mouth anatomy repaint:** preserve the original three-quarter
head pivot, independent speech and facial-expression rigs, source lip
relief, visible chin and philtrum. Author the AA and OH **original
open-mouth cel geometry** as multiple cubic bevels: wide /a/ aperture
with a bowed lower vermilion, smaller and narrower /o/ aperture with
a foreshortened far corner. Rather than one large solid dark sticker
at >85% opacity, each new cavity is translucent dark watercolor with
independent cap/upper lip contour, lower reflected edge, thin
underpaint/mouth depth and tiny paper-reserve pigment, all as separate
retained SVG paths. Their source shapes are still independent from
the continuously warped EXPR1 emotion-rest lip path.

**Inspection:** existing Shanshui Reader Face Studio now renders the
five real lip assets (rest, AA, OH, MM, smile) with a shared film head
camera and mouth part y offset. Buttons select the actual live
film-face viseme; no detached mock art or new Storybook navigation.
Chromium must verify each source mouth remains onscreen at the native
fitted transform and reject fully opaque AA/OH, missing lip planes,
wrong shape sizes, identical visemes or changes in source-detail
control. Unit tests check convex cubic contours, width disparity,
graded pigment transparency and retained source path density.

**ART HOLD persists:** the original teacher painting must be compared
side by side at the true 1×/3× native screen and 960×540 film. The
remaining head contour, cheek and nasal wash bands and surrounding
Fuchun geology/pine/hemp art still lack independent artist-quality
sign-off. A green visual-capture test is necessary but not sufficient.

## Native speech-mouth rejection → optical-wash correction (2026-11-17)

Source checks: [UMMA's Zeng Jing portrait](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
describes *subtle washes and delicately drawn light lines*, notably
concentrated around individual facial forms. The [Shanghai Museum's
late-Ming overview](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/RI00004055)
documents Zeng Jing's "ink bones" and shading contribution to the Bochen
school. These are painting-process benchmarks, not copied geometry or
assets.

**Baseline evidence inspected at native pixels:** [five original
visemes, successful head
73e113d5](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44041975567/artifacts/14309698889),
`reader-native-anat1-five-speaking-visemes-ink-lip-atlas.png`.
AA's triangular grey void and OH's symmetric shaded grey circle
still looked like graphic stickers, disconnected from the underlying
3/4 jaw and orbicularis muscle even though the first wet paint repair
passed CI.

**Bounded revision (source / ANAT1, not an external template):**
- Retain distinct rest / AA / OH / MM / smile visemes, source pivot,
  3/4 cheek/mouth projection, existing ink landmarks, 19-point iris
  checks, all existing lip paint paths and the live animation controls.
- Alter the *outer* AA/OH aperture into an **underpainting glaze**
  (17–18% `$shadow`): this first impression has no continuous dark
  border and cannot itself read as a solid stamp.
- Curve irregular narrow cavities *inside* each source aperture
  (29–32% `$shadow`), then a smaller warm ochre `$deep` pass
  (18–24%). Production `$deep` is **lighter** than `$shadow`:
  a genuinely small `$ink` core (22–26%) therefore lives only
  in the deepest recess, not over the whole mouth area.
- Preserve each expressive lower lip's convex wet plane, narrow
  upper vermilion, asymmetrical recessed far corner and paper
  reserves; add individually seeded width-sampled pressure fibres
  (separate closed ink geometry, not uniform stroke/blur).
- At 1×, AA remains wider and opens the jaw below the source
  stomion; OH has a taller, narrower rounded oral opening. Each
  must remain visible in the existing exact-head film crop.

**New structural regression gates:** check graded outer/inner/deep/core
opacities, two separate pressure fibres, rim and palatal detail;
Playwright requires nested *actual rendered SVG bounding boxes*
for the aperture, shadow, ochre and dark core, not only path
presence. Native screenshots and film render still require an
independent visual judgment after this revision.

**Release status:** PR #466 stays **DRAFT / ART HOLD** regardless
of automated success. Unresolved: contemporary facial structure
vs reference teacher, flattened cheeks, historical pigment accuracy,
asymmetrical mouth integration in live 960×540 motion and the
independent Fuchun rock/hemp/pine photographic/material comparison.

## Source-calibrated mobile lips and forehead relief / no-release review (2026-11-17)

**Verified native input:** [1e612af exact-head Chromium and film](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44109769910),
[raw browser captures](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44109769910/artifacts/14342150034).
The original `reader-native-anat1-five-speaking-visemes-ink-lip-atlas.png`
shows five actual production cels. The latest OH still resembles a
tiny third eye: a central round dark core sits between a fixed concave
lower-lip curve and the new lip opening. The tonal palette and anatomy
are better than the old opaque sticker, but this fails portrait quality.
The native full-head and 960×540 Fuchun film also reveal a visually
flat forehead/temple that does not read as graded Ming portrait ink.

**Anatomical cause:** Four original source ANAT1 lip strokes had been
relocated for AA/OH, but the original fixed face asset still painted
its **unchanging lower-lip reflected ink** below every speaking state.
Shading a round mouth cannot remove a separate fixed arc, and an
isolated dark circular cavity core reads as a pupil at small size.

**Bounded correction:** move precisely that original
`M139.9 129.6 Q143.6 131.7 147.2 128.6` reflection
with all of its `$skinshade` pigment / 0.46 weight / 0.35 opacity
into the existing independently rigged mouth cels. Neutral, MM and
smile preserve its unchanged SVG path; AA and OH attach the same
brush mark to their opened lower lip. OH's smallest black-dot core
becomes a slanted **upper vermilion shadow shelf**, rather than a
centred disc. No wash, paper reserve, anatomical landmark, cap, hair,
eye or mouth-lattice element has been deleted or flattened.

**Forehead:** the UMMA [Zeng Jing portrait of Pan
Qintai](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
remains a graded ink material benchmark. Added three *individual*
translucent frontal planes to existing near/far orbital region groups
without creating a generic "forehead" circle or changing six-region
glaze APIs: an 8px temporalis source-anchored rolling shadow,
independently curved paper reserve, and shorter far-side frontal
recession. Pigment opacity is only 3.8–4.7%. The highlight remains
unpainted through the middle and no side is mirrored. All existing
facial pigments and micro-pressure contours remain in order.

**Inspection evidence required before release:** the existing face
Storybook now includes two extra, native-rig frontal microscopes
driven by the shared eyelid and detail controls. Chromium asserts
that near/far forehead pigment is actually visible inside each
source-camera crop, that the two windows are different, and that
closing eyes hides the irises. It saves native high/low-detail
screenshots. Unit regression verifies no lower-lip static arc
bisects open mouths, the original facial lip semantics survive,
and forehead pigment is anatomically attached, asymmetric and
paper-light. **Green tests are not art approval.** The reference
teacher photo is not present in the repo and has not been compared
directly in this pass; this remains a limitation.

**ART HOLD / no merge** until original-painting side-by-side
1×/3× reference fidelity and native-film hand review are acceptable.
Next gate is Fuchun's materially under-contrasted near-rock
brushwork, dry hemp, pine fans and source-aligned mountain silhouette.

## Second native artist QA after 130a1d3 — OH remains an eye, forehead wash still invisible (2026-11-17)

[Successful exact-head TypeScript/unit checks](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44114648956)
and [full native Storybook/960×540 film check](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44114648865)
provide actual evidence [artifact 14342114655](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44114648865/artifacts/14342114655).
Inspected the true original-source five-cel PNG and separate
near/far frontal-mass crop, not just screenshot existence.

**Artistic rejection:** OH still resembled a tiny **round ink eye**,
even after the fixed neutral lower-lip line was moved to the actual
viseme. The opening and its nested dark core were both nearly round,
so the correct array counts and visible aperture did not imply lips.
Across the 376×471 1× head capture, the source/after delta showed
only 14 pixels with maximum RGB channel change >10, though 280
pixels changed >2; the newly added frontal washes at ~4% opacity
barely registered. The lower face and brow stayed almost flat. The
five-cel 1160×351 crop showed a larger visible change (1,282 pixels
>10) yet still failed qualitative OH lip realism. This is a valid
release blocker, not a visual-equivalence pass.

**Surgical OH geometry rework:** make the original opening a tall,
**narrow 3/4 lip aperture**, not a centered circular decal.
Preserve exactly its twelve separate original hand-authored mouth
wet/underpaint/paper/pressure forms, their materials and their
order; reshape the layers into a longer slit (~1.7:1 height/width)
with smaller genuinely nested vertically oriented wash/body/core
shapes. Retain near/far perspective, separate upper lip load,
paper-bright lower vermilion and the original source animation.
Redirect the four remaining inherited ANAT1 lip cues and the
source lower-lip reflection to the smaller speaking mouth; no
neutral seam or extra wide eyelid-like lines should cross it.
Unit + Chromium assert the actual OH opening aspect >1.55 and
true-dark core height >2x its width, beyond simple path counts.

**Optical ink on brow/temple:** UMMA's [Zeng Jing/Pan Qintai source](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/)
describes transparent washes used to model the forehead, nose and
deep eye sockets. Instead of raising the opacity of a single patch,
added three more near-temple/central-frontal transparent passages
(6.2–7.6% each) with a distinct 7.3% curved paper reserve, plus one
additional far-temple passage (6.9%). The existing 3.8–4.7% ink/paper
and all original ANAT1 planes remain intact. This makes optical
accumulation plausibly visible at 1× while retaining natural
near/far asymmetry and curved ink boundaries.

**Next visual gate:** execute the *new exact head* (after the above
two source patches) and inspect browser-saved five-viseme, near/far
forehead, low-detail mouth and actual 960×540 moving film PNG/MP4.
Do not claim realism, promotion or merge until those native screenshots
are independently judged against the source methods and (if available)
the user's matching teacher painting.
