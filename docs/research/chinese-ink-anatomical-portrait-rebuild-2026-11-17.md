# ANAT2 — Chinese ink original human portrait redraw (2026-11-17)

**Scope:** two entirely new code-painted characters in `src/video/ink-anatomical-portrait.tsx` and six Storybook views. This study does NOT import, resize, trace, or patch the existing Shanshui character source shapes. The existing PR #466 landscape, river-scholar and its unfinished reference review remain unchanged. These are independent new candidate figures.

**Status: ART HOLD.** Code-authored anatomical plausibility is not equivalent to art-historical likeness or real dry-brush authenticity. A passing browser test or a frame screenshot alone is not artistic acceptance. Keep #466 draft until actual same-camera historical comparison and film-scale acceptance.

## Authentic source-image observations (before redrawing)

| Observed historical source | Link | Visual / topological evidence | Specific drawing decision |
|---|---|---|---|
| Zeng Jing, *Portrait of Pan Qintai* (1621), University of Michigan Museum of Art | https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/ | Facial eyes, frontal bone and nasal tip are constructed by accumulated nearly transparent wash; linear edges are extremely soft. The robe is deliberately sparse relative to facial precision. | Separate periocular, nasal bridge, forehead and malar washes; leave optical paper in middle planes instead of a smooth digital gradient. |
| Zeng Jing, Ming scholar portrait, Qingdao Art Museum educational collection | https://www.qdsmsg.cn/h-nd-178.html | Eyebrows and nose stay fine while broad fabric sheets are lightly delineated. The pale face is distinct from the solid scholar cap. A continuous external head contour is not a uniform black sticker. | Paint cap and hair behind a new craniofacial silhouette; reserve fine eyebrow and eyelid strokes, keep cloth folds pressure variable. |
| Ren Bonian / Ren Yi, expressive smiling figure (auction object photograph, 1891) | https://www.sothebys.com/en/auctions/ecatalogue/2012/fine-classical-chinese-paintings-n08835/lot.677.html | Smiling cheek masses press toward eyes and the mouth; dark scarf and eyebrows follow different brush pressures. Cloth folds widen and contract in active movement. | ACTUAL vertex-driven AU6 cheek and AU12 mouth, eyelid occlusion and beard/hair detail; independently layered collar folds rather than uniform strokes. |
| Ren Bonian collection, Central Academy of Fine Arts Museum | https://www.cafamuseum.org/en/exhibit/detail/871 | Distinct people have distinct head ratios and character; calligraphic garment marks use larger brush energy than facial contour. | Two independently parameterized ANAT1 face identities; differing hair, hats, beard, clothing and projection. |
| Ren Yi, *Herdboy and Buffalo*, Metropolitan Museum | https://www.metmuseum.org/art/collection/search/49463 | Colored wash and loose impressionistic brush rhythm coexist with precise subject-attached lines. | Independently draw wet and dry mark families with asymmetrical, subject-bound vectors. |

These photographs are **visual-study links only**, not redistributed, embedded, or claimed as permissively licensed image assets. No photograph was traced. The result cannot yet be called an accurate reconstruction of any particular sitter or painting.

## Geometric construction from first principles

- **ANAT1 base:** `createFace` and `FACE_LANDMARKS` from the repository's measured 468-vertex MediaPipe-mask scaffold. Each portrait begins with its *own* distinct eye spacing, nose width/length, lower-face length, and bizygomatic width. The skull-cap and ear are constructed separately because ANAT1's mask excludes skull, ears and hair. Source dataset licensing lives in the ANAT1 registry.
- **3/4 projection:** 19° (scholar), 27° (elder). Project raw x/y/z millimetre points into a consistent local 540×620 SVG image plane rather than adjusting existing Shanshui paths. A Catmull–Rom-to-cubic interpreter retains vertices from actual ANAT1 features; upper/lower eyes and upper/lower lips are separate continuous loops.
- **Vertex-native EXPR1:** `expressEmotion` directly modifies the fitted mask's vertices; actual projected ocular, brow, cheek and lip topology follows the action. `expressionMarks` adds low-opacity glabellar, nasolabial and orbital marks only from activated units. The canvas renders the same features at intensity 0, .25, .5, .75 and 1 and supports animation timeline playback at 24 fps.
- **Real paper reserve:** the paper is exposed by a real clipped eye aperture, not an overpainted white eye sticker. Iris interiors are clipped by the *current* upper/lower eyelid polygons. Two overlapping forehead glazes, two independent cheeks (5 main fields + 9 microstrokes each), face-shadow contacts, beard strands, variable hat/hair fibers, garment folds, and a low-strength alpha paper-fiber pass are independent material deposits.
- **Distinct identities:** the young scholar uses tight eye spacing, a narrower nose, shorter lower third, tied dark hair and black scholar cap; the elder has a broader nose, longer lower third, wider cheekbones, grey hair break-up and individual split beard hairs. Their robes have separately constructed neckline folds.
- **Semantic SVG:** source-space `data-km-ink-*` groups expose anatomy, eyes, brows, mouth, robe, cheek layers and ear. Accessible Storybook controls switch live production components rather than swapping screenshots.

### Anatomical caution

The ANAT1 face dataset is a generic scaffold, not proof of any specific ancestry, individual likeness, attractive-face norm, or historical sitter. No preset should be used to imply an identity. The ANAT1 mask omits the outer ear, cranium, and shoulders; new contours for those parts are an **artist-authored approximation** and must undergo manual image reference review. EXPR1 action units are also illustrative estimates, not calibrated motion-capture displacements.

## Native one-to-one ArtCraft visual findings (2026-11-17 follow-up)

Real Chromium portrait PNGs reviewed from workflow [44131278583](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44131278583) and subsequent exact-head screenshots. Technical passing checks do NOT establish quality. The previous camera yielded a visually implausible oversized balloon-shaped head, tiny modern beret, incoherent outer-eye-to-nose wedge, nearly absent beard at 1×, deep business-suit V neckline, and mouth shading too geometrically regular. The face occupied most of the shoulder width while a documented late-Ming hanging-scroll sitter's face is much smaller relative to robe and broad sleeves. This is the reason for the subsequent art-only corrections rather than shipping the images.

**Primary documented painting:** Zeng Jing, *Portrait of Pan Qintai* (1621), University of Michigan Museum of Art. The public-domain high-resolution faithful photographic reproduction (1,997×2,929) is at https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg (Public Domain Mark 1.0). In this full painting, headcloth rises in an upright taper, malar/ocular relief is translucent, the robe shoulders are many head-widths across, facial ink is much finer than the sparse confident garment contours, and facial hair consists of narrow individual tapered strokes. The component is an original illustrated candidate, **not a reconstruction of Pan Qintai**.

**Corrections applied:** perceptually measured head-to-robe ratio uses a 0.69 face/cap/beard scale around a fixed collar contact rather than flattening ANAT1; smooth millimetre-mask lower-third squeeze corrects the previous extended chin; scholar and elder caps are cut as separate folded Ming silhouettes rather than semicircular berets; 93 individually flowing hairs plus five separate tapering locks replace the elder's faint chin stamp; age-related orbital creases attach to canthi and cheekbones; lower-lid break, nose wash and brow pressure are softened. All previous independent paint passes, observed paper fibre and EXPR1 facial motion remain live. Synthetic A/B upload fixtures remain interaction tests **only**.

**Still not passed:** original PD portrait matching at common face-to-body crop and true film-scale image quality. Old Shanshui cast is not replaced. Do not merge while the visual hold remains.

## Reused registered INK1 pressure geometry for period silk folds

Actual 1× Chromium screenshots still showed broad uniform-width synthetic robe paths. Rather than introducing an unrelated custom SVG calligraphy system, ANAT2 now reuses the repository's existing registered [INK1 brush](../../component-specs/ink-brush.md), via the evaluateInkBrush API, for **four individually authored brush gestures per figure**: left and right wraps and left and right sleeve contact. Each has separate paper-space control points, actual physical width (not merely SVG strokeWidth), nib pressure, pace, pigment load, dry contact and fixed seed. The output has a true curved filled outline with independently deposited richer inner ink, a paper-hole mask, bristle hairs and flying-white cuts. The sculpted younger/elder cloth geometry remains independent; previous garment folds and loose paper-lift lines are retained. The brush textures are attached to the cloth and rendered live inside the same FilmStage SVG.

**Video/Storybook acceptance:** the added "INK1 loaded silk lapels · sleeve pressure and paper-fibre microscope" presents both original figures with native robe camera crop 55 410 430 202 and a matching full-bust view. It exposes detail and EXPR1 emotion controls, and Playwright validates four separate INK1 pressure-brush marks and fixed paper-coordinate masks for each identity. Cross-reference the standalone Ink Brush Storybook; this is code reuse, not a new brush variant.

**Art status unchanged:** code-controlled bristles and 1× browser captures do not prove that garment weight, color, volume or wet-paper response matches Zeng Jing, Ren Yi or any particular period painting. The source painting remains the reference for independent visual acceptance.

## Native 960×540 experimental film actor (isolated from production)

The new `src/video/ink-anatomical-portrait-film.tsx` provides a reusable, absolute-frame 96-frame / 24 fps **optional proof**, without changing the canonical Shanshui scholar character rig. It uses the actual `InkShanshuiStage` and registers an original transparent-paper ANAT2 figure in the existing painter's `children` insertion point **behind the original foreground and above the atmospheric mountain stage**. No bitmap stage, hidden paper rectangle, screen overlay pretending to be film geometry, or new background image is introduced.

The original ANAT2 `InkAnatomicalPortrait` accepts `transparentPaper`, a hex `paperColor`, native SVG props (including an accessible label), independently sampled ANAT1/EXPR1 expression intensity and detail. At 960×540 the 96-frame deterministic facial cue animates the chosen scholar or elder with subtle head-and-body sway and breathing. All figure parts remain attached through one pose transform. Arbitrary forward and reverse seeking samples the same source frame. Reduced motion presents a still final ink wash and neutral actor.

New Storybook: **96-frame real Shanshui composition · new ANAT2 actor (ART HOLD)** includes actor/emotion choice, 24 fps play/pause, frame scrub, and reduced-motion control. Playwright captures native film frames 0 and 12, elder actor at frame 12, and checks end/reduced-motion cue recovery. The original film export keeps its existing actors untouched.

**Unresolved artistic acceptance:** This is *only* a medium-scale compositing comparison. The historical 1× and 3× silhouette fidelity, cloth-to-landscape optical contact, actual performer rig adaptation (head turn, blink, gait and explicit syllable visemes) and normal-speed 96-frame encoded film review are **not yet approved**. A passing Storybook or unit test does not clear the ART HOLD. An actual independent photo reference crop must be compared to the latest exact-head native screenshots before replacing an existing film character.

## Exact native optical QA: newly composed actor still rejected

Re-inspected **actual Playwright 1× face and full-film PNGs** from [workflow run 44144504247](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44144504247) ([browser screenshot artifact 14356603079](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44144504247/artifacts/14356603079)). The contact sheet included both characters' five expressions, true face microscope, native fold microscope and **three 960×540 Shanshui actor frames**. The browser and unit checks passed for that prior head; **art quality still failed**.

Concrete visible issues:
- The old figure was a billboard-sized **disembodied face floating in the upper-right sky** behind pine branches; the original figure's shoulders did not resolve into the lower bank.
- Midface contained **two conspicuously polygonal under-eye-to-alar wedges** giving an exaggerated swollen nose; the reference Zeng Jing near-transparent facial washes have no such crisp triangular boundaries.
- Elder beard read as a **mouth-to-chin triangular decal / barcode of similarly vertical hairs**. Several beard roots did not visually follow the chin and lower lip. Its color and edges were much too hard at 1×.
- The scholar headcloth was still a **short modern trapezoid/beret** rather than the relatively tall, squared, softly folded headpiece in the 1621 portrait.
- Eyelid, gaze and oral-fissure action are different between emotions, but the expression atlas still reads as conventional flat vector character art rather than real brushed figure painting. Garment and landscape are also not at period source standard.

Corrections made immediately from **specific native rendered failures** (not abstract structural test passing):
1. The ANAT1 zygomatic wet-bone and warm maxillary washes were redrawn as **curved orbital-malared brush-pressure deposits**, feathered separately; the hard cheek fill polygons were removed without dropping nine detailed microstrokes per cheek.
2. The elder's under-chin pigment is now a **localized porous foundation** rather than a mouth-to-chin filled triangle, with **93 independently attached curving hairs arranged across five tapered beard families**. All five separate lock silhouettes and 18 oral-root moustache fibers remain.
3. The scholar's fabric cap and the elder's headcloth rise farther above the forehead, with full-height, nonuniform ink-fiber contacts; no photographic outlines were traced.
4. Reframed the optional 96-frame 960×540 actor from **left 566/top 160/width 350** to **left 611/top 253/width 259**, bringing the upper body lower into the near riverbank and preventing a monumental forehead occluding the sky. Foreground occlusion and deterministic 24-fps cue remain untouched.

**Pending new visual gate:** all fixes need new exact-head native Chromium raster comparison. A rendered PNG and clean CI are not acceptance in themselves. Production Shanshui figures were never replaced.

## 1× native rejection and source-proportioned face/robe remapping

The [exact-head 44148624099 Chromium + 960×540 film run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44148624099) (previous head b3d0bdc, successful typecheck/unit/browser/film) produced new face, 2×5 atlas, native robe and film frames. Inspected actual PNG raster, not just screenshot presence. Face still reads as **oversized cartoon mask**: head covers too much of the broad-sleeved body, eyes have evenly circular dark pupils, two cheek-to-nose streams look like drooping L/U shapes, brows read as unsupported high-contrast arches, and the yellow skin is too uniformly filled. The source painting's sitter has a comparatively small thin head relative to the open sleeves and calligraphic robe; its eye sockets/nose are modelled with very pale wash, not heavy continuous edges. The full-film optional actor looks more grounded after moving lower but the figure is *still only a bust*, not a historically proportioned standing scholar.

**Museum source cross-check:** [University of Michigan Museum of Art, Zeng Jing, *Portrait of Pan Qintai*, 1621](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/). The museum specifically describes concentrated facial realism through graduated ink wash for eye sockets, nose and forehead, versus sparse garment detail. [Public-domain full portrait and authentic proportions](https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg) show a tall headcloth, comparatively narrow sitter head, loose folded cotton robe and large sleeves. The reconstruction **is not** a likeness of Pan or a tracing of this image. The code takes proportion and brushwork principles, not pixels.

**Changes based on this actual comparison:**

1. One reusable `headScale` control (range 0.38–0.75, default **0.48**) replaces the old fixed 0.69 larger-than-source head. Scale is one affine matrix around the **original neckline/collar contact (270,420)**. It is applied to all ANAT1/EXPR1 vertices and paint layers, *including* ear, hair, tall cap, neck glazes and beard: no microstrokes, geometry, expression action or individual bristle is dropped.
2. The native face microscope computes an **inverse source-space viewBox** centred on that same contact anchor. Changing headScale never makes the face impossible to inspect; full-bust camera instead tightens its top empty space while retaining the 540-wide garment. The silk-only crop is independent. Both ratio bounds and museum A/B comparison are interactive in Storybook, with exact screenshots and finite-geometry regression gates.
3. Existing three **still-visible unblurred cheek seams** (even after the wet malar polygon fix) are now filtered through the softer fixed-paper diffusion instead of forming hard L-shape under-eye contours.
4. Nasal artwork no longer draws continuous ala→philtrum→ala "U". Two separate physical **alar pockets** hold lifted, thin local lines and blurred warm bone relief, separate from the softly glazed bridge. The 32 independently attached eyebrow hairs remain, but the heavy uniform curved brow's optical weight and the pupils' disk contrast are reduced.

**Quality hold remains:** this is a hypothesis pending its own new exact-head native 1× frame and historical A/B evaluation, **not** an objectively validated painting. Bust-only film is not a production-ready full standing or walking scholar. Original geography/rocks/pines remain art-held.

## Original standing figure correction — body topology, robe weight and bamboo staff

**Reviewed visual defect:** in native Storybook and genuine `InkShanshuiStage` 960×540 screenshots from [run 44152106961](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44152106961), the 0.48 head/robe ratio now improves the shoulders, but the scene has **no lower body at all**. A floating half-figure cannot be released as a standing late-Ming scholar. Mere A/B sizing of an unsupported bust is not enough. The independent original (not reused walking rig) must support a coherent ankle-length silhouette, visible sleeve-hanging gravity, an actual hand grip and two ground contacts, while retaining every original ANAT1/EXPR1 feature.

**Reference:** [Zeng Jing (1621), *Portrait of Pan Qintai*, UMMA](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/), and [public-domain whole-body painting](https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg). The original reference shows a standing scholar in a modest loose cotton robe, a thin vertical bamboo staff in one hand, broad sleeve folds, exposed footwear and an unornamented black headcloth. We borrow broad anatomical and markmaking principles only; **no figure path has been traced or imported from the reference**.

**Independent implementation:** `src/video/ink-anatomical-standing-figure.tsx` now composes the **unaltered, complete 540×620 source-space ANAT1/EXPR1 portrait**, with its original face mesh, 93 elder beard hairs, cap textile, INK1 cross-collars, under the same 540-wide coordinate system as a new **540×1080** whole-standing figure. The new anatomy is painted as a continuous shoulder-to-ankle cotton gown instead of an image extending below a cutoff by stretching pixels. It includes:
- Two opaque overlapping source-built robe panels, left asymmetric descending cuff, right sleeve with different weight and inner hem, real hem curvature at 1000–1016 and **two planted sandals with straps and toes** at fixed source-space ground (unchanged over every film frame).
- **82 gravity-directed individually authored cotton fibers**, **46 separate dry-paper lifts** and **24 joined upper-to-lower robe ink trajectories**. These preserve local edge characteristics, not one uniform vector gradient.
- Six independently authored **registered INK1** load/pace/pressure/dryness native brush geometries on the standing hem and sleeves. Each retains the actual filled variable-width contours, all bristles, ink-rich core, paper pores and flying-white channels. The pre-existing four upper-body registered pressure gestures are still drawn in the underlying original portrait.
- A separate hand emerging from the broad cuff, four indicated curled fingers plus an opposed thumb, and a single tapered bamboo staff from head height to below the sleeve, with **ten bamboo node collars and nineteen sparse internal fibers**, attached to the original hand placement.
- `inkStandingPoseAt(frame)` is a **pure absolute-frame pose function** 0–95 at 24 fps. Its subtle upper-body breathing, sleeve shift and staff motion are separate; **ground contact never changes**, and reduced motion removes those upper-body adjustments. This is explicitly a *standing portrait*, not an invented walking gait.

**Actual film integration:** the existing 96-frame opt-in `InkAnatomicalPortraitFilm` defaults to `figureMode="standing"` at an explicitly planted 960×540 source scene, with the earlier bust mode retained in Storybook for side-by-side negative comparison. It stays between native Shanshui geology and foreground painter in the existing `InkShanshuiStage`, and uses a transparent native SVG surface. Neither the canonical Shanshui scholar nor previous reader character assets is replaced.

**New Storybook:** `Video production/Film Looks/Chinese Ink/ANAT2 Original Standing Figure / Source-built standing figure...` contains a live 540×1080 original painting and controls for identity, 5 EXPR1 emotions, face-to-silk ratio, pressure/detail, absolute frame and reduced motion. The original 960×540 film story gained a **standing vs old bust** selector. New unit and Chromium tests check the six registered INK1 gestures, full original upper face retention, 82 robe fibers, 46 dry lifts, ten bamboo nodes, true thumb opposition, two immobile sandal positions at frames 0/12/95 and reverse seeks, both character heads and screenshot evidence.

**Art quality remains NOT CLEARED:** the independent body, hand anatomy, staff contact, expressive face and garment volume need a **native-scale side-by-side review against the museum original**; unit-test counts cannot establish physical brush behavior, full human figure plausibility, or visual continuity. No walking gait, separate articulated knee, hand gesture variation or production character rig is claimed. All previous historic Fuchun hemp, pine, rock, and final normal-speed cinematic acceptance gates remain.

## Actual 540×1080 Chromium ArtCraft review: reject seam and over-contrasted garment

The [previous full native Storybook/film run 44163318183](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44163318183) **passed** TypeScript, original Shanshui tests, new standing figure tests and real Chromium. Inspected the real PNGs for the original 540×1080 standing scholar/elder and full 960×540 stage (browser screenshot artifact [14364757683](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44163318183/artifacts/14364757683)), rather than relying on test presence.

**Disqualifying visual findings:**
1. A dead-straight strong **horizontal line at source y≈612** cuts through the robe like a two-piece paper collage. The legacy 540×620 bust layer was clipped abruptly across the standing 540×1080 gown.
2. Original upper robe used a gray/green filled broad garment mass, contrasting too sharply with the paler lower cotton gown. The cloth looks like a dark overcoat sewn to an unweighted lower panel. Its fold lines are disproportionately dark and geographically flat rather than single cotton folds.
3. The 6× native staff/hand crop showed a **flat two-tone mitten**: four vertical decorative strokes were mistaken for fingers and a thick thumb sticker did not truly oppose the shaft. Although staff depth was corrected behind the hand, physical phalanges and proximal/distal joints were absent.
4. The 960×540 figure's bottom landed around the last ~40 px of the viewport, not clearly on the foreground river bank. Visually it looked too large relative to distance mountains. The face remains obviously simplified cartoon linework at close range.

**Source-informed correction, preserving every individual original path:**
- In the standalone ANAT2 portrait, new opt-in `garmentWash="cotton"` reuses its entire painting and original INK1 pressure geometry, but uses a pale warm cotton color/load and lower silhouette-ink contrast. The original full-bust/portrait `silk` appearance remains the default, untouched.
- The native 540×1080 standing figure blends the *actual existing original bust SVG* using a **source-space** 540×620 paper-absorption gradient/mask, fully opaque to 490 px, then smoothly releasing through 530–620 px into the uninterrupted, pale, independent hem painting. This is not a CSS screenshot trick, rectangle hiding missing elements, or removal of microtextures. All upper sleeve/waist paths, ANAT1 face, beard fibers, 4 upper INK1 strokes and 6 lower INK1 strokes remain.
- Corrected original standing cotton underlayer and overlayer pigmentation toward unbleached parchment/white cotton; dark brush edges still survive independently and only the upper underpainting is de-loaded.
- Original optional 960×540 actor scales from 183 down to **150 px wide**, anchored at **(635,184)**. The full-body 540×1080 painting therefore retains feet at 184+150×1025/540 ≈ **469**, consistent with the 960×540 near-bank ground around y≈470. The historic bamboo staff, actual 96-frame motion, foreground occlusion and fixed shoes remain unaltered.
- Rebuilt the actual hand in source coordinates: a narrower metacarpal/palm volume around staff x≈129, **four curved separate distal/proximal phalange surfaces** wrapping in front of the bamboo, four fingertip/nail marks, a filled **opposed first metacarpal/thumb** crossing over the shaft, a gentle dorsal wash and **14 fine skin-pressure fibers**. This is not a painted-on four-line mitten. All local sleeve/staff frame motion remains deterministic. Exact 5.4× source-camera inspection is still required; code contours and counts alone cannot establish contact realism.
- New source-geometry-only cameras in `InkAnatomicalStandingFigure` (no pixel resampling): `full` = 540×1080, `waist` = 65/425/420/305 at ~2.8×, `grip` = 87/535/100/134 at ~5.4×, `hem` = 158/855/290/196 at ~1.86×. The independent full-standing Storybook atelier exposes all 4; real Chromium screenshots assert every original staff/robe/foot path is still present.

**Historical painting reference:** [UMMA, Zeng Jing, *Portrait of Pan Qintai* (1621)](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/) describes pale cotton garments and nearly invisible graded face wash. [High-resolution original image](https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg) is consulted for weight hierarchy and anatomy, not traced, embedded or published as an asset.

**No release claim:** These edits are candidate corrections to observed pixels, not a passed visual art gate. Re-render exact-head 1× and all three microscopes, inspect source-space physical sleeve continuity, thumb/staff overlap and foot planting, and only then consider further work. Facial depth, hand contact, garment material and the entire Fuchun geography still fail historical-grade acceptance.

## ZJ1 — redraw from additional Ming portrait sources, not ANAT1

### Primary reference set

1. **Zeng Jing (1564–1647), *Portrait of Pan Qintai*, 1621.** University of Michigan Museum of Art, object 1966/1.110. [Object and curatorial notes](https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/), [original image](https://umma.umich.edu/wp-content/uploads/2024/01/38055_ca_object_representations_media_43556_original.jpg). This is the closest historical anchor for the intended character: a lean early-sixties scholar, discerning deep-set eyes, subtle smile, plain dark cap, long white cotton robe, bamboo staff and sandals. The museum explicitly describes delicate light lines and near-transparent washes; face volume is concentrated around the forehead, nose and eye sockets. The museum's text is a study reference; **do not embed this image in the product or trace the sitter** without permission.
2. **Unidentified artist, *Portrait of a Scholar*, late Ming–early Qing, 17th–18th century.** The Metropolitan Museum of Art, object 29.20.1. [Collection record and public-domain image](https://www.metmuseum.org/art/collection/search/48941), [direct high-resolution image](https://images.metmuseum.org/CRDImages/as/original/73036.jpg). This is a second composition reference for the scholar's headwear, full-figure silhouette, seated/standing scale relationships, broad garment masses and restrained ink/color-on-paper treatment. The Met labels the image Public Domain and makes it available for unrestricted use; our component nevertheless contains no copied pixels.
3. **Ming dynasty, *Standing figure of Lü Dongbin*, Freer Gallery of Art, F1916.580.** [Smithsonian collection record](https://www.si.edu/object/standing-figure-lu-dongbin%3Afsg_F1916.580). Public-domain / CC0. Comparative reference for scholar-poet identity and Ming hanging-scroll figure language.
4. **Shi Qu, *Portrait of Zeng Jing*, 1797.** UMMA, object 1966/1.111. [Object record and image](https://umma.umich.edu/objects/portrait-of-zeng-jing-tseng-ching1564-1647-1966-1-111/). This is a later copy after a copy of Zeng Jing's self-portrait, useful as a comparative study of age, sitter identity and portrait handling, not a literal design template.

### Historical technique and anatomical interpretation

- UMMA's curatorial description of Pan Qintai calls out an individualized lean face, discerning eyes and a restrained smile. The facial realism is **not** created by drawing a black outline around an oval: the forehead, nose and deep-set eyes are modeled with subtle gradations of ink wash and delicate contour accents. The head therefore needs a different material grammar from the garment.
- The Bochen/Zeng Jing portrait tradition includes **mogu aotufa** (bone-immersing convexity/concavity): successive watery ink layers build planes and volume before restrained color is added. A second method, **goule tiancai fa**, begins with a thin contour and then layers color. These are documented in the specialist study [*Zeng Jing and the Bochen School*](https://theses.gla.ac.uk/71856/1/10392203.pdf) and the discussion of Zeng Jing's layered face modeling in [*Journal of Jesuit Studies*](https://brill.com/downloadpdf/journals/jjs/1/3/article-p443_5.pdf). The new head uses the former as its dominant visual rule: diffuse forehead/orbital/malar/nasal/jaw planes, low-contrast broken folds, and fine line only where anatomy needs a crisp edge.
- Figure painting's expressive logic is not only facial expression. The Admonitions-scroll scholarship describes eye contact, hand gesture and body direction as interdependent carriers of psychological action. See Shane McCausland, [*Figure Painting: Fragments of the Precious Mirror* (2016)](https://eprints.soas.ac.uk/12775/1/McCausland%20Figure%20Painting.3.19.14%20FINAL%20EDIT.pdf), especially the opening discussion of eyes, body language and figure line. The new ZJ1 head keeps eye, brow and mouth deformation independent and restrained; future pose work must preserve gesture-to-expression coherence.
- The Met's survey of [Ming dynasty painting](https://www.metmuseum.org/ja/essays/ming-dynasty-1368-1644) emphasizes the literati tradition's calligraphic construction of forms: the quality of a stroke and the individual performance matter more than uniform technical polish. The garment should therefore be built from a few connected pressure-paced contours and natural gravity folds, not dozens of equally weighted parallel vector lines.

### Full-scroll source proportion correction after direct image inspection

The [actual UMMA source image](https://umma.umich.edu/wp-content/uploads/2024/01/38055_ca_object_representations_media_43556_original.jpg) was opened and studied at native resolution, not only its written object description. Its sitter occupies roughly half the hanging-scroll height; the head is markedly narrower than the shoulder/robe width; the robe is a long, nearly columnar white-cotton mass with wide sleeves that hang down rather than a bell-shaped skirt; both sandals are clearly visible below the hem. The previous ANAT2 version incorrectly filled almost the entire 540×1080 canvas, yielding an excessively lanky, visually weak actor once placed into the landscape.

**Source-space correction:** keep the 540×1080 paper canvas but place all figure geometry in a portrait-proportioned transform `translate(0 220) scale(1 .66)`. The actual figure now occupies approximately y345–900 (about 51% of the scroll height) while preserving the source-space paths and 24-fps deterministic motion. Independently narrow the new head to 72% of body-space width, widen the lower robe to a broad, natural hanging hem, reduce the hand and sandals to period-appropriate relative scale, and start the bamboo staff just above the cap. In the 960×540 landscape actor, top y=220 and source width150 place the transformed sandals at approximately y470 on the near bank. No image pixels, masks or traced source contours are used.

Storybook source cameras now address the transformed original coordinates: face y340–515, cotton collar/torso y485–705, hand/staff y585–665, sandals/hem y840–940. The 1× scroll, not a fill-the-canvas crop, is the primary visual gate.

### Redraw decisions in ZJ1

- **Do not reuse the previous ANAT1 head artwork or vertex geometry.** The standing figure now composes `InkZengJingScholarHead`, an independent source-space construction. It has a narrow asymmetric skull and jaw, separate ears, small deep-set eyes, orbital ledges, nose bridge/tip/alar anatomy, philtrum, lips, neck planes, age-specific facial hair and a Ming gauze cap. Scholar and elder are independently varied.
- **Use the shared human-anatomy and expression foundation, not its old portrait rendering.** `createFace({calibrate:false})` supplies canonical anatomical measurements without silently applying unsupported non-East-Asian population norms. `expressEmotion` and `expressionFeatures` supply the FACS-derived brow-inner/outer, lid opening, cheek raise, nasal wrinkle, mouth-corner/width/opening, jaw and asymmetry signals. ZJ1 maps these signals into its own source-space calligraphic face paths and layered mogu washes; it does not render the prior ANAT1 mesh or paths.
- **No hard oval outline.** Face volume is built by several clipped translucent planes and paper-softened wash gradients. A few low-contrast contour accents define eyelids, nostrils, mouth and ears. The old face's dark giant feature outlines, sharp cheek triangles and overscaled eye geometry are deliberately not reused.
- **Expressions are actual local geometry changes.** Five expression controls are driven by the shared EXPR1/FACS feature model and alter brow angle, eyelid aperture, cheek tension, nasal action, lip width/corner and jaw opening. They are not five color tints or whole-head transforms. The new Storybook face microscope and Chromium expression atlas inspect all five states.
- **Body silhouette is redrawn as a connected robe.** The earlier overly wide bell sleeves and layered bust are rejected. The new cotton body is narrower and more columnar, with a continuous shoulder-to-ankle underlayer, asymmetrical sleeves, a folded cross-collar and visible sandals rendered in front of the hem.
- **The reference staff grip is small and quiet.** Avoid a cartoon glove or anatomical overstatement. The four flexed fingers and opposed thumb must interrupt the shaft at their actual contact points; line weight and wash should remain subordinate to the robe and face.
- **Storybook microscopes** now expose the complete 540×1080 drawing, face anatomy/mogu wash, robe/collar, staff grip and sandal/hem as source-space viewBoxes. They are not enlarged screenshots.

### Current rejection criteria

The earlier ANAT2 full figure looked like a vector costume mannequin, with a cartoon face, hard seam, oversized bell sleeves, hidden footwear and a mitten-like grip. That exact-head browser evidence is preserved in [run 44178444092](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44178444092), artifact 14372880742. ZJ1 is a true redraw, but must still be judged from its own exact-head Chromium evidence at 1× and the native face/grip crops. Passing a JSX-count test is not artistic approval. The face must read as a specific human sitter with planes and expression; the robe must hang from shoulder anatomy; the sandals must be visible; the hand must hold the staff without looking like a mitten. No merge until the 24fps film and all these views pass.

## Actual acceptance gates

1. Storybook **ANAT2 Independent Portrait Rebuild**: both character controls, five facial expressions, face microscope, 0–100% expression intensity, fibre detail and 24-fps motion slider work in Chromium. Check that eyebrows and mouth change from the *same* face, not cutout stickers; 0 and 96 return identical SVG geometry.
2. Unit gates: ANAT1 landmark geometry differs between individuals; fixed-zero ACT activation returns neutral; actual vertex response in brow/lid/cheek/mouth; dense independently authored paint layers; finite paths and stable identifiers.
3. **Unmet independent art comparison:** collect side-by-side real original-image portrait *face crops* with the **same view/scale** as ANAT2, then judge actual silhouettes, actual face volume (1×/3×), eye/naris/lip transitions, cap/robe/skin contact, and whether the new paper effect reads as unnatural uniform noise. An exact physical Chinese ink painting is not yet verified by the generated raster.
4. **Unmet full-film proof:** place the new candidate head and costume into a 960×540 original Shanshui film and verify 96 consecutive frames, movement in perspective, lip visemes, blinking and head continuity. Until this happens, the component is an optional standalone figure-study, *not* the production character replacement.
5. **Existing blockers:** original Fuchun geography, foreground rock, dry hemp and pine brush ecology; previous reader malar/forehead/lip realism. ANAT2 does not remove or override those blockers.

### Next priority

Manual source-matched face and garment review with an authentic higher-resolution licensed or PD artwork crop. If visually approved, build a dedicated actor rig adapter (head turn, blink, explicit visemes, robe folds), then compare independently against old film characters and *only then* consider replacing a production slot. Keep current character data intact until that gate is passed.


## ZJ2 — independent character redraw from expanded archival references (2026-11-17)

The next character pass deliberately does **not** edit or trace the previous
Shanshui reader, ANAT2 standing figure, ZJ1 head, or any rendered screenshot.
It starts from a new reference set and a new ANAT1/EXPR1-driven source-space
head renderer in `src/video/ink-reference-character-redraw.tsx`.

### New reference set and what each source contributes

1. **Chentung Liang Cheng, three-quarter seated portrait (1903), Library of Congress cph.3a44343.**
   - Record: https://commons.wikimedia.org/wiki/File:Chentung_Liang_Cheng_cph.3a44343.jpg
   - Full image: https://upload.wikimedia.org/wikipedia/commons/a/a8/Chentung_Liang_Cheng_cph.3a44343.jpg
   - The Commons/LOC record lists no known restrictions on publication and identifies the photograph as a 1903 LOC item.
   - Study observations: asymmetric eye visibility from the head turn; the far eye is narrower and sits differently against the nose bridge; the nose-to-malar transition is not mirrored; the moustache has distinct root direction and a soft upper-lip boundary; the neck, high collar and shoulder mass form one continuous load-bearing transition.
   - Used for the scholar's three-quarter anatomy, gaze, moustache root flow and neck/collar relationship only. Do not reproduce the sitter's identity or copy the late-Qing/early-modern costume.

2. **Elderly Chinese man, possibly a scholar, seated with a pipe (1860), Library of Congress LCCN 2011660679.**
   - Record: https://commons.wikimedia.org/wiki/File:Elderly_Chinese_man,_possibly_a_scholar,_three-quarter_length_portrait,_seated,_facing_front,_holding_pipe_in_right_hand;_includes_Chinese_language_characters_on_back_LCCN2011660679.jpg
   - Full image: https://cdn.loc.gov/service/pnp/cph/3b30000/3b32000/3b32400/3b32425r.jpg
   - The LOC record says no known restrictions on publication; the work is a charcoal drawing on brown paper.
   - Study observations: broader age-related orbital and cheek planes; a longer beard mass that resolves into separate locks rather than a triangular decal; a relaxed seated shoulder line; sleeve weight follows gravity; the pipe hand shows thumb opposition, curled finger contact and a wrist that remains connected to the forearm.
   - Used for elder age structure and beard silhouette in this head/bust pass. Seated gesture, sleeve gravity and pipe-hand contact are documented for the next full-body/hand pass; the drawing is not traced.

3. **Three-quarter face portrait of an unidentified bearded man (1860), Library of Congress LCCN 2006688331.**
   - Record: https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg
   - Full image: https://cdn.loc.gov/service/pnp/cph/3c30000/3c36000/3c36900/3c36970v.jpg
   - The record marks the work Public Domain Mark 1.0 and states no known restrictions on publication.
   - Study observations: beard direction begins at the upper lip and jaw rather than from one central triangular root; the moustache-to-cheek transition is broken into smaller masses; the three-quarter light reveals the orbital, cheek and nose planes without a heavy outline.
   - Used only for beard-root direction, facial-hair texture and light-plane study. The sitter's identity and ethnicity are not asserted.

4. **Style anchor — Zeng Jing, Portrait of Pan Qintai (1621), UMMA.**
   - Record: https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/
   - Retained as the historical ink/portrait-language anchor: economical contour, layered bone-immersing washes, restrained facial marks, and the relationship between head scale and robe. The museum image is linked only; no reference pixels or traced paths are embedded.

5. **Comparative full-figure reference — The Metropolitan Museum of Art, Portrait of a Scholar (17th–18th century), object 29.20.1.**
   - Record: https://www.metmuseum.org/art/collection/search/48941
   - Used for figure-to-robe proportion and the low-contrast treatment of a seated scholar; Open Access / Public Domain.

### New redraw construction

- New Storybook route: **Video production / Film Looks / Chinese Ink / ANAT3 Reference-led Character Redraw**.
- Scholar and elder are separate identities with different head widths, mouth proportions, yaw, cap silhouette, facial hair and value palette. They are not one face recolored.
- ANAT1 `createFace` supplies the raw 468-point face topology. No demographic norm is applied because the current `FACE_NORMS` table has no validated East-Asian dataset; provisional scholar/elder differences are explicit millimetre-space morphs around named landmarks, not population presets. `FACE_LANDMARKS` and `FACE_FEATURES` define the anatomical anchors and ordered feature loops. `renderMeshFrame` projects the expressed mesh into source space; `faceFeatureLines`, `projectPoint` and `smoothPath` retain the original feature topology.
- EXPR1 `expressEmotion` deforms the same feature mesh. `expressionFeatures`, `expressionMarks`, `irisPositions` and `nearestEmotion` drive eye opening, brow position, gaze, mouth shape and expression creases. The ink renderer translates those curves into soft forehead/orbit/malar/nose/jaw washes and sparse tapered contours.
- The elder beard is drawn as individually rooted, directionally varied fibers over a soft organic substrate. The scholar moustache is separate from the lip contour and built from short directional hairs.
- The Storybook reference board displays the three archival sources with credits and notes. They remain external reference links/images; no reference bitmap is added to the production registry.

### Acceptance status

This is a new source-led research redraw, **not a production approval**. The formal
ArtCraft portrait gate remains open: the source files have not been staged in the
repository, so no local SHA-256 evidence or independently annotated 18-point
landmark/value-plane package has been produced. The new Storybook story still
requires 1× and 3× visual review for facial likeness separation, ear/neck
attachment, expression readability, beard edge quality and crop stability.
Keep the Chinese Ink portrait work on **ART HOLD / DO NOT MERGE** until that
review is complete. CI success is necessary but is not artistic acceptance.


## ANAT4 — anatomy-led full-figure, robe and pipe/staff grip study (2026-11-17)

The next pass starts again from ANAT1's posed body lattice rather than editing the
earlier ANAT2 standing figure or tracing a prior screenshot. The head remains a
separate ANAT3/EXPR1 study so the face can be inspected at a useful scale.

### New reference set

1. **Standing figure of Lü Dongbin, Ming dynasty (1368–1644), Smithsonian Freer Gallery, F1916.580.**
   - Object record: https://asia-archive.si.edu/object/F1916.580/
   - IIIF image: https://ids.si.edu/ids/deliveryService?id=FS-5908_09&max=1200
   - The Smithsonian IIIF manifest identifies ink and color on silk, a 162 × 85.4 cm image, Ming period and CC0 metadata.
   - Observations: tall hanging-scroll proportion; head-to-body scale; long, gravity-led robe column; wide sleeve masses; a few strong directional garment contours; robe hem and footwear relationship.
   - Used for standing silhouette, robe rhythm and hanging-scroll composition only. Do not copy the immortal's face, identity or object.

2. **An old Chinese man with his pipe, 1860, Library of Congress LCCN 2004679126.**
   - LOC record: https://www.loc.gov/item/2004679126/
   - High-resolution image: https://upload.wikimedia.org/wikipedia/commons/1/1f/An_old_Chinese_man_with_his_pipe%2C_half-length_portrait%2C_facing_front%2C_sitting_at_a_table%2C_holding_a_pipe_LCCN2004679126.jpg
   - LOC/Commons metadata describes charcoal and lead white on tan paper; no known restrictions on publication; Public Domain Mark 1.0.
   - Observations: wrist-to-palm continuity; thumb opposition across the pipe; index/middle contact; curled ring/little fingers; the pipe's long axis; sleeve volume terminating at the wrist; a second resting hand with a different finger tension.
   - Used for grip anatomy and prop contact. The source drawing is not traced.

3. **Portrait of a Gentleman, 16th–17th century, The Metropolitan Museum of Art, object 51.39.4.**
   - Object record and image: https://www.metmuseum.org/art/collection/search/48939
   - The Met marks the image Public Domain / Open Access; ink and color on silk.
   - Observations: broad robe mass; the transition from shoulder to sleeve; beard silhouette; cap/headwear; seated weight and the separation between garment folds and decorative pattern.
   - Used for robe mass and headwear study only. Do not copy the red official robe or rank badge.

4. **Portrait of a Scholar, 17th–18th century, The Metropolitan Museum of Art, object 29.20.1.**
   - Object record and image: https://www.metmuseum.org/art/collection/search/48941
   - The Met marks the image Public Domain / Open Access; ink and color on paper.
   - Observations: quieter scholar garment, plain collar, subdued pigment, headwear and face-to-body proportion. This is a seated portrait, not a standing anatomy template.

### New redraw construction

- Storybook route: **Video production / Film Looks / Chinese Ink / ANAT4 Anatomy-led Full Figure**. This is inside the existing Chinese Ink section, not a new Storybook folder.
- ANAT1 starts from `HUMAN_PRESETS` (`man-50` / `man-80`), then applies explicit age/build/stature values. The Asian ancestry morph is a coarse MakeHuman sculpt axis only; it is not treated as a historical Chinese anthropometric norm or as an individual's identity.
- `createHumanBody`, `poseHumanBody`, `POSE_PRESETS`, `HAND_POSES.grip` and separate thumb CMC/MCP/IP angles supply a posed five-finger hand. `renderHumanFrame` supplies occluding contours, joints and screen-space landmarks. The frame is the geometry authority; the ink painter does not invent the arm or wrist placement.
- `growHair` creates depth-aware scalp strands on the same posed body. `HumanFigure` renders the anatomy underpainting and hair with depth; the scholar cap, elder beard fibers and garment are style-specific overlays.
- The robe silhouette and sleeves are built from projected shoulder, elbow, wrist, hip and ankle anchors. `evaluateInkBrush` supplies pressure-varied folds, pigment cores, bristle hairs and flying-white paper gaps. The staff and pipe are placed behind the articulated hand so the hand surface occludes the prop.
- The head panel reuses ANAT3's 468-point facial topology and EXPR1's FACS deformation, gaze and crease marks. It now also uses ANAT1 `faceHair` to draw directional brow and eyelash fibers. The face remains a separate close-up panel rather than a falsely registered miniature pasted onto the body head.

### Acceptance status

This is an **experimental anatomy-to-ink study**, not a finished production character.

- The archival images are external Storybook references; source bytes have not been staged in the repository and no SHA-256 evidence has been recorded.
- No independent 18-landmark source/render annotation or five matched facial value-plane package exists yet.
- The ArtCraft v7 `portrait_fidelity_gate.py` measured pass and independent 1×/3× human visual review have not been run. The script/package is not staged in this repository.
- ANAT1's MakeHuman/ANSUR body scaffold and coarse ancestry axis are not a historical Chinese body norm; the figure proportions still need source-relative measurement.
- Keep ANAT3/ANAT4 in the existing experimental Chinese Ink Storybook section under **ART HOLD / UNAPPROVED**. Do not merge or promote based on structural tests or screenshots alone.


### Canonical character identity constraint

The user's three approved teacher paintings remain the canonical identity and
pose ground truth for **Misty Hermit**, **Riverside Scholar** and
**Mountain Trail**. They were accepted for face, proportions, sleeves, robe,
gesture and pose. The Smithsonian, LOC and Met sources added in ANAT3/ANAT4
are **anatomy, hand, garment and brush-craft references only**; they must not
replace or redefine those three characters.

A search of the accessible Library and current repository did not surface the
three original teacher-image files or the annotated proportion atlas. Therefore
ANAT3/ANAT4 must remain separate experimental studies until the approved
paintings are available for source-pixel landmark annotation and pose comparison.
No identity-matched or source-fidelity claim is made in their absence.
